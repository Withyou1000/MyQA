<template>
  <view :class="['my-questions-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="我的提问" tone="mint" />
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">提问记录</text>
        <text class="hero-title">我的提问</text>
        <text class="hero-desc">管理你发出的每一个问题，看看它们现在走到了哪一步。</text>
      </view>
      <view class="hero-stat">
        <text class="hero-stat-value">{{ questions.length }}</text>
        <text class="hero-stat-label">总问题数</text>
      </view>
    </view>

    <view class="summary-row filter-row" v-if="questions.length">
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

    <view class="question-list" v-if="filteredQuestions.length">
      <view
        v-for="question in filteredQuestions"
        :key="question.id"
        class="question-card"
        @click="goToQuestionDetail(question)"
      >
        <view class="question-top">
          <view class="question-meta">
            <text class="topic-chip">{{ question.topic || "未分类" }}</text>
            <text class="time-text">{{ formatDate(question.createTime) }}</text>
          </view>
          <text class="reward-pill">{{ question.reward }}元</text>
        </view>

        <text class="title">{{ question.title }}</text>

        <view class="tags-container">
          <text v-for="(tag, tagIndex) in question.tags || []" :key="tagIndex" class="tag">{{ tag }}</text>
        </view>

        <view class="question-footer">
          <text class="status-pill" :class="question.status">{{ question.statusText }}</text>
          <view class="action-buttons">
            <template v-if="question.status === 'pending'">
              <button class="btn warm relative" @click.stop="goToApplicationList(question)">
                申请列表
                <view v-if="question.applicationCount > 0" class="red-dot">
                  <text class="dot-number">{{ question.applicationCount }}</text>
                </view>
              </button>
              <button class="btn danger" @click.stop="cancelQuestion(question)">取消提问</button>
            </template>

            <template v-else-if="question.status === 'answering'">
              <button class="btn light" @click.stop="applyRefund(question)">申请退款</button>
              <button class="btn success" @click.stop="completeQuestion(question)">已完成</button>
                <button class="btn primary" @click.stop="contactUser(question)">联系对方</button>
            </template>

            <template v-else-if="question.status === 'refunding'">
              <button class="btn light" @click.stop="cancelRefund(question)">取消申请</button>
              <button class="btn primary" @click.stop="contactUser(question)">联系对方</button>
            </template>

            <template v-else-if="question.status === 'accepted' || question.status === 'rated'">
              <button
                class="btn success"
                @click.stop="question.status === 'rated' ? viewRating(question) : goToReview(question)"
              >
                {{ question.status === "rated" ? "查看评价" : "去评价" }}
              </button>
              <button class="btn primary" @click.stop="contactUser(question)">联系对方</button>
            </template>

            <template v-else-if="question.status === 'rejected'">
              <button class="btn light" @click.stop="appealQuestion(question)">申诉</button>
              <button class="btn peach" @click.stop="editQuestion(question)">编辑</button>
               <button class="btn primary" @click.stop="contactUser(question)">联系对方</button>
            </template>

            <template v-else-if="question.status === 'refunded'">
              <button class="btn primary" @click.stop="contactUser(question)">联系对方</button>
            </template>
          </view>
        </view>
      </view>
    </view>

    <view class="empty-card" v-else>
      <text class="empty-title">{{ questions.length ? `暂无${activeFilterLabel}` : "还没有提问记录" }}</text>
      <text class="empty-desc">{{ questions.length ? "换个分类看看。" : "去发布一个问题吧。" }}</text>
    </view>
  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { computed, ref, onMounted } from "vue";
import { userApi } from "@/api/common";
import { applyApi } from "@/api";
import { refundApi } from "@/api/refund";
import { chatApi } from "@/api/chat";
import { questionApi } from "@/api/question";

const questions = ref([]);
const loading = ref(false);
const activeFilter = ref("processing");

const statusFilters = [
  { key: "processing", label: "进行中", statuses: ["answering", "refunding"] },
  { key: "completed", label: "已完成", statuses: ["accepted", "rated", "refunded"] },
  { key: "pending", label: "待处理", statuses: ["pending", "rejected"] },
];

const filteredQuestions = computed(() => {
  const current = statusFilters.find((item) => item.key === activeFilter.value) || statusFilters[0];
  return questions.value.filter((item) => current.statuses.includes(item.status));
});

const activeFilterLabel = computed(() => {
  const current = statusFilters.find((item) => item.key === activeFilter.value);
  return current?.label || "记录";
});

const getFilterCount = (filter) => questions.value.filter((item) => filter.statuses.includes(item.status)).length;
const statusMap = {
  pending: "待处理",
  answering: "回答中",
  accepted: "已采纳",
  rejected: "已拒绝",
  rated: "已评价",
  refunding: "退款中",
  refunded: "已退款",
};

