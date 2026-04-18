<template>
  <view class="rating-container">
    <view class="header">
      <text class="title">你觉得本次回答体验如何？</text>
    </view>

    <!-- 星级评分 -->
    <view class="rating-stars">
      <view
        v-for="star in 5"
        :key="star"
        class="star-item"
        @click="selectStar(star)"
      >
        <text :class="selectedStars >= star ? 'star-active' : 'star-normal'">{{
          starIcon
        }}</text>
      </view>
    </view>

    <!-- 提示文字 -->
    <view class="hint-text">
      <text>分享体验，帮助更多提问者</text>
    </view>

    <!-- 文字评价输入 -->
    <view class="comment-input">
      <textarea
        placeholder="请输入您的体验评价..."
        v-model="comment"
        maxlength="500"
      ></textarea>
    </view>

    <!-- 图片上传 -->
    <view class="image-upload">
      <view class="upload-btn" @click="uploadImage" v-if="tempImageList.length < 9">
        <text>+</text>
      </view>
      <view class="preview-container" v-if="tempImageList.length > 0">
        <view
          v-for="(image, index) in tempImageList"
          :key="index"
          class="preview-item"
        >
          <image :src="image" mode="aspectFill"></image>
          <view class="delete-btn" @click.stop="deleteImage(index)">
            <text>×</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view
      class="submit-btn"
      :class="selectedStars > 0 ? 'btn-active' : 'btn-disabled'"
      @click="submitRating"
      :disabled="selectedStars === 0"
    >
      <text>提交评价</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { commonApi } from "@/api/common";
import { createRating } from "@/api/ratings";
import { BASE_URL } from "@/api/config";


// 星级评分相关
const selectedStars = ref(0);
const starIcon = "★"; // 星形图标

// 评价内容
const comment = ref("");



const questionId = ref("");

// 选择星级
const selectStar = (star) => {
  selectedStars.value = star;
};

// 临时图片列表（保存临时路径）
const tempImageList = ref([]);

// 选择图片
const uploadImage = () => {      
  uni.chooseImage({
    count: 9 - tempImageList.value.length, // 最多上传9张图片
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      // 将选中的图片临时路径添加到列表
      tempImageList.value = [...tempImageList.value, ...res.tempFilePaths];
    },
    fail: (err) => {
      console.error("图片选择失败:", err);
    },
  });
};

// 删除图片
const deleteImage = (index) => {
  tempImageList.value.splice(index, 1);
};

// 提交评价
const submitRating = async () => {
  if (selectedStars.value === 0) {
    uni.showToast({
      title: "请先选择评分",
      icon: "none",
    });
    return;
  }
  if (!comment.value.trim()) {
    uni.showToast({
      title: "请填写评价内容",
      icon: "none",
    });
    return;
  }
  try {
    uni.showLoading({
      title: "提交中..."
    });

    // 如果有临时图片，先上传
    let uploadedUrls = [];
    if (tempImageList.value.length > 0) {
      const uploadResult = await commonApi.uploadImage(tempImageList.value, 'rate');
      // 后端返回格式: { code: 200, data: ['url1', 'url2', ...] }
      uploadedUrls = uploadResult.data;
    }

    const user = uni.getStorageSync("userInfo");
    // 这里是提交评价的逻辑
    await createRating({
      avatar: user.avatar,
      account: user.account,
      questionId: questionId.value,
      score: selectedStars.value,
      content: comment.value,
      images: uploadedUrls,
    });
   
    uni.hideLoading();
    uni.showToast({
      title: "评价提交成功",
      icon: "success",
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1000);

  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || "评价提交失败",
      icon: "none",
    });
  }
};
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  questionId.value = currentPage.options.questionId;
});
</script>

<style scoped>
/* 重置样式，确保没有默认边距和填充 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.rating-container {
  padding: 40rpx 30rpx;
  background-color: #fff;
  height: 100vh; /* 固定高度为视口高度 */
  overflow: hidden; /* 禁止滚动 */
  display: flex;
  flex-direction: column;
  position: fixed; /* 固定定位，避免页面移动 */
  top: 0;
  left: 0;
  right: 0;
  z-index: 1; /* 确保在最上层 */
}

.header {
  text-align: center;
  margin-bottom: 50rpx;
  margin-top: 50rpx; /* 额外增加标题区域的上边距 */
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.rating-stars {
  display: flex;
  justify-content: center;
  margin-bottom: 30rpx;
}

.star-item {
  margin: 0 15rpx;
  cursor: pointer;
}

.star-normal {
  font-size: 60rpx;
  color: #ccc;
}

.star-active {
  font-size: 60rpx;
  color: #ffd700;
}

.hint-text {
  text-align: center;
  margin-bottom: 40rpx;
}

.hint-text text {
  font-size: 28rpx;
  color: #999;
}

.comment-input {
  margin-bottom: 40rpx;
}

.comment-input textarea {
  width: 100%;
  height: 160rpx; /* 固定文本框高度 */
  border: 1rpx solid #eee;
  border-radius: 10rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  resize: none; /* 禁止调整大小 */
  overflow: hidden; /* 禁止文本框内部滚动 */
}

.image-upload {
  margin-bottom: 30rpx;
  max-height: 220rpx; /* 限制图片上传区域高度 */
  overflow: hidden; /* 隐藏超出部分 */
}
.upload-btn {
  width: 120rpx;
  height: 120rpx;
  border: 2rpx dashed #ccc;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn text {
  font-size: 60rpx;
  color: #ccc;
}

.preview-container {
  display: flex;
  flex-wrap: wrap;
  margin-top: 20rpx;
}

.preview-item {
  width: 120rpx;
  height: 120rpx;
  margin-right: 20rpx;
  margin-bottom: 20rpx;
  position: relative;
  border-radius: 10rpx;
  overflow: hidden;
}

.preview-item image {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.submit-btn {
  width: 100%;
  height: 90rpx;
  border-radius: 45rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-top: auto;
}

.btn-disabled {
  background-color: #ccc;
  color: #fff;
}

.btn-active {
  background-color: #007aff;
  color: #fff;
}
</style>