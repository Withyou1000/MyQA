<template>
  <view :class="['profile-page', themePageClass]">
    <view class="hero-card" @click="goToUserDetail">
      <view class="hero-actions">
        <!-- <view class="hero-pill" @click.stop="goToVip">会员中心</view> -->
        <view class="hero-pill settings-pill" @click.stop="goToSettings">设置</view>
      </view>

      <view class="hero-top">
        <image class="avatar" :src="userInfo.avatar || '/static/default-avatar.webp'" mode="aspectFill" />
        <view class="hero-copy">
          <text class="nickname">{{ displayName }}</text>
          <text class="account">@{{ userInfo.account || "myqa-user" }}</text>
          <text class="intro">把自己的问答节奏、资料和偏好收进一个舒服的小角落里。</text>
        </view>
      </view>

      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ userInfo.reputation || 0 }}</text>
          <text class="stat-label">信誉值</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">Lv.{{ userInfo.level || 0 }}</text>
          <text class="stat-label">等级</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ userInfo.balance || 0 }}元</text>
          <text class="stat-label">余额</text>
        </view>
      </view>
    </view>

    <view class="quick-grid">
      <view class="quick-item" @click="goToMyQuestions">
        <text class="quick-icon">问</text>
        <text class="quick-title">我的提问</text>
      </view>
      <view class="quick-item" @click="goToMyAnswers">
        <text class="quick-icon">答</text>
        <text class="quick-title">我的回答</text>
      </view>
      <view class="quick-item" @click="goToVip">
        <text class="quick-icon">会</text>
        <text class="quick-title">会员中心</text>
      </view>
      <view class="quick-item" @click="contactCustomerService">
        <text class="quick-icon">服</text>
        <text class="quick-title">联系客服</text>
      </view>
    </view>

    <view class="menu-section">
      <view class="section-head">
        <text class="section-title">常用功能</text>
        <text class="section-subtitle">把常去的入口放在一起，查找会更顺手。</text>
      </view>

      <view class="menu-list">
        <view class="menu-item" @click="goToMyQuestions">
          <view class="item-left">
            <view class="icon-box">问</view>
            <text class="text">查看我的提问</text>
          </view>
          <text class="arrow">></text>
        </view>

        <view class="menu-item" @click="goToMyAnswers">
          <view class="item-left">
            <view class="icon-box">答</view>
            <text class="text">查看我的回答</text>
          </view>
          <text class="arrow">></text>
        </view>

        <view class="menu-item" @click="contactCustomerService">
          <view class="item-left">
            <view class="icon-box">服</view>
            <text class="text">联系人工客服</text>
          </view>
          <text class="arrow">></text>
        </view>

        <view class="menu-item" @click="goToSettings">
          <view class="item-left">
            <view class="icon-box settings-box">设</view>
            <text class="text">设置</text>
          </view>
          <text class="menu-meta">{{ themeLabel }}</text>
        </view>
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { onShow } from "@dcloudio/uni-app";
import { computed, onMounted, ref } from "vue";
import { userApi } from "@/api/user";
import { BASE_URL } from "@/api/config";
import { getStoredTheme, syncThemeUi, themeOptions } from "@/utils/theme";
import AppTabBar from "@/components/AppTabBar.vue";

const userInfo = ref({});
const currentTheme = ref(getStoredTheme());

const normalizeAvatarUrl = (avatar) => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  return `${BASE_URL}${avatar}`;
};

const normalizeUserInfo = (data = {}) => ({
  ...data,
  avatar: normalizeAvatarUrl(data.avatar),
});

const displayName = computed(
  () => userInfo.value.name || userInfo.value.account || "可爱提问者"
);

const themeLabel = computed(() => {
  const matched = themeOptions.find((item) => item.value === currentTheme.value);
  return matched ? matched.label : "暖杏浅色";
});

onMounted(() => {
  const storedUserInfo = uni.getStorageSync("userInfo");
  userInfo.value = storedUserInfo ? normalizeUserInfo(storedUserInfo) : {};
});

onShow(() => {
  fetchLatestUserInfo();
});

const fetchLatestUserInfo = async () => {
  try {
    const res = await userApi.getUserInfo();
    userInfo.value = normalizeUserInfo(res.data);
    uni.setStorageSync("userInfo", res.data);
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
};

const goToMyQuestions = () => {
  uni.navigateTo({
    url: "/pages/profile/my-questions",
  });
};

const goToMyAnswers = () => {
  uni.navigateTo({
    url: "/pages/profile/my-answers",
  });
};

const goToVip = () => {
  uni.navigateTo({
    url: "/pages/profile/vip",
  });
};

const goToUserDetail = () => {
  if (!userInfo.value.userId) return;

  uni.navigateTo({
    url: `/pages/profile/user-detail?userId=${userInfo.value.userId}`,
  });
};

const goToSettings = () => {
  uni.navigateTo({
    url: "/pages/profile/settings",
  });
};

const contactCustomerService = () => {
  if (!userInfo.value.userId) return;

  uni.navigateTo({
    url: `/pages/chat/index?type=customer_service&customerId=${userInfo.value.userId}`,
  });
};
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 190rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}

.hero-card {
  position: relative;
  padding: 34rpx 28rpx 30rpx;
  border-radius: 34rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  box-shadow: var(--app-shadow-soft);
}

.hero-actions {
  display: flex;
  justify-content: flex-end;
  gap: 14rpx;
  margin-bottom: 22rpx;
}

.hero-pill {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
  font-size: 22rpx;
  font-weight: 600;
}

.settings-pill {
  background: var(--app-surface-alt);
  background: color-mix(in srgb, var(--app-surface-alt) 92%, #ffffff);
}

.hero-top {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.avatar {
  width: 124rpx;
  height: 124rpx;
  border-radius: 34rpx;
  border: 4rpx solid var(--app-card-border);
}

.hero-copy {
  flex: 1;
}

.nickname {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.account {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
  opacity: 1;
}

.intro {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 84%, #ffffff);
  opacity: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 26rpx;
}

.stat-card {
  padding: 22rpx 18rpx;
  border-radius: 24rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  text-align: center;
  backdrop-filter: blur(12rpx);
}

.stat-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
}

.stat-label {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
  opacity: 1;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 22rpx;
}

.quick-item {
  padding: 24rpx 14rpx;
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.quick-icon,
.icon-box {
  width: 54rpx;
  height: 54rpx;
  border-radius: 18rpx;
  background: var(--app-accent-soft);
  color: var(--app-accent-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.settings-box {
  background: var(--app-success-bg);
  color: var(--app-success-text);
}

.quick-title {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.menu-section {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.section-head {
  margin-bottom: 18rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.section-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--app-line);
}

.menu-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.text {
  font-size: 28rpx;
  color: var(--app-ink);
}

.arrow,
.menu-meta {
  font-size: 24rpx;
  color: var(--app-ink-muted);
}
</style>
