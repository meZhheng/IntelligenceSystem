<template>
  <div class="detect-list-wrap" ref="wrapRef" role="region" aria-label="检测结果滚动列表">
    <div class="detect-list-inner" ref="innerRef">
      <!-- 空数据时展示 -->
      <div v-if="visibleItems.length === 0" class="empty">暂无检测结果</div>
      
      <!-- 可视区域数据 -->
      <div 
        class="detect-item"
        v-for="(item, index) in visibleItems" 
        :key="item.data_id + '-' + index"
        :class="{
          'animate-in': item.isEntering,
          'safe-item': badgeClass(item.pred_label) === 'safe',
          'danger-item': badgeClass(item.pred_label) === 'danger',
          'neutral-item': badgeClass(item.pred_label) === 'neutral'
        }"
      >
        <div class="glow-effect"></div>
        <div class="left">
          <div class="badge" :class="badgeClass(item.pred_label)">
            {{ item.pred_label }}
          </div>
        </div>

        <div class="center">
          <div class="text" :title="item.text">{{ item.text }}</div>
          <div class="meta">
            <span class="time">{{ formatTime(item.timestamp) }}</span>
            <span class="id">ID: {{ item.data_id }}</span>
          </div>
        </div>

        <div class="right">
          <template v-if="item.isNew">
            <span class="new-tag">New</span>
          </template>
          <template v-else>
            <svg class="mini-icon" viewBox="0 0 1024 1024" width="28" height="28" aria-hidden="true">
              <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z" fill="transparent" stroke="rgba(255,255,255,0.15)" stroke-width="20"/>
              <path d="M352 432h320v64H352z" fill="#bae6fd"></path>
            </svg>
          </template>
        </div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <!-- <div class="control-panel">
      <div class="speed-control">
        <span>检测速度:</span>
        <div class="speed-slider">
          <input 
            type="range" 
            min="100" 
            max="3000" 
            v-model="simulatedSpeed" 
            @input="updateSimulatedSpeed"
          >
          <div class="speed-labels">
            <span :class="{ active: simulatedSpeed <= 1000 }">慢</span>
            <span :class="{ active: simulatedSpeed > 1000 && simulatedSpeed <= 2000 }">中</span>
            <span :class="{ active: simulatedSpeed > 2000 }">快</span>
          </div>
        </div>
      </div>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">{{ safeCount }}</div>
          <div class="stat-label">安全</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ dangerCount }}</div>
          <div class="stat-label">风险</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">总数</div>
        </div>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';

type DetectItem = {
  data_id: number;
  dataset_id?: number;
  group_id?: number;
  model_id?: number;
  pred_label: string;
  raw_result?: any;
  text: string;
  timestamp: string;
  isEntering?: boolean; // 标记是否正在进入动画
  isNew?: boolean;      // 标记是否为新数据（5秒内）
};

const props = defineProps<{
  items?: DetectItem[];
  maxLines?: number;
  initialDelay?: number;
  itemInterval?: number;
  newItemDuration?: number; // 新标签显示时长（默认5秒）
}>();

// 默认配置
const DEFAULT_INITIAL_DELAY = 500;
const DEFAULT_ITEM_INTERVAL = 500;
const DEFAULT_NEW_ITEM_DURATION = 10000; // 5秒

// 响应式状态
const visibleItems = ref<(DetectItem & { isEntering?: boolean; isNew?: boolean })[]>([]);
const simulatedSpeed = ref(2000); // 模拟速度（ms）
const newItemDuration = ref(DEFAULT_NEW_ITEM_DURATION);
const animationQueue = ref<DetectItem[]>([]);
const isProcessing = ref(false);
const wrapRef = ref<HTMLElement | null>(null);
const innerRef = ref<HTMLElement | null>(null);
const itemHeight = ref(100); // 单个item的预估高度（px）

// 计算属性
const items = computed(() => props.items ?? []);
const maxLines = computed(() => props.maxLines ?? 2);
const initialDelay = computed(() => props.initialDelay ?? DEFAULT_INITIAL_DELAY);
const itemInterval = computed(() => props.itemInterval ?? DEFAULT_ITEM_INTERVAL);
const newItemDurationMs = computed(() => props.newItemDuration ?? DEFAULT_NEW_ITEM_DURATION);

