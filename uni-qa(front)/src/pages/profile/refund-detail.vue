<template>
  <view class="refund-detail-container">
    <view class="header">
      <view class="back" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="title">退款详情</text>
      <view class="right"></view>
    </view>

    <view class="content" v-if="!loading">
      <view class="question-info" v-if="refundInfo.questionTitle">
        <text class="question-title">{{ refundInfo.questionTitle }}</text>
        <view class="question-topic" v-if="refundInfo.questionTopic">
          <text class="topic-tag">{{ refundInfo.questionTopic }}</text>
        </view>
      </view>

      <view class="refund-card">
        <view class="refund-amount-section">
          <text class="amount-label">退款金额</text>
          <text class="amount-value">¥{{ refundInfo.amount }}</text>
        </view>

        <view class="refund-info-section">
          <view class="info-item">
            <text class="info-label">退款原因</text>
            <text class="info-value">{{ refundInfo.reason }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">详细说明</text>
            <text class="info-value description">{{ refundInfo.description }}</text>
          </view>

          <view class="info-item" v-if="refundInfo.images && refundInfo.images.length">
            <text class="info-label">凭证图片</text>
            <view class="image-grid">
              <image
                v-for="(image, index) in refundInfo.images"
                :key="index"
                :src="image"
                class="refund-image"
                mode="aspectFill"
                @click="previewImage(index)"
              />
            </view>
          </view>

          <view class="info-item">
            <text class="info-label">当前状态</text>
            <view class="status-badge" :class="refundInfo.status">
              {{ getStatusText(refundInfo.status) }}
            </view>
          </view>
        </view>
      </view>

      <view class="actions-section" v-if="refundInfo.status === 'pending' && !refundInfo.isMine">
        <button class="action-btn accept-btn" @click="handleAccept">同意退款</button>
        <button class="action-btn reject-btn" @click="handleReject">拒绝退款</button>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from "@dcloudio/uni-app";
import { chatApi } from '@/api/chat';
import { refundApi } from '@/api/refund';
import { BASE_URL } from '@/api/config';

const questionId = ref('');
const refundInfo = ref({
  amount: '',
  reason: '',
  description: '',
  images: [],
  status: 'pending',
  isMine: false,
  questionTitle: '',
  questionTopic: ''
});
const loading = ref(true);

onLoad((options) => {
  if (options.questionId) {
    questionId.value = options.questionId;
    loadRefundDetail();
  }
});

const loadRefundDetail = async () => {
  try {
    loading.value = true;
    const res = await refundApi.getRefundByQuestionId(questionId.value);
    const data = res.data;
    
    refundInfo.value = {
      refundId: data.refundId,
      amount: data.amount,
      reason: data.reason,
      description: data.description,
      images: (data.proofs || []).map(img => `${BASE_URL}${img}`),
      status: data.status,
      isMine: data.isMine, // 暂时默认是自己的，实际需要根据后端返回的user信息判断
      questionTitle: data.questionTitle,
      questionTopic: data.questionTopic
    };
  } catch (error) {
    console.error('获取退款详情失败:', error);
    uni.showToast({
      title: error.message || '获取详情失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    refunded: '已同意',
    rejected: '已拒绝'
  };
  return statusMap[status] || status;
};

const previewImage = (index) => {
  uni.previewImage({
    current: index,
    urls: refundInfo.value.images
  });
};

const handleAccept = async () => {
  try {
    uni.showLoading({ title: '处理中...' });

    // 调用处理退款接口
    await refundApi.processRefund(refundInfo.value.refundId, {
      status: 'refunded',
      remark: '同意退款申请'
    });

    // 发送系统消息
    await chatApi.sendChatMessage(questionId.value, {
      messageType: "refund_system",
      text: "我已同意你的退款申请&退款金额将原路返回",
    });

    uni.showToast({
      title: '已同意退款',
      icon: 'success'
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    console.error('同意退款失败:', error);
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

const handleReject = async () => {
  try {
    uni.showLoading({ title: '处理中...' });

    // 调用处理退款接口
    await refundApi.processRefund(refundInfo.value.refundId, {
      status: 'rejected',
      remark: '拒绝退款申请'
    });

    // 发送系统消息
    await chatApi.sendChatMessage(questionId.value, {
      messageType: "refund_system",
      text: "我已拒绝你的退款申请&很抱歉，无法退款此金额",
    });

    uni.showToast({
      title: '已拒绝退款',
      icon: 'success'
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    console.error('拒绝退款失败:', error);
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

const goBack = () => {
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
.refund-detail-container {
  min-height: 100vh;
  background-color: #f5f5f5;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    background-color: #fff;
    padding: 0 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

    .back {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;

      .back-icon {
        font-size: 24px;
        color: #333;
      }
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .right {
      width: 44px;
    }
  }

  .content {
    padding: 16px;

    .question-info {
      background-color: #fff;
      border-radius: 12rpx;
      padding: 24rpx;
      margin-bottom: 16rpx;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

      .question-title {
        font-size: 28rpx;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
        margin-bottom: 12rpx;
      }

      .question-topic {
        .topic-tag {
          display: inline-block;
          padding: 6rpx 16rpx;
          background-color: #f0f0f0;
          border-radius: 16rpx;
          font-size: 22rpx;
          color: #666;
        }
      }
    }

    .refund-card {
      background-color: #fff;
      border-radius: 12rpx;
      padding: 24rpx;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

      .refund-amount-section {
        text-align: center;
        padding: 32rpx 0;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 24rpx;

        .amount-label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 12rpx;
        }

        .amount-value {
          display: block;
          font-size: 36px;
          font-weight: 600;
          color: #ff4d4f;
        }
      }

      .refund-info-section {
        .info-item {
          margin-bottom: 24rpx;

          &:last-child {
            margin-bottom: 0;
          }

          .info-label {
            display: block;
            font-size: 14px;
            color: #666;
            margin-bottom: 8rpx;
          }

          .info-value {
            display: block;
            font-size: 16px;
            color: #333;
            line-height: 1.6;

            &.description {
              color: #666;
            }
          }

          .image-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12rpx;
            margin-top: 12rpx;

            .refund-image {
              width: 160rpx;
              height: 160rpx;
              border-radius: 8rpx;
            }
          }

          .status-badge {
            display: inline-block;
            padding: 8rpx 24rpx;
            border-radius: 24rpx;
            font-size: 14px;

            &.pending {
              background-color: #fff7e6;
              color: #fa8c16;
            }

            &.accepted {
              background-color: #f6ffed;
              color: #52c41a;
            }

            &.rejected {
              background-color: #fff1f0;
              color: #ff4d4f;
            }
          }
        }
      }
    }

    .actions-section {
      margin-top: 24rpx;
      display: flex;
      gap: 16rpx;

      .action-btn {
        flex: 1;
        height: 88rpx;
        border-radius: 44rpx;
        font-size: 16px;
        font-weight: 600;
        border: none;

        &.accept-btn {
          background-color: #52c41a;
          color: #fff;

          &:active {
            opacity: 0.8;
          }
        }

        &.reject-btn {
          background-color: #fff;
          color: #ff4d4f;
          border: 1px solid #ff4d4f;

          &:active {
            background-color: #fff1f0;
          }
        }
      }
    }
  }
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;

    .loading-text {
      font-size: 28rpx;
      color: #666;
    }
  }
}
</style>
