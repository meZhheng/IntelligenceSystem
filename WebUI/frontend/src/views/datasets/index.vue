<template>
  <div class="dataset-manager">
    <!-- 1. 筛选 & 操作栏 -->
    <el-card class="filter-panel">
      <el-form :inline="true" size="small" class="filter-form">
        <el-form-item>
          <el-input
            v-model="filters.search"
            placeholder="按名称搜索"
            clearable
            @clear="fetchData"
            @keyup.enter.native="fetchData"
            style="width: 300px"
          >
            <template #append>
              <el-button icon="Search" @click="fetchData"></el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="filters.types"
            multiple
            :collapse-tags="true"
            :collapse-tags-tooltip="true"
            :max-collapse-tags="1"
            placeholder="全部类型"
            @change="fetchData"
            style="width: 200px"
          >
            <el-option
              v-for="t in datasetTypes"
              :key="t.name"
              :label="t.alias"
              :value="t.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="创建者">
          <el-select
            v-model="filters.own"
            placeholder="全部"
            @change="fetchData"
            style="width: 150px"
          >
            <el-option label="我的" :value="true" />
            <el-option label="他人 / 共享" :value="false" />
            <el-option label="全部" :value="null" />
          </el-select>
        </el-form-item>
        <el-form-item label="共享">
          <el-switch
            v-model="filters.shared"
            active-text="只看共享"
            inactive-text="查看全部"
            @change="fetchData"
          />
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="fetchData"
            @clear="fetchData"
          />
        </el-form-item>

        <!-- 批量操作 -->
        <el-form-item class="batch-actions">
          <el-dropdown @command="handleImport">
            <!-- 触发按钮 -->
            <el-button type="info" size="small">
              数据导入
              <el-icon style="margin-left: 4px">
                <ArrowDown />
              </el-icon>
            </el-button>
            <!-- 下拉菜单放到 #dropdown 插槽里 -->
            <template #dropdown>
              <el-dropdown-menu>
                <!-- <el-dropdown-item command="online">在线导入</el-dropdown-item> -->
                <el-dropdown-item command="local"
                  >从本地文件导入</el-dropdown-item
                >
                <el-dropdown-item command="remote"
                  >从舆情系统导入</el-dropdown-item
                >
                <!-- <el-dropdown-item command="offline">离线导入</el-dropdown-item> -->
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            type="danger"
            size="small"
            style="margin-left: 12px"
            :disabled="!multipleSelection.length"
            @click="batchDelete"
            >批量删除</el-button
          >
          <el-button
            type="success"
            size="small"
            :disabled="!multipleSelection.length"
            @click="batchToggleShared"
            >批量切换共享</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>
    <!-- 2. 数据表格 -->
    <el-table
      :data="dataList"
      stripe
      border
      :default-sort="{ prop: 'updated_time', order: 'descending' }"
      @sort-change="onSortChange"
      @selection-change="handleSelectionChange"
      style="width: 100%"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column
        prop="label"
        label="名称"
        sortable="custom"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column prop="type" label="类型" width="180" />
      <el-table-column
        prop="total_data"
        label="条数"
        sortable="custom"
        width="120"
        :formatter="(row) => row.total_data.toLocaleString()"
      />
      <el-table-column
        prop="created_time"
        label="创建时间"
        sortable="custom"
        width="200"
      />
      <el-table-column
        prop="updated_time"
        label="更新时间"
        sortable="custom"
        width="200"
      />
      <el-table-column
        prop="shared"
        label="共享"
        width="60"
        :formatter="(row) => (row.shared ? '是' : '否')"
      />
      <el-table-column
        prop="description"
        label="描述"
        min-width="320"
        show-overflow-tooltip
      />
      <el-table-column label="操作" fixed="right" width="100">
        <template #default="{ row }">
          <el-dropdown
            trigger="click"
            @command="(command) => handleCommand(command, row)"
          >
            <el-button type="primary" size="small">
              操作 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="view">查看</el-dropdown-item>
                <el-dropdown-item
                  command="export"
                  :disabled="exportingId === row.value"
                >
                  <span v-if="exportingId === row.value">
                    <el-icon name="loading" class="el-icon-loading"></el-icon>
                    导出中...
                  </span>
                  <span v-else>导出</span>
                </el-dropdown-item>
                <!-- 仅当类型为 SOCIAL 时显示检测操作 -->
                <el-dropdown-item
                  v-if="row.type_name === 'SOCIAL'"
                  command="detect"
                  :loading="row.detecting"
                  :disabled="row.detecting"
                >
                  检测
                </el-dropdown-item>
                <el-dropdown-item command="remove" divided
                  >删除</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <!-- 3. 分页 -->
    <div class="pagination">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="meta.total_items"
        :page-sizes="[20, 50, 100]"
        v-model:current-page="page"
        v-model:page-size="perPage"
        @size-change="onPageChange"
        @current-change="onPageChange"
      />
    </div>
  </div>
  <el-dialog
    title="在线导入"
    v-model="onlineDialogVisible"
    width="600px"
    @close="onDialogClose"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <!-- 这里给整个表单包一层容器，并加 v-loading -->
    <div v-loading="importing">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <!-- SSH 通道配置 -->
        <el-card shadow="always" style="margin-bottom: 20px">
          <h4>SSH 通道配置</h4>
          <el-form-item label="Host" prop="sshHost">
            <el-input v-model="form.sshHost" placeholder="请输入 SSH 主机 IP" />
          </el-form-item>
          <el-form-item label="Port" prop="sshPort">
            <el-input-number v-model="form.sshPort" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="用户名" prop="sshUser">
            <el-input v-model="form.sshUser" placeholder="请输入 SSH 用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="sshPass">
            <el-input
              v-model="form.sshPass"
              type="password"
              placeholder="请输入 SSH 密码"
            />
          </el-form-item>
        </el-card>

        <!-- 数据库配置 -->
        <el-card shadow="always">
          <h4>数据库配置</h4>
          <el-form-item label="Host">
            <el-input v-model="form.dbHost" disabled />
          </el-form-item>
          <el-form-item label="Port" prop="dbPort">
            <el-input-number v-model="form.dbPort" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="用户名" prop="dbUser">
            <el-input v-model="form.dbUser" placeholder="请输入数据库用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="dbPass">
            <el-input
              v-model="form.dbPass"
              type="password"
              placeholder="请输入数据库密码"
            />
          </el-form-item>
        </el-card>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="onDialogClose" :disabled="importing">取 消</el-button>
      <el-button type="primary" @click="onSubmit" :loading="importing"
        >确 定</el-button
      >
    </template>
  </el-dialog>
  <el-dialog
    title="从舆情系统远程导入"
    v-model="remoteDialogVisible"
    width="900px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <div v-loading="importing">
      <el-form
        ref="remoteFormRef"
        :model="remoteForm"
        :rules="remoteFormRules"
        label-width="120px"
        label-position="left"
        style="padding-right: 20px"
      >
        <el-alert
          title="说明：该功能会从现有舆情系统远程导入数据，请填写以下参数。"
          type="info"
          show-icon
          style="margin-bottom: 20px"
        />

        <!-- 数据集选择/创建 -->
        <el-form-item label="存储位置" prop="operationType">
          <el-radio-group v-model="remoteForm.operationType">
            <el-radio label="new">创建新数据集</el-radio>
            <el-radio label="existing">存入已有数据集</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="remoteForm.operationType === 'new'"
          label="数据集名称"
          prop="newDatasetName"
        >
          <el-input
            v-model="remoteForm.newDatasetName"
            placeholder="请输入新数据集名称"
            clearable
          />
        </el-form-item>

        <el-form-item
          v-if="remoteForm.operationType === 'existing'"
          label="选择数据集"
          prop="existingDatasetId"
        >
          <el-select
            v-model="remoteForm.existingDatasetId"
            placeholder="请选择已有数据集"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="dataset in existingDatasets"
              :key="dataset.id"
              :label="dataset.name"
              :value="dataset.id"
            />
          </el-select>
        </el-form-item>

        <!-- 时间范围选择 - 优化为两个独立选择器 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker
                v-model="remoteForm.startTime"
                type="datetime"
                placeholder="选择开始时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker
                v-model="remoteForm.endTime"
                type="datetime"
                placeholder="选择结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 关键词 - 添加可选提示 -->
        <el-form-item label="关键词表达式" prop="expression">
          <el-input v-model="remoteForm.expression" placeholder="" clearable />
          <div class="tip">留空表示获取所有数据，支持 & | ! 等逻辑运算符</div>
        </el-form-item>

        <!-- 字段多选 - 显示中文 + 全选功能 -->
        <el-form-item label="获取字段" prop="field">
          <div class="field-actions">
            <el-button
              type="text"
              @click="toggleAllFields(true)"
              :disabled="allFieldsSelected"
            >
              全选
            </el-button>
            <el-button
              type="text"
              @click="toggleAllFields(false)"
              :disabled="!anyFieldSelected"
            >
              取消全选
            </el-button>
            <el-button type="text" @click="restoreDefaults()">
              恢复默认
            </el-button>
            <span class="field-count"
              >已选 {{ remoteForm.field.length }}/{{
                remoteFieldOptions.length
              }}
              项</span
            >
          </div>
          <el-checkbox-group v-model="remoteForm.field">
            <el-row :gutter="20">
              <el-col
                v-for="(item, index) in remoteFieldOptions"
                :key="index"
                :span="8"
                style="margin-bottom: 8px"
              >
                <el-checkbox :label="item.value">
                  {{ item.label }}
                </el-checkbox>
              </el-col>
            </el-row>
          </el-checkbox-group>
        </el-form-item>

        <!-- 数据量 - 支持全量获取 -->
        <el-form-item label="获取数据量" prop="dataSize" class="data-size-item">
          <el-checkbox
            v-model="remoteForm.isFullData"
            @change="handleFullDataChange"
            style="margin-bottom: 12px"
          >
            获取全部数据
          </el-checkbox>
          <el-input-number
            v-model="remoteForm.dataSize"
            :min="1"
            :max="10000"
            :step="100"
            :disabled="remoteForm.isFullData"
            placeholder="请输入要获取的数据量（1-10000）"
            style="width: 100%"
          />
          <div class="tip" :class="{ 'warning-tip': remoteForm.isFullData }">
            <span v-if="remoteForm.isFullData"
              >系统将获取全部符合条件的数据，数量受舆情系统总量限制</span
            >
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onRemoteDialogClose" :disabled="importing"
          >取 消</el-button
        >
        <el-button
          type="primary"
          @click="onRemoteFromSubmit"
          :loading="importing"
          :disabled="importing"
        >
          <span v-if="importing">导入中...</span>
          <span v-else>确 定</span>
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from "vue";
import axios from "@/api/axios";
import { useRouter } from "vue-router";
import { ElMessageBox, ElMessage, ElNotification } from "element-plus";

