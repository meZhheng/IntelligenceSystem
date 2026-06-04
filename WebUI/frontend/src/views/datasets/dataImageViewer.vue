<template>
<div class="content card">
    <!-- 图片展示区 -->
    <section
    v-if="data?.images && data?.images.length"
    class="viewer-images"
    >
    <el-image
        :src="currentImageSrc"
        class="viewer-image"
        fit="contain"
        lazy
        :preview-src-list="previewList"
    />

    <button
        v-if="data?.images.length > 1"
        class="arrow arrow-left"
        @click="prevImage"
    >
        <el-icon><ArrowLeft /></el-icon>
    </button>

    <button
        v-if="data?.images.length > 1"
        class="arrow arrow-right"
        @click="nextImage"
    >
        <el-icon><ArrowRight /></el-icon>
    </button>

    <!-- 图片分页小点 -->
    <div v-if="data?.images.length > 1" class="image-dots">
        <span
        v-for="(_, i) in data?.images"
        :key="i"
        :class="['dot', { active: i === currentIndex } ]"
        ></span>
    </div>
    </section>

    <!-- 主要内容 -->
    <section class="viewer-content">
    {{ data?.text }}
    </section>
</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
ArrowLeft,
ArrowRight,
} from '@element-plus/icons-vue';

const props = defineProps<{
data: {
    dataset_id: string;
    text: string;
    images?: { path: string }[];
}
}>();

// 当前显示的图片索引
const currentIndex = ref(0);

// 初始化或当 data.images 发生变化时重置索引
watch(
() => props.data?.images,
(imgs) => {
    if (imgs && imgs.length > 0) currentIndex.value = 0;
},
{ immediate: true }
);

// 预览列表
const previewList = computed(() =>
props.data.images?.map(
    img => `/static/images/${props.data.dataset_id}/${img.path}`
) || []
);

// 当前图片地址
const currentImageSrc = computed(() =>
props.data.images && props.data.images.length
    ? `/static/images/${props.data.dataset_id}/${props.data.images[currentIndex.value].path}`
    : ''
);

// 切换上一张
function prevImage() {
if (!props.data.images) return;
const len = props.data.images.length;
currentIndex.value = (currentIndex.value - 1 + len) % len;
}

// 切换下一张
function nextImage() {
if (!props.data.images) return;
const len = props.data.images.length;
currentIndex.value = (currentIndex.value + 1) % len;
}
</script>

<style scoped lang="scss">
.content {
display: flex;
flex-direction: column;
gap: var(--gap);
}

.viewer-images {
position: relative;
width: 100%;
height: 360px;
overflow: hidden;
border-radius: 4px;
}

.viewer-image {
width: 100%;
height: 100%;
object-fit: contain;
background: #f9fafb;
}

.arrow {
position: absolute;
top: 50%;
transform: translateY(-50%);
background: rgba(0, 0, 0, 0.4);
border: none;
border-radius: 50%;
padding: 8px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
z-index: 10;
}

.arrow-left {
left: 12px;
}

.arrow-right {
right: 12px;
}

.arrow .el-icon {
color: #fff;
}

/* 图片分页小点样式 */
.image-dots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 10;
}

.dot {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    transition: background 0.3s;
}

.dot.active {
background: var(--primary-color);
}

.viewer-content {
font-size: 1rem;
color: var(--text-color);
line-height: 1.6;
white-space: pre-wrap;
}
</style>