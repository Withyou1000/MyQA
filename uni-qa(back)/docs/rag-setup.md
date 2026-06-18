# MyQA 智能客服 RAG 启动说明

## 1. 功能结构
当前客服智能化能力分成三层：

- `Python + qdrant_client(path=...)`：负责本地向量库的写入、删除和检索
- `sentence-transformers`：负责把问题和知识片段转成向量
- `MongoDB 实时查询`：负责读取当前用户的交易、退款、客服会话和最近消息

系统不会把用户实时状态塞进向量库。规则类问题走 `RAG`，用户个人进度类问题走数据库查询。

## 2. 环境变量
复制 `.env.example` 为 `.env`，至少补齐以下配置：

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `QDRANT_PATH`
- `EMBEDDING_MODEL_NAME`

如果本机 Python 不是 `py`，请把 `PYTHON_BIN` 改成实际命令，例如：

```env
PYTHON_BIN=C:\Python311\python.exe
```

## 3. 本地向量库目录
当前方案不依赖单独启动的 Qdrant HTTP 服务。

向量数据默认落在：

```text
uni-qa(back)/.qdrant
```

也可以通过 `.env` 里的 `QDRANT_PATH` 改到别的本地目录。

## 4. 检查 Python 依赖
当前实现通过 Python 子进程调用：

- `sentence-transformers`
- `qdrant_client`
- 可选的 `CrossEncoder`

建议先在本机手动确认：

```powershell
& "你的python.exe" -c "import sentence_transformers; import qdrant_client; print('ok')"
```

如果后续要启用重排，再确认：

```powershell
& "你的python.exe" -c "from sentence_transformers import CrossEncoder; print('ok')"
```

## 5. 初始化知识库
知识文档目录：

```text
uni-qa(back)/docs/ai-knowledge/
```

当前已经内置 4 份示例文档：

- `platform-rules.md`
- `refund-policy.md`
- `adoption-flow.md`
- `customer-service-faq.md`

首次建索引：

```powershell
npm run rag:index -- --recreate
```

只重建单个文档：

```powershell
npm run rag:index -- --doc=refund-policy
```

## 6. 启动后端
进入后端目录：

```powershell
cd uni-qa(back)
```

开发模式启动：

```powershell
npm run dev
```

正式启动：

```powershell
npm start
```

## 7. 当前已接入的能力
- 普通用户发送客服消息时，默认优先进入 `AI` 会话模式
- AI 会先检索知识库，再查实时业务上下文，再请求模型生成回复
- 检索不足、模型置信度低、账号异常、投诉纠纷、用户明确要求人工时，会建议转人工
- 用户确认后，复用现有人工客服请求链路
- 人工接单后，该会话停止 AI 自动回复

## 8. 首版限制
- 必须先准备可用的 `AI_BASE_URL / AI_API_KEY / AI_MODEL`
- 必须本地能跑 `sentence-transformers`
- 必须本地能跑 `qdrant_client(path=...)`
- `Cross-Encoder` 已预留接口，但默认关闭
- 若模型或本地向量库不可用，系统会降级为提示转人工，不会直接崩溃

## 9. 推荐的联调顺序
建议按下面顺序联调：

1. 先配好 `.env`
2. 跑 `npm run rag:index -- --recreate`
3. 启动后端
4. 用普通用户账号进入客服聊天
5. 先问平台规则类问题，验证 RAG
6. 再问退款进度、问题状态，验证数据库上下文
7. 再测试“转人工客服”链路