// 统计信息
const totalCount = computed(() => visibleItems.value.length);
const safeCount = computed(() => visibleItems.value.filter(item => 
  badgeClass(item.pred_label) === 'safe').length);
const dangerCount = computed(() => visibleItems.value.filter(item => 
  badgeClass(item.pred_label) === 'danger').length);

/* 格式化时间、badgeClass 与原来一致 */
function formatTime(ts?: string) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Tokyo'
    };
    const parts = new Intl.DateTimeFormat('zh-CN', opts).formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
  } catch (e) {
    return ts;
  }
}

function badgeClass(label: string) {
  const low = (label || '').toLowerCase();
  if (/正常|不涉及|safe|non|none/i.test(low)) return 'safe';
  if (/敏感|违规|涉|侵权|hate|abuse|illegal|violation/i.test(low)) return 'danger';
  return 'neutral';
}

/* 初始化：加载前10条数据 */
function initializeWithFirstTen() {
  if (!items.value || items.value.length === 0) return;
  
  // 取前10条或全部数据
  const initialItems = items.value.slice(0, 10).map(item => ({ ...item }));
  visibleItems.value = initialItems;
  
  // 剩余数据放入队列
  animationQueue.value = [...items.value.slice(10)];
  
  // 计算单个item高度（用于滚动预留）
  setTimeout(() => {
    if (innerRef.value && innerRef.value.children.length > 0) {
      itemHeight.value = (innerRef.value.children[0] as HTMLElement).offsetHeight;
    }
  }, 100);
}

/* 模拟实时检测效果 */
function simulateRealTimeDetection() {
    if (animationQueue.value.length === 0) return;
    
    isProcessing.value = true;
    processNextItem();
}

async function processNextItem() {
    if (animationQueue.value.length === 0) {
        isProcessing.value = false;
        return;
    }
    
    // 2. 从队列中取出下一项
    const newItem = { 
        ...animationQueue.value.shift()!, 
        isEntering: true,
        isNew: true 
    };
    visibleItems.value.push(newItem);
  
    // 3. 滚动到底部
    scrollToBottom();
    
    // 4. 动画完成后移除进入状态
    setTimeout(() => {
        const index = visibleItems.value.findIndex(item => item.data_id === newItem.data_id);
        if (index !== -1) {
        visibleItems.value[index].isEntering = false;
        }
    }, 500);
  
    // 5. 5秒后移除"新"标签
    setTimeout(() => {
        const index = visibleItems.value.findIndex(item => item.data_id === newItem.data_id);
        if (index !== -1) {
        visibleItems.value[index].isNew = false;
        }
    }, newItemDurationMs.value);
  
    // 6. 处理下一项，添加极端随机性（模拟突发性连续快速检测）
    const now = Date.now();
    let randomizedSpeed;

    // 创建突发性检测模式：每10秒有20%概率进入"检测高峰"期（持续1.5秒）
    const isBurstPeriod = (now % 10000) < 1500 && Math.random() < 0.2;

    if (isBurstPeriod) {
        // 检测高峰期：速度是正常速度的4-8倍（连续快速检测）
        randomizedSpeed = simulatedSpeed.value / (4 + Math.random() * 4);
    } else {
        // 非高峰期：70%概率慢速，30%概率中速
        if (Math.random() < 0.7) {
            // 大部分时间较慢（模拟复杂检测）
            randomizedSpeed = simulatedSpeed.value * (1.2 + Math.random() * 1.8);
        } else {
            // 小部分时间中等速度
            randomizedSpeed = simulatedSpeed.value * (0.5 + Math.random() * 0.5);
        }
    }

    setTimeout(processNextItem, randomizedSpeed);
}

function scrollToBottom() {
  const container = innerRef.value;
  if (container) {
    // 平滑滚动到底部
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }
}

