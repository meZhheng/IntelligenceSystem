<template>
  <div class="social-dataset-workspace">
    <div class="workspace-layout">
      <aside class="workspace-sidebar">
        <SocialToolbar
          :current-page-count="currentPageCount"
          :analyzed-count="analyzedCount"
          :unanalyzed-count="unanalyzedCount"
          :selected-count="selectedCount"
          :emotion-count="emotionCount"
          :stance-count="stanceCount"
          @select-current-page="selectCurrentPage"
          @select-current-page-unanalyzed="selectCurrentPageUnanalyzed"
          @clear-selection="clearSelection"
        />

        <AnalysisPanel
          :selected-count="selectedCount"
          :config="currentConfig"
          :model-options="analysisModelOptions"
          @analyze-emotion="analyzeEmotion"
          @analyze-stance="analyzeStance"
          @save-config="saveConfig"
          @reset-config="resetConfig"
        />
      </aside>

      <main class="workspace-content">
        <SocialTextList
          :items="dataList"
          :selected-items="selectedItems"
          :current-page="currentPage"
          :page-size="pageSize"
          :total="totalItems"
          @update:current-page="currentPage = $event"
          @update:page-size="pageSize = $event"
          @page-change="handlePageChange"
          @toggle="toggleItem"
          @open-detail="openDetail"
        />
      </main>
    </div>

    <AnalysisResultPanel
      v-model:visible="resultPanelVisible"
      :analysis-type="analysisType"
      :results="analysisResults"
      :summary="analysisSummary"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import SocialToolbar from "./SocialToolbar.vue";
import AnalysisPanel from "./AnalysisPanel.vue";
import SocialTextList from "./SocialTextList.vue";
import AnalysisResultPanel from "./AnalysisResultPanel.vue";
import { useAnalysisConfig } from "./useAnalysisConfig";
import { useSelection } from "./useSelection";
import { useSocialAnalysis } from "./useSocialAnalysis";
import { useSocialDataset } from "./useSocialDataset";
import type { DataId, SocialDataItem } from "./socialResult";

const props = defineProps<{
  datasetId: DataId;
}>();

const router = useRouter();

const {
  currentPage,
  pageSize,
  totalItems,
  dataList,
  currentPageCount,
  analyzedCount,
  unanalyzedCount,
  emotionCount,
  stanceCount,
  fetchData,
  fetchSocialResults,
} = useSocialDataset(props.datasetId);

const {
  selectedItems,
  selectedCount,
  selectCurrentPage,
  selectCurrentPageUnanalyzed,
  clearSelection,
  toggleItem,
  pruneSelection,
} = useSelection(dataList);

const { analysisModelOptions, currentConfig, loadConfig, saveConfig, resetConfig } = useAnalysisConfig();

const {
  analysisType,
  analysisResults,
  analysisSummary,
  resultPanelVisible,
  analyzeEmotion,
  analyzeStance,
} = useSocialAnalysis(props.datasetId, dataList, selectedItems, currentConfig, fetchSocialResults);

const handlePageChange = async () => {
  clearSelection();
  await fetchData();
};

const openDetail = (item: SocialDataItem) => {
  router.push({
    name: "SingleData",
    params: { dataset_id: props.datasetId },
    query: {
      dataset_id: item.dataset_id || props.datasetId,
      data_id: item.id,
      dataset_type: "SOCIAL",
    },
  });
};

watch(dataList, () => {
  pruneSelection();
});

onMounted(() => {
  loadConfig();
  fetchData();
});
</script>

<style scoped>
.social-dataset-workspace {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  padding: 18px clamp(12px, 2vw, 24px) 24px;
  background:
    radial-gradient(circle at 12% 0%, rgba(64, 158, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #f7faff 0%, #f8fafc 42%, #f9fafb 100%);
  box-sizing: border-box;
  overflow: hidden;
}

.workspace-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.workspace-sidebar {
  z-index: 5;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
}

.workspace-content {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
}

@media (max-width: 1180px) {
  .social-dataset-workspace {
    overflow-y: auto;
  }

  .workspace-layout {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .workspace-sidebar {
    overflow: visible;
  }

  .workspace-content {
    overflow: visible;
  }
}

@media (max-width: 768px) {
  .social-dataset-workspace {
    padding: 12px 10px 18px;
  }

  .workspace-layout {
    gap: 12px;
  }
}
</style>