const router = useRouter();

// 筛选状态
const filters = reactive({
  search: "",
  types: [] as string[],
  own: null as boolean | null,
  shared: false,
  dateRange: [] as [string, string] | [],
});

// 排序 & 分页
const sort = reactive({ prop: "updated_time", order: "desc" });
const page = ref(1);
const perPage = ref(20);

// 数据
const dataList = ref<any[]>([]);
const meta = reactive({ total_items: 0 });

// 用户选的多条
const multipleSelection = ref<any[]>([]);

// 当 selection 变化时触发
const handleSelectionChange = (val: any[]) => {
  multipleSelection.value = val;
};

// 从后端获取可选类型
const datasetTypes = ref<{ name: string; alias: string }[]>([]);
async function fetchTypes() {
  // 假设接口 /datasets/types 返回 [{name,alias},…]
  const { data } = await axios.get("/datasets/types");
  datasetTypes.value = data;
}

// 拉取表格数据
async function fetchData() {
  const payload = {
    search: filters.search,
    types: filters.types,
    own: filters.own,
    shared: filters.shared,
    created_from: filters.dateRange?.[0] || null,
    created_to: filters.dateRange?.[1] || null,
    sort_by: sort.prop,
    order: sort.order,
    page: page.value,
    per_page: perPage.value,
  };
  const { data } = await axios.post("/datasets/list", payload);
  dataList.value = data.items;
  Object.assign(meta, data._meta);
}

