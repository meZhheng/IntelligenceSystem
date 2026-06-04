<template>
<div class="dataset-table" v-loading="tableLoading">
    <table>
        <thead>
            <tr>
            <!-- 动态渲染表头，遇到 '标签' 就加 special-header -->
            <th
                v-for="header in headers"
                :key="header"
                :class="{ 'special-header': header === '标签' }"
            >
                {{ header }}
            </th>
            <th class="center-cell">结果</th>
            <th class="center-cell">检测</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="item in items" :key="item.id">
                <!-- 根据 headers 顺序渲染每个字段 -->
                <!-- 根据 headers 顺序渲染每个字段，遇到 '标签' 就加 special-cell -->
                <td
                    v-for="header in headers"
                    :key="header"
                    :class="{ 'special-cell': header === '标签' }"
                >   
                    <span v-if="header === '标签'" class="groundtruth-tag">{{ item[header] }}</span>
                    <span v-else>
                        {{ item[header] }}
                    </span>
                </td>
                <!-- 推理结果列 -->
                <td class="center-cell" style="width: 160px;">
                    <!-- 未分析 -->
                    <span
                        v-if="resultMap[item.id] === null || resultMap[item.id] === undefined"
                        class="no-result-tag"
                    >
                        未分析
                    </span>

                    <!-- 有 groundtruth 时，先显示 groundtruth -->
                    <span
                        v-else-if="headers.includes('标签')"
                        :class="{
                            'correct-tag': resultMap[item.id] === items.find(i => i.id === item.id)?.['标签'],
                            'wrong-tag': resultMap[item.id] !== items.find(i => i.id === item.id)?.['标签'],
                        }"
                    >
                        {{ resultMap[item.id] }}
                    </span>

                    <!-- 若没有 groundtruth，只看预测，附带标签样式 -->
                    <span
                        v-else
                        :class="{
                        'pred-only-tag': true
                        }"
                    >
                        {{ resultMap[item.id] }}
                    </span>
                </td>
                <!-- 操作列：点击按钮触发推理 -->
                <td class="center-cell" style="width: 60px;">
                    <button @click="analyzeRow(item.id)" :disabled="loadingMap[item.id]">
                    {{ loadingMap[item.id] ? '检测中...' : '检测' }}
                    </button>
                </td>
            </tr>
        </tbody>
    </table>

    <!-- 分页控件 -->
    <div class="pagination-controls" v-if="totalPages > 1" style="display: flex; align-items: center; gap: 8px;">
        <!-- 首页 -->
        <el-button size="small" @click="goToPage(1)" :disabled="currentPage === 1">
        首页
        </el-button>

        <!-- 上一页 -->
        <el-button size="small" @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">
        上一页
        </el-button>

        <span>第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>

        <!-- 下一页 -->
        <el-button size="small" @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">
        下一页
        </el-button>

        <!-- 尾页 -->
        <el-button size="small" @click="goToPage(totalPages)" :disabled="currentPage === totalPages">
        尾页
        </el-button>

        <!-- 跳转到第 n 页 -->
        <el-input-number
            v-model="jumpPage"
            :min="1"
            :max="totalPages"
            size="small"
            style="width: 80px;"
            @keypress.enter.native="onJump"
        />
        <el-button size="small" @click="onJump">
            跳转
        </el-button>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import axios from '@/api/axios';

// 定义接口类型
interface DataItem {
id: number | string;
[key: string]: any;
}

const props = defineProps<{
    dataset_id: string | number | null;         // 数据集 ID
    checkpoint_id: string | string[];           // 可选的检查点 ID
}>();

// 表头与数据列表
const headers = ref<string[]>([]);
const items = ref<DataItem[]>([]);

// 存储各行的推理结果和加载状态
const resultMap = ref<Record<string | number, any>>({});
const loadingMap = ref<Record<string | number, boolean>>({});

// 分页相关状态
const currentPage = ref<number>(1);
const pageSize = ref<number>(10);      // 默认为每页 10 条
const totalPages = ref<number>(1);

// 监听 dataset_id 或 checkpoint_id 变化，重置到第 1 页并重新获取
watch(
    () => [props.dataset_id, props.checkpoint_id],
    ([newDatasetId]) => {
        if (newDatasetId) {
            currentPage.value = 1;
            fetchData(newDatasetId, currentPage.value);
        }
    },
    { immediate: true }
);

// 监听 currentPage 变化，重新获取对应页数据
watch(currentPage, (newPage) => {
    if (props.dataset_id) {
        fetchData(props.dataset_id, newPage);
        jumpPage.value = newPage
    }
});
const tableLoading = ref<boolean>(false);
// 获取数据函数，带分页参数
async function fetchData(dataset_id: string | number | string[], page: number) {
    if(dataset_id === null) return
    try {
        tableLoading.value = true; // 开始加载

        const payload = {
            dataset_id: dataset_id,
            checkpoint_id: props.checkpoint_id,
            page: page,
            page_size: pageSize.value,
        };

        // 假设后端接口返回：{ headers: [...], items: [...], total_pages: X }
        const response = await axios.post('/datasets/dataList', payload, {
            timeout: 30000,
        });
        const data = response.data;

        headers.value = data.headers;
        items.value = data.items.items;

        // 如果后端返回的是总页数
        totalPages.value = data.items._meta.total_pages ?? 1;

        // 初始化 loadingMap 和 resultMap
        items.value.forEach((item) => {
            loadingMap.value[item.id] = false;
            resultMap.value[item.id] = null;
        });

        await nextTick();
        // 取出当前页所有 id，批量获取推理结果
        fetchResults();

    } catch (err) {
        console.error('获取数据集条目失败:', err);
    } finally {
        tableLoading.value = false; // 结束加载
    }
}

