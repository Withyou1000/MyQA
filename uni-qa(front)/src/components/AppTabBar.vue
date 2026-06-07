<template>
  <view class="tab-shell" :style="shellStyle">
    <view class="tab-bar">
      <view
        v-for="item in tabs"
        :key="item.path"
        class="tab-item"
        :class="{ active: currentPath === item.path }"
        @click="handleTabClick(item.path)"
      >
        <image
          class="tab-icon"
          :src="currentPath === item.path ? item.activeIcon : item.icon"
          mode="aspectFit"
        />
        <text class="tab-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

const currentPath = ref("");
const safeAreaBottom = ref(0);

const tabs = [
  {
    text: "问答",
    path: "/pages/index/index",
    icon: "/static/images/tab-question.svg",
    activeIcon: "/static/images/tab-question-active.svg",
  },
  {
    text: "提问",
    path: "/pages/ask/index",
    icon: "/static/images/tab-ask.svg",
    activeIcon: "/static/images/tab-ask-active.svg",
  },
  {
    text: "消息",
    path: "/pages/message/index",
    icon: "/static/images/tab-message.svg",
    activeIcon: "/static/images/tab-message-active.svg",
  },
  {
    text: "我的",
    path: "/pages/profile/index",
    icon: "/static/images/tab-profile.svg",
    activeIcon: "/static/images/tab-profile-active.svg",
  },
];

const shellStyle = computed(() => ({
  paddingBottom: `${safeAreaBottom.value}px`,
}));

const updateCurrentPath = () => {
  const pages = getCurrentPages();
  if (!pages.length) return;
  currentPath.value = `/${pages[pages.length - 1].route}`;
};

const updateSafeArea = () => {
  const systemInfo = uni.getSystemInfoSync?.() || {};
  safeAreaBottom.value = systemInfo.safeAreaInsets?.bottom || 0;
};

const handleTabClick = (path) => {
  if (currentPath.value === path) return;

  uni.reLaunch({
    url: path,
  });
};

onMounted(() => {
  updateCurrentPath();
  updateSafeArea();
});

onShow(() => {
  updateCurrentPath();
  updateSafeArea();
});
</script>

<style lang="scss" scoped>
.tab-shell {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  background: #fff8f5;
  border-top: 1rpx solid rgba(255, 150, 167, 0.18);
  box-shadow: 0 -8rpx 24rpx rgba(222, 146, 128, 0.08);
  pointer-events: auto;
}

.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  min-height: 110rpx;
  padding: 10rpx 0 6rpx;
}

.theme-dark .tab-shell {
  background: #1b1822;
  border-top-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 -8rpx 24rpx rgba(10, 8, 15, 0.18);
}

.theme-ink .tab-shell {
  background: #eef4f1;
  border-top-color: rgba(134, 145, 149, 0.16);
  box-shadow: 0 -8rpx 24rpx rgba(88, 108, 111, 0.08);
}

.tab-item {
  flex: 1;
  min-width: 0;
  height: 92rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: var(--app-ink-muted);
  transition: color 0.2s ease, transform 0.2s ease;
}

.tab-item.active {
  color: var(--app-accent-strong);
}

.tab-icon {
  width: 46rpx;
  height: 46rpx;
}

.tab-text {
  font-size: 20rpx;
  line-height: 1;
  font-weight: 500;
}

.tab-item.active .tab-text {
  font-weight: 600;
}
</style>
