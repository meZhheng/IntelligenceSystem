import { defineEmits, ref } from 'vue';
import dayjs from 'dayjs';
import axios from '@/api/axios';
import DetectionModal from './BlogDetect.vue';
const props = defineProps();
const emit = defineEmits();
function getStanceType(stance) {
    switch (stance) {
        case '支持':
            return 'success';
        case '反对':
            return 'danger';
        case '中立':
            return 'warning';
        default:
            return 'info';
    }
}
function getSentimentType(sentiment) {
    switch (sentiment) {
        case '正面':
            return 'success';
        case '负面':
            return 'danger';
        case '中立':
            return 'warning';
        default:
            return 'info';
    }
}
// 控制弹窗显隐
const modalVisible = ref(false);
// 存储当前要检测的博文
const currentPost = ref();
// 打开弹窗时设置 currentPost 并显示
function openDetectionModal(item) {
    currentPost.value = item;
    modalVisible.value = true;
}
// 监听子组件检测完成事件
function handleDetection(payload) {
    console.log('检测完成：', payload);
    // 你可以在这里更新 posts 数组中对应项的检测结果字段：
    props.fetchBlogs(false);
}
async function goUser(item) {
    props.handleNodeClickAsync({
        'data': {
            id: item.user_id,
            name: item.username
        }
    });
}
const pager = ref({ page: 1, per_page: 10 });
const showListType = ref(''); // 当前展开的列表类型
const showInteractionPostID = ref('');
const interactionList = ref([]);
const interactionTotalPages = ref(1);
const interactionTotalItems = ref(0);
const loadingInteraction = ref(false);
function toggleList(type, weibo_id) {
    if (showListType.value === type && showInteractionPostID.value === weibo_id) {
        showListType.value = '';
        showInteractionPostID.value = '';
    }
    else {
        showListType.value = type;
        showInteractionPostID.value = weibo_id;
        pager.value.page = 1;
        loadInteractionPage();
    }
}
function onPageChange(page) {
    pager.value.page = page;
    loadInteractionPage();
}
// 改变每页大小
function onSizeChange(size) {
    pager.value.per_page = size;
    pager.value.page = 1;
    loadInteractionPage();
}
function loadInteractionPage() {
    const url = `weibo/wblogs/interaction`;
    loadingInteraction.value = true;
    interactionList.value = [];
    interactionTotalPages.value = 1;
    interactionTotalItems.value = 0;
    axios.post(url, {
        page: pager.value.page,
        type: showListType.value,
        weibo_id: showInteractionPostID.value
    }).then(response => {
        const data = response.data;
        interactionList.value = data.items || [];
        interactionTotalPages.value = data._meta.total_pages || 1;
        interactionTotalItems.value = data._meta.total_items || 0;
    }).catch(error => {
        console.error('加载点赞列表失败:', error);
    }).finally(() => {
        loadingInteraction.value = false;
    });
}
function formatTime(ts) {
    return dayjs(ts).format('YYYY-MM-DD HH:mm');
}
function formatCount(n) {
    return n >= 1_000_000 ? '1000000+' : String(n);
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['interaction-list', 'retweet-list', 'username', 'time', 'content', 'pagination',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("weibo-list-container") },
});
if (__VLS_ctx.posts.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("empty-state-blogs") },
    });
    const __VLS_0 = {}.ElEmpty;
    /** @type { [typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        description: ("当前用户还没有发过微博"),
        imageSize: ((120)),
    }));
    const __VLS_2 = __VLS_1({
        description: ("当前用户还没有发过微博"),
        imageSize: ((120)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    {
        const { description: __VLS_thisSlot } = __VLS_5.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_5.slots.default;
    var __VLS_5;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("weibo-list") },
    });
    for (const [post] of __VLS_getVForSourceType((__VLS_ctx.posts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((post.id)),
            ...{ class: ("weibo-card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("content") },
        });
        (post.content);
        if (post.article_url) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ class: ("article-link") },
                href: ((post.article_url)),
                target: ("_blank"),
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("operation-pannel") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detection-entry") },
        });
        const __VLS_6 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
            ...{ 'onClick': {} },
            type: ("primary"),
            size: ("small"),
        }));
        const __VLS_8 = __VLS_7({
            ...{ 'onClick': {} },
            type: ("primary"),
            size: ("small"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        let __VLS_12;
        const __VLS_13 = {
            onClick: (...[$event]) => {
                if (!(!((__VLS_ctx.posts.length === 0))))
                    return;
                __VLS_ctx.openDetectionModal(post);
            }
        };
        let __VLS_9;
        let __VLS_10;
        __VLS_11.slots.default;
        var __VLS_11;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-meta") },
        });
        if (post.publish_place && post.publish_place !== '无') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("meta-item") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (post.publish_place);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("meta-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatTime(post.publish_time));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("meta-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (post.publish_tool || '—');
        if (post.detected && post.stance && post.stance.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("meta-item") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            for (const [item, idx] of __VLS_getVForSourceType((post.stance))) {
                const __VLS_14 = {}.ElTag;
                /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
                // @ts-ignore
                const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
                    key: ((idx)),
                    size: ("small"),
                    ...{ class: ("stance-tag") },
                    type: ((__VLS_ctx.getStanceType(item.stance))),
                    effect: ("plain"),
                }));
                const __VLS_16 = __VLS_15({
                    key: ((idx)),
                    size: ("small"),
                    ...{ class: ("stance-tag") },
                    type: ((__VLS_ctx.getStanceType(item.stance))),
                    effect: ("plain"),
                }, ...__VLS_functionalComponentArgsRest(__VLS_15));
                (item.target);
                (item.stance);
                __VLS_19.slots.default;
                var __VLS_19;
            }
        }
        if (post.detected && post.sentiment && post.sentiment.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("meta-item") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            for (const [item, idx] of __VLS_getVForSourceType((post.sentiment))) {
                const __VLS_20 = {}.ElTag;
                /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
                // @ts-ignore
                const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                    key: ((idx)),
                    size: ("small"),
                    ...{ class: ("stance-tag") },
                    type: ((__VLS_ctx.getSentimentType(item.sentiment))),
                    effect: ("plain"),
                }));
                const __VLS_22 = __VLS_21({
                    key: ((idx)),
                    size: ("small"),
                    ...{ class: ("stance-tag") },
                    type: ((__VLS_ctx.getSentimentType(item.sentiment))),
                    effect: ("plain"),
                }, ...__VLS_functionalComponentArgsRest(__VLS_21));
                (item.target);
                (item.sentiment);
                __VLS_25.slots.default;
                var __VLS_25;
            }
        }
        if (post.detected && post.violations) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-meta") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("meta-item") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("tags-container") },
            });
            if (post.violations.data[0].length > 0) {
                for (const [tag, idx] of __VLS_getVForSourceType((post.violations.data[0]))) {
                    const __VLS_26 = {}.ElTag;
                    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
                    // @ts-ignore
                    const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
                        key: ((idx)),
                        size: ("small"),
                        ...{ class: ("violation-tag") },
                        effect: ("plain"),
                    }));
                    const __VLS_28 = __VLS_27({
                        key: ((idx)),
                        size: ("small"),
                        ...{ class: ("violation-tag") },
                        effect: ("plain"),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
                    (tag);
                    __VLS_31.slots.default;
                    var __VLS_31;
                }
            }
            else {
                const __VLS_32 = {}.ElTag;
                /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
                // @ts-ignore
                const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                    size: ("small"),
                    type: ("info"),
                }));
                const __VLS_34 = __VLS_33({
                    size: ("small"),
                    type: ("info"),
                }, ...__VLS_functionalComponentArgsRest(__VLS_33));
                __VLS_37.slots.default;
                var __VLS_37;
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-stats") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.posts.length === 0))))
                        return;
                    __VLS_ctx.toggleList('like', post.id);
                } },
            ...{ class: ("stat") },
            ...{ class: (({ active: __VLS_ctx.showListType === 'like' && post.id === __VLS_ctx.showInteractionPostID })) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (post.up_num);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.posts.length === 0))))
                        return;
                    __VLS_ctx.toggleList('comment', post.id);
                } },
            ...{ class: ("stat") },
            ...{ style: ({}) },
            ...{ class: (({ active: __VLS_ctx.showListType === 'comment' && post.id === __VLS_ctx.showInteractionPostID })) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatCount(post.comment_num));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.posts.length === 0))))
                        return;
                    __VLS_ctx.toggleList('retweet', post.id);
                } },
            ...{ class: ("stat") },
            ...{ style: ({}) },
            ...{ class: (({ active: __VLS_ctx.showListType === 'retweet' && post.id === __VLS_ctx.showInteractionPostID })) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatCount(post.retweet_num));
        if (__VLS_ctx.showListType === 'like' && post.id === __VLS_ctx.showInteractionPostID) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("interaction-list") },
            });
            if (__VLS_ctx.interactionList.length > 0) {
                for (const [item] of __VLS_getVForSourceType((__VLS_ctx.interactionList))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("interaction-item") },
                        key: ((item.username + '_' + item.publish_time)),
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ onClick: (...[$event]) => {
                                if (!(!((__VLS_ctx.posts.length === 0))))
                                    return;
                                if (!((__VLS_ctx.showListType === 'like' && post.id === __VLS_ctx.showInteractionPostID)))
                                    return;
                                if (!((__VLS_ctx.interactionList.length > 0)))
                                    return;
                                __VLS_ctx.goUser(item);
                            } },
                        ...{ class: ("username") },
                    });
                    (item.username);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("time") },
                    });
                    (__VLS_ctx.formatTime(item.publish_time));
                }
                if (__VLS_ctx.interactionTotalPages > 1) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("pagination") },
                    });
                    const __VLS_38 = {}.ElPagination;
                    /** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
                    // @ts-ignore
                    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
                        ...{ 'onSizeChange': {} },
                        ...{ 'onCurrentChange': {} },
                        currentPage: ((__VLS_ctx.pager.page)),
                        pageSize: ((__VLS_ctx.pager.per_page)),
                        layout: ("total, prev, pager, next"),
                        total: ((__VLS_ctx.interactionTotalItems)),
                    }));
                    const __VLS_40 = __VLS_39({
                        ...{ 'onSizeChange': {} },
                        ...{ 'onCurrentChange': {} },
                        currentPage: ((__VLS_ctx.pager.page)),
                        pageSize: ((__VLS_ctx.pager.per_page)),
                        layout: ("total, prev, pager, next"),
                        total: ((__VLS_ctx.interactionTotalItems)),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
                    let __VLS_44;
                    const __VLS_45 = {
                        onSizeChange: (__VLS_ctx.onSizeChange)
                    };
                    const __VLS_46 = {
                        onCurrentChange: (__VLS_ctx.onPageChange)
                    };
                    let __VLS_41;
                    let __VLS_42;
                    var __VLS_43;
                }
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("empty-state") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            }
        }
        if ((__VLS_ctx.showListType === 'retweet' || __VLS_ctx.showListType === 'comment') && post.id === __VLS_ctx.showInteractionPostID) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("retweet-list") },
            });
            if (__VLS_ctx.interactionList.length > 0) {
                for (const [item] of __VLS_getVForSourceType((__VLS_ctx.interactionList))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("retweet-item") },
                        key: ((item.username + '_' + item.publish_time)),
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("user-info") },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ onClick: (...[$event]) => {
                                if (!(!((__VLS_ctx.posts.length === 0))))
                                    return;
                                if (!(((__VLS_ctx.showListType === 'retweet' || __VLS_ctx.showListType === 'comment') && post.id === __VLS_ctx.showInteractionPostID)))
                                    return;
                                if (!((__VLS_ctx.interactionList.length > 0)))
                                    return;
                                __VLS_ctx.goUser(item);
                            } },
                        ...{ class: ("username") },
                    });
                    (item.username);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("time") },
                    });
                    (__VLS_ctx.formatTime(item.publish_time));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("content") },
                    });
                    (item.content);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("meta") },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("likes") },
                    });
                    (item.like_num);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("source") },
                    });
                    (item.source);
                }
                if (__VLS_ctx.interactionTotalPages > 1) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("pagination") },
                    });
                    const __VLS_47 = {}.ElPagination;
                    /** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
                    // @ts-ignore
                    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
                        ...{ 'onSizeChange': {} },
                        ...{ 'onCurrentChange': {} },
                        currentPage: ((__VLS_ctx.pager.page)),
                        pageSize: ((__VLS_ctx.pager.per_page)),
                        layout: ("total, prev, pager, next"),
                        total: ((__VLS_ctx.interactionTotalItems)),
                    }));
                    const __VLS_49 = __VLS_48({
                        ...{ 'onSizeChange': {} },
                        ...{ 'onCurrentChange': {} },
                        currentPage: ((__VLS_ctx.pager.page)),
                        pageSize: ((__VLS_ctx.pager.per_page)),
                        layout: ("total, prev, pager, next"),
                        total: ((__VLS_ctx.interactionTotalItems)),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
                    let __VLS_53;
                    const __VLS_54 = {
                        onSizeChange: (__VLS_ctx.onSizeChange)
                    };
                    const __VLS_55 = {
                        onCurrentChange: (__VLS_ctx.onPageChange)
                    };
                    let __VLS_50;
                    let __VLS_51;
                    var __VLS_52;
                }
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("empty-state") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (__VLS_ctx.showListType === 'retweet' ? '暂无转发数据' : '暂无评论数据');
            }
        }
    }
}
if (__VLS_ctx.modalVisible && __VLS_ctx.currentPost) {
    // @ts-ignore
    /** @type { [typeof DetectionModal, ] } */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(DetectionModal, new DetectionModal({
        ...{ 'onDetectionComplete': {} },
        visible: ((__VLS_ctx.modalVisible)),
        post: ((__VLS_ctx.currentPost)),
    }));
    const __VLS_57 = __VLS_56({
        ...{ 'onDetectionComplete': {} },
        visible: ((__VLS_ctx.modalVisible)),
        post: ((__VLS_ctx.currentPost)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    let __VLS_61;
    const __VLS_62 = {
        onDetectionComplete: (__VLS_ctx.handleDetection)
    };
    let __VLS_58;
    let __VLS_59;
    var __VLS_60;
}
['weibo-list-container', 'empty-state-blogs', 'weibo-list', 'weibo-card', 'card-header', 'content', 'article-link', 'operation-pannel', 'detection-entry', 'card-meta', 'meta-item', 'meta-item', 'meta-item', 'meta-item', 'stance-tag', 'meta-item', 'stance-tag', 'card-meta', 'meta-item', 'tags-container', 'violation-tag', 'card-stats', 'stat', 'active', 'stat', 'active', 'stat', 'active', 'interaction-list', 'interaction-item', 'username', 'time', 'pagination', 'empty-state', 'retweet-list', 'retweet-item', 'user-info', 'username', 'time', 'content', 'meta', 'likes', 'source', 'pagination', 'empty-state',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DetectionModal: DetectionModal,
            getStanceType: getStanceType,
            getSentimentType: getSentimentType,
            modalVisible: modalVisible,
            currentPost: currentPost,
            openDetectionModal: openDetectionModal,
            handleDetection: handleDetection,
            goUser: goUser,
            pager: pager,
            showListType: showListType,
            showInteractionPostID: showInteractionPostID,
            interactionList: interactionList,
            interactionTotalPages: interactionTotalPages,
            interactionTotalItems: interactionTotalItems,
            toggleList: toggleList,
            onPageChange: onPageChange,
            onSizeChange: onSizeChange,
            formatTime: formatTime,
            formatCount: formatCount,
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
});
; /* PartiallyEnd: #4569/main.vue */
