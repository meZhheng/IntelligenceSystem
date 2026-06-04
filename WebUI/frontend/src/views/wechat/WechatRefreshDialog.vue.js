import { onMounted, ref, computed, watch, nextTick, reactive, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete, Loading, DataLine, Histogram } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useProgressTimer } from './useProgressTimer';
const { elapsedTime, remainingTime, start: startTimer, update: updateTimer, reset: resetTimer } = useProgressTimer();
const props = withDefaults(defineProps(), {
    affiliationName: '',
    initialStart: null,
    initialEnd: null
});
const emit = defineEmits(['update:visible', 'finished']);
/**
 * Local reactive state
 */
const visibleLocal = ref(props.visible);
watch(() => props.visible, async (v) => {
    visibleLocal.value = v;
    if (v) {
        resetWhenOpen();
        // 确保 Dialog 动画完成且 DOM 已挂载
        await nextTick();
        // 给一点点延迟确保布局计算完成
        setTimeout(() => {
            initChart();
        }, 100);
    }
});
watch(visibleLocal, (v) => {
    emit('update:visible', v);
    if (!v) {
        // 对话框关闭时，停止所有活动
        abortCrawl();
    }
});
const formattedAffiliation = computed(() => {
    return `${props.affiliationName}`;
});
const rangeStart = ref(null);
const rangeEnd = ref(null);
const disabledDate = (time) => {
    const min = new Date('2018-12-30').getTime();
    const max = new Date().getTime();
    return time.getTime() < min || time.getTime() > max;
};
function toDate(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? new Date(value) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function startOfDay(d) {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t;
}
function endOfDay(d) {
    const t = new Date(d);
    t.setHours(23, 59, 59, 999);
    return t;
}
function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function clearSyncRange() {
    rangeStart.value = null;
    rangeEnd.value = null;
}
// crawling / logs / progress
const isCrawling = ref(false);
const startLoading = ref(false);
const abortController = ref(null);
const crawlingFinished = ref(false); // 标记爬取是否最终完成
// progress & phase info
const progress = ref(0); // 0-100, 单一进度条（由后端的 json.progress 控制）
const currentPhase = ref(''); // 'list' | 'content' | ''
const currentStatus = ref(''); // 'start' | 'fetching' | 'saved' | 'completed' | 'error' | 'skipped'
const currentPhaseMessage = ref(''); // 可选的更详细文本（从后端 message 取得）
// logs: 每项 { time, phase, status, message }
const logs = ref([]);
// autoscroll control
const logContainerRef = ref(null);
const autoScrollEnabled = ref(true);
// Stats for chart and display
const stats = reactive({
    articlesCrawled: 0,
    articlesSkipped: 0,
    errorsOccurred: 0,
    currentRate: 0,
    lastArticleTime: 0, // 用于计算速率
});
const currentRate = ref(0);
// Reconnection logic
const isReconnecting = ref(false);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = 3;
const reconnectTimeout = ref(null); // Used to hold setTimeout ID
// ECharts
const chartContainer = ref(null);
let myChart = null;
const chartData = reactive({
    times: [],
    crawledCounts: [],
    errorCounts: [],
    rateData: [], // 每秒抓取量
});
// Custom Progress Bar Colors
const customProgressColors = [
    { color: '#f56c6c', percentage: 20 },
    { color: '#e6a23c', percentage: 40 },
    { color: '#5cb87a', percentage: 60 },
    { color: '#1989fa', percentage: 80 },
    { color: '#6f7ad3', percentage: 100 },
];
// ECharts initialization and update
const initChart = () => {
    if (chartContainer.value) {
        // 如果已经存在实例，先销毁，防止多次初始化
        if (myChart) {
            myChart.dispose();
        }
        console.log("initialize chart");
        myChart = echarts.init(chartContainer.value);
        updateChart();
        // 强制触发一次大小调整
        nextTick(() => {
            myChart?.resize();
        });
    }
    else {
        console.warn("Chart container not found!");
    }
};
const updateChart = () => {
    if (!myChart)
        return;
    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                let res = params[0].name + '<br/>';
                params.forEach(item => {
                    res += `${item.marker}${item.seriesName}: ${item.value}<br/>`;
                });
                return res;
            }
        },
        legend: {
            data: ['已采集文章', '错误数', '采集速率'],
            textStyle: {
                color: '#ccc'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: chartData.times,
            axisLabel: {
                color: '#aaa',
                formatter: (value) => value.split(' ')[1] || value // 只显示时间部分
            }
        },
        yAxis: [
            {
                type: 'value',
                name: '数量',
                minInterval: 1, // 确保Y轴是整数
                axisLabel: {
                    color: '#aaa'
                },
                splitLine: {
                    lineStyle: {
                        color: '#333'
                    }
                }
            },
            {
                type: 'value',
                name: '速率',
                min: 0,
                axisLabel: {
                    color: '#aaa',
                    formatter: '{value} 条/秒'
                },
                splitLine: {
                    show: false // 速率轴不显示分割线
                }
            }
        ],
        series: [
            {
                name: '已采集文章',
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    width: 2,
                    color: '#4ec9b0'
                },
                areaStyle: {
                    opacity: 0.2,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                            offset: 0,
                            color: '#4ec9b0'
                        }, {
                            offset: 1,
                            color: 'transparent'
                        }])
                },
                data: chartData.crawledCounts,
                yAxisIndex: 0
            },
            {
                name: '错误数',
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    width: 2,
                    color: '#ff5f56'
                },
                areaStyle: {
                    opacity: 0.1,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                            offset: 0,
                            color: '#ff5f56'
                        }, {
                            offset: 1,
                            color: 'transparent'
                        }])
                },
                data: chartData.errorCounts,
                yAxisIndex: 0
            },
            {
                name: '采集速率',
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    width: 2,
                    color: '#569cd6'
                },
                data: chartData.rateData,
                yAxisIndex: 1
            }
        ],
        backgroundColor: 'transparent'
    };
    myChart.setOption(option);
};
// Update chart data
const addChartDataPoint = () => {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const crawled = stats.articlesCrawled;
    const errors = stats.errorsOccurred;
    const rate = currentRate.value;
    chartData.times.push(time);
    chartData.crawledCounts.push(crawled);
    chartData.errorCounts.push(errors);
    chartData.rateData.push(rate);
    // Keep chart data length reasonable (e.g., last 60 points)
    if (chartData.times.length > 60) {
        chartData.times.shift();
        chartData.crawledCounts.shift();
        chartData.errorCounts.shift();
        chartData.rateData.shift();
    }
    updateChart();
};
let chartUpdateInterval = null;
const startChartUpdates = () => {
    if (chartUpdateInterval)
        clearInterval(chartUpdateInterval);
    chartUpdateInterval = window.setInterval(addChartDataPoint, 3000); // 每3秒更新一次图表
};
const stopChartUpdates = () => {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
        chartUpdateInterval = null;
    }
};
onMounted(() => {
    initChart();
    window.addEventListener('resize', () => myChart?.resize());
});
onUnmounted(() => {
    stopChartUpdates();
    if (myChart) {
        myChart.dispose();
        myChart = null;
    }
    window.removeEventListener('resize', () => myChart?.resize());
});
// helpers for display
function nowTimeString() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}
// append log (structured)
function appendLogEntry({ phase = '', status = '', message = '', raw = null }) {
    const entry = {
        time: nowTimeString(),
        phase: phase || currentPhase.value || '',
        status: status || currentStatus.value || 'info',
        message: message || (raw ? JSON.stringify(raw) : ''),
    };
    logs.value.push(entry);
    // 保持长度
    if (logs.value.length > 2000)
        logs.value.splice(0, logs.value.length - 2000);
    // 自动滚动
    if (autoScrollEnabled.value) {
        nextTick(() => {
            try {
                const el = logContainerRef.value;
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            }
            catch (e) { /* ignore */ }
        });
    }
}
// clear logs
function clearLogs() {
    logs.value = [];
}
// mouse handlers for log area
function onLogMouseEnter() {
    autoScrollEnabled.value = false;
}
function onLogMouseLeave() {
    autoScrollEnabled.value = true;
    nextTick(() => {
        try {
            const el = logContainerRef.value;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        }
        catch (e) { }
    });
}
// map phase to label
function phaseLabel(phase) {
    if (phase === 'list')
        return '文章列表';
    if (phase === 'content')
        return '正文抓取';
    if (phase === 'validate')
        return '验证配置';
    if (phase === 'init')
        return '准备阶段';
    return phase || '通用通知';
}
// user-facing status label (main header above progress bar)
const statusLabel = computed(() => {
    const phase = currentPhase.value;
    const status = currentStatus.value;
    if (!phase)
        return isReconnecting.value ? '正在重试...' : (isCrawling.value ? '准备爬取...' : (crawlingFinished.value ? '采集完成' : '就绪'));
    const phaseName = phaseLabel(phase);
    // human readable
    if (status === 'start')
        return `${phaseName}：开始`;
    if (status === 'fetching')
        return `${phaseName}：处理中`;
    if (status === 'saved')
        return `${phaseName}：已保存`;
    if (status === 'skipped')
        return `${phaseName}：已跳过`;
    if (status === 'completed')
        return `${phaseName}：已完成`;
    if (status === 'error')
        return `${phaseName}：发生错误`;
    if (status === 'no_new')
        return `${phaseName}：无新数据`;
    return `${phaseName}：${status}`;
});
const statusSubLabel = computed(() => {
    if (currentPhaseMessage.value)
        return currentPhaseMessage.value;
    if (!currentPhase.value)
        return '';
    return `阶段: ${phaseLabel(currentPhase.value)} · 状态: ${currentStatus.value || 'unknown'}`;
});
// helper to safely parse JSON line
function tryParseJSONLine(line) {
    try {
        return JSON.parse(line);
    }
    catch (e) {
        return null;
    }
}
// Process streamed data
function processStreamedData(parsed) {
    const { type, phase, status, progress: p, message } = parsed;
    if (phase)
        currentPhase.value = phase;
    if (status)
        currentStatus.value = status;
    if (parsed.message)
        currentPhaseMessage.value = parsed.message;
    if (typeof p === 'number') {
        progress.value = Math.min(100, Math.max(0, p));
        if (phase === 'content') {
            updateTimer(progress.value, 100);
        }
    }
    // Update statistics
    if (status === 'saved') {
        stats.articlesCrawled++;
        const now = Date.now();
        if (stats.lastArticleTime > 0) {
            currentRate.value = 1 / ((now - stats.lastArticleTime) / 1000);
        }
        stats.lastArticleTime = now;
    }
    else if (status === 'skipped') {
        stats.articlesSkipped++;
    }
    else if (status === 'error') {
        stats.errorsOccurred++;
    }
    // append structured log entry
    if (type === 'data' || type === 'info') {
        appendLogEntry({ phase, status: status || 'info', message: message || JSON.stringify(parsed), raw: parsed });
    }
    else if (type === 'error') {
        appendLogEntry({ phase, status: 'error', message: message || JSON.stringify(parsed), raw: parsed });
    }
    else {
        appendLogEntry({ phase, status: status || 'info', message: message || JSON.stringify(parsed), raw: parsed });
    }
}
/**
 * Start crawling
 */
