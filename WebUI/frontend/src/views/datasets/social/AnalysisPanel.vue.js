import { computed, nextTick, ref } from "vue";
import { ElMessage } from "element-plus";
const props = defineProps();
const emit = defineEmits();
const quickTargets = [
    "中国",
    "美国",
    "台湾地区",
    "日本",
    "俄罗斯",
    "乌克兰",
    "欧洲",
];
const taskType = ref("emotion");
const targets = ref([]);
const newTarget = ref("");
const targetInputVisible = ref(false);
const targetInputRef = ref();
const startDisabled = computed(() => props.selectedCount === 0 ||
    (taskType.value === "stance" && targets.value.length === 0));
const disabledReason = computed(() => {
    if (props.selectedCount === 0)
        return "请先在右侧数据列表中选择要分析的数据。";
    if (taskType.value === "stance" && targets.value.length === 0)
        return "立场检测需要先添加分析目标。";
    return "";
});
const startButtonText = computed(() => {
    const prefix = taskType.value === "emotion" ? "开始情感识别" : "开始立场检测";
    return props.selectedCount
        ? `${prefix}（${props.selectedCount} 条）`
        : prefix;
});
const showTargetInput = () => {
    targetInputVisible.value = true;
    nextTick(() => targetInputRef.value?.focus?.());
};
const addTarget = (target) => {
    const value = target.trim();
    if (!value || targets.value.includes(value))
        return;
    if (targets.value.length >= 5) {
        ElMessage.warning("最多只能添加5个分析目标");
        return;
    }
    targets.value.push(value);
};
const confirmTarget = () => {
    addTarget(newTarget.value);
    newTarget.value = "";
    targetInputVisible.value = false;
};
const removeTarget = (index) => {
    targets.value.splice(index, 1);
};
const saveConfig = () => {
    emit("save-config");
    ElMessage.success("配置已保存");
};
const resetConfig = () => {
    emit("reset-config");
};
const startAnalysis = () => {
    if (startDisabled.value)
        return;
    if (taskType.value === "emotion") {
        emit("analyze-emotion");
        return;
    }
    emit("analyze-stance", targets.value);
};
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['analysis-panel', 'panel-heading', 'panel-heading', 'task-switch', 'task-switch', 'disabled-reason', 'analysis-panel', 'el-card__body', 'panel-heading', 'task-switch', 'start-button', 'disabled-reason', 'analysis-panel', 'el-card__body',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("analysis-panel") },
    shadow: ("never"),
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("analysis-panel") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("panel-heading") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("block-title") },
});
const __VLS_6 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    modelValue: ((__VLS_ctx.taskType)),
    ...{ class: ("task-switch") },
}));
const __VLS_8 = __VLS_7({
    modelValue: ((__VLS_ctx.taskType)),
    ...{ class: ("task-switch") },
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const __VLS_12 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    label: ("emotion"),
}));
const __VLS_14 = __VLS_13({
    label: ("emotion"),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_17.slots.default;
var __VLS_17;
const __VLS_18 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    label: ("stance"),
}));
const __VLS_20 = __VLS_19({
    label: ("stance"),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
__VLS_23.slots.default;
var __VLS_23;
__VLS_11.slots.default;
var __VLS_11;
if (__VLS_ctx.taskType === 'stance') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("target-area") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("block-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("quick-targets") },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.quickTargets))) {
        const __VLS_24 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ 'onClick': {} },
            key: ((item)),
            size: ("small"),
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onClick': {} },
            key: ((item)),
            size: ("small"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_30;
        const __VLS_31 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.taskType === 'stance')))
                    return;
                __VLS_ctx.addTarget(item);
            }
        };
        let __VLS_27;
        let __VLS_28;
        (item);
        __VLS_29.slots.default;
        var __VLS_29;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("target-list") },
    });
    for (const [target, index] of __VLS_getVForSourceType((__VLS_ctx.targets))) {
        const __VLS_32 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            ...{ 'onClose': {} },
            key: ((target)),
            closable: (true),
        }));
        const __VLS_34 = __VLS_33({
            ...{ 'onClose': {} },
            key: ((target)),
            closable: (true),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        let __VLS_38;
        const __VLS_39 = {
            onClose: (...[$event]) => {
                if (!((__VLS_ctx.taskType === 'stance')))
                    return;
                __VLS_ctx.removeTarget(index);
            }
        };
        let __VLS_35;
        let __VLS_36;
        (target);
        __VLS_37.slots.default;
        var __VLS_37;
    }
    if (__VLS_ctx.targetInputVisible) {
        const __VLS_40 = {}.ElInput;
        /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            ...{ 'onKeyup': {} },
            ...{ 'onBlur': {} },
            ref: ("targetInputRef"),
            modelValue: ((__VLS_ctx.newTarget)),
            size: ("small"),
            ...{ class: ("target-input") },
            placeholder: ("输入目标，如 中国"),
        }));
        const __VLS_42 = __VLS_41({
            ...{ 'onKeyup': {} },
            ...{ 'onBlur': {} },
            ref: ("targetInputRef"),
            modelValue: ((__VLS_ctx.newTarget)),
            size: ("small"),
            ...{ class: ("target-input") },
            placeholder: ("输入目标，如 中国"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        // @ts-ignore navigation for `const targetInputRef = ref()`
        /** @type { typeof __VLS_ctx.targetInputRef } */ ;
        var __VLS_46 = {};
        let __VLS_47;
        const __VLS_48 = {
            onKeyup: (__VLS_ctx.confirmTarget)
        };
        const __VLS_49 = {
            onBlur: (__VLS_ctx.confirmTarget)
        };
        let __VLS_43;
        let __VLS_44;
        var __VLS_45;
    }
    else {
        const __VLS_50 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
            ...{ 'onClick': {} },
            size: ("small"),
            plain: (true),
        }));
        const __VLS_52 = __VLS_51({
            ...{ 'onClick': {} },
            size: ("small"),
            plain: (true),
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        let __VLS_56;
        const __VLS_57 = {
            onClick: (__VLS_ctx.showTargetInput)
        };
        let __VLS_53;
        let __VLS_54;
        __VLS_55.slots.default;
        var __VLS_55;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("helper-text") },
    });
}
__VLS_5.slots.default;
var __VLS_5;
const __VLS_58 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
    ...{ class: ("analysis-panel") },
    shadow: ("never"),
}));
const __VLS_60 = __VLS_59({
    ...{ class: ("analysis-panel") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("config-area") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("block-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: ("field-label") },
});
const __VLS_64 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: ((__VLS_ctx.config.model_choice)),
    ...{ class: ("model-select") },
    size: ("small"),
}));
const __VLS_66 = __VLS_65({
    modelValue: ((__VLS_ctx.config.model_choice)),
    ...{ class: ("model-select") },
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
for (const [model] of __VLS_getVForSourceType((__VLS_ctx.modelOptions))) {
    const __VLS_70 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
        key: ((model)),
        label: ((model)),
        value: ((model)),
    }));
    const __VLS_72 = __VLS_71({
        key: ((model)),
        label: ((model)),
        value: ((model)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_71));
}
__VLS_69.slots.default;
var __VLS_69;
const __VLS_76 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ class: ("advanced-config") },
}));
const __VLS_78 = __VLS_77({
    ...{ class: ("advanced-config") },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
const __VLS_82 = {}.ElCollapseItem;
/** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
    title: ("高级参数"),
    name: ("advanced"),
}));
const __VLS_84 = __VLS_83({
    title: ("高级参数"),
    name: ("advanced"),
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
const __VLS_88 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    model: ((__VLS_ctx.config)),
    labelWidth: ("100px"),
    size: ("small"),
}));
const __VLS_90 = __VLS_89({
    model: ((__VLS_ctx.config)),
    labelWidth: ("100px"),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_94 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
    label: ("最小文本长度"),
}));
const __VLS_96 = __VLS_95({
    label: ("最小文本长度"),
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
const __VLS_100 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    modelValue: ((__VLS_ctx.config.min_text_length)),
    min: ((1)),
    max: ((50)),
    showInput: (true),
}));
const __VLS_102 = __VLS_101({
    modelValue: ((__VLS_ctx.config.min_text_length)),
    min: ((1)),
    max: ((50)),
    showInput: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_99.slots.default;
var __VLS_99;
const __VLS_106 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    label: ("最大文本长度"),
}));
const __VLS_108 = __VLS_107({
    label: ("最大文本长度"),
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
const __VLS_112 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    modelValue: ((__VLS_ctx.config.max_text_length)),
    min: ((50)),
    max: ((500)),
    showInput: (true),
}));
const __VLS_114 = __VLS_113({
    modelValue: ((__VLS_ctx.config.max_text_length)),
    min: ((50)),
    max: ((500)),
    showInput: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_111.slots.default;
var __VLS_111;
const __VLS_118 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    label: ("随机性"),
}));
const __VLS_120 = __VLS_119({
    label: ("随机性"),
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
const __VLS_124 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    modelValue: ((__VLS_ctx.config.temperature)),
    min: ((0.1)),
    max: ((1.0)),
    step: ((0.1)),
    showInput: (true),
}));
const __VLS_126 = __VLS_125({
    modelValue: ((__VLS_ctx.config.temperature)),
    min: ((0.1)),
    max: ((1.0)),
    step: ((0.1)),
    showInput: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_123.slots.default;
var __VLS_123;
const __VLS_130 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    label: ("采样范围"),
}));
const __VLS_132 = __VLS_131({
    label: ("采样范围"),
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
const __VLS_136 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    modelValue: ((__VLS_ctx.config.top_p)),
    min: ((0.1)),
    max: ((1.0)),
    step: ((0.1)),
    showInput: (true),
}));
const __VLS_138 = __VLS_137({
    modelValue: ((__VLS_ctx.config.top_p)),
    min: ((0.1)),
    max: ((1.0)),
    step: ((0.1)),
    showInput: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_135.slots.default;
var __VLS_135;
const __VLS_142 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
    label: ("采样数量"),
}));
const __VLS_144 = __VLS_143({
    label: ("采样数量"),
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
const __VLS_148 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    modelValue: ((__VLS_ctx.config.top_k)),
    min: ((1)),
    max: ((100)),
    showInput: (true),
}));
const __VLS_150 = __VLS_149({
    modelValue: ((__VLS_ctx.config.top_k)),
    min: ((1)),
    max: ((100)),
    showInput: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_147.slots.default;
var __VLS_147;
const __VLS_154 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    label: ("启用采样"),
}));
const __VLS_156 = __VLS_155({
    label: ("启用采样"),
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
const __VLS_160 = {}.ElSwitch;
/** @type { [typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ] } */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    modelValue: ((__VLS_ctx.config.do_sample)),
}));
const __VLS_162 = __VLS_161({
    modelValue: ((__VLS_ctx.config.do_sample)),
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_159.slots.default;
var __VLS_159;
__VLS_93.slots.default;
var __VLS_93;
__VLS_87.slots.default;
var __VLS_87;
__VLS_81.slots.default;
var __VLS_81;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("config-actions") },
});
const __VLS_166 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
    ...{ 'onClick': {} },
    size: ("small"),
    type: ("primary"),
    plain: (true),
}));
const __VLS_168 = __VLS_167({
    ...{ 'onClick': {} },
    size: ("small"),
    type: ("primary"),
    plain: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
let __VLS_172;
const __VLS_173 = {
    onClick: (__VLS_ctx.saveConfig)
};
let __VLS_169;
let __VLS_170;
__VLS_171.slots.default;
var __VLS_171;
const __VLS_174 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    ...{ 'onClick': {} },
    size: ("small"),
}));
const __VLS_176 = __VLS_175({
    ...{ 'onClick': {} },
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
let __VLS_180;
const __VLS_181 = {
    onClick: (__VLS_ctx.resetConfig)
};
let __VLS_177;
let __VLS_178;
__VLS_179.slots.default;
var __VLS_179;
const __VLS_182 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    ...{ 'onClick': {} },
    ...{ class: ("start-button") },
    type: ("primary"),
    size: ("large"),
    disabled: ((__VLS_ctx.startDisabled)),
}));
const __VLS_184 = __VLS_183({
    ...{ 'onClick': {} },
    ...{ class: ("start-button") },
    type: ("primary"),
    size: ("large"),
    disabled: ((__VLS_ctx.startDisabled)),
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
let __VLS_188;
const __VLS_189 = {
    onClick: (__VLS_ctx.startAnalysis)
};
let __VLS_185;
let __VLS_186;
(__VLS_ctx.startButtonText);
__VLS_187.slots.default;
var __VLS_187;
if (__VLS_ctx.startDisabled) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("disabled-reason") },
    });
    (__VLS_ctx.disabledReason);
}
__VLS_63.slots.default;
var __VLS_63;
['analysis-panel', 'panel-heading', 'block-title', 'task-switch', 'target-area', 'block-title', 'quick-targets', 'target-list', 'target-input', 'helper-text', 'analysis-panel', 'config-area', 'block-title', 'field-label', 'model-select', 'advanced-config', 'config-actions', 'start-button', 'disabled-reason',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            quickTargets: quickTargets,
            taskType: taskType,
            targets: targets,
            newTarget: newTarget,
            targetInputVisible: targetInputVisible,
            targetInputRef: targetInputRef,
            startDisabled: startDisabled,
            disabledReason: disabledReason,
            startButtonText: startButtonText,
            showTargetInput: showTargetInput,
            addTarget: addTarget,
            confirmTarget: confirmTarget,
            removeTarget: removeTarget,
            saveConfig: saveConfig,
            resetConfig: resetConfig,
            startAnalysis: startAnalysis,
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
    __typeRefs: {},
});
; /* PartiallyEnd: #4569/main.vue */
