<template>
  <uni-popup ref="popup" type="center" :mask-click="true">
    <view class="popup-container">
      <view class="popup-content">
        <text class="popup-message">确定要采纳这个回答吗？</text>
        <view class="popup-buttons">
          <button class="confirm-btn" @click="confirmAccept">确认采纳</button>
          <button class="cancel-btn" @click="cancelAccept">拒绝采纳</button>
        </view>
      </view>
    </view>
  </uni-popup>
  <view class="chat-container">
    <!-- 顶部标题 -->
    <view class="chat-header">
      <text class="title">{{ title }}</text>
    </view>

    <!-- 聊天消息区域 -->
    <scroll-view class="message-area" scroll-y :scroll-top="scrollTop" @scrolltoupper="loadMoreMessages">
      <view v-for="(message, index) in messages" :key="index" @click="handleSystemMessageClick(message)" :class="[
        (message.messageType === 'apply_system' || message.messageType === 'refund_system')
          ? 'message-item'
          : 'message-item',
        {
          'message-mine': message.isMine && message.messageType !== 'apply_system' && message.messageType !== 'refund_system',
          'system-message-mine':
            message.isMine && (message.messageType === 'apply_system' || message.messageType === 'refund_system'),
        },
      ]">
        <template v-if="message.messageType === 'refund_system' || message.messageType === 'apply_system'">
          <!-- 对方系统消息：头像在左，内容在右 -->
          <template v-if="!message.isMine">
            <image :src="otherAvatar || '/static/default-avatar.webp'" class="message-avatar other-avatar"
              mode="aspectFill" />
            <view v-if="message.messageType === 'refund_system'" class="message-content refund-message">
              <text class="refund-title">
                {{ message.text.split('&')[0] }}
              </text>
              <text class="refund-content">{{ message.text.split('&')[1] }}</text>
            </view>
            <view v-else-if="message.messageType === 'apply_system'" class="message-content system-message">
              <text>{{ message.text }}</text>
            </view>
          </template>
          <!-- 我的系统消息：内容在左，头像在右 -->
          <template v-else>
            <view v-if="message.messageType === 'refund_system'" class="message-content refund-message">
              <text class="refund-title">
                {{ message.text.split('&')[0] }}
              </text>
              <text class="refund-content">{{ message.text.split('&')[1] }}</text>
            </view>
            <view v-else-if="message.messageType === 'apply_system'" class="message-content system-message">
              <text>{{ message.text }}</text>
            </view>
            <image :src="userAvatar || '/static/default-avatar.webp'" class="message-avatar my-avatar"
              mode="aspectFill" />
          </template>
        </template>
        <template v-else>
          <!-- 对方消息：头像在左，内容在右 -->
          <template v-if="!message.isMine">
            <image :src="otherAvatar || '/static/default-avatar.webp'" class="message-avatar other-avatar"
              mode="aspectFill" />
            <view class="message-content">
              <!-- 文本消息 -->
              <text v-if="message.messageType === 'text' || !message.messageType">{{
                message.text
                }}</text>
              <!-- 图片消息 -->
              <image v-else-if="message.messageType === 'image'" :src="message.image" mode="widthFix"
                class="message-image" @tap="previewImage(message.image)" />
            </view>
          </template>
          <!-- 我的消息：内容在左，头像在右 -->
          <template v-else>
            <view class="message-content">
              <!-- 文本消息 -->
              <text v-if="message.messageType === 'text' || !message.messageType">{{
                message.text
                }}</text>
              <!-- 图片消息 -->
              <image v-else-if="message.messageType === 'image'" :src="message.image" mode="widthFix"
                class="message-image" @tap="previewImage(message.image)" />
            </view>
            <image :src="userAvatar || '/static/default-avatar.webp'" class="message-avatar my-avatar"
              mode="aspectFill" />
          </template>
        </template>
      </view>
    </scroll-view>

    <!-- 底部输入区域 -->
    <view class="input-area">
      <view class="input-box">
        <input class="message-input" v-model="inputMessage" type="text" placeholder="聊天输入框" :focus="inputFocus"
          @focus="handleInputFocus" @blur="handleInputBlur" />
        <view class="plus-icon" @click="toggleActionButtons">
          <text>+</text>
        </view>
        <view class="send-btn" :class="{ active: inputMessage.trim() }" @click="sendMessage">
          <text>发送</text>
        </view>
      </view>

      <!-- 功能按钮区域 -->
      <view class="action-buttons" v-if="showActionButtons">
        <!-- 客服模式下只显示图片和发送交易 -->
        <template v-if="isCustomerService">
          <view class="action-button" @click="handleChooseImage">
            <view class="button-icon">🖼️</view>
            <text>图片</text>
          </view>
          <view class="action-button" @click="handleTransaction">
            <view class="button-icon">💳</view>
            <text>发送交易</text>
          </view>
          <!-- 只有客服视角才显示结束会话按钮 -->
          <view class="action-button" @click="handleEndSession" v-if="isSelfCustomerService">
            <view class="button-icon">🔚</view>
            <text>结束会话</text>
          </view>
          <!-- 只有普通用户视角才显示人工客服按钮 -->
          <view class="action-button" @click="handleContactService" v-if="!isSelfCustomerService">
            <view class="button-icon">📞</view>
            <text>人工客服</text>
          </view>
        </template>
        <!-- 普通聊天模式 -->
        <template v-else>
          <view class="action-button" @click="handleCall">
            <view class="button-icon">📞</view>
            <text>电话</text>
          </view>
          <view class="action-button" @click="handleVideo">
            <view class="button-icon">📹</view>
            <text>视频</text>
          </view>
          <view class="action-button" @click="handleShare">
            <view class="button-icon">📤</view>
            <text>共享屏幕</text>
          </view>
          <view class="action-button" @click="handleChooseImage">
            <view class="button-icon">🖼️</view>
            <text>图片</text>
          </view>
          <!-- 问题采纳按钮 -->
          <view class="action-button" @click="handleAdopt" v-if="questionStatus === 'answering'">
            <view class="button-icon">✅</view>
            <text>{{ isAsker ? "接收采纳" : "申请采纳" }}</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { questionApi } from "@/api/question";
