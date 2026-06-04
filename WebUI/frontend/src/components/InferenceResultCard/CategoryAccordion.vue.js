import { computed, ref } from 'vue';
import { CATEGORY_MAP } from './Lexicon.vue';
const props = defineProps();
const emit = defineEmits();
const activeCategory = ref('');
const COLOR_MAP = {
    general: '#fde2e2',
    LGBT: '#d3e8ff',
    racism: '#fee4cb',
    region: '#e4f5d4',
    sexism: '#fbedf5'
};
const matchGroups = computed(() => props.matches.map(g => ({
    ...g,
    items: g.items.sort((a, b) => a.positions[0] - b.positions[0])
})));
const getCategoryColor = (category) => COLOR_MAP[category] || '#f0f0f0';
const handleClick = (position) => {
    emit('highlight', position);
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: ((__VLS_ctx.activeCategory)),
    accordion: (true),
}));
const __VLS_2 = __VLS_1({
    modelValue: ((__VLS_ctx.activeCategory)),
    accordion: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.matchGroups))) {
    const __VLS_7 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        key: ((group.category)),
        name: ((group.category)),
    }));
    const __VLS_9 = __VLS_8({
        key: ((group.category)),
        name: ((group.category)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    {
        const { title: __VLS_thisSlot } = __VLS_12.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("category-header") },
        });
        const __VLS_13 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
            ...{ style: (({ backgroundColor: __VLS_ctx.getCategoryColor(group.category) })) },
            ...{ class: ("category-tag") },
        }));
        const __VLS_15 = __VLS_14({
            ...{ style: (({ backgroundColor: __VLS_ctx.getCategoryColor(group.category) })) },
            ...{ class: ("category-tag") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        (__VLS_ctx.CATEGORY_MAP[group.category] || group.category);
        __VLS_18.slots.default;
        var __VLS_18;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("count") },
        });
        (group.items.length);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("word-list") },
    });
    for (const [item, index] of __VLS_getVForSourceType((group.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.handleClick(item.positions[0]);
                } },
            key: ((index)),
            ...{ class: ("word-item") },
        });
        const __VLS_19 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
            content: ((`出现次数: ${item.positions.length}`)),
            placement: ("right"),
        }));
        const __VLS_21 = __VLS_20({
            content: ((`出现次数: ${item.positions.length}`)),
            placement: ("right"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("word") },
        });
        (item.word);
        __VLS_24.slots.default;
        var __VLS_24;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("positions") },
        });
        (item.positions[0]);
    }
    __VLS_12.slots.default;
    var __VLS_12;
}
__VLS_5.slots.default;
var __VLS_5;
['category-header', 'category-tag', 'count', 'word-list', 'word-item', 'word', 'positions',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CATEGORY_MAP: CATEGORY_MAP,
            activeCategory: activeCategory,
            matchGroups: matchGroups,
            getCategoryColor: getCategoryColor,
            handleClick: handleClick,
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
