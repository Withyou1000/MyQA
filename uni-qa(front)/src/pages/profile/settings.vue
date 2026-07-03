<template>
  <view :class="['settings-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="设置" tone="yellow" />
    <view class="settings-list">
      <view class="settings-item" @click="goToEditProfile">
        <view class="setting-icon setting-icon-profile">
          <image class="icon-svg" src="/static/images/nav-profile.svg" mode="aspectFit" />
        </view>
        <view class="item-left">
          <text class="item-title">编辑个人主页</text>
          
        </view>
        <text class="item-meta">›</text>
      </view>

      <view class="settings-item" @click="goToThemeSettings">
        <view class="setting-icon setting-icon-theme">
          <image class="icon-svg" src="/static/images/ui-gear.svg" mode="aspectFit" />
        </view>
        <view class="item-left">
          <text class="item-title">主题外观</text>
          <text class="item-pill">{{ currentThemeLabel }}</text>
        </view>
        <text class="item-meta">›</text>
      </view>

      <view class="settings-item logout-item" @click="handleLogout">
        <view class="setting-icon setting-icon-logout">
          <image class="icon-svg" src="/static/images/ui-close.svg" mode="aspectFit" />
        </view>
        <view class="item-left">
          <text class="item-title">退出账号</text>
          
        </view>
        <text class="item-meta">›</text>
      </view>
    </view>  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { authApi } from "@/api/auth";
import { getStoredTheme, themeOptions } from "@/utils/theme";

const currentTheme = ref(getStoredTheme());

const currentThemeLabel = computed(() => {
  const matched = themeOptions.find((item) => item.value === currentTheme.value);
  return matched ? matched.label : "暖杏浅色";
});


const goToEditProfile = () => {
  uni.navigateTo({
    url: "/pages/profile/edit-profile",
  });
};

const goToThemeSettings = () => {
  uni.navigateTo({
    url: "/pages/profile/theme-settings",
  });
};

const handleLogout = () => {
  uni.showModal({
    title: "提示",
    content: "确定要退出当前账号吗？",
    success: async (res) => {
      if (!res.confirm) return;

      try {
        await authApi.logout();
      } catch (error) {
        console.warn("退出登录接口调用失败，继续清理本地状态:", error);
      }

      uni.removeStorageSync("token");
      uni.removeStorageSync("isLoggedIn");
      uni.removeStorageSync("userInfo");
      uni.reLaunch({
        url: "/pages/login/index",
      });
    },
  });
};
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  padding: 24rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 26rpx 24rpx;
  border: 3rpx solid var(--qa-ink, #2b2528);
  border-radius: 28rpx;
  background: rgba(255, 253, 246, 0.94);
  box-shadow: 5rpx 6rpx 0 rgba(43, 37, 40, 0.08);
}

.setting-icon {
  width: 64rpx;
  height: 64rpx;
  border: 2rpx solid var(--qa-ink, #2b2528);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 64rpx;
  box-shadow: 3rpx 4rpx 0 rgba(43, 37, 40, 0.08);
}

.setting-icon .icon-svg {
  width: 36rpx;
  height: 36rpx;
}

.setting-icon-profile {
  background: var(--qa-mint, #a9dcc2);
}

.setting-icon-theme {
  background: var(--qa-yellow, #ffd15d);
}

.setting-icon-logout {
  background: #ffd5cd;
}

.item-left {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: block;
  color: var(--qa-ink, #2b2528);
  font-size: 28rpx;
  font-weight: 900;
}

.item-desc {
  display: block;
  margin-top: 8rpx;
  color: var(--qa-soft-text, #6f686b);
  font-size: 22rpx;
  line-height: 1.45;
}
.item-pill {
  display: inline-flex;
  margin-top: 8rpx;
  padding: 5rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 209, 93, 0.42);
  color: var(--qa-ink, #2b2528);
  font-size: 20rpx;
  font-weight: 900;
}

.item-meta {
  color: var(--qa-ink, #2b2528);
  font-size: 42rpx;
  line-height: 1;
  flex: 0 0 auto;
}

.logout-item .item-title {
  color: var(--qa-danger, #ee7674);
}
</style>
