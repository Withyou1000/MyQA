<template>
  <view class="rating-detail-container">

    <!-- 星级评价 -->
    <view class="rating-section">
      <view class="stars">
        <text 
          v-for="star in 5" 
          :key="star"
          :class="star <= ratingData.score ? 'star-active' : 'star-normal'"
        >★</text>
      </view>
      <text class="time">{{ formatTime(ratingData.createTime) }}</text>
    </view>

    <!-- 评价内容 -->
    <view class="content-section">
      <text class="content">{{ ratingData.content }}</text>
    </view>

    <!-- 评价图片 -->
    <view class="images-section" v-if="ratingData.images && ratingData.images.length > 0">
      <view 
        class="image-item" 
        v-for="(image, index) in ratingData.images" 
        :key="index"
        @click="previewImage(index)"
      >
        <image :src="image" mode="aspectFill"></image>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getRatingDetail } from '@/api/ratings';

const ratingData = ref({
  score: 0,
  content: '',
  images: [],
  createTime: ''
});

// 格式化时间
const formatTime = (time) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
};

// 预览图片
const previewImage = (index) => {
  uni.previewImage({
    current: index,
    urls: ratingData.value.images
  });
};

// 获取评价详情
const fetchRatingDetail = async (questionId) => {
  try {
    const res = await getRatingDetail(questionId);
    ratingData.value = {
      score: res.data.score,
      content: res.data.content,
      images: res.data.images || [],
      createTime: res.data.createTime
    };
  } catch (error) {
    uni.showToast({
      title: '获取评价详情失败',
      icon: 'none'
    });
  }
};

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const { questionId } = currentPage.options;
  fetchRatingDetail(questionId);
});
</script>

<style scoped>
.rating-detail-container {
  padding: 30rpx;
  background-color: #fff;
  min-height: 100vh;
}

.header {
  margin-bottom: 40rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.rating-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 30rpx;
}

.stars {
  display: flex;
  margin-bottom: 10rpx;
}

.stars text {
  font-size: 40rpx;
  margin-right: 10rpx;
}

.star-normal {
  color: #ccc;
}

.star-active {
  color: #ffd700;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.content-section {
  margin-bottom: 30rpx;
}

.content {
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
}

.images-section {
  display: flex;
  flex-wrap: wrap;
  margin-top: 20rpx;
}

.image-item {
  width: 200rpx;
  height: 200rpx;
  margin-right: 20rpx;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
  overflow: hidden;
}

.image-item image {
  width: 100%;
  height: 100%;
}
</style>