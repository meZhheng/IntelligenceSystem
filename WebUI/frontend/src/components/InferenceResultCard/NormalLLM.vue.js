import { render } from "@/utils/markdown.js";
export default (await import('vue')).defineComponent({
    name: "ChatCard",
    data() {
        return {
            isReflectionBtn: true,
        };
    },
    props: {
        inferenceResult: {
            type: Object,
            default: () => ({ inversion: true, answer: "Hello, I am Ollama...", reasoning: "我是一个AI" }),
        },
    },
    methods: {
        render,
        botThinking() {
            const thinkingText = ["⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏", "⠋", "⠙", "⠹"];
            let i = 0;
            const loadingInterval = setInterval(() => {
                this.inferenceResult.answer = thinkingText[i];
                i = (i + 1) % thinkingText.length;
            }, 100);
            return () => {
                clearInterval(loadingInterval);
                this.inferenceResult.answer = "";
            };
        },
        reflectionBtn() {
            this.isReflectionBtn = !this.isReflectionBtn;
        },
        processChunk(chunkText) {
            // 拆分每行数据（假设每行是一个完整的 JSON 对象）
            const lines = chunkText.split('\n');
            for (const line of lines) {
                if (line.trim().length) {
                    try {
                        const obj = JSON.parse(line);
                        if (obj.data && obj.status === 'reasoning') {
                            this.buffer.reasoning += obj.data;
                        }
                        else if (obj.data && obj.status === 'streaming') {
                            this.buffer.answer += obj.data;
                        }
                    }
                    catch (e) {
                        console.error("解析 JSON 行失败:", e);
                        console.error("JSON 行:", line);
                    }
                }
            }
        }
    }
});
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.inferenceResult.inversion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("msg-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.inferenceResult.reasoning && __VLS_ctx.inferenceResult.reasoning.length > 2) {
        const __VLS_0 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            ...{ class: ("reflectionBtn") },
            type: ("primary"),
            icon: ((__VLS_ctx.isReflectionBtn ? 'ArrowUp' : 'ArrowDown')),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            ...{ class: ("reflectionBtn") },
            type: ("primary"),
            icon: ((__VLS_ctx.isReflectionBtn ? 'ArrowUp' : 'ArrowDown')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_6;
        const __VLS_7 = {
            onClick: (__VLS_ctx.reflectionBtn)
        };
        let __VLS_3;
        let __VLS_4;
        __VLS_5.slots.default;
        var __VLS_5;
    }
    if (__VLS_ctx.inferenceResult.reasoning.length > 2 && __VLS_ctx.isReflectionBtn) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("think") },
        });
        (__VLS_ctx.inferenceResult.reasoning);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.render(__VLS_ctx.inferenceResult.answer)) }, null, null);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("msg-content") },
    });
    (__VLS_ctx.inferenceResult.answer);
}
['msg-content', 'reflectionBtn', 'think', 'msg-content',];
var __VLS_special;
let __VLS_self;
