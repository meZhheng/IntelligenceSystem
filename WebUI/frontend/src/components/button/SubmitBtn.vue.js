const __VLS_props = defineProps({ type: String }); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.type == 2) {
    const __VLS_0 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        ...{ class: ("button") },
        type: ("primary"),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        ...{ class: ("button") },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_6;
    const __VLS_7 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.type == 2)))
                return;
            __VLS_ctx.$emit('onClick');
        }
    };
    let __VLS_3;
    let __VLS_4;
    var __VLS_8 = {};
    __VLS_5.slots.default;
    var __VLS_5;
}
else {
    const __VLS_9 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
        ...{ 'onClick': {} },
        ...{ class: ("button") },
    }));
    const __VLS_11 = __VLS_10({
        ...{ 'onClick': {} },
        ...{ class: ("button") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    let __VLS_15;
    const __VLS_16 = {
        onClick: (...[$event]) => {
            if (!(!((__VLS_ctx.type == 2))))
                return;
            __VLS_ctx.$emit('onClick');
        }
    };
    let __VLS_12;
    let __VLS_13;
    var __VLS_17 = {};
    __VLS_14.slots.default;
    var __VLS_14;
}
['button', 'button',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(__VLS_props),
            ...__VLS_props,
        };
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(__VLS_props),
            ...__VLS_props,
        };
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
