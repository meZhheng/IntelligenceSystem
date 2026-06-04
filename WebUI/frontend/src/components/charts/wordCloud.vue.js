import * as echarts from 'echarts';
import 'echarts-wordcloud';
export default (await import('vue')).defineComponent({
    name: 'WordCloud',
    props: {
        wordCloudData: {
            type: Object,
            required: true,
            default: []
        },
    },
    watch: {
        wordCloudData: {
            handler(newVal) {
                const limit = 220;
                let limitedData = newVal;
                if (limitedData && limitedData.length > limit) {
                    limitedData = limitedData.slice(0, limit);
                }
                this.initwordCloud(limitedData);
            },
            deep: true
        }
    },
    data() {
        return {
            wordCloudChart: null,
        };
    },
    methods: {
        initwordCloud(limitedData) {
            if (this.wordCloudChart == null) {
                const echartDom = this.$refs.wordCloudContainer;
                this.wordCloudChart = echarts.init(echartDom);
            }
            const option = {
                series: [{
                        type: 'wordCloud',
                        shape: 'circle',
                        keepAspect: false,
                        left: 'center',
                        top: 'center',
                        width: '100%',
                        height: '95%',
                        sizeRange: [20, 150],
                        rotationRange: [-30, 30],
                        rotationStep: 15,
                        gridSize: 10,
                        drawOutOfBound: false,
                        layoutAnimation: true,
                        textStyle: {
                            fontFamily: 'sans-serif',
                            fontWeight: 'bold',
                            color: function () {
                                return 'rgb(' + [
                                    Math.round(Math.random() * 160),
                                    Math.round(Math.random() * 160),
                                    Math.round(Math.random() * 160)
                                ].join(',') + ')';
                            }
                        },
                        emphasis: {
                            focus: 'self',
                            textStyle: {
                                textShadowBlur: 10,
                                textShadowColor: '#333'
                            }
                        },
                        //data属性中的value值却大，权重就却大，展示字体就却大
                        data: limitedData,
                    }]
            };
            this.wordCloudChart.setOption(option);
            //随着屏幕大小调节图表
            window.addEventListener("resize", () => {
                this.wordCloudChart.resize();
            });
        }
    },
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("WordCloud-area disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: ("wordCloudContainer"),
    ...{ class: ("wordcloud-container") },
});
// @ts-ignore navigation for `const wordCloudContainer = ref()`
/** @type { typeof __VLS_ctx.wordCloudContainer } */ ;
['WordCloud-area', 'disable-select', 'chart-title', 'wordcloud-container',];
var __VLS_special;
let __VLS_self;
