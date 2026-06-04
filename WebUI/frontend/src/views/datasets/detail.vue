<template>
  <SocialDatasetWorkspace v-if="dataset_type === 'SOCIAL'" :dataset-id="datasetId" />

  <div class="dataset-detail" v-else>
    <dataListImage
      :data_list="data_list"
      :group_id="group.id"
      :task_type="sub_task_type_selected?.name"
      :default="true"
      v-if="dataset_type == 'IMAGE'"
    />

    <section class="data-list" v-else-if="dataset_type == 'INTERACTIVE_DIALOGUE'">
      <el-card
        v-for="session in data_list"
        :key="session.session_code"
        class="session-item card"
        shadow="hover"
        @click="select_data(session.dataset_id, session.id)"
      >
        <template #header>
          <div class="session-header">
            <span class="session-title">{{ session.context_utterances[0] }}</span>
          </div>
        </template>

        <div class="utterance-preview">
          <span
            v-for="(utt, idx) in session.context_utterances.slice(0, 5)"
            :key="idx"
            class="utterance-badge"
          >
            {{ utt }}
          </span>
          <span v-if="session.utterance_ids.length > 5" class="more-count">
            … 共 {{ session.utterance_ids.length }} 条对话
          </span>
        </div>
      </el-card>
    </section>

    <section class="data-list propagation-list" v-else-if="dataset_type == 'PROPAGATION'">
      <div v-for="comment in data_list" :key="comment.id">
        <el-card class="comment-card" shadow="hover" @click="select_data(comment.dataset_id, comment.id)">
          <div class="card-content">{{ comment.content }}</div>
        </el-card>
      </div>
    </section>

    <section class="data-list" v-else-if="dataset_type == 'ILLEGAL_ACCOUNT_DETECTION'">
      <div
        v-for="(item, idx) in data_list"
        :key="idx"
        class="data-item card"
        @click="select_data(item.dataset_id, item.id)"
      >
        <header class="item-header">
          <h4 class="item-title">{{ item.name }}</h4>
        </header>
      </div>
    </section>

    <section class="data-list" v-else-if="dataset_type == 'ACCOUNT_ROLE_RECOGNITION'">
      <div
        v-for="(item, idx) in data_list"
        :key="idx"
        class="data-item card"
        @click="select_data(item.dataset_id, item.id)"
      >
        <header class="item-header">
          <h4 class="item-title">{{ item.username }}</h4>
        </header>
        <div class="item-meta-list">
          <div class="item-meta">
            <el-icon><User /></el-icon>粉丝：{{ item.num_followers }}
          </div>
          <div class="item-meta">
            <el-icon><Document /></el-icon>博文：{{ item.num_blogs }}
          </div>
        </div>
      </div>
    </section>

    <section class="data-list" v-else>
      <div
        v-for="(data, idx) in data_list"
        :key="idx"
        class="data-item card"
        @click="select_data(data.dataset_id, data.id)"
      >
        <header class="item-header">
          <h4 class="item-title" v-if="data.title">{{ data.title }}</h4>
          <time class="item-time" v-if="data.publish_time">{{ formatDateTime(data.publish_time) }}</time>
        </header>
        <p class="item-content">{{ data.text }}</p>
        <footer class="item-footer">
          <div class="footer-info" v-if="data.author">
            <el-icon><Stopwatch /></el-icon>
            <span>作者：{{ data.author }}</span>
          </div>
          <div class="footer-info" v-if="data.key_word">
            <el-icon><CollectionTag /></el-icon>
            <span>关键词：{{ data.key_word }}</span>
          </div>
        </footer>
      </div>
    </section>

    <footer class="detail-footer">
      <span class="total-count">共 {{ total_items }} 条</span>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 30, 50, 100]"
        background
        layout="sizes, prev, pager, next"
        :total="total_items"
        @change="fetchData"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import axios from "@/api/axios";
import { useRoute, useRouter } from "vue-router";
import { formatDateTime } from "@/utils/date";
import dataListImage from "@/views/datasets/dataListImage.vue";
import SocialDatasetWorkspace from "@/views/datasets/social/SocialDatasetWorkspace.vue";
import { ElLoading } from "element-plus";

const currentPage = ref(1);
const pageSize = ref(20);
const total_items = ref(0);
const data_list = ref<any[]>([]);
const sub_task_type_selected = ref<{ name: string } | null>(null);
const group = ref<{ id: number }>({ id: 0 });
const dataset_type = ref<string | null>(null);

const route = useRoute();
const router = useRouter();
const datasetId = computed(() => route.params.dataset_id as string);

const fetchData = async () => {
  const link = `/datasets/detail?page=${currentPage.value}&per_page=${pageSize.value}`;
  const loadingData = ElLoading.service({
    lock: true,
    text: "加载中，请稍候...",
    background: "rgba(0, 0, 0, 0.5)",
  });

  data_list.value = [];

  try {
    const response = await axios.post(
      link,
      {
        dataset_id: route.params.dataset_id,
      },
      { timeout: 600000 }
    );

    data_list.value = response.data.items;
    total_items.value = response.data._meta.total_items;
    dataset_type.value = response.data.dataset_type;
  } catch (error) {
    console.error(error);
  } finally {
    loadingData.close();
  }
};

function select_data(dataset_id: string, rel_data_id: string) {
  router.push({
    name: "SingleData",
    params: { dataset_id },
    query: {
      dataset_id,
      data_id: rel_data_id,
      dataset_type: dataset_type.value,
    },
  });
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.dataset-detail {
  display: flex;
  flex: 1;
  overflow-y: auto;
  flex-direction: column;
  height: 100%;
  padding: var(--gap);
  background: #f9fafb;
  box-sizing: border-box;
}

.dataset-detail .data-list,
.data-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(800px, 1fr));
  gap: var(--gap);
}

.card {
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: var(--gap);
}

.session-item.card {
  margin-bottom: 12px;
  padding: 8px;
}

.session-item,
.comment-card,
.data-item {
  cursor: pointer;
}

.session-header,
.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.session-title {
  font-weight: bold;
}

.utterance-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.utterance-badge {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
}

.more-count {
  color: #999;
  font-size: 12px;
  margin-left: 4px;
}

.propagation-list .card-content {
  margin: 12px 0;
  color: #333;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-item {
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s ease;
}

.data-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-title {
  margin: 0;
  font-size: 1rem;
  color: var(--text-color);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 0.875rem;
  color: var(--subtext-color);
  white-space: nowrap;
}

.item-content {
  flex: 1;
  font-size: 0.875rem;
  color: var(--subtext-color);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  margin-bottom: 12px;
}

.item-footer,
.item-meta-list {
  display: flex;
  gap: var(--gap);
}

.footer-info,
.item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: var(--subtext-color);
}

.detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
}

.total-count {
  font-size: 0.9rem;
  color: var(--text-color);
}
</style>
