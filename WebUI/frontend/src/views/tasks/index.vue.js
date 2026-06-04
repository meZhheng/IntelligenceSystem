import { Plus, Search, } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import axios from '@/api/axios';
import { formatDateTime } from '@/utils/date';
import TaskChart from '@/components/TaskChart.vue';
import { Delete } from '@element-plus/icons-vue';
export default await (async () => {
    ; /* PartiallyEnd: #3632/scriptSetup.vue */
    const __VLS_ctx = {};
    const __VLS_componentsOption = {
        TaskChart,
        Delete,
    };
    let __VLS_components;
    let __VLS_directives;
    ['more-icon',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: ("box"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_0 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ style: ({}) },
        placeholder: ("搜索任务"),
        prefixIcon: ((__VLS_ctx.Search)),
    }));
    const __VLS_2 = __VLS_1({
        ...{ style: ({}) },
        placeholder: ("搜索任务"),
        prefixIcon: ((__VLS_ctx.Search)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const __VLS_6 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        ...{ 'onClick': {} },
        type: ("primary"),
        icon: ((__VLS_ctx.Plus)),
        ...{ style: ({}) },
    }));
    const __VLS_8 = __VLS_7({
        ...{ 'onClick': {} },
        type: ("primary"),
        icon: ((__VLS_ctx.Plus)),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    let __VLS_12;
    const __VLS_13 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogFormVisible = true;
        }
    };
    let __VLS_9;
    let __VLS_10;
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("task-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("task-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.inference_tasks.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.inference_tasks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((item.id)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("task-card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDateTime(item.timestamp));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress") },
        });
        const __VLS_14 = {}.ElProgress;
        /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
            textInside: ((true)),
            strokeWidth: ((18)),
            percentage: ((item.progress)),
            color: ((__VLS_ctx.customColorMethod)),
        }));
        const __VLS_16 = __VLS_15({
            textInside: ((true)),
            strokeWidth: ((18)),
            percentage: ((item.progress)),
            color: ((__VLS_ctx.customColorMethod)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("task-status") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("more-icon") },
            size: ((20)),
        });
        const __VLS_20 = {}.ElDropdown;
        /** @type { [typeof __VLS_components.ElDropdown, typeof __VLS_components.elDropdown, typeof __VLS_components.ElDropdown, typeof __VLS_components.elDropdown, ] } */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            ...{ 'onCommand': {} },
            placement: ("top-end"),
            trigger: ("click"),
        }));
        const __VLS_22 = __VLS_21({
            ...{ 'onCommand': {} },
            placement: ("top-end"),
            trigger: ("click"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        let __VLS_26;
        const __VLS_27 = {
            onCommand: ((command) => __VLS_ctx.handleTaskDelete(command, item.id))
        };
        let __VLS_23;
        let __VLS_24;
        const __VLS_28 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
        const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
        const __VLS_34 = {}.MoreFilled;
        /** @type { [typeof __VLS_components.MoreFilled, ] } */ ;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({}));
        const __VLS_36 = __VLS_35({}, ...__VLS_functionalComponentArgsRest(__VLS_35));
        __VLS_33.slots.default;
        var __VLS_33;
        {
            const { dropdown: __VLS_thisSlot } = __VLS_25.slots;
            const __VLS_40 = {}.ElDropdownMenu;
            /** @type { [typeof __VLS_components.ElDropdownMenu, typeof __VLS_components.elDropdownMenu, typeof __VLS_components.ElDropdownMenu, typeof __VLS_components.elDropdownMenu, ] } */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
            const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
            const __VLS_46 = {}.ElDropdownItem;
            /** @type { [typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, ] } */ ;
            // @ts-ignore
            const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
                icon: ((__VLS_ctx.Delete)),
                command: ("delete"),
            }));
            const __VLS_48 = __VLS_47({
                icon: ((__VLS_ctx.Delete)),
                command: ("delete"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_47));
            __VLS_51.slots.default;
            var __VLS_51;
            __VLS_45.slots.default;
            var __VLS_45;
        }
        __VLS_25.slots.default;
        var __VLS_25;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("task-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("task-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.train_tasks.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.train_tasks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((item.id)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("task-card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDateTime(item.timestamp));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress") },
        });
        const __VLS_52 = {}.ElProgress;
        /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            textInside: ((true)),
            strokeWidth: ((18)),
            percentage: ((item.progress)),
            color: ((__VLS_ctx.customColorMethod)),
        }));
        const __VLS_54 = __VLS_53({
            textInside: ((true)),
            strokeWidth: ((18)),
            percentage: ((item.progress)),
            color: ((__VLS_ctx.customColorMethod)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("task-status") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("more-icon") },
            size: ((20)),
        });
        const __VLS_58 = {}.ElDropdown;
        /** @type { [typeof __VLS_components.ElDropdown, typeof __VLS_components.elDropdown, typeof __VLS_components.ElDropdown, typeof __VLS_components.elDropdown, ] } */ ;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
            ...{ 'onCommand': {} },
            placement: ("top-end"),
            trigger: ("click"),
        }));
        const __VLS_60 = __VLS_59({
            ...{ 'onCommand': {} },
            placement: ("top-end"),
            trigger: ("click"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
        let __VLS_64;
        const __VLS_65 = {
            onCommand: ((command) => __VLS_ctx.handleTaskDelete(command, item.id))
        };
        let __VLS_61;
        let __VLS_62;
        const __VLS_66 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({}));
        const __VLS_68 = __VLS_67({}, ...__VLS_functionalComponentArgsRest(__VLS_67));
        const __VLS_72 = {}.MoreFilled;
        /** @type { [typeof __VLS_components.MoreFilled, ] } */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
        const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_71.slots.default;
        var __VLS_71;
        {
            const { dropdown: __VLS_thisSlot } = __VLS_63.slots;
            const __VLS_78 = {}.ElDropdownMenu;
            /** @type { [typeof __VLS_components.ElDropdownMenu, typeof __VLS_components.elDropdownMenu, typeof __VLS_components.ElDropdownMenu, typeof __VLS_components.elDropdownMenu, ] } */ ;
            // @ts-ignore
            const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({}));
            const __VLS_80 = __VLS_79({}, ...__VLS_functionalComponentArgsRest(__VLS_79));
            const __VLS_84 = {}.ElDropdownItem;
            /** @type { [typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, ] } */ ;
            // @ts-ignore
            const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
                icon: ((__VLS_ctx.Delete)),
                command: ("delete"),
            }));
            const __VLS_86 = __VLS_85({
                icon: ((__VLS_ctx.Delete)),
                command: ("delete"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_85));
            __VLS_89.slots.default;
            var __VLS_89;
            const __VLS_90 = {}.ElDropdownItem;
            /** @type { [typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, ] } */ ;
            // @ts-ignore
            const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
                command: ("show"),
            }));
            const __VLS_92 = __VLS_91({
                command: ("show"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_91));
            __VLS_95.slots.default;
            var __VLS_95;
            __VLS_83.slots.default;
            var __VLS_83;
        }
        __VLS_63.slots.default;
        var __VLS_63;
        if (__VLS_ctx.visibleCharts[item.id]) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("task-chart") },
            });
            const __VLS_96 = {}.TaskChart;
            /** @type { [typeof __VLS_components.TaskChart, ] } */ ;
            // @ts-ignore
            const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
                task_id: ((item.id)),
                content: ((item.result.loss)),
            }));
            const __VLS_98 = __VLS_97({
                task_id: ((item.id)),
                content: ((item.result.loss)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_97));
        }
    }
    const __VLS_102 = {}.ElDialog;
    /** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        modelValue: ((__VLS_ctx.dialogFormVisible)),
        width: ("500px"),
        labelWidth: ("auto"),
        showClose: ((false)),
    }));
    const __VLS_104 = __VLS_103({
        modelValue: ((__VLS_ctx.dialogFormVisible)),
        width: ("500px"),
        labelWidth: ("auto"),
        showClose: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    {
        const { header: __VLS_thisSlot } = __VLS_107.slots;
        const [{ titleId, titleClass }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("title") },
            ...{ style: ({}) },
            id: ((titleId)),
            ...{ class: ((titleClass)) },
        });
        const __VLS_108 = {}.ElSegmented;
        /** @type { [typeof __VLS_components.ElSegmented, typeof __VLS_components.elSegmented, ] } */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            modelValue: ((__VLS_ctx.task_type_value)),
            options: ((__VLS_ctx.task_type_options)),
        }));
        const __VLS_110 = __VLS_109({
            modelValue: ((__VLS_ctx.task_type_value)),
            options: ((__VLS_ctx.task_type_options)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    }
    const __VLS_114 = {}.ElForm;
    /** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
        model: ((__VLS_ctx.form)),
        rules: ((__VLS_ctx.rules)),
    }));
    const __VLS_116 = __VLS_115({
        model: ((__VLS_ctx.form)),
        rules: ((__VLS_ctx.rules)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    const __VLS_120 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        label: ("任务名称"),
        prop: ("name"),
    }));
    const __VLS_122 = __VLS_121({
        label: ("任务名称"),
        prop: ("name"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    const __VLS_126 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
        modelValue: ((__VLS_ctx.form.name)),
        autocomplete: ("off"),
        placeholder: ("请输入任务名称"),
        maxlength: ("15"),
        showWordLimit: (true),
    }));
    const __VLS_128 = __VLS_127({
        modelValue: ((__VLS_ctx.form.name)),
        autocomplete: ("off"),
        placeholder: ("请输入任务名称"),
        maxlength: ("15"),
        showWordLimit: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
    __VLS_125.slots.default;
    var __VLS_125;
    const __VLS_132 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        label: ("任务描述"),
        prop: ("description"),
    }));
    const __VLS_134 = __VLS_133({
        label: ("任务描述"),
        prop: ("description"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    const __VLS_138 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
        modelValue: ((__VLS_ctx.form.description)),
        maxlength: ("100"),
        autosize: (({ minRows: 3, maxRows: 5 })),
        ...{ style: ({}) },
        placeholder: ("请输入任务描述"),
        showWordLimit: (true),
        type: ("textarea"),
        resize: ("none"),
    }));
    const __VLS_140 = __VLS_139({
        modelValue: ((__VLS_ctx.form.description)),
        maxlength: ("100"),
        autosize: (({ minRows: 3, maxRows: 5 })),
        ...{ style: ({}) },
        placeholder: ("请输入任务描述"),
        showWordLimit: (true),
        type: ("textarea"),
        resize: ("none"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_139));
    __VLS_137.slots.default;
    var __VLS_137;
    const __VLS_144 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        label: ("任务类型"),
        prop: ("type"),
    }));
    const __VLS_146 = __VLS_145({
        label: ("任务类型"),
        prop: ("type"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    const __VLS_150 = {}.ElSelect;
    /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.form.type)),
        placeholder: ("请选择任务类型"),
    }));
    const __VLS_152 = __VLS_151({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.form.type)),
        placeholder: ("请选择任务类型"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    let __VLS_156;
    const __VLS_157 = {
        onChange: (__VLS_ctx.changeTaskType)
    };
    let __VLS_153;
    let __VLS_154;
    const __VLS_158 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
        label: ("情感分析"),
        value: ("EmotionDatasetBase"),
    }));
    const __VLS_160 = __VLS_159({
        label: ("情感分析"),
        value: ("EmotionDatasetBase"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_159));
    const __VLS_164 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        label: ("立场检测"),
        value: ("stance"),
    }));
    const __VLS_166 = __VLS_165({
        label: ("立场检测"),
        value: ("stance"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    __VLS_155.slots.default;
    var __VLS_155;
    __VLS_149.slots.default;
    var __VLS_149;
    const __VLS_170 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
        label: ("数据选择"),
        prop: ("dataset"),
    }));
    const __VLS_172 = __VLS_171({
        label: ("数据选择"),
        prop: ("dataset"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_171));
    const __VLS_176 = {}.ElSelect;
    /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        ...{ 'onVisibleChange': {} },
        modelValue: ((__VLS_ctx.form.dataset)),
        placeholder: ("请选择使用的数据集"),
        loading: ((__VLS_ctx.loading)),
        disabled: ((__VLS_ctx.disabled)),
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onVisibleChange': {} },
        modelValue: ((__VLS_ctx.form.dataset)),
        placeholder: ("请选择使用的数据集"),
        loading: ((__VLS_ctx.loading)),
        disabled: ((__VLS_ctx.disabled)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_182;
    const __VLS_183 = {
        onVisibleChange: (__VLS_ctx.fetchDataset)
    };
    let __VLS_179;
    let __VLS_180;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetOptions))) {
        const __VLS_184 = {}.ElOption;
        /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            key: ((item.value)),
            label: ((item.label)),
            value: ((item.value)),
        }));
        const __VLS_186 = __VLS_185({
            key: ((item.value)),
            label: ((item.label)),
            value: ((item.value)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    }
    {
        const { loading: __VLS_thisSlot } = __VLS_181.slots;
        const __VLS_190 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
            ...{ class: ("is-loading") },
        }));
        const __VLS_192 = __VLS_191({
            ...{ class: ("is-loading") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_191));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: ("circular") },
            viewBox: ("0 0 20 20"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
            ...{ class: ("path2 loading-path") },
            'stroke-width': ("0"),
            ...{ style: ({}) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot1") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot2") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot4") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot3") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_195.slots.default;
        var __VLS_195;
    }
    __VLS_181.slots.default;
    var __VLS_181;
    __VLS_175.slots.default;
    var __VLS_175;
    const __VLS_196 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        label: ("模型选择"),
        prop: ("model"),
    }));
    const __VLS_198 = __VLS_197({
        label: ("模型选择"),
        prop: ("model"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    const __VLS_202 = {}.ElSelect;
    /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
    // @ts-ignore
    const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
        ...{ 'onVisibleChange': {} },
        modelValue: ((__VLS_ctx.form.model)),
        placeholder: ("请选择使用的模型"),
        loading: ((__VLS_ctx.loading)),
        disabled: ((__VLS_ctx.disabled)),
    }));
    const __VLS_204 = __VLS_203({
        ...{ 'onVisibleChange': {} },
        modelValue: ((__VLS_ctx.form.model)),
        placeholder: ("请选择使用的模型"),
        loading: ((__VLS_ctx.loading)),
        disabled: ((__VLS_ctx.disabled)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_203));
    let __VLS_208;
    const __VLS_209 = {
        onVisibleChange: (__VLS_ctx.fetchModel)
    };
    let __VLS_205;
    let __VLS_206;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.modelOptions))) {
        const __VLS_210 = {}.ElOption;
        /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
        // @ts-ignore
        const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
            key: ((item.value)),
            label: ((item.label)),
            value: ((item.value)),
            disabled: ((item.status == 0)),
        }));
        const __VLS_212 = __VLS_211({
            key: ((item.value)),
            label: ((item.label)),
            value: ((item.value)),
            disabled: ((item.status == 0)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    }
    {
        const { loading: __VLS_thisSlot } = __VLS_207.slots;
        const __VLS_216 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
            ...{ class: ("is-loading") },
        }));
        const __VLS_218 = __VLS_217({
            ...{ class: ("is-loading") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: ("circular") },
            viewBox: ("0 0 20 20"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
            ...{ class: ("path2 loading-path") },
            'stroke-width': ("0"),
            ...{ style: ({}) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot1") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot2") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot4") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            r: ("3.375"),
            ...{ class: ("dot3") },
            rx: ("0"),
            ry: ("0"),
        });
        __VLS_221.slots.default;
        var __VLS_221;
    }
    __VLS_207.slots.default;
    var __VLS_207;
    __VLS_201.slots.default;
    var __VLS_201;
    __VLS_119.slots.default;
    var __VLS_119;
    {
        const { footer: __VLS_thisSlot } = __VLS_107.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("dialog-footer") },
        });
        const __VLS_222 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
            ...{ 'onClick': {} },
        }));
        const __VLS_224 = __VLS_223({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_223));
        let __VLS_228;
        const __VLS_229 = {
            onClick: (__VLS_ctx.handleClose)
        };
        let __VLS_225;
        let __VLS_226;
        __VLS_227.slots.default;
        var __VLS_227;
        const __VLS_230 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
            ...{ 'onClick': {} },
            type: ("primary"),
        }));
        const __VLS_232 = __VLS_231({
            ...{ 'onClick': {} },
            type: ("primary"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_231));
        let __VLS_236;
        const __VLS_237 = {
            onClick: (__VLS_ctx.handleSummit)
        };
        let __VLS_233;
        let __VLS_234;
        __VLS_235.slots.default;
        var __VLS_235;
    }
    __VLS_107.slots.default;
    var __VLS_107;
    ['header', 'content', 'task-row', 'task-header', 'title', 'title', 'title', 'title', 'task-card', 'progress', 'task-status', 'more-icon', 'task-row', 'task-header', 'title', 'task-card', 'progress', 'task-status', 'more-icon', 'task-chart', 'title', 'is-loading', 'circular', 'path2', 'loading-path', 'dot1', 'dot2', 'dot4', 'dot3', 'is-loading', 'circular', 'path2', 'loading-path', 'dot1', 'dot2', 'dot4', 'dot3', 'dialog-footer',];
    var __VLS_special;
    const __VLS_self = (await import('vue')).defineComponent({
        setup() {
            return {
                Plus: Plus,
                Search: Search,
                formatDateTime: formatDateTime,
                TaskChart: TaskChart,
                Delete: Delete,
            };
        },
        name: 'Task',
        components: {
            TaskChart,
            Delete,
        },
        data() {
            return {
                dialogFormVisible: false,
                inference_tasks: [],
                train_tasks: [],
                form: {
                    name: '',
                    description: '',
                    type: '',
                    dataset: '',
                    model: '',
                },
                dataset_selected: false,
                datasetOptions: [],
                model_selected: false,
                modelOptions: [],
                loading: false,
                disabled: true,
                rules: {
                    name: [{ required: true, message: '请输入任务名称！', trigger: 'blur' }],
                    description: [{ required: true, message: '请输入任务描述！', trigger: 'blur' }],
                    type: [{ required: true, message: '请选择任务类型！', trigger: 'blur' }],
                    dataset: [{ required: true, message: '请选择使用的数据集！', trigger: 'blur' }],
                    model: [{ required: true, message: '请选择使用的模型！', trigger: 'blur' }],
                },
                task_type_value: '推理',
                task_type_options: ['推理', '训练'],
                visibleCharts: {}
            };
        },
        methods: {
            async handleTaskDelete(command, task_id) {
                console.log(command, task_id);
                const link = `/task/delete`;
                const payload = {
                    task_id: task_id,
                };
                axios.post(link, payload).then((response) => {
                    this.$message.success(response.data.message);
                    this.flush_tasks();
                }).catch((e) => {
                    this.$message.error(e.response.data.message);
                });
            },
            handleClose(done) {
                ElMessageBox.confirm('确定要关闭对话框吗？数据将不会得到保存')
                    .then(() => {
                    this.dialogFormVisible = false;
                    done();
                })
                    .catch(() => {
                    // catch error
                });
            },
            toggleChartVisibility(taskId) {
                if (this.visibleCharts[taskId] === undefined) {
                    this.visibleCharts[taskId] = true; // 初次点击时，显示
                }
                else {
                    this.visibleCharts[taskId] = !this.visibleCharts[taskId]; // 取反
                }
            },
            changeTaskType(value) {
                console.log(value);
                if (value) {
                    this.disabled = false;
                }
                else {
                    this.disabled = true;
                }
            },
            async fetchDataset(visible) {
                if ((!this.dataset_selected && visible) || (this.datasetOptions.length == 0)) {
                    this.loading = true;
                    this.dataset_selected = true;
                    try {
                        const response = await axios.post(`/datasets`, {
                            dataset_type: this.form.type
                        }, {
                            timeout: 10000 // 设置超时时间为10秒
                        });
                        this.datasetOptions = response.data;
                        this.loading = false;
                    }
                    catch (error) {
                        console.error('Failed to fetch datasets:', error);
                        this.loading = false;
                    }
                }
            },
            async fetchModel(visible) {
                if ((!this.model_selected && visible) || (this.modelOptions.length == 0)) {
                    this.loading = true;
                    this.model_selected = true;
                    try {
                        const response = await axios.post(`/models`, {
                            task_type: this.form.type
                        }, {
                            timeout: 10000 // 设置超时时间为5秒
                        });
                        this.modelOptions = response.data;
                        this.loading = false;
                    }
                    catch (error) {
                        console.error('Failed to fetch models:', error);
                        this.loading = false;
                    }
                }
            },
            handleSummit(e) {
                const path = '/task/create';
                const payload = {
                    'name': this.form.name,
                    'description': this.form.description,
                    'dataset': this.form.dataset,
                    'model': this.form.model,
                    'type': this.task_type_options.indexOf(this.task_type_value)
                };
                if (Object.values(payload).every(value => value !== null && value !== undefined && value !== '')) {
                    this.create_task(path, payload);
                    this.dialogFormVisible = false;
                }
                else {
                    this.$message.error("请填写所有字段"); // 适用于 Element UI 的消息提示
                }
            },
            async create_task(path, payload) {
                axios.post(path, payload)
                    .then((response) => {
                    // handle success
                    this.flush_tasks();
                })
                    .catch((error) => {
                    // handle error
                    console.log('Failed to create task:', error);
                });
            },
            async flush_tasks() {
                const path = `/users/${window.localStorage.getItem('user-id')}/tasks`;
                axios.get(path)
                    .then((response) => {
                    this.inference_tasks = response.data.inference.items;
                    this.train_tasks = response.data.train.items;
                })
                    .catch((error) => {
                    console.error(error);
                });
            },
            customColorMethod(percentage) {
                if (percentage < 30) {
                    return '#909399';
                }
                if (percentage < 70) {
                    return '#e6a23c';
                }
                return '#67c23a';
            }
        },
        mounted() {
            // 先执行一次
            if (window.localStorage.getItem('user-token')) {
                this.flush_tasks();
            }
            // 每 10 秒执行一次
            this.intervalTask = setInterval(() => {
                if (window.localStorage.getItem('user-token')) {
                    this.flush_tasks();
                }
            }, 3000);
        },
        beforeUnmount() {
            clearInterval(this.intervalTask); // 清除定时器，防止内存泄漏
        }
    });
    return (await import('vue')).defineComponent({
        setup() {
            return {};
        },
        name: 'Task',
        components: {
            TaskChart,
            Delete,
        },
        data() {
            return {
                dialogFormVisible: false,
                inference_tasks: [],
                train_tasks: [],
                form: {
                    name: '',
                    description: '',
                    type: '',
                    dataset: '',
                    model: '',
                },
                dataset_selected: false,
                datasetOptions: [],
                model_selected: false,
                modelOptions: [],
                loading: false,
                disabled: true,
                rules: {
                    name: [{ required: true, message: '请输入任务名称！', trigger: 'blur' }],
                    description: [{ required: true, message: '请输入任务描述！', trigger: 'blur' }],
                    type: [{ required: true, message: '请选择任务类型！', trigger: 'blur' }],
                    dataset: [{ required: true, message: '请选择使用的数据集！', trigger: 'blur' }],
                    model: [{ required: true, message: '请选择使用的模型！', trigger: 'blur' }],
                },
                task_type_value: '推理',
                task_type_options: ['推理', '训练'],
                visibleCharts: {}
            };
        },
        methods: {
            async handleTaskDelete(command, task_id) {
                console.log(command, task_id);
                const link = `/task/delete`;
                const payload = {
                    task_id: task_id,
                };
                axios.post(link, payload).then((response) => {
                    this.$message.success(response.data.message);
                    this.flush_tasks();
                }).catch((e) => {
                    this.$message.error(e.response.data.message);
                });
            },
            handleClose(done) {
                ElMessageBox.confirm('确定要关闭对话框吗？数据将不会得到保存')
                    .then(() => {
                    this.dialogFormVisible = false;
                    done();
                })
                    .catch(() => {
                    // catch error
                });
            },
            toggleChartVisibility(taskId) {
                if (this.visibleCharts[taskId] === undefined) {
                    this.visibleCharts[taskId] = true; // 初次点击时，显示
                }
                else {
                    this.visibleCharts[taskId] = !this.visibleCharts[taskId]; // 取反
                }
            },
            changeTaskType(value) {
                console.log(value);
                if (value) {
                    this.disabled = false;
                }
                else {
                    this.disabled = true;
                }
            },
            async fetchDataset(visible) {
                if ((!this.dataset_selected && visible) || (this.datasetOptions.length == 0)) {
                    this.loading = true;
                    this.dataset_selected = true;
                    try {
                        const response = await axios.post(`/datasets`, {
                            dataset_type: this.form.type
                        }, {
                            timeout: 10000 // 设置超时时间为10秒
                        });
                        this.datasetOptions = response.data;
                        this.loading = false;
                    }
                    catch (error) {
                        console.error('Failed to fetch datasets:', error);
                        this.loading = false;
                    }
                }
            },
            async fetchModel(visible) {
                if ((!this.model_selected && visible) || (this.modelOptions.length == 0)) {
                    this.loading = true;
                    this.model_selected = true;
                    try {
                        const response = await axios.post(`/models`, {
                            task_type: this.form.type
                        }, {
                            timeout: 10000 // 设置超时时间为5秒
                        });
                        this.modelOptions = response.data;
                        this.loading = false;
                    }
                    catch (error) {
                        console.error('Failed to fetch models:', error);
                        this.loading = false;
                    }
                }
            },
            handleSummit(e) {
                const path = '/task/create';
                const payload = {
                    'name': this.form.name,
                    'description': this.form.description,
                    'dataset': this.form.dataset,
                    'model': this.form.model,
                    'type': this.task_type_options.indexOf(this.task_type_value)
                };
                if (Object.values(payload).every(value => value !== null && value !== undefined && value !== '')) {
                    this.create_task(path, payload);
                    this.dialogFormVisible = false;
                }
                else {
                    this.$message.error("请填写所有字段"); // 适用于 Element UI 的消息提示
                }
            },
            async create_task(path, payload) {
                axios.post(path, payload)
                    .then((response) => {
                    // handle success
                    this.flush_tasks();
                })
                    .catch((error) => {
                    // handle error
                    console.log('Failed to create task:', error);
                });
            },
            async flush_tasks() {
                const path = `/users/${window.localStorage.getItem('user-id')}/tasks`;
                axios.get(path)
                    .then((response) => {
                    this.inference_tasks = response.data.inference.items;
                    this.train_tasks = response.data.train.items;
                })
                    .catch((error) => {
                    console.error(error);
                });
            },
            customColorMethod(percentage) {
                if (percentage < 30) {
                    return '#909399';
                }
                if (percentage < 70) {
                    return '#e6a23c';
                }
                return '#67c23a';
            }
        },
        mounted() {
            // 先执行一次
            if (window.localStorage.getItem('user-token')) {
                this.flush_tasks();
            }
            // 每 10 秒执行一次
            this.intervalTask = setInterval(() => {
                if (window.localStorage.getItem('user-token')) {
                    this.flush_tasks();
                }
            }, 3000);
        },
        beforeUnmount() {
            clearInterval(this.intervalTask); // 清除定时器，防止内存泄漏
        }
    });
})(); /* PartiallyEnd: #3632/script.vue */
; /* PartiallyEnd: #4569/main.vue */
