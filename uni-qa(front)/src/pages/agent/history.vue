<template>
  <view :class="['agent-history-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="Agent 历史" tone="lavender" />

    <view class="page-toolbar">
      <view>
        <text class="page-title">历史记录</text>
        <text class="page-desc">查看任务、结果和执行过程</text>
      </view>
      <button class="refresh-btn" :disabled="loading" @click="loadHistory">
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </view>

    <view v-if="!historyList.length && !loading" class="empty-card">
      <text class="empty-title">还没有历史记录</text>
      <text class="empty-desc">先去 Agent 助手执行一次任务</text>
    </view>

    <view v-for="item in historyList" :key="item.runId" class="history-card">
      <view class="history-top">
        <view class="status-wrap">
          <text class="status-pill" :class="statusClass(item.status)">{{ formatStatus(item.status) }}</text>
          <text class="time-text">{{ formatTime(item.updatedAt || item.createdAt) }}</text>
        </view>
        <view class="meta-row compact-meta">
          <text>{{ item.steps?.length || 0 }} 步</text>
          <text>{{ item.resultCards?.length || 0 }} 张结果卡</text>
        </view>
      </view>

      <view class="section-block task-block">
        <text class="section-label">任务</text>
        <text class="goal-text">{{ item.goal || '未填写任务内容' }}</text>
      </view>

      <view class="section-block answer-block">
        <text class="section-label">结果</text>
        <text class="answer-text">{{ item.finalAnswer || '这次任务还没有最终结果。' }}</text>
      </view>

      <view v-if="collectTools(item).length" class="tool-row">
        <text
          v-for="tool in collectTools(item)"
          :key="`${item.runId}-${tool}`"
          class="tool-chip"
        >
          {{ tool }}
        </text>
      </view>

      <view class="step-list">
        <view class="section-line">
          <text class="section-label">执行过程</text>
        </view>

        <view v-for="(step, index) in visibleSteps(item)" :key="`${item.runId}-${index}`" class="step-row">
          <text class="step-index">{{ index + 1 }}</text>
          <view class="step-body">
            <view class="step-head">
              <text class="step-type" :class="stepToneClass(step.type)">{{ formatStepType(step.type) }}</text>
              <text class="step-title">{{ step.title || step.toolName || 'Agent 步骤' }}</text>
            </view>
            <text v-if="step.summary" class="step-summary">{{ step.summary }}</text>
            <text v-if="step.toolName" class="step-tool">{{ step.toolName }}</text>
            <view v-if="step.input" class="detail-box">
              <text class="detail-label">输入</text>
              <text class="detail-text">{{ summarizePayload(step.input) }}</text>
            </view>
            <view v-if="step.output" class="detail-box">
              <text class="detail-label">输出</text>
              <text class="detail-text">{{ summarizePayload(step.output) }}</text>
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

const statusClass = (status) => {
  const map = {
    running: 'is-running',
    waiting_confirmation: 'is-waiting',
    waiting_clarification: 'is-waiting',
    completed: 'is-done',
    failed: 'is-failed'
  }
  return map[status] || 'is-default'
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
    react_reason: '修正',
    react_action: '再次调用',
    react_observation: '再次观察',
    memory: '记忆',
    chat: '对话',
    clarification: '追问',
    decision: '决策',
    final: '完成',
    error: '错误'
  }
  return map[type] || type || '步骤'
}

const stepToneClass = (type) => {
  const map = {
    tool_call: 'tone-blue',
    observation: 'tone-green',
    evaluation: 'tone-purple',
    final: 'tone-orange',
    error: 'tone-red'
  }
  return map[type] || 'tone-default'
}

const summarizePayload = (value) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > 180 ? `${text.slice(0, 180)}...` : text
  } catch (error) {
    return String(value)
  }
}

const collectTools = (item) => {
  const steps = Array.isArray(item.steps) ? item.steps : []
  return Array.from(new Set(steps.map((step) => step.toolName).filter(Boolean))).slice(0, 6)
}

