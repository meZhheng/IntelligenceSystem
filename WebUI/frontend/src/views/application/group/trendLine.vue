<template>
    <div id="chart-area" class="disable-select">
        <div class="chart-title">
            <span>情感分析数据走势</span>
            <div class="time_selector">
                <el-select
                    v-model="range_type"
                    @change="changeTimeRangeType"
                >
                    <el-option label="全部范围" value="all"></el-option>
                    <el-option label="按年统计" value="yearrange"></el-option>
                    <el-option label="按月统计" value="monthrange"></el-option>
                    <el-option label="按日统计" value="daterange"></el-option>
                </el-select>
                <div class="date-box">
                    <el-date-picker
                        v-model="time_range"
                        :type="range_type === 'all' ? 'daterange' : range_type"
                        is-range
                        arrow-control
                        range-separator="到"
                        start-placeholder="开始时间"
                        end-placeholder="结束时间"
                        :readonly="range_type === 'all'"
                        class="date-input"
                        @change="filterDataByDate"
                        :disabled-date="disabledDate"
                        :unlink-panels="true"
                    />
                </div>
            </div>
        </div>
        <div id="line-chart"></div>
    </div>
</template>

<script lang="ts">
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus'

export default {
    name: 'LineChart',

    data() {
        return {
            lineChart: null,

            tooltip: {
                trigger: "axis",
                // 指示器样式配置
                axisPointer: {
                    type: "cross", // 默认为直线，可选为：'line' | 'shadow' | 'cross'
                },
            },

            watchCharts: null,
            resizeTimeout: 0,

            loading: null,

            time_range: [new Date(), new Date()],
            time_range_default: [new Date(), new Date()],

            range_type: 'all',
        }
    },

    props: {
        content: {
            type: Object,
            required: false,
            default: () => ({})
        },
    },

    watch: {
        content: {
            handler: function (newValue) {
                this.updateChart(newValue)
                if (newValue && Object.keys(newValue).length > 0) {
                    
                    const dateStrings = Object.keys(newValue);
                    const dates = dateStrings.map(ds => new Date(ds));
                    const minTimestamp = Math.min(...dates.map(d => d.getTime()));
                    const maxTimestamp = Math.max(...dates.map(d => d.getTime()));

                    this.time_range = [new Date(minTimestamp), new Date(maxTimestamp)]
                    this.time_range_default = [new Date(minTimestamp), new Date(maxTimestamp)]

                    if(this.loading) {
                        this.loading.close();
                        this.loading = null;
                    }
                }
            },
            deep: true
        },
    },

    mounted() {
        this.$nextTick().then(() => {
            this.initLineChart();

            this.loading = ElLoading.service({
                target: '#chart-area',
                text: '加载中...',
            });
        });
    },

    beforeUnmount() {
        if (this.watchCharts) {
            const chartArea = document.getElementById('chart-area');
            this.watchCharts.unobserve(chartArea);
        }
    },

    methods: {
        changeTimeRangeType() {
            if (this.range_type === 'all') {
                this.time_range = [new Date(this.time_range_default[0]), new Date(this.time_range_default[1])]
                this.filterDataByDate()
            } 
        },
        disabledDate(date: Date) {
            if (this.time_range_default.length === 2) {
                const [minDate, maxDate] = this.time_range_default;
                return date < minDate || date > maxDate;
            }
            return false;
        },
        initLineChart() {
            const lineChartDom = document.getElementById('line-chart');
            if (lineChartDom) {
                this.lineChart = echarts.init(lineChartDom);
                // 这里可以继续设置图表配置


            } else {
                console.error("无法找到 id 为 'line-chart' 的 DOM 元素");
            }

            const neg_color = '#FF0000';
            const neu_color = '#FFA500';
            const pos_color = '#32CD32';

            const lineOption = {
                legend: {
                    top: 12, // 定位，和副标题一排
                    icon: "square", // 图例形状
                    itemWidth: 16, // 图例标记的图形宽度
                    itemHeight: 16, // 图例标记的图形高度
                    itemGap: 16, // 图例每项之间的间隔
                    itemStyle: {}, // 图例的图形样式
                    textStyle: {
                        // 图例文字属性
                        fontSize: 16,
                        height: 14,
                        color: "#333",
                        padding: [0, 0, 0, 1], // 修改文字和图标距离
                        rich: {
                            a: {
                                verticalAlign: 'middle',
                            },
                        }
                    },
                    data: ['负面情绪', '中立情绪', '正面情绪'],
                },

                grid: {
                    left: '2%',
                    right: '2%',
                    bottom: '10px',
                    top: '80px',
                    containLabel: true
                },

                tooltip: this.tooltip,

                xAxis: {
                    type: 'category',
                    axisLabel: {
                        showMinLabel: true, // 显示最小标签
                        showMaxLabel: true, // 显示最大标签
                    },
                    data: []
                },
                yAxis: {
                    type: 'value',
                    splitLine: {
                        // show: false,  // 隐藏背景横向网格线
                    }
                },
                series: [
                    {   
                        name: '负面情绪',
                        data: [],
                        type: 'line',
                        lineStyle:{
                            color: neg_color,
                        },
                        areaStyle: {
                            color: echarts.color.modifyAlpha(neg_color, 0.08), // 区域背景色
                        },
                        itemStyle: {
                            color: neg_color,
                        },
                        showSymbol: false, // 只有在 tooltip hover 的时候显示
                        symbol: "emptyCircle", // 拐点形状
                        symbolSize: 6, //拐点大小
                        smooth: true, // 是否平滑曲线
                    },
                    {   
                        name: '中立情绪',
                        data: [],
                        type: 'line',
                        lineStyle:{
                            color: neu_color,
                        },
                        areaStyle: {
                            color: echarts.color.modifyAlpha(neu_color, 0.08), // 区域背景色
                        },
                        itemStyle: {
                            color: neu_color,
                        },
                        showSymbol: false, // 只有在 tooltip hover 的时候显示
                        symbol: "emptyCircle", // 拐点形状
                        symbolSize: 6, //拐点大小
                        smooth: true, // 是否平滑曲线
                    },
                    {   
                        name: '正面情绪',
                        data: [],
                        type: 'line',
                        lineStyle:{
                            color: pos_color,
                        },
                        areaStyle: {
                            color: echarts.color.modifyAlpha(pos_color, 0.08), // 区域背景色
                        },
                        itemStyle: {
                            color: pos_color,
                        },
                        showSymbol: false, // 只有在 tooltip hover 的时候显示
                        symbol: "emptyCircle", // 拐点形状
                        symbolSize: 6, //拐点大小
                        smooth: true, // 是否平滑曲线
                    }
                ]
            };

            const chartsPromise = new Promise<void>((resolve) => {
                this.lineChart.on("finished", () => {
                    resolve(); // 把执行结果抛出去
                });

                if (lineOption && typeof lineOption === 'object') {
                    this.lineChart.setOption(lineOption);
                }
            });

            chartsPromise.then(() => {
                const chartArea = document.getElementById('line-chart');
                if (chartArea) {
                    // 创建 ResizeObserver 并保存到实例属性中
                    this.watchCharts = new ResizeObserver(() => {
                        this.resizeChart();
                    });
                    this.watchCharts.observe(chartArea);
                } else {
                    console.error("找不到 id 为 'line-chart' 的元素");
                }
            });
        },

        updateChart(lineChartData: Object) {
            if (this.lineChart) {
                const dates = Object.keys(lineChartData).sort();

                // 处理情绪数据
                const negativeData = dates.map(date => lineChartData[date]?.negative || 0);
                const neutralData = dates.map(date => lineChartData[date]?.neutral || 0);
                const positiveData = dates.map(date => lineChartData[date]?.positive || 0);

                const neg_color = '#FF0000';
                const neu_color = '#FFA500';
                const pos_color = '#32CD32';

                const lineOption = {
                    legend: {
                        top: 12, // 定位，和副标题一排
                        icon: "square", // 图例形状
                        itemWidth: 16, // 图例标记的图形宽度
                        itemHeight: 16, // 图例标记的图形高度
                        itemGap: 10, // 图例每项之间的间隔
                        itemStyle: {}, // 图例的图形样式
                        textStyle: {
                            // 图例文字属性
                            fontSize: 16,
                            color: "#333",
                            padding: [0, 0, 0, 1], // 修改文字和图标距离
                        },
                        data: ['负面情绪', '中立情绪', '正面情绪'],
                    },

                    grid: {
                        left: '2%',
                        right: '2%',
                        bottom: '10px',
                        top: '80px',
                        containLabel: true
                    },

                    tooltip: this.tooltip,

                    xAxis: {
                        type: 'category',
                        axisLabel: {
                            interval: 'auto',
                        },
                        data: dates,
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: {
                            // show: false,  // 隐藏背景横向网格线
                        },
                    },
                    series: [
                        {   
                            name: '负面情绪',
                            data: negativeData,
                            type: 'line',
                            lineStyle:{
                                color: neg_color,
                            },
                            areaStyle: {
                                color: echarts.color.modifyAlpha(neg_color, 0.08), // 区域背景色
                            },
                            itemStyle: {
                                color: neg_color,
                            },
                            showSymbol: false, // 只有在 tooltip hover 的时候显示
                            symbol: "emptyCircle", // 拐点形状
                            symbolSize: 6, //拐点大小
                            smooth: true, // 是否平滑曲线
                        },
                        {   
                            name: '中立情绪',
                            data: neutralData,
                            type: 'line',
                            lineStyle:{
                                color: neu_color,
                            },
                            areaStyle: {
                                color: echarts.color.modifyAlpha(neu_color, 0.08), // 区域背景色
                            },
                            itemStyle: {
                                color: neu_color,
                            },
                            showSymbol: false, // 只有在 tooltip hover 的时候显示
                            symbol: "emptyCircle", // 拐点形状
                            symbolSize: 6, //拐点大小
                            smooth: true, // 是否平滑曲线
                        },
                        {   
                            name: '正面情绪',
                            data: positiveData,
                            type: 'line',
                            lineStyle:{
                                color: pos_color,
                            },
                            areaStyle: {
                                color: echarts.color.modifyAlpha(pos_color, 0.08), // 区域背景色
                            },
                            itemStyle: {
                                color: pos_color,
                            },
                            showSymbol: false, // 只有在 tooltip hover 的时候显示
                            symbol: "emptyCircle", // 拐点形状
                            symbolSize: 6, //拐点大小
                            smooth: true, // 是否平滑曲线
                        }
                    ]
                };

                this.lineChart.setOption(lineOption)
            }
        },

        resizeChart() {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                if (this.lineChart) {
                    this.lineChart.resize();
                }
            }, 100);
        },

        filterDataByDate() {
            // 如果时间范围未选择或格式不对，直接返回
            if (!this.time_range || this.time_range.length !== 2) {
                return;
            }

            let filtered = {};
            
            if (this.range_type === 'yearrange') {
                // 只比较年份
                const startYear = new Date(this.time_range[0]).getFullYear();
                const endYear = new Date(this.time_range[1]).getFullYear();
                
                Object.keys(this.content).forEach(dateStr => {
                const year = new Date(dateStr).getFullYear();
                if (year >= startYear && year <= endYear) {
                    filtered[dateStr] = this.content[dateStr];
                }
                });
            } else if (this.range_type === 'monthrange') {
                // 比较年份和月份
                const startDate = new Date(this.time_range[0]);
                const endDate = new Date(this.time_range[1]);
                const startVal = startDate.getFullYear() * 100 + startDate.getMonth();
                const endVal = endDate.getFullYear() * 100 + endDate.getMonth();

                Object.keys(this.content).forEach(dateStr => {
                const d = new Date(dateStr);
                const val = d.getFullYear() * 100 + d.getMonth();
                if (val >= startVal && val <= endVal) {
                    filtered[dateStr] = this.content[dateStr];
                }
                });
            } else {  // daterange 或其他默认模式
                const start = new Date(this.time_range[0]);
                const end = new Date(this.time_range[1]);

                Object.keys(this.content).forEach(dateStr => {
                    const d = new Date(dateStr);
                    if (d >= start && d <= end) {
                        filtered[dateStr] = this.content[dateStr];
                    }
                });
            }
            
            console.log(filtered)
            this.updateChart(filtered)
        }
    }
}
</script>

<style scoped>
#line-chart {
    width: 100%;
    height: 40vh;
    box-sizing: border-box;
}

#chart-area {
    width: 100%;
    height: auto;
    box-sizing: border-box;
    padding: 20px;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    border-radius: 5px;
}

.chart-title {
    margin: 0 auto;
    display: grid;
    grid-template-columns: 200px 500px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 22px;
    gap: 50px;
}

.time_selector {
    display: grid;
    grid-template-columns: 120px 360px;
    align-items: center;
    box-sizing: border-box;
    gap: 20px;
}

.date-box {
    width: 100%;
    display: flex;
}

</style>