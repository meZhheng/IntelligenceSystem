<template>
<el-dialog
    v-model="internalVisible"
    width="960px"
    :close-on-click-modal="false"
    @close="handleCancel"
    class="model-config-dialog auto-height-dialog"
    title="模型配置项"
>
    <!-- 步骤条 -->
    <el-steps :active="activeStep" finish-status="success" simple>
        <el-step title="基础配置" />
        <el-step title="训练参数" />
        <el-step title="设备设置" />
    </el-steps>

    <el-form 
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        class="config-form step-container"
    >
        <!-- 步骤1：基础配置 -->
        <div v-show="activeStep === 0" class="step-content">
            <el-form-item label="基础模型" prop="baseModel">
                <el-select v-model="formData.baseModel" placeholder="请选择基础模型">
                    <el-option 
                        :label="base_model.alias" 
                        :value="base_model.value" 
                        v-for="base_model in baseModelList" 
                        :key="base_model.value"
                        :disabled="base_model.status == 0"
                    />
                </el-select>
            </el-form-item>
            <el-form-item label="模型名称" prop="modelVersion">
                <div class="model-name-input">
                    <span class="prefix">
                        {{ baseModelList?.find(model => model.value == formData.baseModel)?.label }}/{{ username }}/
                    </span>
                    <el-input 
                        v-model="formData.modelVersion" 
                        placeholder="输入版本名称"
                        class="version-input"
                        maxlength="15" show-word-limit
                    />
                </div>
            </el-form-item>
            <el-form-item label="训练集" prop="trainset">
                <el-select 
                    v-model="formData.trainset" 
                    placeholder="请选择训练使用的数据集"
                    :disabled="formData.baseModel === ''"
                    :loading="loadingTrainset"
                    @visible-change="onTrainsetVisibleChange"    
                >
                    <el-option 
                        :label="trainset.label" 
                        :value="trainset.value" 
                        v-for="trainset in trainsetList" 
                        :key="trainset.value"
                    />
                </el-select>
            </el-form-item>
            <el-form-item label="预训练权重">
                <el-switch v-model="formData.usePretrained" />
            </el-form-item>
        </div>

        <!-- 步骤2：训练参数 -->
        <div v-show="activeStep === 1" class="step-content">
            <el-form-item label="优化器" prop="optimizer">
            <el-select v-model="formData.optimizer">
                <el-option label="AdamW" value="AdamW" />
                <el-option label="SGD" value="SGD" />
            </el-select>
            </el-form-item>
            <el-form-item label="损失函数" prop="lossFunction">
            <el-select v-model="formData.lossFunction">
                <el-option label="CrossEntropy" value="CE" />
                <el-option label="MSE" value="MSE" />
                <el-option label="L1" value="L1" />
                <!-- <el-option label="BCE" value="BCE" /> -->
            </el-select>
            </el-form-item>
            <el-form-item label="学习率" prop="learningRate">
                <el-slider 
                    v-model="formData.learningRate"
                    :min="1e-5"
                    :max="1e-2"
                    :step="1e-5"
                    show-input
                    :format-tooltip="(val) => val.toExponential(2)"
                />
            </el-form-item>
            <el-form-item label="训练轮数" prop="epochs">
                <el-input-number 
                    v-model="formData.epochs"
                    :min="1"
                    :max="100"
                    controls-position="right"
                />
            </el-form-item>
            <el-form-item label="批处理大小" prop="batchSize">
                <el-slider
                    v-model="formData.batchSize"
                    :min="4"
                    :max="64"
                    :step="4"
                    show-stops
                    show-input
                />
            </el-form-item>
        </div>

        <!-- 步骤3：设备设置 -->
        <div v-show="activeStep === 2" class="step-content">
            <el-row>
                <el-col :span="5">
                    <el-form-item label="分布式训练">
                        <el-switch v-model="formData.distributed" />
                    </el-form-item>
                </el-col>
                <el-col :span="5">
                    <el-form-item label="混合精度训练">
                        <el-switch v-model="formData.mixedPrecision" />
                    </el-form-item>
                </el-col>
            </el-row>
            <el-form-item label="训练设备" prop="device">
                <el-radio-group v-model="formData.autoAssign">
                    <el-radio :value="true">自动分配</el-radio>
                    <el-radio :value="false">手动选择</el-radio>
                </el-radio-group>
            </el-form-item>
            <!-- 自动分配模式 -->
            <div v-if="formData.autoAssign" class="auto-assign-tip">
                <el-alert
                    title="系统将自动选择最优设备组合"
                    type="info"
                    :closable="false"
                    show-icon
                />
            </div>
            <!-- 手动选择模式 -->
            <div v-else class="device-selector">
                <!-- 设备类型切换 -->
                <el-tabs v-model="deviceType" class="device-tabs">
                    <el-tab-pane label="GPU" name="gpu">
                        <div v-if="loadingDevices" class="device-loading">
                            <i class="el-icon-loading">正在加载设备信息...</i>
                        </div>
                        <div v-else-if="gpu_error" class="device-error">
                            <el-alert
                                title="GPU设备异常或没有可用的GPU"
                                type="error"
                                :closable="false"
                                show-icon
                            />
                        </div>
                        <div v-else class="gpu-list">
                            <el-card 
                                v-for="gpu in gpuDevices" 
                                :key="gpu.id"
                                :class="{ 'selected': selectedDevices.includes(gpu.id), 'disabled': gpu.memoryFree < 1024 }"
                                @click="toggleDevice(gpu)"
                                class="gpu-card"
                            >
                            <div class="gpu-header">
                                <span class="gpu-id">GPU {{ gpu.id }}</span>
                                <el-tag 
                                    :type="gpu.memoryFree > 4096 ? 'success' : (gpu.memoryFree > 2048 ? 'warning' : 'danger')"
                                    size="small"
                                    >
                                    {{ gpu.memoryFree }} MB 可用
                                </el-tag>
                            </div>
                            <el-progress 
                                :percentage="gpu.memoryUsage"
                                :color="gpu.memoryUsage > 80 ? '#f56c6c' : '#409eff'"
                                :show-text="false"
                            />
                            </el-card>
                        </div>
                    </el-tab-pane>
                    <el-tab-pane label="CPU" name="cpu">
                        <el-radio 
                            v-model="formData.device" 
                            label="cpu" 
                            :disabled="formData.distributed"
                        >
                            CPU 核心数: {{ cpuCount }}
                        </el-radio>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </div>
    </el-form>

    <!-- 底部按钮 -->
    <template #footer>
        <div class="dialog-footer">
            <el-button @click="prevStep" v-if="activeStep > 0">上一步</el-button>
            <el-button type="primary" @click="nextStep" v-if="activeStep < 2">
                下一步
            </el-button>
            <el-button 
                type="success" 
                @click="handleSubmit"
                v-if="activeStep === 2"
                :loading="loading"
            >
                {{ loading ? '创建中...' : '立即创建' }}
            </el-button>
        </div>
    </template>

    <!-- 局部加载遮罩 -->
    <div v-if="loading" class="dialog-loading-overlay">
        <div class="loader">
            <svg class="circular" viewBox="25 25 50 50">
                <circle class="path" cx="50" cy="50" r="20" fill="none"/>
            </svg>
            <div class="loading-text">正在创建模型...</div>
        </div>
    </div>
