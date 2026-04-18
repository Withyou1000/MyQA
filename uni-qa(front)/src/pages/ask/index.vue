<template>
  <view class="ask-container">
    <!-- 提交按钮 -->
    <view class="submit-btn" @click="handleSubmit">
      <text>提交</text>
    </view>
    
    <!-- 问题描述输入框 -->
    <view class="question-input">
      <textarea
        class="description-textarea"
        v-model="questionDesc"
        placeholder="问题描述"
        :maxlength="1000"
        auto-height
      />
      <!-- 图片上传区域 -->
      <view class="image-upload">
        <view 
          v-for="(image, index) in images" 
          :key="index"
          class="image-item"
        >
          <image 
            :src="image" 
            mode="aspectFill"
            @click="previewImage(index)"
          />
          <text class="delete-icon" @click.stop="deleteImage(index)">×</text>
        </view>
        <view 
          class="upload-btn"
          @click="chooseImage"
          v-if="images.length < 3"
        >
          <text class="plus-icon">+</text>
          <text class="upload-text">添加图片</text>
        </view>
      </view>
    </view>
    
    <!-- 主题选择 -->
    <view class="topic-section">
      <view class="section-title">选择主题</view>
      <view class="topic-container">
        <view 
          class="topic-item"
          :class="{ selected: selectedTopic }"
          @click="showTopicSelect"
        >
          <text>{{ selectedTopic || '选择主题' }}</text>
        </view>
      </view>
    </view>
    
    <!-- 标签添加区域 -->
    <view class="tags-section">
      <view class="section-title">添加标签 (最多3个)</view>
      <view class="tags-container">
        <view 
          v-for="(tag, index) in selectedTags" 
          :key="index"
          class="tag-item"
        >
          <text>{{ tag }}</text>
          <text class="delete-icon" @click="removeTag(index)">×</text>
        </view>
        <view class="add-tag" @click="showTagInput" v-if="selectedTags.length < 3">
          <text class="plus-icon">+</text>
        </view>
      </view>
    </view>
    
    <!-- 悬赏金额 -->
    <view class="reward-section">
      <view class="section-title">悬赏金额</view>
      <view class="reward-input">
        <input 
          type="number" 
          v-model="reward" 
          placeholder="输入金额"
          class="amount-input"
        />
        <text class="unit">元</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="bottom-submit">
      <view class="submit-button" @click="handleSubmit">
        提交问题
      </view>
    </view>

    <!-- 底部导航栏 -->
    <tab-bar />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import TabBar from '@/components/TabBar.vue'
import { commonApi } from '@/api/common'
import { questionApi } from '@/api/question'

const questionDesc = ref('')
const reward = ref('')
const selectedTopic = ref('')
const selectedTags = ref([])
const images = ref([]) // 存储图片路径

// 预设的主题选项
const topics = ['编程', '教育', '硬件','游戏', '动画', '其他']

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value.push(...res.tempFilePaths)
    }
  })
}

// 预览图片
const previewImage = (index) => {
  uni.previewImage({
    urls: images.value,
    current: index
  })
}

// 删除图片
const deleteImage = (index) => {
  images.value.splice(index, 1)
}

// 清空所有输入内容
const resetForm = () => {
  questionDesc.value = ''
  reward.value = ''
  selectedTopic.value = ''
  selectedTags.value = []
  images.value = [] // 清空图片
}

// 处理提交
const handleSubmit = async () => {
  // 表单验证
  if (!questionDesc.value.trim()) {
    uni.showToast({
      title: '请输入问题描述',
      icon: 'none'
    })
    return
  }
  
  if (!selectedTopic.value) {
    uni.showToast({
      title: '请选择主题',
      icon: 'none'
    })
    return
  }
  
  if (!reward.value || reward.value <= 0) {
    uni.showToast({
      title: '请输入正确的悬赏金额',
      icon: 'none'
    })
    return
  }

  try {
    // 显示加载提示
    uni.showLoading({
      title: '提交中...'
    })

    // 上传图片（如果有）
    const uploadedImages = []
    if (images.value.length > 0) {
      for (const image of images.value) {
        const res = await commonApi.uploadImage(image, 'question')
          // res.data 是 URL 数组
          uploadedImages.push(...res.data)
      }
    }

    // 提交问题
    await questionApi.createQuestion({
      title: questionDesc.value,
      topic: selectedTopic.value,
      tags: selectedTags.value,
      reward: Number(reward.value),
      images: uploadedImages
    })

    // 隐藏加载提示
    uni.hideLoading()

    // 显示成功提示
    uni.showToast({
      title: '发布成功',
      icon: 'success',
      duration: 2000
    })

    // 清空表单
    resetForm()

    // 延迟跳转到首页
    // setTimeout(() => {
    //   uni.switchTab({
    //     url: '/pages/index/index'
    //   })
    // }, 2000)

  } catch (error) {
    // 隐藏加载提示
    uni.hideLoading()

    // 显示错误信息
    uni.showToast({
      title: error.message || '发布失败',
      icon: 'none'
    })
  }
}

