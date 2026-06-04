import { computed } from 'vue';
import { CATEGORY_MAP } from './Lexicon.vue';
const props = defineProps();
// 处理文本标记
const processedText = computed(() => {
    if (!props.text)
        return [];
    const chars = props.text.split('').map((char, index) => ({
        char,
        index,
        highlight: false,
        category: '',
        word: ''
    }));
    const matches = props.matches ?? [];
    matches.forEach(match => {
        match.positions.forEach(pos => {
            const length = match.word.length;
            for (let i = 0; i < length; i++) {
                const targetIndex = pos + i;
                if (targetIndex < chars.length) {
                    chars[targetIndex].highlight = true;
                    chars[targetIndex].category = match.category;
                    chars[targetIndex].word = match.word;
                }
            }
        });
    });
    return chars;
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("text-content") },
});
for (const [char, index] of __VLS_getVForSourceType((__VLS_ctx.processedText))) {
    (index);
    if (char.highlight) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((['highlight', char.category])) },
            'data-pos': ((index)),
            title: ((`${char.word} (${__VLS_ctx.CATEGORY_MAP[char.category] || char.category})`)),
        });
        (char.char);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (char.char);
    }
}
['text-content', 'highlight',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CATEGORY_MAP: CATEGORY_MAP,
            processedText: processedText,
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