</el-dialog>
</template>

<script>
import { useStore } from '@/store'
import axios from '@/api/axios';

export default {
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
                if (valid) this.activeStep++;
            });
        },
        prevStep() {
            this.activeStep--;
        },

        async fetchBaseModels() {
            const link = `/models/base_models`;
            axios.get(link).then((response) => {
                this.baseModelList = response.data
            }).catch((error) => {
                console.log(error)
            })
        },


        async fetchTrainsets() {
            this.loadingTrainset = true;
            const link = `/models/${this.formData.baseModel}/trainsets`;
            axios.get(link).then((response) => {
                this.trainsetList = response.data
            }).catch((error) => {
                console.log(error)
            }).finally(() => {
                this.loadingTrainset = false;
            })
        },
        onTrainsetVisibleChange(visible) {
            // 只在“打开” 且“还没加载过”时触发一次
            if (visible && this.trainsetList.length === 0 && !this.loadingTrainset) {
                this.fetchTrainsets()
            }
        },
        async handleSubmit() {
            this.$refs.formRef.validate(valid => {
                if (valid) {
                    this.loading = true;

                    const link = '/models/create'
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
                    }

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
                } else {
                    return
                }
            })
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
            } else {
                this.selectedDevices = [gpu.id];
            }
        },

        async fetchAvailableDevices() {
            const link = `/models/available_devices`;
            this.loadingDevices = true;

            axios.get(link).then((response) => {
                if (response.data.gpu_devices.status == "error") {
                    this.gpu_error = true;
                } else {
                    this.gpuDevices = response.data.gpu_devices.content;
                }
                
                this.cpuCount = response.data.cpu_count;
            }).catch((error) => {
                console.log(error)
            }).finally(() => {
                this.loadingDevices = false;
            });
        },

        checkDevices(rule, value, callback) {
            if (this.activeStep !== 2) callback();

            if (this.formData.autoAssign) {
                callback();
            } else {
                if (this.deviceType === 'gpu' && this.selectedDevices.length === 0) {
                    callback(new Error('请至少选择一个GPU设备'));
                } else if (this.deviceType === 'cpu' && this.formData.device !== 'cpu') {
                    callback(new Error('请选择使用CPU设备'));
                } else {
                    callback();
                }
            }
        }
    },

    mounted() {
        this.fetchBaseModels();
        this.fetchAvailableDevices();
    },
};
</script>

