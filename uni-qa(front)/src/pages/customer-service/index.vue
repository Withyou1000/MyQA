<template>
  <view class="customer-service-container">
    <view class="page-header">
      <view class="back-btn" @click="handleBackLogout">
        <text class="back-icon"><</text>
        <text class="back-text">返回</text>
      </view>
      <text class="page-title">客服工作台</text>
      <view class="header-placeholder"></view>
    </view>
    <!-- 标签页切换 -->
    <view class="tab-bar">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'sessions' }"
        @click="activeTab = 'sessions'; loadSessions()"
      >
        会话列表
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'requests' }"
        @click="activeTab = 'requests'; loadRequests()"
      >
        申请列表
      </view>
    </view>

    <!-- 会话列表 -->
    <view class="session-list" v-if="activeTab === 'sessions'">
      <view v-for="session in sessions" :key="session.id" class="session-item" @click="enterChat(session)">
        <view class="session-avatar">
          <image :src=" (BASE_URL + session.customerAvatar) " mode="aspectFill"></image>
        </view>
        <view class="session-info">
          <view class="session-header">
            <text class="customer-name">{{ session.customerName }}</text>
            <text class="session-time">{{ formatTime(session.lastMessageTime) }}</text>
          </view>
          <text class="last-message">{{ session.lastMessage }}</text>
          <view v-if="session.unreadCount > 0" class="unread-badge">{{ session.unreadCount }}</view>
        </view>
      </view>
      <!-- 暂无会话提示 -->
      <view class="empty-sessions" v-if="sessions.length === 0">
        <text>暂无会话</text>
      </view>
    </view>

    <!-- 申请列表 -->
    <view class="request-list" v-else-if="activeTab === 'requests'">
      <view v-for="request in requests" :key="request.id" class="request-item">
        <view class="request-avatar">
          <image :src="(BASE_URL + request.customerAvatar)" mode="aspectFill"></image>
        </view>
        <view class="request-info">
          <text class="customer-name">{{ request.customerName }}</text>
          <text class="request-time">{{ formatTime(request.createdAt) }}</text>
        </view>
        <button class="accept-btn" @click="acceptRequest(request)">接受</button>
      </view>
      <!-- 暂无申请提示 -->
      <view class="empty-requests" v-if="requests.length === 0">
        <text>暂无申请</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import { customerServiceApi } from '@/api/customer-service'
import { BASE_URL } from '@/api/config'

// 格式化时间
const formatTime = (timeString) => {
  if (!timeString) return ''
  try {
    let date = new Date(timeString)

    // 检查是否是有效日期
    if (!date || isNaN(date.getTime())) {
      return '无效时间'
    }
    
    // 始终显示完整的时间信息
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }) + ' ' + 
    date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    console.error('时间格式化错误:', error)
    return '无效时间'
  }
}

const activeTab = ref('sessions')
const sessions = ref([
  {
    id: '1',
    customerId: 'user1',
    customerName: '张三',
    customerAvatar: '/static/default-avatar.webp',
    lastMessage: '您好，我有一个问题想咨询',
    lastMessageTime: '10:30',
    unreadCount: 2
  },
  {
    id: '2',
    customerId: 'user2',
    customerName: '李四',
    customerAvatar: '/static/default-avatar.webp',
    lastMessage: '谢谢，问题已经解决了',
    lastMessageTime: '09:15',
    unreadCount: 0
  }
])
const requests = ref([])

const clearLoginState = () => {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('isLoggedIn')
}

onMounted(() => {
  loadSessions()
  loadRequests()
})

const handleBackLogout = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.hideLoading()
        uni.closeSocket({})
        clearLoginState()
        uni.reLaunch({
          url: '/pages/login/index'
        })
      }
    }
  })
}

const loadSessions = async () => {
  try {
    // 调用获取会话列表API
    const res = await customerServiceApi.getSessions()
    sessions.value = res.data
  } catch (error) {
    console.error('获取会话列表失败:', error)
  }
}

const loadRequests = async () => {
  try {
    // 调用获取申请列表API
    const res = await customerServiceApi.getRequests()
    requests.value = res.data
  } catch (error) {
    console.error('获取申请列表失败:', error)
  }
}

const enterChat = (session) => {
  uni.navigateTo({
    url: `/pages/chat/index?type=customer_service&customerId=${session.customerId}&sessionId=${session.id}`
  })
}

const acceptRequest = async (request) => {
  try {
    // 调用接受请求API
    const res = await customerServiceApi.acceptRequest(request.id)
    if (res.code === 200) {
      // 接受成功后跳转到聊天界面
      uni.navigateTo({
        url: `/pages/chat/index?type=customer_service&customerId=${res.data.customerId}&sessionId=${res.data.sessionId}`
      })
      // 重新加载申请列表
      loadRequests()
    }
  } catch (error) {
    console.error('接受请求失败:', error)
    uni.showToast({
      title: '接受请求失败',
      icon: 'none'
    })
  }
}
</script>

