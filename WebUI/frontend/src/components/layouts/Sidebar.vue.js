import { useStore } from '@/store';
import axios from '@/api/axios';
export default (await import('vue')).defineComponent({
    name: 'Sidebar',
    data() {
        return {
            store: useStore(),
            workshop_visible: false,
            default_visible: false,
            datasets_visable: true,
            app_groups: [],
            default_groups: [],
            groupExpand: {},
            item_selected: null,
            create_group_info: {
                name: '',
                dataset_selected: [],
                default: false,
                task_type_selected: '',
            },
            create_group_visible: false,
            rules: {
                name: [{ required: true, message: '请输入应用名称！', trigger: 'blur' }],
                dataset_selected: [{ required: true, message: '请选择数据集！', trigger: 'change' }],
                task_type_selected: [{ required: true, message: '请选择任务类型！', trigger: 'change' }],
                default: [{ required: true, validator: this.alertDefault, trigger: 'change' }],
            },
            checkAll_dataset: false,
            indeterminate_dataset: false,
            dataset_available: [],
            task_type_list: [],
        };
    },
    methods: {
        showDatasets(path) {
            this.$router.push('/application/datasetspace/' + path);
        },
        handleCreateGroupClick(mode) {
            this.create_group_info.default = mode === 'default';
            this.create_group_visible = true;
        },
        alertDefault(rule, value, callback) {
            callback();
        },
        toggleGroup(groupId) {
            if (this.groupExpand[groupId] === undefined) {
                this.groupExpand[groupId] = true; // 初次点击时，显示
            }
            else {
                this.groupExpand[groupId] = !this.groupExpand[groupId]; // 取反
            }
        },
        toggleItem(item, groupId) {
            this.$router.push(`/application/${item}/${groupId}`);
        },
        toModelSpace() {
            this.$router.push('/application/modelspace');
        },
        handleCancle() {
            this.create_group_visible = false;
            const formEl = this.$refs.ruleFormRef;
            if (!formEl)
                return;
            formEl.resetFields();
        },
        handleCheckAll_dataset(val) {
            this.indeterminate_dataset = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.create_group_info.dataset_selected = this.dataset_available
                    .map(option => option.value);
            }
            else {
                this.create_group_info.dataset_selected = [];
            }
        },
        async fetchAvailableDatasets() {
            if (this.dataset_available.length === 0) {
                axios.post('/datasets', {}).then((response) => {
                    this.dataset_available = response.data;
                }).catch((error) => {
                    console.error('Failed to fetch datasets:', error);
                });
            }
        },
        async fetchApplicationTaskType() {
            if (this.task_type_list.length === 0) {
                axios.post('/application/type').then((response) => {
                    this.task_type_list = response.data;
                }).catch((error) => {
                    this.$message.error('获取应用类型失败：', error);
                });
            }
        },
        async handleCreateGroup() {
            const formEl = this.$refs.ruleFormRef;
            if (!formEl)
                return;
            formEl.validate((valid) => {
                if (valid) {
                    const link = '/application/groups/create';
                    const payload = {
                        name: this.create_group_info.name,
                        dataset_ids: this.create_group_info.dataset_selected,
                        default: this.create_group_info.default,
                        task_type: this.create_group_info.task_type_selected,
                    };
                    axios.post(link, payload)
                        .then((response) => {
                        this.$message.success(`应用组 "${response.data.name}" 创建成功`);
                        this.create_group_visible = false;
                        this.fetchAppGroups(payload.default, response.data.id);
                    }).catch((error) => {
                        console.log(error.response.data.message);
                        if (error.response) {
                            // 服务器返回了错误状态码
                            const message = error.response.data.message
                                || error.response.data.error
                                || '未知错误';
                            this.$message.error(`错误 ${message}`);
                        }
                        else {
                            // 网络错误或其他问题
                            this.$message.error(`请求失败 ${error.message}`);
                        }
                    });
                }
                else {
                    this.$message.error('请填写完整数据');
                }
            });
        },
        async fetchAppGroups(special, select_default, select_index, select_func) {
            axios.get('/application/groups').then((response) => {
                this.default_groups = response.data.default;
                this.app_groups = response.data.app;
                if (special) {
                    this.select_index = select_index;
                    this.select_default = select_default;
                    if (select_default) {
                        this.default_visible = true;
                    }
                    else {
                        this.workshop_visible = true;
                    }
                    this.item_selected = select_func;
                }
                else {
                    if (select_default != null && select_index != null) {
                        this.select_index = select_index;
                        this.select_default = select_default;
                        if (select_default) {
                            this.default_visible = true;
                        }
                        else {
                            this.workshop_visible = true;
                        }
                    }
                    else if (this.default_groups.length > 0) {
                        this.select_index = this.default_groups[0].id;
                        this.select_default = true;
                        this.default_visible = true;
                    }
                    else if (this.app_groups.length > 0) {
                        this.select_index = this.app_groups[0].id;
                        this.select_default = false;
                        this.workshop_visible = true;
                    }
                    if (this.select_index) {
                        this.item_selected = 'analysis';
                    }
                }
            }).catch((error) => {
                console.error(error);
            });
        },
    },
    mounted() {
        this.fetchAppGroups();
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['group-section', 'group-actions', 'group-actions', 'group-title', 'group-item', 'group-item-header', 'sub-item', 'sub-item',];
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.store.state.sidebarOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidebar disable-select") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidebar-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("group-section") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: ("group-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((__VLS_ctx.store.state.sidebarOpen)))
                    return;
                __VLS_ctx.default_visible = !__VLS_ctx.default_visible;
            } },
        ...{ class: ("group-title") },
    });
    const __VLS_0 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: ("expand-icon") },
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: ("expand-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    if (__VLS_ctx.default_visible) {
        const __VLS_6 = {}.ArrowDown;
        /** @type { [typeof __VLS_components.ArrowDown, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
        const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
    }
    else {
        const __VLS_12 = {}.ArrowRight;
        /** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("group-actions") },
    });
    if (__VLS_ctx.store.state.user_perms === 'administrator') {
        const __VLS_18 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
            ...{ 'onClick': {} },
            size: ((18)),
        }));
        const __VLS_20 = __VLS_19({
            ...{ 'onClick': {} },
            size: ((18)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
        let __VLS_24;
        const __VLS_25 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.store.state.sidebarOpen)))
                    return;
                if (!((__VLS_ctx.store.state.user_perms === 'administrator')))
                    return;
                __VLS_ctx.handleCreateGroupClick('default');
            }
        };
        let __VLS_21;
        let __VLS_22;
        const __VLS_26 = {}.Plus;
        /** @type { [typeof __VLS_components.Plus, ] } */ ;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({}));
        const __VLS_28 = __VLS_27({}, ...__VLS_functionalComponentArgsRest(__VLS_27));
        __VLS_23.slots.default;
        var __VLS_23;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("group-list") },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.default_visible) }, null, null);
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.default_groups))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: ((item.id)),
            ...{ class: ("group-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.store.state.sidebarOpen)))
                        return;
                    __VLS_ctx.toggleGroup(item.id);
                } },
            ...{ class: ("group-item-header") },
        });
        const __VLS_32 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            ...{ class: ("expand-icon") },
        }));
        const __VLS_34 = __VLS_33({
            ...{ class: ("expand-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        if (__VLS_ctx.groupExpand[item.id]) {
            const __VLS_38 = {}.ArrowDown;
            /** @type { [typeof __VLS_components.ArrowDown, ] } */ ;
            // @ts-ignore
            const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({}));
            const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
        }
        else {
            const __VLS_44 = {}.ArrowRight;
            /** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
        }
        __VLS_37.slots.default;
        var __VLS_37;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: ("sub-list") },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.groupExpand[item.id]) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.store.state.sidebarOpen)))
                        return;
                    __VLS_ctx.toggleItem('analysis', item.id);
                } },
            ...{ class: ("sub-item") },
        });
        const __VLS_50 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({}));
        const __VLS_52 = __VLS_51({}, ...__VLS_functionalComponentArgsRest(__VLS_51));
        const __VLS_56 = {}.PieChart;
        /** @type { [typeof __VLS_components.PieChart, ] } */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
        const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_55.slots.default;
        var __VLS_55;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.store.state.sidebarOpen)))
                        return;
                    __VLS_ctx.toggleItem('overview', item.id);
                } },
            ...{ class: ("sub-item") },
        });
        const __VLS_62 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({}));
        const __VLS_64 = __VLS_63({}, ...__VLS_functionalComponentArgsRest(__VLS_63));
        const __VLS_68 = {}.Document;
        /** @type { [typeof __VLS_components.Document, ] } */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
        const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_67.slots.default;
        var __VLS_67;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("group-section") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: ("group-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((__VLS_ctx.store.state.sidebarOpen)))
                    return;
                __VLS_ctx.datasets_visable = !__VLS_ctx.datasets_visable;
            } },
        ...{ class: ("group-title") },
    });
    const __VLS_74 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        ...{ class: ("expand-icon") },
    }));
    const __VLS_76 = __VLS_75({
        ...{ class: ("expand-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    if (__VLS_ctx.datasets_visable) {
        const __VLS_80 = {}.ArrowDown;
        /** @type { [typeof __VLS_components.ArrowDown, ] } */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
        const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
    }
    else {
        const __VLS_86 = {}.ArrowRight;
        /** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
        // @ts-ignore
        const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({}));
        const __VLS_88 = __VLS_87({}, ...__VLS_functionalComponentArgsRest(__VLS_87));
    }
    __VLS_79.slots.default;
    var __VLS_79;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("group-actions") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("sub-list") },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.datasets_visable) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ onClick: (...[$event]) => {
                if (!((__VLS_ctx.store.state.sidebarOpen)))
                    return;
                __VLS_ctx.showDatasets('sharedSpace');
            } },
        ...{ class: ("sub-item") },
    });
    const __VLS_92 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
    const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
    const __VLS_98 = {}.Share;
    /** @type { [typeof __VLS_components.Share, ] } */ ;
    // @ts-ignore
    const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({}));
    const __VLS_100 = __VLS_99({}, ...__VLS_functionalComponentArgsRest(__VLS_99));
    __VLS_97.slots.default;
    var __VLS_97;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ onClick: (...[$event]) => {
                if (!((__VLS_ctx.store.state.sidebarOpen)))
                    return;
                __VLS_ctx.showDatasets('personalSpace');
            } },
        ...{ class: ("sub-item") },
    });
    const __VLS_104 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
    const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
    const __VLS_110 = {}.User;
    /** @type { [typeof __VLS_components.User, ] } */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({}));
    const __VLS_112 = __VLS_111({}, ...__VLS_functionalComponentArgsRest(__VLS_111));
    __VLS_109.slots.default;
    var __VLS_109;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("group-section") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: ("group-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.toModelSpace) },
        ...{ class: ("group-title") },
    });
    const __VLS_116 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ class: ("expand-icon") },
    }));
    const __VLS_118 = __VLS_117({
        ...{ class: ("expand-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("group-actions") },
    });
}
const __VLS_122 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.create_group_visible)),
    width: ("500px"),
    labelWidth: ("auto"),
    closeOnClickModal: ((false)),
}));
const __VLS_124 = __VLS_123({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.create_group_visible)),
    width: ("500px"),
    labelWidth: ("auto"),
    closeOnClickModal: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
