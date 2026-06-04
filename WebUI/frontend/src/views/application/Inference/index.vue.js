import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/api/axios';
import { formatDateTime } from '@/utils/date';
import { render as markdownRender } from '@/utils/markdown.js';
import chatCard from '@/components/InferenceResultCard/NormalLLM.vue';
import StepLLM from '@/components/InferenceResultCard/StepLLM.vue';
import ArgResultViewer from '@/components/InferenceResultCard/ARG.vue';
import PIIResultViewer from '@/components/InferenceResultCard/PII.vue';
import OffensiveViewer from '@/components/InferenceResultCard/Offensive.vue';
import ENDEFViewer from '@/components/InferenceResultCard/ENDEF.vue';
import LexiconViewer from '@/components/InferenceResultCard/Lexicon.vue';
import DataImageViewer from '@/views/datasets/dataImageViewer.vue';
import ClassifyLLMReasoningViewer from '@/components/InferenceResultCard/Classify_LLM_reasoning.vue';
import StanceLLMViewer from '@/components/InferenceResultCard/StanceLLM.vue';
import MUSEViewer from '@/components/InferenceResultCard/MUSE.vue';
import Illegal_LLM_Viewer from '@/components/InferenceResultCard/Illegal_LLM.vue';
import DialogueViewer from '@/views/datasets/dialogueViewer.vue';
import VADViewer from '@/components/InferenceResultCard/VAD.vue';
import PropagationViewer from '@/views/datasets/propagationViewer.vue';
import PropaViewer from '@/components/InferenceResultCard/Propa.vue';
import LLM_12_classViewer from '@/components/InferenceResultCard/llm_12_class.vue';
import { ElMessage } from 'element-plus';
// 路由相关
const route = useRoute();
const router = useRouter();
// 状态管理
const group_id = ref(null);
const dataset_id = ref(null);
const data_id = ref(null);
const dataset_type = ref(null);
const task_type = ref(null);
const data = ref(null);
const model_options = ref([]);
const model_selected = ref(null);
const inference_content = ref(null);
const isLoading = ref(false);
const buffer = ref('');
const parseBuffer = ref([]);
// 模型类型常量
const MODELS = {
    LLM_REASONING: ['XLNetStanceClassifier1', 'XLNetStanceClassifier2', 'XLNetStanceClassifier3', 'sentiment_xlnet'],
    LLM_STANCE: ['stance_llm', 'stance_llm_target', 'sentiment_llm', 'sentiment_llm_target', 'mm_sentiment_llm'],
    LLM_ILLEGAL: [
        'history_nihilism', 'polity_speech', 'gender_discrimination', 'army_loans', 'people_locaion_leak',
        'blacken_army_style', 'army_marriage', 'army_rumor', 'army_adapt_leak', 'weapon_leak', 'illegal_10_class',
        'bert_history_nihilism', 'bert_polity_speech', 'bert_gender_discrimination', 'bert_army_loans',
        'bert_people_locaion_leak', 'bert_blacken_army_style', 'bert_army_marriage', 'bert_army_rumor',
        'bert_army_adapt_leak', 'bert_weapon_leak', 'bert_army_information', 'army_violence', 'bert_army_violence',
        'army_local', 'bert_army_local', 'bert_army_kn'
    ],
    PROPA: ['propa_cross', 'propa_few', 'propa', 'FNDCLIP']
};
// 计算属性
const currentModelInfo = computed(() => {
    const model = model_options.value.find(item => item.value === model_selected.value) || {};
    return {
        alias: model.alias || '未知模型',
        description: model.description || '暂无模型描述',
        model_type: model.model_type || 'DEFAULT',
        version: model.version || '1.0.0',
        framework: model.framework || 'PyTorch'
    };
});
// 方法
const roleTagType = (role) => {
    switch (role) {
        case '企业机构官方': return 'success';
        case '大V/公众人物': return 'info';
        case '一般创作者': return 'warning';
        case '一般用户': return 'danger';
        default: return 'info';
    }
};
const illegalTagType = (label) => {
    return label === 0 ? 'success' : label === 1 ? 'danger' : 'info';
};
const renderDescription = (markdownText) => {
    if (!markdownText)
        return '暂无模型描述信息';
    return markdownRender(markdownText).replace(/\\n/g, '<br>');
};
const pinLoading = ref(false);
// 计算当前是否置顶（从 props.currentData 中读取）
const pinnedState = computed(() => !!(data.value && data.value.is_pinned));
/**
 * 切换置顶状态：发请求到后端更新该条数据的 is_pinned 字段
 * - 使用 PATCH / POST 等语义化方法均可，示例用 PATCH 到 `${pinApiBase}/${id}/pin`
 * - 成功后 emit 一个事件供父组件刷新或本地更新
 */
