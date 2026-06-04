import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "@/api/axios";
const selectedAffiliationIds = ref([]);
const libraryOptions = ref([]);
const searchKeyword = ref("");
const searchLoading = ref(false);
const addLoading = ref(false);
const listLoading = ref(false);
const actionLoadingKey = ref("");
const error = ref("");
const listItems = ref([]);
const total = ref(0);
const page = ref(1);
const perPage = ref(20);
const summary = ref({
    total: 0,
    enabled: 0,
    disabled: 0,
    detected_today: 0,
    default_schedule_time: "每日 02:00",
});
const listFilters = ref({
    keyword: "",
    status: "enabled",
});
let searchTimer = null;
const addedAffiliationIds = computed(() => {
    return new Set(listItems.value
        .map((item) => getAffiliationId(item))
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value)));
});
function normalizeLibraryAccounts(items) {
    const normalized = [];
    items.forEach((item) => {
        const value = item?.value ?? item?.affiliation_id ?? item?.fakeid ?? item?.id;
        const label = item?.label ?? item?.nickname ?? item?.name ?? item?.affiliation;
        if (value === undefined || value === null || !label)
            return;
        normalized.push({
            value,
            label: String(label),
            alias: item?.alias,
        });
    });
    return normalized;
}
function extractItems(payload) {
    if (Array.isArray(payload))
        return payload;
    if (Array.isArray(payload?.items))
        return payload.items;
    if (Array.isArray(payload?.data))
        return payload.data;
    return [];
}
function getErrorMessage(err, fallback) {
    return (err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        fallback);
}
async function loadInitialLibraryAccounts() {
    searchLoading.value = true;
    try {
        const { data } = await axios.get("/wechat/affiliation/list");
        libraryOptions.value = normalizeLibraryAccounts(extractItems(data));
    }
    catch (err) {
        ElMessage.error(getErrorMessage(err, "加载公众号列表失败"));
    }
    finally {
        searchLoading.value = false;
    }
}
function searchAffiliations(query) {
    searchKeyword.value = query.trim();
    if (searchTimer)
        clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        if (!searchKeyword.value) {
            await loadInitialLibraryAccounts();
            return;
        }
        searchLoading.value = true;
        try {
            const { data } = await axios.post("/wechat/search_affiliation", {
                q: searchKeyword.value,
                page: 1,
                pageSize: 30,
            });
            libraryOptions.value = normalizeLibraryAccounts(extractItems(data));
        }
        catch (err) {
            libraryOptions.value = [];
            ElMessage.error(getErrorMessage(err, "搜索公众号失败"));
        }
        finally {
            searchLoading.value = false;
        }
    }, 300);
}
function handleSelectVisible(visible) {
    if (visible && libraryOptions.value.length === 0 && !searchKeyword.value) {
        loadInitialLibraryAccounts();
    }
}
function isAlreadyAdded(value) {
    return addedAffiliationIds.value.has(String(value));
}
async function addSelectedAccounts() {
    const affiliationIds = selectedAffiliationIds.value.filter((value) => !isAlreadyAdded(value));
    if (affiliationIds.length === 0) {
        ElMessage.warning("请选择未加入列表的公众号");
        return;
    }
    addLoading.value = true;
    try {
        const { data } = await axios.post("/wechat/auto-detect/accounts", {
            affiliation_ids: affiliationIds,
        });
        const rejected = Array.isArray(data?.rejected) ? data.rejected : [];
        selectedAffiliationIds.value = [];
        await fetchAutoDetectAccounts(true);
        if (rejected.length > 0) {
            ElMessage.warning(`有 ${rejected.length} 个公众号不在库中，不能添加`);
        }
        else {
            ElMessage.success("已加入自动检测列表");
        }
    }
    catch (err) {
        ElMessage.error(getErrorMessage(err, "添加自动检测公众号失败"));
    }
    finally {
        addLoading.value = false;
    }
}
function applyListPayload(payload) {
    const items = extractItems(payload);
    const meta = payload?._meta || payload?.meta || {};
    const rawSummary = payload?.summary || {};
    const enabledCount = items.filter(isEnabledAccount).length;
    listItems.value = items;
    total.value = Number(meta.total_items ?? meta.total ?? rawSummary.total ?? items.length);
    summary.value = {
        total: Number(rawSummary.total ?? total.value),
        enabled: Number(rawSummary.enabled ?? enabledCount),
        disabled: Number(rawSummary.disabled ?? Math.max(total.value - enabledCount, 0)),
        detected_today: Number(rawSummary.detected_today ?? 0),
        default_schedule_time: rawSummary.default_schedule_time || "每日 02:00",
    };
}
async function fetchAutoDetectAccounts(keepPage = false) {
    if (!keepPage)
        page.value = 1;
    listLoading.value = true;
    error.value = "";
    try {
        const { data } = await axios.get("/wechat/auto-detect/accounts", {
            params: {
                page: page.value,
                per_page: perPage.value,
                keyword: listFilters.value.keyword || undefined,
                status: listFilters.value.status || undefined,
            },
        });
        applyListPayload(data);
    }
    catch (err) {
        error.value = getErrorMessage(err, "加载自动检测列表失败");
        ElMessage.error(error.value);
    }
    finally {
        listLoading.value = false;
    }
}
function handlePageChange() {
    fetchAutoDetectAccounts(true);
}
function handlePageSizeChange() {
    fetchAutoDetectAccounts(false);
}
async function confirmRemove(row) {
    try {
        await ElMessageBox.confirm(`确定移除“${getAccountName(row)}”吗？`, "移除公众号", {
            confirmButtonText: "移除",
            cancelButtonText: "取消",
            type: "warning",
        });
    }
    catch {
        return;
    }
    await removeAccount(row);
}
async function removeAccount(row) {
    const rowKey = getRowKey(row);
    if (!rowKey)
        return;
    actionLoadingKey.value = rowKey;
    try {
        await axios.delete(`/wechat/auto-detect/accounts/${encodeURIComponent(rowKey)}`);
        ElMessage.success("已移除公众号");
        await fetchAutoDetectAccounts(true);
    }
    catch (err) {
        ElMessage.error(getErrorMessage(err, "移除公众号失败"));
    }
    finally {
        actionLoadingKey.value = "";
    }
}
async function enableAccount(row) {
    const affiliationId = getAffiliationId(row);
    const rowKey = getRowKey(row);
    if (affiliationId === undefined || affiliationId === null || !rowKey)
        return;
    actionLoadingKey.value = rowKey;
    try {
        await axios.post("/wechat/auto-detect/accounts", {
            affiliation_ids: [affiliationId],
        });
        ElMessage.success("已加入自动检测列表");
        await fetchAutoDetectAccounts(true);
    }
    catch (err) {
        ElMessage.error(getErrorMessage(err, "加入自动检测列表失败"));
    }
    finally {
        actionLoadingKey.value = "";
    }
}
function getRowKey(row) {
    const value = getAffiliationId(row) ?? row.id;
    return value === undefined || value === null ? "" : String(value);
}
function getAffiliationId(row) {
    return row.affiliation_id ?? row.value ?? row.fakeid;
}
function getAccountName(row) {
    return row.name || row.label || row.nickname || row.affiliation || "--";
}
function isEnabledAccount(row) {
    return row.enabled === true || row.status === "enabled";
}
function getStatusLabel(row) {
    return isEnabledAccount(row) ? "启用中" : "已停用";
}
function getStatusType(row) {
    return isEnabledAccount(row) ? "success" : "info";
}
function formatTime(value) {
    if (!value)
        return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function formatResult(row) {
    const count = row.mistake_num ?? row.result;
    if (typeof count === "number")
        return count > 0 ? `${count} 个错误` : "无错误";
    return row.last_status || "--";
}
function getResultType(row) {
    const count = row.mistake_num ?? row.result;
    if (typeof count === "number")
        return count > 0 ? "danger" : "success";
    return "info";
}
onMounted(() => {
    fetchAutoDetectAccounts();
    loadInitialLibraryAccounts();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['page-header', 'page-header', 'page-header', 'add-panel', 'section-title', 'add-button', 'add-button', 'stat-item', 'list-panel', 'list-toolbar', 'list-toolbar', 'workspace', 'page-header', 'list-toolbar', 'status-filter',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("auto-detect-page") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("page-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    loading: ((__VLS_ctx.listLoading)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    loading: ((__VLS_ctx.listLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.fetchAutoDetectAccounts(true);
    }
};
let __VLS_3;
let __VLS_4;
const __VLS_8 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
const __VLS_14 = {}.Refresh;
/** @type { [typeof __VLS_components.Refresh, ] } */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({}));
const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_13.slots.default;
var __VLS_13;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("workspace") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: ("add-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("section-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_20 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    size: ("small"),
    type: ("info"),
    effect: ("plain"),
}));
const __VLS_22 = __VLS_21({
    size: ("small"),
    type: ("info"),
    effect: ("plain"),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_25.slots.default;
var __VLS_25;
const __VLS_26 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.selectedAffiliationIds)),
    ...{ class: ("account-select") },
    multiple: (true),
    filterable: (true),
    remote: (true),
    reserveKeyword: (true),
    collapseTags: (true),
    collapseTagsTooltip: (true),
    clearable: (true),
    remoteMethod: ((__VLS_ctx.searchAffiliations)),
    loading: ((__VLS_ctx.searchLoading)),
    placeholder: ("搜索已入库公众号"),
}));
const __VLS_28 = __VLS_27({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.selectedAffiliationIds)),
    ...{ class: ("account-select") },
    multiple: (true),
    filterable: (true),
    remote: (true),
    reserveKeyword: (true),
    collapseTags: (true),
    collapseTagsTooltip: (true),
    clearable: (true),
    remoteMethod: ((__VLS_ctx.searchAffiliations)),
    loading: ((__VLS_ctx.searchLoading)),
    placeholder: ("搜索已入库公众号"),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_32;
