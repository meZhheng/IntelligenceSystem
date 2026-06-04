import { formatDateTime } from '@/utils/date';
import axios from '@/api/axios';
import createModelForm from './createModelForm.vue';
export default (await import('vue')).defineComponent({
    name: 'ModelSpace',
    components: {
        createModelForm,
    },
    data() {
        return {
            modelList: [],
            currentPage: 1,
            pageSize: 20,
            total_models: 0,
            createModelVisible: false,
            used: 0,
            balance: 0,
        };
    },
    mounted() {
        this.fetchModels();
    },
    methods: {
        formatDateTime,
        async fetchModels() {
            const per_page = this.pageSize - 1;
            const link = `/models?page=${this.currentPage}&per_page=${per_page}`;
            axios.get(link).then((response) => {
                this.modelList = response.data.items;
                this.total_models = parseInt(response.data._meta.total_items);
                this.fetchLimit();
            }).catch((error) => {
                console.log(error);
            });
        },
        handlePaginationChange() {
            this.fetchModels();
        },
        fetchLimit() {
            const link = `/models/limit`;
            axios.get(link).then((response) => {
                this.used = parseInt(response.data.used);
                this.balance = parseInt(response.data.balance);
            }).catch((error) => {
                console.log(error);
            });
        },
        formatParamSize(size) {
            if (size >= 1024 ** 3)
                return `${(size / (1024 ** 3)).toFixed(1)}GB`;
            if (size >= 1024 ** 2)
                return `${(size / (1024 ** 2)).toFixed(1)}MB`;
            if (size >= 1024)
                return `${(size / 1024).toFixed(1)}KB`;
            return `${size}Bytes`;
        },
        handleModelClick(model_id) {
            // 生成路由 URL，假设模型的 id 存在于 model.id
            const route = this.$router.resolve({
                name: 'ModelDetail',
                params: { model_id: model_id }
            });
            // 在新窗口打开目标 URL
            window.open(route.href, '_blank');
        }
    }
});
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
const __VLS_componentsOption = {
    createModelForm,
};
let __VLS_components;
let __VLS_directives;
['create-content', 'normal-card', 'el-icon', 'container', 'container', 'container', 'container', 'container', 'container', 'container', 'container-header', 'container-header', 'title', 'container-header', 'space-header', 'model-space', 'model-card', 'model-name', 'create-card',];
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("reamin-space") },
});
(__VLS_ctx.formatParamSize(__VLS_ctx.used));
(__VLS_ctx.formatParamSize(__VLS_ctx.balance));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("space-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("total-models") },
});
(__VLS_ctx.total_models);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("model-space") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.createModelVisible = true;
        } },
    ...{ class: ("model-card create-card disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("create-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("create-icon") },
});
const __VLS_0 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_6 = {}.Plus;
/** @type { [typeof __VLS_components.Plus, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
for (const [model, index] of __VLS_getVForSourceType((__VLS_ctx.modelList))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleModelClick(model.value);
            } },
        ...{ class: ("model-card normal-card") },
        key: ((index)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("model-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("model-name") },
    });
    (model.base_model.alias);
    (model.author);
    (model.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("shared-label") },
        ...{ class: (({ 'shared-public': model.shared, 'shared-private': !model.shared })) },
    });
    (model.shared ? '公共模型' : '私有模型');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("model-details") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    const __VLS_12 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_18 = {}.User;
    /** @type { [typeof __VLS_components.User, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
    const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("author") },
    });
    (model.author);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    const __VLS_24 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_30 = {}.Clock;
    /** @type { [typeof __VLS_components.Clock, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({}));
    const __VLS_32 = __VLS_31({}, ...__VLS_functionalComponentArgsRest(__VLS_31));
    __VLS_29.slots.default;
    var __VLS_29;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("update-time") },
    });
    (__VLS_ctx.formatDateTime(model.updated_at));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    const __VLS_36 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
    const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
    const __VLS_42 = {}.CollectionTag;
    /** @type { [typeof __VLS_components.CollectionTag, ] } */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({}));
    const __VLS_44 = __VLS_43({}, ...__VLS_functionalComponentArgsRest(__VLS_43));
    __VLS_41.slots.default;
    var __VLS_41;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("task-type") },
    });
    (model.base_model.task_type);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    const __VLS_48 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
    const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const __VLS_54 = {}.DataBoard;
    /** @type { [typeof __VLS_components.DataBoard, ] } */ ;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({}));
    const __VLS_56 = __VLS_55({}, ...__VLS_functionalComponentArgsRest(__VLS_55));
    __VLS_53.slots.default;
    var __VLS_53;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("param-size") },
    });
    (__VLS_ctx.formatParamSize(model.size));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container-footer") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("pagination-block") },
});
const __VLS_60 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([20, 30, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total_models)),
}));
const __VLS_62 = __VLS_61({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([20, 30, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total_models)),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
let __VLS_66;
const __VLS_67 = {
    onChange: (__VLS_ctx.handlePaginationChange)
};
let __VLS_63;
let __VLS_64;
var __VLS_65;
if (__VLS_ctx.createModelVisible) {
    const __VLS_68 = {}.createModelForm;
    /** @type { [typeof __VLS_components.CreateModelForm, typeof __VLS_components.createModelForm, ] } */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        ...{ 'onRefreshModels': {} },
        modelValue: ((__VLS_ctx.createModelVisible)),
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onRefreshModels': {} },
        modelValue: ((__VLS_ctx.createModelVisible)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_74;
    const __VLS_75 = {
        onRefreshModels: (__VLS_ctx.fetchModels)
    };
    let __VLS_71;
    let __VLS_72;
    var __VLS_73;
}
['container', 'container-header', 'title', 'reamin-space', 'space-header', 'total-models', 'model-space', 'model-card', 'create-card', 'disable-select', 'create-content', 'create-icon', 'model-card', 'normal-card', 'model-header', 'model-name', 'shared-label', 'shared-public', 'shared-private', 'model-details', 'detail-item', 'author', 'detail-item', 'update-time', 'detail-item', 'task-type', 'detail-item', 'param-size', 'container-footer', 'pagination-block',];
var __VLS_special;
let __VLS_self;
