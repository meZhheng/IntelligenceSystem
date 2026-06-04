<template>
<div class="container">
    <div class="container-header">
        <span class="title">上传数据集</span>
    </div>
    <div class="container-body">
        <div class="body-content">
            <div class="top-panel">
                <div class="left-panel">
                    <div class="dataset-info">
                        <el-form     
                            ref="formRef" 
                            :model="form" 
                            :rules="rules" 
                            label-width="auto"
                            class="dataset-form"
                        >
                            <!-- 模式切换 -->
                            <el-form-item label="上传方式" prop="mode">
                                <el-radio-group v-model="form.mode" @change="handleModeChange">
                                    <el-radio value="new">新建数据集</el-radio>
                                    <el-radio value="append">扩展数据集</el-radio>
                                    <el-radio value="image">上传图片集</el-radio>
                                </el-radio-group>
                            </el-form-item>
                            <!-- 现有数据集选择器（追加模式时显示） -->
                            <el-form-item 
                                v-if="form.mode !== 'new'" 
                                label="目标数据集" 
                                prop="existingDataset"
                            >
                                <el-select 
                                    v-model="form.existingDataset" 
                                    placeholder="请输入数据集名称/类型搜索" 
                                    filterable
                                    remote
                                    :remote-method="searchExistingDatasets"
                                    @visible-change="handleSelectVisible"
                                    @change="handleExistingDatasetChange"
                                    class="searchable-select"
                                >
                                    <el-option
                                        v-for="ds in existingDatasets"
                                        :key="ds.value"
                                        :label="ds.label"
                                        :value="ds.value"
                                    >
                                    </el-option>
                                </el-select>
                            </el-form-item>
                            <!-- 原有表单字段（新建模式时显示） -->
                            <div v-if="form.mode === 'new'">
                                <el-form-item label="数据集名称" prop="name">
                                    <el-input v-model="form.name" autocomplete="off" placeholder="请输入数据集名称" maxlength="30" show-word-limit />
                                </el-form-item>
                                <el-form-item label="数据集描述" prop="description">
                                    <el-input
                                        v-model="form.description"
                                        maxlength="100"
                                        :autosize="{ minRows: 5, maxRows: 5 }"
                                        placeholder="请输入数据集描述"
                                        show-word-limit
                                        type="textarea"
                                        resize="none"
                                    />
                                </el-form-item>
                            </div>
                            <el-form-item label="数据集划分" prop="split" v-if="form.mode !== 'image'">
                                <el-select v-model="form.split" placeholder="请选择数据所属的划分：训练集、验证集或测试集" >
                                    <el-option label="自动划分" value="auto" />
                                    <el-option label="训练集" value="train" />
                                    <el-option label="验证集" value="val" />
                                    <el-option label="测试集" value="test" />
                                </el-select>
                            </el-form-item>
                            <el-row class="upload-operation" :gutter="20">
                                <el-col :span="24">
                                    <el-form-item label="数据集类型" prop="type">
                                        <el-select v-model="form.type" 
                                            placeholder="请选择数据集类型" 
                                            @visible-change="fetchDatasetType"
                                            @change="handleDatasetTypeChange" 
                                            :loading="loading"
                                            :disabled="form.mode !== 'new'"
                                        >
                                            <el-option 
                                                v-for="item in datasetTypeOptions"
                                                :key="item.value"
                                                :label="item.label"
                                                :value="item.value"
                                            />
                                            <template #loading>
                                                <el-icon class="is-loading">
                                                    <svg class="circular" viewBox="0 0 20 20">
                                                    <g
                                                        class="path2 loading-path"
                                                        stroke-width="0"
                                                        style="animation: none; stroke: none"
                                                    >
                                                        <circle r="3.375" class="dot1" rx="0" ry="0" />
                                                        <circle r="3.375" class="dot2" rx="0" ry="0" />
                                                        <circle r="3.375" class="dot4" rx="0" ry="0" />
                                                        <circle r="3.375" class="dot3" rx="0" ry="0" />
                                                    </g>
                                                    </svg>
                                                </el-icon>
                                            </template>
                                        </el-select>
                                    </el-form-item>
                                </el-col>
                                <el-col :span="24" v-if="form.mode !== 'image'">
                                    <div class="file-upload-container">
                                        <!-- 隐藏的文件选择input -->
                                        <input
                                            type="file"
                                            ref="fileInput"
                                            class="hidden-input"
                                            @change="onFileSelected"
                                            accept=".json,.csv,.xlsx,.xls"
                                        />
                                        <!-- 可视化按钮 -->
                                        <el-button
                                            class="dashed-upload-btn"
                                            :class="{ 'is-selected': selectedFile }"
                                            @click="triggerFileSelect"
                                            :disabled="loading"
                                        >
                                            <el-icon class="file-icon" :color="iconColor"><Document /></el-icon>
                                            <span class="upload-text">{{ buttonText }}</span>
                                            <el-icon v-if="loading" class="loading-icon"><Loading /></el-icon>
                                            <el-icon v-else-if="selectedFile" class="check-icon" color="#67c23a">
                                                <Check />
                                            </el-icon>
                                        </el-button>
                                    </div>
                                </el-col>
                                <!-- <el-col :span="6">
                                    <el-button type="primary" :disabled="!selectedFile || loading" style="width: 100%" @click="handleUpload">
                                        上传
                                    </el-button>
                                </el-col> -->
                                <!-- 图片数据上传（仅IMAGE类型显示） -->
                                <template v-if="form.mode === 'image'">
                                    <!-- 图片压缩包上传 -->
                                    <el-col :span="24">
                                        <div class="file-upload-container">
                                            <!-- 隐藏的目录上传input -->
                                            <input
                                                type="file"
                                                ref="folderInput"
                                                class="hidden-input"
                                                @change="onFolderSelected"
                                                webkitdirectory
                                                directory
                                                multiple
                                                accept="image/*"
                                            />
                                            
                                            <el-button
                                                class="dashed-upload-btn folder-upload-btn"
                                                :class="{ 'is-selected': selectedFolder }"
                                                @click="triggerFolderSelect"
                                            >
                                                <el-icon class="folder-icon"><FolderOpened /></el-icon>
                                                <span class="upload-text">
                                                    {{ imageButtonText }}
                                                    <span class="file-count" v-if="selectedFolder">
                                                        ({{ selectedFolder.fileCount }}个文件)
                                                    </span>
                                                </span>
                                            </el-button>
                                        </div>
                                    </el-col>
                                </template>
                                <el-col :span="24">
                                    <el-button type="primary" :disabled="(!selectedFile && !selectedFolder?.fileCount) || loading" style="width: 100%" @click="handleUpload">
                                        上传
                                    </el-button>
                                </el-col>
                            </el-row>
                        </el-form>
                    </div>
                </div>
                <div class="right-panel">
                    <div class="field-checker-container">
                        <!-- 符合要求字段区域 -->
                        <div class="field-card valid-card">
                            <div>
                                <span class="card-title">符合字段</span>
                                <el-tooltip 
                                    content="数据规范中可上传的字段，您的文件中已正确包含这些字段" 
                                    placement="top"
                                > <el-icon class="info-icon"><QuestionFilled /></el-icon>
                                </el-tooltip>
                                <el-tag type="success" size="small">{{ validFields.length }}</el-tag>
                            </div>
                            
                            <div class="field-list" v-if="validFields.length > 0">
                                <el-tooltip 
                                    v-for="(field, index) in validFields" 
                                    :key="index" 
                                    :content="validTitleDisplay.find(item => item.title.toLowerCase() === field.toLowerCase())?.description || '该字段为必填项'"
                                    placement="top"
                                >
                                    <el-tag class="field-tag valid-tag disable-select">
                                    {{ field }}
                                    </el-tag>
                                </el-tooltip>
                            </div>
                        </div>
                        <!-- 不符合要求字段区域 -->
                        <div class="field-card invalid-card">
                            <div>
                                <span class="card-title">缺失字段</span>
                                <el-tooltip 
                                    content="数据规范中要求的必填字段，但您的文件中缺失这些字段" 
                                    placement="top"
                                > <el-icon class="info-icon"><QuestionFilled /></el-icon>
                                </el-tooltip>
                                <el-tag type="danger" size="small">{{ invalidFields.length }}</el-tag>
                            </div>
                            
                            <div class="field-list" v-if="invalidFields.length > 0">
                                <el-tooltip 
                                    v-for="(field, index) in invalidFields" 
                                    :key="index" 
                                    :content="datasetFields?.[form?.type]?.required?.[field].description || '该字段为必填项'"
                                    placement="top"
                                >
                                    <el-tag class="field-tag invalid-tag disable-select">
                                    {{ field }}
                                    </el-tag>
                                </el-tooltip>
                            </div>
                        </div>
                        <!-- 可选字段区域 -->
                        <div class="field-card optional-card">
                            <span class="card-title">可选字段</span>
                            <el-tooltip 
                                content="数据规范中非必填的扩展字段，您可以在数据集中选择性包含这些字段，以扩展数据集的用途" 
                                placement="top"
                            > <el-icon class="info-icon"><QuestionFilled /></el-icon>
                            </el-tooltip>
                            <el-tag type="info" size="small">{{ optionalFields.length}}</el-tag>
                            
                            <div class="field-list" v-if="optionalFields.length > 0">
                                <el-tooltip 
                                    v-for="(field, index) in optionalFields" 
                                    :key="index" 
                                    :content="datasetFields?.[form?.type]?.optional?.[field].description || '该字段为可选项'"
                                    placement="top"
                                >
                                    <el-tag 
                                        class="field-tag optional-tag disable-select"
                                    >
                                        {{ field }}
                                    </el-tag>
                                </el-tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="viewer-table" v-if="selectedFile">
                <!-- 表格头部 -->
                <div class="table-header">
                    <div class="title-container">
                        <h3 class="table-title">数据预览</h3>
                    </div>
                    <div class="record-stats">
                        <span class="preview-count">{{ tableData.length }}</span>
                        <span class="total-count">/{{ totalRecords }}</span>
                        <span class="unit-label">条</span>
                    </div>
                    <el-tooltip content="当前展示前50条数据" placement="right">
                        <el-icon style="cursor: help;"><QuestionFilled /></el-icon>
                    </el-tooltip>
                </div>
                <!-- 表格容器 -->
                <el-table
                    :data="tableData"
                    ref="tableRef"
                    border
                    stripe
                    @row-click="handleRowClick"
                    @header-dragend="handleMouseDown"
                    @sort-change="handleSortChange"
                    :header-cell-style="{ whiteSpace: 'nowrap' }"
                    :header-cell-class-name="handleHeaderCellClass"
                >
                    <!-- 列定义 -->
                    <el-table-column
                        v-for="(column, index) in validTitleDisplay"
                        :key="index"
                        :prop="column.title"
                        :label="column.title"
                        :min-width="column.width || '200px'"
                        :resizable="true"
                        :class-name="column.align || 'text-left'"
                        sortable="custom"
                    >
                        <template #default="{ row }">
                            <div
                                class="cell-content"
                                :class="{ expanded: expandedRows.includes(tableData.indexOf(row)) }"
                            > <span>{{ row[column.title] }}</span>
                            </div>
                        </template>

                    </el-table-column>
                </el-table>
            </div>
        </div>
        <div class="dataset-info-card" v-if="form.type || selectedFile">
            <!-- 数据集类型信息 -->
            <div v-if="form.type" class="info-section">
                <h3 class="section-title">
                    <i class="el-icon-document"></i>
                    数据集类型
                </h3>
                
                <div class="type-description">
                    {{ datasetFields?.[form?.type]?.description || '暂无描述信息' }}
                </div>
            
                <div class="model-list" v-if="false">
                    <h4>支持的模型：</h4>
                    <el-tag 
                            v-for="(model, index) in modelOptions" 
                            :key="index" 
                            class="model-tag"
                            :type="model.isRecommended ? 'success' : ''"
                        >
                            {{ model.name }}
                        <el-tooltip 
                            v-if="model.tooltip" 
                            :content="model.tooltip" 
                            placement="top"
                        >
                            <el-icon><QuestionFilled /></el-icon>
                        </el-tooltip>
                    </el-tag>
                </div>
            </div>

            <!-- 文件信息 -->
            <div v-if="selectedFile" class="info-section">
                <h3 class="section-title">
                    <i class="el-icon-folder-opened"></i>
                    已选文件信息
                </h3>
            
                <div class="file-stats">
                    <div class="stat-item">
                        <span class="label">文件名：</span>
                        <el-tooltip :content="selectedFile.name" placement="right">
                            <span class="value">{{ selectedFile.name }}</span>
                        </el-tooltip>
                    </div>
                    <div class="stat-item">
                        <span class="label">文件大小：</span>
                        <span class="value">{{ formatFileSize(selectedFile.size) }}</span>
                    </div>
                        <div class="stat-item">
                        <span class="label">数据行数：</span>
                        <span class="value">{{ totalRecords }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<!-- 上传进度弹窗 -->
<el-dialog
    v-model="uploadDialogVisible"
    title="上传进度"
    width="500px"
    :close-on-click-modal="false"
    :show-close="false"
    :close-on-press-escape="false"
>
    <div class="upload-progress-container">
        <el-progress
            :percentage="uploadProgress"
            :stroke-width="20"
            status="success"
            :text-inside="true"
        />
        <div class="progress-details">
            <span class="detail-item">
            已上传：{{ formatSize(uploadedSize) }}
            </span>
            <span class="detail-item">
            总大小：{{ formatSize(totalSize) }}
            </span>
            <span class="detail-item">
            速度：{{ formatSpeed(uploadSpeed) }}
            </span>
        </div>
        <div class="file-info">
            当前正在上传：{{ currentFileName }}
        </div>
    </div>
    <template #footer>
        <el-button 
            type="danger" 
            @click="cancelUpload"
            :disabled="!isUploadCancelable"
        >
            取消上传
        </el-button>
    </template>
</el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import axios from '@/api/axios'
import { useFileHandler } from './useFileHandler';
import { ElMessage } from 'element-plus';

// 上传状态
const uploadDialogVisible = ref(false)
const uploadProgress = ref(0)
const uploadedSize = ref(0)
const totalSize = ref(0)
const uploadSpeed = ref(0)
const currentFileName = ref('')
const isUploadCancelable = ref(true) // 是否可取消
const controller = ref<AbortController | null>(null);
let lastUploaded = 0
let lastTime = Date.now()

// 格式化工具函数
const formatSize = (bytes: number) => {
    if (bytes >= 1 << 30) return `${(bytes / (1 << 30)).toFixed(1)} GB`
    if (bytes >= 1 << 20) return `${(bytes / (1 << 20)).toFixed(1)} MB`
    if (bytes >= 1 << 10) return `${(bytes / (1 << 10)).toFixed(0)} KB`
    return `${bytes} B`
}

const formatSpeed = (bps: number) => {
    if (bps >= 1 << 20) return `${(bps / (1 << 20)).toFixed(1)} MB/s`
    if (bps >= 1 << 10) return `${(bps / (1 << 10)).toFixed(1)} KB/s`
    return `${bps.toFixed(0)} B/s`
}

const calculateSpeed = () => {
    const now = Date.now()
    const timeDiff = (now - lastTime) / 1000 // 秒
    const bytesDiff = uploadedSize.value - lastUploaded
    
    if (timeDiff > 0) {
        uploadSpeed.value = bytesDiff / timeDiff // B/s
    }
    
    lastUploaded = uploadedSize.value
    lastTime = now
}

// 初始化上传参数
const initUploadParams = (files: File[]) => {
    totalSize.value = files.reduce((sum, file) => sum + file.size, 0)
    uploadedSize.value = 0
    uploadProgress.value = 0
    uploadSpeed.value = 0
    currentFileName.value = ''
}

const selectedFolder = ref<{
    name: string;
    files: File[];
    fileCount: number;
} | null>(null);

// 处理文件夹选择
const onFolderSelected = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
  
    // 过滤非图片文件
    const imageFiles = files.filter(file => 
        file.type.startsWith('image/')
    );

    selectedFolder.value = {
        name: files[0].webkitRelativePath.split('/')[0],
        files: imageFiles,
        fileCount: imageFiles.length
    };
};

