import { computed } from "vue";
import { formatDateTime } from "@/utils/date";
import { formatSocialResultsForDisplay, isAnalyzed } from "./socialResult";
const props = defineProps();
const emit = defineEmits();
const resultTags = computed(() => formatSocialResultsForDisplay(props.item.social_result));
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['social-text-card', 'social-text-card', 'social-text-card', 'social-text-card', 'item-checkbox', 'item-header', 'title-wrap', 'item-title', 'item-time', 'social-text-card', 'item-footer', 'result-tag',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("social-text-card") },
    ...{ class: (({
            'is-selected': __VLS_ctx.selected,
            'is-unanalysed': !__VLS_ctx.isAnalyzed(__VLS_ctx.item),
        })) },
});
const __VLS_0 = {}.ElCheckbox;
/** @type { [typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ 'onChange': {} },
    ...{ class: ("item-checkbox") },
    modelValue: ((__VLS_ctx.selected)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ 'onChange': {} },
    ...{ class: ("item-checkbox") },
    modelValue: ((__VLS_ctx.selected)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: () => { }
};
const __VLS_8 = {
    onChange: (...[$event]) => {
        __VLS_ctx.emit('toggle', __VLS_ctx.item.id);
    }
};
let __VLS_3;
let __VLS_4;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('toggle', __VLS_ctx.item.id);
        } },
    ...{ class: ("card-body") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: ("item-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("title-wrap") },
});
if (__VLS_ctx.item.title) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("item-title") },
    });
    (__VLS_ctx.item.title);
}
const __VLS_9 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    size: ("small"),
    type: ((__VLS_ctx.isAnalyzed(__VLS_ctx.item) ? 'success' : 'info')),
    effect: ("plain"),
}));
const __VLS_11 = __VLS_10({
    size: ("small"),
    type: ((__VLS_ctx.isAnalyzed(__VLS_ctx.item) ? 'success' : 'info')),
    effect: ("plain"),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
(__VLS_ctx.isAnalyzed(__VLS_ctx.item) ? '已分析' : '未分析');
__VLS_14.slots.default;
var __VLS_14;
if (__VLS_ctx.item.publish_time) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({
        ...{ class: ("item-time") },
    });
    (__VLS_ctx.formatDateTime(__VLS_ctx.item.publish_time));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: ("item-content") },
});
(__VLS_ctx.item.text);
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: ("item-footer") },
});
if (__VLS_ctx.item.author) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("footer-info") },
    });
    const __VLS_15 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({}));
    const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
    const __VLS_21 = {}.Stopwatch;
    /** @type { [typeof __VLS_components.Stopwatch, ] } */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({}));
    const __VLS_23 = __VLS_22({}, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_20.slots.default;
    var __VLS_20;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.item.author);
}
if (__VLS_ctx.item.key_word) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("footer-info") },
    });
    const __VLS_27 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({}));
    const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
    const __VLS_33 = {}.CollectionTag;
    /** @type { [typeof __VLS_components.CollectionTag, ] } */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({}));
    const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
    __VLS_32.slots.default;
    var __VLS_32;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.item.key_word);
}
const __VLS_39 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    ...{ 'onClick': {} },
    type: ("primary"),
    link: (true),
    size: ("small"),
}));
const __VLS_41 = __VLS_40({
    ...{ 'onClick': {} },
    type: ("primary"),
    link: (true),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
let __VLS_45;
const __VLS_46 = {
    onClick: (...[$event]) => {
        __VLS_ctx.emit('open-detail', __VLS_ctx.item);
    }
};
let __VLS_42;
let __VLS_43;
__VLS_44.slots.default;
var __VLS_44;
if (__VLS_ctx.resultTags.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("social-results") },
    });
    for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.resultTags))) {
        const __VLS_47 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            key: ((tag.key)),
            type: ((tag.type)),
            effect: ("plain"),
            ...{ class: ("result-tag") },
        }));
        const __VLS_49 = __VLS_48({
            key: ((tag.key)),
            type: ((tag.type)),
            effect: ("plain"),
            ...{ class: ("result-tag") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        if (tag.raw) {
            const __VLS_53 = {}.ElTooltip;
            /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
            // @ts-ignore
            const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
                content: ((tag.raw)),
                placement: ("top"),
            }));
            const __VLS_55 = __VLS_54({
                content: ((tag.raw)),
                placement: ("top"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_54));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (tag.label);
            __VLS_58.slots.default;
            var __VLS_58;
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (tag.label);
        }
        __VLS_52.slots.default;
        var __VLS_52;
    }
}
['social-text-card', 'is-selected', 'is-unanalysed', 'item-checkbox', 'card-body', 'item-header', 'title-wrap', 'item-title', 'item-time', 'item-content', 'item-footer', 'footer-info', 'footer-info', 'social-results', 'result-tag',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatDateTime: formatDateTime,
            isAnalyzed: isAnalyzed,
            emit: emit,
            resultTags: resultTags,
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
