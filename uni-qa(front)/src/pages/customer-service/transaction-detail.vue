<template>
  <view :class="['transaction-detail-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="交易详情" tone="coral" />
    <view v-if="loading" class="state-card">
      <text class="state-title">正在加载交易详情</text>
      <text class="state-desc">稍等一下，正在同步这笔问答交易的信息。</text>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-copy">
          <text class="hero-eyebrow">交易记录</text>
          <text class="hero-title">交易详情</text>
          <text class="hero-desc">
            这里可以查看问题信息、双方聊天记录，以及关联的退款记录。
          </text>
        </view>

        <view class="hero-badge">
          <text class="hero-badge-value">￥{{ detail.question.reward || 0 }}</text>
          <text class="hero-badge-label">{{ formatQuestionStatus(detail.question.status) }}</text>
        </view>
      </view>

      <view class="panel-card">
        <view class="section-head">
          <text class="section-title">问题信息</text>
          <text class="section-subtitle">{{ formatDate(detail.question.createTime) }}</text>
        </view>

        <view class="question-card">
          <view class="question-top">
            <text class="topic-chip">{{ detail.question.topic || "未分类" }}</text>
            <text class="status-chip">{{ formatQuestionStatus(detail.question.status) }}</text>
          </view>
          <text class="question-title">{{ detail.question.title || "未命名问题" }}</text>

          <view v-if="detail.question.tags.length" class="tags-row">
            <text
              v-for="(tag, index) in detail.question.tags"
              :key="`${tag}-${index}`"
              class="tag"
            >
              {{ tag }}
            </text>
          </view>

          <view class="participant-grid">
            <view class="participant-card">
              <text class="participant-label">提问者</text>
              <view class="participant-meta">
                <image
                  v-if="detail.question.author?.avatar"
                  :src="detail.question.author.avatar"
                  class="participant-avatar"
                  mode="aspectFill"
                />
                <view v-else class="participant-avatar fallback">
                  {{ getInitial(detail.question.author?.name) }}
                </view>
                <text class="participant-name">{{ detail.question.author?.name || "匿名用户" }}</text>
              </view>
            </view>

            <view class="participant-card">
              <text class="participant-label">回答者</text>
              <view class="participant-meta">
                <image
                  v-if="detail.question.answerer?.avatar"
                  :src="detail.question.answerer.avatar"
                  class="participant-avatar"
                  mode="aspectFill"
                />
                <view v-else class="participant-avatar fallback">
                  {{ getInitial(detail.question.answerer?.name) }}
                </view>
                <text class="participant-name">{{ detail.question.answerer?.name || "暂未指定" }}</text>
              </view>
            </view>
          </view>

          <view v-if="detail.question.images.length" class="image-grid">
            <image
              v-for="(image, index) in detail.question.images"
              :key="`${image}-${index}`"
              :src="image"
              class="detail-image"
              mode="aspectFill"
              @click="previewImages(index, detail.question.images)"
            />
          </view>
        </view>
      </view>

      <view class="panel-card">
        <view class="section-head">
          <text class="section-title">聊天记录</text>
          <text class="section-subtitle">{{ detail.chatMessages.length }} 条消息</text>
        </view>

        <view v-if="detail.chatMessages.length" class="chat-list">
          <view
            v-for="message in detail.chatMessages"
            :key="message.messageId"
            class="chat-item"
            :class="`role-${message.senderRole}`"
          >
            <view v-if="message.senderRole === 'system'" class="system-bubble">
              <text>{{ getMessagePreview(message) }}</text>
            </view>

            <template v-else>
              <text class="sender-tag">{{ getSenderLabel(message.senderRole) }}</text>
              <view class="chat-bubble">
                <text v-if="message.messageType !== 'image'">{{ getMessagePreview(message) }}</text>
                <image
                  v-else
                  :src="message.image"
                  class="chat-image"
                  mode="widthFix"
                  @click="previewImages(0, [message.image])"
                />
              </view>
              <text class="chat-time">{{ formatDate(message.createTime) }}</text>
            </template>
          </view>
        </view>

        <view v-else class="empty-card">
          <text class="empty-title">还没有聊天记录</text>
          <text class="empty-desc">当前这笔交易暂时没有留下聊天内容。</text>
        </view>
      </view>

      <view v-if="detail.refund" class="panel-card">
        <view class="section-head">
          <text class="section-title">退款记录</text>
          <text class="section-subtitle">这笔交易已经产生退款申请</text>
        </view>

        <view class="refund-card">
          <view class="refund-top">
            <text class="refund-amount">￥{{ detail.refund.amount || 0 }}</text>
            <text class="refund-status" :class="detail.refund.status">
              {{ formatRefundStatus(detail.refund.status) }}
            </text>
          </view>

          <view class="refund-item">
            <text class="refund-label">退款原因</text>
            <text class="refund-value">{{ detail.refund.reason || "未填写" }}</text>
          </view>

          <view class="refund-item">
            <text class="refund-label">补充说明</text>
            <text class="refund-value">{{ detail.refund.description || "暂无补充说明" }}</text>
          </view>

          <view v-if="detail.refund.processRemark" class="refund-item">
            <text class="refund-label">处理备注</text>
            <text class="refund-value">{{ detail.refund.processRemark }}</text>
          </view>

          <view v-if="detail.refund.proofs.length" class="image-grid">
            <image
              v-for="(image, index) in detail.refund.proofs"
              :key="`${image}-${index}`"
              :src="image"
              class="detail-image"
              mode="aspectFill"
              @click="previewImages(index, detail.refund.proofs)"
            />
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { BASE_URL } from "@/api/config";
import { customerServiceApi } from "@/api/customer-service";

