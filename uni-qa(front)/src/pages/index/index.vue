<template>
  <view :class="['home-page', 'prototype-page', themePageClass]">
    <view class="mock-status">
      <text>9:41</text>
      <view class="status-icons">
        <view class="signal-bars"><text /><text /><text /></view>
        <view class="wifi-dot" />
        <view class="battery" />
      </view>
    </view>

    <view class="prototype-topbar">
      <view />
      <text class="prototype-title">问答</text>
      <view class="round-icon-button" @click="goToMessage">
        <image class="icon-svg" src="/static/images/ui-bell.svg" mode="aspectFit" />
      </view>
    </view>

    <view class="prototype-search">
      <image class="icon-svg" src="/static/images/ui-search.svg" mode="aspectFit" />
      <input
        v-model="searchKeyword"
        type="text"
        confirm-type="search"
        placeholder="搜索问题"
        @confirm="handleSearch"
      />
    </view>

    <scroll-view class="category-scroll" scroll-x show-scrollbar="false">
      <view class="prototype-chip-row nowrap-row">
        <view
          v-for="category in categories"
          :key="category"
          class="prototype-chip"
          :class="{ active: category === selectedCategory }"
          @click="handleCategoryClick(category)"
        >
          {{ category }}
        </view>
      </view>
    </scroll-view>

    <view class="recommend-panel prototype-card">
      <view class="prototype-section-title compact">
        <image class="section-icon" src="/static/images/hugeicons-fire.svg" mode="aspectFit" />
        <text>推荐问题</text>
      </view>

      <view v-if="loading" class="state-card-inline">正在加载推荐问题...</view>

      <view
        v-else-if="questions.length"
        v-for="question in questions"
        :key="question.questionId"
        class="question-ticket prototype-card"
        @click="goToQuestionDetail(question)"
      >
        <view class="ticket-main">
          <text class="question-title">{{ question.title || '未命名问题' }}</text>
          <view class="ticket-tags">
            <text class="mini-tag topic">{{ question.topic || '未分类' }}</text>
            <text v-for="tag in visibleTags(question)" :key="tag" class="mini-tag">{{ tag }}</text>
          </view>
          <view class="author-row">
            <image
              v-if="getAuthorAvatar(question)"
              :src="getAuthorAvatar(question)"
              class="author-avatar-image"
              mode="aspectFill"
            />
            <view v-else class="author-avatar">{{ getAuthorInitial(question) }}</view>
            <text class="author-name">{{ getAuthorName(question) }}</text>
            <text class="dot-sep">·</text>
            <text class="author-level">Lv.{{ getAuthorLevel(question) }}</text>
            <text class="dot-sep">·</text>
            <text class="time-text">{{ formatRelativeTime(question.createTime) }}</text>
          </view>
        </view>
        <view class="reward-box">
          <text class="reward-label">赏金</text>
          <text class="reward-value">¥{{ question.reward || 0 }}</text>
        </view>
      </view>

      <view v-else class="empty-card-inline">
        <text class="empty-title">暂时没有匹配的问题</text>
        <text class="empty-desc">换个关键词，或者切换主题看看。</text>
      </view>
    </view>

    <AppTabBar />
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { questionApi, applyApi } from "@/api";
import { BASE_URL } from "@/api/config";
import AppTabBar from "@/components/AppTabBar.vue";

const categories = ref(["编程", "教育", "硬件", "游戏", "其他"]);
const questions = ref([]);
const loading = ref(false);
const selectedCategory = ref("编程");
const searchKeyword = ref("");

const normalizeAvatarUrl = (avatar) => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  return `${BASE_URL}${avatar}`;
};

const getAuthorName = (question) => question?.author?.account || question?.author?.name || "匿名用户";
const getAuthorAvatar = (question) => normalizeAvatarUrl(question?.author?.avatar || "");
const getAuthorInitial = (question) => getAuthorName(question).slice(0, 1).toUpperCase();
const getAuthorLevel = (question) => question?.author?.level || question?.author?.reputationLevel || 4;
const visibleTags = (question) => (Array.isArray(question?.tags) ? question.tags.filter(Boolean).slice(0, 3) : []);

const formatRelativeTime = (value) => {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  const diff = Date.now() - date.getTime();
  const hour = 60 * 60 * 1000;
  if (diff < hour) return "刚刚";
  if (diff < 24 * hour) return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  return `${Math.max(1, Math.floor(diff / (24 * hour)))} 天前`;
};

