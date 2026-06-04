import { ref } from 'vue';
import { User, Document, Star } from '@element-plus/icons-vue';
const cards = ref([
    {
        title: '学员数据管理',
        description: '统一批量处理学员账号，快速创建、便捷编辑、一键删除，并实时跟踪学习进度，帮助教学管理人员高效掌握学员状态。',
        to: '/study/students', // ← 替换为实际路由
        icon: User,
    },
    {
        title: '学习报告撰写',
        description: '提供报告模板和撰写工具，自动化生成学习任务效果评估报告，助力教学效果量化管理。',
        to: '/study/report', // ← 替换为实际路由
        icon: Document,
    },
    {
        title: '人机对抗训练',
        description: '模拟真实操作场景：人工生成错误样本机器判定、机器生成错误样本人工判定，提升学员敏感内容识别与应急处理能力。',
        to: '/study/adversarial', // ← 替换为实际路由
        icon: Star,
    },
]); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("guide-page") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: ("page-title") },
});
const __VLS_0 = {}.ElRow;
/** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    gutter: ((20)),
    ...{ class: ("cards-row") },
}));
const __VLS_2 = __VLS_1({
    gutter: ((20)),
    ...{ class: ("cards-row") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
for (const [card] of __VLS_getVForSourceType((__VLS_ctx.cards))) {
    const __VLS_6 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        span: ((24)),
        key: ((card.title)),
        ...{ class: ("cards-col") },
    }));
    const __VLS_8 = __VLS_7({
        span: ((24)),
        key: ((card.title)),
        ...{ class: ("cards-col") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_12 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        shadow: ("hover"),
        ...{ class: ("feature-card") },
    }));
    const __VLS_14 = __VLS_13({
        shadow: ("hover"),
        ...{ class: ("feature-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    const __VLS_18 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        size: ((22)),
        ...{ class: ("card-icon") },
    }));
    const __VLS_20 = __VLS_19({
        size: ((22)),
        ...{ class: ("card-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    const __VLS_24 = ((card.icon));
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_23.slots.default;
    var __VLS_23;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (card.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (card.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-footer") },
    });
    const __VLS_30 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_32 = __VLS_31({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    let __VLS_36;
    const __VLS_37 = {
        onClick: (...[$event]) => {
            __VLS_ctx.$router.push(card.to);
        }
    };
    let __VLS_33;
    let __VLS_34;
    (card.title);
    __VLS_35.slots.default;
    var __VLS_35;
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_11.slots.default;
    var __VLS_11;
}
__VLS_5.slots.default;
var __VLS_5;
['guide-page', 'page-title', 'cards-row', 'cards-col', 'feature-card', 'card-header', 'card-icon', 'card-body', 'card-footer',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            cards: cards,
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
