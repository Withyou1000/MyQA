<template>
  <view :class="['agent-page', themePageClass]">
    <view class="agent-header">
      <view>
        <text class="eyebrow">Agent Workspace</text>
        <text class="title">智能 Agent 助手</text>
        <text class="desc">输入一个目标，观察它如何规划、调用工具、记忆偏好并给出可确认动作。</text>
      </view>
      <button class="history-btn" @click="goToHistory">历史</button>
    </view>

    <view class="goal-panel">
      <textarea
        v-model="goal"
        class="goal-input"
        maxlength="300"
        placeholder="例如：帮我找现在平台上适合我回答的 Java 高赏金问题"
      />
      <view class="example-row">
        <button class="example-btn" @click="fillExample('帮我找现在平台上适合我回答的 Java 高赏金问题')">
          找高赏金问题
        </button>
        <button class="example-btn" @click="fillExample('以后优先推荐前端和 Vue 相关的问题')">
          记住偏好
        </button>
        <button class="example-btn" @click="fillExample('我的退款现在处理到哪一步了')">
          查退款
        </button>
      </view>
      <button class="run-btn" :disabled="running || !goal.trim()" @click="startAgentRun">
        {{ running ? 'Agent 执行中...' : '启动 Agent' }}
      </button>
    </view>

    <view class="memory-panel">
      <view class="panel-title-row">
        <text class="panel-title">记忆系统</text>
        <button class="ghost-btn" @click="loadMemorySystem">刷新</button>
      </view>
      <view class="memory-tags">
        <text v-if="!memoryTags.length" class="muted">还没有沉淀偏好，试试“以后优先推荐前端问题”。</text>
        <text v-for="tag in memoryTags" :key="tag" class="memory-tag">{{ tag }}</text>
      </view>
      <view class="memory-tabs">
        <button
          v-for="tab in memoryTabs"
          :key="tab.key"
          :class="['memory-tab', { active: activeMemoryTab === tab.key }]"
          @click="activeMemoryTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </view>
      <view class="memory-tab-body">
        <view v-if="activeMemoryTab === 'policy'" class="memory-block">
          <text class="memory-block-title">Policy 决策</text>
          <text v-if="!latestPolicyStep" class="muted">运行 Agent 后，这里会显示是否写入、忽略或遗忘记忆。</text>
          <template v-else>
            <text class="memory-line">动作：{{ latestPolicyStep.output?.policyDecision?.action || '-' }}</text>
            <text class="memory-line">原因：{{ latestPolicyStep.summary }}</text>
            <text class="memory-line">类型：{{ latestPolicyStep.output?.policyDecision?.memoryType || '-' }}</text>
          </template>
        </view>
        <view v-if="activeMemoryTab === 'ledger'" class="memory-block">
          <text class="memory-block-title">Ledger 原始账本</text>
          <text v-if="!ledgerEvents.length" class="muted">暂无账本事件。</text>
          <view v-for="event in ledgerEvents.slice(0, 6)" :key="event._id" class="ledger-row">
            <text class="memory-line">{{ formatLedgerEvent(event) }}</text>
            <text class="memory-mini">{{ event.reason }}</text>
          </view>
        </view>
        <view v-if="activeMemoryTab === 'views'" class="memory-block">
          <text class="memory-block-title">Views 派生视图</text>
          <text class="memory-line">偏好：{{ formatList(memoryViews?.profileView?.topics) || '暂无' }}</text>
          <text class="memory-line">关键词：{{ formatList(memoryViews?.profileView?.keywords) || '暂无' }}</text>
          <text class="memory-line">最低赏金：{{ memoryViews?.profileView?.minReward || 0 }} 元</text>
          <text class="memory-line">规避主题：{{ formatList(memoryViews?.profileView?.avoidTopics) || '暂无' }}</text>
        </view>
      </view>
    </view>

    <view class="trace-panel">
      <view class="panel-title-row">
        <text class="panel-title">执行轨迹</text>
        <text class="status-pill">{{ statusLabel }}</text>
      </view>

      <view v-if="!traceSteps.length" class="empty-trace">
        <text>Agent 运行后，这里会展示“计划 -> 工具调用 -> 观察 -> 决策”的完整过程。</text>
      </view>

      <view v-for="(step, index) in traceSteps" :key="`${step.type}-${index}`" class="trace-item">
        <view class="trace-index">{{ index + 1 }}</view>
        <view class="trace-content">
          <view class="trace-head">
            <text class="trace-type">{{ formatStepType(step.type) }}</text>
            <text class="trace-title">{{ step.title || step.toolName || 'Agent 步骤' }}</text>
          </view>
          <text class="trace-summary">{{ step.summary || '已完成该步骤。' }}</text>
          <view v-if="step.toolName" class="tool-chip">tool: {{ step.toolName }}</view>
          <view v-if="step.input" class="json-box">
            <text>{{ compactJson(step.input) }}</text>
          </view>
          <view v-if="step.output" class="json-box">
            <text>{{ compactJson(step.output) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="finalAnswer" class="answer-panel">
      <text class="panel-title">最终建议</text>
      <text class="answer-text">{{ finalAnswer }}</text>
    </view>

    <view v-if="resultCards.length" class="result-panel">
      <text class="panel-title">结果卡片</text>
      <view v-for="card in resultCards" :key="`${card.type}-${card.title}`" class="result-card">
        <text class="card-type">{{ formatCardType(card.type) }}</text>
        <text class="card-title">{{ card.title }}</text>
        <text class="card-desc">{{ card.description }}</text>
        <view v-if="card.type === 'question_applicants'" class="applicant-list">
          <view
            v-for="applicant in card.payload?.applicants || []"
            :key="applicant.applicantId"
            class="applicant-row"
          >
            <text class="applicant-name">{{ applicant.name || applicant.account || '匿名用户' }}</text>
            <text class="applicant-meta">Lv.{{ applicant.level || 0 }} · 评分 {{ applicant.ratingScore || 0 }}</text>
          </view>
        </view>
        <view v-if="card.type === 'question_selection'" class="candidate-list">
          <view
            v-for="item in card.payload?.ownedQuestions || []"
            :key="item.questionId"
            class="candidate-row"
          >
            <text class="candidate-title">{{ item.title }}</text>
            <text class="candidate-meta">{{ item.status }} · {{ item.applicationCount || 0 }} 个申请</text>
          </view>
        </view>
        <button
          v-if="card.type === 'question_recommendation' || card.type === 'published_question'"
          class="detail-btn"
          @click="openQuestion(card.payload?.questionId)"
        >
          查看问题
        </button>
      </view>
    </view>

    <view v-if="actionCards.length" class="action-panel">
      <text class="panel-title">需要你确认</text>
      <view v-for="card in actionCards" :key="card.confirmAction" class="action-card">
        <text class="card-title">{{ card.title }}</text>
        <text class="card-desc">{{ card.description }}</text>
        <button class="confirm-btn" :disabled="confirming" @click="confirmAction(card)">
          {{ confirming ? '执行中...' : '确认执行' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { agentApi } from '@/api/agent'

const goal = ref('')
const running = ref(false)
const confirming = ref(false)
const currentRunId = ref('')
const traceSteps = ref([])
const finalAnswer = ref('')
const resultCards = ref([])
const actionCards = ref([])
const runStatus = ref('idle')
const memory = ref(null)
const memoryViews = ref(null)
const ledgerEvents = ref([])
const activeMemoryTab = ref('policy')
const memoryTabs = [
  { key: 'policy', label: 'Policy' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'views', label: 'Views' }
]

const memoryTags = computed(() => {
  const preferences = memory.value?.preferences || {}
  return [
    ...(preferences.topics || []),
    ...(preferences.keywords || []),
    preferences.minReward ? `最低赏金 ${preferences.minReward} 元` : ''
  ].filter(Boolean)
})

const statusLabel = computed(() => {
  const map = {
    idle: '待启动',
    running: '执行中',
    waiting_confirmation: '待确认',
    waiting_clarification: '待补充',
    completed: '已完成',
    failed: '失败'
  }
  return map[runStatus.value] || runStatus.value
})

const latestPolicyStep = computed(() => {
  return [...traceSteps.value].reverse().find((step) => step.type === 'memory_policy') || null
})

onMounted(() => {
  loadMemorySystem()
})

const fillExample = (text) => {
  goal.value = text
}

const goToHistory = () => {
  uni.navigateTo({
    url: '/pages/agent/history'
  })
}

const loadMemory = async () => {
  try {
    const res = await agentApi.getMemory()
    memory.value = res.data
  } catch (error) {
    uni.showToast({ title: error.message || '记忆加载失败', icon: 'none' })
  }
}

// 一次刷新 Memory 2.0 的三类可视化数据，避免用户切 Tab 时看到旧数据。
const loadMemorySystem = async () => {
  await Promise.all([
    loadMemory(),
    loadMemoryViews(),
    loadLedgerEvents()
  ])
}

// Views 是后端从 Ledger 派生出的当前记忆快照，Planner 后续会优先读取它。
const loadMemoryViews = async () => {
  try {
    const res = await agentApi.getMemoryViews()
    memoryViews.value = res.data
  } catch (error) {
    uni.showToast({ title: error.message || '记忆视图加载失败', icon: 'none' })
  }
}

// Ledger 是 append-only 原始账本，前端只展示最近事件帮助理解记忆溯源。
const loadLedgerEvents = async () => {
  try {
    const res = await agentApi.getMemoryLedger({ limit: 30 })
    ledgerEvents.value = res.data || []
  } catch (error) {
    uni.showToast({ title: error.message || '账本加载失败', icon: 'none' })
  }
}

const applyRunResult = (data = {}) => {
  currentRunId.value = data.runId || ''
  traceSteps.value = data.steps || []
  finalAnswer.value = data.finalAnswer || ''
  resultCards.value = data.resultCards || []
  actionCards.value = data.actionCards || []
  runStatus.value = data.status || 'completed'
  memory.value = data.memorySnapshot || memory.value
}

const startAgentRun = async () => {
  const text = goal.value.trim()
  if (!text) return

  try {
    running.value = true
    runStatus.value = 'running'
    traceSteps.value = []
    finalAnswer.value = ''
    resultCards.value = []
    actionCards.value = []

    // Agent 任务由后端统一编排，前端只负责展示 trace，避免把业务决策散落在页面里。
    const res = await agentApi.startRun(text)
    applyRunResult(res.data)
    loadMemorySystem()
  } catch (error) {
    runStatus.value = 'failed'
    uni.showToast({ title: error.message || 'Agent 执行失败', icon: 'none' })
  } finally {
    running.value = false
  }
}

const confirmAction = async (card) => {
  if (!currentRunId.value || !card?.confirmAction) return

  try {
    confirming.value = true
    const res = await agentApi.confirmAction({
      runId: currentRunId.value,
      actionType: card.confirmAction,
      payload: card.payload || {}
    })
    applyRunResult(res.data?.trace || {})
    uni.showToast({ title: res.message || '已执行', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error.message || '确认动作失败', icon: 'none' })
  } finally {
    confirming.value = false
  }
}

const compactJson = (value) => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return String(value || '')
  }
}

const formatList = (list = []) => {
  return Array.isArray(list) ? list.filter(Boolean).join('、') : ''
}

// Ledger 事件字段比较技术化，这里压缩成“事件类型 · 记忆类型”方便移动端查看。
const formatLedgerEvent = (event = {}) => {
  return `${event.eventType || '-'} · ${event.memoryType || '-'}`
}

const formatStepType = (type) => {
  const map = {
    plan: '计划',
    tool_call: '工具调用',
    observation: '观察',
    evaluation: '评估',
    react_reason: 'ReAct 修正',
    react_action: '再次调用',
    react_observation: '再次观察',
    memory: '记忆',
    memory_read: '读记忆',
    memory_policy: '记忆决策',
    memory_view: '刷新视图',
    chat: '聊天',
    clarification: '追问',
    decision: '决策',
    final: '完成',
    error: '错误'
  }
  return map[type] || type
}

const formatCardType = (type) => {
  const map = {
    condition_adjustment: '条件调整',
    question_stats: '问题统计',
    question_applicants: '申请者列表',
    question_selection: '问题候选',
    question_recommendation: '问题推荐',
    published_question: '已发布问题',
    refund_status: '退款状态',
    transaction_summary: '交易总结'
  }
  return map[type] || '结果'
}

const openQuestion = (questionId) => {
  if (!questionId) return
  uni.navigateTo({
    url: `/pages/question/detail?questionId=${questionId}&fromAgent=true`
  })
}
</script>

<style lang="scss" scoped>
.agent-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 70rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}

.agent-header,
.goal-panel,
.memory-panel,
.trace-panel,
.answer-panel,
.result-panel,
.action-panel {
  margin-bottom: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.agent-header {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  background: linear-gradient(135deg, #1f2937, #0f766e);
  color: #fff;
}

.history-btn {
  margin: 0;
  width: 110rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 22rpx;
  flex-shrink: 0;
}

.eyebrow {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  font-size: 20rpx;
}

.title {
  display: block;
  margin-top: 18rpx;
  font-size: 42rpx;
  font-weight: 700;
}

.desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.88;
}

.goal-input {
  width: 100%;
  min-height: 150rpx;
  box-sizing: border-box;
  padding: 22rpx;
  border-radius: 22rpx;
  background: var(--app-input-bg);
  color: var(--app-ink);
  font-size: 27rpx;
  line-height: 1.6;
}

.example-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}

.example-btn,
.ghost-btn {
  margin: 0;
  padding: 0 20rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
  font-size: 22rpx;
}

.run-btn,
.confirm-btn,
.detail-btn {
  margin-top: 20rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 27rpx;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.panel-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.status-pill,
.memory-tag,
.tool-chip,
.card-type {
  display: inline-flex;
  width: fit-content;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 22rpx;
}

.memory-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.memory-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
  margin-top: 22rpx;
}

.memory-tab {
  margin: 0;
  height: 54rpx;
  line-height: 54rpx;
  border-radius: 14rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
  font-size: 21rpx;
}

.memory-tab.active {
  background: #0f766e;
  color: #fff;
}

.memory-tab-body {
  margin-top: 18rpx;
}

.memory-block {
  padding: 18rpx;
  border-radius: 18rpx;
  background: var(--app-input-bg);
}

.memory-block-title,
.memory-line,
.memory-mini {
  display: block;
}

.memory-block-title {
  color: var(--app-ink);
  font-size: 25rpx;
  font-weight: 700;
}

.memory-line {
  margin-top: 10rpx;
  color: var(--app-ink-soft);
  font-size: 23rpx;
  line-height: 1.6;
}

.memory-mini {
  margin-top: 6rpx;
  color: var(--app-ink-muted);
  font-size: 20rpx;
  line-height: 1.5;
}

.ledger-row {
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid var(--app-line);
}

.ghost-btn.tiny {
  width: 88rpx;
  height: 48rpx;
  line-height: 48rpx;
  font-size: 20rpx;
}

.muted,
.empty-trace {
  color: var(--app-ink-muted);
  font-size: 24rpx;
  line-height: 1.7;
}

.trace-item {
  display: flex;
  gap: 18rpx;
  margin-top: 22rpx;
}

.trace-index {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #0f766e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  flex-shrink: 0;
}

.trace-content {
  flex: 1;
  padding-bottom: 22rpx;
  border-bottom: 1rpx solid var(--app-line);
}

.trace-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
}