async function fetchResults() {
    try {
        const ids = items.value.map((item) => item.id);
        if (ids.length === 0) return;

        const resultPayload = {
            dataset_id: props.dataset_id,
            data_ids: ids,
            checkpoint_id: props.checkpoint_id,
        };
        // 假设后端批量查询接口为 /api/batchAnalyzeResults
        const res = await axios.post('/models/test_checkpoint/batchAnalyzeResults', resultPayload);
        const resultsData = res.data;
        // 将返回的批量结果赋给 resultMap
        Object.entries(resultsData.results).forEach(([id, value]) => {
            resultMap.value[id] = value;
        });
    } catch (err) {
        console.error('批量获取推理结果失败:', err);
    }
}

// 分页跳转
function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
}

// 点击按钮时触发推理
async function analyzeRow(id: string | number) {
    if (loadingMap.value[id]) return;
    loadingMap.value[id] = true;
    try {
        // 假设后端推理接口为 /api/analyze ，传递 { data_id: id, checkpoint_id: props.checkpoint_id }
        const response = await axios.post('/models/test_checkpoint/analyzeSingle', {
            dataset_id: props.dataset_id,
            data_id: id,
            checkpoint_id: props.checkpoint_id,
        });
        // 假设后端返回 { result: '...' }
        resultMap.value[id] = response.data;
    } catch (err) {
        console.error(`行 ${id} 推理失败:`, err);
        resultMap.value[id] = '推理失败';
    } finally {
        loadingMap.value[id] = false;
    }
}

// 暴露 fetchData 给外部
defineExpose({ analyzeTable });
async function analyzeTable() {
    const ids = items.value.map((item) => item.id);
    if (ids.length === 0) return;

    // 如果已有某行正在加载，则直接返回
    const isAnyLoading = ids.some((id) => loadingMap.value[id]);
    if (isAnyLoading) return;

    // 设置所有行为加载状态
    ids.forEach((id) => {
        loadingMap.value[id] = true;
        resultMap.value[id] = null;
    });

    // 依次调用 analyzeRow，并等待每一步完成
    for (const id of ids) {
        try {
            const response = await axios.post('/models/test_checkpoint/analyzeSingle', {
                dataset_id: props.dataset_id,
                data_id: id,
                checkpoint_id: props.checkpoint_id,
            });
            resultMap.value[id] = response.data;
        } catch (err) {
            console.error(`行 ${id} 批量推理失败:`, err);
            resultMap.value[id] = '推理失败';
        } finally {
            loadingMap.value[id] = false;
        }
    }
}
// 用于跳转输入框
const jumpPage = ref<number>(1)
function onJump() {
    goToPage(jumpPage.value)
}
</script>

<style scoped lang="scss">
.dataset-table {
    table {
        width: 100%;
        border-collapse: collapse;
    }
    /* 新增：给 .center-cell 设为水平居中 */
    .center-cell {
        text-align: center;
        .no-result-tag {
            display: inline-block;
            padding: 2px 6px;
            background-color: #f0f0f0;  // 灰底
            color: #999;               // 灰字
            border-radius: 4px;
            font-size: 12px;
        }

        .correct-tag {
            // 叠加在 groundtruth-tag 或 pred-only-tag 上
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            background-color: #d4edda;  // 绿色提示
            color: #155724;
        }

        .wrong-tag {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            background-color: #f8d7da;  // 红色提示
            color: #c43241;
        }

        .pred-only-tag {
            display: inline-block;
            padding: 2px 6px;
            background-color: #d1ecf1;  // 浅蓝底
            color: #0c5460;             // 深蓝字
            border-radius: 4px;
            font-size: 12px;
        }
    }
    th,
    td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }
    th {
        background-color: #f5f5f5;
        font-weight: 600;
    }
    .special-header {
        text-align: center;
    }

    .special-cell {
        width: 160px;
        text-align: center;
        .groundtruth-tag {
            display: inline-block;
            padding: 2px 6px;
            background-color: #f0f0f0;  // 灰底
            color: #999;               // 灰字
            border-radius: 4px;
            font-size: 12px;
        }
    }
    button {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        background-color: #409eff;
        color: white;
        cursor: pointer;

        &:disabled {
        background-color: #a0cfff;
        cursor: not-allowed;
        }
    }
    .pagination-controls {
        margin-top: 12px;
        display: flex;
        align-items: center;
        gap: 8px;

        button {
            padding: 4px 12px;
        }
        span {
            font-size: 14px;
            color: #333;
        }
    }
}
</style>
