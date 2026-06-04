import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from '@/api/axios';
import DetectionResultViewer from './DetectResultViewer.vue';
import ViolationResultViewer from './ViolationOutput.vue';
const modalVisible = ref(true);
const props = defineProps();
const emits = defineEmits();
// 输出结果
const output = ref({});
// 单独 loading 状态
const detecting = ref({
    all: false,
    stance: false,
    sentiment: false,
    violations: false
});
// 当前激活操作（用于高亮）
const currentAction = ref(null);
const isAnyDetecting = computed(() => detecting.value.all || detecting.value.stance || detecting.value.sentiment || detecting.value.violations);
function actionLabel(k) {
    if (!k)
        return '';
    if (k === 'all')
        return '一键检测（全部）';
    if (k === 'stance')
        return '立场检测';
    if (k === 'sentiment')
        return '情感检测';
    if (k === 'violations')
        return '风险内容检测';
    return '';
}
// 单次检测的底层函数（类型安全简化）
async function doDetect(type) {
    // set state
    detecting.value[type] = true;
    currentAction.value = type;
    try {
        const res = await axios.post(`/weibo/blog/detect/${type}`, { postId: props.post.id }, { timeout: 60000 });
        output.value[type] = res.data;
        ElMessage.success(`${actionLabel(type)} 完成`);
        emits('detection-complete', { postId: props.post.id, type, result: res.data });
        return res.data;
    }
    catch (err) {
        ElMessage.error(`${actionLabel(type)} 失败，请重试`);
        throw err;
    }
    finally {
        detecting.value[type] = false;
        // 不立即清空 currentAction，让 status-line 在视觉上更稳定；若无任何 detecting 则清空
        if (!isAnyDetecting.value)
            currentAction.value = null;
    }
}
// 对外单独检测（保持 API）
async function runDetection(type) {
    // 防止重复点
    if (detecting.value[type])
        return;
    await doDetect(type);
}
// 一键检测：顺序执行三个检测，并用 detecting.all 表示全局 running
async function runAllDetections() {
    if (detecting.value.all)
        return;
    detecting.value.all = true;
    currentAction.value = 'all';
    try {
        // 顺序执行：也可以改为并行执行（Promise.all），但顺序更容易追踪资源/日志
        await doDetect('stance');
        await doDetect('sentiment');
        await doDetect('violations');
        emits('detection-complete', { postId: props.post.id, type: 'all', result: output.value });
        ElMessage.success('一键检测全部完成');
    }
    catch (err) {
        // 上面 doDetect 内部已弹出错误消息
    }
    finally {
        detecting.value.all = false;
        if (!isAnyDetecting.value)
            currentAction.value = null;
    }
}
async function fetchDetectResult() {
    try {
        const response = await axios.post(`/weibo/blog/detect/result`, { postId: props.post.id });
        output.value = response.data;
    }
    catch (err) {
        // 不强制报错，先忽略
    }
}
onMounted(() => {
    fetchDetectResult();
});
function onClose() {
    emits('update:visible', false);
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['action-btn',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.modalVisible)),
    title: ("检测用户博客"),
    width: ("960px"),
    top: (('80px')),
    closeOnClickModal: ((false)),
    showClose: ((false)),
    closeOnPressEscape: ((false)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.modalVisible)),
    title: ("检测用户博客"),
    width: ("960px"),
    top: (('80px')),
    closeOnClickModal: ((false)),
    showClose: ((false)),
    closeOnPressEscape: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
let __VLS_7;
const __VLS_8 = {
    onClose: (__VLS_ctx.onClose)
};
let __VLS_3;
let __VLS_4;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("original-post") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: ("content") },
});
(__VLS_ctx.post.content);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("actions") },
});
const __VLS_9 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'all' })) },
    loading: ((__VLS_ctx.detecting.all)),
    disabled: ((__VLS_ctx.detecting.all)),
}));
const __VLS_11 = __VLS_10({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'all' })) },
    loading: ((__VLS_ctx.detecting.all)),
    disabled: ((__VLS_ctx.detecting.all)),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_15;
