<template>
  <view class="prototype-subhead" :class="`tone-${tone}`">
    <view class="mock-status">
      <text>9:41</text>
      <view class="status-icons">
        <view class="signal-bars"><text></text><text></text><text></text></view>
        <view class="wifi-dot"></view>
        <view class="battery"></view>
      </view>
    </view>

    <view class="prototype-topbar">
      <view v-if="showBack" class="round-icon-button" @click="handleBack">
        <image class="icon-svg" src="/static/images/ui-back.svg" mode="aspectFit" />
      </view>
      <view v-else class="topbar-spacer"></view>

      <text class="prototype-title">{{ title }}</text>

      <view v-if="rightIcon" class="round-icon-button" @click="$emit('right')">
        <image class="icon-svg" :src="rightIconSrc" mode="aspectFit" />
      </view>
      <view v-else-if="rightText" class="subhead-pill" @click="$emit('right')">{{ rightText }}</view>
      <view v-else class="topbar-spacer"></view>
    </view>
  </view>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    default: "MyQA",
  },
  tone: {
    type: String,
    default: "mint",
  },
  showBack: {
    type: Boolean,
    default: true,
  },
  rightIcon: {
    type: String,
    default: "",
  },
  rightText: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["back", "right"]);

const iconMap = {
  bell: "/static/images/ui-bell.svg",
  bag: "/static/images/ui-bag.svg",
};

const rightIconSrc = computed(() => iconMap[props.rightIcon] || props.rightIcon);

const handleBack = () => {
  emit("back");
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }

  uni.reLaunch({ url: "/pages/index/index" });
};
</script>

<style lang="scss" scoped>
.prototype-subhead {
  position: relative;
  z-index: 2;
  margin-bottom: 22rpx;
}

.prototype-subhead::before {
  content: "";
  position: absolute;
  left: -24rpx;
  right: -24rpx;
  top: -22rpx;
  height: 220rpx;
  z-index: -1;
  border-bottom: 3rpx solid rgba(43, 37, 40, 0.12);
  border-radius: 0 0 42rpx 42rpx;
  background: linear-gradient(180deg, rgba(180, 224, 194, 0.92), rgba(255, 250, 235, 0));
}

.tone-coral::before {
  background: linear-gradient(180deg, rgba(249, 158, 148, 0.88), rgba(255, 250, 235, 0));
}

.tone-lavender::before {
  background: linear-gradient(180deg, rgba(205, 181, 225, 0.9), rgba(255, 250, 235, 0));
}

.tone-yellow::before {
  background: linear-gradient(180deg, rgba(255, 221, 132, 0.92), rgba(255, 250, 235, 0));
}

.topbar-spacer {
  width: 76rpx;
  height: 76rpx;
}

.subhead-pill {
  min-width: 76rpx;
  height: 58rpx;
  padding: 0 18rpx;
  border: 3rpx solid var(--qa-ink, #2b2528);
  border-radius: 999rpx;
  background: rgba(255, 253, 246, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qa-ink, #2b2528);
  font-size: 22rpx;
  font-weight: 900;
  box-shadow: 4rpx 5rpx 0 rgba(43, 37, 40, 0.1);
}

.subhead-pill:active,
.round-icon-button:active {
  transform: scale(0.96);
}
</style>
