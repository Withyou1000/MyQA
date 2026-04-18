<template>
  <view class="profile-container">
    <view class="user-info" @click="goToUserDetail">
      <image class="avatar" :src="userInfo.avatar || '/static/default-avatar.webp'" mode="aspectFill" />
      <view class="user-details">
        <text class="nickname">{{ userInfo.name || userInfo.account }}</text>
        <view class="user-stats">
          <view class="stat-item">
            <text class="value">{{ userInfo.reputation || 0 }}</text>
            <text class="label">信誉值</text>
          </view>
          <view class="stat-item">
            <text class="value">Lv.{{ userInfo.level || 0 }}</text>
            <text class="label">等级</text>
          </view>
          <view class="stat-item">
            <text class="value">{{ userInfo.balance || 0 }}元</text>
            <text class="label">余额</text>
          </view>
        </view>
      </view>
      <view class="vip-tag" @click.stop="goToVip">
        开通会员
      </view>
    </view>

    <view class="qa-section">
      <view class="section-title">我的问答</view>
      <view class="menu-list">
        <view class="menu-item" @click="goToMyQuestions">
          <view class="item-left">
            <text class="icon">❓</text>
            <text class="text">我的提问</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @click="goToMyAnswers">
          <view class="item-left">
            <text class="icon">📝</text>
            <text class="text">我的回答</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <view class="other-section">
      <view class="section-title">其他</view>
      <view class="menu-list">
        <view class="menu-item" @click="goToEditProfile">
          <view class="item-left">
            <text class="icon">✏️</text>
            <text class="text">编辑主页</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @click="contactCustomerService">
          <view class="item-left">
            <text class="icon">💬</text>
            <text class="text">联系客服</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @click="handleLogout">
          <view class="item-left">
            <text class="icon">🚪</text>
            <text class="text">退出账号</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <tab-bar />
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { ref, onMounted } from 'vue'
import TabBar from '@/components/TabBar.vue'
import { userApi } from '@/api/user'
import { BASE_URL } from '@/api/config'

const userInfo = ref({})

const normalizeAvatarUrl = (avatar) => {
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  return `${BASE_URL}${avatar}`
}

const normalizeUserInfo = (data = {}) => ({
  ...data,
  avatar: normalizeAvatarUrl(data.avatar)
})

onMounted(() => {
  const storedUserInfo = uni.getStorageSync('userInfo')
  userInfo.value = storedUserInfo ? normalizeUserInfo(storedUserInfo) : {}
})

onShow(() => {
  fetchLatestUserInfo()
})

const fetchLatestUserInfo = async () => {
  try {
    const res = await userApi.getUserInfo()
    userInfo.value = normalizeUserInfo(res.data)
    uni.setStorageSync('userInfo', res.data)
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

const goToMyQuestions = () => {
  uni.navigateTo({
    url: '/pages/profile/my-questions'
  })
}

const goToMyAnswers = () => {
  uni.navigateTo({
    url: '/pages/profile/my-answers'
  })
}

const goToVip = () => {
  uni.navigateTo({
    url: '/pages/profile/vip'
  })
}

const goToUserDetail = () => {
  uni.navigateTo({
    url: `/pages/profile/user-detail?userId=${userInfo.value.userId}`
  })
}

const goToEditProfile = () => {
  uni.navigateTo({
    url: '/pages/profile/edit-profile'
  })
}

const contactCustomerService = () => {
  uni.navigateTo({
    url: `/pages/chat/index?type=customer_service&customerId=${userInfo.value.userId}`
  })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (!res.confirm) return

      uni.removeStorageSync('isLoggedIn')
      uni.removeStorageSync('userInfo')
      uni.reLaunch({
        url: '/pages/login/index'
      })
    }
  })
}
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding-bottom: 100rpx;

  .user-info {
    background-color: #fff;
    padding: 40rpx;
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    position: relative;

    .avatar {
      width: 120rpx;
      height: 120rpx;
      border-radius: 60rpx;
      margin-right: 30rpx;
    }

    .user-details {
      flex: 1;

      .nickname {
        font-size: 32rpx;
        color: #333;
        font-weight: 500;
        margin-bottom: 16rpx;
      }

      .user-stats {
        display: flex;
        gap: 40rpx;

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;

          .value {
            font-size: 28rpx;
            color: #333;
            font-weight: 500;
            margin-bottom: 4rpx;
          }

          .label {
            font-size: 22rpx;
            color: #999;
          }
        }
      }
    }

    .vip-tag {
      position: absolute;
      right: 40rpx;
      top: 40rpx;
      background: linear-gradient(135deg, #ffd700, #ffa500);
      color: #fff;
      font-size: 24rpx;
      padding: 8rpx 20rpx;
      border-radius: 20rpx;

      &:active {
        opacity: 0.9;
      }
    }
  }

  .qa-section,
  .other-section {
    background-color: #fff;
    margin-bottom: 20rpx;

    .section-title {
      font-size: 28rpx;
      color: #999;
      padding: 20rpx 30rpx;
    }

    .menu-list {
      .menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 30rpx;
        border-top: 1px solid #f5f5f5;

        &:active {
          background-color: #f9f9f9;
        }

        .item-left {
          display: flex;
          align-items: center;

          .icon {
            font-size: 36rpx;
            margin-right: 20rpx;
          }

          .text {
            font-size: 28rpx;
            color: #333;
          }
        }

        .arrow {
          font-size: 32rpx;
          color: #999;
        }
      }
    }
  }
}

.user-info {
  cursor: pointer;
}
</style>