// 上传处理逻辑
const handleFolderUpload = async () => {
    if (!selectedFolder.value) return

    const files = selectedFolder.value.files
    const BATCH_SIZE = 200 // 每批上传 100 个文件
    const datasetID = form.existingDataset
    const totalBatches = Math.ceil(files.length / BATCH_SIZE)

    uploadDialogVisible.value = true
    isUploadCancelable.value = true

    try {
        initUploadParams(files)
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * BATCH_SIZE
            const end = Math.min((batchIndex + 1) * BATCH_SIZE, files.length)
            const batchFiles = files.slice(start, end)

            const formData = new FormData()
            formData.append('datasetType', 'IMAGE')
            formData.append('datasetID', datasetID)
            batchFiles.forEach(file => {
                formData.append('files', file)
            })

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 5 * 60 * 1000, // 5分钟
                signal: controller.value?.signal,
                onUploadProgress: (e) => {
                    uploadedSize.value += e.loaded
                }
            }

            uploadProgress.value = Math.round((batchIndex / totalBatches) * 100)
            currentFileName.value = `第 ${batchIndex + 1}/${totalBatches} 批文件（${batchFiles.length} 张）`

            calculateSpeed()

            const response = await axios.post('/datasets/upload/folder', formData, config)
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || '上传失败')
            }
        }

        ElMessage.success('全部图片上传成功')
    } catch (err) {
        if (err.name === 'AbortError') {
            ElMessage.warning('上传被取消')
        } else {
            ElMessage.error(`上传失败: ${err.message}`)
        }
    } finally {
        uploadDialogVisible.value = false
        resetUploadState()
    }
}

