<template>
  <view class="tab-bar">
    <view 
      v-for="(item, index) in tabs" 
      :key="index"
      class="tab-item"
      :class="{ active: currentPath === item.path }"
      @click="handleTabClick(item.path)"
    >
      <text class="tab-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentPath = ref('')

const tabs = [
  { text: '问答', path: '/pages/index/index' },
  { text: '提问', path: '/pages/ask/index' },
  { text: '消息', path: '/pages/message/index' },
  { text: '我的', path: '/pages/profile/index' }
]

const handleTabClick = (path) => {
  if (currentPath.value !== path) {
    uni.switchTab({
      url: path
    })
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    currentPath.value = `/${currentPage.route}`
  }
})
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: #FFFFFF;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #EEEEEE;
  
  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    .tab-text {
      font-size: 14px;
      color: #999999;
    }
    
    &.active {
      .tab-text {
        color: #007AFF;
      }
    }
  }
}
</style> 
