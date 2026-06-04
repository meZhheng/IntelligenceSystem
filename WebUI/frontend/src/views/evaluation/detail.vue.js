import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/api/axios';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import CryptoJS from 'crypto-js';
// 主列表，单文件和目录文件都进这里
const fileList = ref([]);
// 单文件上传回调
function onFileChange(_, newList) {
    mergeFileLists(newList.map(f => ({ name: f.name, raw: f.raw })));
}
// 文件夹上传触发
const folderInput = ref();
function triggerFolderSelect() { folderInput.value?.click(); }
// 文件夹选择回调
function onFolderSelected(e) {
    const input = e.target;
    if (!input.files)
        return;
    const arr = Array.from(input.files)
        .map(f => ({ name: f.name, raw: f }));
    mergeFileLists(arr);
    input.value = ''; // 支持重复选同一个文件夹
}
// 合并并去重
function mergeFileLists(newItems) {
    const seen = new Set();
    // 先把老的 key 加进去
    fileList.value.forEach(f => seen.add(f.raw.webkitRelativePath || f.name));
    // push 新的不重复
    newItems.forEach(f => {
        const key = f.raw.webkitRelativePath || f.name;
        if (!seen.has(key)) {
            seen.add(key);
            fileList.value.push(f);
        }
    });
}
// 单条删除
function onRemove(f) {
    fileList.value = fileList.value.filter(x => x !== f);
}
// refs & state
const running = ref(false);
const confusion = ref([]);
const task = reactive({
    label: '',
    value: null,
    description: '',
    completed: false,
    model: { alias: '', description: '' },
    requirements: null
});
const overviewMetrics = ref({});
// 解析阈值字符串 “>= 80%” -> { op: '>=', threshold: 80 }
function parseReq(req) {
    const m = req.match(/(>=|<=|>|<)\s*([\d.]+)/);
    return m ? { op: m[1], threshold: parseFloat(m[2]) } : null;
}
// 检验 actual 值“92.7%”是否满足 {op, threshold}
function checkValue(actualStr, rule) {
    const num = parseFloat(actualStr.replace('%', ''));
    switch (rule.op) {
        case '>=': return num >= rule.threshold;
        case '<=': return num <= rule.threshold;
        case '>': return num > rule.threshold;
        case '<': return num < rule.threshold;
    }
    return true;
}
// 合并成带状态的列表
const overviewList = computed(() => {
    return Object.entries(overviewMetrics.value)
        .map(([key, actual]) => {
        const reqStr = task.requirements?.[key];
        let passed = true;
        if (reqStr) {
            const rule = parseReq(reqStr);
            passed = rule ? checkValue(actual, rule) : true;
        }
        return { key, actual, requirement: reqStr, passed };
    })
        // 只保留那些有 requirement 的
        .filter(item => !!item.requirement);
});
const classificationReport = ref([]);
const route = useRoute();
// fetch detail on mount
async function fetchDetail() {
    const { data } = await axios.get(`/evaluate/detail/${route.params.id}`);
    Object.assign(task, data);
    overviewMetrics.value = data.metrics.overview;
    classificationReport.value = data.metrics.classification;
    confusion.value = data.metrics.confusion;
    await nextTick();
    initMatrixChart();
}
onMounted(fetchDetail);
// const fileList = ref<UploadFile[]>([])
const uploading = ref(false);
const uploadProgress = ref(0);
// 读取单个文件为 ArrayBuffer 并计算 SHA-256
async function hashFile(file) {
    const buffer = await file.arrayBuffer();
    // 直接把 TypedArray 传进去，下面两种都可以：
    // const wordArray = CryptoJS.lib.WordArray.create(buffer as any);
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(buffer));
    const hash = CryptoJS.SHA256(wordArray);
    return hash.toString(CryptoJS.enc.Hex);
}
async function hashFileIncremental(file, chunkSize = 4 * 1024 * 1024) {
    const sha256 = CryptoJS.algo.SHA256.create();
    const total = file.size;
    let offset = 0;
    while (offset < total) {
        const slice = file.slice(offset, offset + chunkSize);
        const buf = await slice.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(buf));
        sha256.update(wordArray);
        offset += chunkSize;
    }
    const result = sha256.finalize();
    return result.toString(CryptoJS.enc.Hex);
}
// 模拟上传并校验
async function verifyAll() {
    uploading.value = true;
    uploadProgress.value = 0;
    const total = fileList.value.length;
    const checksums = [];
    try {
        for (let i = 0; i < total; i++) {
            const fileRecord = fileList.value[i];
            if (!fileRecord || !fileRecord.raw) {
                throw new Error(`文件列表第 ${i} 项不存在或没有 raw 属性`);
            }
            const file = fileRecord.raw; // 这是一个 File/Blob
            const digest = await hashFile(file);
            checksums.push(digest);
            // 模拟进度：按文件占比
            uploadProgress.value = Math.round(((i + 1) / total) * 100);
        }
        return checksums;
    }
    catch (err) {
        console.error(err);
        ElMessage.error('文件校验失败，请检查文件是否选择错误');
    }
    finally {
        uploading.value = false;
    }
}
/**
* 把多段 SHA-256 校验和再次合并 SHA-256
* @param checksums 已计算好的各段文件 SHA-256 十六进制字符串数组
* @returns 最终合并后的 SHA-256 十六进制字符串
*/
function combineChecksums(checksums) {
    // 1. 排序
    const sorted = checksums.slice().sort();
    // 2. 拼接
    const joint = sorted.join('|');
    // 3. 使用 crypto-js 同步计算 SHA-256
    const hash = CryptoJS.SHA256(joint);
    return hash.toString(CryptoJS.enc.Hex);
}
const progress = ref(0);
const progressMessage = ref('');
// 开始评估
async function startEvaluation(checksums) {
    const finalCode = await combineChecksums(checksums);
    running.value = true;
    progress.value = 0;
    progressMessage.value = '开始评估…';
    try {
        // 2. 发起 POST，拿到 ReadableStream
        const token = localStorage.getItem('user-token');
        const res = await fetch('/api/evaluate/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                files: finalCode,
                task_id: route.params.id
            })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || '启动失败');
        }
        // 3. 逐行读取 NDJSON
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // 最后一行可能不完整，留到下一次循环
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const obj = JSON.parse(line);
                    // 更新进度和文字
                    if (obj.progress !== undefined) {
                        progress.value = obj.progress;
                    }
                    if (obj.message) {
                        progressMessage.value = obj.message;
                    }
                    if (obj.metrics !== undefined) {
                        overviewMetrics.value = obj.metrics.overview;
                        classificationReport.value = obj.metrics.classification;
                        confusion.value = obj.metrics.confusion;
                        fetchDetail();
                    }
                }
                catch { }
            }
        }
        // 完成后
        progress.value = 100;
        progressMessage.value = '评估完成';
        ElMessage.success('模型测试完成');
    }
    catch (err) {
        ElMessage.error(err.message);
    }
    finally {
        running.value = false;
    }
}
// 当用户第一次点击“开始评估”前，先触发校验
// 因为“开始评估”按钮要 disabled => !verified
// 我们用 watcher 或者直接将 verifyAll() 放到按钮点击逻辑里
// 下面示例：在按钮点击时先校验
const evaluate = async () => {
    if (!uploading.value) {
        const checksums = await verifyAll();
        await startEvaluation(checksums);
    }
};
const matrixChartRef = ref();
function initMatrixChart() {
    const chart = echarts.init(matrixChartRef.value);
    const labels = classificationReport.value.map(r => r.class);
    chart.setOption({
        tooltip: {
            trigger: 'item',
            // 自定义 formatter：params.data = [xIndex, yIndex, value]
            formatter: params => {
                const [actualIdx, predIdx, count] = params.data;
                const actualLabel = labels[actualIdx];
                const predictedLabel = labels[predIdx];
                return `
                    <div>
                    <strong>实际标签：</strong> ${actualLabel}<br/>
                    <strong>预测标签：</strong> ${predictedLabel}<br/>
                    <strong>数量：</strong> ${count}
                    </div>
                `;
            },
            backgroundColor: 'rgba(50,50,50,0.7)',
            textStyle: { color: '#fff' },
            extraCssText: 'padding:10px; border-radius:4px;'
        },
        xAxis: {
            type: 'category',
            data: labels,
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'category',
            data: labels,
            nameLocation: 'middle',
            nameGap: 40,
            inverse: true // 通常混淆矩阵会把第一行显示在上面
        },
        grid: {
            left: 0,
            right: 0,
            top: '10%',
            bottom: '25%',
            containLabel: true
        },
        visualMap: {
            min: 0,
            max: Math.max(...confusion.value.map(c => c[2])),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
        },
        series: [{
                name: '混淆矩阵',
                type: 'heatmap',
                data: confusion.value,
                label: { show: true, formatter: ({ value }) => value[2] }
            }]
    });
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['upload-list', 'metric-card', 'metric-card', 'metric-card', 'metric-card', 'metric-value', 'info-card', 'card-title', 'hidden-input',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-detail-container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-meta") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: ("model-title") },
});
(__VLS_ctx.task.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-cards") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-wrapper") },
});
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("info-card") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("info-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
{
    const { header: __VLS_thisSlot } = __VLS_5.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("card-title") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.task.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.task.description);
__VLS_5.slots.default;
var __VLS_5;
const __VLS_6 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    ...{ class: ("info-card") },
}));
const __VLS_8 = __VLS_7({
    ...{ class: ("info-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
{
    const { header: __VLS_thisSlot } = __VLS_11.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("card-title") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-info") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.task.model.alias);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("info-item") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.task.model.description);
__VLS_11.slots.default;
var __VLS_11;
const __VLS_12 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ class: ("upload-card") },
}));
const __VLS_14 = __VLS_13({
    ...{ class: ("upload-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
{
    const { header: __VLS_thisSlot } = __VLS_17.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("card-title") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("upload-wrapper") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.onFolderSelected) },
    type: ("file"),
    ref: ("folderInput"),
    ...{ class: ("hidden-input") },
    webkitdirectory: (true),
    directory: (true),
    multiple: (true),
});
// @ts-ignore navigation for `const folderInput = ref()`
/** @type { typeof __VLS_ctx.folderInput } */ ;
const __VLS_18 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    ...{ 'onClick': {} },
    icon: ("FolderOpened"),
    ...{ class: ("ml-2") },
    type: ((__VLS_ctx.fileList.length ? 'primary' : 'default')),
}));
const __VLS_20 = __VLS_19({
    ...{ 'onClick': {} },
    icon: ("FolderOpened"),
    ...{ class: ("ml-2") },
    type: ((__VLS_ctx.fileList.length ? 'primary' : 'default')),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
let __VLS_24;
const __VLS_25 = {
    onClick: (__VLS_ctx.triggerFolderSelect)
};
let __VLS_21;
let __VLS_22;
(__VLS_ctx.fileList.length ? `${__VLS_ctx.fileList.length} 个文件已选` : '选择文件夹上传');
__VLS_23.slots.default;
var __VLS_23;
const __VLS_26 = {}.ElUpload;
/** @type { [typeof __VLS_components.ElUpload, typeof __VLS_components.elUpload, typeof __VLS_components.ElUpload, typeof __VLS_components.elUpload, ] } */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onChange': {} },
    ...{ 'onRemove': {} },
    fileList: ((__VLS_ctx.fileList)),
    ...{ class: ("upload-list disable-select") },
    multiple: (true),
    autoUpload: ((false)),
    beforeUpload: ((() => false)),
    listType: ("text"),
}));
const __VLS_28 = __VLS_27({
    ...{ 'onChange': {} },
    ...{ 'onRemove': {} },
    fileList: ((__VLS_ctx.fileList)),
    ...{ class: ("upload-list disable-select") },
    multiple: (true),
    autoUpload: ((false)),
    beforeUpload: ((() => false)),
    listType: ("text"),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_32;
const __VLS_33 = {
    onChange: (__VLS_ctx.onFileChange)
};
const __VLS_34 = {
    onRemove: (__VLS_ctx.onRemove)
};
let __VLS_29;
let __VLS_30;
const __VLS_35 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    icon: ("Upload"),
    ...{ class: ("upload_button") },
}));
const __VLS_37 = __VLS_36({
    icon: ("Upload"),
    ...{ class: ("upload_button") },
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_40.slots.default;
var __VLS_40;
__VLS_31.slots.default;
var __VLS_31;
if (__VLS_ctx.uploading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mt-2") },
    });
    const __VLS_41 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
        textInside: ((true)),
        strokeWidth: ((18)),
        percentage: ((__VLS_ctx.uploadProgress)),
    }));
    const __VLS_43 = __VLS_42({
        textInside: ((true)),
        strokeWidth: ((18)),
        percentage: ((__VLS_ctx.uploadProgress)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.uploadProgress);
}
if (__VLS_ctx.running) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("run-progress mt-2") },
    });
    const __VLS_47 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        percentage: ((__VLS_ctx.progress)),
    }));
    const __VLS_49 = __VLS_48({
        percentage: ((__VLS_ctx.progress)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.progressMessage);
}
const __VLS_53 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    ...{ 'onClick': {} },
    ...{ class: ("mt-2") },
    type: ("primary"),
    disabled: ((!__VLS_ctx.fileList.length)),
}));
const __VLS_55 = __VLS_54({
    ...{ 'onClick': {} },
    ...{ class: ("mt-2") },
    type: ("primary"),
    disabled: ((!__VLS_ctx.fileList.length)),
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
let __VLS_59;
const __VLS_60 = {
    onClick: (__VLS_ctx.evaluate)
};
let __VLS_56;
let __VLS_57;
(__VLS_ctx.running ? '测试中…' : '开始测试');
__VLS_58.slots.default;
var __VLS_58;
__VLS_17.slots.default;
var __VLS_17;
if (__VLS_ctx.task.completed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("evaluation-container") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("metric-overview") },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.overviewList))) {
        const __VLS_61 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
            key: ((item.key)),
            ...{ class: ((['metric-card', item.passed ? 'passed' : 'failed'])) },
        }));
        const __VLS_63 = __VLS_62({
            key: ((item.key)),
            ...{ class: ((['metric-card', item.passed ? 'passed' : 'failed'])) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("metric-header") },
        });
        (item.key);
        if (item.requirement) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (item.requirement);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("metric-value") },
        });
        (item.actual);
        const __VLS_67 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            ...{ class: ("status-icon") },
            color: ((item.passed ? '#67C23A' : '#F56C6C')),
        }));
        const __VLS_69 = __VLS_68({
            ...{ class: ("status-icon") },
            color: ((item.passed ? '#67C23A' : '#F56C6C')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        if (item.passed) {
            const __VLS_73 = {}.Check;
            /** @type { [typeof __VLS_components.Check, ] } */ ;
            // @ts-ignore
            const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({}));
            const __VLS_75 = __VLS_74({}, ...__VLS_functionalComponentArgsRest(__VLS_74));
        }
        else {
            const __VLS_79 = {}.Close;
            /** @type { [typeof __VLS_components.Close, ] } */ ;
            // @ts-ignore
            const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({}));
            const __VLS_81 = __VLS_80({}, ...__VLS_functionalComponentArgsRest(__VLS_80));
        }
        __VLS_72.slots.default;
        var __VLS_72;
        __VLS_66.slots.default;
        var __VLS_66;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("main-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("left-panel") },
    });
    const __VLS_85 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
        ...{ class: ("report-card") },
    }));
    const __VLS_87 = __VLS_86({
        ...{ class: ("report-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    {
        const { header: __VLS_thisSlot } = __VLS_90.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_91 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
            content: ("Precision-Recall Curve"),
            placement: ("top"),
        }));
        const __VLS_93 = __VLS_92({
            content: ("Precision-Recall Curve"),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        const __VLS_97 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({}));
        const __VLS_99 = __VLS_98({}, ...__VLS_functionalComponentArgsRest(__VLS_98));
        const __VLS_103 = {}.QuestionFilled;
        /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
        // @ts-ignore
        const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({}));
        const __VLS_105 = __VLS_104({}, ...__VLS_functionalComponentArgsRest(__VLS_104));
        __VLS_102.slots.default;
        var __VLS_102;
        __VLS_96.slots.default;
        var __VLS_96;
    }
    const __VLS_109 = {}.ElTable;
    /** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
    // @ts-ignore
    const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
        ref: ("classificationTable"),
        data: ((__VLS_ctx.classificationReport)),
        border: (true),
        stripe: (true),
        maxHeight: ("240"),
        cellStyle: (({ height: '68px', padding: '12px 0' })),
    }));
    const __VLS_111 = __VLS_110({
        ref: ("classificationTable"),
        data: ((__VLS_ctx.classificationReport)),
        border: (true),
        stripe: (true),
        maxHeight: ("240"),
        cellStyle: (({ height: '68px', padding: '12px 0' })),
    }, ...__VLS_functionalComponentArgsRest(__VLS_110));
    // @ts-ignore navigation for `const classificationTable = ref()`
    /** @type { typeof __VLS_ctx.classificationTable } */ ;
    var __VLS_115 = {};
    const __VLS_116 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        prop: ("class"),
        label: ("类别"),
        width: ("200"),
    }));
    const __VLS_118 = __VLS_117({
        prop: ("class"),
        label: ("类别"),
        width: ("200"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    const __VLS_122 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
        prop: ("precision"),
        label: ("精确率"),
    }));
    const __VLS_124 = __VLS_123({
        prop: ("precision"),
        label: ("精确率"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    const __VLS_128 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        prop: ("recall"),
        label: ("召回率"),
    }));
    const __VLS_130 = __VLS_129({
        prop: ("recall"),
        label: ("召回率"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    const __VLS_134 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        prop: ("f1_score"),
        label: ("F1 值"),
    }));
    const __VLS_136 = __VLS_135({
        prop: ("f1_score"),
        label: ("F1 值"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
    const __VLS_140 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        prop: ("support"),
        label: ("样本数"),
    }));
    const __VLS_142 = __VLS_141({
        prop: ("support"),
        label: ("样本数"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_114.slots.default;
    var __VLS_114;
    __VLS_90.slots.default;
    var __VLS_90;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("right-panel") },
    });
    const __VLS_146 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
        ...{ class: ("matrix-card") },
    }));
    const __VLS_148 = __VLS_147({
        ...{ class: ("matrix-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    {
        const { header: __VLS_thisSlot } = __VLS_151.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_152 = {}.ElTooltip;
        /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            content: ("Precision-Recall Curve"),
            placement: ("top"),
        }));
        const __VLS_154 = __VLS_153({
            content: ("Precision-Recall Curve"),
            placement: ("top"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        const __VLS_158 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({}));
        const __VLS_160 = __VLS_159({}, ...__VLS_functionalComponentArgsRest(__VLS_159));
        const __VLS_164 = {}.QuestionFilled;
        /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
        const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
        __VLS_163.slots.default;
        var __VLS_163;
        __VLS_157.slots.default;
        var __VLS_157;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: ("matrixChartRef"),
        ...{ class: ("matrix-chart") },
    });
    // @ts-ignore navigation for `const matrixChartRef = ref()`
    /** @type { typeof __VLS_ctx.matrixChartRef } */ ;
    __VLS_151.slots.default;
    var __VLS_151;
}
['container', 'model-detail-container', 'model-header', 'model-meta', 'model-title', 'info-cards', 'card-wrapper', 'info-card', 'card-title', 'card-content', 'model-info', 'info-item', 'label', 'value', 'info-item', 'label', 'value', 'info-card', 'card-title', 'card-content', 'model-info', 'info-item', 'label', 'value', 'info-item', 'label', 'value', 'upload-card', 'card-title', 'upload-wrapper', 'hidden-input', 'ml-2', 'upload-list', 'disable-select', 'upload_button', 'mt-2', 'run-progress', 'mt-2', 'mt-2', 'evaluation-container', 'metric-overview', 'metric-card', 'metric-header', 'metric-value', 'status-icon', 'main-content', 'left-panel', 'report-card', 'right-panel', 'matrix-card', 'matrix-chart',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            fileList: fileList,
            onFileChange: onFileChange,
            folderInput: folderInput,
            triggerFolderSelect: triggerFolderSelect,
            onFolderSelected: onFolderSelected,
            onRemove: onRemove,
            running: running,
            task: task,
            overviewList: overviewList,
            classificationReport: classificationReport,
            uploading: uploading,
            uploadProgress: uploadProgress,
            progress: progress,
            progressMessage: progressMessage,
            evaluate: evaluate,
            matrixChartRef: matrixChartRef,
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
