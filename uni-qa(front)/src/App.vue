<template>
  <view :class="['app-root', `theme-${currentTheme}`]">
    <router-view />
    <GlobalNotification v-show="true" />
  </view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { onUnmounted, ref } from "vue";
import GlobalNotification from "@/components/GlobalNotification.vue";
import { applyTheme, getStoredTheme, normalizeTheme, syncThemeUi } from "@/utils/theme";

const ws = ref(null);
const currentTheme = ref(getStoredTheme());
let globalSocketListenerReady = false;
let socketCloseListenerReady = false;
let socketOpenListenerReady = false;
let themeListenerReady = false;

onLaunch(() => {
  setupThemeListener();
  currentTheme.value = applyTheme(currentTheme.value, {
    persist: false,
  });
  initWebSocket();
  setupGlobalSocketListener();
  checkUserRole();
});

onShow(() => {
  uni.$emit("pageShow");
  currentTheme.value = getStoredTheme();
  syncThemeUi(currentTheme.value);
  initWebSocket();
});

onHide(() => {});

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
    url: "ws://192.168.110.173:3000",
    success: () => {},
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
:root {
  --app-ink: #433649;
  --app-ink-soft: #736578;
  --app-ink-muted: #9b8ea0;
  --app-accent: #ff7f96;
  --app-accent-strong: #ff6585;
  --app-accent-soft: #ffe3e8;
  --app-peach: #ffc89d;
  --app-mint: #83d0b8;
  --app-cream: #fffaf8;
  --app-cream-strong: #fffdfb;
  --app-surface: rgba(255, 255, 255, 0.92);
  --app-surface-soft: #fff1ec;
  --app-line: rgba(255, 150, 167, 0.2);
  --app-shadow-soft: 0 18rpx 42rpx rgba(255, 138, 160, 0.14);
  --app-shadow-card: 0 12rpx 28rpx rgba(222, 146, 128, 0.12);
  --app-shadow-strong: 0 20rpx 48rpx rgba(255, 122, 146, 0.2);
  --app-radius-xl: 32rpx;
  --app-radius-lg: 24rpx;
  --app-radius-md: 18rpx;
  --app-radius-sm: 14rpx;
  --app-font-body: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --app-font-display: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --app-page-bg:
    radial-gradient(circle at top left, rgba(255, 198, 156, 0.26), transparent 32%),
    radial-gradient(circle at top right, rgba(255, 133, 163, 0.18), transparent 26%),
    linear-gradient(180deg, #fff9f6 0%, #fff3ef 56%, #fffaf8 100%);
  --app-hero-gradient: linear-gradient(135deg, #ffb990 0%, #ff90a6 100%);
  --app-hero-overlay: radial-gradient(circle at top right, rgba(255, 255, 255, 0.36), transparent 30%);
  --app-card-border: rgba(255, 255, 255, 0.7);
  --app-surface-alt: rgba(255, 255, 255, 0.72);
  --app-input-bg: linear-gradient(180deg, #fff8f5 0%, #fff2ed 100%);
  --app-hero-text: #ffffff;
  --app-primary-gradient: linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%);
  --app-primary-shadow: 0 20rpx 48rpx rgba(255, 122, 146, 0.2);
  --app-accent-badge-bg: rgba(255, 127, 150, 0.12);
  --app-neutral-chip-bg: #fff2ec;
  --app-success-bg: rgba(131, 208, 184, 0.16);
  --app-success-text: #279979;
  --app-warning-bg: rgba(255, 179, 107, 0.18);
  --app-warning-text: #c77e13;
  --app-info-bg: rgba(120, 179, 255, 0.18);
  --app-info-text: #407cd5;
  --app-danger-bg: rgba(242, 106, 122, 0.16);
  --app-danger-text: #d85f6d;
  --app-mask-bg: rgba(67, 54, 73, 0.34);
}

page {
  min-height: 100%;
  color: var(--app-ink);
  font-family: var(--app-font-body);
  background: transparent;
}

html,
body,
#app,
uni-app,
uni-page-body,
uni-page-wrapper {
  background: var(--app-page-bg);
  color: var(--app-ink);
}

.app-root {
  position: relative;
  min-height: 100vh;
  background: var(--app-page-bg);
  overflow-x: hidden;
}

.app-root.theme-light {
  --app-ink: #433649;
  --app-ink-soft: #736578;
  --app-ink-muted: #9b8ea0;
  --app-accent: #ff7f96;
  --app-accent-strong: #ff6585;
  --app-accent-soft: #ffe3e8;
  --app-peach: #ffc89d;
  --app-mint: #83d0b8;
  --app-cream: #fffaf8;
  --app-cream-strong: #fffdfb;
  --app-surface: rgba(255, 255, 255, 0.92);
  --app-surface-soft: #fff1ec;
  --app-line: rgba(255, 150, 167, 0.2);
  --app-shadow-soft: 0 18rpx 42rpx rgba(255, 138, 160, 0.14);
  --app-shadow-card: 0 12rpx 28rpx rgba(222, 146, 128, 0.12);
  --app-shadow-strong: 0 20rpx 48rpx rgba(255, 122, 146, 0.2);
  --app-font-body: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --app-font-display: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --app-page-bg:
    radial-gradient(circle at top left, rgba(255, 198, 156, 0.26), transparent 32%),
    radial-gradient(circle at top right, rgba(255, 133, 163, 0.18), transparent 26%),
    linear-gradient(180deg, #fff9f6 0%, #fff3ef 56%, #fffaf8 100%);
  --app-hero-gradient: linear-gradient(135deg, #ffb990 0%, #ff90a6 100%);
  --app-hero-overlay: radial-gradient(circle at top right, rgba(255, 255, 255, 0.36), transparent 30%);
  --app-card-border: rgba(255, 255, 255, 0.7);
  --app-surface-alt: rgba(255, 255, 255, 0.72);
  --app-input-bg: linear-gradient(180deg, #fff8f5 0%, #fff2ed 100%);
  --app-hero-text: #ffffff;
  --app-primary-gradient: linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%);
  --app-primary-shadow: 0 20rpx 48rpx rgba(255, 122, 146, 0.2);
  --app-accent-badge-bg: rgba(255, 127, 150, 0.12);
  --app-neutral-chip-bg: #fff2ec;
  --app-success-bg: rgba(131, 208, 184, 0.16);
  --app-success-text: #279979;
  --app-warning-bg: rgba(255, 179, 107, 0.18);
  --app-warning-text: #c77e13;
  --app-info-bg: rgba(120, 179, 255, 0.18);
  --app-info-text: #407cd5;
  --app-danger-bg: rgba(242, 106, 122, 0.16);
  --app-danger-text: #d85f6d;
  --app-mask-bg: rgba(67, 54, 73, 0.34);
}

.app-root.theme-dark {
  --app-ink: #f5eef9;
  --app-ink-soft: #cbc1d6;
  --app-ink-muted: #a495b3;
  --app-accent: #ff95ad;
  --app-accent-strong: #ffafc1;
  --app-accent-soft: rgba(255, 149, 173, 0.16);
  --app-peach: #ffb494;
  --app-mint: #7ac7b1;
  --app-cream: #18141f;
  --app-cream-strong: #201927;
  --app-surface: rgba(30, 24, 39, 0.92);
  --app-surface-soft: rgba(46, 36, 57, 0.9);
  --app-line: rgba(255, 182, 198, 0.16);
  --app-shadow-soft: 0 18rpx 44rpx rgba(0, 0, 0, 0.34);
  --app-shadow-card: 0 14rpx 36rpx rgba(3, 4, 10, 0.26);
  --app-shadow-strong: 0 20rpx 52rpx rgba(0, 0, 0, 0.38);
  --app-font-body: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --app-font-display: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --app-page-bg:
    radial-gradient(circle at top left, rgba(255, 132, 169, 0.16), transparent 30%),
    radial-gradient(circle at top right, rgba(122, 199, 177, 0.14), transparent 24%),
    linear-gradient(180deg, #16131d 0%, #1c1624 46%, #241c30 100%);
  --app-hero-gradient: linear-gradient(135deg, #2e2438 0%, #4e2f48 100%);
  --app-hero-overlay: radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 30%);
  --app-card-border: rgba(255, 255, 255, 0.06);
  --app-surface-alt: rgba(255, 255, 255, 0.06);
  --app-input-bg: linear-gradient(180deg, rgba(46, 36, 57, 0.95) 0%, rgba(31, 24, 40, 0.98) 100%);
  --app-hero-text: #ffffff;
  --app-primary-gradient: linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%);
  --app-primary-shadow: 0 20rpx 52rpx rgba(0, 0, 0, 0.38);
  --app-accent-badge-bg: rgba(255, 149, 173, 0.16);
  --app-neutral-chip-bg: rgba(46, 36, 57, 0.92);
  --app-success-bg: rgba(122, 199, 177, 0.16);
  --app-success-text: #8cd8c2;
  --app-warning-bg: rgba(255, 180, 143, 0.18);
  --app-warning-text: #ffc9aa;
  --app-info-bg: rgba(120, 179, 255, 0.18);
  --app-info-text: #9fc7ff;
  --app-danger-bg: rgba(242, 106, 122, 0.18);
  --app-danger-text: #ffadb8;
  --app-mask-bg: rgba(17, 14, 24, 0.48);
}

.app-root.theme-ink {
  --app-ink: #2f3538;
  --app-ink-soft: #59666b;
  --app-ink-muted: #869195;
  --app-accent: #1A96BE;
  --app-accent-strong: #1A96BE;
  --app-accent-soft: rgba(26, 150, 190, 0.1);
  --app-peach: #1A96BE;
  --app-mint: #42A070;
  --app-cream: #f4f7f4;
  --app-cream-strong: #fbfcfb;
  --app-surface: rgba(248, 250, 248, 0.72);
  --app-surface-soft: rgba(232, 239, 235, 0.72);
  --app-line: rgba(134, 145, 149, 0.16);
  --app-shadow-soft: 0 18rpx 40rpx rgba(95, 122, 128, 0.08);
  --app-shadow-card: 0 12rpx 28rpx rgba(86, 110, 115, 0.08);
  --app-shadow-strong: 0 18rpx 40rpx rgba(217, 43, 43, 0.12);
  --app-font-body: "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --app-font-display: "STKaiti", "KaiTi", "Kaiti SC", "FangSong", serif;
  --app-page-bg:
    radial-gradient(circle at 18% 24%, rgba(26, 150, 190, 0.1), transparent 24%),
    radial-gradient(circle at 82% 72%, rgba(66, 160, 112, 0.1), transparent 28%),
    linear-gradient(180deg, #f2f4f2 0%, #ebf2ef 38%, #dceee8 100%);
  --app-hero-gradient: linear-gradient(135deg, rgba(235, 243, 240, 0.97) 0%, rgba(215, 233, 226, 0.95) 56%, rgba(205, 226, 233, 0.96) 100%);
  --app-hero-overlay: radial-gradient(circle at top right, rgba(26, 150, 190, 0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(66, 160, 112, 0.11), transparent 30%);
  --app-card-border: rgba(134, 145, 149, 0.24);
  --app-surface-alt: rgba(247, 250, 248, 0.78);
  --app-input-bg: linear-gradient(180deg, rgba(246, 249, 247, 0.94) 0%, rgba(231, 239, 235, 0.9) 100%);
  --app-hero-text: #2f3538;
  --app-primary-gradient: linear-gradient(135deg, rgba(217, 43, 43, 0.92) 0%, rgba(186, 42, 42, 0.98) 100%);
  --app-primary-shadow: 0 18rpx 36rpx rgba(217, 43, 43, 0.12);
  --app-accent-badge-bg: rgba(26, 150, 190, 0.1);
  --app-neutral-chip-bg: rgba(134, 145, 149, 0.12);
  --app-success-bg: rgba(66, 160, 112, 0.12);
  --app-success-text: #2f7b59;
  --app-warning-bg: rgba(26, 150, 190, 0.12);
  --app-warning-text: #1A96BE;
  --app-info-bg: rgba(26, 150, 190, 0.12);
  --app-info-text: #1A96BE;
  --app-danger-bg: rgba(217, 43, 43, 0.1);
  --app-danger-text: #b43a3a;
  --app-mask-bg: rgba(47, 53, 56, 0.2);
}

.app-root.theme-ink::before,
.app-root.theme-ink::after {
  content: "";
  position: fixed;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 0;
}

.app-root.theme-ink::before {
  top: 0;
  height: 36vh;
  opacity: 0.1;
  background:
    radial-gradient(circle at 12% 28%, rgba(26, 150, 190, 0.22), transparent 24%),
    radial-gradient(circle at 84% 18%, rgba(66, 160, 112, 0.16), transparent 22%),
    repeating-linear-gradient(102deg, rgba(89, 102, 107, 0.1) 0 2px, transparent 2px 42px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent 72%);
  filter: blur(1px);
  animation: ink-parallax-top 18s ease-in-out infinite alternate;
}

.app-root.theme-ink::after {
  bottom: 0;
  height: 40vh;
  opacity: 0.1;
  background:
    radial-gradient(circle at 78% 70%, rgba(66, 160, 112, 0.28), transparent 18%),
    radial-gradient(circle at 32% 82%, rgba(26, 150, 190, 0.2), transparent 16%),
    linear-gradient(180deg, transparent 0%, rgba(26, 150, 190, 0.08) 52%, rgba(66, 160, 112, 0.12) 100%);
  clip-path: polygon(0 100%, 0 64%, 12% 72%, 24% 60%, 38% 74%, 50% 58%, 63% 76%, 74% 62%, 86% 78%, 100% 64%, 100% 100%);
  animation: ink-parallax-bottom 24s ease-in-out infinite alternate;
}

view,
text,
button,
input,
textarea {
  box-sizing: border-box;
  font-family: var(--app-font-body);
}

button::after {
  border: none;
}

image {
  display: block;
}

.content {
  flex: 1;
  padding-bottom: 50px;
}

.app-shell {
  min-height: 100vh;
  padding: 28rpx 28rpx 170rpx;
}

.app-card {
  background: var(--app-surface);
  border: 1rpx solid var(--app-card-border);
  border-radius: var(--app-radius-xl);
  box-shadow: var(--app-shadow-card);
  backdrop-filter: blur(14rpx);
}

.app-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: var(--app-accent-soft);
  color: var(--app-accent-strong);
  font-size: 22rpx;
}

.app-root.theme-ink uni-page-body,
.app-root.theme-ink .theme-settings-page,
.app-root.theme-ink .settings-page,
.app-root.theme-ink .home-page,
.app-root.theme-ink .ask-page,
.app-root.theme-ink .message-page,
.app-root.theme-ink .chat-container,
.app-root.theme-ink .my-questions-page,
.app-root.theme-ink .my-answers-page,
.app-root.theme-ink .profile-page,
.app-root.theme-ink .detail-page,
.app-root.theme-ink .login-page,
.app-root.theme-ink .register-page,
.app-root.theme-ink .rating-page,
.app-root.theme-ink .rating-detail-page,
.app-root.theme-ink .refund-page,
.app-root.theme-ink .refund-detail-page,
.app-root.theme-ink .transaction-detail-page,
.app-root.theme-ink .customer-service-container,
.app-root.theme-ink .vip-container {
  animation: ink-scroll-unfold 0.5s ease both;
}

.app-root.theme-ink .hero-card,
.app-root.theme-ink .panel-card,
.app-root.theme-ink .form-card,
.app-root.theme-ink .vip-benefits,
.app-root.theme-ink .vip-plans,
.app-root.theme-ink .search-card,
.app-root.theme-ink .toolbar,
.app-root.theme-ink .page-header,
.app-root.theme-ink .tab-bar,
.app-root.theme-ink .session-item,
.app-root.theme-ink .request-item,
.app-root.theme-ink .question-item,
.app-root.theme-ink .question-card,
.app-root.theme-ink .answer-card,
.app-root.theme-ink .amount-card,
.app-root.theme-ink .score-card,
.app-root.theme-ink .content-card,
.app-root.theme-ink .refund-card,
.app-root.theme-ink .info-item,
.app-root.theme-ink .state-card,
.app-root.theme-ink .conversation-card,
.app-root.theme-ink .settings-list,
.app-root.theme-ink .theme-option,
.app-root.theme-ink .empty,
.app-root.theme-ink .empty-card {
  position: relative;
  border: 1rpx solid var(--app-card-border);
  backdrop-filter: blur(20rpx);
}

.app-root.theme-ink .hero-card::before,
.app-root.theme-ink .panel-card::before,
.app-root.theme-ink .form-card::before,
.app-root.theme-ink .vip-benefits::before,
.app-root.theme-ink .vip-plans::before,
.app-root.theme-ink .search-card::before,
.app-root.theme-ink .toolbar::before,
.app-root.theme-ink .page-header::before,
.app-root.theme-ink .tab-bar::before,
.app-root.theme-ink .session-item::before,
.app-root.theme-ink .request-item::before,
.app-root.theme-ink .question-item::before,
.app-root.theme-ink .question-card::before,
.app-root.theme-ink .answer-card::before,
.app-root.theme-ink .amount-card::before,
.app-root.theme-ink .score-card::before,
.app-root.theme-ink .content-card::before,
.app-root.theme-ink .refund-card::before,
.app-root.theme-ink .info-item::before,
.app-root.theme-ink .state-card::before,
.app-root.theme-ink .conversation-card::before,
.app-root.theme-ink .settings-list::before,
.app-root.theme-ink .theme-option::before,
.app-root.theme-ink .empty::before,
.app-root.theme-ink .empty-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(circle at 8% 10%, rgba(255, 255, 255, 0.48), transparent 18%),
    radial-gradient(circle at 92% 92%, rgba(66, 160, 112, 0.06), transparent 18%);
  opacity: 0.7;
}

.app-root.theme-ink .hero-card,
.app-root.theme-ink .hero-card text,
.app-root.theme-ink .hero-card .hero-title,
.app-root.theme-ink .hero-card .hero-desc,
.app-root.theme-ink .hero-card .hero-subtitle,
.app-root.theme-ink .hero-card .hero-tag,
.app-root.theme-ink .hero-card .hero-eyebrow,
.app-root.theme-ink .hero-card .eyebrow,
.app-root.theme-ink .hero-card .subtitle,
.app-root.theme-ink .hero-card .card-desc,
.app-root.theme-ink .hero-card .card-title,
.app-root.theme-ink .hero-card .title,
.app-root.theme-ink .hero-card .hero-badge-value,
.app-root.theme-ink .hero-card .hero-badge-label,
.app-root.theme-ink .hero-card .hero-pill,
.app-root.theme-ink .hero-card .hero-stat-value,
.app-root.theme-ink .hero-card .hero-stat-label {
  color: var(--app-hero-text) !important;
}

.app-root.theme-ink .hero-card .hero-desc,
.app-root.theme-ink .hero-card .hero-subtitle,
.app-root.theme-ink .hero-card .subtitle,
.app-root.theme-ink .hero-card .card-desc,
.app-root.theme-ink .hero-card .hero-badge-label,
.app-root.theme-ink .hero-card .hero-stat-label {
  color: color-mix(in srgb, var(--app-hero-text) 82%, #ffffff) !important;
  opacity: 1 !important;
}

.app-root.theme-ink .hero-title,
.app-root.theme-ink .section-title,
.app-root.theme-ink .theme-name,
.app-root.theme-ink .item-title,
.app-root.theme-ink .hero-name,
.app-root.theme-ink .nickname,
.app-root.theme-ink .title {
  font-family: var(--app-font-display);
  letter-spacing: 1rpx;
}

.app-root.theme-ink .hero-tag,
.app-root.theme-ink .hero-eyebrow,
.app-root.theme-ink .hero-pill,
.app-root.theme-ink .hero-badge,
.app-root.theme-ink .hero-stat,
.app-root.theme-ink .reward-pill,
.app-root.theme-ink .topic-chip,
.app-root.theme-ink .topic-tag,
.app-root.theme-ink .transaction-role,
.app-root.theme-ink .transaction-badge,
.app-root.theme-ink .status-tag,
.app-root.theme-ink .sheet-badge {
  background: rgba(248, 250, 248, 0.44) !important;
  border: 1rpx solid var(--app-card-border);
  color: var(--app-accent-strong) !important;
}

.app-root.theme-ink .status-tag,
.app-root.theme-ink .reward-pill,
.app-root.theme-ink .status-pill.accepted,
.app-root.theme-ink .status-pill.rated,
.app-root.theme-ink .status-pill.refunded,
.app-root.theme-ink .btn.success {
  background: var(--app-success-bg) !important;
  color: var(--app-success-text) !important;
}

.app-root.theme-ink .status-pill.pending,
.app-root.theme-ink .status-pill.refunding,
.app-root.theme-ink .btn.warm,
.app-root.theme-ink .transaction-status,
.app-root.theme-ink .apply-message-action {
  background: var(--app-warning-bg) !important;
  color: var(--app-warning-text) !important;
}

.app-root.theme-ink .status-pill.answering {
  background: var(--app-info-bg) !important;
  color: var(--app-info-text) !important;
}

.app-root.theme-ink .status-pill.rejected,
.app-root.theme-ink .status-pill.refused,
.app-root.theme-ink .btn.danger {
  background: var(--app-danger-bg) !important;
  color: var(--app-danger-text) !important;
}

.app-root.theme-ink button,
.app-root.theme-ink .btn,
.app-root.theme-ink .submit-button,
.app-root.theme-ink .login-btn,
.app-root.theme-ink .sheet-btn.primary,
.app-root.theme-ink .send-btn.active,
.app-root.theme-ink .retry-button {
  border-radius: 16rpx !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.app-root.theme-ink .btn.primary,
.app-root.theme-ink .submit-button,
.app-root.theme-ink .login-btn,
.app-root.theme-ink .sheet-btn.primary,
.app-root.theme-ink .send-btn.active,
.app-root.theme-ink .retry-button,
.app-root.theme-ink .confirm-btn {
  background: var(--app-primary-gradient) !important;
  box-shadow: var(--app-primary-shadow) !important;
  color: #fffdf8 !important;
}

.app-root.theme-ink .btn,
.app-root.theme-ink .sheet-btn.light,
.app-root.theme-ink .cancel-btn,
.app-root.theme-ink .tag,
.app-root.theme-ink .tip-chip {
  background: var(--app-neutral-chip-bg) !important;
  color: var(--app-ink-soft) !important;
}

.app-root.theme-ink button:active,
.app-root.theme-ink .btn:active,
.app-root.theme-ink .submit-button:active,
.app-root.theme-ink .settings-item:active,
.app-root.theme-ink .theme-option:active {
  transform: scale(0.985);
  filter: saturate(0.96);
  box-shadow: 0 0 0 14rpx rgba(26, 150, 190, 0.05);
}

@keyframes ink-parallax-top {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, 14rpx, 0);
  }
}

@keyframes ink-parallax-bottom {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, -14rpx, 0);
  }
}

@keyframes ink-scroll-unfold {
  from {
    opacity: 0;
    transform: scaleX(0.985) translateY(10rpx);
    transform-origin: left center;
  }
  to {
    opacity: 1;
    transform: scaleX(1) translateY(0);
    transform-origin: left center;
  }
}
</style>