let __VLS_128;
const __VLS_129 = {
    onClose: (__VLS_ctx.handleCancle)
};
let __VLS_125;
let __VLS_126;
{
    const { header: __VLS_thisSlot } = __VLS_127.slots;
    const [{ titleId, titleClass }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
        ...{ style: ({}) },
        id: ((titleId)),
        ...{ class: ((titleClass)) },
    });
}
const __VLS_130 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    rules: ((__VLS_ctx.rules)),
    model: ((__VLS_ctx.create_group_info)),
    ref: ("ruleFormRef"),
}));
const __VLS_132 = __VLS_131({
    rules: ((__VLS_ctx.rules)),
    model: ((__VLS_ctx.create_group_info)),
    ref: ("ruleFormRef"),
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
// @ts-ignore navigation for `const ruleFormRef = ref()`
/** @type { typeof __VLS_ctx.ruleFormRef } */ ;
var __VLS_136 = {};
const __VLS_137 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({
    label: ("应用组名称"),
    prop: ("name"),
}));
const __VLS_139 = __VLS_138({
    label: ("应用组名称"),
    prop: ("name"),
}, ...__VLS_functionalComponentArgsRest(__VLS_138));
const __VLS_143 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    modelValue: ((__VLS_ctx.create_group_info.name)),
    autocomplete: ("off"),
    placeholder: ("请输入应用组名称"),
    maxlength: ("15"),
    showWordLimit: (true),
}));
const __VLS_145 = __VLS_144({
    modelValue: ((__VLS_ctx.create_group_info.name)),
    autocomplete: ("off"),
    placeholder: ("请输入应用组名称"),
    maxlength: ("15"),
    showWordLimit: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
__VLS_142.slots.default;
var __VLS_142;
const __VLS_149 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
    label: ("应用组类型"),
    prop: ("task_type_selected"),
}));
const __VLS_151 = __VLS_150({
    label: ("应用组类型"),
    prop: ("task_type_selected"),
}, ...__VLS_functionalComponentArgsRest(__VLS_150));
const __VLS_155 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.create_group_info.task_type_selected)),
    clearable: (true),
    placeholder: ("选择应用类型"),
    popperClass: ("custom-header"),
}));
const __VLS_157 = __VLS_156({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.create_group_info.task_type_selected)),
    clearable: (true),
    placeholder: ("选择应用类型"),
    popperClass: ("custom-header"),
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
let __VLS_161;
const __VLS_162 = {
    onVisibleChange: (__VLS_ctx.fetchApplicationTaskType)
};
let __VLS_158;
let __VLS_159;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.task_type_list))) {
    const __VLS_163 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }));
    const __VLS_165 = __VLS_164({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
}
__VLS_160.slots.default;
var __VLS_160;
__VLS_154.slots.default;
var __VLS_154;
const __VLS_169 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
    label: ("选择数据集"),
    prop: ("dataset_selected"),
}));
const __VLS_171 = __VLS_170({
    label: ("选择数据集"),
    prop: ("dataset_selected"),
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
const __VLS_175 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.create_group_info.dataset_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择要分析的数据集"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((3)),
}));
const __VLS_177 = __VLS_176({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.create_group_info.dataset_selected)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择要分析的数据集"),
    popperClass: ("custom-header"),
    maxCollapseTags: ((3)),
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
let __VLS_181;
const __VLS_182 = {
    onVisibleChange: (__VLS_ctx.fetchAvailableDatasets)
};
let __VLS_178;
let __VLS_179;
{
    const { header: __VLS_thisSlot } = __VLS_180.slots;
    const __VLS_183 = {}.ElCheckbox;
    /** @type { [typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ] } */ ;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_dataset)),
        indeterminate: ((__VLS_ctx.indeterminate_dataset)),
    }));
    const __VLS_185 = __VLS_184({
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.checkAll_dataset)),
        indeterminate: ((__VLS_ctx.indeterminate_dataset)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    let __VLS_189;
    const __VLS_190 = {
        onChange: (__VLS_ctx.handleCheckAll_dataset)
    };
    let __VLS_186;
    let __VLS_187;
    __VLS_188.slots.default;
    var __VLS_188;
}
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.dataset_available))) {
    const __VLS_191 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }));
    const __VLS_193 = __VLS_192({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
}
__VLS_180.slots.default;
var __VLS_180;
__VLS_174.slots.default;
var __VLS_174;
const __VLS_197 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    label: ("应用组类型"),
    prop: ("default"),
}));
const __VLS_199 = __VLS_198({
    label: ("应用组类型"),
    prop: ("default"),
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
const __VLS_203 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
    modelValue: ((__VLS_ctx.create_group_info.default)),
}));
const __VLS_205 = __VLS_204({
    modelValue: ((__VLS_ctx.create_group_info.default)),
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
const __VLS_209 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
    label: ("默认应用"),
    value: ((true)),
    disabled: ((__VLS_ctx.store.state.user_perms !== 'administrator')),
}));
const __VLS_211 = __VLS_210({
    label: ("默认应用"),
    value: ((true)),
    disabled: ((__VLS_ctx.store.state.user_perms !== 'administrator')),
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
const __VLS_215 = {}.ElRadioButton;
/** @type { [typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ] } */ ;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
    label: ("个人应用"),
    value: ((false)),
}));
const __VLS_217 = __VLS_216({
    label: ("个人应用"),
    value: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_216));
