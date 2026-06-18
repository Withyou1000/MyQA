import uuid

from qdrant_client.http import models

from services.chunker import chunk_markdown_document, collect_markdown_documents
from services.config import settings
from services.embedder import embed_texts
from services.qdrant_store import delete_doc_chunks, ensure_collection, recreate_collection, upsert_chunks


# 构建知识库向量索引：读取 Markdown、切块、生成向量，并写入 Qdrant。
def index_knowledge(recreate: bool = False, doc_id: str = "") -> dict:
    documents = collect_markdown_documents(settings.knowledge_dir, target_doc_id=doc_id)
    if not documents:
        return {
            "documents": 0,
            "chunks": 0,
            "dimension": 0,
            "qdrant_path": str(settings.resolved_qdrant_path),
        }

    chunks = []
    for document in documents:
        chunks.extend(chunk_markdown_document(document))

    texts = [chunk["text"] for chunk in chunks]
    embeddings = embed_texts(texts)
    dimension = len(embeddings[0]) if embeddings else 0

    if recreate:
        recreate_collection(dimension)
    else:
        ensure_collection(dimension)

    if doc_id:
        delete_doc_chunks(doc_id)

    points = []
    for index, chunk in enumerate(chunks):
        # Qdrant 的 point id 需要使用合法的整数或 UUID。
        # 这里用 chunk 的业务主键生成稳定 UUID，保证重复建索引时同一 chunk 的 id 不会漂移。
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{chunk['docId']}::{chunk['chunkId']}"))
        points.append(
            models.PointStruct(
                id=point_id,
                vector=embeddings[index],
                payload=chunk,
            )
        )

    upsert_chunks(points)

    return {
        "documents": len(documents),
        "chunks": len(chunks),
        "dimension": dimension,
        "qdrant_path": str(settings.resolved_qdrant_path),
    }
