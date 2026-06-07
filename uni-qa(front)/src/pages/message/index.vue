<template>
  <view :class="['message-page', themePageClass]">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">Message Lounge</text>
        <text class="hero-title">消息中心</text>
        <text class="hero-subtitle">最近会话、未读提醒和在线状态都会在这里实时更新。</text>
      </view>
      <view class="hero-stat">
        <text class="hero-stat-value">{{ summary.unreadCount }}</text>
        <text class="hero-stat-label">未读消息</text>
      </view>
    </view>

    <view class="toolbar">
      <view class="search-box">
        <text class="search-icon">搜</text>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索用户、主题或消息内容"
        />
      </view>

      <view class="filter-tabs">
        <view
          v-for="filter in filters"
          :key="filter.key"
          class="filter-tab"
          :class="{ active: activeFilter === filter.key }"
          @click="activeFilter = filter.key"
        >
          {{ filter.label }}
        </view>
      </view>

      <view class="summary-row">
        <view class="summary-pill">
          <text class="summary-pill-label">全部会话</text>
          <text class="summary-pill-value">{{ summary.totalCount }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-pill-label">未读会话</text>
          <text class="summary-pill-value">{{ summary.unreadSessionCount }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-pill-label">在线用户</text>
          <text class="summary-pill-value">{{ summary.onlineCount }}</text>
        </view>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">最近聊天</text>
      <text class="section-meta">{{ summary.filteredCount || conversations.length }} 个会话</text>
    </view>

    <view v-if="loading && !conversations.length" class="empty-state">
      <view class="empty-illustration">...</view>
      <text class="empty-title">正在加载消息</text>
      <text class="empty-desc">稍等一下，正在同步你的最近会话。</text>
    </view>

    <view v-else-if="conversations.length" class="conversation-list">
      <view
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-card"
        @click="handleConversationClick(conversation)"
      >
        <view class="avatar" :style="{ background: conversation.avatarColor }">
          <image
            v-if="conversation.avatar"
            :src="conversation.avatar"
            class="avatar-image"
            mode="aspectFill"
          />
          <text v-else class="avatar-text">{{ conversation.initial }}</text>
          <view v-if="conversation.online" class="online-dot" />
        </view>

        <view class="conversation-main">
          <view class="conversation-top">
            <text class="name">{{ conversation.name }}</text>
            <text class="time">{{ conversation.time }}</text>
          </view>

          <view class="conversation-tags">
            <text class="topic-tag">{{ conversation.topic }}</text>
            <text class="status-tag">{{ conversation.statusLabel }}</text>
          </view>

          <text class="preview">{{ conversation.lastMessage }}</text>

          <view class="conversation-bottom">
            <text class="note">{{ conversation.note }}</text>
            <text v-if="conversation.unreadCount" class="unread-badge">
              {{ conversation.unreadCount > 99 ? "99+" : conversation.unreadCount }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-illustration">oo</view>
      <text class="empty-title">{{ errorText ? "消息加载失败" : "还没有匹配的会话" }}</text>
      <text class="empty-desc">
        {{ errorText || "试试切换筛选条件，或者清空搜索关键词后再看看。" }}
      </text>
      <view class="retry-button" @click="fetchConversations({ showLoading: true })">
        <text>{{ errorText ? "重新加载" : "刷新列表" }}</text>
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
const summary = ref({
  totalCount: 0,
  unreadCount: 0,
  unreadSessionCount: 0,
  onlineCount: 0,
  filteredCount: 0,
});

const filters = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "online", label: "在线" },
];

const avatarGradients = [
  "linear-gradient(135deg, var(--app-accent) 0%, var(--app-peach) 100%)",
  "linear-gradient(135deg, var(--app-warning-text) 0%, var(--app-peach) 100%)",
  "linear-gradient(135deg, var(--app-mint) 0%, var(--app-success-text) 100%)",
  "linear-gradient(135deg, var(--app-accent-strong) 0%, var(--app-info-text) 100%)",
  "linear-gradient(135deg, var(--app-ink-soft) 0%, var(--app-accent) 100%)",
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
  const sameYear = now.getFullYear() === date.getFullYear();
  const sameMonth = now.getMonth() === date.getMonth();
  const sameDate = now.getDate() === date.getDate();

  if (sameYear && sameMonth && sameDate) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) return "昨天";

  return sameYear
    ? `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getAvatarGradient = (seed) => {
  const text = String(seed || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % avatarGradients.length;
  }

  return avatarGradients[hash];
};

const getInitial = (name) => {
  const safeName = (name || "").trim();
  return safeName ? safeName.charAt(0).toUpperCase() : "?";
};

const buildStatusLabel = (item) => {
  if (item.unreadCount > 0) return "新消息";
  if (item.otherUser?.online) return "在线";
  return item.isAsker ? "我的提问" : "我的回答";
};

const buildNote = (item) => {
  const segments = [];
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean).slice(0, 2) : [];

  if (item.title) {
    segments.push(`问题：${item.title}`);
  }

  if (tags.length) {
    segments.push(`标签：${tags.join(" / ")}`);
  } else if (item.reward) {
    segments.push(`赏金 ${item.reward}`);
  }

  return segments.join(" · ");
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
    statusLabel: buildStatusLabel(item),
    lastMessage: item.lastMessage || "暂无消息",
    note: buildNote(item),
    unreadCount: item.unreadCount || 0,
    online: Boolean(otherUser.online),
  };
};

const fetchConversations = async ({ showLoading = false } = {}) => {
  const currentToken = ++fetchToken;
  errorText.value = "";

  if (showLoading) {
    loading.value = true;
  }

  try {
    const res = await chatApi.getChatList({
      keyword: keyword.value.trim(),
      filter: activeFilter.value,
    });

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
    summary.value = {
      totalCount: 0,
      unreadCount: 0,
      unreadSessionCount: 0,
      onlineCount: 0,
      filteredCount: 0,
    };
    errorText.value = error.message || "加载消息失败";
  } finally {
    if (currentToken === fetchToken) {
      loading.value = false;
      uni.stopPullDownRefresh();
    }
  }
};

const scheduleKeywordSearch = () => {
  if (keywordTimer) {
    clearTimeout(keywordTimer);
  }

  keywordTimer = setTimeout(() => {
    fetchConversations({ showLoading: true });
  }, 220);
};

const scheduleSocketRefresh = () => {
  if (!isPageVisible.value) return;

  if (socketRefreshTimer) {
    clearTimeout(socketRefreshTimer);
  }

  socketRefreshTimer = setTimeout(() => {
    fetchConversations();
  }, 120);
};

const registerSocketListener = () => {
  if (socketMessageHandler) return;

  socketMessageHandler = (data) => {
    try {
      if (!isPageVisible.value) return;
      if (!refreshableSocketTypes.has(data.type)) return;
      scheduleSocketRefresh();
    } catch (error) {
      console.error("消息中心处理实时消息失败:", error);
    }
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
    uni.showToast({
      title: "会话信息不完整",
      icon: "none",
    });
    return;
  }

  uni.navigateTo({
    url: `/pages/chat/index?questionId=${conversation.questionId}`,
  });
};

watch(keyword, () => {
  scheduleKeywordSearch();
});

watch(activeFilter, () => {
  fetchConversations({ showLoading: true });
});

onShow(() => {
  isPageVisible.value = true;
  registerSocketListener();
  fetchConversations({ showLoading: true });
});

onHide(() => {
  isPageVisible.value = false;
  unregisterSocketListener();
});

onPullDownRefresh(() => {
  fetchConversations();
});

onUnload(() => {
  if (keywordTimer) clearTimeout(keywordTimer);
  if (socketRefreshTimer) clearTimeout(socketRefreshTimer);
  isPageVisible.value = false;
  unregisterSocketListener();
});
</script>

<style lang="scss" scoped>
.message-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 182rpx;
  background: var(--app-page-bg);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 1rpx solid var(--app-card-border);
  box-shadow: var(--app-shadow-soft);
  color: var(--app-hero-text);
}

.hero-copy {
  flex: 1;
}

.hero-eyebrow {
  display: block;
  font-size: 22rpx;
  letter-spacing: 3rpx;
  text-transform: uppercase;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 76%, #ffffff);
  opacity: 1;
}

.hero-title {
  display: block;
  margin-top: 10rpx;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-subtitle {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 84%, #ffffff);
  opacity: 1;
}

.hero-stat {
  min-width: 168rpx;
  padding: 20rpx 18rpx;
  border-radius: 26rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  backdrop-filter: blur(14rpx);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.hero-stat-value {
  font-size: 42rpx;
  font-weight: 700;
}

.hero-stat-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--app-hero-text);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
  opacity: 1;
}

.toolbar {
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.search-box {
  display: flex;
  align-items: center;
  padding: 0 22rpx;
  height: 84rpx;
  border-radius: 999rpx;
  background: var(--app-input-bg);
}

.search-icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
}

.search-input {
  flex: 1;
  margin-left: 16rpx;
  font-size: 26rpx;
  color: var(--app-ink);
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.filter-tab {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
  font-size: 24rpx;
  transition: all 0.2s ease;
}

.filter-tab.active {
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  color: var(--app-hero-text);
  box-shadow: 0 12rpx 24rpx rgba(255, 137, 158, 0.18);
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 24rpx;
}

.summary-pill {
  padding: 18rpx 16rpx;
  border-radius: 24rpx;
  background: var(--app-input-bg);
  text-align: center;
}

.summary-pill-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.summary-pill-value {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--app-accent-strong);
}

.section-head {
  margin-top: 28rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.section-meta {
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding-bottom: 32rpx;
}

.conversation-card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.avatar {
  position: relative;
  width: 98rpx;
  height: 98rpx;
  border-radius: 28rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-text {
  color: #fff;
}

.online-dot {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  border: 4rpx solid var(--app-surface);
  background: #72d2b5;
}

.conversation-main {
  flex: 1;
  min-width: 0;
}

.conversation-top,
.conversation-bottom,
.conversation-tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.conversation-tags {
  justify-content: flex-start;
  margin-top: 10rpx;
  flex-wrap: wrap;
}

.name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.time {
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.topic-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
}

.topic-tag {
  background: rgba(255, 127, 150, 0.1);
  color: var(--app-accent-strong);
}

.status-tag {
  background: var(--app-success-bg);
  color: var(--app-success-text);
}

.preview {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  color: var(--app-ink);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-bottom {
  margin-top: 16rpx;
}

.note {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: var(--app-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  min-width: 40rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%);
  color: #fff;
  font-size: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  margin-top: 32rpx;
  padding: 58rpx 36rpx;
  border-radius: 32rpx;
  background: var(--app-surface);
  text-align: center;
  box-shadow: var(--app-shadow-card);
}

.empty-illustration {
  width: 108rpx;
  height: 108rpx;
  margin: 0 auto 24rpx;
  border-radius: 36rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.empty-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--app-ink-soft);
}

.retry-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  margin-top: 24rpx;
  min-width: 180rpx;
  height: 76rpx;
  padding: 0 30rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 26rpx;
  box-shadow: var(--app-primary-shadow);
}
</style>
