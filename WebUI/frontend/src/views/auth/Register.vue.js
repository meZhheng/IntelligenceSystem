import axios from '@/api/axios';
import { defineComponent, ref, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
export default defineComponent({
    name: 'Register',
    setup() {
        const registerForm = ref({
            username: '',
            password: '',
            checkPass: '',
            inviteCode: '', // 存储 16 位不带 '-' 的邀请码（用于 validator 与提交）
        });
        const showPassword = ref(false);
        const showConfirm = ref(false);
        // 邀请码 16 位字符数组（每项是单字符或空字符串）
        const inviteChars = ref(Array.from({ length: 16 }, () => ''));
        // refs for inputs
        const inputRefs = ref([]);
        // 将 el 与对应 idx 关联起来
        const setInputRef = (el, idx) => {
            if (!el) {
                // 当元素卸载时，清除对应位置的引用
                inputRefs.value[idx] = undefined;
                return;
            }
            inputRefs.value[idx] = el;
        };
        // 当 inviteChars 改变时，更新 registerForm.inviteCode（不带 '-')
        watch(inviteChars, (val) => {
            registerForm.value.inviteCode = val.join('');
        }, { deep: true });
        // allowed charset 正则（大写字母与数字）
        const VALID_CHAR_RE = /^[A-Z0-9]$/;
        const NORMALIZE_RE = /[^A-Z0-9]/g;
        // 处理输入（单字符或粘贴）
        const onCharInput = (e, idx) => {
            const el = e.target;
            let v = el.value || '';
            // 可能是粘贴进来的多字符，这里只保留可用字符并分配
            if (v.length > 1) {
                // handle paste-like multi char input
                handleFillFromString(v, idx);
                return;
            }
            v = v.toUpperCase();
            // 只允许 A-Z0-9
            if (!VALID_CHAR_RE.test(v)) {
                // 非法字符，清空该格
                inviteChars.value[idx] = '';
                el.value = '';
                return;
            }
            inviteChars.value[idx] = v;
            // 自动跳到下一个格子（如果有）
            if (idx < 15) {
                nextTick(() => {
                    inputRefs.value[idx + 1]?.focus();
                    inputRefs.value[idx + 1]?.select();
                });
            }
        };
        // 处理粘贴 / 批量填充：从给定字符串开始填充到 idx（或从0）
        const handleFillFromString = (s, startIdx = 0) => {
            const normalized = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (!normalized)
                return;
            let pos = startIdx;
            for (let i = 0; i < normalized.length && pos < 16; i++, pos++) {
                inviteChars.value[pos] = normalized[i];
            }
            // focus the next empty or last
            nextTick(() => {
                let focusIdx = inviteChars.value.findIndex(ch => !ch);
                if (focusIdx === -1)
                    focusIdx = 15;
                inputRefs.value[focusIdx]?.focus();
                inputRefs.value[focusIdx]?.select();
            });
        };
        // 处理整段粘贴（支持带 '-' 的完整格式）
        const onPasteInvite = (event) => {
            const text = event.clipboardData?.getData('text') || '';
            if (!text)
                return;
            // 解析出 A-Z0-9，填满 16 位
            const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
            handleFillFromString(cleaned, 0);
        };
        // 键盘事件处理：Backspace 自动回退、左右键移动
        const onCharKeydown = (e, idx) => {
            const key = e.key;
            const el = e.target;
            if (key === 'Backspace') {
                // 若当前有字符，则清空；若为空则移动到上一个并清空
                if (inviteChars.value[idx]) {
                    inviteChars.value[idx] = '';
                    // 保持焦点在当前
                    nextTick(() => el.value = '');
                    e.preventDefault();
                }
                else if (idx > 0) {
                    const prev = inputRefs.value[idx - 1];
                    prev?.focus();
                    inviteChars.value[idx - 1] = '';
                    prev && (prev.value = '');
                    e.preventDefault();
                }
            }
            else if (key === 'ArrowLeft') {
                if (idx > 0) {
                    inputRefs.value[idx - 1]?.focus();
                    e.preventDefault();
                }
            }
            else if (key === 'ArrowRight') {
                if (idx < 15) {
                    inputRefs.value[idx + 1]?.focus();
                    e.preventDefault();
                }
            }
            else {
                // 允许默认行为（字符输入由 onCharInput 处理）
            }
        };
        const onCharFocus = (idx) => {
            // select 内容以便覆盖
            nextTick(() => {
                inputRefs.value[idx]?.select();
            });
        };
        // 校验器：必须填满16位，仅 A-Z0-9
        const validateInviteCode = (_, value, callback) => {
            const raw = String(value || '').toUpperCase().replace(NORMALIZE_RE, '');
            if (!raw || raw.length === 0) {
                return callback(new Error('请输入邀请码（16 位）'));
            }
            if (raw.length !== 16) {
                return callback(new Error('邀请码必须为 16 位'));
            }
            if (!/^[A-Z0-9]{16}$/.test(raw)) {
                return callback(new Error('邀请码只能包含大写字母和数字'));
            }
            callback();
        };
        // 自定义重复密码校验器
        const checkPass = (_, value, callback) => {
            if (!value) {
                return callback(new Error('请再次输入密码！'));
            }
            if (value !== registerForm.value.password) {
                return callback(new Error('两次输入的密码不相同！'));
            }
            callback();
        };
        const rules = {
            username: [
                { required: true, message: '请输入用户名！', trigger: 'blur' },
            ],
            password: [
                { required: true, message: '请输入密码！', trigger: 'blur' },
            ],
            checkPass: [
                { required: true, validator: checkPass, trigger: 'blur' },
            ],
            inviteCode: [
                { required: true, validator: validateInviteCode, trigger: 'blur' },
            ],
        };
        // 这里用来拿表单实例
        const registerFormRef = ref();
        // 提交：先 validate，再发送 registerForm（包含 inviteCode）
        const onSubmit = () => {
            // 触发表单校验
            registerFormRef.value.validate((valid) => {
                if (!valid) {
                    return;
                }
                // 构造提交体：邀请 code 以不含 '-' 的 16 位字符串提交（或按后端要求格式化）
                const payload = {
                    username: registerForm.value.username,
                    password: registerForm.value.password,
                    inviteCode: registerForm.value.inviteCode, // 16 位大写字母+数字
                };
                axios.post('/auth/register', payload)
                    .then(() => {
                    ElMessage.success('注册成功');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                })
                    .catch(err => {
                    const msgs = err.response?.data?.message || {};
                    Object.entries(msgs).forEach(([field, msg]) => {
                        ElMessage.error(msg);
                        if (registerFormRef.value) {
                            registerFormRef.value.validateField(field);
                        }
                    });
                });
            });
        };
        // expose
        return {
            registerForm,
            rules,
            showPassword,
            showConfirm,
            onSubmit,
            registerFormRef,
            inviteChars,
            setInputRef,
            onCharInput,
            onCharKeydown,
            onPasteInvite,
            onCharFocus,
        };
    },
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['fixed-input', 'fixed-input', 'fixed-input', 'char-input', 'char-wrapper', 'char-wrapper', 'char-wrapper', 'group-gap',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("box"),
    ...{ class: ("disable-select") },
});
const __VLS_0 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ref: ("registerFormRef"),
    model: ((__VLS_ctx.registerForm)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("auto"),
}));
const __VLS_2 = __VLS_1({
    ref: ("registerFormRef"),
    model: ((__VLS_ctx.registerForm)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("auto"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
// @ts-ignore navigation for `const registerFormRef = ref()`
/** @type { typeof __VLS_ctx.registerFormRef } */ ;
var __VLS_6 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: ("register-title") },
});
const __VLS_7 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    label: ("用户名"),
    prop: ("username"),
}));
const __VLS_9 = __VLS_8({
    label: ("用户名"),
    prop: ("username"),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
const __VLS_13 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    modelValue: ((__VLS_ctx.registerForm.username)),
    maxlength: ("15"),
    ...{ class: ("fixed-input") },
}));
const __VLS_15 = __VLS_14({
    modelValue: ((__VLS_ctx.registerForm.username)),
    maxlength: ("15"),
    ...{ class: ("fixed-input") },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
{
    const { suffix: __VLS_thisSlot } = __VLS_18.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.registerForm.username.length);
}
__VLS_18.slots.default;
var __VLS_18;
__VLS_12.slots.default;
var __VLS_12;
const __VLS_19 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    label: ("密码"),
    prop: ("password"),
}));
const __VLS_21 = __VLS_20({
    label: ("密码"),
    prop: ("password"),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
const __VLS_25 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    type: ((__VLS_ctx.showPassword ? 'text' : 'password')),
    modelValue: ((__VLS_ctx.registerForm.password)),
    maxlength: ("30"),
    ...{ class: ("fixed-input") },
}));
const __VLS_27 = __VLS_26({
    type: ((__VLS_ctx.showPassword ? 'text' : 'password')),
    modelValue: ((__VLS_ctx.registerForm.password)),
    maxlength: ("30"),
    ...{ class: ("fixed-input") },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
{
    const { suffix: __VLS_thisSlot } = __VLS_30.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.registerForm.password.length);
}
__VLS_30.slots.default;
var __VLS_30;
const __VLS_31 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    ...{ 'onClick': {} },
    ...{ class: ("eye-icon") },
}));
const __VLS_33 = __VLS_32({
    ...{ 'onClick': {} },
    ...{ class: ("eye-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
let __VLS_37;
const __VLS_38 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showPassword = !__VLS_ctx.showPassword;
    }
};
let __VLS_34;
let __VLS_35;
if (__VLS_ctx.showPassword) {
    const __VLS_39 = {}.View;
    /** @type { [typeof __VLS_components.View, ] } */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({}));
    const __VLS_41 = __VLS_40({}, ...__VLS_functionalComponentArgsRest(__VLS_40));
}
else {
    const __VLS_45 = {}.hide;
    /** @type { [typeof __VLS_components.Hide, typeof __VLS_components.hide, ] } */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({}));
    const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
}
__VLS_36.slots.default;
var __VLS_36;
__VLS_24.slots.default;
var __VLS_24;
const __VLS_51 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
    label: ("重复密码"),
    prop: ("checkPass"),
}));
const __VLS_53 = __VLS_52({
    label: ("重复密码"),
    prop: ("checkPass"),
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
const __VLS_57 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    type: ((__VLS_ctx.showConfirm ? 'text' : 'password')),
    modelValue: ((__VLS_ctx.registerForm.checkPass)),
    maxlength: ("30"),
    ...{ class: ("fixed-input") },
}));
const __VLS_59 = __VLS_58({
    type: ((__VLS_ctx.showConfirm ? 'text' : 'password')),
    modelValue: ((__VLS_ctx.registerForm.checkPass)),
    maxlength: ("30"),
    ...{ class: ("fixed-input") },
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
{
    const { suffix: __VLS_thisSlot } = __VLS_62.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.registerForm.checkPass.length);
}
__VLS_62.slots.default;
var __VLS_62;
const __VLS_63 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    ...{ 'onClick': {} },
    ...{ class: ("eye-icon") },
}));
const __VLS_65 = __VLS_64({
    ...{ 'onClick': {} },
    ...{ class: ("eye-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
let __VLS_69;
const __VLS_70 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showConfirm = !__VLS_ctx.showConfirm;
    }
};
let __VLS_66;
let __VLS_67;
if (__VLS_ctx.showConfirm) {
    const __VLS_71 = {}.View;
    /** @type { [typeof __VLS_components.View, ] } */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({}));
    const __VLS_73 = __VLS_72({}, ...__VLS_functionalComponentArgsRest(__VLS_72));
}
else {
    const __VLS_77 = {}.hide;
    /** @type { [typeof __VLS_components.Hide, typeof __VLS_components.hide, ] } */ ;
    // @ts-ignore
    const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({}));
    const __VLS_79 = __VLS_78({}, ...__VLS_functionalComponentArgsRest(__VLS_78));
}
__VLS_68.slots.default;
var __VLS_68;
__VLS_56.slots.default;
var __VLS_56;
const __VLS_83 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    label: ("邀请码"),
    prop: ("inviteCode"),
}));
const __VLS_85 = __VLS_84({
    label: ("邀请码"),
    prop: ("inviteCode"),
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onPaste: (__VLS_ctx.onPasteInvite) },
    ...{ class: ("invite-inputs") },
    tabindex: ("0"),
    role: ("textbox"),
});
for (const [ch, idx] of __VLS_getVForSourceType((__VLS_ctx.inviteChars))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("char-wrapper") },
        ...{ class: (({
                'group-gap': (idx + 1) % 4 === 0 && idx !== 15,
                'group-gap-right': (idx) % 4 === 0 && idx !== 0
            })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onInput: (...[$event]) => {
                __VLS_ctx.onCharInput($event, idx);
            } },
        ...{ onKeydown: (...[$event]) => {
                __VLS_ctx.onCharKeydown($event, idx);
            } },
        ...{ onFocus: (...[$event]) => {
                __VLS_ctx.onCharFocus(idx);
            } },
        ref: ((el => __VLS_ctx.setInputRef(el, idx))),
        ...{ class: ("char-input") },
        type: ("text"),
        maxlength: ("1"),
        autocomplete: ("off"),
        inputmode: ("text"),
        'data-idx': ((idx)),
        value: ((__VLS_ctx.inviteChars[idx])),
    });
}
__VLS_88.slots.default;
var __VLS_88;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("register-button-container") },
});
const __VLS_89 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    ...{ 'onClick': {} },
    type: ("primary"),
    ...{ class: ("register-button") },
}));
const __VLS_91 = __VLS_90({
    ...{ 'onClick': {} },
    type: ("primary"),
    ...{ class: ("register-button") },
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
let __VLS_95;
const __VLS_96 = {
    onClick: (__VLS_ctx.onSubmit)
};
let __VLS_92;
let __VLS_93;
__VLS_94.slots.default;
var __VLS_94;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_97 = {}.RouterLink;
/** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
    to: ("/login"),
    ...{ class: ("to-login") },
}));
const __VLS_99 = __VLS_98({
    to: ("/login"),
    ...{ class: ("to-login") },
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
__VLS_102.slots.default;
var __VLS_102;
__VLS_5.slots.default;
var __VLS_5;
['disable-select', 'register-title', 'fixed-input', 'fixed-input', 'eye-icon', 'fixed-input', 'eye-icon', 'invite-inputs', 'char-wrapper', 'group-gap', 'group-gap-right', 'char-input', 'register-button-container', 'register-button', 'to-login',];
var __VLS_special;
let __VLS_self;
