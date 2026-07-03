# MyQA 智能 Agent 架构学习文档

这份文档只讲当前仓库里真实存在的 Agent 流程。重点不是罗列模块名，而是讲清楚：

1. 每一步输入是什么。
2. 每一步生成什么结果。
3. 这个结果被下一步怎么使用。
4. 出问题时应该看哪段代码和哪条 Trace。

## 1. 一句话总览

MyQA Agent 的主线是：

```text
用户输入 goal
  -> 读取当前记忆 currentMemory
  -> 计算可展示的 Memory Views
  -> AgentInputAnalyzer 调模型，生成 memoryPatch + route
  -> RequestRouter 修正 route，决定 chat / memory_only / clarification / task
  -> MemoryPolicy 判断 memoryPatch 是否写入长期记忆
  -> 非 task：直接生成 Trace 和回复，不执行工具
  -> task：Planner 生成 toolSteps
  -> Executor 按 toolSteps 调用 Tool Registry
  -> Evaluator 必要时做 ReAct 修正
  -> ResultCards / ActionCards 生成前端卡片
  -> FinalSummarizer 基于真实工具结果生成最终回答
  -> AgentTrace 保存全过程
  -> AgentMemory 保存最近 3 轮上下文
```

入口代码：

- HTTP 入口：`uni-qa(back)/src/routes/agent.js`
- 主流程：`uni-qa(back)/src/agent/agentExecutor.js` 的 `runAgentTask()`

最重要的判断：

```js
if (route.mode !== 'task') {
  // 直接走 chat / memory_only / clarification
  // 不调用 Planner
  // 不调用 Tool Registry
}
```

所以 `RequestRouter` 不是专门执行 task 的，它是 task 执行前的门卫。只有它最终给出 `route.mode = task`，后面才会进入 Planner 和工具链。

## 2. 核心数据流表

| 步骤 | 输入 | 生成结果 | 下一步怎么用 | 代码位置 |
| --- | --- | --- | --- | --- |
| 1. 读取当前记忆 | `userId` | `currentMemory` | 给输入分析器理解用户历史偏好 | `agentMemoryService.js#getOrCreateMemory()` |
| 2. 序列化记忆 | `currentMemory` | `serializeMemory(currentMemory)` | 传给模型，避免暴露完整 Mongo 文档 | `agentMemoryService.js#serializeMemory()` |
| 3. 计算 Memory Views | `userId` | `profileView / recentContextView / timelineView / toolSuccessView` | 写入 Trace 和 Ledger，用于解释本次参考了哪些记忆 | `agentMemoryLedgerService.js#getMemoryViews()` |
| 4. 输入分析 | `goal + memory` | `inputAnalysis = { memoryPatch, route }` | `memoryPatch` 给记忆策略，`route` 给分流 | `agentInputAnalyzer.js#analyzeAgentInput()` |
| 5. 路由修正 | 模型 route | 最终 route | 判断是否进入 Planner | `agentRequestRouter.js#finalizeRoute()` |
| 6. 记忆策略 | `memoryPatch` | `policyDecision` | 判断是否真正写长期记忆 | `agentMemoryPolicy.js#decideMemoryPolicy()` |
| 7. 更新记忆 | `memoryPatchForWrite` | `updatedMemory` | Planner 使用更新后的偏好 | `agentMemoryService.js#updateMemoryWithPatch()` |
| 8. 非 task 分支 | `route.mode !== task` | 非任务 Trace | 直接回复，不调工具 | `agentExecutor.js#createNonTaskTrace()` |
| 9. Planner | `goal + memory` | `plannerResult = { intent, plan, toolSteps }` | Executor 按 toolSteps 执行 | `agentPlanner.js#createPlan()` |
| 10. 执行工具 | `toolSteps` | `toolResults` | 生成卡片、总结、ReAct 判断 | `agentExecutor.js#executeToolStep()` |
| 11. ReAct 评估 | `search_questions` 结果 | `evaluation` | 不足时放宽条件再查 | `agentEvaluator.js#evaluateToolResult()` |
| 12. 生成卡片 | `toolResults` | `resultCards / actionCards` | 前端展示结果或确认按钮 | `agentExecutor.js#buildQuestionCards()` 等 |
| 13. 最终总结 | 工具事实和卡片 | `finalSummary` | 写入 `trace.finalAnswer` | `agentFinalSummarizer.js#summarizeFinalAnswer()` |
| 14. 保存上下文 | `goal + finalAnswer + resultCards` | 最近 3 轮上下文 | 下一次用户说“刚才那个”时可补参 | `agentMemoryService.js#appendContextTurn()` |

## 3. 第一步：读取当前记忆

代码位置：

- `uni-qa(back)/src/agent/agentExecutor.js#runAgentTask()`
- `uni-qa(back)/src/agent/agentMemoryService.js#getOrCreateMemory()`
- `uni-qa(back)/src/agent/agentMemoryService.js#serializeMemory()`

主流程一开始会做：

```js
const currentMemory = await getOrCreateMemory(userId);
const memoryViews = await getMemoryViews(userId);
const inputAnalysis = await analyzeAgentInput(goal, serializeMemory(currentMemory));
```

