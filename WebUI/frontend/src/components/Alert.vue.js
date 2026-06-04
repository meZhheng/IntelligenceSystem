export default (await import('vue')).defineComponent({
    props: ['variant', 'message']
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("alert") },
    role: ("alert"),
    ...{ class: (('alert-' + __VLS_ctx.variant)) },
});
(__VLS_ctx.message);
['alert',];
var __VLS_special;
let __VLS_self;
