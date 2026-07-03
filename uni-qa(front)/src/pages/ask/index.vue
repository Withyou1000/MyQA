<template>
  <view :class="['ask-page', 'prototype-page', themePageClass]">
    <view class="mock-status">
      <text>9:41</text>
      <view class="status-icons">
        <view class="signal-bars"><text /><text /><text /></view>
        <view class="wifi-dot" />
        <view class="battery" />
      </view>
    </view>

    <view class="prototype-topbar">
      <view class="topbar-spacer" />
      <text class="prototype-title">提问</text>
      <view />
    </view>

    <view class="ask-form prototype-card">
      <view class="prototype-field first">
        <view class="prototype-label-row">
          <text>描述你的问题</text>
        </view>
        <view class="prototype-textarea-shell">
          <textarea
            v-model="questionDesc"
            class="prototype-textarea"
            maxlength="500"
            placeholder="请详细描述你的问题，便于获得更好的解答..."
          />
          <text class="counter">{{ questionDesc.length }}/500</text>
        </view>
      </view>

      <view class="prototype-field">
        <view class="prototype-label-row">
          <text>选择主题</text>
        </view>
        <view class="prototype-select-shell" @click="openTopicModal">
          <image class="small-field-icon" src="/static/images/nav-question.svg" mode="aspectFit" />
          <text class="select-text">{{ selectedTopic || '请选择主题' }}</text>
          <text class="select-arrow">⌄</text>
        </view>
      </view>

      <view class="prototype-field">
        <view class="prototype-label-row">
          <text>添加标签</text>
          <text class="prototype-label-note">最多3个</text>
        </view>
        <view class="inline-tags">
          <view v-for="(tag, index) in selectedTags" :key="`${tag}-${index}`" class="form-tag">
            <text>{{ tag }}</text>
            <text class="tag-close" @click="removeTag(index)">×</text>
          </view>
          <view v-if="selectedTags.length < 3" class="tag-add" @click="openTagModal">+</view>
        </view>
      </view>

      <view class="prototype-field">
        <view class="prototype-label-row">
          <text>上传图片</text>
          <text class="prototype-label-note">最多3张</text>
        </view>
        <view class="upload-grid">
          <view v-for="(image, index) in images" :key="`${image}-${index}`" class="upload-box has-image">
            <image :src="image" class="preview-image" mode="aspectFill" @click="previewImage(index)" />
            <text class="remove-image" @click.stop="deleteImage(index)">×</text>
          </view>
          <view v-for="slot in uploadSlots" :key="slot" class="upload-box" @click="chooseImage">
            <image class="upload-icon" src="/static/images/ui-image.svg" mode="aspectFit" />
            <text class="upload-label">上传</text>
          </view>
        </view>
      </view>

      <view class="prototype-field">
        <view class="prototype-label-row">
          <text>赏金</text>
        </view>
        <view class="prototype-input-shell reward-shell">
          <text class="currency">¥</text>
          <input v-model="reward" type="number" class="prototype-input" placeholder="请输入赏金" />
          <text class="unit">元</text>
        </view>
        <text class="hint">设置合理的赏金，能吸引更多优质回答。</text>
      </view>

      <view class="prototype-action publish-btn" @click="handleSubmit">发布问题</view>
    </view>

    <view v-if="showTopicModal" class="sheet-mask" @click="closeTopicModal">
      <view class="sheet-card prototype-card" @click.stop>
        <text class="sheet-title">选择主题</text>
        <view class="topic-grid">
          <view
            v-for="topic in topics"
            :key="topic"
            class="prototype-chip"
            :class="{ active: selectedTopic === topic }"
            @click="selectTopic(topic)"
          >
            {{ topic }}
          </view>
        </view>
        <view class="prototype-action" @click="closeTopicModal">完成选择</view>
      </view>
    </view>

    <view v-if="showTagModal" class="sheet-mask" @click="closeTagModal">
      <view class="sheet-card prototype-card" @click.stop>
        <text class="sheet-title">添加标签</text>
        <view class="prototype-input-shell tag-input-shell">
          <input
            v-model="tagInputValue"
            type="text"
            maxlength="12"
            class="prototype-input"
            placeholder="例如 Java、开发、多线程"
            :focus="showTagModal"
            @confirm="confirmTagInput"
          />
        </view>
        <view class="prototype-action" @click="confirmTagInput">确认添加</view>
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
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
const uploadSlots = computed(() => (images.value.length < 3 ? [0] : []));

const chooseImage = () => {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => images.value.push(...res.tempFilePaths),
  });
};

const previewImage = (index) => uni.previewImage({ urls: images.value, current: index });
const deleteImage = (index) => images.value.splice(index, 1);
const closeTopicModal = () => { showTopicModal.value = false; };
const openTopicModal = () => { showTopicModal.value = true; };
const selectTopic = (topic) => { selectedTopic.value = topic; };
const closeTagModal = () => { showTagModal.value = false; tagInputValue.value = ""; };

