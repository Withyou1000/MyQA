<template>
  <view class="vip-container">
    <!-- VIP特权介绍 -->
    <view class="vip-benefits">
      <view class="title">会员特权</view>
      <view class="benefits-list">
        <view class="benefit-item">
          <text class="icon">🎯</text>
          <view class="content">
            <text class="name">优先回答</text>
            <text class="desc">问题优先被推送给专业回答者</text>
          </view>
        </view>
        <view class="benefit-item">
          <text class="icon">💎</text>
          <view class="content">
            <text class="name">信誉加成</text>
            <text class="desc">回答问题获得2倍信誉分</text>
          </view>
        </view>
        <view class="benefit-item">
          <text class="icon">🏆</text>
          <view class="content">
            <text class="name">专属标识</text>
            <text class="desc">尊贵会员标识，彰显身份</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 会员套餐 -->
    <view class="vip-plans">
      <view class="title">开通会员</view>
      <view class="plans-list">
        <view 
          v-for="(plan, index) in plans" 
          :key="index"
          class="plan-item"
          :class="{ active: selectedPlan === index }"
          @click="selectPlan(index)"
        >
          <view class="duration">{{ plan.duration }}</view>
          <view class="price">
            <text class="symbol">¥</text>
            <text class="value">{{ plan.price }}</text>
          </view>
          <text class="original-price" v-if="plan.originalPrice">原价 ¥{{ plan.originalPrice }}</text>
          <text class="discount" v-if="plan.discount">{{ plan.discount }}</text>
        </view>
      </view>
    </view>
    
    <!-- 开通按钮 -->
    <view class="purchase-btn" @click="handlePurchase">
      立即开通
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

// 会员套餐数据
const plans = ref([
  {
    duration: '月度会员',
    price: '28',
    originalPrice: '38',
    discount: '限时优惠'
  },
  {
    duration: '季度会员',
    price: '68',
    originalPrice: '114',
    discount: '40%优惠'
  },
  {
    duration: '年度会员',
    price: '198',
    originalPrice: '456',
    discount: '57%优惠'
  }
])

// 选中的套餐
const selectedPlan = ref(1)

// 选择套餐
const selectPlan = (index) => {
  selectedPlan.value = index
}

// 处理购买
const handlePurchase = () => {
  const plan = plans.value[selectedPlan.value]
  uni.showModal({
    title: '确认购买',
    content: `确定要开通${plan.duration}吗？`,
    success: (res) => {
      if (res.confirm) {
        // TODO: 调用支付接口
        uni.showToast({
          title: '购买成功',
          icon: 'success'
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.vip-container {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding: 20rpx;
  
  .title {
    font-size: 32rpx;
    color: #333;
    font-weight: 500;
    margin-bottom: 30rpx;
  }
  
  .vip-benefits {
    background-color: #fff;
    border-radius: 12rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    
    .benefits-list {
      .benefit-item {
        display: flex;
        align-items: center;
        margin-bottom: 30rpx;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .icon {
          font-size: 40rpx;
          margin-right: 20rpx;
        }
        
        .content {
          .name {
            font-size: 28rpx;
            color: #333;
            margin-bottom: 8rpx;
            display: block;
          }
          
          .desc {
            font-size: 24rpx;
            color: #999;
          }
        }
      }
    }
  }
  
  .vip-plans {
    background-color: #fff;
    border-radius: 12rpx;
    padding: 30rpx;
    margin-bottom: 120rpx;
    
    .plans-list {
      display: flex;
      gap: 20rpx;
      
      .plan-item {
        flex: 1;
        background-color: #f9f9f9;
        border-radius: 12rpx;
        padding: 30rpx 20rpx;
        text-align: center;
        position: relative;
        border: 2rpx solid transparent;
        
        &.active {
          background-color: #FFF9E6;
          border-color: #FFB800;
        }
        
        .duration {
          font-size: 28rpx;
          color: #333;
          margin-bottom: 16rpx;
        }
        
        .price {
          margin-bottom: 12rpx;
          
          .symbol {
            font-size: 24rpx;
            color: #333;
          }
          
          .value {
            font-size: 40rpx;
            color: #333;
            font-weight: 600;
          }
        }
        
        .original-price {
          font-size: 24rpx;
          color: #999;
          text-decoration: line-through;
          display: block;
          margin-bottom: 8rpx;
        }
        
        .discount {
          position: absolute;
          top: 0;
          right: 0;
          background-color: #FF6B6B;
          color: #fff;
          font-size: 20rpx;
          padding: 4rpx 12rpx;
          border-radius: 0 12rpx 0 12rpx;
        }
      }
    }
  }
  
  .purchase-btn {
    position: fixed;
    left: 40rpx;
    right: 40rpx;
    bottom: 40rpx;
    height: 88rpx;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    border-radius: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 32rpx;
    font-weight: 500;
    
    &:active {
      opacity: 0.9;
    }
  }
}
</style> 