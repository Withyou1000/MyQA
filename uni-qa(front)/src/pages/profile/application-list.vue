<template>
  <view class="application-list">
    <view class="list-container">
      <view
        v-for="(application, index) in applications"
        :key="index"
        class="application-item"
      >
        <view class="user-info" @click="navigateToUserDetail(application)">
          <text class="username">{{ application.userName }}</text>
          <view class="rating">
            <text class="label">好评率：{{ application.ratingScore }}</text>
            <text
              class="rate"
              :class="{
                'high-rate': application.rate >= 95,
                'low-rate': application.rate < 90,
              }"
              >{{ application.rate }}%</text
            >
          </view>
        </view>
        <button class="accept-btn" @click="acceptApplication(application)">
          接受
        </button>
      </view>
    </view>

    <!-- 暂无数据提示 -->
    <view class="empty-tip" v-if="applications.length === 0">
      <text>暂无申请记录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { applyApi } from "@/api/apply";

// 申请列表数据
const applications = ref([]);
const loading = ref(false);
const questionId = ref("");

// 获取申请列表
const loadApplications = async () => {
  try {
    // 模拟数据
    applications.value = [
      { id: 1, userName: "用户1", rate: 100, questionId: 2 },
      { id: 2, userName: "用户1", rate: 98, questionId: 5 },
      { id: 3, userName: "用户2", rate: 100, questionId: 2 },
      { id: 4, userName: "用户3", rate: 100, questionId: 2 },
      { id: 5, userName: "用户4", rate: 100, questionId: 2 },
    ];
    loading.value = true;

    // 获取路由参数中的questionId
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    questionId.value = currentPage.options.questionId;

    if (!questionId.value) {
      throw new Error("未找到问题ID");
    }

    // 调用API获取申请数据
    const res = await applyApi.getQuestionApplicants(questionId.value);
    applications.value = res.data.applicants || [];
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 接受申请
const acceptApplication = async (application) => {
  try {
    // 调用接受申请API
    await applyApi.acceptApplication(
      questionId.value,
      application.applicantId
    );
    // 模拟成功
    uni.showToast({
      title: `已接受${application.userName}的申请`,
      icon: "success",
    });

    // 返回上一页
    setTimeout(() => {
      uni.navigateBack();
    }, 1000);

  } catch (error) {
    uni.showToast({
      title: error.message || "操作失败",
      icon: "none",
    });
  }
};

// 页面加载时获取数据
onMounted(() => {
  loadApplications();
});

// 下拉刷新
const onPullDownRefresh = async () => {
  await loadApplications();
  uni.stopPullDownRefresh();
};

// 跳转到用户详情页
const navigateToUserDetail = (application) => {
  // 跳转到用户详情页
  uni.navigateTo({
    url: `/pages/profile/user-detail?userId=${application.applicantId}`,
  });
};
</script>

<style lang="scss" scoped>
.application-list {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding-bottom: 20rpx;

  .list-container {
    padding: 0 20rpx;
  }

  .application-item {
    background-color: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

    .user-info {
      flex: 1;

      .username {
        font-size: 32rpx;
        color: #333;
        font-weight: 500;
        margin-bottom: 8rpx;
        display: block;
      }

      .rating {
        display: flex;
        align-items: center;

        .label {
          font-size: 26rpx;
          color: #666;
        }

        .rate {
          font-size: 26rpx;
          font-weight: bold;

          &.high-rate {
            color: #34c759;
          }

          &.low-rate {
            color: #ff9500;
          }
        }
      }
    }

    .accept-btn {
      height: 70rpx;
      line-height: 70rpx;
      text-align: center;
      border-radius: 35rpx;
      font-size: 28rpx;
      padding: 0 30rpx;
      margin: 0;
      background-color: #007aff;
      color: #fff;
      min-width: 140rpx;
    }
  }

  .empty-tip {
    padding: 200rpx 0;
    text-align: center;
    color: #999;
    font-size: 28rpx;
  }
}
</style>