<template>
  <view :class="['profile-page', 'prototype-page', themePageClass]">
    <view class="mock-status">
      <text>9:41</text>
      <view class="status-icons">
        <view class="signal-bars"><text></text><text></text><text></text></view>
        <view class="wifi-dot"></view>
        <view class="battery"></view>
      </view>
    </view>

    <view class="prototype-topbar">
      <view class="topbar-spacer"></view>
      <text class="prototype-title">我的</text>
      <view class="round-icon-button" @click="goToMessage">
        <image class="icon-svg" src="/static/images/ui-bell.svg" mode="aspectFit" />
      </view>
    </view>

    <view class="profile-card prototype-card" @click="goToUserDetail">
      <image class="profile-avatar" :src="avatarSrc" mode="aspectFill" />
      <view class="profile-main">
        <view class="profile-name-row">
          <text class="profile-name">{{ displayName }}</text>
          <text class="level-pill">Lv.{{ displayLevel }}</text>
        </view>
        <text class="profile-id">ID: {{ displayUserId }}</text>
        <text class="profile-desc">保持好奇，慢慢变强</text>
      </view>
      <text class="card-arrow">›</text>
    </view>

    <view class="stats-card prototype-card">
      <view class="stat-cell" @click="goToMyQuestions">
        <text class="stat-label">我的提问</text>
        <text class="stat-value">{{ questionCount }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-cell" @click="goToMyAnswers">
        <text class="stat-label">我的回答</text>
        <text class="stat-value">{{ answerCount }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-cell" @click="goToVip">
        <text class="stat-label">会员</text>
        <text class="vip-value">VIP</text>
      </view>
    </view>

    <view class="service-card prototype-card">
      <text class="prototype-section-title">快捷服务</text>
      <view class="service-grid">
        <view class="service-item service-mint" @click="contactCustomerService">
          <view class="service-icon">
            <image class="icon-svg" src="/static/images/ui-headset.svg" mode="aspectFit" />
          </view>
          <text>AI 客服</text>
        </view>
        <view class="service-item service-coral" @click="goToThemeSettings">
          <view class="service-icon">
            <image class="icon-svg" src="/static/images/ui-gear.svg" mode="aspectFit" />
          </view>
          <text>主题外观</text>
        </view>
        <view class="service-item service-lavender" @click="goToSettings">
          <view class="service-icon">
            <image class="icon-svg" src="/static/images/nav-profile.svg" mode="aspectFit" />
          </view>
          <text>账号设置</text>
        </view>
      </view>
    </view>

    <view class="encourage-card prototype-card">
      <view class="encourage-head">
        <text class="prototype-section-title">今日能量</text>
        <text class="encourage-tag">轻一点</text>
      </view>
      <view class="energy-grid">
        <view v-for="item in encouragementItems" :key="item.title" class="energy-chip" :class="item.tone">
          <text>{{ item.title }}</text>
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
import AppTabBar from "@/components/AppTabBar.vue";

const userInfo = ref({});
const questionCount = ref(12);
const answerCount = ref(28);

const encouragementItems = [
  { title: "慢慢来", tone: "mint" },
  { title: "先完成一点", tone: "coral" },
  { title: "今天也不错", tone: "lavender" },
];const normalizeAvatarUrl = (avatar) => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  return avatar.startsWith("/") ? `${BASE_URL}${avatar}` : `${BASE_URL}/${avatar}`;
};

const normalizeUserInfo = (data = {}) => ({
  ...data,
  avatar: normalizeAvatarUrl(data.avatar),
});

const avatarSrc = computed(() => userInfo.value.avatar || "/static/default-avatar.webp");
const displayName = computed(() => userInfo.value.name || userInfo.value.nickname || userInfo.value.account || "MyQA 用户");
const displayUserId = computed(() => userInfo.value.userId || "123456");
const displayLevel = computed(() => userInfo.value.level || 4);

const loadStoredUserInfo = () => {
  const stored = uni.getStorageSync("userInfo");
  if (!stored) {
    userInfo.value = {};
    return;
  }

  try {
    userInfo.value = normalizeUserInfo(typeof stored === "string" ? JSON.parse(stored) : stored);
  } catch (error) {
    userInfo.value = {};
  }
};

const extractTotal = (payload) => {
  const data = payload?.data || payload || {};
  if (typeof data.total === "number") return data.total;
  if (Array.isArray(data.list)) return data.list.length;
  return 0;
};

const fetchLatestUserInfo = async () => {
  try {
    const res = await userApi.getUserInfo();
    userInfo.value = normalizeUserInfo(res.data || {});
    uni.setStorageSync("userInfo", res.data || {});
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
};

const fetchProfileStats = async () => {
  try {
    const [questions, answers] = await Promise.all([userApi.getMyQuestions(), userApi.getMyAnswers()]);
    questionCount.value = extractTotal(questions) || questionCount.value;
    answerCount.value = extractTotal(answers) || answerCount.value;
  } catch (error) {
    console.error("获取个人统计失败:", error);
  }
};

const goToMyQuestions = () => {
  uni.navigateTo({ url: "/pages/profile/my-questions" });
};

const goToMyAnswers = () => {
  uni.navigateTo({ url: "/pages/profile/my-answers" });
};

const goToVip = () => {
  uni.navigateTo({ url: "/pages/profile/vip" });
};

const goToUserDetail = () => {
  if (!userInfo.value.userId) return;
  uni.navigateTo({ url: `/pages/profile/user-detail?userId=${userInfo.value.userId}` });
};

const goToSettings = () => {
  uni.navigateTo({ url: "/pages/profile/settings" });
};
const goToThemeSettings = () => {
  uni.navigateTo({ url: "/pages/profile/theme-settings" });
};

const goToMessage = () => {
  uni.reLaunch({ url: "/pages/message/index" });
};

const contactCustomerService = () => {
  if (!userInfo.value.userId) {
    uni.navigateTo({ url: "/pages/customer-service/index" });
    return;
  }

  uni.navigateTo({ url: `/pages/customer-service/chat?customerId=${userInfo.value.userId}` });
};

onMounted(() => {
  loadStoredUserInfo();
});

onShow(() => {
  fetchLatestUserInfo();
  fetchProfileStats();
});
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  padding: 22rpx 24rpx 190rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(255, 198, 156, 0.26), transparent 32%),
    radial-gradient(circle at top right, rgba(255, 133, 163, 0.18), transparent 26%),
    linear-gradient(180deg, #fff9f6 0%, #fff3ef 56%, #fffaf8 100%) !important;
  background-color: #fff9f6 !important;
  color: var(--qa-ink, #2b2528);
}

.topbar-spacer {
  width: 76rpx;
  height: 76rpx;
}

.profile-card {
  margin-top: 26rpx;
  padding: 34rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.profile-avatar {
  width: 118rpx;
  height: 118rpx;
  flex: 0 0 118rpx;
  border: 3rpx solid var(--qa-ink, #2b2528);
  border-radius: 50%;
  background: #d9caff;
}

.profile-main {
  min-width: 0;
  flex: 1;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.profile-name,
.profile-id,
.profile-desc,
.level-pill,
.card-arrow {
  display: block;
}

.profile-name {
  max-width: 260rpx;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 31rpx;
  font-weight: 900;
}

.level-pill {
  padding: 5rpx 12rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.2);
  border-radius: 999rpx;
  background: #ffe9a8;
  font-size: 19rpx;
  font-weight: 900;
}

.profile-id {
  margin-top: 10rpx;
  color: var(--qa-muted, #7e7578);
  font-size: 22rpx;
  font-weight: 700;
}

.profile-desc {
  margin-top: 8rpx;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--qa-soft-text, #6f686b);
  font-size: 22rpx;
  font-weight: 700;
}

.card-arrow {
  color: var(--qa-ink, #2b2528);
  font-size: 52rpx;
  line-height: 1;
}

.stats-card {
  margin-top: 24rpx;
  padding: 30rpx 16rpx;
  display: grid;
  grid-template-columns: 1fr 2rpx 1fr 2rpx 1fr;
  align-items: center;
}

.stat-cell {
  min-width: 0;
  text-align: center;
}

.stat-label,
.stat-value,
.vip-value {
  display: block;
}

.stat-label {
  color: var(--qa-soft-text, #6f686b);
  font-size: 23rpx;
  font-weight: 800;
}

.stat-value,
.vip-value {
  margin-top: 10rpx;
  font-size: 36rpx;
  font-weight: 950;
}

.vip-value {
  color: #ff655a;
  font-size: 33rpx;
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: rgba(43, 37, 40, 0.18);
}

.service-card {
  margin-top: 24rpx;
  padding: 30rpx 26rpx;
}

.service-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.service-item {
  min-height: 144rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  font-size: 24rpx;
  font-weight: 900;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.service-item:active,
.order-item:active,
.profile-card:active,
.stat-cell:active {
  transform: scale(0.97);
}

.service-mint {
  background: #c8efd8;
}

.service-coral {
  background: #ffd5cd;
}

.service-lavender {
  background: #e6daf5;
}

.service-icon,
.order-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-icon {
  width: 58rpx;
  height: 58rpx;
  animation: prototypeIconFloat 3s ease-in-out infinite;
}

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-all {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: var(--qa-soft-text, #6f686b);
  font-size: 23rpx;
  font-weight: 800;
}

.tiny-arrow {
  font-size: 34rpx;
  line-height: 1;
}

.order-grid {
  margin-top: 26rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.order-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  color: var(--qa-ink, #2b2528);
  font-size: 22rpx;
  font-weight: 800;
  transition: transform 0.18s ease;
}

.order-icon {
  width: 60rpx;
  height: 60rpx;
  border: 3rpx solid var(--qa-ink, #2b2528);
  border-radius: 50%;
  background: rgba(255, 253, 246, 0.7);
}

.order-icon .icon-svg {
  width: 33rpx;
  height: 33rpx;
}


.encourage-card {
  margin-top: 24rpx;
  padding: 30rpx 26rpx;
}

.encourage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.encourage-tag {
  flex: 0 0 auto;
  padding: 8rpx 16rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.18);
  border-radius: 999rpx;
  background: #ffe9a8;
  color: var(--qa-ink, #2b2528);
  font-size: 21rpx;
  font-weight: 900;
}

.energy-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.energy-chip {
  min-height: 74rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.18);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
  color: var(--qa-ink, #2b2528);
  font-size: 22rpx;
  font-weight: 900;
  text-align: center;
}

.energy-chip.mint {
  background: rgba(169, 220, 194, 0.64);
}

.energy-chip.coral {
  background: rgba(244, 154, 145, 0.42);
}

.energy-chip.lavender {
  background: rgba(205, 180, 219, 0.52);
}

.theme-dark.profile-page {
  min-height: 100vh;
  padding: 22rpx 24rpx 190rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(255, 198, 156, 0.26), transparent 32%),
    radial-gradient(circle at top right, rgba(255, 133, 163, 0.18), transparent 26%),
    linear-gradient(180deg, #fff9f6 0%, #fff3ef 56%, #fffaf8 100%) !important;
  background-color: #fff9f6 !important;
  color: var(--qa-ink, #2b2528);
}

.theme-dark .profile-card,
.theme-dark .stats-card,
.theme-dark .service-card,
.theme-dark .encourage-card {
  background: rgba(41, 35, 47, 0.92);
}
</style>
