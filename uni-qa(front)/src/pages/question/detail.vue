<template>
  <view :class="['detail-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="问题详情" tone="mint" />
    <view class="question-card">
      <view class="question-header">
        <view class="author-info">
          <image
            v-if="authorAvatar"
            :src="authorAvatar"
            class="author-avatar-image"
            mode="aspectFill"
          />
          <view v-else class="author-avatar">{{ getAuthorInitial() }}</view>

          <view class="author-meta">
            <text class="author-name">{{ getAuthorName() }}</text>
            <text class="post-time">{{ question.createTime || "刚刚发布" }}</text>
          </view>
        </view>

        <view class="category-badge">
          <text>{{ question.topic || question.category || "未分类" }}</text>
        </view>
      </view>

      <text class="title">{{ question.title }}</text>

      <view v-if="question.tags && question.tags.length > 0" class="tags-container">
        <view v-for="(tag, index) in question.tags" :key="index" class="tag">
          <text>{{ tag }}</text>
        </view>
      </view>

      <view class="reward-container">
        <view class="reward-icon">赏</view>
        <view class="reward-info">
          <text class="reward-text">悬赏金额</text>
          <text class="reward-amount">{{ question.reward || 0 }}元</text>
        </view>
      </view>

      <view class="question-content">
        <rich-text v-if="question.content" :nodes="question.content"></rich-text>
        <text v-else class="no-content">这个问题还没有补充更多描述。</text>
      </view>

      <view v-if="question.images && question.images.length" class="image-grid">
        <view v-for="(img, index) in question.images" :key="index" class="image-item">
          <image
            :src="img"
            mode="aspectFill"
            class="question-image"
            @click="previewImage(index)"
          />
        </view>
      </view>
    </view>

    <view class="answer-section">
      <view v-if="fromIndex && question.author._id !== currentUser.userId">
        <button class="answer-btn" :disabled="isApplying" @click="handleAnswer">
          {{ isApplying ? "提交中..." : "申请回答" }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { applyApi } from "@/api/apply";
import { questionApi } from "@/api/question";
import { BASE_URL } from "@/api/config";

const fromIndex = ref(false);
const currentUser = ref(uni.getStorageSync("userInfo") || {});
const isApplying = ref(false);

const question = ref({
  questionId: "",
  title: "",
  content: "",
  category: "",
  topic: "",
  tags: [],
  reward: 0,
  images: [],
  createTime: "",
  author: {
    _id: "",
    account: "",
    avatar: "",
  },
});

const normalizeUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
};

const getAuthorName = () => question.value.author?.account || "匿名用户";
const getAuthorInitial = () => getAuthorName().slice(0, 1).toUpperCase();

const authorAvatar = computed(() => normalizeUrl(question.value.author?.avatar || ""));

const previewImage = (index) => {
  uni.previewImage({
    urls: question.value.images,
    current: index,
  });
};

const loadQuestionDetail = async (questionId) => {
  try {
    const res = await questionApi.getQuestionDetail(questionId);
    const data = res.data || {};

    question.value = {
      questionId: data.questionId || data._id || questionId,
      title: data.title || "",
      content: data.content || "",
      category: data.category || "",
      topic: data.topic || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      reward: Number(data.reward || 0),
      images: Array.isArray(data.images)
        ? data.images.map((img) => normalizeUrl(img))
        : [],
      createTime: data.createTime || "",
      author: {
        _id: data.author?._id || data.author || "",
        account: data.author?.account || "",
        avatar: data.author?.avatar || "",
      },
    };
  } catch (error) {
    uni.showToast({
      title: error.message || "获取问题详情失败",
      icon: "none",
    });
  }
};

