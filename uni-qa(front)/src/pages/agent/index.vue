<template>
  <view :class="['agent-page', 'prototype-page', themePageClass]">
    <view class="prototype-topbar">
      <view class="topbar-spacer" />
      <text class="prototype-title">智能 Agent</text>
      <view class="history-pill" @click="goToHistory">历史</view>
    </view>

    <view class="agent-input-card prototype-card">
      <view class="prototype-label-row">
        <text>输入目标</text>
        <view class="edit-dot"><image class="icon-svg mini" src="/static/images/nav-ask.svg" mode="aspectFit" /></view></view>
      <textarea
        v-model="goal"
        class="agent-goal-input"
        maxlength="300"
        placeholder="帮我找到平台上符合我要求的 Java 高级编程问题，并推荐优质回答者。"
      />
      <view class="example-strip">
        <view class="example-chip" @click="fillExample('帮我找现在平台上适合我回答的 Java 高赏金问题')">找高赏金问题</view>
        <view class="example-chip" @click="fillExample('以后优先推荐前端和 Vue 相关的问题')">记住偏好</view>
      </view>
      <view class="prototype-action run-action" :class="{ disabled: running || !goal.trim() }" @click="startAgentRun">
        {{ running ? 'Agent 执行中...' : '启动 Agent' }}
      </view>
    </view>

    <view class="memory-summary prototype-card">
      <view class="memory-title-row">
        <view>
          <text class="block-title">记忆摘要</text>
          <text class="block-subtitle">Agent 会用这些偏好规划任务</text>
        </view>
        <view class="refresh-small" @click="loadMemorySystem">刷新</view>
      </view>
      <view class="memory-chip-row">
        <text v-if="!memoryTags.length" class="memory-empty">暂无偏好</text>
        <text v-for="tag in memoryTags" :key="tag" class="memory-chip">{{ tag }}</text>
      </view>
    </view>

    <view class="process-panel prototype-card">
      <text class="block-title">执行过程</text>
      <view v-if="displaySteps.length" class="timeline">
        <view v-for="(step, index) in displaySteps" :key="`${step.type}-${index}`" class="timeline-row">
          <view class="timeline-icon" :class="stepTone(step.type)">
            <image class="icon-svg" :src="stepIcon(step.type)" mode="aspectFit" />
          </view>
          <view class="timeline-card">
            <view class="timeline-head">
              <text class="timeline-title">{{ formatStepType(step.type) }}</text>
              <text class="timeline-time">{{ step.toolName || formatStepTime(index) }}</text>
            </view>
            <text class="timeline-desc">{{ step.summary || step.title || '已完成该步骤' }}</text>
          </view>
        </view>
      </view>
      <view v-else class="timeline placeholder-timeline">
        <view v-for="item in placeholderSteps" :key="item.label" class="timeline-row">
          <view class="timeline-icon" :class="item.tone">
            <image class="icon-svg" :src="item.icon" mode="aspectFit" />
          </view>
          <view class="timeline-card">
            <view class="timeline-head">
              <text class="timeline-title">{{ item.label }}</text>
              <text class="timeline-time">{{ item.time }}</text>
            </view>
            <text class="timeline-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="finalAnswer || resultCards.length || actionCards.length" class="result-summary prototype-card">
      <view class="result-left">
        <image class="icon-svg result-icon" src="/static/images/nav-agent.svg" mode="aspectFit" />
      </view>
      <view class="result-main">
        <text class="result-title">{{ resultCards.length ? resultCards[0].title : 'Agent 建议' }}</text>
        <text class="result-desc">{{ finalAnswer || resultCards[0]?.description || '已生成执行结果' }}</text>
      </view>
      <view v-if="actionCards.length" class="result-button" @click="confirmAction(actionCards[0])">
        {{ confirming ? '执行中' : '确认' }}
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { agentApi } from "@/api/agent";
import AppTabBar from "@/components/AppTabBar.vue";

const goal = ref("");
const running = ref(false);
const confirming = ref(false);
const currentRunId = ref("");
const traceSteps = ref([]);
const finalAnswer = ref("");
const resultCards = ref([]);
const actionCards = ref([]);
const runStatus = ref("idle");
const memory = ref(null);
const memoryViews = ref(null);
const ledgerEvents = ref([]);

