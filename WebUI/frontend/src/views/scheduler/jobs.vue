<template>
  <div class="scheduler-jobs-page">
    <div class="page-header">
      <div>
        <h2>调度器状态</h2>
        <p>技术调试页面，仅管理员可见。用于查看有效定时任务和上一次执行结果。</p>
      </div>
      <div class="header-actions">
        <span v-if="lastLoadedAt" class="loaded-time">
          最近加载：{{ formatDateTime(lastLoadedAt) }}
        </span>
        <el-button type="primary" :loading="loading" @click="fetchSchedulerJobs">
          刷新
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      class="page-alert"
    />

    <el-card class="summary-card" shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>Scheduler 概览</span>
          <el-tag v-if="scheduler" :type="scheduler.running ? 'success' : 'danger'">
            {{ scheduler.running ? "运行中" : "未运行" }}
          </el-tag>
        </div>
      </template>

      <el-empty v-if="!scheduler && !loading" description="暂无调度器状态" />
      <el-descriptions v-else :column="3" border>
        <el-descriptions-item label="启用状态">
          <el-tag :type="scheduler?.enabled ? 'success' : 'danger'">
            {{ scheduler?.enabled ? "已启用" : "未启用" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="运行状态">
          <el-tag :type="scheduler?.running ? 'success' : 'danger'">
            {{ scheduler?.running ? "运行中" : "未运行" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Master 节点">
          <el-tag :type="scheduler?.is_master ? 'success' : 'info'">
            {{ scheduler?.is_master ? "是" : "否" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="时区">
          {{ scheduler?.timezone || "--" }}
        </el-descriptions-item>
        <el-descriptions-item label="生成时间">
          {{ formatOptionalTime(scheduler?.generated_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="任务数量">
          {{ jobs.length }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="jobs-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>定时任务</span>
          <span class="job-count">共 {{ jobs.length }} 个任务</span>
        </div>
      </template>

      <el-table
        :data="jobs"
        v-loading="loading"
        border
        stripe
        empty-text="暂无调度任务"
        style="width: 100%"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="job-detail">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="任务函数">
                  <span class="mono-text">{{ row.func || "--" }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="Trigger">
                  {{ formatTrigger(row.trigger) }}
                </el-descriptions-item>
                <el-descriptions-item label="上次计划时间">
                  {{ formatOptionalTime(row.last_run?.scheduled_run_time) }}
                </el-descriptions-item>
                <el-descriptions-item label="上次开始时间">
                  {{ formatOptionalTime(row.last_run?.started_at) }}
                </el-descriptions-item>
                <el-descriptions-item label="上次结束时间">
                  {{ formatOptionalTime(row.last_run?.finished_at) }}
                </el-descriptions-item>
                <el-descriptions-item label="上次耗时">
                  {{ formatDuration(row.last_run?.duration_ms) }}
                </el-descriptions-item>
                <el-descriptions-item label="上次消息" :span="2">
                  {{ row.last_run?.message || "--" }}
                </el-descriptions-item>
                <el-descriptions-item label="错误信息" :span="2">
                  <pre v-if="row.last_run?.error" class="error-content">{{ formatError(row.last_run.error) }}</pre>
                  <span v-else>--</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="任务 ID" min-width="180" show-overflow-tooltip />
        <el-table-column prop="name" label="任务名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="Trigger" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatTrigger(row.trigger) }}
          </template>
        </el-table-column>
        <el-table-column label="任务状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getJobStatusType(row.status)">
              {{ row.status || "unknown" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下一次运行" width="170">
          <template #default="{ row }">
            {{ formatOptionalTime(row.next_run_time) }}
          </template>
        </el-table-column>
        <el-table-column label="上次结果" width="110">
          <template #default="{ row }">
            <el-tag :type="getLastRunStatusType(row.last_run?.status)">
              {{ row.last_run?.status || "无记录" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上次开始" width="170">
          <template #default="{ row }">
            {{ formatOptionalTime(row.last_run?.started_at) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ formatDuration(row.last_run?.duration_ms) }}
          </template>
        </el-table-column>
        <el-table-column label="消息" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.last_run?.message || "--" }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import axios from "@/api/axios";
import { formatDateTime } from "@/utils/date";

type SchedulerInfo = {
  enabled?: boolean;
  running?: boolean;
  timezone?: string;
  is_master?: boolean;
  generated_at?: string;
};

type SchedulerJob = {
  id?: string;
  name?: string;
  func?: string;
  trigger?: {
    type?: string;
    description?: string;
  };
  status?: string;
  next_run_time?: string | null;
  last_run?: {
    status?: string;
    scheduled_run_time?: string;
    started_at?: string;
    finished_at?: string;
    duration_ms?: number;
    message?: string;
    error?: unknown;
  } | null;
};

const loading = ref(false);
const error = ref("");
const scheduler = ref<SchedulerInfo | null>(null);
const jobs = ref<SchedulerJob[]>([]);
const lastLoadedAt = ref("");

const formatOptionalTime = (value?: string | null) => {
  return value ? formatDateTime(value) : "--";
};

const formatDuration = (duration?: number | null) => {
  if (duration === undefined || duration === null) return "--";
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
};

const formatTrigger = (trigger?: SchedulerJob["trigger"]) => {
  if (!trigger) return "--";
  return trigger.description || trigger.type || "--";
};

const formatError = (value: unknown) => {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const getJobStatusType = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (["scheduled", "running", "success", "active"].includes(normalized)) return "success";
  if (["paused", "missed"].includes(normalized)) return "warning";
  if (["error", "failed", "failure"].includes(normalized)) return "danger";
  return "info";
};

const getLastRunStatusType = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "running") return "primary";
  if (normalized === "missed") return "warning";
  if (["error", "failed", "failure"].includes(normalized)) return "danger";
  return "info";
};

const fetchSchedulerJobs = async () => {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await axios.get("/scheduler/jobs");
    scheduler.value = data.scheduler || null;
    jobs.value = Array.isArray(data.jobs) ? data.jobs : [];
    lastLoadedAt.value = new Date().toISOString();
  } catch (err: any) {
    error.value =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.response?.data?.detail ||
      err.message ||
      "获取调度器任务状态失败";
    ElMessage.error(error.value);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSchedulerJobs();
});
</script>

<style scoped>
.scheduler-jobs-page {
  flex: 1;
  width: 100%;
  min-height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  background: #f9fafb;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 8px;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.loaded-time,
.job-count {
  color: #909399;
  font-size: 13px;
}

.page-alert,
.summary-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.jobs-card {
  margin-bottom: 16px;
}

.job-detail {
  padding: 12px 24px;
  background: #fafafa;
}

.mono-text {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
}

.error-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #f56c6c;
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
