<template>
  <view class="my-questions">
    <view class="question-list">
      <view v-for="(question, index) in questions" :key="index" class="question-item"
        @click="goToQuestionDetail(question)">
        <view class="question-header">
          <text class="title">{{ question.title }}</text>
          <text class="reward">{{ question.reward }}元</text>
        </view>
        <view class="tags-container">
          <text class="tag topic-tag">{{ question.topic }}</text>
          <text v-for="(tag, tagIndex) in question.tags" :key="tagIndex" class="tag">{{ tag }}</text>
        </view>
        <view class="question-footer">
          <text class="status" :class="question.status">{{
            question.statusText
          }}</text>
          <view class="action-buttons">
            <!-- 待处理状态 -->
            <template v-if="question.status === 'pending'">
              <button class="btn apply-btn relative" @click.stop="goToApplicationList(question)">
                申请列表
                <view v-if="question.applicationCount > 0" class="red-dot">
                  <text class="dot-number">{{
                    question.applicationCount
                  }}</text>
                </view>
              </button>
              <button class="btn cancel-btn" @click.stop="cancelQuestion(question)">
                取消提问
              </button>
            </template>

            <!-- 解答中状态 -->
            <template v-else-if="question.status === 'answering'">
              <button class="btn refund-btn" @click.stop="applyRefund(question)">
                申请退款
              </button>
              <button class="btn contact-btn" @click.stop="contactUser(question)">
                联系对方
              </button>
              <button class="btn complete-btn" @click.stop="completeQuestion(question)">
                已完成
              </button>
            </template>

            <!-- 退款中状态 -->
            <template v-else-if="question.status === 'refunding'">
              <button class="btn refund-btn" @click.stop="cancelRefund(question)">
                取消申请
              </button>
              <button class="btn contact-btn" @click.stop="contactUser(question)">
                联系对方
              </button>
            </template>

            <!-- 已采纳状态 -->
            <template v-else-if="question.status === 'accepted' || question.status === 'rated'">
              <button class="btn contact-btn" @click.stop="contactUser(question)">
                联系对方
              </button>
              <button class="btn review-btn"
                @click.stop="question.status === 'rated' ? viewRating(question) : goToReview(question)">
                {{ question.status === 'rated' ? '查看评价' : '去评价' }}
              </button>
            </template>

            <!-- 已拒绝状态 -->
            <template v-else-if="question.status === 'rejected'">
              <button class="btn contact-btn" @click.stop="contactUser(question)">
                联系对方
              </button>
              <button class="btn appeal-btn" @click.stop="appealQuestion(question)">
                申述
              </button>
              <button class="btn edit-btn" @click.stop="editQuestion(question)">
                编辑
              </button>
            </template>
            
            <!-- 已退款状态 -->
            <template v-else-if="question.status === 'refunded'">
              <button class="btn contact-btn" @click.stop="contactUser(question)">
                联系对方
              </button>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 暂无数据提示 -->
    <view class="empty-tip" v-if="questions.length === 0">
      <text>暂无提问记录</text>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { ref, onMounted } from "vue";
import { userApi } from "@/api/common";
import { applyApi } from "@/api";
import { refundApi } from "@/api/refund";
import { chatApi } from "@/api/chat";
import { questionApi } from "@/api/question";

// 模拟数据
const questions = ref([
  {
    id: 1,
    title: "如何使用Vue3的Composition API？",
    topic: "编程",
    tags: ["Vue3", "前端"],
    reward: 20,
    status: "accepted",
    statusText: "已采纳",
  },
  {
    id: 2,
    title: "MySQL索引优化技巧",
    topic: "编程",
    tags: ["MySQL", "数据库"],
    reward: 35,
    status: "pending",
    statusText: "待处理",
  },
  {
    id: 3,
    title: "Android开发如何接收通知",
    topic: "移动开发",
    tags: ["Android", "Java"],
    reward: 50,
    status: "answering",
    statusText: "解答中",
  },
  {
    id: 4,
    title: "React性能优化方法",
    topic: "前端",
    tags: ["React", "性能优化"],
    reward: 30,
    status: "rejected",
    statusText: "已拒绝",
  },
]);
const loading = ref(false);
// 新增：页面来源标志
// const fromApplicationList = ref(false);

// 在statusMap中添加已评价状态
const statusMap = {
  pending: "待处理",
  answering: "解答中",
  accepted: "已采纳",
  rejected: "已拒绝",
  rated: "已评价",
  refunding: "退款中",
  refunded: "已退款"
};