const placeholderSteps = [
  { label: "计划", desc: "理解目标，规划 4 步执行方案", time: "10:21", icon: "/static/images/ui-check.svg", tone: "green" },
  { label: "工具调用", desc: "搜索问题，筛选申请者", time: "10:22", icon: "/static/images/nav-agent.svg", tone: "purple" },
  { label: "观察", desc: "获取结果并分析匹配度", time: "10:23", icon: "/static/images/ui-search.svg", tone: "mint" },
  { label: "完成", desc: "生成推荐结果", time: "10:24", icon: "/static/images/ui-check.svg", tone: "purple" },
];

const memoryTags = computed(() => {
  const preferences = memory.value?.preferences || {};
  return [
    ...(preferences.topics || []),
    ...(preferences.keywords || []),
    preferences.minReward ? `最低赏金 ${preferences.minReward} 元` : "",
  ].filter(Boolean).slice(0, 6);
});

const displaySteps = computed(() => traceSteps.value.slice(-6));

onMounted(() => {
  loadMemorySystem();
});

const fillExample = (text) => {
  goal.value = text;
};

const goToHistory = () => {
  uni.navigateTo({ url: "/pages/agent/history" });
};


const loadMemory = async () => {
  try {
    const res = await agentApi.getMemory();
    memory.value = res.data;
  } catch (error) {
    uni.showToast({ title: error.message || "记忆加载失败", icon: "none" });
  }
};

const loadMemoryViews = async () => {
  try {
    const res = await agentApi.getMemoryViews();
    memoryViews.value = res.data;
  } catch (error) {
    uni.showToast({ title: error.message || "记忆视图加载失败", icon: "none" });
  }
};

const loadLedgerEvents = async () => {
  try {
    const res = await agentApi.getMemoryLedger({ limit: 30 });
    ledgerEvents.value = res.data || [];
  } catch (error) {
    uni.showToast({ title: error.message || "账本加载失败", icon: "none" });
  }
};

const loadMemorySystem = async () => {
  await Promise.all([loadMemory(), loadMemoryViews(), loadLedgerEvents()]);
};

const applyRunResult = (data = {}) => {
  currentRunId.value = data.runId || "";
  traceSteps.value = data.steps || [];
  finalAnswer.value = data.finalAnswer || "";
  resultCards.value = data.resultCards || [];
  actionCards.value = data.actionCards || [];
  runStatus.value = data.status || "completed";
  memory.value = data.memorySnapshot || memory.value;
};

const startAgentRun = async () => {
  const text = goal.value.trim();
  if (!text || running.value) return;

  try {
    running.value = true;
    runStatus.value = "running";
    traceSteps.value = [];
    finalAnswer.value = "";
    resultCards.value = [];
    actionCards.value = [];

    const res = await agentApi.startRun(text);
    applyRunResult(res.data);
    loadMemorySystem();
  } catch (error) {
    runStatus.value = "failed";
    uni.showToast({ title: error.message || "Agent 执行失败", icon: "none" });
  } finally {
    running.value = false;
  }
};

const confirmAction = async (card) => {
  if (!currentRunId.value || !card?.confirmAction || confirming.value) return;

  try {
    confirming.value = true;
    const res = await agentApi.confirmAction({
      runId: currentRunId.value,
      actionType: card.confirmAction,
      payload: card.payload || {},
    });
    applyRunResult(res.data?.trace || {});
    uni.showToast({ title: res.message || "已执行", icon: "success" });
  } catch (error) {
    uni.showToast({ title: error.message || "确认动作失败", icon: "none" });
  } finally {
    confirming.value = false;
  }
};

const formatStepType = (type) => {
  const map = {
    plan: "计划",
    tool_call: "工具调用",
    observation: "观察",
    evaluation: "评估",
    memory: "记忆",
    memory_read: "读记忆",
    memory_policy: "记忆决策",
    memory_view: "刷新视图",
    chat: "聊天",
    clarification: "追问",
    decision: "决策",
    final: "完成",
    error: "错误",
  };
  return map[type] || type || "Agent 步骤";
};

const stepIcon = (type) => {
  if (type?.includes("tool")) return "/static/images/nav-agent.svg";
  if (type?.includes("observation")) return "/static/images/ui-search.svg";
  if (type?.includes("error")) return "/static/images/ui-close.svg";
  return "/static/images/ui-check.svg";
};

const stepTone = (type) => {
  if (type?.includes("tool")) return "purple";
  if (type?.includes("observation")) return "mint";
  if (type?.includes("error")) return "coral";
  return "green";
};

const formatStepTime = (index) => `10:${String(21 + index).padStart(2, "0")}`;
</script>