async function startCrawl(isRetry = false) {
    if (isCrawling.value && !isRetry)
        return; // 避免重复点击
    const hasStart = !!rangeStart.value;
    const hasEnd = !!rangeEnd.value;
    if (hasStart !== hasEnd) {
        ElMessage.warning('请选择完整的开始和结束日期');
        return;
    }
    if (rangeStart.value && rangeEnd.value && rangeStart.value.getTime() > rangeEnd.value.getTime()) {
        const start = rangeStart.value;
        rangeStart.value = rangeEnd.value;
        rangeEnd.value = start;
    }
    if (!isRetry) {
        // Reset UI only if not a retry
        progress.value = 0;
        logs.value = [];
        stats.articlesCrawled = 0;
        stats.articlesSkipped = 0;
        stats.errorsOccurred = 0;
        stats.lastArticleTime = 0;
        currentRate.value = 0;
        currentPhase.value = '';
        currentStatus.value = '';
        currentPhaseMessage.value = '';
        crawlingFinished.value = false;
        // Clear chart data
        chartData.times = [];
        chartData.crawledCounts = [];
        chartData.errorCounts = [];
        chartData.rateData = [];
        updateChart();
        resetTimer(); // 重置时间
        startTimer(); // 开始计时
    }
    isCrawling.value = true;
    startLoading.value = true;
    if (reconnectTimeout.value) {
        clearTimeout(reconnectTimeout.value);
        reconnectTimeout.value = null;
    }
    abortController.value = new AbortController();
    const signal = abortController.value.signal;
    appendLogEntry({ phase: 'init', message: isRetry ? `尝试第 ${reconnectAttempts.value} 次重连并恢复爬取...` : '开始请求后端，准备爬取...' });
    if (!isRetry) {
        appendLogEntry({
            phase: 'init',
            message: rangeStart.value && rangeEnd.value
                ? `同步范围：${formatDate(rangeStart.value)} 至 ${formatDate(rangeEnd.value)}`
                : '同步范围：全部历史文章'
        });
    }
    startChartUpdates();
    const body = {
        fakeid: props.affiliationId,
        token: props.accountConfig.token,
        fingerprint: props.accountConfig.fingerprint,
        cookie: props.accountConfig.cookie
    };
    if (rangeStart.value && rangeEnd.value) {
        body.start = startOfDay(rangeStart.value).toISOString();
        body.end = endOfDay(rangeEnd.value).toISOString();
    }
    try {
        const auth_token = localStorage.getItem('user-token') || '';
        const response = await fetch('/api/wechat/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth_token ? `Bearer ${auth_token}` : '',
            },
            body: JSON.stringify(body),
            signal,
        });
        if (!response.ok) {
            let errMsg = `请求失败 (HTTP ${response.status})`;
            try {
                const errData = await response.json();
                errMsg = errData.message || errMsg;
            }
            catch (_) { }
            const isRangeParamError = [400, 422].includes(response.status) && /start|end|range|date|time/i.test(errMsg);
            if (isRangeParamError) {
                errMsg = '后端暂不支持或拒绝了时间范围参数，请按约定的 /api/wechat/refresh 接口协议更新后端。';
            }
            appendLogEntry({ status: 'error', message: errMsg });
            ElMessage.error(errMsg);
            if (isRangeParamError) {
                stopChartUpdates();
                resetTimer();
                return;
            }
            handleCrawlError(new Error(errMsg)); // Trigger reconnection attempt
            return;
        }
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            // 非流式，直接返回 JSON
            const data = await response.json();
            if (data.status === 'no_new') {
                appendLogEntry({ status: 'info', message: '返回：公众号没有新文章' });
                ElMessage.success('公众号文章更新成功（无新文章）');
            }
            else if (data.status === 'locked') {
                appendLogEntry({ status: 'warning', message: '返回：已有任务在执行，操作被拒绝' });
                ElMessage.warning(data.message || '已有任务在执行，请稍后再试');
            }
            else {
                appendLogEntry({ status: 'info', message: '返回 JSON：' + (data.message || JSON.stringify(data)) });
                ElMessage.info(data.message || '操作完成');
            }
            progress.value = 100;
            crawlingFinished.value = true;
            stopChartUpdates(); // 停止图表更新
        }
        else if (response.body) {
            // 流式处理（按行 JSON）
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            appendLogEntry({ message: '开始读取流式响应...' });
            while (isCrawling.value) { // Keep trying while crawling is active
                try {
                    const { value, done } = await reader.read();
                    if (done) {
                        appendLogEntry({ message: '流式响应结束 (正常关闭)' });
                        break; // End of stream
                    }
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (!line.trim())
                            continue;
                        const parsed = tryParseJSONLine(line);
                        if (!parsed) {
                            appendLogEntry({ status: 'error', message: `[PARSE-FAIL] ${line}` });
                            continue;
                        }
                        isReconnecting.value = false;
                        crawlingFinished.value = false;
                        reconnectAttempts.value = 0;
                        processStreamedData(parsed);
                    }
                }
                catch (readError) {
                    if (readError.name === 'AbortError') {
                        appendLogEntry({ status: 'info', message: '流式读取已取消 (Abort)' });
                        break;
                    }
                    appendLogEntry({ status: 'error', message: `[流式读取错误] ${readError?.message || String(readError)}` });
                    handleCrawlError(readError); // Handle connection error, might try reconnect
                    return; // Exit loop and function to handle reconnection
                }
            }
            // 处理剩余 buffer（最后一行）
            if (buffer.trim()) {
                const last = tryParseJSONLine(buffer);
                if (last) {
                    processStreamedData(last);
                }
                else {
                    appendLogEntry({ status: 'error', message: `[LEFTOVER-PARSE-FAIL] ${buffer}` });
                }
            }
            if (progress.value == 100) {
                ElMessage.success('公众号文章更新操作完成');
                crawlingFinished.value = true;
            }
            stopChartUpdates(); // 停止图表更新
            resetTimer();
        }
        else {
            appendLogEntry({ status: 'error', message: '不支持的响应格式' });
            ElMessage.error('❌ 不支持的响应格式');
        }
    }
    catch (error) {
        if (error && error.name === 'AbortError') {
            appendLogEntry({ status: 'info', message: '已取消爬取 (Abort)' });
            ElMessage.info('已取消爬取');
        }
        else {
            appendLogEntry({ status: 'error', message: '[异常] ' + (error?.message || String(error)) });
            ElMessage.error('加载失败：' + (error?.message || '未知错误'));
            handleCrawlError(error); // Trigger reconnection attempt
        }
    }
    finally {
        if (!isReconnecting.value) { // If not in reconnection process
            isCrawling.value = false;
            startLoading.value = false;
            abortController.value = null;
            currentRate.value = 0; // Reset rate
        }
        // 通知父组件操作完成（可选，父可据此刷新列表）
        emit('finished', { affiliationId: props.affiliationId, success: progress.value >= 100 });
    }
}
// Handle errors during crawl, trigger reconnection
function handleCrawlError(error) {
    stopChartUpdates(); // 停止图表更新
    isReconnecting.value = true;
    if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++;
        appendLogEntry({
            status: 'warning',
            message: `连接中断，将在 ${60} 秒后尝试重连...`
        });
        reconnectTimeout.value = window.setTimeout(async () => {
            await startCrawl(true); // Attempt to restart the crawl
        }, reconnectAttempts.value * 36000); // Exponential backoff for reconnection
    }
    else if (reconnectAttempts.value >= maxReconnectAttempts) {
        appendLogEntry({ status: 'error', message: `达到最大重连次数 (${maxReconnectAttempts})，放弃重连。` });
        ElMessage.error('连接已断开，无法自动恢复。请检查网络或稍后手动重试。');
        isCrawling.value = false;
        startLoading.value = false;
        isReconnecting.value = false;
        crawlingFinished.value = false; // If it failed, it's not finished
        reconnectAttempts.value = 0;
    }
}
// Abort crawl
function abortCrawl() {
    if (abortController.value) {
        abortController.value.abort();
    }
    if (reconnectTimeout.value) {
        clearTimeout(reconnectTimeout.value);
        reconnectTimeout.value = null;
    }
    isCrawling.value = false;
    startLoading.value = false;
    isReconnecting.value = false;
    crawlingFinished.value = false; // If it failed, it's not finished
    reconnectAttempts.value = 0;
    stopChartUpdates();
    resetTimer();
    appendLogEntry({ status: 'info', message: '已中止任务。' });
    ElMessage.info('已中止任务。');
}
/**
 * reset when dialog opens
 */