import { applyApi } from "@/api/apply";
import { chatApi } from "@/api/chat";
import { commonApi } from "@/api/common";
import { BASE_URL } from "@/api/config";
import GlobalNotification from "@/components/GlobalNotification.vue";
// 引入组件
import uniPopup from "@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue";
import { customerServiceApi } from "../../api/customer-service";

const inputMessage = ref("");
const inputFocus = ref(false);
const showActionButtons = ref(false);
const scrollTop = ref(0);
const image = ref("");
const messageType = ref("text");
const title = ref("");
const userId = ref("");
const isAsker = ref(false);
const questionStatus = ref("");
const questionId = ref("");
const popup = ref(null);
const userAvatar = ref(''); // 我的头像
const otherAvatar = ref(''); // 对方头像
const sessionId = ref(''); // 客服会话ID
// 客户ID（客服模式下使用）
const customerId = ref('');
// 客户信息（客服模式下使用）
const customerInfo = ref({});



const messages = ref([
  {
    text: "对方的消息",
    isMine: false,
  },
  {
    text: "我的消息",
    isMine: true,
  },
]);
// WebSocket消息监听
const setupSocketListener = () => {
  uni.onSocketMessage((res) => {
    const data = JSON.parse(res.data);
    if (data.type === "message_received") {
      // 处理图片路径，确保有完整路径
      if (data.messageType === "image") {
        data.image = `${BASE_URL}${data.image}`;
      }
      messages.value.push({
        messageType: data.messageType,
        text: data.text,
        image: data.image,
        questionId: data.questionId,
        isMine: false,
      });
      if (
        data.text == "我已采纳你的回答，合作愉快" &&
        data.messageType == "apply_system"
      ) {
        questionStatus.value = "accepted";
      }
    }

    else if (data.type === "message_sent") {
      // const index = messages.value.findIndex(msg => msg._id === data.messageId);
      // if(index !== -1) {
      //   messages.value[index].status = 'delivered';
      // }
    }
    else if (data.type === "notify") {
      console.log(data,'已接收');
      
      messages.value.push({
        messageType: "text",
        text: data.message,
        isMine: false,
      });
    }

  });
};

