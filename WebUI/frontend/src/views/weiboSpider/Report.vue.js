import { ref, computed } from 'vue';
import { accountsData } from './accountsData';
import { ElMessage } from 'element-plus';
// 创建文件输入框的引用
const fileInput = ref(null);
// 处理导入按钮点击
const handleImportAccount = () => {
    // 触发隐藏的文件输入框
    fileInput.value?.click();
};
// 处理文件选择（此处仅触发选择并模拟导入样例数据）
const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
        console.log('已选择文件:', file.name);
        // 模拟解析并导入账号 - 这里用示例数据填充 toInspectAccounts
        simulateImportSampleAccounts();
    }
    // 重置输入值，允许重复选择相同文件
    if (event.target)
        event.target.value = '';
};
const REF_DATE = new Date(); // 使用当前时间作为参考日期
// 原有 accounts（已封禁的展示来源）
// 示例：为了演示，填入一些已封禁与未封禁账号（你可用真实后端数据替换）
const accounts = ref(accountsData);
const toInspectAccounts = ref([]);
const importedCount = computed(() => toInspectAccounts.value.length);
// 控件状态
const rangeKey = ref('3m');
const opened = ref([]);
const inspectFilter = ref('all');
const searchQuery = ref('');
function monthsAgo(date, m) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() - m);
    return d;
}
const rangeLabel = computed(() => {
    switch (rangeKey.value) {
        case '1m':
            return '近 1 个月';
        case '3m':
            return '近 3 个月';
        case '6m':
            return '近 6 个月';
        case '1y':
            return '近 1 年';
        default:
            return '全部';
    }
});
function applyRange() {
    // 触发计算属性刷新（如果有异步请求可放这里）
}
// 过滤并只展示在范围内被封禁的账号（原有右侧逻辑）
const filteredAccounts = computed(() => {
    let start = null;
    if (rangeKey.value === 'all') {
        start = null;
    }
    else if (rangeKey.value === '1m') {
        start = monthsAgo(REF_DATE, 1);
    }
    else if (rangeKey.value === '3m') {
        start = monthsAgo(REF_DATE, 3);
    }
    else if (rangeKey.value === '6m') {
        start = monthsAgo(REF_DATE, 6);
    }
    else if (rangeKey.value === '1y') {
        start = monthsAgo(REF_DATE, 12);
    }
    return accounts.value.filter((a) => {
        if (!a.banned_at)
            return false;
        const b = new Date(a.banned_at);
        if (!start)
            return b <= REF_DATE;
        return b >= start && b <= REF_DATE;
    });
});
const bannedCount = computed(() => filteredAccounts.value.length);
// 题目要求：未封禁数量固定为 2（保留原逻辑）
const fixedUnbanned = 2;
const totalFound = computed(() => bannedCount.value + fixedUnbanned);
function formatDate(d) {
    if (!d)
        return '未封禁';
    const dt = new Date(d);
    return dt.toLocaleString();
}
function copyReport() {
    const report = {
        '时间范围': rangeLabel.value,
        '参考日期': REF_DATE.toISOString(),
        '总发现账号数': totalFound.value,
        '已封禁数量': bannedCount.value,
        '未封禁(固定)': fixedUnbanned,
        '范围内账号': filteredAccounts.value.map((a) => ({
            id: a.id,
            昵称: a.username,
            封禁时间: a.banned_at,
        })),
        '导入待巡查账号数': importedCount.value
    };
    try {
        const content = JSON.stringify(report, null, 2);
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const datePart = REF_DATE.toISOString().slice(0, 10);
        const filename = `cleanup-report-${datePart}.json`;
        // IE / Edge (legacy) 支持
        // @ts-ignore
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            // @ts-ignore
            window.navigator.msSaveOrOpenBlob(blob, filename);
        }
        else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
        // @ts-ignore
        window.$message?.success('报告已生成并开始下载');
    }
    catch (e) {
        // @ts-ignore
        window.$message?.error('生成报告失败，请手动复制');
        console.error(e);
    }
}
function reset() {
    rangeKey.value = '3m';
}
// ---------- 待巡查相关操作 ----------
const toInspectTotal = computed(() => toInspectAccounts.value.length);
const toInspectBanned = computed(() => toInspectAccounts.value.filter(a => !!a.banned_at).length);
const toInspectUnbanned = computed(() => toInspectAccounts.value.filter(a => !a.banned_at).length);
const toInspectFiltered = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return toInspectAccounts.value.filter(a => {
        if (inspectFilter.value === 'banned' && !a.banned_at)
            return false;
        if (inspectFilter.value === 'unbanned' && a.banned_at)
            return false;
        if (!q)
            return true;
        return String(a.username).toLowerCase().includes(q) || String(a.id).includes(q);
    });
});
function markInspected(row) {
    // 将该条标记为已检查（此处示例选择从数组中移除）
    const idx = toInspectAccounts.value.findIndex(r => r.id === row.id);
    if (idx >= 0) {
        toInspectAccounts.value.splice(idx, 1);
        // @ts-ignore
        window.$message?.success(`账号 ${row.username} 已标记为已检查并从待巡查中移除`);
    }
}
function markAllInspected() {
    const n = toInspectFiltered.value.length;
    if (n === 0) {
        // @ts-ignore
        window.$message?.warning('当前没有可标记的账号');
        return;
    }
    // 简单行为：移除所有匹配项
    const ids = new Set(toInspectFiltered.value.map(i => i.id));
    toInspectAccounts.value = toInspectAccounts.value.filter(i => !ids.has(i.id));
    // @ts-ignore
    window.$message?.success(`已将 ${n} 条账号标记为已检查`);
}
// 打开详情（当前示例仅展开右侧已有的被封禁列表中相应账号，如没有则提示）
function openAccountDetail(row) {
    // 如果该账号在右侧已封禁数据中，展开对应面板
    const idx = filteredAccounts.value.findIndex(a => a.id === row.id);
    if (idx >= 0) {
        opened.value = [String(filteredAccounts.value[idx].id)];
    }
    else {
        // @ts-ignore
        ElMessage?.info('该账号暂未在已封禁列表中，或详情不可用');
    }
}
// 新增：用于模拟巡查的状态与进度
const isChecking = ref(false);
const checkProgress = ref(0); // 0 - 100
const checkingCount = ref(0); // 当前要检测的账号数（仅用于显示）
/** 简单的延时函数 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// 模拟导入样例数据（触发后填充 toInspectAccounts）
async function simulateImportSampleAccounts() {
    // 若已有导入，先追加（示例行为）
    const sample = [
        {
            id: 'imp-201',
            username: '疑似谣言1',
            description: '疑似发布谣言内容',
            followers: 230,
            location: '重庆',
            threat_index: 7,
            banned_at: null,
            posts: [{ id: 'sp1', content: '导入示例帖子1', publish_time: '2025-08-01', publish_tool: 'Web', publish_place: '重庆' }]
        },
        {
            id: 'imp-202',
            username: '已封账号X',
            description: '大量转发不实信息',
            followers: 560,
            location: '浙江',
            threat_index: 8,
            banned_at: null, // 10 天前
            posts: [{ id: 'sp2', content: '导入示例帖子2', publish_time: '2025-08-28', publish_tool: 'Mobile', publish_place: '浙江' }]
        },
        {
            id: 'imp-203',
            username: '自动化测试账号',
            description: '疑似机器人行为',
            followers: 12,
            location: '未知',
            threat_index: 4,
            banned_at: null,
            posts: []
        },
        {
            id: 'imp-204',
            username: '可能违规Y',
            description: '涉及敏感话题',
            followers: 980,
            location: '湖南',
            threat_index: 9,
            banned_at: null,
            posts: [{ id: 'sp3', content: '导入示例帖子3', publish_time: '2025-07-30', publish_tool: 'Web', publish_place: '湖南' }]
        }
    ];
    // append（避免重复 id）
    const existingIds = new Set(toInspectAccounts.value.map(a => a.id));
    const newItems = [];
    for (const s of sample) {
        if (!existingIds.has(s.id)) {
            // 增加一个临时字段 checkedChecking 用于 UI（可选）
            newItems.push({ ...s, inspected: false });
        }
    }
    if (newItems.length === 0) {
        // @ts-ignore
        ElMessage?.info('没有新的账号需要导入');
        return;
    }
    // 将新项追加到待巡查数组（初始状态：尚未检测）
    toInspectAccounts.value.push(...newItems);
    // 开始模拟巡查动画
    isChecking.value = true;
    checkProgress.value = 0;
    checkingCount.value = newItems.length;
    // 对每条新导入账号逐个“检测”
    for (let i = 0; i < newItems.length; i++) {
        const current = newItems[i];
        // 模拟网络/检测延迟：0.6s ~ 1.4s 随机
        const wait = 600 + Math.floor(Math.random() * 800);
        // 为了更平滑的视觉效果，内部做几个小步进
        const steps = 6;
        const stepDelay = Math.max(50, Math.floor(wait / steps));
        for (let s = 0; s < steps; s++) {
            // 逐步提升进度（当前处理到 (i + s/steps) / total）
            const part = ((i + s / steps) / newItems.length) * 100;
            checkProgress.value = Math.min(100, Math.round(part));
            // 等待一个小步
            // eslint-disable-next-line no-await-in-loop
            await delay(stepDelay);
        }
        // 最终等待（保证每个 item 有一段完整等待）
        // eslint-disable-next-line no-await-in-loop
        await delay(120);
        // 随机判断该账号是否在检测时被发现已封禁（若本身已被封禁则保留）
        // let detectedBanned = false
        // if (!current.banned_at) {
        //   // 40% 的概率被判定为已封禁（仅模拟）
        //   if (Math.random() < 0.4) {
        //     detectedBanned = true
        //     // 模拟封禁时间：随机 1 - 30 天前
        //     const daysAgo = 1 + Math.floor(Math.random() * 30)
        //     current.banned_at = new Date(REF_DATE.getTime() - 1000 * 60 * 60 * 24 * daysAgo).toISOString()
        //   }
        // }
        // 将检测结果写回到 toInspectAccounts（保持引用一致）
        // const idx = toInspectAccounts.value.findIndex(a => a.id === current.id)
        // if (idx >= 0) {
        //   toInspectAccounts.value[idx] = { ...current, inspected: false }
        // }
        // 如果检测到已封禁，可选择把该账号同步到右侧已封禁列表（这里示例仅**同步追加**，不从待巡查里移除）
        // if (detectedBanned) {
        //   // 若右侧 accounts 中并不存在该 id，则追加
        //   const existsInRight = accounts.value.some(a => String(a.id) === String(current.id))
        //   if (!existsInRight) {
        //     accounts.value.push({
        //       ...current,
        //       // 确保 posts 不为 undefined
        //       posts: current.posts || []
        //     })
        //   }
        // }
        // 更新进度到 (i+1)/N * 100
        checkProgress.value = Math.min(100, Math.round(((i + 1) / newItems.length) * 100));
    }
    // 等待短暂时间表现检测完成动画
    await delay(300);
    isChecking.value = false;
    checkingCount.value = 0;
    checkProgress.value = 100;
    // @ts-ignore
    ElMessage?.error(`导入 ${newItems.length} 条, 网络异常，同步封禁状态失败`);
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['report-card', 'inspect-card', 'muted', 'main-row', 'col-right', 'col-center', 'col-left',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("page-container") },
});
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("header-card") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("header-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header-left") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header-right") },
});
const __VLS_6 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.rangeKey)),
}));
const __VLS_8 = __VLS_7({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.rangeKey)),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_12;
const __VLS_13 = {
    onChange: (__VLS_ctx.applyRange)
};
let __VLS_9;
let __VLS_10;
const __VLS_14 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    label: (('1m')),
}));
const __VLS_16 = __VLS_15({
    label: (('1m')),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_19.slots.default;
var __VLS_19;
const __VLS_20 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: (('3m')),
}));
const __VLS_22 = __VLS_21({
    label: (('3m')),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_25.slots.default;
var __VLS_25;
const __VLS_26 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    label: (('6m')),
}));
const __VLS_28 = __VLS_27({
    label: (('6m')),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_31.slots.default;
var __VLS_31;
const __VLS_32 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: (('1y')),
}));
const __VLS_34 = __VLS_33({
    label: (('1y')),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_37.slots.default;
var __VLS_37;
const __VLS_38 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    label: (('all')),
}));
const __VLS_40 = __VLS_39({
    label: (('all')),
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_43.slots.default;
var __VLS_43;
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("button-panel") },
});
if (__VLS_ctx.importedCount > 0) {
    const __VLS_44 = {}.ElBadge;
    /** @type { [typeof __VLS_components.ElBadge, typeof __VLS_components.elBadge, typeof __VLS_components.ElBadge, typeof __VLS_components.elBadge, ] } */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        value: ((__VLS_ctx.importedCount)),
        ...{ class: ("import-badge") },
    }));
    const __VLS_46 = __VLS_45({
        value: ((__VLS_ctx.importedCount)),
        ...{ class: ("import-badge") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    const __VLS_50 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        ...{ 'onClick': {} },
        type: ("primary"),
        size: ("small"),
        ...{ style: ({}) },
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onClick': {} },
        type: ("primary"),
        size: ("small"),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_56;
    const __VLS_57 = {
        onClick: (__VLS_ctx.handleImportAccount)
    };
    let __VLS_53;
    let __VLS_54;
    __VLS_55.slots.default;
    var __VLS_55;
    __VLS_49.slots.default;
    var __VLS_49;
}
else {
    const __VLS_58 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        ...{ 'onClick': {} },
        type: ("primary"),
        size: ("small"),
        ...{ style: ({}) },
    }));
    const __VLS_60 = __VLS_59({
        ...{ 'onClick': {} },
        type: ("primary"),
        size: ("small"),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    let __VLS_64;
    const __VLS_65 = {
        onClick: (__VLS_ctx.handleImportAccount)
    };
    let __VLS_61;
    let __VLS_62;
    __VLS_63.slots.default;
    var __VLS_63;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileSelect) },
    type: ("file"),
    ref: ("fileInput"),
    ...{ style: ({}) },
    accept: (".csv,.xlsx,.xls"),
});
// @ts-ignore navigation for `const fileInput = ref()`
/** @type { typeof __VLS_ctx.fileInput } */ ;
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("main-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("col col-left") },
});
const __VLS_66 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    ...{ class: ("report-card") },
}));
const __VLS_68 = __VLS_67({
    ...{ class: ("report-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_72 = {}.ElDivider;
/** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("report-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("value") },
});
(__VLS_ctx.rangeLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("report-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("value") },
});
(__VLS_ctx.totalFound);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("report-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("value") },
});
(__VLS_ctx.bannedCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("report-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("value") },
});
(__VLS_ctx.fixedUnbanned);
const __VLS_78 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    ...{ 'onClick': {} },
    type: ("primary"),
}));
const __VLS_80 = __VLS_79({
    ...{ 'onClick': {} },
    type: ("primary"),
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
let __VLS_84;
const __VLS_85 = {
    onClick: (__VLS_ctx.copyReport)
};
let __VLS_81;
let __VLS_82;
__VLS_83.slots.default;
var __VLS_83;
const __VLS_86 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
    ...{ 'onClick': {} },
    type: ("success"),
}));
const __VLS_88 = __VLS_87({
    ...{ 'onClick': {} },
    type: ("success"),
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
let __VLS_92;
const __VLS_93 = {
    onClick: (__VLS_ctx.reset)
};
let __VLS_89;
let __VLS_90;
__VLS_91.slots.default;
var __VLS_91;
__VLS_71.slots.default;
var __VLS_71;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("col col-center") },
});
const __VLS_94 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
    ...{ class: ("inspect-card") },
}));
const __VLS_96 = __VLS_95({
    ...{ class: ("inspect-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inspect-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inspect-stats") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.toInspectTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.toInspectBanned);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.toInspectUnbanned);
const __VLS_100 = {}.ElDivider;
/** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({}));
const __VLS_102 = __VLS_101({}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inspect-controls") },
});
const __VLS_106 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    modelValue: ((__VLS_ctx.searchQuery)),
    placeholder: ("按昵称或ID搜索"),
    clearable: (true),
    size: ("small"),
    ...{ style: ({}) },
}));
const __VLS_108 = __VLS_107({
    modelValue: ((__VLS_ctx.searchQuery)),
    placeholder: ("按昵称或ID搜索"),
    clearable: (true),
    size: ("small"),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
const __VLS_112 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    modelValue: ((__VLS_ctx.inspectFilter)),
    size: ("small"),
    ...{ class: ("inspect-filter") },
}));
const __VLS_114 = __VLS_113({
    modelValue: ((__VLS_ctx.inspectFilter)),
    size: ("small"),
    ...{ class: ("inspect-filter") },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
const __VLS_118 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    label: (('all')),
}));
const __VLS_120 = __VLS_119({
    label: (('all')),
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
__VLS_123.slots.default;
var __VLS_123;
const __VLS_124 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    label: (('banned')),
}));
const __VLS_126 = __VLS_125({
    label: (('banned')),
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_129.slots.default;
var __VLS_129;
const __VLS_130 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    label: (('unbanned')),
}));
const __VLS_132 = __VLS_131({
    label: (('unbanned')),
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
__VLS_135.slots.default;
var __VLS_135;
__VLS_117.slots.default;
var __VLS_117;
const __VLS_136 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    ...{ 'onClick': {} },
    type: ("success"),
    size: ("small"),
    disabled: ((__VLS_ctx.toInspectFiltered.length === 0)),
}));
const __VLS_138 = __VLS_137({
    ...{ 'onClick': {} },
    type: ("success"),
    size: ("small"),
    disabled: ((__VLS_ctx.toInspectFiltered.length === 0)),
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
let __VLS_142;
const __VLS_143 = {
    onClick: (__VLS_ctx.markAllInspected)
};
let __VLS_139;
let __VLS_140;
__VLS_141.slots.default;
var __VLS_141;
if (__VLS_ctx.isChecking) {
    const __VLS_144 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        percentage: ((__VLS_ctx.checkProgress)),
        textInside: ((false)),
        status: ("active"),
        strokeWidth: ("8"),
        ...{ style: ({}) },
    }));
    const __VLS_146 = __VLS_145({
        percentage: ((__VLS_ctx.checkProgress)),
        textInside: ((false)),
        status: ("active"),
        strokeWidth: ("8"),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
}
const __VLS_150 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
    data: ((__VLS_ctx.toInspectFiltered)),
    ...{ style: ({}) },
    size: ("small"),
    emptyText: (('暂无待巡查账号')),
}));
const __VLS_152 = __VLS_151({
    data: ((__VLS_ctx.toInspectFiltered)),
    ...{ style: ({}) },
    size: ("small"),
    emptyText: (('暂无待巡查账号')),
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
const __VLS_156 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    prop: ("username"),
    label: ("昵称 / ID"),
    minWidth: ("100"),
}));
const __VLS_158 = __VLS_157({
    prop: ("username"),
    label: ("昵称 / ID"),
    minWidth: ("100"),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
{
    const { default: __VLS_thisSlot } = __VLS_161.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row-username") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (row.username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("muted") },
    });
    (row.id);
}
__VLS_161.slots.default;
var __VLS_161;
const __VLS_162 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    prop: ("followers"),
    label: ("粉丝"),
    width: ("80"),
}));
const __VLS_164 = __VLS_163({
    prop: ("followers"),
    label: ("粉丝"),
    width: ("80"),
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
const __VLS_168 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: ("状态"),
    width: ("120"),
}));
const __VLS_170 = __VLS_169({
    label: ("状态"),
    width: ("120"),
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
{
    const { default: __VLS_thisSlot } = __VLS_173.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (row.banned_at) {
        const __VLS_174 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
            size: ("small"),
            type: ("danger"),
        }));
        const __VLS_176 = __VLS_175({
            size: ("small"),
            type: ("danger"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_175));
        __VLS_179.slots.default;
        var __VLS_179;
    }
    else {
        const __VLS_180 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            size: ("small"),
        }));
        const __VLS_182 = __VLS_181({
            size: ("small"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        __VLS_185.slots.default;
        var __VLS_185;
    }
}
__VLS_173.slots.default;
var __VLS_173;
const __VLS_186 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    prop: ("banned_at"),
    label: ("封禁时间"),
    minWidth: ("150"),
}));
const __VLS_188 = __VLS_187({
    prop: ("banned_at"),
    label: ("封禁时间"),
    minWidth: ("150"),
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
{
    const { default: __VLS_thisSlot } = __VLS_191.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.formatDate(row.banned_at));
}
__VLS_191.slots.default;
var __VLS_191;
const __VLS_192 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    label: ("操作"),
    width: ("220"),
}));
const __VLS_194 = __VLS_193({
    label: ("操作"),
    width: ("220"),
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
{
    const { default: __VLS_thisSlot } = __VLS_197.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_198 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
        ...{ 'onClick': {} },
        type: ("primary"),
        plain: (true),
        size: ("small"),
    }));
    const __VLS_200 = __VLS_199({
        ...{ 'onClick': {} },
        type: ("primary"),
        plain: (true),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    let __VLS_204;
    const __VLS_205 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openAccountDetail(row);
        }
    };
    let __VLS_201;
    let __VLS_202;
    __VLS_203.slots.default;
    var __VLS_203;
    const __VLS_206 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
        ...{ 'onClick': {} },
        type: ("danger"),
        plain: (true),
        size: ("small"),
    }));
    const __VLS_208 = __VLS_207({
        ...{ 'onClick': {} },
        type: ("danger"),
        plain: (true),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_207));
    let __VLS_212;
    const __VLS_213 = {
        onClick: (...[$event]) => {
            __VLS_ctx.markInspected(row);
        }
    };
    let __VLS_209;
    let __VLS_210;
    __VLS_211.slots.default;
    var __VLS_211;
}
__VLS_197.slots.default;
var __VLS_197;
__VLS_155.slots.default;
var __VLS_155;
if (__VLS_ctx.toInspectFiltered.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("inspect-empty") },
    });
    const __VLS_214 = {}.ElEmpty;
    /** @type { [typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ] } */ ;
    // @ts-ignore
    const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
        description: ("当前没有匹配的待巡查账号"),
    }));
    const __VLS_216 = __VLS_215({
        description: ("当前没有匹配的待巡查账号"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_215));
}
__VLS_99.slots.default;
var __VLS_99;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("col col-right") },
});
const __VLS_220 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    ...{ class: ("report-container") },
}));
const __VLS_222 = __VLS_221({
    ...{ class: ("report-container") },
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_226 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
    modelValue: ((__VLS_ctx.opened)),
    accordion: (true),
}));
const __VLS_228 = __VLS_227({
    modelValue: ((__VLS_ctx.opened)),
    accordion: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
for (const [acc] of __VLS_getVForSourceType((__VLS_ctx.filteredAccounts))) {
    const __VLS_232 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        key: ((acc.id)),
        name: ((String(acc.id))),
    }));
    const __VLS_234 = __VLS_233({
        key: ((acc.id)),
        name: ((String(acc.id))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    {
        const { title: __VLS_thisSlot } = __VLS_237.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("acc-title") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("left") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (acc.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("muted") },
        });
        (acc.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("muted") },
        });
        (__VLS_ctx.formatDate(acc.banned_at));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("acc-body") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("acc-info") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("desc") },
    });
    (acc.description || '无个人简介');
    const __VLS_238 = {}.ElDivider;
    /** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
    // @ts-ignore
    const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({}));
    const __VLS_240 = __VLS_239({}, ...__VLS_functionalComponentArgsRest(__VLS_239));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    const __VLS_244 = {}.ElTimeline;
    /** @type { [typeof __VLS_components.ElTimeline, typeof __VLS_components.elTimeline, typeof __VLS_components.ElTimeline, typeof __VLS_components.elTimeline, ] } */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({}));
    const __VLS_246 = __VLS_245({}, ...__VLS_functionalComponentArgsRest(__VLS_245));
    for (const [post] of __VLS_getVForSourceType((acc.posts))) {
        const __VLS_250 = {}.ElTimelineItem;
        /** @type { [typeof __VLS_components.ElTimelineItem, typeof __VLS_components.elTimelineItem, typeof __VLS_components.ElTimelineItem, typeof __VLS_components.elTimelineItem, ] } */ ;
        // @ts-ignore
        const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
            key: ((post.id)),
            timestamp: ((post.publish_time)),
        }));
        const __VLS_252 = __VLS_251({
            key: ((post.id)),
            timestamp: ((post.publish_time)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_251));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("post-content") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("post-text") },
        });
        (post.content);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("post-meta muted") },
        });
        (post.publish_tool);
        (post.publish_place);
        __VLS_255.slots.default;
        var __VLS_255;
    }
    __VLS_249.slots.default;
    var __VLS_249;
    __VLS_237.slots.default;
    var __VLS_237;
}
__VLS_231.slots.default;
var __VLS_231;
if (__VLS_ctx.filteredAccounts.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("empty-state") },
    });
    const __VLS_256 = {}.ElEmpty;
    /** @type { [typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ] } */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        description: ("当前时间段内无被封禁账号"),
    }));
    const __VLS_258 = __VLS_257({
        description: ("当前时间段内无被封禁账号"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
}
__VLS_225.slots.default;
var __VLS_225;
['page-container', 'header-card', 'header-left', 'header-right', 'button-panel', 'import-badge', 'main-row', 'col', 'col-left', 'report-card', 'report-item', 'label', 'value', 'report-item', 'label', 'value', 'report-item', 'label', 'value', 'report-item', 'label', 'value', 'col', 'col-center', 'inspect-card', 'inspect-header', 'inspect-stats', 'inspect-controls', 'inspect-filter', 'row-username', 'muted', 'inspect-empty', 'col', 'col-right', 'report-container', 'acc-title', 'left', 'muted', 'muted', 'acc-body', 'acc-info', 'label', 'desc', 'post-content', 'post-text', 'post-meta', 'muted', 'empty-state',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            fileInput: fileInput,
            handleImportAccount: handleImportAccount,
            handleFileSelect: handleFileSelect,
            importedCount: importedCount,
            rangeKey: rangeKey,
            opened: opened,
            inspectFilter: inspectFilter,
            searchQuery: searchQuery,
            rangeLabel: rangeLabel,
            applyRange: applyRange,
            filteredAccounts: filteredAccounts,
            bannedCount: bannedCount,
            fixedUnbanned: fixedUnbanned,
            totalFound: totalFound,
            formatDate: formatDate,
            copyReport: copyReport,
            reset: reset,
            toInspectTotal: toInspectTotal,
            toInspectBanned: toInspectBanned,
            toInspectUnbanned: toInspectUnbanned,
            toInspectFiltered: toInspectFiltered,
            markInspected: markInspected,
            markAllInspected: markAllInspected,
            openAccountDetail: openAccountDetail,
            isChecking: isChecking,
            checkProgress: checkProgress,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
