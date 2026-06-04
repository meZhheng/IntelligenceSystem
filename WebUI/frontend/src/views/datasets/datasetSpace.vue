<template>
    <div class="container">
        <div class="container-header">
            <span class="title">{{ path == 'personalSpace' ? '个人空间' : '共享空间' }}</span>
            <span class="reamin-space" v-if="path === 'personalSpace'">已使用{{ used }}条 | 剩余可用{{ balance }}条</span>
        </div>
        <div class="container-operation" v-if="path === 'personalSpace'">
            <button type="button" class="uploadButton" @click="handleUploadClick">
                <el-icon size="16px"><Upload /></el-icon>
                <span style="vertical-align: middle;">上传</span>
            </button>
            <button type="button" class="createButton">
                <el-icon size="16px"><Plus /></el-icon>
                <span style="vertical-align: middle;">新建</span>
            </button>
        </div>
        <div class="container-body">
            <div class="table-title disable-select">
                <img src="@/assets/icons/square.svg" alt="icon" class="square-box disable-select" />
                <span>数据集名称</span>
                <span>数据集描述</span>
                <span>类型</span>
                <span>创建时间</span>
                <span>修改时间</span>
                <span>数据条数</span>
            </div>
            <div class="table-body" v-for="(dataset, index) in datasets" :key="index">
                <img src="@/assets/icons/square.svg" alt="icon" class="square-box disable-select" />
                <span>{{ dataset.label }}</span>
                <span>{{ dataset.description }}</span>
                <span>{{ dataset.type }}</span>
                <span>{{ formatDateTime(dataset.created_time) }}</span>
                <span>{{ formatDateTime(dataset.updated_time) }}</span>
                <span>{{ dataset.total_data }} 条</span>
            </div>
        </div>
        <div class="container-footer">
            <div class="total-datasets">
                <span>共 {{ total_datasets }} 个数据集</span>
            </div>
            <div class="pagination-block">
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    background
                    layout="sizes, prev, pager, next"
                    :total="total_datasets"
                    @change="handlePaginationChange"
                />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.square-box {
    width: 20px;
    height: 20px;
    cursor: pointer;
}
.container-body > .table-title {
    display: grid;
    grid-template-columns: 40px 360px 1fr 200px 150px 150px 100px;
    gap: 5px;
    align-items: center;
    box-sizing: border-box;
    padding: 12px 5px;
}

.container-body > .table-body {
  display: grid;
  grid-template-columns: 40px 360px 1fr 200px 150px 150px 100px;
  gap: 5px;
  align-items: center;
  box-sizing: border-box;
  padding: 16px 5px;
  overflow: hidden;
  cursor: pointer;

  /* 新增样式 */
  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0; // 关键：允许收缩到0宽度
    
    /* 为特定列设置最大宽度 */
    &:nth-child(2) { max-width: 360px; } // label列
    &:nth-child(3) { max-width: 100%; }  // description列（1fr）
    &:nth-child(4) { max-width: 200px; } // type列
    // 其他列保持默认
  }
  
  /* 针对description列的特殊处理 */
  &:nth-child(3) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.table-body {
  transition: background 0.3s;
  
  &:hover {
    background: rgb(247, 249, 252);
  }
}

.table-title span {
    overflow-wrap: break-word;
    font-weight: 400;
    color: rgba(0, 0, 0, .5);
}

.container-operation {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
}

.uploadButton {
    color: #fff;
    background-color: #00b264;
    border-color: #00b264;
    box-sizing: border-box;
    border-width: 1px;
    border-style: solid;
    cursor: pointer;
    -webkit-box-align: center;
    -webkit-box-pack: center;
    vertical-align: middle;
    white-space: nowrap;
    border-radius: var(--td-radius-default);
    transition: all .2s linear;
    touch-action: manipulation;
    padding: 6px 15px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-direction: row;
    border-radius: 4px;
}
.uploadButton:hover {
    background-color: #00b265ca;
}

.createButton {
    color: #fff;
    background-color: #0444b9;
    border-color: #0444b9;
    box-sizing: border-box;
    border-width: 1px;
    border-style: solid;
    cursor: pointer;
    -webkit-box-align: center;
    -webkit-box-pack: center;
    vertical-align: middle;
    white-space: nowrap;
    border-radius: var(--td-radius-default);
    transition: all .2s linear;
    touch-action: manipulation;
    padding: 6px 15px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-direction: row;
    border-radius: 4px;
}

.createButton:hover {
    background-color: #2460ce;
}

.container {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
    gap: 20px;
    height: 100%;
}
.container-header {
    display: flex;
    flex-direction: row;
    width: 100%;
    box-sizing: border-box;
    gap: 5px;
    align-items: center;
}

.container-header > .title {
    font-size: 20px;
    font-weight: 600;
    line-height: 30px;
    min-height: 24px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    color: rgba(0, 0, 0, .9);
    word-break: break-all;
}

.container-header > .title:hover {
    cursor: pointer;
    color: rgb(44, 118, 209);
}

.container-header > .reamin-space {
    color: rgba(0, 0, 0, .4);
    font-size: 14px;
    font-weight: 400;
    margin-left: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
}

.container-footer {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
}

.container-footer > .total-datasets {
    overflow-wrap: break-word;
    color: rgba(0, 0, 0, .6);
}
</style>

<script lang="ts">
import axios from '@/api/axios'
import { formatDateTime } from '@/utils/date'
import { useRoute } from 'vue-router'

export default {
    name: 'datasetSpace',
    beforeRouteUpdate(to, from, next) {
        // 重新加载
        this.path = String(to.params.path)

        if (this.path === 'personalSpace') {
            this.fetchLimit()
        }
        this.fetchDatasets()
        // 一定要调用 next()
        next()
    },

    data() {
        return {
            currentPage: 1,
            pageSize: 10,
            total_datasets: 0,

            used: 0,
            balance: 0,

            datasets: [],

            path: null,
        }
    },

    methods: {
        formatDateTime,

        fetchDatasets() {
            const link = `/datasets?page=${this.currentPage}&per_page=${this.pageSize}&personal=${this.path == 'personalSpace'}`
            axios.get(link).then((response) => {
                this.datasets = response.data.items
                this.total_datasets = parseInt(response.data._meta.total_items)
            }).catch((error) => {
                console.log(error)
            })
        },

        fetchLimit() {
            const link = `/datasets/limit`
            axios.get(link).then((response) => {
                this.used = parseInt(response.data.used)
                this.balance = parseInt(response.data.balance)
            }).catch((error) => {
                console.log(error)
            })
        },

        handlePaginationChange() {
            this.fetchDatasets()
        },

        handleUploadClick() {
          // 生成路由 URL，假设模型的 id 存在于 model.id
          const route = this.$router.resolve({
            name: 'DatasetUpload',
          });
          // 在新窗口打开目标 URL
          window.open(route.href, '_blank');
        }
    },

    mounted() {
        const route = useRoute()
        this.path = String(route.params.path)

        if (this.path === 'personalSpace') {
            this.fetchLimit()
        }
        
        this.fetchDatasets()
    },
}
</script>