// 是否为客服聊天
const isCustomerService = ref(false);
// 是否为客服自己（客服视角）
const isSelfCustomerService = ref(false);

onLoad(async (options) => {
  // 获取当前用户角色
  const userInfo = uni.getStorageSync('userInfo');
  // 客户信息
  const CustomerInfo = ref({});
  // 检查是否是联系客服界面
  if (options.type === 'customer_service') {

    isCustomerService.value = true;
    // 获取客户ID
    customerId.value = options.customerId;

    //通过客户id获取聊天信息
    await customerServiceApi.getCustomerChat(customerId.value).then(res => {
      if (res.code === 200) {
        messages.value = res.data;
        CustomerInfo.value = res.data.customerInfo;
        // 处理图片路径，确保有完整路径
        messages.value = res.data.messages.map((msg) => {
          if (msg.messageType === "image") {
            msg.image = `${BASE_URL}${msg.image}`;
          }
          return msg;
        });
      }
    })

    if (userInfo.role === 'customer_service') {
      // 客服视角：对方是普通用户，需要获取用户头像
      sessionId.value = options.sessionId;
      if (sessionId.value) {
        customerServiceApi.markAsRead(sessionId.value).catch(() => {});
      }
      userAvatar.value = '/static/client.webp';
      otherAvatar.value = `${BASE_URL}${CustomerInfo.value.avatar}`;
      isSelfCustomerService.value = true;
      title.value = '客户聊天';
      uni.setNavigationBarTitle({
        title: '客户聊天'
      });

    } else {
      // 普通用户视角：对方是客服，使用客服头像
      // 设置客服头像
      otherAvatar.value = '/static/client.webp';
      userAvatar.value = `${BASE_URL}${userInfo.avatar}`;
      // 设置标题
      title.value = '客服中心';
      uni.setNavigationBarTitle({
        title: '客服中心'
      });
    }
  } else { // 非客服模式下获取聊天记录
    questionId.value = options.questionId;
    //如果刷新就不能获取正确的问题状态，所以还是通过id查状态
    // questionStatus.value = options.status;
    questionApi
      .getQuestionStatus(questionId.value)
      .then((res) => {
        questionStatus.value = res.data.status;
      })
      .catch((err) => {
        console.error("获取问题状态失败:", err);
      });

    // 调用获取聊天记录接口
    chatApi
      .getQuestionChat(questionId.value)
      .then((res) => {
        isAsker.value = res.data.isAsker;
        // 获取对方和自己头像
        if (res.data.otherAvatar) {
          otherAvatar.value = BASE_URL + res.data.otherAvatar;
          userAvatar.value = BASE_URL + userInfo.avatar;
        }
        // 处理图片路径，确保有完整路径
        messages.value = res.data.chatMessages.map((msg) => {
          if (msg.messageType === "image" && !msg.image.startsWith("http")) {
            msg.image = `${BASE_URL}${msg.image}`;
          }
          return msg;
        });
        // console.log(res.data.chatMessages);
        title.value = res.data.title;
        uni.setNavigationBarTitle({
          title: title.value,
        });
      })
      .catch((err) => {
        console.error("获取聊天记录失败:", err);
      });
  }
});

onMounted(() => {
  setupSocketListener();
});

// 切换底部功能按钮显示
const toggleActionButtons = () => {
  showActionButtons.value = !showActionButtons.value;
  if (showActionButtons.value) {
    inputFocus.value = false;
  }
};

// 处理输入框焦点
const handleInputFocus = () => {
  inputFocus.value = true;
  showActionButtons.value = false;
};

const handleInputBlur = () => {
  inputFocus.value = false;
};

// 加载更多消息
const loadMoreMessages = () => {
  // TODO: 实现加载历史消息
};

