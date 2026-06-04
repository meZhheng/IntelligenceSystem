<!-- src/views/GuidePage.vue -->
<template>
<div class="guide-page">
    <h2 class="page-title">教学管理模块功能导览</h2>
    <el-row :gutter="20" class="cards-row">
    <el-col :span="24" v-for="card in cards" :key="card.title" class="cards-col">
        <el-card shadow="hover" class="feature-card">
        <div class="card-header">
            <el-icon :size="22" class="card-icon">
              <component :is="card.icon" />
            </el-icon>
            <h3>{{ card.title }}</h3>
        </div>
        <div class="card-body">
            <p>{{ card.description }}</p>
        </div>
        <div class="card-footer">
            <el-button type="primary" @click="$router.push(card.to)">
            进入 {{ card.title }}
            </el-button>
        </div>
        </el-card>
    </el-col>
    </el-row>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { User, Document, Star } from '@element-plus/icons-vue'

interface Card {
    title: string
    description: string
    to: string
    icon: any
}

const cards = ref<Card[]>([
{
    title: '学员数据管理',
    description: '统一批量处理学员账号，快速创建、便捷编辑、一键删除，并实时跟踪学习进度，帮助教学管理人员高效掌握学员状态。',
    to: '/study/students',      // ← 替换为实际路由
    icon: User,
},
{
    title: '学习报告撰写',
    description: '提供报告模板和撰写工具，自动化生成学习任务效果评估报告，助力教学效果量化管理。',
    to: '/study/report',       // ← 替换为实际路由
    icon: Document,
},
{
    title: '人机对抗训练',
    description: '模拟真实操作场景：人工生成错误样本机器判定、机器生成错误样本人工判定，提升学员敏感内容识别与应急处理能力。',
    to: '/study/adversarial',   // ← 替换为实际路由
    icon: Star,
},
])
</script>

<style lang="scss" scoped>
.guide-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px;

    .page-title {
        font-size: 1.8rem;
        margin-bottom: 16px;
        margin-top: 0;
        color: #2c3e50;
    }
    .cards-row {
        margin-top: 16px;

        .cards-col {
            margin-bottom: 20px;
        }
    }
    .feature-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform .2s, box-shadow .2s;

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,.1);
        }
        .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #303133;
            }
            .el-icon {
                color: #409eff;
            }
        }
        .card-body {
        margin: 12px 0;
        flex: 1;
        p {
            margin: 0;
            color: #606266;
            line-height: 1.6;
        }
        }
        .card-footer {
        text-align: right;
        button {
            border-radius: 4px;
        }
        }
    }
}
</style>
  