这里产生两个和记忆有关的结果。

第一个是 `serializeMemory(currentMemory)`，它会变成这种结构：

```json
{
  "preferences": {
    "topics": ["Java"],
    "keywords": ["后端"],
    "minReward": 30,
    "avoidTopics": ["硬件"]
  },
  "summaries": ["用户偏好 Java 高赏金问题"],
  "contextTurns": [
    {
      "role": "user",
      "content": "帮我找 Java 高赏金问题",
      "intent": "",
      "resultCards": []
    },
    {
      "role": "agent",
      "content": "我筛出了 1 个问题",
      "intent": "question_discovery",
      "resultCards": []
    }
  ]
}
```

它的下游用途：

- 传给 `AgentInputAnalyzer`，让模型知道用户已有偏好。
- 更新记忆后再传给 `Planner`，让 Planner 能用偏好补全工具参数。
- 保存到 `AgentTrace.memorySnapshot`，方便历史回看。

第二个是 `memoryViews`，它不是单独落库的表，而是实时计算出来的展示视图：

```json
{
  "profileView": {
    "preferences": {
      "topics": ["Java"],
      "minReward": 30
    }
  },
  "recentContextView": [],
  "timelineView": [],
  "toolSuccessView": []
}
```

它的下游用途：

- `attachMemoryStartTrace()` 写入 `memory_read` step。
- `recordMemoryRead()` 写入 Ledger，表示本次任务读取过哪些记忆。
- 前端历史页可以展示“Agent 执行前参考了哪些记忆”。

注意：当前代码里 Planner 实际接收的是 `memory`，不是直接接收 `memoryViews`。`Memory Views` 主要用于可观测性和前端解释。

## 4. 第二步：AgentInputAnalyzer 一次模型调用生成两个结果

代码位置：

- `uni-qa(back)/src/agent/agentInputAnalyzer.js#analyzeAgentInput()`
- `uni-qa(back)/src/agent/agentInputAnalyzer.js#normalizeModelRoute()`
- `uni-qa(back)/src/agent/agentMemoryPatchNormalizer.js#normalizeMemoryPatch()`

`AgentInputAnalyzer` 会调用一次模型，要求模型只返回 JSON：

```json
{
  "memoryPatch": {},
  "route": {}
}
```

这一步同时解决两个问题：

```text
memoryPatch：这句话要不要记住？
route：这句话要聊天、记忆、追问，还是执行任务？
```

### 4.1 memoryPatch 是什么

例子：用户输入：

```text
以后优先推荐 Java 高赏金问题
```

模型可能返回：

```json
{
  "shouldRemember": true,
  "operation": "add",
  "type": "preference",
  "content": "用户以后优先推荐 Java 高赏金问题",
  "topics": ["Java"],
  "keywords": ["高赏金"],
  "minReward": 0,
  "avoidTopics": [],
  "confidence": 0.9,
  "summary": "用户偏好 Java 高赏金问题"
}
```

下游怎么用：

1. `normalizeMemoryPatch()` 清洗字段，保证数组、数字、布尔值格式稳定。
2. `decideMemoryPolicy()` 判断是否写入长期记忆。
3. `updateMemoryWithPatch()` 把它应用到 `AgentMemoryModel.preferences`。
4. `finalizeMemoryCycle()` 把前面已经产生的 Policy 决策补记到 Trace 和 Ledger，方便历史回看。

### 4.2 route 是什么

例子：用户输入：

```text
帮我找 Java 高赏金问题
```

模型可能返回：

```json
{
  "mode": "task",
  "intent": "question_discovery",
  "confidence": 0.86,
  "reason": "用户要求查询平台问题并推荐",
  "shouldExecuteTools": true,
  "missingFields": [],
  "clarificationQuestion": ""
}
```

下游怎么用：

1. `normalizeModelRoute()` 只保留 Router 需要的字段。
2. `finalizeRoute()` 做规则保护和置信度判断。
3. `runAgentTask()` 根据最终 `route.mode` 决定是否进入 Planner。

## 5. missingFields 从哪里来，怎么用

结论：`missingFields` 主要来自模型输出的 `route.missingFields`。

代码位置：

- 提示词要求：`agentInputAnalyzer.js#analyzeAgentInput()`
- 字段清洗：`agentInputAnalyzer.js#normalizeModelRoute()`
- 字段归一化：`agentRequestRouter.js#normalizeStringList()`
- 缺参拦截：`agentRequestRouter.js#applyRouteGuard()`
- 追问文案：`agentExecutor.js#buildClarificationAnswer()`

模型提示词里明确要求：

```text
missingFields 填执行任务缺少的关键字段，例如 questionId。
```

比如用户说：

```text
查看这个问题的申请者
```

如果最近 3 轮上下文里没有能定位的问题，模型应该返回：

```json
{
  "mode": "clarification",
  "intent": "question_applicants",
  "confidence": 0.82,
  "missingFields": ["questionId"],
  "clarificationQuestion": "请告诉我你要查看哪个问题，可以提供问题标题或 questionId。"
}
```

然后 `applyRouteGuard()` 会做这个判断：

