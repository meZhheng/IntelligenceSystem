import { ref } from 'vue';
import axios from '@/api/axios';
const models = ref([]);
const fetchData = async () => {
    try {
        const response = await axios.get('/models');
        models.value = response.data;
        console.log(models.value);
    }
    catch (error) {
        console.error('Failed to fetch models:', error);
    }
};
fetchData(); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
for (const [model, index] of __VLS_getVForSourceType((__VLS_ctx.models))) {
    const __VLS_0 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: ((index)),
        ...{ style: ({}) },
    }));
    const __VLS_2 = __VLS_1({
        key: ((index)),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    {
        const { header: __VLS_thisSlot } = __VLS_5.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (('models/' + model.id)),
            target: ("_blank"),
        });
        (model.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (model.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (model.updated);
    __VLS_5.slots.default;
    var __VLS_5;
}
['card-header',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            models: models,
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
