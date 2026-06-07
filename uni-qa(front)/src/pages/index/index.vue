<template>
  <view :class="['home-page', themePageClass]">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-tag">今日灵感站</text>
        <text class="hero-title">把问题交给社区</text>
        <text class="hero-desc">
          从编程到教育、从硬件到游戏，这里把提问和回答都做得更轻松一点。
        </text>
      </view>
      <view class="hero-badge">
        <text class="hero-badge-value">{{ questions.length }}</text>
        <text class="hero-badge-label">当前结果</text>
      </view>
    </view>

    <view class="search-card">
      <view class="search-input-wrap">
        <input type="text" placeholder="搜一搜你关心的问题" class="search-input" v-model="searchKeyword"
          @confirm="handleSearch" />
        <text class="search-icon" @click="handleSearch">搜索</text>
      </view>
      <GlobalNotification />
    </view>

    <scroll-view class="category-list" scroll-x show-scrollbar="false">
      <view v-for="(category, index) in categories" :key="index" class="category-item"
        :class="{ active: category === selectedCategory }" @click="handleCategoryClick(category)">
        <text class="category-text">{{ category }}</text>
      </view>
    </scroll-view>

    <view class="section-head">
      <text class="section-title">{{ selectedCategory || "推荐问答" }}</text>
      <text class="section-meta">{{ questions.length }} 条内容</text>
    </view>

    <view class="question-list">
      <view class="loading" v-if="loading">
        <uni-load-more status="loading" />
      </view>

      <view v-else-if="questions.length > 0" v-for="question in questions" :key="question.questionId"
        class="question-item" @click="goToQuestionDetail(question)">
        <view class="question-top">
          <view class="author-pill">
            <view class="author-avatar">{{ getAuthorInitial(question) }}</view>
            <text class="author-name">{{ getAuthorName(question) }}</text>
          </view>
          <view class="reward-pill">{{ formatReward(question.reward) }}</view>
        </view>

        <text class="title">{{ question.title }}</text>

        <view class="tags">
          <text class="tag topic-tag">{{ question.topic || "未分类" }}</text>
          <text v-for="(tag, tagIndex) in question.tags || []" :key="tagIndex" class="tag">
            {{ tag }}
          </text>
        </view>

        <view class="question-footer">
          <text class="footer-note">点击查看详情并参与互动</text>
          <text class="footer-action">去看看</text>
        </view>
      </view>

      <view class="empty" v-else>
        <text class="empty-title">暂时没有匹配的问题</text>
        <text class="empty-desc">换个关键词试试，或者切换别的主题看看。</text>
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { questionApi, applyApi } from "@/api";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import AppTabBar from "@/components/AppTabBar.vue";

const categories = ref(["编程", "教育", "硬件", "游戏", "动画", "其他"]);

const questions = ref([
  {
    questionId: 1,
    title: "如何在Vue中使用Composition API？",
    topic: "编程",
    tags: ["Vue", "前端"],
    status: "answered",
    author: { account: "开发者" },
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
const searchKeyword = ref("");

const getAuthorName = (question) => question?.author?.account || "匿名用户";

const getAuthorInitial = (question) => {
  const name = getAuthorName(question);
  return name.slice(0, 1).toUpperCase();
};

const formatReward = (reward) => `${reward || 0}元`;

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
    questions.value = res.data?.list || [];
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
    questions.value = [];
  } finally {
    loading.value = false;
  }
};

const handleCategoryClick = async (category) => {
  try {
    selectedCategory.value = category;
    await loadQuestions(category);
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  }
};

const goToQuestionDetail = (question) => {
  uni.navigateTo({
    url: `/pages/question/detail?questionId=${question.questionId}&fromIndex=true`,
  });
};

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
      uni.$emit("clearGlobalNotifications");
      res.data.forEach((item) => {
        uni.$emit("showGlobalNotification", {
          id: item.questionId,
          text: `${item.answererName}用户向你发送了采纳申请，点击跳转`,
        });
      });
    }
  });
};

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

onPullDownRefresh(async () => {
  await loadQuestions(selectedCategory.value);
  uni.stopPullDownRefresh();
});
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 182rpx;
  background: var(--app-page-bg);
}

.hero-card {
  display: flex;
  gap: 20rpx;
  padding: 34rpx 28rpx;
  border-radius: 32rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  box-shadow: var(--app-shadow-soft);
}

.hero-copy {
  flex: 1;
}

.hero-tag {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 46rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.9;
}

.hero-badge {
  width: 156rpx;
  min-height: 156rpx;
  border-radius: 30rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12rpx);
}

.hero-badge-value {
  font-size: 54rpx;
  font-weight: 700;
  line-height: 1;
}

.hero-badge-label {
  margin-top: 12rpx;
  font-size: 22rpx;
}

.search-card {
  margin-top: 22rpx;
  padding: 22rpx;
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 84rpx;
  padding: 0 18rpx 0 24rpx;
  border-radius: 24rpx;
  background: var(--app-input-bg);
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--app-ink);
}

.search-icon {
  min-width: 94rpx;
  height: 58rpx;
  border-radius: 999rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-list {
  margin-top: 18rpx;
  height: 80rpx;
  white-space: nowrap;
  scrollbar-width: none;
  overflow: hidden;
}

.category-list ::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.category-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  padding: 16rpx 30rpx;
  border-radius: 999rpx;
  background: var(--app-surface-alt);
  color: var(--app-ink-soft);
  box-shadow: var(--app-shadow-card);
}

.category-item.active {
  background: var(--app-primary-gradient);
  color: #fff;
}

.category-text {
  font-size: 25rpx;
  font-weight: 500;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 26rpx 4rpx 18rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.section-meta {
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.question-item {
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
}

.question-top,
.question-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.author-pill {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.author-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.author-name {
  font-size: 24rpx;
  color: var(--app-ink-soft);
}

.reward-pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-success-bg);
  color: var(--app-success-text);
  font-size: 22rpx;
  font-weight: 600;
}

.title {
  display: block;
  margin-top: 18rpx;
  font-size: 31rpx;
  line-height: 1.65;
  color: var(--app-ink);
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.tag {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-surface-soft);
  color: var(--app-ink-soft);
  font-size: 22rpx;
}

.topic-tag {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.question-footer {
  margin-top: 22rpx;
}

.footer-note {
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.footer-action {
  font-size: 24rpx;
  color: var(--app-accent-strong);
  font-weight: 600;
}

.loading {
  padding: 40rpx 0;
  text-align: center;
}

.empty {
  padding: 90rpx 34rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  box-shadow: var(--app-shadow-card);
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  color: var(--app-ink);
  font-weight: 600;
}

.empty-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
}
</style>
