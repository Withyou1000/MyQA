<template>
  <view :class="['my-answers-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="我的回答" tone="coral" />
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">回答记录</text>
        <text class="hero-title">我的回答</text>
        <text class="hero-desc">这里会记录你参与过的问题，也能快速回到聊天和详情。</text>
      </view>
      <view class="hero-stat">
        <text class="hero-stat-value">{{ answers.length }}</text>
        <text class="hero-stat-label">总回答数</text>
      </view>
    </view>

    <view class="summary-row filter-row" v-if="answers.length">
      <view
        v-for="filter in statusFilters"
        :key="filter.key"
        class="summary-pill filter-pill"
        :class="{ active: activeFilter === filter.key }"
        @click="activeFilter = filter.key"
      >
        <text class="summary-label">{{ filter.label }}</text>
        <text class="summary-value">{{ getFilterCount(filter) }}</text>
      </view>
    </view>

    <view class="answer-list" v-if="filteredAnswers.length">
      <view
        v-for="answer in filteredAnswers"
        :key="answer.id"
        class="answer-card"
        @click="goToQuestionDetail(answer.id)"
      >
        <view class="answer-top">
          <view class="answer-meta">
            <text class="topic-chip">{{ answer.topic || "未分类" }}</text>
            <text class="time-text">{{ formatDate(answer.createTime) }}</text>
          </view>
          <text class="reward-pill">{{ answer.reward }}元</text>
        </view>

        <text class="title">{{ answer.title }}</text>

        <view class="tags-container">
          <text v-for="(tag, tagIndex) in answer.tags || []" :key="tagIndex" class="tag">{{ tag }}</text>
        </view>

        <view class="answer-footer">
          <text class="status-pill" :class="answer.status">{{ answer.statusText }}</text>
          <view class="action-buttons">
            <template v-if="answer.status === 'rejected'">
              <button class="btn light" @click.stop="appealAnswer(answer)">申诉</button>
                  <button class="btn primary" @click.stop="goToChat(answer)">联系对方</button>
            </template>

            <template v-else-if="answer.status !== 'pending' && answer.status !== 'refused'">
              <button class="btn primary" @click.stop="goToChat(answer)">联系对方</button>
            </template>
          </view>
        </view>
      </view>
    </view>

    <view class="empty-card" v-else>
      <text class="empty-title">{{ answers.length ? `暂无${activeFilterLabel}` : "还没有回答记录" }}</text>
      <text class="empty-desc">{{ answers.length ? "换个分类看看。" : "去看看社区里的问题吧。" }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { userApi } from "@/api/user.js";
import { onShow } from "@dcloudio/uni-app";

const answers = ref([]);
const userId = ref("");
const activeFilter = ref("processing");

const statusFilters = [
  { key: "processing", label: "进行中", statuses: ["answering"] },
  { key: "completed", label: "已完成", statuses: ["accepted", "rated", "refunded"] },
  { key: "pending", label: "待处理", statuses: ["pending", "refused", "rejected"] },
];

const filteredAnswers = computed(() => {
  const current = statusFilters.find((item) => item.key === activeFilter.value) || statusFilters[0];
  return answers.value.filter((item) => current.statuses.includes(item.status));
});

const activeFilterLabel = computed(() => {
  const current = statusFilters.find((item) => item.key === activeFilter.value);
  return current?.label || "记录";
});

const getFilterCount = (filter) => answers.value.filter((item) => filter.statuses.includes(item.status)).length;
const statusMap = {
  pending: "待处理",
  refused: "未接单",
  answering: "回答中",
  accepted: "已完成",
  rejected: "已拒绝",
  rated: "已完成",
  refunded: "已退款",
};

const formatDate = (value) => {
  if (!value) return "最近";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const goToChat = async (answer) => {
  uni.navigateTo({
    url: `/pages/chat/index?questionId=${answer.id}&status=${answer.status}`,
  });
};

const appealAnswer = () => {
  uni.showModal({
    title: "申诉",
    content: "确定要对该回答进行申诉吗？",
    success: (res) => {
      if (res.confirm) {
        uni.showToast({
          title: "申诉已提交",
          icon: "success",
        });
      }
    },
  });
};

const loadQuestions = async () => {
  try {
    const res = await userApi.getMyAnswers();
    answers.value = res.data.list.map((item) => {
      const normalizedStatus =
        item.answerer && item.answerer !== userId.value ? "refused" : item.status;

      return {
        id: item.questionId,
        title: item.title,
        topic: item.topic,
        tags: item.tags,
        reward: item.reward,
        status: normalizedStatus,
        statusText: statusMap[normalizedStatus] || "进行中",
        answerer: item.answerer,
        createTime: item.createTime,
      };
    });
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  }
};

const goToQuestionDetail = (id) => {
  uni.navigateTo({
    url: `/pages/question/detail?questionId=${id}&fromIndex=false`,
  });
};

onShow(() => {
  loadQuestions();
});

onMounted(() => {
  userId.value = uni.getStorageSync("userInfo").userId;
  loadQuestions();
});
</script>

<style lang="scss" scoped>
.my-answers-page {
  min-height: 100vh;
  padding: 24rpx;
  background: var(--app-page-bg);
}

.hero-card {
  display: flex;
  gap: 22rpx;
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  box-shadow: var(--app-shadow-soft);
}

.my-answers-page .hero-card::after {
  display: none !important;
}

.hero-copy {
  flex: 1;
}

.hero-eyebrow {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 42rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 84%, #ffffff);
  opacity: 1;
}

.hero-stat {
  width: 156rpx;
  min-height: 156rpx;
  border-radius: 30rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  backdrop-filter: blur(12rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hero-stat-value {
  font-size: 54rpx;
  font-weight: 700;
  line-height: 1;
}

.hero-stat-label {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
}

.summary-row {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.summary-pill {
  flex: 1;
  padding: 20rpx;
  border-radius: 24rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.summary-value {
  display: block;
  margin-top: 10rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--app-ink);
}
.filter-pill {
  border: 2rpx solid rgba(43, 37, 40, 0.16);
}

.filter-pill.active {
  border-color: var(--qa-ink, #2b2528);
  background: var(--qa-yellow, #ffd15d);
  box-shadow: 4rpx 5rpx 0 rgba(43, 37, 40, 0.1);
}

.answer-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 22rpx;
}

.answer-card {
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.answer-top,
.answer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.answer-meta {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
}

.topic-chip,
.reward-pill,
.tag,
.status-pill {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.topic-chip {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.time-text {
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.reward-pill {
  background: var(--app-success-bg);
  color: var(--app-success-text);
  font-weight: 600;
}

.title {
  display: block;
  margin-top: 18rpx;
  font-size: 32rpx;
  line-height: 1.6;
  font-weight: 600;
  color: var(--app-ink);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.tag {
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
}

.answer-footer {
  margin-top: 22rpx;
  align-items: flex-start;
}

.status-pill.pending {
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
}

.status-pill.answering {
  background: var(--app-info-bg);
  color: var(--app-info-text);
}

.status-pill.accepted,
.status-pill.rated {
  background: var(--app-success-bg);
  color: var(--app-success-text);
}

.status-pill.rejected,
.status-pill.refused {
  background: var(--app-danger-bg);
  color: var(--app-danger-text);
}

.status-pill.refunded {
  background: rgba(131, 208, 184, 0.18);
  color: #279979;
}
.action-buttons {
  display: flex;
  gap: 12rpx;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.btn {
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 24rpx;
  padding: 0 24rpx;
  margin: 0;
  min-width: 140rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink);
}

.btn.primary {
  background: var(--app-primary-gradient);
  color: #fff;
}

.btn.light {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.empty-card {
  margin-top: 24rpx;
  padding: 90rpx 40rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.empty-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
}
</style>
