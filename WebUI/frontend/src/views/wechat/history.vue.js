import { ref, onMounted, watch, nextTick, onBeforeUnmount, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from '@/api/axios';
import WechatRefreshDialog from './WechatRefreshDialog.vue';
import WechatAffiliationSelect from './WechatAffiliationSelect.vue';
import WechatAccountConfig from './WechatAccountConfig.vue';
import WechatDetectDialog from './WechatDetectDialog.vue';
import WechatExportDialog from './WechatExportDialog.vue';
const wechatAccountConfig = ref({ token: '', fingerprint: '', cookie: '' });
const refreshDialogVisible = ref(false);
const refreshInitialStart = ref(null);
const refreshInitialEnd = ref(null);
const handleBatchSuccess = () => {
    // 检测完成后，刷新列表数据
    fetchArticles();
};
const openRefreshDialog = () => {
    const end = endOfDay(new Date());
    const start = startOfDay(new Date());
    start.setFullYear(start.getFullYear() - 1);
    refreshInitialStart.value = start;
    refreshInitialEnd.value = end;
    refreshDialogVisible.value = true;
};
const handleRefreshFinished = ({ success }) => {
    if (success) {
        fetchArticles(true);
    }
};
// 限制日期范围：2000-1-1 至今天
const disabledDate = (time) => {
    const min = new Date('2018-12-30').getTime();
    const max = new Date().getTime();
    return time.getTime() < min || time.getTime() > max;
};
const articles = ref([]);
const meta = ref({ total_items: 0 });
const page = ref(1);
const perPage = ref(50);
const filters = ref({
    keyword: '',
    affiliation: '',
    dateRange: [],
    sortBy: '',
    sortOrder: '',
    selectedLevel: [],
    selectedCategory: []
});
const affiliationName = computed(() => {
    const affiliation = filters.value.affiliation;
    return affiliation ? affiliations.value.find(item => item.value === affiliation)?.label : '';
});
const yearsList = ref([]);
const selectedYearsLocal = ref([]);
const currentArticle = ref(null);
const loading = ref(false);
const selectedArticles = ref([]);
// 当 selection 变化时触发
const handleSelectionChange = (val) => {
    selectedArticles.value = val;
};
const articleTable = ref(null);
const tableLoading = ref(false);
const handleRowClick = row => {
    // 切换选中状态
    articleTable.value.toggleRowSelection(row);
};
let intervalId = null;
// 监听 loading，一旦变成 true，就开启定时器；变为 false 时清除定时器
watch(loading, (newVal) => {
    if (newVal) {
        // loading = true 时，每隔 5 秒调用一次 fetchArticles
        intervalId = setInterval(() => {
            fetchArticles();
        }, 5000); // 5000 毫秒 = 5 秒，可根据实际需求调整
        // 如果一开始就想立即触发一次，也可以在这里先手动调用一次
        // fetchArticles();
    }
    else {
        // loading = false，则清除定时器
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
});
const batchDialogVisible = ref(false);
const exportDialogVisible = ref(false);
// 打开导出弹窗
const openExportDialog = () => {
    // 逻辑建议：如果没有选中文章，且当前筛选结果也为空，可以拦截一下
    if (selectedArticles.value.length === 0 && meta.value.total_items === 0) {
        return ElMessage.warning('当前没有可导出的文章');
    }
    exportDialogVisible.value = true;
};
// 处理导出成功（如果有回调）
const handleExportSuccess = () => {
    exportDialogVisible.value = false;
};
const openBatchDialog = () => {
    batchDialogVisible.value = true;
};
const errorOptions = ref({ levels: [], categories: [] });
const affiliations = ref([]);
const fetchAvailableAffiliations = async () => {
    const savedUserAffiliation = localStorage.getItem('wechat-affiliation');
    // 如果本地有保存值，则作为 query 传给后端
    const response = await axios.get('/wechat/affiliation/list', {
        params: savedUserAffiliation
            ? { affiliation: savedUserAffiliation }
            : {}
    });
    affiliations.value = response.data || [];
    // 优先级：本地保存值 > 当前筛选值 > 第一项
    if (affiliations.value.length > 0) {
        if (savedUserAffiliation) {
            filters.value.affiliation = savedUserAffiliation;
        }
        else if (!filters.value.affiliation) {
            filters.value.affiliation = affiliations.value[0].value;
        }
        fetchArticles();
    }
};
const setWechatAffiliation = (affiliationId) => {
    if (!affiliationId)
        return;
    localStorage.setItem('wechat-affiliation', affiliationId);
};
const fetchErrorCategories = async () => {
    const response = await axios.get('/wechat/error_category/list');
    errorOptions.value = response.data;
};
// 组件卸载时也要确保清除定时器，避免内存泄漏
onBeforeUnmount(() => {
    if (intervalId !== null) {
        clearInterval(intervalId);
    }
});
function onView(row) {
    openDetail(row);
}
// “检测”按钮点击
function onDetect(row) {
    window.open(`/wechatPA/analysis/${row.article_id}`, '_blank');
}
function fmtDate(row, col, val) {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
        return '';
    }
    const Y = d.getFullYear();
    // 月＋1 并补两位
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${Y}年${M}月${D}日 ${h}:${m}`;
}
const startDate = computed({
    get() {
        const dr = filters.value.dateRange;
        if (!dr || dr.length === 0)
            return null;
        // 如果第一个元素是数字（按年筛选），datepicker 显示为空
        if (typeof dr[0] === 'number')
            return null;
        return (dr.length >= 1 && dr[0] instanceof Date) ? dr[0] : null;
    },
    set(val) {
        // 当用户通过 datepicker 修改时，清除按年选择
        if (typeof filters.value.dateRange[0] === 'number') {
            selectedYearsLocal.value = [];
            filters.value.dateRange = [];
        }
        const end = (filters.value.dateRange && filters.value.dateRange.length >= 2 && filters.value.dateRange[1] instanceof Date)
            ? filters.value.dateRange[1]
            : null;
        if (!val && !end) {
            filters.value.dateRange = [];
        }
        else if (val && end) {
            filters.value.dateRange = [val, end];
        }
        else if (val && !end) {
            filters.value.dateRange = [val];
        }
        else if (!val && end) {
            filters.value.dateRange = [end];
        }
    }
});
const endDate = computed({
    get() {
        const dr = filters.value.dateRange;
        if (!dr || dr.length === 0)
            return null;
        if (typeof dr[0] === 'number')
            return null;
        return (dr.length >= 2 && dr[1] instanceof Date) ? dr[1] : null;
    },
    set(val) {
        // 当用户通过 datepicker 修改时，清除按年选择
        if (typeof filters.value.dateRange[0] === 'number') {
            selectedYearsLocal.value = [];
            filters.value.dateRange = [];
        }
        const start = (filters.value.dateRange && filters.value.dateRange.length >= 1 && filters.value.dateRange[0] instanceof Date)
            ? filters.value.dateRange[0]
            : null;
        if (!start && !val) {
            filters.value.dateRange = [];
        }
        else if (start && val) {
            filters.value.dateRange = [start, val];
        }
        else if (!start && val) {
            filters.value.dateRange = [val];
        }
        else if (start && !val) {
            filters.value.dateRange = [start];
        }
    }
});
// 当用户在任一 datepicker 改变时触发（会走到 fetchArticles）
function onDateChange() {
    const dr = filters.value.dateRange;
    // 必须满足：
    // 1. 存在
    // 2. 长度为 2
    // 3. 两端都是 Date（而不是 number / year）
    if (Array.isArray(dr) &&
        dr.length === 2 &&
        dr[0] instanceof Date &&
        dr[1] instanceof Date) {
        let [start, end] = dr;
        // 规范化顺序：若 start > end，则交换
        if (start.getTime() > end.getTime()) {
            filters.value.dateRange = [end, start];
        }
        // 发起查询
        fetchArticles();
    }
    else {
        // 其他情况：
        // - 按年份筛选（number[]）
        // - 只选了一端日期
        // - 正在切换筛选模式
        // 都不在这里触发查询
    }
}
function onYearsChange(vals) {
    // 规范化并排序
    selectedYearsLocal.value = vals.slice().sort((a, b) => a - b);
    if (selectedYearsLocal.value.length === 0) {
        // 取消所有年份选择 -> 清空 dateRange
        filters.value.dateRange = [];
        fetchArticles();
        return;
    }
    // 关键改动：**不要合并成一个连续区间**（避免覆盖中间年份）
    // 直接把年份列表写回 filters.dateRange（保持字段名不变）
    filters.value.dateRange = selectedYearsLocal.value.slice();
    // 立即触发查询
    fetchArticles();
}
// 辅助：把 date 设置到当天开始/结束，保证后端接收时是含整天
function startOfDay(d) {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t;
}
function endOfDay(d) {
    const t = new Date(d);
    t.setHours(23, 59, 59, 999);
    return t;
}
function setQuickRange(name) {
    // 清除年份选择（避免冲突）
    selectedYearsLocal.value = [];
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    let start;
    let end = todayEnd;
    switch (name) {
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            start = startOfDay(yesterday);
            end = endOfDay(yesterday);
            break;
        }
        case '7days': {
            const d7 = new Date(today);
            d7.setDate(today.getDate() - 6); // 包含今天，共7天
            start = startOfDay(d7);
            break;
        }
        case '30days': {
            const d30 = new Date(today);
            d30.setDate(today.getDate() - 29);
            start = startOfDay(d30);
            break;
        }
        default:
            return;
    }
    // 写入连续区间（Date 对象），保持原始行为
    filters.value.dateRange = [start, end];
    fetchArticles();
}
function clearDateRange() {
    filters.value.dateRange = [];
    selectedYearsLocal.value = [];
    fetchArticles();
}
async function loadContent() {
    const articleId = currentArticle.value.article_id;
    const configStr = encodeURIComponent(JSON.stringify(wechatAccountConfig.value));
    window.open(`/wechatPA/history/${articleId}?config=${configStr}`, '_blank');
}
async function handleAffImport(affiliation) {
    setWechatAffiliation(affiliation);
    nextTick(() => {
        fetchAvailableAffiliations();
    });
}
async function fetchArticles(keep_page = false) {
    tableLoading.value = true;
    try {
        if (!keep_page) {
            page.value = 1;
        }
        const params = {
            page: page.value,
            per_page: perPage.value,
            keyword: filters.value.keyword,
        };
        // 优先判断是否为按年筛选（filters.dateRange 内元素为 number）
        if (filters.value.dateRange && filters.value.dateRange.length > 0 && typeof filters.value.dateRange[0] === 'number') {
            // 传递 years[] 参数给后端（例如 years[]=2023&years[]=2021）
            params['years[]'] = filters.value.dateRange.slice();
        }
        else if (filters.value.dateRange && filters.value.dateRange.length === 2) {
            // 连续区间（Date 对象）
            params.start = filters.value.dateRange[0].toISOString();
            params.end = filters.value.dateRange[1].toISOString();
        }
        if (filters.value.sortOrder) {
            params.sort_by = filters.value.sortBy;
            params.sort_order = filters.value.sortOrder;
        }
        if (filters.value.selectedLevel.length > 0) {
            params.levels = filters.value.selectedLevel;
        }
        if (filters.value.selectedCategory.length > 0) {
            params.categories = filters.value.selectedCategory;
        }
        if (filters.value.affiliation) {
            params.affiliation = filters.value.affiliation;
        }
        const resp = await axios.get('/wechat/articles', { params });
        articles.value = resp.data.items;
        meta.value = resp.data._meta;
        yearsList.value = resp.data.years || [];
        setWechatAffiliation(params.affiliation);
    }
    catch (err) {
        ElMessage.error('加载失败：' + (err?.message || String(err)));
    }
    finally {
        tableLoading.value = false;
    }
}
function onSortChange({ prop, order }) {
    // 如果 prop 是 result，就告诉后端按 mistake_num 排序
    filters.value.sortBy = prop;
    filters.value.sortOrder =
        order === 'ascending' ? 'asc' :
            order === 'descending' ? 'desc' :
                '';
    fetchArticles();
}
function openDetail(row) {
    currentArticle.value = row;
    loadContent();
}
onMounted(() => {
    nextTick(() => {
        fetchAvailableAffiliations();
        fetchErrorCategories();
    });
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['dialog-footer', 'dialog-footer', 'article-table', 'article-table', 'el-select', 'el-select__tags', 'el-select', 'el-select__tags', 'quick-btn', 'refresh-btn',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("article-list-page") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: ("filter-sidebar") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-title") },
});
// @ts-ignore
/** @type { [typeof WechatAccountConfig, ] } */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(WechatAccountConfig, new WechatAccountConfig({
    activeConfig: ((__VLS_ctx.wechatAccountConfig)),
    affiliationId: ((__VLS_ctx.filters.affiliation)),
}));
const __VLS_1 = __VLS_0({
    activeConfig: ((__VLS_ctx.wechatAccountConfig)),
    affiliationId: ((__VLS_ctx.filters.affiliation)),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-title") },
});
// @ts-ignore
/** @type { [typeof WechatAffiliationSelect, ] } */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(WechatAffiliationSelect, new WechatAffiliationSelect({
    ...{ 'onChange': {} },
    ...{ 'onImport': {} },
    modelValue: ((__VLS_ctx.filters.affiliation)),
    options: ((__VLS_ctx.affiliations)),
    accountConfig: ((__VLS_ctx.wechatAccountConfig)),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onChange': {} },
    ...{ 'onImport': {} },
    modelValue: ((__VLS_ctx.filters.affiliation)),
    options: ((__VLS_ctx.affiliations)),
    accountConfig: ((__VLS_ctx.wechatAccountConfig)),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_10;
const __VLS_11 = {
    onChange: (...[$event]) => {
        __VLS_ctx.fetchArticles(false);
    }
};
const __VLS_12 = {
    onImport: (__VLS_ctx.handleAffImport)
};
let __VLS_7;
let __VLS_8;
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-date-range") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("date-pickers") },
});
const __VLS_13 = {}.ElDatePicker;
/** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.startDate)),
    type: ("date"),
    placeholder: ("开始日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
}));
const __VLS_15 = __VLS_14({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.startDate)),
    type: ("date"),
    placeholder: ("开始日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_19;
const __VLS_20 = {
    onChange: (__VLS_ctx.onDateChange)
};
let __VLS_16;
let __VLS_17;
var __VLS_18;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("date-sep") },
});
const __VLS_21 = {}.ElDatePicker;
/** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.endDate)),
    type: ("date"),
    placeholder: ("结束日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
}));
const __VLS_23 = __VLS_22({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.endDate)),
    type: ("date"),
    placeholder: ("结束日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_27;
const __VLS_28 = {
    onChange: (__VLS_ctx.onDateChange)
};
let __VLS_24;
let __VLS_25;
var __VLS_26;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("quick-range-outer") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("quick-range-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setQuickRange('yesterday');
        } },
    ...{ class: ("quick-btn") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setQuickRange('7days');
        } },
    ...{ class: ("quick-btn") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setQuickRange('30days');
        } },
    ...{ class: ("quick-btn") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.clearDateRange) },
    ...{ class: ("quick-clear") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("year-select-block") },
});
const __VLS_29 = {}.ElCheckboxGroup;
/** @type { [typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ] } */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.selectedYearsLocal)),
}));
const __VLS_31 = __VLS_30({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.selectedYearsLocal)),
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
let __VLS_35;
const __VLS_36 = {
    onChange: (__VLS_ctx.onYearsChange)
};
let __VLS_32;
let __VLS_33;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("year-list") },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.yearsList))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        key: ((item.year)),
        ...{ class: ("year-item") },
    });
    const __VLS_37 = {}.ElCheckbox;
    /** @type { [typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ] } */ ;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
        label: ((item.year)),
    }));
    const __VLS_39 = __VLS_38({
        label: ((item.year)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    (item.year);
    __VLS_42.slots.default;
    var __VLS_42;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("year-count") },
    });
    (item.count);
}
__VLS_34.slots.default;
var __VLS_34;
const __VLS_43 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.filters.selectedLevel)),
    placeholder: ("错误等级"),
    filterable: (true),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
}));
const __VLS_45 = __VLS_44({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.filters.selectedLevel)),
    placeholder: ("错误等级"),
    filterable: (true),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
let __VLS_49;
const __VLS_50 = {
    onChange: (...[$event]) => {
        __VLS_ctx.fetchArticles(false);
    }
};
let __VLS_46;
let __VLS_47;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.errorOptions.levels))) {
    const __VLS_51 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        key: ((item.value)),
        value: ((item.value)),
        label: ((item.label)),
    }));
    const __VLS_53 = __VLS_52({
        key: ((item.value)),
        value: ((item.value)),
        label: ((item.label)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
}
__VLS_48.slots.default;
var __VLS_48;
const __VLS_57 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.filters.selectedCategory)),
    placeholder: ("错误类型"),
    filterable: (true),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
}));
const __VLS_59 = __VLS_58({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.filters.selectedCategory)),
    placeholder: ("错误类型"),
    filterable: (true),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
let __VLS_63;
const __VLS_64 = {
    onChange: (...[$event]) => {
        __VLS_ctx.fetchArticles(false);
    }
};
let __VLS_60;
let __VLS_61;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.errorOptions.categories))) {
    const __VLS_65 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
        key: ((item.value)),
        value: ((item.value)),
        label: ((item.label)),
    }));
    const __VLS_67 = __VLS_66({
        key: ((item.value)),
        value: ((item.value)),
        label: ((item.label)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
}
__VLS_62.slots.default;
var __VLS_62;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("main-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("toolbar") },
});
const __VLS_71 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.filters.keyword)),
    placeholder: ("搜索标题或作者"),
    clearable: (true),
    prefixIcon: ("Search"),
}));
const __VLS_73 = __VLS_72({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.filters.keyword)),
    placeholder: ("搜索标题或作者"),
    clearable: (true),
    prefixIcon: ("Search"),
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
let __VLS_77;
const __VLS_78 = {
    onClear: (...[$event]) => {
        __VLS_ctx.fetchArticles(false);
    }
};
const __VLS_79 = {
    onKeyup: (...[$event]) => {
        __VLS_ctx.fetchArticles(false);
    }
};
let __VLS_74;
let __VLS_75;
var __VLS_76;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("batch-btns") },
});
const __VLS_80 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    ...{ 'onClick': {} },
    ...{ class: ("batch-btn") },
    type: ("primary"),
    plain: (true),
    loading: ((__VLS_ctx.loading)),
}));
const __VLS_82 = __VLS_81({
    ...{ 'onClick': {} },
    ...{ class: ("batch-btn") },
    type: ("primary"),
    plain: (true),
    loading: ((__VLS_ctx.loading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
let __VLS_86;
const __VLS_87 = {
    onClick: (__VLS_ctx.openBatchDialog)
};
let __VLS_83;
let __VLS_84;
const __VLS_88 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    size: ((18)),
}));
const __VLS_90 = __VLS_89({
    size: ((18)),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_94 = {}.MagicStick;
/** @type { [typeof __VLS_components.MagicStick, ] } */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({}));
const __VLS_96 = __VLS_95({}, ...__VLS_functionalComponentArgsRest(__VLS_95));
__VLS_93.slots.default;
var __VLS_93;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_85.slots.default;
var __VLS_85;
const __VLS_100 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    ...{ 'onClick': {} },
    ...{ class: ("batch-btn") },
    type: ("success"),
    plain: (true),
}));
const __VLS_102 = __VLS_101({
    ...{ 'onClick': {} },
    ...{ class: ("batch-btn") },
    type: ("success"),
    plain: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
let __VLS_106;
const __VLS_107 = {
    onClick: (__VLS_ctx.openExportDialog)
};
let __VLS_103;
let __VLS_104;
const __VLS_108 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    size: ((18)),
}));
const __VLS_110 = __VLS_109({
    size: ((18)),
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
const __VLS_114 = {}.Download;
/** @type { [typeof __VLS_components.Download, ] } */ ;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({}));
const __VLS_116 = __VLS_115({}, ...__VLS_functionalComponentArgsRest(__VLS_115));
__VLS_113.slots.default;
var __VLS_113;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_105.slots.default;
var __VLS_105;
const __VLS_120 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ 'onClick': {} },
    ...{ class: ("refresh-btn") },
}));
const __VLS_122 = __VLS_121({
    ...{ 'onClick': {} },
    ...{ class: ("refresh-btn") },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
let __VLS_126;
const __VLS_127 = {
    onClick: (__VLS_ctx.openRefreshDialog)
};
let __VLS_123;
let __VLS_124;
const __VLS_128 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    size: ((18)),
}));
const __VLS_130 = __VLS_129({
    size: ((18)),
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
const __VLS_134 = {}.Refresh;
/** @type { [typeof __VLS_components.Refresh, ] } */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({}));
const __VLS_136 = __VLS_135({}, ...__VLS_functionalComponentArgsRest(__VLS_135));
__VLS_133.slots.default;
var __VLS_133;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_125.slots.default;
var __VLS_125;
// @ts-ignore
/** @type { [typeof WechatDetectDialog, ] } */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(WechatDetectDialog, new WechatDetectDialog({
    ...{ 'onSuccess': {} },
    modelValue: ((__VLS_ctx.batchDialogVisible)),
    selectedIds: ((__VLS_ctx.selectedArticles.map(r => r.article_id))),
    totalFiltered: ((__VLS_ctx.meta.total_items)),
    filters: ((__VLS_ctx.filters)),
}));
const __VLS_141 = __VLS_140({
    ...{ 'onSuccess': {} },
    modelValue: ((__VLS_ctx.batchDialogVisible)),
    selectedIds: ((__VLS_ctx.selectedArticles.map(r => r.article_id))),
    totalFiltered: ((__VLS_ctx.meta.total_items)),
    filters: ((__VLS_ctx.filters)),
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
let __VLS_145;
const __VLS_146 = {
    onSuccess: (__VLS_ctx.handleBatchSuccess)
};
let __VLS_142;
let __VLS_143;
var __VLS_144;
// @ts-ignore
/** @type { [typeof WechatExportDialog, ] } */ ;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(WechatExportDialog, new WechatExportDialog({
    ...{ 'onSuccess': {} },
    modelValue: ((__VLS_ctx.exportDialogVisible)),
    selectedIds: ((__VLS_ctx.selectedArticles.map(r => r.article_id))),
    totalFiltered: ((__VLS_ctx.meta.total_items)),
    filters: ((__VLS_ctx.filters)),
}));
const __VLS_148 = __VLS_147({
    ...{ 'onSuccess': {} },
    modelValue: ((__VLS_ctx.exportDialogVisible)),
    selectedIds: ((__VLS_ctx.selectedArticles.map(r => r.article_id))),
    totalFiltered: ((__VLS_ctx.meta.total_items)),
    filters: ((__VLS_ctx.filters)),
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
let __VLS_152;
const __VLS_153 = {
    onSuccess: (__VLS_ctx.handleExportSuccess)
};
let __VLS_149;
let __VLS_150;
var __VLS_151;
// @ts-ignore
/** @type { [typeof WechatRefreshDialog, ] } */ ;
// @ts-ignore
const __VLS_154 = __VLS_asFunctionalComponent(WechatRefreshDialog, new WechatRefreshDialog({
    ...{ 'onFinished': {} },
    visible: ((__VLS_ctx.refreshDialogVisible)),
    affiliationId: ((__VLS_ctx.filters.affiliation)),
    affiliationName: ((__VLS_ctx.affiliationName)),
    accountConfig: ((__VLS_ctx.wechatAccountConfig)),
    initialStart: ((__VLS_ctx.refreshInitialStart)),
    initialEnd: ((__VLS_ctx.refreshInitialEnd)),
    loading: ((__VLS_ctx.loading)),
}));
const __VLS_155 = __VLS_154({
    ...{ 'onFinished': {} },
    visible: ((__VLS_ctx.refreshDialogVisible)),
    affiliationId: ((__VLS_ctx.filters.affiliation)),
    affiliationName: ((__VLS_ctx.affiliationName)),
    accountConfig: ((__VLS_ctx.wechatAccountConfig)),
    initialStart: ((__VLS_ctx.refreshInitialStart)),
    initialEnd: ((__VLS_ctx.refreshInitialEnd)),
    loading: ((__VLS_ctx.loading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_154));
let __VLS_159;
const __VLS_160 = {
    onFinished: (__VLS_ctx.handleRefreshFinished)
};
let __VLS_156;
let __VLS_157;
var __VLS_158;
const __VLS_161 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
    ...{ 'onSortChange': {} },
    ...{ 'onSelectionChange': {} },
    ...{ 'onRowClick': {} },
    ref: ("articleTable"),
    data: ((__VLS_ctx.articles)),
    ...{ class: ("article-table disable-select") },
    stripe: (true),
    ...{ style: ({}) },
}));
const __VLS_163 = __VLS_162({
    ...{ 'onSortChange': {} },
    ...{ 'onSelectionChange': {} },
    ...{ 'onRowClick': {} },
    ref: ("articleTable"),
    data: ((__VLS_ctx.articles)),
    ...{ class: ("article-table disable-select") },
    stripe: (true),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_162));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.tableLoading) }, null, null);
// @ts-ignore navigation for `const articleTable = ref()`
/** @type { typeof __VLS_ctx.articleTable } */ ;
var __VLS_167 = {};
let __VLS_168;
const __VLS_169 = {
    onSortChange: (__VLS_ctx.onSortChange)
};
const __VLS_170 = {
    onSelectionChange: (__VLS_ctx.handleSelectionChange)
};
const __VLS_171 = {
    onRowClick: (__VLS_ctx.handleRowClick)
};
let __VLS_164;
let __VLS_165;
const __VLS_172 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    type: ("selection"),
    width: ("30"),
}));
const __VLS_174 = __VLS_173({
    type: ("selection"),
    width: ("30"),
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
const __VLS_178 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    prop: ("title"),
    label: ("标题"),
    minWidth: ("300"),
    showOverflowTooltip: (true),
}));
const __VLS_180 = __VLS_179({
    prop: ("title"),
    label: ("标题"),
    minWidth: ("300"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
const __VLS_184 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    prop: ("author_name"),
    label: ("作者"),
    width: ("100"),
    showOverflowTooltip: (true),
}));
const __VLS_186 = __VLS_185({
    prop: ("author_name"),
    label: ("作者"),
    width: ("100"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
const __VLS_190 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
    prop: ("create_time"),
    label: ("发表时间"),
    width: ("180"),
    sortable: ("custom"),
    formatter: ((__VLS_ctx.fmtDate)),
}));
const __VLS_192 = __VLS_191({
    prop: ("create_time"),
    label: ("发表时间"),
    width: ("180"),
    sortable: ("custom"),
    formatter: ((__VLS_ctx.fmtDate)),
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
const __VLS_196 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    prop: ("affiliation"),
    label: ("来源"),
    width: ("120"),
    showOverflowTooltip: (true),
}));
const __VLS_198 = __VLS_197({
    prop: ("affiliation"),
    label: ("来源"),
    width: ("120"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
const __VLS_202 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
    label: ("操作"),
    width: ("180"),
    align: ("center"),
    fixed: ("right"),
}));
const __VLS_204 = __VLS_203({
    label: ("操作"),
    width: ("180"),
    align: ("center"),
    fixed: ("right"),
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
{
    const { default: __VLS_thisSlot } = __VLS_207.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("operation-group") },
    });
    const __VLS_208 = {}.ElTooltip;
    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        content: ("查看公众号文章合规检测结果，可重新检测"),
        placement: ("top"),
    }));
    const __VLS_210 = __VLS_209({
        content: ("查看公众号文章合规检测结果，可重新检测"),
        placement: ("top"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    const __VLS_214 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
        ...{ 'onClick': {} },
        ...{ class: ("operation-action detect-action") },
        link: (true),
        size: ("small"),
    }));
    const __VLS_216 = __VLS_215({
        ...{ 'onClick': {} },
        ...{ class: ("operation-action detect-action") },
        link: (true),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_215));
    let __VLS_220;
    const __VLS_221 = {
        onClick: (...[$event]) => {
            __VLS_ctx.onDetect(scope.row);
        }
    };
    let __VLS_217;
    let __VLS_218;
    const __VLS_222 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({}));
    const __VLS_224 = __VLS_223({}, ...__VLS_functionalComponentArgsRest(__VLS_223));
    const __VLS_228 = {}.MagicStick;
    /** @type { [typeof __VLS_components.MagicStick, ] } */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({}));
    const __VLS_230 = __VLS_229({}, ...__VLS_functionalComponentArgsRest(__VLS_229));
    __VLS_227.slots.default;
    var __VLS_227;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_219.slots.default;
    var __VLS_219;
    __VLS_213.slots.default;
    var __VLS_213;
    const __VLS_234 = {}.ElTooltip;
    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
    // @ts-ignore
    const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
        content: ("查看图文并茂的公众号原文"),
        placement: ("top"),
    }));
    const __VLS_236 = __VLS_235({
        content: ("查看图文并茂的公众号原文"),
        placement: ("top"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_235));
    const __VLS_240 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        ...{ 'onClick': {} },
        ...{ class: ("operation-action original-action") },
        link: (true),
        size: ("small"),
    }));
    const __VLS_242 = __VLS_241({
        ...{ 'onClick': {} },
        ...{ class: ("operation-action original-action") },
        link: (true),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    let __VLS_246;
    const __VLS_247 = {
        onClick: (...[$event]) => {
            __VLS_ctx.onView(scope.row);
        }
    };
    let __VLS_243;
    let __VLS_244;
    const __VLS_248 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({}));
    const __VLS_250 = __VLS_249({}, ...__VLS_functionalComponentArgsRest(__VLS_249));
    const __VLS_254 = {}.Document;
    /** @type { [typeof __VLS_components.Document, ] } */ ;
    // @ts-ignore
    const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({}));
    const __VLS_256 = __VLS_255({}, ...__VLS_functionalComponentArgsRest(__VLS_255));
    __VLS_253.slots.default;
    var __VLS_253;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_245.slots.default;
    var __VLS_245;
    __VLS_239.slots.default;
    var __VLS_239;
}
__VLS_207.slots.default;
var __VLS_207;
const __VLS_260 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    label: ("校对结果"),
    prop: ("mistake_num"),
    sortable: ("custom"),
    width: ("130"),
    align: ("center"),
}));
const __VLS_262 = __VLS_261({
    label: ("校对结果"),
    prop: ("mistake_num"),
    sortable: ("custom"),
    width: ("130"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
{
    const { default: __VLS_thisSlot } = __VLS_265.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (!row.is_detected) {
        const __VLS_266 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
            ...{ 'onClick': {} },
            type: ("info"),
            effect: ("plain"),
            size: ("small"),
            disableTransitions: ((true)),
        }));
        const __VLS_268 = __VLS_267({
            ...{ 'onClick': {} },
            type: ("info"),
            effect: ("plain"),
            size: ("small"),
            disableTransitions: ((true)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_267));
        let __VLS_272;
        const __VLS_273 = {
            onClick: (...[$event]) => {
                if (!((!row.is_detected)))
                    return;
                __VLS_ctx.onDetect(row);
            }
        };
        let __VLS_269;
        let __VLS_270;
        __VLS_271.slots.default;
        var __VLS_271;
    }
    else if (row.result > 0) {
        const __VLS_274 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
            ...{ 'onClick': {} },
            type: ("danger"),
            effect: ("plain"),
            size: ("small"),
            disableTransitions: ((true)),
        }));
        const __VLS_276 = __VLS_275({
            ...{ 'onClick': {} },
            type: ("danger"),
            effect: ("plain"),
            size: ("small"),
            disableTransitions: ((true)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_275));
        let __VLS_280;
        const __VLS_281 = {
            onClick: (...[$event]) => {
                if (!(!((!row.is_detected))))
                    return;
                if (!((row.result > 0)))
                    return;
                __VLS_ctx.onDetect(row);
            }
        };
        let __VLS_277;
        let __VLS_278;
        (row.result);
        __VLS_279.slots.default;
        var __VLS_279;
    }
    else {
        const __VLS_282 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
            ...{ 'onClick': {} },
            type: ("success"),
            effect: ("plain"),
            size: ("small"),
            disableTransitions: ((true)),
        }));
        const __VLS_284 = __VLS_283({
            ...{ 'onClick': {} },
            type: ("success"),
            effect: ("plain"),
            size: ("small"),
            disableTransitions: ((true)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_283));
        let __VLS_288;
        const __VLS_289 = {
            onClick: (...[$event]) => {
                if (!(!((!row.is_detected))))
                    return;
                if (!(!((row.result > 0))))
                    return;
                __VLS_ctx.onDetect(row);
            }
        };
        let __VLS_285;
        let __VLS_286;
        __VLS_287.slots.default;
        var __VLS_287;
    }
}
__VLS_265.slots.default;
var __VLS_265;
__VLS_166.slots.default;
var __VLS_166;
const __VLS_290 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    ...{ class: ("pagination") },
    background: (true),
    layout: ("total, prev, pager, next, jumper, sizes"),
    total: ((__VLS_ctx.meta.total_items)),
    currentPage: ((__VLS_ctx.page)),
    pageSize: ((__VLS_ctx.perPage)),
}));
const __VLS_292 = __VLS_291({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    ...{ class: ("pagination") },
    background: (true),
    layout: ("total, prev, pager, next, jumper, sizes"),
    total: ((__VLS_ctx.meta.total_items)),
    currentPage: ((__VLS_ctx.page)),
    pageSize: ((__VLS_ctx.perPage)),
}, ...__VLS_functionalComponentArgsRest(__VLS_291));
let __VLS_296;
const __VLS_297 = {
    onCurrentChange: (...[$event]) => {
        __VLS_ctx.fetchArticles(true);
    }
};
const __VLS_298 = {
    onSizeChange: (...[$event]) => {
        __VLS_ctx.fetchArticles(false);
    }
};
let __VLS_293;
let __VLS_294;
var __VLS_295;
['article-list-page', 'filter-sidebar', 'filter-title', 'filter-title', 'filter-date-range', 'date-pickers', 'date-sep', 'quick-range-outer', 'quick-range-row', 'quick-btn', 'quick-btn', 'quick-btn', 'quick-clear', 'year-select-block', 'year-list', 'year-item', 'year-count', 'main-content', 'toolbar', 'batch-btns', 'batch-btn', 'batch-btn', 'refresh-btn', 'article-table', 'disable-select', 'operation-group', 'operation-action', 'detect-action', 'operation-action', 'original-action', 'pagination',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            WechatRefreshDialog: WechatRefreshDialog,
            WechatAffiliationSelect: WechatAffiliationSelect,
            WechatAccountConfig: WechatAccountConfig,
            WechatDetectDialog: WechatDetectDialog,
            WechatExportDialog: WechatExportDialog,
            wechatAccountConfig: wechatAccountConfig,
            refreshDialogVisible: refreshDialogVisible,
            refreshInitialStart: refreshInitialStart,
            refreshInitialEnd: refreshInitialEnd,
            handleBatchSuccess: handleBatchSuccess,
            openRefreshDialog: openRefreshDialog,
            handleRefreshFinished: handleRefreshFinished,
            disabledDate: disabledDate,
            articles: articles,
            meta: meta,
            page: page,
            perPage: perPage,
            filters: filters,
            affiliationName: affiliationName,
            yearsList: yearsList,
            selectedYearsLocal: selectedYearsLocal,
            loading: loading,
            selectedArticles: selectedArticles,
            handleSelectionChange: handleSelectionChange,
            articleTable: articleTable,
            tableLoading: tableLoading,
            handleRowClick: handleRowClick,
            batchDialogVisible: batchDialogVisible,
            exportDialogVisible: exportDialogVisible,
            openExportDialog: openExportDialog,
            handleExportSuccess: handleExportSuccess,
            openBatchDialog: openBatchDialog,
            errorOptions: errorOptions,
            affiliations: affiliations,
            onView: onView,
            onDetect: onDetect,
            fmtDate: fmtDate,
            startDate: startDate,
            endDate: endDate,
            onDateChange: onDateChange,
            onYearsChange: onYearsChange,
            setQuickRange: setQuickRange,
            clearDateRange: clearDateRange,
            handleAffImport: handleAffImport,
            fetchArticles: fetchArticles,
            onSortChange: onSortChange,
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
