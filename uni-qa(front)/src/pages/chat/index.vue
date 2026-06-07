<template>
  <view :class="['chat-page', themePageClass]">
  <uni-popup ref="popup" type="center" :mask-click="true">
    <view class="popup-container">
      <view class="popup-content">
        <text class="popup-message">确定要采纳这个回答吗？</text>
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

  <uni-popup ref="transactionPopup" type="bottom" :mask-click="true">
    <view class="transaction-popup">
      <view class="transaction-sheet">
        <view class="transaction-sheet-head">
          <text class="transaction-sheet-title">选择一笔交易发给客服</text>
          <text class="transaction-sheet-desc">客服收到后可以查看问题详情、聊天记录和退款记录。</text>
        </view>

        <view v-if="transactionsLoading" class="transaction-state">
          <text>正在加载最近交易...</text>
        </view>

        <view v-else-if="recentTransactions.length" class="transaction-list">
          <view v-for="item in recentTransactions" :key="item.questionId" class="transaction-card"
            @click="sendTransactionCard(item)">
            <view class="transaction-card-top">
              <text class="transaction-role">{{ formatTransactionRole(item.role) }}</text>
              <text class="transaction-status">{{ formatTransactionStatus(item.status) }}</text>
            </view>
            <text class="transaction-title">{{ item.title || "未命名问题" }}</text>
            <view class="transaction-meta">
              <text>{{ item.topic || "未分类" }}</text>
              <text>￥{{ item.reward || 0 }}</text>
            </view>
            <view class="transaction-other">
              <text>对方：{{ item.otherUser?.name || "匿名用户" }}</text>
              <text v-if="item.refund">退款：{{ formatRefundStatus(item.refund.status) }}</text>
            </view>
          </view>
        </view>

        <view v-else class="transaction-state">
          <text>最近还没有可发送的交易记录</text>
        </view>
      </view>
    </view>
  </uni-popup>

  <view class="chat-container">
    <scroll-view class="message-area" scroll-y :scroll-top="scrollTop" :scroll-into-view="scrollIntoView"
      @scrolltoupper="loadMoreMessages">
      <view v-for="(message, index) in messages" :id="`message-${index}`"
        :key="message.id || `${message.messageType}-${index}`" class="message-item" :class="{
          'message-mine': message.isMine && !isSystemMessage(message),
          'system-message-mine': message.isMine && isSystemMessage(message),
        }" @click="handleSystemMessageClick(message)">
        <template v-if="isSystemMessage(message)">
          <template v-if="!message.isMine">
            <image :src="otherAvatar || defaultAvatar" class="message-avatar" mode="aspectFill" />
            <view v-if="message.messageType === 'refund_system'" class="message-content refund-message">
              <text class="refund-title">{{ getRefundParts(message.text).title }}</text>
              <text class="refund-content">{{ getRefundParts(message.text).content }}</text>
            </view>
            <view v-else-if="message.messageType === 'apply_system'" class="message-content apply-message">
              <view class="apply-message-head">
                <text class="apply-message-badge">{{ getApplyMeta(message).badge }}</text>
                <text v-if="getApplyMeta(message).action" class="apply-message-action">{{ getApplyMeta(message).action }}</text>
              </view>
              <text class="apply-message-title">{{ getApplyMeta(message).title }}</text>
              <text class="apply-message-content">{{ message.text }}</text>
            </view>
            <view v-else class="message-content system-message">
              <text>{{ message.text }}</text>
            </view>
          </template>

          <template v-else>
            <view v-if="message.messageType === 'refund_system'" class="message-content refund-message">
              <text class="refund-title">{{ getRefundParts(message.text).title }}</text>
              <text class="refund-content">{{ getRefundParts(message.text).content }}</text>
            </view>
            <view v-else-if="message.messageType === 'apply_system'" class="message-content apply-message">
              <view class="apply-message-head">
                <text class="apply-message-badge">{{ getApplyMeta(message).badge }}</text>
                <text v-if="getApplyMeta(message).action" class="apply-message-action">{{ getApplyMeta(message).action }}</text>
              </view>
              <text class="apply-message-title">{{ getApplyMeta(message).title }}</text>
              <text class="apply-message-content">{{ message.text }}</text>
            </view>
            <view v-else class="message-content system-message">
              <text>{{ message.text }}</text>
            </view>
            <image :src="userAvatar || defaultAvatar" class="message-avatar" mode="aspectFill" />
          </template>
        </template>

        <template v-else>
          <template v-if="!message.isMine">
            <image :src="otherAvatar || defaultAvatar" class="message-avatar" mode="aspectFill" />
            <view class="message-content" :class="{ 'transaction-wrap': message.messageType === 'transaction' }">
              <text v-if="message.messageType === 'text'">{{ message.text }}</text>
              <view v-else-if="message.messageType === 'transaction'" class="transaction-message">
                <text class="transaction-badge">交易咨询</text>
                <text class="transaction-message-title">
                  {{ message.transactionInfo?.title || "未命名问题" }}
                </text>
                <text class="transaction-message-meta">
                  {{ message.transactionInfo?.topic || "未分类" }} · ￥{{ message.transactionInfo?.reward || 0 }}
                </text>
                <text class="transaction-message-tip">点击查看交易详情</text>
              </view>
              <image v-else-if="message.messageType === 'image'" :src="message.image" class="message-image"
                mode="widthFix" @tap.stop="previewImage(message.image)" />
            </view>
          </template>

          <template v-else>
            <view class="message-content" :class="{ 'transaction-wrap': message.messageType === 'transaction' }">
              <text v-if="message.messageType === 'text'">{{ message.text }}</text>
              <view v-else-if="message.messageType === 'transaction'" class="transaction-message">
                <text class="transaction-badge">交易咨询</text>
                <text class="transaction-message-title">
                  {{ message.transactionInfo?.title || "未命名问题" }}
                </text>
                <text class="transaction-message-meta">
                  {{ message.transactionInfo?.topic || "未分类" }} · ￥{{ message.transactionInfo?.reward || 0 }}
                </text>
                <text class="transaction-message-tip">点击查看交易详情</text>
              </view>
              <image v-else-if="message.messageType === 'image'" :src="message.image" class="message-image"
                mode="widthFix" @tap.stop="previewImage(message.image)" />
            </view>
            <image :src="userAvatar || defaultAvatar" class="message-avatar" mode="aspectFill" />
          </template>
        </template>
      </view>
    </scroll-view>

    <view class="input-area">
      <view class="input-box">
        <input v-model="inputMessage" class="message-input" type="text" placeholder="输入消息..." :focus="inputFocus"
          @focus="handleInputFocus" @blur="handleInputBlur" @confirm="sendMessage" />

        <view class="plus-icon" @click="toggleActionButtons">
          <text>+</text>
        </view>

        <view class="send-btn" :class="{ active: inputMessage.trim() }" @click="sendMessage">
          <text>发送</text>
        </view>
      </view>

      <view v-if="showActionButtons" class="action-buttons">
        <template v-if="isCustomerService">
          <view class="action-button" @click="handleChooseImage">
            <view class="button-icon">图</view>
            <text>图片</text>
          </view>
          <view v-if="!isSelfCustomerService" class="action-button" @click="handleTransaction">
            <view class="button-icon">单</view>
            <text>交易</text>
          </view>
          <view v-if="isSelfCustomerService" class="action-button" @click="handleEndSession">
            <view class="button-icon">停</view>
            <text>结束会话</text>
          </view>
          <view v-else class="action-button" @click="handleContactService">
            <view class="button-icon">服</view>
            <text>人工客服</text>
          </view>
        </template>

        <template v-else>
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
            <text>共享</text>
          </view>
          <view class="action-button" @click="handleChooseImage">
            <view class="button-icon">图</view>
            <text>图片</text>
          </view>
          <view v-if="questionStatus === 'answering'" class="action-button" @click="handleAdopt">
            <view class="button-icon">采</view>
            <text>{{ isAsker ? "采纳回答" : "申请采纳" }}</text>
          </view>
        </template>
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
import { customerServiceApi } from "@/api/customer-service";

