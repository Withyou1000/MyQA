<template>
    <router-view />
    <GlobalNotification v-show="true" />
</template>

<script setup>
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import GlobalNotification from "@/components/GlobalNotification.vue";
import { onUnmounted } from "vue";
import { ref } from "vue";
const ws = ref(null);
// 应用初始化（对应 onLaunch）
onLaunch(() => {
  // 检查 token 并初始化 WebSocket
  initWebSocket(); // 直接调用函数，无需 this
  setupGlobalSocketListener();

  // 检查用户角色并跳转到相应页面
  checkUserRole();

  console.log("App Launch");
});

// 检查用户角色并跳转到相应页面
async function checkUserRole() {
  const token = uni.getStorageSync("token");
  if (token) {
    try {
      // 获取用户信息
      const userInfo = uni.getStorageSync("userInfo");
      if (userInfo.role === 'customer_service') {
        // 客服跳转到客服工作台
        uni.reLaunch({
          url: "/pages/customer-service/index",
        });
      }
      // 普通用户保持默认跳转
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }
}
// 应用显示（对应 onShow）
onShow(() => {
  uni.$emit("pageShow");
  console.log("App Show");
});
// 应用隐藏（对应 onHide）
onHide(() => {
  console.log("App Hide");
});

onUnmounted(() => {
  uni.closeSocket({
    success: () => {
      console.log("WebSocket连接已关闭");
    },
    fail: (err) => {
      console.error("关闭WebSocket连接失败:", err);
    },
  });
});

// 定义 WebSocket 初始化函数（无需挂载到 this）
function initWebSocket() {
  if (uni.getStorageSync("token") && !ws.value) {
    ws.value = uni.connectSocket({
      url: "ws://192.168.110.173:3000",
      success: () => {
        console.log("WebSocket 连接请求成功");
        uni.onSocketOpen(() => {
          const token = uni.getStorageSync("token");
          uni.sendSocketMessage({
            data: JSON.stringify({
              type: "auth",
              token: token,
            }),
          });
        });
      },
      fail: (err) => {
        console.error("WebSocket 连接请求失败:", err);
      },
    });

    uni.onSocketClose(() => {
      ws.value = null;
    });
  }
}

// 添加全局消息处理函数
function setupGlobalSocketListener() {
  uni.onSocketMessage((res) => {
    try {
      const data = JSON.parse(res.data);
     // console.log("App.vue收到WebSocket消息:", data);
      switch (data.type) {
        case "apply_accept":
          // 触发全局通知
          //console.log("apply_accept", data);
          uni.$emit("showGlobalNotification", {
            id: data.questionId,
            text: `${data.answererName}用户向你发送了采纳申请，点击跳转`,
          });
          break;
        case "accept_confirmed":
          break;
        case "system_message":
          break;
        case "chat_message":
          break;
        default:
          // 对于其他类型的消息，不做处理，让其他监听器处理
         // console.log("App.vue收到未处理的消息类型:", data.type);
          break;
      }
    } catch (error) {
      console.error("解析WebSocket消息失败:", error);
    }
  });
}
// 挂载到 uni 对象
uni.initWebSocket = initWebSocket;
</script>

<style>
/*每个页面公共css */
page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* 确保内容区域不会被底部导航栏遮挡 */
.content {
  flex: 1;
  padding-bottom: 50px; /* 底部导航栏的高度 */
}
</style>