function updateSimulatedSpeed() {
  // 如果正在处理，重新开始模拟
  if (isProcessing.value && animationQueue.value.length > 0) {
    simulateRealTimeDetection();
  }
}

/* 监听 items 的变化 */
watch(items, (newVal) => {
  if (newVal && newVal.length > 0) {
    // 重置状态
    visibleItems.value = [];
    animationQueue.value = [];
    
    // 初始化前10条
    initializeWithFirstTen();
    
    // 如果有剩余数据，开始模拟
    if (animationQueue.value.length > 0) {
      setTimeout(simulateRealTimeDetection, initialDelay.value);
    }
  } else {
    visibleItems.value = [];
  }
}, { immediate: true, deep: true });

/* 生命周期挂载与卸载 */
onMounted(() => {
    // 初始设置
    simulatedSpeed.value = itemInterval.value;
    newItemDuration.value = newItemDurationMs.value;
    
    // 设置 ResizeObserver
    const resizeObs = new ResizeObserver(() => {
        scrollToBottom();
        
        // 重新计算item高度
        if (innerRef.value && innerRef.value.children.length > 0) {
            itemHeight.value = (innerRef.value.children[0] as HTMLElement).offsetHeight;
        }
    });
    
    if (wrapRef.value) {
        resizeObs.observe(wrapRef.value);
    }

    if (innerRef.value) {
        resizeObs.observe(innerRef.value);
    }
    
    onBeforeUnmount(() => {
        resizeObs.disconnect();
    });
});
</script>

<style scoped>
/* 容器（大屏风格） */
.detect-list-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 16px 16px 24px 16px;
  box-sizing: border-box;
  background: linear-gradient(180deg, rgba(5,12,25,0.6), rgba(3,6,12,0.6));
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 100, 255, 0.15);
  border: 1px solid rgba(100, 200, 255, 0.1);
}

/* 滚动内部区域 */
.detect-list-inner {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;
}

/* 隐藏滚动条视觉（仍可滚动） */
.detect-list-inner::-webkit-scrollbar {
  width: none;
}
.detect-list-inner::-webkit-scrollbar-track {
  background: rgba(0, 20, 40, 0.3);
}
.detect-list-inner::-webkit-scrollbar-thumb {
  background: rgba(100, 200, 255, 0.3);
  border-radius: 3px;
}
.detect-list-inner {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 单个条目样式 */
.detect-item {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 18px 20px;
  border-radius: 10px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  box-shadow: 0 6px 18px rgba(2,6,23,0.35), inset 0 1px 0 rgba(255,255,255,0.02);
  border: 1px solid rgba(186,230,253,0.04);
  position: relative;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.4s ease, transform 0.4s ease;
  z-index: 1;
}

/* 弹出动画效果 */
.detect-item.animate-in {
  opacity: 0;
  transform: translateY(30px);
}

/* 光效层 */
.glow-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  border-radius: 10px;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.detect-item.safe-item .glow-effect {
  background: linear-gradient(90deg, transparent, rgba(144,238,144,0.05), transparent);
  box-shadow: 0 0 20px rgba(144,238,144,0.2);
}

.detect-item.danger-item .glow-effect {
  background: linear-gradient(90deg, transparent, rgba(255,99,71,0.08), transparent);
  box-shadow: 0 0 20px rgba(255,99,71,0.3);
}

.detect-item.neutral-item .glow-effect {
  background: linear-gradient(90deg, transparent, rgba(186,230,253,0.06), transparent);
  box-shadow: 0 0 20px rgba(186,230,253,0.2);
}

.detect-item.animate-in .glow-effect {
  opacity: 1;
  animation: glow-pulse 1.5s ease forwards;
}

@keyframes glow-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.8; }
  100% { opacity: 0; }
}

