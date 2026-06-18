# MyQA Python RAG 子项目

这个子项目专门负责：

- `sentence-transformers` 向量化
- `qdrant_client(path=...)` 本地向量库存储
- 知识文档切块
- 索引构建
- 检索返回

主项目里的 `Node/Express` 后端继续负责：

- 业务接口
- MongoDB 查询
- WebSocket
- 人工客服流程
- 调大模型生成最终回复

## 1. 安装依赖

建议在你现有的虚拟环境里执行：

```powershell
pip install -r requirements.txt
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，然后按需修改：

```powershell
copy .env.example .env
```

## 3. 启动服务

```powershell
uvicorn app:app --host 127.0.0.1 --port 8001 --reload
```

## 4. 接口说明

### 健康检查

`GET /health`

### 建索引

`POST /index`

请求体示例：

```json
{
  "recreate": true,
  "doc_id": ""
}
```

### 检索

`POST /search`

请求体示例：

```json
{
  "query": "退款为什么还没处理",
  "limit": 8
}
```

## 5. 知识目录

默认读取：

```text
../docs/ai-knowledge
```

也就是当前 Node 后端已经有的客服知识文档目录。