const openTagModal = () => {
  if (!selectedTopic.value) {
    uni.showToast({ title: "请先选择主题", icon: "none" });
    return;
  }
  if (selectedTags.value.length >= 3) {
    uni.showToast({ title: "最多添加 3 个标签", icon: "none" });
    return;
  }
  showTagModal.value = true;
  tagInputValue.value = "";
};

const confirmTagInput = () => {
  const tag = tagInputValue.value.trim();
  if (!tag) {
    uni.showToast({ title: "请输入标签名称", icon: "none" });
    return;
  }
  if (selectedTags.value.includes(tag)) {
    uni.showToast({ title: "这个标签已经添加过了", icon: "none" });
    return;
  }
  if (selectedTags.value.length >= 3) {
    uni.showToast({ title: "最多添加 3 个标签", icon: "none" });
    return;
  }
  selectedTags.value.push(tag);
  closeTagModal();
};

const removeTag = (index) => selectedTags.value.splice(index, 1);

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
    uni.showToast({ title: "请输入问题描述", icon: "none" });
    return;
  }
  if (!selectedTopic.value) {
    uni.showToast({ title: "请选择主题", icon: "none" });
    return;
  }
  if (!reward.value || Number(reward.value) <= 0) {
    uni.showToast({ title: "请输入正确的赏金金额", icon: "none" });
    return;
  }

  try {
    uni.showLoading({ title: "提交中..." });
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
    uni.showToast({ title: "发布成功", icon: "success", duration: 2000 });
    resetForm();
  } catch (error) {
    uni.hideLoading();
    uni.showToast({ title: error.message || "发布失败", icon: "none" });
  }
};


</script>

<style lang="scss" scoped>
.ask-page {
  position: relative;
  overflow-x: hidden;
  background: #fffdf6 !important;
}

.ask-page::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 330rpx;
  background: #ffdcd6;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  z-index: 0;
}

.ask-page > view:not(.tab-shell),
.ask-page > scroll-view {
  position: relative;
  z-index: 1;
}

.ask-form {
  padding: 24rpx 22rpx 26rpx;
}

.first {
  margin-top: 0;
}

.topbar-spacer {
  width: 58rpx;
  height: 58rpx;
}

.counter {
  display: block;
  text-align: right;
  color: var(--qa-muted);
  font-size: 22rpx;
  font-weight: 700;
}

.small-field-icon {
  width: 34rpx;
  height: 34rpx;
}

.select-text {
  flex: 1;
  color: var(--qa-text);
  font-size: 26rpx;
  font-weight: 800;
}

.select-arrow {
  color: var(--qa-ink);
  font-size: 30rpx;
  font-weight: 900;
}

.inline-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14rpx;
}

.form-tag {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  min-height: 58rpx;
  padding: 0 18rpx;
  border: 2rpx solid var(--qa-ink);
  border-radius: 999rpx;
  background: #ffc8bd;
  color: var(--qa-ink);
  font-size: 24rpx;
  font-weight: 800;
}

.tag-close {
  font-size: 30rpx;
  line-height: 1;
}

.tag-add {
  width: 58rpx;
  height: 58rpx;
  border: 2rpx solid var(--qa-ink);
  border-radius: 50%;
  background: var(--qa-paper-solid);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 900;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
}

.upload-box {
  aspect-ratio: 1;
  border: 3rpx solid var(--qa-ink);
  border-radius: 26rpx;
  background: rgba(255, 253, 246, 0.82);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  position: relative;
  overflow-x: hidden;
  box-shadow: 4rpx 5rpx 0 rgba(43, 37, 40, 0.08);
}

.upload-box.has-image {
  background: var(--qa-paper-solid);
}

.preview-image {
  width: 100%;
  height: 100%;
}

.remove-image {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(43, 37, 40, 0.72);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
}

.upload-icon {
  width: 48rpx;
  height: 48rpx;
}

.upload-label {
  color: var(--qa-ink);
  font-size: 22rpx;
  font-weight: 900;
}

.reward-shell {
  height: 76rpx;
}

.currency,
.unit {
  color: var(--qa-ink);
  font-size: 28rpx;
  font-weight: 900;
}

.hint {
  display: block;
  margin-top: 14rpx;
  color: var(--qa-muted);
  font-size: 22rpx;
}

.publish-btn {
  margin-top: 30rpx;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 180;
  padding: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(43, 37, 40, 0.26);
  backdrop-filter: blur(10rpx);
}

.sheet-card {
  width: 100%;
  padding: 32rpx 26rpx 26rpx;
}

.sheet-title {
  display: block;
  color: var(--qa-ink);
  font-size: 34rpx;
  font-weight: 900;
}

.topic-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 26rpx 0;
}

.tag-input-shell {
  margin: 24rpx 0;
}
</style>
