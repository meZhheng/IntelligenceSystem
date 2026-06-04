import { ref, onBeforeMount, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { ElCard, ElScrollbar, ElDivider, ElTag } from 'element-plus';
import 'element-plus/es/components/card/style/css';
import 'element-plus/es/components/scrollbar/style/css';
import 'element-plus/es/components/divider/style/css';
import 'element-plus/es/components/tag/style/css';
// Props
const props = defineProps({
    items: {
        type: Array,
        required: true
    },
    title: {
        type: String,
        required: true
    }
});
const data = ref(); //列表数据
const listRef = ref(); //列表dom
const scrollViewRef = ref(); //滚动区域dom
let intervalId = null;
let isAutoScrolling = true; //是否自动滚动标识
let title = props.title;
onMounted(() => {
    data.value = props.items;
    nextTick(() => {
        autoScrolling();
    });
});
watch(() => props.items, (newVal) => {
    data.value = newVal;
    nextTick(() => {
        autoScrolling();
    });
});
//设置自动滚动
const autoScrolling = () => {
    intervalId = setInterval(() => {
        if (scrollViewRef.value.scrollTop < listRef.value[0].clientHeight) {
            scrollViewRef.value.scrollTop += isAutoScrolling ? 1 : 0;
        }
        else {
            scrollViewRef.value.scrollTop = 0;
        }
    }, 20);
};
onBeforeUnmount(() => {
    //离开页面清理定时器
    intervalId && clearInterval(intervalId);
});
//鼠标进入，停止滚动
const onMouseenter = () => {
    isAutoScrolling = false;
};
//鼠标移出，继续滚动
const onMouseleave = () => {
    isAutoScrolling = true;
};
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['item', 'item',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("page") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("page") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("warning-view") },
});
const __VLS_7 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    type: ("info"),
    size: ("large"),
    ...{ style: (({
            height: '50px',
            lineHeight: '50px',
            fontSize: '20px',
            fontWeight: '600',
            padding: '8px 20px',
            borderRadius: '8px',
            userSelect: 'none'
        })) },
}));
const __VLS_9 = __VLS_8({
    type: ("info"),
    size: ("large"),
    ...{ style: (({
            height: '50px',
            lineHeight: '50px',
            fontSize: '20px',
            fontWeight: '600',
            padding: '8px 20px',
            borderRadius: '8px',
            userSelect: 'none'
        })) },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
(__VLS_ctx.title);
__VLS_12.slots.default;
var __VLS_12;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseenter: (__VLS_ctx.onMouseenter) },
    ...{ onMouseleave: (__VLS_ctx.onMouseleave) },
    ...{ class: ("scroll-view") },
    ref: ("scrollViewRef"),
});
// @ts-ignore navigation for `const scrollViewRef = ref()`
/** @type { typeof __VLS_ctx.scrollViewRef } */ ;
for (const [p, n] of __VLS_getVForSourceType((2))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: ("listRef"),
        ...{ class: ("list") },
        key: ((n)),
    });
    // @ts-ignore navigation for `const listRef = ref()`
    /** @type { typeof __VLS_ctx.listRef } */ ;
    for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.data))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("item") },
            key: ((index)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("content") },
        });
        (item);
    }
}
__VLS_5.slots.default;
var __VLS_5;
['page', 'warning-view', 'scroll-view', 'list', 'item', 'content',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            ElCard: ElCard,
            ElTag: ElTag,
            data: data,
            listRef: listRef,
            scrollViewRef: scrollViewRef,
            title: title,
            onMouseenter: onMouseenter,
            onMouseleave: onMouseleave,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
        };
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
