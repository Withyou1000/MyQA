<template>
  <view class="refund-page">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">Refund Request</text>
        <text class="hero-title">申请退款</text>
        <text class="hero-desc">补充清楚原因和凭证，能让对方更快理解情况，也方便后续处理。</text>
      </view>
      <view class="hero-badge">
        <text class="hero-badge-value">¥{{ refundAmount || "0.00" }}</text>
        <text class="hero-badge-label">申请金额</text>
      </view>
    </view>

    <view class="panel-card" v-if="question">
      <view class="section-head">
        <text class="section-title">当前问题</text>
        <text class="section-subtitle">退款会关联到这条问答记录</text>
      </view>

      <view class="question-card">
        <view class="question-top">
          <text class="question-topic">{{ question.topic || "未分类" }}</text>
          <text class="question-reward">原赏金 ¥{{ maxAmount }}</text>
        </view>
        <text class="question-title">{{ question.title || "未命名问题" }}</text>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">退款金额</text>
        <text class="section-subtitle">金额不能超过原赏金，可手动调整</text>
      </view>

      <view class="amount-card">
        <view class="amount-input-wrap">
          <text class="currency-symbol">¥</text>
          <input
            v-model="refundAmount"
            class="amount-input"
            type="digit"
            placeholder="0.00"
            @input="limitAmount"
          />
        </view>
        <text class="amount-hint">最高可申请 ¥{{ maxAmount }}</text>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">退款原因</text>
        <text class="section-subtitle">请选择一个最接近当前情况的原因</text>
      </view>

      <view class="reason-list">
        <view
          v-for="reason in refundReasons"
          :key="reason"
          class="reason-chip"
          :class="{ active: refundReason === reason }"
          @click="selectRefundReason(reason)"
        >
          <text>{{ reason }}</text>
        </view>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">补充凭证</text>
        <text class="section-subtitle">可选，最多 9 张，截图或照片都可以</text>
      </view>

      <view class="image-grid">
        <view
          v-for="(proof, index) in proofs"
          :key="`${proof}-${index}`"
          class="preview-item"
          @click="previewProof(index)"
        >
          <image :src="proof" class="preview-image" mode="aspectFill" />
          <view class="delete-btn" @click.stop="deleteProof(index)">
            <text>×</text>
          </view>
        </view>

        <view v-if="proofs.length < 9" class="upload-tile" @click="uploadProof">
          <text class="upload-plus">+</text>
          <text class="upload-text">上传凭证</text>
        </view>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">补充说明</text>
        <text class="section-subtitle">尽量写清具体问题，方便对方判断和处理</text>
      </view>

      <view class="textarea-wrap">
        <textarea
          v-model="description"
          class="desc-textarea"
          maxlength="500"
          placeholder="写下你申请退款的具体原因..."
        />
        <text class="textarea-counter">{{ description.length }}/500</text>
      </view>
    </view>

    <view class="submit-bar">
      <button class="submit-btn" @click="submitRefund">提交退款申请</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { chatApi } from "@/api/chat";
import { commonApi } from "@/api/common";
import { refundApi } from "@/api/refund";

const question = ref(null);
const refundAmount = ref("0.00");
const maxAmount = ref("0.00");
const refundReason = ref("");
const description = ref("");
const proofs = ref([]);

const refundReasons = ["答非所问", "无人回复", "回答没有帮助", "其他原因"];

onLoad((options) => {
  if (!options.question) return;

  try {
    const parsedQuestion = JSON.parse(options.question);
    question.value = parsedQuestion;

    const rewardValue = String(parsedQuestion.reward || 0);
    refundAmount.value = rewardValue;
    maxAmount.value = rewardValue;
  } catch (error) {
    console.error("解析退款问题参数失败:", error);
  }
});

const selectRefundReason = (reason) => {
  refundReason.value = reason;
};

const uploadProof = () => {
  uni.chooseImage({
    count: 9 - proofs.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      proofs.value = [...proofs.value, ...res.tempFilePaths];
    },
  });
};

const previewProof = (index) => {
  uni.previewImage({
    current: index,
    urls: proofs.value,
  });
};

const deleteProof = (index) => {
  proofs.value.splice(index, 1);
};

const limitAmount = () => {
  const max = parseFloat(maxAmount.value);
  const current = parseFloat(refundAmount.value);

  if (!Number.isNaN(current) && !Number.isNaN(max) && current > max) {
    refundAmount.value = String(max);
  }
};

const submitRefund = async () => {
  if (!question.value?.id) {
    uni.showToast({
      title: "缺少退款对象",
      icon: "none",
    });
    return;
  }

  if (!refundReason.value) {
    uni.showToast({
      title: "请选择退款原因",
      icon: "none",
    });
    return;
  }

  if (!description.value.trim()) {
    uni.showToast({
      title: "请填写补充说明",
      icon: "none",
    });
    return;
  }

  try {
    uni.showLoading({
      title: "提交中...",
    });

    let uploadedUrls = [];
    if (proofs.value.length > 0) {
      const uploadResult = await commonApi.uploadImage(proofs.value, "refund");
      uploadedUrls = Array.isArray(uploadResult.data)
        ? uploadResult.data
        : uploadResult.data
          ? [uploadResult.data]
          : [];
    }

    await refundApi.submitRefund({
      questionId: question.value.id,
      amount: parseFloat(refundAmount.value),
      maxAmount: parseFloat(maxAmount.value),
      reason: refundReason.value,
      proofs: uploadedUrls,
      description: description.value.trim(),
    });

    await chatApi.sendChatMessage(question.value.id, {
      messageType: "refund_system",
      text: "我发起了退款申请，等待你处理，点击查看退款详情",
    });

    uni.hideLoading();
    uni.showToast({
      title: "退款申请已提交",
      icon: "success",
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    console.error("提交退款申请失败:", error);
    uni.hideLoading();
    uni.showToast({
      title: error.message || "提交失败，请重试",
      icon: "none",
    });
  }
};
</script>

<style lang="scss" scoped>
.refund-page {
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
  width: 180rpx;
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

.panel-card {
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

.question-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.question-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14rpx;
}

.question-topic,
.question-reward {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.question-topic {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.question-reward {
  background: var(--app-success-bg);
  color: var(--app-success-text);
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
  margin-top: 24rpx;
  padding: 26rpx 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.amount-input-wrap {
  display: flex;
  align-items: center;
}

.currency-symbol {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--app-accent-strong);
}

.amount-input {
  flex: 1;
  margin-left: 10rpx;
  font-size: 46rpx;
  font-weight: 700;
  color: var(--app-accent-strong);
}

.amount-hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}

.reason-chip {
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: var(--app-neutral-chip-bg);
  color: var(--app-ink-soft);
  font-size: 24rpx;
}

.reason-chip.active {
  background: var(--app-primary-gradient);
  color: #fff;
  box-shadow: var(--app-primary-shadow);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 24rpx;
}

.upload-tile,
.preview-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 24rpx;
  overflow: hidden;
}

.upload-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: var(--app-input-bg);
  border: 2rpx dashed var(--app-line);
}

.upload-plus {
  font-size: 52rpx;
  line-height: 1;
  color: var(--app-accent-strong);
}

.upload-text {
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.preview-image {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: var(--app-mask-bg);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
}

.textarea-wrap {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.desc-textarea {
  width: 100%;
  height: 220rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--app-ink);
}

.textarea-counter {
  display: block;
  margin-top: 14rpx;
  text-align: right;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.submit-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom) + 24rpx);
}

.submit-btn {
  width: 100%;
  height: 92rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: var(--app-primary-shadow);
}
</style>
