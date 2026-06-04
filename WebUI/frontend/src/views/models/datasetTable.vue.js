import { ref, watch, nextTick } from 'vue';
import axios from '@/api/axios';
const props = defineProps();
// 表头与数据列表
const headers = ref([]);
const items = ref([]);
// 存储各行的推理结果和加载状态
const resultMap = ref({});
const loadingMap = ref({});
// 分页相关状态
const currentPage = ref(1);
const pageSize = ref(10); // 默认为每页 10 条
const totalPages = ref(1);
// 监听 dataset_id 或 checkpoint_id 变化，重置到第 1 页并重新获取
watch(() => [props.dataset_id, props.checkpoint_id], ([newDatasetId]) => {
    if (newDatasetId) {
        currentPage.value = 1;
        fetchData(newDatasetId, currentPage.value);
    }
}, { immediate: true });
// 监听 currentPage 变化，重新获取对应页数据
watch(currentPage, (newPage) => {
    if (props.dataset_id) {
        fetchData(props.dataset_id, newPage);
        jumpPage.value = newPage;
    }
});
const tableLoading = ref(false);
// 获取数据函数，带分页参数
async function fetchData(dataset_id, page) {
    if (dataset_id === null)
        return;
    try {
        tableLoading.value = true; // 开始加载
        const payload = {
            dataset_id: dataset_id,
            checkpoint_id: props.checkpoint_id,
            page: page,
            page_size: pageSize.value,
        };
        // 假设后端接口返回：{ headers: [...], items: [...], total_pages: X }
        const response = await axios.post('/datasets/dataList', payload, {
            timeout: 30000,
        });
        const data = response.data;
        headers.value = data.headers;
        items.value = data.items.items;
        // 如果后端返回的是总页数
        totalPages.value = data.items._meta.total_pages ?? 1;
        // 初始化 loadingMap 和 resultMap
        items.value.forEach((item) => {
            loadingMap.value[item.id] = false;
            resultMap.value[item.id] = null;
        });
        await nextTick();
        // 取出当前页所有 id，批量获取推理结果
        fetchResults();
    }
    catch (err) {
        console.error('获取数据集条目失败:', err);
    }
    finally {
        tableLoading.value = false; // 结束加载
    }
}
async function fetchResults() {
    try {
        const ids = items.value.map((item) => item.id);
        if (ids.length === 0)
            return;
        const resultPayload = {
            dataset_id: props.dataset_id,
            data_ids: ids,
            checkpoint_id: props.checkpoint_id,
        };
        // 假设后端批量查询接口为 /api/batchAnalyzeResults
        const res = await axios.post('/models/test_checkpoint/batchAnalyzeResults', resultPayload);
        const resultsData = res.data;
        // 将返回的批量结果赋给 resultMap
        Object.entries(resultsData.results).forEach(([id, value]) => {
            resultMap.value[id] = value;
        });
    }
    catch (err) {
        console.error('批量获取推理结果失败:', err);
    }
}
// 分页跳转
function goToPage(page) {
    if (page < 1 || page > totalPages.value)
        return;
    currentPage.value = page;
}
// 点击按钮时触发推理
async function analyzeRow(id) {
    if (loadingMap.value[id])
        return;
    loadingMap.value[id] = true;
    try {
        // 假设后端推理接口为 /api/analyze ，传递 { data_id: id, checkpoint_id: props.checkpoint_id }
        const response = await axios.post('/models/test_checkpoint/analyzeSingle', {
            dataset_id: props.dataset_id,
            data_id: id,
            checkpoint_id: props.checkpoint_id,
        });
        // 假设后端返回 { result: '...' }
        resultMap.value[id] = response.data;
    }
    catch (err) {
        console.error(`行 ${id} 推理失败:`, err);
        resultMap.value[id] = '推理失败';
    }
    finally {
        loadingMap.value[id] = false;
    }
}
// 暴露 fetchData 给外部
const __VLS_exposed = { analyzeTable };
defineExpose({ analyzeTable });
async function analyzeTable() {
    const ids = items.value.map((item) => item.id);
    if (ids.length === 0)
        return;
    // 如果已有某行正在加载，则直接返回
    const isAnyLoading = ids.some((id) => loadingMap.value[id]);
    if (isAnyLoading)
        return;
    // 设置所有行为加载状态
    ids.forEach((id) => {
        loadingMap.value[id] = true;
        resultMap.value[id] = null;
    });
    // 依次调用 analyzeRow，并等待每一步完成
    for (const id of ids) {
        try {
            const response = await axios.post('/models/test_checkpoint/analyzeSingle', {
                dataset_id: props.dataset_id,
                data_id: id,
                checkpoint_id: props.checkpoint_id,
            });
            resultMap.value[id] = response.data;
        }
        catch (err) {
            console.error(`行 ${id} 批量推理失败:`, err);
            resultMap.value[id] = '推理失败';
        }
        finally {
            loadingMap.value[id] = false;
        }
    }
}
// 用于跳转输入框
const jumpPage = ref(1);
function onJump() {
    goToPage(jumpPage.value);
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("dataset-table") },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.tableLoading) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
for (const [header] of __VLS_getVForSourceType((__VLS_ctx.headers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        key: ((header)),
        ...{ class: (({ 'special-header': header === '标签' })) },
    });
    (header);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: ("center-cell") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: ("center-cell") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.items))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: ((item.id)),
    });
    for (const [header] of __VLS_getVForSourceType((__VLS_ctx.headers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            key: ((header)),
            ...{ class: (({ 'special-cell': header === '标签' })) },
        });
        if (header === '标签') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("groundtruth-tag") },
            });
            (item[header]);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item[header]);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: ("center-cell") },
        ...{ style: ({}) },
    });
    if (__VLS_ctx.resultMap[item.id] === null || __VLS_ctx.resultMap[item.id] === undefined) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("no-result-tag") },
        });
    }
    else if (__VLS_ctx.headers.includes('标签')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (({
                    'correct-tag': __VLS_ctx.resultMap[item.id] === __VLS_ctx.items.find(i => i.id === item.id)?.['标签'],
                    'wrong-tag': __VLS_ctx.resultMap[item.id] !== __VLS_ctx.items.find(i => i.id === item.id)?.['标签'],
                })) },
        });
        (__VLS_ctx.resultMap[item.id]);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (({
                    'pred-only-tag': true
                })) },
        });
        (__VLS_ctx.resultMap[item.id]);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: ("center-cell") },
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.analyzeRow(item.id);
            } },
        disabled: ((__VLS_ctx.loadingMap[item.id])),
    });
    (__VLS_ctx.loadingMap[item.id] ? '检测中...' : '检测');
}
if (__VLS_ctx.totalPages > 1) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("pagination-controls") },
        ...{ style: ({}) },
    });
    const __VLS_0 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === 1)),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === 1)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_6;
    const __VLS_7 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.totalPages > 1)))
                return;
            __VLS_ctx.goToPage(1);
        }
    };
    let __VLS_3;
    let __VLS_4;
    __VLS_5.slots.default;
    var __VLS_5;
    const __VLS_8 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === 1)),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === 1)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_14;
    const __VLS_15 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.totalPages > 1)))
                return;
            __VLS_ctx.goToPage(__VLS_ctx.currentPage - 1);
        }
    };
    let __VLS_11;
    let __VLS_12;
    __VLS_13.slots.default;
    var __VLS_13;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.currentPage);
    (__VLS_ctx.totalPages);
    const __VLS_16 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === __VLS_ctx.totalPages)),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === __VLS_ctx.totalPages)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_22;
    const __VLS_23 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.totalPages > 1)))
                return;
            __VLS_ctx.goToPage(__VLS_ctx.currentPage + 1);
        }
    };
    let __VLS_19;
    let __VLS_20;
    __VLS_21.slots.default;
    var __VLS_21;
    const __VLS_24 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === __VLS_ctx.totalPages)),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        size: ("small"),
        disabled: ((__VLS_ctx.currentPage === __VLS_ctx.totalPages)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_30;
    const __VLS_31 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.totalPages > 1)))
                return;
            __VLS_ctx.goToPage(__VLS_ctx.totalPages);
        }
    };
    let __VLS_27;
    let __VLS_28;
    __VLS_29.slots.default;
    var __VLS_29;
    const __VLS_32 = {}.ElInputNumber;
    /** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onKeypress': {} },
        modelValue: ((__VLS_ctx.jumpPage)),
        min: ((1)),
        max: ((__VLS_ctx.totalPages)),
        size: ("small"),
        ...{ style: ({}) },
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onKeypress': {} },
        modelValue: ((__VLS_ctx.jumpPage)),
        min: ((1)),
        max: ((__VLS_ctx.totalPages)),
        size: ("small"),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_38;
    const __VLS_39 = {
        onKeypress: (__VLS_ctx.onJump)
    };
    let __VLS_35;
    let __VLS_36;
    var __VLS_37;
    const __VLS_40 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        size: ("small"),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.onJump)
    };
    let __VLS_43;
    let __VLS_44;
    __VLS_45.slots.default;
    var __VLS_45;
}
['dataset-table', 'special-header', 'center-cell', 'center-cell', 'special-cell', 'groundtruth-tag', 'center-cell', 'no-result-tag', 'correct-tag', 'wrong-tag', 'pred-only-tag', 'center-cell', 'pagination-controls',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            headers: headers,
            items: items,
            resultMap: resultMap,
            loadingMap: loadingMap,
            currentPage: currentPage,
            totalPages: totalPages,
            tableLoading: tableLoading,
            goToPage: goToPage,
            analyzeRow: analyzeRow,
            jumpPage: jumpPage,
            onJump: onJump,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
