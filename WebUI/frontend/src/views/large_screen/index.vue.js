import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useStore } from '@/store';
import { useRouter, useRoute } from 'vue-router';
import 'echarts-wordcloud';
import axios from '@/api/axios';
import { getCurrentDateTime } from '@/utils/date';
import SentimentLineChart from './sentiment_trendline.vue';
import StanceLineChart from './stance_trendline.vue';
import RollingTextList from './rolling_text.vue';
import MilitaryBar from './military_bar.vue';
import WordCloud from './wordcloud_dict.vue';
import statsBoard from './stats-board.vue';
import LocationDistribution from './location_distribution.vue';
import WechatPaBoard from './wechat_pa.vue';
// --- 响应式数据（等同 data()） ---
const loading = ref(false);
const store = useStore();
const router = useRouter();
const route = useRoute();
function ExitLargeScreen() {
    router.push(route.query.redirect || '/').then(() => {
        // 跳转完成后刷新整页
        window.location.reload();
    });
}
const LineChartData = ref({
    sentiment: [],
    stance: [],
});
const RollingIllegalInfoData = ref([]);
const RollingIllegalAccountData = ref([]);
const MilitaryIllegalData = ref([]);
const StatsBoard = ref({
    total: 0,
    negative: 0,
    positive: 0,
});
const WechatPaStatsData = ref({});
const WechatPaCategoryData = ref([]);
const WordCloudData = ref([]);
const LocationDistributionData = ref({});
onMounted(() => {
    // 初始同步，避免初始 total 与正负不一致
    StatsBoard.value.total = (StatsBoard.value.negative || 0) + (StatsBoard.value.positive || 0);
    const tid = setInterval(() => {
        const incNeg = Math.floor(Math.random() * 5); // 0..4
        const incPos = Math.floor(Math.random() * 10) + 3; // 3..12
        StatsBoard.value.negative += incNeg;
        StatsBoard.value.positive += incPos;
        // 始终把 total 设为 正 + 负，防止漂移
        StatsBoard.value.total = StatsBoard.value.negative + StatsBoard.value.positive;
    }, 2000);
    // 可选：组件卸载时清理定时器
    onBeforeUnmount(() => clearInterval(tid));
});
const SentimentLineChartData = computed(() => {
    return LineChartData.value.sentiment;
});
const StanceLineChartData = computed(() => {
    return LineChartData.value.stance;
});
const RollingIllegalInfoList = computed(() => {
    return RollingIllegalInfoData.value;
});
const RollingIllegalAccountList = computed(() => {
    return RollingIllegalAccountData.value;
});
const MilitaryIllegalBar = computed(() => {
    return MilitaryIllegalData.value;
});
const KeywordsCloudData = computed(() => {
    return WordCloudData.value;
});
const LocationDistributionMapData = computed(() => {
    return LocationDistributionData.value;
});
const PassWechatPaStatsData = computed(() => {
    return WechatPaStatsData.value;
});
const PassWechatPaCategoryData = computed(() => {
    const src = WechatPaCategoryData.value || [];
    return src.map(item => {
        if (!item || typeof item.type !== 'string')
            return item;
        // 按英文逗号或中文逗号分割，取第一个片段并去除首尾空白
        const newType = item.type.split(/[，,]/)[0].trim();
        return { ...item, type: newType };
    });
});
async function fetchSentimentLineData() {
    const link = `/large_screen/sentiment/trendline`;
    axios.post(link, {}, {
        timeout: 10000
    }).then((response) => {
        LineChartData.value.sentiment = response.data.response;
    }).catch((error) => {
        console.error(error);
    });
}
async function fetchStanceLineData() {
    const link = `/large_screen/stance/trendline`;
    axios.post(link, {}, {
        timeout: 10000
    }).then((response) => {
        LineChartData.value.stance = response.data.response;
    }).catch((error) => {
        console.error(error);
    });
}
async function fetchRealTimeRollingIllegalInfo() {
    const link = '/large_screen/RollingIllegalInfo';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        RollingIllegalInfoData.value = response.data.response;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
async function fetchRealTimeRollingIllegalAccount() {
    const link = '/large_screen/RollingIllegalAccount';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        RollingIllegalAccountData.value = response.data.response;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
async function fetchMilitaryInfoData() {
    const link = '/large_screen/MilitaryIllegalInfo';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        MilitaryIllegalData.value = response.data.response;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
async function fetchWordCloudData() {
    const link = '/large_screen/WordCloudData';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        WordCloudData.value = response.data;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
async function fetchLocationDistrubutionData() {
    const link = '/large_screen/LocationDistribution';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        LocationDistributionData.value = response.data;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
async function fetchStatsBoardData() {
    const link = '/large_screen/StatsBoard';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        StatsBoard.value = response.data;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
async function fetchWechatPaStats() {
    const link = '/large_screen/wechat_pa';
    try {
        const response = await axios.post(link, /* data */ {}, {
            timeout: 10000, // 放在 config（第三个参数）
            // 可以添加其他 config: headers, params 等
        });
        WechatPaStatsData.value = response.data.stats;
        WechatPaCategoryData.value = response.data.violationTypes;
    }
    catch (error) {
        console.error('fetchRealTimeRollingText error:', error);
    }
}
// --- 初始化与配置更新 ---
function initCharts() {
    fetchSentimentLineData();
    fetchStanceLineData();
    fetchRealTimeRollingIllegalInfo();
    fetchRealTimeRollingIllegalAccount();
    fetchMilitaryInfoData();
    fetchWordCloudData();
    fetchLocationDistrubutionData();
    fetchStatsBoardData();
    fetchWechatPaStats();
}
// --- 生命周期 ---
onMounted(async () => {
    // 等待 DOM 渲染完成
    await nextTick();
    initCharts();
});
const time_now = ref(getCurrentDateTime()); // 初始值
let timer;
onMounted(() => {
    timer = window.setInterval(() => {
        time_now.value = getCurrentDateTime(); // 使用你的格式化器
    }, 1000);
});
onBeforeUnmount(() => {
    if (timer)
        clearInterval(timer);
});
const isFullScreen = ref(false);
function toggleFullScreen() {
    if (!isFullScreen.value) {
        // 进入全屏
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        }
        else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        }
        else if (el.mozRequestFullScreen) {
            el.mozRequestFullScreen();
        }
        else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        }
    }
    else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
        else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}
// 监听页面全屏状态变化
function fullscreenChangeHandler() {
    isFullScreen.value = !!(document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);
}
onMounted(() => {
    document.addEventListener("fullscreenchange", fullscreenChangeHandler);
    document.addEventListener("webkitfullscreenchange", fullscreenChangeHandler);
    document.addEventListener("mozfullscreenchange", fullscreenChangeHandler);
    document.addEventListener("MSFullscreenChange", fullscreenChangeHandler);
});
onBeforeUnmount(() => {
    document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    document.removeEventListener("webkitfullscreenchange", fullscreenChangeHandler);
    document.removeEventListener("mozfullscreenchange", fullscreenChangeHandler);
    document.removeEventListener("MSFullscreenChange", fullscreenChangeHandler);
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['exit', 'chart-title-corner', 'chart-title-corner', 'chart-box', 'chart-box', 'chart-box', 'chart-box', 'chart-box', 'left-column', 'center-column', 'right-column', 'chart-box', 'chart-box', 'chart-title', 'chart-box', 'chart-title',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("dashboard") },
    'element-loading-text': ("数据加载中..."),
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("title-container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("title") },
});
if (!__VLS_ctx.isFullScreen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ onClick: (__VLS_ctx.toggleFullScreen) },
        t: ("1756606642562"),
        ...{ class: ("icon") },
        viewBox: ("0 0 1024 1024"),
        version: ("1.1"),
        xmlns: ("http://www.w3.org/2000/svg"),
        'p-id': ("10117"),
        width: ("48"),
        height: ("48"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: ("M149.333333 394.666667c17.066667 0 32-14.933333 32-32v-136.533334l187.733334 187.733334c6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333c12.8-12.8 12.8-32 0-44.8l-187.733333-187.733334H362.666667c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32H149.333333c-4.266667 0-8.533333 0-10.666666 2.133334-8.533333 4.266667-14.933333 10.666667-19.2 17.066666-2.133333 4.266667-2.133333 8.533333-2.133334 12.8v213.333334c0 17.066667 14.933333 32 32 32zM874.666667 629.333333c-17.066667 0-32 14.933333-32 32v136.533334L642.133333 597.333333c-12.8-12.8-32-12.8-44.8 0s-12.8 32 0 44.8l200.533334 200.533334H661.333333c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h213.333334c4.266667 0 8.533333 0 10.666666-2.133334 8.533333-4.266667 14.933333-8.533333 17.066667-17.066666 2.133333-4.266667 2.133333-8.533333 2.133333-10.666667V661.333333c2.133333-17.066667-12.8-32-29.866666-32zM381.866667 595.2l-200.533334 200.533333V661.333333c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v213.333334c0 4.266667 0 8.533333 2.133334 10.666666 4.266667 8.533333 8.533333 14.933333 17.066666 17.066667 4.266667 2.133333 8.533333 2.133333 10.666667 2.133333h213.333333c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32h-136.533333l200.533333-200.533333c12.8-12.8 12.8-32 0-44.8s-29.866667-10.666667-42.666666 0zM904.533333 138.666667c0-2.133333 0-2.133333 0 0-4.266667-8.533333-10.666667-14.933333-17.066666-17.066667-4.266667-2.133333-8.533333-2.133333-10.666667-2.133333H661.333333c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h136.533334l-187.733334 187.733333c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333l187.733333-187.733333V362.666667c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V149.333333c-2.133333-4.266667-2.133333-8.533333-4.266667-10.666666z"),
        fill: ("#ffffff"),
        'p-id': ("10118"),
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ onClick: (__VLS_ctx.toggleFullScreen) },
        t: ("1756606560392"),
        ...{ class: ("icon") },
        viewBox: ("0 0 1024 1024"),
        version: ("1.1"),
        xmlns: ("http://www.w3.org/2000/svg"),
        'p-id': ("9811"),
        width: ("48"),
        height: ("48"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: ("M313.6 358.4H177.066667c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h213.333333c4.266667 0 8.533333 0 10.666667-2.133333 8.533333-4.266667 14.933333-8.533333 17.066666-17.066667 2.133333-4.266667 2.133333-8.533333 2.133334-10.666667v-213.333333c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v136.533333L172.8 125.866667c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l185.6 187.733333zM695.466667 650.666667H832c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32H618.666667c-4.266667 0-8.533333 0-10.666667 2.133333-8.533333 4.266667-14.933333 8.533333-17.066667 17.066667-2.133333 4.266667-2.133333 8.533333-2.133333 10.666666v213.333334c0 17.066667 14.933333 32 32 32s32-14.933333 32-32v-136.533334l200.533333 200.533334c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333c12.8-12.8 12.8-32 0-44.8l-204.8-198.4zM435.2 605.866667c-4.266667-8.533333-8.533333-14.933333-17.066667-17.066667-4.266667-2.133333-8.533333-2.133333-10.666666-2.133333H192c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h136.533333L128 851.2c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466666-8.533333l200.533334-200.533333V832c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V618.666667c-2.133333-4.266667-2.133333-8.533333-4.266667-12.8zM603.733333 403.2c4.266667 8.533333 8.533333 14.933333 17.066667 17.066667 4.266667 2.133333 8.533333 2.133333 10.666667 2.133333h213.333333c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32h-136.533333L896 170.666667c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0l-187.733333 187.733333V177.066667c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v213.333333c2.133333 4.266667 2.133333 8.533333 4.266666 12.8z"),
        fill: ("#ffffff"),
        'p-id': ("9812"),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("extra_info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("username") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.store.state.user_name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("time-now") },
});
(__VLS_ctx.time_now);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.ExitLargeScreen) },
    ...{ class: ("exit") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    t: ("1756464507448"),
    ...{ class: ("icon") },
    viewBox: ("0 0 1024 1024"),
    version: ("1.1"),
    xmlns: ("http://www.w3.org/2000/svg"),
    'p-id': ("1489"),
    width: ("32"),
    height: ("32"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
    d: ("M918.4 489.6l-160-160c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l105.6 105.6L512 480c-19.2 0-32 12.8-32 32s12.8 32 32 32l307.2 0-105.6 105.6c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 12.8 9.6 22.4 9.6 9.6 0 16-3.2 22.4-9.6l160-163.2c0 0 0-3.2 3.2-3.2C931.2 518.4 931.2 499.2 918.4 489.6z"),
    'p-id': ("1490"),
    fill: ("#bae6fd"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
    d: ("M832 736c-19.2 0-32 12.8-32 32l0 64c0 19.2-12.8 32-32 32L224 864c-19.2 0-32-12.8-32-32L192 192c0-19.2 12.8-32 32-32l544 0c19.2 0 32 12.8 32 32l0 64c0 19.2 12.8 32 32 32s32-12.8 32-32L864 192c0-54.4-41.6-96-96-96L224 96C169.6 96 128 137.6 128 192l0 640c0 54.4 41.6 96 96 96l544 0c54.4 0 96-41.6 96-96l0-64C864 748.8 851.2 736 832 736z"),
    'p-id': ("1491"),
    fill: ("#bae6fd"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("left-column") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof WechatPaBoard, typeof WechatPaBoard, ] } */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(WechatPaBoard, new WechatPaBoard({
    stats: ((__VLS_ctx.PassWechatPaStatsData)),
    violationTypes: ((__VLS_ctx.PassWechatPaCategoryData)),
}));
const __VLS_1 = __VLS_0({
    stats: ((__VLS_ctx.PassWechatPaStatsData)),
    violationTypes: ((__VLS_ctx.PassWechatPaCategoryData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof WordCloud, typeof WordCloud, ] } */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(WordCloud, new WordCloud({
    keywords: ((__VLS_ctx.KeywordsCloudData)),
    height: ("500px"),
    rotationRange: (([0, 0])),
    minSize: ((48)),
    maxSize: ((120)),
    shape: ("circle"),
}));
const __VLS_6 = __VLS_5({
    keywords: ((__VLS_ctx.KeywordsCloudData)),
    height: ("500px"),
    rotationRange: (([0, 0])),
    minSize: ((48)),
    maxSize: ((120)),
    shape: ("circle"),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof SentimentLineChart, typeof SentimentLineChart, ] } */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(SentimentLineChart, new SentimentLineChart({
    content: ((__VLS_ctx.SentimentLineChartData)),
}));
const __VLS_11 = __VLS_10({
    content: ((__VLS_ctx.SentimentLineChartData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("center-column") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box main-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof statsBoard, typeof statsBoard, ] } */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(statsBoard, new statsBoard({
    total: ((__VLS_ctx.StatsBoard.total)),
    negative: ((__VLS_ctx.StatsBoard.negative)),
    positive: ((__VLS_ctx.StatsBoard.positive)),
}));
const __VLS_16 = __VLS_15({
    total: ((__VLS_ctx.StatsBoard.total)),
    negative: ((__VLS_ctx.StatsBoard.negative)),
    positive: ((__VLS_ctx.StatsBoard.positive)),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
// @ts-ignore
/** @type { [typeof LocationDistribution, typeof LocationDistribution, ] } */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(LocationDistribution, new LocationDistribution({
    mapData: ((__VLS_ctx.LocationDistributionMapData)),
}));
const __VLS_21 = __VLS_20({
    mapData: ((__VLS_ctx.LocationDistributionMapData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof MilitaryBar, typeof MilitaryBar, ] } */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(MilitaryBar, new MilitaryBar({
    data: ((__VLS_ctx.MilitaryIllegalBar)),
}));
const __VLS_26 = __VLS_25({
    data: ((__VLS_ctx.MilitaryIllegalBar)),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("right-column") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof RollingTextList, typeof RollingTextList, ] } */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(RollingTextList, new RollingTextList({
    items: ((__VLS_ctx.RollingIllegalInfoList)),
}));
const __VLS_31 = __VLS_30({
    items: ((__VLS_ctx.RollingIllegalInfoList)),
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof RollingTextList, typeof RollingTextList, ] } */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(RollingTextList, new RollingTextList({
    items: ((__VLS_ctx.RollingIllegalAccountList)),
}));
const __VLS_36 = __VLS_35({
    items: ((__VLS_ctx.RollingIllegalAccountList)),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-bottom-glow") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
// @ts-ignore
/** @type { [typeof StanceLineChart, typeof StanceLineChart, ] } */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(StanceLineChart, new StanceLineChart({
    content: ((__VLS_ctx.StanceLineChartData)),
}));
const __VLS_41 = __VLS_40({
    content: ((__VLS_ctx.StanceLineChartData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
['dashboard', 'header', 'title-container', 'title', 'icon', 'icon', 'extra_info', 'username', 'time-now', 'exit', 'icon', 'content', 'left-column', 'chart-box', 'chart-bottom-glow', 'chart-title', 'chart-box', 'chart-bottom-glow', 'chart-title', 'chart-box', 'chart-bottom-glow', 'chart-title', 'center-column', 'chart-box', 'main-box', 'chart-bottom-glow', 'chart-title', 'chart-box', 'chart-bottom-glow', 'chart-title', 'right-column', 'chart-box', 'chart-bottom-glow', 'chart-title', 'chart-box', 'chart-bottom-glow', 'chart-title', 'chart-box', 'chart-bottom-glow', 'chart-title',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            SentimentLineChart: SentimentLineChart,
            StanceLineChart: StanceLineChart,
            RollingTextList: RollingTextList,
            MilitaryBar: MilitaryBar,
            WordCloud: WordCloud,
            statsBoard: statsBoard,
            LocationDistribution: LocationDistribution,
            WechatPaBoard: WechatPaBoard,
            loading: loading,
            store: store,
            ExitLargeScreen: ExitLargeScreen,
            StatsBoard: StatsBoard,
            SentimentLineChartData: SentimentLineChartData,
            StanceLineChartData: StanceLineChartData,
            RollingIllegalInfoList: RollingIllegalInfoList,
            RollingIllegalAccountList: RollingIllegalAccountList,
            MilitaryIllegalBar: MilitaryIllegalBar,
            KeywordsCloudData: KeywordsCloudData,
            LocationDistributionMapData: LocationDistributionMapData,
            PassWechatPaStatsData: PassWechatPaStatsData,
            PassWechatPaCategoryData: PassWechatPaCategoryData,
            time_now: time_now,
            isFullScreen: isFullScreen,
            toggleFullScreen: toggleFullScreen,
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
