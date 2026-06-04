import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "@/api/axios";
import { formatDateTime } from "@/utils/date";
const loading = ref(false);
const error = ref("");
const scheduler = ref(null);
const jobs = ref([]);
const lastLoadedAt = ref("");
const formatOptionalTime = (value) => {
    return value ? formatDateTime(value) : "--";
};
const formatDuration = (duration) => {
    if (duration === undefined || duration === null)
        return "--";
    if (duration < 1000)
        return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
};
const formatTrigger = (trigger) => {
    if (!trigger)
        return "--";
    return trigger.description || trigger.type || "--";
};
const formatError = (value) => {
    if (typeof value === "string")
        return value;
    return JSON.stringify(value, null, 2);
};
const getJobStatusType = (status) => {
    const normalized = (status || "").toLowerCase();
    if (["scheduled", "running", "success", "active"].includes(normalized))
        return "success";
    if (["paused", "missed"].includes(normalized))
        return "warning";
    if (["error", "failed", "failure"].includes(normalized))
        return "danger";
    return "info";
};
const getLastRunStatusType = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "success")
        return "success";
    if (normalized === "running")
        return "primary";
    if (normalized === "missed")
        return "warning";
    if (["error", "failed", "failure"].includes(normalized))
        return "danger";
    return "info";
};
const fetchSchedulerJobs = async () => {
    loading.value = true;
    error.value = "";
    try {
        const { data } = await axios.get("/scheduler/jobs");
        scheduler.value = data.scheduler || null;
        jobs.value = Array.isArray(data.jobs) ? data.jobs : [];
        lastLoadedAt.value = new Date().toISOString();
    }
    catch (err) {
        error.value =
            err.response?.data?.message ||
                err.response?.data?.error ||
                err.response?.data?.detail ||
                err.message ||
                "获取调度器任务状态失败";
        ElMessage.error(error.value);
    }
    finally {
        loading.value = false;
    }
};
onMounted(() => {
    fetchSchedulerJobs();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['page-header', 'page-header',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("scheduler-jobs-page") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("page-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header-actions") },
});
if (__VLS_ctx.lastLoadedAt) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("loaded-time") },
    });
    (__VLS_ctx.formatDateTime(__VLS_ctx.lastLoadedAt));
}
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.loading)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.loading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.fetchSchedulerJobs)
};
let __VLS_3;
let __VLS_4;
__VLS_5.slots.default;
var __VLS_5;
if (__VLS_ctx.error) {
    const __VLS_8 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        title: ((__VLS_ctx.error)),
        type: ("error"),
        showIcon: (true),
        ...{ class: ("page-alert") },
    }));
    const __VLS_10 = __VLS_9({
        title: ((__VLS_ctx.error)),
        type: ("error"),
        showIcon: (true),
        ...{ class: ("page-alert") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
const __VLS_14 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    ...{ class: ("summary-card") },
    shadow: ("never"),
}));
const __VLS_16 = __VLS_15({
    ...{ class: ("summary-card") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
{
    const { header: __VLS_thisSlot } = __VLS_19.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    if (__VLS_ctx.scheduler) {
        const __VLS_20 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            type: ((__VLS_ctx.scheduler.running ? 'success' : 'danger')),
        }));
        const __VLS_22 = __VLS_21({
            type: ((__VLS_ctx.scheduler.running ? 'success' : 'danger')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        (__VLS_ctx.scheduler.running ? "运行中" : "未运行");
        __VLS_25.slots.default;
        var __VLS_25;
    }
}
if (!__VLS_ctx.scheduler && !__VLS_ctx.loading) {
    const __VLS_26 = {}.ElEmpty;
    /** @type { [typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ] } */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
        description: ("暂无调度器状态"),
    }));
    const __VLS_28 = __VLS_27({
        description: ("暂无调度器状态"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
}
else {
    const __VLS_32 = {}.ElDescriptions;
    /** @type { [typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ] } */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        column: ((3)),
        border: (true),
    }));
    const __VLS_34 = __VLS_33({
        column: ((3)),
        border: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    const __VLS_38 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
        label: ("启用状态"),
    }));
    const __VLS_40 = __VLS_39({
        label: ("启用状态"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    const __VLS_44 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        type: ((__VLS_ctx.scheduler?.enabled ? 'success' : 'danger')),
    }));
    const __VLS_46 = __VLS_45({
        type: ((__VLS_ctx.scheduler?.enabled ? 'success' : 'danger')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    (__VLS_ctx.scheduler?.enabled ? "已启用" : "未启用");
    __VLS_49.slots.default;
    var __VLS_49;
    __VLS_43.slots.default;
    var __VLS_43;
    const __VLS_50 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        label: ("运行状态"),
    }));
    const __VLS_52 = __VLS_51({
        label: ("运行状态"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    const __VLS_56 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        type: ((__VLS_ctx.scheduler?.running ? 'success' : 'danger')),
    }));
    const __VLS_58 = __VLS_57({
        type: ((__VLS_ctx.scheduler?.running ? 'success' : 'danger')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    (__VLS_ctx.scheduler?.running ? "运行中" : "未运行");
    __VLS_61.slots.default;
    var __VLS_61;
    __VLS_55.slots.default;
    var __VLS_55;
    const __VLS_62 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
        label: ("Master 节点"),
    }));
    const __VLS_64 = __VLS_63({
        label: ("Master 节点"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    const __VLS_68 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        type: ((__VLS_ctx.scheduler?.is_master ? 'success' : 'info')),
    }));
    const __VLS_70 = __VLS_69({
        type: ((__VLS_ctx.scheduler?.is_master ? 'success' : 'info')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    (__VLS_ctx.scheduler?.is_master ? "是" : "否");
    __VLS_73.slots.default;
    var __VLS_73;
    __VLS_67.slots.default;
    var __VLS_67;
    const __VLS_74 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        label: ("时区"),
    }));
    const __VLS_76 = __VLS_75({
        label: ("时区"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    (__VLS_ctx.scheduler?.timezone || "--");
    __VLS_79.slots.default;
    var __VLS_79;
    const __VLS_80 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        label: ("生成时间"),
    }));
    const __VLS_82 = __VLS_81({
        label: ("生成时间"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    (__VLS_ctx.formatOptionalTime(__VLS_ctx.scheduler?.generated_at));
    __VLS_85.slots.default;
    var __VLS_85;
    const __VLS_86 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
        label: ("任务数量"),
    }));
    const __VLS_88 = __VLS_87({
        label: ("任务数量"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
    (__VLS_ctx.jobs.length);
    __VLS_91.slots.default;
    var __VLS_91;
    __VLS_37.slots.default;
    var __VLS_37;
}
__VLS_19.slots.default;
var __VLS_19;
const __VLS_92 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    ...{ class: ("jobs-card") },
    shadow: ("never"),
}));
const __VLS_94 = __VLS_93({
    ...{ class: ("jobs-card") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
{
    const { header: __VLS_thisSlot } = __VLS_97.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("job-count") },
    });
    (__VLS_ctx.jobs.length);
}
const __VLS_98 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    data: ((__VLS_ctx.jobs)),
    border: (true),
    stripe: (true),
    emptyText: ("暂无调度任务"),
    ...{ style: ({}) },
}));
const __VLS_100 = __VLS_99({
    data: ((__VLS_ctx.jobs)),
    border: (true),
    stripe: (true),
    emptyText: ("暂无调度任务"),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
const __VLS_104 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    type: ("expand"),
}));
const __VLS_106 = __VLS_105({
    type: ("expand"),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
{
    const { default: __VLS_thisSlot } = __VLS_109.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("job-detail") },
    });
    const __VLS_110 = {}.ElDescriptions;
    /** @type { [typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ] } */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
        column: ((2)),
        border: (true),
    }));
    const __VLS_112 = __VLS_111({
        column: ((2)),
        border: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
    const __VLS_116 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        label: ("任务函数"),
    }));
    const __VLS_118 = __VLS_117({
        label: ("任务函数"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("mono-text") },
    });
    (row.func || "--");
    __VLS_121.slots.default;
    var __VLS_121;
    const __VLS_122 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
        label: ("Trigger"),
    }));
    const __VLS_124 = __VLS_123({
        label: ("Trigger"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    (__VLS_ctx.formatTrigger(row.trigger));
    __VLS_127.slots.default;
    var __VLS_127;
    const __VLS_128 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        label: ("上次计划时间"),
    }));
    const __VLS_130 = __VLS_129({
        label: ("上次计划时间"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    (__VLS_ctx.formatOptionalTime(row.last_run?.scheduled_run_time));
    __VLS_133.slots.default;
    var __VLS_133;
    const __VLS_134 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        label: ("上次开始时间"),
    }));
    const __VLS_136 = __VLS_135({
        label: ("上次开始时间"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
    (__VLS_ctx.formatOptionalTime(row.last_run?.started_at));
    __VLS_139.slots.default;
    var __VLS_139;
    const __VLS_140 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        label: ("上次结束时间"),
    }));
    const __VLS_142 = __VLS_141({
        label: ("上次结束时间"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    (__VLS_ctx.formatOptionalTime(row.last_run?.finished_at));
    __VLS_145.slots.default;
    var __VLS_145;
    const __VLS_146 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
        label: ("上次耗时"),
    }));
    const __VLS_148 = __VLS_147({
        label: ("上次耗时"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    (__VLS_ctx.formatDuration(row.last_run?.duration_ms));
    __VLS_151.slots.default;
    var __VLS_151;
    const __VLS_152 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        label: ("上次消息"),
        span: ((2)),
    }));
    const __VLS_154 = __VLS_153({
        label: ("上次消息"),
        span: ((2)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    (row.last_run?.message || "--");
    __VLS_157.slots.default;
    var __VLS_157;
    const __VLS_158 = {}.ElDescriptionsItem;
    /** @type { [typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ] } */ ;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
        label: ("错误信息"),
        span: ((2)),
    }));
    const __VLS_160 = __VLS_159({
        label: ("错误信息"),
        span: ((2)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_159));
    if (row.last_run?.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: ("error-content") },
        });
        (__VLS_ctx.formatError(row.last_run.error));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_163.slots.default;
    var __VLS_163;
    __VLS_115.slots.default;
    var __VLS_115;
}
__VLS_109.slots.default;
var __VLS_109;
const __VLS_164 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    prop: ("id"),
    label: ("任务 ID"),
    minWidth: ("180"),
    showOverflowTooltip: (true),
}));
const __VLS_166 = __VLS_165({
    prop: ("id"),
    label: ("任务 ID"),
    minWidth: ("180"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
const __VLS_170 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    prop: ("name"),
    label: ("任务名称"),
    minWidth: ("160"),
    showOverflowTooltip: (true),
}));
const __VLS_172 = __VLS_171({
    prop: ("name"),
    label: ("任务名称"),
    minWidth: ("160"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
const __VLS_176 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: ("Trigger"),
    minWidth: ("220"),
    showOverflowTooltip: (true),
}));
const __VLS_178 = __VLS_177({
    label: ("Trigger"),
    minWidth: ("220"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
{
    const { default: __VLS_thisSlot } = __VLS_181.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatTrigger(row.trigger));
}
__VLS_181.slots.default;
var __VLS_181;
const __VLS_182 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    label: ("任务状态"),
    width: ("110"),
}));
const __VLS_184 = __VLS_183({
    label: ("任务状态"),
    width: ("110"),
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
{
    const { default: __VLS_thisSlot } = __VLS_187.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_188 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        type: ((__VLS_ctx.getJobStatusType(row.status))),
    }));
    const __VLS_190 = __VLS_189({
        type: ((__VLS_ctx.getJobStatusType(row.status))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    (row.status || "unknown");
    __VLS_193.slots.default;
    var __VLS_193;
}
__VLS_187.slots.default;
var __VLS_187;
const __VLS_194 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
    label: ("下一次运行"),
    width: ("170"),
}));
const __VLS_196 = __VLS_195({
    label: ("下一次运行"),
    width: ("170"),
}, ...__VLS_functionalComponentArgsRest(__VLS_195));
{
    const { default: __VLS_thisSlot } = __VLS_199.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatOptionalTime(row.next_run_time));
}
__VLS_199.slots.default;
var __VLS_199;
const __VLS_200 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    label: ("上次结果"),
    width: ("110"),
}));
const __VLS_202 = __VLS_201({
    label: ("上次结果"),
    width: ("110"),
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
{
    const { default: __VLS_thisSlot } = __VLS_205.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_206 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
        type: ((__VLS_ctx.getLastRunStatusType(row.last_run?.status))),
    }));
    const __VLS_208 = __VLS_207({
        type: ((__VLS_ctx.getLastRunStatusType(row.last_run?.status))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_207));
    (row.last_run?.status || "无记录");
    __VLS_211.slots.default;
    var __VLS_211;
}
__VLS_205.slots.default;
var __VLS_205;
const __VLS_212 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    label: ("上次开始"),
    width: ("170"),
}));
const __VLS_214 = __VLS_213({
    label: ("上次开始"),
    width: ("170"),
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
{
    const { default: __VLS_thisSlot } = __VLS_217.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatOptionalTime(row.last_run?.started_at));
}
__VLS_217.slots.default;
var __VLS_217;
const __VLS_218 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
    label: ("耗时"),
    width: ("100"),
}));
const __VLS_220 = __VLS_219({
    label: ("耗时"),
    width: ("100"),
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
{
    const { default: __VLS_thisSlot } = __VLS_223.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatDuration(row.last_run?.duration_ms));
}
__VLS_223.slots.default;
var __VLS_223;
const __VLS_224 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    label: ("消息"),
    minWidth: ("180"),
    showOverflowTooltip: (true),
}));
const __VLS_226 = __VLS_225({
    label: ("消息"),
    minWidth: ("180"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
{
    const { default: __VLS_thisSlot } = __VLS_229.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (row.last_run?.message || "--");
}
__VLS_229.slots.default;
var __VLS_229;
__VLS_103.slots.default;
var __VLS_103;
__VLS_97.slots.default;
var __VLS_97;
['scheduler-jobs-page', 'page-header', 'header-actions', 'loaded-time', 'page-alert', 'summary-card', 'card-header', 'jobs-card', 'card-header', 'job-count', 'job-detail', 'mono-text', 'error-content',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatDateTime: formatDateTime,
            loading: loading,
            error: error,
            scheduler: scheduler,
            jobs: jobs,
            lastLoadedAt: lastLoadedAt,
            formatOptionalTime: formatOptionalTime,
            formatDuration: formatDuration,
            formatTrigger: formatTrigger,
            formatError: formatError,
            getJobStatusType: getJobStatusType,
            getLastRunStatusType: getLastRunStatusType,
            fetchSchedulerJobs: fetchSchedulerJobs,
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
