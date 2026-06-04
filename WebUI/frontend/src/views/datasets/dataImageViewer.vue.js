import { ref, computed, watch } from 'vue';
import { ArrowLeft, ArrowRight, } from '@element-plus/icons-vue';
const props = defineProps();
// 当前显示的图片索引
const currentIndex = ref(0);
// 初始化或当 data.images 发生变化时重置索引
watch(() => props.data?.images, (imgs) => {
    if (imgs && imgs.length > 0)
        currentIndex.value = 0;
}, { immediate: true });
// 预览列表
const previewList = computed(() => props.data.images?.map(img => `/static/images/${props.data.dataset_id}/${img.path}`) || []);
// 当前图片地址
const currentImageSrc = computed(() => props.data.images && props.data.images.length
    ? `/static/images/${props.data.dataset_id}/${props.data.images[currentIndex.value].path}`
    : '');
// 切换上一张
function prevImage() {
    if (!props.data.images)
        return;
    const len = props.data.images.length;
    currentIndex.value = (currentIndex.value - 1 + len) % len;
}
// 切换下一张
function nextImage() {
    if (!props.data.images)
        return;
    const len = props.data.images.length;
    currentIndex.value = (currentIndex.value + 1) % len;
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['arrow', 'dot',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("content card") },
});
if (__VLS_ctx.data?.images && __VLS_ctx.data?.images.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("viewer-images") },
    });
    const __VLS_0 = {}.ElImage;
    /** @type { [typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        src: ((__VLS_ctx.currentImageSrc)),
        ...{ class: ("viewer-image") },
        fit: ("contain"),
        lazy: (true),
        previewSrcList: ((__VLS_ctx.previewList)),
    }));
    const __VLS_2 = __VLS_1({
        src: ((__VLS_ctx.currentImageSrc)),
        ...{ class: ("viewer-image") },
        fit: ("contain"),
        lazy: (true),
        previewSrcList: ((__VLS_ctx.previewList)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    if (__VLS_ctx.data?.images.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.prevImage) },
            ...{ class: ("arrow arrow-left") },
        });
        const __VLS_6 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
        const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
        const __VLS_12 = {}.ArrowLeft;
        /** @type { [typeof __VLS_components.ArrowLeft, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_11.slots.default;
        var __VLS_11;
    }
    if (__VLS_ctx.data?.images.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.nextImage) },
            ...{ class: ("arrow arrow-right") },
        });
        const __VLS_18 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
        const __VLS_24 = {}.ArrowRight;
        /** @type { [typeof __VLS_components.ArrowRight, ] } */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
        const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_23.slots.default;
        var __VLS_23;
    }
    if (__VLS_ctx.data?.images.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("image-dots") },
        });
        for (const [_, i] of __VLS_getVForSourceType((__VLS_ctx.data?.images))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: ((i)),
                ...{ class: ((['dot', { active: i === __VLS_ctx.currentIndex }])) },
            });
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("viewer-content") },
});
(__VLS_ctx.data?.text);
['content', 'card', 'viewer-images', 'viewer-image', 'arrow', 'arrow-left', 'arrow', 'arrow-right', 'image-dots', 'active', 'dot', 'viewer-content',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            ArrowRight: ArrowRight,
            currentIndex: currentIndex,
            previewList: previewList,
            currentImageSrc: currentImageSrc,
            prevImage: prevImage,
            nextImage: nextImage,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
