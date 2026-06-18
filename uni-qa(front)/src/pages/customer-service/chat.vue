<template>
  <view :class="['chat-page', themePageClass]">
    <uni-popup ref="transactionPopup" type="bottom" :mask-click="true">
      <view class="transaction-popup">
        <view class="transaction-sheet">
          <view class="transaction-sheet-head">
            <text class="transaction-sheet-title">选择一笔交易发送给客服</text>
            <text class="transaction-sheet-desc">客服收到后可以查看问题详情、聊天记录和退款记录。</text>
          </view>

          <view v-if="transactionsLoading" class="transaction-state">
            <text>正在加载最近交易...</text>
          </view>

          <view v-else-if="recentTransactions.length" class="transaction-list">
            <view
              v-for="item in recentTransactions"
              :key="item.questionId"
              class="transaction-card"
              :class="{
                'is-disabled': transactionSending,
                'is-sending': isTransactionSending(item),
              }"
              @click="sendTransactionCard(item)"
            >
              <view class="transaction-card-top">
                <text class="transaction-role">{{ formatTransactionRole(item.role) }}</text>
                <text class="transaction-status">
                  {{ isTransactionSending(item) ? "发送中" : formatTransactionStatus(item.status) }}
                </text>
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
          :class="{
            'message-mine': message.isMine,
          }"
          @click="handleMessageClick(message)"
        >
          <template v-if="!message.isMine">
            <image :src="resolveIncomingAvatar(message)" class="message-avatar" mode="aspectFill" />
            <view
              class="message-content"
              :class="{
                'transaction-wrap': message.messageType === 'transaction',
                'typing-message': message.messageType === 'typing_indicator',
              }"
            >
              <text v-if="isTextMessage(message)">{{ message.text }}</text>
              <view v-else-if="message.messageType === 'typing_indicator'" class="typing-indicator">
                <view class="typing-dot" />
                <view class="typing-dot" />
                <view class="typing-dot" />
              </view>
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
              <image
                v-else-if="message.messageType === 'image'"
                :src="message.image"
                class="message-image"
                mode="widthFix"
                @tap.stop="previewImage(message.image)"
              />
              <button
                v-if="shouldShowHandoffInline(message)"
                class="inline-handoff-btn"
                :disabled="handoffSubmitting"
                @click.stop="handleContactService"
              >
                {{ handoffSubmitting ? "提交中..." : "转人工客服" }}
              </button>
              <button
                v-if="shouldShowCancelHandoff(message)"
                class="inline-cancel-handoff-btn"
                :disabled="handoffCancelSubmitting"
                @click.stop="handleCancelHandoff"
              >
                {{ handoffCancelSubmitting ? "撤销中..." : "撤销转人工" }}
              </button>
            </view>
          </template>

          <template v-else>
            <view class="message-content" :class="{ 'transaction-wrap': message.messageType === 'transaction' }">
              <text v-if="isTextMessage(message)">{{ message.text }}</text>
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
            <view class="button-icon">人</view>
            <text>人工客服</text>
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
import { BASE_URL } from "@/api/config";
import { commonApi } from "@/api/common";
import { customerServiceApi } from "@/api/customer-service";

const defaultAvatar = "/static/default-avatar.webp";
const serviceAvatar = "/static/client.webp";

const inputMessage = ref("");
const inputFocus = ref(false);
const showActionButtons = ref(false);
const scrollTop = ref(0);
const scrollIntoView = ref("");
const title = ref("聊天");
const transactionPopup = ref(null);
const userAvatar = ref("");
const otherAvatar = ref("");
const sessionId = ref("");
const customerId = ref("");
const messages = ref([]);
const isSelfCustomerService = ref(false);
const recentTransactions = ref([]);
const transactionsLoading = ref(false);
const transactionSending = ref(false);
const transactionSendingId = ref("");
const handoffSubmitting = ref(false);
const handoffCancelSubmitting = ref(false);