// 功能按钮点击事件
const handleCall = () => {
  uni.showToast({
    title: "发起语音通话",
    icon: "none",
  });
};

const handleVideo = () => {
  uni.showToast({
    title: "发起视频通话",
    icon: "none",
  });
};

const handleShare = () => {
  uni.showToast({
    title: "发起屏幕共享",
    icon: "none",
  });
};

// 发送交易
const handleTransaction = () => {
  uni.showToast({
    title: "发送交易",
    icon: "none",
  });
};



// 联系人工客服
const handleContactService = async () => {
  try {
    // 调用申请人工客服接口
    const res = await customerServiceApi.requestService();
    if (res.code === 200) {
      // 客服模式下的消息发送
      await customerServiceApi.sendMessage(customerId.value, {
        text: "等待人工客服接待中，请稍等",
        messageType: "text",
      });

      messages.value.push({
        text: "等待人工客服接待中，请稍等",
        messageType: "text",
        isMine: true,
      });
      
    } else {
      uni.showToast({
        title: res.message || "申请客服失败",
        icon: "none"
      });
    }
  } catch (error) {
    console.error("申请客服失败:", error);
    // 尝试从 error 对象中获取后端返回的错误信息
    let errorMessage = "申请客服失败";
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    uni.showToast({
      title: errorMessage,
      icon: "none"
    });
  }
};

// 结束会话
const handleEndSession = async () => {
  try {
    uni.showModal({
      title: "结束会话",
      content: "确定要结束当前会话吗？",
      success: async (res) => {
        if (res.confirm) {
          console.log(sessionId.value);
          // 调用结束会话接口
          const res = await customerServiceApi.endSession(sessionId.value, customerId.value);
          if (res.code === 200) {
            uni.showToast({
              title: "会话已结束",
              icon: "success"
            });

           // 跳转到客服工作台
            setTimeout(() => {
              uni.navigateTo({
                url: `/pages/customer-service/index`
              });
            }, 1500);
          } else {
            uni.showToast({
              title: res.message || "结束会话失败",
              icon: "none"
            });
          }
        }
      }
    });
  } catch (error) {
    console.error("结束会话失败:", error);
    uni.showToast({
      title: "结束会话失败",
      icon: "none"
    });
  }
};

// 选择并上传图片
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
    const tempFilePaths = res.tempFilePaths;

    tempFilePaths.forEach((path) => {
      messages.value.push({
        image: path,
        messageType: "image",
        isMine: true,
      });
    });
    // 逐个上传图片（并行处理）
    tempFilePaths.forEach(async (path) => {
      try {
        const Res = await commonApi.uploadImage(path, 'chat');
        // 发送消息到服务器
        if (isCustomerService.value) {
          // 客服模式下发送给客户
          customerServiceApi.sendMessage(customerId.value, {
            image: Res.data,
            messageType: "image",
          });
        } else {
          // 普通聊天模式
          chatApi.sendChatMessage(questionId.value, {
            image: Res.data,
            messageType: "image",
          });
        }

        // 滚动到底部
        setTimeout(() => {
          const query = uni.createSelectorQuery();
          query.select(".message-area").boundingClientRect();
          query.exec((res) => {
            if (res[0]) {
              scrollTop.value = res[0].height;
            }
          });
        }, 100);
      } catch (err) {
        console.error("图片上传失败:", err);
        uni.showToast({
          title: "图片上传失败",
          icon: "none",
        });
      }
    });
  } catch (err) {
    console.error("选择图片失败:", err);
  }
};

// 预览图片
const previewImage = (url) => {
  uni.previewImage({
    urls: [url],
    current: url,
  });
};


// 发送消息
const sendMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text) return;

  // 清空输入框
  inputMessage.value = "";

  // 发送消息到服务器
  if (isCustomerService.value) {
    // 客服模式下的消息发送
    await customerServiceApi.sendMessage(customerId.value, {
      text,
      messageType: "text",
    });
  } else {
    // 普通聊天模式
    await chatApi.sendChatMessage(questionId.value, {
      text,
      messageType: "text",
    });
  }

  // 添加新消息到列表
  messages.value.push({
    text,
    messageType: "text",
    isMine: true,
  });

  // 滚动到底部
  setTimeout(() => {
    const query = uni.createSelectorQuery();
    query.select(".message-area").boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        scrollTop.value = res[0].height;
      }
    });
  }, 100);
};

