<template>
<div class="container">
    <div class="container-header">
        <span class="title">模型空间</span>
        <span class="reamin-space">已使用{{ formatParamSize(used) }} | 剩余可用{{ formatParamSize(balance) }}</span>
    </div>
    <div class="space-header">
        <span class="total-models">共 {{ total_models }} 个模型</span>
        <button>排序</button>
    </div>
    <div class="model-space">
        <!-- 创建模型卡片 -->
        <div 
            class="model-card create-card disable-select"
            @click="createModelVisible = true"
        >
            <div class="create-content">
                <div class="create-icon">
                    <el-icon><Plus /></el-icon>
                    <h3>创建新模型</h3>
                </div>
                <p>在基准模型基础上进行微调训练</p>
            </div>
        </div>
        <!-- 普通模型卡片 -->
        <div 
            class="model-card normal-card"
            v-for="(model, index) in modelList"
            :key="index"
            @click="handleModelClick(model.value)"
        >
            <!-- 模型标题 -->
            <div class="model-header">
                <h3 class="model-name">{{ model.base_model.alias }}/{{ model.author }}/{{ model.label }}</h3>
                <!-- 共享状态标签 -->
                <div 
                    class="shared-label"
                    :class="{ 'shared-public': model.shared, 'shared-private': !model.shared }"
                >
                    {{ model.shared ? '公共模型' : '私有模型' }}
                </div>
            </div>
            
            <!-- 详细信息 -->
            <div class="model-details">
                <!-- 作者信息 -->
                <div class="detail-item">
                    <el-icon><User /></el-icon>
                    <span class="author">作者 {{ model.author }}</span>
                </div>
                <!-- 更新时间 -->
                <div class="detail-item">
                    <el-icon><Clock /></el-icon>
                    <span class="update-time">更新于 {{ formatDateTime(model.updated_at) }}</span>
                </div>
                <!-- 任务类型 -->
                <div class="detail-item">
                    <el-icon><CollectionTag /></el-icon>
                    <span class="task-type">任务类型 {{ model.base_model.task_type }}</span>
                </div>
                <!-- 参数量 -->
                <div class="detail-item">
                    <el-icon><DataBoard /></el-icon>
                    大小 
                    <span class="param-size">
                        {{ formatParamSize(model.size) }}
                    </span>
                </div>
            </div>
        </div>
    </div>
    <div class="container-footer">
        <div class="pagination-block">
            <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[20, 30, 50, 100]"
                background
                layout="sizes, prev, pager, next"
                :total="total_models"
                @change="handlePaginationChange"
            />
        </div>
    </div>
</div>
<createModelForm 
    v-if="createModelVisible"
    v-model="createModelVisible" 
    @refresh-models="fetchModels"
/>
</template>

<script lang="ts">
import { formatDateTime } from '@/utils/date';
import axios from '@/api/axios'
import createModelForm from './createModelForm.vue';

export default {
    name: 'ModelSpace',

    components: {
        createModelForm,
    },
    data() {
        return {
            modelList: [],

            currentPage: 1,
            pageSize: 20,
            total_models: 0,

            createModelVisible: false,

            used: 0,
            balance: 0,
        };
    },
    mounted() {
        this.fetchModels();
    },

    methods: {
        formatDateTime,

        async fetchModels() {
            const per_page = this.pageSize - 1
            const link = `/models?page=${this.currentPage}&per_page=${per_page}`
            axios.get(link).then((response) => {
                this.modelList = response.data.items
                this.total_models = parseInt(response.data._meta.total_items)

                this.fetchLimit()
            }).catch((error) => {
                console.log(error)
            })
        },
        handlePaginationChange() {
            this.fetchModels();
        },

        fetchLimit() {
          const link = `/models/limit`
          axios.get(link).then((response) => {
            this.used = parseInt(response.data.used)
            this.balance = parseInt(response.data.balance)
          }).catch((error) => {
            console.log(error)
          })
        },

        formatParamSize(size) {
            if (size >= 1024 ** 3) return `${(size / (1024 ** 3)).toFixed(1)}GB`;
            if (size >= 1024 ** 2) return `${(size / (1024 ** 2)).toFixed(1)}MB`;
            if (size >= 1024) return `${(size / 1024).toFixed(1)}KB`;

            return `${size}Bytes`;
        },
        handleModelClick(model_id: Number) {
          // 生成路由 URL，假设模型的 id 存在于 model.id
          const route = this.$router.resolve({
            name: 'ModelDetail',
            params: { model_id: model_id }
          });
          // 在新窗口打开目标 URL
          window.open(route.href, '_blank');
        }
    }
};
</script>

