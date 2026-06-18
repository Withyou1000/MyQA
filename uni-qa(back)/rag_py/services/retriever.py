from services.config import settings
from services.embedder import embed_texts
from services.qdrant_store import search_chunks


# 根据用户问题检索知识库，并把 Qdrant 原始结果整理成 Node 后端需要的字段格式。
def retrieve_knowledge(query: str, limit: int = 8) -> list[dict]:
    safe_query = str(query or "").strip()
    if not safe_query:
        return []

    query_vector = embed_texts([safe_query])[0]
    try:
        # 首次接入时如果还没建 collection，这里直接返回空结果，让上层走“建议转人工”的兜底。
        results = search_chunks(query_vector=query_vector, limit=limit or settings.rag_top_k)
    except ValueError as error:
        if "not found" in str(error).lower():
            return []
        raise

    normalized = []
    for item in results:
        payload = item.payload or {}
        score = float(item.score)
        if score < settings.rag_score_threshold:
            continue

        normalized.append(
            {
                "score": score,
                "doc_id": payload.get("docId", ""),
                "doc_title": payload.get("docTitle", ""),
                "section_title": payload.get("sectionTitle", ""),
                "chunk_id": payload.get("chunkId", ""),
                "text": payload.get("text", ""),
                "tags": payload.get("tags", []),
                "source_path": payload.get("sourcePath", ""),
            }
        )
    return normalized[:5]
