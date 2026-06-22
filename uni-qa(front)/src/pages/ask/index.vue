<template>
  <view :class="['ask-page', themePageClass]">
    <view class="hero-card">
      <text class="hero-tag">发起问题</text>
      <text class="hero-title">认真描述一点，回答就会更贴近你</text>
      <text class="hero-desc">把问题背景、图片和赏金整理好，社区会更快给你温柔又靠谱的回应。</text>
    </view>

    <view class="panel-card question-card">
      <view class="section-head">
        <text class="section-title">问题描述</text>
        <text class="section-note">{{ questionDesc.length }}/1000</text>
      </view>
      <textarea
        v-model="questionDesc"
        class="description-textarea"
        placeholder="写下你的问题、背景和你期望得到的帮助"
        :maxlength="1000"
        auto-height
      />

      <view class="image-upload">
        <view v-for="(image, index) in images" :key="`${image}-${index}`" class="image-item">
          <image :src="image" mode="aspectFill" @click="previewImage(index)" />
          <text class="delete-icon" @click.stop="deleteImage(index)">×</text>
        </view>
        <view v-if="images.length < 3" class="upload-btn" @click="chooseImage">
          <text class="plus-icon">+</text>
          <text class="upload-text">添加图片</text>
        </view>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">主题分类</text>
        <text class="section-note">让懂的人更快看到</text>
      </view>
      <view class="selector-card" :class="{ selected: selectedTopic }" @click="openTopicModal">
        <text>{{ selectedTopic || "选择一个最接近的主题" }}</text>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">标签</text>
        <text class="section-note">最多 3 个</text>
      </view>
      <view class="tags-container">
        <view v-for="(tag, index) in selectedTags" :key="`${tag}-${index}`" class="tag-item">
          <text>{{ tag }}</text>
          <text class="delete-icon" @click="removeTag(index)">×</text>
        </view>
        <view v-if="selectedTags.length < 3" class="add-tag" @click="openTagModal">
          <text class="plus-icon">+</text>
        </view>
      </view>
    </view>

    <view class="panel-card">
      <view class="section-head">
        <text class="section-title">赏金金额</text>
        <text class="section-note">让优质回答更快出现</text>
      </view>
      <view class="reward-input">
        <input v-model="reward" type="number" placeholder="输入金额" class="amount-input" />
        <text class="unit">元</text>
      </view>
      <view class="tips-row">
        <text class="tip-chip">清晰描述更容易被接单</text>
        <text class="tip-chip">可上传 3 张参考图</text>
      </view>
    </view>

    <view class="bottom-submit">
      <view class="submit-button" @click="handleSubmit">发布问题</view>
    </view>

    <view v-if="showTopicModal" class="sheet-mask" @click="closeTopicModal">
      <view class="sheet-card" @click.stop>
        <view class="sheet-top">
          <text class="sheet-badge">Topic Picker</text>
          <text class="sheet-title">选择主题分类</text>
          <text class="sheet-desc">先选一个主题，后面的标签和回答都会更聚焦。</text>
        </view>

        <view class="topic-grid">
          <view
            v-for="topic in topics"
            :key="topic"
            class="topic-chip"
            :class="{ active: selectedTopic === topic }"
            @click="selectTopic(topic)"
          >
            <text>{{ topic }}</text>
          </view>
        </view>

        <view class="sheet-actions">
          <view class="sheet-btn light" @click="closeTopicModal">取消</view>
          <view class="sheet-btn primary" @click="closeTopicModal">完成选择</view>
        </view>
      </view>
    </view>

    <view v-if="showTagModal" class="sheet-mask" @click="closeTagModal">
      <view class="sheet-card" @click.stop>
        <view class="sheet-top">
          <text class="sheet-badge">Tag Editor</text>
          <text class="sheet-title">添加标签</text>
          <text class="sheet-desc">用简短关键词帮助别人更快理解你的问题方向。</text>
        </view>

        <view class="tag-input-wrap">
          <input
            v-model="tagInputValue"
            class="tag-modal-input"
            type="text"
            maxlength="12"
            placeholder="请输入标签名称"
            :focus="showTagModal"
            @confirm="confirmTagInput"
          />
          <text class="tag-modal-counter">{{ tagInputValue.length }}/12</text>
        </view>

        <view class="sheet-actions">
          <view class="sheet-btn light" @click="closeTagModal">取消</view>
          <view class="sheet-btn primary" @click="confirmTagInput">确认添加</view>
        </view>
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { ref } from "vue";
import { commonApi } from "@/api/common";
import { questionApi } from "@/api/question";
import AppTabBar from "@/components/AppTabBar.vue";

