import { computed } from "vue";
import SocialTextCard from "./SocialTextCard.vue";
const props = defineProps();
const emit = defineEmits();
const currentPageModel = computed({
    get: () => props.currentPage,
    set: (value) => emit("update:currentPage", value),
});
const pageSizeModel = computed({
    get: () => props.pageSize,
    set: (value) => emit("update:pageSize", value),
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['social-text-list', 'detail-footer', 'detail-footer',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("social-text-list") },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.items))) {
    // @ts-ignore
    /** @type { [typeof SocialTextCard, ] } */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(SocialTextCard, new SocialTextCard({
        ...{ 'onToggle': {} },
        ...{ 'onOpenDetail': {} },
        key: ((item.id)),
        item: ((item)),
        selected: ((__VLS_ctx.selectedItems.includes(item.id) || __VLS_ctx.selectedItems.includes(String(item.id)))),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onToggle': {} },
        ...{ 'onOpenDetail': {} },
        key: ((item.id)),
        item: ((item)),
        selected: ((__VLS_ctx.selectedItems.includes(item.id) || __VLS_ctx.selectedItems.includes(String(item.id)))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_5;
    const __VLS_6 = {
        onToggle: (...[$event]) => {
            __VLS_ctx.emit('toggle', $event);
        }
    };
    const __VLS_7 = {
        onOpenDetail: (...[$event]) => {
            __VLS_ctx.emit('open-detail', $event);
        }
    };
    let __VLS_2;
    let __VLS_3;
    var __VLS_4;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: ("detail-footer") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("total-count") },
});
(__VLS_ctx.total);
const __VLS_8 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPageModel)),
    pageSize: ((__VLS_ctx.pageSizeModel)),
    pageSizes: (([20, 30, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total)),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPageModel)),
    pageSize: ((__VLS_ctx.pageSizeModel)),
    pageSizes: (([20, 30, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total)),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_14;
const __VLS_15 = {
    onChange: (...[$event]) => {
        __VLS_ctx.emit('page-change');
    }
};
let __VLS_11;
let __VLS_12;
var __VLS_13;
['social-text-list', 'detail-footer', 'total-count',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            SocialTextCard: SocialTextCard,
            emit: emit,
            currentPageModel: currentPageModel,
            pageSizeModel: pageSizeModel,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
