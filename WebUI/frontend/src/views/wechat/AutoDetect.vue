<template>
  <div class="auto-detect-page">
    <section class="page-header">
      <div>
        <h2>自动检测列表</h2>
        <p>每日自动采集与合规检测</p>
      </div>
      <el-button :loading="listLoading" @click="fetchAutoDetectAccounts(true)">
        <el-icon><Refresh /></el-icon>
        <span>刷新</span>
      </el-button>
    </section>

    <div class="workspace">
      <aside class="add-panel">
        <div class="section-title">
          <span>添加公众号</span>
          <el-tag size="small" type="info" effect="plain">仅限库内</el-tag>
        </div>

        <el-select
          v-model="selectedAffiliationIds"
          class="account-select"
          multiple
          filterable
          remote
          reserve-keyword
          collapse-tags
          collapse-tags-tooltip
          clearable
          :remote-method="searchAffiliations"
          :loading="searchLoading"
          placeholder="搜索已入库公众号"
          @visible-change="handleSelectVisible"
        >
          <el-option
            v-for="option in libraryOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
            :disabled="isAlreadyAdded(option.value)"
          >
            <div class="option-row">
              <span>{{ option.label }}</span>
              <span v-if="option.alias" class="option-alias">{{
                option.alias
              }}</span>
            </div>
          </el-option>
          <template #empty>
            <div class="select-empty">
              {{
                searchKeyword
                  ? "库中没有这个公众号，不能添加"
                  : "暂无可选公众号"
              }}
            </div>
          </template>
        </el-select>

        <el-button
          class="add-button"
          type="primary"
          :loading="addLoading"
          :disabled="selectedAffiliationIds.length === 0"
          @click="addSelectedAccounts"
        >
          <el-icon><Plus /></el-icon>
          <span>加入自动检测列表</span>
        </el-button>

        <el-divider />

        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">配置总数</span>
            <strong>{{ summary.total }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">启用中</span>
            <strong>{{ summary.enabled }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">已停用</span>
            <strong>{{ summary.disabled }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">今日已检测</span>
            <strong>{{ summary.detected_today }}</strong>
          </div>
        </div>
      </aside>

      <section class="list-panel">
        <div class="list-toolbar">
          <el-input
            v-model="listFilters.keyword"
            clearable
            placeholder="搜索列表中的公众号"
            prefix-icon="Search"
            @clear="fetchAutoDetectAccounts(false)"
            @keyup.enter="fetchAutoDetectAccounts(false)"
          />
          <el-select
            v-model="listFilters.status"
            class="status-filter"
            placeholder="状态"
            @change="fetchAutoDetectAccounts(false)"
          >
            <el-option label="启用中" value="enabled" />
            <el-option label="已停用" value="disabled" />
          </el-select>
        </div>

        <el-alert
          v-if="error"
          :title="error"
          type="error"
          show-icon
          class="list-alert"
        />

        <el-table
          :data="listItems"
          class="account-table"
          stripe
          border
          empty-text="暂无自动检测公众号"
          v-loading="listLoading"
        >
          <el-table-column label="公众号" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="account-cell">
                <span class="account-name">{{ getAccountName(row) }}</span>
                <span class="account-id">{{
                  getAffiliationId(row) || "--"
                }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row)" effect="plain">
                {{ getStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="每日检测" width="120" align="center">
            <template #default="{ row }">
              {{ row.schedule_time || summary.default_schedule_time || "每日" }}
            </template>
          </el-table-column>
          <el-table-column label="最近采集" width="170">
            <template #default="{ row }">
              {{ formatTime(row.last_crawl_at) }}
            </template>
          </el-table-column>
          <el-table-column label="最近检测" width="170">
            <template #default="{ row }">
              {{ formatTime(row.last_detected_at) }}
            </template>
          </el-table-column>
          <el-table-column label="最近结果" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="getResultType(row)" effect="plain">
                {{ formatResult(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="120"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                v-if="isEnabledAccount(row)"
                link
                type="danger"
                :loading="actionLoadingKey === getRowKey(row)"
                @click.stop="confirmRemove(row)"
              >
                <el-icon><Delete /></el-icon>
                <span>移除自动监测</span>
              </el-button>
              <el-button
                v-else
                link
                type="primary"
                :loading="actionLoadingKey === getRowKey(row)"
                @click.stop="enableAccount(row)"
              >
                <el-icon><Plus /></el-icon>
                <span>加入自动监测</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="pagination"
          background
          layout="total, prev, pager, next, jumper, sizes"
          :total="total"
          v-model:current-page="page"
          v-model:page-size="perPage"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "@/api/axios";

type AccountValue = string | number;

interface LibraryAccount {
  value: AccountValue;
  label: string;
  alias?: string;
}

interface AutoDetectAccount {
  id?: AccountValue;
  affiliation_id?: AccountValue;
  value?: AccountValue;
  fakeid?: AccountValue;
  name?: string;
  label?: string;
  nickname?: string;
  affiliation?: string;
  alias?: string;
  enabled?: boolean;
  status?: string;
  schedule_time?: string;
  last_crawl_at?: string | null;
  last_detected_at?: string | null;
  last_status?: string;
  last_error?: string;
  result?: number;
  mistake_num?: number;
}

interface Summary {
  total: number;
  enabled: number;
  disabled: number;
  detected_today: number;
  default_schedule_time?: string;
}

const selectedAffiliationIds = ref<AccountValue[]>([]);
const libraryOptions = ref<LibraryAccount[]>([]);
const searchKeyword = ref("");
const searchLoading = ref(false);
const addLoading = ref(false);
const listLoading = ref(false);
const actionLoadingKey = ref("");
const error = ref("");

const listItems = ref<AutoDetectAccount[]>([]);
const total = ref(0);
const page = ref(1);
const perPage = ref(20);
const summary = ref<Summary>({
  total: 0,
  enabled: 0,
  disabled: 0,
  detected_today: 0,
  default_schedule_time: "每日 02:00",
});

const listFilters = ref({
  keyword: "",
  status: "enabled",
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const addedAffiliationIds = computed(() => {
  return new Set(
    listItems.value
      .map((item) => getAffiliationId(item))
      .filter(
        (value): value is AccountValue => value !== undefined && value !== null
      )
      .map((value) => String(value))
  );
});

function normalizeLibraryAccounts(items: any[]): LibraryAccount[] {
  const normalized: LibraryAccount[] = [];

  items.forEach((item) => {
    const value =
      item?.value ?? item?.affiliation_id ?? item?.fakeid ?? item?.id;
    const label =
      item?.label ?? item?.nickname ?? item?.name ?? item?.affiliation;

    if (value === undefined || value === null || !label) return;
    normalized.push({
      value,
      label: String(label),
      alias: item?.alias,
    });
  });

  return normalized;
}

function extractItems(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getErrorMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

async function loadInitialLibraryAccounts() {
  searchLoading.value = true;

  try {
    const { data } = await axios.get("/wechat/affiliation/list");
    libraryOptions.value = normalizeLibraryAccounts(extractItems(data));
  } catch (err: any) {
    ElMessage.error(getErrorMessage(err, "加载公众号列表失败"));
  } finally {
    searchLoading.value = false;
  }
}

function searchAffiliations(query: string) {
  searchKeyword.value = query.trim();
  if (searchTimer) clearTimeout(searchTimer);

  searchTimer = setTimeout(async () => {
    if (!searchKeyword.value) {
      await loadInitialLibraryAccounts();
      return;
    }

    searchLoading.value = true;
    try {
      const { data } = await axios.post("/wechat/search_affiliation", {
        q: searchKeyword.value,
        page: 1,
        pageSize: 30,
      });
      libraryOptions.value = normalizeLibraryAccounts(extractItems(data));
    } catch (err: any) {
      libraryOptions.value = [];
      ElMessage.error(getErrorMessage(err, "搜索公众号失败"));
    } finally {
      searchLoading.value = false;
    }
  }, 300);
}

function handleSelectVisible(visible: boolean) {
  if (visible && libraryOptions.value.length === 0 && !searchKeyword.value) {
    loadInitialLibraryAccounts();
  }
}

function isAlreadyAdded(value: AccountValue) {
  return addedAffiliationIds.value.has(String(value));
}

async function addSelectedAccounts() {
  const affiliationIds = selectedAffiliationIds.value.filter(
    (value) => !isAlreadyAdded(value)
  );

  if (affiliationIds.length === 0) {
    ElMessage.warning("请选择未加入列表的公众号");
    return;
  }

  addLoading.value = true;
  try {
    const { data } = await axios.post("/wechat/auto-detect/accounts", {
      affiliation_ids: affiliationIds,
    });

    const rejected = Array.isArray(data?.rejected) ? data.rejected : [];
    selectedAffiliationIds.value = [];
    await fetchAutoDetectAccounts(true);

    if (rejected.length > 0) {
      ElMessage.warning(`有 ${rejected.length} 个公众号不在库中，不能添加`);
    } else {
      ElMessage.success("已加入自动检测列表");
    }
  } catch (err: any) {
    ElMessage.error(getErrorMessage(err, "添加自动检测公众号失败"));
  } finally {
    addLoading.value = false;
  }
}

function applyListPayload(payload: any) {
  const items = extractItems(payload);
  const meta = payload?._meta || payload?.meta || {};
  const rawSummary = payload?.summary || {};
  const enabledCount = items.filter(isEnabledAccount).length;

  listItems.value = items;
  total.value = Number(
    meta.total_items ?? meta.total ?? rawSummary.total ?? items.length
  );
  summary.value = {
    total: Number(rawSummary.total ?? total.value),
    enabled: Number(rawSummary.enabled ?? enabledCount),
    disabled: Number(
      rawSummary.disabled ?? Math.max(total.value - enabledCount, 0)
    ),
    detected_today: Number(rawSummary.detected_today ?? 0),
    default_schedule_time: rawSummary.default_schedule_time || "每日 02:00",
  };
}

async function fetchAutoDetectAccounts(keepPage = false) {
  if (!keepPage) page.value = 1;

  listLoading.value = true;
  error.value = "";

  try {
    const { data } = await axios.get("/wechat/auto-detect/accounts", {
      params: {
        page: page.value,
        per_page: perPage.value,
        keyword: listFilters.value.keyword || undefined,
        status: listFilters.value.status || undefined,
      },
    });
    applyListPayload(data);
  } catch (err: any) {
    error.value = getErrorMessage(err, "加载自动检测列表失败");
    ElMessage.error(error.value);
  } finally {
    listLoading.value = false;
  }
}

function handlePageChange() {
  fetchAutoDetectAccounts(true);
}

function handlePageSizeChange() {
  fetchAutoDetectAccounts(false);
}

async function confirmRemove(row: AutoDetectAccount) {
  try {
    await ElMessageBox.confirm(
      `确定移除“${getAccountName(row)}”吗？`,
      "移除公众号",
      {
        confirmButtonText: "移除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch {
    return;
  }

  await removeAccount(row);
}

async function removeAccount(row: AutoDetectAccount) {
  const rowKey = getRowKey(row);
  if (!rowKey) return;

  actionLoadingKey.value = rowKey;
  try {
    await axios.delete(
      `/wechat/auto-detect/accounts/${encodeURIComponent(rowKey)}`
    );
    ElMessage.success("已移除公众号");
    await fetchAutoDetectAccounts(true);
  } catch (err: any) {
    ElMessage.error(getErrorMessage(err, "移除公众号失败"));
  } finally {
    actionLoadingKey.value = "";
  }
}

async function enableAccount(row: AutoDetectAccount) {
  const affiliationId = getAffiliationId(row);
  const rowKey = getRowKey(row);
  if (affiliationId === undefined || affiliationId === null || !rowKey) return;

  actionLoadingKey.value = rowKey;
  try {
    await axios.post("/wechat/auto-detect/accounts", {
      affiliation_ids: [affiliationId],
    });
    ElMessage.success("已加入自动检测列表");
    await fetchAutoDetectAccounts(true);
  } catch (err: any) {
    ElMessage.error(getErrorMessage(err, "加入自动检测列表失败"));
  } finally {
    actionLoadingKey.value = "";
  }
}

function getRowKey(row: AutoDetectAccount) {
  const value = getAffiliationId(row) ?? row.id;
  return value === undefined || value === null ? "" : String(value);
}

function getAffiliationId(row: AutoDetectAccount) {
  return row.affiliation_id ?? row.value ?? row.fakeid;
}

function getAccountName(row: AutoDetectAccount) {
  return row.name || row.label || row.nickname || row.affiliation || "--";
}

function isEnabledAccount(row: AutoDetectAccount) {
  return row.enabled === true || row.status === "enabled";
}

function getStatusLabel(row: AutoDetectAccount) {
  return isEnabledAccount(row) ? "启用中" : "已停用";
}

function getStatusType(row: AutoDetectAccount) {
  return isEnabledAccount(row) ? "success" : "info";
}

function formatTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatResult(row: AutoDetectAccount) {
  const count = row.mistake_num ?? row.result;
  if (typeof count === "number")
    return count > 0 ? `${count} 个错误` : "无错误";
  return row.last_status || "--";
}

function getResultType(row: AutoDetectAccount) {
  const count = row.mistake_num ?? row.result;
  if (typeof count === "number") return count > 0 ? "danger" : "success";
  return "info";
}

onMounted(() => {
  fetchAutoDetectAccounts();
  loadInitialLibraryAccounts();
});
</script>

<style scoped>
.auto-detect-page {
  flex: 1;
  width: 100%;
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
  background: #f5f7fa;
  overflow: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 6px;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.page-header .el-button span,
.add-button span {
  margin-left: 6px;
}

.workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.add-panel,
.list-panel {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
}

.add-panel {
  padding: 16px;
  align-self: start;
}

.section-title,
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  margin-bottom: 14px;
  font-weight: 600;
  color: #303133;
}

.account-select,
.add-button {
  width: 100%;
}

.add-button {
  margin-top: 12px;
}

.select-empty {
  padding: 12px;
  color: #909399;
  text-align: center;
  font-size: 13px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.option-alias {
  color: #909399;
  font-size: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafcff;
}

.stat-label {
  display: block;
  margin-bottom: 6px;
  color: #909399;
  font-size: 12px;
}

.stat-item strong {
  color: #303133;
  font-size: 22px;
}

.list-panel {
  min-width: 0;
  padding: 12px;
}

.list-toolbar {
  margin-bottom: 12px;
}

.list-toolbar .el-input {
  flex: 1;
}

.status-filter {
  width: 140px;
}

.list-alert {
  margin-bottom: 12px;
}

.account-table {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.account-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.account-name {
  color: #303133;
  font-weight: 600;
}

.account-id {
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .page-header,
  .list-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .status-filter {
    width: 100%;
  }
}
</style>
