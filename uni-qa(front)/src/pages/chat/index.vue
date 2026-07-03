<template>
  <view :class="['chat-page', 'prototype-page', themePageClass]">
    <PrototypeSubHeader title="问答会话" tone="mint" />
    <uni-popup ref="popup" type="center" :mask-click="true">
      <view class="popup-container">
        <view class="popup-content">
          <text class="popup-message">确认要采纳这个回答吗？</text>
          <view class="popup-buttons">
            <button
              class="confirm-btn"
              :class="{ 'is-disabled': acceptSubmitting }"
              :disabled="acceptSubmitting"
              @click="confirmAccept"
            >
              {{ acceptSubmitting ? "确认中..." : "确认采纳" }}
            </button>
            <button
              class="cancel-btn"
              :class="{ 'is-disabled': acceptSubmitting }"
              :disabled="acceptSubmitting"
              @click="cancelAccept"
            >
              暂不采纳
            </button>
          </view>
        </view>
      </view>
    </uni-popup>

    <view class="chat-container">
      <scroll-view
        class="message-area"
        scroll-y
        :scroll-top="scrollTop"
        :scroll-into-view="scrollIntoView"
        @scrolltoupper="loadMoreMessages"
      >
        <view
          v-for="(message, index) in messages"
          :id="`message-${index}`"
          :key="message.id || `${message.messageType}-${index}`"
          class="message-item"
          :class="{ 'message-mine': message.isMine }"
          @click="handleMessageClick(message)"
        >
          <template v-if="!message.isMine">
            <image :src="otherAvatar || defaultAvatar" class="message-avatar" mode="aspectFill" />
            <view class="message-content">
              <text v-if="isTextMessage(message)">{{ message.text }}</text>
              <image
                v-else-if="message.messageType === 'image'"
                :src="message.image"
                class="message-image"
                mode="widthFix"
                @tap.stop="previewImage(message.image)"
              />
            </view>
          </template>

          <template v-else>
            <view class="message-content">
              <text v-if="isTextMessage(message)">{{ message.text }}</text>
              <image
                v-else-if="message.messageType === 'image'"
                :src="message.image"
                class="message-image"
                mode="widthFix"
                @tap.stop="previewImage(message.image)"
              />
            </view>
            <image :src="userAvatar || defaultAvatar" class="message-avatar" mode="aspectFill" />
          </template>
        </view>
      </scroll-view>

      <view class="input-area">
        <view class="input-box">
          <input
            v-model="inputMessage"
            class="message-input"
            type="text"
            placeholder="输入消息..."
            :focus="inputFocus"
            @focus="handleInputFocus"
            @blur="handleInputBlur"
            @confirm="sendMessage"
          />

          <view class="plus-icon" @click="toggleActionButtons">
            <text>+</text>
          </view>

          <view class="send-btn" :class="{ active: inputMessage.trim() }" @click="sendMessage">
            <text>发送</text>
          </view>
        </view>

        <view v-if="showActionButtons" class="action-buttons">
          <view class="action-button" @click="handleCall">
            <view class="button-icon">话</view>
            <text>语音</text>
          </view>
          <view class="action-button" @click="handleVideo">
            <view class="button-icon">视</view>
            <text>视频</text>
          </view>
          <view class="action-button" @click="handleShare">
            <view class="button-icon">享</view>
            <text>分享</text>
          </view>
          <view class="action-button" @click="handleChooseImage">
            <view class="button-icon">图</view>
            <text>图片</text>
          </view>
          <view v-if="questionStatus === 'answering'" class="action-button" @click="handleAdopt">
            <view class="button-icon">采</view>
            <text>{{ isAsker ? "采纳回答" : "申请采纳" }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { nextTick, onMounted, ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import uniPopup from "@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue";
import { applyApi } from "@/api/apply";
import { BASE_URL } from "@/api/config";
import { chatApi } from "@/api/chat";
import { commonApi } from "@/api/common";
import { questionApi } from "@/api/question";

const defaultAvatar = "/static/default-avatar.webp";

const inputMessage = ref("");
const inputFocus = ref(false);
const showActionButtons = ref(false);
const scrollTop = ref(0);
const scrollIntoView = ref("");
const title = ref("聊天");
const isAsker = ref(false);
const questionStatus = ref("");
const questionId = ref("");
const popup = ref(null);
const userAvatar = ref("");
const otherAvatar = ref("");
const messages = ref([]);
const acceptSubmitting = ref(false);

let socketMessageHandler = null;
let scrollTimer = null;
let scrollRetryTimer = null;

const normalizeAvatarUrl = (value, fallback = defaultAvatar) => {
  if (!value) return fallback;
  const safeValue = String(value);
  if (safeValue.startsWith("http://") || safeValue.startsWith("https://")) {
    return safeValue;
  }
  return `${BASE_URL}${safeValue}`;
};

const normalizeImageUrl = (value) => {
  if (!value) return "";
  const safeValue = String(value);
  if (safeValue.startsWith("http://") || safeValue.startsWith("https://") || safeValue.startsWith("blob:")) {
    return safeValue;
  }
  return `${BASE_URL}${safeValue}`;
};

const normalizeMessage = (message = {}) => ({
  id: message.messageId || message.id || `${message.messageType || "text"}-${message.createTime || Date.now()}`,
  text: message.text || message.content || message.message || "",
  image: normalizeImageUrl(message.image),
  messageType: message.messageType || (message.image ? "image" : "text"),
  createTime: message.createTime || message.createdAt || "",
  isMine: Boolean(message.isMine),
  senderType: message.senderType || (message.isMine ? "user" : "other"),
});

const isTextMessage = (message) => message?.messageType !== "image";

const updateNavigationTitle = () => {
  uni.setNavigationBarTitle({
    title: title.value || "聊天",
  });
};

const clearScrollTimers = () => {
  if (scrollTimer) clearTimeout(scrollTimer);
  if (scrollRetryTimer) clearTimeout(scrollRetryTimer);
  scrollTimer = null;
  scrollRetryTimer = null;
};

const scrollToBottom = async () => {
  await nextTick();
  if (!messages.value.length) return;

  const targetId = `message-${messages.value.length - 1}`;
  clearScrollTimers();
  scrollIntoView.value = "";

  // scroll-view 有时需要下一帧才能拿到新节点，所以这里做一次延迟和一次兜底重试。
  scrollTimer = setTimeout(() => {
    scrollIntoView.value = targetId;
    scrollTop.value = Number.MAX_SAFE_INTEGER;
  }, 40);

  scrollRetryTimer = setTimeout(() => {
    scrollIntoView.value = targetId;
    scrollTop.value = Number.MAX_SAFE_INTEGER;
  }, 180);
};

const appendLocalMessage = async (payload) => {
  messages.value.push(normalizeMessage({ ...payload, isMine: true }));
  await scrollToBottom();
};

const appendIncomingMessage = async (payload) => {
  const normalized = normalizeMessage({ ...payload, isMine: false });
  if (normalized.id && messages.value.some((item) => String(item.id) === String(normalized.id))) {
    return;
  }
  messages.value.push(normalized);
  await scrollToBottom();
};

const setupSocketListener = () => {
  if (socketMessageHandler) return;

  socketMessageHandler = async (data) => {
    if (data.type !== "message_received") return;
    if (!data.questionId || String(data.questionId) !== String(questionId.value)) {
      return;
    }

    await appendIncomingMessage(data);
  };

  uni.$on("socketMessage", socketMessageHandler);
};

const cleanupSocketListener = () => {
  if (!socketMessageHandler) return;
  uni.$off("socketMessage", socketMessageHandler);
  socketMessageHandler = null;
};

const loadQuestionChat = async (userInfo) => {
  userAvatar.value = normalizeAvatarUrl(userInfo.avatar, defaultAvatar);

  try {
    const statusRes = await questionApi.getQuestionStatus(questionId.value);
    questionStatus.value = statusRes.data?.status || "";
  } catch (error) {
    // 状态只影响采纳入口，失败时仍允许聊天记录正常加载。
    console.error("获取问题状态失败:", error);
  }

  const res = await chatApi.getQuestionChat(questionId.value);
  title.value = res.data?.title || "聊天";
  isAsker.value = Boolean(res.data?.isAsker);
  otherAvatar.value = normalizeAvatarUrl(res.data?.otherAvatar, defaultAvatar);
  messages.value = (res.data?.chatMessages || []).map(normalizeMessage);

  updateNavigationTitle();
  await scrollToBottom();
};

onLoad(async (options) => {
  const userInfo = uni.getStorageSync("userInfo") || {};
  questionId.value = options.questionId || "";

  if (!questionId.value) {
    uni.showToast({
      title: "缺少会话参数",
      icon: "none",
    });
    return;
  }

  await loadQuestionChat(userInfo);
});

onMounted(() => {
  setupSocketListener();
});

onUnload(() => {
  cleanupSocketListener();
  clearScrollTimers();
});

const toggleActionButtons = () => {
  showActionButtons.value = !showActionButtons.value;
  if (showActionButtons.value) {
    inputFocus.value = false;
  }
};

const handleInputFocus = () => {
  inputFocus.value = true;
  showActionButtons.value = false;
  scrollToBottom();
};

const handleInputBlur = () => {
  inputFocus.value = false;
};

const loadMoreMessages = () => {};

const handleCall = () => {
  uni.showToast({ title: "暂未开放语音功能", icon: "none" });
};

const handleVideo = () => {
  uni.showToast({ title: "暂未开放视频功能", icon: "none" });
};

const handleShare = () => {
  uni.showToast({ title: "暂未开放分享功能", icon: "none" });
};

const handleChooseImage = async () => {
  try {
    const res = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 9,
        sizeType: ["original", "compressed"],
        sourceType: ["album", "camera"],
        success: resolve,
        fail: reject,
      });
    });

    const tempFilePaths = res.tempFilePaths || [];
    if (!tempFilePaths.length) return;

    tempFilePaths.forEach((path) => {
      messages.value.push(
        normalizeMessage({
          image: path,
          messageType: "image",
          isMine: true,
          senderType: "user",
        })
      );
    });
    await scrollToBottom();

    for (const path of tempFilePaths) {
      try {
        const uploadRes = await commonApi.uploadImage(path, "chat");
        await chatApi.sendChatMessage(questionId.value, {
          image: uploadRes.data,
          messageType: "image",
        });
      } catch (error) {
        console.error("图片上传失败:", error);
        uni.showToast({ title: "图片上传失败", icon: "none" });
      }
    }
  } catch (error) {
    console.error("选择图片失败:", error);
  }
};