// 处理采纳
const handleAdopt = async () => {
  let confirmText = "";
  let systemMessage = "";

  if (isAsker.value) {
    confirmText = "确定要采纳这个回答吗？采纳后将会付款。";
    systemMessage = "我已采纳你的回答，合作愉快";
  } else {
    confirmText = "确定要申请被采纳吗？系统会通知提问者进行采纳操作。";
    systemMessage = "我已完成问题，请点击此条信息采纳哦";
  }

  uni.showModal({
    title: "确认",
    content: confirmText,
    success: async (res) => {
      if (res.confirm) {
        // 发送消息到服务器
        try {
          if (isAsker.value) {
            // 采纳
            await applyApi.acceptAnswer(questionId.value, true);
            await applyApi.markApplyAcceptAsFinished(questionId.value);
            uni.$emit("hideGlobalNotification");
            questionStatus.value = "accepted";

            await chatApi.sendChatMessage(questionId.value, {
              text: systemMessage,
              messageType: "apply_system",
            });
            // 服务器发送成功后才添加到本地消息列表
            messages.value.push({
              text: systemMessage,
              isMine: true,
              messageType: "apply_system",
            });
          } else {
            // 发送申请采纳请求
            const userInfo = uni.getStorageSync("userInfo");
            try {
              const res = await applyApi.applyAcceptAnswer(
                questionId.value,
                userInfo.account
              );

              await chatApi.sendChatMessage(questionId.value, {
                text: systemMessage,
                messageType: "apply_system",
              });
              // 服务器发送成功后才添加到本地消息列表
              messages.value.push({
                text: systemMessage,
                isMine: true,
                messageType: "apply_system",
              });

              uni.showToast({
                title: "您已申请，等待提问者采纳",
                icon: "none",
              });
            } catch (error) {
              console.error("申请采纳失败:", error);
              uni.showToast({
                title: "申请采纳失败，请重试",
                icon: "none",
              });
              return;
            }
          }

          // 滚动到底部
          setTimeout(() => {
            const query = uni.createSelectorQuery();
            query.select(".message-area").boundingClientRect();
            query.exec((res) => {
              if (res[0]) {
                scrollTop.value = res[0].height;
              }
            });
          }, 100);
        } catch (error) {
          console.error("发送系统消息失败:", error);
          // 可以在这里添加失败提示
          uni.showToast({
            title: "发送系统消息失败",
            icon: "none",
          });
        }
      }
    },
  });
};
// 处理系统消息点击
const handleSystemMessageClick = async (message) => {
  if (message.messageType === "refund_system" && message.text === "我发起了退款申请&等待你处理，点击查看退款详情") {
    // 处理退款消息点击
    handleRefundMessageClick(message);
    return;
  }

  if (!message.isMine && (message.messageType === "apply_system" || message.messageType === "refund_system") && isAsker.value) {
    // 只有提问者点击回答者的消息才触发
    try {
      if (questionStatus.value !== "accepted") {
        popup.value?.open();
      } else {
        uni.showToast({
          title: "回答已被采纳",
          icon: "none",
        });
      }
    } catch (error) {
      console.error("采纳回答失败:", error);
      uni.showToast({ title: "采纳失败", icon: "none" });
    }
  }
};

// 处理退款消息点击
const handleRefundMessageClick = (message) => {
  // 跳转到退款详情页面，只传递问题ID
  uni.navigateTo({
    url: `/pages/profile/refund-detail?questionId=${questionId.value}`
  });
};
const confirmAccept = async () => {
  // 确认采纳逻辑
  popup.value?.close();
  await chatApi.sendChatMessage(questionId.value, {
    text: "我已采纳你的回答，合作愉快",
    messageType: "apply_system",
  });
  messages.value.push({
    text: "我已采纳你的回答，合作愉快",
    isMine: true,
    messageType: "apply_system",
  });
  // 发送采纳请求
  await applyApi.acceptAnswer(questionId.value, true);
  await applyApi.markApplyAcceptAsFinished(questionId.value);
  uni.$emit("hideGlobalNotification");
  questionStatus.value = "accepted";
};

