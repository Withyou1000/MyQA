<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        type="text"
        placeholder="搜索"
        class="search-input"
        v-model="searchKeyword"
        @confirm="handleSearch"
      />
      <GlobalNotification />
      <text class="search-icon" @click="handleSearch">🔍</text>
    </view>

    <!-- 分类列表 -->
    <scroll-view class="category-list" scroll-x>
      <view
        v-for="(category, index) in categories"
        :key="index"
        class="category-item"
        :class="{ active: category === selectedCategory }"
        @click="handleCategoryClick(category)"
      >
        <text class="category-text">{{ category }}</text>
      </view>
    </scroll-view>

    <!-- 问题列表 -->
    <view class="question-list">
      <!-- 加载中 -->
      <view class="loading" v-if="loading">
        <uni-load-more status="loading" />
      </view>

      <!-- 问题列表 -->
      <view
        v-else-if="questions.length > 0"
        v-for="question in questions"
        :key="question.questionId"
        class="question-item"
        @click="goToQuestionDetail(question)"
      >
        <view class="question-content">
          <text class="title">{{ question.title }}</text>
          <view class="tags">
            <text class="tag topic-tag">{{ question.topic }}</text>
            <text
              v-for="(tag, tagIndex) in question.tags"
              :key="tagIndex"
              class="tag"
              >{{ tag }}</text
            >
          </view>
        </view>
        <view class="question-info">
          <view class="left">
            <text class="author">{{ question.author.account }}</text>
          </view>
          <text class="reward">{{ question.reward }}元</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty" v-else>
        <text>暂无相关问题</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { questionApi, applyApi } from "@/api";
import { onShow } from "@dcloudio/uni-app";
import { onPullDownRefresh } from '@dcloudio/uni-app';

// 分类列表
const categories = ref(["编程", "教育", "硬件", "游戏", "动画", "其他"]);

// 问题列表数据
const questions = ref([
  {
    questionId: 1,
    title: "如何在Vue中使用Composition API？",
    topic: "编程",
    tags: ["Vue", "前端"],
    status: "answered",
    author: { account: "开发者1" },
    reward: 20,
  },
  {
    questionId: 2,
    title: "React和Vue哪个更适合初学者？",
    topic: "编程",
    tags: ["React", "Vue"],
    status: "pending",
    author: { account: "初学者" },
    reward: 15,
  },
  {
    questionId: 3,
    title: "如何提高孩子的数学成绩？",
    topic: "教育",
    tags: ["数学", "教育"],
    status: "answered",
    author: { account: "家长" },
    reward: 30,
  },
  {
    questionId: 4,
    title: "推荐一款适合游戏的笔记本电脑",
    topic: "硬件",
    tags: ["电脑", "游戏"],
    status: "pending",
    author: { account: "游戏玩家" },
    reward: 25,
  },
  {
    questionId: 5,
    title: "如何学习Unity游戏开发？",
    topic: "游戏",
    tags: ["Unity", "游戏开发"],
    status: "answered",
    author: { account: "游戏开发者" },
    reward: 40,
  },
]);
const loading = ref(false);
const selectedCategory = ref("编程");

// 加载问题列表
const loadQuestions = async (topic) => {
  try {
    loading.value = true;
    const params = topic ? { topic } : {};
    const res = await questionApi.getQuestionList(params);
    if (res.status === 401) {
      uni.showToast({
        title: res.message,
        icon: "none",
      });
      uni.redirectTo({
        url: "/pages/login/index",
      });
      return;
    }
    questions.value = res.data?.list || []; // 确保questions始终是数组
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
    questions.value = []; // 出错时也设置为空数组
  } finally {
    loading.value = false;
  }
};

// 分类点击处理
const handleCategoryClick = async (category) => {
  try {
    // 如果点击已选中的分类，则取消选中
    // 直接选中新分类
    selectedCategory.value = category;
    await loadQuestions(category);
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  }
};

// 跳转到问题详情
const goToQuestionDetail = (question) => {
  uni.navigateTo({
    url: `/pages/question/detail?questionId=${question.questionId}&fromIndex=true`,
  });
};

// 页面加载时获取全部问题
onMounted(() => {
  load();
});

onShow(() => {
  load();
});

const load = async () => {
  loadQuestions(selectedCategory.value);
  const userId = uni.getStorageSync("userInfo").userId;
  applyApi.verifyApplyAcceptStatus(userId).then((res) => {
    if (res.data.length > 0) {
      // 清空现有通知
      uni.$emit("clearGlobalNotifications");
      // 发送所有通知
      res.data.forEach((item) => {
        uni.$emit("showGlobalNotification", {
          id: item.questionId, // 使用唯一ID
          text: `${item.answererName}用户向你发送了采纳申请，点击跳转`,
        });
      });
    }
  });
};

const searchKeyword = ref("");

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    return;
  }
  try {
    loading.value = true;
    selectedCategory.value = "";
    const res = await questionApi.search({ keyword: searchKeyword.value });
    questions.value = res.data?.list || [];
  } catch (error) {
    uni.showToast({
      title: error.message || "搜索失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

// 在script setup部分添加
onPullDownRefresh(async () => {
  await loadQuestions(selectedCategory.value);
  uni.stopPullDownRefresh(); // 必须调用停止刷新
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
  box-sizing: border-box;
}

.search-bar {
  position: relative;
  padding: 20rpx 40rpx;
  background-color: #fff;

  .search-input {
    width: 100%;
    height: 80rpx;
    background: #f5f5f5;
    border-radius: 40rpx;
    padding: 0 80rpx 0 40rpx;
    font-size: 28rpx;
    color: #333;
    border: none;
  }

  .search-icon {
    position: absolute;
    right: 60rpx;
    top: 50%;
    transform: translateY(-50%);
    font-size: 32rpx;
    color: #999;
  }
}

.category-list {
  padding: 20rpx 0;
  white-space: nowrap;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;

  .category-item {
    display: inline-block;
    padding: 20rpx 40rpx;
    transition: all 0.3s ease;

    &.active {
      color: #ff6b6b;
      font-weight: 500;
      position: relative;

      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background: #ff6b6b;
        border-radius: 2rpx;
      }
    }

    .category-text {
      font-size: 28rpx;
      color: inherit;
    }
  }
}

.question-list {
  padding: 20rpx;

  .loading {
    padding: 40rpx 0;
    text-align: center;
  }

  .question-item {
    background-color: #fff;
    border-radius: 12rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    &:active {
      background-color: #f9f9f9;
    }

    .question-content {
      .title {
        font-size: 28rpx;
        color: #333;
        line-height: 1.5;
        margin-bottom: 16rpx;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;
        margin-bottom: 20rpx;

        .tag {
          font-size: 22rpx;
          color: #666;
          background: #f5f5f5;
          padding: 4rpx 16rpx;
          border-radius: 4rpx;

          &.topic-tag {
            color: #ff6b6b;
            background: rgba(255, 107, 107, 0.1);
          }
        }
      }
    }

    .question-info {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .left {
        display: flex;
        align-items: center;
        gap: 16rpx;

        .status {
          font-size: 24rpx;

          &.pending {
            color: #ff9500;
          }

          &.answered {
            color: #34c759;
          }
        }

        .author {
          font-size: 24rpx;
          color: #999;
        }
      }

      .reward {
        font-size: 28rpx;
        color: #ff6b6b;
        font-weight: 500;
      }
    }
  }

  .empty {
    padding: 100rpx 0;
    text-align: center;
    color: #999;
    font-size: 28rpx;
  }
}
</style>
