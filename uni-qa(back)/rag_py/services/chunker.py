from pathlib import Path


# 从知识库目录收集 Markdown 文档，并整理成后续分块逻辑需要的统一结构。
def collect_markdown_documents(knowledge_dir: Path, target_doc_id: str = "") -> list[dict]:
    if not knowledge_dir.exists():
        return []

    documents = []
    for source_path in sorted(knowledge_dir.glob("*.md")):
        doc_id = source_path.stem
        if target_doc_id and target_doc_id != doc_id:
            continue

        content = source_path.read_text(encoding="utf-8")
        title = doc_id
        for line in content.splitlines():
            if line.startswith("# "):
                title = line[2:].strip() or doc_id
                break

        documents.append(
            {
                "docId": doc_id,
                "title": title,
                "content": content,
                "tags": [tag for tag in doc_id.replace("_", "-").split("-") if tag],
                "sourcePath": str(source_path),
                "updatedAt": source_path.stat().st_mtime,
            }
        )
    return documents


# 按 Markdown 标题和长度限制切分文档，生成适合向量检索的小知识片段。
def chunk_markdown_document(document: dict, max_length: int = 420, overlap_length: int = 60) -> list[dict]:
    lines = str(document.get("content") or "").splitlines()
    sections = []
    current_title = document.get("title") or document.get("docId") or "untitled"
    current_buffer = []

    # 把当前标题下累积的正文保存成一个章节，遇到新标题或文档结束时调用。
    def flush_section():
        nonlocal current_buffer
        text = "\n".join(current_buffer).strip()
        if text:
            sections.append({"sectionTitle": current_title, "content": text})
        current_buffer = []

    for line in lines:
        if line.startswith("#"):
            flush_section()
            current_title = line.lstrip("#").strip() or current_title
            continue
        current_buffer.append(line)

    flush_section()

    chunks = []
    for section_index, section in enumerate(sections):
        paragraphs = [item.strip() for item in section["content"].split("\n\n") if item.strip()]
        text_buffer = ""
        chunk_index = 0

        # 把一段已经满足长度要求的文本写入 chunks，并补齐文档、章节、标签等元数据。
        def push_chunk(value: str):
            nonlocal chunk_index
            text = value.strip()
            if not text:
                return
            chunks.append(
                {
                    "docId": document["docId"],
                    "docTitle": document["title"],
                    "sectionTitle": section["sectionTitle"],
                    "chunkId": f"{document['docId']}-{section_index}-{chunk_index}",
                    "text": text,
                    "tags": document["tags"],
                    "sourcePath": document["sourcePath"],
                    "updatedAt": document["updatedAt"],
                }
            )
            chunk_index += 1

        for paragraph in paragraphs:
            candidate = f"{text_buffer}\n\n{paragraph}".strip() if text_buffer else paragraph
            if len(candidate) <= max_length:
                text_buffer = candidate
                continue

            if text_buffer:
                push_chunk(text_buffer)
                # 保留上一块末尾的一小段文本，减少切块边界导致的语义断裂。
                overlap = text_buffer[-overlap_length:] if overlap_length > 0 else ""
                text_buffer = f"{overlap}\n\n{paragraph}".strip() if overlap else paragraph
                if len(text_buffer) <= max_length:
                    continue

            remaining = paragraph
            while len(remaining) > max_length:
                push_chunk(remaining[:max_length])
                remaining = remaining[max(1, max_length - overlap_length):]
            text_buffer = remaining

        if text_buffer:
            push_chunk(text_buffer)

    return chunks
