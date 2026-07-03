<template>
  <view :class="['message-page', 'prototype-page', themePageClass]">
    <view class="mock-status">
      <text>9:41</text>
      <view class="status-icons">
        <view class="signal-bars"><text /><text /><text /></view>
        <view class="wifi-dot" />
        <view class="battery" />
      </view>
    </view>

    <view class="prototype-topbar">
      <view />
      <text class="prototype-title">消息</text>
      <view class="round-icon-button">
        <image class="icon-svg" src="/static/images/ui-bell.svg" mode="aspectFit" />
      </view>
    </view>

    <view class="notice-card prototype-card" @click="activeFilter = 'unread'">
      <view class="notice-icon-wrap float-icon">
        <image class="notice-icon" src="/static/images/ui-bell.svg" mode="aspectFit" />
      </view>
      <view class="notice-main">
        <view class="notice-head">
          <text class="notice-title">待处理通知</text>
          <text v-if="summary.unreadCount" class="notice-count">{{ summary.unreadCount }}</text>
        </view>
        <text class="notice-desc">有人申请回答你的问题，去看看吧</text>
      </view>
      <text class="notice-arrow">›</text>
    </view>

    <view class="message-list">
      <view v-if="loading && !conversations.length" class="empty-message prototype-card">正在加载消息...</view>

      <view
        v-else-if="conversations.length"
        v-for="conversation in conversations"
        :key="conversation.id"
        class="message-card prototype-card"
        @click="handleConversationClick(conversation)"
      >
        <view class="message-avatar-wrap" :style="{ background: conversation.avatarColor }">
          <image v-if="conversation.avatar" :src="conversation.avatar" class="message-avatar" mode="aspectFill" />
          <text v-else class="avatar-initial">{{ conversation.initial }}</text>
          <view v-if="conversation.unreadCount" class="small-red-dot" />
        </view>
        <view class="message-main">
          <view class="message-head">
            <text class="message-name">{{ conversation.name }}</text>
            <text class="message-time">{{ conversation.time }}</text>
          </view>
          <text class="message-preview">{{ conversation.lastMessage }}</text>
          <text class="message-note">{{ conversation.note || conversation.topic }}</text>
        </view>
        <text v-if="conversation.unreadCount" class="message-unread">{{ conversation.unreadCount }}</text>
      </view>

      <view v-else class="empty-message prototype-card">
        <text class="empty-title">{{ errorText ? '消息加载失败' : '暂无消息' }}</text>
        <text class="empty-desc">{{ errorText || '新的申请、客服和交易提醒会出现在这里。' }}</text>
        <view class="prototype-action reload-action" @click="fetchConversations({ showLoading: true })">刷新列表</view>
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { ref, watch } from "vue";
import { onPullDownRefresh, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { chatApi } from "@/api/chat";
import { BASE_URL } from "@/api/config";
import AppTabBar from "@/components/AppTabBar.vue";

const keyword = ref("");
const activeFilter = ref("all");
const loading = ref(false);
const conversations = ref([]);
const errorText = ref("");
const isPageVisible = ref(false);
const summary = ref({ totalCount: 0, unreadCount: 0, unreadSessionCount: 0, onlineCount: 0, filteredCount: 0 });

const avatarGradients = [
  "linear-gradient(135deg, #b7e2c8 0%, #78c6a3 100%)",
  "linear-gradient(135deg, #ffd15d 0%, #f4a29a 100%)",
  "linear-gradient(135deg, #cdb4db 0%, #a9d7e9 100%)",
  "linear-gradient(135deg, #f4a29a 0%, #ffd15d 100%)",
];
const refreshableSocketTypes = new Set(["message_received", "notify", "apply_accept"]);
let fetchToken = 0;
let keywordTimer = null;
let socketRefreshTimer = null;
let socketMessageHandler = null;

const normalizeAvatar = (avatar) => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  return `${BASE_URL}${avatar}`;
};

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDate = now.toDateString() === date.toDateString();
  if (sameDate) return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) return "昨天";
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const getAvatarGradient = (seed) => {
  const text = String(seed || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % avatarGradients.length;
  return avatarGradients[hash];
};

const getInitial = (name) => (name || "?").trim().charAt(0).toUpperCase();

const buildStatusLabel = (item) => {
  if (item.unreadCount > 0) return "新消息";
  if (item.otherUser?.online) return "在线";
  return item.isAsker ? "我的提问" : "我的回答";
};

const buildNote = (item) => {
  if (item.title) return `关于：${item.title}`;
  if (item.reward) return `赏金 ${item.reward}`;
  return buildStatusLabel(item);
};

const normalizeConversation = (item) => {
  const otherUser = item.otherUser || {};
  const displayName = otherUser.name || otherUser.account || "匿名用户";
  return {
    id: item.questionId,
    questionId: item.questionId,
    name: displayName,
    initial: getInitial(displayName),
    avatar: normalizeAvatar(otherUser.avatar),
    avatarColor: getAvatarGradient(item.questionId || otherUser.userId || displayName),
    time: formatRelativeTime(item.lastMessageTime),
    topic: item.topic || "未分类",
    lastMessage: item.lastMessage || "暂无消息",
    note: buildNote(item),
    unreadCount: item.unreadCount || 0,
  };
};

const fetchConversations = async ({ showLoading = false } = {}) => {
  const currentToken = ++fetchToken;
  errorText.value = "";
  if (showLoading) loading.value = true;

  try {
    const res = await chatApi.getChatList({ keyword: keyword.value.trim(), filter: activeFilter.value });
    if (currentToken !== fetchToken) return;
    const data = res.data || {};
    const nextSummary = data.summary || {};
    summary.value = {
      totalCount: nextSummary.totalCount || 0,
      unreadCount: nextSummary.unreadCount || 0,
      unreadSessionCount: nextSummary.unreadSessionCount || 0,
      onlineCount: nextSummary.onlineCount || 0,
      filteredCount: nextSummary.filteredCount || 0,
    };
    conversations.value = (data.chatList || []).map(normalizeConversation);
  } catch (error) {
    if (currentToken !== fetchToken) return;
    conversations.value = [];
    errorText.value = error.message || "加载消息失败";
  } finally {
    if (currentToken === fetchToken) {
      loading.value = false;
      uni.stopPullDownRefresh();
    }
  }
};

const scheduleKeywordSearch = () => {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = setTimeout(() => fetchConversations({ showLoading: true }), 220);
};

const scheduleSocketRefresh = () => {
  if (!isPageVisible.value) return;
  if (socketRefreshTimer) clearTimeout(socketRefreshTimer);
  socketRefreshTimer = setTimeout(() => fetchConversations(), 120);
};

const registerSocketListener = () => {
  if (socketMessageHandler) return;
  socketMessageHandler = (data) => {
    if (!isPageVisible.value || !refreshableSocketTypes.has(data.type)) return;
    scheduleSocketRefresh();
  };
  uni.$on("socketMessage", socketMessageHandler);
};

const unregisterSocketListener = () => {
  if (!socketMessageHandler) return;
  uni.$off("socketMessage", socketMessageHandler);
  socketMessageHandler = null;
};

const handleConversationClick = (conversation) => {
  if (!conversation.questionId) {
    uni.showToast({ title: "会话信息不完整", icon: "none" });
    return;
  }
  uni.navigateTo({ url: `/pages/chat/index?questionId=${conversation.questionId}` });
};

watch(keyword, scheduleKeywordSearch);
watch(activeFilter, () => fetchConversations({ showLoading: true }));

onShow(() => {
  isPageVisible.value = true;
  registerSocketListener();
  fetchConversations({ showLoading: true });
});

onHide(() => {
  isPageVisible.value = false;
  unregisterSocketListener();
});

onPullDownRefresh(() => fetchConversations());

onUnload(() => {
  if (keywordTimer) clearTimeout(keywordTimer);
  if (socketRefreshTimer) clearTimeout(socketRefreshTimer);
  isPageVisible.value = false;
  unregisterSocketListener();
});
</script>

<style lang="scss" scoped>
.message-page {
  position: relative;
  overflow-x: hidden;
  background: #fffdf6 !important;
}

.message-page::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 330rpx;
  background: #ffefbd;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  z-index: 0;
}