let socketMessageHandler = null;
let scrollTimer = null;
let scrollRetryTimer = null;
let localMessageSeed = 0;

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
  senderType: message.senderType || (message.isMine ? "user" : "human_service"),
  extra: message.extra || null,
  localStatus: message.localStatus || "",
  clientRequestId: message.clientRequestId || "",
  transactionInfo: message.transactionInfo
    ? {
        ...message.transactionInfo,
        otherUser: message.transactionInfo.otherUser
          ? {
              ...message.transactionInfo.otherUser,
              avatar: normalizeImageUrl(message.transactionInfo.otherUser.avatar || ""),
            }
          : null,
      }
    : null,
});

const isAiMessage = (message) => message?.senderType === "ai";
const isTextMessage = (message) =>
  !["image", "transaction", "typing_indicator"].includes(message?.messageType);

const shouldShowHandoffInline = (message) =>
  !isSelfCustomerService.value &&
  isAiMessage(message) &&
  Boolean(message?.extra?.handoffSuggestion) &&
  !handoffSubmitting.value;

const getHandoffNoticeType = (message) => {
  const noticeType = message?.extra?.type || "";
  if (noticeType) return noticeType;
  if (message?.text === "人工客服已接入，请描述你的问题") return "handoff_accepted_notice";
  return "";
};

const getLatestHandoffNotice = () => {
  // 从后往前找最新的人工作业状态消息，避免“撤销后再次申请”时被旧状态影响。
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const message = messages.value[index];
    const noticeType = getHandoffNoticeType(message);
    if (
      noticeType === "handoff_pending_notice" ||
      noticeType === "handoff_cancelled_notice" ||
      noticeType === "handoff_accepted_notice"
    ) {
      return { message, noticeType };
    }
  }
  return null;
};

const isHandoffPendingActive = () =>
  getLatestHandoffNotice()?.noticeType === "handoff_pending_notice";

const shouldShowCancelHandoff = (message) => {
  const latestNotice = getLatestHandoffNotice();
  return (
    !isSelfCustomerService.value &&
    latestNotice?.noticeType === "handoff_pending_notice" &&
    String(latestNotice.message?.id) === String(message?.id)
  );
};

const formatTransactionRole = (role) => (role === "asker" ? "我的提问" : "我的回答");

const resolveCurrentUserId = (userInfo = {}) =>
  userInfo.userId || userInfo._id || userInfo.id || "";

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

const getTransactionKey = (item = {}) => String(item.questionId || item.id || "");

const isTransactionSending = (item) =>
  transactionSending.value && transactionSendingId.value === getTransactionKey(item);

const updateNavigationTitle = () => {
  uni.setNavigationBarTitle({
    title: title.value || "聊天",
  });
};

const resolveCustomerServiceTitle = () => {
  if (isSelfCustomerService.value) {
    return title.value || "用户咨询";
  }
  return "在线客服";
};

const resolveIncomingAvatar = (message) => {
  return otherAvatar.value || defaultAvatar;
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
  const normalized = normalizeMessage({ ...payload, isMine: false });
  if (normalized.id && messages.value.some((item) => String(item.id) === String(normalized.id))) {
    return;
  }
  messages.value.push(normalized);
  await scrollToBottom();
};

const appendServerMessages = async (payloads = []) => {
  let changed = false;

  payloads.forEach((payload) => {
    const normalized = normalizeMessage(payload);
    if (normalized.id && messages.value.some((item) => String(item.id) === String(normalized.id))) {
      return;
    }

    messages.value.push(normalized);
    changed = true;
  });

  if (changed) {
    await scrollToBottom();
  }
};

const createLocalMessageId = (prefix = "local") => `${prefix}-${Date.now()}-${localMessageSeed++}`;

const appendPendingOutgoingMessage = async (payload) => {
  const clientRequestId = createLocalMessageId("outgoing");
  const normalized = normalizeMessage({
    ...payload,
    id: clientRequestId,
    clientRequestId,
    localStatus: "pending",
    isMine: true,
  });
  messages.value.push(normalized);
  await scrollToBottom();
  return clientRequestId;
};

