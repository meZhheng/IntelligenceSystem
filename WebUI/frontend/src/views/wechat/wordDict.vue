<template>
  <div class="word-dict-page">
    <section class="page-header">
      <div class="header-copy">
        <h2>自定义词库管理</h2>
      </div>
      <div class="header-actions">
        <el-button :loading="listLoading" @click="refreshList">
          <el-icon><Refresh /></el-icon>
          <span>刷新当前结果</span>
        </el-button>
      </div>
    </section>

    <el-card class="filter-card" shadow="never">
      <div class="filter-header">
        <div>
          <h3>查找词汇</h3>
        </div>
      </div>

      <div class="filter-grid">
        <div class="filter-field type-filter">
          <label>词汇类型</label>
          <div class="type-filter-options">
            <el-checkbox-group v-model="typePickerValues" @change="handleTypePickerChange">
              <el-checkbox-button :label="ALL_TYPES_PICKER_VALUE">全部</el-checkbox-button>
              <el-checkbox-button
                v-for="option in WORD_TYPE_OPTIONS"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
          <p class="filter-help">可多选</p>
        </div>

        <div class="filter-field search-filter">
          <label>关键词搜索</label>
          <div class="search-row">
            <el-input
              v-model="query.search"
              clearable
              class="search-input"
              placeholder="输入词汇、推荐词或提示语关键词"
              @input="handleSearchInput"
              @clear="handleSearchClear"
              @keyup.enter="submitSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="submitSearch">
              <el-icon><Search /></el-icon>
              <span>查询</span>
            </el-button>
            <el-button :disabled="!hasActiveFilters" @click="resetFilters">重置</el-button>
          </div>
          <p class="filter-help">可搜索词汇、推荐词或提示语。</p>
        </div>
      </div>

      <div class="active-filter-bar">
        <span>当前范围</span>
        <el-tag
          v-for="type in query.types"
          :key="type"
          :type="getTypeTag(type)"
          effect="plain"
        >
          {{ getTypeLabel(type) }}
        </el-tag>
        <el-tag v-if="hasSearch" type="info" effect="plain">关键词：{{ submittedSearch }}</el-tag>
        <span v-if="!hasSearch" class="muted-text">未输入关键词</span>
        <el-button v-if="hasActiveFilters" link type="primary" @click="resetFilters">清空筛选</el-button>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="table-topbar">
        <div class="result-copy">
          <strong>{{ resultTitle }}</strong>
          <span>{{ resultDescription }}</span>
          <em v-if="selectedRows.length">已选择 {{ selectedRows.length }} 条，可执行批量删除</em>
        </div>

        <div class="action-group">
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            <span>新增词汇</span>
          </el-button>
          <el-button type="success" @click="openUploadDialog">
            <el-icon><Upload /></el-icon>
            <span>上传词库文件</span>
          </el-button>
          <el-button
            type="danger"
            :disabled="selectedRows.length === 0"
            :loading="batchDeleteLoading"
            @click="confirmBatchDelete"
          >
            <el-icon><Delete /></el-icon>
            <span>批量删除{{ selectedRows.length ? ` (${selectedRows.length})` : "" }}</span>
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

      <div class="table-scroll">
        <el-table
          ref="tableRef"
          :data="words"
          border
          stripe
          class="word-table"
          empty-text="暂无词汇数据"
          v-loading="listLoading"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="id" label="ID" width="90" class-name="column-id" header-class-name="column-id" />
          <el-table-column prop="word" label="词汇" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="word-text">{{ row.word || "--" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getTypeTag(row.type)" effect="plain">
                {{ getTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="推荐词" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ isRecommendType(row.type) ? row.recommend || "--" : "--" }}
            </template>
          </el-table-column>
          <el-table-column prop="hint" label="提示语" min-width="140" class-name="column-hint" header-class-name="column-hint" show-overflow-tooltip />
          <el-table-column prop="word_explain" label="释义备注" min-width="180" class-name="column-explain" header-class-name="column-explain" show-overflow-tooltip />
          <el-table-column prop="word_example" label="样例备注" min-width="180" class-name="column-example" header-class-name="column-example" show-overflow-tooltip />
          <el-table-column label="创建时间" width="170" class-name="column-created-at" header-class-name="column-created-at">
            <template #default="{ row }">
              {{ formatTime(row.create_time) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditDialog(row)">
                <el-icon><Edit /></el-icon>
                <span>编辑</span>
              </el-button>
              <el-button
                link
                type="danger"
                :loading="rowDeletingId === row.id"
                @click="confirmDelete(row)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <span class="total-count">共 {{ total }} 条</span>
        <el-pagination
          class="pagination"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :page-sizes="[10, 20, 50, 100]"
          v-model:current-page="query.num"
          v-model:page-size="query.size"
          :total="total"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="wordDialogVisible"
      :title="wordDialogTitle"
      width="620px"
      destroy-on-close
      append-to-body
      :close-on-click-modal="false"
      @closed="resetWordDialog"
    >
      <el-form
        ref="wordFormRef"
        :model="wordForm"
        :rules="wordFormRules"
        label-width="96px"
      >
        <el-form-item label="词汇类型" prop="type">
          <el-select
            v-model="wordForm.type"
            class="full-width"
            :disabled="wordDialogMode === 'edit'"
            @change="handleFormTypeChange"
          >
            <el-option
              v-for="option in WORD_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="词汇" prop="word">
          <el-input v-model="wordForm.word" maxlength="100" show-word-limit placeholder="请输入词汇" />
        </el-form-item>
        <el-form-item v-if="formRecommendApplicable" label="推荐词" prop="recommend">
          <el-input
            v-model="wordForm.recommend"
            maxlength="100"
            show-word-limit
            placeholder="错词或敏感词建议修改为该词"
          />
        </el-form-item>
        <el-form-item v-else label="推荐词">
          <el-input model-value="当前词汇类型不使用推荐词" disabled />
        </el-form-item>
        <el-form-item label="提示语" prop="hint">
          <el-input v-model="wordForm.hint" maxlength="200" show-word-limit placeholder="例如：8-1" />
        </el-form-item>
        <el-form-item label="释义备注" prop="word_explain">
          <el-input
            v-model="wordForm.word_explain"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="请输入释义说明或备注"
          />
        </el-form-item>
        <el-form-item label="样例备注" prop="word_example">
          <el-input
            v-model="wordForm.word_example"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="请输入样例或备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="wordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitWordForm">
          {{ wordDialogMode === "create" ? "添加" : "保存" }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传词库文件"
      width="560px"
      destroy-on-close
      append-to-body
      :close-on-click-modal="false"
      @closed="resetUploadDialog"
    >
      <el-form label-width="96px">
        <el-form-item label="词汇类型" required>
          <el-select v-model="uploadForm.type" class="full-width" :disabled="uploadLoading">
            <el-option
              v-for="option in WORD_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="词库文件" required>
          <el-upload
            ref="uploadRef"
            class="upload-box"
            :auto-upload="false"
            :limit="1"
            :file-list="uploadFiles"
            accept=".txt,.csv,.xls,.xlsx"
            :disabled="uploadLoading"
            :on-change="handleUploadFileChange"
            :on-remove="handleUploadFileRemove"
            :on-exceed="handleUploadExceed"
          >
            <el-button type="primary" :disabled="uploadLoading">
              <el-icon><Upload /></el-icon>
              <span>选择文件</span>
            </el-button>
            <template #tip>
              <div class="upload-tip">支持 txt、csv、xls、xlsx，单文件不超过 20MB。</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <el-progress v-if="uploadLoading" :percentage="uploadProgress" />

      <el-alert
        v-if="uploadResult"
        class="upload-result"
        :type="uploadResult.failCount > 0 ? 'warning' : 'success'"
        :closable="false"
        show-icon
      >
        <template #title>
          上传完成：共 {{ uploadResult.total }} 个，成功 {{ uploadResult.succeedCount }} 个，失败 {{ uploadResult.failCount }} 个
        </template>
      </el-alert>

      <el-table
        v-if="uploadResult?.errors?.length"
        :data="uploadResult.errors"
        border
        size="small"
        class="upload-error-table"
        max-height="220"
      >
        <el-table-column prop="row" label="行号" width="80" />
        <el-table-column prop="word" label="词汇" min-width="120" show-overflow-tooltip />
        <el-table-column prop="reason" label="失败原因" min-width="180" show-overflow-tooltip />
      </el-table>

      <template #footer>
        <el-button @click="uploadDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="uploadLoading" @click="submitUpload">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { Delete, Edit, Plus, Refresh, Search, Upload } from "@element-plus/icons-vue";
import {
  addWord,
  deleteWord,
  deleteWords,
  getResponseMessage,
  getWordDictErrorMessage,
  listWords,
  updateWord,
  uploadWords,
  type WordDictItem,
  type WordPayload,
  type WordType,
  type WordUploadResult,
} from "@/api/wechatWordDict";

interface WordForm {
  id?: number | string;
  word: string;
  type: WordType;
  recommend: string;
  hint: string;
  word_explain: string;
  word_example: string;
}

const DEFAULT_TYPE = 3 as WordType;
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_DELAY = 400;
const ALL_WORD_TYPES: WordType[] = [1, 2, 3];
const ALL_TYPES_PICKER_VALUE = "all";

const WORD_TYPE_OPTIONS: Array<{ value: WordType; label: string; tag: "success" | "warning" | "danger" }> = [
  { value: 1, label: "正词", tag: "success" },
  { value: 2, label: "错词", tag: "warning" },
  { value: 3, label: "敏感词", tag: "danger" },
];

const words = ref<WordDictItem[]>([]);
const total = ref(0);
const listLoading = ref(false);
const error = ref("");
const selectedRows = ref<WordDictItem[]>([]);
const tableRef = ref<any>(null);
const batchDeleteLoading = ref(false);
const rowDeletingId = ref<number | string | null>(null);
const submittedSearch = ref("");
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const latestRequestId = ref(0);
const lastValidTypes = ref<WordType[]>([...ALL_WORD_TYPES]);
const typePickerValues = ref<Array<WordType | typeof ALL_TYPES_PICKER_VALUE>>([ALL_TYPES_PICKER_VALUE, ...ALL_WORD_TYPES]);

const query = reactive({
  types: [...ALL_WORD_TYPES] as WordType[],
  search: "",
  size: DEFAULT_PAGE_SIZE,
  num: 1,
});

const wordDialogVisible = ref(false);
const wordDialogMode = ref<"create" | "edit">("create");
const wordFormRef = ref<FormInstance>();
const submitLoading = ref(false);
const wordForm = reactive<WordForm>(createEmptyWordForm(DEFAULT_TYPE));

const uploadDialogVisible = ref(false);
const uploadRef = ref<any>(null);
const uploadFiles = ref<any[]>([]);
const uploadFile = ref<File | null>(null);
const uploadLoading = ref(false);
const uploadProgress = ref(0);
const uploadResult = ref<WordUploadResult | null>(null);
const uploadForm = reactive({
  type: DEFAULT_TYPE,
});

const wordFormRules: FormRules = {
  type: [{ required: true, message: "请选择词汇类型", trigger: "change" }],
  word: [
    { required: true, message: "请输入词汇", trigger: "blur" },
    { max: 100, message: "词汇长度不能超过 100 个字符", trigger: "blur" },
  ],
  recommend: [{ max: 100, message: "推荐词长度不能超过 100 个字符", trigger: "blur" }],
  hint: [{ max: 200, message: "提示语长度不能超过 200 个字符", trigger: "blur" }],
  word_explain: [{ max: 1000, message: "释义备注不能超过 1000 个字符", trigger: "blur" }],
  word_example: [{ max: 1000, message: "样例备注不能超过 1000 个字符", trigger: "blur" }],
};

const selectedTypeLabel = computed(() => {
  if (query.types.length === ALL_WORD_TYPES.length) return "全部类型";
  return query.types.map((type) => getTypeLabel(type)).join("、");
});
const wordDialogTitle = computed(() => (wordDialogMode.value === "create" ? "新增词汇" : "编辑词汇"));
const formRecommendApplicable = computed(() => isRecommendType(wordForm.type));
const hasSearch = computed(() => Boolean(submittedSearch.value.trim()));
const hasActiveFilters = computed(
  () => query.types.length !== ALL_WORD_TYPES.length || hasSearch.value || query.size !== DEFAULT_PAGE_SIZE
);
const resultTitle = computed(() => `${selectedTypeLabel.value}：共 ${total.value} 个词汇`);
const resultDescription = computed(() => {
  if (hasSearch.value) {
    return `搜索“${submittedSearch.value}”`;
  }

  return query.types.length === ALL_WORD_TYPES.length
    ? "显示全部类型词汇"
    : `显示${selectedTypeLabel.value}`;
});

onMounted(() => {
  fetchWords();
});

onBeforeUnmount(() => {
  clearSearchDebounce();
});

function createEmptyWordForm(type: WordType): WordForm {
  return {
    word: "",
    type,
    recommend: "",
    hint: "",
    word_explain: "",
    word_example: "",
  };
}

function assignWordForm(data: WordForm) {
  wordForm.id = data.id;
  wordForm.word = data.word;
  wordForm.type = data.type;
  wordForm.recommend = data.recommend;
  wordForm.hint = data.hint;
  wordForm.word_explain = data.word_explain;
  wordForm.word_example = data.word_example;
}

function buildWordPayload(): WordPayload {
  return {
    id: wordForm.id,
    word: wordForm.word.trim(),
    type: wordForm.type,
    recommend: isRecommendType(wordForm.type) ? wordForm.recommend.trim() : "",
    hint: wordForm.hint.trim(),
    word_explain: wordForm.word_explain.trim(),
    word_example: wordForm.word_example.trim(),
  };
}

function clearSearchDebounce() {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value);
    searchDebounceTimer.value = null;
  }
}

async function fetchWords() {
  const requestId = ++latestRequestId.value;
  listLoading.value = true;
  error.value = "";

  try {
    const result = await listWords({
      types: [...query.types],
      search: submittedSearch.value.trim(),
      size: query.size,
      num: query.num,
    });

    if (requestId !== latestRequestId.value) return;

    words.value = result.words;
    total.value = result.total;
    selectedRows.value = [];
    tableRef.value?.clearSelection?.();
  } catch (err: any) {
    if (requestId !== latestRequestId.value) return;

    error.value = getWordDictErrorMessage(err, "获取词汇列表失败");
  } finally {
    if (requestId === latestRequestId.value) {
      listLoading.value = false;
    }
  }
}

function submitSearch() {
  clearSearchDebounce();
  submittedSearch.value = query.search.trim();
  query.num = 1;
  fetchWords();
}

function handleSearchInput() {
  clearSearchDebounce();
  searchDebounceTimer.value = setTimeout(() => {
    submitSearch();
  }, SEARCH_DEBOUNCE_DELAY);
}

function handleSearchClear() {
  clearSearchDebounce();
  query.search = "";
  submittedSearch.value = "";
  query.num = 1;
  fetchWords();
}

function resetFilters() {
  clearSearchDebounce();
  query.types = [...ALL_WORD_TYPES];
  lastValidTypes.value = [...ALL_WORD_TYPES];
  syncTypePickerValues();
  query.search = "";
  query.size = DEFAULT_PAGE_SIZE;
  query.num = 1;
  submittedSearch.value = "";
  selectedRows.value = [];
  tableRef.value?.clearSelection?.();
  fetchWords();
}

function refreshList() {
  clearSearchDebounce();
  query.search = submittedSearch.value;
  fetchWords();
}

function syncTypePickerValues() {
  typePickerValues.value = query.types.length === ALL_WORD_TYPES.length
    ? [ALL_TYPES_PICKER_VALUE, ...ALL_WORD_TYPES]
    : [...query.types];
}

function applySelectedTypes(types: WordType[]) {
  query.types = [...new Set(types)].sort((left, right) => left - right) as WordType[];
  lastValidTypes.value = [...query.types];
  syncTypePickerValues();
  query.num = 1;
  selectedRows.value = [];
  tableRef.value?.clearSelection?.();
  fetchWords();
}

function handleTypePickerChange(values: Array<WordType | typeof ALL_TYPES_PICKER_VALUE>) {
  const types = values.filter((value): value is WordType => typeof value === "number");

  if (values.includes(ALL_TYPES_PICKER_VALUE) && types.length === ALL_WORD_TYPES.length) {
    applySelectedTypes([...ALL_WORD_TYPES]);
    return;
  }

  if (values.includes(ALL_TYPES_PICKER_VALUE) && query.types.length < ALL_WORD_TYPES.length) {
    applySelectedTypes([...ALL_WORD_TYPES]);
    return;
  }

  if (types.length === 0) {
    query.types = [...lastValidTypes.value];
    syncTypePickerValues();
    ElMessage.warning("请至少选择一种词汇类型");
    return;
  }

  applySelectedTypes(types);
}

function handlePageChange() {
  fetchWords();
}

function handlePageSizeChange() {
  query.num = 1;
  fetchWords();
}

function getDefaultActionType() {
  return query.types.length === 1 ? query.types[0] : DEFAULT_TYPE;
}

function resetSearchAfterMutation(type: WordType) {
  clearSearchDebounce();
  if (ALL_WORD_TYPES.includes(type) && !query.types.includes(type)) {
    query.types = [...query.types, type].sort((left, right) => left - right) as WordType[];
    lastValidTypes.value = [...query.types];
    syncTypePickerValues();
  }
  query.search = "";
  submittedSearch.value = "";
  query.num = 1;
}

function handleSelectionChange(rows: WordDictItem[]) {
  selectedRows.value = rows;
}

function openCreateDialog() {
  wordDialogMode.value = "create";
  assignWordForm(createEmptyWordForm(getDefaultActionType()));
  wordDialogVisible.value = true;
}

function openEditDialog(row: WordDictItem) {
  wordDialogMode.value = "edit";
  assignWordForm({
    id: row.id,
    word: row.word || "",
    type: row.type || getDefaultActionType(),
    recommend: row.recommend || "",
    hint: row.hint || "",
    word_explain: row.word_explain || "",
    word_example: row.word_example || "",
  });
  wordDialogVisible.value = true;
}

function handleFormTypeChange() {
  if (!isRecommendType(wordForm.type)) {
    wordForm.recommend = "";
  }
}

function resetWordDialog() {
  assignWordForm(createEmptyWordForm(getDefaultActionType()));
  wordFormRef.value?.clearValidate?.();
  submitLoading.value = false;
}

async function submitWordForm() {
  const valid = await wordFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  const payload = buildWordPayload();
  if (!payload.word) {
    ElMessage.warning("请输入词汇");
    return;
  }

  submitLoading.value = true;

  try {
    if (wordDialogMode.value === "create") {
      const data = await addWord(payload);
      ElMessage.success(getResponseMessage(data, "添加成功"));
      resetSearchAfterMutation(payload.type);
    } else {
      const data = await updateWord({ ...payload, id: payload.id! });
      ElMessage.success(getResponseMessage(data, "更新成功"));
    }

    wordDialogVisible.value = false;
    await fetchWords();
  } catch (err: any) {
    ElMessage.error(getWordDictErrorMessage(err, wordDialogMode.value === "create" ? "添加失败" : "更新失败"));
  } finally {
    submitLoading.value = false;
  }
}

async function confirmDelete(row: WordDictItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除词汇「${row.word || row.id}」吗？此操作不可恢复。`,
      "确认删除",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    rowDeletingId.value = row.id;
    const data = await deleteWord({ id: row.id, type: row.type || getDefaultActionType() });
    ElMessage.success(getResponseMessage(data, "删除成功"));
    await refreshAfterDelete(1);
  } catch (err: any) {
    if (err === "cancel" || err === "close") return;
    ElMessage.error(getWordDictErrorMessage(err, "删除失败"));
  } finally {
    rowDeletingId.value = null;
  }
}

async function confirmBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning("请先选择要删除的词汇");
    return;
  }

  const groups = selectedRows.value.reduce((map, row) => {
    const type = row.type || getDefaultActionType();
    const ids = map.get(type) || [];
    ids.push(row.id);
    map.set(type, ids);
    return map;
  }, new Map<WordType, Array<number | string>>());

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个词汇吗？此操作不可恢复。`,
      "批量删除",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    batchDeleteLoading.value = true;
    let deletedCount = 0;
    let failedCount = 0;

    for (const [type, ids] of groups) {
      const data = await deleteWords({ ids, type });
      const failed = data?.word_delete_many?.failed || data?.data?.failed || [];
      const currentFailedCount = Array.isArray(failed) ? failed.length : 0;
      failedCount += currentFailedCount;
      deletedCount += ids.length - currentFailedCount;
    }

    if (failedCount > 0) {
      ElMessage.warning(`批量删除完成，${failedCount} 个词汇删除失败`);
    } else {
      ElMessage.success("批量删除成功");
    }
    await refreshAfterDelete(deletedCount);
  } catch (err: any) {
    if (err === "cancel" || err === "close") return;
    ElMessage.error(getWordDictErrorMessage(err, "批量删除失败"));
  } finally {
    batchDeleteLoading.value = false;
  }
}

async function refreshAfterDelete(deletedCount: number) {
  const remainingOnCurrentPage = words.value.length - deletedCount;
  if (remainingOnCurrentPage <= 0 && query.num > 1) {
    query.num -= 1;
  }

  tableRef.value?.clearSelection?.();
  selectedRows.value = [];
  await fetchWords();
}

function openUploadDialog() {
  uploadForm.type = getDefaultActionType();
  uploadDialogVisible.value = true;
}

function handleUploadFileChange(file: any, fileList: any[]) {
  const latestFile = file || fileList[fileList.length - 1];
  if (!latestFile) return;

  const rawFile = latestFile.raw as File | undefined;
  if (rawFile && !isValidUploadFile(rawFile)) {
    uploadFiles.value = [];
    uploadFile.value = null;
    uploadRef.value?.clearFiles?.();
    return;
  }

  uploadFiles.value = [latestFile];
  uploadFile.value = rawFile || null;
  uploadResult.value = null;
}

function handleUploadFileRemove() {
  uploadFiles.value = [];
  uploadFile.value = null;
}

function handleUploadExceed(files: File[]) {
  const file = files[0];
  if (!file || !isValidUploadFile(file)) return;

  uploadFiles.value = [{ name: file.name, raw: file }];
  uploadFile.value = file;
  uploadResult.value = null;
}

function isValidUploadFile(file: File) {
  const allowedExtensions = ["txt", "csv", "xls", "xlsx"];
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const maxSize = 20 * 1024 * 1024;

  if (!allowedExtensions.includes(extension)) {
    ElMessage.error("仅支持 txt、csv、xls、xlsx 文件");
    return false;
  }

  if (file.size > maxSize) {
    ElMessage.error("文件大小不能超过 20MB");
    return false;
  }

  return true;
}

async function submitUpload() {
  if (!uploadForm.type) {
    ElMessage.warning("请选择词汇类型");
    return;
  }

  if (!uploadFile.value) {
    ElMessage.warning("请选择要上传的词库文件");
    return;
  }

  const formData = new FormData();
  formData.append("file", uploadFile.value);
  formData.append("type", String(uploadForm.type));

  uploadLoading.value = true;
  uploadProgress.value = 0;
  uploadResult.value = null;

  try {
    const result = await uploadWords(formData, (progressEvent) => {
      if (!progressEvent.total) return;
      uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    });
    uploadResult.value = result;
    resetSearchAfterMutation(uploadForm.type);

    if (result.failCount > 0) {
      ElMessage.warning(result.message || "上传完成，存在失败词汇");
    } else {
      ElMessage.success(result.message || "上传成功");
      uploadDialogVisible.value = false;
    }

    await fetchWords();
  } catch (err: any) {
    ElMessage.error(getWordDictErrorMessage(err, "上传失败"));
  } finally {
    uploadLoading.value = false;
    uploadProgress.value = 0;
  }
}

function resetUploadDialog() {
  uploadFiles.value = [];
  uploadFile.value = null;
  uploadResult.value = null;
  uploadProgress.value = 0;
  uploadLoading.value = false;
  uploadForm.type = getDefaultActionType();
  uploadRef.value?.clearFiles?.();
}

function isRecommendType(type: WordType | number) {
  return Number(type) === 2 || Number(type) === 3;
}

function getTypeLabel(type: WordType | number) {
  return WORD_TYPE_OPTIONS.find((option) => option.value === Number(type))?.label || `未知类型(${type})`;
}

function getTypeTag(type: WordType | number) {
  return WORD_TYPE_OPTIONS.find((option) => option.value === Number(type))?.tag || "info";
}

function formatTime(value?: string) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
</script>

<style scoped>
.word-dict-page {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(64, 158, 255, 0.12), transparent 32%),
    #f5f7fb;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
  padding: 22px 24px;
  color: #1f2937;
  border: 1px solid rgba(64, 158, 255, 0.16);
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.section-eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.page-header h2,
.filter-header h3 {
  margin: 0;
  color: #111827;
  font-weight: 700;
}

.page-header h2 {
  font-size: 26px;
}

.page-header p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.header-actions {
  flex-shrink: 0;
}

.filter-card,
.table-card {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.filter-card :deep(.el-card__body),
.table-card :deep(.el-card__body) {
  padding: 18px;
}

.filter-header,
.table-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.filter-header {
  padding-bottom: 14px;
  border-bottom: 1px solid #edf2f7;
}

.filter-header > div,
.result-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(360px, 520px) minmax(420px, 1fr);
  gap: 32px;
  padding-top: 16px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-field label {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.type-filter-options :deep(.el-checkbox-group) {
  display: grid;
  grid-template-columns: repeat(4, minmax(74px, 1fr));
  gap: 8px;
}

.type-filter-options :deep(.el-checkbox-button) {
  margin-left: 0;
}

.type-filter-options :deep(.el-checkbox-button__inner) {
  width: 100%;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  box-shadow: none;
}

.type-filter-options :deep(.el-checkbox-button:first-child .el-checkbox-button__inner),
.type-filter-options :deep(.el-checkbox-button:last-child .el-checkbox-button__inner) {
  border-radius: 999px;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  gap: 10px;
  align-items: center;
}

.search-row :deep(.el-button),
.action-group :deep(.el-button),
.header-actions :deep(.el-button) {
  margin-left: 0;
}

.filter-help {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.active-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  color: #475569;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  font-size: 13px;
}

.muted-text {
  color: #94a3b8;
}

.table-topbar {
  margin-bottom: 14px;
}

.result-copy strong {
  color: #111827;
  font-size: 18px;
}

.result-copy span {
  color: #64748b;
  font-size: 13px;
}

.result-copy em {
  color: #dc2626;
  font-size: 13px;
  font-style: normal;
}

.action-group {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  gap: 10px;
  align-items: center;
}

.page-alert {
  margin-bottom: 12px;
}

.table-scroll {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

.word-table {
  width: 100%;
  min-width: 1040px;
}

.word-table :deep(.el-table__header-wrapper th) {
  color: #475569;
  background: #f8fafc;
  font-weight: 700;
}

.word-text {
  color: #303133;
  font-weight: 600;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #edf2f7;
}

.total-count {
  flex-shrink: 0;
  color: #64748b;
  font-size: 14px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.full-width {
  width: 100%;
}

.upload-box {
  width: 100%;
}

.upload-tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.upload-result {
  margin-top: 12px;
}

.upload-error-table {
  margin-top: 12px;
}

@media (max-width: 1200px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .action-group {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .action-group :deep(.el-button) {
    width: 100%;
  }

  .word-table :deep(.column-example) {
    display: none;
  }
}

@media (max-width: 980px) {
  .page-header,
  .filter-header,
  .table-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions :deep(.el-button) {
    width: 100%;
  }

  .word-table :deep(.column-id),
  .word-table :deep(.column-created-at) {
    display: none;
  }
}

@media (max-width: 760px) {
  .word-dict-page {
    padding: 12px 10px 18px;
  }

  .page-header {
    padding: 18px;
  }

  .filter-card :deep(.el-card__body),
  .table-card :deep(.el-card__body) {
    padding: 14px;
  }

  .search-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-input {
    grid-column: 1 / -1;
  }

  .type-filter-options :deep(.el-checkbox-group) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-group {
    grid-template-columns: 1fr;
  }

  .word-table :deep(.column-hint),
  .word-table :deep(.column-explain) {
    display: none;
  }

  .pagination-wrap {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination-wrap :deep(.el-pagination) {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 520px) {
  .page-header h2 {
    font-size: 22px;
  }

  .active-filter-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .search-row {
    grid-template-columns: 1fr;
  }

  .word-table {
    min-width: 760px;
  }

  .pagination-wrap :deep(.el-pagination) {
    width: 100%;
  }
}
</style>