const showTopicSelect = () => {
  uni.showActionSheet({
    itemList: topics,
    success: (res) => {
      selectedTopic.value = topics[res.tapIndex]
    }
  })
}

const removeTag = (index) => {
  selectedTags.value.splice(index, 1)
}

const showTagInput = () => {
  if (!selectedTopic.value) {
    uni.showToast({
      title: '请先选择主题',
      icon: 'none'
    })
    return
  }
  
  if (selectedTags.value.length >= 3) {
    uni.showToast({
      title: '最多添加3个标签',
      icon: 'none'
    })
    return
  }
  
  uni.showModal({
    title: '添加标签',
    editable: true,
    placeholderText: '请输入标签名称',
    success: (res) => {
      if (res.confirm && res.content) {
        selectedTags.value.push(res.content)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.ask-container {
  min-height: 100vh;
  background-color: #fff;
  padding-bottom: 120px;  // 增加底部padding，为按钮留出空间
  box-sizing: border-box;
  
  .submit-btn {
    position: fixed;
    top: 20rpx;
    right: 30rpx;
    padding: 10rpx 30rpx;
    color: #007AFF;
    font-size: 32rpx;
  }
  
  .question-input {
    padding: 40rpx 30rpx;
    
    .description-textarea {
      width: 100%;
      min-height: 300rpx;
      font-size: 32rpx;
      line-height: 1.6;
      color: #333;
      margin-bottom: 20rpx;
    }
    
    .image-upload {
      display: flex;
      flex-wrap: wrap;
      gap: 20rpx;
      
      .image-item {
        width: 200rpx;
        height: 200rpx;
        position: relative;
        
        image {
          width: 100%;
          height: 100%;
          border-radius: 12rpx;
        }
        
        .delete-icon {
          position: absolute;
          top: -20rpx;
          right: -20rpx;
          width: 40rpx;
          height: 40rpx;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 20rpx;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32rpx;
        }
      }
      
      .upload-btn {
        width: 200rpx;
        height: 200rpx;
        background: #f5f5f5;
        border-radius: 12rpx;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        .plus-icon {
          font-size: 48rpx;
          color: #999;
          margin-bottom: 10rpx;
        }
        
        .upload-text {
          font-size: 24rpx;
          color: #999;
        }
        
        &:active {
          background: #f0f0f0;
        }
      }
    }
  }
  
  .section-title {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 20rpx;
    padding: 0 30rpx;
  }
  
  .topic-section {
    padding: 20rpx 0;
    border-top: 2rpx solid #f5f5f5;
    
    .topic-container {
      padding: 0 30rpx;
      
      .topic-item {
        height: 80rpx;
        background: #f5f5f5;
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
        color: #666;
        
        &.selected {
          background: rgba(0, 122, 255, 0.1);
          color: #007AFF;
        }
      }
    }
  }
  
  .tags-section {
    padding: 20rpx 0;
    border-top: 2rpx solid #f5f5f5;
    
    .tags-container {
      padding: 0 30rpx;
      display: flex;
      flex-wrap: wrap;
      gap: 20rpx;
      
      .tag-item {
        background: #f5f5f5;
        padding: 10rpx 20rpx;
        border-radius: 32rpx;
        font-size: 28rpx;
        color: #333;
        display: flex;
        align-items: center;
        
        .delete-icon {
          margin-left: 10rpx;
          color: #999;
          font-size: 32rpx;
        }
      }
      
      .add-tag {
        width: 60rpx;
        height: 60rpx;
        border-radius: 30rpx;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .plus-icon {
          color: #666;
          font-size: 40rpx;
        }
      }
    }
  }
  
  .reward-section {
    padding: 20rpx 0;
    border-top: 2rpx solid #f5f5f5;
    
    .reward-input {
      padding: 0 30rpx;
      display: flex;
      align-items: center;
      
      .amount-input {
        flex: 1;
        height: 80rpx;
        background: #f5f5f5;
        border-radius: 12rpx;
        padding: 0 20rpx;
        font-size: 32rpx;
      }
      
      .unit {
        margin-left: 20rpx;
        color: #666;
        font-size: 28rpx;
      }
    }
  }

  .bottom-submit {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 100rpx;  // 位于tabBar上方
    padding: 30rpx;
    background: #fff;
    box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
    
    .submit-button {
      height: 88rpx;
      background: #007AFF;
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
}
</style> 