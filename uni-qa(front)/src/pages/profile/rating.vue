<template>
  <view class="rating-page">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">Share Your Feelings</text>
        <text class="hero-title">这次回答体验怎么样？</text>
        <text class="hero-desc">留下你的真实感受，也能帮后面的提问者更快找到合适的人。</text>
      </view>
      <view class="hero-badge">
        <text class="hero-badge-value">{{ selectedStars || 0 }}/5</text>
        <text class="hero-badge-label">当前评分</text>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">满意度评分</text>
        <text class="section-subtitle">点亮星星来表达整体体验</text>
      </view>

      <view class="stars-row">
        <view
          v-for="star in 5"
          :key="star"
          class="star-chip"
          :class="{ active: selectedStars >= star }"
          @click="selectStar(star)"
        >
          <text class="star-icon">★</text>
        </view>
      </view>

      <view class="score-hint">
        <text>{{ scoreHint }}</text>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">文字评价</text>
        <text class="section-subtitle">说说这次回答最打动你或最需要改进的地方</text>
      </view>

      <view class="textarea-wrap">
        <textarea
          v-model="comment"
          class="comment-textarea"
          maxlength="500"
          placeholder="写下你的评价内容..."
        />
        <text class="textarea-counter">{{ comment.length }}/500</text>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">补充图片</text>
        <text class="section-subtitle">可选，最多 9 张，帮助更完整地表达体验</text>
      </view>

      <view class="image-grid">
        <view
          v-for="(image, index) in tempImageList"
          :key="`${image}-${index}`"
          class="preview-item"
          @click="previewImage(index)"
        >
          <image :src="image" class="preview-image" mode="aspectFill" />
          <view class="delete-btn" @click.stop="deleteImage(index)">
            <text>×</text>
          </view>
        </view>

        <view v-if="tempImageList.length < 9" class="upload-tile" @click="uploadImage">
          <text class="upload-plus">+</text>
          <text class="upload-text">上传图片</text>
        </view>
      </view>
    </view>

    <view class="submit-bar">
      <button
        class="submit-btn"
        :class="{ disabled: selectedStars === 0 }"
        :disabled="selectedStars === 0"
        @click="submitRating"
      >
        提交评价
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { commonApi } from "@/api/common";
import { createRating } from "@/api/ratings";

const selectedStars = ref(0);
const comment = ref("");
const questionId = ref("");
const tempImageList = ref([]);

const scoreHintMap = {
  0: "先选一个分数吧",
  1: "还有不少可以改进的空间",
  2: "勉强解决了一部分问题",
  3: "整体还不错，基本有帮助",
  4: "体验很好，沟通也比较顺畅",
  5: "非常满意，值得推荐给别人",
};

const scoreHint = computed(() => scoreHintMap[selectedStars.value] || scoreHintMap[0]);

onLoad((options) => {
  questionId.value = options.questionId || "";
});

const selectStar = (star) => {
  selectedStars.value = star;
};

const uploadImage = () => {
  uni.chooseImage({
    count: 9 - tempImageList.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      tempImageList.value = [...tempImageList.value, ...res.tempFilePaths];
    },
    fail: (error) => {
      console.error("选择评价图片失败:", error);
    },
  });
};

const previewImage = (index) => {
  uni.previewImage({
    current: index,
    urls: tempImageList.value,
  });
};

const deleteImage = (index) => {
  tempImageList.value.splice(index, 1);
};

const submitRating = async () => {
  if (selectedStars.value === 0) {
    uni.showToast({
      title: "请先选择评分",
      icon: "none",
    });
    return;
  }

  if (!comment.value.trim()) {
    uni.showToast({
      title: "请填写评价内容",
      icon: "none",
    });
    return;
  }

  if (!questionId.value) {
    uni.showToast({
      title: "缺少评价对象",
      icon: "none",
    });
    return;
  }

  try {
    uni.showLoading({
      title: "提交中...",
    });

    let uploadedUrls = [];
    if (tempImageList.value.length > 0) {
      const uploadResult = await commonApi.uploadImage(tempImageList.value, "rate");
      uploadedUrls = Array.isArray(uploadResult.data)
        ? uploadResult.data
        : uploadResult.data
          ? [uploadResult.data]
          : [];
    }

    const user = uni.getStorageSync("userInfo") || {};
    await createRating({
      avatar: user.avatar,
      account: user.account,
      questionId: questionId.value,
      score: selectedStars.value,
      content: comment.value.trim(),
      images: uploadedUrls,
    });

    uni.hideLoading();
    uni.showToast({
      title: "评价提交成功",
      icon: "success",
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1000);
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || "评价提交失败",
      icon: "none",
    });
  }
};
</script>

<style lang="scss" scoped>
.rating-page {
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
  width: 168rpx;
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
  font-size: 42rpx;
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

.stars-row {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-top: 28rpx;
}

.star-chip {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-neutral-chip-bg);
  transition: all 0.2s ease;
}

.star-chip.active {
  background: var(--app-primary-gradient);
  box-shadow: var(--app-primary-shadow);
}

.star-icon {
  font-size: 48rpx;
  color: var(--app-ink-muted);
}

.star-chip.active .star-icon {
  color: #fff;
}

.score-hint {
  margin-top: 22rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--app-accent-strong);
}

.textarea-wrap {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.comment-textarea {
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

.submit-btn.disabled {
  background: var(--app-neutral-chip-bg);
  color: var(--app-ink-muted);
  box-shadow: none;
}
</style>
