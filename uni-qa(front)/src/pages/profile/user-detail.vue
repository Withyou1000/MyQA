<template>
  <view class="user-detail-container">
    <view class="user-info-card">
      <image
        class="avatar"
        src="/static/images/default-avatar.webp"
        mode="aspectFill"
      />
      <view class="user-basic-info">
        <text class="username">{{ userDetail.userInfo.userName }}</text>

        <text class="reputation"
          >信誉分：{{ userDetail.userInfo.reputation }}</text
        >
        <text class="rating"
          >好评率：{{ userDetail.userInfo.ratingScore }}%</text
        >
      </view>
    </view>

    <view class="evaluation-section">
      <text class="section-title">评价</text>
      <view
        v-for="(evaluation, index) in userDetail.evaluations"
        :key="index"
        class="evaluation-item"
      >
        <view class="evaluator-info">
          <text class="evaluator-name">{{ evaluation.raterName }}</text>

          <view class="stars">
            <text
              v-for="i in 5"
              :key="i"
              class="star"
              :class="{ filled: i <= evaluation.score }"
              >{{ "★" }}</text
            >
          </view>
        </view>
        <text class="evaluation-content">{{ evaluation.content }}</text>
        <!-- 添加图片展示 -->
        <view
          class="image-container"
          v-if="evaluation.images && evaluation.images.length > 0"
        >
          <image
            v-for="(img, index) in evaluation.images"
            :key="index"
            :src="img"
            mode="aspectFill"
            class="evaluation-image"
            @click="previewImage(index, evaluation.images)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getUserRatings } from "@/api/ratings";

// 用户详情数据
const userDetail = ref({
  userInfo: {
    userName: "",
    reputation: 0,
    ratingScore: 0,
  },
  total: 0,
  list: [],
});
const userId = ref("");

// 页面加载时获取用户详情
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  userId.value = currentPage.options.userId;
  fetchUserDetail(userId.value);
});

// 获取用户详情
const fetchUserDetail = async (userId) => {
  try {
    // 实际项目中调用API获取数据
    const res = await getUserRatings(userId);
    userDetail.value = {
      total: res.data.total,
      evaluations: res.data.list,
      userInfo: res.data.userInfo,
    };
    // 模拟数据
    // userDetail.value = {
    //   userName: '小明',
    //   reputation: 98,
    //   rating: 100,
    //   evaluations: [
    //     {
    //       userName: '用户1',
    //       starCount: 4,
    //       content: '解答超详细'
    //     },
    //     {
    //       userName: '用户2',
    //       starCount: 5,
    //       content: '解答超详细'
    //     },
    //     {
    //       userName: '用户3',
    //       starCount: 3,
    //       content: '解答超详细'
    //     }
    //   ]
    // };
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
// 图片预览方法
const previewImage = (index, images) => {
  uni.previewImage({
    current: index,
    urls: images,
  });
};
// 测试函数 - 可在开发过程中使用
const testEvaluationScenario = (scenario) => {
  switch (scenario) {
    case "empty":
      userDetail.value.evaluations = [];
      break;
    case "single":
      userDetail.value.evaluations = [
        {
          userName: "测试用户",
          starCount: 5,
          content: "这是一条测试评论",
          date: "2023-10-15",
        },
      ];
      break;
    case "boundary":
      userDetail.value.evaluations = [
        { userName: "一星用户", starCount: 1, content: "很差" },
        { userName: "五星用户", starCount: 5, content: "很好" },
      ];
      break;
    default:
      // 恢复默认测试数据
      userDetail.value.evaluations = [
        { userName: "用户1", starCount: 4, content: "解答超详细" },
        { userName: "用户2", starCount: 5, content: "解答超详细" },
        { userName: "用户3", starCount: 3, content: "解答超详细" },
      ];
  }
};
</script>

<style lang="scss" scoped>
.user-detail-container {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding-bottom: 20rpx;

  .user-info-card {
    background-color: #fff;
    border-radius: 12rpx;
    padding: 40rpx;
    margin: 0 20rpx 20rpx;
    display: flex;
    align-items: center;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

    .avatar {
      width: 160rpx;
      height: 160rpx;
      border-radius: 80rpx;
      margin-right: 30rpx;
    }

    .user-basic-info {
      flex: 1;

      .username {
        font-size: 36rpx;
        color: #333;
        font-weight: 500;
        margin-bottom: 16rpx;
        display: block;
      }

      .reputation,
      .rating {
        font-size: 30rpx;
        color: #666;
        margin-bottom: 12rpx;
        display: block;
      }
    }
  }
  /* 图片样式 */
  .image-container {
    display: flex;
    flex-wrap: wrap;
    margin-top: 10px;
    gap: 10px;
  }
  .evaluation-image {
    width: 100px;
    height: 100px;
    border-radius: 4px;
  }
  .evaluation-section {
    background-color: #fff;
    border-radius: 12rpx;
    padding: 30rpx;
    margin: 0 20rpx 20rpx;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

    .section-title {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
      margin-bottom: 20rpx;
      display: block;
    }

    .evaluation-item {
      padding: 24rpx 0;
      border-bottom: 1rpx solid #f5f5f5;

      &:last-child {
        border-bottom: none;
      }

      .evaluator-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16rpx;

        .evaluator-name {
          font-size: 28rpx;
          color: #333;
          font-weight: 500;
        }

        .stars {
          display: flex;

          .star {
            font-size: 28rpx;
            color: #ccc;

            &.filled {
              color: #ffd700;
            }
          }
        }
      }

      .evaluation-content {
        font-size: 28rpx;
        color: #666;
        line-height: 1.5;
      }
    }
  }
}
</style>