.trace-type {
  color: #0f766e;
  font-size: 22rpx;
  font-weight: 700;
}

.trace-title,
.card-title {
  color: var(--app-ink);
  font-size: 27rpx;
  font-weight: 700;
}

.trace-summary,
.answer-text,
.card-desc {
  display: block;
  margin-top: 12rpx;
  color: var(--app-ink-soft);
  font-size: 24rpx;
  line-height: 1.7;
}

.tool-chip {
  margin-top: 12rpx;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
}

.json-box {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 16rpx;
  background: rgba(15, 23, 42, 0.06);
  color: var(--app-ink-muted);
  font-size: 21rpx;
  word-break: break-all;
}

.result-card,
.action-card {
  margin-top: 18rpx;
  padding: 22rpx;
  border-radius: 22rpx;
  background: var(--app-input-bg);
}

.detail-btn {
  height: 58rpx;
  line-height: 58rpx;
  font-size: 23rpx;
}

.applicant-list,
.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 16rpx;
}

.applicant-row,
.candidate-row {
  padding: 16rpx;
  border-radius: 16rpx;
  background: var(--app-surface);
}

.applicant-name,
.candidate-title {
  display: block;
  color: var(--app-ink);
  font-size: 25rpx;
  font-weight: 700;
}

.applicant-meta,
.candidate-meta {
  display: block;
  margin-top: 8rpx;
  color: var(--app-ink-muted);
  font-size: 22rpx;
}
</style>
