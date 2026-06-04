import { ref, defineProps } from 'vue';
import { ElProgress, ElButton } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
const props = defineProps();
const loadingAll = ref(false);
const loading = ref(false);
const currentStepKey = ref(null);
// 进度与计数
const progress = ref({ blogs: 0, likes: 0, forwards: 0, comments: 0 });
const stepCounts = ref({
    likes: { current: 0, total: 0 },
    forwards: { current: 0, total: 0 },
    comments: { current: 0, total: 0 }
});
const steps = [
    { key: 'blogs', label: '检查新博文', fn: crawlBlogs },
    { key: 'likes', label: '爬取点赞关系', fn: crawlLikes },
    { key: 'forwards', label: '爬取转发关系', fn: crawlForwards },
    { key: 'comments', label: '爬取评论关系', fn: crawlComments }
];
function status(key) {
    const pct = progress.value[key];
    // 完成时显示 success，当前进行中显示 ''，其他显示 warning
    if (pct >= 100)
        return 'success';
    if (currentStepKey.value === key)
        return '';
    return 'warning';
}
function getProgress(key) {
    // 向上取整，并保证在 0 到 100 范围内
    const pct = Math.ceil(progress.value[key]);
    return Math.min(Math.max(pct, 0), 100);
}
// 全部爬取
async function startCrawlingAll() {
    loadingAll.value = true;
    for (let i = 0; i < steps.length; i++) {
        currentStepKey.value = steps[i].key;
        await steps[i].fn();
    }
    loadingAll.value = false;
    currentStepKey.value = null;
    props.closeWblogsCrawler();
}
// 单独爬取
async function runSingle(key) {
    loading.value = true;
    currentStepKey.value = key;
    const step = steps.find(s => s.key === key);
    await step.fn();
    loading.value = false;
    currentStepKey.value = null;
}
// 博文假进度
let blogTimer;
async function crawlBlogs() {
    progress.value.blogs = 0;
    blogTimer = window.setInterval(() => {
        const inc = progress.value.blogs < 90 ? Math.random() * 5 : Math.random() * 2;
        progress.value.blogs = Math.min(progress.value.blogs + inc, 98);
    }, 800);
    await postStream(`/api/crawling/blogs/${props.userId}`);
    clearInterval(blogTimer);
    progress.value.blogs = 100;
    await props.fetchBlogs();
}
// 点赞/转发/评论
async function crawlLikes() {
    initStep('likes');
    await postStream(`/api/crawling/likes/${props.userId}`);
}
async function crawlForwards() {
    initStep('forwards');
    await postStream(`/api/crawling/forwards/${props.userId}`);
}
async function crawlComments() {
    initStep('comments');
    await postStream(`/api/crawling/comments/${props.userId}`);
}
function initStep(key) {
    progress.value[key] = 0;
    stepCounts.value[key] = { current: 0, total: 0 };
}
// 通用流式请求
async function postStream(url) {
    const token = localStorage.getItem('user-token');
    const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config: props.config, crawlingConfig: props.crawlingConfig })
    });
    if (!resp.ok)
        throw new Error(`请求失败：${resp.status}`);
    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\n/);
        buffer = lines.pop() || '';
        lines.forEach(line => {
            if (!line.trim())
                return;
            try {
                const log = JSON.parse(line);
                const { type, current_index, total_count } = log;
                // 更新计数与进度
                stepCounts.value[type === 'like' ? 'likes' : type === 'forward' ? 'forwards' : 'comments'].current = current_index;
                stepCounts.value[type === 'like' ? 'likes' : type === 'forward' ? 'forwards' : 'comments'].total = total_count;
                const pct = (current_index / total_count) * 100;
                progress.value[type === 'like' ? 'likes' : type === 'forward' ? 'forwards' : 'comments'] = pct;
            }
            catch { /* ignore */ }
        });
    }
    if (buffer.trim())
        console.log('[剩余日志]', buffer.trim());
    await props.fetchBlogs();
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("crawl-progress-overlay") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("main-box") },
});
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: ("close-btn") },
    icon: ((__VLS_ctx.Close)),
    circle: (true),
    disabled: ((__VLS_ctx.loading || __VLS_ctx.loadingAll)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: ("close-btn") },
    icon: ((__VLS_ctx.Close)),
    circle: (true),
    disabled: ((__VLS_ctx.loading || __VLS_ctx.loadingAll)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.closeWblogsCrawler)
};
let __VLS_3;
let __VLS_4;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("crawl-progress-box title-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: ("title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("description") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(props.userId);
for (const [step, index] of __VLS_getVForSourceType((__VLS_ctx.steps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("crawl-progress-box step-box") },
        key: ((step.key)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("step-label") },
    });
    (step.label);
    if (step.key !== 'blogs') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("step-info") },
        });
        (__VLS_ctx.stepCounts[step.key].current);
        (__VLS_ctx.stepCounts[step.key].total);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-container") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("progress-text") },
    });
    (__VLS_ctx.getProgress(step.key) | 0);
    const __VLS_8 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        percentage: ((__VLS_ctx.getProgress(step.key))),
        status: ((__VLS_ctx.status(step.key))),
        showText: ((false)),
        indeterminate: ((__VLS_ctx.currentStepKey === step.key)),
        duration: ((5)),
    }));
    const __VLS_10 = __VLS_9({
        percentage: ((__VLS_ctx.getProgress(step.key))),
        status: ((__VLS_ctx.status(step.key))),
        showText: ((false)),
        indeterminate: ((__VLS_ctx.currentStepKey === step.key)),
        duration: ((5)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    const __VLS_14 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
        ...{ 'onClick': {} },
        ...{ class: ("step-button") },
        type: ("text"),
        size: ("small"),
        loading: (((__VLS_ctx.loadingAll || __VLS_ctx.loading) && __VLS_ctx.currentStepKey === step.key)),
        disabled: ((__VLS_ctx.loading || __VLS_ctx.loadingAll)),
    }));
    const __VLS_16 = __VLS_15({
        ...{ 'onClick': {} },
        ...{ class: ("step-button") },
        type: ("text"),
        size: ("small"),
        loading: (((__VLS_ctx.loadingAll || __VLS_ctx.loading) && __VLS_ctx.currentStepKey === step.key)),
        disabled: ((__VLS_ctx.loading || __VLS_ctx.loadingAll)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_20;
    const __VLS_21 = {
        onClick: (...[$event]) => {
            __VLS_ctx.runSingle(step.key);
        }
    };
    let __VLS_17;
    let __VLS_18;
    __VLS_19.slots.default;
    var __VLS_19;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("crawl-progress-box operation-box") },
});
const __VLS_22 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.loadingAll)),
    disabled: ((__VLS_ctx.loadingAll || __VLS_ctx.loading)),
}));
const __VLS_24 = __VLS_23({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.loadingAll)),
    disabled: ((__VLS_ctx.loadingAll || __VLS_ctx.loading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_28;
const __VLS_29 = {
    onClick: (__VLS_ctx.startCrawlingAll)
};
let __VLS_25;
let __VLS_26;
(__VLS_ctx.loadingAll ? '爬取中...' : '全部爬取');
__VLS_27.slots.default;
var __VLS_27;
['crawl-progress-overlay', 'main-box', 'close-btn', 'crawl-progress-box', 'title-box', 'title', 'description', 'crawl-progress-box', 'step-box', 'step-label', 'step-info', 'progress-container', 'progress-text', 'step-button', 'crawl-progress-box', 'operation-box',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ElProgress: ElProgress,
            ElButton: ElButton,
            Close: Close,
            loadingAll: loadingAll,
            loading: loading,
            currentStepKey: currentStepKey,
            stepCounts: stepCounts,
            steps: steps,
            status: status,
            getProgress: getProgress,
            startCrawlingAll: startCrawlingAll,
            runSingle: runSingle,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
