import { defineComponent } from 'vue';
import LineChart from './trendLine_sentiment.vue';
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
import AutoScrollWindow from '@/components/RollingView.vue';
export default defineComponent({
    name: 'DataChart',
    data() {
        return {
            importBoxVisible: false,
            // 导入数据集相关变量
            datasetExcept: [],
            datasetSelectable: [],
            datasetToImport: [],
            model_selected: [],
            model_selected_tmp: null,
            analysisStats: {
                total: 0,
                normal: 0,
                illegal: 0,
                normal_data: [],
                illegal_data: [],
            },
            dataset_selected: [],
            analysisProgress: 0,
            LineChartData: null,
            modelOptions: [],
            datasetOptions: [],
            isChecked: false,
            analysisStatus: 'start',
            unprocessed: 0,
            intervalId: null, // 存储定时器ID
            checkAll_model: false,
            indeterminate_model: false,
            checkAll_dataset: false,
            indeterminate_dataset: false,
            datasetStats: {
                map: [],
                ranking_author: [],
                distribution_source: [],
                distribution_station: [],
                wordCloudData: [],
                ranking_word: [],
            },
            rows_pos: [],
            rows_neg: [],
            name_trans: {
                'bert_history_nihilism': 'BERT_历史虚无主义',
                'bert_polity_speech': 'BERT_政治言论',
                'bert_gender_discrimination': 'BERT_性别歧视',
                'bert_army_loans': 'BERT_网络借贷',
                'bert_people_locaion_leak': 'BERT_单位、人员信息',
                'bert_blacken_army_style': 'BERT_抹黑造谣',
                'bert_army_marriage': 'BERT_婚恋纠纷',
                'bert_army_rumor': 'BERT_谣言',
                'bert_army_adapt_leak': 'BERT_组织编制',
                'bert_weapon_leak': 'BERT_装备动态',
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
            return Number(this.analysisProgress ?? 0);
        },
        passRollingTextPos() {
            return this.rows_pos;
        },
        passRollingTextNeg() {
            return this.rows_neg;
        },
    },
    components: {
        LineChart,
        MapChart,
        RankingBoard,
        StartBtn,
        Check,
        PieChart,
        WordCloud,
        AutoScrollWindow,
    },
    watch: {
        group: {
            immediate: true,
            handler: async function (newGroup, oldGroup) {
                console.log('group change', newGroup, oldGroup);
                // if (oldGroup && oldGroup.id !== newGroup.id) {
                //     await this.setGroupStatus(oldGroup.id)
                // }
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
            const link = `/application/groups/11`;
            axios.post(link).then((response) => {
                this.group = response.data;
                this.fetchAvaiableDataset();
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
            this.model_selected = [this.model_selected_tmp];
            this.fetchAnalysisResult();
            if (mode === 'dataset') {
                this.fetchDatasetStats();
            }
        },
        handleImportClose() {
            this.importBoxVisible = false;
        },
        importDataset() {
            this.importBoxVisible = true;
        },
        async fetchAvaiableDataset() {
            const link = `/application/groups/${this.group.id}/AvaiableDataset`;
            axios.get(link).then((response) => {
                this.datasetSelectable = response.data.datasets;
                this.datasetExcept = response.data.except;
            }).catch((e) => {
                this.$message.error(e);
            });
        },
        async handleImportSummit() {
            const link = `/application/groups/${this.group.id}/ImportDataset`;
            const payload = {
                dataset_ids: this.datasetToImport
            };
            const loadingImport = ElLoading.service({
                target: '#importDatasetBox',
                text: '导入中，请稍候...',
            });
            axios.post(link, payload).then((response) => {
                this.fetchAvaiableDataset();
                this.importBoxVisible = false;
            }).catch((e) => {
                this.$message.error(e);
            }).finally(() => {
                loadingImport.close();
            });
        },
        async checkGroupStatus() {
            // 示例：调用接口检查任务状态
            if (this.isChecked) {
                console.log("进入check 组状态");
                axios.post(`/application/groups/${this.group.id}/checkGroupStatus`, {
                    model_list: this.model_selected,
                    dataset_ids: this.dataset_selected
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
                    if (group_status === 'error') {
                        this.analysisStatus = 'finished';
                        // 如果任务完成，每10分钟检查一次
                        this.setStatusTimer(600000);
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
                // { mode: 'map', target: 'map' },
                // { mode: 'ranking_author', target: 'ranking_author' },
                // { mode: 'distribution_station', target: 'distribution_station' },
                // { mode: 'distribution_source', target: 'distribution_source' },
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
            const link2 = `/application/groups/illegal/analyze`;
            const loadingAnalysisStats = ElLoading.service({
                target: '.item_header_right',
                text: '加载中...',
            });
            axios.post(link2, {
                mode: 'overall_stats',
                model_ids: this.model_selected,
                dataset_ids: this.dataset_selected,
            }, {
                timeout: 10000
            }).then((response) => {
                this.analysisStats = response.data.response;
                this.rows_pos = this.analysisStats["normal_data"];
                this.rows_neg = this.analysisStats["illegal_data"];
                this.unprocessed = response.data.unprocessed;
                this.total_data = response.data.total;
                this.analysisProgress = response.data.progress;
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                loadingAnalysisStats.close();
            });
        },
        async fetchGroupStatus() {
            const link = `/application/groups/${this.group.id}/status`;
            const link2 = `/application/groups/illegal/status`;
            axios.get(link2).then((response) => {
                this.isChecked = response.data.checked;
                this.unprocessed = response.data.unprocessed;
                this.total_data = response.data.total;
                this.analysisProgress = response.data.progress;
                this.modelOptions = response.data.available_models;
                this.model_selected = response.data.current_model;
                this.model_selected_tmp = this.model_selected[0];
                console.log("模型选择", this.model_selected);
                const all_available_datasets = response.data.available_datasets || [];
                // 只保留 type === 'SOCIAL'
                this.datasetOptions = all_available_datasets
                    .filter(ds => ds.type_name === 'SOCIAL')
                    .map(ds => ({
                    label: ds.label,
                    value: ds.value
                }));
                this.dataset_selected = response.data.current_dataset;
                console.log("数据集选择", this.dataset_selected);
                // this.fetchRollingText()
                this.fetchAnalysisResult();
                this.fetchDatasetStats();
            });
        },
        // 有问题无法执行
        async setGroupStatus(groupVal) {
            if (this.group?.default && this.store.state.user_perms !== 'administrator')
                return;
            const gid = groupVal || this.group?.id;
            if (!gid)
                return;
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
        getModelLabel(label) {
            return this.name_trans[label] ?? label;
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
        if (this.group) {
            this.setGroupStatus(this.group.id);
        }
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
    AutoScrollWindow,
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
    modelValue: ((__VLS_ctx.model_selected_tmp)),
    placeholder: ("请选择使用的模型"),
    popperClass: ("custom-header"),
    ...{ style: ({}) },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.model_selected_tmp)),
    placeholder: ("请选择使用的模型"),
    popperClass: ("custom-header"),
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
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.modelOptions))) {
    const __VLS_16 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        key: ((item.value)),
        label: ((__VLS_ctx.getModelLabel(item.label))),
        value: ((item.value)),
        disabled: ((item.status == 0)),
    }));
    const __VLS_18 = __VLS_17({
        key: ((item.value)),
        label: ((__VLS_ctx.getModelLabel(item.label))),
        value: ((item.value)),
        disabled: ((item.status == 0)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
__VLS_13.slots.default;
var __VLS_13;
const __VLS_22 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
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
const __VLS_24 = __VLS_23({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.dataset_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择使用的数据集"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((1)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_28;
const __VLS_29 = {
    onChange: (...[$event]) => {
        __VLS_ctx.handleSettingChange('dataset');
    }
};
let __VLS_25;
let __VLS_26;
{
    const { header: __VLS_thisSlot } = __VLS_27.slots;
    const __VLS_30 = {}.ElCheckbox;
    /** @type { [typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_dataset)),
        indeterminate: ((__VLS_ctx.indeterminate_dataset)),
    }));
    const __VLS_32 = __VLS_31({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_dataset)),
        indeterminate: ((__VLS_ctx.indeterminate_dataset)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    let __VLS_36;
    const __VLS_37 = {
        onChange: (__VLS_ctx.handleCheckAll_dataset)
    };
    let __VLS_33;
    let __VLS_34;
    __VLS_35.slots.default;
    var __VLS_35;
}
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetOptions))) {
    const __VLS_38 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }));
    const __VLS_40 = __VLS_39({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
}
__VLS_27.slots.default;
var __VLS_27;
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
if (!__VLS_ctx.group?.default || __VLS_ctx.store.state.user_perms === 'administrator') {
    const __VLS_44 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_50;
    const __VLS_51 = {
        onClick: (__VLS_ctx.importDataset)
    };
    let __VLS_47;
    let __VLS_48;
    __VLS_49.slots.default;
    var __VLS_49;
}
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
        ? parseFloat((__VLS_ctx.analysisStats.normal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("success"),
    width: ((96)),
}));
const __VLS_60 = __VLS_59({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.normal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
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
(__VLS_ctx.analysisStats.normal);
const __VLS_64 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.normal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}));
const __VLS_66 = __VLS_65({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.normal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
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
        ? parseFloat((__VLS_ctx.analysisStats.illegal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("exception"),
    width: ((96)),
}));
const __VLS_72 = __VLS_71({
    type: ("circle"),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.illegal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    status: ("exception"),
    width: ((96)),
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: ("@/assets/icons/sad.svg"),
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
(__VLS_ctx.analysisStats.illegal);
const __VLS_76 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.illegal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}));
const __VLS_78 = __VLS_77({
    strokeWidth: ((5)),
    percentage: ((__VLS_ctx.analysisStats.total > 0
        ? parseFloat((__VLS_ctx.analysisStats.illegal * 100 / __VLS_ctx.analysisStats.total).toFixed(1)) : 0)),
    color: ((__VLS_ctx.customColorMethod)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list_row") },
});
const __VLS_82 = {}.AutoScrollWindow;
/** @type { [typeof __VLS_components.AutoScrollWindow, ] } */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
    items: ((__VLS_ctx.passRollingTextPos)),
    title: ("正常内容"),
}));
const __VLS_84 = __VLS_83({
    items: ((__VLS_ctx.passRollingTextPos)),
    title: ("正常内容"),
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
const __VLS_88 = {}.AutoScrollWindow;
/** @type { [typeof __VLS_components.AutoScrollWindow, ] } */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    items: ((__VLS_ctx.passRollingTextNeg)),
    title: ("风险信息"),
}));
const __VLS_90 = __VLS_89({
    items: ((__VLS_ctx.passRollingTextNeg)),
    title: ("风险信息"),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart_list_row") },
});
const __VLS_94 = {}.WordCloud;
/** @type { [typeof __VLS_components.WordCloud, typeof __VLS_components.WordCloud, ] } */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
    wordCloudData: ((__VLS_ctx.passWordCloudData)),
}));
const __VLS_96 = __VLS_95({
    wordCloudData: ((__VLS_ctx.passWordCloudData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
const __VLS_100 = {}.RankingBoard;
/** @type { [typeof __VLS_components.RankingBoard, typeof __VLS_components.RankingBoard, ] } */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    header_content: ("高频词指数"),
    ranking_data: ((__VLS_ctx.passRankingWord)),
}));
const __VLS_102 = __VLS_101({
    header_content: ("高频词指数"),
    ranking_data: ((__VLS_ctx.passRankingWord)),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
const __VLS_106 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    modelValue: ((__VLS_ctx.importBoxVisible)),
    labelWidth: ("auto"),
    closeOnClickModal: ((false)),
    width: ("480px"),
    id: ("importDatasetBox"),
}));
const __VLS_108 = __VLS_107({
    modelValue: ((__VLS_ctx.importBoxVisible)),
    labelWidth: ("auto"),
    closeOnClickModal: ((false)),
    width: ("480px"),
    id: ("importDatasetBox"),
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
{
    const { header: __VLS_thisSlot } = __VLS_111.slots;
    const [{ titleId, titleClass }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
        ...{ style: ({}) },
        id: ((titleId)),
        ...{ class: ((titleClass)) },
    });
}
const __VLS_112 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    modelValue: ((__VLS_ctx.datasetToImport)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择导入的数据集"),
    popperClass: ("custom-header"),
    ...{ style: ({}) },
}));
const __VLS_114 = __VLS_113({
    modelValue: ((__VLS_ctx.datasetToImport)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择导入的数据集"),
    popperClass: ("custom-header"),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetSelectable))) {
    const __VLS_118 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
        disabled: ((__VLS_ctx.datasetExcept.includes(item.value))),
    }));
    const __VLS_120 = __VLS_119({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
        disabled: ((__VLS_ctx.datasetExcept.includes(item.value))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
}
__VLS_117.slots.default;
var __VLS_117;
{
    const { footer: __VLS_thisSlot } = __VLS_111.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    const __VLS_124 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_130;
    const __VLS_131 = {
        onClick: (__VLS_ctx.handleImportClose)
    };
    let __VLS_127;
    let __VLS_128;
    __VLS_129.slots.default;
    var __VLS_129;
    const __VLS_132 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_138;
    const __VLS_139 = {
        onClick: (__VLS_ctx.handleImportSummit)
    };
    let __VLS_135;
    let __VLS_136;
    __VLS_137.slots.default;
    var __VLS_137;
}
__VLS_111.slots.default;
var __VLS_111;
['item', 'item_header', 'item_header_left', 'item_header_title', 'total_info', 'info_item', 'main_items', 'sub_items', 'info_item', 'main_items', 'sub_items', 'info_item', 'main_items', 'sub_items', 'progress_bar', 'item_header_right', 'right_item', 'circle_description', 'main_items', 'right_item', 'circle_description', 'main_items', 'chart_list', 'chart_list_row', 'chart_list_row', 'title', 'dialog-footer',];
var __VLS_special;
let __VLS_self;