function onSortChange({ prop, order }: any) {
  sort.prop = prop;
  sort.order = order === "ascending" ? "asc" : "desc";
  fetchData();
}

function onPageChange() {
  fetchData();
}

// 单条操作
function view(row: any) {
  router.push({
    name: "DatasetDetail",
    params: { dataset_id: row.value },
  });
}

async function remove(row: any) {
  ElMessageBox.confirm(
    `确定要删除数据集「${row.label}」吗？此操作不可恢复。`,
    "确认删除",
    {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      deleteDataset(row.value);
    })
    .catch(() => {
      ElMessage.info("取消删除");
    });
}

async function deleteDataset(dataset_id: number) {
  try {
    const res = await axios.delete(`/datasets/${dataset_id}`);
    // 后端返回的 message 字段
    const msg = res.data?.message || "删除成功";
    ElMessage.success(msg);
    // 刷新列表
    fetchData();
  } catch (error: any) {
    // 优先显示后端传回的错误信息
    const errMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "删除失败，请稍后重试";
    ElMessage.error(errMsg);
  }
}

async function detectDataset(row) {
  // row.value 约定为 dataset_id
  const datasetId = row.value;

  // 可选：UI 层面防止用户重复点击
  row.detecting = true;

  try {
    const response = await axios.post(
      "/datasets/compare_yq/entry/dataset",
      {
        dataset_id: datasetId,
      },
      {
        // 已是后台任务，不需要超长 timeout
        timeout: 15000,
      }
    );

    if (response.status === 202) {
      const { job_id, lock_ttl_remaining_sec } = response.data;

      ElNotification({
        title: "任务已提交",
        message: `数据集检测任务已进入后台队列（Job ID: ${job_id}）`,
        type: "success",
        duration: 4000,
      });

      // 🔧 可选：把 job_id 记录在 row 上，供后续状态查询
      row.detect_job_id = job_id;
      row.detect_status = "running";

      return;
    }

    ElMessage.warning("任务提交成功，但返回状态异常");
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 423) {
        const remaining = data?.lock_ttl_remaining_sec;

        ElMessage.warning(
          remaining
            ? `该数据集正在处理中，请约 ${Math.ceil(remaining / 60)} 分钟后再试`
            : "该数据集正在处理中，请稍后再试"
        );

        return;
      }

      /**
       * === 4xx / 5xx 其它错误 ===
       */
      ElMessage.error(data?.error || `请求失败（HTTP ${status}）`);
    } else if (error.code === "ECONNABORTED") {
      ElMessage.error("请求超时，请检查网络连接");
    } else {
      ElMessage.error("无法连接服务器");
    }
  } finally {
    row.detecting = false;
  }
}

