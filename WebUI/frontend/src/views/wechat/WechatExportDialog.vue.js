import { ref, computed } from 'vue';
import { CircleCheckFilled, Document, Files, Memo, Loading, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
const props = defineProps();
const emit = defineEmits(['update:modelValue', 'success']);
const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});
const exportMode = ref('all');
const fileFormat = ref('pdf');
const includeArticleContent = ref(false);
const isExporting = ref(false);
const exportTipText = computed(() => {
    return includeArticleContent.value
        ? '报告将包含文章标题、作者、校对状态、详细错误列表及公众号文章原文。'
        : '报告将包含文章标题、作者、校对状态及详细错误列表。';
});
// 格式定义
const formats = [
    { label: 'PDF文档', value: 'pdf', icon: Document, color: '#F56C6C' },
    { label: 'Excel报表', value: 'xlsx', icon: Files, color: '#67C23A' },
    { label: 'JSON数据', value: 'json', icon: Memo, color: '#E6A23C' },
    { label: 'TXT文本', value: 'txt', icon: Document, color: '#909399' },
];
const handleExport = async () => {
    // 校验
    if (exportMode.value === 'selected' && props.selectedIds.length === 0) {
        return ElMessage.warning('请先在列表中勾选要导出的文章');
    }
    isExporting.value = true;
    try {
        const auth_token = localStorage.getItem('user-token');
        // 构造请求参数
        const payload = {
            mode: exportMode.value,
            format: fileFormat.value,
            ids: props.selectedIds,
            filters: props.filters,
            include_article_content: includeArticleContent.value
        };
        // --- 预留的后端接口调用 ---
        const response = await fetch('/api/wechat/proofread/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth_token}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok)
            throw new Error('导出失败');
        // 处理二进制流下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // 文件命名逻辑
        const dateStr = new Date().toISOString().split('T')[0];
        const contentSuffix = includeArticleContent.value ? '_含原文' : '';
        link.setAttribute('download', `微信校对报告${contentSuffix}_${dateStr}.${fileFormat.value}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        ElMessage.success('导出成功');
        emit('success');
        visible.value = false;
    }
    catch (err) {
        console.error(err);
        ElMessage.error('导出过程中发生错误');
    }
    finally {
        isExporting.value = false;
    }
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['config-item', 'active', 'name',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: ((__VLS_ctx.visible)),
    title: ("批量导出检测报告"),
    width: ("580px"),
    closeOnClickModal: ((!__VLS_ctx.isExporting)),
    appendToBody: (true),
    destroyOnClose: (true),
    ...{ class: ("export-dialog") },
}));
const __VLS_2 = __VLS_1({
    modelValue: ((__VLS_ctx.visible)),
    title: ("批量导出检测报告"),
    width: ("580px"),
    closeOnClickModal: ((!__VLS_ctx.isExporting)),
    appendToBody: (true),
    destroyOnClose: (true),
    ...{ class: ("export-dialog") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
{
    const { header: __VLS_thisSlot } = __VLS_5.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("custom-dialog-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-left") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title-text") },
    });
}
if (!__VLS_ctx.isExporting) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("export-config") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("section-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mode-options") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((!__VLS_ctx.isExporting)))
                    return;
                __VLS_ctx.exportMode = 'all';
            } },
        ...{ class: ("option-card") },
        ...{ class: (({ active: __VLS_ctx.exportMode === 'all' })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("main-text") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sub-text") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.totalFiltered);
    if (__VLS_ctx.exportMode === 'all') {
        const __VLS_7 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
            ...{ class: ("check-icon") },
        }));
        const __VLS_9 = __VLS_8({
            ...{ class: ("check-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_8));
        const __VLS_13 = {}.CircleCheckFilled;
        /** @type { [typeof __VLS_components.CircleCheckFilled, ] } */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({}));
        const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
        __VLS_12.slots.default;
        var __VLS_12;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((!__VLS_ctx.isExporting)))
                    return;
                __VLS_ctx.exportMode = 'selected';
            } },
        ...{ class: ("option-card") },
        ...{ class: (({ active: __VLS_ctx.exportMode === 'selected' })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("main-text") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sub-text") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedIds.length);
    if (__VLS_ctx.exportMode === 'selected') {
        const __VLS_19 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
            ...{ class: ("check-icon") },
        }));
        const __VLS_21 = __VLS_20({
            ...{ class: ("check-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        const __VLS_25 = {}.CircleCheckFilled;
        /** @type { [typeof __VLS_components.CircleCheckFilled, ] } */ ;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({}));
        const __VLS_27 = __VLS_26({}, ...__VLS_functionalComponentArgsRest(__VLS_26));
        __VLS_24.slots.default;
        var __VLS_24;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("section-title") },
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("format-grid") },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.formats))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!((!__VLS_ctx.isExporting)))
                        return;
                    __VLS_ctx.fileFormat = item.value;
                } },
            key: ((item.value)),
            ...{ class: ("format-item") },
            ...{ class: (({ active: __VLS_ctx.fileFormat === item.value })) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("format-icon") },
            ...{ style: (({ color: item.color })) },
        });
        const __VLS_31 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            size: ((32)),
        }));
        const __VLS_33 = __VLS_32({
            size: ((32)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        const __VLS_37 = ((item.icon));
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({}));
        const __VLS_39 = __VLS_38({}, ...__VLS_functionalComponentArgsRest(__VLS_38));
        __VLS_36.slots.default;
        var __VLS_36;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("format-info") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("name") },
        });
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("ext") },
        });
        (item.value);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("section-title") },
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("config-section") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("config-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    const __VLS_43 = {}.ElSwitch;
    /** @type { [typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ] } */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        modelValue: ((__VLS_ctx.includeArticleContent)),
        activeText: ("是"),
        inactiveText: ("否"),
    }));
    const __VLS_45 = __VLS_44({
        modelValue: ((__VLS_ctx.includeArticleContent)),
        activeText: ("是"),
        inactiveText: ("否"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("export-tips") },
    });
    const __VLS_49 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({}));
    const __VLS_51 = __VLS_50({}, ...__VLS_functionalComponentArgsRest(__VLS_50));
    const __VLS_55 = {}.InfoFilled;
    /** @type { [typeof __VLS_components.InfoFilled, ] } */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({}));
    const __VLS_57 = __VLS_56({}, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_54.slots.default;
    var __VLS_54;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.exportTipText);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("exporting-status") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("loading-wrapper") },
    });
    const __VLS_61 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
        ...{ class: ("is-loading") },
        size: ((40)),
        color: ("#409eff"),
    }));
    const __VLS_63 = __VLS_62({
        ...{ class: ("is-loading") },
        size: ((40)),
        color: ("#409eff"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    const __VLS_67 = {}.Loading;
    /** @type { [typeof __VLS_components.Loading, ] } */ ;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({}));
    const __VLS_69 = __VLS_68({}, ...__VLS_functionalComponentArgsRest(__VLS_68));
    __VLS_66.slots.default;
    var __VLS_66;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.fileFormat.toUpperCase());
}
{
    const { footer: __VLS_thisSlot } = __VLS_5.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    const __VLS_73 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.isExporting)),
    }));
    const __VLS_75 = __VLS_74({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.isExporting)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_74));
    let __VLS_79;
    const __VLS_80 = {
        onClick: (...[$event]) => {
            __VLS_ctx.visible = false;
        }
    };
    let __VLS_76;
    let __VLS_77;
    __VLS_78.slots.default;
    var __VLS_78;
    const __VLS_81 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.isExporting)),
    }));
    const __VLS_83 = __VLS_82({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.isExporting)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
    let __VLS_87;
    const __VLS_88 = {
        onClick: (__VLS_ctx.handleExport)
    };
    let __VLS_84;
    let __VLS_85;
    (__VLS_ctx.isExporting ? '生成中...' : '开始导出');
    __VLS_86.slots.default;
    var __VLS_86;
}
__VLS_5.slots.default;
var __VLS_5;
['export-dialog', 'custom-dialog-header', 'header-left', 'title-text', 'export-config', 'section-title', 'mode-options', 'option-card', 'active', 'card-content', 'main-text', 'sub-text', 'check-icon', 'option-card', 'active', 'card-content', 'main-text', 'sub-text', 'check-icon', 'section-title', 'format-grid', 'format-item', 'active', 'format-icon', 'format-info', 'name', 'ext', 'section-title', 'config-section', 'config-item', 'label', 'export-tips', 'exporting-status', 'loading-wrapper', 'is-loading', 'dialog-footer',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CircleCheckFilled: CircleCheckFilled,
            Loading: Loading,
            InfoFilled: InfoFilled,
            visible: visible,
            exportMode: exportMode,
            fileFormat: fileFormat,
            includeArticleContent: includeArticleContent,
            isExporting: isExporting,
            exportTipText: exportTipText,
            formats: formats,
            handleExport: handleExport,
        };
    },
    emits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
