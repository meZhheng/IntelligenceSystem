import { ref } from "vue";
import { ElLoading, ElMessage } from "element-plus";
import axios from "@/api/axios";
export function useSocialAnalysis(datasetId, dataList, selectedItems, currentConfig, refreshSocialResults) {
    const analysisType = ref("emotion");
    const analysisResults = ref([]);
    const analysisSummary = ref({
        valid: 0,
        invalid: 0,
        processing_time_sec: 0,
        model_used: "",
    });
    const resultPanelVisible = ref(false);
    const selectedData = () => dataList.value.filter((item) => selectedItems.value.includes(item.id) || selectedItems.value.includes(String(item.id)));
    const analyzeEmotion = async () => {
        if (selectedItems.value.length === 0) {
            ElMessage.warning("请先选择要分析的数据");
            return;
        }
        const selectedRows = selectedData();
        const loading = ElLoading.service({
            lock: true,
            text: "情感分析中...",
            background: "rgba(0, 0, 0, 0.7)",
        });
        try {
            const response = await axios.post("/datasets/compare_yq/entry", {
                task_name: "emotion",
                dataset_id: datasetId,
                data_ids: selectedItems.value,
                texts: selectedRows.map((item) => item.text),
                model_choice: currentConfig.value.model_choice,
                config: currentConfig.value,
            }, { timeout: 600000 });
            analysisType.value = "emotion";
            analysisResults.value = (response.data.results || []).map((result, index) => ({
                ...result,
                label: selectedRows[index]?.label,
            }));
            analysisSummary.value = response.data.summary || analysisSummary.value;
            resultPanelVisible.value = true;
            await refreshSocialResults(selectedItems.value);
            ElMessage.success("情感分析完成");
        }
        catch (error) {
            ElMessage.error(`情感分析失败: ${error.response?.data?.error || error.message}`);
        }
        finally {
            loading.close();
        }
    };
    const analyzeStance = async (targets) => {
        if (selectedItems.value.length === 0) {
            ElMessage.warning("请先选择要分析的数据");
            return;
        }
        if (targets.length === 0) {
            ElMessage.warning("请至少添加一个分析目标");
            return;
        }
        const selectedRows = selectedData();
        const loading = ElLoading.service({
            lock: true,
            text: "立场分析中...",
            background: "rgba(0, 0, 0, 0.7)",
        });
        try {
            const response = await axios.post("/datasets/compare_yq/entry", {
                task_name: "stance",
                dataset_id: datasetId,
                data_ids: selectedItems.value,
                texts: selectedRows.map((item) => item.text),
                targets,
                model_choice: currentConfig.value.model_choice,
                config: currentConfig.value,
            }, { timeout: 600000 });
            analysisType.value = "stance";
            analysisResults.value = response.data.results || [];
            analysisSummary.value = response.data.summary || analysisSummary.value;
            resultPanelVisible.value = true;
            await refreshSocialResults(selectedItems.value);
            ElMessage.success("立场分析完成");
        }
        catch (error) {
            ElMessage.error(`立场分析失败: ${error.response?.data?.error || error.message}`);
        }
        finally {
            loading.close();
        }
    };
    return {
        analysisType,
        analysisResults,
        analysisSummary,
        resultPanelVisible,
        analyzeEmotion,
        analyzeStance,
    };
}
