<template>
  <view class="edit-profile-container">
    <!-- 列表式编辑项 -->
    <view class="edit-list">
      <!-- 昵称 -->
      <view class="edit-item" @click="editNickname">
        <view class="item-left">
          <text class="item-label">昵称</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.nickname || '去填写' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 头像 -->
      <view class="edit-item" @click="chooseAvatar">
        <view class="item-left">
          <text class="item-label">头像</text>
        </view>
        <view class="item-right">
          <image class="avatar-small" :src="formData.avatar || '/static/default-avatar.webp'" mode="aspectFill" />
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 个性装扮 -->
      <view class="edit-item" @click="chooseStyle">
        <view class="item-left">
          <text class="item-label">个性装扮</text>
          <text class="item-hint">装扮个人主页背景、头像挂件等</text>
        </view>
        <view class="item-right">
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 简介 -->
      <view class="edit-item" @click="editBio">
        <view class="item-left">
          <text class="item-label">简介</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.bio || '去填写' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 性别 -->
      <view class="edit-item" @click="chooseGender">
        <view class="item-left">
          <text class="item-label">性别</text>
          <text class="item-hint">个性化推荐</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.gender || '去选择' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 生日 -->
      <view class="edit-item" @click="chooseBirthday">
        <view class="item-left">
          <text class="item-label">生日</text>
          <text class="item-hint">生日当天送你生日祝福</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.birthday || '去选择' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 喜欢的 -->
      <view class="edit-item" @click="chooseInterests">
        <view class="item-left">
          <text class="item-label">喜欢的</text>
          <text class="item-hint">个性化推荐</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.interests || '去选择' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 院校名称 -->
      <view class="edit-item" @click="chooseSchool">
        <view class="item-left">
          <text class="item-label">院校名称</text>
          <text class="item-hint">发现校友</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.school || '去选择' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 芝麻信用 -->
      <view class="edit-item" @click="verifyCredit">
        <view class="item-left">
          <text class="item-label">芝麻信用</text>
        </view>
        <view class="item-right">
          <text class="item-value">去认证</text>
          <text class="arrow">›</text>
        </view>
      </view>
      
      <!-- 常住地 -->
      <view class="edit-item" @click="chooseLocation">
        <view class="item-left">
          <text class="item-label">常住地</text>
          <text class="item-hint">发现同乡</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ formData.location || '去选择' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
    
    <!-- 平台影响力 -->
    <view class="section-title">平台影响力</view>
    
    <!-- 我的勋章 -->
    <view class="edit-item" @click="viewMedals">
      <view class="item-left">
        <text class="item-label">我的勋章</text>
      </view>
      <view class="item-right">
        <view class="medal-info">
          <text class="medal-count">获得2枚勋章</text>
          <text class="medal-icon">🏅</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userApi } from '@/api/user'
import { commonApi } from '@/api/common'
import { BASE_URL } from "@/api/config";

const formData = ref({
  avatar: '',
  nickname: '',
  style: '',
  bio: '',
  gender: '',
  birthday: '',
  interests: '',
  school: '',
  location: ''
})

const normalizeAvatarUrl = (avatar) => {
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  return `${BASE_URL}${avatar}`
}

