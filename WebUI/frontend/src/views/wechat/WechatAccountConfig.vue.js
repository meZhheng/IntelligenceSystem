import { ref, computed, onMounted } from 'vue';
import { ArrowRight, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from '@/api/axios';
const props = withDefaults(defineProps(), {
    activeConfig: () => ({ token: '', fingerprint: '', cookie: '' })
});
const emit = defineEmits(['update:activeConfig']);
// --- 状态变量 ---
const localConfig = ref({ token: '', fingerprint: '', cookie: '' });
const localSystemConfig = ref({ token: '', fingerprint: '', cookie: '' });
const collapsed = ref(true);
const validating = ref(false);
const validationStatus = ref('idle');
const cookieSource = ref('admin');
const adminEditEnabled = ref(false);
const saving = ref(false);
// --- 计算属性 ---
const activeData = computed(() => {
    return cookieSource.value === 'user' ? localConfig.value : localSystemConfig.value;
});
const isReadOnly = computed(() => {
    if (cookieSource.value === 'user')
        return false;
    return !adminEditEnabled.value;
});
const ledClass = computed(() => ({
    'led--yellow': validating.value,
    'led--green': validationStatus.value === 'valid',
    'led--red': validationStatus.value === 'invalid',
    'led--gray': validationStatus.value === 'idle'
}));
const statusText = computed(() => {
    if (validating.value)
        return '正在校验...';
    return validationStatus.value === 'valid' ? '校验通过' : (validationStatus.value === 'invalid' ? '校验失败' : '未校验');
});
function onSourceChange() {
    adminEditEnabled.value = false;
    validationStatus.value = 'idle';
}
// --- 核心逻辑 ---
async function verifyData(config) {
    if (!config.token || !config.fingerprint || !config.cookie)
        return false;
    validating.value = true;
    try {
        await axios.post('/wechat/crawl/verify-cookie', { ...config });
        validationStatus.value = 'valid';
        return true;
    }
    catch (e) {
        validationStatus.value = 'invalid';
        return false;
    }
    finally {
        validating.value = false;
    }
}
/**
 * 修改后的保存逻辑：先校验，后保存
 * @param silent 是否静默执行（不弹出确认框和成功提示）
 */
const saveConfig = async (silent = false) => {
    // 1. 自动校验
    const isValid = await verifyData(activeData.value);
    if (!isValid) {
        if (!silent)
            ElMessage.error('校验失败，无法保存');
        return false;
    }
    // 2. 校验成功，执行保存
    try {
        if (cookieSource.value === 'admin') {
            if (!silent) {
                await ElMessageBox.confirm('修改系统全局配置将影响所有用户，确定继续？', '警告', {
                    type: 'warning', confirmButtonText: '确定修改'
                });
            }
            saving.value = true;
            await axios.put('/wechat/crawl/systemConfig', {
                module: 'wechat',
                value: localSystemConfig.value,
                value_type: 'json',
            });
            adminEditEnabled.value = false;
        }
        else {
            saving.value = true;
            localStorage.setItem('wechat-config', JSON.stringify(localConfig.value));
        }
        if (!silent)
            ElMessage.success('保存成功并已同步');
        syncToParent();
        return true;
    }
    catch (e) {
        if (!silent)
            ElMessage.error(e.response?.data?.message || '保存失败');
        return false;
    }
    finally {
        saving.value = false;
    }
};
// 初始化加载
async function initComponent() {
    const savedUserConfig = localStorage.getItem('wechat-config');
    if (savedUserConfig)
        localConfig.value = JSON.parse(savedUserConfig);
    try {
        const resp = await axios.get('/wechat/crawl/systemConfig');
        localSystemConfig.value = resp.data || { token: '', fingerprint: '', cookie: '' };
    }
    catch (e) {
        console.error('获取系统配置失败');
    }
    // 初始自动寻找可用配置
    const userValid = await verifyData(localConfig.value);
    if (userValid) {
        cookieSource.value = 'user';
        syncToParent();
        return;
    }
    const systemValid = await verifyData(localSystemConfig.value);
    if (systemValid) {
        cookieSource.value = 'admin';
        syncToParent();
    }
    else {
        collapsed.value = false; // 全部无效则展开
    }
}
function syncToParent() {
    emit('update:activeConfig', { ...activeData.value });
}
async function manualValidate() {
    const success = await verifyData(activeData.value);
    if (success) {
        ElMessage.success('校验通过');
        syncToParent();
    }
    else {
        ElMessage.error('校验失败，参数无效');
    }
}
// 修改后的切换折叠逻辑
async function toggleCollapsed() {
    if (!collapsed.value) {
        // 正在尝试收起：走校验-->保存逻辑
        const success = await saveConfig(true);
        if (success) {
            collapsed.value = true;
        }
        else {
            // 当前配置无效，尝试检查另一种配置是否有效（满足“都无效则展开”的逻辑）
            const otherSource = cookieSource.value === 'user' ? 'admin' : 'user';
            const otherData = otherSource === 'user' ? localConfig.value : localSystemConfig.value;
            const otherValid = await verifyData(otherData);
            if (otherValid) {
                // 如果另一种配置是好的，切换过去并允许折叠
                cookieSource.value = otherSource;
                syncToParent();
                collapsed.value = true;
            }
            else {
                // 确实都无效
                collapsed.value = false;
                ElMessage.warning('配置校验不通过，请修正后再收起');
            }
        }
    }
    else {
        // 展开逻辑保持简单
        collapsed.value = false;
    }
}
onMounted(() => {
    initComponent();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    activeConfig: () => ({ token: '', fingerprint: '', cookie: '' })
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['info-alert', 'arrow-icon',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("config-container") },
    ...{ style: (({ maxHeight: __VLS_ctx.collapsed ? 'auto' : '500px' })) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("config-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.toggleCollapsed) },
    ...{ class: ("status-badge") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("status-dot") },
    ...{ class: ((__VLS_ctx.ledClass)) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("status-text") },
});
(__VLS_ctx.statusText);
const __VLS_0 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: (({ 'is-active': !__VLS_ctx.collapsed })) },
    ...{ class: ("arrow-icon") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: (({ 'is-active': !__VLS_ctx.collapsed })) },
    ...{ class: ("arrow-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_6 = {}.ArrowRight;
/** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_5.slots.default;
var __VLS_5;
if (!__VLS_ctx.collapsed) {
    const __VLS_12 = {}.ElButtonGroup;
    /** @type { [typeof __VLS_components.ElButtonGroup, typeof __VLS_components.elButtonGroup, typeof __VLS_components.ElButtonGroup, typeof __VLS_components.elButtonGroup, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_18 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        ...{ 'onClick': {} },
        loading: ((__VLS_ctx.validating)),
        size: ("small"),
    }));
    const __VLS_20 = __VLS_19({
        ...{ 'onClick': {} },
        loading: ((__VLS_ctx.validating)),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_24;
    const __VLS_25 = {
        onClick: (__VLS_ctx.manualValidate)
    };
    let __VLS_21;
    let __VLS_22;
    __VLS_23.slots.default;
    var __VLS_23;
    const __VLS_26 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.saving)),
        loading: ((__VLS_ctx.saving)),
        size: ("small"),
        type: ("primary"),
    }));
    const __VLS_28 = __VLS_27({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.saving)),
        loading: ((__VLS_ctx.saving)),
        size: ("small"),
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    let __VLS_32;
    const __VLS_33 = {
        onClick: (__VLS_ctx.saveConfig)
    };
    let __VLS_29;
    let __VLS_30;
    __VLS_31.slots.default;
    var __VLS_31;
    __VLS_17.slots.default;
    var __VLS_17;
}
const __VLS_34 = {}.ElCollapseTransition;
/** @type { [typeof __VLS_components.ElCollapseTransition, typeof __VLS_components.elCollapseTransition, typeof __VLS_components.ElCollapseTransition, typeof __VLS_components.elCollapseTransition, ] } */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({}));
const __VLS_36 = __VLS_35({}, ...__VLS_functionalComponentArgsRest(__VLS_35));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("config-body") },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.collapsed) }, null, null);
if (__VLS_ctx.cookieSource === 'user') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-alert") },
    });
    const __VLS_40 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
    const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
    const __VLS_46 = {}.InfoFilled;
    /** @type { [typeof __VLS_components.InfoFilled, ] } */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({}));
    const __VLS_48 = __VLS_47({}, ...__VLS_functionalComponentArgsRest(__VLS_47));
    __VLS_45.slots.default;
    var __VLS_45;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: ("https://mp.weixin.qq.com/cgi-bin/home"),
        target: ("_blank"),
    });
}
const __VLS_52 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    labelPosition: ("top"),
    size: ("small"),
    model: ((__VLS_ctx.activeData)),
}));
const __VLS_54 = __VLS_53({
    labelPosition: ("top"),
    size: ("small"),
    model: ((__VLS_ctx.activeData)),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const __VLS_58 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
    label: ("账号来源"),
}));
const __VLS_60 = __VLS_59({
    label: ("账号来源"),
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("source-wrapper") },
});
const __VLS_64 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.cookieSource)),
    ...{ class: ("source-radio") },
}));
const __VLS_66 = __VLS_65({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.cookieSource)),
    ...{ class: ("source-radio") },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_70;
