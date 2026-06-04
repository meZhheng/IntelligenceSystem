import axios from '@/api/axios';
import { useStore } from '@/store';
export default (await import('vue')).defineComponent({
    name: 'Login', //this is the name of the component
    data() {
        return {
            allowedRegex: /[^\u4E00-\u9FFFA-Za-z0-9_!@#$%^&*]/g,
            aloowedPasswordRegex: /[^A-Za-z0-9_!@#$%^&*]/g,
            loginForm: {
                username: '',
                password: '',
                errors: 0, // 表单是否在前端验证通过，0 表示没有错误，验证通过
                usernameError: null,
                passwordError: null,
            },
            rules: {
                username: [
                    { required: true, message: '请输入用户名', trigger: 'blur' },
                    {
                        pattern: this.allowedRegex,
                        message: '用户名只能包含常用中文字符、数字、字母和 _!@#$%^&*',
                        trigger: 'blur',
                    },
                ],
                password: [
                    { required: true, message: '请输入密码', trigger: 'blur' },
                    {
                        pattern: this.aloowedPasswordRegex,
                        message: '密码只能包含数字、字母和 _!@#$%^&*',
                        trigger: 'blur',
                    },
                ],
            },
            store: useStore(),
            // 控制明／暗文
            showPassword: false,
        };
    },
    methods: {
        // 实时过滤不合法字符
        onUsernameInput(val) {
            // 把所有不在白名单里的字符替换为空
            this.loginForm.username = val.replace(this.allowedRegex, '');
        },
        onPasswordInput(val) {
            this.loginForm.password = val.replace(/[^A-Za-z0-9_!@#$%^&*]/g, '');
        },
        onLogin() {
            // 1. 统一校验：只要 username 或 password 有任何一个为空，就提示并 return
            if (!this.loginForm.username || !this.loginForm.password) {
                this.$message.error('请输入账号或者密码');
                return;
            }
            // 2. 如果都不为空，就清除之前的错误信息（可选）
            this.loginForm.usernameError = null;
            this.loginForm.passwordError = null;
            // Helper: 对 Unicode 安全的 Base64 编码（把 UTF-8 -> base64）
            function base64EncodeUnicode(str) {
                // encodeURIComponent -> 把 UTF-8 转为 %xx 序列，
                // 然后把 %xx 替换成对应的字符，最后 btoa 编码成 base64
                return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                    return String.fromCharCode(parseInt(p1, 16)); // ✅ Correct usage
                }));
            }
            // 3. 发起登录请求（手动设置 Authorization，避免使用 axios 的 auth：{}）
            const path = '/auth/tokens';
            const credentials = `${this.loginForm.username}:${this.loginForm.password}`;
            const basicToken = base64EncodeUnicode(credentials);
            axios.post(path, {}, {
                headers: {
                    Authorization: `Basic ${basicToken}`
                }
            })
                .then((response) => {
                // handle success
                this.store.loginAction(response.data);
                this.$message.success('登录成功');
                setTimeout(() => {
                    if (this.$route.query.redirect == undefined) {
                        this.$router.push('/');
                    }
                    else {
                        this.$router
                            .push(this.$route.query.redirect)
                            .then(() => {
                            // 跳转完成后刷新整页
                            window.location.reload();
                        });
                    }
                }, 500);
            })
                .catch((error) => {
                // handle error
                if (error.response && error.response.data.status == 402) {
                    this.$message.error(error.response.data.message);
                }
                else {
                    this.$message.error('服务器出错');
                    console.log(error);
                }
            });
        }
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['fixed-input', 'fixed-input', 'fixed-input',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("box"),
});
const __VLS_0 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    model: ((__VLS_ctx.loginForm)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("auto"),
}));
const __VLS_2 = __VLS_1({
    model: ((__VLS_ctx.loginForm)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("auto"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: ("login-title") },
});
const __VLS_6 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    label: ("用户名"),
    prop: ("username"),
}));
const __VLS_8 = __VLS_7({
    label: ("用户名"),
    prop: ("username"),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("form-item-row") },
});
const __VLS_12 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onInput': {} },
    type: ("text"),
    modelValue: ((__VLS_ctx.loginForm.username)),
    placeholder: ("请输入用户名"),
    maxlength: ("15"),
    ...{ class: ("fixed-input") },
}));
const __VLS_14 = __VLS_13({
    ...{ 'onInput': {} },
    type: ("text"),
    modelValue: ((__VLS_ctx.loginForm.username)),
    placeholder: ("请输入用户名"),
    maxlength: ("15"),
    ...{ class: ("fixed-input") },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_18;
const __VLS_19 = {
    onInput: (__VLS_ctx.onUsernameInput)
};
let __VLS_15;
let __VLS_16;
{
    const { suffix: __VLS_thisSlot } = __VLS_17.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.loginForm.username.length);
}
__VLS_17.slots.default;
var __VLS_17;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("input-hint") },
});
__VLS_11.slots.default;
var __VLS_11;
const __VLS_20 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: ("密码"),
    prop: ("password"),
}));
const __VLS_22 = __VLS_21({
    label: ("密码"),
    prop: ("password"),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("form-item-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("from-item-input") },
});
const __VLS_26 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onInput': {} },
    type: ((__VLS_ctx.showPassword ? 'text' : 'password')),
    modelValue: ((__VLS_ctx.loginForm.password)),
    placeholder: ("请输入密码"),
    maxlength: ("30"),
    ...{ class: ("fixed-input") },
}));
const __VLS_28 = __VLS_27({
    ...{ 'onInput': {} },
    type: ((__VLS_ctx.showPassword ? 'text' : 'password')),
    modelValue: ((__VLS_ctx.loginForm.password)),
    placeholder: ("请输入密码"),
    maxlength: ("30"),
    ...{ class: ("fixed-input") },
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_asFunctionalDirective(__VLS_directives.vNoCopy)(null, { ...__VLS_directiveBindingRestFields, }, null, null);
let __VLS_32;
const __VLS_33 = {
    onInput: (__VLS_ctx.onPasswordInput)
};
let __VLS_29;
let __VLS_30;
{
    const { suffix: __VLS_thisSlot } = __VLS_31.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    (__VLS_ctx.loginForm.password.length);
}
__VLS_31.slots.default;
var __VLS_31;
const __VLS_34 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    ...{ 'onClick': {} },
    ...{ class: ("eye-icon") },
}));
const __VLS_36 = __VLS_35({
    ...{ 'onClick': {} },
    ...{ class: ("eye-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
let __VLS_40;
const __VLS_41 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showPassword = !__VLS_ctx.showPassword;
    }
};
let __VLS_37;
let __VLS_38;
if (__VLS_ctx.showPassword) {
    const __VLS_42 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({}));
    const __VLS_44 = __VLS_43({}, ...__VLS_functionalComponentArgsRest(__VLS_43));
    const __VLS_48 = {}.View;
    /** @type { [typeof __VLS_components.View, ] } */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
    const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_47.slots.default;
    var __VLS_47;
}
else {
    const __VLS_54 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({}));
    const __VLS_56 = __VLS_55({}, ...__VLS_functionalComponentArgsRest(__VLS_55));
    const __VLS_60 = {}.Hide;
    /** @type { [typeof __VLS_components.Hide, ] } */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
    const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_59.slots.default;
    var __VLS_59;
}
__VLS_39.slots.default;
var __VLS_39;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("input-hint") },
});
__VLS_25.slots.default;
var __VLS_25;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("login-button-container") },
});
const __VLS_66 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    ...{ 'onClick': {} },
    type: ("primary"),
    ...{ class: ("login-button") },
}));
const __VLS_68 = __VLS_67({
    ...{ 'onClick': {} },
    type: ("primary"),
    ...{ class: ("login-button") },
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
let __VLS_72;
const __VLS_73 = {
    onClick: (__VLS_ctx.onLogin)
};
let __VLS_69;
let __VLS_70;
__VLS_71.slots.default;
var __VLS_71;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_74 = {}.RouterLink;
/** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
    to: ("/register"),
}));
const __VLS_76 = __VLS_75({
    to: ("/register"),
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
__VLS_79.slots.default;
var __VLS_79;
__VLS_5.slots.default;
var __VLS_5;
['login-title', 'form-item-row', 'fixed-input', 'input-hint', 'form-item-row', 'from-item-input', 'fixed-input', 'eye-icon', 'input-hint', 'login-button-container', 'login-button',];
var __VLS_special;
let __VLS_self;
