<template>
<div id="map-area" class="disable-select">
    <div class="chart-title">
        舆情热点地区
    </div>
    <div id="map-chart"></div>
</div>
</template>

<script>
import * as echarts from 'echarts'
import chinaMap from '@/assets/jsons/china.json'

export default {
    name: 'MapChart',

    data() {
        return {
            charts: {
                map: null,
            },
        }
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
            echarts.registerMap('china', chinaMap)
            
            // 地图
            this.charts.map = echarts.init(document.getElementById('map-chart'))
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
            }

            // 更新图表
            this.charts.map.setOption(mapOption)
        },

        handleResize() {
            Object.values(this.charts).forEach(chart => chart.resize())
        },
    },

    mounted() {
        this.initCharts()
        window.addEventListener('resize', this.handleResize)
    },
}

</script>

<style scoped>
#map-chart {
    height: 100%;
}

#map-area {
    width: 100%;
    box-sizing: border-box;
    padding: 20px;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    height: 680px;
}

.chart-title {
    margin: 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    justify-content: space-between;
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 22px;
    box-sizing: border-box;
    border-bottom: rgb(232, 232, 232) 1px solid;
}
</style>