function handleCommand(command, row) {
  switch (command) {
    case "view":
      view(row);
      break;
    case "export":
      export_dataset(row);
      break;
    case "detect":
      detectDataset(row); // 需要实现这个方法
      break;
    case "remove":
      remove(row);
      break;
  }
}

// 批量操作
async function batchDelete() {
  const ids = multipleSelection.value.map((r) => r.value);
  if (ids.length === 0) {
    ElMessage.warning("请先选择要删除的数据集");
    return;
  }

  // 可选：添加二次确认
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 个数据集？`,
      "批量删除",
      {
        type: "warning",
      }
    );

    const res = await axios.post("/datasets/batch_delete", { ids });
    const msg = res.data?.message || `成功删除 ${ids.length} 条`;
    ElMessage.success(msg);
    fetchData();
  } catch (err: any) {
    // 如果用户取消确认框，不做提示
    if (err === "cancel" || err === "close") return;

    const errMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "批量删除失败，请稍后重试";
    ElMessage.error(errMsg);
  }
}
async function batchToggleShared() {
  const ids = multipleSelection.value.map((r) => r.value);
  if (ids.length === 0) {
    ElMessage.warning("请先选择要切换共享的数据集");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要切换选中的 ${ids.length} 个数据集的共享状态？`,
      "批量切换共享状态",
      {
        type: "warning",
      }
    );

    const res = await axios.post("/datasets/batch_toggle_shared", { ids });
    const msg = res.data?.message || `成功删除 ${ids.length} 条`;
    ElMessage.success(msg);
    fetchData();
  } catch (err: any) {
    // 如果用户取消确认框，不做提示
    if (err === "cancel" || err === "close") return;

    const errMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "批量切换共享失败，请稍后重试";
    ElMessage.error(errMsg);
  }
}

