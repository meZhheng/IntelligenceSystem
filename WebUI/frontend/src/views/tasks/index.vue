<template>
    <div id="box">
        <div class="header">
            <h2>后台任务</h2>
            <div>
                <el-input
                    style="width: 360px; height: 40px; margin-right: 20px;"
                    placeholder="搜索任务"
                    :prefix-icon="Search"
                />
                <el-button type="primary" :icon="Plus" @click="dialogFormVisible = true" style="height: 40px; width: 120px;">
                    创建任务
                </el-button>
            </div>
        </div>
        <div class="content">
            <div class="task-row">
                <div class="task-header">
                    <span class="title"><span style="color: black;">推理任务</span>（{{ inference_tasks.length }}）</span>
                    <span class="title">创建时间</span>
                    <span class="title">进度</span>
                    <span class="title">状态</span>
                    <span></span>
                </div>
                <div v-for="item in inference_tasks" :key="item.id">
                    <div class="task-card" >
                        <span>{{ item.name }}</span>
                        <span>{{ formatDateTime(item.timestamp) }}</span>
                        <div class="progress">
                            <el-progress :text-inside="true" :stroke-width="18" :percentage="item.progress" :color="customColorMethod"/>
                        </div>
                        <div class="task-status">
                            <span>{{ item.status }}</span>
                        </div>
                        <div class="more-icon" :size="20">
                            <el-dropdown 
                                placement="top-end" 
                                trigger="click" 
                                @command="(command) => handleTaskDelete(command, item.id)"
                            >
                                <el-icon><MoreFilled /></el-icon>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item :icon="Delete" command="delete">删除</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </div>
                </div>
            </div>
            <div class="task-row">
                <div class="task-header">
                    <span class="title"><span style="color: black;">训练任务</span>（{{ train_tasks.length }}）</span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div v-for="item in train_tasks" :key="item.id">
                    <div class="task-card" >
                        <span>{{ item.name }}</span>
                        <span>{{ formatDateTime(item.timestamp) }}</span>
                        <div class="progress">
                            <el-progress :text-inside="true" :stroke-width="18" :percentage="item.progress" :color="customColorMethod"/>
                        </div>
                        <div class="task-status">
                            <span>{{ item.status }}</span>
                        </div>
                        <div class="more-icon" :size="20">
                            <el-dropdown 
                                placement="top-end" 
                                trigger="click" 
                                @command="(command) => handleTaskDelete(command, item.id)"
                            >
                                <el-icon><MoreFilled /></el-icon>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item :icon="Delete" command="delete">删除</el-dropdown-item>
                                        <el-dropdown-item command="show">展示</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </div>
                    <div v-if="visibleCharts[item.id]" class="task-chart">
                        <TaskChart :task_id="item.id" :content="item.result.loss" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <el-dialog v-model="dialogFormVisible" width="500px" label-width="auto" :show-close="false">
        <template #header="{ titleId, titleClass }">
            <span class="title" style="color: black;" :id="titleId" :class="titleClass">
                创建一个
                <el-segmented v-model="task_type_value" :options="task_type_options" />
                任务
            </span>
        </template>
        <el-form :model="form" :rules="rules">
            <el-form-item label="任务名称" prop="name">
                <el-input v-model="form.name" autocomplete="off" placeholder="请输入任务名称" maxlength="15" show-word-limit />
            </el-form-item>
            <el-form-item label="任务描述" prop="description">
                <el-input
                    v-model="form.description"
                    maxlength="100"
                    :autosize="{ minRows: 3, maxRows: 5 }"
                    style="width: 390px"
                    placeholder="请输入任务描述"
                    show-word-limit
                    type="textarea"
                    resize="none"
                />
            </el-form-item>
            <el-form-item label="任务类型" prop="type">
                <el-select v-model="form.type" placeholder="请选择任务类型" @change="changeTaskType">
                    <el-option label="情感分析" value="EmotionDatasetBase" />
                    <el-option label="立场检测" value="stance" />
                </el-select>
            </el-form-item>
            <el-form-item label="数据选择" prop="dataset">
                <el-select v-model="form.dataset" placeholder="请选择使用的数据集" @visible-change="fetchDataset" :loading="loading" :disabled="disabled">
                    <el-option 
                        v-for="item in datasetOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                    <template #loading>
                        <el-icon class="is-loading">
                            <svg class="circular" viewBox="0 0 20 20">
                            <g
                                class="path2 loading-path"
                                stroke-width="0"
                                style="animation: none; stroke: none"
                            >
                                <circle r="3.375" class="dot1" rx="0" ry="0" />
                                <circle r="3.375" class="dot2" rx="0" ry="0" />
                                <circle r="3.375" class="dot4" rx="0" ry="0" />
                                <circle r="3.375" class="dot3" rx="0" ry="0" />
                            </g>
                            </svg>
                        </el-icon>
                    </template>
                </el-select>
            </el-form-item>
            <el-form-item label="模型选择" prop="model">
                <el-select v-model="form.model" placeholder="请选择使用的模型" @visible-change="fetchModel" :loading="loading" :disabled="disabled">
                    <el-option 
                        v-for="item in modelOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                        :disabled="item.status == 0"
                    />
                    <template #loading>
                        <el-icon class="is-loading">
                            <svg class="circular" viewBox="0 0 20 20">
                            <g
                                class="path2 loading-path"
                                stroke-width="0"
                                style="animation: none; stroke: none"
                            >
                                <circle r="3.375" class="dot1" rx="0" ry="0" />
                                <circle r="3.375" class="dot2" rx="0" ry="0" />
                                <circle r="3.375" class="dot4" rx="0" ry="0" />
                                <circle r="3.375" class="dot3" rx="0" ry="0" />
                            </g>
                            </svg>
                        </el-icon>
                    </template>
                </el-select>
            </el-form-item>
        </el-form>
        <template #footer>
        <div class="dialog-footer">
            <el-button @click="handleClose">取消</el-button>
            <el-button type="primary" @click="handleSummit">
            确认
            </el-button>
        </div>
        </template>
    </el-dialog>
