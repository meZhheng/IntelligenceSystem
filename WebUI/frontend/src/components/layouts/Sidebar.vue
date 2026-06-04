<script lang="ts">
import { useStore } from '@/store';
import axios from '@/api/axios';
import type { CheckboxValueType } from 'element-plus'

export default {
    name: 'Sidebar',

    data() {
        return {
            store: useStore(),

            workshop_visible: false,
            default_visible: false,

            datasets_visable: true,

            app_groups: [],
            default_groups: [],

            groupExpand: {},

            item_selected: null,

            create_group_info: {
                name: '',
                dataset_selected: [],
                default: false,
                task_type_selected: '',
            },

            create_group_visible: false,

            rules: {
                name: [{ required: true, message: '请输入应用名称！', trigger: 'blur' }],
                dataset_selected: [{ required: true, message: '请选择数据集！', trigger: 'change' }],
                task_type_selected: [{ required: true, message: '请选择任务类型！', trigger: 'change' }],
                default: [{ required: true, validator: this.alertDefault, trigger: 'change' }],
            },

            checkAll_dataset: false,
            indeterminate_dataset: false,
            dataset_available: [],
            task_type_list: [],
        }
    },

    methods: {
        showDatasets(path: string) {
            this.$router.push('/application/datasetspace/' + path);
        },
        handleCreateGroupClick(mode: string) {
            this.create_group_info.default = mode === 'default';
            this.create_group_visible = true;
        },

        alertDefault (rule, value, callback) {
            callback()
        },

        toggleGroup(groupId: number) {
            if (this.groupExpand[groupId] === undefined) {
                this.groupExpand[groupId] = true; // 初次点击时，显示
            } else {
                this.groupExpand[groupId] = !this.groupExpand[groupId]; // 取反
            }
        },

        toggleItem(item: string, groupId: number) {
            this.$router.push(`/application/${item}/${groupId}`);
        },

        toModelSpace() {
            this.$router.push('/application/modelspace');
        },

        handleCancle() {
            this.create_group_visible = false

            const formEl = this.$refs.ruleFormRef;
            if (!formEl) return
            formEl.resetFields()
        },

        handleCheckAll_dataset(val: CheckboxValueType) {
            this.indeterminate_dataset = false;
            if (val) {
                // 选择全部时，忽略 status 为 0 的项
                this.create_group_info.dataset_selected = this.dataset_available
                .map(option => option.value);
            } else {
                this.create_group_info.dataset_selected = [];
            }
        },

        async fetchAvailableDatasets() {
            if (this.dataset_available.length === 0) {
                axios.post('/datasets', {}).then((response)=> {
                    this.dataset_available = response.data
                }).catch ((error) => {
                    console.error('Failed to fetch datasets:', error)
                }) 
            }
        },

        async fetchApplicationTaskType() {
            if (this.task_type_list.length === 0) {
                axios.post('/application/type').then((response)=> {
                    this.task_type_list = response.data
                }).catch ((error) => {
                    this.$message.error('获取应用类型失败：', error)
                }) 
            }
        },

        async handleCreateGroup() {
            const formEl = this.$refs.ruleFormRef;
            if (!formEl) return
            formEl.validate((valid) => {
                if (valid) {
                    const link = '/application/groups/create'
                    const payload = {
                        name: this.create_group_info.name,
                        dataset_ids: this.create_group_info.dataset_selected,
                        default: this.create_group_info.default,
                        task_type: this.create_group_info.task_type_selected,
                    };

                    axios.post(link, payload)
                    .then((response) => {
                        this.$message.success(`应用组 "${response.data.name}" 创建成功`);
                        this.create_group_visible = false
                        this.fetchAppGroups(payload.default, response.data.id)
                    }).catch((error) => {
                        console.log(error.response.data.message)
                        if (error.response) {
                            // 服务器返回了错误状态码
                            const message = error.response.data.message
                                        || error.response.data.error 
                                        || '未知错误';
                            this.$message.error(`错误 ${message}`);

                        } else {
                            // 网络错误或其他问题
                            this.$message.error(`请求失败 ${error.message}`);
                        }
                    })
                } else {
                    this.$message.error('请填写完整数据')
                }
            })
        },

        async fetchAppGroups(special: boolean, select_default: boolean, select_index: number, select_func: string) {
            axios.get('/application/groups').then((response) => {
                this.default_groups = response.data.default;
                this.app_groups = response.data.app;
                
                if(special) {
                    this.select_index = select_index;
                    this.select_default = select_default;
                    if (select_default) {
                        this.default_visible = true;
                    } else {
                        this.workshop_visible = true;
                    }

                    this.item_selected = select_func

                } else {
                    if(select_default != null && select_index != null) {
                        this.select_index = select_index;
                        this.select_default = select_default;
                        if (select_default) {
                            this.default_visible = true;
                        } else {
                            this.workshop_visible = true;
                        }
                    } else if (this.default_groups.length > 0) {
                        this.select_index = this.default_groups[0].id;
                        this.select_default = true;
                        this.default_visible = true;

                    } else if (this.app_groups.length > 0) {
                        this.select_index = this.app_groups[0].id;
                        this.select_default = false;
                        this.workshop_visible = true;
                    }

                    if (this.select_index) {
                        this.item_selected = 'analysis'
                    }
                }
            }).catch((error) => {
                console.error(error);
            });
        },
    },

    mounted() {
        this.fetchAppGroups();
    }
}
</script>

