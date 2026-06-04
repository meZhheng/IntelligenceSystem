import { render } from "@/utils/markdown.js";
export default (await import('vue')).defineComponent({
    name: "StepLLM",
    data() {
        return {
            isReflectionBtn: true,
            internalBuffer: {},
            processedIndex: 0,
            phaseOrder: [],
            expandedPhases: {},
            isLoading: false,
            fieldLabelMapping: {},
        };
    },
    props: {
        buffer: {
            type: Object,
            default: [],
        },
        inferenceResult: {
            type: Object,
            default: [],
        },
    },
    watch: {
        buffer: {
            handler() {
                const newChunks = this.buffer.slice(this.processedIndex);
                newChunks.forEach(chunk => {
                    this.processChunk(chunk);
                    this.processedIndex++;
                });
            },
            deep: true
        }
    },
    computed: {
        // 最终结果转换为列表形式
        phaseList() {
            console.log(this.internalBuffer['stances']);
            return this.phaseOrder.map(phase => ({
                phase,
                ...this.internalBuffer[phase]
            }));
        }
    },
    methods: {
        render,
        isLastPhase(index) {
            return index === this.phaseList.length - 1;
        },
        isExpanded(phase) {
            return this.expandedPhases[phase] ?? true; // 默认展开
        },
        togglePhase(phase) {
            if (this.expandedPhases[phase] != null) {
                this.expandedPhases[phase] = !this.expandedPhases[phase];
            }
            else {
                this.expandedPhases[phase] = false;
            }
        },
        reflectionBtn() {
            this.isReflectionBtn = !this.isReflectionBtn;
        },
        processChunk(chunkText) {
            const fixedChunkText = chunkText.replace(/}\s*{/g, '}\n{');
            const lines = fixedChunkText.split('\n');
            lines.forEach(line => {
                if (!line.trim())
                    return;
                try {
                    const obj = JSON.parse(line);
                    if (obj.status === 'success')
                        return;
                    if (obj.status === 'failed') {
                        this.$message.error(obj.error);
                        return;
                    }
                    if (obj.phase === 'stances') {
                        if (!this.internalBuffer[obj.phase]) {
                            this.internalBuffer[obj.phase] = {};
                            this.internalBuffer[obj.phase].stances = {};
                            this.phaseOrder.push(obj.phase); // 记录顺序
                        }
                        if (!this.internalBuffer[obj.phase].stances[obj.stance]) {
                            this.internalBuffer[obj.phase].stances[obj.stance] = {
                                data: '',
                            };
                        }
                    }
                    // 创建新阶段
                    if (!this.internalBuffer[obj.phase]) {
                        this.internalBuffer[obj.phase] = {
                            data: '',
                        };
                        this.phaseOrder.push(obj.phase); // 记录顺序
                    }
                    if (typeof obj.data === 'object' && obj.data !== null) {
                        if (obj.phase === 'stances') {
                            this.internalBuffer[obj.phase].stances[obj.stance].data += JSON.stringify(obj.data);
                        }
                        else {
                            this.internalBuffer[obj.phase].data += JSON.stringify(obj.data);
                        }
                    }
                    else {
                        if (obj.phase === 'stances') {
                            this.internalBuffer[obj.phase].stances[obj.stance].data += obj.data;
                        }
                        else {
                            this.internalBuffer[obj.phase].data += obj.data;
                        }
                    }
                }
                catch (e) {
                    console.error("解析异常:", e, "行内容:", line);
                }
            });
        },
        flushBuffer() {
            this.internalBuffer = {};
            this.processedIndex = 0;
            this.phaseOrder = [];
            this.expandedPhases = {};
        },
    }
});
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['el-icon', 'collapsed', 'el-icon', 'phase-container', 'el-icon', 'phase-card', 'phase-header', 'el-icon', 'phase-content',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("phase-container") },
});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.isLoading ? __VLS_ctx.phaseList : __VLS_ctx.inferenceResult))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: ((item.phase)),
        ...{ class: ("phase-card") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.togglePhase(item.phase);
            } },
        ...{ class: ("phase-header clickable disable-select") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("phase-title") },
    });
    if (!__VLS_ctx.isExpanded(item.phase)) {
        const __VLS_0 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
        const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
        const __VLS_6 = {}.CaretRight;
        /** @type { [typeof __VLS_components.CaretRight, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
        const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
        __VLS_5.slots.default;
        var __VLS_5;
    }
    if (__VLS_ctx.isExpanded(item.phase)) {
        const __VLS_12 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
        const __VLS_18 = {}.CaretBottom;
        /** @type { [typeof __VLS_components.CaretBottom, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
        __VLS_17.slots.default;
        var __VLS_17;
    }
    (index + 1);
    (item.phase);
    if (__VLS_ctx.isLoading && __VLS_ctx.isLastPhase(index)) {
        const __VLS_24 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
        const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
        const __VLS_30 = {}.RefreshRight;
        /** @type { [typeof __VLS_components.RefreshRight, ] } */ ;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
            color: ("blue"),
            ...{ class: ("spin-icon") },
        }));
        const __VLS_32 = __VLS_31({
            color: ("blue"),
            ...{ class: ("spin-icon") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        __VLS_29.slots.default;
        var __VLS_29;
    }
    else {
        const __VLS_36 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            color: ("green"),
        }));
        const __VLS_38 = __VLS_37({
            color: ("green"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        const __VLS_42 = {}.SuccessFilled;
        /** @type { [typeof __VLS_components.SuccessFilled, ] } */ ;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({}));
        const __VLS_44 = __VLS_43({}, ...__VLS_functionalComponentArgsRest(__VLS_43));
        __VLS_41.slots.default;
        var __VLS_41;
    }
    if (item.phase !== 'stances') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("phase-content") },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isExpanded(item.phase)) }, null, null);
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.render(item.data)) }, null, null);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stance-container") },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isExpanded(item.phase)) }, null, null);
        for (const [stance, index] of __VLS_getVForSourceType((item.stances))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((index)),
                ...{ class: ("stance-block") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("stance-header") },
            });
            const __VLS_48 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
            const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
            const __VLS_54 = {}.Flag;
            /** @type { [typeof __VLS_components.Flag, ] } */ ;
            // @ts-ignore
            const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({}));
            const __VLS_56 = __VLS_55({}, ...__VLS_functionalComponentArgsRest(__VLS_55));
            __VLS_53.slots.default;
            var __VLS_53;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (index);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("stance-content") },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.render(stance.data)) }, null, null);
        }
    }
}
['phase-container', 'phase-card', 'phase-header', 'clickable', 'disable-select', 'phase-title', 'spin-icon', 'phase-content', 'stance-container', 'stance-block', 'stance-header', 'stance-content',];
var __VLS_special;
let __VLS_self;
