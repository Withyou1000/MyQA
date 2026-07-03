<template>
  <view :class="['register-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="注册" tone="coral" />
    <view class="hero-card">
      <text class="eyebrow">Create Account</text>
      <text class="hero-title">把你的问答小屋搭起来</text>
      <text class="hero-desc">注册后就可以提问、接单、聊天，也能慢慢积累自己的信誉值。</text>
    </view>

    <view class="form-card">
      <view class="field-grid">
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
          <text class="code-btn" :class="{ disabled: counting }" @click="sendCode">
            {{ counting ? `${countdown}s` : "获取验证码" }}
          </text>
        </view>
      </view>

      <button class="register-btn" @click="handleRegister">立即注册</button>

      <view class="tips-row">
        <text class="tip-chip">新人友好</text>
        <text class="tip-chip">轻松聊天</text>
        <text class="tip-chip">个性主页</text>
      </view>

      <view class="login-link" @click="goToLogin">已有账号？返回登录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { authApi } from "@/api/auth.js";

const account = ref("");
const password = ref("");
const confirmPassword = ref("");
const phone = ref("");
const code = ref("");
const counting = ref(false);
const countdown = ref(60);

const handleFocus = (event) => {
  if (event.target) {
    event.target.classList?.add("input-focus");
  }
};

const handleBlur = (event) => {
  if (event.target) {
    event.target.classList?.remove("input-focus");
  }
};

const sendCode = () => {
  if (counting.value) return;

  if (!phone.value || phone.value.length !== 11) {
    uni.showToast({
      title: "请输入正确的手机号",
      icon: "none",
    });
    return;
  }

  const mockCode = "123456";
  uni.showModal({
    title: "模拟验证码",
    content: `您的验证码是：${mockCode}`,
    showCancel: false,
    success: () => {
      code.value = mockCode;
      counting.value = true;
      countdown.value = 60;

      const timer = setInterval(() => {
        countdown.value -= 1;
        if (countdown.value <= 0) {
          clearInterval(timer);
          counting.value = false;
        }
      }, 1000);
    },
  });
};

const handleRegister = async () => {
  if (!account.value || !password.value || !confirmPassword.value) {
    uni.showToast({
      title: "请填写完整信息",
      icon: "none",
    });
    return;
  }

  if (password.value !== confirmPassword.value) {
    uni.showToast({
      title: "两次输入的密码不一致",
      icon: "none",
    });
    return;
  }

  try {
    const res = await authApi.register(
      {
        account: account.value,
        password: password.value,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (res?.code === 200) {
      uni.showToast({
        title: "注册成功",
        icon: "success",
        duration: 2000,
        success: () => {
          setTimeout(() => {
            uni.navigateBack();
          }, 2000);
        },
      });
    } else {
      uni.showToast({
        title: res?.message || "注册失败",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("注册接口错误:", error);
    uni.showToast({
      title: error.message || "网络错误，请重试",
      icon: "none",
    });
  }
};

const goToLogin = () => {
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  padding: 36rpx 30rpx 60rpx;
}

.hero-card {
  padding: 36rpx 32rpx;
  border-radius: var(--app-radius-xl);
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 0;
  box-shadow: var(--app-shadow-soft);
  color: var(--app-hero-text);
}

.register-page .hero-card::after {
  display: none !important;
}

.eyebrow {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 22rpx;
  font-size: 46rpx;
  font-weight: 700;
  line-height: 1.3;
}

.hero-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.92;
}

.form-card {
  margin-top: 26rpx;
  padding: 34rpx 28rpx 40rpx;
  border-radius: var(--app-radius-xl);
  background: var(--app-surface);
  border: 0;
  box-shadow: var(--app-shadow-card);
}

.field-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.input-field {
  width: 100%;
  height: 96rpx;
  padding: 0 28rpx;
  background: var(--app-input-bg);
  border-radius: 26rpx;
  border: 0;
  box-sizing: border-box;
  font-size: 30rpx;
  color: var(--app-ink);
  transition: all 0.25s ease;

  &::placeholder {
    color: var(--app-ink-muted);
  }

  &.input-focus {
    background: var(--app-cream-strong);
    box-shadow: 0 0 0 6rpx rgba(255, 127, 150, 0.1);
    box-shadow: 0 0 0 6rpx color-mix(in srgb, var(--app-accent) 10%, transparent);
  }

  &.code-input {
    margin-bottom: 0;
  }
}

.code-input-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.code-input-wrapper .input-field {
  flex: 1;
}

.code-btn {
  width: 220rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--app-primary-shadow);
}

.code-btn.disabled {
  background: var(--app-neutral-chip-bg);
  color: var(--app-ink-muted);
  box-shadow: none;
}

.register-btn {
  width: 100%;
  height: 96rpx;
  margin-top: 34rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: var(--app-primary-shadow);
}

.tips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 26rpx;
}

.tip-chip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 22rpx;
}

.login-link {
  margin-top: 26rpx;
  text-align: center;
  color: var(--app-accent-strong);
  font-size: 26rpx;
}
</style>