<template>
<div class="sidebar disable-select" v-if="store.state.sidebarOpen">
    <div class="sidebar-content">
    <!-- 默认应用 -->
    <section class="group-section">
        <header class="group-header">
            <div class="group-title" @click="default_visible = !default_visible">
                <el-icon class="expand-icon">
                    <template v-if="default_visible"><ArrowDown /></template>
                    <template v-else><ArrowRight /></template>
                </el-icon>
                <span>默认应用</span>
            </div>
            <div class="group-actions">
                <el-icon v-if="store.state.user_perms === 'administrator'" @click="handleCreateGroupClick('default')" :size="18">
                    <Plus />
                </el-icon>
            </div>
        </header>
        <ul class="group-list" v-show="default_visible">
        <li v-for="item in default_groups" :key="item.id" class="group-item">
            <div class="group-item-header" @click="toggleGroup(item.id)">
            <el-icon class="expand-icon">
                <template v-if="groupExpand[item.id]"><ArrowDown /></template>
                <template v-else><ArrowRight /></template>
            </el-icon>
            <span>{{ item.name }}</span>
            </div>
            <ul class="sub-list" v-show="groupExpand[item.id]">
            <li class="sub-item" @click="toggleItem('analysis', item.id)">
                <el-icon><PieChart /></el-icon><span>总体分析</span>
            </li>
            <li class="sub-item" @click="toggleItem('overview', item.id)">
                <el-icon><Document /></el-icon><span>数据一览</span>
            </li>
            </ul>
        </li>
        </ul>
    </section>

    <!-- 我的工作区 -->
    <!-- <section class="group-section">
        <header class="group-header">
            <div class="group-title" @click="workshop_visible = !workshop_visible">
                <el-icon class="expand-icon">
                    <template v-if="workshop_visible"><ArrowDown /></template>
                    <template v-else><ArrowRight /></template>
                </el-icon>
                <span>我的工作区</span>
            </div>
            <div class="group-actions">
                <el-icon @click="handleCreateGroupClick('normal')" :size="18"><Plus /></el-icon>
            </div>
        </header>
        <ul class="group-list" v-show="workshop_visible">
        <li v-for="item in app_groups" :key="item.id" class="group-item">
            <div class="group-item-header" @click="toggleGroup(item.id)">
            <el-icon class="expand-icon">
                <template v-if="groupExpand[item.id]"><ArrowDown /></template>
                <template v-else><ArrowRight /></template>
            </el-icon>
            <span>{{ item.name }}</span>
            </div>
            <ul class="sub-list" v-show="groupExpand[item.id]">
            <li class="sub-item" @click="toggleItem('analysis', item.id)">
                <el-icon><PieChart /></el-icon><span>总体分析</span>
            </li>
            <li class="sub-item" @click="toggleItem('overview', item.id)">
                <el-icon><Document /></el-icon><span>数据一览</span>
            </li>
            </ul>
        </li>
        </ul>
    </section> -->

    <!-- 我的数据集 -->
    <section class="group-section">
        <header class="group-header">
            <div class="group-title" @click="datasets_visable = !datasets_visable">
                <el-icon class="expand-icon">
                <template v-if="datasets_visable"><ArrowDown /></template>
                <template v-else><ArrowRight /></template>
                </el-icon>
                <span>我的数据集</span>
            </div>
            <div class="group-actions"></div>
        </header>
        <ul class="sub-list" v-show="datasets_visable">
        <li class="sub-item" @click="showDatasets('sharedSpace')">
            <el-icon><Share /></el-icon><span>共享空间</span>
        </li>
        <li class="sub-item" @click="showDatasets('personalSpace')">
            <el-icon><User /></el-icon><span>个人空间</span>
        </li>
        </ul>
    </section>

    <!-- 我的模型 -->
    <section class="group-section">
        <header class="group-header">
            <div class="group-title" @click="toModelSpace">
                <el-icon class="expand-icon"></el-icon>
                <span>我的模型</span>
            </div>
            <div class="group-actions"></div>
        </header>
    </section>
    </div>