const loadQuestions = async (topic) => {
  try {
    loading.value = true;
    const params = topic ? { topic } : {};
    const res = await questionApi.getQuestionList(params);
    if (res.status === 401) {
      uni.showToast({ title: res.message, icon: "none" });
      uni.redirectTo({ url: "/pages/login/index" });
      return;
    }
    questions.value = res.data?.list || [];
  } catch (error) {
    uni.showToast({ title: error.message || "加载失败", icon: "none" });
    questions.value = [];
  } finally {
    loading.value = false;
  }
};

const handleCategoryClick = async (category) => {
  selectedCategory.value = category;
  searchKeyword.value = "";
  await loadQuestions(category);
};

const handleSearch = async () => {
  const keyword = searchKeyword.value.trim();
  if (!keyword) {
    await loadQuestions(selectedCategory.value);
    return;
  }

  try {
    loading.value = true;
    selectedCategory.value = "";
    const res = await questionApi.search(keyword);
    questions.value = res.data?.list || [];
  } catch (error) {
    uni.showToast({ title: error.message || "搜索失败", icon: "none" });
  } finally {
    loading.value = false;
  }
};

const goToQuestionDetail = (question) => {
  uni.navigateTo({ url: `/pages/question/detail?questionId=${question.questionId}&fromIndex=true` });
};

const goToMessage = () => {
  uni.reLaunch({ url: "/pages/message/index" });
};

const load = async () => {
  await loadQuestions(selectedCategory.value);
  const userId = uni.getStorageSync("userInfo")?.userId;
  if (!userId) return;
  applyApi.verifyApplyAcceptStatus(userId).then((res) => {
    if (res.data?.length > 0) {
      uni.$emit("clearGlobalNotifications");
      res.data.forEach((item) => {
        uni.$emit("showGlobalNotification", {
          id: item.questionId,
          text: `${item.answererName} 向你发送了采纳申请，点击查看`,
        });
      });
    }
  });
};

onMounted(load);
onShow(load);

onPullDownRefresh(async () => {
  await loadQuestions(selectedCategory.value);
  uni.stopPullDownRefresh();
});
</script>

<style lang="scss" scoped>
.home-page {
  position: relative;
  overflow-x: hidden;
  background: #fffdf6 !important;
}

.home-page::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 356rpx;
  background: #ccefdc;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  z-index: 0;
}

.home-page > view:not(.tab-shell),
.home-page > scroll-view {
  position: relative;
  z-index: 1;
}

.category-scroll {
  width: 100%;
  white-space: nowrap;
}

.nowrap-row {
  flex-wrap: nowrap;
  width: max-content;
  padding-bottom: 4rpx;
}

.recommend-panel {
  margin-top: 22rpx;
  padding: 22rpx 18rpx 20rpx;
}

.compact {
  margin: 0 0 16rpx;
}

.section-icon {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
}

.question-ticket {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  padding: 20rpx;
  margin-top: 18rpx;
  background: rgba(255, 253, 246, 0.92);
}

.ticket-main {
  min-width: 0;
  flex: 1;
}

.question-title {
  display: block;
  color: var(--qa-ink);
  font-size: 29rpx;
  line-height: 1.42;
  font-weight: 900;
}

.ticket-tags,
.author-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.mini-tag {
  padding: 7rpx 14rpx;
  border-radius: 999rpx;
  background: #d8eddc;
  color: #2b4a37;
  font-size: 20rpx;
  font-weight: 800;
}

.mini-tag.topic {
  background: #bfe4cf;
}

.author-avatar,
.author-avatar-image {
  width: 46rpx;
  height: 46rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.author-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #cdb4db;
  color: var(--qa-ink);
  font-size: 22rpx;
  font-weight: 900;
}

.author-name,
.author-level,
.time-text,
.dot-sep {
  color: var(--qa-soft-text);
  font-size: 22rpx;
  font-weight: 700;
}

.reward-box {
  width: 112rpx;
  border-radius: 28rpx;
  background: #fff0e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #f1663d;
  font-weight: 900;
}

.reward-label {
  font-size: 22rpx;
}

.reward-value {
  margin-top: 8rpx;
  font-size: 38rpx;
}

.state-card-inline,
.empty-card-inline {
  padding: 46rpx 24rpx;
  text-align: center;
  color: var(--qa-soft-text);
  font-size: 25rpx;
}

.empty-title,
.empty-desc {
  display: block;
}

.empty-title {
  color: var(--qa-ink);
  font-size: 28rpx;
  font-weight: 900;
}

.empty-desc {
  margin-top: 12rpx;
  color: var(--qa-soft-text);
  font-size: 24rpx;
}
</style>