const reconcilePendingOutgoingMessage = (clientRequestId, serverMessages = []) => {
  if (!clientRequestId) return;

  const pendingIndex = messages.value.findIndex(
    (item) => item.clientRequestId === clientRequestId && item.localStatus === "pending"
  );

  if (pendingIndex === -1) return;

  if (!serverMessages.length) {
    messages.value.splice(pendingIndex, 1);
    return;
  }

  const serverMessage = normalizeMessage(serverMessages[0]);
  messages.value.splice(pendingIndex, 1, serverMessage);
};

const removePendingOutgoingMessage = (clientRequestId) => {
  if (!clientRequestId) return;
  const pendingIndex = messages.value.findIndex(
    (item) => item.clientRequestId === clientRequestId && item.localStatus === "pending"
  );
  if (pendingIndex !== -1) {
    messages.value.splice(pendingIndex, 1);
  }
};

const ensureAiTypingIndicator = async () => {
  if (messages.value.some((item) => item.id === "ai-typing-indicator")) {
    return;
  }

  messages.value.push(
    normalizeMessage({
      id: "ai-typing-indicator",
      messageType: "typing_indicator",
      senderType: "ai",
      isMine: false,
    })
  );
  await scrollToBottom();
};

const removeAiTypingIndicator = () => {
  messages.value = messages.value.filter((item) => item.id !== "ai-typing-indicator");
};

const isCurrentCustomerServiceMessage = (data = {}) => {
  const sameSession =
    !data.sessionId || !sessionId.value || String(data.sessionId) === String(sessionId.value);
  const sameCustomer =
    !data.customerId || !customerId.value || String(data.customerId) === String(customerId.value);

  return sameSession && sameCustomer;
};

