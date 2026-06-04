import axios from '@/api/axios';
import { formatDateTime } from '@/utils/date';
import { useRoute } from 'vue-router';
export default (await import('vue')).defineComponent({
    name: 'datasetSpace',
    beforeRouteUpdate(to, from, next) {
        // 重新加载
        this.path = String(to.params.path);
        if (this.path === 'personalSpace') {
            this.fetchLimit();
        }
        this.fetchDatasets();
        // 一定要调用 next()
        next();
    },
    data() {
        return {
            currentPage: 1,
            pageSize: 10,
            total_datasets: 0,
            used: 0,
            balance: 0,
            datasets: [],
            path: null,
        };
    },
    methods: {
        formatDateTime,
        fetchDatasets() {
            const link = `/datasets?page=${this.currentPage}&per_page=${this.pageSize}&personal=${this.path == 'personalSpace'}`;
            axios.get(link).then((response) => {
                this.datasets = response.data.items;
                this.total_datasets = parseInt(response.data._meta.total_items);
            }).catch((error) => {
                console.log(error);
            });
        },
        fetchLimit() {
            const link = `/datasets/limit`;
            axios.get(link).then((response) => {
                this.used = parseInt(response.data.used);
                this.balance = parseInt(response.data.balance);
            }).catch((error) => {
                console.log(error);
            });
        },
        handlePaginationChange() {
            this.fetchDatasets();
        },
        handleUploadClick() {
            // 生成路由 URL，假设模型的 id 存在于 model.id
            const route = this.$router.resolve({
                name: 'DatasetUpload',
            });
            // 在新窗口打开目标 URL
            window.open(route.href, '_blank');
        }
    },
    mounted() {
        const route = useRoute();
        this.path = String(route.params.path);
        if (this.path === 'personalSpace') {
            this.fetchLimit();
        }
        this.fetchDatasets();
    },
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['container-body', 'table-body', 'table-title', 'uploadButton', 'createButton', 'container-header', 'container-header', 'title', 'container-header', 'container-footer',];
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
(__VLS_ctx.path == 'personalSpace' ? '个人空间' : '共享空间');
if (__VLS_ctx.path === 'personalSpace') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("reamin-space") },
    });
    (__VLS_ctx.used);
    (__VLS_ctx.balance);
}
if (__VLS_ctx.path === 'personalSpace') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-operation") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleUploadClick) },
        type: ("button"),
        ...{ class: ("uploadButton") },
    });
    const __VLS_0 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: ("16px"),
    }));
    const __VLS_2 = __VLS_1({
        size: ("16px"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const __VLS_6 = {}.Upload;
    /** @type { [typeof __VLS_components.Upload, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
    const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("button"),
        ...{ class: ("createButton") },
    });
    const __VLS_12 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: ("16px"),
    }));
    const __VLS_14 = __VLS_13({
        size: ("16px"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_18 = {}.Plus;
    /** @type { [typeof __VLS_components.Plus, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
    const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: ({}) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container-body") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("table-title disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: ("@/assets/icons/square.svg"),
    alt: ("icon"),
    ...{ class: ("square-box disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
for (const [dataset, index] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-body") },
        key: ((index)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: ("@/assets/icons/square.svg"),
        alt: ("icon"),
        ...{ class: ("square-box disable-select") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (dataset.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (dataset.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (dataset.type);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatDateTime(dataset.created_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatDateTime(dataset.updated_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (dataset.total_data);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container-footer") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("total-datasets") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.total_datasets);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("pagination-block") },
});
const __VLS_24 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([10, 20, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total_datasets)),
}));
const __VLS_26 = __VLS_25({
    ...{ 'onChange': {} },
    currentPage: ((__VLS_ctx.currentPage)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([10, 20, 50, 100])),
    background: (true),
    layout: ("sizes, prev, pager, next"),
    total: ((__VLS_ctx.total_datasets)),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_30;
const __VLS_31 = {
    onChange: (__VLS_ctx.handlePaginationChange)
};
let __VLS_27;
let __VLS_28;
var __VLS_29;
['container', 'container-header', 'title', 'reamin-space', 'container-operation', 'uploadButton', 'createButton', 'container-body', 'table-title', 'disable-select', 'square-box', 'disable-select', 'table-body', 'square-box', 'disable-select', 'container-footer', 'total-datasets', 'pagination-block',];
var __VLS_special;
let __VLS_self;
