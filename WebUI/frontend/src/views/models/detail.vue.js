import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/api/axios';
import { formatDateTime } from '@/utils/date';
import TaskChart from '@/components/TaskChart.vue';
import DatasetTable from '@/views/models/datasetTable.vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
// Refs and reactive state
const route = useRoute();
const dataTableRef = ref(null);
const matrixChartRef = ref(null);
const analyzing = ref(false);
const datasetSelectable = ref([]);
const datasetToTest = ref(null);
const tableHeight = ref(0);
const overviewMetrics = ref({});
const classificationReport = ref([]);
const confusion = ref([]);
const model = ref({
    author: '',
    base_model: { alias: '', label: '', model_type: '', status: '', task_type: '', value: 0 },
    created_at: '',
    description: '',
    label: '',
    shared: false,
    size: 0,
    updated_at: '',
    value: 0,
    hyperparameters: {
        autoAssign: true,
        batch_size: 1,
        device: '',
        distributed: false,
        epochs: 1,
        learning_rate: 0,
        loss_function: '',
        mixedPrecision: false,
        optimizer: '',
        use_pretrained: false,
    },
    trainset: {},
});
const model_status = reactive({
    id: 'model_detail',
    status: 'queued',
    progress: 0,
    error_message: '',
    complete: false,
    result: { loss: [] },
});
// Computed
const statusClass = computed(() => {
    switch (model_status.status) {
        case 'failed': return 'status-failed';
        case 'queued': return 'status-queued';
        case 'started': return 'status-started';
        case 'finished':
        case 'complete': return 'status-finished';
        default: return '';
    }
});
// Helpers
function formatParamSize(size) {
    if (size >= 1024 ** 3)
        return { size: (size / 1024 ** 3).toFixed(1), unit: 'GB' };
    if (size >= 1024 ** 2)
        return { size: (size / 1024 ** 2).toFixed(1), unit: 'MB' };
    if (size >= 1024)
        return { size: (size / 1024).toFixed(1), unit: 'KB' };
    return { size, unit: 'Bytes' };
}
function formatModelStatus(status) {
    switch (status) {
        case 'complete': return '训练已完成';
        case 'failed': return '训练任务失败';
        case 'queued': return '训练任务排队中';
        case 'started': return '训练中';
        case 'finished': return '训练已完成';
        default: return status;
    }
}
async function testCheckpoint() {
    if (!datasetToTest.value) {
        ElMessage.warning('请先选择要测试的数据集');
        return;
    }
    const child = dataTableRef.value;
    if (child?.analyzeTable) {
        try {
            analyzing.value = true;
            await child.analyzeTable();
        }
        catch (error) {
            console.error('Error analyze data:', error);
        }
        finally {
            analyzing.value = false;
        }
    }
}
async function fetchDatasetSelectable() {
    try {
        const link = `/models/test_checkpoint/available_datasets`;
        const payload = { checkpoint_id: route.params.model_id };
        const { data } = await axios.post(link, payload);
        datasetSelectable.value = data;
    }
    catch (error) {
        console.error(error);
    }
}
async function fetchModelDetail() {
    try {
        const link = `/models/${route.params.model_id}/detail`;
        const { data } = await axios.get(link, {
            timeout: 10000,
        });
        model.value = data;
        overviewMetrics.value = data.metrics.overview;
        classificationReport.value = data.metrics.classification;
        confusion.value = data.metrics.confusion;
        datasetToTest.value = data.trainset.value;
        await nextTick();
        drawMatrixChart();
    }
    catch (e) {
        console.error(e);
    }
}
async function fetchModelStatus() {
    try {
        const link = `/models/${route.params.model_id}/status`;
        const { data } = await axios.get(link, {
            timeout: 10000,
        });
        Object.assign(model_status, data);
        await fetchModelDetail();
        if (data.status !== 'complete' && data.status !== 'finished') {
            setTimeout(fetchModelStatus, 1000);
        }
    }
    catch (error) {
        console.error(error);
    }
}
function drawMatrixChart() {
    if (!matrixChartRef.value)
        return;
    const chart = echarts.init(matrixChartRef.value);
    const labels = classificationReport.value.map(r => r.class);
    const maxCount = Math.max(...confusion.value.map(c => c[2]), 0);
    chart.setOption({
        tooltip: {
            trigger: 'item',
            formatter: params => {
                const [i, j, cnt] = params.data;
                return `<div><strong>实际：</strong>${labels[i]}<br/><strong>预测：</strong>${labels[j]}<br/><strong>数量：</strong>${cnt}</div>`;
            },
            backgroundColor: 'rgba(50,50,50,0.7)',
            textStyle: { color: '#fff' },
            extraCssText: 'padding:10px; border-radius:4px;',
        },
        xAxis: { type: 'category', data: labels, nameLocation: 'middle', nameGap: 30 },
        yAxis: { type: 'category', data: labels, nameLocation: 'middle', nameGap: 40, inverse: true },
        grid: { left: 0, right: 0, top: '10%', bottom: '25%', containLabel: true },
        visualMap: { min: 0, max: maxCount, calculable: true, orient: 'horizontal', left: 'center', bottom: 0 },
        series: [{ name: '混淆矩阵', type: 'heatmap', data: confusion.value, label: { show: true, formatter: ({ value }) => value[2] } }],
    });
}
// const classificationTable = ref<InstanceType<typeof DatasetTable> | null>(null)
// function adjustTableHeight() {
//   const el = classificationTable.value?.$el?.parentElement
//   if (el) tableHeight.value = el.offsetHeight - 40
// }
// Lifecycle
onMounted(() => {
    fetchDatasetSelectable();
    fetchModelStatus();
    // nextTick().then(adjustTableHeight)
    // window.addEventListener('resize', adjustTableHeight)
});
onBeforeUnmount(() => {
    // window.removeEventListener('resize', adjustTableHeight)
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['metric-card', 'chart-card', 'info-card',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-detail-container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-meta") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: ("model-title") },
});
(__VLS_ctx.model.base_model.alias + '/' + __VLS_ctx.model.author + '/' + __VLS_ctx.model.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("author-info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("author-details") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("author-name") },
});
(__VLS_ctx.model.author);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("update-time") },
});
(__VLS_ctx.formatDateTime(__VLS_ctx.model.created_at));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("meta-tags") },
});
const __VLS_0 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    type: ((__VLS_ctx.model.shared ? 'success' : 'info')),
    effect: ("dark"),
    ...{ class: ("shared-tag") },
}));
const __VLS_2 = __VLS_1({
    type: ((__VLS_ctx.model.shared ? 'success' : 'info')),
    effect: ("dark"),
    ...{ class: ("shared-tag") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
(__VLS_ctx.model.shared ? '公共模型' : '私有模型');
__VLS_5.slots.default;
var __VLS_5;
if (__VLS_ctx.formatParamSize(__VLS_ctx.model.size).unit === 'GB') {
    const __VLS_6 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        type: ("warning"),
    }));
    const __VLS_8 = __VLS_7({
        type: ("warning"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    (__VLS_ctx.formatParamSize(__VLS_ctx.model.size).size + __VLS_ctx.formatParamSize(__VLS_ctx.model.size).unit);
    __VLS_11.slots.default;
    var __VLS_11;
}
else {
    const __VLS_12 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        type: ("info"),
    }));
    const __VLS_14 = __VLS_13({
        type: ("info"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    (__VLS_ctx.formatParamSize(__VLS_ctx.model.size).size + __VLS_ctx.formatParamSize(__VLS_ctx.model.size).unit);
    __VLS_17.slots.default;
    var __VLS_17;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-cards") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-wrapper") },
});
const __VLS_18 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    ...{ class: ("info-card") },
}));
const __VLS_20 = __VLS_19({
    ...{ class: ("info-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
{
    const { header: __VLS_thisSlot } = __VLS_23.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("card-title") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.model.base_model.alias);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.model.base_model.task_type);
__VLS_23.slots.default;
var __VLS_23;
const __VLS_24 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ class: ("info-card") },
}));
const __VLS_26 = __VLS_25({
    ...{ class: ("info-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
{
    const { header: __VLS_thisSlot } = __VLS_29.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("card-title") },
    });
}
const __VLS_30 = {}.ElDescriptions;
/** @type { [typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ] } */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    column: ((4)),
    border: (true),
}));
const __VLS_32 = __VLS_31({
    column: ((4)),
    border: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const __VLS_36 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: ("优化器"),
}));
const __VLS_38 = __VLS_37({
    label: ("优化器"),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
(__VLS_ctx.model?.hyperparameters?.optimizer);
__VLS_41.slots.default;
var __VLS_41;
const __VLS_42 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    label: ("学习率"),
}));
const __VLS_44 = __VLS_43({
    label: ("学习率"),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
(__VLS_ctx.model?.hyperparameters?.learning_rate);
__VLS_47.slots.default;
var __VLS_47;
const __VLS_48 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: ("训练轮数"),
}));
const __VLS_50 = __VLS_49({
    label: ("训练轮数"),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
(__VLS_ctx.model?.hyperparameters?.epochs);
__VLS_53.slots.default;
var __VLS_53;
const __VLS_54 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    label: ("Batch Size"),
}));
const __VLS_56 = __VLS_55({
    label: ("Batch Size"),
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
(__VLS_ctx.model?.hyperparameters?.batch_size);
__VLS_59.slots.default;
var __VLS_59;
const __VLS_60 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: ("设备"),
}));
const __VLS_62 = __VLS_61({
    label: ("设备"),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
(__VLS_ctx.model?.hyperparameters?.device);
__VLS_65.slots.default;
var __VLS_65;
const __VLS_66 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    label: ("混合精度"),
}));
const __VLS_68 = __VLS_67({
    label: ("混合精度"),
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
(__VLS_ctx.model?.hyperparameters?.mixedPrecision ? '启用' : '禁用');
__VLS_71.slots.default;
var __VLS_71;
const __VLS_72 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: ("损失函数"),
}));
const __VLS_74 = __VLS_73({
    label: ("损失函数"),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
(__VLS_ctx.model?.hyperparameters?.loss_function);
__VLS_77.slots.default;
var __VLS_77;
const __VLS_78 = {}.ElDescriptionsItem;
/** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    label: ("预训练参数"),
}));
const __VLS_80 = __VLS_79({
    label: ("预训练参数"),
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
(__VLS_ctx.model?.hyperparameters?.use_pretrained ? '启用' : '禁用');
__VLS_83.slots.default;
var __VLS_83;
__VLS_35.slots.default;
var __VLS_35;
__VLS_29.slots.default;
var __VLS_29;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("training-process") },
});
const __VLS_84 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
{
    const { header: __VLS_thisSlot } = __VLS_89.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("status-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("status-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("status-value") },
        ...{ class: ((__VLS_ctx.statusClass)) },
    });
    (__VLS_ctx.formatModelStatus(__VLS_ctx.model_status.status));
    const __VLS_90 = {}.ElTooltip;
    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        content: ("此处会展示模型训练的进度"),
        placement: ("top"),
    }));
    const __VLS_92 = __VLS_91({
        content: ("此处会展示模型训练的进度"),
        placement: ("top"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    const __VLS_96 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
    const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
    const __VLS_102 = {}.QuestionFilled;
    /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({}));
    const __VLS_104 = __VLS_103({}, ...__VLS_functionalComponentArgsRest(__VLS_103));
    __VLS_101.slots.default;
    var __VLS_101;
    __VLS_95.slots.default;
    var __VLS_95;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("task-status") },
});
if (__VLS_ctx.model_status.status === 'failed') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error-message") },
    });
    (__VLS_ctx.model_status.error_message);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-bar") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-bar-inner") },
        ...{ style: (({ width: __VLS_ctx.model_status.progress + '%' })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("progress-percent") },
    });
    (__VLS_ctx.model_status.progress);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("loss-chart") },
});
// @ts-ignore
/** @type { [typeof TaskChart, ] } */ ;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent(TaskChart, new TaskChart({
    task_id: ((__VLS_ctx.model_status.id)),
    content: ((__VLS_ctx.model_status?.result?.loss)),
}));
const __VLS_109 = __VLS_108({
    task_id: ((__VLS_ctx.model_status.id)),
    content: ((__VLS_ctx.model_status?.result?.loss)),
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
__VLS_89.slots.default;
var __VLS_89;
if (__VLS_ctx.model_status.status === 'complete') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("evaluation-container") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("metric-overview") },
    });
    for (const [value, key] of __VLS_getVForSourceType((__VLS_ctx.overviewMetrics))) {
        const __VLS_113 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
            key: ((key)),
            ...{ class: ("metric-card") },
        }));
        const __VLS_115 = __VLS_114({
            key: ((key)),
            ...{ class: ("metric-card") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_114));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("metric-header") },
        });
        (key);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("metric-value") },
        });
        (value);
        __VLS_118.slots.default;
        var __VLS_118;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("main-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("left-panel") },
    });
    const __VLS_119 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
        ...{ class: ("report-card") },
    }));
    const __VLS_121 = __VLS_120({
        ...{ class: ("report-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    {
        const { header: __VLS_thisSlot } = __VLS_124.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_125 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
            content: ("不同分类的指标"),
            placement: ("top"),
        }));
        const __VLS_127 = __VLS_126({
            content: ("不同分类的指标"),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_126));
        const __VLS_131 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({}));
        const __VLS_133 = __VLS_132({}, ...__VLS_functionalComponentArgsRest(__VLS_132));
        const __VLS_137 = {}.QuestionFilled;
        /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
        // @ts-ignore
        const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({}));
        const __VLS_139 = __VLS_138({}, ...__VLS_functionalComponentArgsRest(__VLS_138));
        __VLS_136.slots.default;
        var __VLS_136;
        __VLS_130.slots.default;
        var __VLS_130;
    }
    const __VLS_143 = {}.ElTable;
    /** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
        ref: ("classificationTable"),
        data: ((__VLS_ctx.classificationReport)),
        border: (true),
        stripe: (true),
        maxHeight: ("240"),
        cellStyle: (({ height: '100px', padding: '12px 0' })),
    }));
    const __VLS_145 = __VLS_144({
        ref: ("classificationTable"),
        data: ((__VLS_ctx.classificationReport)),
        border: (true),
        stripe: (true),
        maxHeight: ("240"),
        cellStyle: (({ height: '100px', padding: '12px 0' })),
    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
    // @ts-ignore navigation for `const classificationTable = ref()`
    /** @type { typeof __VLS_ctx.classificationTable } */ ;
    var __VLS_149 = {};
    const __VLS_150 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        prop: ("class"),
        label: ("类别"),
        width: ("120"),
    }));
    const __VLS_152 = __VLS_151({
        prop: ("class"),
        label: ("类别"),
        width: ("120"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    const __VLS_156 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        prop: ("precision"),
        label: ("精确率"),
    }));
    const __VLS_158 = __VLS_157({
        prop: ("precision"),
        label: ("精确率"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    const __VLS_162 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
        prop: ("recall"),
        label: ("召回率"),
    }));
    const __VLS_164 = __VLS_163({
        prop: ("recall"),
        label: ("召回率"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    const __VLS_168 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        prop: ("f1_score"),
        label: ("F1值"),
    }));
    const __VLS_170 = __VLS_169({
        prop: ("f1_score"),
        label: ("F1值"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    const __VLS_174 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
        prop: ("support"),
        label: ("样本数"),
    }));
    const __VLS_176 = __VLS_175({
        prop: ("support"),
        label: ("样本数"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_175));
    __VLS_148.slots.default;
    var __VLS_148;
    __VLS_124.slots.default;
    var __VLS_124;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("right-panel") },
    });
    const __VLS_180 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        ...{ class: ("matrix-card") },
    }));
    const __VLS_182 = __VLS_181({
        ...{ class: ("matrix-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    {
        const { header: __VLS_thisSlot } = __VLS_185.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_186 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
            content: ("混淆矩阵"),
            placement: ("top"),
        }));
        const __VLS_188 = __VLS_187({
            content: ("混淆矩阵"),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_187));
        const __VLS_192 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
        const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
        const __VLS_198 = {}.QuestionFilled;
        /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
        // @ts-ignore
        const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({}));
        const __VLS_200 = __VLS_199({}, ...__VLS_functionalComponentArgsRest(__VLS_199));
        __VLS_197.slots.default;
        var __VLS_197;
        __VLS_191.slots.default;
        var __VLS_191;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: ("matrixChartRef"),
        ...{ class: ("matrix-chart") },
    });
    // @ts-ignore navigation for `const matrixChartRef = ref()`
    /** @type { typeof __VLS_ctx.matrixChartRef } */ ;
    __VLS_185.slots.default;
    var __VLS_185;
}
if (__VLS_ctx.model_status.status === 'complete') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("evaluation-container") },
    });
    const __VLS_204 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({}));
    const __VLS_206 = __VLS_205({}, ...__VLS_functionalComponentArgsRest(__VLS_205));
    {
        const { header: __VLS_thisSlot } = __VLS_209.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("status-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("status-label") },
        });
        const __VLS_210 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
            content: ("在下方选择数据集测试训练完成的模型性能"),
            placement: ("top"),
        }));
        const __VLS_212 = __VLS_211({
            content: ("在下方选择数据集测试训练完成的模型性能"),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_211));
        const __VLS_216 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({}));
        const __VLS_218 = __VLS_217({}, ...__VLS_functionalComponentArgsRest(__VLS_217));
        const __VLS_222 = {}.QuestionFilled;
        /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
        // @ts-ignore
        const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({}));
        const __VLS_224 = __VLS_223({}, ...__VLS_functionalComponentArgsRest(__VLS_223));
        __VLS_221.slots.default;
        var __VLS_221;
        __VLS_215.slots.default;
        var __VLS_215;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("test-operation") },
    });
    const __VLS_228 = {}.ElSelect;
    /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        modelValue: ((__VLS_ctx.datasetToTest)),
        clearable: (true),
        placeholder: ("请选择测试的数据集"),
        popperClass: ("custom-header"),
        ...{ style: ({}) },
    }));
    const __VLS_230 = __VLS_229({
        modelValue: ((__VLS_ctx.datasetToTest)),
        clearable: (true),
        placeholder: ("请选择测试的数据集"),
        popperClass: ("custom-header"),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetSelectable))) {
        const __VLS_234 = {}.ElOption;
        /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
        // @ts-ignore
        const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
            key: ((item.value)),
            label: ((item.label)),
            value: ((item.value)),
        }));
        const __VLS_236 = __VLS_235({
            key: ((item.value)),
            label: ((item.label)),
            value: ((item.value)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_235));
    }
    __VLS_233.slots.default;
    var __VLS_233;
    const __VLS_240 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((__VLS_ctx.analyzing)),
    }));
    const __VLS_242 = __VLS_241({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((__VLS_ctx.analyzing)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    let __VLS_246;
    const __VLS_247 = {
        onClick: (__VLS_ctx.testCheckpoint)
    };
    let __VLS_243;
    let __VLS_244;
    __VLS_245.slots.default;
    var __VLS_245;
    // @ts-ignore
    /** @type { [typeof DatasetTable, typeof DatasetTable, ] } */ ;
    // @ts-ignore
    const __VLS_248 = __VLS_asFunctionalComponent(DatasetTable, new DatasetTable({
        ref: ("dataTableRef"),
        dataset_id: ((__VLS_ctx.datasetToTest)),
        checkpoint_id: ((__VLS_ctx.$route.params.model_id)),
    }));
    const __VLS_249 = __VLS_248({
        ref: ("dataTableRef"),
        dataset_id: ((__VLS_ctx.datasetToTest)),
        checkpoint_id: ((__VLS_ctx.$route.params.model_id)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_248));
    // @ts-ignore navigation for `const dataTableRef = ref()`
    /** @type { typeof __VLS_ctx.dataTableRef } */ ;
    var __VLS_253 = {};
    var __VLS_252;
    __VLS_209.slots.default;
    var __VLS_209;
}
['container', 'model-detail-container', 'model-header', 'model-meta', 'model-title', 'author-info', 'author-details', 'author-name', 'update-time', 'meta-tags', 'shared-tag', 'info-cards', 'card-wrapper', 'info-card', 'card-title', 'card-content', 'model-info', 'info-item', 'label', 'value', 'info-item', 'label', 'value', 'info-card', 'card-title', 'training-process', 'status-header', 'status-label', 'status-value', 'task-status', 'error-message', 'progress-bar', 'progress-bar-inner', 'progress-percent', 'loss-chart', 'evaluation-container', 'metric-overview', 'metric-card', 'metric-header', 'metric-value', 'main-content', 'left-panel', 'report-card', 'right-panel', 'matrix-card', 'matrix-chart', 'evaluation-container', 'status-header', 'status-label', 'test-operation',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatDateTime: formatDateTime,
            TaskChart: TaskChart,
            DatasetTable: DatasetTable,
            dataTableRef: dataTableRef,
            matrixChartRef: matrixChartRef,
            analyzing: analyzing,
            datasetSelectable: datasetSelectable,
            datasetToTest: datasetToTest,
            overviewMetrics: overviewMetrics,
            classificationReport: classificationReport,
            model: model,
            model_status: model_status,
            statusClass: statusClass,
            formatParamSize: formatParamSize,
            formatModelStatus: formatModelStatus,
            testCheckpoint: testCheckpoint,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
