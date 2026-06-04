import { useStore } from '@/store';
import axios from '@/api/axios';
export default (await import('vue')).defineComponent({
    props: {
        modelValue: {
            type: Boolean,
            required: true,
        },
    },
    computed: {
        internalVisible: {
            get() {
                return this.modelValue;
            },
            set(val) {
                this.$emit('update:modelValue', val);
            }
        },
        username() {
            // 从vuex或API获取当前用户名
            return this.store.state.user_name || 'current_user';
        }
    },
    data() {
        return {
            store: useStore(),
            activeStep: 0,
            loading: false,
            loadingTrainset: false,
            formData: {
                modelVersion: '',
                baseModel: '',
                trainset: '',
                usePretrained: true,
                optimizer: 'AdamW',
                lossFunction: 'CE',
                learningRate: 3e-4,
                epochs: 1,
                batchSize: 4,
                device: 'gpu',
                autoAssign: true,
                distributed: false,
                mixedPrecision: false
            },
            rules: {
                modelVersion: [
                    { required: true, message: '请输入模型版本名称', trigger: 'blur' }
                ],
                baseModel: [
                    { required: true, message: '请选择基础模型', trigger: 'change' }
                ],
                trainset: [
                    { required: true, message: '请选择训练使用的数据集', trigger: 'change' }
                ],
                optimizer: [
                    { required: true, message: '请选择优化器', trigger: 'change' }
                ],
                lossFunction: [
                    { required: true, message: '请选择损失函数', trigger: 'change' }
                ],
                learningRate: [
                    { type: 'number', message: '请输入有效数值', trigger: 'blur' }
                ],
                epochs: [
                    { type: 'number', message: '请输入有效数值', trigger: 'blur' }
                ],
                batchSize: [
                    { type: 'number', message: '请输入有效数值', trigger: 'blur' }
                ],
                device: [
                    { required: true, validator: this.checkDevices, trigger: 'change' }
                ]
            },
            baseModelList: [],
            trainsetList: [],
            deviceType: 'gpu',
            loadingDevices: false,
            // gpuDevices: [{ id: 0, memoryFree: 8192, memoryUsage: 20 }, { id: 1, memoryFree: 4096, memoryUsage: 50 }, { id: 2, memoryFree: 2048, memoryUsage: 80 }, { id: 3, memoryFree: 8192, memoryUsage: 20 }, { id: 4, memoryFree: 4096, memoryUsage: 50 }, { id: 5, memoryFree: 2048, memoryUsage: 80 }],
            gpu_error: false,
            gpuDevices: [],
            cpuCount: 128,
            selectedDevices: [],
        };
    },
    methods: {
        nextStep() {
            this.$refs.formRef.validate(valid => {
                if (valid)
                    this.activeStep++;
            });
        },
        prevStep() {
            this.activeStep--;
        },
        async fetchBaseModels() {
            const link = `/models/base_models`;
            axios.get(link).then((response) => {
                this.baseModelList = response.data;
            }).catch((error) => {
                console.log(error);
            });
        },
        async fetchTrainsets() {
            this.loadingTrainset = true;
            const link = `/models/${this.formData.baseModel}/trainsets`;
            axios.get(link).then((response) => {
                this.trainsetList = response.data;
            }).catch((error) => {
                console.log(error);
            }).finally(() => {
                this.loadingTrainset = false;
            });
        },
        onTrainsetVisibleChange(visible) {
            // 只在“打开” 且“还没加载过”时触发一次
            if (visible && this.trainsetList.length === 0 && !this.loadingTrainset) {
                this.fetchTrainsets();
            }
        },
        async handleSubmit() {
            this.$refs.formRef.validate(valid => {
                if (valid) {
                    this.loading = true;
                    const link = '/models/create';
                    const payload = {
                        checkpoint: {
                            version: this.formData.modelVersion,
                            model_id: this.formData.baseModel,
                            trainset_id: this.formData.trainset,
                        },
                        hyperparameters: {
                            use_pretrained: this.formData.usePretrained,
                            autoAssign: this.formData.autoAssign,
                            optimizer: this.formData.optimizer,
                            loss_function: this.formData.lossFunction,
                            learning_rate: this.formData.learningRate,
                            epochs: this.formData.epochs,
                            batch_size: this.formData.batchSize,
                            device: this.formData.device,
                            distributed: this.formData.distributed,
                            mixedPrecision: this.formData.mixedPrecision,
                        }
                    };
                    axios.post(link, payload).then((response) => {
                        if (response.data.status == "error") {
                            this.$message.error(`创建失败: ${response.data.message}`);
                            return;
                        }
                        this.$message.success('模型创建成功！');
                        this.$emit('refresh-models');
                        this.internalVisible = false;
                    }).catch((error) => {
                        this.$message.error(`创建失败: ${error.message}`);
                    }).finally(() => {
                        this.loading = false;
                    });
                }
                else {
                    return;
                }
            });
        },
        handleCancel() {
            this.$refs.formRef.resetFields();
            this.activeStep = 0;
        },
        toggleDevice(gpu) {
            if (this.formData.distributed) {
                const index = this.selectedDevices.indexOf(gpu.id);
                index === -1 ? this.selectedDevices.push(gpu.id)
                    : this.selectedDevices.splice(index, 1);
            }
            else {
                this.selectedDevices = [gpu.id];
            }
        },
        async fetchAvailableDevices() {
            const link = `/models/available_devices`;
            this.loadingDevices = true;
            axios.get(link).then((response) => {
                if (response.data.gpu_devices.status == "error") {
                    this.gpu_error = true;
                }
                else {
                    this.gpuDevices = response.data.gpu_devices.content;
                }
                this.cpuCount = response.data.cpu_count;
            }).catch((error) => {
                console.log(error);
            }).finally(() => {
                this.loadingDevices = false;
            });
        },
        checkDevices(rule, value, callback) {
            if (this.activeStep !== 2)
                callback();
            if (this.formData.autoAssign) {
                callback();
            }
            else {
                if (this.deviceType === 'gpu' && this.selectedDevices.length === 0) {
                    callback(new Error('请至少选择一个GPU设备'));
                }
                else if (this.deviceType === 'cpu' && this.formData.device !== 'cpu') {
                    callback(new Error('请选择使用CPU设备'));
                }
                else {
                    callback();
                }
            }
        }
    },
    mounted() {
        this.fetchBaseModels();
        this.fetchAvailableDevices();
    },
});
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['el-dialog__body',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.internalVisible)),
    width: ("960px"),
    closeOnClickModal: ((false)),
    ...{ class: ("model-config-dialog auto-height-dialog") },
    title: ("模型配置项"),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClose': {} },
    modelValue: ((__VLS_ctx.internalVisible)),
    width: ("960px"),
    closeOnClickModal: ((false)),
    ...{ class: ("model-config-dialog auto-height-dialog") },
    title: ("模型配置项"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
let __VLS_7;
const __VLS_8 = {
    onClose: (__VLS_ctx.handleCancel)
};
let __VLS_3;
let __VLS_4;
const __VLS_9 = {}.ElSteps;
/** @type { [typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, ] } */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    active: ((__VLS_ctx.activeStep)),
    finishStatus: ("success"),
    simple: (true),
}));
const __VLS_11 = __VLS_10({
    active: ((__VLS_ctx.activeStep)),
    finishStatus: ("success"),
    simple: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
const __VLS_15 = {}.ElStep;
/** @type { [typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ] } */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    title: ("基础配置"),
}));
const __VLS_17 = __VLS_16({
    title: ("基础配置"),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
const __VLS_21 = {}.ElStep;
/** @type { [typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ] } */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    title: ("训练参数"),
}));
const __VLS_23 = __VLS_22({
    title: ("训练参数"),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
const __VLS_27 = {}.ElStep;
/** @type { [typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ] } */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    title: ("设备设置"),
}));
const __VLS_29 = __VLS_28({
    title: ("设备设置"),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_14.slots.default;
var __VLS_14;
const __VLS_33 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ref: ("formRef"),
    model: ((__VLS_ctx.formData)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("140px"),
    ...{ class: ("config-form step-container") },
}));
const __VLS_35 = __VLS_34({
    ref: ("formRef"),
    model: ((__VLS_ctx.formData)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("140px"),
    ...{ class: ("config-form step-container") },
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
// @ts-ignore navigation for `const formRef = ref()`
/** @type { typeof __VLS_ctx.formRef } */ ;
var __VLS_39 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("step-content") },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeStep === 0) }, null, null);
const __VLS_40 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    label: ("基础模型"),
    prop: ("baseModel"),
}));
const __VLS_42 = __VLS_41({
    label: ("基础模型"),
    prop: ("baseModel"),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
const __VLS_46 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    modelValue: ((__VLS_ctx.formData.baseModel)),
    placeholder: ("请选择基础模型"),
}));
const __VLS_48 = __VLS_47({
    modelValue: ((__VLS_ctx.formData.baseModel)),
    placeholder: ("请选择基础模型"),
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
for (const [base_model] of __VLS_getVForSourceType((__VLS_ctx.baseModelList))) {
    const __VLS_52 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        label: ((base_model.alias)),
        value: ((base_model.value)),
        key: ((base_model.value)),
        disabled: ((base_model.status == 0)),
    }));
    const __VLS_54 = __VLS_53({
        label: ((base_model.alias)),
        value: ((base_model.value)),
        key: ((base_model.value)),
        disabled: ((base_model.status == 0)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
}
__VLS_51.slots.default;
var __VLS_51;
__VLS_45.slots.default;
var __VLS_45;
const __VLS_58 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
    label: ("模型名称"),
    prop: ("modelVersion"),
}));
const __VLS_60 = __VLS_59({
    label: ("模型名称"),
    prop: ("modelVersion"),
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-name-input") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("prefix") },
});
(__VLS_ctx.baseModelList?.find(model => model.value == __VLS_ctx.formData.baseModel)?.label);
(__VLS_ctx.username);
const __VLS_64 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: ((__VLS_ctx.formData.modelVersion)),
    placeholder: ("输入版本名称"),
    ...{ class: ("version-input") },
    maxlength: ("15"),
    showWordLimit: (true),
}));
const __VLS_66 = __VLS_65({
    modelValue: ((__VLS_ctx.formData.modelVersion)),
    placeholder: ("输入版本名称"),
    ...{ class: ("version-input") },
    maxlength: ("15"),
    showWordLimit: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_63.slots.default;
var __VLS_63;
const __VLS_70 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    label: ("训练集"),
    prop: ("trainset"),
}));
const __VLS_72 = __VLS_71({
    label: ("训练集"),
    prop: ("trainset"),
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
const __VLS_76 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.formData.trainset)),
    placeholder: ("请选择训练使用的数据集"),
    disabled: ((__VLS_ctx.formData.baseModel === '')),
    loading: ((__VLS_ctx.loadingTrainset)),
}));
const __VLS_78 = __VLS_77({
    ...{ 'onVisibleChange': {} },
    modelValue: ((__VLS_ctx.formData.trainset)),
    placeholder: ("请选择训练使用的数据集"),
    disabled: ((__VLS_ctx.formData.baseModel === '')),
    loading: ((__VLS_ctx.loadingTrainset)),
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_82;
const __VLS_83 = {
    onVisibleChange: (__VLS_ctx.onTrainsetVisibleChange)
};
let __VLS_79;
let __VLS_80;
for (const [trainset] of __VLS_getVForSourceType((__VLS_ctx.trainsetList))) {
    const __VLS_84 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        label: ((trainset.label)),
        value: ((trainset.value)),
        key: ((trainset.value)),
    }));
    const __VLS_86 = __VLS_85({
        label: ((trainset.label)),
        value: ((trainset.value)),
        key: ((trainset.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
}
__VLS_81.slots.default;
var __VLS_81;
__VLS_75.slots.default;
var __VLS_75;
const __VLS_90 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
    label: ("预训练权重"),
}));
const __VLS_92 = __VLS_91({
    label: ("预训练权重"),
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
const __VLS_96 = {}.ElSwitch;
/** @type { [typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ] } */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: ((__VLS_ctx.formData.usePretrained)),
}));
const __VLS_98 = __VLS_97({
    modelValue: ((__VLS_ctx.formData.usePretrained)),
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_95.slots.default;
var __VLS_95;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("step-content") },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeStep === 1) }, null, null);
const __VLS_102 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
    label: ("优化器"),
    prop: ("optimizer"),
}));
const __VLS_104 = __VLS_103({
    label: ("优化器"),
    prop: ("optimizer"),
}, ...__VLS_functionalComponentArgsRest(__VLS_103));
const __VLS_108 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    modelValue: ((__VLS_ctx.formData.optimizer)),
}));
const __VLS_110 = __VLS_109({
    modelValue: ((__VLS_ctx.formData.optimizer)),
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
const __VLS_114 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
    label: ("AdamW"),
    value: ("AdamW"),
}));
const __VLS_116 = __VLS_115({
    label: ("AdamW"),
    value: ("AdamW"),
}, ...__VLS_functionalComponentArgsRest(__VLS_115));
const __VLS_120 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: ("SGD"),
    value: ("SGD"),
}));
const __VLS_122 = __VLS_121({
    label: ("SGD"),
    value: ("SGD"),
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_113.slots.default;
var __VLS_113;
__VLS_107.slots.default;
var __VLS_107;
const __VLS_126 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    label: ("损失函数"),
    prop: ("lossFunction"),
}));
const __VLS_128 = __VLS_127({
    label: ("损失函数"),
    prop: ("lossFunction"),
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
const __VLS_132 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    modelValue: ((__VLS_ctx.formData.lossFunction)),
}));
const __VLS_134 = __VLS_133({
    modelValue: ((__VLS_ctx.formData.lossFunction)),
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
const __VLS_138 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
    label: ("CrossEntropy"),
    value: ("CE"),
}));
const __VLS_140 = __VLS_139({
    label: ("CrossEntropy"),
    value: ("CE"),
}, ...__VLS_functionalComponentArgsRest(__VLS_139));
const __VLS_144 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    label: ("MSE"),
    value: ("MSE"),
}));
const __VLS_146 = __VLS_145({
    label: ("MSE"),
    value: ("MSE"),
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
const __VLS_150 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
    label: ("L1"),
    value: ("L1"),
}));
const __VLS_152 = __VLS_151({
    label: ("L1"),
    value: ("L1"),
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
__VLS_137.slots.default;
var __VLS_137;
__VLS_131.slots.default;
var __VLS_131;
const __VLS_156 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    label: ("学习率"),
    prop: ("learningRate"),
}));
const __VLS_158 = __VLS_157({
    label: ("学习率"),
    prop: ("learningRate"),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
const __VLS_162 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    modelValue: ((__VLS_ctx.formData.learningRate)),
    min: ((1e-5)),
    max: ((1e-2)),
    step: ((1e-5)),
    showInput: (true),
    formatTooltip: (((val) => val.toExponential(2))),
}));
const __VLS_164 = __VLS_163({
    modelValue: ((__VLS_ctx.formData.learningRate)),
    min: ((1e-5)),
    max: ((1e-2)),
    step: ((1e-5)),
    showInput: (true),
    formatTooltip: (((val) => val.toExponential(2))),
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
__VLS_161.slots.default;
var __VLS_161;
const __VLS_168 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: ("训练轮数"),
    prop: ("epochs"),
}));
const __VLS_170 = __VLS_169({
    label: ("训练轮数"),
    prop: ("epochs"),
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
const __VLS_174 = {}.ElInputNumber;
/** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    modelValue: ((__VLS_ctx.formData.epochs)),
    min: ((1)),
    max: ((100)),
    controlsPosition: ("right"),
}));
const __VLS_176 = __VLS_175({
    modelValue: ((__VLS_ctx.formData.epochs)),
    min: ((1)),
    max: ((100)),
    controlsPosition: ("right"),
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
__VLS_173.slots.default;
var __VLS_173;
const __VLS_180 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    label: ("批处理大小"),
    prop: ("batchSize"),
}));
const __VLS_182 = __VLS_181({
    label: ("批处理大小"),
    prop: ("batchSize"),
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
const __VLS_186 = {}.ElSlider;
/** @type { [typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ] } */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    modelValue: ((__VLS_ctx.formData.batchSize)),
    min: ((4)),
    max: ((64)),
    step: ((4)),
    showStops: (true),
    showInput: (true),
}));
const __VLS_188 = __VLS_187({
    modelValue: ((__VLS_ctx.formData.batchSize)),
    min: ((4)),
    max: ((64)),
    step: ((4)),
    showStops: (true),
    showInput: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
__VLS_185.slots.default;
var __VLS_185;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("step-content") },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeStep === 2) }, null, null);
const __VLS_192 = {}.ElRow;
/** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
const __VLS_198 = {}.ElCol;
/** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    span: ((5)),
}));
const __VLS_200 = __VLS_199({
    span: ((5)),
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
const __VLS_204 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
    label: ("分布式训练"),
}));
const __VLS_206 = __VLS_205({
    label: ("分布式训练"),
}, ...__VLS_functionalComponentArgsRest(__VLS_205));
const __VLS_210 = {}.ElSwitch;
/** @type { [typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ] } */ ;
// @ts-ignore
const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
    modelValue: ((__VLS_ctx.formData.distributed)),
}));
const __VLS_212 = __VLS_211({
    modelValue: ((__VLS_ctx.formData.distributed)),
}, ...__VLS_functionalComponentArgsRest(__VLS_211));
__VLS_209.slots.default;
var __VLS_209;
__VLS_203.slots.default;
var __VLS_203;
const __VLS_216 = {}.ElCol;
/** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    span: ((5)),
}));
const __VLS_218 = __VLS_217({
    span: ((5)),
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
const __VLS_222 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
    label: ("混合精度训练"),
}));
const __VLS_224 = __VLS_223({
    label: ("混合精度训练"),
}, ...__VLS_functionalComponentArgsRest(__VLS_223));
const __VLS_228 = {}.ElSwitch;
/** @type { [typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ] } */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    modelValue: ((__VLS_ctx.formData.mixedPrecision)),
}));
const __VLS_230 = __VLS_229({
    modelValue: ((__VLS_ctx.formData.mixedPrecision)),
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_227.slots.default;
var __VLS_227;
__VLS_221.slots.default;
var __VLS_221;
__VLS_197.slots.default;
var __VLS_197;
const __VLS_234 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
    label: ("训练设备"),
    prop: ("device"),
}));
const __VLS_236 = __VLS_235({
    label: ("训练设备"),
    prop: ("device"),
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
const __VLS_240 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    modelValue: ((__VLS_ctx.formData.autoAssign)),
}));
const __VLS_242 = __VLS_241({
    modelValue: ((__VLS_ctx.formData.autoAssign)),
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
const __VLS_246 = {}.ElRadio;
/** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
    value: ((true)),
}));
const __VLS_248 = __VLS_247({
    value: ((true)),
}, ...__VLS_functionalComponentArgsRest(__VLS_247));
__VLS_251.slots.default;
var __VLS_251;
const __VLS_252 = {}.ElRadio;
/** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    value: ((false)),
}));
const __VLS_254 = __VLS_253({
    value: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
__VLS_257.slots.default;
var __VLS_257;
__VLS_245.slots.default;
var __VLS_245;
__VLS_239.slots.default;
var __VLS_239;
if (__VLS_ctx.formData.autoAssign) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("auto-assign-tip") },
    });
    const __VLS_258 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({
        title: ("系统将自动选择最优设备组合"),
        type: ("info"),
        closable: ((false)),
        showIcon: (true),
    }));
    const __VLS_260 = __VLS_259({
        title: ("系统将自动选择最优设备组合"),
        type: ("info"),
        closable: ((false)),
        showIcon: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_259));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("device-selector") },
    });
    const __VLS_264 = {}.ElTabs;
    /** @type { [typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ] } */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        modelValue: ((__VLS_ctx.deviceType)),
        ...{ class: ("device-tabs") },
    }));
    const __VLS_266 = __VLS_265({
        modelValue: ((__VLS_ctx.deviceType)),
        ...{ class: ("device-tabs") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    const __VLS_270 = {}.ElTabPane;
    /** @type { [typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ] } */ ;
    // @ts-ignore
    const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
        label: ("GPU"),
        name: ("gpu"),
    }));
    const __VLS_272 = __VLS_271({
        label: ("GPU"),
        name: ("gpu"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_271));
    if (__VLS_ctx.loadingDevices) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("device-loading") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("el-icon-loading") },
        });
    }
    else if (__VLS_ctx.gpu_error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("device-error") },
        });
        const __VLS_276 = {}.ElAlert;
        /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
        // @ts-ignore
        const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
            title: ("GPU设备异常或没有可用的GPU"),
            type: ("error"),
            closable: ((false)),
            showIcon: (true),
        }));
        const __VLS_278 = __VLS_277({
            title: ("GPU设备异常或没有可用的GPU"),
            type: ("error"),
            closable: ((false)),
            showIcon: (true),
        }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("gpu-list") },
        });
        for (const [gpu] of __VLS_getVForSourceType((__VLS_ctx.gpuDevices))) {
            const __VLS_282 = {}.ElCard;
            /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
            // @ts-ignore
            const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
                ...{ 'onClick': {} },
                key: ((gpu.id)),
                ...{ class: (({ 'selected': __VLS_ctx.selectedDevices.includes(gpu.id), 'disabled': gpu.memoryFree < 1024 })) },
                ...{ class: ("gpu-card") },
            }));
            const __VLS_284 = __VLS_283({
                ...{ 'onClick': {} },
                key: ((gpu.id)),
                ...{ class: (({ 'selected': __VLS_ctx.selectedDevices.includes(gpu.id), 'disabled': gpu.memoryFree < 1024 })) },
                ...{ class: ("gpu-card") },
            }, ...__VLS_functionalComponentArgsRest(__VLS_283));
            let __VLS_288;
            const __VLS_289 = {
                onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.formData.autoAssign))))
                        return;
                    if (!(!((__VLS_ctx.loadingDevices))))
                        return;
                    if (!(!((__VLS_ctx.gpu_error))))
                        return;
                    __VLS_ctx.toggleDevice(gpu);
                }
            };
            let __VLS_285;
            let __VLS_286;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("gpu-header") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("gpu-id") },
            });
            (gpu.id);
            const __VLS_290 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
                type: ((gpu.memoryFree > 4096 ? 'success' : (gpu.memoryFree > 2048 ? 'warning' : 'danger'))),
                size: ("small"),
            }));
            const __VLS_292 = __VLS_291({
                type: ((gpu.memoryFree > 4096 ? 'success' : (gpu.memoryFree > 2048 ? 'warning' : 'danger'))),
                size: ("small"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_291));
            (gpu.memoryFree);
            __VLS_295.slots.default;
            var __VLS_295;
            const __VLS_296 = {}.ElProgress;
            /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
            // @ts-ignore
            const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
                percentage: ((gpu.memoryUsage)),
                color: ((gpu.memoryUsage > 80 ? '#f56c6c' : '#409eff')),
                showText: ((false)),
            }));
            const __VLS_298 = __VLS_297({
                percentage: ((gpu.memoryUsage)),
                color: ((gpu.memoryUsage > 80 ? '#f56c6c' : '#409eff')),
                showText: ((false)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_297));
            __VLS_287.slots.default;
            var __VLS_287;
        }
    }
    __VLS_275.slots.default;
    var __VLS_275;
    const __VLS_302 = {}.ElTabPane;
    /** @type { [typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ] } */ ;
    // @ts-ignore
    const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
        label: ("CPU"),
        name: ("cpu"),
    }));
    const __VLS_304 = __VLS_303({
        label: ("CPU"),
        name: ("cpu"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_303));
    const __VLS_308 = {}.ElRadio;
    /** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        modelValue: ((__VLS_ctx.formData.device)),
        label: ("cpu"),
        disabled: ((__VLS_ctx.formData.distributed)),
    }));
    const __VLS_310 = __VLS_309({
        modelValue: ((__VLS_ctx.formData.device)),
        label: ("cpu"),
        disabled: ((__VLS_ctx.formData.distributed)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    (__VLS_ctx.cpuCount);
    __VLS_313.slots.default;
    var __VLS_313;
    __VLS_307.slots.default;
    var __VLS_307;
    __VLS_269.slots.default;
    var __VLS_269;
}
__VLS_38.slots.default;
var __VLS_38;
{
    const { footer: __VLS_thisSlot } = __VLS_5.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    if (__VLS_ctx.activeStep > 0) {
        const __VLS_314 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_315 = __VLS_asFunctionalComponent(__VLS_314, new __VLS_314({
            ...{ 'onClick': {} },
        }));
        const __VLS_316 = __VLS_315({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_315));
        let __VLS_320;
        const __VLS_321 = {
            onClick: (__VLS_ctx.prevStep)
        };
        let __VLS_317;
        let __VLS_318;
        __VLS_319.slots.default;
        var __VLS_319;
    }
    if (__VLS_ctx.activeStep < 2) {
        const __VLS_322 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_323 = __VLS_asFunctionalComponent(__VLS_322, new __VLS_322({
            ...{ 'onClick': {} },
            type: ("primary"),
        }));
        const __VLS_324 = __VLS_323({
            ...{ 'onClick': {} },
            type: ("primary"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_323));
        let __VLS_328;
        const __VLS_329 = {
            onClick: (__VLS_ctx.nextStep)
        };
        let __VLS_325;
        let __VLS_326;
        __VLS_327.slots.default;
        var __VLS_327;
    }
    if (__VLS_ctx.activeStep === 2) {
        const __VLS_330 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
            ...{ 'onClick': {} },
            type: ("success"),
            loading: ((__VLS_ctx.loading)),
        }));
        const __VLS_332 = __VLS_331({
            ...{ 'onClick': {} },
            type: ("success"),
            loading: ((__VLS_ctx.loading)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_331));
        let __VLS_336;
        const __VLS_337 = {
            onClick: (__VLS_ctx.handleSubmit)
        };
        let __VLS_333;
        let __VLS_334;
        (__VLS_ctx.loading ? '创建中...' : '立即创建');
        __VLS_335.slots.default;
        var __VLS_335;
    }
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-loading-overlay") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("loader") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: ("circular") },
        viewBox: ("25 25 50 50"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        ...{ class: ("path") },
        cx: ("50"),
        cy: ("50"),
        r: ("20"),
        fill: ("none"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("loading-text") },
    });
}
__VLS_5.slots.default;
var __VLS_5;
['model-config-dialog', 'auto-height-dialog', 'config-form', 'step-container', 'step-content', 'model-name-input', 'prefix', 'version-input', 'step-content', 'step-content', 'auto-assign-tip', 'device-selector', 'device-tabs', 'device-loading', 'el-icon-loading', 'device-error', 'gpu-list', 'selected', 'disabled', 'gpu-card', 'gpu-header', 'gpu-id', 'dialog-footer', 'dialog-loading-overlay', 'loader', 'circular', 'path', 'loading-text',];
var __VLS_special;
let __VLS_self;
