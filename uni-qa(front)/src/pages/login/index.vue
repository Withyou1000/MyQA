<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/images/logo.png" mode="aspectFit" />
      <text class="title">问答社区</text>
    </view>

    <view class="login-form">
      <view class="input-group">
        <text class="label">账号</text>
        <input type="text" v-model="account" placeholder="请输入账号" class="input" />
      </view>

      <view class="input-group">
        <text class="label">密码</text>
        <input type="password" v-model="password" placeholder="请输入密码" class="input" />
      </view>

      <button class="login-btn" @click="handleLogin">登录</button>

      <view class="register-link" @click="goToRegister">
        没有账号？立即注册
      </view>

      <view class="agreement">
        登录即表示同意
        <text class="link" @click="showAgreement">用户协议</text>
        和
        <text class="link" @click="showPrivacy">隐私政策</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { userApi } from "@/api/user";
import { ref } from "vue";
import { authApi } from "@/api/auth.js";

const account = ref("");
const password = ref("");

// 处理登录
const handleLogin = async () => {
  if (!account.value) {
    uni.showToast({
      title: "请输入账号",
      icon: "none",
    });
    return;
  }

  if (!password.value) {
    uni.showToast({
      title: "请输入密码",
      icon: "none",
    });
    return;
  }

  try {
    const res = await authApi.login({
      account: account.value,
      password: password.value,
    });
    if (res.code === 200) {
      uni.setStorageSync("token", res.data.token);
      const userInfo = await userApi.getUserInfo();
      uni.setStorageSync("userInfo", userInfo.data);

      uni.initWebSocket();

      // 根据用户角色跳转到不同页面
      if (userInfo.data.role === 'customer_service') {
        // 客服跳转到客服工作台
        uni.reLaunch({
          url: "/pages/customer-service/index",
        });
      } else {
        // 普通用户跳转到首页
        uni.reLaunch({
          url: "/pages/index/index",
        });
      }
    } else {
      uni.showToast({
        title: res.message || "登录失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("登录错误详情:", error);
    uni.showToast({
      title: error.message || "网络错误，请重试",
      icon: "none",
    });
  }
};

// 查看用户协议
const showAgreement = () => {
  // TODO: 跳转到用户协议页面
  uni.showToast({
    title: "用户协议",
    icon: "none",
  });
};

// 查看隐私政策
const showPrivacy = () => {
  // TODO: 跳转到隐私政策页面
  uni.showToast({
    title: "隐私政策",
    icon: "none",
  });
};

// 跳转到注册页面
const goToRegister = () => {
  uni.navigateTo({
    url: "/pages/register/index",
  });
};
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background-color: #fff;
  padding: 60rpx 40rpx;

  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 80rpx;

    .logo {
      width: 160rpx;
      height: 160rpx;
      margin-bottom: 20rpx;
    }

    .title {
      font-size: 40rpx;
      font-weight: 600;
      color: #333;
    }
  }

  .login-form {
    .input-group {
      margin-bottom: 40rpx;

      .label {
        font-size: 28rpx;
        color: #333;
        margin-bottom: 20rpx;
        display: block;
      }

      .input {
        width: 100%;
        height: 88rpx;
        background: #f5f5f5;
        border-radius: 12rpx;
        padding: 0 30rpx;
        font-size: 32rpx;
        color: #333;
      }
    }

    .login-btn {
      width: 100%;
      height: 88rpx;
      background: #007aff;
      border-radius: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32rpx;
      color: #fff;
      margin: 60rpx 0;

      &:active {
        opacity: 0.9;
      }
    }

    .register-link {
      text-align: center;
      font-size: 28rpx;
      color: #007aff;
      margin-bottom: 40rpx;

      &:active {
        opacity: 0.8;
      }
    }

    .agreement {
      text-align: center;
      font-size: 24rpx;
      color: #999;

      .link {
        color: #007aff;
        display: inline;
      }
    }
  }
}
</style>
