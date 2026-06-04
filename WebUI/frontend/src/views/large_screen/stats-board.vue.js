import { defineComponent, reactive, watch, nextTick } from 'vue';
export default defineComponent({
    name: 'StatsBoard',
    props: {
        total: { type: Number, required: true },
        negative: { type: Number, required: true },
        positive: { type: Number, required: true },
        // 单位数字高度（像素）
        digitHeight: { type: Number, default: 96 },
        // 单位数字宽度
        digitWidth: { type: Number, default: 72 }
    },
    setup(props) {
        // 每个 digit 列重复多少次（保证滚动过程中有足够的循环空间）
        const digitRepeatCount = 30; // 3 cycles of 0..9
        const panels = reactive([
            {
                title: '当前舆情总数',
                value: props.total,
                positions: [], // 每位的当前位置索引（单位：digit高度的倍数）
                disableTransition: []
            },
            {
                title: '负面舆情总数',
                value: props.negative,
                positions: [],
                disableTransition: []
            },
            {
                title: '正面舆情总数',
                value: props.positive,
                positions: [],
                disableTransition: []
            }
        ]);
        // 工具：把数字规范化为 6 位并在千位插入逗号
        const toSixDigitsWithComma = (v) => {
            const n = Math.max(0, Math.floor(v));
            const s = String(n).padStart(6, '0');
            return s.slice(0, 3) + ',' + s.slice(3);
        };
        const formattedDigits = (v) => toSixDigitsWithComma(v);
        // 初始化 positions：放在中间的 cycle（index 10..19）以便前后滚动
        const initPositions = (v) => {
            const s = toSixDigitsWithComma(v).split('');
            return s.map(ch => (ch === ',' ? -1 : 10 + Number(ch)));
        };
        panels.forEach(p => {
            p.positions = initPositions(p.value);
            p.disableTransition = p.positions.map(() => false);
        });
        // 动画函数：向上滚动最少步数到目标数字（steps 取 0..9）
        const animatePanelTo = async (panelIndex, newValue) => {
            const p = panels[panelIndex];
            const oldStr = toSixDigitsWithComma(p.value).split('');
            const newStr = toSixDigitsWithComma(newValue).split('');
            p.value = newValue;
            for (let i = 0; i < newStr.length; i++) {
                if (newStr[i] === ',') {
                    p.positions[i] = -1; // comma
                    continue;
                }
                const newDigit = Number(newStr[i]);
                // 当前显示的实际数字
                const currentPos = p.positions[i] < 0 ? 10 : p.positions[i];
                const currentDigit = currentPos % 10;
                // 向上滚动的最小步数（0..9）
                const steps = (newDigit - currentDigit + 10) % 10;
                const targetPos = currentPos + steps; // 可能落在中后部
                // 设置目标位置（触发带动画的 transform）
                p.disableTransition[i] = false;
                p.positions[i] = targetPos;
                // 在 transition 完成后（略大于 css 中 transition 时间），如果索引偏移到过大范围则归一化到中间 cycle
                // CSS transition duration 为 700ms（与样式中一致）
                ((panel, idx) => {
                    setTimeout(() => {
                        // 归一化：如果位置超过 20（离开中间 cycle），减去 10 使其回到中间 cycle，同步位置但不做过渡
                        if (panel.positions[idx] > 20) {
                            panel.disableTransition[idx] = true; // 关闭过渡
                            panel.positions[idx] = panel.positions[idx] - 10;
                            // 下一个 tick 恢复过渡
                            nextTick(() => {
                                setTimeout(() => {
                                    panel.disableTransition[idx] = false;
                                }, 20);
                            });
                        }
                    }, 750);
                })(p, i);
            }
            await nextTick();
        };
        watch(() => props.total, (nv) => animatePanelTo(0, nv));
        watch(() => props.negative, (nv) => animatePanelTo(1, nv));
        watch(() => props.positive, (nv) => animatePanelTo(2, nv));
        // 样式计算：transform 与过渡控制
        const digitTransformStyle = (position, disable = false) => {
            if (position == null || position < 0)
                return {};
            const y = -position * (props.digitHeight || 1);
            return {
                transform: `translateY(${y}px)`,
                transition: disable ? 'none' : 'transform 700ms cubic-bezier(.2,.9,.3,1)'
            };
        };
        return { panels, formattedDigits, digitTransformStyle, digitHeight: props.digitHeight, digitWidth: props.digitWidth, digitRepeatCount };
    }
});
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['digit-wrap', 'comma', 'card', 'card-title', 'digit', 'card', 'card-title', 'digit-viewport', 'digit',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stats-board") },
});
for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.panels))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
        key: ((idx)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-title") },
    });
    (item.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-value") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("digits") },
    });
    for (const [ch, i] of __VLS_getVForSourceType((__VLS_ctx.formattedDigits(item.value).split('')))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((i)),
            ...{ class: ("digit-wrap") },
            ...{ class: (({ comma: ch === ',' })) },
        });
        if (ch === ',') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("comma") },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("digit-viewport") },
                ...{ style: (({ height: __VLS_ctx.digitHeight + 'px', width: __VLS_ctx.digitWidth + 'px' })) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("digit-list") },
                ...{ style: ((__VLS_ctx.digitTransformStyle(item.positions[i], item.disableTransition[i]))) },
            });
            for (const [n] of __VLS_getVForSourceType((__VLS_ctx.digitRepeatCount))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("digit LED") },
                    key: ((n + '-' + i)),
                });
                ((n - 1) % 10);
            }
        }
    }
}
['stats-board', 'card', 'card-title', 'card-value', 'digits', 'digit-wrap', 'comma', 'comma', 'digit-viewport', 'digit-list', 'digit', 'LED',];
var __VLS_special;
let __VLS_self;
