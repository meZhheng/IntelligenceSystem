export default (await import('vue')).defineComponent({
    name: 'StartBtn',
    data() {
        return {
            isChecked: false,
        };
    },
    props: {
        progress: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            default: 'start'
        },
    },
    watch: {
        progress(newProgress) {
            this.updateProgress(newProgress);
        },
        status(newStatus, oldStatus) {
            if (newStatus == 'processing' && oldStatus == 'start') {
                document.getElementsByClassName('label')[0].classList.add('checked');
            }
            else if (newStatus == 'start') {
                document.getElementsByClassName('label')[0].classList.remove('checked');
            }
        }
    },
    methods: {
        updateProgress(newProgress) {
            const progress = Math.max(0, Math.min(100, 100 - newProgress));
            const circleEl = document.querySelector('.circle');
            if (circleEl) {
                circleEl.style.setProperty('--progress', progress + '%');
            }
        },
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['label', 'label', 'label', 'title', 'label', 'label', 'circle', 'label', 'circle', 'label', 'circle', 'label', 'label', 'checked', 'circle', 'label', 'circle', 'label', 'checked', 'circle', 'icon', 'label', 'checked', 'title', 'label', 'checked', 'title',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("container") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: ("label") },
});
if (__VLS_ctx.status !== 'finished') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("circle") },
    });
    if (__VLS_ctx.status === 'start') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: ("icon") },
            'aria-hidden': ("true"),
            xmlns: ("http://www.w3.org/2000/svg"),
            fill: ("none"),
            viewBox: ("0 0 24 24"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            stroke: ("currentColor"),
            'stroke-linecap': ("round"),
            'stroke-linejoin': ("round"),
            'stroke-width': ("1.5"),
            d: ("M12 19V5m0 14-4-4m4 4 4-4"),
        });
    }
    if (__VLS_ctx.status === 'processing') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("square") },
        });
    }
}
if (__VLS_ctx.status === 'finished') {
    const __VLS_0 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: ("is-processing") },
        size: ((30)),
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: ("is-processing") },
        size: ((30)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: ("circular") },
        viewBox: ("0 0 50 50"),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        ...{ class: ("path") },
        cx: ("30"),
        cy: ("30"),
        r: ("20"),
        fill: ("green"),
    });
    __VLS_5.slots.default;
    var __VLS_5;
}
['container', 'label', 'circle', 'icon', 'square', 'is-processing', 'circular', 'path',];
var __VLS_special;
let __VLS_self;
