<template>
    <div class="item">
        <div class="item_header">
            <div class="item_header_left">
                <div class="item_header_title">
                    <StartBtn 
                        @click="handleCheckChange"
                        :status="passAnalysisStatus"
                        :progress="passAnalysisProcess"
                    />
                    <el-select 
                        v-model="model_selected" 
                        multiple
                        clearable
                        collapse-tags
                        placeholder="请选择使用的模型"
                        popper-class="custom-header"
                        :max-collapse-tags="1"
                        style="width: 200px"
                        @change="handleSettingChange('model')"
                    >   
                        <template #header>
                            <el-checkbox
                                v-model="checkAll_model"
                                :indeterminate="indeterminate_model"
                                @change="handleCheckAll_model"
                            > All </el-checkbox>
                        </template>
                        <el-option 
                            v-for="item in modelOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                            :disabled="item.status == 0"
                        />
                    </el-select>
                    <el-select 
                        v-model="dataset_selected" 
                        multiple
                        clearable
                        collapse-tags
                        placeholder="请选择使用的数据集"
                        popper-class="custom-header"
                        :max-collapse-tags="1"
                        style="width: 200px"
                        @change="handleSettingChange('dataset')"
                    >   
                        <template #header>
                            <el-checkbox
                                v-model="checkAll_dataset"
                                :indeterminate="indeterminate_dataset"
                                @change="handleCheckAll_dataset"
                            > All </el-checkbox>
                        </template>
                        <el-option 
                            v-for="item in datasetOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </div>
                <div class="total_info">
                    <div class="info_item">
                        <span class="main_items">{{ total_data }}</span>
                        <span class="sub_items">条</span>
                    </div>
                    <div class="info_item">
                        <span class="main_items">{{ unprocessed }}</span>
                        <span class="sub_items">未处理</span>
                    </div>
                    <div class="info_item">
                        <span class="main_items">{{ analysisProgress }}</span>
                        <span class="sub_items">%</span>
                    </div>
                </div>
                <div class="progress_bar">
                    <el-progress 
                        :show-text="false" 
                        :stroke-width="8" 
                        :percentage="analysisProgress" 
                        :indeterminate="analysisStatus === 'processing'"
                        :color="customColorMethod"
                    />
                </div>
            </div>
            <div class="item_header_right">
                <div class="right_item">
                    <el-progress type="circle" 
                        :percentage="analysisStats.total > 0 
                        ? parseFloat((analysisStats.positive * 100 / analysisStats.total).toFixed(1)) : 0" 
                        status="success" :width="96"
                    >
                        <img src="@/assets/icons/happy.svg" alt="icon" style="width: 32px; height: 32px; color: green;" />
                    </el-progress>
                    <div class="circle_description">
                        <span>正面信息</span>
                        <span class="main_items">{{ analysisStats.positive }}</span>
                        <el-progress 
                            :stroke-width="5" 
                            :percentage="analysisStats.total > 0 
                            ? parseFloat((analysisStats.positive * 100 / analysisStats.total).toFixed(1)) : 0" 
                            :color="customColorMethod"
                            style="width: 120px;"
                        />
                    </div>
                </div>
                <div class="right_item">
                    <el-progress type="circle" 
                        :percentage="analysisStats.total > 0 
                        ? parseFloat((analysisStats.neutral * 100 / analysisStats.total).toFixed(1)) : 0" 
                        status="warning" :width="96"
                    >
                        <img src="@/assets/icons/smile.svg" alt="icon" style="width: 32px; height: 32px; color: brown;" />
                    </el-progress>
                    <div class="circle_description">
                        <span>中性信息</span>
                        <span class="main_items">{{ analysisStats.neutral }}</span>
                        <el-progress 
                            :stroke-width="5" 
                            :percentage="analysisStats.total > 0 
                            ? parseFloat((analysisStats.neutral * 100 / analysisStats.total).toFixed(1)) : 0" 
                            :color="customColorMethod"
                            style="width: 120px;"
                        />
                    </div>
                </div>
                <div class="right_item">
                    <el-progress type="circle"                             
                        :percentage="analysisStats.total > 0 
                        ? parseFloat((analysisStats.negative * 100 / analysisStats.total).toFixed(1)) : 0"  
                        status="exception" :width="96"
                    >
                        <img src="@/assets/icons/sad.svg" alt="icon" style="width: 32px; height: 32px; color: red;" />
                    </el-progress>
                    <div class="circle_description">
                        <span>负面信息</span>
                        <span class="main_items">{{ analysisStats.negative }}</span>
                        <el-progress 
                            :stroke-width="5" 
                            :percentage="analysisStats.total > 0 
                            ? parseFloat((analysisStats.negative * 100 / analysisStats.total).toFixed(1)) : 0"  
                            :color="customColorMethod"
                            style="width: 120px;"
                        />
                    </div>
                </div>
                <div class="right_item">
                    <el-progress type="circle" :percentage="0" status="success" :width="96">
                        <img src="@/assets/icons/alert.svg" alt="icon" style="width: 32px; height: 32px; color: green;" />
                    </el-progress>
                    <div class="circle_description">
                        <span>预警信息</span>
                        <span class="main_items">0</span>
                        <el-progress 
                            :stroke-width="5" 
                            :percentage="0" 
                            :color="customColorMethod"
                            style="width: 120px;"
                        />
                    </div>
                </div>
            </div>
        </div>
        <div class="chart_list">
            <LineChart :content="passLineChartData"></LineChart>
            <div class="chart_list_row">
                <MapChart :mapData="passMapChartData"></MapChart>
                <RankingBoard header_content="媒体活跃度排名" :ranking_data="passAuthorActivityData"></RankingBoard>
            </div>
            <div class="chart_list_row">
                <PieChart header_content="数据来源分布" :pieData="passDistributionSource"></PieChart>
                <PieChart header_content="数据站点分布" :pieData="passDistributionStation"></PieChart>
            </div>
            <div class="chart_list_row">
                <WordCloud :wordCloudData="passWordCloudData"></WordCloud>
                <RankingBoard header_content="高频词指数" :ranking_data="passRankingWord"></RankingBoard>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import LineChart from './trendLine.vue'
