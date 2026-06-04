import { ref, onMounted, nextTick } from 'vue';
const props = defineProps();
const scrollContainer = ref();
onMounted(async () => {
    await nextTick();
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
});
const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
};
const speakerClass = (speaker) => {
    return speaker.toLowerCase().includes('female') ? 'from-female' : 'from-male';
};
const speakerInitial = (speaker) => {
    return speaker.charAt(0).toUpperCase();
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['utterance', 'utterance', 'utterance', 'from-male', 'bubble',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("dialogue-viewer") },
    ref: ("scrollContainer"),
});
// @ts-ignore navigation for `const scrollContainer = ref()`
/** @type { typeof __VLS_ctx.scrollContainer } */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: ("session-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(props.session?.utterances?.[0].text);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("utterances") },
});
for (const [utt] of __VLS_getVForSourceType((props.session?.utterances || []))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: ((utt.utterance_code)),
        ...{ class: ("utterance") },
        ...{ class: ((__VLS_ctx.speakerClass(utt.speaker))) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("avatar") },
    });
    const __VLS_0 = {}.ElAvatar;
    /** @type { [typeof __VLS_components.ElAvatar, typeof __VLS_components.elAvatar, typeof __VLS_components.ElAvatar, typeof __VLS_components.elAvatar, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: ("small"),
    }));
    const __VLS_2 = __VLS_1({
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    (__VLS_ctx.speakerInitial(utt.speaker));
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("bubble") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("text") },
    });
    (utt.text);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("meta") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("time") },
    });
    (__VLS_ctx.formatTime(utt.start_time));
    (__VLS_ctx.formatTime(utt.end_time));
}
['dialogue-viewer', 'session-header', 'utterances', 'utterance', 'avatar', 'content', 'bubble', 'text', 'meta', 'time',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            scrollContainer: scrollContainer,
            formatTime: formatTime,
            speakerClass: speakerClass,
            speakerInitial: speakerInitial,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
