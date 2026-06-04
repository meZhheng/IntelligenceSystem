const __VLS_props = defineProps();
const emit = defineEmits();
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['social-toolbar', 'panel-heading', 'overview-main', 'selection-buttons', 'selection-buttons', 'social-toolbar', 'el-card__body', 'selection-buttons',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("social-toolbar") },
    shadow: ("never"),
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("social-toolbar") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("panel-heading") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedCount ? `已选择 ${__VLS_ctx.selectedCount} 条` : '选择数据后开始分析');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("selection-block") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("selection-buttons") },
});
const __VLS_7 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ 'onClick': {} },
    type: ("primary"),
    plain: (true),
}));
const __VLS_9 = __VLS_8({
    ...{ 'onClick': {} },
    type: ("primary"),
    plain: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_13;
const __VLS_14 = {
    onClick: (...[$event]) => {
        __VLS_ctx.emit('select-current-page');
    }
};
let __VLS_10;
let __VLS_11;
__VLS_12.slots.default;
var __VLS_12;
const __VLS_15 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ 'onClick': {} },
    plain: (true),
}));
const __VLS_17 = __VLS_16({
    ...{ 'onClick': {} },
    plain: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_21;
const __VLS_22 = {
    onClick: (...[$event]) => {
        __VLS_ctx.emit('select-current-page-unanalyzed');
    }
};
let __VLS_18;
let __VLS_19;
__VLS_20.slots.default;
var __VLS_20;
const __VLS_23 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    ...{ 'onClick': {} },
    disabled: ((__VLS_ctx.selectedCount === 0)),
    text: (true),
}));
const __VLS_25 = __VLS_24({
    ...{ 'onClick': {} },
    disabled: ((__VLS_ctx.selectedCount === 0)),
    text: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_29;
const __VLS_30 = {
    onClick: (...[$event]) => {
        __VLS_ctx.emit('clear-selection');
    }
};
let __VLS_26;
let __VLS_27;
__VLS_28.slots.default;
var __VLS_28;
__VLS_5.slots.default;
var __VLS_5;
['social-toolbar', 'panel-heading', 'selection-block', 'selection-buttons',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            emit: emit,
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
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