```js
if (guardedRoute.missingFields.length) {
  return {
    ...guardedRoute,
    mode: 'clarification',
    shouldExecuteTools: false,
    guardReason: '任务缺少关键参数，先向用户追问。'
  };
}
```

这一步的结果是：

```json
{
  "mode": "clarification",
  "shouldExecuteTools": false,
  "missingFields": ["questionId"],
  "confidenceDecision": "clarification_requested"
}
```

下一步怎么用：

- `runAgentTask()` 看到 `route.mode !== 'task'`，不会进入 Planner。
- `createNonTaskTrace()` 创建一条 clarification Trace。
- `buildClarificationAnswer()` 根据 `missingFields` 生成追问。

最终用户看到的是：

```text
请告诉我你要查看哪个问题，可以提供问题标题或 questionId。
```

注意：`create_question` 工具内部也有 `missingFields`，那是工具参数校验错误，例如缺少 title、topic、reward。它和 Router 的 `route.missingFields` 不是同一个阶段：

```text
route.missingFields：执行工具前发现任务信息不足。
tool error.missingFields：已经进入工具后，工具发现参数不完整。
```

## 6. confidence 从哪里来，怎么用

当前有两种 `confidence`，名字一样，但用途不同。

| 字段 | 来源 | 用途 | 阈值 | 代码位置 |
| --- | --- | --- | --- | --- |
| `route.confidence` | 模型输出的 `route.confidence` | 判断是否允许进入 task 工具链 | `0.65` | `agentRequestRouter.js#applyConfidencePolicy()` |
| `memoryPatch.confidence` | 模型输出的 `memoryPatch.confidence` | 判断是否写入长期记忆 | `0.45` | `agentMemoryPolicy.js#decideMemoryPolicy()` |

### 6.1 route.confidence

例子：

```json
{
  "mode": "task",
  "confidence": 0.4,
  "missingFields": []
}
```

`finalizeRoute()` 会先调用 `normalizeConfidence()`：

```text
0.8  -> 0.8
85   -> 0.85
-1   -> 0
abc  -> 0
2    -> 1
```

然后 `applyConfidencePolicy()` 判断：

```js
if (
  normalizedRoute.mode === 'task'
  && confidence < TASK_CONFIDENCE_THRESHOLD
  && !explicitlyGuardedTask
) {
  return {
    ...normalizedRoute,
    mode: 'clarification',
    shouldExecuteTools: false,
    confidenceDecision: 'below_task_threshold'
  };
}
```

也就是说：

```text
模型觉得是 task，但置信度低于 0.65
并且用户没有明确说“帮我查/发布/统计/查看”
  -> 改成 clarification
  -> 先问清楚，不调用工具
```

如果用户明确说：

```text
帮我查 Java 问题
```

即使模型给了：

```json
{ "mode": "task", "confidence": 0.4 }
```

`hasExplicitExecutionIntent()` 会命中“帮我查”，`applyRouteGuard()` 会把它保护成 task：

```json
{
  "mode": "task",
  "shouldExecuteTools": true,
  "guardReason": "检测到明确执行意图，进入 Planner 和工具执行。",
  "confidenceDecision": "accepted"
}
```

### 6.2 memoryPatch.confidence

例子：

```json
{
  "shouldRemember": true,
  "confidence": 0.3,
  "summary": "用户可能偏好 Java"
}
```

`decideMemoryPolicy()` 会判断：

```js
if (confidence > 0 && confidence < 0.45) {
  return {
    shouldWrite: false,
    eventType: 'memory_ignore',
    reason: '记忆置信度低于 0.45，Policy 暂不写入长期记忆。'
  };
}
```

下一步怎么用：

- `policyDecision.shouldWrite = false`
- `memoryPatchForWrite.shouldRemember` 被改成 `false`
- `updateMemoryWithPatch()` 不会把它写入长期偏好
- `memory_policy` step 会把这个已发生的审核结果记录下来，说明“为什么没写”

这样做的原因是：执行任务和写长期记忆风险不同。

```text
执行工具：低置信度可能查错东西，所以 0.65 以下先追问。
写记忆：低置信度可能污染长期偏好，所以 0.45 以下忽略。
```

## 7. RequestRouter 具体怎么改 route

代码位置：`uni-qa(back)/src/agent/agentRequestRouter.js`

`finalizeRoute()` 实际是两步：

```js
function finalizeRoute(goal, memoryExtraction, route) {
  return applyConfidencePolicy(applyRouteGuard(goal, memoryExtraction, route));
}
```

### 7.1 applyRouteGuard()

它处理三类问题。

第一类：纯偏好，不执行工具。

```text
用户：以后推荐给我硬件问题
模型：route.mode = task
memoryPatch.shouldRemember = true
```

如果没有明确执行词，Guard 会改成：

```json
{
  "mode": "memory_only",
  "shouldExecuteTools": false,
  "guardReason": "检测到纯未来偏好表达，只更新记忆，不执行工具。"
}
```

第二类：缺少关键参数，先追问。

```text
用户：查看这个问题的申请者
模型：missingFields = ["questionId"]
```