function resetWhenOpen() {
    progress.value = 0;
    logs.value = [];
    rangeStart.value = toDate(props.initialStart);
    rangeEnd.value = toDate(props.initialEnd);
    isCrawling.value = false;
    startLoading.value = false;
    crawlingFinished.value = false;
    isReconnecting.value = false;
    reconnectAttempts.value = 0;
    stats.articlesCrawled = 0;
    stats.articlesSkipped = 0;
    stats.errorsOccurred = 0;
    stats.lastArticleTime = 0;
    currentRate.value = 0;
    stopChartUpdates();
    // Clear chart data
    chartData.times = [];
    chartData.crawledCounts = [];
    chartData.errorCounts = [];
    chartData.rateData = [];
    updateChart();
}
/**
 * 关闭对话框
 */
function handleClose() {
    if (isCrawling.value || isReconnecting.value) {
        ElMessage.warning('当前正在爬取或尝试重连，请先停止任务或等待完成后再关闭');
        return;
    }
    visibleLocal.value = false;
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    affiliationName: '',
    initialStart: null,
    initialEnd: null
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['sync-range', 'engine-status', 'engine-status', 'engine-status', 'is-running', 'dot', 'is-reconnecting', 'dot', 'is-running', 'dot', 'is-reconnecting', 'dot', 'stat-item', 'stat-item', 'val', 'stat-item', 'val', 'stat-item', 'val', 'stat-item', 'window-dots', 'dot', 'dot', 'dot', 'dot', 'log-message', 'log-message', 'is-reconnecting', 'dot',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.visibleLocal)),
    title: ("公众号数据采集引擎"),
    width: ("1280px"),
    ...{ class: ("crawler-dialog") },
    closeOnClickModal: ((false)),
    destroyOnClose: ((true)),
    showClose: ((false)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.visibleLocal)),
    title: ("公众号数据采集引擎"),
    width: ("1280px"),
    ...{ class: ("crawler-dialog") },
    closeOnClickModal: ((false)),
    destroyOnClose: ((true)),
    showClose: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
