<template>
<div class="quota-card">
    <div class="header">
    <div class="title">{{ title }}</div>
    <div class="meta">
        <template v-if="loading">
        <el-skeleton :rows="1" animated style="width: 120px" />
        </template>
        <template v-else-if="error">
            <div class="error-text">{{ error }}</div>
        </template>
        <template v-else-if="quotaData">
        <div class="numbers">
            {{ quotaData.used_bytes }}
            /
            <span v-if="quotaData.limit_bytes !== null">
            {{ quotaData.limit_bytes }} 条
            </span>
            <span v-else>不限额</span>
        </div>
        </template>
    </div>
    </div>

    <div class="body" v-if="quotaData && !loading && !error">
        <el-progress
            :percentage="percentage"
            :status="progressStatus"
            :text-inside="false"
            :stroke-width="14"
        />
        <div class="footer">
            <div class="percent-text">
            <template v-if="quotaData.limit_bytes !== null">
                {{ percentage.toFixed(1) }}%
            </template>
            <template v-else>已用 {{ quotaData.used_bytes }}</template>
            </div>
            <div class="updated">
            最近更新：
            {{ new Date(quotaData.updated_at).toLocaleString('zh-CN', { hour12: false }) }}
            </div>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { PropType } from 'vue'

interface QuotaData {
used_bytes: number
limit_bytes: number | null
updated_at: string
}

const props = defineProps({
title: { type: String, required: true },
quotaData: { type: Object as PropType<QuotaData | null>, default: null },
loading: { type: Boolean, default: false },
error: { type: String, default: '' },
})

const { quotaData } = toRefs(props)

const percentage = computed(() => {
if (!quotaData.value) return 0
if (quotaData.value.limit_bytes === null) return 0
const pct = (quotaData.value.used_bytes / quotaData.value.limit_bytes) * 100
return Math.min(pct, 999) // 限制一个上限以防异常
})

const progressStatus = computed(() => {
if (!quotaData.value) return 'success'
if (quotaData.value.limit_bytes === null) return 'success'
if (quotaData.value.used_bytes > (quotaData.value.limit_bytes || 0)) return 'exception'
if (percentage.value >= 90) return 'warning'
return 'success'
})

// 单位转换
function formatSize(bytes: number) {
const units = ['B', 'KB', 'MB', 'GB', 'TB']
let i = 0
let num = bytes
while (num >= 1024 && i < units.length - 1) {
    num /= 1024
    i += 1
}
return `${num.toFixed(1)} ${units[i]}`
}
</script>

<style scoped lang="scss">
.quota-card {
flex: 1 1 320px;
border: 1px solid #ebedf0;
border-radius: 8px;
padding: 12px 16px;
background: #fff;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
display: flex;
flex-direction: column;
gap: 8px;

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .title {
        font-weight: 600;
        font-size: 14px;
    }
    .meta {
        font-size: 12px;
        .numbers {
            font-weight: 500;
        }
        .error-text {
            color: #f56c6c;
            cursor: pointer;
        }
    }
}

.body {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .footer {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #606266;
        margin-top: 4px;
        .percent-text {
            font-weight: 500;
        }
        .updated {
            white-space: nowrap;
        }
    }
}
}
</style>
      