Guard 会改成：

```json
{
  "mode": "clarification",
  "shouldExecuteTools": false,
  "guardReason": "任务缺少关键参数，先向用户追问。"
}
```

第三类：明确执行意图，允许进入 task。

```text
用户：帮我发布一个 Java 问题，赏金 30 元
模型：route.mode = chat
```

只要命中“发布问题”等强执行词，Guard 会改成：

```json
{
  "mode": "task",
  "shouldExecuteTools": true,
  "guardReason": "检测到明确执行意图，进入 Planner 和工具执行。"
}
```

### 7.2 applyConfidencePolicy()

它只负责低置信度 task 是否要暂停。

决策表：

| 条件 | 结果 |
| --- | --- |
| `mode = clarification` | 保持 clarification，`confidenceDecision = clarification_requested` |
| `mode = task` 且 `confidence >= 0.65` | 放行，`confidenceDecision = accepted` |
| `mode = task` 且 `confidence < 0.65`，但 Guard 命中明确执行词 | 放行，`confidenceDecision = accepted` |
| `mode = task` 且 `confidence < 0.65`，没有明确执行词 | 改成 clarification，`confidenceDecision = below_task_threshold` |

## 8. 非 task 分支怎么返回

代码位置：

- `agentExecutor.js#createNonTaskTrace()`
- `agentExecutor.js#buildChatAnswer()`
- `agentExecutor.js#buildClarificationAnswer()`

只要：

```js
route.mode !== 'task'
```

就会走非任务分支。

### 8.1 chat

输入：

```text
你好
```

产物：

```json
{
  "mode": "chat",
  "finalAnswer": "我在。你可以直接和我聊天；如果要让我执行平台任务，可以说..."
}
```

下一步：

- 创建 `chat` step。
- 创建 `final` step。
- 保存最近 3 轮上下文。
- 不调用 Planner。

### 8.2 memory_only

输入：

```text
以后优先推荐 Java 问题
```

产物：

```json
{
  "mode": "memory_only",
  "memoryPatch": {
    "shouldRemember": true,
    "topics": ["Java"]
  },
  "finalAnswer": "已记住你的偏好：用户以后优先推荐 Java 问题"
}
```

下一步：

- `updateMemoryWithPatch()` 写入偏好。
- `memory_policy` step 记录前面 Policy 已经允许写入，以及为什么允许写。
- `memory_view` step 展示刷新后的当前视图。
- 不调用 Planner。

### 8.3 clarification

输入：

```text
查看这个问题的申请者
```

产物：

```json
{
  "mode": "clarification",
  "missingFields": ["questionId"],
  "finalAnswer": "请告诉我你要查看哪个问题，可以提供问题标题或 questionId。"
}
```

下一步：

- 保存 `waiting_clarification` 状态。
- 不调用 Planner。
- 用户下一轮补充问题标题后，再重新走一次 `runAgentTask()`。

## 9. Planner 生成什么，Executor 怎么用

代码位置：

- `uni-qa(back)/src/agent/agentPlanner.js#createPlan()`
- `uni-qa(back)/src/agent/agentPlanner.js#normalizeModelPlan()`
- `uni-qa(back)/src/agent/agentExecutor.js#resolveStepInput()`

当 `route.mode = task` 时，才会执行：

```js
const plannerResult = await createPlan(goal, memory);
```

`Planner` 输出的核心是 `toolSteps`：

```json
{
  "intent": "question_discovery",
  "plan": [
    "读取用户画像和偏好记忆",
    "搜索平台待回答问题",
    "按用户偏好、赏金和新鲜度排序",
    "基于实际工具结果生成最终回答"
  ],
  "toolSteps": [
    {
      "toolName": "get_user_profile",
      "input": {}
    },
    {
      "toolName": "search_questions",
      "input": {
        "keyword": "Java",
        "topic": "编程",
        "minReward": 30
      }
    },
    {
      "toolName": "rank_questions_for_user",
      "inputFrom": "search_questions"
    }
  ],
  "needsConfirmation": false,
  "source": "model",
  "sourceLabel": "模型 Planner"
}
```

下游怎么用：

1. `AgentTraceModel.create()` 先写入 `plan` step。
2. `for (const step of plannerResult.toolSteps)` 逐个执行。
3. 每个 step 进入 `resolveStepInput()`，把引用转换成真实输入。
4. `callTool(step.toolName, { userId, input, memory })` 调用真实工具。

### 9.1 inputFrom 怎么用

`rank_questions_for_user` 通常不自己搜索，它吃上一步 `search_questions` 的结果。

Planner 可能输出：

```json
{
  "toolName": "rank_questions_for_user",
  "inputFrom": "search_questions"
}
```

Executor 会在 `resolveStepInput()` 中转换成：

```json
{
  "questions": "toolResults.search_questions.list"
}
```

真实传给排序工具的是数组，不是字符串：

```json
[
  {
    "questionId": "q1",
    "title": "Java 多线程问题",
    "reward": 30
  }
]
```

## 10. Tool Registry 生成什么结果

代码位置：`uni-qa(back)/src/agent/agentToolRegistry.js`

每个工具都类似 MCP Tool：

