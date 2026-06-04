import * as echarts from 'echarts';
import chinaMap from '@/assets/jsons/china.json';
export default (await import('vue')).defineComponent({
    name: 'MapChart',
    data() {
        return {
            charts: {
                map: null,
            },
        };
    },
    props: {
        mapData: {
            type: Object,
            required: true,
            default: []
        }
    },
    watch: {
        mapData: {
            handler: 'updateChart',
            deep: true
        }
    },
    methods: {
        initCharts() {
            echarts.registerMap('china', chinaMap);
            // 地图
            this.charts.map = echarts.init(document.getElementById('map-chart'));
        },
        updateChart() {
            // 地图配置
            const mapOption = {
                tooltip: {
                    trigger: 'item',
                    showDelay: 0,
                    transitionDuration: 0.2
                },
                visualMap: {
                    min: 0,
                    max: this.mapData.max_value,
                    text: ['高', '低'],
                    calculable: true,
                    inRange: {
                        color: [
                            '#313695',
                            '#4575b4',
                            '#74add1',
                            '#abd9e9',
                            '#e0f3f8',
                            '#ffffbf',
                            '#fee090',
                            '#fdae61',
                            '#f46d43',
                            '#d73027',
                            '#a50026'
                        ]
                    },
                },
                series: [
                    {
                        name: '舆情热度',
                        type: 'map',
                        map: 'china',
                        roam: false,
                        zoom: 1.23,
                        center: [105, 29],
                        data: this.mapData.map_stats,
                        emphasis: {
                            label: {
                                show: true
                            }
                        },
                    }
                ]
            };
            // 更新图表
            this.charts.map.setOption(mapOption);
        },
        handleResize() {
            Object.values(this.charts).forEach(chart => chart.resize());
        },
    },
    mounted() {
        this.initCharts();
        window.addEventListener('resize', this.handleResize);
    },
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("map-area"),
    ...{ class: ("disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("map-chart"),
});
['disable-select', 'chart-title',];
var __VLS_special;
let __VLS_self;