import MapChart from './map.vue'
import axios from '@/api/axios';
import StartBtn from '@/components/button/StartBtn.vue'
import PieChart from '@/components/charts/statisticsPie.vue'
import type { CheckboxValueType } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import RankingBoard from './RankingBoard.vue'
import { ElLoading } from 'element-plus'
import WordCloud from '@/components/charts/wordCloud.vue'
import { useStore } from '@/store';
import { useRoute } from 'vue-router'

export default {
    
    name: 'DataChart',

    data() {
        return {
            model_selected: [],
            dataset_selected: [],

            LineChartData: null,
            modelOptions: [],
            datasetOptions: [],

            isChecked: false,
            analysisStatus: 'start',
            analysisProgress: null,
            unprocessed: 0,
            intervalId: null, // 存储定时器ID

            checkAll_model: false,
            indeterminate_model: false,
            checkAll_dataset: false,
            indeterminate_dataset: false,
            analysisStats: {
                total: 0,
                positive: 0,
                neutral: 0,
                negative: 0
            },

            datasetStats: {
                map: [],
                ranking_author: [],
                distribution_source: [],
                distribution_station: [],
                wordCloudData: [],
                ranking_word: [],
            },

            total_data: 0,

            statusTimer: null,

            store: useStore(),

            group: null,
        }
    },

    computed: {
        passLineChartData() {
            return this.LineChartData
        },

        passMapChartData() {
            return this.datasetStats.map
        },

        passAuthorActivityData() {
            const field = ['name', 'auth_type', 'ip', 'value']
            this.datasetStats.ranking_author.field = field

            return this.datasetStats.ranking_author
        },

        passDistributionSource() {
            return this.datasetStats.distribution_source
        },

        passDistributionStation() {
            return this.datasetStats.distribution_station
        },

        passWordCloudData() {
            return this.datasetStats.wordCloudData
        },

        passRankingWord() {
            const title =  ['高频词', '趋势', '频次', '指数']
            const field = ['name', 'trend', 'value', 'ratio']

            if (!this.datasetStats || !this.datasetStats.wordCloudData) {
                return {
                    content: [],
                    title: title,
                };
            }

            // 取前 15 个最高频词
            let rankingWord = this.datasetStats.wordCloudData.slice(0, 15);

            // 计算所有词频的总和
            let total = rankingWord.reduce((sum, item) => sum + item.value, 0);

            // 计算占比并添加 `ratio` 字段
            rankingWord = rankingWord.map(item => ({
                ...item,
                ratio: total > 0 ? (item.value / total * 100).toFixed(2) + "%" : "0.00%",
                trend: 'Uptrend'
            }));

            return {
                content: rankingWord,
                title: title,
                field: field,
            }
        },

        passAnalysisStatus() {
            return this.analysisStatus
        },

        passAnalysisProcess() {
            return this.analysisProgress
        }
    },

    components: {
        LineChart,
        MapChart,
        RankingBoard,
        StartBtn,
        Check,
        PieChart,
        WordCloud,
    },

    watch: {
        group: {
            immediate: true,
            handler: async function (newGroup, oldGroup) {
                if (oldGroup && oldGroup.id !== newGroup.id) {
                    await this.setGroupStatus(oldGroup.id)
                }

                if (newGroup && Object.keys(newGroup).length > 0 && JSON.stringify(newGroup) !== JSON.stringify(oldGroup)) {
                    this.fetchGroupStatus()
                    this.fetchDatasetStats()
                }
            },
            deep: true
        },

        model_selected: {
            handler: function (newVal) {
                const total = this.modelOptions.filter(option => option.status != 0).length

                if (newVal.length === 0) {
                    this.checkAll_model = false
                    this.indeterminate_model = false
                } else if (newVal.length === total) {
                    this.checkAll_model = true
                    this.indeterminate_model = false
                } else {
                    this.indeterminate_model = true
                }
            }
        },

        dataset_selected: {
            handler: function (newVal) {
                const total = this.datasetOptions.length

                if (newVal.length === 0) {
                    this.checkAll_dataset = false
                    this.indeterminate_dataset = false
                } else if (newVal.length === total) {
                    this.checkAll_dataset = true
                    this.indeterminate_dataset = false
                } else {
                    this.indeterminate_dataset = true
                }
            }
        },

        analysisProgress: {
            handler: function (newVal, oldVal) {
                if (newVal && oldVal != null) {
                    this.fetchAnalysisResult()
                }
            }
        },

        isChecked: {
            handler: function (newVal, oldVal) {
                if (newVal && !oldVal) {
                    this.analysisStatus = 'processing'
                    this.checkGroupStatus()
                } 

                if (!newVal && oldVal) {
                    this.analysisStatus = 'start'
                }
            }
        },
    },

    methods: {
        async fetchGroupInfo(groupId: Number) {
            const link = `/application/groups/${groupId}`;
            axios.post(link).then((response) => {
                this.group = response.data;
            }).catch((error) => {
                console.error(error);
            });
        },

        handleCheckChange () {
            if (this.group.default && this.store.state.user_perms !== 'administrator') {
                this.$message.error('当前用户没有权限操作默认应用')
                
                return
            }
            this.isChecked = !this.isChecked
        },
        handleCheckAll_model(val: CheckboxValueType) {
            this.indeterminate_model = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.model_selected = this.modelOptions
                .filter(option => option.status != 0)
                .map(option => option.value);
            } else {
                this.model_selected = [];
            }
            this.fetchAnalysisResult()
        },

        handleCheckAll_dataset(val: CheckboxValueType) {
            this.indeterminate_dataset = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.dataset_selected = this.datasetOptions
                .map(option => option.value);
            } else {
                this.dataset_selected = [];
            }
            this.fetchAnalysisResult()
            this.fetchDatasetStats()
        },

        handleSettingChange(mode: string) {
            this.fetchAnalysisResult()
            if (mode === 'dataset') {
                this.fetchDatasetStats()
            }
        },

        async checkGroupStatus() {
            // 示例：调用接口检查任务状态
            if (this.isChecked) {
                axios.post(`/application/groups/${this.group.id}/checkGroupStatus`, {
                    model_list: this.model_selected
                }).then(response => {
                    // 处理响应数据，更新进度等
                    this.unprocessed = response.data.unprocessed;
                    this.total_data = response.data.total;
                    this.analysisProgress = response.data.progress;

                    const group_status = response.data.status;
                    if (group_status === 'finished') {
                        this.analysisStatus = 'finished';
                        // 如果任务完成，每10分钟检查一次
                        this.setStatusTimer(600000);
                    } else {
                        this.analysisStatus = 'processing';
                        // 如果任务处理中，每10秒检查一次
                        this.setStatusTimer(10000);
                    }
                });
            }
        },

        setStatusTimer(delay) {
            // 清除之前的定时器
            if (this.statusTimer) {
                clearTimeout(this.statusTimer);
                this.statusTimer = null;
            }
            // 设定新的定时器，并保存引用
            this.statusTimer = setTimeout(() => {
                this.checkGroupStatus();
            }, delay);
        },

        async fetchDatasetStats() {
            const link = `/application/stats/dataset`;
            const requests = [
                { mode: 'map', target: 'map' },
                { mode: 'ranking_author', target: 'ranking_author' },
                { mode: 'distribution_station', target: 'distribution_station' },
                { mode: 'distribution_source', target: 'distribution_source' },
                { mode: 'word_frequency', target: 'wordCloudData' },
            ];
            
            try {
                const responses = await Promise.all(
                    requests.map(item => 
                        axios.post(link, {
                        group_id: this.group.id,
                        mode: item.mode,
                        dataset_ids: this.dataset_selected,
                        }, { timeout: 10000 })
                    )
                );
                
                responses.forEach((res, idx) => {
                    // 使用 requests 数组对应的 target 属性来设置 datasetStats
                    const target = requests[idx].target;
                    this.datasetStats[target] = res.data.response;
                });
                
            } catch (e) {
                this.$message.error(e);
            }
        },

        async fetchAnalysisResult () {
            const link = `/application/groups/${this.group.id}/analyze`

            const loadingAnalysisStats = ElLoading.service({
                target: '.item_header_right',
                text: '加载中...',
            })

            axios.post(link, {
                mode: 'trend_line',
                model_ids: this.model_selected,
                dataset_ids: this.dataset_selected,
            }, {
                timeout: 10000
            }).then((response) => {
                this.LineChartData = response.data.response
            }).catch((error) => {
                console.error(error)
            })

            axios.post(link, {
                mode: 'overall_stats',
                model_ids: this.model_selected,
                dataset_ids: this.dataset_selected,
            }, {
                timeout: 10000
            }).then((response) => {
                this.analysisStats = response.data.response
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                loadingAnalysisStats.close()
            });
        },

        async fetchGroupStatus() {

            const link = `/application/groups/${this.group.id}/status`
            axios.get(link).then((response) => {
                this.isChecked = response.data.checked
                this.unprocessed = response.data.unprocessed;
                this.total_data = response.data.total;
                this.analysisProgress = response.data.progress;

                this.modelOptions = response.data.available_models;
                this.model_selected = response.data.current_model;

                const all_available_datasets = response.data.available_datasets || []
                // 只保留 type === 'SOCIAL'
                this.datasetOptions = all_available_datasets
                    .filter(ds => ds.type_name === 'SOCIAL')
                    .map(ds => ({
                    label: ds.label,
                    value: ds.value
                    }))

                this.dataset_selected = response.data.current_dataset;

                this.fetchAnalysisResult()
                this.fetchDatasetStats()
            })
        },

        async setGroupStatus(groupVal) {
            if (this.group.default && this.store.state.user_perms !== 'administrator') return

            const gid = groupVal || this.group.id
            const link = `/application/groups/${gid}/status`
            const payload = {
                checked: this.isChecked,
                model_selected: this.model_selected,
                dataset_selected: this.dataset_selected
            }
            axios.post(link, payload).then((response) => {
                console.log(response.data.status)
            }).catch((e) => {
                console.error(e)
            })
        },

        customColorMethod (percentage: number) {
            if (percentage < 30) {
                return '#909399'
            }
            if (percentage < 70) {
                return '#e6a23c'
            }
            return '#67c23a'
        },
    },

    beforeUnmount() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.setGroupStatus();

        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }
    },

    mounted() {
        const route = useRoute()
        const groupId = Number(route.params.groupId)
        this.fetchGroupInfo(groupId)
    },
}
</script>