async function togglePin() {
    console.log('togglePin', data.value);
    if (!data.value) {
        ElMessage.warning('无效的数据项，无法置顶');
        return;
    }
    const newPinned = !pinnedState.value;
    pinLoading.value = true;
    try {
        // axios 写法
        const res = await axios.patch(`datasets/pin`, {
            dataset_id: dataset_id.value,
            data_id: data_id.value,
            is_pinned: newPinned,
        });
        if (res.status !== 200) {
            throw new Error(res.statusText || `HTTP ${res.status}`);
        }
        ElMessage.success(newPinned ? '已置顶' : '已取消置顶');
        data.value.is_pinned = res.data.is_pinned;
    }
    catch (err) {
        console.error('togglePin error', err);
        ElMessage.error('置顶失败，请重试');
    }
    finally {
        pinLoading.value = false;
    }
}
// 模板引用
const inferenceResultRef = ref(null);
const fetchResult = async () => {
    if (isLoading.value)
        return;
    isLoading.value = true;
    try {
        const { data: response } = await axios.post('/application/groups/SingleResult', {
            group_id: group_id.value,
            dataset_id: dataset_id.value,
            data_id: data_id.value,
            model_id: model_selected.value
        });
        inference_content.value = response.result ?? null;
    }
    catch (error) {
        console.error('Fetch result failed:', error);
    }
    finally {
        isLoading.value = false;
    }
};
const handleInference = async () => {
    if (!model_selected.value) {
        ElMessage.warning('请先选择模型');
        return;
    }
    if (isLoading.value)
        return;
    isLoading.value = true;
    const payload = {
        group_id: group_id.value,
        dataset_id: dataset_id.value,
        data_id: data_id.value,
        model_id: model_selected.value,
    };
    const modelType = getModelOption(model_selected.value)?.model_type;
    if (modelType === 'LLM') {
        flushBuffer();
        inferenceResultRef.value.isLoading = true;
        await startInferenceStreaming(payload);
    }
    else {
        inference_content.value = null;
        try {
            await axios.post('/application/inference_item', payload, { timeout: 100000 });
        }
        catch (error) {
            console.error('Inference failed:', error);
        }
        finally {
            isLoading.value = false;
            fetchResult();
        }
    }
};
const startInferenceStreaming = async (payload) => {
    const token = localStorage.getItem('user-token');
    try {
        const response = await fetch("/api/application/inference_streaming", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (!response.body)
            return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
                buffer.value += decoder.decode(value, { stream: true });
                processBuffer(false);
            }
        }
        processBuffer(true);
    }
    catch (error) {
        console.error('Streaming failed:', error);
    }
    finally {
        isLoading.value = false;
        fetchResult();
        inferenceResultRef.value.isLoading = false;
    }
};
const processBuffer = (final = false) => {
    const lines = buffer.value.split('\n');
    buffer.value = final ? '' : lines.pop() || '';
    lines.forEach(line => {
        if (line.trim())
            parseBuffer.value.push(line);
    });
};
const getModelOption = (key) => {
    return model_options.value.find(option => option.value === key) || {};
};
const fetchData = async () => {
    try {
        const { data: response } = await axios.post(`/application/groups/${group_id.value}/SingleData`, {
            dataset_id: dataset_id.value,
            data_id: data_id.value,
        });
        data.value = response;
    }
    catch (e) {
        ElMessage.error(e.message || '数据加载失败');
    }
};
const handleOpenLink = (url) => {
    if (!url) {
        ElMessage.warning('原文链接不存在');
        return;
    }
    const fullUrl = url.startsWith('http') ? url : `http://${url}`;
    window.open(fullUrl, '_blank');
};
const handleBack = () => {
    router.back();
};
const flushBuffer = () => {
    buffer.value = '';
    parseBuffer.value = [];
    inferenceResultRef.value?.flushBuffer?.();
};
const fetchAvailableModel = async () => {
    try {
        const { data: response } = await axios.post('/models', {
            dataset_id: dataset_id.value,
            group_id: group_id.value,
            task_type: task_type.value
        });
        model_options.value = response;
    }
    catch (e) {
        ElMessage.error(e.message || '模型列表加载失败');
    }
};
// 生命周期钩子
onMounted(() => {
    // 从路由获取参数
    const { group_id: gid, dataset_id: did, data_id: dId, dataset_type: dt, task_type: tt } = route.query;
    group_id.value = Array.isArray(gid) ? gid[0] : gid;
    dataset_id.value = Array.isArray(did) ? did[0] : did;
    data_id.value = Array.isArray(dId) ? dId[0] : dId;
    dataset_type.value = Array.isArray(dt) ? dt[0] : dt;
    task_type.value = Array.isArray(tt) ? tt[0] : tt;
    fetchData();
    fetchAvailableModel();
});
// 监听模型选择变化
watch(model_selected, (newVal) => {
    if (newVal !== null) {
        handleInference();
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['start-inference', 'el-button', 'inference_index', 'card_time', 'content', 'icon', 'text',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inference_index") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("index-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.handleBack) },
    ...{ class: ("back-button") },
});
const __VLS_0 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("icon") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_6 = {}.ArrowLeftBold;
/** @type { [typeof __VLS_components.ArrowLeftBold, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("text") },
});
if (__VLS_ctx.data?.detail_address) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!((__VLS_ctx.data?.detail_address)))
                    return;
                __VLS_ctx.handleOpenLink(__VLS_ctx.data.detail_address);
            } },
        ...{ class: ("card_url") },
    });
    const __VLS_12 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_18 = {}.Link;
    /** @type { [typeof __VLS_components.Link, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
    const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
}
if (__VLS_ctx.dataset_type == 'IMAGE') {
    // @ts-ignore
    /** @type { [typeof DataImageViewer, typeof DataImageViewer, ] } */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(DataImageViewer, new DataImageViewer({
        ...{ class: ("content") },
        data: ((__VLS_ctx.data)),
    }));
    const __VLS_25 = __VLS_24({
        ...{ class: ("content") },
        data: ((__VLS_ctx.data)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
}
else if (__VLS_ctx.dataset_type == 'INTERACTIVE_DIALOGUE') {
    // @ts-ignore
    /** @type { [typeof DialogueViewer, typeof DialogueViewer, ] } */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(DialogueViewer, new DialogueViewer({
        ...{ class: ("content") },
        session: ((__VLS_ctx.data)),
    }));
    const __VLS_30 = __VLS_29({
        ...{ class: ("content") },
        session: ((__VLS_ctx.data)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
}
else if (__VLS_ctx.dataset_type == 'PROPAGATION') {
    // @ts-ignore
    /** @type { [typeof PropagationViewer, typeof PropagationViewer, ] } */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(PropagationViewer, new PropagationViewer({
        ...{ class: ("content") },
        root: (({ id: __VLS_ctx.data?.id, content: __VLS_ctx.data?.content })),
        subtree: ((__VLS_ctx.data?.subtree)),
    }));
    const __VLS_35 = __VLS_34({
        ...{ class: ("content") },
        root: (({ id: __VLS_ctx.data?.id, content: __VLS_ctx.data?.content })),
        subtree: ((__VLS_ctx.data?.subtree)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
}
else if (__VLS_ctx.dataset_type == 'ILLEGAL_ACCOUNT_DETECTION') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: ("item-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("item-title") },
    });
    (__VLS_ctx.data?.name);
}
else if (__VLS_ctx.dataset_type == 'ACCOUNT_ROLE_RECOGNITION') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: ("item-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("item-title") },
    });
    (__VLS_ctx.data?.username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("item-meta-list") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("item-meta") },
    });
    const __VLS_39 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({}));
    const __VLS_41 = __VLS_40({}, ...__VLS_functionalComponentArgsRest(__VLS_40));
    const __VLS_45 = {}.User;
    /** @type { [typeof __VLS_components.User, ] } */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({}));
    const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
    __VLS_44.slots.default;
    var __VLS_44;
    (__VLS_ctx.data?.num_followers);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("item-meta") },
    });
    const __VLS_51 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({}));
    const __VLS_53 = __VLS_52({}, ...__VLS_functionalComponentArgsRest(__VLS_52));
    const __VLS_57 = {}.Document;
    /** @type { [typeof __VLS_components.Document, ] } */ ;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({}));
    const __VLS_59 = __VLS_58({}, ...__VLS_functionalComponentArgsRest(__VLS_58));
    __VLS_56.slots.default;
    var __VLS_56;
    (__VLS_ctx.data?.num_blogs);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content") },
    });
    if (__VLS_ctx.data?.title) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("content_title card_title title") },
        });
        (__VLS_ctx.data.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content_fields") },
    });
    if (__VLS_ctx.data?.source_station) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_station") },
        });
        const __VLS_63 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({}));
        const __VLS_65 = __VLS_64({}, ...__VLS_functionalComponentArgsRest(__VLS_64));
        const __VLS_69 = {}.Stopwatch;
        /** @type { [typeof __VLS_components.Stopwatch, ] } */ ;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({}));
        const __VLS_71 = __VLS_70({}, ...__VLS_functionalComponentArgsRest(__VLS_70));
        __VLS_68.slots.default;
        var __VLS_68;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.data.source_station);
    }
    if (__VLS_ctx.data?.author) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_author") },
        });
        const __VLS_75 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({}));
        const __VLS_77 = __VLS_76({}, ...__VLS_functionalComponentArgsRest(__VLS_76));
        const __VLS_81 = {}.Stopwatch;
        /** @type { [typeof __VLS_components.Stopwatch, ] } */ ;
        // @ts-ignore
        const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({}));
        const __VLS_83 = __VLS_82({}, ...__VLS_functionalComponentArgsRest(__VLS_82));
        __VLS_80.slots.default;
        var __VLS_80;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.data.author);
    }
    if (__VLS_ctx.data?.key_word) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_keyword") },
        });
        const __VLS_87 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({}));
        const __VLS_89 = __VLS_88({}, ...__VLS_functionalComponentArgsRest(__VLS_88));
        const __VLS_93 = {}.CollectionTag;
        /** @type { [typeof __VLS_components.CollectionTag, ] } */ ;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({}));
        const __VLS_95 = __VLS_94({}, ...__VLS_functionalComponentArgsRest(__VLS_94));
        __VLS_92.slots.default;
        var __VLS_92;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.data.key_word);
    }
    if (__VLS_ctx.data?.publish_time) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card_time") },
        });
        const __VLS_99 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({}));
        const __VLS_101 = __VLS_100({}, ...__VLS_functionalComponentArgsRest(__VLS_100));
        const __VLS_105 = {}.Clock;
        /** @type { [typeof __VLS_components.Clock, ] } */ ;
        // @ts-ignore
        const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({}));
        const __VLS_107 = __VLS_106({}, ...__VLS_functionalComponentArgsRest(__VLS_106));
        __VLS_104.slots.default;
        var __VLS_104;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.formatDateTime(__VLS_ctx.data.publish_time));
    }
    if (__VLS_ctx.data?.text) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("content_main") },
        });
        (__VLS_ctx.data.text);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("divider") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inference_box") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("inference-operation") },
});
const __VLS_111 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.model_selected)),
    placeholder: ("请选择使用的模型"),
    ...{ class: ("model-select") },
    disabled: ((__VLS_ctx.isLoading)),
}));
const __VLS_113 = __VLS_112({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.model_selected)),
    placeholder: ("请选择使用的模型"),
    ...{ class: ("model-select") },
    disabled: ((__VLS_ctx.isLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
let __VLS_117;
const __VLS_118 = {
    onChange: (__VLS_ctx.fetchResult)
};
let __VLS_114;
let __VLS_115;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.model_options))) {
    const __VLS_119 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
        key: ((item.value)),
        label: ((item.alias)),
        value: ((item.value)),
        disabled: ((item.status == 0)),
    }));
    const __VLS_121 = __VLS_120({
        key: ((item.value)),
        label: ((item.alias)),
        value: ((item.value)),
        disabled: ((item.status == 0)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
}
__VLS_116.slots.default;
var __VLS_116;
const __VLS_125 = {}.ElPopover;
/** @type { [typeof __VLS_components.ElPopover, typeof __VLS_components.elPopover, typeof __VLS_components.ElPopover, typeof __VLS_components.elPopover, ] } */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    placement: ("bottom"),
    trigger: ("hover"),
    width: ((280)),
    transition: ("el-zoom-in-top"),
    popperClass: ("model-desc-popper"),
}));
const __VLS_127 = __VLS_126({
    placement: ("bottom"),
    trigger: ("hover"),
    width: ((280)),
    transition: ("el-zoom-in-top"),
    popperClass: ("model-desc-popper"),
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
{
    const { reference: __VLS_thisSlot } = __VLS_130.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("model-tip-trigger") },
    });
    const __VLS_131 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
        ...{ class: ("tip-icon") },
    }));
    const __VLS_133 = __VLS_132({
        ...{ class: ("tip-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_132));
    const __VLS_137 = {}.QuestionFilled;
    /** @type { [typeof __VLS_components.QuestionFilled, ] } */ ;
    // @ts-ignore
    const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({}));
    const __VLS_139 = __VLS_138({}, ...__VLS_functionalComponentArgsRest(__VLS_138));
    if (__VLS_ctx.isLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("loading-indicator") },
        });
    }
    __VLS_136.slots.default;
    var __VLS_136;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-desc-content") },
});
if (__VLS_ctx.model_selected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("model-name") },
    });
    (__VLS_ctx.currentModelInfo.alias || '未知模型');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("desc-text") },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderDescription(__VLS_ctx.currentModelInfo.description)) }, null, null);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("empty-tip") },
    });
    const __VLS_143 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({}));
    const __VLS_145 = __VLS_144({}, ...__VLS_functionalComponentArgsRest(__VLS_144));
    const __VLS_149 = {}.InfoFilled;
    /** @type { [typeof __VLS_components.InfoFilled, ] } */ ;
    // @ts-ignore
    const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({}));
    const __VLS_151 = __VLS_150({}, ...__VLS_functionalComponentArgsRest(__VLS_150));
    __VLS_148.slots.default;
    var __VLS_148;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
