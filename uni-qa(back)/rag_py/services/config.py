import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


@dataclass
class Settings:
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8001"))
    embedding_model_name: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    qdrant_path: str = os.getenv("QDRANT_PATH", "./data/.qdrant")
    qdrant_collection_name: str = os.getenv("QDRANT_COLLECTION_NAME", "customer_service_knowledge")
    rag_top_k: int = int(os.getenv("RAG_TOP_K", "8"))
    rag_score_threshold: float = float(os.getenv("RAG_SCORE_THRESHOLD", "0.3"))
    rag_rerank_enabled: bool = os.getenv("RAG_RERANK_ENABLED", "false").lower() == "true"

    # 返回 Node 后端已有的知识文档目录，避免 Python RAG 服务维护另一份知识源。
    @property
    def knowledge_dir(self) -> Path:
        return BASE_DIR.parent / "docs" / "ai-knowledge"

    # 把配置里的 Qdrant 路径统一解析成绝对路径，方便本地文件模式稳定运行。
    @property
    def resolved_qdrant_path(self) -> Path:
        path = Path(self.qdrant_path)
        if path.is_absolute():
            return path
        return BASE_DIR / path


settings = Settings()
