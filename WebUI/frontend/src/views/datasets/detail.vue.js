import { computed, onMounted, ref } from "vue";
import axios from "@/api/axios";
import { useRoute, useRouter } from "vue-router";
import { formatDateTime } from "@/utils/date";
import dataListImage from "@/views/datasets/dataListImage.vue";
import SocialDatasetWorkspace from "@/views/datasets/social/SocialDatasetWorkspace.vue";
import { ElLoading } from "element-plus";
const currentPage = ref(1);
const pageSize = ref(20);
const total_items = ref(0);
const data_list = ref([]);
const sub_task_type_selected = ref(null);
const group = ref({ id: 0 });
const dataset_type = ref(null);
const route = useRoute();
const router = useRouter();
const datasetId = computed(() => route.params.dataset_id);
const fetchData = async () => {
    const link = `/datasets/detail?page=${currentPage.value}&per_page=${pageSize.value}`;
    const loadingData = ElLoading.service({
        lock: true,
        text: "加载中，请稍候...",
        background: "rgba(0, 0, 0, 0.5)",
    });
    data_list.value = [];
    try {
        const response = await axios.post(link, {
            dataset_id: route.params.dataset_id,
        }, { timeout: 600000 });
        data_list.value = response.data.items;
        total_items.value = response.data._meta.total_items;
        dataset_type.value = response.data.dataset_type;
    }
    catch (error) {
        console.error(error);
    }
    finally {
        loadingData.close();
    }
};
function select_data(dataset_id, rel_data_id) {
    router.push({
        name: "SingleData",
        params: { dataset_id },
        query: {
            dataset_id,
            data_id: rel_data_id,
            dataset_type: dataset_type.value,
        },
    });
}
onMounted(() => {
    fetchData();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['dataset-detail', 'data-list', 'card', 'session-item', 'data-item', 'data-item',];
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.dataset_type === 'SOCIAL') {
    // @ts-ignore
    /** @type { [typeof SocialDatasetWorkspace, ] } */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(SocialDatasetWorkspace, new SocialDatasetWorkspace({
        datasetId: ((__VLS_ctx.datasetId)),
    }));
    const __VLS_1 = __VLS_0({
        datasetId: ((__VLS_ctx.datasetId)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dataset-detail") },
    });
    if (__VLS_ctx.dataset_type == 'IMAGE') {
        // @ts-ignore
        /** @type { [typeof dataListImage, ] } */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(dataListImage, new dataListImage({
            data_list: ((__VLS_ctx.data_list)),
            group_id: ((__VLS_ctx.group.id)),
            task_type: ((__VLS_ctx.sub_task_type_selected?.name)),
            default: ((true)),
        }));
        const __VLS_6 = __VLS_5({
            data_list: ((__VLS_ctx.data_list)),
            group_id: ((__VLS_ctx.group.id)),
            task_type: ((__VLS_ctx.sub_task_type_selected?.name)),
            default: ((true)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
    else if (__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: ("data-list") },
        });
        for (const [session] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
            const __VLS_10 = {}.ElCard;
            /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
            // @ts-ignore
            const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
                ...{ 'onClick': {} },
                key: ((session.session_code)),
                ...{ class: ("session-item card") },
                shadow: ("hover"),
            }));
            const __VLS_12 = __VLS_11({
                ...{ 'onClick': {} },
                key: ((session.session_code)),
                ...{ class: ("session-item card") },
                shadow: ("hover"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_11));
            let __VLS_16;
            const __VLS_17 = {
                onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.dataset_type === 'SOCIAL'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type == 'IMAGE'))))
                        return;
                    if (!((__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE')))
                        return;
                    __VLS_ctx.select_data(session.dataset_id, session.id);
                }
            };
            let __VLS_13;
            let __VLS_14;
            {
                const { header: __VLS_thisSlot } = __VLS_15.slots;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("session-header") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("session-title") },
                });
                (session.context_utterances[0]);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("utterance-preview") },
            });
            for (const [utt, idx] of __VLS_getVForSourceType((session.context_utterances.slice(0, 5)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: ((idx)),
                    ...{ class: ("utterance-badge") },
                });
                (utt);
            }
            if (session.utterance_ids.length > 5) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("more-count") },
                });
                (session.utterance_ids.length);
            }
            __VLS_15.slots.default;
            var __VLS_15;
        }
    }
    else if (__VLS_ctx.dataset_type == 'PROPAGATION') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: ("data-list propagation-list") },
        });
        for (const [comment] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((comment.id)),
            });
            const __VLS_18 = {}.ElCard;
            /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
                ...{ 'onClick': {} },
                ...{ class: ("comment-card") },
                shadow: ("hover"),
            }));
            const __VLS_20 = __VLS_19({
                ...{ 'onClick': {} },
                ...{ class: ("comment-card") },
                shadow: ("hover"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_19));
            let __VLS_24;
            const __VLS_25 = {
                onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.dataset_type === 'SOCIAL'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type == 'IMAGE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE'))))
                        return;
                    if (!((__VLS_ctx.dataset_type == 'PROPAGATION')))
                        return;
                    __VLS_ctx.select_data(comment.dataset_id, comment.id);
                }
            };
            let __VLS_21;
            let __VLS_22;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-content") },
            });
            (comment.content);
            __VLS_23.slots.default;
            var __VLS_23;
        }
    }
    else if (__VLS_ctx.dataset_type == 'ILLEGAL_ACCOUNT_DETECTION') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: ("data-list") },
        });
        for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.dataset_type === 'SOCIAL'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'IMAGE'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'PROPAGATION'))))
                            return;
                        if (!((__VLS_ctx.dataset_type == 'ILLEGAL_ACCOUNT_DETECTION')))
                            return;
                        __VLS_ctx.select_data(item.dataset_id, item.id);
                    } },
                key: ((idx)),
                ...{ class: ("data-item card") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
                ...{ class: ("item-header") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
                ...{ class: ("item-title") },
            });
            (item.name);
        }
    }
    else if (__VLS_ctx.dataset_type == 'ACCOUNT_ROLE_RECOGNITION') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: ("data-list") },
        });
        for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.dataset_type === 'SOCIAL'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'IMAGE'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'PROPAGATION'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'ILLEGAL_ACCOUNT_DETECTION'))))
                            return;
                        if (!((__VLS_ctx.dataset_type == 'ACCOUNT_ROLE_RECOGNITION')))
                            return;
                        __VLS_ctx.select_data(item.dataset_id, item.id);
                    } },
                key: ((idx)),
                ...{ class: ("data-item card") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
                ...{ class: ("item-header") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
                ...{ class: ("item-title") },
            });
            (item.username);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("item-meta-list") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("item-meta") },
            });
            const __VLS_26 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({}));
            const __VLS_28 = __VLS_27({}, ...__VLS_functionalComponentArgsRest(__VLS_27));
            const __VLS_32 = {}.User;
            /** @type { [typeof __VLS_components.User, ] } */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
            const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
            __VLS_31.slots.default;
            var __VLS_31;
            (item.num_followers);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("item-meta") },
            });
            const __VLS_38 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({}));
            const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
            const __VLS_44 = {}.Document;
            /** @type { [typeof __VLS_components.Document, ] } */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
            __VLS_43.slots.default;
            var __VLS_43;
            (item.num_blogs);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: ("data-list") },
        });
        for (const [data, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.dataset_type === 'SOCIAL'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'IMAGE'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'PROPAGATION'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'ILLEGAL_ACCOUNT_DETECTION'))))
                            return;
                        if (!(!((__VLS_ctx.dataset_type == 'ACCOUNT_ROLE_RECOGNITION'))))
                            return;
                        __VLS_ctx.select_data(data.dataset_id, data.id);
                    } },
                key: ((idx)),
                ...{ class: ("data-item card") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
                ...{ class: ("item-header") },
            });
            if (data.title) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
                    ...{ class: ("item-title") },
                });
                (data.title);
            }
            if (data.publish_time) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({
                    ...{ class: ("item-time") },
                });
                (__VLS_ctx.formatDateTime(data.publish_time));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("item-content") },
            });
            (data.text);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
                ...{ class: ("item-footer") },
            });
            if (data.author) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("footer-info") },
                });
                const __VLS_50 = {}.ElIcon;
                /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
                // @ts-ignore
                const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({}));
                const __VLS_52 = __VLS_51({}, ...__VLS_functionalComponentArgsRest(__VLS_51));
                const __VLS_56 = {}.Stopwatch;
                /** @type { [typeof __VLS_components.Stopwatch, ] } */ ;
                // @ts-ignore
                const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
                const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
                __VLS_55.slots.default;
                var __VLS_55;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (data.author);
            }
            if (data.key_word) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("footer-info") },
                });
                const __VLS_62 = {}.ElIcon;
                /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
                // @ts-ignore
                const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({}));
                const __VLS_64 = __VLS_63({}, ...__VLS_functionalComponentArgsRest(__VLS_63));
                const __VLS_68 = {}.CollectionTag;
                /** @type { [typeof __VLS_components.CollectionTag, ] } */ ;
                // @ts-ignore
                const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
                const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
                __VLS_67.slots.default;
                var __VLS_67;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (data.key_word);
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: ("detail-footer") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("total-count") },
    });
    (__VLS_ctx.total_items);
    const __VLS_74 = {}.ElPagination;
    /** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        ...{ 'onChange': {} },
        currentPage: ((__VLS_ctx.currentPage)),
        pageSize: ((__VLS_ctx.pageSize)),
        pageSizes: (([20, 30, 50, 100])),
        background: (true),
        layout: ("sizes, prev, pager, next"),
        total: ((__VLS_ctx.total_items)),
    }));
    const __VLS_76 = __VLS_75({
        ...{ 'onChange': {} },
        currentPage: ((__VLS_ctx.currentPage)),
        pageSize: ((__VLS_ctx.pageSize)),
        pageSizes: (([20, 30, 50, 100])),
        background: (true),
        layout: ("sizes, prev, pager, next"),
        total: ((__VLS_ctx.total_items)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    let __VLS_80;
    const __VLS_81 = {
        onChange: (__VLS_ctx.fetchData)
    };
    let __VLS_77;
    let __VLS_78;
    var __VLS_79;
}
['dataset-detail', 'data-list', 'session-item', 'card', 'session-header', 'session-title', 'utterance-preview', 'utterance-badge', 'more-count', 'data-list', 'propagation-list', 'comment-card', 'card-content', 'data-list', 'data-item', 'card', 'item-header', 'item-title', 'data-list', 'data-item', 'card', 'item-header', 'item-title', 'item-meta-list', 'item-meta', 'item-meta', 'data-list', 'data-item', 'card', 'item-header', 'item-title', 'item-time', 'item-content', 'item-footer', 'footer-info', 'footer-info', 'detail-footer', 'total-count',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatDateTime: formatDateTime,
            dataListImage: dataListImage,
            SocialDatasetWorkspace: SocialDatasetWorkspace,
            currentPage: currentPage,
            pageSize: pageSize,
            total_items: total_items,
            data_list: data_list,
            sub_task_type_selected: sub_task_type_selected,
            group: group,
            dataset_type: dataset_type,
            datasetId: datasetId,
            fetchData: fetchData,
            select_data: select_data,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