<style lang="scss" scoped>
.customer-service-container {
  min-height: 100vh;
  background: transparent;
  padding-bottom: 0;

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 20rpx;
    margin: 24rpx 20rpx 0;
    background: var(--app-surface);
    border: 1rpx solid var(--app-card-border);
    border-radius: 28rpx;
    box-shadow: var(--app-shadow-card);

    .back-btn {
      min-width: 120rpx;
      display: flex;
      align-items: center;
      color: var(--app-ink);
      font-size: 28rpx;
    }

    .back-icon {
      font-size: 40rpx;
      line-height: 1;
      margin-right: 8rpx;
    }

    .back-text {
      line-height: 1;
    }

    .page-title {
      font-size: 32rpx;
      font-weight: 600;
      color: var(--app-ink);
    }

    .header-placeholder {
      width: 120rpx;
    }
  }

  .tab-bar {
    display: flex;
    margin: 18rpx 20rpx 0;
    background: var(--app-surface);
    border: 1rpx solid var(--app-card-border);
    border-radius: 24rpx;
    box-shadow: var(--app-shadow-card);

    .tab-item {
      flex: 1;
      padding: 24rpx;
      text-align: center;
      font-size: 28rpx;
      color: var(--app-ink-soft);
      position: relative;
      transition: all 0.3s ease;

      &.active {
        color: var(--app-accent-strong);
        font-weight: 500;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 25%;
          width: 50%;
          height: 4rpx;
          background: var(--app-accent);
          transition: all 0.3s ease;
        }
      }

      &:hover {
        color: var(--app-accent-strong);
      }
    }
  }

  .session-list {
    padding: 20rpx;

    .session-item {
      display: flex;
      align-items: center;
      background: var(--app-surface);
      border: 1rpx solid var(--app-card-border);
      border-radius: 24rpx;
      padding: 24rpx;
      margin-bottom: 16rpx;
      box-shadow: var(--app-shadow-card);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: var(--app-shadow-soft);
        transform: translateY(-2rpx);
      }

      .session-avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 40rpx;
        overflow: hidden;
        margin-right: 20rpx;
        border: 2rpx solid var(--app-card-border);

        image {
          width: 100%;
          height: 100%;
        }
      }

      .session-info {
        flex: 1;
        position: relative;

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8rpx;

          .customer-name {
            font-size: 28rpx;
            font-weight: 500;
            color: var(--app-ink);
          }

          .session-time {
            font-size: 22rpx;
            color: var(--app-ink-muted);
          }
        }

        .last-message {
          font-size: 24rpx;
          color: var(--app-ink-soft);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .unread-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--app-danger-bg);
          color: var(--app-danger-text);
          color: #fff;
          font-size: 20rpx;
          padding: 4rpx 12rpx;
          border-radius: 12rpx;
          min-width: 24rpx;
          text-align: center;
        }
      }
    }
  }

  .request-list {
    padding: 20rpx;

    .request-item {
      display: flex;
      align-items: center;
      background: var(--app-surface);
      border: 1rpx solid var(--app-card-border);
      border-radius: 24rpx;
      padding: 24rpx;
      margin-bottom: 16rpx;
      box-shadow: var(--app-shadow-card);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: var(--app-shadow-soft);
        transform: translateY(-2rpx);
      }

      .request-avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 40rpx;
        overflow: hidden;
        margin-right: 20rpx;
        border: 2rpx solid var(--app-card-border);

        image {
          width: 100%;
          height: 100%;
        }
      }

      .request-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .customer-name {
          font-size: 28rpx;
          font-weight: 500;
          color: var(--app-ink);
          margin-bottom: 16rpx;
        }

        .request-time {
          font-size: 22rpx;
          color: var(--app-ink-muted);
        }
      }

      .accept-btn {
        background: var(--app-primary-gradient);
        color: #fff;
        border: none;
        border-radius: 20rpx;
        padding: 16rpx 32rpx;
        font-size: 24rpx;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: var(--app-primary-shadow);

        &:hover {
          filter: brightness(0.96);
          transform: scale(1.05);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }

  .empty-sessions,
  .empty-requests {
    padding: 120rpx 0;
    text-align: center;
    color: var(--app-ink-muted);
    font-size: 28rpx;

    &::before {
      content: '📭';
      display: block;
      font-size: 64rpx;
      margin-bottom: 24rpx;
    }
  }
}
</style>
