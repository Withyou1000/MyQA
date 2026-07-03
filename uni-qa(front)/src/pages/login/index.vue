<template>
  <view :class="['login-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="登录" tone="coral" :show-back="false" />
    <view class="decor decor-left" />
    <view class="decor decor-right" />

    <view class="hero-wrap">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="eyebrow">MyQA</text>
        <text class="title">欢迎回来</text>
        <text class="subtitle">把问题和灵感都交给这里，轻松一点，交流也更有温度。</text>
      </view>
    </view>
      <image class="logo" src="/static/cat.webp" mode="aspectFit" />
    </view>

    <view class="form-card">
      <view class="card-head">
        <text class="card-title">账号登录</text>
        <text class="card-desc">继续你的问答、聊天和成长记录</text>
      </view>

      <view class="input-group">
        <text class="label">账号</text>
        <input type="text" v-model="account" placeholder="请输入账号" class="input" />
      </view>

      <view class="input-group">
        <text class="label">密码</text>
        <input type="password" v-model="password" placeholder="请输入密码" class="input" />
      </view>

      <button class="login-btn" @click="handleLogin">登录</button>

      <view class="helper-row">
        <view class="register-link" @click="goToRegister">没有账号？立即注册</view>
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

      if (userInfo.data.role === "customer_service") {
        uni.reLaunch({
          url: "/pages/customer-service/index",
        });
      } else {
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

const showAgreement = () => {
  uni.showToast({
    title: "用户协议",
    icon: "none",
  });
};

const showPrivacy = () => {
  uni.showToast({
    title: "隐私政策",
    icon: "none",
  });
};

const goToRegister = () => {
  uni.navigateTo({
    url: "/pages/register/index",
  });
};
</script>

<style lang="scss" scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  padding: 36rpx 30rpx 60rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
  overflow: hidden;
}

.decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(4rpx);
}

.decor-left {
  width: 280rpx;
  height: 280rpx;
  top: 30rpx;
  left: -90rpx;
  background: rgba(255, 200, 157, 0.26);
  background: color-mix(in srgb, var(--app-peach) 26%, transparent);
}

.decor-right {
  width: 220rpx;
  height: 220rpx;
  top: 260rpx;
  right: -70rpx;
  background: rgba(255, 127, 150, 0.18);
  background: color-mix(in srgb, var(--app-accent) 18%, transparent);
}

.hero-wrap,
.hero-card,
.form-card {
  position: relative;
  z-index: 1;
}

.hero-wrap {
  position: relative;
}

.hero-card {
  padding: 34rpx 248rpx 34rpx 30rpx;
  border-radius: var(--app-radius-xl);
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 0;
  box-shadow: var(--app-shadow-card);
}

.login-page .hero-card::after {
  display: none !important;
}

.hero-copy {
  flex: 1;
}

.eyebrow {
  display: inline-block;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.title {
  display: block;
  margin-top: 20rpx;
  font-size: 52rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.subtitle {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.8;
  color: var(--app-ink-soft);
}

.logo {
  position: absolute;
  top: 40%;
  right: 20rpx;
  transform: translateY(-50%);
  width: 230rpx;
  height: 230rpx;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  z-index: 2;
}

.form-card {
  margin-top: 28rpx;
  padding: 34rpx 30rpx 40rpx;
  border-radius: var(--app-radius-xl);
  background: var(--app-surface);
  border: 0;
  box-shadow: var(--app-shadow-card);
  backdrop-filter: blur(18rpx);
}

.card-head {
  margin-bottom: 24rpx;
}

.card-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.card-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--app-ink-soft);
}

.input-group {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 25rpx;
  color: var(--app-ink-soft);
}

.input {
  width: 100%;
  height: 96rpx;
  padding: 0 28rpx;
  background: var(--app-input-bg);
  border: 0;
  border-radius: 26rpx;
  box-sizing: border-box;
  font-size: 30rpx;
  color: var(--app-ink);
  box-shadow: none;
}

.login-btn {
  width: 100%;
  height: 94rpx;
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: var(--app-primary-shadow);
}

.helper-row {
  display: flex;
  justify-content: center;
  margin-top: 28rpx;
}

.register-link {
  font-size: 26rpx;
  color: var(--app-accent-strong);
}

.agreement {
  margin-top: 30rpx;
  text-align: center;
  font-size: 22rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
}

.link {
  color: var(--app-accent-strong);
  display: inline;
}
</style>
