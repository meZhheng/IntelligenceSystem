import { onMounted, ref } from 'vue';
import axios from '@/api/axios';
import { useRoute } from 'vue-router';
const route = useRoute();
const article_id = route.params.article_id;
const accountConfig = ref(route.query.config
    ? JSON.parse(decodeURIComponent(route.query.config))
    : { token: '', fingerprint: '', cookie: '' });
const htmlContent = ref('');
const state = ref('loading');
const errorMessage = ref('');
const loadingMessage = ref('正在加载文章内容…');
// 通用的内容获取逻辑
async function loadContent() {
    state.value = 'loading';
    loadingMessage.value = '正在加载文章内容…';
    errorMessage.value = '';
    try {
        const resp = await axios.get(`/wechat/articles/${article_id}/content`, { responseType: 'text', timeout: 60000 });
        htmlContent.value = resp.data;
        state.value = 'success';
    }
    catch (err) {
        handleError(err);
    }
}
const isRefetching = ref(false);
async function handleRefetch() {
    if (!confirm('确定要强制重新从公众号抓取吗？这通常用于修复正文显示异常。'))
        return;
    isRefetching.value = true; // 开始独立 loading
    loadingMessage.value = '正在重新抓取正文，请稍候...';
    try {
        const resp = await axios.post(`/wechat/articles/${article_id}/refetch_content`, {
            token: accountConfig.value.token,
            fingerprint: accountConfig.value.fingerprint,
            cookie: accountConfig.value.cookie
        }, { timeout: 300000 });
        if (resp.data.status === 'success') {
            await loadContent();
        }
    }
    catch (err) {
        handleError(err);
    }
    finally {
        isRefetching.value = false; // 结束
    }
}
function handleError(err) {
    console.error(err);
    state.value = 'error';
    const status = err?.response?.status;
    if (status === 404) {
        errorMessage.value = '文章内容不存在或已被删除。';
    }
    else if (status === 403) {
        errorMessage.value = '你没有权限查看该文章内容。';
    }
    else if (err.code === 'ECONNABORTED') {
        errorMessage.value = '请求超时，服务器抓取时间较长，请稍后刷新重试。';
    }
    else {
        errorMessage.value = err.message || '网络异常或服务器错误，请稍后再试。';
    }
}
function goOriginal() {
    window.open(`https://mp.weixin.qq.com/s/${article_id}`, '_blank');
}
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
onMounted(loadContent); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['error-actions', 'error-actions', 'floating-toolbar', 'tool-btn', 'tool-btn', 'tool-btn', 'floating-toolbar', 'tool-btn',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("page-wrapper") },
});
if (__VLS_ctx.state === 'loading') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("loading") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("spinner") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("loading-text") },
    });
    (__VLS_ctx.loadingMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("skeleton") },
    });
    for (const [i] of __VLS_getVForSourceType((6))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((i)),
            ...{ class: ("skeleton-line") },
        });
    }
}
else if (__VLS_ctx.state === 'success') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content") },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.htmlContent) }, null, null);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error-card") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error-icon") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("error-message") },
    });
    (__VLS_ctx.errorMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error-actions") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadContent) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleRefetch) },
        ...{ class: ("warning") },
        disabled: ((__VLS_ctx.isRefetching)),
    });
    if (__VLS_ctx.isRefetching) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("mini-spinner") },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.isRefetching ? '同步中...' : '重新从公众号获取');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goOriginal) },
        ...{ class: ("secondary") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("hint-text") },
    });
}
if (__VLS_ctx.state === 'success') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("floating-toolbar") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleRefetch) },
        ...{ class: ("tool-btn") },
        title: ("重新获取正文"),
        disabled: ((__VLS_ctx.isRefetching)),
    });
    if (!__VLS_ctx.isRefetching) {
        const __VLS_0 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            size: ((24)),
        }));
        const __VLS_2 = __VLS_1({
            size: ((24)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        const __VLS_6 = {}.Refresh;
        /** @type { [typeof __VLS_components.Refresh, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
        const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
        __VLS_5.slots.default;
        var __VLS_5;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("tiny-spinner") },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.scrollToTop) },
        ...{ class: ("tool-btn") },
        title: ("返回顶部"),
    });
    const __VLS_12 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: ((24)),
    }));
    const __VLS_14 = __VLS_13({
        size: ((24)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_18 = {}.Top;
    /** @type { [typeof __VLS_components.Top, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
    const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_17.slots.default;
    var __VLS_17;
}
['page-wrapper', 'loading', 'spinner', 'loading-text', 'skeleton', 'skeleton-line', 'content', 'error', 'error-card', 'error-icon', 'error-message', 'error-actions', 'warning', 'mini-spinner', 'secondary', 'hint-text', 'floating-toolbar', 'tool-btn', 'tiny-spinner', 'tool-btn',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            htmlContent: htmlContent,
            state: state,
            errorMessage: errorMessage,
            loadingMessage: loadingMessage,
            loadContent: loadContent,
            isRefetching: isRefetching,
            handleRefetch: handleRefetch,
            goOriginal: goOriginal,
            scrollToTop: scrollToTop,
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