// 取消上传
const cancelUpload = () => {
    controller.value?.abort(); // Cancel via AbortController
    isUploadCancelable.value = false;
};

// 重置上传状态
const resetUploadState = () => {
    controller.value = new AbortController();
    lastUploaded = 0;
    lastTime = Date.now();
};

// 文件类型判断
const isImageType = computed(() => form.mode === 'image')

// 修改上传处理函数
const handleUpload = async () => {
    if (isImageType.value) {
        await handleFolderUpload()
    } else {
        await handleTextUpload()
    }
}

const { title, tableData, totalRecords, handleFileChange } = useFileHandler();

const loading = ref(false);

const selectedFile = ref(null);
const fileInput = ref(null);
const folderInput = ref(null);

const form = reactive({
    mode: 'new', // 默认新建模式
    name: '',
    description: '',
    type: null,
    split: '',
    existingDataset: null, // 追加模式时使用
});

const existingDatasets = ref([]);
const datasetTypeOptions = ref([])
const datasetFields = ref({
    required: {},
    optional: {}
});

const rules = computed(() => ({
    mode: [{ required: true, message: '请选择操作模式' }],
    name: form.mode === 'new' 
        ? [{ required: true, message: '请输入数据集名称' }]
        : [],
    description: form.mode === 'new' 
        ? [{ required: true, message: '请输入数据集描述' }]
        : [],
    existingDataset: form.mode !== 'new' 
        ? [{ required: true, message: '请选择目标数据集' }]
        : [],
    type: [{ required: true, message: '请选择数据集类型' }],
    split: [{ required: true, message: '请选择数据划分方式' }],
}));