const __VLS_71 = {
    onChange: (__VLS_ctx.onSourceChange)
};
let __VLS_67;
let __VLS_68;
const __VLS_72 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: ("admin"),
}));
const __VLS_74 = __VLS_73({
    label: ("admin"),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_77.slots.default;
var __VLS_77;
const __VLS_78 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    label: ("user"),
}));
const __VLS_80 = __VLS_79({
    label: ("user"),
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
__VLS_83.slots.default;
var __VLS_83;
__VLS_69.slots.default;
var __VLS_69;
if (__VLS_ctx.cookieSource === 'admin') {
    const __VLS_84 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ 'onClick': {} },
        type: ((__VLS_ctx.adminEditEnabled ? 'warning' : 'info')),
        link: (true),
        size: ("small"),
    }));
    const __VLS_86 = __VLS_85({
        ...{ 'onClick': {} },
        type: ((__VLS_ctx.adminEditEnabled ? 'warning' : 'info')),
        link: (true),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    let __VLS_90;
    const __VLS_91 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.cookieSource === 'admin')))
                return;
            __VLS_ctx.adminEditEnabled = !__VLS_ctx.adminEditEnabled;
        }
    };
    let __VLS_87;
    let __VLS_88;
    (__VLS_ctx.adminEditEnabled ? '锁定' : '修改全局配置');
    __VLS_89.slots.default;
    var __VLS_89;
}
__VLS_63.slots.default;
var __VLS_63;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("form-grid") },
});
const __VLS_92 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: ("Token"),
}));
const __VLS_94 = __VLS_93({
    label: ("Token"),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
const __VLS_98 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    modelValue: ((__VLS_ctx.activeData.token)),
    disabled: ((__VLS_ctx.isReadOnly)),
    placeholder: ("token"),
    spellcheck: ("false"),
    clearable: (true),
}));
const __VLS_100 = __VLS_99({
    modelValue: ((__VLS_ctx.activeData.token)),
    disabled: ((__VLS_ctx.isReadOnly)),
    placeholder: ("token"),
    spellcheck: ("false"),
    clearable: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_97.slots.default;
var __VLS_97;
const __VLS_104 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    label: ("Fingerprint"),
}));
const __VLS_106 = __VLS_105({
    label: ("Fingerprint"),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
const __VLS_110 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    modelValue: ((__VLS_ctx.activeData.fingerprint)),
    disabled: ((__VLS_ctx.isReadOnly)),
    placeholder: ("fp"),
    spellcheck: ("false"),
    clearable: (true),
}));
const __VLS_112 = __VLS_111({
    modelValue: ((__VLS_ctx.activeData.fingerprint)),
    disabled: ((__VLS_ctx.isReadOnly)),
    placeholder: ("fp"),
    spellcheck: ("false"),
    clearable: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
__VLS_109.slots.default;
var __VLS_109;
const __VLS_116 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: ("Cookie"),
}));
const __VLS_118 = __VLS_117({
    label: ("Cookie"),
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
const __VLS_122 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    modelValue: ((__VLS_ctx.activeData.cookie)),
    disabled: ((__VLS_ctx.isReadOnly)),
    type: ("textarea"),
    rows: ((3)),
    placeholder: ("请输入完整 Cookie"),
    spellcheck: ("false"),
    resize: ("none"),
}));
const __VLS_124 = __VLS_123({
    modelValue: ((__VLS_ctx.activeData.cookie)),
    disabled: ((__VLS_ctx.isReadOnly)),
    type: ("textarea"),
    rows: ((3)),
    placeholder: ("请输入完整 Cookie"),
    spellcheck: ("false"),
    resize: ("none"),
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
__VLS_121.slots.default;
var __VLS_121;
__VLS_57.slots.default;
var __VLS_57;
__VLS_39.slots.default;
var __VLS_39;
['config-container', 'config-header', 'status-badge', 'status-dot', 'status-text', 'is-active', 'arrow-icon', 'config-body', 'info-alert', 'source-wrapper', 'source-radio', 'form-grid',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowRight: ArrowRight,
            InfoFilled: InfoFilled,
            collapsed: collapsed,
            validating: validating,
            cookieSource: cookieSource,
            adminEditEnabled: adminEditEnabled,
            saving: saving,
            activeData: activeData,
            isReadOnly: isReadOnly,
            ledClass: ledClass,
            statusText: statusText,
            onSourceChange: onSourceChange,
            saveConfig: saveConfig,
            manualValidate: manualValidate,
            toggleCollapsed: toggleCollapsed,
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
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