```js
{
  name: 'search_questions',
  description: '搜索平台当前发布的问题',
  inputSchema: {...},
  async handler({ userId, input, memory }) {
    return {...};
  }
}
```

工具结果会放入：

```js
toolResults[step.toolName] = output;
```

例子：

```json
{
  "search_questions": {
    "total": 2,
    "list": [
      {
        "questionId": "q1",
        "title": "Java 多线程怎么学习",
        "topic": "编程",
        "reward": 30
      }
    ]
  }
}
```

下游怎么用：

- `rank_questions_for_user` 使用 `search_questions.list` 排序。
- `buildQuestionCards()` 使用 `rank_questions_for_user.list` 生成推荐卡。
- `summarizeFinalAnswer()` 使用 `toolResults` 生成最终回答。
- `AgentTrace.steps` 保存 `tool_call` 和 `observation`，方便历史回看。

每个普通工具至少产生两条 Trace：

```json
{
  "type": "tool_call",
  "toolName": "search_questions",
  "input": {
    "keyword": "Java",
    "minReward": 30
  }
}
```

```json
{
  "type": "observation",
  "toolName": "search_questions",
  "output": {
    "total": 2,
    "list": []
  }
}
```

## 11. ReAct 修正结果怎么传递

代码位置：

- `agentEvaluator.js#evaluateToolResult()`
- `agentExecutor.js#mergeQuestionSearchResults()`

当前 ReAct 只针对 `search_questions`。

判断规则：

```text
search_questions 返回数量 < 3
并且用户没有说“必须、只能、严格、不放宽”
并且修正次数 < 2
  -> 生成 adjustedInput
  -> 再调一次 search_questions
```

Evaluator 生成：

```json
{
  "sufficient": false,
  "reason": "只找到 1 条候选问题，推荐类任务结果偏少。",
  "nextAction": "relax_search",
  "toolName": "search_questions",
  "adjustedInput": {
    "keyword": "编程",
    "topic": "",
    "minReward": 0,
    "limit": 20
  },
  "adjustmentSummary": "关键词从 Java 放宽为 编程；最低赏金从 30 元调整为 0 元"
}
```

下游怎么用：

1. Executor 写入 `react_reason` step。
2. Executor 用 `adjustedInput` 再次调用 `search_questions`。
3. 新旧结果通过 `mergeQuestionSearchResults()` 合并去重。
4. 合并后的结果覆盖 `toolResults.search_questions`。
5. 后续 `rank_questions_for_user` 用的是合并后的结果。
6. `adjustments` 会生成 `condition_adjustment` 卡片。
7. Final Summarizer 会说明“已放宽条件”。

## 12. ResultCards 和 ActionCards 怎么生成

代码位置：

- `agentExecutor.js#buildQuestionCards()`
- `agentExecutor.js#buildRefundCards()`
- `agentExecutor.js#buildTransactionCards()`
- `agentExecutor.js#buildApplicantCards()`
- `agentExecutor.js#buildActionCards()`

### 12.1 resultCards

`resultCards` 是已经发生的结果，前端直接展示。

例子：

```json
{
  "type": "question_recommendation",
  "title": "Java 多线程怎么学习",
  "description": "编程 · 30 元 · 匹配分 86",
  "payload": {
    "questionId": "q1",
    "topic": "编程",
    "reward": 30,
    "tags": ["Java"]
  }
}
```

下游怎么用：

- 前端展示结果卡。
- `appendContextTurn()` 压缩后保存到最近 3 轮上下文。
- 下一轮用户说“查看这个问题申请者”，Planner 可以从最近卡片里补出问题标题。

### 12.2 actionCards

`actionCards` 是还没执行、需要用户确认的动作。

例子：

```json
{
  "type": "publish_question_confirm",
  "title": "确认发布问题",
  "description": "将发布「Java 多线程怎么学习」，分类：编程，赏金：30 元。确认后会扣除余额并公开发布。",
  "payload": {
    "title": "Java 多线程怎么学习",
    "topic": "编程",
    "reward": 30
  },
  "confirmAction": "create_question"
}
```

下游怎么用：

- 前端展示“确认执行”按钮。
- 用户点击后调用 `POST /agent/action-confirm`。
- 后端 `confirmAgentAction()` 校验这张卡确实属于本次 Trace。
- 校验通过才调用 `create_question`。

## 13. Final Summarizer 怎么生成最终答案

代码位置：

- `agentExecutor.js#buildFinalSummaryWithModel()`
- `agentFinalSummarizer.js#summarizeFinalAnswer()`
- `agentExecutor.js#buildFinalAnswer()`

Final Summarizer 接收的不是原始空问题，而是一组事实：

```json
{
  "goal": "帮我找 Java 高赏金问题",
  "plannerResult": {},
  "traceSteps": [],
  "toolResults": {},
  "resultCards": [],
  "actionCards": [],
  "memory": {},
  "fallbackAnswer": "我按你的偏好、赏金和发布时间筛出了 1 个更适合回答的问题。"
}
```

模型生成：