const handleAnswer = () => {
  if (isApplying.value) {
    uni.showToast({
      title: "正在提交申请，请稍候",
      icon: "none",
      duration: 2200,
    });
    return;
  }

  uni.showModal({
    title: "申请回答",
    content: "确定申请回答这个问题吗？",
    success: async (res) => {
      if (!res.confirm) return;

      if (question.value.author._id === currentUser.value.userId) {
        uni.showToast({
          title: "不能申请回答自己的问题",
          icon: "none",
          duration: 2200,
        });
        return;
      }

      const userReputation = 100;
      if (userReputation < 90) {
        uni.showToast({
          title: "当前信誉分过低，暂时不能申请回答",
          icon: "none",
          duration: 2200,
        });
        return;
      }

      try {
        isApplying.value = true;
        const response = await applyApi.applyAnswerQuestion(question.value.questionId);

        uni.showToast({
          title: response?.message || "申请成功",
          icon: "success",
          duration: 1800,
        });

        setTimeout(() => {
          uni.navigateBack();
        }, 900);
      } catch (error) {
        uni.showToast({
          title: error.message || "申请失败，请稍后重试",
          icon: "none",
          duration: 2200,
        });
      } finally {
        isApplying.value = false;
      }
    },
  });
};

onLoad((options) => {
  const questionId = options.questionId || "";
  fromIndex.value = options.fromIndex === "true";

  if (!questionId) {
    uni.showToast({
      title: "未找到问题信息",
      icon: "none",
    });
    return;
  }

  loadQuestionDetail(questionId);
});
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 150rpx;
}

.question-card {
  background: var(--app-surface);
  border: 1rpx solid var(--app-card-border);
  border-radius: 32rpx;
  padding: 32rpx 28rpx;
  box-shadow: var(--app-shadow-card);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
  gap: 18rpx;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
}

.author-avatar-image,
.author-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}