const setupSocketListener = () => {
  if (socketMessageHandler) return;

  socketMessageHandler = async (data) => {
    if (data.type === "message_received") {
      if (!isCurrentCustomerServiceMessage(data)) {
        return;
      }
      if (data.senderType === "ai") {
        removeAiTypingIndicator();
      }
      await appendIncomingMessage(data);
      return;
    }

    if (data.type === "notify") {
      const sameSession = !data.sessionId || !sessionId.value || String(data.sessionId) === String(sessionId.value);
      if (!sameSession) return;

      await appendIncomingMessage({
        id: data.messageId,
        messageType: "text",
        text: data.message,
        senderType: data.senderType || "system",
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
  if (!customerId.value) {
    customerId.value = resolveCurrentUserId(userInfo);
  }

  if (!customerId.value) {
    uni.showToast({ title: "缺少客服会话用户", icon: "none" });
    return;
  }

  const res = await customerServiceApi.getCustomerChat(customerId.value);
  const customerInfo = res.data?.customerInfo || {};

  sessionId.value = res.data?.sessionMeta?.sessionId || sessionId.value;
  isSelfCustomerService.value = userInfo.role === "customer_service";
  userAvatar.value = isSelfCustomerService.value
    ? normalizeAvatarUrl(userInfo.avatar, serviceAvatar)
    : normalizeAvatarUrl(userInfo.avatar, defaultAvatar);
  otherAvatar.value = isSelfCustomerService.value
    ? normalizeAvatarUrl(customerInfo.avatar, defaultAvatar)
    : serviceAvatar;
  title.value = isSelfCustomerService.value
    ? customerInfo.name || "用户咨询"
    : resolveCustomerServiceTitle();
  messages.value = (res.data?.messages || []).map(normalizeMessage);
  console.log("客服聊天记录加载完成", {
    customerId: customerId.value,
    sessionId: sessionId.value,
    count: messages.value.length,
  });

  updateNavigationTitle();

  if (userInfo.role === "customer_service" && sessionId.value) {
    customerServiceApi.markAsRead(sessionId.value).catch(() => {});
  }

  await scrollToBottom();
};

onLoad(async (options) => {
  const userInfo = uni.getStorageSync("userInfo") || {};

  customerId.value = options.customerId || resolveCurrentUserId(userInfo);
  sessionId.value = options.sessionId || "";
  console.log("进入客服聊天页", {
    customerId: customerId.value,
    sessionId: sessionId.value,
    role: userInfo.role || "",
  });
  await loadCustomerServiceChat(userInfo);
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

const loadRecentTransactions = async () => {
  try {
    transactionsLoading.value = true;
    const res = await customerServiceApi.getRecentTransactions();
    recentTransactions.value = (res.data || []).map((item) => ({
      ...item,
      otherUser: item.otherUser
        ? {
            ...item.otherUser,
            avatar: normalizeImageUrl(item.otherUser.avatar || ""),
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
  if (transactionSending.value) return;

  let pendingMessageId = "";

  try {
    // 交易消息只允许一次发送中的请求，防止用户连续点击导致同一订单被发多条。
    transactionSending.value = true;
    transactionSendingId.value = getTransactionKey(item);
    transactionPopup.value?.close?.();
    const shouldShowAiTyping = !isHandoffPendingActive();

    // 交易消息也先插入本地占位，避免 AI 回复先到导致页面临时顺序反转；接口返回后再用服务端消息替换。
    pendingMessageId = await appendPendingOutgoingMessage({
      text: `交易咨询：${item.title || "未命名问题"}`,
      messageType: "transaction",
      transactionInfo: item,
      senderType: "user",
    });
    if (shouldShowAiTyping) {
      await ensureAiTypingIndicator();
    }

    const res = await customerServiceApi.sendMessage(customerId.value, {
      text: `交易咨询：${item.title || "未命名问题"}`,
      messageType: "transaction",
      transactionInfo: item,
    });

    sessionId.value = res.data?.sessionMeta?.sessionId || sessionId.value;
    reconcilePendingOutgoingMessage(pendingMessageId, res.data?.sentMessages || []);
    await appendServerMessages((res.data?.sentMessages || []).slice(1));
    if (res.data?.aiReply) {
      removeAiTypingIndicator();
      await appendIncomingMessage(res.data.aiReply);
    } else {
      removeAiTypingIndicator();
    }
  } catch (error) {
    removeAiTypingIndicator();
    removePendingOutgoingMessage(pendingMessageId);
    uni.showToast({ title: error.message || "发送交易失败", icon: "none" });
  } finally {
    transactionSending.value = false;
    transactionSendingId.value = "";
  }
};

const handleContactService = async () => {
  if (handoffSubmitting.value) return;

  try {
    handoffSubmitting.value = true;
    const res = await customerServiceApi.confirmAiHandoff({
      customerId: customerId.value,
      message: "用户确认转人工客服",
    });
    showActionButtons.value = false;
    uni.showToast({ title: res.message || "已提交人工客服请求", icon: "success" });
  } catch (error) {
    console.error("申请客服失败:", error);
    uni.showToast({ title: error.message || "申请客服失败", icon: "none" });
  } finally {
    handoffSubmitting.value = false;
  }
};

const handleCancelHandoff = async () => {
  if (handoffCancelSubmitting.value) return;

  try {
    handoffCancelSubmitting.value = true;
    const res = await customerServiceApi.cancelAiHandoff({
      customerId: customerId.value,
    });

    // 撤销结果由后端落库后返回，前端只负责展示这条系统消息。
    sessionId.value = res.data?.sessionMeta?.sessionId || sessionId.value;
    if (res.data?.noticeMessage) {
      await appendIncomingMessage(res.data.noticeMessage);
    }
    uni.showToast({ title: res.message || "已撤销人工客服请求", icon: "success" });
  } catch (error) {
    console.error("撤销转人工失败:", error);
    uni.showToast({ title: error.message || "撤销失败", icon: "none" });
  } finally {
    handoffCancelSubmitting.value = false;
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
        const image = uploadRes.data;
        const sendRes = await customerServiceApi.sendMessage(customerId.value, {
          image,
          messageType: "image",
        });
        sessionId.value = sendRes.data?.sessionMeta?.sessionId || sessionId.value;
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

  const localText = text;
  let pendingMessageId = "";
  inputMessage.value = "";

  try {
    console.log("发送客服消息", {
      customerId: customerId.value,
      sessionId: sessionId.value,
      isSelfCustomerService: isSelfCustomerService.value,
    });

    if (!isSelfCustomerService.value) {
      const shouldShowAiTyping = !isHandoffPendingActive();
      pendingMessageId = await appendPendingOutgoingMessage({
        text: localText,
        messageType: "text",
        senderType: "user",
      });
      if (shouldShowAiTyping) {
        await ensureAiTypingIndicator();
        console.log("AI 回复加载动画已显示");
      }
    } else {
      pendingMessageId = await appendPendingOutgoingMessage({
        text: localText,
        messageType: "text",
        senderType: "human_service",
      });
    }

    const res = await customerServiceApi.sendMessage(customerId.value, {
      text: localText,
      messageType: "text",
    });
    console.log("客服消息发送接口返回", {
      hasAiReply: Boolean(res.data?.aiReply),
      sentCount: Array.isArray(res.data?.sentMessages) ? res.data.sentMessages.length : 0,
      aiSkippedReason: res.data?.aiSkippedReason || "",
      sessionMeta: res.data?.sessionMeta || null,
    });
    sessionId.value = res.data?.sessionMeta?.sessionId || sessionId.value;
    reconcilePendingOutgoingMessage(pendingMessageId, res.data?.sentMessages || []);
    await appendServerMessages((res.data?.sentMessages || []).slice(1));

    if (res.data?.aiReply) {
      removeAiTypingIndicator();
      await appendIncomingMessage(res.data.aiReply);
    } else if (!isSelfCustomerService.value) {
      removeAiTypingIndicator();
    }

    if (!isSelfCustomerService.value) {
      title.value = resolveCustomerServiceTitle();
      updateNavigationTitle();
    }
  } catch (error) {
    removeAiTypingIndicator();
    console.error("发送消息失败:", error);
    removePendingOutgoingMessage(pendingMessageId);
    uni.showToast({ title: error.message || "发送失败", icon: "none" });
  }
};

const handleMessageClick = (message) => {
  if (message.messageType === "transaction") {
    openTransactionDetail(message.transactionInfo?.questionId);
  }
};
</script>

<style lang="scss" scoped>
.transaction-popup {
  position: relative;
  z-index: 220;
  padding: 0 16rpx calc(env(safe-area-inset-bottom) + 150rpx);
}

.transaction-sheet {
  border-radius: 34rpx 34rpx 0 0;
  background: var(--app-surface);
  box-shadow: 0 -20rpx 60rpx rgba(60, 42, 63, 0.12);
  padding: 30rpx 26rpx 24rpx;
  max-height: calc(100vh - 260rpx);
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
  max-height: 620rpx;
  overflow-y: auto;
}

.transaction-card {
  padding: 24rpx;
  border-radius: 26rpx;
  background: var(--app-input-bg);
}

.transaction-card.is-disabled {
  opacity: 0.62;
  pointer-events: none;
}

.transaction-card.is-sending {
  opacity: 1;
  box-shadow: inset 0 0 0 2rpx rgba(255, 127, 150, 0.26);
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

.handoff-btn,
.inline-handoff-btn {
  border: none;
  color: #fff;
  background: var(--app-primary-gradient);
  box-shadow: var(--app-primary-shadow);
}

.handoff-btn {
  min-width: 180rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
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

.message-content.typing-message {
  min-width: 132rpx;
}

.message-content.transaction-wrap {
  max-width: 74%;
  padding: 0;
  background: transparent;
  box-shadow: none;
  border: none;
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

.inline-handoff-btn,
.inline-cancel-handoff-btn {
  margin-top: 18rpx;
  width: 220rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.inline-cancel-handoff-btn {
  color: var(--app-accent-strong);
  background: rgba(255, 127, 150, 0.1);
  border: 1px solid rgba(255, 127, 150, 0.22);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-height: 36rpx;
}

.typing-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 127, 150, 0.72);
  animation: typing-bounce 1.2s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-6rpx);
  }
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
