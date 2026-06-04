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
const props = defineProps();
const router = useRouter();
const { currentPage, pageSize, totalItems, dataList, currentPageCount, analyzedCount, unanalyzedCount, emotionCount, stanceCount, fetchData, fetchSocialResults, } = useSocialDataset(props.datasetId);
const { selectedItems, selectedCount, selectCurrentPage, selectCurrentPageUnanalyzed, clearSelection, toggleItem, pruneSelection, } = useSelection(dataList);
const { analysisModelOptions, currentConfig, loadConfig, saveConfig, resetConfig } = useAnalysisConfig();
const { analysisType, analysisResults, analysisSummary, resultPanelVisible, analyzeEmotion, analyzeStance, } = useSocialAnalysis(props.datasetId, dataList, selectedItems, currentConfig, fetchSocialResults);
const handlePageChange = async () => {
    clearSelection();
    await fetchData();
};
const openDetail = (item) => {
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
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['social-dataset-workspace', 'workspace-layout', 'workspace-sidebar', 'workspace-content', 'social-dataset-workspace', 'workspace-layout',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("social-dataset-workspace") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("workspace-layout") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: ("workspace-sidebar") },
});
// @ts-ignore
/** @type { [typeof SocialToolbar, ] } */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(SocialToolbar, new SocialToolbar({
    ...{ 'onSelectCurrentPage': {} },
    ...{ 'onSelectCurrentPageUnanalyzed': {} },
    ...{ 'onClearSelection': {} },
    currentPageCount: ((__VLS_ctx.currentPageCount)),
    analyzedCount: ((__VLS_ctx.analyzedCount)),
    unanalyzedCount: ((__VLS_ctx.unanalyzedCount)),
    selectedCount: ((__VLS_ctx.selectedCount)),
    emotionCount: ((__VLS_ctx.emotionCount)),
    stanceCount: ((__VLS_ctx.stanceCount)),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onSelectCurrentPage': {} },
    ...{ 'onSelectCurrentPageUnanalyzed': {} },
    ...{ 'onClearSelection': {} },
    currentPageCount: ((__VLS_ctx.currentPageCount)),
    analyzedCount: ((__VLS_ctx.analyzedCount)),
    unanalyzedCount: ((__VLS_ctx.unanalyzedCount)),
    selectedCount: ((__VLS_ctx.selectedCount)),
    emotionCount: ((__VLS_ctx.emotionCount)),
    stanceCount: ((__VLS_ctx.stanceCount)),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_5;
const __VLS_6 = {
    onSelectCurrentPage: (__VLS_ctx.selectCurrentPage)
};
const __VLS_7 = {
    onSelectCurrentPageUnanalyzed: (__VLS_ctx.selectCurrentPageUnanalyzed)
};
const __VLS_8 = {
    onClearSelection: (__VLS_ctx.clearSelection)
};
let __VLS_2;
let __VLS_3;
var __VLS_4;
// @ts-ignore
/** @type { [typeof AnalysisPanel, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(AnalysisPanel, new AnalysisPanel({
    ...{ 'onAnalyzeEmotion': {} },
    ...{ 'onAnalyzeStance': {} },
    ...{ 'onSaveConfig': {} },
    ...{ 'onResetConfig': {} },
    selectedCount: ((__VLS_ctx.selectedCount)),
    config: ((__VLS_ctx.currentConfig)),
    modelOptions: ((__VLS_ctx.analysisModelOptions)),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onAnalyzeEmotion': {} },
    ...{ 'onAnalyzeStance': {} },
    ...{ 'onSaveConfig': {} },
    ...{ 'onResetConfig': {} },
    selectedCount: ((__VLS_ctx.selectedCount)),
    config: ((__VLS_ctx.currentConfig)),
    modelOptions: ((__VLS_ctx.analysisModelOptions)),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_14;
const __VLS_15 = {
    onAnalyzeEmotion: (__VLS_ctx.analyzeEmotion)
};
const __VLS_16 = {
    onAnalyzeStance: (__VLS_ctx.analyzeStance)
};
const __VLS_17 = {
    onSaveConfig: (__VLS_ctx.saveConfig)
};
const __VLS_18 = {
    onResetConfig: (__VLS_ctx.resetConfig)
};
let __VLS_11;
let __VLS_12;
var __VLS_13;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: ("workspace-content") },
});
// @ts-ignore
/** @type { [typeof SocialTextList, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(SocialTextList, new SocialTextList({
    ...{ 'onUpdate:currentPage': {} },
    ...{ 'onUpdate:pageSize': {} },
    ...{ 'onPageChange': {} },
    ...{ 'onToggle': {} },
    ...{ 'onOpenDetail': {} },
    items: ((__VLS_ctx.dataList)),
    selectedItems: ((__VLS_ctx.selectedItems)),
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    total: ((__VLS_ctx.totalItems)),
}));
const __VLS_20 = __VLS_19({
    ...{ 'onUpdate:currentPage': {} },
    ...{ 'onUpdate:pageSize': {} },
    ...{ 'onPageChange': {} },
    ...{ 'onToggle': {} },
    ...{ 'onOpenDetail': {} },
    items: ((__VLS_ctx.dataList)),
    selectedItems: ((__VLS_ctx.selectedItems)),
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    total: ((__VLS_ctx.totalItems)),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
let __VLS_24;
const __VLS_25 = {
    'onUpdate:currentPage': (...[$event]) => {
        __VLS_ctx.currentPage = $event;
    }
};
const __VLS_26 = {
    'onUpdate:pageSize': (...[$event]) => {
        __VLS_ctx.pageSize = $event;
    }
};
const __VLS_27 = {
    onPageChange: (__VLS_ctx.handlePageChange)
};
const __VLS_28 = {
    onToggle: (__VLS_ctx.toggleItem)
};
const __VLS_29 = {
    onOpenDetail: (__VLS_ctx.openDetail)
};
let __VLS_21;
let __VLS_22;
var __VLS_23;
// @ts-ignore
/** @type { [typeof AnalysisResultPanel, ] } */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(AnalysisResultPanel, new AnalysisResultPanel({
    visible: ((__VLS_ctx.resultPanelVisible)),
    analysisType: ((__VLS_ctx.analysisType)),
    results: ((__VLS_ctx.analysisResults)),
    summary: ((__VLS_ctx.analysisSummary)),
}));
const __VLS_31 = __VLS_30({
    visible: ((__VLS_ctx.resultPanelVisible)),
    analysisType: ((__VLS_ctx.analysisType)),
    results: ((__VLS_ctx.analysisResults)),
    summary: ((__VLS_ctx.analysisSummary)),
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
['social-dataset-workspace', 'workspace-layout', 'workspace-sidebar', 'workspace-content',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            SocialToolbar: SocialToolbar,
            AnalysisPanel: AnalysisPanel,
            SocialTextList: SocialTextList,
            AnalysisResultPanel: AnalysisResultPanel,
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            dataList: dataList,
            currentPageCount: currentPageCount,
            analyzedCount: analyzedCount,
            unanalyzedCount: unanalyzedCount,
            emotionCount: emotionCount,
            stanceCount: stanceCount,
            selectedItems: selectedItems,
            selectedCount: selectedCount,
            selectCurrentPage: selectCurrentPage,
            selectCurrentPageUnanalyzed: selectCurrentPageUnanalyzed,
            clearSelection: clearSelection,
            toggleItem: toggleItem,
            analysisModelOptions: analysisModelOptions,
            currentConfig: currentConfig,
            saveConfig: saveConfig,
            resetConfig: resetConfig,
            analysisType: analysisType,
            analysisResults: analysisResults,
            analysisSummary: analysisSummary,
            resultPanelVisible: resultPanelVisible,
            analyzeEmotion: analyzeEmotion,
            analyzeStance: analyzeStance,
            handlePageChange: handlePageChange,
            openDetail: openDetail,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
