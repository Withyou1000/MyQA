<template>
  <view class="my-answers">
    <view class="answer-list">
      <view
        v-for="(answer, index) in answers"
        :key="index"
        class="answer-item"
        @click="goToQuestionDetail(answer.id)"

      >
        <view class="question-header">
          <text class="title">{{ answer.title }}</text>
          <text class="reward">{{ answer.reward }}元</text>
        </view>
        <view class="tags-container">
          <text class="tag topic-tag">{{ answer.topic }}</text>
          <text
            v-for="(tag, tagIndex) in answer.tags"
            :key="tagIndex"
            class="tag"
            >{{ tag }}</text
          >
        </view>
        <view class="question-footer">
          <text class="status" :class="answer.status">{{
            answer.statusText
          }}</text>
          <view class="action-buttons">
            <!-- 解答中状态 -->
            <template v-if="answer.status !== 'pending'">
              <button
                class="btn contact-btn"
                @click.stop="goToChat(answer)"
              >
                联系对方
              </button>
            </template>

            <!-- 已拒绝状态 -->
            <template v-else-if="answer.status === 'rejected'">
              <button
                class="btn contact-btn"
                @click.stop="contactUser(answer)"
              >
                联系对方
              </button>
               <button
                class="btn appeal-btn"
                @click.stop="appealAnswer(answer)"
              >
                申述
              </button>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 暂无数据提示 -->
    <view class="empty-tip" v-if="answers.length === 0">
      <text>暂无回答记录</text>
    </view>
  </view>
</template>


<script setup>
import { ref, onMounted } from "vue";
import { userApi } from "@/api/user.js";
import { onShow } from '@dcloudio/uni-app'


// 模拟数据
const answers = ref([
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

const statusMap = {
  pending: '待处理',
  refused: '未接受',
  answering: '解答中',
  accepted: '已完成',
  rejected: '已拒绝',
  rated: '已完成',
};

const userId = ref("");
// 跳转到聊天页面
const goToChat = async (answer) => {
  uni.navigateTo({
    url: `/pages/chat/index?questionId=${answer.id}&status=${answer.status}`,
  });
};


// 申述
const appealAnswer = (answer) => {
  uni.showModal({
    title: "申述",
    content: "确定要对该回答进行申述吗？",
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

// 获取我的回答列表
const loadQuestions = async () => {
  try {
    // loading.value = true;
    const res = await userApi.getMyAnswers();
    answers.value = res.data.list.map((item) => ({
      id: item.questionId,
      title: item.title,
      topic: item.topic,
      tags: item.tags,
      reward: item.reward,
      status: item.answerer ? (item.answerer === userId.value ? item.status : 'refused') : item.status,
      statusText: statusMap[item.status],
      answerer: item.answerer,
      createTime: item.createTime,
    }));

  } catch (error) {
    uni.showToast({
      title: error.message || "加载失败",
      icon: "none",
    });
  } finally {
    // loading.value = false;
  }
};

const goToQuestionDetail = (id) => {
uni.navigateTo({
url: `/pages/question/detail?questionId=${id}&fromIndex=false`,
});
};

onShow(() => {
  loadQuestions();
});

onMounted(() => {
  userId.value = uni.getStorageSync("userInfo").userId;
  loadQuestions();
});
</script>

<style lang="scss" scoped>
.my-answers {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding: 20rpx;

  .answer-list {
    .answer-item {
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

          &.rated {
            color: #34c759;
            background: rgba(52, 199, 89, 0.1);
          }

          &.rejected {
            color: #ff3b30;
            background: rgba(255, 59, 48, 0.1);
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

            &.appeal-btn {
              background-color: #ff9500;
              color: #fff;
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