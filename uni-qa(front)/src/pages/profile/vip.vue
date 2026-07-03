<template>
  <view :class="['vip-container', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="会员中心" tone="yellow" />

    <view class="vip-benefits">
      <view class="section-head">
        <image class="section-icon" src="/static/images/hugeicons-fire.svg" mode="aspectFit" />
        <text class="title">会员权益</text>
      </view>
      <view class="benefits-list">
        <view class="benefit-item">
          <view class="icon-wrap">
            <image class="benefit-icon" src="/static/images/ui-clock.svg" mode="aspectFit" />
          </view>
          <view class="content">
            <text class="name">优先回答</text>
            <text class="desc">问题会更靠前展示给回答者</text>
          </view>
        </view>
        <view class="benefit-item">
          <view class="icon-wrap">
            <image class="benefit-icon" src="/static/images/ui-wallet.svg" mode="aspectFit" />
          </view>
          <view class="content">
            <text class="name">信誉加成</text>
            <text class="desc">回答被采纳后可获得更多信誉分</text>
          </view>
        </view>
        <view class="benefit-item">
          <view class="icon-wrap">
            <image class="benefit-icon" src="/static/images/ui-check.svg" mode="aspectFit" />
          </view>
          <view class="content">
            <text class="name">专属标识</text>
            <text class="desc">在个人主页和回答记录展示会员身份</text>
          </view>
        </view>
      </view>
    </view>

    <view class="vip-plans">
      <view class="section-head">
        <image class="section-icon" src="/static/images/ui-yen.svg" mode="aspectFit" />
        <text class="title">开通会员</text>
      </view>
      <view class="plans-list">
        <view
          v-for="(plan, index) in plans"
          :key="index"
          class="plan-item"
          :class="{ active: selectedPlan === index }"
          @click="selectPlan(index)"
        >
          <view class="plan-main">
            <view>
              <text class="duration">{{ plan.duration }}</text>
              <text class="plan-note">{{ plan.note }}</text>
            </view>
            <text class="discount" v-if="plan.discount">{{ plan.discount }}</text>
          </view>
          <view class="plan-foot">
            <view class="price">
              <text class="symbol">¥</text>
              <text class="value">{{ plan.price }}</text>
            </view>
            <text class="original-price" v-if="plan.originalPrice">原价 ¥{{ plan.originalPrice }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="purchase-btn" @click="handlePurchase">立即开通</view>
  </view>
</template>

<script setup>
import { ref } from "vue";

const plans = ref([
  {
    duration: "月度会员",
    note: "适合先体验",
    price: "28",
    originalPrice: "38",
    discount: "限时优惠",
  },
  {
    duration: "季度会员",
    note: "性价比更高",
    price: "68",
    originalPrice: "114",
    discount: "推荐",
  },
  {
    duration: "年度会员",
    note: "长期使用更划算",
    price: "198",
    originalPrice: "456",
    discount: "57% 优惠",
  },
]);

const selectedPlan = ref(1);

const selectPlan = (index) => {
  selectedPlan.value = index;
};

const handlePurchase = () => {
  const plan = plans.value[selectedPlan.value];
  uni.showModal({
    title: "确认购买",
    content: `确定要开通${plan.duration}吗？`,
    success: (res) => {
      if (!res.confirm) return;

      // ponytail: 占位到这里，接支付接口时只替换这个成功分支。
      uni.showToast({
        title: "购买成功",
        icon: "success",
      });
    },
  });
};
</script>

<style lang="scss" scoped>
.vip-container {
  min-height: 100vh;
  background: transparent;
  padding: 20rpx;
}

.vip-benefits,
.vip-plans {
  background: rgba(255, 253, 246, 0.96);
  border-radius: 28rpx;
  padding: 28rpx;
  box-shadow: var(--app-shadow-card);
}

.vip-benefits {
  margin-bottom: 20rpx;
}

.vip-plans {
  margin-bottom: 120rpx;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 22rpx;
}

.section-icon {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
}

.title {
  font-size: 32rpx;
  color: var(--app-ink);
  font-weight: 700;
}

.benefits-list,
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 22rpx;
  background: rgba(255, 248, 236, 0.9);
}

.icon-wrap {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  background: rgba(255, 224, 172, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.benefit-icon {
  width: 32rpx;
  height: 32rpx;
}

.content {
  min-width: 0;
  flex: 1;
}

.name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 28rpx;
  color: var(--app-ink);
  font-weight: 600;
}

.desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--app-ink-soft);
}

.plan-item {
  padding: 22rpx 20rpx;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  background: rgba(255, 248, 236, 0.92);
}

.plan-item.active {
  background: rgba(255, 236, 210, 0.98);
  border-color: rgba(255, 171, 138, 0.9);
  box-shadow: 0 10rpx 24rpx rgba(255, 171, 138, 0.18);
}

.plan-main,
.plan-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.plan-foot {
  margin-top: 14rpx;
}

.duration {
  display: block;
  font-size: 28rpx;
  color: var(--app-ink);
  font-weight: 600;
}

.plan-note {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.discount {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 171, 138, 0.2);
  color: #d96e4e;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.price {
  display: flex;
  align-items: baseline;
}

.symbol {
  margin-right: 4rpx;
  font-size: 24rpx;
  color: #ff7b57;
}

.value {
  font-size: 44rpx;
  color: #ff7b57;
  font-weight: 700;
}

.original-price {
  font-size: 24rpx;
  color: var(--app-ink-muted);
  text-decoration: line-through;
  white-space: nowrap;
}

.purchase-btn {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: 40rpx;
  height: 88rpx;
  background: var(--app-primary-gradient);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  box-shadow: var(--app-primary-shadow);
}

.purchase-btn:active {
  opacity: 0.9;
}
</style>