```json
{
  "finalAnswer": "我按你的偏好筛出了 1 个 Java 相关问题。由于初次搜索候选偏少，我已放宽过搜索条件。",
  "statusLabel": "已完成",
  "nextActions": ["可以点击卡片查看问题详情"],
  "source": "model"
}
```

下游怎么用：

- `trace.finalAnswer = finalSummary.finalAnswer`
- `decision` step 记录 `finalSummarySource`
- `final` step 展示最终回答
- 如果模型失败，使用 `buildFinalAnswer()` 的规则兜底

这一步的原则是：

```text
最终答案必须基于真实 toolResults 和 cards。
没有查到就说没有查到。
需要确认就说需要用户确认。
不能说“已发布成功”，除非 create_question 已经真的执行成功。
```

## 14. Memory 收尾怎么保存

代码位置：

- `agentExecutor.js#finalizeMemoryCycle()`
- `agentMemoryLedgerService.js#recordMemoryPolicyDecision()`
- `agentMemoryLedgerService.js#recordToolSuccess()`
- `agentMemoryLedgerService.js#refreshMemoryViews()`
- `agentMemoryService.js#appendContextTurn()`

任务结束后会做两类保存。

第一类：长期记忆和 Ledger。这里要注意真实顺序：长期记忆写入判断和 `updateMemoryWithPatch()` 已经发生在 route 分支之前；`finalizeMemoryCycle()` 不是重新决定写不写，而是把这次决策补充记录到 Trace 和 Ledger。

```text
runAgentTask 前半段
  -> memoryPatch
  -> policyDecision
  -> updateMemoryWithPatch() 按 policyDecision 写入或忽略长期记忆

finalizeMemoryCycle 收尾
  -> memory_policy step 记录前面的 policyDecision
  -> AgentMemoryLedgerModel 追加 memory_write / memory_ignore / memory_forget
  -> refreshMemoryViews()
  -> memory_view step
```

第二类：最近 3 轮上下文。

```js
await appendContextTurn(userId, {
  goal,
  intent: plannerResult.intent,
  finalAnswer,
  resultCards
});
```

`appendContextTurn()` 会写入两条 turn：

```json
[
  {
    "role": "user",
    "content": "帮我找 Java 高赏金问题"
  },
  {
    "role": "agent",
    "content": "我筛出了 1 个问题",
    "intent": "question_discovery",
    "resultCards": []
  }
]
```

并且只保留最后 6 条，也就是最近 3 轮：

```js
memory.contextTurns = [...oldTurns, userTurn, agentTurn].slice(-6);
```

下游怎么用：

- 下一次 `AgentInputAnalyzer` 可以看到最近对话。
- 下一次 `Planner` 可以用最近 `resultCards` 补全“这个问题”“刚才那个”等指代。
- 历史页能展示用户和 Agent 之前聊过什么。

## 15. 完整例子：帮我找 Java 高赏金问题

用户输入：

```text
帮我找 Java 高赏金问题
```

### 15.1 读取记忆

假设当前记忆是：

```json
{
  "preferences": {
    "topics": ["Java"],
    "keywords": [],
    "minReward": 30,
    "avoidTopics": ["硬件"]
  },
  "contextTurns": []
}
```

用途：

- 输入分析器知道用户偏好 Java。
- Planner 搜索时可以补最低赏金。

### 15.2 输入分析

模型输出：

```json
{
  "memoryPatch": {
    "shouldRemember": false,
    "summary": "用户本次要求查找 Java 高赏金问题",
    "confidence": 0.2
  },
  "route": {
    "mode": "task",
    "intent": "question_discovery",
    "confidence": 0.9,
    "missingFields": [],
    "shouldExecuteTools": true
  }
}
```

下一步：

- `memoryPatch.shouldRemember = false`，不会写长期偏好。
- `route.mode = task` 且 `confidence = 0.9`，允许进入 Planner。

### 15.3 Router 修正

最终 route：

```json
{
  "mode": "task",
  "intent": "question_discovery",
  "confidence": 0.9,
  "confidenceThreshold": 0.65,
  "confidenceDecision": "accepted",
  "missingFields": [],
  "shouldExecuteTools": true
}
```

用途：

- `runAgentTask()` 看到 `task`，继续执行。

### 15.4 Planner 计划

Planner 输出：

```json
{
  "intent": "question_discovery",
  "toolSteps": [
    { "toolName": "get_user_profile", "input": {} },
    { "toolName": "search_questions", "input": { "keyword": "Java", "minReward": 30 } },
    { "toolName": "rank_questions_for_user", "inputFrom": "search_questions" }
  ]
}
```

用途：

- Executor 顺序执行这三个工具。
- 页面展示计划由 `toolSteps` 生成，避免自然语言 plan 和实际工具不一致。

### 15.5 工具执行

`search_questions` 返回：

```json
{
  "total": 1,
  "list": [
    {
      "questionId": "q1",
      "title": "Java 线程池参数怎么设置",
      "topic": "编程",
      "reward": 30
    }
  ]
}
```

用途：

- 写入 `toolResults.search_questions`。
- 写入 `observation` step。
- 交给 Evaluator 判断结果是否足够。

### 15.6 ReAct 修正