__VLS_130.slots.default;
var __VLS_130;
const __VLS_155 = {}.ElTooltip;
/** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
    disabled: ((__VLS_ctx.model_selected && !__VLS_ctx.isLoading)),
    content: ("请先选择有效模型"),
    placement: ("bottom"),
}));
const __VLS_157 = __VLS_156({
    disabled: ((__VLS_ctx.model_selected && !__VLS_ctx.isLoading)),
    content: ("请先选择有效模型"),
    placement: ("bottom"),
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_161 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
    ...{ 'onClick': {} },
    ...{ class: ("start-inference") },
    type: ((__VLS_ctx.inference_content ? 'primary' : 'success')),
    disabled: ((!__VLS_ctx.model_selected || __VLS_ctx.isLoading)),
    loading: ((__VLS_ctx.isLoading)),
}));
const __VLS_163 = __VLS_162({
    ...{ 'onClick': {} },
    ...{ class: ("start-inference") },
    type: ((__VLS_ctx.inference_content ? 'primary' : 'success')),
    disabled: ((!__VLS_ctx.model_selected || __VLS_ctx.isLoading)),
    loading: ((__VLS_ctx.isLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_162));
let __VLS_167;
const __VLS_168 = {
    onClick: (__VLS_ctx.handleInference)
};
let __VLS_164;
let __VLS_165;
(__VLS_ctx.inference_content ? '重新推理' : '开始推理');
__VLS_166.slots.default;
var __VLS_166;
__VLS_160.slots.default;
var __VLS_160;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("pin-control") },
});
const __VLS_169 = {}.ElTooltip;
/** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
    content: ((__VLS_ctx.pinnedState ? '已置顶 — 点击取消置顶' : '置顶此条数据')),
    placement: ("bottom"),
}));
const __VLS_171 = __VLS_170({
    content: ((__VLS_ctx.pinnedState ? '已置顶 — 点击取消置顶' : '置顶此条数据')),
    placement: ("bottom"),
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
const __VLS_175 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
    ...{ 'onClick': {} },
    ...{ style: ({}) },
    disabled: ((__VLS_ctx.isLoading || __VLS_ctx.pinLoading)),
    loading: ((__VLS_ctx.pinLoading)),
    circle: (true),
    'aria-label': ("置顶此条数据"),
}));
const __VLS_177 = __VLS_176({
    ...{ 'onClick': {} },
    ...{ style: ({}) },
    disabled: ((__VLS_ctx.isLoading || __VLS_ctx.pinLoading)),
    loading: ((__VLS_ctx.pinLoading)),
    circle: (true),
    'aria-label': ("置顶此条数据"),
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
let __VLS_181;
const __VLS_182 = {
    onClick: (__VLS_ctx.togglePin)
};
let __VLS_178;
let __VLS_179;
if (!__VLS_ctx.pinnedState) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        t: ("1756705968573"),
        ...{ class: ("icon") },
        viewBox: ("0 0 1025 1024"),
        version: ("1.1"),
        xmlns: ("http://www.w3.org/2000/svg"),
        'p-id': ("11219"),
        width: ("24"),
        height: ("24"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: ("M51.196068 1024c-13.021992 0-26.0184-5.091113-36.021541-15.094254-18.113104-18.164271-20.262117-46.050265-5.091113-66.337966l213.059228-288.325828-166.983379-166.983379C39.862586 470.961896 36.639068 445.48075 48.305135 425.2698c7.982046-12.612656 76.699275-112.82315 229.483822-75.010766 2.532765 0.307002 5.270197 0.537253 8.212297 0.793088 6.267953 0.537253 13.277827 1.17684 20.87612 2.404847 32.33752 5.244614 89.516599-20.722619 139.148552-63.037697 47.559691-40.49865 78.285451-87.751339 78.285451-120.344693 0-7.57271-0.179084-15.631507-0.358169-23.536802-1.279174-30.623426-3.223519-77.697031 31.979351-112.874317 41.649907-41.701074 107.552953-45.05251 153.270633-7.854129 0.921005 0.741921 1.76526 1.535009 2.583932 2.379264l-0.025583 0c24.585725 24.048472 276.608594 275.815506 279.243692 278.476188 21.694792 21.694792 33.642277 50.527374 33.693444 81.176384 0.025583 30.674593-11.896319 59.456009-33.539943 81.099634-35.023785 35.049369-82.353225 33.053857-113.565071 31.723516-7.393626-0.153501-15.478006-0.332585-23.025133-0.332585-30.828094 0-67.69389 21.592458-103.715431 60.760767-50.808793 55.260318-82.09739 126.63823-79.411124 158.617581 1.125673 10.258976 3.223519 28.37208 3.607271 30.930428 36.891379 149.612195-63.114447 217.843339-74.627013 225.109047-20.697036 12.484739-46.357267 9.389137-63.012113-7.240125l-178.393611-178.393611c-10.003141-10.003141-10.003141-26.171901 0-36.175042s26.171901-10.003141 36.175042 0l178.393611 178.393611c7.854129-5.091113 80.101878-54.646315 51.320462-171.76749-0.51167-2.35368-3.044434-23.562386-4.374775-35.970374-4.298025-51.115795 35.586622-136.027367 92.688951-198.118475 32.439854-35.254036 83.27423-77.287695 141.348731-77.287695 7.905296 0 16.399011 0.179084 24.662475 0.358169 32.41427 1.355924 58.048918 0.972172 75.77827-16.782763 11.973069-11.973069 18.548024-27.885994 18.548024-44.847842-0.025583-17.013015-6.677288-33.00269-18.701524-45.05251C952.220677 340.23031 683.849964 72.243349 675.944668 64.645055c-24.278723-19.724864-60.7096-17.882853-83.785899 5.21903-17.908437 17.908437-18.317772 43.491917-17.013015 75.087516 0.204668 8.800717 0.383752 17.243266 0.383752 25.148562 0 48.378362-35.995957 107.936705-96.270638 159.282751-49.478452 42.135993-122.979792 83.811483-180.491457 74.60143-6.293536-1.023339-12.049819-1.509425-17.192099-1.944345-3.325852-0.281418-6.421454-0.562837-9.312387-0.921005-2.456014-0.07675-4.860861-0.537253-7.188958-1.304758-117.760762-29.037251-167.597382 43.44075-172.893163 51.806549l182.742803 182.026466c8.954218 8.954218 10.028724 23.101883 2.481598 33.309692L51.170485 973.114457l238.617125-174.530506c11.435816-8.365798 27.425491-5.80745 35.740123 5.602782s5.80745 27.399908-5.602782 35.714539l-238.821793 174.12117C72.148939 1020.699731 61.685295 1024 51.196068 1024z"),
        fill: ("#2c2c2c"),
        'p-id': ("11220"),
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        t: ("1756706110118"),
        ...{ class: ("icon") },
        viewBox: ("0 0 1025 1024"),
        version: ("1.1"),
        xmlns: ("http://www.w3.org/2000/svg"),
        'p-id': ("12149"),
        width: ("24"),
        height: ("24"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: ("M320 839.68l-238.592 174.08c-8.704 6.656-19.456 9.728-29.696 9.728-12.8 0-26.112-5.12-35.84-14.848-17.92-17.92-20.48-46.08-5.12-66.56l212.992-288.256L56.32 487.424C39.936 471.04 36.864 445.44 48.128 425.472c8.192-12.8 76.8-112.64 229.376-75.264 2.56 0.512 5.12 0.512 8.192 1.024 6.144 0.512 13.312 1.024 20.992 2.56 32.256 5.12 89.6-20.48 139.264-62.976 47.616-40.448 78.336-87.552 78.336-120.32 0-7.68 0-15.872-0.512-23.552-1.024-30.72-3.072-77.824 31.744-112.64 41.472-41.472 107.52-45.056 153.088-7.68 1.024 0.512 1.536 1.536 2.56 2.56 24.576 24.064 276.48 275.968 279.04 278.528 21.504 21.504 33.792 50.688 33.792 81.408s-11.776 59.392-33.792 80.896c-34.816 34.816-82.432 33.28-113.664 31.744-7.168 0-15.36-0.512-23.04-0.512-30.72 0-67.584 21.504-103.936 60.928-50.688 55.296-81.92 126.464-79.36 158.72 1.024 10.24 3.072 28.16 3.584 30.72 36.864 149.504-62.976 217.6-74.752 225.28-20.48 12.288-46.592 9.216-62.976-7.168l-165.376-165.376-50.688 35.328z"),
        'p-id': ("12150"),
        fill: ("#d81e06"),
    });
}
__VLS_180.slots.default;
var __VLS_180;
__VLS_174.slots.default;
var __VLS_174;
if (__VLS_ctx.model_selected != null) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("inference_result") },
    });
    if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'DeepSeek') {
        // @ts-ignore
        /** @type { [typeof chatCard, ] } */ ;
        // @ts-ignore
        const __VLS_183 = __VLS_asFunctionalComponent(chatCard, new chatCard({
            inferenceResult: ((__VLS_ctx.inference_content?.data || {})),
        }));
        const __VLS_184 = __VLS_183({
            inferenceResult: ((__VLS_ctx.inference_content?.data || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'Gleam') {
        // @ts-ignore
        /** @type { [typeof StepLLM, typeof StepLLM, ] } */ ;
        // @ts-ignore
        const __VLS_188 = __VLS_asFunctionalComponent(StepLLM, new StepLLM({
            buffer: ((__VLS_ctx.parseBuffer)),
            ref: ("inferenceResult"),
            inferenceResult: ((__VLS_ctx.inference_content?.data?.answer || [])),
        }));
        const __VLS_189 = __VLS_188({
            buffer: ((__VLS_ctx.parseBuffer)),
            ref: ("inferenceResult"),
            inferenceResult: ((__VLS_ctx.inference_content?.data?.answer || [])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_188));
        // @ts-ignore navigation for `const inferenceResult = ref()`
        /** @type { typeof __VLS_ctx.inferenceResult } */ ;
        var __VLS_193 = {};
        var __VLS_192;
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'ARG') {
        // @ts-ignore
        /** @type { [typeof ArgResultViewer, typeof ArgResultViewer, ] } */ ;
        // @ts-ignore
        const __VLS_194 = __VLS_asFunctionalComponent(ArgResultViewer, new ArgResultViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_195 = __VLS_194({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'PII') {
        // @ts-ignore
        /** @type { [typeof PIIResultViewer, typeof PIIResultViewer, ] } */ ;
        // @ts-ignore
        const __VLS_199 = __VLS_asFunctionalComponent(PIIResultViewer, new PIIResultViewer({
            originalText: ((__VLS_ctx.data.text)),
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_200 = __VLS_199({
            originalText: ((__VLS_ctx.data.text)),
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'ENDEF') {
        // @ts-ignore
        /** @type { [typeof ENDEFViewer, typeof ENDEFViewer, ] } */ ;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent(ENDEFViewer, new ENDEFViewer({
            data: ((__VLS_ctx.inference_content?.data?.[0] || {})),
        }));
        const __VLS_205 = __VLS_204({
            data: ((__VLS_ctx.inference_content?.data?.[0] || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_204));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'Lexicon') {
        // @ts-ignore
        /** @type { [typeof LexiconViewer, typeof LexiconViewer, ] } */ ;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent(LexiconViewer, new LexiconViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_210 = __VLS_209({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    }
    else if (__VLS_ctx.MODELS.LLM_REASONING.includes(__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'])) {
        // @ts-ignore
        /** @type { [typeof ClassifyLLMReasoningViewer, typeof ClassifyLLMReasoningViewer, ] } */ ;
        // @ts-ignore
        const __VLS_214 = __VLS_asFunctionalComponent(ClassifyLLMReasoningViewer, new ClassifyLLMReasoningViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_215 = __VLS_214({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_214));
    }
    else if (__VLS_ctx.MODELS.LLM_STANCE.includes(__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'])) {
        // @ts-ignore
        /** @type { [typeof StanceLLMViewer, typeof StanceLLMViewer, ] } */ ;
        // @ts-ignore
        const __VLS_219 = __VLS_asFunctionalComponent(StanceLLMViewer, new StanceLLMViewer({
            results: ((__VLS_ctx.inference_content || [])),
        }));
        const __VLS_220 = __VLS_219({
            results: ((__VLS_ctx.inference_content || [])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_219));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'muse') {
        // @ts-ignore
        /** @type { [typeof MUSEViewer, typeof MUSEViewer, ] } */ ;
        // @ts-ignore
        const __VLS_224 = __VLS_asFunctionalComponent(MUSEViewer, new MUSEViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_225 = __VLS_224({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_224));
    }
    else if (__VLS_ctx.MODELS.LLM_ILLEGAL.includes(__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'])) {
        // @ts-ignore
        /** @type { [typeof Illegal_LLM_Viewer, typeof Illegal_LLM_Viewer, ] } */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(Illegal_LLM_Viewer, new Illegal_LLM_Viewer({
            result: ((__VLS_ctx.inference_content || {})),
            labels: ((__VLS_ctx.inference_content?.labels || [])),
        }));
        const __VLS_230 = __VLS_229({
            result: ((__VLS_ctx.inference_content || {})),
            labels: ((__VLS_ctx.inference_content?.labels || [])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'] == 'vad') {
        // @ts-ignore
        /** @type { [typeof VADViewer, typeof VADViewer, ] } */ ;
        // @ts-ignore
        const __VLS_234 = __VLS_asFunctionalComponent(VADViewer, new VADViewer({
            results: ((__VLS_ctx.inference_content?.[0] || [])),
            utterances: ((__VLS_ctx.data?.context_utterances || [])),
            labels: ((['中性', '沮丧', '悲伤', '愤怒', '兴奋', '快乐', '未预测'])),
        }));
        const __VLS_235 = __VLS_234({
            results: ((__VLS_ctx.inference_content?.[0] || [])),
            utterances: ((__VLS_ctx.data?.context_utterances || [])),
            labels: ((['中性', '沮丧', '悲伤', '愤怒', '兴奋', '快乐', '未预测'])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_234));
    }
    else if (__VLS_ctx.MODELS.PROPA.includes(__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.['label'])) {
        // @ts-ignore
        /** @type { [typeof PropaViewer, typeof PropaViewer, ] } */ ;
        // @ts-ignore
        const __VLS_239 = __VLS_asFunctionalComponent(PropaViewer, new PropaViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_240 = __VLS_239({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_239));
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.label === 'user_role_recognition') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("result-userrole") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label-row") },
        });
        const __VLS_244 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
            ...{ class: ("label-icon") },
        }));
        const __VLS_246 = __VLS_245({
            ...{ class: ("label-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_245));
        const __VLS_250 = {}.User;
        /** @type { [typeof __VLS_components.User, ] } */ ;
        // @ts-ignore
        const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({}));
        const __VLS_252 = __VLS_251({}, ...__VLS_functionalComponentArgsRest(__VLS_251));
        __VLS_249.slots.default;
        var __VLS_249;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("label-title") },
        });
        const __VLS_256 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
            type: ((__VLS_ctx.roleTagType(__VLS_ctx.inference_content?.data))),
            effect: ("dark"),
            ...{ class: ("role-tag") },
        }));
        const __VLS_258 = __VLS_257({
            type: ((__VLS_ctx.roleTagType(__VLS_ctx.inference_content?.data))),
            effect: ("dark"),
            ...{ class: ("role-tag") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_257));
        (__VLS_ctx.inference_content?.data);
        __VLS_261.slots.default;
        var __VLS_261;
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.task_type === 'il_account_sub') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("result-userrole") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label-row") },
        });
        const __VLS_262 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
            ...{ class: ("label-icon") },
        }));
        const __VLS_264 = __VLS_263({
            ...{ class: ("label-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_263));
        const __VLS_268 = {}.User;
        /** @type { [typeof __VLS_components.User, ] } */ ;
        // @ts-ignore
        const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({}));
        const __VLS_270 = __VLS_269({}, ...__VLS_functionalComponentArgsRest(__VLS_269));
        __VLS_267.slots.default;
        var __VLS_267;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("label-title") },
        });
        const __VLS_274 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
            type: ((__VLS_ctx.illegalTagType(__VLS_ctx.inference_content?.data))),
            effect: ("dark"),
            ...{ class: ("role-tag") },
        }));
        const __VLS_276 = __VLS_275({
            type: ((__VLS_ctx.illegalTagType(__VLS_ctx.inference_content?.data))),
            effect: ("dark"),
            ...{ class: ("role-tag") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_275));
        (__VLS_ctx.inference_content?.data === undefined || __VLS_ctx.inference_content?.data === null
            ? '未预测'
            : (__VLS_ctx.inference_content.data == 0 ? '正常账号' : '违规账号'));
        __VLS_279.slots.default;
        var __VLS_279;
    }
    else if (__VLS_ctx.getModelOption(__VLS_ctx.model_selected)?.label === 'llm_12_class') {
        // @ts-ignore
        /** @type { [typeof LLM_12_classViewer, typeof LLM_12_classViewer, ] } */ ;
        // @ts-ignore
        const __VLS_280 = __VLS_asFunctionalComponent(LLM_12_classViewer, new LLM_12_classViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_281 = __VLS_280({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_280));
    }
    else {
        // @ts-ignore
        /** @type { [typeof OffensiveViewer, typeof OffensiveViewer, ] } */ ;
        // @ts-ignore
        const __VLS_285 = __VLS_asFunctionalComponent(OffensiveViewer, new OffensiveViewer({
            result: ((__VLS_ctx.inference_content || {})),
        }));
        const __VLS_286 = __VLS_285({
            result: ((__VLS_ctx.inference_content || {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    }
}
['container', 'inference_index', 'index-header', 'back-button', 'icon', 'text', 'card_url', 'content', 'content', 'content', 'content', 'item-header', 'item-title', 'content', 'item-header', 'item-title', 'item-meta-list', 'item-meta', 'item-meta', 'content', 'content_title', 'card_title', 'title', 'content_fields', 'card_station', 'card_author', 'card_keyword', 'card_time', 'content_main', 'divider', 'inference_box', 'inference-operation', 'model-select', 'model-tip-trigger', 'tip-icon', 'loading-indicator', 'model-desc-content', 'model-name', 'desc-text', 'empty-tip', 'start-inference', 'pin-control', 'icon', 'icon', 'inference_result', 'result-userrole', 'label-row', 'label-icon', 'label-title', 'role-tag', 'result-userrole', 'label-row', 'label-icon', 'label-title', 'role-tag',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatDateTime: formatDateTime,
            chatCard: chatCard,
            StepLLM: StepLLM,
            ArgResultViewer: ArgResultViewer,
            PIIResultViewer: PIIResultViewer,
            OffensiveViewer: OffensiveViewer,
            ENDEFViewer: ENDEFViewer,
            LexiconViewer: LexiconViewer,
            DataImageViewer: DataImageViewer,
            ClassifyLLMReasoningViewer: ClassifyLLMReasoningViewer,
            StanceLLMViewer: StanceLLMViewer,
            MUSEViewer: MUSEViewer,
            Illegal_LLM_Viewer: Illegal_LLM_Viewer,
            DialogueViewer: DialogueViewer,
            VADViewer: VADViewer,
            PropagationViewer: PropagationViewer,
            PropaViewer: PropaViewer,
            LLM_12_classViewer: LLM_12_classViewer,
            dataset_type: dataset_type,
            data: data,
            model_options: model_options,
            model_selected: model_selected,
            inference_content: inference_content,
            isLoading: isLoading,
            parseBuffer: parseBuffer,
            MODELS: MODELS,
            currentModelInfo: currentModelInfo,
            roleTagType: roleTagType,
            illegalTagType: illegalTagType,
            renderDescription: renderDescription,
            pinLoading: pinLoading,
            pinnedState: pinnedState,
            togglePin: togglePin,
            fetchResult: fetchResult,
            handleInference: handleInference,
            getModelOption: getModelOption,
            handleOpenLink: handleOpenLink,
            handleBack: handleBack,
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