const formRef = ref(); // 创建表单引用

const handleModeChange = (mode) => {
    if (mode === 'new') {
        form.existingDataset = null;
    } else {
        form.name = '';
        form.description = '';
    }
    formRef.value?.clearValidate();
};

// 新增响应式变量
const searchKeyword = ref('');

// 修改后的数据加载方法
const searchExistingDatasets = async (keyword) => {
    if (form.mode === 'new') return;
    searchKeyword.value = keyword;
    
    try {
        const params = {
            q: keyword,
            page: 1,
            pageSize: 10
        };
        const res = await axios.get('/datasets/search', { params }); // 假设后端支持搜索参数
        existingDatasets.value = res.data.items;
    } catch (error) {
        console.error('数据集搜索失败', error);
    }
};

// 处理下拉框显示状态变化
const handleSelectVisible = (visible) => {
  if (visible && !existingDatasets.value.length) {
    searchExistingDatasets('');
  }
};

const handleExistingDatasetChange = (value) => {
    if (value) {
        const dataset = existingDatasets.value.find(ds => ds.value === value);
        form.type = dataset.type;
    } else {
        form.type = null;
    }
};

const resetForm = () => {
    formRef.value?.resetFields();
    selectedFile.value = null;
    form.mode = 'new';
    form.type = null;
};

