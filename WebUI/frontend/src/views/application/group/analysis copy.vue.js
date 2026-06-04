import LineChart from './trendLine.vue';
import MapChart from './map.vue';
import axios from '@/api/axios';
import StartBtn from '@/components/button/StartBtn.vue';
import PieChart from '@/components/charts/statisticsPie.vue';
import { Check } from '@element-plus/icons-vue';
import RankingBoard from './RankingBoard.vue';
import { ElLoading } from 'element-plus';
import WordCloud from '@/components/charts/wordCloud.vue';
import { useStore } from '@/store';
import { useRoute } from 'vue-router';
export default (await import('vue')).defineComponent({
    name: 'DataChart',
    data() {
        return {
            model_selected: [],
            dataset_selected: [],
            LineChartData: null,
            modelOptions: [],
            datasetOptions: [],
            isChecked: false,
            analysisStatus: 'start',
            analysisProgress: null,
            unprocessed: 0,
            intervalId: null, // 存储定时器ID
            checkAll_model: false,
            indeterminate_model: false,
            checkAll_dataset: false,
            indeterminate_dataset: false,
            analysisStats: {
                total: 0,
                positive: 0,
                neutral: 0,
                negative: 0
            },
            datasetStats: {
                map: [],
                ranking_author: [],
                distribution_source: [],
                distribution_station: [],
                wordCloudData: [],
                ranking_word: [],
            },
            total_data: 0,
            statusTimer: null,
            store: useStore(),
            group: null,
        };
    },
    computed: {
        passLineChartData() {
            return this.LineChartData;
        },
        passMapChartData() {
            return this.datasetStats.map;
        },
        passAuthorActivityData() {
            const field = ['name', 'auth_type', 'ip', 'value'];
            this.datasetStats.ranking_author.field = field;
            return this.datasetStats.ranking_author;
        },
        passDistributionSource() {
            return this.datasetStats.distribution_source;
        },
        passDistributionStation() {
            return this.datasetStats.distribution_station;
        },
        passWordCloudData() {
            return this.datasetStats.wordCloudData;
        },
        passRankingWord() {
            const title = ['高频词', '趋势', '频次', '指数'];
            const field = ['name', 'trend', 'value', 'ratio'];
            if (!this.datasetStats || !this.datasetStats.wordCloudData) {
                return {
                    content: [],
                    title: title,
                };
            }
            // 取前 15 个最高频词
            let rankingWord = this.datasetStats.wordCloudData.slice(0, 15);
            // 计算所有词频的总和
            let total = rankingWord.reduce((sum, item) => sum + item.value, 0);
            // 计算占比并添加 `ratio` 字段
            rankingWord = rankingWord.map(item => ({
                ...item,
                ratio: total > 0 ? (item.value / total * 100).toFixed(2) + "%" : "0.00%",
                trend: 'Uptrend'
            }));
            return {
                content: rankingWord,
                title: title,
                field: field,
            };
        },
        passAnalysisStatus() {
            return this.analysisStatus;
        },
        passAnalysisProcess() {
            return this.analysisProgress;
        }
    },
    components: {
        LineChart,
        MapChart,
        RankingBoard,
        StartBtn,
        Check,
        PieChart,
        WordCloud,
    },
    watch: {
        group: {
            immediate: true,
            handler: async function (newGroup, oldGroup) {
                if (oldGroup && oldGroup.id !== newGroup.id) {
                    await this.setGroupStatus(oldGroup.id);
                }
                if (newGroup && Object.keys(newGroup).length > 0 && JSON.stringify(newGroup) !== JSON.stringify(oldGroup)) {
                    this.fetchGroupStatus();
                    this.fetchDatasetStats();
                }
            },
            deep: true
        },
        model_selected: {
            handler: function (newVal) {
                const total = this.modelOptions.filter(option => option.status != 0).length;
                if (newVal.length === 0) {
                    this.checkAll_model = false;
                    this.indeterminate_model = false;
                }
                else if (newVal.length === total) {
                    this.checkAll_model = true;
                    this.indeterminate_model = false;
                }
                else {
                    this.indeterminate_model = true;
                }
            }
        },
        dataset_selected: {
            handler: function (newVal) {
                const total = this.datasetOptions.length;
                if (newVal.length === 0) {
                    this.checkAll_dataset = false;
                    this.indeterminate_dataset = false;
                }
                else if (newVal.length === total) {
                    this.checkAll_dataset = true;
                    this.indeterminate_dataset = false;
                }
                else {
                    this.indeterminate_dataset = true;
                }
            }
        },
        analysisProgress: {
            handler: function (newVal, oldVal) {
                if (newVal && oldVal != null) {
                    this.fetchAnalysisResult();
                }
            }
        },
        isChecked: {
            handler: function (newVal, oldVal) {
                if (newVal && !oldVal) {
                    this.analysisStatus = 'processing';
                    this.checkGroupStatus();
                }
                if (!newVal && oldVal) {
                    this.analysisStatus = 'start';
                }
            }
        },
    },
    methods: {
        async fetchGroupInfo(groupId) {
            const link = `/application/groups/${groupId}`;
            axios.post(link).then((response) => {
                this.group = response.data;
            }).catch((error) => {
                console.error(error);
            });
        },
        handleCheckChange() {
            if (this.group.default && this.store.state.user_perms !== 'administrator') {
                this.$message.error('当前用户没有权限操作默认应用');
                return;
            }
            this.isChecked = !this.isChecked;
        },
        handleCheckAll_model(val) {
            this.indeterminate_model = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.model_selected = this.modelOptions
                    .filter(option => option.status != 0)
                    .map(option => option.value);
            }
            else {
                this.model_selected = [];
            }
            this.fetchAnalysisResult();
        },
        handleCheckAll_dataset(val) {
            this.indeterminate_dataset = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.dataset_selected = this.datasetOptions
                    .map(option => option.value);
            }
            else {
                this.dataset_selected = [];
            }
            this.fetchAnalysisResult();
            this.fetchDatasetStats();
        },
        handleSettingChange(mode) {
            this.fetchAnalysisResult();
            if (mode === 'dataset') {
                this.fetchDatasetStats();
            }
        },
        async checkGroupStatus() {
            // 示例：调用接口检查任务状态
            if (this.isChecked) {
                axios.post(`/application/groups/${this.group.id}/checkGroupStatus`, {
                    model_list: this.model_selected
                }).then(response => {
                    // 处理响应数据，更新进度等
                    this.unprocessed = response.data.unprocessed;
                    this.total_data = response.data.total;
                    this.analysisProgress = response.data.progress;
                    const group_status = response.data.status;
                    if (group_status === 'finished') {
                        this.analysisStatus = 'finished';
                        // 如果任务完成，每10分钟检查一次
                        this.setStatusTimer(600000);
                    }
                    else {
                        this.analysisStatus = 'processing';
                        // 如果任务处理中，每10秒检查一次
                        this.setStatusTimer(10000);
                    }
                });
            }
        },
        setStatusTimer(delay) {
            // 清除之前的定时器
            if (this.statusTimer) {
                clearTimeout(this.statusTimer);
                this.statusTimer = null;
            }
            // 设定新的定时器，并保存引用
            this.statusTimer = setTimeout(() => {
                this.checkGroupStatus();
            }, delay);
        },
        async fetchDatasetStats() {
            const link = `/application/stats/dataset`;
            const requests = [
                { mode: 'map', target: 'map' },
                { mode: 'ranking_author', target: 'ranking_author' },
                { mode: 'distribution_station', target: 'distribution_station' },
                { mode: 'distribution_source', target: 'distribution_source' },
                { mode: 'word_frequency', target: 'wordCloudData' },
            ];
            try {
                const responses = await Promise.all(requests.map(item => axios.post(link, {
                    group_id: this.group.id,
                    mode: item.mode,
                    dataset_ids: this.dataset_selected,
                }, { timeout: 10000 })));
                responses.forEach((res, idx) => {
                    // 使用 requests 数组对应的 target 属性来设置 datasetStats
                    const target = requests[idx].target;
                    this.datasetStats[target] = res.data.response;
                });
            }
            catch (e) {
                this.$message.error(e);
            }
        },
        async fetchAnalysisResult() {
            const link = `/application/groups/${this.group.id}/analyze`;
            const loadingAnalysisStats = ElLoading.service({
                target: '.item_header_right',
                text: '加载中...',
            });
            axios.post(link, {
                mode: 'trend_line',
                model_ids: this.model_selected,
                dataset_ids: this.dataset_selected,
            }, {
                timeout: 10000
            }).then((response) => {
                this.LineChartData = response.data.response;
            }).catch((error) => {
                console.error(error);
            });
            axios.post(link, {
                mode: 'overall_stats',
                model_ids: this.model_selected,
                dataset_ids: this.dataset_selected,
            }, {
                timeout: 10000
            }).then((response) => {
                this.analysisStats = response.data.response;
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                loadingAnalysisStats.close();
            });
        },
        async fetchGroupStatus() {
            const link = `/application/groups/${this.group.id}/status`;
            axios.get(link).then((response) => {
                this.isChecked = response.data.checked;
                this.unprocessed = response.data.unprocessed;
                this.total_data = response.data.total;
                this.analysisProgress = response.data.progress;
                this.modelOptions = response.data.available_models;
                this.model_selected = response.data.current_model;
                const all_available_datasets = response.data.available_datasets || [];
                // 只保留 type === 'SOCIAL'
                this.datasetOptions = all_available_datasets
                    .filter(ds => ds.type_name === 'SOCIAL')
                    .map(ds => ({
                    label: ds.label,
                    value: ds.value
                }));
                this.dataset_selected = response.data.current_dataset;
                this.fetchAnalysisResult();
                this.fetchDatasetStats();
            });
        },
        async setGroupStatus(groupVal) {
            if (this.group.default && this.store.state.user_perms !== 'administrator')
                return;
            const gid = groupVal || this.group.id;
            const link = `/application/groups/${gid}/status`;
            const payload = {
                checked: this.isChecked,
                model_selected: this.model_selected,
                dataset_selected: this.dataset_selected
            };
            axios.post(link, payload).then((response) => {
                console.log(response.data.status);
            }).catch((e) => {
                console.error(e);
            });
        },
        customColorMethod(percentage) {
            if (percentage < 30) {
                return '#909399';
            }
            if (percentage < 70) {
                return '#e6a23c';
            }
            return '#67c23a';
        },
    },
    beforeUnmount() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.setGroupStatus();
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }
    },
    mounted() {
        const route = useRoute();
        const groupId = Number(route.params.groupId);
        this.fetchGroupInfo(groupId);
    },
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
const __VLS_componentsOption = {
    LineChart,
    MapChart,
    RankingBoard,
    StartBtn,
    Check,
    PieChart,
    WordCloud,
};
let __VLS_components;
let __VLS_directives;
['circle_description', 'circle_description', 'total_info', 'total_info', 'total_info', 'main_items', 'item',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("item_header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("item_header_left") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("item_header_title") },
});
const __VLS_0 = {}.StartBtn;
/** @type { [typeof __VLS_components.StartBtn, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    status: ((__VLS_ctx.passAnalysisStatus)),
    progress: ((__VLS_ctx.passAnalysisProcess)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    status: ((__VLS_ctx.passAnalysisStatus)),
    progress: ((__VLS_ctx.passAnalysisProcess)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.handleCheckChange)
};
let __VLS_3;
let __VLS_4;
var __VLS_5;
const __VLS_8 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.model_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择使用的模型"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((1)),
    ...{ style: ({}) },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.model_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择使用的模型"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((1)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_14;
const __VLS_15 = {
    onChange: (...[$event]) => {
        __VLS_ctx.handleSettingChange('model');
    }
};
let __VLS_11;
let __VLS_12;
{
    const { header: __VLS_thisSlot } = __VLS_13.slots;
    const __VLS_16 = {}.ElCheckbox;
    /** @type { [typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ] } */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_model)),
        indeterminate: ((__VLS_ctx.indeterminate_model)),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_model)),
        indeterminate: ((__VLS_ctx.indeterminate_model)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_22;
    const __VLS_23 = {
        onChange: (__VLS_ctx.handleCheckAll_model)
    };
    let __VLS_19;
    let __VLS_20;
    __VLS_21.slots.default;
    var __VLS_21;
}
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.modelOptions))) {
    const __VLS_24 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
        disabled: ((item.status == 0)),
    }));
    const __VLS_26 = __VLS_25({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
        disabled: ((item.status == 0)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
}
__VLS_13.slots.default;
var __VLS_13;
const __VLS_30 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.dataset_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择使用的数据集"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((1)),
    ...{ style: ({}) },
}));
const __VLS_32 = __VLS_31({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.dataset_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择使用的数据集"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((1)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
let __VLS_36;
const __VLS_37 = {
    onChange: (...[$event]) => {
        __VLS_ctx.handleSettingChange('dataset');
    }
};
let __VLS_33;
let __VLS_34;
{
    const { header: __VLS_thisSlot } = __VLS_35.slots;
    const __VLS_38 = {}.ElCheckbox;
    /** @type { [typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ] } */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_dataset)),
        indeterminate: ((__VLS_ctx.indeterminate_dataset)),
    }));
    const __VLS_40 = __VLS_39({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_dataset)),
        indeterminate: ((__VLS_ctx.indeterminate_dataset)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    let __VLS_44;
    const __VLS_45 = {
        onChange: (__VLS_ctx.handleCheckAll_dataset)
    };
    let __VLS_41;
    let __VLS_42;
    __VLS_43.slots.default;
    var __VLS_43;
}
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetOptions))) {
    const __VLS_46 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }));
    const __VLS_48 = __VLS_47({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
}
__VLS_35.slots.default;
var __VLS_35;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("total_info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info_item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
(__VLS_ctx.total_data);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("sub_items") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info_item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
(__VLS_ctx.unprocessed);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("sub_items") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info_item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
(__VLS_ctx.analysisProgress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("sub_items") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("progress_bar") },
});
const __VLS_52 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    showText: ((false)),
    strokeWidth: ((8)),
    percentage: ((__VLS_ctx.analysisProgress)),
    indeterminate: ((__VLS_ctx.analysisStatus === 'processing')),
    color: ((__VLS_ctx.customColorMethod)),
}));
const __VLS_54 = __VLS_53({
    showText: ((false)),
    strokeWidth: ((8)),
    percentage: ((__VLS_ctx.analysisProgress)),
    indeterminate: ((__VLS_ctx.analysisStatus === 'processing')),
    color: ((__VLS_ctx.customColorMethod)),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("item_header_right") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("right_item") },
});
const __VLS_58 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.positive * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("success"),
    width: ((96)),
}));
const __VLS_60 = __VLS_59({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.positive * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("success"),
    width: ((96)),
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: ("@/assets/icons/happy.svg"),
    alt: ("icon"),
    ...{ style: ({}) },
});
__VLS_63.slots.default;
var __VLS_63;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("circle_description") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
(__VLS_ctx.analysisStats.positive);
const __VLS_64 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.positive * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}));
const __VLS_66 = __VLS_65({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.positive * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("right_item") },
});
const __VLS_70 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.neutral * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("warning"),
    width: ((96)),
}));
const __VLS_72 = __VLS_71({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.neutral * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("warning"),
    width: ((96)),
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: ("@/assets/icons/smile.svg"),
    alt: ("icon"),
    ...{ style: ({}) },
});
__VLS_75.slots.default;
var __VLS_75;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("circle_description") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
(__VLS_ctx.analysisStats.neutral);
const __VLS_76 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.neutral * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}));
const __VLS_78 = __VLS_77({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.neutral * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("right_item") },
});
const __VLS_82 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.negative * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("exception"),
    width: ((96)),
}));
const __VLS_84 = __VLS_83({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.negative * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("exception"),
    width: ((96)),
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: ("@/assets/icons/sad.svg"),
    alt: ("icon"),
    ...{ style: ({}) },
});
__VLS_87.slots.default;
var __VLS_87;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("circle_description") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
(__VLS_ctx.analysisStats.negative);
const __VLS_88 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.negative * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}));
const __VLS_90 = __VLS_89({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.negative * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("right_item") },
});
const __VLS_94 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
    type: ("circle"),
    percentage: ((0)),
    status: ("success"),
    width: ((96)),
}));
const __VLS_96 = __VLS_95({
    type: ("circle"),
    percentage: ((0)),
    status: ("success"),
    width: ((96)),
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: ("@/assets/icons/alert.svg"),
    alt: ("icon"),
    ...{ style: ({}) },
});
__VLS_99.slots.default;
var __VLS_99;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("circle_description") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("main_items") },
});
const __VLS_100 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    strokeWidth: ((5)),
    percentage: ((0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}));