因为结果少于 3 条，Evaluator 输出：

```json
{
  "sufficient": false,
  "nextAction": "relax_search",
  "adjustedInput": {
    "keyword": "编程",
    "minReward": 0,
    "limit": 20
  }
}
```

Executor 再查一次，得到更多结果后合并：

```json
{
  "search_questions": {
    "total": 4,
    "list": []
  }
}
```

用途：

- 后续排序用合并后的 4 条。
- 前端生成“条件调整”卡片。

### 15.7 排序和卡片

`rank_questions_for_user` 输入：

```json
{
  "questions": [
    { "questionId": "q1", "title": "Java 线程池参数怎么设置" },
    { "questionId": "q2", "title": "后端接口怎么设计" }
  ]
}
```

输出：

```json
{
  "total": 2,
  "list": [
    {
      "questionId": "q1",
      "title": "Java 线程池参数怎么设置",
      "matchScore": 88,
      "reason": "匹配 Java 偏好且赏金较高"
    }
  ]
}
```

下游：

- `buildQuestionCards()` 生成推荐卡。
- `summarizeFinalAnswer()` 生成最终回答。

### 15.8 最终回答

最终 Trace 里会有：

```json
{
  "finalAnswer": "我按你的 Java 偏好和赏金要求筛出了 1 个更适合回答的问题。由于初次搜索候选偏少，我已放宽过搜索条件。"
}
```

同时上下文会保存这轮的推荐卡。下一次用户说：

```text
查看这个问题的申请者
```

Planner 就有机会从最近 `resultCards` 里找到刚才推荐的问题。

## 16. 完整例子：以后推荐 Java 问题

用户输入：

```text
以后推荐给我 Java 问题
```

输入分析结果：

```json
{
  "memoryPatch": {
    "shouldRemember": true,
    "operation": "add",
    "topics": ["Java"],
    "confidence": 0.9,
    "summary": "用户希望以后优先推荐 Java 问题"
  },
  "route": {
    "mode": "memory_only",
    "confidence": 0.95,
    "shouldExecuteTools": false
  }
}
```

执行结果：

```text
不会进入 Planner
不会调用 search_questions
只更新 AgentMemoryModel.preferences.topics
写入 memory_policy step，记录前面已经完成的写入决策
刷新 memory_view step
保存最近 3 轮上下文
```

用户看到：

```text
已记住你的偏好：用户希望以后优先推荐 Java 问题
```

这解决了之前的问题：用户只是设置偏好时，不应该完整执行一遍工具链。

## 17. 完整例子：发布问题

用户输入：

```text
帮我发布一个 Java 多线程问题，赏金 30 元
```

Planner 输出：

```json
{
  "intent": "publish_question",
  "toolSteps": [
    {
      "toolName": "create_question",
      "input": {
        "title": "Java 多线程问题",
        "topic": "编程",
        "tags": ["Java"],
        "reward": 30
      }
    }
  ],
  "needsConfirmation": true
}
```

Executor 看到：

```js
CONFIRMATION_ONLY_TOOLS = new Set(['create_question'])
```

所以不会立即执行，而是生成：

```json
{
  "type": "publish_question_confirm",
  "confirmAction": "create_question",
  "payload": {
    "title": "Java 多线程问题",
    "topic": "编程",
    "reward": 30
  }
}
```

用户点击确认后：

```text
POST /agent/action-confirm
  -> confirmAgentAction()
  -> 校验 trace 属于当前 userId
  -> 校验 actionType 存在于 trace.actionCards
  -> callTool('create_question')
  -> 创建 QuestionModel
  -> 扣除余额
  -> 生成 published_question 结果卡
```

这就是 Human-in-the-loop：Agent 可以准备动作，但不能未经确认就发布问题或扣钱。

## 18. Trace 每一步保存了什么

代码位置：`uni-qa(back)/src/models/AgentTraceModel.js`

常见 step：

| step.type | 里面保存什么 | 排查时怎么看 |
| --- | --- | --- |
| `plan` | `plannerResult.intent / plan / plannerSource / memoryExtraction` | 看 Planner 是模型还是兜底 |
| `memory_read` | `profileView / recentContextCount / toolSuccessCount` | 看本次开始前读了哪些记忆 |
| `chat` | `route / memoryExtraction` | 看为什么没执行工具 |
| `memory` | `route / memoryExtraction` | 看为什么只记忆 |
| `clarification` | `route.missingFields / clarificationQuestion` | 看缺什么参数 |
| `tool_call` | `toolName / input` | 看实际调用哪个工具、参数是什么 |
| `observation` | `toolName / output` | 看工具真实返回 |
| `evaluation` | `sufficient / reason / nextAction` | 看是否触发 ReAct |
| `react_reason` | `adjustedInput / adjustmentSummary` | 看为什么放宽条件 |
| `react_action` | 修正后的工具调用 | 看第二次调用参数 |
| `decision` | `resultCardCount / actionCardCount / finalSummarySource` | 看最终答案来自模型还是兜底 |
| `final` | `summary = finalAnswer` | 用户最终看到的回答 |
| `memory_policy` | `policyDecision / memoryPatch` | 看前面 MemoryPolicy 已经决定写入或忽略的原因，不是这一刻才决定 |
| `memory_view` | 刷新后的视图摘要 | 看当前记忆视图是否变化 |