const __VLS_33 = {
    onVisibleChange: (__VLS_ctx.handleSelectVisible)
};
let __VLS_29;
let __VLS_30;
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.libraryOptions))) {
    const __VLS_34 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
        key: ((option.value)),
        label: ((option.label)),
        value: ((option.value)),
        disabled: ((__VLS_ctx.isAlreadyAdded(option.value))),
    }));
    const __VLS_36 = __VLS_35({
        key: ((option.value)),
        label: ((option.label)),
        value: ((option.value)),
        disabled: ((__VLS_ctx.isAlreadyAdded(option.value))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("option-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (option.label);
    if (option.alias) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("option-alias") },
        });
        (option.alias);
    }
    __VLS_39.slots.default;
    var __VLS_39;
}
{
    const { empty: __VLS_thisSlot } = __VLS_31.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("select-empty") },
    });
    (__VLS_ctx.searchKeyword
        ? "库中没有这个公众号，不能添加"
        : "暂无可选公众号");
}
__VLS_31.slots.default;
var __VLS_31;
const __VLS_40 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onClick': {} },
    ...{ class: ("add-button") },
    type: ("primary"),
    loading: ((__VLS_ctx.addLoading)),
    disabled: ((__VLS_ctx.selectedAffiliationIds.length === 0)),
}));
const __VLS_42 = __VLS_41({
    ...{ 'onClick': {} },
    ...{ class: ("add-button") },
    type: ("primary"),
    loading: ((__VLS_ctx.addLoading)),
    disabled: ((__VLS_ctx.selectedAffiliationIds.length === 0)),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_46;
const __VLS_47 = {
    onClick: (__VLS_ctx.addSelectedAccounts)
};
let __VLS_43;
let __VLS_44;
const __VLS_48 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_54 = {}.Plus;
/** @type { [typeof __VLS_components.Plus, ] } */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({}));
const __VLS_56 = __VLS_55({}, ...__VLS_functionalComponentArgsRest(__VLS_55));
__VLS_53.slots.default;
var __VLS_53;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_45.slots.default;
var __VLS_45;
const __VLS_60 = {}.ElDivider;
/** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stats-grid") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("stat-label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.summary.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("stat-label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.summary.enabled);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("stat-label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.summary.disabled);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("stat-label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.summary.detected_today);
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("list-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("list-toolbar") },
});
const __VLS_66 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.listFilters.keyword)),
    clearable: (true),
    placeholder: ("搜索列表中的公众号"),
    prefixIcon: ("Search"),
}));
const __VLS_68 = __VLS_67({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.listFilters.keyword)),
    clearable: (true),
    placeholder: ("搜索列表中的公众号"),
    prefixIcon: ("Search"),
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
let __VLS_72;
const __VLS_73 = {
    onClear: (...[$event]) => {
        __VLS_ctx.fetchAutoDetectAccounts(false);
    }
};
const __VLS_74 = {
    onKeyup: (...[$event]) => {
        __VLS_ctx.fetchAutoDetectAccounts(false);
    }
};
let __VLS_69;
let __VLS_70;
var __VLS_71;
const __VLS_75 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.listFilters.status)),
    ...{ class: ("status-filter") },
    placeholder: ("状态"),
}));
const __VLS_77 = __VLS_76({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.listFilters.status)),
    ...{ class: ("status-filter") },
    placeholder: ("状态"),
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
let __VLS_81;
const __VLS_82 = {
    onChange: (...[$event]) => {
        __VLS_ctx.fetchAutoDetectAccounts(false);
    }
};
let __VLS_78;
let __VLS_79;
const __VLS_83 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    label: ("启用中"),
    value: ("enabled"),
}));
const __VLS_85 = __VLS_84({
    label: ("启用中"),
    value: ("enabled"),
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
const __VLS_89 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    label: ("已停用"),
    value: ("disabled"),
}));
const __VLS_91 = __VLS_90({
    label: ("已停用"),
    value: ("disabled"),
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
__VLS_80.slots.default;
var __VLS_80;
if (__VLS_ctx.error) {
    const __VLS_95 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
        title: ((__VLS_ctx.error)),
        type: ("error"),
        showIcon: (true),
        ...{ class: ("list-alert") },
    }));
    const __VLS_97 = __VLS_96({
        title: ((__VLS_ctx.error)),
        type: ("error"),
        showIcon: (true),
        ...{ class: ("list-alert") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
}
const __VLS_101 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
    data: ((__VLS_ctx.listItems)),
    ...{ class: ("account-table") },
    stripe: (true),
    border: (true),
    emptyText: ("暂无自动检测公众号"),
}));
const __VLS_103 = __VLS_102({
    data: ((__VLS_ctx.listItems)),
    ...{ class: ("account-table") },
    stripe: (true),
    border: (true),
    emptyText: ("暂无自动检测公众号"),
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.listLoading) }, null, null);
const __VLS_107 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
    label: ("公众号"),
    minWidth: ("220"),
    showOverflowTooltip: (true),
}));
const __VLS_109 = __VLS_108({
    label: ("公众号"),
    minWidth: ("220"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
{
    const { default: __VLS_thisSlot } = __VLS_112.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("account-cell") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("account-name") },
    });
    (__VLS_ctx.getAccountName(row));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("account-id") },
    });
    (__VLS_ctx.getAffiliationId(row) || "--");
}
__VLS_112.slots.default;
var __VLS_112;
const __VLS_113 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
    label: ("状态"),
    width: ("110"),
    align: ("center"),
}));
const __VLS_115 = __VLS_114({
    label: ("状态"),
    width: ("110"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
{
    const { default: __VLS_thisSlot } = __VLS_118.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_119 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
        type: ((__VLS_ctx.getStatusType(row))),
        effect: ("plain"),
    }));
    const __VLS_121 = __VLS_120({
        type: ((__VLS_ctx.getStatusType(row))),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    (__VLS_ctx.getStatusLabel(row));
    __VLS_124.slots.default;
    var __VLS_124;
}
__VLS_118.slots.default;
var __VLS_118;
const __VLS_125 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    label: ("每日检测"),
    width: ("120"),
    align: ("center"),
}));
const __VLS_127 = __VLS_126({
    label: ("每日检测"),
    width: ("120"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
{
    const { default: __VLS_thisSlot } = __VLS_130.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (row.schedule_time || __VLS_ctx.summary.default_schedule_time || "每日");
}
__VLS_130.slots.default;
var __VLS_130;
const __VLS_131 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    label: ("最近采集"),
    width: ("170"),
}));
const __VLS_133 = __VLS_132({
    label: ("最近采集"),
    width: ("170"),
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
{
    const { default: __VLS_thisSlot } = __VLS_136.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatTime(row.last_crawl_at));
}
__VLS_136.slots.default;
var __VLS_136;
const __VLS_137 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({
    label: ("最近检测"),
    width: ("170"),
}));
const __VLS_139 = __VLS_138({
    label: ("最近检测"),
    width: ("170"),
}, ...__VLS_functionalComponentArgsRest(__VLS_138));
{
    const { default: __VLS_thisSlot } = __VLS_142.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatTime(row.last_detected_at));
}
__VLS_142.slots.default;
var __VLS_142;
const __VLS_143 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    label: ("最近结果"),
    width: ("130"),
    align: ("center"),
}));
const __VLS_145 = __VLS_144({
    label: ("最近结果"),
    width: ("130"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
{
    const { default: __VLS_thisSlot } = __VLS_148.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_149 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
        type: ((__VLS_ctx.getResultType(row))),
        effect: ("plain"),
    }));
    const __VLS_151 = __VLS_150({
        type: ((__VLS_ctx.getResultType(row))),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_150));
    (__VLS_ctx.formatResult(row));
    __VLS_154.slots.default;
    var __VLS_154;
}
__VLS_148.slots.default;
var __VLS_148;
const __VLS_155 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
    label: ("操作"),
    width: ("120"),
    fixed: ("right"),
    align: ("center"),
}));
const __VLS_157 = __VLS_156({
    label: ("操作"),
    width: ("120"),
    fixed: ("right"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
{
    const { default: __VLS_thisSlot } = __VLS_160.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (__VLS_ctx.isEnabledAccount(row)) {
        const __VLS_161 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
            ...{ 'onClick': {} },
            link: (true),
            type: ("danger"),
            loading: ((__VLS_ctx.actionLoadingKey === __VLS_ctx.getRowKey(row))),
        }));
        const __VLS_163 = __VLS_162({
            ...{ 'onClick': {} },
            link: (true),
            type: ("danger"),
            loading: ((__VLS_ctx.actionLoadingKey === __VLS_ctx.getRowKey(row))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_162));
        let __VLS_167;
        const __VLS_168 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.isEnabledAccount(row))))
                    return;
                __VLS_ctx.confirmRemove(row);
            }
        };
        let __VLS_164;
        let __VLS_165;
        const __VLS_169 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({}));
        const __VLS_171 = __VLS_170({}, ...__VLS_functionalComponentArgsRest(__VLS_170));
        const __VLS_175 = {}.Delete;
        /** @type { [typeof __VLS_components.Delete, ] } */ ;
        // @ts-ignore
        const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({}));
        const __VLS_177 = __VLS_176({}, ...__VLS_functionalComponentArgsRest(__VLS_176));
        __VLS_174.slots.default;
        var __VLS_174;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_166.slots.default;
        var __VLS_166;
    }
    else {
        const __VLS_181 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
            ...{ 'onClick': {} },
            link: (true),
            type: ("primary"),
            loading: ((__VLS_ctx.actionLoadingKey === __VLS_ctx.getRowKey(row))),
        }));
        const __VLS_183 = __VLS_182({
            ...{ 'onClick': {} },
            link: (true),
            type: ("primary"),
            loading: ((__VLS_ctx.actionLoadingKey === __VLS_ctx.getRowKey(row))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_182));
        let __VLS_187;
        const __VLS_188 = {
            onClick: (...[$event]) => {
                if (!(!((__VLS_ctx.isEnabledAccount(row)))))
                    return;
                __VLS_ctx.enableAccount(row);
            }
        };
        let __VLS_184;
        let __VLS_185;
        const __VLS_189 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({}));
        const __VLS_191 = __VLS_190({}, ...__VLS_functionalComponentArgsRest(__VLS_190));
        const __VLS_195 = {}.Plus;
        /** @type { [typeof __VLS_components.Plus, ] } */ ;
        // @ts-ignore
        const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({}));
        const __VLS_197 = __VLS_196({}, ...__VLS_functionalComponentArgsRest(__VLS_196));
        __VLS_194.slots.default;
        var __VLS_194;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_186.slots.default;
        var __VLS_186;
    }
}
__VLS_160.slots.default;
var __VLS_160;
__VLS_106.slots.default;
var __VLS_106;
const __VLS_201 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    ...{ class: ("pagination") },
    background: (true),
    layout: ("total, prev, pager, next, jumper, sizes"),
    total: ((__VLS_ctx.total)),
    currentPage: ((__VLS_ctx.page)),
    pageSize: ((__VLS_ctx.perPage)),
}));
const __VLS_203 = __VLS_202({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    ...{ class: ("pagination") },
    background: (true),
    layout: ("total, prev, pager, next, jumper, sizes"),
    total: ((__VLS_ctx.total)),
    currentPage: ((__VLS_ctx.page)),
    pageSize: ((__VLS_ctx.perPage)),
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
let __VLS_207;
const __VLS_208 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_209 = {
    onSizeChange: (__VLS_ctx.handlePageSizeChange)
};
let __VLS_204;
let __VLS_205;
var __VLS_206;
['auto-detect-page', 'page-header', 'workspace', 'add-panel', 'section-title', 'account-select', 'option-row', 'option-alias', 'select-empty', 'add-button', 'stats-grid', 'stat-item', 'stat-label', 'stat-item', 'stat-label', 'stat-item', 'stat-label', 'stat-item', 'stat-label', 'list-panel', 'list-toolbar', 'status-filter', 'list-alert', 'account-table', 'account-cell', 'account-name', 'account-id', 'pagination',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            selectedAffiliationIds: selectedAffiliationIds,
            libraryOptions: libraryOptions,
            searchKeyword: searchKeyword,
            searchLoading: searchLoading,
            addLoading: addLoading,
            listLoading: listLoading,
            actionLoadingKey: actionLoadingKey,
            error: error,
            listItems: listItems,
            total: total,
            page: page,
            perPage: perPage,
            summary: summary,
            listFilters: listFilters,
            searchAffiliations: searchAffiliations,
            handleSelectVisible: handleSelectVisible,
            isAlreadyAdded: isAlreadyAdded,
            addSelectedAccounts: addSelectedAccounts,
            fetchAutoDetectAccounts: fetchAutoDetectAccounts,
            handlePageChange: handlePageChange,
            handlePageSizeChange: handlePageSizeChange,
            confirmRemove: confirmRemove,
            enableAccount: enableAccount,
            getRowKey: getRowKey,
            getAffiliationId: getAffiliationId,
            getAccountName: getAccountName,
            isEnabledAccount: isEnabledAccount,
            getStatusLabel: getStatusLabel,
            getStatusType: getStatusType,
            formatTime: formatTime,
            formatResult: formatResult,
            getResultType: getResultType,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
