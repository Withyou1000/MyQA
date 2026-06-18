from pydantic import BaseModel, Field


class IndexRequest(BaseModel):
    recreate: bool = Field(default=False, description="是否重建整个 collection")
    doc_id: str = Field(default="", description="只重建指定文档时传入 doc_id")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="用户检索问题")
    limit: int = Field(default=8, ge=1, le=20, description="召回条数")
