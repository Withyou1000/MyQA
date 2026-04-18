<template>
  <view class="register-container">
    <view class="welcome-text">创建账号</view>
    
    <view class="form-container">
      <input
        class="input-field"
        type="text"
        v-model="account"
        placeholder="请输入账号"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      
      <input
        class="input-field"
        type="password"
        v-model="password"
        placeholder="请输入密码"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      
      <input
        class="input-field"
        type="password"
        v-model="confirmPassword"
        placeholder="请确认密码"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <input
        class="input-field"
        type="number"
        v-model="phone"
        placeholder="请输入手机号"
        maxlength="11"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <view class="code-input-wrapper">
        <input
          class="input-field code-input"
          type="number"
          v-model="code"
          placeholder="请输入验证码"
          maxlength="6"
          @focus="handleFocus"
          @blur="handleBlur"
        />
        <text 
          class="code-btn" 
          :class="{ disabled: counting }"
          @click="sendCode"
        >
          {{ counting ? `${countdown}s` : '获取验证码' }}
        </text>
      </view>
      
      <button class="register-btn" @click="handleRegister">立即注册</button>
      
      <view class="login-link" @click="goToLogin">已有账号？立即登录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { authApi } from '@/api/auth.js'

const account = ref('')
const password = ref('')
const confirmPassword = ref('')
const phone = ref('')
const code = ref('')
const counting = ref(false)
const countdown = ref(60)

const handleFocus = (event) => {
  if (event.target) {
    event.target.classList?.add('input-focus')
  }
}

const handleBlur = (event) => {
  if (event.target) {
    event.target.classList?.remove('input-focus')
  }
}

// 发送验证码
const sendCode = () => {
  if (counting.value) return
  
  if (!phone.value || phone.value.length !== 11) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  
  // 模拟发送验证码
  const mockCode = '123456' // 模拟一个固定的验证码
  uni.showModal({
    title: '模拟验证码',
    content: `您的验证码是：${mockCode}`,
    showCancel: false,
    success: () => {
      // 自动填入验证码
      code.value = mockCode
      
      // 开始倒计时
      counting.value = true
      countdown.value = 60
      
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
          counting.value = false
        }
      }, 1000)
    }
  })
}

const handleRegister = async () => {
  if (!account.value || !password.value || !confirmPassword.value) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none'
    })
    return
  }
  
  if (password.value !== confirmPassword.value) {
    uni.showToast({
      title: '两次输入的密码不一致',
      icon: 'none'
    })
    return
  }

  //if (phone.value.length !== 11) {
   // uni.showToast({
    //  title: '请输入正确的手机号',
    //  icon: 'none'
   // })
  //  return
 // }

 // if (code.value.length !== 6) {
    //uni.showToast({
    //  title: '请输入6位验证码',
    //  icon: 'none'
  //  })
  //  return
 // }
  
  try {
    const res = await authApi.register({
      account: account.value,
      password: password.value
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (res?.code === 200) {
      uni.showToast({
        title: '注册成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            uni.navigateBack()
          }, 2000)
        }
      })
    } else {
      uni.showToast({
        title: res?.message || '注册失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('注册接口错误:', error)
    uni.showToast({
      title: error.message || '网络错误，请重试',
      icon: 'none'
    })
  }
}

const goToLogin = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.register-container {
  padding: 40rpx;
  min-height: 100vh;
  background-color: #fff;
  
  .welcome-text {
    font-size: 48rpx;
    font-weight: bold;
    margin: 80rpx 0;
    color: #333;
  }
  
  .form-container {
    margin-top: 40rpx;
    
    .input-field {
      width: 100%;
      height: 96rpx;
      background: #f5f5f5;
      border-radius: 16rpx;
      margin-bottom: 32rpx;
      padding: 0 32rpx;
      font-size: 32rpx;
      color: #333;
      border: 2rpx solid transparent;
      box-sizing: border-box;
      transition: all 0.3s ease;
      
      &::placeholder {
        color: #999;
      }
      
      &.input-focus {
        border-color: #007AFF;
        background-color: #fff;
        box-shadow: 0 0 0 2rpx rgba(0,122,255,0.1);
      }

      &.code-input {
        margin-bottom: 0;
      }
    }

    .code-input-wrapper {
      display: flex;
      align-items: center;
      gap: 20rpx;
      margin-bottom: 32rpx;
      
      .input-field {
        flex: 1;
      }
      
      .code-btn {
        width: 200rpx;
        height: 96rpx;
        background: #007AFF;
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
        color: #fff;
        
        &.disabled {
          background: #ccc;
        }
        
        &:active {
          opacity: 0.9;
        }
      }
    }
    
    .register-btn {
      width: 100%;
      height: 96rpx;
      background: #007AFF;
      border-radius: 16rpx;
      color: #fff;
      font-size: 32rpx;
      font-weight: 500;
      margin-top: 48rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      
      &:active {
        opacity: 0.9;
      }
    }
    
    .login-link {
      text-align: center;
      margin-top: 32rpx;
      color: #007AFF;
      font-size: 28rpx;
    }
  }
}
</style>