// 添加查看评价方法
const viewRating = (question) => {
  uni.navigateTo({
    url: `/pages/profile/rating-detail?questionId=${question.id}`,
  });
};

// 获取我的提问列表
const loadQuestions = async () => {
  try {
    loading.value = true;
    const res = await userApi.getMyQuestions();
    questions.value = res.data.list.map((item) => ({
      applicationCount: item.applicationCount,
      id: item.questionId,
      title: item.title,
      topic: item.topic,
      tags: item.tags,
      reward: item.reward,
      status: item.status,
      statusText: statusMap[item.status],
      createTime: item.createTime,
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

// 联系对方
const contactUser = async (question) => {
  const res = await userApi.hasRelate(question.id);
  if (res.data.hasRelate) {
    uni.navigateTo({
      url: `/pages/chat/index?questionId=${question.id}&status=${question.status}`,
    });
  } else {
    uni.showToast({
      title: "还没有人回答你的问题哦",
      icon: "none",
    });
  }
};

// 申请退款
const applyRefund = (question) => {
  uni.showModal({
    title: "申请退款",
    content: `确定要申请${question.reward}元退款吗？`,
    success: (res) => {
      if (res.confirm) {
        // 跳转到退款申请页面
        uni.navigateTo({
          url: `/pages/profile/refund?question=${JSON.stringify(question)}`
        });
      }
    },
  });
};

// 取消退款申请
const cancelRefund = async (question) => {
  uni.showModal({
    title: "取消退款",
    content: "确定要取消退款申请吗？",
    success: async (res) => {
      if (res.confirm) {
        try {
          // 调用取消退款API
          await refundApi.cancelRefund(question.id);
          
          // 调用聊天接口发送取消退款系统消息
          await chatApi.sendChatMessage(question.id, {
            messageType: "refund_system",
             text: "我取消了退款申请&咱们合作继续"
          });
          
          uni.showToast({
            title: "退款申请已取消",
            icon: "success",
          });
          
          // 刷新问题列表
          loadQuestions();
        } catch (error) {
          console.error('取消退款申请失败:', error);
          uni.showToast({
            title: error.message || '取消失败，请重试',
            icon: 'none'
          });
        }
      }
    },
  });
};

// 去评价
const goToReview = (question) => {
  uni.navigateTo({
    url: `/pages/profile/rating?questionId=${question.id}`,
  });
};

// 编辑问题
const editQuestion = (question) => {
  uni.navigateTo({
    url: `/pages/ask/index?questionId=${question.id}&edit=true`,
  });
};



// 申述
const appealQuestion = (question) => {
  uni.showModal({
    title: "申述",
    content: "确定要对该问题进行申述吗？",
    success: (res) => {
      if (res.confirm) {
        // 调用申述API
        uni.showToast({
          title: "申述已提交",
          icon: "success",
        });
      }
    },
  });
};

// 已完成
const completeQuestion = (question) => {
  uni.showModal({
    title: "确认完成",
    content: "确定该问题已解决吗？",
    success: async (res) => {
      if (res.confirm) {
        try {
          await applyApi.acceptAnswer(question.id, true);
          uni.showToast({
            title: "问题已标记为已完成",
            icon: "success",
          });
          loadQuestions();
        } catch (error) {
          uni.showToast({
            title: error.message || "操作失败",
            icon: "none",
          });
        }
      }
    },
  });
};

// 撤销问题（删除问题）
const cancelQuestion = (question) => {
  uni.showModal({
    title: "撤销问题",
    content: "确定要撤销该问题吗？撤销后将无法恢复。",
    success: async (res) => {
      if (res.confirm) {
        try {
          // 调用删除问题API
          await questionApi.deleteQuestion(question.id);
          
          uni.showToast({
            title: "问题已撤销",
            icon: "success",
          });
          
          // 刷新问题列表
          loadQuestions();
        } catch (error) {
          console.error('撤销问题失败:', error);
          uni.showToast({
            title: error.message || '撤销失败，请重试',
            icon: 'none'
          });
        }
      }
    },
  });
};

// 页面加载时获取数据
onMounted(() => {
  loadQuestions();
});

// 页面显示时处理
onShow(() => {
  // 如果是从申请列表页面返回的，则刷新数据
  // if (fromApplicationList.value) {
  loadQuestions();
  // fromApplicationList.value = false; // 重置标志
  // }
});

// 下拉刷新
const onPullDownRefresh = async () => {
  await loadQuestions();
  uni.stopPullDownRefresh();
};

// 跳转到申请列表 - 确保此函数在script setup中正确定义
const goToApplicationList = (question) => {
  // 新增：页面来源标志
  // fromApplicationList.value = true;
  console.log("跳转到申请列表，问题ID:", question.id); // 添加日志以便调试
  try {
    uni.navigateTo({
      url: `/pages/profile/application-list?questionId=${question.id}`,
      success: () => {
        console.log("跳转成功");
      },
      fail: (err) => {
        console.error("跳转失败:", err);
        uni.showToast({
          title: "跳转失败，请重试",
          icon: "none",
        });
      },
    });
  } catch (error) {
    console.error("跳转异常:", error);
    uni.showToast({
      title: "系统异常，请稍后再试",
      icon: "none",
    });
  }
};

// 添加跳转到问题详情页的函数
const goToQuestionDetail = (question) => {
  uni.navigateTo({
    url: `/pages/question/detail?questionId=${question.id}&fromIndex=false`,
  });
};
</script>

<style lang="scss" scoped>
.my-questions {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding: 20rpx;

  .question-list {
    .question-item {
      background-color: #fff;
      border-radius: 12rpx;
      padding: 24rpx;
      margin-bottom: 20rpx;
      display: flex;
      flex-direction: column;
      gap: 16rpx;
      box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

      .question-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;

        .title {
          font-size: 32rpx;
          color: #333;
          line-height: 1.4;
          flex: 1;
          margin-right: 20rpx;
          font-weight: 500;
        }

        .reward {
          font-size: 30rpx;
          color: #ff6b6b;
          font-weight: bold;
          min-width: 80rpx;
          text-align: right;
        }
      }

      .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10rpx;
        margin: 8rpx 0;

        .tag {
          font-size: 24rpx;
          color: #666;
          background: #f5f5f5;
          padding: 4rpx 16rpx;
          border-radius: 4rpx;
          height: 44rpx;
          line-height: 44rpx;

          &.topic-tag {
            color: #ff6b6b;
            background: rgba(255, 107, 107, 0.1);
          }
        }
      }

      .question-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 8rpx;

        .status {
          font-size: 26rpx;
          padding: 4rpx 12rpx;
          border-radius: 4rpx;

          &.pending {
            color: #ff9500;
            background: rgba(255, 149, 0, 0.1);
          }

          &.answering {
            color: #007aff;
            background: rgba(0, 122, 255, 0.1);
          }

          &.accepted {
            color: #34c759;
            background: rgba(52, 199, 89, 0.1);
          }

          &.rejected {
            color: #ff3b30;
            background: rgba(255, 59, 48, 0.1);
          }

          &.refunded {
            color: #34c759;
            background: rgba(52, 199, 89, 0.1);
          }
        }

        .action-buttons {
          display: flex;
          gap: 12rpx;
          justify-content: flex-end;
          flex-wrap: wrap;

          .btn {
            height: 64rpx;
            line-height: 64rpx;
            text-align: center;
            border-radius: 32rpx;
            font-size: 26rpx;
            padding: 0 24rpx;
            margin: 0;
            min-width: 140rpx;

            &.contact-btn {
              background-color: #007aff;
              color: #fff;
            }

            &.apply-btn {
              background-color: #ff9500;
              color: #fff;
            }

            &.refund-btn {
              background-color: #ff3b30;
              color: #fff;
            }

            &.review-btn {
              background-color: #34c759;
              color: #fff;
            }

            &.edit-btn {
              background-color: #5ac8fa;
              color: #fff;
            }

            &.complete-btn {
              background-color: #34c759;
              color: #fff;
            }

            &.appeal-btn {
              background-color: #5ac8fa;
              color: #fff;
            }

            &.cancel-btn {
              background-color: #ff3b30;
              color: #fff;
            }

            &.relative {
              position: relative;
              // 增加这个属性确保按钮不会裁剪溢出内容
              overflow: visible;

              .red-dot {
                position: absolute;
                top: -12rpx;
                right: -12rpx;
                width: 40rpx;
                height: 40rpx;
                background-color: #ff3b30;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999; // 使用更高的z-index
                box-shadow: 0 2rpx 6rpx rgba(255, 59, 48, 0.4); // 添加阴影增加可见性
              }

              .red-dot .dot-number {
                color: #fff;
                font-size: 24rpx;
                font-weight: bold;
                line-height: 40rpx;
                text-align: center;
                min-width: 40rpx;
              }
            }
          }
        }
      }
    }
  }

  .empty-tip {
    padding: 100rpx 0;
    text-align: center;
    color: #999;
    font-size: 28rpx;
  }
}
</style>