为什么一个问题会有很多 steps？

因为一个 step 只表示一次原子事件：

```text
计划是一件事
调用工具是一件事
观察结果是一件事
评估结果是一件事
修正搜索是一件事
最终总结是一件事
记忆策略是一件事
```

如果全部塞进一个 step，历史页就只能看到一坨 JSON，无法判断问题出在哪。

## 19. 常见问题排查

| 现象 | 优先看哪里 | 判断方式 |
| --- | --- | --- |
| 明明想查东西却没执行工具 | `chat / clarification` step 的 `output.route` | 看 `mode`、`confidenceDecision`、`missingFields` |
| 偏好句执行了完整工具链 | `route.guardReason` | 看是否被模型判成 task，Guard 是否没有识别纯偏好 |
| `missingFields` 不知道哪来的 | `AgentInputAnalyzer` 的 route 输出 | 它来自模型 route，Router 只清洗和使用 |
| `confidence` 不知道怎么生效 | `route.confidenceDecision` | `accepted / below_task_threshold / clarification_requested` |
| 计划和实际工具不一致 | `plan.output.plan` 和后续 `tool_call.toolName` | 当前计划由 toolSteps 生成，正常不应不一致 |
| 排序工具拿到空数组 | `search_questions.observation.output` 和 `rank_questions_for_user.tool_call.input` | 看 `resolveStepInput()` 是否拿到了上一步 list |
| 最终回答说完成但没结果 | `decision.output.finalSummarySource` 和 `toolResults` | 看模型总结是否没有遵守真实结果 |
| 发布问题没有发布 | `actionCards` 是否还存在 | 需要用户确认后才执行 |
| 记忆没有写入 | `memory_policy.output.policyDecision` | 看前面 `shouldWrite=false` 的原因，例如低于 0.45 |

## 20. 代码地图

| 模块 | 代码位置 | 负责什么 |
| --- | --- | --- |
| Agent 路由入口 | `uni-qa(back)/src/routes/agent.js` | 接收 `/agent/runs`、历史、确认动作 |
| 主执行器 | `uni-qa(back)/src/agent/agentExecutor.js` | 串起输入分析、路由、Planner、工具、Trace、最终总结 |
| 输入分析器 | `uni-qa(back)/src/agent/agentInputAnalyzer.js` | 一次模型调用生成 `memoryPatch + route` |
| 请求路由器 | `uni-qa(back)/src/agent/agentRequestRouter.js` | 用 Guard、`missingFields`、`confidence` 修正 route |
| 记忆补丁归一化 | `uni-qa(back)/src/agent/agentMemoryPatchNormalizer.js` | 清洗 `memoryPatch`，模型失败或缺字段时做规则兜底 |
| 记忆策略 | `uni-qa(back)/src/agent/agentMemoryPolicy.js` | 判断记忆是否写入 Ledger |
| 当前记忆 | `uni-qa(back)/src/agent/agentMemoryService.js` | 保存偏好和最近 3 轮上下文 |
| 记忆账本/视图 | `uni-qa(back)/src/agent/agentMemoryLedgerService.js` | 保存 Ledger，实时计算 Memory Views |
| Planner | `uni-qa(back)/src/agent/agentPlanner.js` | 让模型选择工具步骤，并白名单过滤 |
| 工具注册表 | `uni-qa(back)/src/agent/agentToolRegistry.js` | 定义 Agent 能调用的真实平台工具 |
| ReAct 评估 | `uni-qa(back)/src/agent/agentEvaluator.js` | 搜索结果不足时放宽条件 |
| 最终总结 | `uni-qa(back)/src/agent/agentFinalSummarizer.js` | 基于真实工具结果生成最终回答 |
| Trace 模型 | `uni-qa(back)/src/models/AgentTraceModel.js` | 保存一次运行的 steps、卡片、最终回答 |

## 21. 最短复习版

```text
1. goal 进入 runAgentTask。
2. 先读 AgentMemoryModel，再序列化成 memory。
3. AgentInputAnalyzer 调一次模型，生成 memoryPatch 和 route。
4. missingFields 来自模型 route.missingFields，Router 看到它就改成 clarification。
5. route.confidence 来自模型 route.confidence，低于 0.65 且没有明确执行词就先追问。
6. memoryPatch.confidence 控制记忆写入，低于 0.45 不写长期记忆。
7. 非 task 不进 Planner，也不调工具。
8. task 才进入 Planner，Planner 只输出 toolSteps。
9. Executor 按 toolSteps 调工具，每个工具写 tool_call 和 observation。
10. search_questions 结果少于 3 条时，Evaluator 最多做 2 轮 ReAct 放宽条件。
11. resultCards 是已发生结果，actionCards 是待确认动作。
12. create_question 必须用户确认后才真正发布和扣余额。
13. Final Summarizer 只能根据真实工具结果总结。
14. Trace 保存全过程，Memory 保存偏好和最近 3 轮上下文。
```