</div>
<el-dialog
    v-model="create_group_visible"
    width="500px" label-width="auto"
    :close-on-click-modal="false"
    @close="handleCancle"
>
    <template #header="{ titleId, titleClass }">
        <span class="title" style="color: black;" :id="titleId" :class="titleClass">
        创建应用组
        </span>
    </template>
    <el-form 
        :rules="rules" 
        :model="create_group_info" 
        ref="ruleFormRef"
    >
        <el-form-item label="应用组名称" prop="name">
            <el-input v-model="create_group_info.name" autocomplete="off" placeholder="请输入应用组名称" maxlength="15" show-word-limit />
        </el-form-item>
        <el-form-item label="应用组类型" prop="task_type_selected">
        <el-select 
            v-model="create_group_info.task_type_selected"
            clearable
            placeholder="选择应用类型"
            popper-class="custom-header"
            @visible-change="fetchApplicationTaskType"
        >   
            <el-option 
                v-for="item in task_type_list"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            />
        </el-select>
        </el-form-item>
        <el-form-item label="选择数据集" prop="dataset_selected">
        <el-select 
            v-model="create_group_info.dataset_selected"
            multiple
            clearable
            collapse-tags
            placeholder="请选择要分析的数据集"
            popper-class="custom-header"
            :max-collapse-tags="3"
            @visible-change="fetchAvailableDatasets"
        >   
            <template #header>
            <el-checkbox
                v-model="checkAll_dataset"
                :indeterminate="indeterminate_dataset"
                @change="handleCheckAll_dataset"
            > All </el-checkbox>
            </template>
            <el-option 
                v-for="item in dataset_available"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            />
        </el-select>
        </el-form-item>
        <el-form-item label="应用组类型" prop="default">
        <el-radio-group v-model="create_group_info.default">
            <el-radio-button label="默认应用" :value="true" :disabled="store.state.user_perms !== 'administrator'" />
            <el-radio-button label="个人应用" :value="false" />
        </el-radio-group>
        <div class="default-hint">
            {{ create_group_info.default ? "默认应用只能由管理员创建，创建后系统内所有人可见" : "个人应用所有人可创建，创建后仅自己可见" }}
        </div>
        </el-form-item>
    </el-form>
    <template #footer>
        <el-button @click="handleCancle">取消</el-button>
        <el-button type="primary" @click="handleCreateGroup">
        创建
        </el-button>
    </template>
</el-dialog>
</template>

<style scoped>
.default-hint {
    font-size: 12px;
    color: #f56c6c; /* 可根据需要设置颜色 */
}

.title {
    font-family: 'Microsoft YaHei';
    font-weight: bold;
    color: rgb(177.3, 179.4, 183.6);
}

.sidebar {
    width: 240px;
    height: 100%;
    background: var(--sidebar-bg);
    color: var(--text-light);
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.sidebar-content {
    padding: 12px;
}

/* 每个分组区块 */
.group-section + .group-section {
    margin-top: 16px;
    border-top: 1px solid var(--section-bg);
    padding-top: 12px;
}

/* 区块头 */
.group-header {
    display: flex;
    align-items: center;
    padding: 4px 0;
}

.group-actions {
    margin-left: auto;
    width: 21px;
    height: 21px;
    display: flex;
    align-items: center;
    text-align: center;
    cursor: pointer;
}

.group-actions el-icon {
    font-size: 18px;
    color: var(--highlight);
    transition: color 0.2s;
}
.group-actions el-icon:hover {
    color: #ffffff;
}

/* 标题文字和图标 */
.group-title {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    margin-left: 8px;
}
.group-title span {
    margin-left: 4px;
}

/* 展开/收起图标 */
.expand-icon {
    font-size: 14px;
    color: var(--text-muted);
}

/* 一级列表 */
.group-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
}

/* 每个一级组 */
.group-item + .group-item {
    margin-top: 8px;
}

/* 一级组标题 */
.group-item-header {
    display: flex;
    align-items: center;
    padding: 4px 0 4px var(--indent);
    cursor: pointer;
    font-size: 13px;
    color: var(--text-light);
    transition: color 0.2s;
}
.group-item-header:hover {
    color: var(--highlight);
}

/* 二级子列表 */
.sub-list {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    border-left: 2px solid var(--section-bg);
}

/* 每个子项 */
.sub-item {
display: flex;
align-items: center;
padding: 6px 0 6px calc(var(--indent) * 2);
cursor: pointer;
font-size: 13px;
color: var(--text-muted);
transition: color 0.2s, background 0.2s;
}
.sub-item el-icon {
margin-right: 6px;
font-size: 14px;
color: var(--muted);
}
.sub-item:hover {
color: var(--highlight);
background: rgba(255, 255, 255, 0.05);
border-radius: 4px;
}
</style>
  