import { ref, computed, nextTick, onUnmounted } from 'vue';
import { CircleCheck, Warning, CircleClose } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
const props = defineProps();
const emit = defineEmits(['update:modelValue', 'success']);
// --- 状态变量 ---
const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});
const batchMode = ref('all');
const reDetectAll = ref(false);
const isDetecting = ref(false);
const isFinished = ref(false);
const currentCount = ref(0);
const totalCount = ref(0);
const logScrollRef = ref(null);
// token 状态
const tokenValue = ref(''); // 明文 token（从后端拿到）
const tokenExpiresIn = ref(0); // 剩余秒数（倒计时）
let tokenTimer = null;
// 统计数据
const summary = ref({ success: 0, skipped: 0, failed: 0 });
const logs = ref([]);
const progressPercent = computed(() => {
    if (totalCount.value === 0)
        return 0;
    return Math.floor((currentCount.value / totalCount.value) * 100);
});
const progressStatus = computed(() => {
    if (isFinished.value)
        return 'success';
    return '';
});
// 计算属性：遮掩 token 只显示前后片段
const maskedToken = computed(() => {
    if (!tokenValue.value)
        return '';
    const t = tokenValue.value;
    if (t.length <= 20)
        return t;
    return `${t.slice(0, 6)}...${t.slice(-6)}`;
});
// 格式化剩余时间 mm:ss
const tokenCountdownText = computed(() => {
    if (!tokenValue.value)
        return '';
    const s = Math.max(0, Math.floor(tokenExpiresIn.value));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `有效期：${mm}分 ${ss}秒`;
});
function startTokenCountdown() {
    // 清除旧计时器
    if (tokenTimer) {
        clearInterval(tokenTimer);
        tokenTimer = null;
    }
    if (tokenExpiresIn.value <= 0)
        return;
    tokenTimer = window.setInterval(() => {
        tokenExpiresIn.value = Math.max(0, tokenExpiresIn.value - 1);
        if (tokenExpiresIn.value <= 0 && tokenTimer) {
            clearInterval(tokenTimer);
            tokenTimer = null;
        }
    }, 1000);
}
function stopTokenCountdown() {
    if (tokenTimer) {
        clearInterval(tokenTimer);
        tokenTimer = null;
    }
}
onUnmounted(() => {
    stopTokenCountdown();
});
// --- 逻辑处理 ---
const handleClose = () => {
    if (isDetecting.value) {
        ElMessageBox.confirm('正在检测中，关闭将中断任务。确认关闭？', '提示', { type: 'warning' })
            .then(() => terminate())
            .catch(() => { });
    }
    else {
        visible.value = false;
    }
};
const terminate = () => {
    isDetecting.value = false;
    visible.value = false;
    // 停止 token 倒计时
    stopTokenCountdown();
    resetTimer();
};
const finalize = () => {
    emit('success');
    visible.value = false;
};
const copyToken = async () => {
    if (!tokenValue.value) {
        ElMessage.warning('当前无可用 token');
        return;
    }
    try {
        await navigator.clipboard.writeText(tokenValue.value);
        ElMessage.success('已复制 access_token（请妥善保管）');
    }
    catch (e) {
        ElMessage.error('复制失败');
    }
};
import { useProgressTimer } from './useProgressTimer'; // 引入上面的逻辑
const { elapsedTime, remainingTime, start: startTimer, update: updateTimer, reset: resetTimer } = useProgressTimer();
const startBatchDetect = async () => {
    isDetecting.value = true;
    isFinished.value = false;
    currentCount.value = 0;
    summary.value = { success: 0, skipped: 0, failed: 0 };
    logs.value = [];
    tokenValue.value = '';
    tokenExpiresIn.value = 0;
    stopTokenCountdown();
    resetTimer();
    startTimer();
    totalCount.value = batchMode.value === 'selected' ? props.selectedIds.length : props.totalFiltered;
    try {
        const auth_token = localStorage.getItem('user-token');
        const filters = props.filters;
        const params = {
            keyword: filters.keyword,
        };
        // 优先判断是否为按年筛选（filters.dateRange 内元素为 number）
        if (filters.dateRange && filters.dateRange.length > 0 && typeof filters.dateRange[0] === 'number') {
            // 传递 years[] 参数给后端（例如 years[]=2023&years[]=2021）
            params.years = filters.dateRange.slice();
        }
        else if (filters.dateRange && filters.dateRange.length === 2) {
            // 连续区间（Date 对象）
            params.start = filters.dateRange[0].toISOString();
            params.end = filters.dateRange[1].toISOString();
        }
        if (filters.sortOrder) {
            params.sort_by = filters.sortBy;
            params.sort_order = filters.sortOrder;
        }
        if (filters.selectedLevel.length > 0) {
            params.levels = filters.selectedLevel;
        }
        if (filters.selectedCategory.length > 0) {
            params.categories = filters.selectedCategory;
        }
        if (filters.affiliation) {
            params.affiliation = filters.affiliation;
        }
        const payload = {
            mode: batchMode.value,
            is_detect: reDetectAll.value,
            filters: params,
            ids: props.selectedIds
        };
        const response = await fetch('/api/wechat/proofread/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth_token}`,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        if (!reader)
            return;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.trim())
                    continue;
                // 解析 SSE 事件类型和数据
                const eventMatch = line.match(/^event: (.*)$/m);
                const dataMatch = line.match(/^data: (.*)$/m);
                if (!dataMatch)
                    continue;
                const rawData = JSON.parse(dataMatch[1]);
                const eventType = eventMatch ? eventMatch[1] : 'message';
                // 处理 SSE event 级别
                if (eventType === 'complete') {
                    isFinished.value = true;
                    isDetecting.value = false;
                    // 停止 token 倒计时
                    stopTokenCountdown();
                    return;
                }
                if (eventType === 'error') {
                    // 后端在 token 发生错误时也会用 error event 推送（包含 token_error）
                    throw new Error(rawData.message || '服务器错误');
                }
                // 处理 token_status（可能后端通过 event: token_status 发送，或通过 data.type === 'token_status'）
                if (eventType === 'token_status' || rawData.type === 'token_status') {
                    // rawData 期望结构: { type: 'token_status', access_token: 'xxx', expires_in: 3600 }
                    tokenValue.value = rawData.access_token || '';
                    tokenExpiresIn.value = parseInt(String(rawData.expires_in || '0'), 10) || 0;
                    startTokenCountdown();
                    // 给用户一个轻量提示
                    ElMessage.info('已获取 access_token，开始任务。');
                    continue;
                }
                if (eventType === 'token_error' || rawData.type === 'token_error') {
                    // 兼容性：若后端把 token 错误当作 message/type 发送
                    throw new Error(rawData.message || '获取 token 失败');
                }
                // 处理 progress 类型数据
                if (rawData.type === 'progress') {
                    currentCount.value = rawData.current;
                    totalCount.value = rawData.total;
                    // 更新时间预测
                    updateTimer(rawData.current, rawData.total);
                    // 更新汇总
                    if (rawData.status === 'success')
                        summary.value.success++;
                    else if (rawData.status === 'skipped')
                        summary.value.skipped++;
                    else if (rawData.status === 'failed')
                        summary.value.failed++;
                    // 添加日志
                    logs.value.push(rawData);
                    // 自动滚动到底部
                    await nextTick();
                    if (logScrollRef.value) {
                        logScrollRef.value.scrollTop = logScrollRef.value.scrollHeight;
                    }
                }
            }
        }
    }
    catch (err) {
        ElMessage.error(`检测中断: ${err.message || err}`);
        isDetecting.value = false;
        stopTokenCountdown();
    }
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['mode-card', 'stat-box', 'stat-box', 'stat-box', 'time-item', 'time-item', 'time-item', 'value', 'stat-box', 'stat-box', 'log-item', 'is-success', 'log-item', 'log-item',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: ((__VLS_ctx.visible)),
    title: ("批量检测文章"),
    width: ("960px"),
    closeOnClickModal: ((false)),
    beforeClose: ((__VLS_ctx.handleClose)),
    destroyOnClose: (true),
    appendToBody: (true),
    ...{ class: ("custom-batch-dialog") },
}));
const __VLS_2 = __VLS_1({
    modelValue: ((__VLS_ctx.visible)),
    title: ("批量检测文章"),
    width: ("960px"),
    closeOnClickModal: ((false)),
    beforeClose: ((__VLS_ctx.handleClose)),
    destroyOnClose: (true),
    appendToBody: (true),
    ...{ class: ("custom-batch-dialog") },
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
if (!__VLS_ctx.isDetecting && !__VLS_ctx.isFinished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("config-section") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("config-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    const __VLS_7 = {}.ElSwitch;
    /** @type { [typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ] } */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        modelValue: ((__VLS_ctx.reDetectAll)),
        activeText: ("包含已检测过的文章"),
        inactiveText: ("仅检测未检测项"),
    }));
    const __VLS_9 = __VLS_8({
        modelValue: ((__VLS_ctx.reDetectAll)),
        activeText: ("包含已检测过的文章"),
        inactiveText: ("仅检测未检测项"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    const __VLS_13 = {}.ElRadioGroup;
    /** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
        modelValue: ((__VLS_ctx.batchMode)),
        ...{ class: ("mode-group") },
    }));
    const __VLS_15 = __VLS_14({
        modelValue: ((__VLS_ctx.batchMode)),
        ...{ class: ("mode-group") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((!__VLS_ctx.isDetecting && !__VLS_ctx.isFinished)))
                    return;
                __VLS_ctx.batchMode = 'all';
            } },
        ...{ class: ("mode-card") },
        ...{ class: (({ active: __VLS_ctx.batchMode === 'all' })) },
    });
    const __VLS_19 = {}.ElRadio;
    /** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        label: ("all"),
        size: ("large"),
    }));
    const __VLS_21 = __VLS_20({
        label: ("all"),
        size: ("large"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("mode-title") },
    });
    __VLS_24.slots.default;
    var __VLS_24;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mode-desc") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.totalFiltered);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((!__VLS_ctx.isDetecting && !__VLS_ctx.isFinished)))
                    return;
                __VLS_ctx.batchMode = 'selected';
            } },
        ...{ class: ("mode-card") },
        ...{ class: (({ active: __VLS_ctx.batchMode === 'selected' })) },
    });
    const __VLS_25 = {}.ElRadio;
    /** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
        label: ("selected"),
        size: ("large"),
    }));
    const __VLS_27 = __VLS_26({
        label: ("selected"),
        size: ("large"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("mode-title") },
    });
    __VLS_30.slots.default;
    var __VLS_30;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mode-desc") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedIds.length);
    __VLS_18.slots.default;
    var __VLS_18;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("execution-container") },
    });
    if (__VLS_ctx.tokenValue) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("token-box") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("token-left") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("token-label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("token-value") },
        });
        (__VLS_ctx.maskedToken);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("token-right") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("token-ttl") },
        });
        (__VLS_ctx.tokenCountdownText);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("status-summary") },
    });
    const __VLS_31 = {}.ElRow;
    /** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        gutter: ((20)),
    }));
    const __VLS_33 = __VLS_32({
        gutter: ((20)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    const __VLS_37 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
        span: ((6)),
    }));
    const __VLS_39 = __VLS_38({
        span: ((6)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-box") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.totalCount);
    __VLS_42.slots.default;
    var __VLS_42;
    const __VLS_43 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        span: ((6)),
    }));
    const __VLS_45 = __VLS_44({
        span: ((6)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-box is-success") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.summary.success);
    __VLS_48.slots.default;
    var __VLS_48;
    const __VLS_49 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
        span: ((6)),
    }));
    const __VLS_51 = __VLS_50({
        span: ((6)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-box is-warning") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.summary.skipped);
    __VLS_54.slots.default;
    var __VLS_54;
    const __VLS_55 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        span: ((6)),
    }));
    const __VLS_57 = __VLS_56({
        span: ((6)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-box is-danger") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.summary.failed);
    __VLS_60.slots.default;
    var __VLS_60;
    __VLS_36.slots.default;
    var __VLS_36;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("execution-progress-wrapper") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("time-stats-bar") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("time-item") },
    });
    const __VLS_61 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({}));
    const __VLS_63 = __VLS_62({}, ...__VLS_functionalComponentArgsRest(__VLS_62));
    const __VLS_67 = {}.Timer;
    /** @type { [typeof __VLS_components.Timer, ] } */ ;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({}));
    const __VLS_69 = __VLS_68({}, ...__VLS_functionalComponentArgsRest(__VLS_68));
    __VLS_66.slots.default;
    var __VLS_66;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.elapsedTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("time-item") },
    });
    const __VLS_73 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({}));
    const __VLS_75 = __VLS_74({}, ...__VLS_functionalComponentArgsRest(__VLS_74));
    const __VLS_79 = {}.Clock;
    /** @type { [typeof __VLS_components.Clock, ] } */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({}));
    const __VLS_81 = __VLS_80({}, ...__VLS_functionalComponentArgsRest(__VLS_80));
    __VLS_78.slots.default;
    var __VLS_78;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("value highlight") },
    });
    (__VLS_ctx.remainingTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("main-progress") },
    });
    const __VLS_85 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
        percentage: ((__VLS_ctx.progressPercent)),
        strokeWidth: ((24)),
        status: ((__VLS_ctx.progressStatus)),
        striped: (true),
        stripedFlow: (true),
    }));
    const __VLS_87 = __VLS_86({
        percentage: ((__VLS_ctx.progressPercent)),
        strokeWidth: ((24)),
        status: ((__VLS_ctx.progressStatus)),
        striped: (true),
        stripedFlow: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("inner-progress-text") },
    });
    (__VLS_ctx.progressPercent);
    __VLS_90.slots.default;
    var __VLS_90;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-info-footer") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("count-text") },
    });
    (__VLS_ctx.currentCount);
    (__VLS_ctx.totalCount);
    if (__VLS_ctx.isDetecting) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("speed-text") },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("log-container") },
        ref: ("logScrollRef"),
    });
    // @ts-ignore navigation for `const logScrollRef = ref()`
    /** @type { typeof __VLS_ctx.logScrollRef } */ ;
    for (const [log, index] of __VLS_getVForSourceType((__VLS_ctx.logs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((index)),
            ...{ class: ("log-item") },
            ...{ class: ((`is-${log.status}`)) },
        });
        if (log.status === 'success') {
            const __VLS_91 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({}));
            const __VLS_93 = __VLS_92({}, ...__VLS_functionalComponentArgsRest(__VLS_92));
            const __VLS_97 = {}.CircleCheck;
            /** @type { [typeof __VLS_components.CircleCheck, ] } */ ;
            // @ts-ignore
            const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({}));
            const __VLS_99 = __VLS_98({}, ...__VLS_functionalComponentArgsRest(__VLS_98));
            __VLS_96.slots.default;
            var __VLS_96;
        }
        else if (log.status === 'skipped') {
            const __VLS_103 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({}));
            const __VLS_105 = __VLS_104({}, ...__VLS_functionalComponentArgsRest(__VLS_104));
            const __VLS_109 = {}.Warning;
            /** @type { [typeof __VLS_components.Warning, ] } */ ;
            // @ts-ignore
            const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({}));
            const __VLS_111 = __VLS_110({}, ...__VLS_functionalComponentArgsRest(__VLS_110));
            __VLS_108.slots.default;
            var __VLS_108;
        }
        else if (log.status === 'failed') {
            const __VLS_115 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({}));
            const __VLS_117 = __VLS_116({}, ...__VLS_functionalComponentArgsRest(__VLS_116));
            const __VLS_121 = {}.CircleClose;
            /** @type { [typeof __VLS_components.CircleClose, ] } */ ;
            // @ts-ignore
            const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({}));
            const __VLS_123 = __VLS_122({}, ...__VLS_functionalComponentArgsRest(__VLS_122));
            __VLS_120.slots.default;
            var __VLS_120;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("log-id") },
        });
        (log.article_id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("log-msg") },
        });
        if (log.status === 'success') {
            (log.mistakes);
        }
        else if (log.status === 'skipped') {
            (log.reason);
        }
        else if (log.status === 'failed') {
            (log.reason);
        }
    }
}
{
    const { footer: __VLS_thisSlot } = __VLS_5.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    if (!__VLS_ctx.isFinished) {
        const __VLS_127 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
            ...{ 'onClick': {} },
            disabled: ((__VLS_ctx.isDetecting)),
        }));
        const __VLS_129 = __VLS_128({
            ...{ 'onClick': {} },
            disabled: ((__VLS_ctx.isDetecting)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_128));
        let __VLS_133;
        const __VLS_134 = {
            onClick: (__VLS_ctx.handleClose)
        };
        let __VLS_130;
        let __VLS_131;
        __VLS_132.slots.default;
        var __VLS_132;
    }
    if (!__VLS_ctx.isFinished) {
        const __VLS_135 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
            ...{ 'onClick': {} },
            type: ("primary"),
            loading: ((__VLS_ctx.isDetecting)),
            disabled: (((__VLS_ctx.batchMode === 'selected' && __VLS_ctx.selectedIds.length === 0))),
        }));
        const __VLS_137 = __VLS_136({
            ...{ 'onClick': {} },
            type: ("primary"),
            loading: ((__VLS_ctx.isDetecting)),
            disabled: (((__VLS_ctx.batchMode === 'selected' && __VLS_ctx.selectedIds.length === 0))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
        let __VLS_141;
        const __VLS_142 = {
            onClick: (__VLS_ctx.startBatchDetect)
        };
        let __VLS_138;
        let __VLS_139;
        __VLS_140.slots.default;
        var __VLS_140;
    }
    else {
        const __VLS_143 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
            ...{ 'onClick': {} },
            type: ("primary"),
        }));
        const __VLS_145 = __VLS_144({
            ...{ 'onClick': {} },
            type: ("primary"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_144));
        let __VLS_149;
        const __VLS_150 = {
            onClick: (__VLS_ctx.finalize)
        };
        let __VLS_146;
        let __VLS_147;
        __VLS_148.slots.default;
        var __VLS_148;
    }
}
__VLS_5.slots.default;
var __VLS_5;
['custom-batch-dialog', 'custom-dialog-header', 'header-left', 'title-text', 'config-section', 'config-item', 'label', 'mode-group', 'mode-card', 'active', 'mode-title', 'mode-desc', 'mode-card', 'active', 'mode-title', 'mode-desc', 'execution-container', 'token-box', 'token-left', 'token-label', 'token-value', 'token-right', 'token-ttl', 'status-summary', 'stat-box', 'stat-label', 'stat-value', 'stat-box', 'is-success', 'stat-label', 'stat-value', 'stat-box', 'is-warning', 'stat-label', 'stat-value', 'stat-box', 'is-danger', 'stat-label', 'stat-value', 'execution-progress-wrapper', 'time-stats-bar', 'time-item', 'label', 'value', 'time-item', 'label', 'value', 'highlight', 'main-progress', 'inner-progress-text', 'progress-info-footer', 'count-text', 'speed-text', 'log-container', 'log-item', 'log-id', 'log-msg', 'dialog-footer',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CircleCheck: CircleCheck,
            Warning: Warning,
            CircleClose: CircleClose,
            visible: visible,
            batchMode: batchMode,
            reDetectAll: reDetectAll,
            isDetecting: isDetecting,
            isFinished: isFinished,
            currentCount: currentCount,
            totalCount: totalCount,
            logScrollRef: logScrollRef,
            tokenValue: tokenValue,
            summary: summary,
            logs: logs,
            progressPercent: progressPercent,
            progressStatus: progressStatus,
            maskedToken: maskedToken,
            tokenCountdownText: tokenCountdownText,
            handleClose: handleClose,
            finalize: finalize,
            elapsedTime: elapsedTime,
            remainingTime: remainingTime,
            startBatchDetect: startBatchDetect,
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
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
