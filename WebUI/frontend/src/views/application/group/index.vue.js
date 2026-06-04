import Sidebar from '@/components/layouts/Sidebar.vue';
import EmotionIntro from './introduction.vue';
import Overview from './overview.vue';
import dataChart from './dataChart.vue';
import { useStore } from '@/store';
import datasetSpace from '@/views/application/datasetSpace.vue';
import modelSpace from '@/views/models/modelSpace.vue';
export default (await import('vue')).defineComponent({
    components: {
        Sidebar,
        EmotionIntro,
        Overview,
        dataChart,
        datasetSpace,
        modelSpace,
    },
    data() {
        return {
            app_groups: [],
            default_groups: [],
            groupExpand: {},
            item_selected: null,
            workshop_visible: false,
            default_visible: false,
            select_default: null,
            select_index: null,
            store: useStore(),
            create_group_info: {
                name: '',
                dataset_selected: [],
                default: false,
            },
            dataset_available: [],
            create_group_visible: false,
            checkAll_dataset: false,
            indeterminate_dataset: false,
            datasets_visable: true,
            datasets_path: '',
        };
    },
    computed: {
        pass_datasets() {
            return this.select_default
                ? this.default_groups.find(group => group.id === this.select_index) || {}
                : this.app_groups.find(group => group.id === this.select_index) || {};
        },
        passPath() {
            return this.datasets_path;
        }
    },
    methods: {
        showDatasets(path) {
            this.item_selected = 'datasets';
            this.datasets_path = path;
        },
        handleCreateGroupClick(mode) {
            this.create_group_info.default = mode === 'default';
            this.create_group_visible = true;
        },
    },
    watch: {
        'create_group_info.dataset_selected': {
            handler(newVal) {
                const total = this.dataset_available.length;
                if (newVal.length === 0) {
                    this.checkAll_dataset = false;
                    this.indeterminate_dataset = false;
                }
                else if (newVal.length === total) {
                    this.checkAll_dataset = true;
                    this.indeterminate_dataset = false;
                }
                else {
                    this.indeterminate_dataset = true;
                }
            },
        },
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
const __VLS_componentsOption = {
    Sidebar,
    EmotionIntro,
    Overview,
    dataChart,
    datasetSpace,
    modelSpace,
};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("main-box") },
});
if (__VLS_ctx.item_selected === 'overview') {
    const __VLS_0 = {}.Overview;
    /** @type { [typeof __VLS_components.Overview, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        group: ((__VLS_ctx.pass_datasets)),
    }));
    const __VLS_2 = __VLS_1({
        group: ((__VLS_ctx.pass_datasets)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.item_selected === 'analysis') {
    const __VLS_6 = {}.dataChart;
    /** @type { [typeof __VLS_components.DataChart, typeof __VLS_components.dataChart, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        group: ((__VLS_ctx.pass_datasets)),
    }));
    const __VLS_8 = __VLS_7({
        group: ((__VLS_ctx.pass_datasets)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
}
else if (__VLS_ctx.item_selected === 'datasets') {
    const __VLS_12 = {}.datasetSpace;
    /** @type { [typeof __VLS_components.DatasetSpace, typeof __VLS_components.datasetSpace, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        path: ((__VLS_ctx.passPath)),
    }));
    const __VLS_14 = __VLS_13({
        path: ((__VLS_ctx.passPath)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
else if (__VLS_ctx.item_selected === 'models') {
    const __VLS_18 = {}.modelSpace;
    /** @type { [typeof __VLS_components.ModelSpace, typeof __VLS_components.modelSpace, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
    const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
}
else {
    const __VLS_24 = {}.EmotionIntro;
    /** @type { [typeof __VLS_components.EmotionIntro, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
}
['main-box',];
var __VLS_special;
let __VLS_self;