const exportingId = ref<number | null>(null);

function extractFilename(disposition: string, fallbackName: string) {
  // 优先匹配 filename*=UTF-8''xxx
  let match = disposition.match(/filename\*=UTF-8''([^;]+)(;|$)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  // 再匹配 filename=xxx
  match = disposition.match(/filename="?([^"]+)"?/);
  if (match) {
    return match[1];
  }

  // fallback
  return fallbackName;
}

async function export_dataset(row: any) {
  exportingId.value = row.value;

  const response = await axios.get(`/datasets/${row.value}/export`, {
    responseType: "blob",
    timeout: 60000,
  });

  const disposition = response.headers["content-disposition"] || "";
  const filename = extractFilename(disposition, `${row.label}.xlsx`);

  const blob = new Blob([response.data], { type: response.data.type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  exportingId.value = null;
}

async function handleImport(command: string) {
  if (command === "online") {
    importOnline();
  } else if (command === "offline") {
    importOffline();
  } else if (command === "remote") {
    remoteDialogVisible.value = true;
  } else if (command === "local") {
    const route = router.resolve({
      name: "DatasetUpload",
    });
    // 在新窗口打开目标 URL
    window.open(route.href, "_blank");
  }
}

async function importOnline() {
  // TODO: 弹出在线导入的对话框或跳转
  onlineDialogVisible.value = true;
}
async function importOffline() {
  // TODO: 弹出离线导入的上传组件或跳转
  ElMessage.info("点击了“离线导入”");
}

// 控制 Dialog 显示
const onlineDialogVisible = ref(false);

// 表单模型
const form = reactive({
  sshHost: "202.121.180.70",
  sshPort: 2018,
  sshUser: "admin",
  sshPass: "",
  dbHost: "127.0.0.1",
  dbPort: 3306,
  dbUser: "root",
  dbPass: "",
});
// 校验规则
const rules = {
  sshHost: [{ required: true, message: "请输入 SSH Host", trigger: "blur" }],
  sshPort: [{ required: true, message: "请输入 SSH Port", trigger: "change" }],
  sshUser: [{ required: true, message: "请输入 SSH 用户名", trigger: "blur" }],
  sshPass: [{ required: true, message: "请输入 SSH 密码", trigger: "blur" }],
  dbPort: [{ required: true, message: "请输入数据库端口", trigger: "change" }],
  dbUser: [{ required: true, message: "请输入数据库用户名", trigger: "blur" }],
  dbPass: [{ required: true, message: "请输入数据库密码", trigger: "blur" }],
};

const formRef = ref();
// 取消 / 关闭
function onDialogClose() {
  onlineDialogVisible.value = false;
}

// 确定提交
async function onSubmit() {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return;

    importOnlineDataset();
  });
}

const importing = ref(false);
async function importOnlineDataset() {
  try {
    importing.value = true;
    const res = await axios.post("/datasets/import/online", form, {
      timeout: 60000,
    });
    ElMessage.success(res.data.message || "导入成功");
    onlineDialogVisible.value = false;
    fetchData(); // 刷新数据列表
  } catch (error: any) {
    const errMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "导入失败，请稍后重试";
    ElMessage.error(errMsg);
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  await fetchTypes();
  await fetchData();
});