<style lang="scss" scoped>
.device-selector {
  margin: 0 20px;
  
  .device-tabs {
    
    .el-tabs__content {
      max-height: 300px;
      overflow-y: auto;
    }
  }
  
  .gpu-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    box-sizing: border-box;
    padding: 8px;
  }
  
  .gpu-card {
    cursor: pointer;
    transition: all 0.3s;
    border: 2px solid transparent;
    
    &.selected {
      border-color: #409eff;
      box-shadow: 0 4px 8px rgba(64, 158, 255, 0.2);
    }
    
    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .gpu-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .el-progress {
      margin-top: 8px;
    }
  }
}

.model-config-dialog {
    .el-dialog__body {
        position: relative; // 关键：作为遮罩层的定位基准
        padding: 20px;
    }

    .config-form {
        .el-form-item {
            margin-bottom: 24px;
        }
    }

    .dialog-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 4px;
        
        .loader {
            text-align: center;
        }
        
        .circular {
            animation: rotate 2s linear infinite;
            width: 48px;
            height: 48px;
        }
        
        .path {
            stroke: #409EFF;
            stroke-width: 4;
            stroke-linecap: round;
            animation: dash 1.5s ease-in-out infinite;
        }
        
        .loading-text {
            margin-top: 12px;
            color: #666;
            font-size: 14px;
        }
    }
    
    /* 禁用按钮交互 */
    &.is-loading {
        .el-dialog__footer {
            pointer-events: none;
            opacity: 0.6;
        }
    }
}

.auto-height-dialog {
  .el-dialog__body {
    transition: height 0.3s ease-in-out;
    overflow: hidden;
  }
  
  .step-container {
    min-height: 150px; // 最小高度
    max-height: 600px; // 最大高度
    overflow-y: auto;
  }
  
  .step-content {
    padding: 20px 0;
  }
}

.model-name-input {
  display: flex;
  align-items: center;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding-left: 8px;
  background: #f5f7fa;
  width: 100%;
  
  .prefix {
    color: #909399;
    margin-right: 8px;
    white-space: nowrap;
  }
  
  .version-input {
    width: 100%;
    flex: 1;
    .el-input__inner {
      border: none;
      padding: 0;
      background: transparent;
    }
  }
}

@keyframes rotate {
    100% {
        transform: rotate(360deg);
    }
}

@keyframes dash {
    0% {
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
    }
    50% {
        stroke-dasharray: 89, 200;
        stroke-dashoffset: -35px;
    }
    100% {
        stroke-dasharray: 89, 200;
        stroke-dashoffset: -124px;
    }
}
</style>

<style>
.el-slider__input {
    width: 200px !important;
}
</style>