<style lang="scss" scoped>
.agent-page {
  position: relative;
  overflow-x: hidden;
  background: #fffdf6 !important;
}

.agent-page::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 330rpx;
  background: #e1d3ef;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  z-index: 0;
}

.agent-page > view:not(.tab-shell),
.agent-page > scroll-view {
  position: relative;
  z-index: 1;
}

.topbar-spacer {
  width: 76rpx;
  height: 54rpx;
}
.history-pill {
  min-width: 76rpx;
  height: 54rpx;
  border: 2rpx solid var(--qa-ink);
  border-radius: 999rpx;
  background: rgba(255, 253, 246, 0.78);
  color: var(--qa-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 900;
  box-shadow: 3rpx 4rpx 0 rgba(43, 37, 40, 0.08);
}

.agent-input-card,
.memory-summary,
.process-panel,
.result-summary {
  padding: 24rpx;
  margin-top: 22rpx;
}

.agent-goal-input {
  width: 100%;
  min-height: 132rpx;
  margin-top: 10rpx;
  padding: 20rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.28);
  border-radius: 24rpx;
  background: rgba(255, 253, 246, 0.66);
  color: var(--qa-text);
  font-size: 25rpx;
  line-height: 1.5;
}

.edit-dot {
  width: 48rpx;
  height: 48rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-dot .mini {
  width: 28rpx;
  height: 28rpx;
}

.example-strip,
.memory-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.example-chip,
.memory-chip {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #ede4f4;
  color: var(--qa-ink);
  font-size: 22rpx;
  font-weight: 800;
}

.run-action {
  margin-top: 20rpx;
}

.memory-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.block-title {
  display: block;
  color: var(--qa-ink);
  font-size: 28rpx;
  font-weight: 900;
}

.block-subtitle,
.memory-empty {
  display: block;
  margin-top: 8rpx;
  color: var(--qa-muted);
  font-size: 22rpx;
}

.refresh-small {
  padding: 8rpx 18rpx;
  border: 2rpx solid var(--qa-ink);
  border-radius: 999rpx;
  background: var(--qa-paper-solid);
  font-size: 22rpx;
  font-weight: 900;
}

.timeline {
  position: relative;
  margin-top: 22rpx;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 39rpx;
  top: 20rpx;
  bottom: 20rpx;
  width: 4rpx;
  border-radius: 999rpx;
  background: rgba(43, 37, 40, 0.16);
}

.timeline-row {
  display: flex;
  gap: 18rpx;
  position: relative;
  margin-top: 16rpx;
}

.timeline-icon {
  width: 82rpx;
  height: 82rpx;
  border: 3rpx solid var(--qa-ink);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  box-shadow: 3rpx 4rpx 0 rgba(43, 37, 40, 0.08);
}

.timeline-icon.green { background: #a9dcc2; }
.timeline-icon.purple { background: #cdb4db; }
.timeline-icon.mint { background: #b8e0ce; }
.timeline-icon.coral { background: #f4a29a; }

.timeline-icon .icon-svg {
  width: 44rpx;
  height: 44rpx;
}

.timeline-card {
  flex: 1;
  min-width: 0;
  padding: 18rpx 20rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.18);
  border-radius: 22rpx;
  background: rgba(255, 253, 246, 0.64);
}

.timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.timeline-title {
  color: var(--qa-ink);
  font-size: 25rpx;
  font-weight: 900;
}

.timeline-time {
  color: var(--qa-muted);
  font-size: 21rpx;
  font-weight: 700;
}

.timeline-desc {
  display: block;
  margin-top: 8rpx;
  color: var(--qa-soft-text);
  font-size: 22rpx;
  line-height: 1.45;
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.result-left {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: #e9ddf1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon {
  width: 48rpx;
  height: 48rpx;
}

.result-main {
  flex: 1;
  min-width: 0;
}

.result-title,
.result-desc {
  display: block;
}

.result-title {
  color: var(--qa-ink);
  font-size: 26rpx;
  font-weight: 900;
}

.result-desc {
  margin-top: 8rpx;
  color: var(--qa-soft-text);
  font-size: 22rpx;
  line-height: 1.45;
  max-height: 70rpx;
  overflow-x: hidden;
}

.result-button {
  min-width: 112rpx;
  height: 60rpx;
  border: 2rpx solid var(--qa-ink);
  border-radius: 999rpx;
  background: #e9ddf1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 900;
}
</style>
