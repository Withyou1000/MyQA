<template>
  <view class="message-page">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">Message Center</text>
        <text class="hero-title">消息中心</text>
        <text class="hero-subtitle">查看你和其他用户的最近沟通，支持搜索、筛选和直接进入聊天。</text>
      </view>
      <view class="hero-stat">
        <text class="hero-stat-value">{{ summary.unreadCount || 0 }}</text>
        <text class="hero-stat-label">未读消息</text>
      </view>
    </view>

    <view class="toolbar">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索用户名、问题主题或消息内容"
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
          <text class="summary-pill-value">{{ summary.totalCount || 0 }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-pill-label">未读会话</text>
          <text class="summary-pill-value">{{ summary.unreadSessionCount || 0 }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-pill-label">在线用户</text>
          <text class="summary-pill-value">{{ summary.onlineCount || 0 }}</text>
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
      <text class="empty-desc">稍等一下，正在同步你的会话列表。</text>
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
              {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-illustration">◌</view>
      <text class="empty-title">{{ errorText ? '消息加载失败' : '还没有匹配的会话' }}</text>
      <text class="empty-desc">
        {{ errorText || '试试切换筛选条件，或者清空搜索关键词后再看看。' }}
      </text>
      <view class="retry-button" @click="fetchConversations({ showLoading: true })">
        <text>{{ errorText ? '重新加载' : '刷新列表' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { onPullDownRefresh, onShow, onUnload } from '@dcloudio/uni-app'
import { chatApi } from '@/api/chat'
import { BASE_URL } from '@/api/config'

const keyword = ref('')
const activeFilter = ref('all')
const loading = ref(false)
const conversations = ref([])
const errorText = ref('')
const summary = ref({
  totalCount: 0,
  unreadCount: 0,
  unreadSessionCount: 0,
  onlineCount: 0,
  filteredCount: 0
})

const filters = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'online', label: '在线' }
]

const avatarGradients = [
  'linear-gradient(135deg, #5b8cff 0%, #7fd7ff 100%)',
  'linear-gradient(135deg, #ff8a5b 0%, #ffd15c 100%)',
  'linear-gradient(135deg, #31c48d 0%, #7be7c4 100%)',
  'linear-gradient(135deg, #475467 0%, #98a2b3 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)'
]

let fetchToken = 0
let keywordTimer = null

const normalizeAvatar = (avatar) => {
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar
  return `${BASE_URL}${avatar}`
}

const formatRelativeTime = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameYear = now.getFullYear() === date.getFullYear()
  const sameMonth = now.getMonth() === date.getMonth()
  const sameDate = now.getDate() === date.getDate()

  if (sameYear && sameMonth && sameDate) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate()

  if (isYesterday) {
    return '昨天'
  }

  return sameYear
    ? `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getAvatarGradient = (seed) => {
  const text = String(seed || '')
  let hash = 0

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % avatarGradients.length
  }

  return avatarGradients[hash]
}

const getInitial = (name) => {
  const safeName = (name || '').trim()
  return safeName ? safeName.charAt(0).toUpperCase() : '?'
}

const buildStatusLabel = (item) => {
  if (item.unreadCount > 0) return '新消息'
  if (item.otherUser?.online) return '在线'
  return item.isAsker ? '我提问的' : '我回答的'
}

const buildNote = (item) => {
  const segments = []
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean).slice(0, 2) : []

  if (item.title) {
    segments.push(`问题：${item.title}`)
  }

  if (tags.length) {
    segments.push(`标签：${tags.join(' / ')}`)
  } else if (item.reward) {
    segments.push(`赏金 ¥${item.reward}`)
  }

  return segments.join(' · ')
}

const normalizeConversation = (item) => {
  const otherUser = item.otherUser || {}
  const displayName = otherUser.name || otherUser.account || '匿名用户'

  return {
    id: item.questionId,
    questionId: item.questionId,
    name: displayName,
    initial: getInitial(displayName),
    avatar: normalizeAvatar(otherUser.avatar),
    avatarColor: getAvatarGradient(item.questionId || otherUser.userId || displayName),
    time: formatRelativeTime(item.lastMessageTime),
    topic: item.topic || '未分类',
    statusLabel: buildStatusLabel(item),
    lastMessage: item.lastMessage || '暂无消息',
    note: buildNote(item),
    unreadCount: item.unreadCount || 0,
    online: Boolean(otherUser.online)
  }
}

const fetchConversations = async ({ showLoading = false } = {}) => {
  const currentToken = ++fetchToken
  loading.value = true
  errorText.value = ''

  if (showLoading) {
    uni.showLoading({
      title: '加载中',
      mask: true
    })
  }

  try {
    const res = await chatApi.getChatList({
      keyword: keyword.value.trim(),
      filter: activeFilter.value
    })

    if (currentToken !== fetchToken) return

    summary.value = {
      totalCount: res.data?.summary?.totalCount || 0,
      unreadCount: res.data?.summary?.unreadCount || 0,
      unreadSessionCount: res.data?.summary?.unreadSessionCount || 0,
      onlineCount: res.data?.summary?.onlineCount || 0,
      filteredCount: res.data?.summary?.filteredCount || 0
    }
    conversations.value = (res.data?.chatList || []).map(normalizeConversation)
  } catch (error) {
    if (currentToken !== fetchToken) return

    errorText.value = error.message || '消息列表加载失败'
    conversations.value = []
    uni.showToast({
      title: errorText.value,
      icon: 'none'
    })
  } finally {
    if (currentToken === fetchToken) {
      loading.value = false
    }

    if (showLoading) {
      uni.hideLoading()
    }

    uni.stopPullDownRefresh()
  }
}

const scheduleKeywordSearch = () => {
  if (keywordTimer) {
    clearTimeout(keywordTimer)
  }

  keywordTimer = setTimeout(() => {
    fetchConversations()
  }, 250)
}

const handleConversationClick = (conversation) => {
  if (!conversation.questionId) {
    uni.showToast({
      title: '会话信息不完整',
      icon: 'none'
    })
    return
  }

  uni.navigateTo({
    url: `/pages/chat/index?questionId=${conversation.questionId}`
  })
}

watch(keyword, () => {
  scheduleKeywordSearch()
})

watch(activeFilter, () => {
  fetchConversations()
})

onShow(() => {
  fetchConversations({
    showLoading: true
  })
})

onPullDownRefresh(() => {
  fetchConversations()
})

onUnload(() => {
  if (keywordTimer) {
    clearTimeout(keywordTimer)
  }
})
</script>

<style lang="scss" scoped>
.message-page {
  min-height: 100vh;
  padding: 32rpx 24rpx 40rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(91, 140, 255, 0.16), transparent 30%),
    linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%);
}

.hero-card {
  padding: 36rpx 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #163b75 0%, #2d68c4 55%, #79b8ff 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(34, 79, 156, 0.22);
}

.hero-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hero-eyebrow {
  font-size: 20rpx;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  opacity: 0.72;
  margin-bottom: 12rpx;
}

.hero-title {
  font-size: 42rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.hero-subtitle {
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.88;
}

.hero-stat {
  width: 150rpx;
  min-height: 150rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-stat-value {
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
}

.hero-stat-label {
  margin-top: 12rpx;
  font-size: 22rpx;
  opacity: 0.8;
}

.toolbar {
  margin-top: 28rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12rpx 28rpx rgba(61, 84, 122, 0.08);
}

.search-box {
  height: 84rpx;
  border-radius: 24rpx;
  background: #f3f6fb;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.search-icon {
  font-size: 28rpx;
  color: #7b8798;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.filter-tab {
  min-width: 120rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #eef2f8;
  color: #607086;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.filter-tab.active {
  background: #173d7a;
  color: #fff;
  box-shadow: 0 10rpx 18rpx rgba(23, 61, 122, 0.18);
}

.summary-row {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.summary-pill {
  flex: 1;
  min-width: 0;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: #f6f8fc;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.summary-pill-label {
  font-size: 22rpx;
  color: #7b8798;
}

.summary-pill-value {
  font-size: 32rpx;
  line-height: 1;
  color: #17233a;
  font-weight: 600;
}

.section-head {
  margin: 30rpx 4rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 30rpx;
  color: #17233a;
  font-weight: 600;
}

.section-meta {
  font-size: 24rpx;
  color: #7b8798;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.conversation-card {
  padding: 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  gap: 20rpx;
  box-shadow: 0 14rpx 32rpx rgba(64, 84, 117, 0.08);
}

.conversation-card:active {
  transform: scale(0.99);
}

.avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 28rpx;
}

.avatar-text {
  font-size: 38rpx;
  color: #fff;
  font-weight: 600;
}

.online-dot {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #22c55e;
  border: 3rpx solid #fff;
}

.conversation-main {
  flex: 1;
  min-width: 0;
}

.conversation-top,
.conversation-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.name {
  font-size: 30rpx;
  color: #17233a;
  font-weight: 600;
}

.time {
  font-size: 22rpx;
  color: #98a2b3;
  flex-shrink: 0;
}

.conversation-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 14rpx;
}

.topic-tag,
.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.topic-tag {
  background: rgba(45, 104, 196, 0.1);
  color: #2d68c4;
}

.status-tag {
  background: rgba(245, 158, 11, 0.14);
  color: #c97900;
}

.preview {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #344054;
}

.conversation-bottom {
  margin-top: 18rpx;
}

.note {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: #98a2b3;
}

.unread-badge {
  min-width: 42rpx;
  height: 42rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: #ff5f5f;
  color: #fff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex-shrink: 0;
}

.empty-state {
  margin-top: 80rpx;
  padding: 80rpx 40rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.88);
  text-align: center;
  box-shadow: 0 14rpx 32rpx rgba(64, 84, 117, 0.08);
}

.empty-illustration {
  font-size: 64rpx;
  color: #9aa6b2;
  line-height: 1;
}

.empty-title {
  display: block;
  margin-top: 20rpx;
  font-size: 30rpx;
  color: #17233a;
  font-weight: 600;
}

.empty-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #7b8798;
}

.retry-button {
  margin: 28rpx auto 0;
  width: 220rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #173d7a;
  color: #fff;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
