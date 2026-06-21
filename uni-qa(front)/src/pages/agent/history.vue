<template>
  <view :class="['agent-history-page', themePageClass]">
    <view class="page-head">
      <view>
        <text class="eyebrow">Agent Memory</text>
        <text class="title">Agent 历史记录</text>
        <text class="desc">回看你给 Agent 的任务、执行状态、工具轨迹和最终回答。</text>
      </view>
      <button class="refresh-btn" :disabled="loading" @click="loadHistory">
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </view>

    <view v-if="!historyList.length && !loading" class="empty-card">
      <text>还没有 Agent 历史记录。先回到 Agent 助手执行一个任务。</text>
    </view>

    <view v-for="item in historyList" :key="item.runId" class="history-card">
      <view class="history-top">
        <text class="status-pill">{{ formatStatus(item.status) }}</text>
        <text class="time-text">{{ formatTime(item.updatedAt || item.createdAt) }}</text>
      </view>

      <text class="goal-text">{{ item.goal }}</text>
      <text class="answer-text">{{ item.finalAnswer || '这次任务还没有最终回答。' }}</text>

      <view class="meta-row">
        <text>{{ item.steps?.length || 0 }} 个执行步骤</text>
        <text>{{ item.resultCards?.length || 0 }} 张结果卡片</text>
      </view>

      <view class="tool-row">
        <text
          v-for="tool in collectTools(item)"
          :key="`${item.runId}-${tool}`"
          class="tool-chip"
        >
          {{ tool }}
        </text>
      </view>

      <view class="step-list">
        <view v-for="(step, index) in visibleSteps(item)" :key="`${item.runId}-${index}`" class="step-row">
          <text class="step-index">{{ index + 1 }}</text>
          <view class="step-body">
            <view class="step-head">
              <text class="step-type">{{ formatStepType(step.type) }}</text>
              <text class="step-title">{{ step.title || step.toolName || 'Agent 步骤' }}</text>
            </view>
            <text v-if="step.summary" class="step-summary">{{ step.summary }}</text>
            <text v-if="step.toolName" class="step-tool">tool: {{ step.toolName }}</text>
            <view v-if="step.input" class="json-box">
              <text class="json-label">输入</text>
              <text class="json-text">{{ compactJson(step.input) }}</text>
            </view>
            <view v-if="step.output" class="json-box">
              <text class="json-label">输出</text>
              <text class="json-text">{{ compactJson(step.output) }}</text>
            </view>
          </view>
        </view>
        <button
          v-if="hasHiddenSteps(item)"
          class="toggle-steps-btn"
          @click="toggleSteps(item.runId)"
        >
          {{ expandedRunIds[item.runId] ? '收起步骤' : `展开全部 ${item.steps?.length || 0} 步` }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { agentApi } from '@/api/agent'

const loading = ref(false)
const historyList = ref([])
const expandedRunIds = ref({})

onMounted(() => {
  loadHistory()
})

const loadHistory = async () => {
  try {
    loading.value = true
    const res = await agentApi.listRuns({ limit: 30 })
    historyList.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    uni.showToast({ title: error.message || '历史记录加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const formatStatus = (status) => {
  const map = {
    running: '执行中',
    waiting_confirmation: '待确认',
    waiting_clarification: '待补充',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || status || '未知'
}

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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
    chat: '聊天',
    clarification: '追问',
    decision: '决策',
    final: '完成',
    error: '错误'
  }
  return map[type] || type || '步骤'
}

const compactJson = (value) => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return String(value || '')
  }
}

const collectTools = (item) => {
  const steps = Array.isArray(item.steps) ? item.steps : []
  // 工具名称从 trace 中提取，用户可以直观看到 Agent 曾经调用过哪些平台能力。
  return Array.from(new Set(steps.map((step) => step.toolName).filter(Boolean))).slice(0, 6)
}

const isExpanded = (runId) => Boolean(expandedRunIds.value[runId])

const visibleSteps = (item) => {
  const steps = Array.isArray(item.steps) ? item.steps : []
  // 历史卡片默认保留摘要视图，步骤较多时用户可以展开查看完整 trace。
  return isExpanded(item.runId) ? steps : steps.slice(0, 4)
}

const hasHiddenSteps = (item) => {
  const steps = Array.isArray(item.steps) ? item.steps : []
  return steps.length > 4
}

const toggleSteps = (runId) => {
  expandedRunIds.value = {
    ...expandedRunIds.value,
    [runId]: !isExpanded(runId)
  }
}
</script>

<style lang="scss" scoped>
.agent-history-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 70rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}

.page-head,
.history-card,
.empty-card {
  margin-bottom: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  background: linear-gradient(135deg, #1f2937, #0f766e);
  color: #fff;
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
  font-size: 40rpx;
  font-weight: 700;
}

.desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.88;
}

.refresh-btn {
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

.history-top,
.meta-row,
.tool-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
}

.history-top {
  justify-content: space-between;
}

.status-pill,
.tool-chip {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 22rpx;
}

.time-text,
.meta-row,
.empty-card {
  color: var(--app-ink-muted);
  font-size: 23rpx;
}

.goal-text {
  display: block;
  margin-top: 18rpx;
  color: var(--app-ink);
  font-size: 30rpx;
  line-height: 1.55;
  font-weight: 700;
}

.answer-text {
  display: block;
  margin-top: 12rpx;
  color: var(--app-ink-soft);
  font-size: 25rpx;
  line-height: 1.7;
}

.meta-row,
.tool-row,
.step-list {
  margin-top: 16rpx;
}

.step-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid var(--app-line);
}

.step-index {
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: #0f766e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  flex-shrink: 0;
}

.step-body {
  flex: 1;
  min-width: 0;
}

.step-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10rpx;
}

.step-type {
  color: #0f766e;
  font-size: 21rpx;
  font-weight: 700;
}

.step-title {
  color: var(--app-ink-soft);
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 700;
}

.step-summary {
  display: block;
  margin-top: 8rpx;
  color: var(--app-ink-soft);
  font-size: 23rpx;
  line-height: 1.6;
}

.step-tool {
  display: inline-flex;
  width: fit-content;
  margin-top: 10rpx;
  padding: 7rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-size: 21rpx;
}

.json-box {
  margin-top: 10rpx;
  padding: 12rpx;
  border-radius: 14rpx;
  background: rgba(15, 23, 42, 0.06);
}

.json-label {
  display: block;
  margin-bottom: 6rpx;
  color: var(--app-accent-strong);
  font-size: 20rpx;
  font-weight: 700;
}

.json-text {
  color: var(--app-ink-muted);
  font-size: 20rpx;
  line-height: 1.5;
  word-break: break-all;
}

.toggle-steps-btn {
  margin: 16rpx 0 0;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-accent-strong);
  font-size: 23rpx;
}
</style>