/* 左侧 badge 区域 */
.left {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

/* 预测标签样式 */
.badge {
    font-weight: 700;
    font-size: 18px;
    padding: 8px 14px;
    border-radius: 8px;
    background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    box-shadow: 0 6px 16px rgba(10,24,42,0.45);
    border: 1px solid rgba(255,255,255,0.04);
    color: #ffffff;
    text-align: center;
    position: relative;
    z-index: 2;
    transition: all 0.3s ease;
}

/* 不同状态颜色 */
.badge.safe {
  background: linear-gradient(90deg, rgba(144,238,144,0.18), rgba(152,251,152,0.08));
  color: #ffffff;
  border-color: rgba(144,238,144,0.25);
}
.badge.neutral {
  background: linear-gradient(90deg, rgba(186,230,253,0.14), rgba(173,216,230,0.06));
  color: #ffffff;
  border-color: rgba(186,230,253,0.18);
}
.badge.danger {
  background: linear-gradient(90deg, rgba(255,160,122,0.16), rgba(255,99,71,0.08));
  color: #ffffff;
  border-color: rgba(255,99,71,0.22);
}

/* 中间文本区域（原文 + meta） */
.center {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2;
}

/* 文本内容（支持截断多行） */
.text {
  font-size: 20px;
  line-height: 1.4;
  color: #e6f7ff;
  display: -webkit-box;
  -webkit-line-clamp: var(--max-lines, 2);
  line-clamp: var(--max-lines, 2);
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  position: relative;
  z-index: 2;
}

/* meta 行 */
.meta {
  display: flex;
  gap: 22px;
  align-items: center;
  font-size: 14px;
  color: rgba(186,230,253,0.8);
}

/* 右侧小图标 */
.right {
  width: 84px;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

/* 新标签样式 */
.new-tag {
  display: inline-block;
  background: linear-gradient(90deg, #ff6b6b, #ff8e8e);
  color: white;
  font-weight: bold;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(255, 107, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}

/* 空状态样式 */
.empty {
  color: rgba(255,255,255,0.15);
  font-size: 22px;
  padding: 24px;
  text-align: center;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 控制面板 */
.control-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px 0;
  background: rgba(0, 10, 20, 0.7);
  border-top: 1px solid rgba(100, 200, 255, 0.1);
  margin-top: -20px;
  z-index: 10;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,0.7);
  font-size: 14px;
}

.speed-slider {
  width: 180px;
}

.speed-slider input[type="range"] {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(100, 200, 255, 0.1);
  border-radius: 3px;
  outline: none;
}

.speed-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4da6ff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(77, 166, 255, 0.7);
  transition: all 0.2s ease;
}

.speed-slider input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #66b3ff;
}

.speed-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}

.speed-labels span.active {
  color: #4da6ff;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(77, 166, 255, 0.5);
}

.stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #4da6ff;
  text-shadow: 0 0 8px rgba(77, 166, 255, 0.5);
}

.stat-label {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
}

/* 以 CSS 变量控制最大行数（由 prop 注入） */
:root {
  --max-lines: 2;
}

/* 响应式与大屏优化 */
@media (min-width: 1600px) {
  .detect-item { padding: 22px 26px; }
  .text { font-size: 22px; }
  .badge { font-size: 20px; padding: 10px 18px; }
  .control-panel { padding: 16px 20px 0; }
}

/* 小动画提升质感 */
.detect-item {
  transform-origin: left center;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

/* 悬停效果 */
.detect-item:hover {
  box-shadow: 0 8px 24px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.03);
  border-color: rgba(186,230,253,0.12);
}

/* 光效动画 */
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(77, 166, 255, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(77, 166, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(77, 166, 255, 0); }
}

.safe-item:hover .badge {
  animation: pulse 2s infinite;
  box-shadow: 0 0 20px rgba(144,238,144,0.5);
}

.danger-item:hover .badge {
  animation: pulse 2s infinite;
  box-shadow: 0 0 20px rgba(255,99,71,0.5);
}

.neutral-item:hover .badge {
  animation: pulse 2s infinite;
  box-shadow: 0 0 20px rgba(186,230,253,0.5);
}

/* 添加扫描线效果 */
.detect-list-wrap::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(100,200,255,0.8), transparent);
  animation: scanline 8s linear infinite;
  z-index: 5;
  pointer-events: none;
}

@keyframes scanline {
  0% { top: 0; }
  100% { top: 100%; }
}
</style>