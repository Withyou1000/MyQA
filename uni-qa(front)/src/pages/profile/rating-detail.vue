<template>
  <view class="rating-detail-page">
    <view v-if="loading" class="state-card">
      <text class="state-title">正在加载评价详情</text>
      <text class="state-desc">稍等一下，正在同步这条评价内容。</text>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-copy">
          <text class="hero-eyebrow">Rating Detail</text>
          <text class="hero-title">查看评价</text>
          <text class="hero-desc">
            这里会展示这次合作留下的评分、评价内容和补充图片。
          </text>
        </view>

        <view class="hero-badge">
          <text class="hero-badge-value">{{ ratingData.score || 0 }}/5</text>
          <text class="hero-badge-label">本次评分</text>
        </view>
      </view>

      <view class="panel-card">
        <view class="section-head">
          <text class="section-title">评分结果</text>
          <text class="section-subtitle">{{ formatTime(ratingData.createTime) }}</text>
        </view>

        <view class="score-card">
          <view class="stars-row">
            <text
              v-for="star in 5"
              :key="star"
              class="star"
              :class="{ filled: star <= (ratingData.score || 0) }"
            >
              ★
            </text>
          </view>
          <text class="score-text">{{ scoreHint }}</text>
        </view>
      </view>

      <view class="panel-card">
        <view class="section-head">
          <text class="section-title">评价内容</text>
          <text class="section-subtitle">对方留下的文字反馈</text>
        </view>

        <view class="content-card">
          <text class="content-text">
            {{ ratingData.content || "这条评价没有填写文字内容。" }}
          </text>
        </view>
      </view>

      <view v-if="ratingData.images.length" class="panel-card">
        <view class="section-head">
          <text class="section-title">评价图片</text>
          <text class="section-subtitle">点击图片可以查看大图</text>
        </view>

        <view class="image-grid">
          <image
            v-for="(image, index) in ratingData.images"
            :key="`${image}-${index}`"
            :src="image"
            class="rating-image"
            mode="aspectFill"
            @click="previewImage(index)"
          />
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getRatingDetail } from "@/api/ratings";
import { BASE_URL } from "@/api/config";

const loading = ref(true);
const ratingData = ref({
  score: 0,
  content: "",
  images: [],
  createTime: "",
});

const scoreHintMap = {
  1: "还有不少可以继续改进的地方",
  2: "基本解决了问题，但体验比较一般",
  3: "整体还不错，达到了预期",
  4: "体验很好，沟通也比较顺畅",
  5: "非常满意，是一次很舒服的合作",
};

const normalizeImage = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${BASE_URL}${value}`;
};

const scoreHint = computed(() => scoreHintMap[ratingData.value.score] || "暂无评分说明");

const formatTime = (time) => {
  if (!time) return "最近";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "最近";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};

const previewImage = (index) => {
  uni.previewImage({
    current: index,
    urls: ratingData.value.images,
  });
};

const fetchRatingDetail = async (questionId) => {
  try {
    loading.value = true;
    const res = await getRatingDetail(questionId);
    const data = res.data || {};

    ratingData.value = {
      score: Number(data.score || 0),
      content: data.content || "",
      images: Array.isArray(data.images) ? data.images.map((item) => normalizeImage(item)) : [],
      createTime: data.createTime || "",
    };
  } catch (error) {
    uni.showToast({
      title: error.message || "获取评价详情失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

onLoad((options) => {
  const questionId = options.questionId || "";

  if (!questionId) {
    loading.value = false;
    uni.showToast({
      title: "缺少评价记录",
      icon: "none",
    });
    return;
  }

  fetchRatingDetail(questionId);
});
</script>

<style lang="scss" scoped>
.rating-detail-page {
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
  background: rgba(255, 255, 255, 0.18);
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
  opacity: 0.92;
}

.hero-badge {
  width: 176rpx;
  min-height: 156rpx;
  border-radius: 30rpx;
  background: var(--app-surface-alt);
  backdrop-filter: blur(12rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hero-badge-value {
  font-size: 40rpx;
  font-weight: 700;
}

.hero-badge-label {
  margin-top: 12rpx;
  font-size: 22rpx;
}

.panel-card,
.state-card {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--app-surface);
  border: 1rpx solid var(--app-card-border);
  box-shadow: var(--app-shadow-card);
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.section-subtitle {
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--app-ink-soft);
}

.score-card,
.content-card {
  margin-top: 24rpx;
  padding: 26rpx 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
  border: 1rpx solid var(--app-line);
}

.stars-row {
  display: flex;
  justify-content: center;
  gap: 10rpx;
}

.star {
  font-size: 52rpx;
  color: color-mix(in srgb, var(--app-warning-text) 28%, transparent);
}

.star.filled {
  color: var(--app-warning-text);
}

.score-text {
  display: block;
  margin-top: 18rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--app-accent-strong);
}

.content-text {
  display: block;
  font-size: 28rpx;
  line-height: 1.8;
  color: var(--app-ink-soft);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 24rpx;
}

.rating-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 24rpx;
  background: var(--app-surface-soft);
}

.state-title {
  display: block;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.state-desc {
  display: block;
  margin-top: 14rpx;
  text-align: center;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-muted);
}
</style>
