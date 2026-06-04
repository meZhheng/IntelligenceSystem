<template>
  <section class="social-text-list">
    <SocialTextCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :selected="selectedItems.includes(item.id) || selectedItems.includes(String(item.id))"
      @toggle="emit('toggle', $event)"
      @open-detail="emit('open-detail', $event)"
    />
  </section>

  <footer class="detail-footer">
    <span class="total-count">共 {{ total }} 条</span>
    <el-pagination
      v-model:current-page="currentPageModel"
      v-model:page-size="pageSizeModel"
      :page-sizes="[20, 30, 50, 100]"
      background
      layout="sizes, prev, pager, next"
      :total="total"
      @change="emit('page-change')"
    />
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SocialTextCard from "./SocialTextCard.vue";
import type { DataId, SocialDataItem } from "./socialResult";

const props = defineProps<{
  items: SocialDataItem[];
  selectedItems: DataId[];
  currentPage: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{
  "update:currentPage": [value: number];
  "update:pageSize": [value: number];
  "page-change": [];
  toggle: [id: DataId];
  "open-detail": [item: SocialDataItem];
}>();

const currentPageModel = computed({
  get: () => props.currentPage,
  set: (value) => emit("update:currentPage", value),
});

const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (value) => emit("update:pageSize", value),
});
</script>

<style scoped>
.social-text-list {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 680px), 1fr));
  gap: 16px;
  align-items: start;
}

.detail-footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0 0;
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
}

.total-count {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-color, #303133);
}

@media (max-width: 760px) {
  .social-text-list {
    gap: 12px;
  }

  .detail-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .detail-footer :deep(.el-pagination) {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