const handleTextUpload = async () => {
    const valid = await formRef.value?.validate();
    if (!valid) return;

    try {
        if (form.mode === 'new') {
            // 新建数据集逻辑
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('description', form.description);
            formData.append('type', form.type);
            formData.append('split', form.split);
            formData.append('file', selectedFile.value);
            formData.append('valid_fields', JSON.stringify(validFields.value));

            await axios.post('/datasets/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

        } else {
            // 追加数据逻辑
            await axios.post(`/datasets/${form.existingDataset}/append`, {
                type: form.type,
                split: form.split,
                file: selectedFile.value,
            },{ timeout: 60000 });
        }

        ElMessage.success('成功上传数据集');
        resetForm();
    } catch (error) {
        ElMessage.error(
            '上传失败：' + (error.response && error.response.data && error.response.data.message
                ? error.response.data.message
                : error.message)
        );
    }
};

const triggerFileSelect = () => {
  fileInput.value.click();
};

const triggerFolderSelect = () => {
  folderInput.value.click();
};

const iconColor = computed(() => selectedFile.value ? '#409EFF' : '#909399');

const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const sizes = ['KB', 'MB', 'GB'];
    let i = 0;
    bytes /= 1024;
    while (bytes >= 1024 && i < sizes.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${sizes[i]}`;
}

const buttonText = computed(() =>
    selectedFile.value ? `更换文件 (${selectedFile.value.name})` : '选择一个文件'
);

const imageButtonText = computed(() =>
    selectedFolder?.value?.fileCount ? `更换图片集 (${selectedFolder?.value?.name})` : '选择要上传的图片集'
); 

const onFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        loading.value = true;
        await handleFileChange(file);
        selectedFile.value = file;
        handleDatasetTypeChange(form.type);
    } finally {
        loading.value = false;
    }
};

const expandedRows = ref([]);
const orderArray = ref([]);
const tableRef = ref(null);
const validTitleDisplay = ref([]);

// 行点击处理
const handleRowClick = (row) => {
  const rowIndex = tableData.value.indexOf(row);
  const index = expandedRows.value.indexOf(rowIndex);
  
  if (index === -1) {
    expandedRows.value.push(rowIndex);
  } else {
    expandedRows.value.splice(index, 1);
  }
};

const fetchDatasetType = async() => {
    if (datasetTypeOptions.value.length === 0) {
        loading.value = true
        await axios.get('/datasets/type').then((response) => {
            datasetFields.value = response.data

            Object.keys(response.data).forEach(key => {
                datasetTypeOptions.value.push({ value: key, label: response.data[key].alias });
            });

            loading.value = false
        }).catch((error) => {
            console.error('Failed to fetch dataset type:', error)
        })
    }
};

const handleDatasetTypeChange = (value) => {
    // 从后端返回的数据中获取必需字段和可选字段的详细信息对象
    const requiredFieldsObj = datasetFields.value[value]?.required || {};
    const optionalFieldsObj = datasetFields.value[value]?.optional || {};

    // 分别获取必需字段和可选字段的名称数组
    const requiredFields = Object.keys(requiredFieldsObj);
    const optionalFieldsList = Object.keys(optionalFieldsObj);

    // 用户当前输入的字段名称数组（来自 title 绑定）
    const currentFields = title.value || [];
    const currentFieldsLower = currentFields.map(field => field.toLowerCase());

    // 允许的所有字段（必需 + 可选）及其名称（忽略大小写）
    const allowedFields = [...requiredFields, ...optionalFieldsList];
    const allowedFieldsLower = allowedFields.map(field => field.toLowerCase());

    // validFields：允许列表中出现在 currentFields 的字段（不区分大小写）
    validFields.value = allowedFields.filter(field =>
        currentFieldsLower.includes(field.toLowerCase())
    );

    // invalidFields：必需字段中，currentFields 中缺失的项（不区分大小写）
    invalidFields.value = requiredFields.filter(field =>
        !currentFieldsLower.includes(field.toLowerCase())
    );

    // optionalFields：可选字段中，currentFields 中缺失的项（不区分大小写）
    optionalFields.value = optionalFieldsList.filter(field =>
        !currentFieldsLower.includes(field.toLowerCase())
    );

    // 合并必需与可选字段的详细信息，便于后续查询
    const fieldInfos = { ...requiredFieldsObj, ...optionalFieldsObj };

    // 根据 currentFields 筛选出允许字段（忽略大小写），并转换为字典对象格式
    const validTitle = currentFields.filter(field =>
        allowedFieldsLower.includes(field.toLowerCase())
    ).map(field => {
        // 尝试直接用当前字段名从 fieldInfos 中取信息（字段名大小写可能不一致）
        let info = fieldInfos[field];
        if (!info) {
            // 如果没找到，则遍历 fieldInfos 进行不区分大小写的匹配
            for (const key in fieldInfos) {
                if (key.toLowerCase() === field.toLowerCase()) {
                    info = fieldInfos[key];
                    break;
                }
            }
        }
        // 默认信息
        if (!info) {
            info = { width: 100, description: "未定义" };
        }
        return {
            title: field,
            width: info.width,
            description: info.description
        };
    });

    // 将生成的字典数组更新到绑定变量 validTitleDisplay 中
    validTitleDisplay.value = validTitle;

};


// 在 setup 中声明响应式变量
const validFields = ref([]);
const invalidFields = ref([]);
const optionalFields = ref([]);

// 列宽调整处理
const handleMouseDown = (newWidth, oldWidth, column, event) => {
    const elTable = tableRef.value.$el;
    const widthTable = elTable.offsetWidth;
    const minWidth = parseFloat(column.minWidth) || 150;
    const realWidth = (minWidth * widthTable) / 100;

    if (newWidth > realWidth + 50) {
        column.width = realWidth + 50;
    } else if (newWidth < 150) {
        column.width = 150;
    } else {
        column.width = newWidth;
    }
};

// 表头单元格类名处理
const handleHeaderCellClass = ({ column }) => {
    const match = orderArray.value.find(item => item.prop === column.property);
    if (match) {
        column.order = match.order;
    }
    return '';
};

// 排序变化处理
const handleSortChange = ({ prop, order }) => {
    if (order) {
        const existingIndex = orderArray.value.findIndex(item => item.prop === prop);
        if (existingIndex !== -1) {
            orderArray.value[existingIndex].order = order;
        } else {
            orderArray.value.push({ prop, order });
        }
    } else {
        orderArray.value = orderArray.value.filter(item => item.prop !== prop);
    }

    // 触发排序请求
    console.log('Current sort config:', orderArray.value);
    // 这里可以添加调用API的逻辑
};

const modelOptions = [
    { name: 'BERT-Base', isRecommended: true, tooltip: '推荐用于短文本分类' },
    { name: 'RoBERTa-Large', tooltip: '适用于长文本分析' },
    { name: 'DistilBERT' }
];

</script>

<style lang="scss" scoped>
.upload-progress-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
/* 样式调整 */
.folder-upload-btn {

  .folder-icon {
    margin-right: 8px;
  }
  
  .file-count {
    font-size: 0.9em;
    color: #909399;
  }
}

.searchable-select {
    .el-input__inner {
        padding-right: 30px;
    }
    
    .el-select__caret {
        right: 15px;
    }
}

.dataset-info-card {
    flex: 1;
    margin-bottom: auto;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
    
    .info-section {
        margin-bottom: 25px;
        
        &:last-child {
            margin-bottom: 0;
        }
    }

  .section-title {
    font-size: 18px;
    color: #333;
    margin: 0;
    display: flex;
    align-items: center;
    
    i {
      font-size: 20px;
      color: #409EFF;
    }
  }

    .type-description {
        background: #f5f7fa;
        padding: 15px;
        border-radius: 6px;
        margin: 10px 0 20px;
        font-size: 14px;
        color: #666;
    }

    .model-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
        align-items: center;
        
        .model-tag {
            padding: 8px 15px;
            border-radius: 18px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 5px;
        }
    }

    .file-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-top: 10px;
    
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f5f7fa;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
        
            .label {
                color: #999;
            }
            .value {
                color: #333;
                font-weight: 500;
                max-width: 135px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
    }
}

.viewer-table {
    background: #fff;
    padding-bottom: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100vh;
    background: #fff;
    border-radius: 4px;
    width: 100%;

    .el-table {
        --el-table-border-color: #ebeef5;
        --el-table-header-bg-color: #fafafa;
        --el-table-tr-hover-bg-color: #f5f7fa;
        --el-table-current-row-bg-color: #ecf5ff;

        .el-table__body-wrapper {
            td {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
    } 
  
    .table-header {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        width: 100%;
        gap: 5px;
    }

    .title-container {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .table-title {
            font-size: 18px;
            color: #333;
            margin: 0;
            font-weight: 600;
        }
        
        .info-icon {
            color: #999;
            cursor: help;
            font-size: 16px;
        }
    }

    .record-stats {
        display: flex;
        align-items: baseline;
        gap: 5px;
        font-family: monospace;
        
        .preview-count {
            font-size: 20px;
            color: #409EFF;
            font-weight: 500;
        }
        
        .total-count {
            font-size: 16px;
            color: #666;
        }
        
        .unit-label {
            font-size: 14px;
            color: #999;
        }
    }
}

.field-checker-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 10px;
  
  .field-card {
    width: 100%;
    min-width: 300px;
    padding: 16px;
    box-sizing: border-box;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
    .info-icon {
        margin-right: 8px;
        cursor: help;
        font-size: 16px;
    }
    
    .card-title {
      font-size: 16px;
      font-weight: 600;
    }
    
    .field-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      min-width: 0; // 允许子元素收缩
    }
    
    .field-tag {
        // 强制覆盖Element Plus默认样式
        &.el-tag {
            max-width: 200px !important; // 添加!important确保优先级
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            // 保持原有样式
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;

            // 修复Element Plus样式覆盖
            &.valid-tag {
                @extend .field-tag;
                background: #f0f9eb;
                color: #67c23a;
                border: 1px solid #c2e7b0;
            }
            &.invalid-tag {
                @extend .field-tag;
                background: #fef0f0;
                color: #f56c6c;
                border: 1px solid #fbc4c4;
            }
            &.optional-tag {
                background: #f4f4f5;
                color: #909399;
                border: 1px solid #dcdfe6;
            }
        }
    }
  }
}

.dataset-info {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 100%;

    .el-form {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
}

.container {
    padding: 20px;
    box-sizing: border-box;
    height: calc(100% - 60px);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .top-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-items: center;
        width: 100%;
        gap: 20px;

        .left-panel {
            display: flex;
            flex-direction: column;
            align-content: space-between;
            gap: 20px;
            width: 100%;
            height: 100%;
        }

        .right-panel {
            display: flex;
            width: 100%;
            height: 100%;
        }

    }
}

.container-body {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    height: calc(100% - 30px);
    max-width: 1536px;
    gap: 20px;
    box-sizing: border-box;

    .body-content {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 996px;
        height: 100%;
        gap: 20px;
    }
}


.container-header {
    display: flex;
    flex-direction: row;
    width: 100%;
    box-sizing: border-box;
    gap: 5px;
    align-items: center;
}

.container-header > .title {
    font-size: 20px;
    font-weight: 600;
    line-height: 30px;
    min-height: 24px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    color: rgba(0, 0, 0, .9);
    word-break: break-all;
}

.container-header > .title:hover {
    cursor: pointer;
    color: rgb(44, 118, 209);
}

.file-upload-container {
  position: relative;
  display: inline-block;
  width: 100%;
  margin-bottom: 10px;
}

.dashed-upload-btn {
  border: 1px dashed #dcdfe6 !important;
  background-color: #f5f7fa !important;
  height: 100%;
  width: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

    .file-icon {
        color: #909399;
        font-size: 14px;
        margin-right: 8px;
    }

    .upload-text {
        color: #111111;
        font-size: 14px;
    }

}

.dashed-upload-btn:hover {
    border-color: #409eff !important;
    background-color: #ecf5ff !important;
}

.dashed-upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.loading-icon {
    animation: spin 1s infinite linear;
    color: #409eff;
    font-size: 16px;
}

.hidden-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    overflow: hidden;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.el-table th {
    font-weight: 600;
    color: #303133;
}

.el-table td {
    color: #606266;
}

.cell-content {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
}

/* 默认状态显示两行 */
.cell-content {
    -webkit-line-clamp: 2;
    line-clamp: 2; /* Standard property */
}

/* 展开状态显示全部内容 */
.cell-content.expanded {
    line-clamp: unset;
    -webkit-line-clamp: unset;
    max-height: none;
    white-space: normal;
}
</style>

<style lang="scss">
.cell {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
}

.viewer-table {
  position: relative;
  
  .el-table {
    // 强制显示滚动条轨道
    &::-webkit-scrollbar {
      width: 14px;
      height: 14px;
      background: transparent;
    }

    // 垂直滚动条样式
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
      margin-top: 52px; // 与header高度匹配
      border: 1px solid transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #409EFF;
      border-radius: 10px;
      border: 3px solid #fff;
      background-clip: content-box;
      transition: background-color 0.3s;
    }

    // 水平滚动条样式
    &::-webkit-scrollbar-track-piece {
      background: #f1f1f1;
      border-radius: 10px;
    }

    // 滚动条按钮样式
    &::-webkit-scrollbar-button {
      height: 20px;
      width: 14px;
      background: #f1f1f1;
      border-radius: 4px;
      display: block;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    // 向上箭头
    &::-webkit-scrollbar-button:vertical:start:increment,
    &::-webkit-scrollbar-button:vertical:end:increment {
      background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23409EFF' d='M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'/></svg>") no-repeat center;
    }

    // 向下箭头
    &::-webkit-scrollbar-button:vertical:start:decrement,
    &::-webkit-scrollbar-button:vertical:end:decrement {
      background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23409EFF' d='M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'/></svg>") no-repeat center;
    }
  }

  // 使滚动条覆盖整个高度
  .el-table__body-wrapper {
    scrollbar-color: #409EFF #f1f1f1;
    scrollbar-width: thin;
    
    &::-webkit-scrollbar {
      width: 14px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #409EFF;
      border-radius: 10px;
      border: 3px solid #fff;
      background-clip: content-box;
    }
  }
  
  // 修复表头与滚动条对齐
  .el-table__header-wrapper {
    padding-right: 14px; // 与滚动条宽度一致
    position: relative;
    z-index: 2;
  }

  // Edge专用修复
  @supports (-ms-ime-align: auto) {
    .el-table {
      scrollbar-width: auto;
      scrollbar-color: #409EFF #f1f1f1;
    }
  }
}
</style>