const loading = ref(true);
const detail = ref({
  question: {
    title: "",
    topic: "",
    tags: [],
    reward: 0,
    images: [],
    status: "",
    createTime: "",
    author: null,
    answerer: null,
  },
  chatMessages: [],
  refund: null,
});

const normalizeAsset = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/static/")) {
    return value;
  }
  return `${BASE_URL}${value}`;
};

const getInitial = (name) => {
  const safeName = String(name || "").trim();
  return safeName ? safeName.slice(0, 1).toUpperCase() : "问";
};

const formatDate = (value) => {
  if (!value) return "最近";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};

const formatQuestionStatus = (status) => {
  const statusMap = {
    answering: "进行中",
    accepted: "已采纳",
    rated: "已评价",
    refunding: "退款中",
    refunded: "已退款",
    rejected: "已拒绝",
    pending: "待处理",
  };
  return statusMap[status] || "处理中";
};

const formatRefundStatus = (status) => {
  const statusMap = {
    pending: "待处理",
    refunded: "已同意",
    rejected: "已拒绝",
  };
  return statusMap[status] || "处理中";
};

const getSenderLabel = (role) => {
  if (role === "asker") return "提问者";
  if (role === "answerer") return "回答者";
  return "系统";
};

const getMessagePreview = (message) => {
  if (message.messageType === "image") return "";
  if (message.messageType === "apply_system") return message.text || "系统采纳消息";
  if (message.messageType === "refund_system") return message.text || "系统退款消息";
  return message.text || "暂无文字内容";
};

const previewImages = (index, images) => {
  uni.previewImage({
    current: index,
    urls: images,
  });
};