let __VLS_7;
const __VLS_8 = {
    onClose: (__VLS_ctx.handleClose)
};
let __VLS_3;
let __VLS_4;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-right") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("engine-status") },
        ...{ class: (({ 'is-running': __VLS_ctx.isCrawling, 'is-reconnecting': __VLS_ctx.isReconnecting })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("dot") },
    });
    (__VLS_ctx.isReconnecting ? '连接断开，尝试重连...' : (__VLS_ctx.isCrawling ? '引擎运行中' : '引擎就绪'));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header-status") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("target-info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
const __VLS_9 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    effect: ("dark"),
    type: ("info"),
    ...{ class: ("target-tag") },
}));
const __VLS_11 = __VLS_10({
    effect: ("dark"),
    type: ("info"),
    ...{ class: ("target-tag") },
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
(__VLS_ctx.formattedAffiliation);
__VLS_14.slots.default;
var __VLS_14;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("sync-range") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
const __VLS_15 = {}.ElDatePicker;
/** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    modelValue: ((__VLS_ctx.rangeStart)),
    type: ("date"),
    placeholder: ("开始日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
    disabled: ((__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting)),
}));
const __VLS_17 = __VLS_16({
    modelValue: ((__VLS_ctx.rangeStart)),
    type: ("date"),
    placeholder: ("开始日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
    disabled: ((__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting)),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("date-sep") },
});
const __VLS_21 = {}.ElDatePicker;
/** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    modelValue: ((__VLS_ctx.rangeEnd)),
    type: ("date"),
    placeholder: ("结束日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
    disabled: ((__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting)),
}));
const __VLS_23 = __VLS_22({
    modelValue: ((__VLS_ctx.rangeEnd)),
    type: ("date"),
    placeholder: ("结束日期"),
    disabledDate: ((__VLS_ctx.disabledDate)),
    format: ("YYYY-MM-DD"),
    clearable: (true),
    disabled: ((__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting)),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
const __VLS_27 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    ...{ 'onClick': {} },
    link: (true),
    disabled: ((__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting)),
}));
const __VLS_29 = __VLS_28({
    ...{ 'onClick': {} },
    link: (true),
    disabled: ((__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting)),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
let __VLS_33;
const __VLS_34 = {
    onClick: (__VLS_ctx.clearSyncRange)
};
let __VLS_30;
let __VLS_31;
__VLS_32.slots.default;
var __VLS_32;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stats-group") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item time-stat") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("val monospace") },
});
(__VLS_ctx.elapsedTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("lab") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("divider") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item time-stat") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("val monospace highlight") },
});
(__VLS_ctx.remainingTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("lab") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("divider") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("val success") },
});
(__VLS_ctx.stats.articlesCrawled);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("lab") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("divider") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stat-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("val error") },
});
(__VLS_ctx.stats.errorsOccurred);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("lab") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("progress-section") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("progress-info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("current-task") },
});
(__VLS_ctx.statusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("sub-task") },
});
(__VLS_ctx.statusSubLabel);
const __VLS_35 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    percentage: ((__VLS_ctx.progress)),
    strokeWidth: ((16)),
    textInside: ((true)),
    color: ((__VLS_ctx.customProgressColors)),
    striped: (true),
    stripedFlow: ((__VLS_ctx.isCrawling)),
}));
const __VLS_37 = __VLS_36({
    percentage: ((__VLS_ctx.progress)),
    strokeWidth: ((16)),
    textInside: ((true)),
    color: ((__VLS_ctx.customProgressColors)),
    striped: (true),
    stripedFlow: ((__VLS_ctx.isCrawling)),
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("main-content-layout") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("terminal-wrapper") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("terminal-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("window-dots") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("dot red") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("dot yellow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("dot green") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("terminal-title") },
});
(props.affiliationId);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("terminal-actions") },
});
const __VLS_41 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    ...{ 'onClick': {} },
    link: (true),
}));
const __VLS_43 = __VLS_42({
    ...{ 'onClick': {} },
    link: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
let __VLS_47;
const __VLS_48 = {
    onClick: (__VLS_ctx.clearLogs)
};
let __VLS_44;
let __VLS_45;
const __VLS_49 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({}));
const __VLS_51 = __VLS_50({}, ...__VLS_functionalComponentArgsRest(__VLS_50));
const __VLS_55 = {}.Delete;
/** @type { [typeof __VLS_components.Delete, ] } */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({}));
const __VLS_57 = __VLS_56({}, ...__VLS_functionalComponentArgsRest(__VLS_56));
__VLS_54.slots.default;
var __VLS_54;
__VLS_46.slots.default;
var __VLS_46;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseenter: (__VLS_ctx.onLogMouseEnter) },
    ...{ onMouseleave: (__VLS_ctx.onLogMouseLeave) },
    ref: ("logContainerRef"),
    ...{ class: ("terminal-body") },
});
// @ts-ignore navigation for `const logContainerRef = ref()`
/** @type { typeof __VLS_ctx.logContainerRef } */ ;
if (__VLS_ctx.logs.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("empty-log") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("blink") },
    });
}
for (const [entry, idx] of __VLS_getVForSourceType((__VLS_ctx.logs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: ((idx)),
        ...{ class: ("log-line") },
        ...{ class: ((`is-${entry.status}`)) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("log-time") },
    });
    (entry.time);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("log-phase") },
    });
    (__VLS_ctx.phaseLabel(entry.phase));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("log-message") },
    });
    (entry.message);
}
if (__VLS_ctx.isCrawling) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("log-line cursor-line") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("cursor") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: ("chartContainer"),
    ...{ class: ("chart-container") },
});
// @ts-ignore navigation for `const chartContainer = ref()`
/** @type { typeof __VLS_ctx.chartContainer } */ ;
if (__VLS_ctx.isCrawling) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("chart-info") },
    });
    const __VLS_61 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({}));
    const __VLS_63 = __VLS_62({}, ...__VLS_functionalComponentArgsRest(__VLS_62));
    const __VLS_67 = {}.DataLine;
    /** @type { [typeof __VLS_components.DataLine, ] } */ ;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({}));
    const __VLS_69 = __VLS_68({}, ...__VLS_functionalComponentArgsRest(__VLS_68));
    __VLS_66.slots.default;
    var __VLS_66;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.currentRate.toFixed(2));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("chart-info") },
    });
    const __VLS_73 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({}));
    const __VLS_75 = __VLS_74({}, ...__VLS_functionalComponentArgsRest(__VLS_74));
    const __VLS_79 = {}.Histogram;
    /** @type { [typeof __VLS_components.Histogram, ] } */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({}));
    const __VLS_81 = __VLS_80({}, ...__VLS_functionalComponentArgsRest(__VLS_80));
    __VLS_78.slots.default;
    var __VLS_78;
}
{
    const { footer: __VLS_thisSlot } = __VLS_5.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("footer-tips") },
    });
    if (__VLS_ctx.isCrawling || __VLS_ctx.isReconnecting) {
        const __VLS_85 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
            ...{ class: ("is-loading") },
        }));
        const __VLS_87 = __VLS_86({
            ...{ class: ("is-loading") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        const __VLS_91 = {}.Loading;
        /** @type { [typeof __VLS_components.Loading, ] } */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({}));
        const __VLS_93 = __VLS_92({}, ...__VLS_functionalComponentArgsRest(__VLS_92));
        __VLS_90.slots.default;
        var __VLS_90;
    }
    if (__VLS_ctx.isReconnecting) {
        (__VLS_ctx.reconnectAttempts);
    }
    else if (__VLS_ctx.isCrawling) {
    }
    else if (__VLS_ctx.crawlingFinished) {
        (__VLS_ctx.stats.articlesCrawled);
    }
    else {
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_97 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.isCrawling)),
    }));
    const __VLS_99 = __VLS_98({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.isCrawling)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_98));
    let __VLS_103;
    const __VLS_104 = {
        onClick: (__VLS_ctx.handleClose)
    };
    let __VLS_100;
    let __VLS_101;
    __VLS_102.slots.default;
    var __VLS_102;
    if (__VLS_ctx.isCrawling) {
        const __VLS_105 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
            ...{ 'onClick': {} },
            type: ("danger"),
            plain: (true),
        }));
        const __VLS_107 = __VLS_106({
            ...{ 'onClick': {} },
            type: ("danger"),
            plain: (true),
        }, ...__VLS_functionalComponentArgsRest(__VLS_106));
        let __VLS_111;
        const __VLS_112 = {
            onClick: (__VLS_ctx.abortCrawl)
        };
        let __VLS_108;
        let __VLS_109;
        __VLS_110.slots.default;
        var __VLS_110;
    }
    else {
        const __VLS_113 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
            ...{ 'onClick': {} },
            type: ("primary"),
            loading: ((__VLS_ctx.startLoading)),
        }));
        const __VLS_115 = __VLS_114({
            ...{ 'onClick': {} },
            type: ("primary"),
            loading: ((__VLS_ctx.startLoading)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_114));
        let __VLS_119;
        const __VLS_120 = {
            onClick: (...[$event]) => {
                if (!(!((__VLS_ctx.isCrawling))))
                    return;
                __VLS_ctx.startCrawl(false);
            }
        };
        let __VLS_116;
        let __VLS_117;
        __VLS_118.slots.default;
        var __VLS_118;
    }
}
__VLS_5.slots.default;
var __VLS_5;
['crawler-dialog', 'custom-dialog-header', 'header-left', 'title-text', 'header-right', 'engine-status', 'is-running', 'is-reconnecting', 'dot', 'header-status', 'target-info', 'label', 'target-tag', 'sync-range', 'label', 'date-sep', 'stats-group', 'stat-item', 'time-stat', 'val', 'monospace', 'lab', 'divider', 'stat-item', 'time-stat', 'val', 'monospace', 'highlight', 'lab', 'divider', 'stat-item', 'val', 'success', 'lab', 'divider', 'stat-item', 'val', 'error', 'lab', 'progress-section', 'progress-info', 'current-task', 'sub-task', 'main-content-layout', 'terminal-wrapper', 'terminal-header', 'window-dots', 'dot', 'red', 'dot', 'yellow', 'dot', 'green', 'terminal-title', 'terminal-actions', 'terminal-body', 'empty-log', 'blink', 'log-line', 'log-time', 'log-phase', 'log-message', 'log-line', 'cursor-line', 'cursor', 'chart-panel', 'chart-title', 'chart-container', 'chart-info', 'chart-info', 'dialog-footer', 'footer-tips', 'is-loading',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Delete: Delete,
            Loading: Loading,
            DataLine: DataLine,
            Histogram: Histogram,
            elapsedTime: elapsedTime,
            remainingTime: remainingTime,
            visibleLocal: visibleLocal,
            formattedAffiliation: formattedAffiliation,
            rangeStart: rangeStart,
            rangeEnd: rangeEnd,
            disabledDate: disabledDate,
            clearSyncRange: clearSyncRange,
            isCrawling: isCrawling,
            startLoading: startLoading,
            crawlingFinished: crawlingFinished,
            progress: progress,
            logs: logs,
            logContainerRef: logContainerRef,
            stats: stats,
            currentRate: currentRate,
            isReconnecting: isReconnecting,
            reconnectAttempts: reconnectAttempts,
            chartContainer: chartContainer,
            customProgressColors: customProgressColors,
            clearLogs: clearLogs,
            onLogMouseEnter: onLogMouseEnter,
            onLogMouseLeave: onLogMouseLeave,
            phaseLabel: phaseLabel,
            statusLabel: statusLabel,
            statusSubLabel: statusSubLabel,
            startCrawl: startCrawl,
            abortCrawl: abortCrawl,
            handleClose: handleClose,
        };
    },
    emits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    __typeProps: {},
    props: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