const previewImage = (url) => {
  if (!url) return;
  uni.previewImage({
    urls: [url],
    current: url,
  });
};

const sendMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text) return;

  inputMessage.value = "";

  try {
    await chatApi.sendChatMessage(questionId.value, {
      text,
      messageType: "text",
    });
    await appendLocalMessage({
      text,
      messageType: "text",
      senderType: "user",
    });
  } catch (error) {
    console.error("发送消息失败:", error);
    uni.showToast({ title: error.message || "发送失败", icon: "none" });
  }
};

const handleAdopt = async () => {
  if (questionStatus.value !== "answering") {
    uni.showToast({ title: "当前状态不可采纳", icon: "none" });
    return;
  }

  if (isAsker.value) {
    popup.value?.open?.();
    return;
  }

  try {
    const userInfo = uni.getStorageSync("userInfo") || {};
    await applyApi.applyAcceptAnswer(questionId.value, userInfo.name || userInfo.account || "回答者");

    const systemMessage = "我想申请你采纳当前回答。";
    await chatApi.sendChatMessage(questionId.value, {
      text: systemMessage,
      messageType: "apply_system",
    });

    await appendLocalMessage({
      text: systemMessage,
      messageType: "apply_system",
    });

    uni.showToast({ title: "申请已发送", icon: "success" });
  } catch (error) {
    console.error("申请采纳失败:", error);
    uni.showToast({ title: error.message || "申请采纳失败", icon: "none" });
  }
};

