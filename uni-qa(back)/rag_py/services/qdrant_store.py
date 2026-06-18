from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.http import models

from services.config import settings


# 缓存本地 Qdrant client，避免 path 模式下重复创建实例导致锁冲突。
@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    settings.resolved_qdrant_path.mkdir(parents=True, exist_ok=True)
    return QdrantClient(path=str(settings.resolved_qdrant_path))


# 确保向量集合存在；首次索引时会按 embedding 维度创建 collection。
def ensure_collection(vector_size: int) -> None:
    client = get_qdrant_client()
    collections = client.get_collections().collections
    exists = any(item.name == settings.qdrant_collection_name for item in collections)
    if exists:
        return

    client.create_collection(
        collection_name=settings.qdrant_collection_name,
        vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
    )


# 删除旧 collection 后重新创建，用于需要彻底重建知识库索引的场景。
def recreate_collection(vector_size: int) -> None:
    client = get_qdrant_client()
    collections = client.get_collections().collections
    exists = any(item.name == settings.qdrant_collection_name for item in collections)
    if exists:
        client.delete_collection(collection_name=settings.qdrant_collection_name)
    ensure_collection(vector_size)


# 删除指定文档对应的旧 chunks，避免单文档重建时留下过期片段。
def delete_doc_chunks(doc_id: str) -> None:
    if not doc_id:
        return

    client = get_qdrant_client()
    client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="docId",
                        match=models.MatchValue(value=doc_id),
                    )
                ]
            )
        ),
    )


# 批量写入或更新向量点，Qdrant 会根据 point id 覆盖同一片段的旧数据。
def upsert_chunks(points: list[models.PointStruct]) -> None:
    if not points:
        return

    client = get_qdrant_client()
    client.upsert(collection_name=settings.qdrant_collection_name, points=points)


# 使用问题向量在 Qdrant 中召回候选知识片段。
def search_chunks(query_vector: list[float], limit: int):
    client = get_qdrant_client()
    # 兼容当前安装的 qdrant-client 版本：本地 SDK 暴露的是 query_points，不是旧版 search。
    response = client.query_points(
        collection_name=settings.qdrant_collection_name,
        query=query_vector,
        limit=limit,
        with_payload=True,
    )
    return response.points
