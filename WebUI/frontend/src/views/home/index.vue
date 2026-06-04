<template>
  <div class="index-container disable-select">
    <h1 class="title">某 智 能 检 测 系 统</h1>
  </div>
</template>

<script>
export default {
  name: "Home",
};
</script>

<style scoped>
.index-container {
  width: 100%;
  height: 100%;
  background-image: url('@/assets/images/bj.png'); /* 背景图片路径 */
  background-size: cover;         /* 背景图铺满容器 */
  background-position: center;    /* 居中显示背景图 */
  display: flex;                  /* 使用 flex 布局 */
  align-items: center;            /* 垂直居中 */
  justify-content: center;        /* 水平居中 */
}

.title {
  color: white;                   /* 标题文字颜色 */
  font-size: 120px;                 /* 根据需要调整字体大小 */
  text-align: center;             /* 文字居中 */
}
</style>
