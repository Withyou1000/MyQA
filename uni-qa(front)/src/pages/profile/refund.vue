<template>
  <view class="refund-container">
    <view class="header">
      <view class="right"></view>
    </view>

    <view class="content">
      <!-- 退款金额 -->
      <view class="form-item">
        <text class="label">退款金额</text>
        <view class="value">
          <view class="amount-input-wrapper">
            <text class="currency">¥</text>
            <input
              type="digit"
              v-model="refundAmount"
              class="amount-input"
              placeholder="0.00"
              @input="limitAmount"
            />
          </view>
          <text class="hint">可修改，最多<view class="price-container"><text class="currency-symbol">¥</text><text class="amount">{{ maxAmount }}</text></view></text>
        </view>
      </view>

      <!-- 退款原因 -->
      <view class="form-item" @click="selectRefundReason">
        <text class="label">退款原因</text>
        <view class="value">
          <text>{{ refundReasonText || '请选择退款原因' }}</text>
          <text class="arrow">></text>
        </view>
      </view>

      <!-- 补充凭证 -->
      <view class="form-section">
        <text class="section-title">请补充凭证</text>
        <view class="upload-container">
          <view class="upload-item" @click="uploadProof">
            <text class="upload-icon">+</text>
            <text class="upload-text">上传更多
有效的证据</text>
          </view>
          <view v-for="(proof, index) in proofs" :key="index" class="proof-item">
            <image :src="proof" class="proof-image" mode="aspectFill"></image>
            <view class="delete-btn" @click="deleteProof(index)">
              <text>×</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 补充描述 -->
      <view class="form-section">
        <text class="section-title">补充描述</text>
        <textarea
          v-model="description"
          placeholder="请详细描述你遇到的问题，平台将作为凭证留存并帮助你退款。"
          class="textarea"
          maxlength="500"
        ></textarea>
      </view>
   
    </view>

    <!-- 提交按钮 -->
    <view class="submit-container">
      <button class="submit-btn" @click="submitRefund">提交</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from "@dcloudio/uni-app";
import { refundApi } from '@/api/refund';
import { chatApi } from '@/api/chat';
import { commonApi } from '@/api/common';

// 退款信息
const question = ref(null);
const refundAmount = ref('48.6');
const maxAmount = ref('48.6');
const refundReason = ref('');
const refundReasonText = ref('');
const description = ref('');
const proofs = ref([]);

// 接收参数
onLoad((options) => {
  if (options.question) {
    try {
      question.value = JSON.parse(options.question);
      if (question.value.reward) {
        refundAmount.value = question.value.reward;
        maxAmount.value = question.value.reward;
      }
      console.log('退款申请页面接收参数', question.value);
    } catch (error) {
      console.error('解析参数失败', error);
    }
  }
});

// 退款原因选项
const refundReasons = [
  '答非所问',
  '无人回复',
  '回答没有帮助',
  '其他原因'
];



// 选择退款原因
const selectRefundReason = () => {
  uni.showActionSheet({
    itemList: refundReasons,
    success: (res) => {
      const selectedReason = refundReasons[res.tapIndex];
      refundReason.value = selectedReason;
      refundReasonText.value = selectedReason;
    }
  });
};

// 上传凭证
const uploadProof = () => {
  uni.chooseImage({
    count: 9 - proofs.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 只保存临时文件路径，不上传
      proofs.value = [...proofs.value, ...res.tempFilePaths];
    }
  });
};

// 删除凭证
const deleteProof = (index) => {
  proofs.value.splice(index, 1);
};

// 实时限制金额
const limitAmount = () => {
  let value = refundAmount.value;
  const max = parseFloat(maxAmount.value);

  let amount = parseFloat(value);
  
  if (!isNaN(amount)) {
    if (amount > max) {
        // ✅ 关键：先清空，再赋值，强制触发更新
      refundAmount.value = '';       
      refundAmount.value = max.toString();
    }
  }

  // 关键：强制让 Vue 更新视图
  refundAmount.value = refundAmount.value; 
};

