<template>
    <div id="chart-area" class="disable-select">
        <div class="chart-title">
            <span class="title-text">情感分析数据走势</span>
            <div class="time_selector">
                <!-- 时间范围类型选择 -->
                <el-select
                    v-model="range_type"
                    @change="changeTimeRangeType"
                >
                    <el-option label="全部范围" value="all"></el-option>
                    <el-option label="按年统计" value="yearrange"></el-option>
                    <el-option label="按月统计" value="monthrange"></el-option>
                    <el-option label="按日统计" value="daterange"></el-option>
                </el-select>

                <!-- 时间选择器 -->
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
                        @change="handleFilterChange"
                        :disabled-date="disabledDate"
                        :unlink-panels="true"
                    />
                </div>

                <!-- 新增目标选择器 -->
                <el-select
                    v-model="selectedTargets"
                    multiple
                    clearable
                    collapse-tags
                    :max-collapse-tags="3"
                    filterable
                    placeholder="选择分析目标"
                    @change="handleFilterChange"
                    :filter-method="filterTargets"
                >
                    <template #header>
                        <el-checkbox
                            v-model="checkAll_words"
                            :indeterminate="indeterminate_words"
                            @change="handleCheckAll_words"
                        > 选择所有匹配目标，共 {{ filteredTargets.length }} 项</el-checkbox>
                    </template>
                    <el-option 
                        v-for="target in filteredTargets"
                        :key="target"
                        :label="target"
                        :value="target"
                    />
                </el-select>
            </div>
        </div>
        <div id="line-chart"></div>
    </div>
</template>

<script lang="ts">
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus'
import type { CheckboxValueType } from 'element-plus'

