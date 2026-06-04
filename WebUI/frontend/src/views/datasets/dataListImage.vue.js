import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
const router = useRouter();
const props = withDefaults(defineProps(), {
    default: false // 设置默认值
});
const select_data = (dataset_id, data_id) => {
    if (!props.default) {
        router.push({
            name: 'InferenceIndex',
            query: {
                group_id: props.group_id,
                dataset_id: dataset_id,
                data_id: data_id,
                dataset_type: 'IMAGE',
                task_type: props.task_type,
            }
        });
    }
    else {
        router.push({
            name: 'SingleData',
            query: {
                dataset_id: dataset_id,
                data_id: data_id,
                dataset_type: 'IMAGE',
            }
        });
    }
};
const currentIndexes = ref({});
watch(() => props.data_list, (list) => {
    list.forEach(item => {
        if (item.images && item.images.length > 0 && currentIndexes.value[item.id] === undefined) {
            currentIndexes.value[item.id] = 0;
        }
    });
}, { immediate: true });
function prevImage(dataId, len) {
    const idx = currentIndexes.value[dataId];
    currentIndexes.value[dataId] = (idx - 1 + len) % len;
}
function nextImage(dataId, len) {
    const idx = currentIndexes.value[dataId];
    currentIndexes.value[dataId] = (idx + 1) % len;
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    default: false // 设置默认值
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['data-item', 'arrow',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ('data-list-image') },
});
for (const [data, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.select_data(data.dataset_id, data.id);
            } },
        key: ((idx)),
        ...{ class: ('data-item card') },
    });
    if (data.images && data.images.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ('item-images') },
        });
        const __VLS_0 = {}.ElImage;
        /** @type { [typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            src: (("/static/images/" + data.dataset_id + "/" + data.images[__VLS_ctx.currentIndexes[data.id]].path)),
            fit: ('cover'),
            lazy: (true),
            ...{ class: ('item-image') },
        }));
        const __VLS_2 = __VLS_1({
            src: (("/static/images/" + data.dataset_id + "/" + data.images[__VLS_ctx.currentIndexes[data.id]].path)),
            fit: ('cover'),
            lazy: (true),
            ...{ class: ('item-image') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        if (data.images.length > 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((data.images && data.images.length)))
                            return;
                        if (!((data.images.length > 1)))
                            return;
                        __VLS_ctx.prevImage(data.id, data.images.length);
                    } },
                ...{ class: ('arrow arrow-left') },
            });
            const __VLS_6 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
            const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
            const __VLS_12 = {}.ArrowLeft;
            /** @type { [typeof __VLS_components.ArrowLeft, ] } */ ;
            // @ts-ignore
            const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
            const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
            __VLS_11.slots.default;
            var __VLS_11;
        }
        if (data.images.length > 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((data.images && data.images.length)))
                            return;
                        if (!((data.images.length > 1)))
                            return;
                        __VLS_ctx.nextImage(data.id, data.images.length);
                    } },
                ...{ class: ('arrow arrow-right') },
            });
            const __VLS_18 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
            const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
            const __VLS_24 = {}.ArrowRight;
            /** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
            const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
            __VLS_23.slots.default;
            var __VLS_23;
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ('item-content') },
    });
    (data.text);
}
['data-list-image', 'data-item', 'card', 'item-images', 'item-image', 'arrow', 'arrow-left', 'arrow', 'arrow-right', 'item-content',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            ArrowRight: ArrowRight,
            select_data: select_data,
            currentIndexes: currentIndexes,
            prevImage: prevImage,
            nextImage: nextImage,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