const questionDesc = ref("");
const reward = ref("");
const selectedTopic = ref("");
const selectedTags = ref([]);
const images = ref([]);
const showTagModal = ref(false);
const showTopicModal = ref(false);
const tagInputValue = ref("");

const topics = ["编程", "教育", "硬件", "游戏", "动画", "其他"];

const chooseImage = () => {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      images.value.push(...res.tempFilePaths);
    },
  });
};

const previewImage = (index) => {
  uni.previewImage({
    urls: images.value,
    current: index,
  });
};

const deleteImage = (index) => {
  images.value.splice(index, 1);
};

const closeTopicModal = () => {
  showTopicModal.value = false;
};

const openTopicModal = () => {
  showTopicModal.value = true;
};

const selectTopic = (topic) => {
  selectedTopic.value = topic;
};

const closeTagModal = () => {
  showTagModal.value = false;
  tagInputValue.value = "";
};

const openTagModal = () => {
  if (!selectedTopic.value) {
    uni.showToast({
      title: "请先选择主题",
      icon: "none",
    });
    return;
  }

  if (selectedTags.value.length >= 3) {
    uni.showToast({
      title: "最多添加 3 个标签",
      icon: "none",
    });
    return;
  }

  showTagModal.value = true;
  tagInputValue.value = "";
};

const confirmTagInput = () => {
  const normalizedTag = tagInputValue.value.trim();

  if (!normalizedTag) {
    uni.showToast({
      title: "请输入标签名称",
      icon: "none",
    });
    return;
  }

  if (selectedTags.value.includes(normalizedTag)) {
    uni.showToast({
      title: "这个标签已经添加过了",
      icon: "none",
    });
    return;
  }

  if (selectedTags.value.length >= 3) {
    uni.showToast({
      title: "最多添加 3 个标签",
      icon: "none",
    });
    return;
  }

  selectedTags.value.push(normalizedTag);
  closeTagModal();
};

const removeTag = (index) => {
  selectedTags.value.splice(index, 1);
};

const resetForm = () => {
  questionDesc.value = "";
  reward.value = "";
  selectedTopic.value = "";
  selectedTags.value = [];
  images.value = [];
  closeTagModal();
  closeTopicModal();
};

const handleSubmit = async () => {
  if (!questionDesc.value.trim()) {
    uni.showToast({
      title: "请输入问题描述",
      icon: "none",
    });
    return;
  }

  if (!selectedTopic.value) {
    uni.showToast({
      title: "请选择主题",
      icon: "none",
    });
    return;
  }

  if (!reward.value || reward.value <= 0) {
    uni.showToast({
      title: "请输入正确的赏金金额",
      icon: "none",
    });
    return;
  }

  try {
    uni.showLoading({
      title: "提交中...",
    });

    let uploadedImages = [];
    if (images.value.length > 0) {
      const uploadResult = await commonApi.uploadImage(images.value, "question");
      uploadedImages = Array.isArray(uploadResult.data)
        ? uploadResult.data
        : uploadResult.data
          ? [uploadResult.data]
          : [];
    }

    await questionApi.createQuestion({
      title: questionDesc.value.trim(),
      content: questionDesc.value.trim(),
      topic: selectedTopic.value,
      tags: selectedTags.value,
      reward: Number(reward.value),
      images: uploadedImages,
    });

    uni.hideLoading();
    uni.showToast({
      title: "发布成功",
      icon: "success",
      duration: 2000,
    });
    resetForm();
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || "发布失败",
      icon: "none",
    });
  }
};
</script>