<style lang="scss" scoped>
// 新建卡片样式
.create-card {
  background: white;
  border: 2px dashed #b7eb8f;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: #eaffd0;
    transform: scale(1.02);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    
    .create-content {
      transform: translateY(0);
    }
    
    &::before {
      opacity: 0.3;
    }
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(120, 204, 77, 0.1) 10px,
      rgba(120, 204, 77, 0.1) 20px
    );
    transition: opacity 0.3s;
  }
}

.create-content {
  position: relative;
  z-index: 1;
  text-align: center;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .create-icon {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  
  .el-icon {
    font-size: 28px;
    color: #52c41a;
  }
  
  h3 {
    font-size: 1.25rem;
    color: #389e0d;
    margin: 0;
  }
  
  p {
    color: #555;
    font-size: 0.875rem;
    margin: 0;
  }
}

.model-space {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
  padding-top: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
  gap: 24px;
  box-sizing: border-box;
}

.normal-card {
  /* 原有样式 */
  /* background: rgba(0,0,0,0.02); */
  
  /* 新增渐变背景 */
  background: linear-gradient(
    90deg,          /* 从左到右方向 */
    rgba(0,0,0,0.04),        /* 左侧最深颜色 */
    rgba(0,0,0,0.01)    /* 右侧纯白 */
  );
  
  /* 渐变优化 */
  background-size: 200% 100%; /* 扩展渐变范围 */
  transition: background-position 0.3s; /* 添加过渡效果 */
}

.normal-card:hover {
  background-position: -100% 0; /* 悬停时移动渐变效果 */
}

.model-card {
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.05);
    transition: transform 0.3s ease;
    padding: 8px 20px;
    height: 100%;
    box-sizing: border-box;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
}

.model-header {
  margin-bottom: 16px;
  display: flex;
  flex-direction: row;
  
  .model-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
    margin: 0;
  }

  /* 共享标签样式 */
  .shared-label {
    margin-left: auto;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    
    /* 默认私有模型样式 */
    background: #f0f0f0;
    color: #666;
    
    /* 公共模型样式 */
    &.shared-public {
      background: #e6f4ff;
      color: #1890ff;
      border: 1px solid rgba(24, 144, 255, 0.2);
      
      &::before {
        content: '';
        width: 6px;
        height: 6px;
        background: #1890ff;
        border-radius: 50%;
        margin-right: 3px;
        margin-left: 3px;
      }
    }

    /* 私有模型样式 */
    &.shared-private {
      background: #fef0f0;
      color: #ff4d4f;
      border: 1px solid #ffccc7;
      
      /* 添加锁图标 */
      &::before {
        content: '';
        display: inline-block;
        width: 12px;
        height: 12px;
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff4d4f"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>') no-repeat center;
        background-size: contain;
      }
    }
    
    /* 悬停效果 */
    &:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
  }
}

.model-details {
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.875rem;
  color: #666;
  
  .el-icon {
    font-size: 1rem;
    color: #999;
  }
}

.container {
  /* 保持原有布局样式 */
  display: flex;
  flex-direction: column;
  padding: 20px;
  flex: 1;
  box-sizing: border-box;
  gap: 20px;
  height: 100%;
  overflow: auto;

  /* 滚动条整体设置 */
  --scrollbar-width: 8px;
  --scrollbar-track-color: #f1f1f1;
  --scrollbar-thumb-color: #c1c1c1;
  --scrollbar-thumb-hover: #a8a8a8;
}

/* WebKit 浏览器滚动条样式 */
.container::-webkit-scrollbar {
  width: var(--scrollbar-width);
  background: var(--scrollbar-track-color);
  border-radius: 10px;
}

.container::-webkit-scrollbar-track {
  background: var(--scrollbar-track-color);
  border-radius: 10px;
}

.container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-color);
  border-radius: 10px;
  border: 2px solid var(--scrollbar-track-color);
  transition: background 0.3s;
}

.container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

.container::-webkit-scrollbar-button {
  display: none;
}

/* Firefox 滚动条样式 */
.container {
  scrollbar-color: var(--scrollbar-thumb-color) var(--scrollbar-track-color);
  scrollbar-width: thin;
}

/* 滚动条悬停效果 */
.container:hover {
  --scrollbar-thumb-color: #a8a8a8;
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
    justify-content: center;
    margin-top: auto;
}

.space-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
  gap: 24px;
}

.space-header > .total-models {
  overflow-wrap: break-word;
  color: rgba(0, 0, 0, .6);
}

// 响应式设计
@media (max-width: 1524px) {
  .model-space {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  
  .model-card {
    padding: 16px;
  }
  
  .model-name {
    font-size: 1.1rem;
  }

  .create-card {
    grid-column: span 1;
  }
}
</style>