const __VLS_16 = {
    onClick: (__VLS_ctx.runAllDetections)
};
let __VLS_12;
let __VLS_13;
if (__VLS_ctx.detecting.all) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("el-icon-loading") },
        ...{ style: ({}) },
    });
}
__VLS_14.slots.default;
var __VLS_14;
const __VLS_17 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'stance' })) },
    loading: ((__VLS_ctx.detecting.stance)),
    disabled: ((__VLS_ctx.detecting.stance)),
}));
const __VLS_19 = __VLS_18({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'stance' })) },
    loading: ((__VLS_ctx.detecting.stance)),
    disabled: ((__VLS_ctx.detecting.stance)),
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
let __VLS_23;
const __VLS_24 = {
    onClick: (() => __VLS_ctx.runDetection('stance'))
};
let __VLS_20;
let __VLS_21;
if (__VLS_ctx.detecting.stance) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("el-icon-loading") },
        ...{ style: ({}) },
    });
}
__VLS_22.slots.default;
var __VLS_22;
const __VLS_25 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'sentiment' })) },
    loading: ((__VLS_ctx.detecting.sentiment)),
    disabled: ((__VLS_ctx.detecting.sentiment)),
}));
const __VLS_27 = __VLS_26({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'sentiment' })) },
    loading: ((__VLS_ctx.detecting.sentiment)),
    disabled: ((__VLS_ctx.detecting.sentiment)),
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_31;
const __VLS_32 = {
    onClick: (() => __VLS_ctx.runDetection('sentiment'))
};
let __VLS_28;
let __VLS_29;
if (__VLS_ctx.detecting.sentiment) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("el-icon-loading") },
        ...{ style: ({}) },
    });
}
__VLS_30.slots.default;
var __VLS_30;
const __VLS_33 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'violations' })) },
    loading: ((__VLS_ctx.detecting.violations)),
    disabled: ((__VLS_ctx.detecting.violations)),
}));
const __VLS_35 = __VLS_34({
    ...{ 'onClick': {} },
    ...{ class: ("action-btn") },
    ...{ class: (({ active: __VLS_ctx.currentAction === 'violations' })) },
    loading: ((__VLS_ctx.detecting.violations)),
    disabled: ((__VLS_ctx.detecting.violations)),
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_39;
const __VLS_40 = {
    onClick: (() => __VLS_ctx.runDetection('violations'))
};
let __VLS_36;
let __VLS_37;
if (__VLS_ctx.detecting.violations) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("el-icon-loading") },
        ...{ style: ({}) },
    });
}
__VLS_38.slots.default;
var __VLS_38;
if (__VLS_ctx.currentAction && (__VLS_ctx.detecting.all || __VLS_ctx.detecting.stance || __VLS_ctx.detecting.sentiment || __VLS_ctx.detecting.violations)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("status-line") },
    });
    const __VLS_41 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
        type: ("info"),
        plain: (true),
    }));
    const __VLS_43 = __VLS_42({
        type: ("info"),
        plain: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    (__VLS_ctx.actionLabel(__VLS_ctx.currentAction));
    __VLS_46.slots.default;
    var __VLS_46;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("results") },
});
if (__VLS_ctx.output.stance != null) {
    // @ts-ignore
    /** @type { [typeof DetectionResultViewer, ] } */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(DetectionResultViewer, new DetectionResultViewer({
        title: (('用户立场检测结果')),
        results: ((__VLS_ctx.output.stance)),
    }));
    const __VLS_48 = __VLS_47({
        title: (('用户立场检测结果')),
        results: ((__VLS_ctx.output.stance)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
}
if (__VLS_ctx.output.sentiment != null) {
    // @ts-ignore
    /** @type { [typeof DetectionResultViewer, ] } */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(DetectionResultViewer, new DetectionResultViewer({
        title: (('用户情感识别结果')),
        results: ((__VLS_ctx.output.sentiment)),
    }));
    const __VLS_53 = __VLS_52({
        title: (('用户情感识别结果')),
        results: ((__VLS_ctx.output.sentiment)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
}
if (__VLS_ctx.output.violations != null) {
    // @ts-ignore
    /** @type { [typeof ViolationResultViewer, ] } */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(ViolationResultViewer, new ViolationResultViewer({
        results: ((__VLS_ctx.output.violations)),
    }));
    const __VLS_58 = __VLS_57({
        results: ((__VLS_ctx.output.violations)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    slot: ("footer"),
    ...{ class: ("dialog-footer") },
});
const __VLS_62 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
    ...{ 'onClick': {} },
    disabled: ((__VLS_ctx.isAnyDetecting)),
}));
const __VLS_64 = __VLS_63({
    ...{ 'onClick': {} },
    disabled: ((__VLS_ctx.isAnyDetecting)),
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
let __VLS_68;
const __VLS_69 = {
    onClick: (__VLS_ctx.onClose)
};
let __VLS_65;
let __VLS_66;
__VLS_67.slots.default;
var __VLS_67;
const __VLS_70 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    ...{ 'onClick': {} },
    type: ("primary"),
    disabled: ((__VLS_ctx.isAnyDetecting)),
}));
const __VLS_72 = __VLS_71({
    ...{ 'onClick': {} },
    type: ("primary"),
    disabled: ((__VLS_ctx.isAnyDetecting)),
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
let __VLS_76;
const __VLS_77 = {
    onClick: (__VLS_ctx.onClose)
};
let __VLS_73;
let __VLS_74;
__VLS_75.slots.default;
var __VLS_75;
__VLS_5.slots.default;
var __VLS_5;
['original-post', 'content', 'actions', 'action-btn', 'active', 'el-icon-loading', 'action-btn', 'active', 'el-icon-loading', 'action-btn', 'active', 'el-icon-loading', 'action-btn', 'active', 'el-icon-loading', 'status-line', 'results', 'dialog-footer',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DetectionResultViewer: DetectionResultViewer,
            ViolationResultViewer: ViolationResultViewer,
            modalVisible: modalVisible,
            output: output,
            detecting: detecting,
            currentAction: currentAction,
            isAnyDetecting: isAnyDetecting,
            actionLabel: actionLabel,
            runDetection: runDetection,
            runAllDetections: runAllDetections,
            onClose: onClose,
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
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
