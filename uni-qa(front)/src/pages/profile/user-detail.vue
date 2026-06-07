<template>
  <view :class="['user-detail-page', themePageClass]">
    <view class="hero-card">
      <view class="hero-top">
        <image class="avatar" :src="userAvatar" mode="aspectFill" />
        <view class="hero-copy">
          <text class="username">{{ displayName }}</text>
          <text class="user-subtitle">在这里留下了 {{ userDetail.total || 0 }} 条评价</text>
          <text class="user-desc">看看这位用户在合作里的口碑和评价反馈。</text>
        </view>
      </view>

      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-value">{{ userDetail.userInfo.reputation || 0 }}</text>
          <text class="stat-label">信誉值</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ userDetail.userInfo.ratingScore || 0 }}%</text>
          <text class="stat-label">好评率</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ userDetail.total || 0 }}</text>
          <text class="stat-label">评价数</text>
        </view>
      </view>
    </view>

    <view class="evaluation-section">
      <view class="section-head">
        <text class="section-title">评价内容</text>
        <text class="section-meta">{{ userDetail.total || 0 }} 条</text>
      </view>

      <view v-if="userDetail.evaluations.length" class="evaluation-list">
        <view
          v-for="(evaluation, index) in userDetail.evaluations"
          :key="evaluation.ratingId || index"
          class="evaluation-card"
        >
          <view class="evaluation-top">
            <view class="evaluator-meta">
              <image
                v-if="evaluation.raterAvatar"
                class="evaluator-avatar-image"
                :src="evaluation.raterAvatar"
                mode="aspectFill"
              />
              <view v-else class="evaluator-avatar">{{ getRaterInitial(evaluation.raterName) }}</view>

              <view class="evaluator-text">
                <text class="evaluator-name">{{ evaluation.raterName || "匿名用户" }}</text>
                <text class="evaluation-time">{{ formatDate(evaluation.createTime) }}</text>
              </view>
            </view>

            <view class="stars">
              <text
                v-for="i in 5"
                :key="i"
                class="star"
                :class="{ filled: i <= (evaluation.score || 0) }"
              >
                ★
              </text>
            </view>
          </view>

          <text class="evaluation-content">
            {{ evaluation.content || "这条评价没有填写文字内容。" }}
          </text>

          <view v-if="evaluation.images && evaluation.images.length > 0" class="image-container">
            <image
              v-for="(img, imageIndex) in evaluation.images"
              :key="`${img}-${imageIndex}`"
              :src="normalizeImage(img)"
              mode="aspectFill"
              class="evaluation-image"
              @click="previewImage(imageIndex, evaluation.images)"
            />
          </view>
        </view>
      </view>

      <view v-else class="empty-card">
        <text class="empty-title">还没有评价内容</text>
        <text class="empty-desc">目前还没有人留下文字评价，后续合作记录会显示在这里。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onLoad } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { getUserRatings } from "@/api/ratings";
import { BASE_URL } from "@/api/config";

const createInitialUserDetail = () => ({
  userInfo: {
    userName: "",
    account: "",
    reputation: 0,
    ratingScore: 0,
    avatar: "",
  },
  total: 0,
  evaluations: [],
});

const userDetail = ref(createInitialUserDetail());
const userId = ref("");

const displayName = computed(
  () => userDetail.value.userInfo.userName || userDetail.value.userInfo.account || "这位用户"
);

const userAvatar = computed(() => userDetail.value.userInfo.avatar || "/static/default-avatar.webp");

const normalizeMediaUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${BASE_URL}${value}`;
};

const normalizeImage = (value) => normalizeMediaUrl(value);

const getRaterInitial = (name) => {
  const safeName = (name || "").trim();
  return safeName ? safeName.slice(0, 1).toUpperCase() : "?";
};

const formatDate = (value) => {
  if (!value) return "最近";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const fetchUserDetail = async (targetUserId) => {
  if (!targetUserId) {
    userDetail.value = createInitialUserDetail();
    uni.showToast({
      title: "缺少用户信息",
      icon: "none",
    });
    return;
  }

  try {
    const res = await getUserRatings(targetUserId);
    userDetail.value = {
      total: res.data.total || 0,
      evaluations: (res.data.list || []).map((item) => ({
        ...item,
        raterAvatar: normalizeMediaUrl(item.raterAvatar),
      })),
      userInfo: {
        ...(res.data.userInfo || {}),
        avatar: normalizeMediaUrl(res.data.userInfo?.avatar),
      },
    };
  } catch (error) {
    userDetail.value = createInitialUserDetail();
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  }
};

const previewImage = (index, images) => {
  uni.previewImage({
    current: index,
    urls: images.map((item) => normalizeMediaUrl(item)).filter(Boolean),
  });
};

onLoad((options) => {
  userId.value = String(options?.userId || "").trim();
  fetchUserDetail(userId.value);
});
</script>

<style lang="scss" scoped>
.user-detail-page {
  min-height: 100vh;
  padding: 24rpx;
  background: var(--app-page-bg);
  background-color: var(--app-page-bg-color, #fff9f6);
}

.hero-card {
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  color: var(--app-hero-text);
  box-shadow: var(--app-shadow-soft);
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.avatar {
  width: 124rpx;
  height: 124rpx;
  border-radius: 34rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.hero-copy {
  flex: 1;
}

.username {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
}

.user-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.9;
}

.user-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.7;
  opacity: 0.92;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 26rpx;
}

.stat-card {
  padding: 20rpx 16rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.18);
  text-align: center;
  backdrop-filter: blur(12rpx);
}

.stat-value {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
}

.stat-label {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.evaluation-section {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  border: 1rpx solid var(--app-card-border);
  box-shadow: var(--app-shadow-card);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
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

.evaluation-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 18rpx;
}

.evaluation-card {
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-surface-soft);
  border: 1rpx solid var(--app-card-border);
}

.evaluation-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.evaluator-meta {
  display: flex;
  gap: 14rpx;
  align-items: center;
}

.evaluator-avatar,
.evaluator-avatar-image {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
}

.evaluator-avatar {
  background: linear-gradient(135deg, #ffb98e 0%, #ff8fa3 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.evaluator-avatar-image {
  box-shadow: 0 8rpx 16rpx rgba(210, 170, 159, 0.16);
}

.evaluator-text {
  display: flex;
  flex-direction: column;
}

.evaluator-name {
  font-size: 28rpx;
  color: var(--app-ink);
  font-weight: 600;
}

.evaluation-time {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.stars {
  display: flex;
  gap: 4rpx;
}

.star {
  font-size: 24rpx;
  color: rgba(255, 180, 107, 0.25);
}

.star.filled {
  color: #ffb36b;
}

.evaluation-content {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  color: var(--app-ink-soft);
  line-height: 1.75;
}

.image-container {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
  gap: 12rpx;
}

.evaluation-image {
  width: 150rpx;
  height: 150rpx;
  border-radius: 18rpx;
}

.empty-card {
  padding: 80rpx 30rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--app-ink);
}

.empty-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
}
</style>