const remoteDialogVisible = ref(false);
const remoteFormRef = ref();
const existingDatasets = ref([]); // 存储已有数据集

// 字段中英文映射
const remoteFieldOptions = [
  { value: "title", label: "标题" },
  { value: "content", label: "内容" },
  { value: "poster", label: "发布者" },
  { value: "publishDate", label: "发布时间" },
  { value: "sentiment", label: "情感倾向" },
  { value: "location", label: "地理位置" },
  { value: "newsClassify", label: "新闻分类" },
  { value: "siteName", label: "来源网站" },
  { value: "commentNum", label: "评论数" },
  { value: "likeNum", label: "点赞数" },
  { value: "forwardNum", label: "转发数" },
  { value: "pageUrl", label: "原文链接" },
  { value: "concernNum", label: "关注数" },
  { value: "verifiedType", label: "认证类型" },
];

const remoteForm = reactive({
  operationType: "new", // new/existing
  newDatasetName: "",
  existingDatasetId: "",
  startTime: "",
  endTime: "",
  expression: "",
  field: [
    "title",
    "content",
    "poster",
    "pageUrl",
    "publishDate",
    "sentiment",
    "siteName",
  ],
  dataSize: 100,
  isFullData: true, // 是否获取全部数据
});
const remoteFormRules = {
  operationType: [
    { required: true, message: "请选择存储方式", trigger: "change" },
  ],
  newDatasetName: [
    {
      required: true,
      message: "数据集名称不能为空",
      trigger: "blur",
      validator: (rule, value, callback) => {
        if (remoteForm.operationType === "new" && !value.trim()) {
          callback(new Error("数据集名称不能为空"));
        } else {
          callback();
        }
      },
    },
  ],
  existingDatasetId: [
    {
      required: true,
      message: "请选择要存入的数据集",
      trigger: "change",
      validator: (rule, value, callback) => {
        if (remoteForm.operationType === "existing" && !value) {
          callback(new Error("请选择要存入的数据集"));
        } else {
          callback();
        }
      },
    },
  ],
  startTime: [
    { required: true, message: "请选择开始时间", trigger: "change" },
    {
      validator: (rule, value, callback) => {
        if (
          value &&
          remoteForm.endTime &&
          new Date(value) > new Date(remoteForm.endTime)
        ) {
          callback(new Error("开始时间不能晚于结束时间"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
  endTime: [
    { required: true, message: "请选择结束时间", trigger: "change" },
    {
      validator: (rule, value, callback) => {
        if (
          value &&
          remoteForm.startTime &&
          new Date(value) < new Date(remoteForm.startTime)
        ) {
          callback(new Error("结束时间不能早于开始时间"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
  field: [{ required: true, message: "请选择至少一个字段", trigger: "change" }],
  dataSize: [
    {
      required: true,
      message: "请输入数据量",
      trigger: "blur",
      validator: (rule, value, callback) => {
        // 当不获取全部数据时才需要验证
        if (!remoteForm.isFullData) {
          if (!value || value < 1 || value > 10000) {
            callback(new Error("数据量必须在1-10000之间"));
          } else {
            callback();
          }
        } else {
          callback();
        }
      },
    },
  ],
};
// 关闭弹窗
function onRemoteDialogClose() {
  remoteDialogVisible.value = false;
  // 重置表单
  Object.assign(remoteForm, {
    operationType: "new",
    newDatasetName: "",
    existingDatasetId: "",
    startTime: "",
    endTime: "",
    expression: "",
    field: ["title", "content", "poster", "pageUrl", "publishDate", "siteName"],
    dataSize: 100,
  });
  // 重置验证
  if (remoteFormRef.value) {
    remoteFormRef.value.clearValidate();
  }
  // 刷新数据列表（根据实际需要调用）
  // fetchData();
}

// 提交表单
async function onRemoteFromSubmit() {
  if (!remoteFormRef.value) return;

  try {
    // 手动验证表单
    await remoteFormRef.value.validate();

    const payload = {
      startTime: remoteForm.startTime,
      endTime: remoteForm.endTime,
      expression: remoteForm.expression || "", // 空值处理
      field: remoteForm.field.join(","),
      isFullData: remoteForm.isFullData,
      dataSize: remoteForm.dataSize,
      operationType: remoteForm.operationType,
      // 根据操作类型添加不同参数
      ...(remoteForm.operationType === "new"
        ? { newDatasetName: remoteForm.newDatasetName.trim() }
        : { existingDatasetId: remoteForm.existingDatasetId }),
    };

    importing.value = true;
    const res = await axios.post("/datasets/import/remoteBase_V2", payload, {
      timeout: 60000,
    });

    ElMessage.success({
      message:
        remoteForm.operationType === "new"
          ? `数据集"${remoteForm.newDatasetName}"创建成功，共导入${res.data.count}条数据`
          : `数据已成功追加到所选数据集，新增${res.data.count}条数据`,
      duration: 3000,
    });

    onRemoteDialogClose();
  } catch (err) {
    let errorMsg = "导入失败：";
    if (err.response) {
      // 服务器返回错误
      errorMsg += err.response.data?.message || err.response.statusText;
    } else if (err.request) {
      // 请求未收到响应
      errorMsg += "网络请求超时，请检查网络连接";
    } else {
      // 其他错误
      errorMsg += err.message;
    }
    ElMessage.error(errorMsg);
  } finally {
    importing.value = false;
  }
}

// 获取已有数据集列表
async function fetchExistingDatasets() {
  try {
    const res = await axios.get("/datasets/list");
    existingDatasets.value = res.data || [];
  } catch (err) {
    console.error("获取数据集列表失败:", err);
    existingDatasets.value = [];
    ElMessage.warning("获取已有数据集列表失败，将只能创建新数据集");
  }
}

async function fetchDefaultDatasetName() {
  try {
    const res = await axios.get("/datasets/import/defaultName");
    remoteForm.newDatasetName = res.data;
  } catch (err) {
    console.error("获取默认数据集名称失败:", err);
    remoteForm.newDatasetName = "";
  }
}

// 当弹窗打开时获取数据集列表
watch(remoteDialogVisible, (newVal) => {
  if (newVal) {
    fetchExistingDatasets();
    fetchDefaultDatasetName();
  }
});

// 计算属性：是否全选
const allFieldsSelected = computed(() => {
  return remoteForm.field.length === remoteFieldOptions.length;
});

// 计算属性：是否有字段被选中
const anyFieldSelected = computed(() => {
  return remoteForm.field.length > 0;
});

const toggleAllFields = (selectAll) => {
  if (selectAll) {
    remoteForm.field = remoteFieldOptions.map((item) => item.value);
  } else {
    remoteForm.field = [];
  }
};

const restoreDefaults = () => {
  remoteForm.field = [
    "title",
    "content",
    "poster",
    "pageUrl",
    "publishDate",
    "sentiment",
    "siteName",
  ];
};

// 处理全量数据切换
const handleFullDataChange = (checked) => {
  if (checked) {
    // 保存当前值，但提交时会忽略
    remoteForm.dataSize = 100;
  }
  // 清除验证
  if (remoteFormRef.value) {
    remoteFormRef.value.clearValidate("dataSize");
  }
};
</script>

<style lang="scss" scoped>
.dataset-manager {
  flex: 1;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  box-sizing: border-box;
}

.filter-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;

  .el-card__body {
    width: 100%;
  }
}

.filter-form {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.filter-form .el-form-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0;
}
.batch-actions {
  margin-left: auto;
  margin: 0;
  display: flex;
  flex-direction: row;
  gap: 20px;
}
.pagination {
  width: 100%;
  margin-top: 20px;
  text-align: right;
}

.tip {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}
.warning-tip {
  color: #e6a23c;
}
.dataset-name-item {
  margin-bottom: 8px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-right: 20px;
}
.field-actions {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.field-count {
  margin-left: auto;
  font-size: 13px;
  color: #666;
}
.data-size-item {
  margin-top: 10px;
}
:deep(.el-checkbox__label) {
  font-size: 14px;
}
</style>
