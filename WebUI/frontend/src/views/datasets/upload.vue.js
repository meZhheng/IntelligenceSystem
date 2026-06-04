import { ref, computed, reactive } from 'vue';
import axios from '@/api/axios';
import { useFileHandler } from './useFileHandler';
import { ElMessage } from 'element-plus';
// 上传状态
const uploadDialogVisible = ref(false);
const uploadProgress = ref(0);
const uploadedSize = ref(0);
const totalSize = ref(0);
const uploadSpeed = ref(0);
const currentFileName = ref('');
const isUploadCancelable = ref(true); // 是否可取消
const controller = ref(null);
let lastUploaded = 0;
let lastTime = Date.now();
// 格式化工具函数
const formatSize = (bytes) => {
    if (bytes >= 1 << 30)
        return `${(bytes / (1 << 30)).toFixed(1)} GB`;
    if (bytes >= 1 << 20)
        return `${(bytes / (1 << 20)).toFixed(1)} MB`;
    if (bytes >= 1 << 10)
        return `${(bytes / (1 << 10)).toFixed(0)} KB`;
    return `${bytes} B`;
};
const formatSpeed = (bps) => {
    if (bps >= 1 << 20)
        return `${(bps / (1 << 20)).toFixed(1)} MB/s`;
    if (bps >= 1 << 10)
        return `${(bps / (1 << 10)).toFixed(1)} KB/s`;
    return `${bps.toFixed(0)} B/s`;
};
const calculateSpeed = () => {
    const now = Date.now();
    const timeDiff = (now - lastTime) / 1000; // 秒
    const bytesDiff = uploadedSize.value - lastUploaded;
    if (timeDiff > 0) {
        uploadSpeed.value = bytesDiff / timeDiff; // B/s
    }
    lastUploaded = uploadedSize.value;
    lastTime = now;
};
// 初始化上传参数
const initUploadParams = (files) => {
    totalSize.value = files.reduce((sum, file) => sum + file.size, 0);
    uploadedSize.value = 0;
    uploadProgress.value = 0;
    uploadSpeed.value = 0;
    currentFileName.value = '';
};
const selectedFolder = ref(null);
// 处理文件夹选择
const onFolderSelected = (event) => {
    const input = event.target;
    if (!input.files?.length)
        return;
    const files = Array.from(input.files);
    // 过滤非图片文件
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    selectedFolder.value = {
        name: files[0].webkitRelativePath.split('/')[0],
        files: imageFiles,
        fileCount: imageFiles.length
    };
};
// 上传处理逻辑
const handleFolderUpload = async () => {
    if (!selectedFolder.value)
        return;
    const files = selectedFolder.value.files;
    const BATCH_SIZE = 200; // 每批上传 100 个文件
    const datasetID = form.existingDataset;
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);
    uploadDialogVisible.value = true;
    isUploadCancelable.value = true;
    try {
        initUploadParams(files);
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * BATCH_SIZE;
            const end = Math.min((batchIndex + 1) * BATCH_SIZE, files.length);
            const batchFiles = files.slice(start, end);
            const formData = new FormData();
            formData.append('datasetType', 'IMAGE');
            formData.append('datasetID', datasetID);
            batchFiles.forEach(file => {
                formData.append('files', file);
            });
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 5 * 60 * 1000, // 5分钟
                signal: controller.value?.signal,
                onUploadProgress: (e) => {
                    uploadedSize.value += e.loaded;
                }
            };
            uploadProgress.value = Math.round((batchIndex / totalBatches) * 100);
            currentFileName.value = `第 ${batchIndex + 1}/${totalBatches} 批文件（${batchFiles.length} 张）`;
            calculateSpeed();
            const response = await axios.post('/datasets/upload/folder', formData, config);
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || '上传失败');
            }
        }
        ElMessage.success('全部图片上传成功');
    }
    catch (err) {
        if (err.name === 'AbortError') {
            ElMessage.warning('上传被取消');
        }
        else {
            ElMessage.error(`上传失败: ${err.message}`);
        }
    }
    finally {
        uploadDialogVisible.value = false;
        resetUploadState();
    }
};
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
const isImageType = computed(() => form.mode === 'image');
// 修改上传处理函数
const handleUpload = async () => {
    if (isImageType.value) {
        await handleFolderUpload();
    }
    else {
        await handleTextUpload();
    }
};
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
const datasetTypeOptions = ref([]);
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
    }
    else {
        form.name = '';
        form.description = '';
    }
    formRef.value?.clearValidate();
};
// 新增响应式变量
const searchKeyword = ref('');
// 修改后的数据加载方法
const searchExistingDatasets = async (keyword) => {
    if (form.mode === 'new')
        return;
    searchKeyword.value = keyword;
    try {
        const params = {
            q: keyword,
            page: 1,
            pageSize: 10
        };
        const res = await axios.get('/datasets/search', { params }); // 假设后端支持搜索参数
        existingDatasets.value = res.data.items;
    }
    catch (error) {
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
    }
    else {
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
    if (!valid)
        return;
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
        }
        else {
            // 追加数据逻辑
            await axios.post(`/datasets/${form.existingDataset}/append`, {
                type: form.type,
                split: form.split,
                file: selectedFile.value,
            }, { timeout: 60000 });
        }
        ElMessage.success('成功上传数据集');
        resetForm();
    }
    catch (error) {
        ElMessage.error('上传失败：' + (error.response && error.response.data && error.response.data.message
            ? error.response.data.message
            : error.message));
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
    if (!bytes)
        return '0 KB';
    const sizes = ['KB', 'MB', 'GB'];
    let i = 0;
    bytes /= 1024;
    while (bytes >= 1024 && i < sizes.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${sizes[i]}`;
};
const buttonText = computed(() => selectedFile.value ? `更换文件 (${selectedFile.value.name})` : '选择一个文件');
const imageButtonText = computed(() => selectedFolder?.value?.fileCount ? `更换图片集 (${selectedFolder?.value?.name})` : '选择要上传的图片集');
const onFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file)
        return;
    try {
        loading.value = true;
        await handleFileChange(file);
        selectedFile.value = file;
        handleDatasetTypeChange(form.type);
    }
    finally {
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
    }
    else {
        expandedRows.value.splice(index, 1);
    }
};
const fetchDatasetType = async () => {
    if (datasetTypeOptions.value.length === 0) {
        loading.value = true;
        await axios.get('/datasets/type').then((response) => {
            datasetFields.value = response.data;
            Object.keys(response.data).forEach(key => {
                datasetTypeOptions.value.push({ value: key, label: response.data[key].alias });
            });
            loading.value = false;
        }).catch((error) => {
            console.error('Failed to fetch dataset type:', error);
        });
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
    validFields.value = allowedFields.filter(field => currentFieldsLower.includes(field.toLowerCase()));
    // invalidFields：必需字段中，currentFields 中缺失的项（不区分大小写）
    invalidFields.value = requiredFields.filter(field => !currentFieldsLower.includes(field.toLowerCase()));
    // optionalFields：可选字段中，currentFields 中缺失的项（不区分大小写）
    optionalFields.value = optionalFieldsList.filter(field => !currentFieldsLower.includes(field.toLowerCase()));
    // 合并必需与可选字段的详细信息，便于后续查询
    const fieldInfos = { ...requiredFieldsObj, ...optionalFieldsObj };
    // 根据 currentFields 筛选出允许字段（忽略大小写），并转换为字典对象格式
    const validTitle = currentFields.filter(field => allowedFieldsLower.includes(field.toLowerCase())).map(field => {
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
    }
    else if (newWidth < 150) {
        column.width = 150;
    }
    else {
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
        }
        else {
            orderArray.value.push({ prop, order });
        }
    }
    else {
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
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['info-icon', 'container-header', 'container-header', 'title', 'dashed-upload-btn', 'dashed-upload-btn', 'el-table', 'el-table', 'cell-content', 'cell-content',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container-body") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("body-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("top-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("left-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("dataset-info") },
});
const __VLS_0 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ref: ("formRef"),
    model: ((__VLS_ctx.form)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("auto"),
    ...{ class: ("dataset-form") },
}));
const __VLS_2 = __VLS_1({
    ref: ("formRef"),
    model: ((__VLS_ctx.form)),
    rules: ((__VLS_ctx.rules)),
    labelWidth: ("auto"),
    ...{ class: ("dataset-form") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
// @ts-ignore navigation for `const formRef = ref()`
/** @type { typeof __VLS_ctx.formRef } */ ;
var __VLS_6 = {};
const __VLS_7 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    label: ("上传方式"),
    prop: ("mode"),
}));
const __VLS_9 = __VLS_8({
    label: ("上传方式"),
    prop: ("mode"),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
const __VLS_13 = {}.ElRadioGroup;
/** @type { [typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ] } */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.form.mode)),
}));
const __VLS_15 = __VLS_14({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.form.mode)),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_19;
const __VLS_20 = {
    onChange: (__VLS_ctx.handleModeChange)
};
let __VLS_16;
let __VLS_17;
const __VLS_21 = {}.ElRadio;
/** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    value: ("new"),
}));
const __VLS_23 = __VLS_22({
    value: ("new"),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_26.slots.default;
var __VLS_26;
const __VLS_27 = {}.ElRadio;
/** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    value: ("append"),
}));
const __VLS_29 = __VLS_28({
    value: ("append"),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_32.slots.default;
var __VLS_32;
const __VLS_33 = {}.ElRadio;
/** @type { [typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ] } */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    value: ("image"),
}));
const __VLS_35 = __VLS_34({
    value: ("image"),
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
__VLS_38.slots.default;
var __VLS_38;
__VLS_18.slots.default;
var __VLS_18;
__VLS_12.slots.default;
var __VLS_12;
if (__VLS_ctx.form.mode !== 'new') {
    const __VLS_39 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        label: ("目标数据集"),
        prop: ("existingDataset"),
    }));
    const __VLS_41 = __VLS_40({
        label: ("目标数据集"),
        prop: ("existingDataset"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    const __VLS_45 = {}.ElSelect;
    /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
        ...{ 'onVisibleChange': {} },
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.form.existingDataset)),
        placeholder: ("请输入数据集名称/类型搜索"),
        filterable: (true),
        remote: (true),
        remoteMethod: ((__VLS_ctx.searchExistingDatasets)),
        ...{ class: ("searchable-select") },
    }));
    const __VLS_47 = __VLS_46({
        ...{ 'onVisibleChange': {} },
        ...{ 'onChange': {} },
        modelValue: ((__VLS_ctx.form.existingDataset)),
        placeholder: ("请输入数据集名称/类型搜索"),
        filterable: (true),
        remote: (true),
        remoteMethod: ((__VLS_ctx.searchExistingDatasets)),
        ...{ class: ("searchable-select") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    let __VLS_51;
    const __VLS_52 = {
        onVisibleChange: (__VLS_ctx.handleSelectVisible)
    };
    const __VLS_53 = {
        onChange: (__VLS_ctx.handleExistingDatasetChange)
    };
    let __VLS_48;
    let __VLS_49;
    for (const [ds] of __VLS_getVForSourceType((__VLS_ctx.existingDatasets))) {
        const __VLS_54 = {}.ElOption;
        /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
            key: ((ds.value)),
            label: ((ds.label)),
            value: ((ds.value)),
        }));
        const __VLS_56 = __VLS_55({
            key: ((ds.value)),
            label: ((ds.label)),
            value: ((ds.value)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    }
    __VLS_50.slots.default;
    var __VLS_50;
    __VLS_44.slots.default;
    var __VLS_44;
}
if (__VLS_ctx.form.mode === 'new') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_60 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        label: ("数据集名称"),
        prop: ("name"),
    }));
    const __VLS_62 = __VLS_61({
        label: ("数据集名称"),
        prop: ("name"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    const __VLS_66 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
        modelValue: ((__VLS_ctx.form.name)),
        autocomplete: ("off"),
        placeholder: ("请输入数据集名称"),
        maxlength: ("30"),
        showWordLimit: (true),
    }));
    const __VLS_68 = __VLS_67({
        modelValue: ((__VLS_ctx.form.name)),
        autocomplete: ("off"),
        placeholder: ("请输入数据集名称"),
        maxlength: ("30"),
        showWordLimit: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_67));
    __VLS_65.slots.default;
    var __VLS_65;
    const __VLS_72 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        label: ("数据集描述"),
        prop: ("description"),
    }));
    const __VLS_74 = __VLS_73({
        label: ("数据集描述"),
        prop: ("description"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    const __VLS_78 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
        modelValue: ((__VLS_ctx.form.description)),
        maxlength: ("100"),
        autosize: (({ minRows: 5, maxRows: 5 })),
        placeholder: ("请输入数据集描述"),
        showWordLimit: (true),
        type: ("textarea"),
        resize: ("none"),
    }));
    const __VLS_80 = __VLS_79({
        modelValue: ((__VLS_ctx.form.description)),
        maxlength: ("100"),
        autosize: (({ minRows: 5, maxRows: 5 })),
        placeholder: ("请输入数据集描述"),
        showWordLimit: (true),
        type: ("textarea"),
        resize: ("none"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    __VLS_77.slots.default;
    var __VLS_77;
}
if (__VLS_ctx.form.mode !== 'image') {
    const __VLS_84 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        label: ("数据集划分"),
        prop: ("split"),
    }));
    const __VLS_86 = __VLS_85({
        label: ("数据集划分"),
        prop: ("split"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    const __VLS_90 = {}.ElSelect;
    /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        modelValue: ((__VLS_ctx.form.split)),
        placeholder: ("请选择数据所属的划分：训练集、验证集或测试集"),
    }));
    const __VLS_92 = __VLS_91({
        modelValue: ((__VLS_ctx.form.split)),
        placeholder: ("请选择数据所属的划分：训练集、验证集或测试集"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    const __VLS_96 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        label: ("自动划分"),
        value: ("auto"),
    }));
    const __VLS_98 = __VLS_97({
        label: ("自动划分"),
        value: ("auto"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    const __VLS_102 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        label: ("训练集"),
        value: ("train"),
    }));
    const __VLS_104 = __VLS_103({
        label: ("训练集"),
        value: ("train"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    const __VLS_108 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        label: ("验证集"),
        value: ("val"),
    }));
    const __VLS_110 = __VLS_109({
        label: ("验证集"),
        value: ("val"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    const __VLS_114 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
        label: ("测试集"),
        value: ("test"),
    }));
    const __VLS_116 = __VLS_115({
        label: ("测试集"),
        value: ("test"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    __VLS_95.slots.default;
    var __VLS_95;
    __VLS_89.slots.default;
    var __VLS_89;
}
const __VLS_120 = {}.ElRow;
/** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ class: ("upload-operation") },
    gutter: ((20)),
}));
const __VLS_122 = __VLS_121({
    ...{ class: ("upload-operation") },
    gutter: ((20)),
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
const __VLS_126 = {}.ElCol;
/** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    span: ((24)),
}));
const __VLS_128 = __VLS_127({
    span: ((24)),
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
const __VLS_132 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    label: ("数据集类型"),
    prop: ("type"),
}));
const __VLS_134 = __VLS_133({
    label: ("数据集类型"),
    prop: ("type"),
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
const __VLS_138 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
    ...{ 'onVisibleChange': {} },
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.form.type)),
    placeholder: ("请选择数据集类型"),
    loading: ((__VLS_ctx.loading)),
    disabled: ((__VLS_ctx.form.mode !== 'new')),
}));
const __VLS_140 = __VLS_139({
    ...{ 'onVisibleChange': {} },
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.form.type)),
    placeholder: ("请选择数据集类型"),
    loading: ((__VLS_ctx.loading)),
    disabled: ((__VLS_ctx.form.mode !== 'new')),
}, ...__VLS_functionalComponentArgsRest(__VLS_139));
let __VLS_144;
const __VLS_145 = {
    onVisibleChange: (__VLS_ctx.fetchDatasetType)
};
const __VLS_146 = {
    onChange: (__VLS_ctx.handleDatasetTypeChange)
};
let __VLS_141;
let __VLS_142;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetTypeOptions))) {
    const __VLS_147 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }));
    const __VLS_149 = __VLS_148({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
}
{
    const { loading: __VLS_thisSlot } = __VLS_143.slots;
    const __VLS_153 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({
        ...{ class: ("is-loading") },
    }));
    const __VLS_155 = __VLS_154({
        ...{ class: ("is-loading") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_154));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: ("circular") },
        viewBox: ("0 0 20 20"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
        ...{ class: ("path2 loading-path") },
        'stroke-width': ("0"),
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        r: ("3.375"),
        ...{ class: ("dot1") },
        rx: ("0"),
        ry: ("0"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        r: ("3.375"),
        ...{ class: ("dot2") },
        rx: ("0"),
        ry: ("0"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        r: ("3.375"),
        ...{ class: ("dot4") },
        rx: ("0"),
        ry: ("0"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        r: ("3.375"),
        ...{ class: ("dot3") },
        rx: ("0"),
        ry: ("0"),
    });
    __VLS_158.slots.default;
    var __VLS_158;
}
__VLS_143.slots.default;
var __VLS_143;
__VLS_137.slots.default;
var __VLS_137;
__VLS_131.slots.default;
var __VLS_131;
if (__VLS_ctx.form.mode !== 'image') {
    const __VLS_159 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
        span: ((24)),
    }));
    const __VLS_161 = __VLS_160({
        span: ((24)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("file-upload-container") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onFileSelected) },
        type: ("file"),
        ref: ("fileInput"),
        ...{ class: ("hidden-input") },
        accept: (".json,.csv,.xlsx,.xls"),
    });
    // @ts-ignore navigation for `const fileInput = ref()`
    /** @type { typeof __VLS_ctx.fileInput } */ ;
    const __VLS_165 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
        ...{ 'onClick': {} },
        ...{ class: ("dashed-upload-btn") },
        ...{ class: (({ 'is-selected': __VLS_ctx.selectedFile })) },
        disabled: ((__VLS_ctx.loading)),
    }));
    const __VLS_167 = __VLS_166({
        ...{ 'onClick': {} },
        ...{ class: ("dashed-upload-btn") },
        ...{ class: (({ 'is-selected': __VLS_ctx.selectedFile })) },
        disabled: ((__VLS_ctx.loading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_166));
    let __VLS_171;
    const __VLS_172 = {
        onClick: (__VLS_ctx.triggerFileSelect)
    };
    let __VLS_168;
    let __VLS_169;
    const __VLS_173 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
        ...{ class: ("file-icon") },
        color: ((__VLS_ctx.iconColor)),
    }));
    const __VLS_175 = __VLS_174({
        ...{ class: ("file-icon") },
        color: ((__VLS_ctx.iconColor)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_174));
    const __VLS_179 = {}.Document;
    /** @type { [typeof __VLS_components.Document, ] } */ ;
    // @ts-ignore
    const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({}));
    const __VLS_181 = __VLS_180({}, ...__VLS_functionalComponentArgsRest(__VLS_180));
    __VLS_178.slots.default;
    var __VLS_178;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("upload-text") },
    });
    (__VLS_ctx.buttonText);
    if (__VLS_ctx.loading) {
        const __VLS_185 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
            ...{ class: ("loading-icon") },
        }));
        const __VLS_187 = __VLS_186({
            ...{ class: ("loading-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_186));
        const __VLS_191 = {}.Loading;
        /** @type { [typeof __VLS_components.Loading, ] } */ ;
        // @ts-ignore
        const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({}));
        const __VLS_193 = __VLS_192({}, ...__VLS_functionalComponentArgsRest(__VLS_192));
        __VLS_190.slots.default;
        var __VLS_190;
    }
    else if (__VLS_ctx.selectedFile) {
        const __VLS_197 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
            ...{ class: ("check-icon") },
            color: ("#67c23a"),
        }));
        const __VLS_199 = __VLS_198({
            ...{ class: ("check-icon") },
            color: ("#67c23a"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_198));
        const __VLS_203 = {}.Check;
        /** @type { [typeof __VLS_components.Check, ] } */ ;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({}));
        const __VLS_205 = __VLS_204({}, ...__VLS_functionalComponentArgsRest(__VLS_204));
        __VLS_202.slots.default;
        var __VLS_202;
    }
    __VLS_170.slots.default;
    var __VLS_170;
    __VLS_164.slots.default;
    var __VLS_164;
}
if (__VLS_ctx.form.mode === 'image') {
    const __VLS_209 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
        span: ((24)),
    }));
    const __VLS_211 = __VLS_210({
        span: ((24)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_210));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("file-upload-container") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onFolderSelected) },
        type: ("file"),
        ref: ("folderInput"),
        ...{ class: ("hidden-input") },
        webkitdirectory: (true),
        directory: (true),
        multiple: (true),
        accept: ("image/*"),
    });
    // @ts-ignore navigation for `const folderInput = ref()`
    /** @type { typeof __VLS_ctx.folderInput } */ ;
    const __VLS_215 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
        ...{ 'onClick': {} },
        ...{ class: ("dashed-upload-btn folder-upload-btn") },
        ...{ class: (({ 'is-selected': __VLS_ctx.selectedFolder })) },
    }));
    const __VLS_217 = __VLS_216({
        ...{ 'onClick': {} },
        ...{ class: ("dashed-upload-btn folder-upload-btn") },
        ...{ class: (({ 'is-selected': __VLS_ctx.selectedFolder })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
    let __VLS_221;
    const __VLS_222 = {
        onClick: (__VLS_ctx.triggerFolderSelect)
    };
    let __VLS_218;
    let __VLS_219;
    const __VLS_223 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
        ...{ class: ("folder-icon") },
    }));
    const __VLS_225 = __VLS_224({
        ...{ class: ("folder-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_224));
    const __VLS_229 = {}.FolderOpened;
    /** @type { [typeof __VLS_components.FolderOpened, ] } */ ;
    // @ts-ignore
    const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({}));
    const __VLS_231 = __VLS_230({}, ...__VLS_functionalComponentArgsRest(__VLS_230));
    __VLS_228.slots.default;
    var __VLS_228;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("upload-text") },
    });
    (__VLS_ctx.imageButtonText);
    if (__VLS_ctx.selectedFolder) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("file-count") },
        });
        (__VLS_ctx.selectedFolder.fileCount);
    }
    __VLS_220.slots.default;
    var __VLS_220;
    __VLS_214.slots.default;
    var __VLS_214;
}
const __VLS_235 = {}.ElCol;
/** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
// @ts-ignore
const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
    span: ((24)),
}));
const __VLS_237 = __VLS_236({
    span: ((24)),
}, ...__VLS_functionalComponentArgsRest(__VLS_236));
const __VLS_241 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    ...{ 'onClick': {} },
    type: ("primary"),
    disabled: (((!__VLS_ctx.selectedFile && !__VLS_ctx.selectedFolder?.fileCount) || __VLS_ctx.loading)),
    ...{ style: ({}) },
}));
const __VLS_243 = __VLS_242({
    ...{ 'onClick': {} },
    type: ("primary"),
    disabled: (((!__VLS_ctx.selectedFile && !__VLS_ctx.selectedFolder?.fileCount) || __VLS_ctx.loading)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
let __VLS_247;
const __VLS_248 = {
    onClick: (__VLS_ctx.handleUpload)
};
let __VLS_244;
let __VLS_245;
__VLS_246.slots.default;
var __VLS_246;
__VLS_240.slots.default;
var __VLS_240;
__VLS_125.slots.default;
var __VLS_125;
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("right-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("field-checker-container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("field-card valid-card") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("card-title") },
});
const __VLS_249 = {}.ElTooltip;
/** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    content: ("数据规范中可上传的字段，您的文件中已正确包含这些字段"),
    placement: ("top"),
}));
const __VLS_251 = __VLS_250({
    content: ("数据规范中可上传的字段，您的文件中已正确包含这些字段"),
    placement: ("top"),
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
const __VLS_255 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    ...{ class: ("info-icon") },
}));
const __VLS_257 = __VLS_256({
    ...{ class: ("info-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
const __VLS_261 = {}.QuestionFilled;
/** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
// @ts-ignore
const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({}));
const __VLS_263 = __VLS_262({}, ...__VLS_functionalComponentArgsRest(__VLS_262));
__VLS_260.slots.default;
var __VLS_260;
__VLS_254.slots.default;
var __VLS_254;
const __VLS_267 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
    type: ("success"),
    size: ("small"),
}));
const __VLS_269 = __VLS_268({
    type: ("success"),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
(__VLS_ctx.validFields.length);
__VLS_272.slots.default;
var __VLS_272;
if (__VLS_ctx.validFields.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("field-list") },
    });
    for (const [field, index] of __VLS_getVForSourceType((__VLS_ctx.validFields))) {
        const __VLS_273 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
            key: ((index)),
            content: ((__VLS_ctx.validTitleDisplay.find(item => item.title.toLowerCase() === field.toLowerCase())?.description || '该字段为必填项')),
            placement: ("top"),
        }));
        const __VLS_275 = __VLS_274({
            key: ((index)),
            content: ((__VLS_ctx.validTitleDisplay.find(item => item.title.toLowerCase() === field.toLowerCase())?.description || '该字段为必填项')),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_274));
        const __VLS_279 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
            ...{ class: ("field-tag valid-tag disable-select") },
        }));
        const __VLS_281 = __VLS_280({
            ...{ class: ("field-tag valid-tag disable-select") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_280));
        (field);
        __VLS_284.slots.default;
        var __VLS_284;
        __VLS_278.slots.default;
        var __VLS_278;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("field-card invalid-card") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("card-title") },
});
const __VLS_285 = {}.ElTooltip;
/** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
    content: ("数据规范中要求的必填字段，但您的文件中缺失这些字段"),
    placement: ("top"),
}));
const __VLS_287 = __VLS_286({
    content: ("数据规范中要求的必填字段，但您的文件中缺失这些字段"),
    placement: ("top"),
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
const __VLS_291 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
    ...{ class: ("info-icon") },
}));
const __VLS_293 = __VLS_292({
    ...{ class: ("info-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_292));
const __VLS_297 = {}.QuestionFilled;
/** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({}));
const __VLS_299 = __VLS_298({}, ...__VLS_functionalComponentArgsRest(__VLS_298));
__VLS_296.slots.default;
var __VLS_296;
__VLS_290.slots.default;
var __VLS_290;
const __VLS_303 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
    type: ("danger"),
    size: ("small"),
}));
const __VLS_305 = __VLS_304({
    type: ("danger"),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_304));
(__VLS_ctx.invalidFields.length);
__VLS_308.slots.default;
var __VLS_308;
if (__VLS_ctx.invalidFields.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("field-list") },
    });
    for (const [field, index] of __VLS_getVForSourceType((__VLS_ctx.invalidFields))) {
        const __VLS_309 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
            key: ((index)),
            content: ((__VLS_ctx.datasetFields?.[__VLS_ctx.form?.type]?.required?.[field].description || '该字段为必填项')),
            placement: ("top"),
        }));
        const __VLS_311 = __VLS_310({
            key: ((index)),
            content: ((__VLS_ctx.datasetFields?.[__VLS_ctx.form?.type]?.required?.[field].description || '该字段为必填项')),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_310));
        const __VLS_315 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
            ...{ class: ("field-tag invalid-tag disable-select") },
        }));
        const __VLS_317 = __VLS_316({
            ...{ class: ("field-tag invalid-tag disable-select") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_316));
        (field);
        __VLS_320.slots.default;
        var __VLS_320;
        __VLS_314.slots.default;
        var __VLS_314;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("field-card optional-card") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("card-title") },
});
const __VLS_321 = {}.ElTooltip;
/** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
    content: ("数据规范中非必填的扩展字段，您可以在数据集中选择性包含这些字段，以扩展数据集的用途"),
    placement: ("top"),
}));
const __VLS_323 = __VLS_322({
    content: ("数据规范中非必填的扩展字段，您可以在数据集中选择性包含这些字段，以扩展数据集的用途"),
    placement: ("top"),
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
const __VLS_327 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
    ...{ class: ("info-icon") },
}));
const __VLS_329 = __VLS_328({
    ...{ class: ("info-icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_328));
const __VLS_333 = {}.QuestionFilled;
/** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({}));
const __VLS_335 = __VLS_334({}, ...__VLS_functionalComponentArgsRest(__VLS_334));
__VLS_332.slots.default;
var __VLS_332;
__VLS_326.slots.default;
var __VLS_326;
const __VLS_339 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
    type: ("info"),
    size: ("small"),
}));
const __VLS_341 = __VLS_340({
    type: ("info"),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_340));
(__VLS_ctx.optionalFields.length);
__VLS_344.slots.default;
var __VLS_344;
if (__VLS_ctx.optionalFields.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("field-list") },
    });
    for (const [field, index] of __VLS_getVForSourceType((__VLS_ctx.optionalFields))) {
        const __VLS_345 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
            key: ((index)),
            content: ((__VLS_ctx.datasetFields?.[__VLS_ctx.form?.type]?.optional?.[field].description || '该字段为可选项')),
            placement: ("top"),
        }));
        const __VLS_347 = __VLS_346({
            key: ((index)),
            content: ((__VLS_ctx.datasetFields?.[__VLS_ctx.form?.type]?.optional?.[field].description || '该字段为可选项')),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_346));
        const __VLS_351 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
            ...{ class: ("field-tag optional-tag disable-select") },
        }));
        const __VLS_353 = __VLS_352({
            ...{ class: ("field-tag optional-tag disable-select") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_352));
        (field);
        __VLS_356.slots.default;
        var __VLS_356;
        __VLS_350.slots.default;
        var __VLS_350;
    }
}
if (__VLS_ctx.selectedFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("viewer-table") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("title-container") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("table-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("record-stats") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("preview-count") },
    });
    (__VLS_ctx.tableData.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("total-count") },
    });
    (__VLS_ctx.totalRecords);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("unit-label") },
    });
    const __VLS_357 = {}.ElTooltip;
    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
    // @ts-ignore
    const __VLS_358 = __VLS_asFunctionalComponent(__VLS_357, new __VLS_357({
        content: ("当前展示前50条数据"),
        placement: ("right"),
    }));
    const __VLS_359 = __VLS_358({
        content: ("当前展示前50条数据"),
        placement: ("right"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_358));
    const __VLS_363 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
        ...{ style: ({}) },
    }));
    const __VLS_365 = __VLS_364({
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_364));
    const __VLS_369 = {}.QuestionFilled;
    /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
    // @ts-ignore
    const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({}));
    const __VLS_371 = __VLS_370({}, ...__VLS_functionalComponentArgsRest(__VLS_370));
    __VLS_368.slots.default;
    var __VLS_368;
    __VLS_362.slots.default;
    var __VLS_362;
    const __VLS_375 = {}.ElTable;
    /** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
    // @ts-ignore
    const __VLS_376 = __VLS_asFunctionalComponent(__VLS_375, new __VLS_375({
        ...{ 'onRowClick': {} },
        ...{ 'onHeaderDragend': {} },
        ...{ 'onSortChange': {} },
        data: ((__VLS_ctx.tableData)),
        ref: ("tableRef"),
        border: (true),
        stripe: (true),
        headerCellStyle: (({ whiteSpace: 'nowrap' })),
        headerCellClassName: ((__VLS_ctx.handleHeaderCellClass)),
    }));
    const __VLS_377 = __VLS_376({
        ...{ 'onRowClick': {} },
        ...{ 'onHeaderDragend': {} },
        ...{ 'onSortChange': {} },
        data: ((__VLS_ctx.tableData)),
        ref: ("tableRef"),
        border: (true),
        stripe: (true),
        headerCellStyle: (({ whiteSpace: 'nowrap' })),
        headerCellClassName: ((__VLS_ctx.handleHeaderCellClass)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_376));
    // @ts-ignore navigation for `const tableRef = ref()`
    /** @type { typeof __VLS_ctx.tableRef } */ ;
    var __VLS_381 = {};
    let __VLS_382;
    const __VLS_383 = {
        onRowClick: (__VLS_ctx.handleRowClick)
    };
    const __VLS_384 = {
        onHeaderDragend: (__VLS_ctx.handleMouseDown)
    };
    const __VLS_385 = {
        onSortChange: (__VLS_ctx.handleSortChange)
    };
    let __VLS_378;
    let __VLS_379;
    for (const [column, index] of __VLS_getVForSourceType((__VLS_ctx.validTitleDisplay))) {
        const __VLS_386 = {}.ElTableColumn;
        /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
        // @ts-ignore
        const __VLS_387 = __VLS_asFunctionalComponent(__VLS_386, new __VLS_386({
            key: ((index)),
            prop: ((column.title)),
            label: ((column.title)),
            minWidth: ((column.width || '200px')),
            resizable: ((true)),
            className: ((column.align || 'text-left')),
            sortable: ("custom"),
        }));
        const __VLS_388 = __VLS_387({
            key: ((index)),
            prop: ((column.title)),
            label: ((column.title)),
            minWidth: ((column.width || '200px')),
            resizable: ((true)),
            className: ((column.align || 'text-left')),
            sortable: ("custom"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_387));
        {
            const { default: __VLS_thisSlot } = __VLS_391.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("cell-content") },
                ...{ class: (({ expanded: __VLS_ctx.expandedRows.includes(__VLS_ctx.tableData.indexOf(row)) })) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (row[column.title]);
        }
        __VLS_391.slots.default;
        var __VLS_391;
    }
    __VLS_380.slots.default;
    var __VLS_380;
}
if (__VLS_ctx.form.type || __VLS_ctx.selectedFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dataset-info-card") },
    });
    if (__VLS_ctx.form.type) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-section") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: ("section-title") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("el-icon-document") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("type-description") },
        });
        (__VLS_ctx.datasetFields?.[__VLS_ctx.form?.type]?.description || '暂无描述信息');
        if (false) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("model-list") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
            for (const [model, index] of __VLS_getVForSourceType((__VLS_ctx.modelOptions))) {
                const __VLS_392 = {}.ElTag;
                /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
                // @ts-ignore
                const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
                    key: ((index)),
                    ...{ class: ("model-tag") },
                    type: ((model.isRecommended ? 'success' : '')),
                }));
                const __VLS_394 = __VLS_393({
                    key: ((index)),
                    ...{ class: ("model-tag") },
                    type: ((model.isRecommended ? 'success' : '')),
                }, ...__VLS_functionalComponentArgsRest(__VLS_393));
                (model.name);
                if (model.tooltip) {
                    const __VLS_398 = {}.ElTooltip;
                    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
                    // @ts-ignore
                    const __VLS_399 = __VLS_asFunctionalComponent(__VLS_398, new __VLS_398({
                        content: ((model.tooltip)),
                        placement: ("top"),
                    }));
                    const __VLS_400 = __VLS_399({
                        content: ((model.tooltip)),
                        placement: ("top"),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_399));
                    const __VLS_404 = {}.ElIcon;
                    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
                    // @ts-ignore
                    const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({}));
                    const __VLS_406 = __VLS_405({}, ...__VLS_functionalComponentArgsRest(__VLS_405));
                    const __VLS_410 = {}.QuestionFilled;
                    /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
                    // @ts-ignore
                    const __VLS_411 = __VLS_asFunctionalComponent(__VLS_410, new __VLS_410({}));
                    const __VLS_412 = __VLS_411({}, ...__VLS_functionalComponentArgsRest(__VLS_411));
                    __VLS_409.slots.default;
                    var __VLS_409;
                    __VLS_403.slots.default;
                    var __VLS_403;
                }
                __VLS_397.slots.default;
                var __VLS_397;
            }
        }
    }
    if (__VLS_ctx.selectedFile) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-section") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: ("section-title") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("el-icon-folder-opened") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("file-stats") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("label") },
        });
        const __VLS_416 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
            content: ((__VLS_ctx.selectedFile.name)),
            placement: ("right"),
        }));
        const __VLS_418 = __VLS_417({
            content: ((__VLS_ctx.selectedFile.name)),
            placement: ("right"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_417));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("value") },
        });
        (__VLS_ctx.selectedFile.name);
        __VLS_421.slots.default;
        var __VLS_421;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("value") },
        });
        (__VLS_ctx.formatFileSize(__VLS_ctx.selectedFile.size));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("value") },
        });
        (__VLS_ctx.totalRecords);
    }
}
const __VLS_422 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_423 = __VLS_asFunctionalComponent(__VLS_422, new __VLS_422({
    modelValue: ((__VLS_ctx.uploadDialogVisible)),
    title: ("上传进度"),
    width: ("500px"),
    closeOnClickModal: ((false)),
    showClose: ((false)),
    closeOnPressEscape: ((false)),
}));
const __VLS_424 = __VLS_423({
    modelValue: ((__VLS_ctx.uploadDialogVisible)),
    title: ("上传进度"),
    width: ("500px"),
    closeOnClickModal: ((false)),
    showClose: ((false)),
    closeOnPressEscape: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_423));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("upload-progress-container") },
});
const __VLS_428 = {}.ElProgress;
/** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
// @ts-ignore
const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
    percentage: ((__VLS_ctx.uploadProgress)),
    strokeWidth: ((20)),
    status: ("success"),
    textInside: ((true)),
}));
const __VLS_430 = __VLS_429({
    percentage: ((__VLS_ctx.uploadProgress)),
    strokeWidth: ((20)),
    status: ("success"),
    textInside: ((true)),
}, ...__VLS_functionalComponentArgsRest(__VLS_429));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("progress-details") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("detail-item") },
});
(__VLS_ctx.formatSize(__VLS_ctx.uploadedSize));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("detail-item") },
});
(__VLS_ctx.formatSize(__VLS_ctx.totalSize));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("detail-item") },
});
(__VLS_ctx.formatSpeed(__VLS_ctx.uploadSpeed));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("file-info") },
});
(__VLS_ctx.currentFileName);
{
    const { footer: __VLS_thisSlot } = __VLS_427.slots;
    const __VLS_434 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
        ...{ 'onClick': {} },
        type: ("danger"),
        disabled: ((!__VLS_ctx.isUploadCancelable)),
    }));
    const __VLS_436 = __VLS_435({
        ...{ 'onClick': {} },
        type: ("danger"),
        disabled: ((!__VLS_ctx.isUploadCancelable)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_435));
    let __VLS_440;
    const __VLS_441 = {
        onClick: (__VLS_ctx.cancelUpload)
    };
    let __VLS_437;
    let __VLS_438;
    __VLS_439.slots.default;
    var __VLS_439;
}
__VLS_427.slots.default;
var __VLS_427;
['container', 'container-header', 'title', 'container-body', 'body-content', 'top-panel', 'left-panel', 'dataset-info', 'dataset-form', 'searchable-select', 'upload-operation', 'is-loading', 'circular', 'path2', 'loading-path', 'dot1', 'dot2', 'dot4', 'dot3', 'file-upload-container', 'hidden-input', 'dashed-upload-btn', 'is-selected', 'file-icon', 'upload-text', 'loading-icon', 'check-icon', 'file-upload-container', 'hidden-input', 'dashed-upload-btn', 'folder-upload-btn', 'is-selected', 'folder-icon', 'upload-text', 'file-count', 'right-panel', 'field-checker-container', 'field-card', 'valid-card', 'card-title', 'info-icon', 'field-list', 'field-tag', 'valid-tag', 'disable-select', 'field-card', 'invalid-card', 'card-title', 'info-icon', 'field-list', 'field-tag', 'invalid-tag', 'disable-select', 'field-card', 'optional-card', 'card-title', 'info-icon', 'field-list', 'field-tag', 'optional-tag', 'disable-select', 'viewer-table', 'table-header', 'title-container', 'table-title', 'record-stats', 'preview-count', 'total-count', 'unit-label', 'cell-content', 'expanded', 'dataset-info-card', 'info-section', 'section-title', 'el-icon-document', 'type-description', 'model-list', 'model-tag', 'info-section', 'section-title', 'el-icon-folder-opened', 'file-stats', 'stat-item', 'label', 'value', 'stat-item', 'label', 'value', 'stat-item', 'label', 'value', 'upload-progress-container', 'progress-details', 'detail-item', 'detail-item', 'detail-item', 'file-info',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            uploadDialogVisible: uploadDialogVisible,
            uploadProgress: uploadProgress,
            uploadedSize: uploadedSize,
            totalSize: totalSize,
            uploadSpeed: uploadSpeed,
            currentFileName: currentFileName,
            isUploadCancelable: isUploadCancelable,
            formatSize: formatSize,
            formatSpeed: formatSpeed,
            selectedFolder: selectedFolder,
            onFolderSelected: onFolderSelected,
            cancelUpload: cancelUpload,
            handleUpload: handleUpload,
            tableData: tableData,
            totalRecords: totalRecords,
            loading: loading,
            selectedFile: selectedFile,
            fileInput: fileInput,
            folderInput: folderInput,
            form: form,
            existingDatasets: existingDatasets,
            datasetTypeOptions: datasetTypeOptions,
            datasetFields: datasetFields,
            rules: rules,
            formRef: formRef,
            handleModeChange: handleModeChange,
            searchExistingDatasets: searchExistingDatasets,
            handleSelectVisible: handleSelectVisible,
            handleExistingDatasetChange: handleExistingDatasetChange,
            triggerFileSelect: triggerFileSelect,
            triggerFolderSelect: triggerFolderSelect,
            iconColor: iconColor,
            formatFileSize: formatFileSize,
            buttonText: buttonText,
            imageButtonText: imageButtonText,
            onFileSelected: onFileSelected,
            expandedRows: expandedRows,
            tableRef: tableRef,
            validTitleDisplay: validTitleDisplay,
            handleRowClick: handleRowClick,
            fetchDatasetType: fetchDatasetType,
            handleDatasetTypeChange: handleDatasetTypeChange,
            validFields: validFields,
            invalidFields: invalidFields,
            optionalFields: optionalFields,
            handleMouseDown: handleMouseDown,
            handleHeaderCellClass: handleHeaderCellClass,
            handleSortChange: handleSortChange,
            modelOptions: modelOptions,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
});
; /* PartiallyEnd: #4569/main.vue */