<style lang="scss" scoped>
.ask-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 220rpx;
  background: var(--app-page-bg);
}

.hero-card {
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  box-shadow: var(--app-shadow-soft);
}

.hero-tag {
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
  line-height: 1.4;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.75;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 84%, #ffffff);
  opacity: 1;
}

.panel-card {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.section-note {
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.description-textarea {
  width: 100%;
  min-height: 280rpx;
  padding: 18rpx 8rpx 8rpx;
  font-size: 30rpx;
  line-height: 1.7;
  color: var(--app-ink);
}

.image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 14rpx;
}

.image-item,
.upload-btn {
  width: 200rpx;
  height: 200rpx;
  border-radius: 24rpx;
  position: relative;
  overflow: hidden;
}

.image-item image {
  width: 100%;
  height: 100%;
}

.delete-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(67, 54, 73, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.image-item .delete-icon {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
}

.upload-btn {
  border: 2rpx dashed rgba(255, 145, 168, 0.32);
  background: var(--app-input-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-btn .plus-icon {
  font-size: 46rpx;
  color: var(--app-accent-strong);
}

.upload-text {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--app-ink-soft);
}

.selector-card {
  min-height: 84rpx;
  padding: 0 24rpx;
  border-radius: 22rpx;
  background: var(--app-input-bg);
  color: var(--app-ink-soft);
  display: flex;
  align-items: center;
}

.selector-card.selected {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 127, 150, 0.1);
  color: var(--app-accent-strong);
  font-size: 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.tag-item .delete-icon,
.add-tag {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
}

.tag-item .delete-icon {
  background: rgba(255, 127, 150, 0.18);
  color: var(--app-accent-strong);
}

.add-tag {
  background: var(--app-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-tag .plus-icon {
  font-size: 36rpx;
  color: var(--app-ink-soft);
}

.reward-input {
  display: flex;
  align-items: center;
  padding: 0 22rpx;
  height: 86rpx;
  border-radius: 22rpx;
  background: var(--app-input-bg);
}

.amount-input {
  flex: 1;
  font-size: 30rpx;
  color: var(--app-ink);
}

.unit {
  font-size: 28rpx;
  color: var(--app-ink-soft);
}

.tips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.tip-chip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
  font-size: 22rpx;
}

.bottom-submit {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 152rpx;
  z-index: 80;
}

.submit-button {
  height: 94rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--app-primary-shadow);
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: rgba(67, 54, 73, 0.34);
  backdrop-filter: blur(10rpx);
}

.sheet-card {
  width: 100%;
  max-width: 620rpx;
  padding: 34rpx 30rpx 28rpx;
  border-radius: 34rpx;
  background: var(--app-surface);
  box-shadow: 0 30rpx 70rpx rgba(75, 49, 71, 0.18);
}

.sheet-top {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.sheet-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.sheet-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.sheet-desc {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-soft);
}

.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 26rpx;
}

.topic-chip {
  min-height: 88rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
}

.topic-chip.active {
  background: linear-gradient(135deg, #ff9aab 0%, #ffb98f 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(255, 137, 158, 0.18);
}

.tag-input-wrap {
  margin-top: 26rpx;
  padding: 22rpx 24rpx 18rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
}

.tag-modal-input {
  width: 100%;
  height: 68rpx;
  font-size: 30rpx;
  color: var(--app-ink);
}

.tag-modal-counter {
  display: block;
  margin-top: 12rpx;
  text-align: right;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.sheet-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}

.sheet-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.sheet-btn.light {
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
}

.sheet-btn.primary {
  background: var(--app-primary-gradient);
  color: #fff;
  box-shadow: var(--app-primary-shadow);
}
</style>
