<template>
  <view class="application-page">
    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">Applicants</text>
        <text class="hero-title">申请列表</text>
        <text class="hero-desc">
          挑一个你最信任的人进入回答阶段，申请人的口碑和评分都会在这里展示。
        </text>
      </view>

      <view class="hero-stat">
        <text class="hero-stat-value">{{ applications.length }}</text>
        <text class="hero-stat-label">当前申请</text>
      </view>
    </view>

    <view v-if="applications.length" class="summary-row">
      <view class="summary-pill">
        <text class="summary-label">总申请数</text>
        <text class="summary-value">{{ applications.length }}</text>
      </view>
      <view class="summary-pill">
        <text class="summary-label">高评分</text>
        <text class="summary-value">{{ highRatingCount }}</text>
      </view>
      <view class="summary-pill">
        <text class="summary-label">平均评分</text>
        <text class="summary-value">{{ averageRating }}%</text>
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-title">正在加载申请列表</text>
      <text class="state-desc">稍等一下，正在同步这道题的申请信息。</text>
    </view>

    <view v-else-if="applications.length" class="application-list">
      <view
        v-for="application in applications"
        :key="application.applicantId"
        class="application-card"
      >
        <view class="user-entry" @click="navigateToUserDetail(application)">
          <image
            v-if="application.avatar"
            :src="application.avatar"
            class="avatar-image"
            mode="aspectFill"
          />
          <view v-else class="avatar-fallback">{{ getInitial(application.userName) }}</view>

          <view class="user-copy">
            <view class="user-top">
              <text class="username">{{ application.userName || "匿名用户" }}</text>
              <text class="rating-badge" :class="getRatingClass(application.ratingScore)">
                {{ formatRating(application.ratingScore) }}
              </text>
            </view>
            <text class="user-note">点一下可以查看对方的口碑、评价和合作记录。</text>
          </view>
        </view>

        <view
          class="accept-btn"
          :class="{ disabled: acceptingId === application.applicantId }"
          hover-class="accept-btn-hover"
          @click="acceptApplication(application)"
        >
          {{ acceptingId === application.applicantId ? "处理中..." : "接受申请" }}
        </view>
      </view>
    </view>

    <view v-else class="state-card">
      <text class="state-title">暂时还没有申请记录</text>
      <text class="state-desc">等有人申请回答这道题后，这里就会出现对应列表。</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { applyApi } from "@/api/apply";
import { BASE_URL } from "@/api/config";

const applications = ref([]);
const loading = ref(false);
const questionId = ref("");
const acceptingId = ref("");

const normalizeAvatar = (avatar) => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
  return `${BASE_URL}${avatar}`;
};

const formatRating = (value) => {
  if (value === undefined || value === null || value === "") return "暂无评分";
  return `${value}%`;
};

const getRatingClass = (value) => {
  const rating = Number(value || 0);
  if (rating >= 95) return "high";
  if (rating < 90) return "low";
  return "mid";
};

const getInitial = (name) => {
  const safeName = String(name || "").trim();
  return safeName ? safeName.slice(0, 1).toUpperCase() : "问";
};

const highRatingCount = computed(
  () => applications.value.filter((item) => Number(item.ratingScore || 0) >= 95).length
);

const averageRating = computed(() => {
  if (!applications.value.length) return 0;
  const total = applications.value.reduce((sum, item) => sum + Number(item.ratingScore || 0), 0);
  return Math.round(total / applications.value.length);
});

const loadApplications = async () => {
  if (!questionId.value) {
    uni.showToast({
      title: "未找到问题 ID",
      icon: "none",
    });
    return;
  }

  try {
    loading.value = true;
    const res = await applyApi.getQuestionApplicants(questionId.value);
    applications.value = (res.data.applicants || []).map((item) => ({
      ...item,
      avatar: normalizeAvatar(item.avatar),
    }));
  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

const acceptApplication = async (application) => {
  if (acceptingId.value) {
    uni.showToast({
      title: "正在处理申请，请稍候",
      icon: "none",
      duration: 2200,
    });
    return;
  }

  try {
    acceptingId.value = application.applicantId;
    await applyApi.acceptApplication(questionId.value, application.applicantId);

    uni.showToast({
      title: `已接受 ${application.userName || "该用户"} 的申请`,
      icon: "success",
      duration: 1800,
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 900);
  } catch (error) {
    uni.showToast({
      title: error.message || "操作失败",
      icon: "none",
    });
  } finally {
    acceptingId.value = "";
  }
};

const navigateToUserDetail = (application) => {
  uni.navigateTo({
    url: `/pages/profile/user-detail?userId=${application.applicantId}`,
  });
};

onLoad((options) => {
  questionId.value = options.questionId || "";
});

onShow(() => {
  loadApplications();
});
</script>

<style lang="scss" scoped>
.application-page {
  min-height: 100vh;
  padding: 24rpx;
}

.hero-card {
  display: flex;
  gap: 22rpx;
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background: var(--app-hero-overlay), var(--app-hero-gradient);
  border: 1rpx solid var(--app-card-border);
  color: var(--app-hero-text);
  box-shadow: var(--app-shadow-soft);
}

.hero-copy {
  flex: 1;
}

.hero-eyebrow {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: color-mix(in srgb, var(--app-hero-text) 84%, #ffffff);
  opacity: 1;
}

.hero-stat {
  width: 156rpx;
  min-height: 156rpx;
  border-radius: 30rpx;
  background: var(--app-surface-alt);
  border: 1rpx solid var(--app-card-border);
  backdrop-filter: blur(12rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hero-stat-value {
  font-size: 54rpx;
  font-weight: 700;
  line-height: 1;
}

.hero-stat-label {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: color-mix(in srgb, var(--app-hero-text) 80%, #ffffff);
}

.summary-row {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.summary-pill {
  flex: 1;
  padding: 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--app-shadow-card);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--app-ink-muted);
}

.summary-value {
  display: block;
  margin-top: 10rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.application-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 22rpx;
}

.application-card,
.state-card {
  padding: 28rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--app-shadow-card);
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.avatar-image,
.avatar-fallback {
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx;
  flex-shrink: 0;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb98e 0%, #ff8fa3 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.user-copy {
  flex: 1;
  min-width: 0;
}

.user-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.username {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.rating-badge {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.rating-badge.high {
  background: rgba(131, 208, 184, 0.16);
  color: #279979;
}

.rating-badge.mid {
  background: rgba(255, 191, 149, 0.2);
  color: #db7e3d;
}

.rating-badge.low {
  background: rgba(255, 127, 150, 0.14);
  color: var(--app-accent-strong);
}

.user-note {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--app-ink-soft);
}

.accept-btn {
  height: 84rpx;
  margin-top: 22rpx;
  border: none;
  outline: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  overflow: hidden;
}

.accept-btn-hover {
  opacity: 0.92;
}

.accept-btn.disabled {
  opacity: 0.7;
}

.state-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
  text-align: center;
}

.state-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
  text-align: center;
}
</style>