onMounted(() => {
  loadUserInfo()
})

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const res = await userApi.getUserInfo()
    formData.value = {
      avatar: normalizeAvatarUrl(res.data.avatar),
      nickname: res.data.name || res.data.account || '',
      style: res.data.style || '',
      bio: res.data.bio || '',
      gender: res.data.gender || '',
      birthday: res.data.birthday || '',
      interests: res.data.interests || '',
      school: res.data.school || '',
      location: res.data.location || ''
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

// 编辑昵称
const editNickname = () => {
  uni.showModal({
    title: '编辑昵称',
    editable: true,
    placeholderText: '请输入昵称',
    confirmText: '确定',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          // 调用接口更新昵称
          await userApi.updateNickname({
            name: res.content
          })

          // 更新本地显示
          formData.value.nickname = res.content

          uni.showToast({
            title: '昵称更新成功',
            icon: 'success'
          })

          // 更新本地存储的用户信息
          const updatedUserInfo = await userApi.getUserInfo()
          if (updatedUserInfo.data) {
            uni.setStorageSync('userInfo', updatedUserInfo.data)
          }
        } catch (error) {
          console.error('昵称更新失败:', error)
          uni.showToast({
            title: '昵称更新失败',
            icon: 'none'
          })
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

// 选择头像
const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]

      try {
        // 上传头像
        const uploadRes = await commonApi.uploadImage(tempFilePath, 'avatar')
        console.log('上传头像响应:', uploadRes)

        if (uploadRes.data) {
          // 更新本地显示
          formData.value.avatar = normalizeAvatarUrl(uploadRes.data)

          // 调用接口更新用户头像
          await userApi.updateAvatar({
            avatarUrl: uploadRes.data
          })

          uni.showToast({
            title: '头像更新成功',
            icon: 'success'
          })

          // 更新本地存储的用户信息
          const updatedUserInfo = await userApi.getUserInfo()
          if (updatedUserInfo.data) {
            uni.setStorageSync('userInfo', updatedUserInfo.data)
          }
        } else {
          uni.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('头像上传失败:', error)
        let errorMsg = '头像上传失败'
        if (error.message?.includes('File too large')) {
          errorMsg = '图片太大，请选择较小的图片'
        } else if (error.message) {
          errorMsg = error.message
        }
        uni.showToast({
          title: errorMsg,
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

// 选择个性装扮
const chooseStyle = () => {
  // 这里可以实现个性装扮选择逻辑
  uni.showToast({
    title: '个性装扮功能开发中',
    icon: 'none'
  })
}

// 编辑简介
const editBio = () => {
  uni.showModal({
    title: '编辑简介',
    editable: true,
    placeholderText: '介绍一下自己吧',
    confirmText: '确定',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm && res.content) {
        formData.value.bio = res.content
      }
    }
  })
}

// 选择性别
const chooseGender = () => {
  uni.showActionSheet({
    itemList: ['男', '女', '其他'],
    success: (res) => {
      const genders = ['男', '女', '其他']
      formData.value.gender = genders[res.tapIndex]
    }
  })
}

// 选择生日
const chooseBirthday = () => {
  uni.datePicker({
    start: '1900-01-01',
    end: new Date().toISOString().split('T')[0],
    success: (res) => {
      formData.value.birthday = res.value
    }
  })
}

// 选择喜欢的
const chooseInterests = () => {
  // 这里可以实现兴趣选择逻辑
  uni.showToast({
    title: '兴趣选择功能开发中',
    icon: 'none'
  })
}

// 选择院校
const chooseSchool = () => {
  // 这里可以实现院校选择逻辑
  uni.showToast({
    title: '院校选择功能开发中',
    icon: 'none'
  })
}

// 芝麻信用认证
const verifyCredit = () => {
  // 这里可以实现芝麻信用认证逻辑
  uni.showToast({
    title: '芝麻信用认证功能开发中',
    icon: 'none'
  })
}

// 选择常住地
const chooseLocation = () => {
  // 这里可以实现地址选择逻辑
  uni.showToast({
    title: '地址选择功能开发中',
    icon: 'none'
  })
}

// 查看勋章
const viewMedals = () => {
  // 这里可以实现查看勋章逻辑
  uni.showToast({
    title: '勋章功能开发中',
    icon: 'none'
  })
}
</script>

<style lang="scss" scoped>
.edit-profile-container {
  min-height: 100vh;
  background-color: #f7f7f7;
  
  .edit-list {
    background-color: #fff;
    margin-bottom: 20rpx;
    
    .edit-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 30rpx;
      border-bottom: 1px solid #f5f5f5;
      
      &:active {
        background-color: #f9f9f9;
      }
      
      .item-left {
        flex: 1;
        
        .item-label {
          font-size: 28rpx;
          color: #333;
          margin-bottom: 8rpx;
          display: block;
        }
        
        .item-hint {
          font-size: 22rpx;
          color: #999;
          display: block;
        }
      }
      
      .item-right {
        display: flex;
        align-items: center;
        
        .item-value {
          font-size: 28rpx;
          color: #666;
          margin-right: 10rpx;
        }
        
        .arrow {
          font-size: 32rpx;
          color: #999;
        }
        
        .avatar-small {
          width: 60rpx;
          height: 60rpx;
          border-radius: 30rpx;
          margin-right: 10rpx;
        }
        
        .medal-info {
          display: flex;
          align-items: center;
          margin-right: 10rpx;
          
          .medal-count {
            font-size: 24rpx;
            color: #666;
            margin-right: 10rpx;
          }
          
          .medal-icon {
            font-size: 32rpx;
            margin-left: 10rpx;
          }
        }
      }
    }
  }
  
  .section-title {
    font-size: 24rpx;
    color: #999;
    padding: 20rpx 30rpx;
    margin-bottom: 10rpx;
  }
}
</style>