const isExpanded = (runId) => Boolean(expandedRunIds.value[runId])

const visibleSteps = (item) => {
  const steps = Array.isArray(item.steps) ? item.steps : []
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

.page-toolbar,
.history-card,
.empty-card {
  margin-bottom: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.page-title {
  display: block;
  color: var(--app-ink);
  font-size: 34rpx;
  font-weight: 700;
}

.page-desc {
  display: block;
  margin-top: 10rpx;
  color: var(--app-ink-soft);
  font-size: 23rpx;
}

.refresh-btn {
  margin: 0;
  width: 112rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-accent-strong);
  font-size: 22rpx;
  flex-shrink: 0;
}

.empty-card {
  text-align: center;
}

.empty-title {
  display: block;
  color: var(--app-ink);
  font-size: 28rpx;
  font-weight: 700;
}

.empty-desc {
  display: block;
  margin-top: 10rpx;
  color: var(--app-ink-muted);
  font-size: 23rpx;
}

.history-top,
.status-wrap,
.meta-row,
.tool-row,
.plan-foot,
.step-head,
.section-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.history-top {
  justify-content: space-between;
  gap: 16rpx;
}

.compact-meta {
  color: var(--app-ink-muted);
  font-size: 22rpx;
}

.status-pill,
.tool-chip,
.step-tool,
.step-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  font-weight: 600;
}

.status-pill.is-running,
.step-type.tone-blue {
  background: rgba(77, 138, 255, 0.12);
  color: #3468d6;
}

.status-pill.is-waiting,
.step-type.tone-purple {
  background: rgba(136, 92, 246, 0.12);
  color: #7c3aed;
}

.status-pill.is-done,
.step-type.tone-green {
  background: rgba(16, 185, 129, 0.12);
  color: #0f9b6c;
}

.status-pill.is-failed,
.step-type.tone-red {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.status-pill.is-default,
.step-type.tone-default,
.step-type.tone-orange {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.time-text {
  color: var(--app-ink-muted);
  font-size: 22rpx;
}

.section-block {
  margin-top: 18rpx;
  padding: 20rpx;
  border-radius: 22rpx;
  background: rgba(255, 248, 236, 0.7);
}

.section-label {
  display: block;
  color: var(--app-accent-strong);
  font-size: 22rpx;
  font-weight: 700;
}

.goal-text {
  display: block;
  margin-top: 10rpx;
  color: var(--app-ink);
  font-size: 29rpx;
  line-height: 1.55;
  font-weight: 700;
}

.answer-text {
  display: block;
  margin-top: 10rpx;
  color: var(--app-ink-soft);
  font-size: 24rpx;
  line-height: 1.7;
}

.tool-row,
.step-list {
  margin-top: 18rpx;
}

.tool-chip {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.section-line {
  margin-bottom: 8rpx;
}

.step-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid var(--app-line);
}

.step-index {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: var(--app-accent-strong);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.step-body {
  min-width: 0;
  flex: 1;
}

.step-title {
  color: var(--app-ink);
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 700;
}

.step-summary {
  display: block;
  margin-top: 10rpx;
  color: var(--app-ink-soft);
  font-size: 23rpx;
  line-height: 1.65;
}

.step-tool {
  width: fit-content;
  margin-top: 10rpx;
  background: rgba(15, 118, 110, 0.08);
  color: var(--app-accent-strong);
}

.detail-box {
  margin-top: 10rpx;
  padding: 14rpx 16rpx;
  border-radius: 16rpx;
  background: rgba(15, 23, 42, 0.05);
}

.detail-label {
  display: block;
  margin-bottom: 6rpx;
  color: var(--app-accent-strong);
  font-size: 20rpx;
  font-weight: 700;
}

.detail-text {
  color: var(--app-ink-muted);
  font-size: 20rpx;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}

.toggle-steps-btn {
  margin: 18rpx 0 0;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-accent-strong);
  font-size: 23rpx;
}
</style>