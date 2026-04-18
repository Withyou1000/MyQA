<template>
  <view class="detail-container">
    <!-- 问题信息区域 -->
    <view class="question-card">
      <!-- 作者和主题信息 -->
      <view class="question-header">
        <view class="author-info">
          <!-- <image class="avatar" :src="question.author.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image> -->
          <view class="author-meta">
            <text class="author-name">{{ question.author.account }}</text>
            <text class="post-time">{{ question.createTime }}</text>
          </view>
        </view>
        <view class="category-badge">
          <text>{{ question.topic || "未分类" }}</text>
        </view>
      </view>

      <!-- 问题标题 -->
      <text class="title">{{ question.title }}</text>

      <!-- 标签区域 -->
      <view
        class="tags-container"
        v-if="question.tags && question.tags.length > 0"
      >
        <view class="tag" v-for="(tag, index) in question.tags" :key="index">
          <text>{{ tag }}</text>
        </view>
      </view>

      <!-- 问题内容 -->
      <view class="question-content">
        <rich-text
          v-if="question.content"
          :nodes="question.content"
        ></rich-text>
        <text v-else class="no-content">该问题没有详细描述</text>
      </view>

      <!-- 悬赏信息 -->
      <view class="reward-container">
        <image
          class="reward-icon"
          src="/static/images/reward-icon.png"
          mode="aspectFit"
        ></image>
        <view class="reward-info">
          <text class="reward-text">悬赏金额</text>
          <text class="reward-amount">{{ question.reward }}元</text>
        </view>
      </view>

      <!-- 图片展示区 -->
      <view class="image-grid" v-if="question.images && question.images.length">
        <view
          class="image-item"
          v-for="(img, index) in question.images"
          :key="index"
        >
          <image
            :src="img"
            mode="aspectFill"
            @click="previewImage(index)"
            class="question-image"
          />
        </view>
      </view>
    </view>

    <!-- 回答按钮 -->
    <view class="answer-section">
      <view v-if="fromIndex && question.author._id !== currentUser.userId">
        <button class="answer-btn" @click="handleAnswer">申请回答</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
// 修改导入方式
import { applyApi } from "@/api/apply";
import { questionApi } from "@/api/question";
import { BASE_URL } from "@/api/config";


// 从路由参数获取是否来自我的提问列表
const fromIndex = ref(false);
// 获取当前用户信息
const currentUser = ref(uni.getStorageSync('userInfo') || {});

const question = ref({
  questionId: "",
  title: "",
  content: "",
  category: "", // 新增主题字段
  tags: [], // 新增标签数组
  reward: 0,
  images: [],
  createTime: "",
  author: {
    _id: "",
    account: "",
    avatar: "", // 新增头像字段
  },
});

// 处理回答按钮点击
const handleAnswer = () => {
  uni.showModal({
    title: "确认回答",
    content: "确定要回答这个问题吗？",
    success: (res) => {
      if (res.confirm) {
        if (
          question.value.author._id == uni.getStorageSync("userInfo").userId
        ) {
          uni.showToast({
            title: "您不能回答自己的问题",
            icon: "none",
            duration: 2000,
          });
          return;
        }
        // TODO: 从服务器获取用户信誉分，这里暂时模拟
        const userReputation = 100; // 模拟用户当前信誉分

        if (userReputation < 90) {
          uni.showToast({
            title: "您现在信誉分过低，目前不能回答问题哦",
            icon: "none",
            duration: 2000,
          });
          return;
        }

        applyApi
          .applyAnswerQuestion(question.value.questionId)
          .then((result) => {
            uni.showToast({
              title: "申请成功",
              icon: "success",
            });
            
            setTimeout(() => {
              uni.navigateBack();
            }, 1000);

          })
          .catch((error) => {
            console.error("申请失败:", error);
          });
      }
    },
  });
};

// 预览图片
const previewImage = (index) => {
  uni.previewImage({
    urls: question.value.images,
    current: index,
  });
};

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const questionId = currentPage.$page?.options?.questionId || "1";
  fromIndex.value = currentPage.$page?.options?.fromIndex === "true";
  // 调用问题详情接口
  questionApi
    .getQuestionDetail(questionId)
    .then((res) => {
      // 处理返回的数据
      const data = res.data;
      // 处理图片URL，确保有完整路径
      if (data.images && data.images.length) {
        data.images = data.images.map((img) => {
          return img.startsWith("http") ? img : `${BASE_URL}${img}`;
        });
      }
      // 确保author对象存在
      data.author = data.author || {};
      // 确保tags是数组
      data.tags = data.tags || [];
      question.value = data;
    })
    .catch((err) => {
      console.error("获取问题详情失败:", err);
    });
});
</script>

<style lang="scss" scoped>
.detail-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.question-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .author-info {
    display: flex;
    align-items: center;

    .avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      margin-right: 20rpx;
      background-color: #f0f0f0;
    }

    .author-meta {
      display: flex;
      flex-direction: column;

      .author-name {
        font-size: 30rpx;
        font-weight: 500;
        color: #333;
      }

      .post-time {
        font-size: 24rpx;
        color: #999;
        margin-top: 6rpx;
      }
    }
  }

  .category-badge {
    background-color: #e8f4ff;
    color: #007aff;
    padding: 8rpx 16rpx;
    border-radius: 20rpx;
    font-size: 24rpx;
  }
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.5;
  margin-bottom: 28rpx;
  display: block;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;

  .tag {
    background-color: #f5f5f5;
    color: #666;
    padding: 8rpx 20rpx;
    border-radius: 20rpx;
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.reward-container {
  display: flex;
  align-items: center;
  background-color: #fff7e6;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 32rpx;

  .reward-icon {
    width: 48rpx;
    height: 48rpx;
    margin-right: 16rpx;
  }

  .reward-info {
    display: flex;
    flex-direction: column;

    .reward-text {
      font-size: 24rpx;
      color: #ff9500;
    }

    .reward-amount {
      font-size: 36rpx;
      font-weight: 600;
      color: #ff9500;
    }
  }
}

.question-content {
  margin-bottom: 32rpx;
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  padding: 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;

  .no-content {
    color: #999;
    text-align: center;
    display: block;
    padding: 40rpx 0;
  }
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.image-item {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f0f0f0;
}

.question-image {
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.question-image:active {
  transform: scale(0.95);
}

.answer-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background-color: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);

  .answer-btn {
    width: 100%;
    height: 96rpx;
    background: linear-gradient(135deg, #007aff, #0062cc);
    color: #fff;
    font-size: 32rpx;
    font-weight: 500;
    border-radius: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6rpx 20rpx rgba(0, 122, 255, 0.3);
    transition: all 0.2s;
    border: none;

    &:active {
      transform: translateY(3rpx);
      box-shadow: 0 3rpx 10rpx rgba(0, 122, 255, 0.3);
    }
  }
}
</style>