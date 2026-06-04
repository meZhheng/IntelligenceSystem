import { defineComponent } from 'vue';
import { formatDateTime } from '@/utils/date';
import axios from '@/api/axios';
import { Stopwatch, CollectionTag, Clock, } from '@element-plus/icons-vue';
import { ElLoading } from 'element-plus';
import chatCard from '@/components/InferenceResultCard/NormalLLM.vue';
import { useStore } from '@/store';
import { useRoute } from 'vue-router';
import dataListImage from '@/views/datasets/dataListImage.vue';
export default defineComponent({
    name: 'Overview',
    components: {
        Stopwatch,
        CollectionTag,
        Clock,
        chatCard,
        dataListImage,
    },
    data() {
        return {
            currentPage: 1,
            pageSize: 20,
            importBoxVisible: false,
            rel_data_id: 0,
            data_list: [],
            availableDatasets: [],
            datasetSelected: [],
            // 导入数据集相关变量
            datasetExcept: [],
            datasetSelectable: [],
            datasetToImport: [],
            datasetVisible: [],
            datasetType: [],
            store: useStore(),
            group: null,
            total_items: 0,
            savedScroll: 0, // 用来存储滚动位置
            taskType: {
                emotion: [
                    { name: 'dp_sentiment', alias: '单模态情感识别', subTasks: [
                            { name: 'dp_sentiment_dp', alias: '隐式情感识别', requireFields: ["text"] },
                            { name: 'dp_sentiment_as', alias: '方面级情感识别', requireFields: ["text"] }
                        ] },
                    { name: 'mm_sentiment', alias: '多模态情感识别', subTasks: [
                            { name: 'mm_sentiment_sub', alias: '多模态情感识别', requireFields: ["image_path", "text"] },
                        ] },
                    { name: 'ut_sentiment', alias: '交互式对话情感识别', subTasks: [
                            { name: 'ut_sentiment_sub', alias: '交互式对话情感识别', requireFields: ["context_utterances"] }
                        ] },
                ],
                illegal: [
                    { name: 'dt_illegal', alias: '涉X舆情数据抽取', subTasks: [
                            { name: 'dt_illegal_sub', alias: '涉X舆情数据抽取', requireFields: ["text"] }
                        ] },
                    { name: 'cl_illegal', alias: '涉X舆情细化标签分类', subTasks: [
                            { name: 'xb_illegal_sub', alias: '涉J性别歧视检测', requireFields: ["text"] },
                            { name: 'zz_illegal_sub', alias: '涉J政治言论检测', requireFields: ["text"] },
                            { name: 'jd_illegal_sub', alias: '涉“J贷”等网络借贷检测', requireFields: ["text"] },
                            { name: 'dw_illegal_sub', alias: '暴露涉J单位、人员信息检测', requireFields: ["text"] },
                            { name: 'mh_illegal_sub', alias: '抹黑丑化J队作风形象检测', requireFields: ["text"] },
                            { name: 'hl_illegal_sub', alias: '涉J婚恋纠纷、征婚交友检测', requireFields: ["text"] },
                            { name: 'yy_illegal_sub', alias: '涉J谣言检测', requireFields: ["text"] },
                            { name: 'xw_illegal_sub', alias: '历史虚无主义检测', requireFields: ["text"] },
                            { name: 'bz_illegal_sub', alias: '泄露J调整组建、编制部署检测', requireFields: ["text"] },
                            { name: 'wq_illegal_sub', alias: '泄露高新武器装备动态检测', requireFields: ["text"] },
                            { name: 'wb_illegal_sub', alias: '涉J网络暴力', requireFields: ["text"] },
                            { name: 'fb_illegal_sub', alias: '煽动J地对立、夸大渲染J队腐败矛盾', requireFields: ["text"] },
                        ] },
                    { name: 'wf_illegal', alias: '风险内容检测', subTasks: [
                            { name: 'pg_illegal', alias: '基于社交传播的风险内容检测', requireFields: ["propagation"] },
                            { name: 'lm_illegal', alias: '基于大语言模型的风险内容检测', requireFields: ["text"] },
                            { name: 'kn_illegal', alias: '基于知识库的风险内容检测', requireFields: ["text"] },
                            { name: 'mm_illegal', alias: '基于多模态的风险内容检测', requireFields: ["image_path", "text"] },
                            { name: 'fs_illegal', alias: '跨域小样本风险内容检测', requireFields: ["propagation"] },
                            { name: 'zs_illegal', alias: '跨域零样本风险内容检测', requireFields: ["propagation"] },
                        ] }
                ], stance: [
                    { name: 'su_stance', alias: '有监督用户立场检测', subTasks: [
                            { name: 'su_stance_sub', alias: '有监督用户立场检测', requireFields: ["text", "target", "key_word"] }
                        ] },
                    { name: 'fs_stance', alias: '跨域小样本用户立场检测', subTasks: [
                            { name: 'fs_stance_sub', alias: '跨域小样本用户立场检测', requireFields: ["text", "target", "key_word"] }
                        ] },
                    { name: 'zs_stance', alias: '跨域零样本用户立场检测', subTasks: [
                            { name: 'zs_stance_sub', alias: '跨域零样本用户立场检测', requireFields: ["text", "target", "key_word"] }
                        ] },
                    { name: 'at_stance', alias: '目标自识别立场检测', subTasks: [
                            { name: 'at_stance_sub', alias: '目标自识别立场检测', requireFields: ["text"] }
                        ] },
                ],
                account: [
                    { name: 'il_account', alias: '违法违规账号发现', subTasks: [
                            { name: 'il_account_sub', alias: '违法违规账号发现', requireFields: ["name"] }
                        ] },
                    { name: 'ro_account', alias: '账号角色识别', subTasks: [
                            { name: 'ro_account_sub', alias: '账号角色识别', requireFields: ["username"] }
                        ] },
                ]
            },
            mm_type: ['mm_sentiment', 'mm_illegal'],
            pp_type: ['pg_illegal', 'fs_illegal', 'zs_illegal'],
            ut_type: ['ut_sentiment'],
            task_type_selected: null,
            sub_task_type_selected: null,
            dataset_type_selected: null,
        };
    },
    watch: {
        group: {
            handler(newVal, oldVal) {
                // 如果 oldVal 不为空（表示确实是一次“切换”），先刷新整页
                if (oldVal) {
                    // 刷新当前页，相当于浏览器执行 F5
                    window.location.reload();
                    // 下面的赋值不会执行，因为页面已经刷新了，
                    // 若你有特殊需求，可将赋值逻辑移到刷新后初始化时执行
                    return;
                }
                // 第一次进来 oldVal 为 undefined，这里跳过刷新，给初始值
                if (newVal) {
                    if (newVal.task_type == 'emotion') {
                        this.task_type_selected = this.taskType?.[newVal.task_type]?.[0];
                    }
                    else if (newVal.task_type == 'stance') {
                        this.task_type_selected = this.taskType?.[newVal.task_type]?.[3];
                    }
                    else if (newVal.task_type == 'illegal') {
                        this.task_type_selected = this.taskType?.[newVal.task_type]?.[1];
                    }
                    else if (newVal.task_type == 'account') {
                        this.task_type_selected = this.taskType?.[newVal.task_type]?.[0];
                    }
                }
            },
            deep: true
        },
        task_type_selected(task_type) {
            if (this.group.task_type == 'emotion') {
                this.sub_task_type_selected = task_type?.subTasks?.[1];
            }
            else if (this.group.task_type == 'stance') {
                this.sub_task_type_selected = task_type?.subTasks?.[0];
            }
            else if (this.group.task_type == 'illegal') {
                this.sub_task_type_selected = task_type?.subTasks?.[0];
            }
            else if (this.group.task_type == 'account') {
                this.sub_task_type_selected = task_type?.subTasks?.[0];
            }
        },
        sub_task_type_selected(sub_task_type) {
            this.fetchDatasetByTaskType(sub_task_type);
        },
        dataset_type_selected(dataset_type) {
            this.datasetSelected = [];
            this.datasetVisible = this.availableDatasets?.[dataset_type?.name] || [];
            // this.datasetVisible?.forEach(item => {
            //     this.datasetSelected.push(item.value)
            // })
            if (this.group.task_type == 'emotion') {
                this.datasetSelected.push(this.datasetVisible[0].value);
            }
            else if (this.group.task_type == 'stance') {
                this.datasetSelected.push(this.datasetVisible[0].value);
            }
            else if (this.group.task_type == 'illegal') {
                this.datasetSelected.push(this.datasetVisible[2].value);
            }
            else if (this.group.task_type == 'account') {
                this.datasetSelected.push(this.datasetVisible[0].value);
            }
        },
        datasetSelected: {
            handler(newVal) {
                if (newVal.length > 0) {
                    this.initialize();
                    this.fetchGroupData();
                }
            },
            deep: true // 深度监听数组内容变化
        }
    },
    methods: {
        formatDateTime,
        // selectDataset(dataset) {
        //     if (this.datasetSelected.includes(dataset)) {
        //         // 如果已经选中，这次操作要取消选中
        //         if (this.datasetSelected.length === 1) {
        //             // 只能留一个，不能取消最后一个
        //             this.$message.error('请至少选择一个数据集')
        //             return
        //         }
        //         // 真正执行移除
        //         this.datasetSelected = this.datasetSelected.filter(item => item !== dataset)
        //     } else {
        //         // 如果当前未选中，则添加
        //         this.datasetSelected.push(dataset)
        //     }
        // },
        selectDataset(dataset) {
            this.datasetSelected = [dataset]; // 直接替换为单元素数组
        },
        toggleTaskType(task_type) {
            this.task_type_selected = task_type;
        },
        toggleSubTaskType(sub_task_type) {
            this.sub_task_type_selected = sub_task_type;
        },
        toggleDatasetType(dataset_type) {
            this.dataset_type_selected = dataset_type;
        },
        async fetchAvaiableDataset() {
            const link = `/application/groups/${this.group.id}/AvaiableDataset`;
            axios.get(link).then((response) => {
                this.datasetSelectable = response.data.datasets;
                this.datasetExcept = response.data.except;
            }).catch((e) => {
                this.$message.error(e);
            });
        },
        handleImportClose() {
            this.importBoxVisible = false;
        },
        async handleImportSummit() {
            const link = `/application/groups/${this.group.id}/ImportDataset`;
            const payload = {
                dataset_ids: this.datasetToImport
            };
            const loadingImport = ElLoading.service({
                target: '#importDatasetBox',
                text: '导入中，请稍候...',
            });
            axios.post(link, payload).then((response) => {
                this.$message.success(response.data.message);
                this.fetchAvaiableDataset();
                this.initialize();
                this.fetchGroupData();
                this.importBoxVisible = false;
            }).catch((e) => {
                this.$message.error(e);
            }).finally(() => {
                loadingImport.close();
            });
        },
        importDataset() {
            this.importBoxVisible = true;
        },
        select_data(dataset_id, rel_data_id) {
            this.$router.push({
                name: 'InferenceIndex',
                query: {
                    group_id: this.group.id,
                    dataset_id: dataset_id,
                    data_id: rel_data_id,
                    isDefault: this.group.default,
                    dataset_type: this.dataset_type_selected?.name,
                    task_type: this.sub_task_type_selected?.name,
                }
            });
        },
        async fetchDatasetByTaskType(task_type) {
            const link = `/application/groups/${this.group.id}/data/task_type`;
            const payload = {
                task_type: task_type?.name,
                require_fields: task_type?.requireFields,
            };
            axios.post(link, payload, { timeout: 600000 }).then((response) => {
                this.availableDatasets = response.data.datasets_by_type;
                this.datasetType = response.data.dataset_types;
                if (this.group.task_type == 'emotion') {
                    this.dataset_type_selected = this.datasetType?.find(d => d.name === 'SOCIAL') || null;
                }
                else if (this.group.task_type == 'stance') {
                    this.dataset_type_selected = this.datasetType?.find(d => d.name === 'SOCIAL') || null;
                }
                else if (this.group.task_type == 'illegal') {
                    this.dataset_type_selected = this.datasetType?.find(d => d.name === 'SOCIAL') || null;
                }
                else if (this.group.task_type == 'account') {
                    this.dataset_type_selected = this.datasetType?.find(d => d.name === 'ILLEGAL_ACCOUNT_DETECTION' || d.name === 'ACCOUNT_ROLE_RECOGNITION') || null;
                }
            });
        },
        async fetchGroupData() {
            const link = `/application/groups/${this.group.id}/data?page=${this.currentPage}&per_page=${this.pageSize}`;
            const payload = {
                dataset_ids: this.datasetSelected,
                dataset_type: this.dataset_type_selected?.name,
            };
            const loadingData = ElLoading.service({
                lock: true,
                text: '加载中，请稍候...',
                background: 'rgba(0, 0, 0, 0.5)'
            });
            axios.post(link, payload, { timeout: 600000 }).then((response) => {
                this.data_list = response.data.items;
                this.total_items = response.data._meta.total_items;
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                loadingData.close();
            });
        },
        handlePaginationChange() {
            this.fetchGroupData();
        },
        async fetchGroupInfo(groupId) {
            const link = `/application/groups/${groupId}`;
            axios.post(link).then((response) => {
                this.group = response.data;
                this.fetchAvaiableDataset();
            }).catch((error) => {
                console.error(error);
            });
        },
        onScroll() {
            // 每次滚动都记录位置
            this.savedScroll = this.$refs.scrollContainer.scrollTop;
        },
        bindScroll() {
            const el = this.$refs.scrollContainer;
            if (el)
                el.addEventListener('scroll', this.onScroll);
        },
        unbindScroll() {
            const el = this.$refs.scrollContainer;
            if (el)
                el.removeEventListener('scroll', this.onScroll);
        },
        initialize() {
            this.data_list = [];
            this.total_items = 0;
            this.currentPage = 1;
        },
    },
    mounted() {
        const route = useRoute();
        const groupId = Number(route.params.groupId);
        this.fetchGroupInfo(groupId);
        // 组件首次渲染时，绑定滚动事件
        this.bindScroll();
    },
    beforeUnmount() {
        // 组件彻底销毁时解绑
        this.unbindScroll();
    },
    beforeRouteUpdate(to, from, next) {
        // 重新加载
        this.data_list = [];
        const groupId = Number(to.params.groupId);
        this.fetchGroupInfo(groupId);
        // 一定要调用 next()
        next();
    },
    // keep-alive 缓存时触发
    deactivated() {
        // 在停用前解绑，避免内存泄露
        this.unbindScroll();
    },
    // keep-alive 恢复时触发
    activated() {
        this.$nextTick(() => {
            const el = this.$refs.scrollContainer;
            if (el) {
                // 恢复上次记录的滚动位置
                el.scrollTop = this.savedScroll;
                // 再次绑定滚动监听
                this.bindScroll();
            }
        });
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
const __VLS_componentsOption = {
    Stopwatch,
    CollectionTag,
    Clock,
    chatCard,
    dataListImage,
};
let __VLS_components;
let __VLS_directives;
['item-images', 'card', 'dataset-selector', 'session-item', 'utterance-badge', 'dataset-badge', 'dataset-badge', 'dataset-badge', 'dataset-badge', 'disabled', 'data-list', 'data-item',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("dataset-detail") },
    ref: ("scrollContainer"),
});
// @ts-ignore navigation for `const scrollContainer = ref()`
/** @type { typeof __VLS_ctx.scrollContainer } */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("dataset-selector card") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("selector-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: ("section-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("datasets-list") },
});
for (const [type] of __VLS_getVForSourceType((__VLS_ctx.taskType?.[__VLS_ctx.group?.task_type] || []))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleTaskType(type);
            } },
        key: ((type.name)),
        ...{ class: ("dataset-badge") },
        ...{ class: (({ 'active': __VLS_ctx.task_type_selected?.name === type.name })) },
        tabindex: ("0"),
    });
    (type.alias);
}
if (__VLS_ctx.task_type_selected?.subTasks) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("selector-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("section-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("datasets-list") },
    });
    for (const [type] of __VLS_getVForSourceType((__VLS_ctx.task_type_selected?.subTasks || []))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.task_type_selected?.subTasks)))
                        return;
                    __VLS_ctx.toggleSubTaskType(type);
                } },
            key: ((type.name)),
            ...{ class: ("dataset-badge") },
            ...{ class: (({ 'active': __VLS_ctx.sub_task_type_selected?.name === type.name })) },
            tabindex: ("0"),
        });
        (type.alias);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("selector-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: ("section-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("datasets-list") },
});
for (const [type] of __VLS_getVForSourceType((__VLS_ctx.datasetType || []))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleDatasetType(type);
            } },
        key: ((type.name)),
        ...{ class: ("dataset-badge") },
        ...{ class: (({ 'active': __VLS_ctx.dataset_type_selected?.name === type.name })) },
        tabindex: ("0"),
    });
    (type.alias);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("selector-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: ("section-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("datasets-list") },
});
for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasetVisible || []))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectDataset(dataset.value);
            } },
        key: ((dataset.value)),
        ...{ class: ("dataset-badge") },
        ...{ class: (({ 'active': __VLS_ctx.datasetSelected?.includes(dataset.value) })) },
    });
    (dataset.label);
}
if (!__VLS_ctx.group?.default || __VLS_ctx.store.state.user_perms === 'administrator') {
    const __VLS_0 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.importDataset)
    };
    let __VLS_3;
    let __VLS_4;
    __VLS_5.slots.default;
    var __VLS_5;
}
if (__VLS_ctx.dataset_type_selected?.name == 'IMAGE') {
    const __VLS_8 = {}.dataListImage;
    /** @type { [typeof __VLS_components.DataListImage, typeof __VLS_components.dataListImage, typeof __VLS_components.DataListImage, typeof __VLS_components.dataListImage, ] } */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        data_list: ((__VLS_ctx.data_list)),
        group_id: ((__VLS_ctx.group.id)),
        task_type: ((__VLS_ctx.sub_task_type_selected?.name)),
    }));
    const __VLS_10 = __VLS_9({
        data_list: ((__VLS_ctx.data_list)),
        group_id: ((__VLS_ctx.group.id)),
        task_type: ((__VLS_ctx.sub_task_type_selected?.name)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
else if (__VLS_ctx.dataset_type_selected?.name == 'INTERACTIVE_DIALOGUE') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("data-list") },
    });
    for (const [session] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
        const __VLS_14 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
            ...{ 'onClick': {} },
            key: ((session.session_code)),
            ...{ class: ("session-item card") },
            shadow: ("hover"),
        }));
        const __VLS_16 = __VLS_15({
            ...{ 'onClick': {} },
            key: ((session.session_code)),
            ...{ class: ("session-item card") },
            shadow: ("hover"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
        let __VLS_20;
        const __VLS_21 = {
            onClick: (...[$event]) => {
                if (!(!((__VLS_ctx.dataset_type_selected?.name == 'IMAGE'))))
                    return;
                if (!((__VLS_ctx.dataset_type_selected?.name == 'INTERACTIVE_DIALOGUE')))
                    return;
                __VLS_ctx.select_data(session.dataset_id, session.id);
            }
        };
        let __VLS_17;
        let __VLS_18;
        {
            const { header: __VLS_thisSlot } = __VLS_19.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("session-header") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("session-title") },
            });
            (session.context_utterances[0]);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("utterance-preview") },
        });
        for (const [utt, idx] of __VLS_getVForSourceType((session.context_utterances.slice(0, 5)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: ((idx)),
                ...{ class: ("utterance-badge") },
            });
            (utt);
        }
        if (session.utterance_ids.length > 5) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("more-count") },
            });
            (session.utterance_ids.length);
        }
        __VLS_19.slots.default;
        var __VLS_19;
    }
}
else if (__VLS_ctx.dataset_type_selected?.name == 'PROPAGATION') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("data-list propagation-list") },
    });
    for (const [comment] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((comment.id)),
        });
        const __VLS_22 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
            ...{ 'onClick': {} },
            ...{ class: ("comment-card") },
            shadow: ("hover"),
        }));
        const __VLS_24 = __VLS_23({
            ...{ 'onClick': {} },
            ...{ class: ("comment-card") },
            shadow: ("hover"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_23));
        let __VLS_28;
        const __VLS_29 = {
            onClick: (...[$event]) => {
                if (!(!((__VLS_ctx.dataset_type_selected?.name == 'IMAGE'))))
                    return;
                if (!(!((__VLS_ctx.dataset_type_selected?.name == 'INTERACTIVE_DIALOGUE'))))
                    return;
                if (!((__VLS_ctx.dataset_type_selected?.name == 'PROPAGATION')))
                    return;
                __VLS_ctx.select_data(comment.dataset_id, comment.id);
            }
        };
        let __VLS_25;
        let __VLS_26;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-content") },
        });
        (comment.content);
        __VLS_27.slots.default;
        var __VLS_27;
    }
}
else if (__VLS_ctx.dataset_type_selected?.name == 'ILLEGAL_ACCOUNT_DETECTION') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("data-list") },
    });
    for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'IMAGE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'INTERACTIVE_DIALOGUE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'PROPAGATION'))))
                        return;
                    if (!((__VLS_ctx.dataset_type_selected?.name == 'ILLEGAL_ACCOUNT_DETECTION')))
                        return;
                    __VLS_ctx.select_data(item.dataset_id, item.id);
                } },
            key: ((idx)),
            ...{ class: ("data-item card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
            ...{ class: ("item-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("item-title") },
        });
        (item.name);
    }
}
else if (__VLS_ctx.dataset_type_selected?.name == 'ACCOUNT_ROLE_RECOGNITION') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("data-list") },
    });
    for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'IMAGE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'INTERACTIVE_DIALOGUE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'PROPAGATION'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'ILLEGAL_ACCOUNT_DETECTION'))))
                        return;
                    if (!((__VLS_ctx.dataset_type_selected?.name == 'ACCOUNT_ROLE_RECOGNITION')))
                        return;
                    __VLS_ctx.select_data(item.dataset_id, item.id);
                } },
            key: ((idx)),
            ...{ class: ("data-item card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
            ...{ class: ("item-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("item-title") },
        });
        (item.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("item-meta-list") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("item-meta") },
        });
        const __VLS_30 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({}));
        const __VLS_32 = __VLS_31({}, ...__VLS_functionalComponentArgsRest(__VLS_31));
        const __VLS_36 = {}.User;
        /** @type { [typeof __VLS_components.User, ] } */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
        const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_35.slots.default;
        var __VLS_35;
        (item.num_followers);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("item-meta") },
        });
        const __VLS_42 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({}));
        const __VLS_44 = __VLS_43({}, ...__VLS_functionalComponentArgsRest(__VLS_43));
        const __VLS_48 = {}.Document;
        /** @type { [typeof __VLS_components.Document, ] } */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
        const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_47.slots.default;
        var __VLS_47;
        (item.num_blogs);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("data-list") },
    });
    for (const [data, idx] of __VLS_getVForSourceType((__VLS_ctx.data_list))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'IMAGE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'INTERACTIVE_DIALOGUE'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'PROPAGATION'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'ILLEGAL_ACCOUNT_DETECTION'))))
                        return;
                    if (!(!((__VLS_ctx.dataset_type_selected?.name == 'ACCOUNT_ROLE_RECOGNITION'))))
                        return;
                    __VLS_ctx.select_data(data.dataset_id, data.id);
                } },
            key: ((idx)),
            ...{ class: ("data-item card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
            ...{ class: ("item-header") },
        });
        if (data.title) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
                ...{ class: ("item-title") },
            });
            (data.title);
        }
        if (data.publish_time) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({
                ...{ class: ("item-time") },
            });
            (__VLS_ctx.formatDateTime(data.publish_time));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("item-content") },
        });
        (data.text);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
            ...{ class: ("item-footer") },
        });
        if (data.author) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("footer-info") },
            });
            const __VLS_54 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({}));
            const __VLS_56 = __VLS_55({}, ...__VLS_functionalComponentArgsRest(__VLS_55));
            const __VLS_60 = {}.Stopwatch;
            /** @type { [typeof __VLS_components.Stopwatch, ] } */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
            const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
            __VLS_59.slots.default;
            var __VLS_59;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (data.author);
        }
        if (data.key_word) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("footer-info") },
            });
            const __VLS_66 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({}));
            const __VLS_68 = __VLS_67({}, ...__VLS_functionalComponentArgsRest(__VLS_67));
            const __VLS_72 = {}.CollectionTag;
            /** @type { [typeof __VLS_components.CollectionTag, ] } */ ;
            // @ts-ignore
            const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
            const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
            __VLS_71.slots.default;
            var __VLS_71;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (data.key_word);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: ("detail-footer") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("total-count") },
});
(__VLS_ctx.total_items);
const __VLS_78 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([20, 30, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total_items)),
}));
const __VLS_80 = __VLS_79({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([20, 30, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total_items)),
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
let __VLS_84;
const __VLS_85 = {
    onChange: (__VLS_ctx.handlePaginationChange)
};
let __VLS_81;
let __VLS_82;
var __VLS_83;
const __VLS_86 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
    modelValue: ((__VLS_ctx.importBoxVisible)),
    labelWidth: ("auto"),
    closeOnClickModal: ((false)),
    width: ("480px"),
    id: ("importDatasetBox"),
}));
const __VLS_88 = __VLS_87({
    modelValue: ((__VLS_ctx.importBoxVisible)),
    labelWidth: ("auto"),
    closeOnClickModal: ((false)),
    width: ("480px"),
    id: ("importDatasetBox"),
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
{
    const { header: __VLS_thisSlot } = __VLS_91.slots;
    const [{ titleId, titleClass }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("title") },
        ...{ style: ({}) },
        id: ((titleId)),
        ...{ class: ((titleClass)) },
    });
}
const __VLS_92 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    modelValue: ((__VLS_ctx.datasetToImport)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择导入的数据集"),
    popperClass: ("custom-header"),
    ...{ style: ({}) },
}));
const __VLS_94 = __VLS_93({
    modelValue: ((__VLS_ctx.datasetToImport)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    placeholder: ("请选择导入的数据集"),
    popperClass: ("custom-header"),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.datasetSelectable))) {
    const __VLS_98 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
        disabled: ((__VLS_ctx.datasetExcept.includes(item.value))),
    }));
    const __VLS_100 = __VLS_99({
        key: ((item.value)),
        label: ((item.label)),
        value: ((item.value)),
        disabled: ((__VLS_ctx.datasetExcept.includes(item.value))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_99));
}
__VLS_97.slots.default;
var __VLS_97;
{
    const { footer: __VLS_thisSlot } = __VLS_91.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    const __VLS_104 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onClick': {} },
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_110;
    const __VLS_111 = {
        onClick: (__VLS_ctx.handleImportClose)
    };
    let __VLS_107;
    let __VLS_108;
    __VLS_109.slots.default;
    var __VLS_109;
    const __VLS_112 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_118;
    const __VLS_119 = {
        onClick: (__VLS_ctx.handleImportSummit)
    };
    let __VLS_115;
    let __VLS_116;
    __VLS_117.slots.default;
    var __VLS_117;
}
__VLS_91.slots.default;
var __VLS_91;
['dataset-detail', 'dataset-selector', 'card', 'selector-row', 'section-title', 'datasets-list', 'dataset-badge', 'active', 'selector-row', 'section-title', 'datasets-list', 'dataset-badge', 'active', 'selector-row', 'section-title', 'datasets-list', 'dataset-badge', 'active', 'selector-row', 'section-title', 'datasets-list', 'dataset-badge', 'active', 'data-list', 'session-item', 'card', 'session-header', 'session-title', 'utterance-preview', 'utterance-badge', 'more-count', 'data-list', 'propagation-list', 'comment-card', 'card-content', 'data-list', 'data-item', 'card', 'item-header', 'item-title', 'data-list', 'data-item', 'card', 'item-header', 'item-title', 'item-meta-list', 'item-meta', 'item-meta', 'data-list', 'data-item', 'card', 'item-header', 'item-title', 'item-time', 'item-content', 'item-footer', 'footer-info', 'footer-info', 'detail-footer', 'total-count', 'title', 'dialog-footer',];
var __VLS_special;
let __VLS_self;