// 提交退款申请
const submitRefund = async () => {
  if (!refundReason.value) {
    uni.showToast({
      title: '请选择退款原因',
      icon: 'none'
    });
    return;
  }

  if (!description.value) {
    uni.showToast({
      title: '请填写补充描述',
      icon: 'none'
    });
    return;
  }

  try {
    // 显示加载提示
    uni.showLoading({
      title: '提交中...'
    });

    let uploadedUrls = [];
    // 如果有凭证，先上传
    if (proofs.value.length > 0) {
      // 上传图片
      const uploadResult = await commonApi.uploadImage(proofs.value, 'refund');
      uploadedUrls = uploadResult.data
    }

    // 构建退款申请参数
    const refundParams = {
      questionId: question.value.id,
      amount: parseFloat(refundAmount.value),
      maxAmount: parseFloat(maxAmount.value),
      reason: refundReason.value,
      proofs: uploadedUrls,
      description: description.value
    };


    // 调用退款申请API
    const res = await refundApi.submitRefund(refundParams);

    // 调用聊天接口发送退款系统消息
    await chatApi.sendChatMessage(question.value.id, {
      messageType: "refund_system",
      text: "我发起了退款申请&等待你处理，点击查看退款详情"
    });

    // 显示成功提示
    uni.showToast({
      title: '退款申请已提交',
      icon: 'success'
    });

    // 返回上一页
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    console.error('提交退款申请失败:', error);
    uni.showToast({
      title: error.message || '提交失败，请重试',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

// 页面初始化
onMounted(() => {
  console.log('退款申请页面初始化', question);
});
</script>

<style lang="scss" scoped>
.refund-container {
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
    padding: 16px 0;

    .form-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fff;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;

      .label {
        font-size: 16px;
        color: #333;
      }

      .value {
        display: flex;
        flex-direction: column;
        align-items: flex-end;

        text {
          font-size: 14px;
          color: #666;
        }

        .amount-input-wrapper {
          display: flex;
          align-items: center;
          
          .currency {
            font-size: 18px;
            font-weight: 600;
            color: #ff4d4f;
          }
          
          .amount-input {
            font-size: 18px;
            font-weight: 600;
            color: #ff4d4f;
            text-align: right;
            min-width: 80px;
            padding: 4px 8px;
            border: none;
            background: transparent;
            
            &::placeholder {
              color: #ff4d4f;
              opacity: 0.5;
            }
          }
        }

        .hint {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
          
          .price-container {
            display: flex;
            align-items: baseline;
            gap: 1px;
            
            .currency-symbol {
              font-size: 12px;
            }
            
            .amount {
              font-size: 12px;
            }
          }
        }

        .arrow {
          font-size: 16px;
          color: #999;
          margin-top: 4px;
        }
      }
    }

    .form-section {
      background-color: #fff;
      margin-top: 12px;
      padding: 16px;

      .section-title {
        font-size: 16px;
        color: #333;
        margin-bottom: 12px;
      }

      .upload-container {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;

        .upload-item {
          width: 80px;
          height: 80px;
          border: 1px dashed #d9d9d9;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #fafafa;

          .upload-icon {
            font-size: 24px;
            color: #999;
          }

          .upload-text {
            font-size: 12px;
            color: #999;
            text-align: center;
            margin-top: 4px;
          }
        }

        .proof-item {
          position: relative;
          width: 80px;
          height: 80px;

          .proof-image {
            width: 100%;
            height: 100%;
            border-radius: 4px;
          }

          .delete-btn {
            position: absolute;
            top: -8px;
            right: -8px;
            width: 20px;
            height: 20px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 16px;
          }
        }
      }

      .textarea {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font-size: 14px;
        color: #333;
        resize: none;
        background-color: #fafafa;

        &::placeholder {
          color: #999;
        }
      }
    }

    .tip {
      margin: 16px;
      font-size: 12px;
      color: #999;
      line-height: 1.5;
    }
  }

  .submit-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background-color: #fff;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

    .submit-btn {
      width: 100%;
      height: 44px;
      background-color: #ffd600;
      color: #333;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 22px;

      &:active {
        opacity: 0.8;
      }
    }
  }
}
</style>