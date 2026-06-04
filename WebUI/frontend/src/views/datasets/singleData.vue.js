import DataImageViewer from '@/views/datasets/dataImageViewer.vue';
import DialogueViewer from '@/views/datasets/dialogueViewer.vue';
import PropagationViewer from '@/views/datasets/propagationViewer.vue';
import { formatDateTime } from '@/utils/date';
import { useRoute } from 'vue-router';
import { onMounted, ref } from "vue";
import axios from '@/api/axios';
import { ElMessage } from 'element-plus';
const data = ref(null);
const dataset_type = ref(null);
const route = useRoute();
function fetchData() {
    const link = `/datasets/SingleData`;
    const payload = {
        dataset_id: route.params.dataset_id,
        data_id: route.query.data_id,
    };
    axios.post(link, payload).then((response) => {
        data.value = response.data;
    }).catch((e) => {
        ElMessage.error(String(e));
    });
}
onMounted(() => {
    dataset_type.value = Array.isArray(route.query.dataset_type)
        ? route.query.dataset_type[0]
        : route.query.dataset_type;
    fetchData();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['inference_index', 'card_time',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inference_index") },
});
if (__VLS_ctx.dataset_type == 'IMAGE') {
    // @ts-ignore
    /** @type { [typeof DataImageViewer, typeof DataImageViewer, ] } */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(DataImageViewer, new DataImageViewer({
        ...{ class: ("content") },
        data: ((__VLS_ctx.data)),
    }));
    const __VLS_1 = __VLS_0({
        ...{ class: ("content") },
        data: ((__VLS_ctx.data)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
else if (__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE') {
    // @ts-ignore
    /** @type { [typeof DialogueViewer, typeof DialogueViewer, ] } */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(DialogueViewer, new DialogueViewer({
        ...{ class: ("content") },
        session: ((__VLS_ctx.data)),
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: ("content") },
        session: ((__VLS_ctx.data)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
}
else if (__VLS_ctx.dataset_type == 'PROPAGATION') {
    // @ts-ignore
    /** @type { [typeof PropagationViewer, typeof PropagationViewer, ] } */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(PropagationViewer, new PropagationViewer({
        ...{ class: ("content") },
        root: (({ id: __VLS_ctx.data?.id, content: __VLS_ctx.data?.content })),
        subtree: ((__VLS_ctx.data?.subtree)),
    }));
    const __VLS_11 = __VLS_10({
        ...{ class: ("content") },
        root: (({ id: __VLS_ctx.data?.id, content: __VLS_ctx.data?.content })),
        subtree: ((__VLS_ctx.data?.subtree)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content") },
    });
    if (__VLS_ctx.data?.title) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("content_title card_title title") },
        });
        (__VLS_ctx.data.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content_fields") },
    });
    if (__VLS_ctx.data?.source_station) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_station") },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.data.source_station);
    }
    if (__VLS_ctx.data?.author) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_author") },
        });
        const __VLS_27 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({}));
        const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
        const __VLS_33 = {}.Stopwatch;
        /** @type { [typeof __VLS_components.Stopwatch, ] } */ ;
        // @ts-ignore
        const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({}));
        const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
        __VLS_32.slots.default;
        var __VLS_32;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.data.author);
    }
    if (__VLS_ctx.data?.key_word) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_keyword") },
        });
        const __VLS_39 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({}));
        const __VLS_41 = __VLS_40({}, ...__VLS_functionalComponentArgsRest(__VLS_40));
        const __VLS_45 = {}.CollectionTag;
        /** @type { [typeof __VLS_components.CollectionTag, ] } */ ;
        // @ts-ignore
        const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({}));
        const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
        __VLS_44.slots.default;
        var __VLS_44;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.data.key_word);
    }
    if (__VLS_ctx.data?.publish_time) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_time") },
        });
        const __VLS_51 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({}));
        const __VLS_53 = __VLS_52({}, ...__VLS_functionalComponentArgsRest(__VLS_52));
        const __VLS_57 = {}.Clock;
        /** @type { [typeof __VLS_components.Clock, ] } */ ;
        // @ts-ignore
        const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({}));
        const __VLS_59 = __VLS_58({}, ...__VLS_functionalComponentArgsRest(__VLS_58));
        __VLS_56.slots.default;
        var __VLS_56;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.formatDateTime(__VLS_ctx.data.publish_time));
    }
    if (__VLS_ctx.data?.text) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("content_main") },
        });
        (__VLS_ctx.data.text);
    }
}
['container', 'inference_index', 'content', 'content', 'content', 'content', 'content_title', 'card_title', 'title', 'content_fields', 'card_station', 'card_author', 'card_keyword', 'card_time', 'content_main',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataImageViewer: DataImageViewer,
            DialogueViewer: DialogueViewer,
            PropagationViewer: PropagationViewer,
            formatDateTime: formatDateTime,
            data: data,
            dataset_type: dataset_type,
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