const loadDetail = async (questionId) => {
  try {
    loading.value = true;
    const res = await customerServiceApi.getTransactionDetail(questionId);
    const data = res.data || {};

    detail.value = {
      question: {
        ...(data.question || {}),
        images: Array.isArray(data.question?.images)
          ? data.question.images.map((item) => normalizeAsset(item))
          : [],
        author: data.question?.author
          ? {
              ...data.question.author,
              avatar: normalizeAsset(data.question.author.avatar),
            }
          : null,
        answerer: data.question?.answerer
          ? {
              ...data.question.answerer,
              avatar: normalizeAsset(data.question.answerer.avatar),
            }
          : null,
      },
      chatMessages: Array.isArray(data.chatMessages)
        ? data.chatMessages.map((item) => ({
            ...item,
            image: normalizeAsset(item.image),
          }))
        : [],
      refund: data.refund
        ? {
            ...data.refund,
            proofs: Array.isArray(data.refund.proofs)
              ? data.refund.proofs.map((item) => normalizeAsset(item))
              : [],
          }
        : null,
    };
  } catch (error) {
    uni.showToast({
      title: error.message || "获取交易详情失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

onLoad((options) => {
  const questionId = options.questionId || "";
  if (!questionId) {
    loading.value = false;
    uni.showToast({
      title: "缺少交易记录",
      icon: "none",
    });
    return;
  }

  loadDetail(questionId);
});
</script>

<style lang="scss" scoped>
.transaction-detail-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 40rpx;
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

.hero-copy {
  flex: 1;
}

.hero-eyebrow {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.92;
}

.hero-badge {
  width: 190rpx;
  min-height: 156rpx;
  border-radius: 30rpx;
  background: var(--app-surface-alt);
  backdrop-filter: blur(12rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hero-badge-value {
  font-size: 34rpx;
  font-weight: 700;
}

.hero-badge-label {
  margin-top: 12rpx;
  font-size: 22rpx;
}

.panel-card,
.state-card {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  border: 1rpx solid var(--app-card-border);
  box-shadow: var(--app-shadow-card);
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.section-subtitle {
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--app-ink-soft);
}

.question-card,
.refund-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.question-top,
.refund-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.topic-chip,
.status-chip,
.refund-status,
.tag {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.topic-chip {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.status-chip,
.refund-status.pending {
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
}

.refund-status.refunded {
  background: var(--app-success-bg);
  color: var(--app-success-text);
}

.refund-status.rejected {
  background: var(--app-danger-bg);
  color: var(--app-danger-text);
}

.question-title {
  display: block;
  margin-top: 16rpx;
  font-size: 32rpx;
  line-height: 1.6;
  font-weight: 600;
  color: var(--app-ink);
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.tag {
  background: var(--app-neutral-chip-bg);
  color: var(--app-ink-soft);
}

.participant-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 22rpx;
}

.participant-card {
  padding: 20rpx;
  border-radius: 22rpx;
  background: var(--app-surface-alt);
}

.participant-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.participant-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 14rpx;
}

.participant-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
}

.participant-avatar.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}

.participant-name {
  font-size: 26rpx;
  color: var(--app-ink);
  font-weight: 600;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 22rpx;
}

.detail-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 20rpx;
  background: var(--app-surface-soft);
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
}

.chat-item {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.chat-item.role-asker {
  align-items: flex-start;
}

.chat-item.role-answerer {
  align-items: flex-end;
}

.chat-item.role-system {
  align-items: center;
}

.sender-tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  background: var(--app-neutral-chip-bg);
  color: var(--app-ink-soft);
}

.chat-bubble {
  max-width: 82%;
  padding: 18rpx 22rpx;
  border-radius: 24rpx;
  background: var(--app-surface);
  border: 1rpx solid var(--app-card-border);
  box-shadow: var(--app-shadow-card);
  color: var(--app-ink);
  font-size: 26rpx;
  line-height: 1.7;
}

.role-answerer .chat-bubble {
  background: var(--app-primary-gradient);
  color: #fff;
}

.system-bubble {
  min-width: 220rpx;
  padding: 20rpx 24rpx;
  border-radius: 22rpx;
  text-align: center;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 24rpx;
  line-height: 1.6;
}

.chat-time {
  font-size: 20rpx;
  color: var(--app-ink-muted);
}

.chat-image {
  max-width: 320rpx;
  border-radius: 18rpx;
}

.refund-amount {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--app-warning-text);
}

.refund-item {
  margin-top: 18rpx;
}

.refund-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.refund-value {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--app-ink-soft);
}

.empty-card {
  margin-top: 24rpx;
  padding: 70rpx 30rpx;
  text-align: center;
}

.empty-title,
.state-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
  text-align: center;
}

.empty-desc,
.state-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
  text-align: center;
}

/* transaction detail page polish */
.transaction-detail-page .hero-card::after {
  display: none !important;
}

.transaction-detail-page .hero-card,
.transaction-detail-page .panel-card,
.transaction-detail-page .state-card {
  border-radius: 28rpx !important;
  box-shadow: 0 16rpx 40rpx rgba(43, 37, 40, 0.08) !important;
}

.transaction-detail-page .topic-chip,
.transaction-detail-page .status-chip,
.transaction-detail-page .refund-status,
.transaction-detail-page .tag {
  border: 0 !important;
  box-shadow: none !important;
  font-weight: 700 !important;
}

.transaction-detail-page .topic-chip,
.transaction-detail-page .tag {
  background: rgba(209, 238, 218, 0.92) !important;
  color: var(--app-ink) !important;
}

.transaction-detail-page .status-chip,
.transaction-detail-page .refund-status.pending {
  background: rgba(255, 233, 191, 0.96) !important;
  color: #9a6200 !important;
}

.transaction-detail-page .refund-status.refunded {
  background: rgba(213, 242, 223, 0.96) !important;
  color: #257854 !important;
}

.transaction-detail-page .refund-status.rejected {
  background: rgba(255, 224, 228, 0.96) !important;
  color: #bf4f60 !important;
}

.transaction-detail-page .question-card,
.transaction-detail-page .refund-card,
.transaction-detail-page .participant-card,
.transaction-detail-page .chat-bubble,
.transaction-detail-page .system-bubble {
  border: 0 !important;
  box-shadow: none !important;
}

.transaction-detail-page .participant-card {
  background: rgba(255, 255, 255, 0.54) !important;
}

.transaction-detail-page .chat-bubble {
  background: rgba(255, 255, 255, 0.82) !important;
}

.transaction-detail-page .role-answerer .chat-bubble,
.transaction-detail-page .system-bubble {
  background: var(--app-primary-gradient) !important;
}
</style>
