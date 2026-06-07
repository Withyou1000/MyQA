<template>
  <view :class="[`theme-${currentTheme}`]">
    <view class="app-content">
      <router-view />
      <GlobalNotification v-show="true" />
    </view>
  </view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { onUnmounted, ref } from "vue";
import GlobalNotification from "@/components/GlobalNotification.vue";
import { applyTheme, getStoredTheme, normalizeTheme, syncThemeUi } from "@/utils/theme";
import { WS_URL } from "@/api/config";

const ws = ref(null);
const currentTheme = ref(getStoredTheme());
let globalSocketListenerReady = false;
let socketCloseListenerReady = false;
let socketOpenListenerReady = false;
let themeListenerReady = false;

onLaunch(() => {
  //监听主题变化
  setupThemeListener();
  //初始化主题
  currentTheme.value = applyTheme(currentTheme.value, {
    persist: false,
  });
  initWebSocket();
  setupGlobalSocketListener();
  checkUserRole();
});


onHide(() => { });

onUnmounted(() => {
  if (themeListenerReady) {
    uni.$off("themeChange", handleThemeChange);
    themeListenerReady = false;
  }

  uni.closeSocket({
    success: () => {
      ws.value = null;
    },
    fail: (error) => {
      console.error("关闭 WebSocket 失败:", error);
    },
  });
});

async function checkUserRole() {
  const token = uni.getStorageSync("token");
  if (!token) return;

  try {
    const userInfo = uni.getStorageSync("userInfo") || {};
    if (userInfo.role === "customer_service") {
      uni.reLaunch({
        url: "/pages/customer-service/index",
      });
    }
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
}

function handleThemeChange(theme) {
  currentTheme.value = normalizeTheme(theme);
  console.log(currentTheme.value);
}

function setupThemeListener() {
  if (themeListenerReady) return;

  uni.$on("themeChange", handleThemeChange);
  themeListenerReady = true;
}


function initWebSocket() {
  const token = uni.getStorageSync("token");
  if (!token || ws.value) return;

  ws.value = uni.connectSocket({
    url: WS_URL,
    success: () => { },
    fail: (error) => {
      ws.value = null;
      console.error("发起 WebSocket 连接失败:", error);
    },
  });

  if (!socketOpenListenerReady) {
    socketOpenListenerReady = true;
    uni.onSocketOpen(() => {
      const authToken = uni.getStorageSync("token");
      if (!authToken) return;

      uni.sendSocketMessage({
        data: JSON.stringify({
          type: "auth",
          token: authToken,
        }),
      });
    });
  }

  if (!socketCloseListenerReady) {
    socketCloseListenerReady = true;
    uni.onSocketClose(() => {
      ws.value = null;
    });
  }
}

function setupGlobalSocketListener() {
  if (globalSocketListenerReady) return;
  globalSocketListenerReady = true;

  uni.onSocketMessage((res) => {
    try {
      const data = JSON.parse(res.data);
      uni.$emit("socketMessage", data);

      if (data.type === "apply_accept") {
        uni.$emit("showGlobalNotification", {
          id: data.questionId,
          text: `${data.answererName || "回答者"}向你发送了采纳申请，点击查看聊天详情`,
        });
      }
    } catch (error) {
      console.error("解析 WebSocket 消息失败:", error);
    }
  });
}

uni.initWebSocket = initWebSocket;
</script>

<style>
@import "../static/fonts/font.css";


html,
body,
#app,
uni-app,
uni-page-body,
uni-page-wrapper {
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
  color: var(--app-ink);
  font-family: var(--app-font-body);
}

.app-content {
  min-height: 100vh;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}



.theme-ink [class*="hero-title"],
.theme-ink [class*="section-title"],
.theme-ink [class*="sheet-title"],
.theme-ink [class*="state-title"],
.theme-ink [class*="empty-title"],
.theme-ink [class*="question-title"],
.theme-ink [class*="item-title"],
.theme-ink [class*="theme-name"],
.theme-ink [class*="username"],
.theme-ink [class*="title"],
.theme-ink [class*="name"],
.theme-ink [class*="label"],
.theme-ink [class*="badge"],
.theme-ink [class*="tab-text"],
.theme-ink button,
.theme-ink [class*="btn"],
.theme-ink [class*="button"],
.theme-ink [class*="action"] {
font-family: "GracefulFont";
}

</style>
