import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus';
import { Document, EditPen, Check, View, Edit, Warning, Pointer, Plus } from '@element-plus/icons-vue';
import axios from '@/api/axios';
// 响应式数据
const currentTitle = ref('');
const currentContent = ref('');
const checking = ref(false);
const viewMode = ref('edit'); // edit/preview
const activeHistory = ref(-1);
const historyList = ref([]);
const contentCheck = ref({ result: { mistakes: [] } });
const titleCheck = ref({ result: { mistakes: [] } });
const activeSuggestion = ref(null);
const popoverStyle = ref({});
const showResult = ref(false);
// 计算属性
const contentLength = computed(() => currentContent.value.length);
const totalErrors = computed(() => titleCheck.value.sum + contentCheck.value.sum);
const resultSummary = computed(() => {
    if (totalErrors.value === 0)
        return '🎉 恭喜！未发现任何错误';
    return `共发现 ${totalErrors.value} 处问题（标题 ${titleCheck.value.sum} 处，正文 ${contentCheck.value.sum} 处）`;
});
// 高亮标题
const highlightedTitle = computed(() => {
    let title = currentTitle.value;
    const mistakes = titleCheck.value.result.mistakes || [];
    mistakes.slice().sort((a, b) => b.l - a.l).forEach(m => {
        const text = title.slice(m.l, m.r);
        title = insertHighlight(title, m.l, m.r, 'highlight_title');
    });
    return title;
});
// 高亮内容生成
const highlightedContent = computed(() => {
    let content = currentContent.value;
    contentCheck.value.result.mistakes
        .slice() // 创建副本避免排序影响原始数据
        .sort((a, b) => b.l - a.l) // 反向处理避免位置偏移
        .forEach(m => {
        const text = content.slice(m.l, m.r);
        const highlightClass = `highlight_content ${getErrorClass(m.infos[0])}`;
        content = insertHighlight(content, m.l, m.r, 'highlight_content');
    });
    return content;
});
// 错误类型样式
const getErrorClass = (info) => {
    if (info.type === 1)
        return 'critical';
    if (info.type === 2)
        return 'warning';
    return 'suggestion';
};
// 插入高亮标签
const insertHighlight = (str, start, end, className) => {
    return (str.slice(0, start) +
        `<span class="${className}" data-start="${start}">` +
        str.slice(start, end) +
        '</span>' +
        str.slice(end));
};
// 创建新文本
function createNew() {
    currentTitle.value = '';
    currentContent.value = '';
    titleCheck.value = { sum: 0, result: { mistakes: [] } };
    contentCheck.value = { sum: 0, result: { mistakes: [] } };
    viewMode.value = 'edit';
    showResult.value = false;
    activeHistory.value = -1;
    activeSuggestion.value = null;
}
// 开始校对
const startCheck = async () => {
    if (!currentTitle.value || !currentContent.value) {
        ElMessage.warning('请填写标题和内容');
        return;
    }
    checking.value = true;
    const loading = ElLoading.service({ fullscreen: true });
    try {
        // 模拟API请求
        const response = await axios.post('/wechat/proofread', {
            title: currentTitle.value,
            content: currentContent.value
        }, { timeout: 60000 });
        // 更新校验结果
        contentCheck.value = response.data.content_check;
        titleCheck.value = response.data.title_check;
        // 添加到历史记录
        storeHistory();
        ElMessage.success(`校对完成，发现${totalErrors.value}处问题`);
        viewMode.value = 'preview';
        showResult.value = true;
    }
    catch (error) {
        ElMessage.error('校验失败：' + error.message);
    }
    finally {
        loading.close();
        checking.value = false;
    }
};
// 点击高亮文本
function handleTextHover(e) {
    const target = e.target.closest('.highlight_content');
    if (!target) {
        activeSuggestion.value = null;
        return;
    }
    const startPos = parseInt(target.dataset.start);
    const mistake = contentCheck.value.result.mistakes.find(m => m.l <= startPos && m.r >= startPos);
    if (!mistake)
        return;
    const rect = target.getBoundingClientRect();
    popoverStyle.value = {
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`
    };
    activeSuggestion.value = {
        ...mistake.infos[0],
        category: mistake.infos[0].category,
        position: `${mistake.l}-${mistake.r}`
    };
}
function handleTitleHover(e) {
    const target = e.target.closest('.highlight_title');
    if (!target) {
        activeSuggestion.value = null;
        return;
    }
    const startPos = parseInt(target.dataset.start);
    const mistake = titleCheck.value.result.mistakes.find(m => m.l <= startPos && m.r >= startPos);
    if (!mistake)
        return;
    const rect = target.getBoundingClientRect();
    popoverStyle.value = {
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`
    };
    activeSuggestion.value = {
        ...mistake.infos[0],
        category: mistake.infos[0].category,
        position: `${mistake.l}-${mistake.r}`
    };
}
// 鼠标移出时隐藏弹窗
function clearSuggestion() {
    activeSuggestion.value = null;
}
// 加载历史记录
const loadHistory = (index) => {
    const history = historyList.value[index];
    currentTitle.value = history.title;
    currentContent.value = history.content;
    titleCheck.value = history.titleCheck;
    contentCheck.value = history.contentCheck;
    activeHistory.value = index;
    viewMode.value = 'preview';
    showResult.value = true;
};
const storeHistory = () => {
    const history = {
        title: currentTitle.value,
        content: currentContent.value,
        time: Date.now(),
        titleCheck: { ...titleCheck.value },
        contentCheck: { ...contentCheck.value },
    };
    historyList.value.unshift(history);
    localStorage.setItem('history', JSON.stringify(historyList.value));
};
// 切换视图模式
const toggleView = (mode) => {
    viewMode.value = mode;
    if (mode === 'preview') {
        nextTick(() => {
            const firstError = document.querySelector('.highlight_content');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
};
// 工具函数
const shortenText = (text, maxLength) => {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};
const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
// 初始化加载示例数据
onMounted(() => {
    historyList.value = localStorage.getItem('history') ? JSON.parse(localStorage.getItem('history')) : [];
});
function onHistoryContextMenu(index) {
    ElMessageBox.confirm('确定要删除这条历史记录吗？', '删除确认', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
    })
        .then(() => {
        historyList.value.splice(index, 1);
        localStorage.setItem('history', JSON.stringify(historyList.value));
        if (activeHistory.value === index) {
            activeHistory.value = -1;
            showResult.value = false;
        }
        else if (activeHistory.value > index) {
            activeHistory.value--;
        }
        ElMessage.success('删除成功');
    })
        .catch(() => {
        /* 取消不操作 */
    });
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['el-button', 'active', 'highlight_content', 'highlight_content', 'active', 'el-tag', 'el-icon', 'highlight_title', 'highlight_title', 'active',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("editor-container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("history-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("history-header") },
});
const __VLS_0 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_6 = {}.Document;
/** @type { [typeof __VLS_components.Document, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("create-new-btn") },
});
const __VLS_12 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ((__VLS_ctx.Plus)),
}));
const __VLS_14 = __VLS_13({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ((__VLS_ctx.Plus)),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_18;
const __VLS_19 = {
    onClick: (__VLS_ctx.createNew)
};
let __VLS_15;
let __VLS_16;
__VLS_17.slots.default;
var __VLS_17;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("history-list") },
});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.historyList))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.loadHistory(index);
            } },
        ...{ onContextmenu: (...[$event]) => {
                __VLS_ctx.onHistoryContextMenu(index);
            } },
        key: ((index)),
        ...{ class: ("history-item") },
        ...{ class: (({ 'active': __VLS_ctx.activeHistory === index })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("item-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
    });
    (__VLS_ctx.shortenText(item.title, 7));
    const __VLS_20 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        type: ((item.titleCheck.sum > 0 ? 'danger' : 'success')),
        size: ("small"),
    }));
    const __VLS_22 = __VLS_21({
        type: ((item.titleCheck.sum > 0 ? 'danger' : 'success')),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    (item.titleCheck.sum);
    __VLS_25.slots.default;
    var __VLS_25;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("item-info") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("time") },
    });
    (__VLS_ctx.formatTime(item.time));
    const __VLS_26 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
        type: ((item.contentCheck.sum > 0 ? 'warning' : 'success')),
        size: ("small"),
    }));
    const __VLS_28 = __VLS_27({
        type: ((item.contentCheck.sum > 0 ? 'warning' : 'success')),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    (item.contentCheck.sum);
    __VLS_31.slots.default;
    var __VLS_31;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("edit-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("input-section") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("title-input") },
});
if (__VLS_ctx.viewMode === 'edit') {
    const __VLS_32 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        modelValue: ((__VLS_ctx.currentTitle)),
        placeholder: ("请输入文章标题..."),
        maxlength: ("50"),
        showWordLimit: (true),
        clearable: (true),
        ...{ class: (({ 'error-border': __VLS_ctx.titleCheck.sum > 0 })) },
    }));
    const __VLS_34 = __VLS_33({
        modelValue: ((__VLS_ctx.currentTitle)),
        placeholder: ("请输入文章标题..."),
        maxlength: ("50"),
        showWordLimit: (true),
        clearable: (true),
        ...{ class: (({ 'error-border': __VLS_ctx.titleCheck.sum > 0 })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    {
        const { prefix: __VLS_thisSlot } = __VLS_37.slots;
        const __VLS_38 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({}));
        const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
        const __VLS_44 = {}.EditPen;
        /** @type { [typeof __VLS_components.EditPen, ] } */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
        const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_43.slots.default;
        var __VLS_43;
    }
    __VLS_37.slots.default;
    var __VLS_37;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMouseover: (__VLS_ctx.handleTitleHover) },
        ...{ onMouseleave: (__VLS_ctx.clearSuggestion) },
        ...{ class: ("title-preview") },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedTitle) }, null, null);
}
if (__VLS_ctx.viewMode === 'edit') {
    const __VLS_50 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.checking)),
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.checking)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_56;
    const __VLS_57 = {
        onClick: (__VLS_ctx.startCheck)
    };
    let __VLS_53;
    let __VLS_54;
    {
        const { icon: __VLS_thisSlot } = __VLS_55.slots;
        const __VLS_58 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({}));
        const __VLS_60 = __VLS_59({}, ...__VLS_functionalComponentArgsRest(__VLS_59));
        const __VLS_64 = {}.Check;
        /** @type { [typeof __VLS_components.Check, ] } */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
        const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_63.slots.default;
        var __VLS_63;
    }
    __VLS_55.slots.default;
    var __VLS_55;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("content-editor") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("editor-toolbar") },
});
const __VLS_70 = {}.ElButtonGroup;
/** @type { [typeof __VLS_components.ElButtonGroup, typeof __VLS_components.elButtonGroup, typeof __VLS_components.ElButtonGroup, typeof __VLS_components.elButtonGroup, ] } */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({}));
const __VLS_72 = __VLS_71({}, ...__VLS_functionalComponentArgsRest(__VLS_71));
const __VLS_76 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ 'onClick': {} },
    size: ("small"),
    ...{ class: (({ 'active': __VLS_ctx.viewMode === 'edit' })) },
}));
const __VLS_78 = __VLS_77({
    ...{ 'onClick': {} },
    size: ("small"),
    ...{ class: (({ 'active': __VLS_ctx.viewMode === 'edit' })) },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_82;
const __VLS_83 = {
    onClick: (...[$event]) => {
        __VLS_ctx.toggleView('edit');
    }
};
let __VLS_79;
let __VLS_80;
const __VLS_84 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const __VLS_90 = {}.Edit;
/** @type { [typeof __VLS_components.Edit, ] } */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({}));
const __VLS_92 = __VLS_91({}, ...__VLS_functionalComponentArgsRest(__VLS_91));
__VLS_89.slots.default;
var __VLS_89;
__VLS_81.slots.default;
var __VLS_81;
const __VLS_96 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onClick': {} },
    size: ("small"),
    ...{ class: (({ 'active': __VLS_ctx.viewMode === 'preview' })) },
}));
const __VLS_98 = __VLS_97({
    ...{ 'onClick': {} },
    size: ("small"),
    ...{ class: (({ 'active': __VLS_ctx.viewMode === 'preview' })) },
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_102;
const __VLS_103 = {
    onClick: (...[$event]) => {
        __VLS_ctx.toggleView('preview');
    }
};
let __VLS_99;
let __VLS_100;
const __VLS_104 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
const __VLS_110 = {}.View;
/** @type { [typeof __VLS_components.View, ] } */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({}));
const __VLS_112 = __VLS_111({}, ...__VLS_functionalComponentArgsRest(__VLS_111));
__VLS_109.slots.default;
var __VLS_109;
__VLS_101.slots.default;
var __VLS_101;
__VLS_75.slots.default;
var __VLS_75;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("word-count") },
});
(__VLS_ctx.contentLength);
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: ((__VLS_ctx.currentContent)),
    ...{ class: ("edit-area") },
    placeholder: ("请输入文章正文..."),
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.viewMode === 'edit') }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseover: (__VLS_ctx.handleTextHover) },
    ...{ onMouseleave: (__VLS_ctx.clearSuggestion) },
    ...{ class: ("preview-area") },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.viewMode === 'preview') }, null, null);
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedContent) }, null, null);
if (__VLS_ctx.activeSuggestion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("suggestion-popover") },
        ...{ style: ((__VLS_ctx.popoverStyle)) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("popover-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.activeSuggestion.category);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("popover-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("suggestion-item") },
    });
    const __VLS_116 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
    const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
    const __VLS_122 = {}.Pointer;
    /** @type { [typeof __VLS_components.Pointer, ] } */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({}));
    const __VLS_124 = __VLS_123({}, ...__VLS_functionalComponentArgsRest(__VLS_123));
    __VLS_121.slots.default;
    var __VLS_121;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.activeSuggestion.recommend || __VLS_ctx.activeSuggestion.desc1 || '未知错误');
}
if (__VLS_ctx.showResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-section") },
    });
    const __VLS_128 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        title: ((__VLS_ctx.resultSummary)),
        type: ((__VLS_ctx.totalErrors === 0 ? 'success' : 'warning')),
        showIcon: (true),
        closable: ((false)),
    }));
    const __VLS_130 = __VLS_129({
        title: ((__VLS_ctx.resultSummary)),
        type: ((__VLS_ctx.totalErrors === 0 ? 'success' : 'warning')),
        showIcon: (true),
        closable: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    if (__VLS_ctx.titleCheck.sum > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-block") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-header") },
        });
        const __VLS_134 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
            color: ("#F56C6C"),
        }));
        const __VLS_136 = __VLS_135({
            color: ("#F56C6C"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_135));
        const __VLS_140 = {}.Warning;
        /** @type { [typeof __VLS_components.Warning, ] } */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({}));
        const __VLS_142 = __VLS_141({}, ...__VLS_functionalComponentArgsRest(__VLS_141));
        __VLS_139.slots.default;
        var __VLS_139;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        (__VLS_ctx.titleCheck.sum);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("error-text") },
        });
        (__VLS_ctx.titleCheck.result.sentence);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("suggestions") },
        });
        for (const [mistake, idx] of __VLS_getVForSourceType((__VLS_ctx.titleCheck.result.mistakes))) {
            const __VLS_146 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
                key: ((idx)),
                type: ("danger"),
                effect: ("dark"),
            }));
            const __VLS_148 = __VLS_147({
                key: ((idx)),
                type: ("danger"),
                effect: ("dark"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_147));
            (mistake.infos[0].recommend || '需修改');
            __VLS_151.slots.default;
            var __VLS_151;
        }
    }
    if (__VLS_ctx.contentCheck.sum > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-block") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-header") },
        });
        const __VLS_152 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            color: ("#E6A23C"),
        }));
        const __VLS_154 = __VLS_153({
            color: ("#E6A23C"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        const __VLS_158 = {}.Warning;
        /** @type { [typeof __VLS_components.Warning, ] } */ ;
        // @ts-ignore
        const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({}));
        const __VLS_160 = __VLS_159({}, ...__VLS_functionalComponentArgsRest(__VLS_159));
        __VLS_157.slots.default;
        var __VLS_157;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        (__VLS_ctx.contentCheck.sum);
        for (const [mistake, index] of __VLS_getVForSourceType((__VLS_ctx.contentCheck.result.mistakes))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error-item") },
                key: ((index)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error-meta") },
            });
            const __VLS_164 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
                size: ("small"),
            }));
            const __VLS_166 = __VLS_165({
                size: ("small"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_165));
            (mistake.l);
            (mistake.r);
            __VLS_169.slots.default;
            var __VLS_169;
            const __VLS_170 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
                size: ("small"),
                type: ("warning"),
            }));
            const __VLS_172 = __VLS_171({
                size: ("small"),
                type: ("warning"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_171));
            (mistake.infos[0].category);
            __VLS_175.slots.default;
            var __VLS_175;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("suggestions") },
            });
            for (const [info, idx] of __VLS_getVForSourceType((mistake.infos))) {
                const __VLS_176 = {}.ElTag;
                /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
                // @ts-ignore
                const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
                    key: ((idx)),
                    type: ((info.type === 1 ? 'danger' : 'warning')),
                }));
                const __VLS_178 = __VLS_177({
                    key: ((idx)),
                    type: ((info.type === 1 ? 'danger' : 'warning')),
                }, ...__VLS_functionalComponentArgsRest(__VLS_177));
                (info.recommend ? '修改建议：' : '错误类型：');
                (info.recommend || info.desc1 || '未知');
                __VLS_181.slots.default;
                var __VLS_181;
            }
        }
    }
}
['editor-container', 'history-panel', 'history-header', 'create-new-btn', 'history-list', 'history-item', 'active', 'item-header', 'title', 'item-info', 'time', 'edit-panel', 'input-section', 'title-input', 'error-border', 'title-preview', 'content-editor', 'editor-toolbar', 'active', 'active', 'word-count', 'edit-area', 'preview-area', 'suggestion-popover', 'popover-header', 'popover-content', 'suggestion-item', 'result-section', 'error-block', 'error-header', 'error-item', 'error-text', 'suggestions', 'error-block', 'error-header', 'error-item', 'error-meta', 'suggestions',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Document: Document,
            EditPen: EditPen,
            Check: Check,
            View: View,
            Edit: Edit,
            Warning: Warning,
            Pointer: Pointer,
            Plus: Plus,
            currentTitle: currentTitle,
            currentContent: currentContent,
            checking: checking,
            viewMode: viewMode,
            activeHistory: activeHistory,
            historyList: historyList,
            contentCheck: contentCheck,
            titleCheck: titleCheck,
            activeSuggestion: activeSuggestion,
            popoverStyle: popoverStyle,
            showResult: showResult,
            contentLength: contentLength,
            totalErrors: totalErrors,
            resultSummary: resultSummary,
            highlightedTitle: highlightedTitle,
            highlightedContent: highlightedContent,
            createNew: createNew,
            startCheck: startCheck,
            handleTextHover: handleTextHover,
            handleTitleHover: handleTitleHover,
            clearSuggestion: clearSuggestion,
            loadHistory: loadHistory,
            toggleView: toggleView,
            shortenText: shortenText,
            formatTime: formatTime,
            onHistoryContextMenu: onHistoryContextMenu,
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