const formatDate = (value) => {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const viewRating = (question) => {
  uni.navigateTo({
    url: `/pages/profile/rating-detail?questionId=${question.id}`,
  });
};

const loadQuestions = async () => {
  try {
    loading.value = true;
    const res = await userApi.getMyQuestions();
    questions.value = res.data.list.map((item) => ({
      applicationCount: item.applicationCount,
      id: item.questionId,
      title: item.title,
      topic: item.topic,
      tags: item.tags,
      reward: item.reward,
      status: item.status,
      statusText: statusMap[item.status] || "进行中",
      createTime: item.createTime,
    }));
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

const contactUser = async (question) => {
  const res = await userApi.hasRelate(question.id);
  if (res.data.hasRelate) {
    uni.navigateTo({
      url: `/pages/chat/index?questionId=${question.id}&status=${question.status}`,
    });
  } else {
    uni.showToast({
      title: "还没有人回答你的问题哦",
      icon: "none",
    });
  }
};

const applyRefund = (question) => {
  uni.showModal({
    title: "申请退款",
    content: `确定要申请${question.reward}元退款吗？`,
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({
          url: `/pages/profile/refund?question=${JSON.stringify(question)}`,
        });
      }
    },
  });
};

const cancelRefund = async (question) => {
  uni.showModal({
    title: "取消退款",
    content: "确定要取消退款申请吗？",
    success: async (res) => {
      if (res.confirm) {
        try {
          await refundApi.cancelRefund(question.id);
          await chatApi.sendChatMessage(question.id, {
            messageType: "refund_system",
            text: "我取消了退款申请，我们继续合作",
          });

          uni.showToast({
            title: "退款申请已取消",
            icon: "success",
          });

          loadQuestions();
        } catch (error) {
          console.error("取消退款申请失败:", error);
          uni.showToast({
            title: error.message || "取消失败，请重试",
            icon: "none",
          });
        }
      }
    },
  });
};

const goToReview = (question) => {
  uni.navigateTo({
    url: `/pages/profile/rating?questionId=${question.id}`,
  });
};

const editQuestion = (question) => {
  uni.navigateTo({
    url: `/pages/ask/index?questionId=${question.id}&edit=true`,
  });
};

const appealQuestion = () => {
  uni.showModal({
    title: "申诉",
    content: "确定要对该问题进行申诉吗？",
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

const completeQuestion = (question) => {
  uni.showModal({
    title: "确认完成",
    content: "确定该问题已经解决了吗？",
    success: async (res) => {
      if (res.confirm) {
        try {
          await applyApi.acceptAnswer(question.id, true);
          uni.showToast({
            title: "问题已标记为已完成",
            icon: "success",
          });
          loadQuestions();
        } catch (error) {
          uni.showToast({
            title: error.message || "操作失败",
            icon: "none",
          });
        }
      }
    },
  });
};

const cancelQuestion = (question) => {
  uni.showModal({
    title: "撤销问题",
    content: "确定要撤销该问题吗？撤销后将无法恢复。",
    success: async (res) => {
      if (res.confirm) {
        try {
          await questionApi.deleteQuestion(question.id);

          uni.showToast({
            title: "问题已撤销",
            icon: "success",
          });

          loadQuestions();
        } catch (error) {
          console.error("撤销问题失败:", error);
          uni.showToast({
            title: error.message || "撤销失败，请重试",
            icon: "none",
          });
        }
      }
    },
  });
};

onMounted(() => {
  loadQuestions();
});

onShow(() => {
  loadQuestions();
});

const goToApplicationList = (question) => {
  try {
    uni.navigateTo({
      url: `/pages/profile/application-list?questionId=${question.id}`,
      fail: (err) => {
        console.error("跳转失败:", err);
        uni.showToast({
          title: "跳转失败，请重试",
          icon: "none",
        });
      },
    });
  } catch (error) {
    console.error("跳转异常:", error);
    uni.showToast({
      title: "系统异常，请稍后再试",
      icon: "none",
    });
  }
};

const goToQuestionDetail = (question) => {
  uni.navigateTo({
    url: `/pages/question/detail?questionId=${question.id}&fromIndex=false`,
  });
};
</script>

<style lang="scss" scoped>
.my-questions-page {
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

.my-questions-page .hero-card::after {
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

.question-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 22rpx;
}

.question-card {
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.question-top,
.question-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.question-meta {
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

.question-footer {
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
.status-pill.rated,
.status-pill.refunded {
  background: var(--app-success-bg);
  color: var(--app-success-text);
}

.status-pill.rejected {
  background: var(--app-danger-bg);
  color: var(--app-danger-text);
}

.status-pill.refunding {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
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
  border: none;
  outline: none;
  box-shadow: none;
}

.btn::after {
  border: none;
}

.btn.primary {
  background: var(--app-primary-gradient);
  color: #fff;
}

.btn.success {
  background: rgba(131, 208, 184, 0.2);
  color: #279979;
}

.btn.light {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.btn.danger {
  background: var(--app-danger-bg);
  color: var(--app-danger-text);
}

.btn.warm {
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
}

.btn.peach {
  background: rgba(255, 196, 157, 0.22);
  color: #b96c31;
}

.btn.relative {
  position: relative;
  overflow: visible;
}

.red-dot {
  position: absolute;
  top: -12rpx;
  right: -10rpx;
  min-width: 38rpx;
  height: 38rpx;
  padding: 0 8rpx;
  background: #f26a7a;
  border-radius: 999rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8rpx 18rpx rgba(242, 106, 122, 0.24);
}

.dot-number {
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
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