const handleRefundMessageClick = () => {
  uni.navigateTo({
    url: `/pages/profile/refund-detail?questionId=${questionId.value}`,
  });
};

const handleMessageClick = (message) => {
  if (message.messageType === "refund_system") {
    handleRefundMessageClick();
    return;
  }

  if (!isAsker.value || message.isMine) return;

  if (message.messageType === "apply_system" && questionStatus.value !== "accepted") {
    popup.value?.open?.();
  }
};

const confirmAccept = async () => {
  if (acceptSubmitting.value) return;

  acceptSubmitting.value = true;
  try {
    await applyApi.acceptAnswer(questionId.value, true);
    await applyApi.markApplyAcceptAsFinished(questionId.value);

    const text = "我已采纳你的回答。";
    await chatApi.sendChatMessage(questionId.value, {
      text,
      messageType: "apply_system",
    });

    questionStatus.value = "accepted";
    popup.value?.close?.();
    await appendLocalMessage({
      text,
      messageType: "apply_system",
    });
    uni.showToast({ title: "已采纳", icon: "success" });
  } catch (error) {
    console.error("采纳失败:", error);
    uni.showToast({ title: error.message || "采纳失败", icon: "none" });
  } finally {
    acceptSubmitting.value = false;
  }
};

const cancelAccept = async () => {
  if (acceptSubmitting.value) return;

  acceptSubmitting.value = true;
  try {
    if (questionStatus.value === "rejected") {
      uni.showToast({ title: "您已拒绝采纳", icon: "none" });
      return;
    }
    await applyApi.acceptAnswer(questionId.value, false);
    await applyApi.markApplyAcceptAsFinished(questionId.value);

    const text = "这次我先不采纳。";
    await chatApi.sendChatMessage(questionId.value, {
      text,
      messageType: "apply_system",
    });

    questionStatus.value = "rejected";
    popup.value?.close?.();
    await appendLocalMessage({
      text,
      messageType: "apply_system",
    });
    uni.showToast({ title: "已处理申请", icon: "success" });
  } catch (error) {
    console.error("处理采纳失败:", error);
    uni.showToast({ title: error.message || "处理失败", icon: "none" });
  } finally {
    acceptSubmitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.popup-container {
  width: 560rpx;
  border-radius: 30rpx;
  overflow: hidden;
  background: var(--app-surface);
  box-shadow: 0 30rpx 80rpx rgba(60, 42, 63, 0.18);
}

.popup-content {
  padding: 36rpx 32rpx 30rpx;
}

.popup-message {
  display: block;
  margin-bottom: 28rpx;
  font-size: 30rpx;
  line-height: 1.6;
  color: var(--app-ink);
  text-align: center;
}

.popup-buttons {
  display: flex;
  gap: 18rpx;
}

.confirm-btn,
.cancel-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
}

.confirm-btn {
  background: var(--app-primary-gradient);
  color: #fff;
}

.confirm-btn.is-disabled,
.cancel-btn.is-disabled {
  opacity: 0.65;
}

.cancel-btn {
  background: var(--app-surface-soft);
  color: var(--app-accent-strong);
}

.chat-container {
  min-height: 100vh;
  background: var(--app-page-bg);
}

.message-area {
  height: 100vh;
  padding: 30rpx 0 220rpx;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin: 0 30rpx 24rpx;
}

.message-mine {
  justify-content: flex-end;
}

.message-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  flex-shrink: 0;
  box-shadow: 0 8rpx 18rpx rgba(206, 159, 146, 0.18);
}