__VLS_208.slots.default;
var __VLS_208;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("default-hint") },
});
(__VLS_ctx.create_group_info.default ? "默认应用只能由管理员创建，创建后系统内所有人可见" : "个人应用所有人可创建，创建后仅自己可见");
__VLS_202.slots.default;
var __VLS_202;
__VLS_135.slots.default;
var __VLS_135;
{
    const { footer: __VLS_thisSlot } = __VLS_127.slots;
    const __VLS_221 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
        ...{ 'onClick': {} },
    }));
    const __VLS_223 = __VLS_222({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_222));
    let __VLS_227;
    const __VLS_228 = {
        onClick: (__VLS_ctx.handleCancle)
    };
    let __VLS_224;
    let __VLS_225;
    __VLS_226.slots.default;
    var __VLS_226;
    const __VLS_229 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_231 = __VLS_230({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_230));
    let __VLS_235;
    const __VLS_236 = {
        onClick: (__VLS_ctx.handleCreateGroup)
    };
    let __VLS_232;
    let __VLS_233;
    __VLS_234.slots.default;
    var __VLS_234;
}
__VLS_127.slots.default;
var __VLS_127;
['sidebar', 'disable-select', 'sidebar-content', 'group-section', 'group-header', 'group-title', 'expand-icon', 'group-actions', 'group-list', 'group-item', 'group-item-header', 'expand-icon', 'sub-list', 'sub-item', 'sub-item', 'group-section', 'group-header', 'group-title', 'expand-icon', 'group-actions', 'sub-list', 'sub-item', 'sub-item', 'group-section', 'group-header', 'group-title', 'expand-icon', 'group-actions', 'title', 'default-hint',];
var __VLS_special;
let __VLS_self;
