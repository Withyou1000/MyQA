<template>
  <view class="notification-container">
    <view
      v-for="(notification, index) in notifications"
      :key="notification.id"
      class="global-notification"
      :style="{
        top: statusBarHeight + 20 + index * 60 + 'px',
      }"
      @tap="handleNotificationClick(notification)"
    >
      <text>{{ notification.text }}</text>
      <text class="close-btn" @tap.stop="removeNotification(notification.id)"
        >×</text
      >
    </view>
  </view>
</template>



<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const showNotification = ref(false);
const notificationText = ref("测试通知：这是一条全局提示消息");
const statusBarHeight = ref(0);
const questionId = ref(null);
const notifications = ref([]);

// 将函数移到setup顶层
const removeNotification = (id) => {
  console.log('移除通知:', id);
  notifications.value = notifications.value.filter((n) => n.id !== id);
};

const handleNotificationClick = (notification) => {
  console.log('通知点击:', notification);
  if (notification.id) {
    uni.navigateTo({
      url: `/pages/chat/index?questionId=${notification.id}`,
    });
    removeNotification(notification.id);
  }
};

onMounted(() => {
  console.log("🔥 GlobalNotification组件已挂载");

  // 获取状态栏高度
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0;
      console.log("📱 状态栏高度:", statusBarHeight.value);
    },
  });

  // 监听全局通知事件
  uni.$on("showGlobalNotification", (data) => {
    notifications.value = [...notifications.value, data];
  });

  uni.$on("clearGlobalNotifications", () => {
    notifications.value = [];
  });
});

onUnmounted(() => {
  uni.$off("showGlobalNotification");
  uni.$off("clearGlobalNotifications");
});
</script>

<style scoped>
.global-notification {
  position: fixed;
  left: 20px;
  right: 20px;
  top: 20px;
  background: rgba(75, 192, 192, 0.6); /* 半透明蓝绿色背景 */
  color: white;
  padding: 12px 20px;
  border-radius: 8px; /* 圆角 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* 柔和阴影 */
  backdrop-filter: blur(5px); /* 毛玻璃效果 */
  transition: all 0.3s ease; /* 平滑动画 */
}

.notification-text {
  font-size: 14px;
  flex: 1;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.notification-close {
  font-size: 20px;
  padding: 0 8px;
  margin-left: 12px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}
</style>