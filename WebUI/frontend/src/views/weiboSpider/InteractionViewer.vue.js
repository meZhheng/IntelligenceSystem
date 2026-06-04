import { ref, computed, watch, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import axios from '@/api/axios';
const props = defineProps();
// 当 selectedSeed 发生变化时触发一次 applyFilters()
// 只在 id 或 name 变化时触发（避免引用变化导致重复调用）
watch(() => props.selectedSeed, (newVal, oldVal) => {
    if (!newVal)
        return;
    if (!oldVal || newVal.id !== oldVal.id || newVal.name !== oldVal.name) {
        applyFilters();
    }
});
const interactions = ref([]);
const filterType = ref('');
const filterDate = ref(null);
const searchText = ref('');
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);
const loading = ref(false);
async function goUser(item) {
    props.handleNodeClickAsync({
        'data': {
            id: item.target_user_id,
            name: item.target_username
        }
    });
}
onMounted(() => {
    applyFilters();
});
const applyFilters = async () => {
    currentPage.value = 1;
    loading.value = true;
    try {
        const params = {
            user_id: props.selectedSeed.id,
            type: filterType.value || null,
            start_date: filterDate.value?.[0] || null,
            end_date: filterDate.value?.[1] || null,
            search_text: searchText.value || null,
            page: currentPage.value,
            page_size: pageSize
        };
        const response = await axios.post('/weibo/blog/interactions', params);
        interactions.value = response.data.items;
        total.value = response.data._meta.total_items;
    }
    catch (err) {
        console.error('交互记录获取失败：', err);
    }
    finally {
        loading.value = false;
    }
};
const filteredList = computed(() => {
    let list = [...interactions.value];
    if (filterType.value) {
        list = list.filter(item => item.interaction_type === filterType.value);
    }
    if (filterDate.value) {
        const [start, end] = filterDate.value;
        list = list.filter(item => item.publish_time >= start && item.publish_time <= end);
    }
    if (searchText.value) {
        list = list.filter(item => item.content?.toLowerCase().includes(searchText.value.toLowerCase()));
    }
    const startIdx = (currentPage.value - 1) * pageSize;
    return list.slice(startIdx, startIdx + pageSize);
});
const handlePageChange = (page) => {
    currentPage.value = page;
};
const formatTime = (ts) => {
    return new Date(ts).toLocaleString();
};
const interactionTypeLabel = (type) => {
    if (type === 'like')
        return '点赞';
    if (type === 'comment')
        return '评论';
    if (type === 'retweet')
        return '转发';
    return type;
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("box-container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filters") },
});
const __VLS_0 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: ((__VLS_ctx.searchText)),
    placeholder: ("搜索内容关键词"),
    ...{ class: ("filter-item") },
    clearable: (true),
}));
const __VLS_2 = __VLS_1({
    modelValue: ((__VLS_ctx.searchText)),
    placeholder: ("搜索内容关键词"),
    ...{ class: ("filter-item") },
    clearable: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
{
    const { suffix: __VLS_thisSlot } = __VLS_5.slots;
    const __VLS_6 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
    const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_12 = {}.Search;
    /** @type { [typeof __VLS_components.Search, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_11.slots.default;
    var __VLS_11;
}
__VLS_5.slots.default;
var __VLS_5;
const __VLS_18 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    modelValue: ((__VLS_ctx.filterType)),
    placeholder: ("交互类型"),
    ...{ class: ("filter-item") },
}));
const __VLS_20 = __VLS_19({
    modelValue: ((__VLS_ctx.filterType)),
    placeholder: ("交互类型"),
    ...{ class: ("filter-item") },
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
const __VLS_24 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: ("全部"),
    value: (""),
}));
const __VLS_26 = __VLS_25({
    label: ("全部"),
    value: (""),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const __VLS_30 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    label: ("点赞"),
    value: ("like"),
}));
const __VLS_32 = __VLS_31({
    label: ("点赞"),
    value: ("like"),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const __VLS_36 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: ("转发"),
    value: ("retweet"),
}));
const __VLS_38 = __VLS_37({
    label: ("转发"),
    value: ("retweet"),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const __VLS_42 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    label: ("评论"),
    value: ("comment"),
}));
const __VLS_44 = __VLS_43({
    label: ("评论"),
    value: ("comment"),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
__VLS_23.slots.default;
var __VLS_23;
const __VLS_48 = {}.ElDatePicker;
/** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: ((__VLS_ctx.filterDate)),
    type: ("daterange"),
    unlinkPanels: (true),
    startPlaceholder: ("开始日期"),
    endPlaceholder: ("结束日期"),
    ...{ class: ("filter-item") },
    valueFormat: ("YYYY-MM-DD"),
}));
const __VLS_50 = __VLS_49({
    modelValue: ((__VLS_ctx.filterDate)),
    type: ("daterange"),
    unlinkPanels: (true),
    startPlaceholder: ("开始日期"),
    endPlaceholder: ("结束日期"),
    ...{ class: ("filter-item") },
    valueFormat: ("YYYY-MM-DD"),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_54 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    ...{ 'onClick': {} },
    type: ("primary"),
    ...{ class: ("filter-item") },
}));
const __VLS_56 = __VLS_55({
    ...{ 'onClick': {} },
    type: ("primary"),
    ...{ class: ("filter-item") },
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
let __VLS_60;
const __VLS_61 = {
    onClick: (__VLS_ctx.applyFilters)
};
let __VLS_57;
let __VLS_58;
__VLS_59.slots.default;
var __VLS_59;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("interaction-list") },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredList))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("interaction-card") },
        key: ((item.id)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("interaction-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.goUser(item);
            } },
        ...{ class: ("username") },
    });
    (item.target_username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("type-tag") },
    });
    (__VLS_ctx.interactionTypeLabel(item.interaction_type));
    if (item.content) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("interaction-content") },
        });
        (item.content || '[无文本内容]');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("interaction-meta") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("time") },
    });
    (__VLS_ctx.formatTime(item.publish_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("source") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.source || '未知设备');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("pagination") },
});
const __VLS_62 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
    ...{ 'onCurrentChange': {} },
    background: (true),
    layout: ("prev, pager, next"),
    total: ((__VLS_ctx.total)),
    pageSize: ((__VLS_ctx.pageSize)),
    currentPage: ((__VLS_ctx.currentPage)),
    small: (true),
}));
const __VLS_64 = __VLS_63({
    ...{ 'onCurrentChange': {} },
    background: (true),
    layout: ("prev, pager, next"),
    total: ((__VLS_ctx.total)),
    pageSize: ((__VLS_ctx.pageSize)),
    currentPage: ((__VLS_ctx.currentPage)),
    small: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
let __VLS_68;
const __VLS_69 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
let __VLS_65;
let __VLS_66;
var __VLS_67;
['box-container', 'filters', 'filter-item', 'filter-item', 'filter-item', 'filter-item', 'interaction-list', 'interaction-card', 'interaction-header', 'username', 'type-tag', 'interaction-content', 'interaction-meta', 'time', 'source', 'pagination',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            filterType: filterType,
            filterDate: filterDate,
            searchText: searchText,
            currentPage: currentPage,
            pageSize: pageSize,
            total: total,
            goUser: goUser,
            applyFilters: applyFilters,
            filteredList: filteredList,
            handlePageChange: handlePageChange,
            formatTime: formatTime,
            interactionTypeLabel: interactionTypeLabel,
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