.author-avatar {
  background: var(--app-primary-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.author-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.author-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.post-time {
  font-size: 22rpx;
  color: var(--app-ink-muted);
  margin-top: 8rpx;
}

.category-badge {
  flex-shrink: 0;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 22rpx;
}

.title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: var(--app-ink);
  line-height: 1.5;
  margin-bottom: 24rpx;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.tag {
  background: var(--app-neutral-chip-bg);
  color: var(--app-ink-soft);
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.reward-container {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
  padding: 20rpx;
  border-radius: 24rpx;
  margin-bottom: 28rpx;
}

.reward-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 16rpx;
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.reward-info {
  display: flex;
  flex-direction: column;
}

.reward-text {
  font-size: 24rpx;
  color: var(--app-warning-text);
}

.reward-amount {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--app-warning-text);
}

.question-content {
  margin-bottom: 28rpx;
  font-size: 30rpx;
  color: var(--app-ink);
  line-height: 1.8;
  padding: 24rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
  border-radius: 24rpx;
}

.no-content {
  color: var(--app-ink-muted);
  text-align: center;
  display: block;
  padding: 36rpx 0;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.image-item {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 20rpx;
  overflow: hidden;
  background-color: var(--app-surface-soft);
}

.question-image {
  width: 100%;
  height: 100%;
}

.answer-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 22rpx 24rpx 28rpx;
  background: var(--app-surface);
  border-top: 1rpx solid var(--app-card-border);
  backdrop-filter: blur(18rpx);
}

.answer-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: var(--app-primary-shadow);
}

.answer-btn[disabled] {
  opacity: 0.72;
}

/* detail page regenerated layout */
.detail-page {
  padding: 24rpx 24rpx 168rpx !important;
  background: var(--app-page-bg) !important;
}

.detail-page .question-card {
  padding: 30rpx 28rpx 34rpx !important;
  border: 0 !important;
  border-radius: 28rpx !important;
  background: rgba(255, 253, 246, 0.96) !important;
  box-shadow: 0 18rpx 48rpx rgba(43, 37, 40, 0.08) !important;
  overflow: hidden;
}

.detail-page .question-header {
  align-items: flex-start !important;
  margin-bottom: 26rpx !important;
}

.detail-page .author-info {
  gap: 18rpx !important;
  flex: 1;
}

.detail-page .author-avatar-image,
.detail-page .author-avatar {
  width: 86rpx !important;
  height: 86rpx !important;
  border-radius: 50% !important;
  border: 2rpx solid rgba(43, 37, 40, 0.12) !important;
  box-shadow: none !important;
}

.detail-page .author-name {
  font-size: 32rpx !important;
  line-height: 1.2 !important;
  color: var(--app-ink) !important;
}

.detail-page .post-time {
  margin-top: 10rpx !important;
  font-size: 24rpx !important;
  color: var(--app-ink-muted) !important;
}

.detail-page .category-badge {
  padding: 12rpx 24rpx !important;
  border: 1rpx solid rgba(42, 126, 76, 0.18) !important;
  border-radius: 999rpx !important;
  background: rgba(209, 238, 218, 0.9) !important;
  box-shadow: none !important;
  color: var(--app-ink) !important;
  font-size: 24rpx !important;
  font-weight: 700 !important;
}

.detail-page .title {
  margin: 4rpx 0 22rpx !important;
  font-size: 42rpx !important;
  line-height: 1.35 !important;
  font-weight: 800 !important;
  color: var(--app-ink) !important;
}

.detail-page .tags-container {
  gap: 14rpx !important;
  margin-bottom: 26rpx !important;
}

.detail-page .tag {
  padding: 10rpx 22rpx !important;
  border: 1rpx solid rgba(42, 126, 76, 0.16) !important;
  border-radius: 999rpx !important;
  background: rgba(209, 238, 218, 0.86) !important;
  box-shadow: none !important;
  color: var(--app-ink) !important;
  font-size: 24rpx !important;
  font-weight: 700 !important;
}

.detail-page .reward-container {
  display: flex !important;
  align-items: center !important;
  gap: 18rpx !important;
  width: auto !important;
  min-height: 104rpx !important;
  margin: 4rpx 0 28rpx !important;
  padding: 20rpx 24rpx !important;
  border: 1rpx solid rgba(230, 132, 79, 0.22) !important;
  border-radius: 24rpx !important;
  background: linear-gradient(135deg, rgba(255, 238, 226, 0.95), rgba(255, 247, 236, 0.95)) !important;
  box-shadow: none !important;
}

.detail-page .reward-icon {
  width: 60rpx !important;
  height: 60rpx !important;
  border: 0 !important;
  border-radius: 18rpx !important;
  background: rgba(229, 142, 35, 0.16) !important;
  box-shadow: none !important;
  color: #b96800 !important;
  font-size: 28rpx !important;
}

.detail-page .reward-info {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  align-items: flex-start !important;
}

.detail-page .reward-text {
  font-size: 24rpx !important;
  color: #a36608 !important;
  font-weight: 700 !important;
}

.detail-page .reward-amount {
  margin-top: 4rpx !important;
  font-size: 42rpx !important;
  line-height: 1 !important;
  color: #d17a00 !important;
}

.detail-page .question-content {
  margin: 0 0 28rpx !important;
  padding: 26rpx !important;
  border: 0 !important;
  border-radius: 24rpx !important;
  background: rgba(255, 249, 241, 0.78) !important;
  box-shadow: none !important;
  color: var(--app-ink) !important;
  font-size: 29rpx !important;
  line-height: 1.75 !important;
}

.detail-page .image-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 12rpx !important;
}

.detail-page .image-item {
  border-radius: 18rpx !important;
  border: 0 !important;
  box-shadow: none !important;
}

.detail-page .answer-section {
  padding: 18rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)) !important;
  border-top: 1rpx solid rgba(43, 37, 40, 0.08) !important;
  background: rgba(255, 253, 246, 0.92) !important;
  box-shadow: 0 -12rpx 36rpx rgba(43, 37, 40, 0.06) !important;
}

.detail-page .answer-btn {
  height: 92rpx !important;
  border: 0 !important;
  border-radius: 999rpx !important;
  box-shadow: var(--app-primary-shadow) !important;
}
</style>
