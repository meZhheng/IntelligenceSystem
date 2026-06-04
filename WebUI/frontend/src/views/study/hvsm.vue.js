import axios from '@/api/axios';
export default (await import('vue')).defineComponent({
    data() {
        return {
            startMvsh: false,
            startHvsm: false,
            loading: false,
            dataList: [], // 题目列表
            selected: [], // 用户选项
            options: [
                { value: '泄露J调整组建、编制部署' },
                { value: '泄露高新武器装备动态' },
                { value: '历史虚无主义' },
                { value: '抹黑丑化J队作风形象' },
                { value: '涉J网络暴力' },
                { value: '涉J谣言' },
                { value: '暴露涉J单位、人员信息' },
                { value: '煽动J地对立、夸大渲染J队腐败矛盾' },
                { value: '涉J婚恋纠纷、征婚交友' },
                { value: '涉J性别歧视' },
                { value: '涉J政治言论' },
                { value: '涉“J贷”等网络借贷' },
            ],
            showAnswer: false,
            score: 0,
            inputText: '',
            aiOutput: '',
        };
    },
    computed: {
        total() {
            return this.dataList.length;
        },
        currentIndex() {
            // 在未提交前，已答题数
            return this.selected.filter(v => v).length;
        },
        allAnswered() {
            return this.currentIndex === this.total;
        },
        scorePercent() {
            return this.total > 0
                ? Math.round((this.score / this.total) * 100)
                : 0;
        }
    },
    methods: {
        round(v) { return Math.round(v); },
        onStartMvsh() {
            this.startMvsh = true;
            this.startHvsm = false;
            if (this.dataList.length > 0)
                return;
            this.loadQuestions();
        },
        onStartHvsm() {
            this.startHvsm = true;
            this.startMvsh = false;
        },
        // 加载题目示例
        async loadQuestions() {
            this.dataList = [];
            this.loading = true;
            axios.get('/hvsm/questions', { timeout: 600000 }).then(res => {
                this.dataList = res.data;
            }).catch(err => {
                console.error('加载题目失败:', err);
                this.dataList = [];
            }).finally(() => {
                this.loading = false;
            });
            this.selected = Array(this.total).fill('');
            this.showAnswer = false;
            this.score = 0;
        },
        submitAnswers() {
            // 统计分数
            this.score = this.selected.reduce((sum, v, i) => console.log(sum, v, this.dataList[i].label) ||
                sum + (v === this.dataList[i].label ? 1 : 0), 0);
            this.showAnswer = true;
            // 将分数发送到后端
            const link = `/hvsm/score`;
            axios.post(link, {
                score: this.score * 10
            }, {
                timeout: 10000
            }).then((response) => {
                console.log('分数存储:', response.data.status);
            }).catch((error) => {
                console.error(error);
            });
        },
        resetQuiz() {
            this.loadQuestions();
        },
        async fetchAiJudgment() {
            if (!this.inputText)
                return;
            this.loading = true;
            response = axios.post('/hvsm/ai/judgment', {
                text: this.inputText,
            }, {
                timeout: 600000
            }).then(response => {
                this.aiOutput = response.data;
            }).finally(() => {
                this.loading = false;
            });
        }
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['mode-switch', 'bottom-bar', 'el-button', 'hvsm-mode', 'hvsm-mode', 'el-button',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("adversarial-training") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: ("title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("mode-switch") },
});
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: ((__VLS_ctx.startMvsh ? 'primary' : 'default')),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: ((__VLS_ctx.startMvsh ? 'primary' : 'default')),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.onStartMvsh)
};
let __VLS_3;
let __VLS_4;
__VLS_5.slots.default;
var __VLS_5;
const __VLS_8 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    type: ((__VLS_ctx.startHvsm ? 'primary' : 'default')),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    type: ((__VLS_ctx.startHvsm ? 'primary' : 'default')),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.onStartHvsm)
};
let __VLS_11;
let __VLS_12;
__VLS_13.slots.default;
var __VLS_13;
if (__VLS_ctx.startMvsh) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mvsh-mode") },
    });
    const __VLS_16 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ class: ("quiz-progress") },
        textInside: ((true)),
        strokeWidth: ((18)),
        percentage: ((__VLS_ctx.round((__VLS_ctx.currentIndex / __VLS_ctx.total) * 100))),
        format: ((() => `${__VLS_ctx.currentIndex}/${__VLS_ctx.total}`)),
    }));
    const __VLS_18 = __VLS_17({
        ...{ class: ("quiz-progress") },
        textInside: ((true)),
        strokeWidth: ((18)),
        percentage: ((__VLS_ctx.round((__VLS_ctx.currentIndex / __VLS_ctx.total) * 100))),
        format: ((() => `${__VLS_ctx.currentIndex}/${__VLS_ctx.total}`)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.dataList))) {
        const __VLS_22 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
            loading: ((__VLS_ctx.loading)),
            key: ((idx)),
            ...{ class: ("quiz-card") },
            bodyStyle: (({ padding: '20px' })),
            ...{ class: (({
                    correct: __VLS_ctx.showAnswer && __VLS_ctx.selected[idx] === item.label,
                    wrong: __VLS_ctx.showAnswer && __VLS_ctx.selected[idx] && __VLS_ctx.selected[idx] !== item.label
                })) },
        }));
        const __VLS_24 = __VLS_23({
            loading: ((__VLS_ctx.loading)),
            key: ((idx)),
            ...{ class: ("quiz-card") },
            bodyStyle: (({ padding: '20px' })),
            ...{ class: (({
                    correct: __VLS_ctx.showAnswer && __VLS_ctx.selected[idx] === item.label,
                    wrong: __VLS_ctx.showAnswer && __VLS_ctx.selected[idx] && __VLS_ctx.selected[idx] !== item.label
                })) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_23));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("question-no") },
        });
        (idx + 1);
        if (__VLS_ctx.showAnswer && __VLS_ctx.selected[idx] && __VLS_ctx.selected[idx] !== item.label) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("correct-label") },
            });
            (item.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("question-text") },
        });
        (item.text);
        const __VLS_28 = {}.ElSelect;
        /** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            modelValue: ((__VLS_ctx.selected[idx])),
            placeholder: ("请选择类别"),
            disabled: ((__VLS_ctx.showAnswer)),
            clearable: (true),
        }));
        const __VLS_30 = __VLS_29({
            modelValue: ((__VLS_ctx.selected[idx])),
            placeholder: ("请选择类别"),
            disabled: ((__VLS_ctx.showAnswer)),
            clearable: (true),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.options))) {
            const __VLS_34 = {}.ElOption;
            /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
            // @ts-ignore
            const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
                key: ((opt.value)),
                label: ((opt.value)),
                value: ((opt.value)),
            }));
            const __VLS_36 = __VLS_35({
                key: ((opt.value)),
                label: ((opt.value)),
                value: ((opt.value)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        }
        __VLS_33.slots.default;
        var __VLS_33;
        __VLS_27.slots.default;
        var __VLS_27;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("bottom-bar") },
    });
    const __VLS_40 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((!__VLS_ctx.allAnswered || __VLS_ctx.showAnswer)),
        loading: ((__VLS_ctx.loading)),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((!__VLS_ctx.allAnswered || __VLS_ctx.showAnswer)),
        loading: ((__VLS_ctx.loading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.submitAnswers)
    };
    let __VLS_43;
    let __VLS_44;
    __VLS_45.slots.default;
    var __VLS_45;
    if (__VLS_ctx.showAnswer) {
        const __VLS_48 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            ...{ 'onClick': {} },
        }));
        const __VLS_50 = __VLS_49({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        let __VLS_54;
        const __VLS_55 = {
            onClick: (__VLS_ctx.resetQuiz)
        };
        let __VLS_51;
        let __VLS_52;
        __VLS_53.slots.default;
        var __VLS_53;
    }
    if (__VLS_ctx.showAnswer) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("result-summary") },
        });
        const __VLS_56 = {}.ElCard;
        /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            ...{ class: ("result-card") },
        }));
        const __VLS_58 = __VLS_57({
            ...{ class: ("result-card") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        const __VLS_62 = {}.ElProgress;
        /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
        // @ts-ignore
        const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
            type: ("circle"),
            percentage: ((__VLS_ctx.scorePercent)),
            width: ((120)),
        }));
        const __VLS_64 = __VLS_63({
            type: ("circle"),
            percentage: ((__VLS_ctx.scorePercent)),
            width: ((120)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_63));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("score-text") },
        });
        (__VLS_ctx.score);
        (__VLS_ctx.total);
        (__VLS_ctx.scorePercent);
        __VLS_61.slots.default;
        var __VLS_61;
    }
}
if (__VLS_ctx.startHvsm) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("hvsm-mode") },
    });
    const __VLS_68 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        type: ("textarea"),
        modelValue: ((__VLS_ctx.inputText)),
        placeholder: ("请输入一段测试文字…"),
        rows: ((4)),
    }));
    const __VLS_70 = __VLS_69({
        type: ("textarea"),
        modelValue: ((__VLS_ctx.inputText)),
        placeholder: ("请输入一段测试文字…"),
        rows: ((4)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("bottom-bar") },
    });
    const __VLS_74 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((!__VLS_ctx.inputText)),
        loading: ((__VLS_ctx.loading)),
    }));
    const __VLS_76 = __VLS_75({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((!__VLS_ctx.inputText)),
        loading: ((__VLS_ctx.loading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    let __VLS_80;
    const __VLS_81 = {
        onClick: (__VLS_ctx.fetchAiJudgment)
    };
    let __VLS_77;
    let __VLS_78;
    __VLS_79.slots.default;
    var __VLS_79;
    if (__VLS_ctx.aiOutput) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("ai-output") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: ({}) },
        });
        (__VLS_ctx.aiOutput);
    }
}
['adversarial-training', 'title', 'mode-switch', 'mvsh-mode', 'quiz-progress', 'quiz-card', 'correct', 'wrong', 'card-header', 'question-no', 'correct-label', 'question-text', 'bottom-bar', 'result-summary', 'result-card', 'score-text', 'hvsm-mode', 'bottom-bar', 'ai-output',];
var __VLS_special;
let __VLS_self;