const __VLS_102 = __VLS_101({
    strokeWidth: ((5)),
    percentage: ((0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list") },
});
const __VLS_106 = {}.LineChart;
/** @type { [typeof __VLS_components.LineChart, typeof __VLS_components.LineChart, ] } */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    content: ((__VLS_ctx.passLineChartData)),
}));
const __VLS_108 = __VLS_107({
    content: ((__VLS_ctx.passLineChartData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list_row") },
});
const __VLS_112 = {}.MapChart;
/** @type { [typeof __VLS_components.MapChart, typeof __VLS_components.MapChart, ] } */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    mapData: ((__VLS_ctx.passMapChartData)),
}));
const __VLS_114 = __VLS_113({
    mapData: ((__VLS_ctx.passMapChartData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
const __VLS_118 = {}.RankingBoard;
/** @type { [typeof __VLS_components.RankingBoard, typeof __VLS_components.RankingBoard, ] } */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    header_content: ("媒体活跃度排名"),
    ranking_data: ((__VLS_ctx.passAuthorActivityData)),
}));
const __VLS_120 = __VLS_119({
    header_content: ("媒体活跃度排名"),
    ranking_data: ((__VLS_ctx.passAuthorActivityData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list_row") },
});
const __VLS_124 = {}.PieChart;
/** @type { [typeof __VLS_components.PieChart, typeof __VLS_components.PieChart, ] } */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    header_content: ("数据来源分布"),
    pieData: ((__VLS_ctx.passDistributionSource)),
}));
const __VLS_126 = __VLS_125({
    header_content: ("数据来源分布"),
    pieData: ((__VLS_ctx.passDistributionSource)),
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
const __VLS_130 = {}.PieChart;
/** @type { [typeof __VLS_components.PieChart, typeof __VLS_components.PieChart, ] } */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    header_content: ("数据站点分布"),
    pieData: ((__VLS_ctx.passDistributionStation)),
}));
const __VLS_132 = __VLS_131({
    header_content: ("数据站点分布"),
    pieData: ((__VLS_ctx.passDistributionStation)),
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list_row") },
});
const __VLS_136 = {}.WordCloud;
/** @type { [typeof __VLS_components.WordCloud, typeof __VLS_components.WordCloud, ] } */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    wordCloudData: ((__VLS_ctx.passWordCloudData)),
}));
const __VLS_138 = __VLS_137({
    wordCloudData: ((__VLS_ctx.passWordCloudData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
const __VLS_142 = {}.RankingBoard;
/** @type { [typeof __VLS_components.RankingBoard, typeof __VLS_components.RankingBoard, ] } */ ;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
    header_content: ("高频词指数"),
    ranking_data: ((__VLS_ctx.passRankingWord)),
}));
const __VLS_144 = __VLS_143({
    header_content: ("高频词指数"),
    ranking_data: ((__VLS_ctx.passRankingWord)),
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
['item', 'item_header', 'item_header_left', 'item_header_title', 'total_info', 'info_item', 'main_items', 'sub_items', 'info_item', 'main_items', 'sub_items', 'info_item', 'main_items', 'sub_items', 'progress_bar', 'item_header_right', 'right_item', 'circle_description', 'main_items', 'right_item', 'circle_description', 'main_items', 'right_item', 'circle_description', 'main_items', 'right_item', 'circle_description', 'main_items', 'chart_list', 'chart_list_row', 'chart_list_row', 'chart_list_row',];
var __VLS_special;
let __VLS_self;
