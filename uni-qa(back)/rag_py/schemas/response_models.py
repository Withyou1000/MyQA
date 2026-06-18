from pydantic import BaseModel, Field


class ChunkResult(BaseModel):
    score: float = Field(..., description="相似度分数")
    doc_id: str = Field(default="", description="文档 ID")
    doc_title: str = Field(default="", description="文档标题")
    section_title: str = Field(default="", description="章节标题")
    chunk_id: str = Field(default="", description="切块 ID")
    text: str = Field(default="", description="知识片段正文")
    tags: list[str] = Field(default_factory=list, description="标签")
    source_path: str = Field(default="", description="源文件路径")
