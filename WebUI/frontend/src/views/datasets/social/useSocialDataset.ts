import { computed, ref } from "vue";
import { ElLoading } from "element-plus";
import axios from "@/api/axios";
import type { DataId, SocialDataItem } from "./socialResult";
import { hasTaskResult, isAnalyzed } from "./socialResult";

export function useSocialDataset(datasetId: DataId) {
  const currentPage = ref(1);
  const pageSize = ref(20);
  const totalItems = ref(0);
  const dataList = ref<SocialDataItem[]>([]);
  const loading = ref(false);

  const currentPageCount = computed(() => dataList.value.length);
  const analyzedCount = computed(() => dataList.value.filter(isAnalyzed).length);
  const unanalyzedCount = computed(() => dataList.value.length - analyzedCount.value);
  const emotionCount = computed(() => dataList.value.filter((item) => hasTaskResult(item, "emotion")).length);
  const stanceCount = computed(() => dataList.value.filter((item) => hasTaskResult(item, "stance")).length);

  const mergeSocialResults = (results: Array<{ data_id: DataId; results: any[] }>) => {
    const resultMap = new Map<DataId, any[]>();
    results.forEach((item) => {
      resultMap.set(item.data_id, item.results || []);
      resultMap.set(String(item.data_id), item.results || []);
    });

    dataList.value = dataList.value.map((row) => ({
      ...row,
      social_result: resultMap.get(row.id) || resultMap.get(String(row.id)) || null,
    }));
  };

  const fetchSocialResults = async (dataIds?: DataId[]) => {
    const ids = dataIds && dataIds.length > 0 ? dataIds : dataList.value.map((item) => item.id);
    if (ids.length === 0) return;

    const res = await axios.post(
      "/datasets/social/results",
      {
        dataset_id: datasetId,
        data_ids: ids,
      },
      { timeout: 600000 }
    );

    mergeSocialResults(res.data.results || []);
  };

  const fetchData = async () => {
    const link = `/datasets/detail?page=${currentPage.value}&per_page=${pageSize.value}`;
    const loadingData = ElLoading.service({
      lock: true,
      text: "加载中，请稍候...",
      background: "rgba(0, 0, 0, 0.5)",
    });

    loading.value = true;
    dataList.value = [];

    try {
      const response = await axios.post(
        link,
        {
          dataset_id: datasetId,
        },
        { timeout: 600000 }
      );

      dataList.value = response.data.items || [];
      totalItems.value = response.data._meta?.total_items || 0;
      await fetchSocialResults(dataList.value.map((item) => item.id));
    } finally {
      loading.value = false;
      loadingData.close();
    }
  };

  const handlePaginationChange = () => {
    fetchData();
  };

  return {
    currentPage,
    pageSize,
    totalItems,
    dataList,
    loading,
    currentPageCount,
    analyzedCount,
    unanalyzedCount,
    emotionCount,
    stanceCount,
    fetchData,
    fetchSocialResults,
    handlePaginationChange,
  };
}