const cancelAccept = async () => {
  // 拒绝采纳逻辑
  popup.value?.close();
  await chatApi.sendChatMessage(questionId.value, {
    text: "很抱歉，你的回答并没有解决问题",
    messageType: "apply_system",
  });
  messages.value.push({
    text: "很抱歉，你的回答并没有解决问题",
    isMine: true,
    messageType: "apply_system",
  });

  // 发送采纳请求
  await applyApi.acceptAnswer(questionId.value, false);
  await applyApi.markApplyAcceptAsFinished(questionId.value);
  uni.$emit("hideGlobalNotification");
  questionStatus.value = "rejected";
};

// 处理取消申请
const handleCancelApply = async () => {
  try {
    // 显示确认对话框
    uni.showModal({
      title: "确认取消",
      content: "确定要取消采纳申请吗？",
      success: async (res) => {
        if (res.confirm) {
          // 发送取消申请消息
          await chatApi.sendChatMessage(questionId.value, {
            text: "我已取消采纳申请",
            messageType: "apply_system",
          });

          // 添加取消消息到本地
          messages.value.push({
            text: "我已取消采纳申请",
            isMine: true,
            messageType: "apply_system",
          });

          // 滚动到底部
          setTimeout(() => {
            const query = uni.createSelectorQuery();
            query.select(".message-area").boundingClientRect();
            query.exec((res) => {
              if (res[0]) {
                scrollTop.value = res[0].height;
              }
            });
          }, 100);

          // 显示成功提示
          uni.showToast({
            title: "已取消申请",
            icon: "success"
          });
        }
      }
    });
  } catch (error) {
    console.error("取消申请失败:", error);
    uni.showToast({
      title: "操作失败，请重试",
      icon: "none"
    });
  }
};
</script>

<style lang="scss" scoped>
.popup-container {
  width: 80vw;
  border-radius: 10rpx;
  overflow: hidden;
  background: #fff;
}

.popup-content {
  padding: 30rpx;
}

.popup-message {
  display: block;
  margin-bottom: 40rpx;
  font-size: 30rpx;
  color: #333;
  text-align: center;
}

.popup-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
}

.confirm-btn,
.cancel-btn {
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 30rpx;
  border-radius: 6rpx;
  font-size: 28rpx;
}

.confirm-btn {
  background: #007aff;
  color: #fff;
}

.cancel-btn {
  background: transparent;
  color: #007aff;
  border: 1rpx solid #007aff;
}

