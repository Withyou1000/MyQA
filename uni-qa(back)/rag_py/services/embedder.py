from functools import lru_cache

from sentence_transformers import SentenceTransformer

from services.config import settings


# 懒加载并缓存 embedding 模型，避免每次请求都重复初始化大模型对象。
@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model_name)


# 将一组文本转换成归一化向量，供 Qdrant 做余弦相似度检索。
def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    model = get_embedding_model()
    # normalize_embeddings=True 会把向量归一化，后续用 COSINE 距离比较更稳定。
    embeddings = model.encode(texts, normalize_embeddings=True)
    return embeddings.tolist()
