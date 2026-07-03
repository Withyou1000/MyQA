<template>
  <view :class="['tab-shell', themePageClass]" :style="shellStyle">
    <view class="tab-bar">
      <view
        v-for="item in tabs"
        :key="item.path"
        class="tab-item"
        :class="{ active: currentPath === item.path, agent: item.agent }"
        @click="handleTabClick(item.path)"
      >
        <view class="tab-icon-wrap">
          <image class="tab-icon" :src="item.icon" mode="aspectFit" />
        </view>
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
    icon: "/static/images/nav-question.svg",
  },
  {
    text: "提问",
    path: "/pages/ask/index",
    icon: "/static/images/nav-ask.svg",
  },
  {
    text: "Agent",
    path: "/pages/agent/index",
    icon: "/static/images/nav-agent.svg",
    agent: true,
  },
  {
    text: "消息",
    path: "/pages/message/index",
    icon: "/static/images/nav-message.svg",
  },
  {
    text: "我的",
    path: "/pages/profile/index",
    icon: "/static/images/nav-profile.svg",
  },
];

const shellStyle = computed(() => ({
  paddingBottom: `${safeAreaBottom.value}px`,
}));

const normalizePath = (path = "") => `/${path}`.replace(/\/+$/, "");

const updateCurrentPath = () => {
  const pages = getCurrentPages();
  if (!pages.length) return;
  currentPath.value = normalizePath(pages[pages.length - 1].route);
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
  left: 20rpx;
  right: 20rpx;
  bottom: 18rpx;
  z-index: 120;
  pointer-events: auto;
}

.tab-bar {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  min-height: 124rpx;
  padding: 16rpx 10rpx 10rpx;
  border: 3rpx solid var(--qa-ink, #2b2528);
  border-radius: 38rpx;
  background: rgba(255, 253, 246, 0.94);
  box-shadow: 8rpx 9rpx 0 rgba(43, 37, 40, 0.1);
  backdrop-filter: blur(16rpx);
}

.tab-item {
  min-width: 0;
  height: 92rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: var(--qa-muted, #80757a);
  transition: transform 0.18s ease, color 0.18s ease;
}

.tab-icon-wrap {
  width: 50rpx;
  height: 50rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
}

.tab-icon {
  width: 34rpx;
  height: 34rpx;
  transition: transform 0.22s ease;
}

.tab-text {
  max-width: 100%;
  font-size: 20rpx;
  line-height: 1;
  font-weight: 800;
  color: inherit;
}

.tab-item.active {
  color: var(--qa-ink, #2b2528);
}

.tab-item.active .tab-icon-wrap {
  background: var(--qa-mint, #a9dcc2);
  box-shadow: inset 0 0 0 2rpx rgba(43, 37, 40, 0.08);
}


.tab-item.agent .tab-icon-wrap {
  width: 62rpx;
  height: 62rpx;
  border: 3rpx solid var(--qa-ink, #2b2528);
  border-radius: 22rpx;
  background: var(--qa-yellow, #ffd15d);
  box-shadow: 4rpx 5rpx 0 rgba(43, 37, 40, 0.12);
}

.tab-item.agent .tab-icon {
  width: 40rpx;
  height: 40rpx;
}

.tab-item.agent.active .tab-icon-wrap {
  background: var(--qa-coral, #f49a91);
  transform: translateY(-2rpx);
}
.tab-item:active {
  transform: translateY(2rpx) scale(0.98);
}


.tab-item:active .tab-icon {
  transform: rotate(-8deg) scale(1.08);
}

.theme-dark .tab-bar {
  background: rgba(34, 29, 40, 0.94);
  border-color: rgba(255, 241, 219, 0.78);
  box-shadow: 8rpx 9rpx 0 rgba(0, 0, 0, 0.22);
}

.theme-dark .tab-item {
  color: #cfc5d2;
}

.theme-ink .tab-bar {
  background: rgba(247, 250, 247, 0.94);
}

</style>
