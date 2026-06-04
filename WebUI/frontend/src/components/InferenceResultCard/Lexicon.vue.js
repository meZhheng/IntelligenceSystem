import { computed } from 'vue';
import { Document, Warning, List } from '@element-plus/icons-vue';
import TextHighlighter from './TextHighlighter.vue';
import CategoryPie from './CategoryPie.vue';
import CategoryAccordion from './CategoryAccordion.vue';
// 在公共工具文件中添加
export const CATEGORY_MAP = {
    general: '一般违规',
    LGBT: 'LGBT性少数群体',
    racism: '种族歧视',
    region: '地域歧视',
    sexism: '性别歧视',
}; /* PartiallyEnd: #3632/both.vue */
export default await (async () => {
    const props = defineProps();
    const resultClass = computed(() => ({
        'real-news': isLexicon.value,
        'fake-news': !isLexicon.value
    }));
    const isLexicon = computed(() => props.result?.data?.[0] === 0);
    const verdictText = computed(() => isLexicon.value ? '安全内容' : '高风险内容');
    const totalMatches = computed(() => {
        return props.result?.matches?.[0]?.details?.length ?? 0;
    });
    // 处理匹配数据（按类别分组）
    const processedMatches = computed(() => {
        const details = props.result?.matches?.[0]?.details ?? [];
        const groups = {};
        details.forEach(match => {
            if (!groups[match.category]) {
                groups[match.category] = [];
            }
            groups[match.category].push(match);
        });
        return Object.entries(groups).map(([category, items]) => ({
            category,
            items: items.sort((a, b) => a.positions[0] - b.positions[0])
        }));
    });
    // 高亮交互处理
    const handleHighlight = (position) => {
        const element = document.querySelector(`[data-pos="${position}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-focus');
            setTimeout(() => element.classList.remove('highlight-focus'), 1500);
        }
    }; /* PartiallyEnd: #3632/scriptSetup.vue */
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['result-content',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content-analysis-container disable-select") },
    });
    const __VLS_0 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: ("result-card") },
        ...{ class: ((__VLS_ctx.resultClass)) },
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: ("result-card") },
        ...{ class: ((__VLS_ctx.resultClass)) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-header") },
    });
    const __VLS_6 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        ...{ class: ("status-icon") },
        size: ((40)),
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: ("status-icon") },
        size: ((40)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    if (__VLS_ctx.isLexicon) {
        const __VLS_12 = {}.SuccessFilled;
        /** @type { [typeof __VLS_components.SuccessFilled, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    else {
        const __VLS_18 = {}.WarningFilled;
        /** @type { [typeof __VLS_components.WarningFilled, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.verdictText);
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("analysis-layout") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("text-display") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("section-title") },
    });
    const __VLS_24 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_30 = {}.Document;
    /** @type { [typeof __VLS_components.Document, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({}));
    const __VLS_32 = __VLS_31({}, ...__VLS_functionalComponentArgsRest(__VLS_31));
    __VLS_29.slots.default;
    var __VLS_29;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("original-text") },
    });
    // @ts-ignore
    /** @type { [typeof TextHighlighter, ] } */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(TextHighlighter, new TextHighlighter({
        text: ((__VLS_ctx.result?.text || '')),
        matches: ((__VLS_ctx.result?.matches?.[0]?.details || [])),
    }));
    const __VLS_37 = __VLS_36({
        text: ((__VLS_ctx.result?.text || '')),
        matches: ((__VLS_ctx.result?.matches?.[0]?.details || [])),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: ("stat-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("risk-overview") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("section-title") },
    });
    const __VLS_41 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({}));
    const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
    const __VLS_47 = {}.Warning;
    /** @type { [typeof __VLS_components.Warning, ] } */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({}));
    const __VLS_49 = __VLS_48({}, ...__VLS_functionalComponentArgsRest(__VLS_48));
    __VLS_46.slots.default;
    var __VLS_46;
    if (__VLS_ctx.totalMatches) {
        // @ts-ignore
        /** @type { [typeof CategoryPie, ] } */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(CategoryPie, new CategoryPie({
            matches: ((__VLS_ctx.result?.matches?.[0]?.details || [])),
        }));
        const __VLS_54 = __VLS_53({
            matches: ((__VLS_ctx.result?.matches?.[0]?.details || [])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("result-content") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("match-details") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("section-title") },
    });
    const __VLS_58 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({}));
    const __VLS_60 = __VLS_59({}, ...__VLS_functionalComponentArgsRest(__VLS_59));
    const __VLS_64 = {}.List;
    /** @type { [typeof __VLS_components.List, ] } */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
    const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_63.slots.default;
    var __VLS_63;
    (__VLS_ctx.totalMatches);
    // @ts-ignore
    /** @type { [typeof CategoryAccordion, ] } */ ;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent(CategoryAccordion, new CategoryAccordion({
        ...{ 'onHighlight': {} },
        matches: ((__VLS_ctx.processedMatches)),
    }));
    const __VLS_71 = __VLS_70({
        ...{ 'onHighlight': {} },
        matches: ((__VLS_ctx.processedMatches)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_70));
    let __VLS_75;
    const __VLS_76 = {
        onHighlight: (__VLS_ctx.handleHighlight)
    };
    let __VLS_72;
    let __VLS_73;
    var __VLS_74;
    ['content-analysis-container', 'disable-select', 'result-card', 'result-header', 'status-icon', 'result-content', 'analysis-layout', 'text-display', 'section-title', 'original-text', 'stat-panel', 'risk-overview', 'section-title', 'result-content', 'match-details', 'section-title',];
    var __VLS_special;
    const __VLS_self = (await import('vue')).defineComponent({
        setup() {
            return {
                Document: Document,
                Warning: Warning,
                List: List,
                TextHighlighter: TextHighlighter,
                CategoryPie: CategoryPie,
                CategoryAccordion: CategoryAccordion,
                resultClass: resultClass,
                isLexicon: isLexicon,
                verdictText: verdictText,
                totalMatches: totalMatches,
                processedMatches: processedMatches,
                handleHighlight: handleHighlight,
            };
        },
        __typeProps: {},
    });
    return (await import('vue')).defineComponent({
        setup() {
            return {};
        },
        __typeProps: {},
        __typeEl: {},
    });
})(); /* PartiallyEnd: #3632/script.vue */
; /* PartiallyEnd: #4569/main.vue */
