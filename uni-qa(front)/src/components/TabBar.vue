<template>
  <view class="tab-shell">
    <view class="tab-bar">
      <view
        v-for="(item, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ active: currentPath === item.path }"
        @click="handleTabClick(item.path)"
      >
        <view class="tab-icon">{{ item.icon }}</view>
        <text class="tab-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";

const currentPath = ref("");

const tabs = [
  { text: "问答", path: "/pages/index/index", icon: "问" },
  { text: "提问", path: "/pages/ask/index", icon: "发" },
  { text: "消息", path: "/pages/message/index", icon: "信" },
  { text: "我的", path: "/pages/profile/index", icon: "我" },
];

const handleTabClick = (path) => {
  if (currentPath.value !== path) {
    uni.switchTab({
      url: path,
    });
  }
};

onMounted(() => {
  const pages = getCurrentPages();
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1];
    currentPath.value = `/${currentPage.route}`;
  }
});
</script>

<style lang="scss" scoped>
.tab-shell {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 20rpx;
  z-index: 90;
}

.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 253, 251, 0.94);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: var(--app-shadow-soft);
  backdrop-filter: blur(20rpx);
}

.tab-item {
  flex: 1;
  min-width: 0;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: var(--app-ink-muted);
  transition: all 0.25s ease;
}

.tab-icon {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: rgba(255, 127, 150, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--app-accent-strong);
}

.tab-text {
  font-size: 24rpx;
  font-weight: 500;
}

.tab-item.active {
  background: linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%);
  color: #fff;
  box-shadow: var(--app-shadow-strong);
}

.tab-item.active .tab-icon {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
</style>