export default {
    name: 'LineChart',

    data() {
        return {
            checkAll_words: false,
            indeterminate_words: false,

            lineChart: null,
            rawData: {},       // 原始数据存储
            filteredData: {},  // 筛选后数据
            
            // 筛选相关状态
            selectedTargets: [],
            availableTargets: [],
            
            // 原有时间相关状态
            time_range: [new Date(), new Date()],
            time_range_default: [new Date(), new Date()],
            range_type: 'all',

            // 图表配置
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "cross" }
            },
            watchCharts: null,
            resizeTimeout: 0,
            loading: null,

            filterQuery: '',
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
                this.rawData = newValue;
                this.updateTargetOptions();
                this.handleFilterChange();
                
                if (newValue && Object.keys(newValue).length > 0) {
                    const dates = Object.keys(newValue);
                    const timestamps = dates.map(d => new Date(d).getTime());
                    const [minDate, maxDate] = [Math.min(...timestamps), Math.max(...timestamps)];
                    
                    this.time_range = [new Date(minDate), new Date(maxDate)];
                    this.time_range_default = [new Date(minDate), new Date(maxDate)];

                    this.loading?.close();
                }
            },
            deep: true
        },

        selectedTargets: {
            handler: function (newVal) {
                const total = this.filteredTargets.length

                if (newVal.length === 0) {
                    this.checkAll_words = false
                    this.indeterminate_words = false
                } else if (newVal.length === total) {
                    this.checkAll_words = true
                    this.indeterminate_words = false
                } else {
                    this.indeterminate_words = true
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
        this.watchCharts?.unobserve(document.getElementById('chart-area'));
    },

    computed: {
        filteredTargets() {
            if (!this.filterQuery) {
                // 如果没有输入，全部展示
                return this.availableTargets;
            }
            // 这里用简单的 “包含” 逻辑，你可以根据需求改成更复杂的匹配
            return this.availableTargets.filter((t) =>
                t.includes(this.filterQuery)
            );
        }
    },

    methods: {
        // 初始化图表
        initLineChart() {
            const chartDom = document.getElementById('line-chart');
            if (!chartDom) return console.error("找不到图表容器");

            this.lineChart = echarts.init(chartDom);
            const colors = ['#FF0000', '#FFA500', '#32CD32'];
            
            const baseOption = {
                legend: {
                    top: 12,
                    icon: "square",
                    itemWidth: 16,
                    textStyle: { fontSize: 16 }
                },
                grid: {
                    left: '2%',
                    right: '2%',
                    bottom: '10px',
                    top: '80px',
                    containLabel: true
                },
                xAxis: { type: 'category', data: [] },
                yAxis: { type: 'value' },
                series: colors.map(color => ({
                    type: 'line',
                    lineStyle: { color },
                    areaStyle: { color: echarts.color.modifyAlpha(color, 0.08) },
                    itemStyle: { color },
                    showSymbol: false,
                    smooth: true
                }))
            };

            this.lineChart.setOption(baseOption);
            this.setupResizeObserver();
        },

        filterTargets(query: string) {
            this.filterQuery = query;

            this.checkAll_words = false;
            this.indeterminate_words = false;
        },

        handleCheckAll_words(val: CheckboxValueType) {
            this.indeterminate_words = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.selectedTargets = this.filteredTargets.map(option => option);
            } else {
                this.selectedTargets = [];
            }
            this.handleFilterChange()
        },

        // 更新目标选项
        updateTargetOptions() {
            const targets = new Set();
            Object.values(this.rawData).forEach(dateData => {
                Object.keys(dateData).forEach(target => targets.add(target));
            });
            this.availableTargets = Array.from(targets);
            // 默认选中所有目标
            this.selectedTargets = [...this.availableTargets];
        },

        filterByTarget(data) {
            if (this.selectedTargets.length === 0) return {};
            
            return Object.keys(data).reduce((acc, date) => {
                acc[date] = this.selectedTargets.reduce((targetAcc, target) => {
                    if (data[date][target]) targetAcc[target] = data[date][target];
                    return targetAcc;
                }, {});
                return acc;
            }, {});
        },
        // 统一处理筛选变化
        handleFilterChange() {
            const timeFiltered = this.filterByDate();
            this.filteredData = this.filterByTarget(timeFiltered);
            this.updateChartData();
        },

        // 时间范围筛选
        filterByDate() {
            if (!this.time_range || this.time_range.length !== 2) return this.rawData;
            
            const [start, end] = this.time_range.map(d => d.getTime());
            return Object.keys(this.rawData).reduce((acc, date) => {
                const timestamp = new Date(date).getTime();
                if (timestamp >= start && timestamp <= end) {
                    acc[date] = this.rawData[date];
                }
                return acc;
            }, {});
        },

        // 更新图表数据
        updateChartData() {
            const dates = Object.keys(this.filteredData).sort();
            const activeTargets = this.selectedTargets.length > 0 
                ? this.selectedTargets 
                : this.availableTargets;

            const seriesData = {
                negative: [],
                neutral: [],
                positive: []
            };

            dates.forEach(date => {
                const sum = activeTargets.reduce((acc, target) => ({
                    negative: acc.negative + (this.filteredData[date][target]?.negative || 0),
                    neutral: acc.neutral + (this.filteredData[date][target]?.neutral || 0),
                    positive: acc.positive + (this.filteredData[date][target]?.positive || 0)
                }), { negative: 0, neutral: 0, positive: 0 });

                seriesData.negative.push(sum.negative);
                seriesData.neutral.push(sum.neutral);
                seriesData.positive.push(sum.positive);
            });

            this.lineChart.setOption({
                xAxis: { data: dates },
                series: [
                    { name: '负面情绪', data: seriesData.negative },
                    { name: '中立情绪', data: seriesData.neutral },
                    { name: '正面情绪', data: seriesData.positive }
                ]
            });
        },

        // 原有时间处理方法
        changeTimeRangeType() {
            if (this.range_type === 'all') {
                this.time_range = [...this.time_range_default];
                this.handleFilterChange();
            }
        },

        disabledDate(date: Date) {
            const [min, max] = this.time_range_default;
            return date < min || date > max;
        },

        // 图表自适应
        setupResizeObserver() {
            this.watchCharts = new ResizeObserver(() => {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => this.lineChart?.resize(), 100);
            });
            this.watchCharts.observe(document.getElementById('line-chart'));
        }
    }
}
</script>

<style scoped lang="scss">
#line-chart {
    width: 100%;
    height: 40vh;
    box-sizing: border-box;
}

#chart-area {
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    background-color: #ffffff;
    border-radius: 5px;
}

.chart-title {
    display: grid;
    grid-template-columns: 200px 1fr;
    align-items: center;
    gap: 30px;
    font-size: 22px;
}

.time_selector {
    display: grid;
    grid-template-columns: 120px 360px 1fr; /* 新增目标选择器列 */
    align-items: center;
    gap: 20px;
}

.date-box {
    width: 100%;
    display: flex;
}

/* 优化选择器间距 */
.el-select + .el-select {
    margin-left: 10px;
}

.title-text {
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 22px;
    box-sizing: border-box;
}
</style>