const defaultAvatar = "/static/default-avatar.webp";
const serviceAvatar = "/static/client.webp";

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
const transactionPopup = ref(null);
const userAvatar = ref("");
const otherAvatar = ref("");
const sessionId = ref("");
const customerId = ref("");
const messages = ref([]);
const isCustomerService = ref(false);
const isSelfCustomerService = ref(false);
const recentTransactions = ref([]);
const transactionsLoading = ref(false);
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


const normalizeMessage = (message = {}) => ({
  id: message.messageId || message.id || `${message.messageType || "text"}-${message.createTime || Date.now()}`,
  text: message.text || message.content || message.message || "",
  image: `${BASE_URL}${message.image}` || "",
  messageType: message.messageType || (message.image ? "image" : "text"),
  createTime: message.createTime || message.createdAt || "",
  isMine: Boolean(message.isMine),
  transactionInfo: message.transactionInfo
    ? {
      ...message.transactionInfo,
      otherUser: message.transactionInfo.otherUser
        ? {
          ...message.transactionInfo.otherUser,
          avatar: `${BASE_URL}${message.transactionInfo.otherUser.avatar || ""}`,
        }
        : null,
    }
    : null,
});

const isSystemMessage = (message) =>
  message.messageType === "apply_system" || message.messageType === "refund_system";