.message-page > view:not(.tab-shell),
.message-page > scroll-view {
  position: relative;
  z-index: 1;
}

.notice-card {
  min-height: 154rpx;
  padding: 22rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  background: rgba(255, 245, 199, 0.92);
}

.notice-icon-wrap {
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  background: var(--qa-yellow);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-icon {
  width: 54rpx;
  height: 54rpx;
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.notice-title {
  color: var(--qa-ink);
  font-size: 28rpx;
  font-weight: 900;
}

.notice-count {
  min-width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: #ff4f4f;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 900;
}

.notice-desc,
.message-preview,
.message-note {
  display: block;
  color: var(--qa-soft-text);
  font-size: 23rpx;
  line-height: 1.45;
}

.notice-desc {
  margin-top: 10rpx;
}

.notice-arrow {
  font-size: 42rpx;
  color: var(--qa-ink);
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 22rpx;
}

.message-card {
  min-height: 136rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.message-avatar-wrap {
  position: relative;
  width: 86rpx;
  height: 86rpx;
  border: 2rpx solid rgba(43, 37, 40, 0.24);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: visible;
}

.message-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-initial {
  color: var(--qa-ink);
  font-size: 28rpx;
  font-weight: 900;
}

.small-red-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ff4f4f;
  border: 3rpx solid #fff8ef;
}

.message-main {
  flex: 1;
  min-width: 0;
}

.message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.message-name {
  min-width: 0;
  flex: 1;
  color: var(--qa-ink);
  font-size: 27rpx;
  font-weight: 900;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.message-time {
  color: var(--qa-muted);
  font-size: 22rpx;
  font-weight: 700;
}

.message-preview {
  margin-top: 8rpx;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.message-note {
  margin-top: 6rpx;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.message-unread {
  min-width: 40rpx;
  height: 40rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ff4f4f;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 900;
}

.empty-message {
  padding: 50rpx 28rpx;
  text-align: center;
}

.empty-title,
.empty-desc {
  display: block;
}

.empty-title {
  color: var(--qa-ink);
  font-size: 28rpx;
  font-weight: 900;
}

.empty-desc {
  margin-top: 12rpx;
  color: var(--qa-soft-text);
  font-size: 24rpx;
}

.reload-action {
  margin-top: 24rpx;
}
</style>
