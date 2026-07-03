<template>
  <view :class="['theme-settings-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="主题设置" tone="lavender" />
    <view class="theme-grid">
      <view
        v-for="item in themeOptions"
        :key="item.value"
        :class="['theme-option', `theme-option-${item.value}`, { active: selectedTheme === item.value }]"
        @click="selectTheme(item.value)"
      >
        <view class="theme-preview">
          <view class="preview-block preview-main" />
          <view class="preview-row">
            <view class="preview-block preview-side" />
            <view class="preview-block preview-side small" />
          </view>
        </view>
        <view class="theme-copy">
          <text class="theme-name">{{ item.label }}</text>
          <text class="theme-desc">{{ item.description }}</text>
        </view>
        <view class="theme-check">{{ selectedTheme === item.value ? "当前使用" : "点击切换" }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { ref } from "vue";
import { applyTheme, getStoredTheme, syncThemeUi, themeOptions } from "@/utils/theme";

const selectedTheme = ref(getStoredTheme());

onShow(() => {
  selectedTheme.value = getStoredTheme();
  syncThemeUi(selectedTheme.value);
});

const selectTheme = (theme) => {
  selectedTheme.value = applyTheme(theme);
};
</script>

<style lang="scss" scoped>
.theme-settings-page {
  min-height: 100vh;
  padding: 24rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}

.theme-grid {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.theme-option {
  padding: 24rpx;
  border-radius: 28rpx;
  border: 2rpx solid transparent;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.theme-option-light {
  background: linear-gradient(135deg, rgba(255, 240, 233, 0.95), rgba(255, 252, 248, 0.95));
}

.theme-option-dark {
  background: linear-gradient(135deg, rgba(29, 23, 37, 0.98), rgba(42, 33, 54, 0.98));
}

.theme-option-ink {
  background: linear-gradient(
    135deg,
    rgba(244, 247, 245, 0.96),
    rgba(221, 239, 232, 0.92) 58%,
    rgba(215, 234, 240, 0.92) 100%
  );
}

.theme-option.active {
  border-color: var(--app-accent-strong);
  box-shadow: var(--app-shadow-soft);
}

.theme-preview {
  padding: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.16);
}

.preview-block {
  border-radius: 16rpx;
}

.preview-main {
  height: 76rpx;
  background: rgba(255, 255, 255, 0.72);
}

.preview-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 12rpx;
}

.preview-side {
  height: 44rpx;
  background: rgba(255, 255, 255, 0.48);
}

.preview-side.small {
  background: rgba(255, 255, 255, 0.34);
}

.theme-option-dark .preview-main {
  background: rgba(255, 255, 255, 0.18);
}

.theme-option-dark .preview-side {
  background: rgba(255, 255, 255, 0.12);
}

.theme-option-ink .theme-preview {
  background:
    radial-gradient(circle at 18% 24%, rgba(26, 150, 190, 0.12), transparent 28%),
    radial-gradient(circle at 86% 80%, rgba(66, 160, 112, 0.12), transparent 22%),
    rgba(255, 255, 255, 0.28);
}

.theme-option-ink .preview-main {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(223, 239, 232, 0.82));
}

.theme-option-ink .preview-side {
  background: rgba(26, 150, 190, 0.14);
}

.theme-option-ink .preview-side.small {
  background: rgba(66, 160, 112, 0.16);
}

.theme-copy {
  margin-top: 18rpx;
}

.theme-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.theme-option-light .theme-name,
.theme-option-light .theme-desc,
.theme-option-light .theme-check,
.theme-option-ink .theme-name,
.theme-option-ink .theme-desc,
.theme-option-ink .theme-check {
  color: #5b4253;
}

.theme-option-ink .theme-name {
  font-family: "GracefulFont", "STKaiti", "KaiTi", "Kaiti SC", serif;
  color: #2f3538;
}

.theme-option-ink .theme-desc {
  color: #59666b;
}

.theme-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

.theme-check {
  display: inline-flex;
  margin-top: 16rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.82);
}

.theme-option-ink .theme-check {
  background: rgba(217, 43, 43, 0.08);
  color: #b43a3a;
}

/* neon comic theme option preview */
.theme-option-ink {
  border: 3rpx solid #111111 !important;
  background: #dfff13 !important;
  box-shadow: 8rpx 9rpx 0 rgba(17, 17, 17, 0.14) !important;
  overflow: hidden;
}

.theme-option-ink .theme-preview {
  border: 3rpx solid #111111;
  background:
    radial-gradient(circle, rgba(17, 17, 17, 0.08) 1rpx, transparent 1.6rpx) 0 0 / 18rpx 18rpx,
    #fffdf6 !important;
}

.theme-option-ink .preview-main {
  border: 3rpx solid #111111;
  background: #8be8ff !important;
}

.theme-option-ink .preview-side {
  border: 3rpx solid #111111;
  background: #ff9f7a !important;
}

.theme-option-ink .preview-side.small {
  background: #f6ffd7 !important;
}

.theme-option-ink .theme-name,
.theme-option-ink .theme-desc,
.theme-option-ink .theme-check {
  font-family: inherit !important;
  color: #111111 !important;
}

.theme-option-ink .theme-check {
  border: 2rpx solid #111111;
  background: #fffdf6 !important;
}

/* readable inactive theme options */
.theme-option-light {
  border: 3rpx solid #111111 !important;
  background: #fffdf6 !important;
  box-shadow: 7rpx 8rpx 0 rgba(17, 17, 17, 0.12) !important;
}

.theme-option-light .theme-preview {
  border: 2rpx solid rgba(17, 17, 17, 0.28);
  background: #fff4e8 !important;
}

.theme-option-light .preview-main {
  background: #ffd9ca !important;
}

.theme-option-light .preview-side {
  background: #ff9f7a !important;
}

.theme-option-light .preview-side.small {
  background: #d9f2e2 !important;
}

.theme-option-light .theme-name,
.theme-option-light .theme-desc,
.theme-option-light .theme-check {
  color: #111111 !important;
}

.theme-option-light .theme-check {
  border: 2rpx solid #111111;
  background: #ffffff !important;
}

.theme-option-dark {
  border: 3rpx solid #111111 !important;
  background: #211a28 !important;
  box-shadow: 7rpx 8rpx 0 rgba(17, 17, 17, 0.18) !important;
}

.theme-option-dark .theme-preview {
  border: 2rpx solid rgba(255, 244, 222, 0.62);
  background: #2d2433 !important;
}

.theme-option-dark .preview-main {
  background: #6c4863 !important;
}

.theme-option-dark .preview-side {
  background: #c8879e !important;
}

.theme-option-dark .preview-side.small {
  background: #4a3249 !important;
}

.theme-option-dark .theme-name,
.theme-option-dark .theme-desc,
.theme-option-dark .theme-check {
  color: #fff4de !important;
}

.theme-option-dark .theme-check {
  border: 2rpx solid rgba(255, 244, 222, 0.72);
  background: rgba(255, 244, 222, 0.12) !important;
}
</style>