const getRefundParts = (text) => {
  const [refundTitle = "退款消息", refundContent = ""] = String(text || "").split("&");
  return {
    title: refundTitle,
    content: refundContent,
  };
};

const formatTransactionRole = (role) => (role === "asker" ? "我的提问" : "我的回答");

const getApplyMeta = (message = {}) => {
  const text = String(message.text || "");
  const isPendingApply = text.includes("申请");
  const isAccepted = text.includes("已采纳");
  const isRejected = text.includes("不采纳");
  const canHandle = !message.isMine && isAsker.value && questionStatus.value !== "accepted";

  let badge = "系统通知";
  let title = "问答状态有了新变化";

  if (isPendingApply) {
    badge = "采纳申请";
    title = canHandle ? "对方向你发起了采纳申请" : "申请消息已经送达对方";
  } else if (isAccepted) {
    badge = "已采纳";
    title = "这条回答已经被采纳";
  } else if (isRejected) {
    badge = "未采纳";
    title = "这次申请暂时没有通过";
  }

  return {
    badge,
    title,
    action: canHandle ? "点击处理" : "",
  };
};

const formatTransactionStatus = (status) => {
  const statusMap = {
    answering: "进行中",
    accepted: "已采纳",
    rated: "已评价",
    refunding: "退款中",
    refunded: "已退款",
    rejected: "已拒绝",
    pending: "待处理",
  };
  return statusMap[status] || "处理中";
};

const formatRefundStatus = (status) => {
  const statusMap = {
    pending: "待处理",
    refunded: "已同意",
    rejected: "已拒绝",
  };
  return statusMap[status] || "处理中";
};

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
  const nextMessage = normalizeMessage({ ...payload, isMine: false });
  messages.value.push(nextMessage);
  await scrollToBottom();
};

const setupSocketListener = () => {
  if (socketMessageHandler) return;

  socketMessageHandler = async (data) => {
    if (data.type === "message_received") {
      if (isCustomerService.value) {
        await appendIncomingMessage(data);
        return;
      }

      if (!data.questionId || String(data.questionId) !== String(questionId.value)) {
        return;
      }

      await appendIncomingMessage(data);
      return;
    }

    if (data.type === "notify" && isCustomerService.value) {
      const sameSession = !data.sessionId || !sessionId.value || String(data.sessionId) === String(sessionId.value);
      if (!sameSession) return;

      await appendIncomingMessage({
        id: data.messageId,
        messageType: "text",
        text: data.message,
      });
    }
  };

  uni.$on("socketMessage", socketMessageHandler);
};

const cleanupSocketListener = () => {
  if (!socketMessageHandler) return;
  uni.$off("socketMessage", socketMessageHandler);
  socketMessageHandler = null;
};

const loadCustomerServiceChat = async (userInfo) => {
  const res = await customerServiceApi.getCustomerChat(customerId.value);
  const customerInfo = res.data?.customerInfo || {};

  isSelfCustomerService.value = userInfo.role === "customer_service";
  userAvatar.value = isSelfCustomerService.value
    ? normalizeAvatarUrl(userInfo.avatar, serviceAvatar)
    : normalizeAvatarUrl(userInfo.avatar, defaultAvatar);
  otherAvatar.value = isSelfCustomerService.value
    ? normalizeAvatarUrl(customerInfo.avatar, defaultAvatar)
    : serviceAvatar;
  title.value = customerInfo.name || (userInfo.role === "customer_service" ? "用户咨询" : "人工客服");
  messages.value = (res.data?.messages || []).map(normalizeMessage);

  updateNavigationTitle();

  if (userInfo.role === "customer_service" && sessionId.value) {
    customerServiceApi.markAsRead(sessionId.value).catch(() => { });
  }

  await scrollToBottom();
};

