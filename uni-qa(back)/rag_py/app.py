from fastapi import FastAPI, HTTPException

from schemas.request_models import IndexRequest, SearchRequest
from services.config import settings
from services.indexer import index_knowledge
from services.retriever import retrieve_knowledge

app = FastAPI(title="MyQA RAG Service", version="0.1.0")


# 提供基础健康检查，方便 Node 后端或开发者确认 RAG Python 服务是否在线。
@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "myqa-rag-py",
        "collection_name": settings.qdrant_collection_name,
    }


# 接收索引构建请求，用于重建整个知识库索引或只增量更新指定文档。
@app.post("/index")
def index_endpoint(payload: IndexRequest):
    try:
        result = index_knowledge(recreate=payload.recreate, doc_id=payload.doc_id or "")
        return {
            "ok": True,
            **result,
        }
    except Exception as error:
        # 本地开发阶段直接把异常详情带回去，方便快速定位索引失败原因。
        raise HTTPException(status_code=500, detail=f"index failed: {error}") from error


# 接收用户问题并返回最相关的知识片段，供 Node 后端继续组织 AI 回复。
@app.post("/search")
def search_endpoint(payload: SearchRequest):
    try:
        results = retrieve_knowledge(query=payload.query, limit=payload.limit)
        return {
            "ok": True,
            "results": results,
        }
    except Exception as error:
        # 检索错误显式返回，避免前端或 Node 侧只能看到笼统的 500。
        raise HTTPException(status_code=500, detail=f"search failed: {error}") from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
