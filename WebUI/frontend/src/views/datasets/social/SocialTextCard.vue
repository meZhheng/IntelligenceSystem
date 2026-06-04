<template>
  <div
    class="social-text-card"
    :class="{
      'is-selected': selected,
      'is-unanalysed': !isAnalyzed(item),
    }"
  >
    <el-checkbox class="item-checkbox" :model-value="selected" @click.stop @change="emit('toggle', item.id)" />

    <div class="card-body" @click="emit('toggle', item.id)">
      <header class="item-header">
        <div class="title-wrap">
          <h4 class="item-title" v-if="item.title">{{ item.title }}</h4>
          <el-tag size="small" :type="isAnalyzed(item) ? 'success' : 'info'" effect="plain">
            {{ isAnalyzed(item) ? '已分析' : '未分析' }}
          </el-tag>
        </div>
        <time class="item-time" v-if="item.publish_time">{{ formatDateTime(item.publish_time) }}</time>
      </header>

      <p class="item-content">{{ item.text }}</p>

      <footer class="item-footer">
        <div class="footer-info" v-if="item.author">
          <el-icon><Stopwatch /></el-icon>
          <span>作者：{{ item.author }}</span>
        </div>
        <div class="footer-info" v-if="item.key_word">
          <el-icon><CollectionTag /></el-icon>
          <span>关键词：{{ item.key_word }}</span>
        </div>
        <el-button type="primary" link size="small" @click.stop="emit('open-detail', item)">
          查看详情
        </el-button>
      </footer>

      <div class="social-results" v-if="resultTags.length">
        <el-tag
          v-for="tag in resultTags"
          :key="tag.key"
          :type="tag.type"
          effect="plain"
          class="result-tag"
        >
          <el-tooltip v-if="tag.raw" :content="tag.raw" placement="top">
            <span>{{ tag.label }}</span>
          </el-tooltip>
          <span v-else>{{ tag.label }}</span>
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateTime } from "@/utils/date";
import type { DataId, SocialDataItem } from "./socialResult";
import { formatSocialResultsForDisplay, isAnalyzed } from "./socialResult";

const props = defineProps<{
  item: SocialDataItem;
  selected: boolean;
}>();

const emit = defineEmits<{
  toggle: [id: DataId];
  "open-detail": [item: SocialDataItem];
}>();

const resultTags = computed(() => formatSocialResultsForDisplay(props.item.social_result));
</script>

<style scoped>
.social-text-card {
  position: relative;
  min-height: 150px;
  padding: 18px 18px 18px 48px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e6ebf2;
  border-radius: 14px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.social-text-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
}

.social-text-card.is-selected {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
}

.social-text-card.is-unanalysed {
  border-style: dashed;
  background: rgba(255, 255, 255, 0.88);
}

.item-checkbox {
  position: absolute;
  left: 14px;
  top: 16px;
  z-index: 1;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.item-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-color, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--subtext-color, #909399);
}

.item-content {
  margin: 0;
  color: var(--subtext-color, #606266);
  font-size: 14px;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.item-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  color: var(--subtext-color, #909399);
}

.footer-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.social-results {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.result-tag {
  max-width: 280px;
}

@media (max-width: 760px) {
  .social-text-card {
    padding: 14px 14px 14px 42px;
    border-radius: 12px;
  }

  .item-checkbox {
    left: 12px;
    top: 14px;
  }

  .item-header {
    flex-direction: column;
    gap: 6px;
  }

  .title-wrap {
    width: 100%;
  }

  .item-title {
    font-size: 15px;
  }

  .item-time {
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .social-text-card {
    padding-left: 38px;
  }

  .item-footer {
    gap: 8px;
  }

  .result-tag {
    max-width: 100%;
  }
}
</style>
