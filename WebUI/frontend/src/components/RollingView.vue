<template>
  <el-card class="page">
    <div class="warning-view">
      <!-- <div class="label">{{ title }}</div> -->
      <el-tag
        type="info"
        size="large"
        :style="{
          height: '50px',
          lineHeight: '50px',
          fontSize: '20px',
          fontWeight: '600',
          padding: '8px 20px',
          borderRadius: '8px',
          userSelect: 'none'
          
        }"
      >
        {{ title }}
      </el-tag>

      <div
        class="scroll-view"
        ref="scrollViewRef"
        @mouseenter="onMouseenter"
        @mouseleave="onMouseleave"
      >
        <div ref="listRef" class="list" v-for="(p, n) in 2" :key="n">
          <div class="item" v-for="(item, index) in data" :key="index">
            <div class="content">{{ item }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onBeforeMount, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { ElCard, ElScrollbar, ElDivider, ElTag } from 'element-plus'
import 'element-plus/es/components/card/style/css'
import 'element-plus/es/components/scrollbar/style/css'
import 'element-plus/es/components/divider/style/css'
import 'element-plus/es/components/tag/style/css'

// Props
const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: true
  }
})

const data = ref(); //列表数据
const listRef = ref(); //列表dom
const scrollViewRef = ref(); //滚动区域dom

let intervalId = null;
let isAutoScrolling = true; //是否自动滚动标识
let title = props.title

onMounted(() => {
  data.value = props.items;
  nextTick(() => {
    autoScrolling();
  });
});

watch(() => props.items, (newVal) => {
  data.value = newVal;
  nextTick(() => {
    autoScrolling();
  });
});

//设置自动滚动
const autoScrolling = () => {
  intervalId = setInterval(() => {
    if (scrollViewRef.value.scrollTop < listRef.value[0].clientHeight) {
      scrollViewRef.value.scrollTop += isAutoScrolling ? 1 : 0;
    } else {
      scrollViewRef.value.scrollTop = 0;
    }
  }, 20);
};

onBeforeUnmount(() => {
  //离开页面清理定时器
  intervalId && clearInterval(intervalId);
});

//鼠标进入，停止滚动
const onMouseenter = () => {
  isAutoScrolling = false;
};
//鼠标移出，继续滚动
const onMouseleave = () => {
  isAutoScrolling = true;
};
</script>

<style scoped>
.page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  /* background-color: #010c1e; */
  color: #010c1e;
}
.warning-view {
  width: 100%;
  height: 500px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
}
.label {
  color: #010c1e;
  padding: 20px;
  font-size: 22px;
}
.scroll-view {
  flex: 1;
  height: 0;
  width: 100%;
  overflow-y: auto;
}
.list {
  width: 100%;
  padding: 0 20px;
  box-sizing: border-box;
}
/* .item {
  width: 100%;
  height: auto;
  min-height: 50px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #010c1e;
  border-bottom: 1px solid #ccc;
  padding: 5px 0;
} */
.item {
  width: 100%;
  min-height: 50px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  /* color: #010c1e; */
  color: #4a4a4a;
  border-bottom: 1px solid #e0e0e0; /* 更柔和的分割线 */
  
  padding: 10px 12px; /* 上下加大内边距，左右加一点空隙 */
  box-sizing: border-box; /* 避免padding影响宽度 */

  background-color: #fff; /* 明亮背景 */
  transition: background-color 0.3s ease; /* hover时背景渐变 */

  word-break: break-word; /* 防止长词溢出 */
  white-space: normal; /* 自动换行 */

  cursor: default; /* 鼠标样式 */
}

/* 鼠标悬停高亮 */
.item:hover {
  background-color: #f5f7fa;
}

.item:not(:last-child) {
  border-bottom: 1px solid #ccc;
}

/**
*隐藏滚动条
 */
 ::-webkit-scrollbar{
  display: none;
 }
</style>