</template>

<style scoped>
    #box {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0 auto;
        padding: 20px;
    }

    .header {
        margin: 0 auto;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .content {
        margin: 0 auto;
        display: flex;
        flex: 1;
        gap: 50px;
        box-sizing: border-box;
        flex-direction: column;
        align-items: center;
        width: 100%;
        background-color: #F5F7FA;
        padding: 30px 20px;
        border-radius: 5px;
    }

    .task-row {
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 100%;
    }

    .task-header {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 200px 1fr 80px 20px;
        gap: 30px;
        box-sizing: border-box;
        align-items: center;
        padding: 0 10px;
    }

    h3 {
        margin: 0;
    }

    .title {
        font-family: 'Microsoft YaHei';
        font-weight: bold;
        color: rgb(177.3, 179.4, 183.6);
    }

    .task-card {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 200px 1fr 80px 20px;
        gap: 30px;
        box-sizing: border-box;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        min-height: 50px;
        background-color: #ffffff;
        border-radius: 8px;
        padding: 0 10px;
    }

    .task-status {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .dialog-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }

    .el-segmented {
        --el-segmented-item-selected-color: var(--el-text-color-primary);
        --el-segmented-item-selected-bg-color: #ffd100;
        --el-border-radius-base: 16px;
        font-size: 18px;
    }

    .more-icon {
        transform: rotate(90deg); /* 旋转 90° */
        cursor: pointer; /* 鼠标悬停时变成手型 */
        display: inline-block; /* 确保旋转生效 */
        transition: transform 0.2s ease-in-out; /* 添加动画效果 */
    }

    .more-icon:hover {
        transform: rotate(90deg) scale(1.1); /* 悬停时稍微放大 */
    }

    .task-chart {
        width: 100%;
        box-sizing: border-box;
        background-color: #ffffff;
        border-radius: 8px;
        margin-top: 2px;
    }

</style>

<script setup lang="ts">
    import {
        Plus,
        Search,
    } from '@element-plus/icons-vue'
</script>

<script lang="ts">
    import { ElMessageBox, SIZE_INJECTION_KEY } from 'element-plus'
    import axios from '@/api/axios'
    import { formatDateTime } from '@/utils/date'
    import TaskChart from '@/components/TaskChart.vue';
    import { Delete } from '@element-plus/icons-vue'
    
    export default {
        name: 'Task',

        components: {
            TaskChart,
            Delete,
        },

        data() {
            return {
                dialogFormVisible: false,
                inference_tasks: [],
                train_tasks: [],
                form: {
                    name: '',
                    description: '',
                    type: '',
                    dataset: '',
                    model: '',
                },

                dataset_selected: false,
                datasetOptions: [],
                model_selected: false,
                modelOptions: [],

                loading: false,

                disabled: true,

                rules: {
                    name: [{ required: true, message: '请输入任务名称！', trigger: 'blur' }],
                    description: [{ required: true, message: '请输入任务描述！', trigger: 'blur' }],
                    type: [{ required: true, message: '请选择任务类型！', trigger: 'blur' }],
                    dataset: [{ required: true, message: '请选择使用的数据集！', trigger: 'blur' }],
                    model: [{ required: true, message: '请选择使用的模型！', trigger: 'blur' }],
                },

                task_type_value: '推理',
                task_type_options: ['推理', '训练'],

                visibleCharts: {}
            }
        },

        methods: {
            async handleTaskDelete (command: string|number|object, task_id: string) {
                console.log(command, task_id)
                const link = `/task/delete`
                const payload = {
                    task_id: task_id,
                }

                axios.post(link, payload).then((response) => {
                    this.$message.success(response.data.message)
                    this.flush_tasks()
                }).catch((e) => {

                    this.$message.error(e.response.data.message)
                })
            },

            handleClose(done: Function) {
                ElMessageBox.confirm('确定要关闭对话框吗？数据将不会得到保存')
                .then(() => {
                    this.dialogFormVisible = false;
                    done()
                })
                .catch(() => {
                    // catch error
                })
            },

            toggleChartVisibility(taskId: number) {
                if (this.visibleCharts[taskId] === undefined) {
                    this.visibleCharts[taskId] = true; // 初次点击时，显示
                } else {
                    this.visibleCharts[taskId] = !this.visibleCharts[taskId]; // 取反
                }
            },

            changeTaskType(value: string) {
                console.log(value)
                if (value) {
                    this.disabled = false;
                } else {
                    this.disabled = true;
                }
            },
            async fetchDataset(visible: boolean) {
                if ((!this.dataset_selected && visible) || (this.datasetOptions.length == 0)) {
                    this.loading = true
                    this.dataset_selected = true;
                    try {
                        const response = await axios.post(`/datasets`, {
                            dataset_type: this.form.type
                        }, {
                            timeout: 10000 // 设置超时时间为10秒
                        });

                        this.datasetOptions = response.data;
                        this.loading = false
                    } catch (error) {
                        console.error('Failed to fetch datasets:', error);
                        this.loading = false
                    }
                }
            },
            async fetchModel(visible: boolean) {
                if ((!this.model_selected && visible) || (this.modelOptions.length == 0)) {
                    this.loading = true
                    this.model_selected = true;
                    try {
                        const response = await axios.post(`/models`, {
                            task_type: this.form.type
                        }, {
                            timeout: 10000 // 设置超时时间为5秒
                        });
                        this.modelOptions = response.data;
                        this.loading = false
                    } catch (error) {
                        console.error('Failed to fetch models:', error);
                        this.loading = false
                    }
                }
            },

            handleSummit(e) {
                const path = '/task/create'
                const payload = {
                    'name': this.form.name,
                    'description': this.form.description,
                    'dataset': this.form.dataset,
                    'model': this.form.model,
                    'type': this.task_type_options.indexOf(this.task_type_value)
                }

                if (Object.values(payload).every(value => value !== null && value !== undefined && value !== '')) {
                    this.create_task(path, payload)
                    this.dialogFormVisible = false
                } else {
                    this.$message.error("请填写所有字段")  // 适用于 Element UI 的消息提示
                }
            },

            async create_task(path: string, payload: JSON) {
                axios.post(path, payload)
                .then((response) => {
                    // handle success
                    this.flush_tasks()
                })
                .catch((error) => {
                    // handle error
                    console.log('Failed to create task:', error)
                })
            },

            async flush_tasks() {
                const path = `/users/${window.localStorage.getItem('user-id')}/tasks`
                axios.get(path)
                .then ((response) => {
                    this.inference_tasks = response.data.inference.items;
                    this.train_tasks = response.data.train.items;
                })
                .catch ((error) => {
                    console.error(error);
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
            }
        },

        mounted() {
            // 先执行一次
            if (window.localStorage.getItem('user-token')) {
                this.flush_tasks();
            }

            // 每 10 秒执行一次
            this.intervalTask = setInterval(() => {
                if (window.localStorage.getItem('user-token')) {
                    this.flush_tasks();
                }
            }, 3000);
        },

        beforeUnmount() {
            clearInterval(this.intervalTask); // 清除定时器，防止内存泄漏
        }
    }
</script>