.chat-container {
  min-height: 100vh;
  background-color: #f7f7f7;
  display: flex;
  flex-direction: column;

  .chat-header {
    background-color: #fff;
    padding: 20rpx 30rpx;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
      flex: 1;
      margin-right: 20rpx;
    }

    .accept-btn {
      font-size: 28rpx;
      color: #007aff;
      padding: 10rpx 20rpx;
      border: 1px solid #007aff;
      border-radius: 8rpx;

      &:active {
        opacity: 0.8;
      }
    }
  }

  @keyframes bounce {
    0% {
      transform: scale(1);
    }

    100% {
      transform: scale(1.2);
    }
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }

    100% {
      left: 100%;
    }
  }

  .message-area {
    flex: 1;
    padding: 30rpx 0 180rpx;

    .message-item {
      box-sizing: border-box;
      margin: 0 30rpx 30rpx;
      display: flex;
      padding: 0;
      gap: 16rpx;
      align-items: flex-start;

      &.message-mine {
        justify-content: flex-end;

        .message-content {
          background-color: #007aff;
          color: #fff;
          border-radius: 20rpx 4rpx 20rpx 20rpx;

          &::before {
            display: none;
          }

          &::after {
            display: none;
          }
        }
      }

      &.system-message-mine {
        justify-content: flex-end;
      }

      .message-avatar {
        width: 64rpx;
        height: 64rpx;
        border-radius: 32rpx;
        margin: 2rpx 0 0;
        flex-shrink: 0;
        box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
      }

      .message-content {
        max-width: 65%;
        padding: 16rpx 20rpx;
        background-color: #fff;
        border-radius: 4rpx 20rpx 20rpx 20rpx;
        position: relative;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
        font-size: 28rpx;
        line-height: 1.5;
        word-break: break-all;

        &::before {
          display: none;
        }

        // 图片消息样式
        .message-image {
          max-width: 400rpx;
          border-radius: 8rpx;
        }

        // 系统消息样式
        &.system-message {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          padding: 24rpx 48rpx;
          border-radius: 4rpx 20rpx 20rpx 20rpx;
          font-size: 30rpx;
          font-weight: 600;
          border: none;
          box-shadow: 0 8rpx 24rpx rgba(29, 34, 56, 0.4);
          text-align: center;
          min-width: 60%;
        }

        // 退款消息样式
        &.refund-message {
          background-color: #f5f5f5;
          padding: 24rpx;
          border-radius: 16rpx;
          width: 80%;
          box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

          .refund-title {
            font-size: 32rpx;
            font-weight: 600;
            color: #333;
            margin-bottom: 12rpx;
            display: block;
          }

          .refund-content {
            font-size: 24rpx;
            color: #666;
            margin-bottom: 20rpx;
            display: block;
            line-height: 1.4;
          }

          .refund-status {
            display: inline-block;
            padding: 6rpx 16rpx;
            border-radius: 16rpx;
            font-size: 22rpx;
            font-weight: 500;
            float: right;

            &.pending {
              background-color: #fff3cd;
              color: #856404;
            }

            &.accepted {
              background-color: #d4edda;
              color: #155724;
            }

            &.rejected {
              background-color: #f8d7da;
              color: #721c24;
            }
          }
        }
      }

    }
  }

  .input-area {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #fff;
    padding: 20rpx 30rpx;
    border-top: 1px solid #eee;
    z-index: 100;

    .input-box {
      display: flex;
      align-items: center;
      background-color: #f7f7f7;
      border-radius: 36rpx;
      padding: 0 20rpx;

      .message-input {
        flex: 1;
        height: 72rpx;
        font-size: 28rpx;
        padding: 0 20rpx;
      }

      .plus-icon {
        width: 64rpx;
        height: 64rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40rpx;
        color: #666;

        &:active {
          opacity: 0.7;
        }
      }

      .send-btn {
        min-width: 100rpx;
        height: 56rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
        color: #999;
        margin-left: 10rpx;
        border-radius: 28rpx;
        transition: all 0.2s;

        &.active {
          color: #fff;
          background-color: #007aff;
        }

        &:active {
          opacity: 0.8;
        }
      }
    }

    .action-buttons {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      background: #fff;
      display: flex;
      justify-content: space-around;
      padding: 40rpx 60rpx 20rpx;
      border-top: 1px solid #eee;

      .action-button {
        display: flex;
        flex-direction: column;
        align-items: center;

        .button-icon {
          width: 100rpx;
          height: 100rpx;
          background: #f7f7f7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44rpx;
          margin-bottom: 12rpx;
          transition: all 0.2s;

          &:active {
            background: #f0f0f0;
            transform: scale(0.95);
          }
        }

        text {
          font-size: 24rpx;
          color: #666;
        }
      }
    }
  }
}

.popup-content {
  padding: 20px;
  background: #fff;
  border-radius: 10px;
  text-align: center;

  .popup-message {
    font-size: 16px;
    margin-bottom: 20px;
    color: #333;
  }

  .popup-buttons {
    display: flex;
    justify-content: space-between;

    button {
      flex: 1;
      height: 40px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;

      &.confirm-btn {
        background-color: #007aff;
        color: #fff;
        margin-right: 10px;
      }

      &.cancel-btn {
        background-color: #f0f0f0;
        color: #333;
      }
    }
  }
}
</style>