const loadQuestionChat = async (userInfo) => {
  userAvatar.value = normalizeAvatarUrl(userInfo.avatar, defaultAvatar);

  try {
    const statusRes = await questionApi.getQuestionStatus(questionId.value);
    questionStatus.value = statusRes.data?.status || "";
  } catch (error) {
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

  if (options.type === "customer_service") {
    isCustomerService.value = true;
    customerId.value = options.customerId || "";
    sessionId.value = options.sessionId || "";
    await loadCustomerServiceChat(userInfo);
    return;
  }

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

const loadMoreMessages = () => { };

const handleCall = () => {
  uni.showToast({ title: "暂未开放语音功能", icon: "none" });
};

const handleVideo = () => {
  uni.showToast({ title: "暂未开放视频功能", icon: "none" });
};

const handleShare = () => {
  uni.showToast({ title: "暂未开放共享功能", icon: "none" });
};

const loadRecentTransactions = async () => {
  try {
    transactionsLoading.value = true;
    const res = await customerServiceApi.getRecentTransactions();
    recentTransactions.value = (res.data || []).map((item) => ({
      ...item,
      otherUser: item.otherUser
        ? {
          ...item.otherUser,
          avatar: `${BASE_URL}${item.otherUser.avatar || ""}`,
        }
        : null,
    }));
  } catch (error) {
    uni.showToast({ title: error.message || "加载交易失败", icon: "none" });
  } finally {
    transactionsLoading.value = false;
  }
};

const handleTransaction = async () => {
  if (isSelfCustomerService.value) {
    uni.showToast({ title: "客服端无需发送交易", icon: "none" });
    return;
  }

  showActionButtons.value = false;
  await loadRecentTransactions();
  transactionPopup.value?.open?.();
};

const openTransactionDetail = (targetQuestionId) => {
  if (!targetQuestionId) return;
  uni.navigateTo({
    url: `/pages/customer-service/transaction-detail?questionId=${targetQuestionId}`,
  });
};

const sendTransactionCard = async (item) => {
  try {
    await customerServiceApi.sendMessage(customerId.value, {
      text: `交易咨询：${item.title || "未命名问题"}`,
      messageType: "transaction",
      transactionInfo: item,
    });

    transactionPopup.value?.close?.();
    await appendLocalMessage({
      text: `交易咨询：${item.title || "未命名问题"}`,
      messageType: "transaction",
      transactionInfo: item,
    });
    uni.showToast({ title: "交易已发送给客服", icon: "success" });
  } catch (error) {
    uni.showToast({ title: error.message || "发送交易失败", icon: "none" });
  }
};

const handleContactService = async () => {
  try {
    const res = await customerServiceApi.requestService();
    if (res.code !== 200) {
      uni.showToast({ title: res.message || "申请客服失败", icon: "none" });
      return;
    }

    const serviceMessage = "已为你提交人工客服请求，请稍等。";
    await customerServiceApi.sendMessage(customerId.value, {
      text: serviceMessage,
      messageType: "text",
    });
    await appendLocalMessage({
      text: serviceMessage,
      messageType: "text",
    });
  } catch (error) {
    console.error("申请客服失败:", error);
    uni.showToast({ title: error.message || "申请客服失败", icon: "none" });
  }
};

const handleEndSession = async () => {
  uni.showModal({
    title: "结束会话",
    content: "确认结束当前客服会话吗？",
    success: async (res) => {
      if (!res.confirm) return;

      try {
        const result = await customerServiceApi.endSession(sessionId.value, customerId.value);
        if (result.code !== 200) {
          uni.showToast({ title: result.message || "结束会话失败", icon: "none" });
          return;
        }

        uni.showToast({ title: "会话已结束", icon: "success" });
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/customer-service/index",
          });
        }, 1200);
      } catch (error) {
        console.error("结束会话失败:", error);
        uni.showToast({ title: "结束会话失败", icon: "none" });
      }
    },
  });
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
        {
          image: path,
          messageType: "image",
          isMine: true,
        }
      );
    });
    await scrollToBottom();

    for (const path of tempFilePaths) {
      try {
        const uploadRes = await commonApi.uploadImage(path, "chat");
        const image = uploadRes.data;

        if (isCustomerService.value) {
          await customerServiceApi.sendMessage(customerId.value, {
            image,
            messageType: "image",
          });
        } else {
          await chatApi.sendChatMessage(questionId.value, {
            image,
            messageType: "image",
          });
        }
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

  try {
    if (isCustomerService.value) {
      await customerServiceApi.sendMessage(customerId.value, {
        text,
        messageType: "text",
      });
    } else {
      await chatApi.sendChatMessage(questionId.value, {
        text,
        messageType: "text",
      });
    }

    inputMessage.value = "";
    await appendLocalMessage({
      text,
      messageType: "text",
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

const handleSystemMessageClick = (message) => {
  if (message.messageType === "transaction") {
    openTransactionDetail(message.transactionInfo?.questionId);
    return;
  }

  if (message.messageType === "refund_system" ) {
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
    if(questionStatus.value === "rejected") {
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

.transaction-popup {
  padding: 0 16rpx calc(env(safe-area-inset-bottom) + 16rpx);
}

.transaction-sheet {
  border-radius: 34rpx 34rpx 0 0;
  background: var(--app-surface);
  box-shadow: 0 -20rpx 60rpx rgba(60, 42, 63, 0.12);
  padding: 30rpx 26rpx 24rpx;
}

.transaction-sheet-head {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.transaction-sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.transaction-sheet-desc {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--app-ink-soft);
}

.transaction-state {
  padding: 70rpx 20rpx 50rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--app-ink-muted);
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 22rpx;
  max-height: 720rpx;
  overflow-y: auto;
}

.transaction-card {
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
}

.transaction-card-top,
.transaction-meta,
.transaction-other {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.transaction-role,
.transaction-status {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.transaction-role {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
}

.transaction-status {
  background: var(--app-warning-bg);
  color: var(--app-warning-text);
}

.transaction-title {
  display: block;
  margin-top: 14rpx;
  font-size: 30rpx;
  line-height: 1.6;
  font-weight: 600;
  color: var(--app-ink);
}

.transaction-meta,
.transaction-other {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--app-ink-soft);
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

.message-mine,
.system-message-mine {
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

.message-content.transaction-wrap {
  max-width: 74%;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.message-mine .message-content {
  border-radius: 24rpx 12rpx 24rpx 24rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  box-shadow: var(--app-primary-shadow);
}

.message-mine .message-content.transaction-wrap {
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.message-image {
  max-width: 400rpx;
  border-radius: 18rpx;
}

.transaction-message {
  width: 100%;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--app-input-bg);
  color: var(--app-ink);
  box-shadow: 0 12rpx 24rpx rgba(215, 171, 159, 0.12);
}

.message-mine .transaction-message {
  background: var(--app-surface);
  color: var(--app-ink);
}

.transaction-badge {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-size: 22rpx;
}

.transaction-message-title {
  display: block;
  margin-top: 14rpx;
  font-size: 30rpx;
  line-height: 1.6;
  font-weight: 700;
}

.transaction-message-meta,
.transaction-message-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--app-ink-soft);
}

.transaction-message-tip {
  color: var(--app-accent-strong);
}

.system-message {
  min-width: 220rpx;
  padding: 24rpx 32rpx;
  text-align: center;
  border-radius: 18rpx 24rpx 24rpx 24rpx;
  background: var(--app-primary-gradient);
  color: #fff;
  font-weight: 600;
}

.system-message-mine .system-message {
  border-radius: 24rpx 18rpx 24rpx 24rpx;
}

.refund-message {
  width: 80%;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--app-input-bg);
}

.apply-message {
  width: 80%;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--app-input-bg);
  border: 1rpx solid rgba(255, 147, 175, 0.2);
}

.apply-message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.apply-message-badge,
.apply-message-action {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.apply-message-badge {
  background: var(--app-accent-badge-bg);
  color: var(--app-accent-strong);
  font-weight: 600;
}

.apply-message-action {
  background: rgba(255, 180, 143, 0.18);
  color: #db7e3d;
}

.apply-message-title {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.5;
  color: var(--app-ink);
}

.apply-message-content {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--app-ink-soft);
}

.refund-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--app-ink);
}

.refund-content {
  display: block;
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--app-ink-soft);
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
