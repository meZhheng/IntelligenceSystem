import { ref, computed, onMounted, onUnmounted } from 'vue';
// import { Fold, Expand } from '@element-plus/icons-vue'
import { useStore } from '@/store';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from '@/api/axios';
import QuotaCard from './QuotaCard.vue';
import QuotaCardNumber from './QuotaCardNumber.vue';
// components registration for `<script setup>`
// const components = { Fold, Expand }
// reactive state
const activeIndex = ref('/');
const store = useStore();
const router = useRouter();
const route = useRoute();
const goLargeScreen = () => {
    router.push({
        path: '/large_screen',
        query: { redirect: route.fullPath }
    });
};
const roleMap = {
    shutup: {
        label: '黑名单',
        color: '#ffffff',
        bgColor: '#e3e3e3',
    },
    student: {
        label: '学员',
        color: '#ffffff',
        bgColor: '#455d7a',
    },
    mentor: {
        label: '导师',
        color: '#ffffff',
        bgColor: '#233142',
    },
    administrator: {
        label: '管理员',
        color: '#ffffff',
        bgColor: '#f95959',
    },
    // 新增：超级管理员
    superadministrator: {
        label: '超级管理员',
        color: '#ffffff',
        bgColor: '#6B21A8', // 深紫，突出且与其他配色对比明显
    },
};
// computed equivalent of options API roleInfo
const roleInfo = computed(() => {
    const key = store.state.user_perms;
    return roleMap[key] ?? {
        label: store.state.user_perms,
        color: '#2b84dc',
        bgColor: '#badcff58',
    };
});
const isAdmin = computed(() => store.state.user_perms === 'administrator' || store.state.user_perms === 'superadministrator');
const inviteCode = ref('');
const expiresAt = ref(null); // ms since epoch
const inviteLoading = ref(false);
const inviteError = ref('');
const remainingSec = ref(0);
let timer = null;
// --- 解析后端返回，支持两种常见格式：{code, expires_at} 或 {code, ttl_seconds} ---
function applyInvitePayload(payload) {
    if (!payload)
        return;
    if (payload.code)
        inviteCode.value = payload.code;
    if (payload.expires_at) {
        // 兼容 ISO 字符串或时间戳
        const t = Date.parse(payload.expires_at);
        if (!isNaN(t))
            expiresAt.value = t;
    }
    else if (typeof payload.ttl_seconds === 'number') {
        expiresAt.value = Date.now() + payload.ttl_seconds * 1000;
    }
    else if (payload.ttl_ms) {
        expiresAt.value = Date.now() + payload.ttl_ms;
    }
    startTimer();
}
async function fetchInvite(force = false) {
    inviteLoading.value = true;
    inviteError.value = '';
    try {
        // 这里把 force 放在 body 中发送，后端可按需读取；也可以改为 params: { force: 1 }
        const res = await axios.post('/auth/inviteCode', { force: force ? 1 : 0 }, { withCredentials: true });
        // axios 成功响应，数据通常在 res.data
        applyInvitePayload(res.data);
    }
    catch (err) {
        // 更友好的错误处理，兼容 axios 的 error 结构
        const e = err;
        const serverMsg = e?.response?.data?.message ||
            e?.response?.data ||
            e?.message ||
            (e?.response ? `状态 ${e.response.status}` : '获取邀请码失败');
        inviteError.value = serverMsg;
        inviteCode.value = '';
        expiresAt.value = null;
        clearTimer();
    }
    finally {
        inviteLoading.value = false;
    }
}
async function refreshInvite() {
    // 调用相同 endpoint 带 force 参数，或你也可以使用 POST 到 /api/invite-code/refresh
    await fetchInvite(true);
}
async function copyCode() {
    if (!inviteCode.value) {
        ElMessage.warning('无可复制的邀请码');
        return;
    }
    try {
        await navigator.clipboard.writeText(inviteCode.value);
        ElMessage.success('已复制到剪贴板');
    }
    catch {
        // 兼容旧浏览器，fallback
        const ta = document.createElement('textarea');
        ta.value = inviteCode.value;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            ElMessage.success('已复制到剪贴板（兼容模式）');
        }
        catch {
            ElMessage.error('复制失败，请手动复制');
        }
        finally {
            document.body.removeChild(ta);
        }
    }
}
function startTimer() {
    clearTimer();
    updateRemaining();
    timer = window.setInterval(updateRemaining, 1000);
}
function updateRemaining() {
    if (!expiresAt.value) {
        remainingSec.value = 0;
        return;
    }
    const sec = Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000));
    remainingSec.value = sec;
    if (sec <= 0) {
        // 到期后停止计时并清空 code（可选）
        clearTimer();
        // 自动尝试刷新一次（可选）
        // fetchInvite(true)
    }
}
function clearTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
const expiresAtDisplay = computed(() => {
    if (!expiresAt.value)
        return '--';
    try {
        return new Date(expiresAt.value).toLocaleTimeString('zh-CN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    catch {
        return '--';
    }
});
const remainingDisplay = computed(() => {
    const s = remainingSec.value;
    if (!s)
        return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m > 0)
        return `${m}分${sec}秒`;
    return `${sec}秒`;
});
onMounted(() => {
    if (isAdmin.value)
        fetchInvite();
});
onUnmounted(() => {
    clearTimer();
});
// 限额数据
// 状态
const datasetQuota = ref(null);
const checkpointQuota = ref(null);
const loading = ref({ dataset: true, checkpoint: true });
const error = ref({ dataset: '', checkpoint: '' });
const threatLoading = ref(true);
const threatError = ref('');
const threatCount = ref(0);
const threatUpdatedAt = ref('');
async function fetchQuota(url) {
    const resp = await axios.get(url);
    return resp.data;
}
async function loadQuotas() {
    // 数据集
    loading.value.dataset = true;
    error.value.dataset = '';
    try {
        datasetQuota.value = await fetchQuota('/user/quota/dataset');
    }
    catch (e) {
        error.value.dataset = '获取失败';
        console.error('dataset quota error', e);
    }
    finally {
        loading.value.dataset = false;
    }
    // checkpoint
    loading.value.checkpoint = true;
    error.value.checkpoint = '';
    try {
        checkpointQuota.value = await fetchQuota('/user/quota/checkpoint');
    }
    catch (e) {
        error.value.checkpoint = '获取失败';
        console.error('checkpoint quota error', e);
    }
    finally {
        loading.value.checkpoint = false;
    }
}
async function fetchThreatAccountCount() {
    threatLoading.value = true;
    threatError.value = '';
    try {
        const resp = await axios.get('/user/alert/threat-accounts');
        threatCount.value = resp.data.threat_account_count;
        threatUpdatedAt.value = resp.data.updated_at;
    }
    catch (e) {
        console.error('加载威胁账号数量失败:', e);
        threatError.value = '加载失败，请稍后重试';
    }
    finally {
        threatLoading.value = false;
    }
}
onMounted(() => {
    loadQuotas();
    fetchThreatAccountCount();
});
// methods
// function toggleSidebar() {
//   store.toggleSidebar()
// }
function handleLogout() {
    store.logoutAction();
    ElMessage.success('退出成功');
    setTimeout(() => {
        location.reload();
    }, 500);
}
function encrypt(text) {
    const base64 = btoa(unescape(encodeURIComponent(text)));
    return encodeURIComponent(base64);
}
function openAnno() {
    const token = window.localStorage.getItem('user-token');
    if (!token || token === null) {
        ElMessage.error('请先登录');
        return;
    }
    const userPayload = String(store.state.user_name ?? '');
    const encrypted = encrypt(userPayload);
    const annoBase = import.meta.env.VITE_ANNO_URL;
    if (!annoBase) {
        ElMessage.warning('未配置外部标注工具地址');
        return;
    }
    const url = `${annoBase.replace(/\/$/, '')}/zh/auth?user=${encrypted}`;
    window.open(url, '_blank');
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['user-name-id', 'profile-avatar', 'profile', 'logout', 'profile-avatar', 'profile-header', 'user-state-box', 'user-state-nav', 'user-islogin', 'user-islogin', 'user-islogin', 'dropdown', 'expand', 'nav-external',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("navbar") },
});
if (__VLS_ctx.store.state.sidebarOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-title disable-select") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
const __VLS_0 = {}.ElMenu;
/** @type { [typeof __VLS_components.ElMenu, typeof __VLS_components.elMenu, typeof __VLS_components.ElMenu, typeof __VLS_components.elMenu, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    defaultActive: ((__VLS_ctx.activeIndex)),
    ...{ class: ("el-menu disable-select") },
    mode: ("horizontal"),
    router: ((true)),
    ellipsis: ((false)),
}));
const __VLS_2 = __VLS_1({
    defaultActive: ((__VLS_ctx.activeIndex)),
    ...{ class: ("el-menu disable-select") },
    mode: ("horizontal"),
    router: ((true)),
    ellipsis: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_6 = {}.ElSubMenu;
/** @type { [typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    index: ("3"),
}));
const __VLS_8 = __VLS_7({
    index: ("3"),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
{
    const { title: __VLS_thisSlot } = __VLS_11.slots;
}
const __VLS_12 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    index: ("/application/analysis/10"),
}));
const __VLS_14 = __VLS_13({
    index: ("/application/analysis/10"),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_17.slots.default;
var __VLS_17;
const __VLS_18 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    index: ("/application/analysis/12"),
}));
const __VLS_20 = __VLS_19({
    index: ("/application/analysis/12"),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
__VLS_23.slots.default;
var __VLS_23;
const __VLS_24 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    index: ("/application/analysis/11"),
}));
const __VLS_26 = __VLS_25({
    index: ("/application/analysis/11"),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_29.slots.default;
var __VLS_29;
const __VLS_30 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    index: ("/application/analysis/13"),
}));
const __VLS_32 = __VLS_31({
    index: ("/application/analysis/13"),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
__VLS_35.slots.default;
var __VLS_35;
__VLS_11.slots.default;
var __VLS_11;
const __VLS_36 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    index: ("/study"),
}));
const __VLS_38 = __VLS_37({
    index: ("/study"),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_41.slots.default;
var __VLS_41;
const __VLS_42 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    index: ("/datasets"),
}));
const __VLS_44 = __VLS_43({
    index: ("/datasets"),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
__VLS_47.slots.default;
var __VLS_47;
const __VLS_48 = {}.ElSubMenu;
/** @type { [typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, ] } */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    index: ("4"),
}));
const __VLS_50 = __VLS_49({
    index: ("4"),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
{
    const { title: __VLS_thisSlot } = __VLS_53.slots;
}
const __VLS_54 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    index: ("/wechatPA/proofread"),
}));
const __VLS_56 = __VLS_55({
    index: ("/wechatPA/proofread"),
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
__VLS_59.slots.default;
var __VLS_59;
const __VLS_60 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    index: ("/wechatPA/history"),
}));
const __VLS_62 = __VLS_61({
    index: ("/wechatPA/history"),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_65.slots.default;
var __VLS_65;
const __VLS_66 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    index: ("/wechatPA/autoDetect"),
}));
const __VLS_68 = __VLS_67({
    index: ("/wechatPA/autoDetect"),
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
__VLS_71.slots.default;
var __VLS_71;
const __VLS_72 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    index: ("/wechatPA/wordDict"),
}));
const __VLS_74 = __VLS_73({
    index: ("/wechatPA/wordDict"),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_77.slots.default;
var __VLS_77;
__VLS_53.slots.default;
var __VLS_53;
const __VLS_78 = {}.ElSubMenu;
/** @type { [typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, ] } */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    index: ("5"),
}));
const __VLS_80 = __VLS_79({
    index: ("5"),
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
{
    const { title: __VLS_thisSlot } = __VLS_83.slots;
}
const __VLS_84 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    index: ("/operation/seedbase"),
}));
const __VLS_86 = __VLS_85({
    index: ("/operation/seedbase"),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_89.slots.default;
var __VLS_89;
const __VLS_90 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
    index: ("/operation/report"),
}));
const __VLS_92 = __VLS_91({
    index: ("/operation/report"),
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
__VLS_95.slots.default;
var __VLS_95;
__VLS_83.slots.default;
var __VLS_83;
const __VLS_96 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onClick': {} },
    index: ("/large_screen"),
}));
const __VLS_98 = __VLS_97({
    ...{ 'onClick': {} },
    index: ("/large_screen"),
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_102;
const __VLS_103 = {
    onClick: (__VLS_ctx.goLargeScreen)
};
let __VLS_99;
let __VLS_100;
__VLS_101.slots.default;
var __VLS_101;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("nav-system-box") },
});
const __VLS_104 = {}.ElSubMenu;
/** @type { [typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, typeof __VLS_components.ElSubMenu, typeof __VLS_components.elSubMenu, ] } */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    index: ("system-status"),
}));
const __VLS_106 = __VLS_105({
    index: ("system-status"),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
{
    const { title: __VLS_thisSlot } = __VLS_109.slots;
}
const __VLS_110 = {}.ElMenuItem;
/** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    index: ("/tasks"),
}));
const __VLS_112 = __VLS_111({
    index: ("/tasks"),
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
__VLS_115.slots.default;
var __VLS_115;
if (__VLS_ctx.isAdmin) {
    const __VLS_116 = {}.ElMenuItem;
    /** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        index: ("/admin/scheduler/jobs"),
    }));
    const __VLS_118 = __VLS_117({
        index: ("/admin/scheduler/jobs"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_121.slots.default;
    var __VLS_121;
}
__VLS_109.slots.default;
var __VLS_109;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("nav-external-box") },
});
const __VLS_122 = {}.ElTooltip;
/** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    content: ("打开文本标注工具（跳转外部链接）"),
    placement: ("bottom"),
}));
const __VLS_124 = __VLS_123({
    content: ("打开文本标注工具（跳转外部链接）"),
    placement: ("bottom"),
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.openAnno) },
    ...{ onKeydown: (__VLS_ctx.openAnno) },
    ...{ onKeydown: (__VLS_ctx.openAnno) },
    ...{ class: ("nav-external") },
    role: ("button"),
    tabindex: ("0"),
    'aria-label': ("打开文本标注工具（跳转外部链接）"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("external-icon") },
    'aria-hidden': ("true"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: ("0 0 24 24"),
    width: ("14"),
    height: ("14"),
    fill: ("currentColor"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
    d: ("M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
    d: ("M5 5h6v2H7v10h10v-4h2v6H5z"),
});
__VLS_127.slots.default;
var __VLS_127;
if (!__VLS_ctx.store.state.is_authenticated) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-state-box") },
    });
    const __VLS_128 = {}.ElMenuItem;
    /** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        index: ("/register"),
    }));
    const __VLS_130 = __VLS_129({
        index: ("/register"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_133.slots.default;
    var __VLS_133;
    const __VLS_134 = {}.ElMenuItem;
    /** @type { [typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ] } */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        index: ("/login"),
    }));
    const __VLS_136 = __VLS_135({
        index: ("/login"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
    __VLS_139.slots.default;
    var __VLS_139;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-state-box user-islogin") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-state-nav") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: ("@/assets/icons/user.svg"),
        alt: ("icon"),
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.store.state.user_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dropdown") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile-avatar") },
    });
    const __VLS_140 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({}));
    const __VLS_142 = __VLS_141({}, ...__VLS_functionalComponentArgsRest(__VLS_141));
    const __VLS_146 = {}.Avatar;
    /** @type { [typeof __VLS_components.Avatar, ] } */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({}));
    const __VLS_148 = __VLS_147({}, ...__VLS_functionalComponentArgsRest(__VLS_147));
    __VLS_145.slots.default;
    var __VLS_145;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_152 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({}));
    const __VLS_154 = __VLS_153({}, ...__VLS_functionalComponentArgsRest(__VLS_153));
    const __VLS_158 = {}.ArrowRight;
    /** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({}));
    const __VLS_160 = __VLS_159({}, ...__VLS_functionalComponentArgsRest(__VLS_159));
    __VLS_157.slots.default;
    var __VLS_157;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleLogout) },
        ...{ class: ("logout") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile-detail") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("avatar") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: ("@/assets/icons/user.svg"),
        alt: ("icon"),
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-name-id") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("username-top-bar") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.store.state.user_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("auth-type") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("type") },
        ...{ style: (({
                color: __VLS_ctx.roleInfo.color,
                backgroundColor: __VLS_ctx.roleInfo.bgColor
            })) },
    });
    (__VLS_ctx.roleInfo.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-id") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.store.state.user_id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("auth") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("auth-header") },
    });
    const __VLS_164 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
    const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
    const __VLS_170 = {}.InfoFilled;
    /** @type { [typeof __VLS_components.InfoFilled, ] } */ ;
    // @ts-ignore
    const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({}));
    const __VLS_172 = __VLS_171({}, ...__VLS_functionalComponentArgsRest(__VLS_171));
    __VLS_169.slots.default;
    var __VLS_169;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("quota-section") },
    });
    // @ts-ignore
    /** @type { [typeof QuotaCardNumber, ] } */ ;
    // @ts-ignore
    const __VLS_176 = __VLS_asFunctionalComponent(QuotaCardNumber, new QuotaCardNumber({
        title: ("数据存储容量"),
        quotaData: ((__VLS_ctx.datasetQuota)),
        loading: ((__VLS_ctx.loading.dataset)),
        error: ((__VLS_ctx.error.dataset)),
    }));
    const __VLS_177 = __VLS_176({
        title: ("数据存储容量"),
        quotaData: ((__VLS_ctx.datasetQuota)),
        loading: ((__VLS_ctx.loading.dataset)),
        error: ((__VLS_ctx.error.dataset)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_176));
    // @ts-ignore
    /** @type { [typeof QuotaCard, ] } */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(QuotaCard, new QuotaCard({
        title: ("模型存储容量"),
        quotaData: ((__VLS_ctx.checkpointQuota)),
        loading: ((__VLS_ctx.loading.checkpoint)),
        error: ((__VLS_ctx.error.checkpoint)),
    }));
    const __VLS_182 = __VLS_181({
        title: ("模型存储容量"),
        quotaData: ((__VLS_ctx.checkpointQuota)),
        loading: ((__VLS_ctx.loading.checkpoint)),
        error: ((__VLS_ctx.error.checkpoint)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("alert") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("alert-header") },
    });
    const __VLS_186 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({}));
    const __VLS_188 = __VLS_187({}, ...__VLS_functionalComponentArgsRest(__VLS_187));
    const __VLS_192 = {}.BellFilled;
    /** @type { [typeof __VLS_components.BellFilled, ] } */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
    const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
    __VLS_191.slots.default;
    var __VLS_191;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("alert-body") },
    });
    const __VLS_198 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
        ...{ class: ("alert-card") },
    }));
    const __VLS_200 = __VLS_199({
        ...{ class: ("alert-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("alert-content") },
    });
    if (__VLS_ctx.threatLoading) {
        const __VLS_204 = {}.ElSkeleton;
        /** @type { [typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ] } */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            rows: ((1)),
            animated: (true),
            ...{ style: ({}) },
        }));
        const __VLS_206 = __VLS_205({
            rows: ((1)),
            animated: (true),
            ...{ style: ({}) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    }
    else if (__VLS_ctx.threatError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error") },
        });
        (__VLS_ctx.threatError);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("count") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("alert-title") },
        });
        (__VLS_ctx.threatCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("timestamp") },
        });
        (new Date(__VLS_ctx.threatUpdatedAt).toLocaleString('zh-CN', { hour12: false }));
    }
    __VLS_203.slots.default;
    var __VLS_203;
    if (__VLS_ctx.isAdmin) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invite-section") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invite-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invite-header-title") },
        });
        const __VLS_210 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({}));
        const __VLS_212 = __VLS_211({}, ...__VLS_functionalComponentArgsRest(__VLS_211));
        const __VLS_216 = {}.Share;
        /** @type { [typeof __VLS_components.Share, ] } */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({}));
        const __VLS_218 = __VLS_217({}, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_215.slots.default;
        var __VLS_215;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ style: ({}) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_222 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
            ...{ 'onClick': {} },
            size: ("small"),
            type: ("text"),
            loading: ((__VLS_ctx.inviteLoading)),
        }));
        const __VLS_224 = __VLS_223({
            ...{ 'onClick': {} },
            size: ("small"),
            type: ("text"),
            loading: ((__VLS_ctx.inviteLoading)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_223));
        let __VLS_228;
        const __VLS_229 = {
            onClick: (__VLS_ctx.refreshInvite)
        };
        let __VLS_225;
        let __VLS_226;
        __VLS_227.slots.default;
        var __VLS_227;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invite-body") },
        });
        const __VLS_230 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
            ...{ class: ("invite-card") },
        }));
        const __VLS_232 = __VLS_231({
            ...{ class: ("invite-card") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_231));
        if (__VLS_ctx.inviteLoading) {
            const __VLS_236 = {}.ElSkeleton;
            /** @type { [typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ] } */ ;
            // @ts-ignore
            const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
                rows: ((1)),
                animated: (true),
            }));
            const __VLS_238 = __VLS_237({
                rows: ((1)),
                animated: (true),
            }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        }
        else if (__VLS_ctx.inviteError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error") },
                ...{ style: ({}) },
            });
            (__VLS_ctx.inviteError);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("code-row") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("invite-code-box") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ style: ({}) },
            });
            (__VLS_ctx.inviteCode || '--');
            const __VLS_242 = {}.ElButton;
            /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
            // @ts-ignore
            const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
                ...{ 'onClick': {} },
                size: ("small"),
                disabled: ((!__VLS_ctx.inviteCode)),
            }));
            const __VLS_244 = __VLS_243({
                ...{ 'onClick': {} },
                size: ("small"),
                disabled: ((!__VLS_ctx.inviteCode)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_243));
            let __VLS_248;
            const __VLS_249 = {
                onClick: (__VLS_ctx.copyCode)
            };
            let __VLS_245;
            let __VLS_246;
            const __VLS_250 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({}));
            const __VLS_252 = __VLS_251({}, ...__VLS_functionalComponentArgsRest(__VLS_251));
            const __VLS_256 = {}.CopyDocument;
            /** @type { [typeof __VLS_components.CopyDocument, ] } */ ;
            // @ts-ignore
            const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({}));
            const __VLS_258 = __VLS_257({}, ...__VLS_functionalComponentArgsRest(__VLS_257));
            __VLS_255.slots.default;
            var __VLS_255;
            __VLS_247.slots.default;
            var __VLS_247;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("meta") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("expire-label") },
            });
            (__VLS_ctx.expiresAtDisplay);
            if (__VLS_ctx.remainingDisplay) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: (({
                            'remaining': true,
                            'low': __VLS_ctx.remainingSec < 150,
                            'normal': __VLS_ctx.remainingSec > 450,
                            'high': __VLS_ctx.remainingSec >= 150 && __VLS_ctx.remainingSec <= 450
                        })) },
                });
                (__VLS_ctx.remainingDisplay);
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("remaining low") },
                });
            }
        }
        __VLS_235.slots.default;
        var __VLS_235;
    }
}
__VLS_5.slots.default;
var __VLS_5;
['navbar', 'header-title', 'disable-select', 'container', 'el-menu', 'disable-select', 'nav-system-box', 'nav-external-box', 'nav-external', 'external-icon', 'user-state-box', 'user-state-box', 'user-islogin', 'user-state-nav', 'dropdown', 'profile', 'profile-header', 'profile-avatar', 'logout', 'profile-detail', 'avatar', 'user-name-id', 'username-top-bar', 'auth-type', 'type', 'user-id', 'auth', 'auth-header', 'quota-section', 'alert', 'alert-header', 'alert-body', 'alert-card', 'alert-content', 'error', 'count', 'alert-title', 'timestamp', 'invite-section', 'invite-header', 'invite-header-title', 'invite-body', 'invite-card', 'error', 'code-row', 'invite-code-box', 'meta', 'expire-label', 'remaining', 'low', 'normal', 'high', 'remaining', 'low',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            QuotaCard: QuotaCard,
            QuotaCardNumber: QuotaCardNumber,
            activeIndex: activeIndex,
            store: store,
            goLargeScreen: goLargeScreen,
            roleInfo: roleInfo,
            isAdmin: isAdmin,
            inviteCode: inviteCode,
            inviteLoading: inviteLoading,
            inviteError: inviteError,
            remainingSec: remainingSec,
            refreshInvite: refreshInvite,
            copyCode: copyCode,
            expiresAtDisplay: expiresAtDisplay,
            remainingDisplay: remainingDisplay,
            datasetQuota: datasetQuota,
            checkpointQuota: checkpointQuota,
            loading: loading,
            error: error,
            threatLoading: threatLoading,
            threatError: threatError,
            threatCount: threatCount,
            threatUpdatedAt: threatUpdatedAt,
            handleLogout: handleLogout,
            openAnno: openAnno,
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
