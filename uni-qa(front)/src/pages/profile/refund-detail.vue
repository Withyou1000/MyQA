<template>
  <view :class="['refund-detail-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="退款详情" tone="coral" />
    <view v-if="loading" class="state-card loading-card">
      <text class="state-title">正在加载退款详情</text>
      <text class="state-desc">稍等一下，正在同步这笔退款申请的信息。</text>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-copy">
          <text class="hero-eyebrow">Refund Detail</text>
          <text class="hero-title">退款详情</text>
          <text class="hero-desc">
            {{ statusDescription }}
          </text>
        </view>

        <view class="hero-badge" :class="refundInfo.status">
          <text class="hero-badge-value">￥{{ refundInfo.amount || 0 }}</text>
          <text class="hero-badge-label">{{ getStatusText(refundInfo.status) }}</text>
        </view>
      </view>

      <view v-if="refundInfo.questionTitle" class="panel-card">
        <view class="section-head">
          <text class="section-title">关联问题</text>
          <text class="section-subtitle">这笔退款申请对应的问答记录</text>
        </view>

        <view class="question-card">
          <view class="question-top">
            <text class="question-topic">{{ refundInfo.questionTopic || "未分类" }}</text>
            <text class="question-status">{{ getStatusText(refundInfo.status) }}</text>
          </view>
          <text class="question-title">{{ refundInfo.questionTitle }}</text>
        </view>
      </view>

      <view class="panel-card">
        <view class="section-head">
          <text class="section-title">退款信息</text>
          <text class="section-subtitle">申请原因、说明与处理状态都会显示在这里</text>
        </view>

        <view class="amount-card">
          <text class="amount-label">退款金额</text>
          <text class="amount-value">￥{{ refundInfo.amount || 0 }}</text>
        </view>

        <view class="info-list">
          <view class="info-item">
            <text class="info-label">退款原因</text>
            <text class="info-value">{{ refundInfo.reason || "未填写" }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">详细说明</text>
            <text class="info-value description">
              {{ refundInfo.description || "对方暂时还没有补充更多说明。" }}
            </text>
          </view>

          <view v-if="refundInfo.processRemark" class="info-item">
            <text class="info-label">处理备注</text>
            <text class="info-value description">{{ refundInfo.processRemark }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">当前状态</text>
            <view class="status-badge" :class="refundInfo.status">
              {{ getStatusText(refundInfo.status) }}
            </view>
          </view>
        </view>
      </view>

      <view v-if="refundInfo.images.length" class="panel-card">
        <view class="section-head">
          <text class="section-title">凭证图片</text>
          <text class="section-subtitle">点开可以查看大图</text>
        </view>

        <view class="image-grid">
          <image
            v-for="(image, index) in refundInfo.images"
            :key="`${image}-${index}`"
            :src="image"
            class="refund-image"
            mode="aspectFill"
            @click="previewImage(index)"
          />
        </view>
      </view>

      <view
        v-if="refundInfo.status === 'pending' && !refundInfo.isMine"
        class="action-bar"
      >
        <button class="action-btn reject-btn" :disabled="processing" @click="handleReject">
          {{ processing ? "处理中..." : "拒绝退款" }}
        </button>
        <button class="action-btn accept-btn" :disabled="processing" @click="handleAccept">
          {{ processing ? "处理中..." : "同意退款" }}
        </button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { chatApi } from "@/api/chat";
import { refundApi } from "@/api/refund";
import { BASE_URL } from "@/api/config";

const questionId = ref("");
const loading = ref(true);
const processing = ref(false);

const refundInfo = ref({
  refundId: "",
  amount: "",
  reason: "",
  description: "",
  images: [],
  status: "pending",
  isMine: false,
  questionTitle: "",
  questionTopic: "",
  processRemark: "",
});

const normalizeUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
};

const getStatusText = (status) => {
  const statusMap = {
    pending: "待处理",
    refunded: "已同意",
    rejected: "已拒绝",
  };
  return statusMap[status] || "处理中";
};

const statusDescription = computed(() => {
  if (refundInfo.value.status === "refunded") {
    return "这笔退款申请已经处理完成，退款结果会同步显示在聊天记录里。";
  }
  if (refundInfo.value.status === "rejected") {
    return "这笔退款申请已被拒绝，你们仍然可以继续在聊天里沟通后续处理。";
  }
  if (refundInfo.value.isMine) {
    return "你已经发起了退款申请，现在可以在这里查看进度和提交内容。";
  }
  return "对方向你发起了退款申请，请先查看原因和凭证，再决定是否处理。";
});

const loadRefundDetail = async () => {
  try {
    loading.value = true;
    const res = await refundApi.getRefundByQuestionId(questionId.value);
    const data = res.data || {};

    refundInfo.value = {
      refundId: data.refundId || "",
      amount: data.amount || 0,
      reason: data.reason || "",
      description: data.description || "",
      images: Array.isArray(data.proofs) ? data.proofs.map((img) => normalizeUrl(img)) : [],
      status: data.status || "pending",
      isMine: Boolean(data.isMine),
      questionTitle: data.questionTitle || "",
      questionTopic: data.questionTopic || "",
      processRemark: data.processRemark || "",
    };
  } catch (error) {
    uni.showToast({
      title: error.message || "获取详情失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

const previewImage = (index) => {
  uni.previewImage({
    current: index,
    urls: refundInfo.value.images,
  });
};

const emitRefundMessage = (text) => {
  uni.$emit("socketMessage", {
    id: Date.now(),
    type: "message_sent",
    questionId: questionId.value,
    messageType: "refund_system",
    text,
    isMine: true,
  });
};

const handleAccept = async () => {
  if (processing.value) return;

  try {
    processing.value = true;
    uni.showLoading({ title: "处理中..." });

    await refundApi.processRefund(refundInfo.value.refundId, {
      status: "refunded",
      remark: "同意退款申请",
    });

    const text = "我已同意你的退款申请，退款金额将原路退回。";
    await chatApi.sendChatMessage(questionId.value, {
      messageType: "refund_system",
      text,
    });
    emitRefundMessage(text);

    uni.showToast({
      title: "已同意退款",
      icon: "success",
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (error) {
    uni.showToast({
      title: error.message || "处理失败",
      icon: "none",
    });
  } finally {
    processing.value = false;
    uni.hideLoading();
  }
};

const handleReject = async () => {
  if (processing.value) return;

  try {
    processing.value = true;
    uni.showLoading({ title: "处理中..." });

    await refundApi.processRefund(refundInfo.value.refundId, {
      status: "rejected",
      remark: "拒绝退款申请",
    });

    const text = "我已拒绝你的退款申请，如有需要我们可以继续沟通。";
    await chatApi.sendChatMessage(questionId.value, {
      messageType: "refund_system",
      text,
    });
    emitRefundMessage(text);

    uni.showToast({
      title: "已拒绝退款",
      icon: "success",
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (error) {
    uni.showToast({
      title: error.message || "处理失败",
      icon: "none",
    });
  } finally {
    processing.value = false;
    uni.hideLoading();
  }
};

onLoad((options) => {
  questionId.value = options.questionId || "";

  if (!questionId.value) {
    loading.value = false;
    uni.showToast({
      title: "缺少退款记录",
      icon: "none",
    });
    return;
  }

  loadRefundDetail();
});
</script>

<style lang="scss" scoped>
.refund-detail-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 190rpx;
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

.hero-badge.pending {
  background: var(--app-surface-alt);
}

.hero-badge.refunded {
  background: var(--app-success-bg);
}

.hero-badge.rejected {
  background: var(--app-danger-bg);
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
.amount-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.question-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.question-topic,
.question-status {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.question-topic {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.question-status {
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
}

.question-title {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  line-height: 1.6;
  font-weight: 600;
  color: var(--app-ink);
}

.amount-card {
  text-align: center;
}

.amount-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.amount-value {
  display: block;
  margin-top: 14rpx;
  font-size: 56rpx;
  font-weight: 700;
  color: var(--app-accent-strong);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  margin-top: 24rpx;
}

.info-item {
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.info-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.info-value {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--app-ink);
}

.info-value.description {
  color: var(--app-ink-soft);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.status-badge.pending {
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
}

.status-badge.refunded {
  background: var(--app-success-bg);
  color: var(--app-success-text);
}

.status-badge.rejected {
  background: var(--app-danger-bg);
  color: var(--app-danger-text);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 24rpx;
}

.refund-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 24rpx;
  background: var(--app-surface-soft);
}

.action-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom) + 24rpx);
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 92rpx;
  border-radius: 999rpx;
  border: none;
  outline: none;
  font-size: 30rpx;
  font-weight: 600;
}

.action-btn::after {
  border: none;
}

.accept-btn {
  background: var(--app-primary-gradient);
  color: #fff;
  box-shadow: var(--app-primary-shadow);
}

.reject-btn {
  background: var(--app-surface);
  color: var(--app-danger-text);
  border: 1rpx solid var(--app-card-border);
  box-shadow: var(--app-shadow-card);
}

.action-btn[disabled] {
  opacity: 0.72;
}

.loading-card {
  margin-top: 24rpx;
}

.state-title {
  display: block;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.state-desc {
  display: block;
  margin-top: 14rpx;
  text-align: center;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
}
</style>