<style scoped>
.chart_list_row {
    height: 960px;
    width: 100%;

    background-color: #F5F7FA;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.circle_description {
    display: grid;
    grid-template-rows: 30px 1fr 20px;
    gap: 5px;
}

.circle_description .main_items {
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 24px;
    display: inline;
    vertical-align: bottom;
}

.circle_description .el_progress {
    height: 10px;
    width: 20px;
}

.right_item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
}

.percentage-value {
    display: block;
    margin-top: 10px;
    font-size: 28px;
}
.percentage-label {
    display: block;
    margin-top: 10px;
    font-size: 12px;
}

.total_info {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: end;
    gap: 20px;
}

.total_info .info_item {
    display: flex;
    flex-direction: row;
    gap: 5px;
}

.total_info .sub_items {
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 16px;
    height: 50px;
    line-height: 57px;
    display: inline;
    vertical-align: bottom;
}

.total_info .main_items {
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 30px;
    height: 50px;
    line-height: 50px;
    display: inline;
    vertical-align: bottom;
}

.progress_bar {
    width: 100%;
    height: auto;
}

.item_header_left {
    background-color: #ffffff;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 100%;
    box-sizing: border-box;
}

.item_header_right {
    background-color: #ffffff;
    padding: 20px;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    align-items: center;
    justify-items: center;
}

.item_header_title {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 30px;
    width: 100%;
}

.item_header {
    display: grid;
    grid-template-columns: 1fr 2fr;
    width: 100%;
    padding: 20px;
    gap: 20px;
    box-sizing: border-box;
}

.item {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    box-sizing: border-box;
    background-color: #F5F7FA;

    overflow: auto;
    scrollbar-width: none;
}

.item::-webkit-scrollbar {
  display: none;
}

.header {
    margin: 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    justify-content: space-between;
}

.chart_list {
    margin: 0 auto;
    display: flex;
    gap: 30px;
    box-sizing: border-box;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 20px;
    border-radius: 5px;
    /* height: calc(100% - 76px); */
    height: 100%;

    /* overflow: auto; */
}


</style>