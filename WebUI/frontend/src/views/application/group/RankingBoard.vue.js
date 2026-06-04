export default (await import('vue')).defineComponent({
    name: 'RankingBoard',
    props: {
        ranking_data: {
            type: Object,
            required: true
        },
        header_content: {
            type: String,
            required: false,
        }
    },
    watch: {
        ranking_data: {
            handler(newValue) {
                if (newValue && Object.keys(newValue).length > 0) {
                    this.loading = false;
                }
            },
        }
    },
    data() {
        return {
            loading: true,
        };
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['ranking_item', 'ranking_item', 'ranking_item', 'ranking_item', 'ranking_board_header', 'ranking_board_header', 'ranking_board_header', 'ranking_board_header',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("ranking-board disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
(__VLS_ctx.header_content);
if (__VLS_ctx.loading !== true) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("ranking_board") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("ranking_board_header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.ranking_data.title))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: ((index)),
        });
        (item);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("ranking_list") },
    });
    for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.ranking_data.content.slice(0, 15)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("ranking_item") },
            key: ((index)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("ranking_item_rank") },
            ...{ class: (({
                    'rank-1': index === 0,
                    'rank-2': index === 1,
                    'rank-3': index === 2,
                    'rank-other': index >= 3
                })) },
        });
        (index + 1);
        for (const [type, index] of __VLS_getVForSourceType((__VLS_ctx.ranking_data.field))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: ((index)),
            });
            (item?.[type] || '未认证');
        }
    }
}
['ranking-board', 'disable-select', 'chart-title', 'ranking_board', 'ranking_board_header', 'ranking_list', 'ranking_item', 'ranking_item_rank', 'rank-1', 'rank-2', 'rank-3', 'rank-other',];
var __VLS_special;
let __VLS_self;