.message-content {
  max-width: 65%;
  padding: 18rpx 22rpx;
  border-radius: 12rpx 24rpx 24rpx 24rpx;
  background: var(--app-surface);
  color: var(--app-ink);
  font-size: 28rpx;
  line-height: 1.6;
  word-break: break-all;
  box-shadow: 0 12rpx 24rpx rgba(215, 171, 159, 0.12);
}

.message-mine .message-content {
  border-radius: 24rpx 12rpx 24rpx 24rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  box-shadow: var(--app-primary-shadow);
}

.message-image {
  max-width: 400rpx;
  border-radius: 18rpx;
}

.input-area {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom) + 24rpx);
  border-top: 1px solid rgba(255, 166, 156, 0.18);
  background: var(--app-surface);
  backdrop-filter: blur(18rpx);
}

.input-box {
  display: flex;
  align-items: center;
  padding: 0 18rpx 0 16rpx;
  border-radius: 999rpx;
  background: var(--app-input-bg);
}

.message-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: var(--app-ink);
}

.plus-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 127, 150, 0.08);
  color: var(--app-accent-strong);
  font-size: 40rpx;
}

.send-btn {
  min-width: 100rpx;
  height: 56rpx;
  margin-left: 10rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-ink-muted);
  font-size: 28rpx;
}

.send-btn.active {
  color: #fff;
  background: var(--app-primary-gradient);
  box-shadow: var(--app-primary-shadow);
}

.action-buttons {
  display: flex;
  justify-content: space-around;
  padding: 34rpx 28rpx 12rpx;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.button-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-input-bg);
  color: var(--app-accent-strong);
  font-size: 36rpx;
  box-shadow: 0 10rpx 20rpx rgba(228, 171, 154, 0.14);
}

.action-button text {
  font-size: 24rpx;
  color: var(--app-ink-soft);
}
</style>
