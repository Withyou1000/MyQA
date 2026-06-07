<template>
  <view :class="['settings-page', themePageClass]">
    <view class="settings-list">
      <view class="settings-item" @click="goToEditProfile">
        <view class="item-left">
          <text class="item-title">编辑个人主页</text>
          <text class="item-desc">修改昵称、头像和个人资料</text>
        </view>
        <text class="item-meta">></text>
      </view>

      <view class="settings-item" @click="goToThemeSettings">
        <view class="item-left">
          <text class="item-title">主题外观</text>
          <text class="item-desc">当前：{{ currentThemeLabel }}</text>
        </view>
        <text class="item-meta">></text>
      </view>

      <view class="settings-item logout-item" @click="handleLogout">
        <view class="item-left">
          <text class="item-title">退出账号</text>
          <text class="item-desc">退出当前登录，并回到登录页</text>
        </view>
        <text class="item-meta">></text>
      </view>
    </view>
  </view>
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
  background: var(--app-surface);
  border-radius: 28rpx;
  box-shadow: var(--app-shadow-card);
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid var(--app-line);
}

.settings-item:last-child {
  border-bottom: 0;
}

.item-left {
  flex: 1;
}

.item-title {
  display: block;
  font-size: 30rpx;
  color: var(--app-ink);
}

.item-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.item-meta {
  font-size: 24rpx;
  color: var(--app-ink-muted);
}

.logout-item .item-title {
  color: var(--app-danger-text);
}
</style>
