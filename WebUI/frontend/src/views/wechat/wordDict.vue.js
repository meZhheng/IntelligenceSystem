import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus, Refresh, Search, Upload } from "@element-plus/icons-vue";
import { addWord, deleteWord, deleteWords, getResponseMessage, getWordDictErrorMessage, listWords, updateWord, uploadWords, } from "@/api/wechatWordDict";
const DEFAULT_TYPE = 3;
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_DELAY = 400;
const ALL_WORD_TYPES = [1, 2, 3];
const ALL_TYPES_PICKER_VALUE = "all";
const WORD_TYPE_OPTIONS = [
    { value: 1, label: "正词", tag: "success" },
    { value: 2, label: "错词", tag: "warning" },
    { value: 3, label: "敏感词", tag: "danger" },
];
const words = ref([]);
const total = ref(0);
const listLoading = ref(false);
const error = ref("");
const selectedRows = ref([]);
const tableRef = ref(null);
const batchDeleteLoading = ref(false);
const rowDeletingId = ref(null);
const submittedSearch = ref("");
const searchDebounceTimer = ref(null);
const latestRequestId = ref(0);
const lastValidTypes = ref([...ALL_WORD_TYPES]);
const typePickerValues = ref([ALL_TYPES_PICKER_VALUE, ...ALL_WORD_TYPES]);
const query = reactive({
    types: [...ALL_WORD_TYPES],
    search: "",
    size: DEFAULT_PAGE_SIZE,
    num: 1,
});
const wordDialogVisible = ref(false);
const wordDialogMode = ref("create");
const wordFormRef = ref();
const submitLoading = ref(false);
const wordForm = reactive(createEmptyWordForm(DEFAULT_TYPE));
const uploadDialogVisible = ref(false);
const uploadRef = ref(null);
const uploadFiles = ref([]);
const uploadFile = ref(null);
const uploadLoading = ref(false);
const uploadProgress = ref(0);
const uploadResult = ref(null);
const uploadForm = reactive({
    type: DEFAULT_TYPE,
});
const wordFormRules = {
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
    if (query.types.length === ALL_WORD_TYPES.length)
        return "全部类型";
    return query.types.map((type) => getTypeLabel(type)).join("、");
});
const wordDialogTitle = computed(() => (wordDialogMode.value === "create" ? "新增词汇" : "编辑词汇"));
const formRecommendApplicable = computed(() => isRecommendType(wordForm.type));
const hasSearch = computed(() => Boolean(submittedSearch.value.trim()));
const hasActiveFilters = computed(() => query.types.length !== ALL_WORD_TYPES.length || hasSearch.value || query.size !== DEFAULT_PAGE_SIZE);
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
function createEmptyWordForm(type) {
    return {
        word: "",
        type,
        recommend: "",
        hint: "",
        word_explain: "",
        word_example: "",
    };
}
function assignWordForm(data) {
    wordForm.id = data.id;
    wordForm.word = data.word;
    wordForm.type = data.type;
    wordForm.recommend = data.recommend;
    wordForm.hint = data.hint;
    wordForm.word_explain = data.word_explain;
    wordForm.word_example = data.word_example;
}
function buildWordPayload() {
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
        if (requestId !== latestRequestId.value)
            return;
        words.value = result.words;
        total.value = result.total;
        selectedRows.value = [];
        tableRef.value?.clearSelection?.();
    }
    catch (err) {
        if (requestId !== latestRequestId.value)
            return;
        error.value = getWordDictErrorMessage(err, "获取词汇列表失败");
    }
    finally {
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
function applySelectedTypes(types) {
    query.types = [...new Set(types)].sort((left, right) => left - right);
    lastValidTypes.value = [...query.types];
    syncTypePickerValues();
    query.num = 1;
    selectedRows.value = [];
    tableRef.value?.clearSelection?.();
    fetchWords();
}
function handleTypePickerChange(values) {
    const types = values.filter((value) => typeof value === "number");
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
function resetSearchAfterMutation(type) {
    clearSearchDebounce();
    if (ALL_WORD_TYPES.includes(type) && !query.types.includes(type)) {
        query.types = [...query.types, type].sort((left, right) => left - right);
        lastValidTypes.value = [...query.types];
        syncTypePickerValues();
    }
    query.search = "";
    submittedSearch.value = "";
    query.num = 1;
}
function handleSelectionChange(rows) {
    selectedRows.value = rows;
}
function openCreateDialog() {
    wordDialogMode.value = "create";
    assignWordForm(createEmptyWordForm(getDefaultActionType()));
    wordDialogVisible.value = true;
}
function openEditDialog(row) {
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
    if (!valid)
        return;
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
        }
        else {
            const data = await updateWord({ ...payload, id: payload.id });
            ElMessage.success(getResponseMessage(data, "更新成功"));
        }
        wordDialogVisible.value = false;
        await fetchWords();
    }
    catch (err) {
        ElMessage.error(getWordDictErrorMessage(err, wordDialogMode.value === "create" ? "添加失败" : "更新失败"));
    }
    finally {
        submitLoading.value = false;
    }
}
async function confirmDelete(row) {
    try {
        await ElMessageBox.confirm(`确定要删除词汇「${row.word || row.id}」吗？此操作不可恢复。`, "确认删除", {
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            type: "warning",
        });
        rowDeletingId.value = row.id;
        const data = await deleteWord({ id: row.id, type: row.type || getDefaultActionType() });
        ElMessage.success(getResponseMessage(data, "删除成功"));
        await refreshAfterDelete(1);
    }
    catch (err) {
        if (err === "cancel" || err === "close")
            return;
        ElMessage.error(getWordDictErrorMessage(err, "删除失败"));
    }
    finally {
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
    }, new Map());
    try {
        await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 个词汇吗？此操作不可恢复。`, "批量删除", {
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            type: "warning",
        });
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
        }
        else {
            ElMessage.success("批量删除成功");
        }
        await refreshAfterDelete(deletedCount);
    }
    catch (err) {
        if (err === "cancel" || err === "close")
            return;
        ElMessage.error(getWordDictErrorMessage(err, "批量删除失败"));
    }
    finally {
        batchDeleteLoading.value = false;
    }
}
async function refreshAfterDelete(deletedCount) {
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
function handleUploadFileChange(file, fileList) {
    const latestFile = file || fileList[fileList.length - 1];
    if (!latestFile)
        return;
    const rawFile = latestFile.raw;
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
function handleUploadExceed(files) {
    const file = files[0];
    if (!file || !isValidUploadFile(file))
        return;
    uploadFiles.value = [{ name: file.name, raw: file }];
    uploadFile.value = file;
    uploadResult.value = null;
}
function isValidUploadFile(file) {
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
            if (!progressEvent.total)
                return;
            uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        });
        uploadResult.value = result;
        resetSearchAfterMutation(uploadForm.type);
        if (result.failCount > 0) {
            ElMessage.warning(result.message || "上传完成，存在失败词汇");
        }
        else {
            ElMessage.success(result.message || "上传成功");
            uploadDialogVisible.value = false;
        }
        await fetchWords();
    }
    catch (err) {
        ElMessage.error(getWordDictErrorMessage(err, "上传失败"));
    }
    finally {
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
function isRecommendType(type) {
    return Number(type) === 2 || Number(type) === 3;
}
function getTypeLabel(type) {
    return WORD_TYPE_OPTIONS.find((option) => option.value === Number(type))?.label || `未知类型(${type})`;
}
function getTypeTag(type) {
    return WORD_TYPE_OPTIONS.find((option) => option.value === Number(type))?.tag || "info";
}
function formatTime(value) {
    if (!value)
        return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['page-header', 'page-header', 'page-header', 'filter-card', 'table-card', 'el-card__body', 'filter-header', 'filter-header', 'filter-header', 'filter-field', 'type-filter-options', 'type-filter-options', 'type-filter-options', 'el-checkbox-button', 'el-checkbox-button__inner', 'type-filter-options', 'el-checkbox-button', 'el-checkbox-button__inner', 'search-row', 'el-button', 'header-actions', 'el-button', 'table-topbar', 'result-copy', 'result-copy', 'result-copy', 'action-group', 'word-table', 'filter-grid', 'action-group', 'action-group', 'el-button', 'word-table', 'page-header', 'filter-header', 'table-topbar', 'header-actions', 'el-button', 'word-table', 'word-table', 'word-dict-page', 'page-header', 'filter-card', 'el-card__body', 'table-card', 'el-card__body', 'search-row', 'type-filter-options', 'el-checkbox-group', 'action-group', 'word-table', 'word-table', 'pagination-wrap', 'pagination-wrap', 'page-header', 'active-filter-bar', 'search-row', 'word-table', 'pagination-wrap', 'el-pagination',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("word-dict-page") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("page-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header-copy") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header-actions") },
});
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    loading: ((__VLS_ctx.listLoading)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    loading: ((__VLS_ctx.listLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.refreshList)
};
let __VLS_3;
let __VLS_4;
const __VLS_8 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
const __VLS_14 = {}.Refresh;
/** @type { [typeof __VLS_components.Refresh, ] } */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({}));
const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_13.slots.default;
var __VLS_13;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_5.slots.default;
var __VLS_5;
const __VLS_20 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ class: ("filter-card") },
    shadow: ("never"),
}));
const __VLS_22 = __VLS_21({
    ...{ class: ("filter-card") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-grid") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-field type-filter") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("type-filter-options") },
});
const __VLS_26 = {}.ElCheckboxGroup;
/** @type { [typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ] } */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.typePickerValues)),
}));
const __VLS_28 = __VLS_27({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.typePickerValues)),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_32;
const __VLS_33 = {
    onChange: (__VLS_ctx.handleTypePickerChange)
};
let __VLS_29;
let __VLS_30;
const __VLS_34 = {}.ElCheckboxButton;
/** @type { [typeof __VLS_components.ElCheckboxButton, typeof __VLS_components.elCheckboxButton, typeof __VLS_components.ElCheckboxButton, typeof __VLS_components.elCheckboxButton, ] } */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    label: ((__VLS_ctx.ALL_TYPES_PICKER_VALUE)),
}));
const __VLS_36 = __VLS_35({
    label: ((__VLS_ctx.ALL_TYPES_PICKER_VALUE)),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
__VLS_39.slots.default;
var __VLS_39;
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.WORD_TYPE_OPTIONS))) {
    const __VLS_40 = {}.ElCheckboxButton;
    /** @type { [typeof __VLS_components.ElCheckboxButton, typeof __VLS_components.elCheckboxButton, typeof __VLS_components.ElCheckboxButton, typeof __VLS_components.elCheckboxButton, ] } */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        key: ((option.value)),
        label: ((option.value)),
    }));
    const __VLS_42 = __VLS_41({
        key: ((option.value)),
        label: ((option.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    (option.label);
    __VLS_45.slots.default;
    var __VLS_45;
}
__VLS_31.slots.default;
var __VLS_31;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: ("filter-help") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("filter-field search-filter") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("search-row") },
});
const __VLS_46 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    ...{ 'onInput': {} },
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.query.search)),
    clearable: (true),
    ...{ class: ("search-input") },
    placeholder: ("输入词汇、推荐词或提示语关键词"),
}));
const __VLS_48 = __VLS_47({
    ...{ 'onInput': {} },
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.query.search)),
    clearable: (true),
    ...{ class: ("search-input") },
    placeholder: ("输入词汇、推荐词或提示语关键词"),
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
let __VLS_52;
const __VLS_53 = {
    onInput: (__VLS_ctx.handleSearchInput)
};
const __VLS_54 = {
    onClear: (__VLS_ctx.handleSearchClear)
};
const __VLS_55 = {
    onKeyup: (__VLS_ctx.submitSearch)
};
let __VLS_49;
let __VLS_50;
{
    const { prefix: __VLS_thisSlot } = __VLS_51.slots;
    const __VLS_56 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
    const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
    const __VLS_62 = {}.Search;
    /** @type { [typeof __VLS_components.Search, ] } */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({}));
    const __VLS_64 = __VLS_63({}, ...__VLS_functionalComponentArgsRest(__VLS_63));
    __VLS_61.slots.default;
    var __VLS_61;
}
__VLS_51.slots.default;
var __VLS_51;
const __VLS_68 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    ...{ 'onClick': {} },
    type: ("primary"),
}));
const __VLS_70 = __VLS_69({
    ...{ 'onClick': {} },
    type: ("primary"),
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
let __VLS_74;
const __VLS_75 = {
    onClick: (__VLS_ctx.submitSearch)
};
let __VLS_71;
let __VLS_72;
const __VLS_76 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
const __VLS_82 = {}.Search;
/** @type { [typeof __VLS_components.Search, ] } */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({}));
const __VLS_84 = __VLS_83({}, ...__VLS_functionalComponentArgsRest(__VLS_83));
__VLS_81.slots.default;
var __VLS_81;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_73.slots.default;
var __VLS_73;
const __VLS_88 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    ...{ 'onClick': {} },
    disabled: ((!__VLS_ctx.hasActiveFilters)),
}));
const __VLS_90 = __VLS_89({
    ...{ 'onClick': {} },
    disabled: ((!__VLS_ctx.hasActiveFilters)),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
let __VLS_94;
const __VLS_95 = {
    onClick: (__VLS_ctx.resetFilters)
};
let __VLS_91;
let __VLS_92;
__VLS_93.slots.default;
var __VLS_93;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: ("filter-help") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("active-filter-bar") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
for (const [type] of __VLS_getVForSourceType((__VLS_ctx.query.types))) {
    const __VLS_96 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        key: ((type)),
        type: ((__VLS_ctx.getTypeTag(type))),
        effect: ("plain"),
    }));
    const __VLS_98 = __VLS_97({
        key: ((type)),
        type: ((__VLS_ctx.getTypeTag(type))),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    (__VLS_ctx.getTypeLabel(type));
    __VLS_101.slots.default;
    var __VLS_101;
}
if (__VLS_ctx.hasSearch) {
    const __VLS_102 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        type: ("info"),
        effect: ("plain"),
    }));
    const __VLS_104 = __VLS_103({
        type: ("info"),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    (__VLS_ctx.submittedSearch);
    __VLS_107.slots.default;
    var __VLS_107;
}
if (!__VLS_ctx.hasSearch) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("muted-text") },
    });
}
if (__VLS_ctx.hasActiveFilters) {
    const __VLS_108 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        link: (true),
        type: ("primary"),
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        link: (true),
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_114;
    const __VLS_115 = {
        onClick: (__VLS_ctx.resetFilters)
    };
    let __VLS_111;
    let __VLS_112;
    __VLS_113.slots.default;
    var __VLS_113;
}
__VLS_25.slots.default;
var __VLS_25;
const __VLS_116 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    ...{ class: ("table-card") },
    shadow: ("never"),
}));
const __VLS_118 = __VLS_117({
    ...{ class: ("table-card") },
    shadow: ("never"),
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("table-topbar") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("result-copy") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.resultTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.resultDescription);
if (__VLS_ctx.selectedRows.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (__VLS_ctx.selectedRows.length);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("action-group") },
});
const __VLS_122 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    ...{ 'onClick': {} },
    type: ("primary"),
}));
const __VLS_124 = __VLS_123({
    ...{ 'onClick': {} },
    type: ("primary"),
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
let __VLS_128;
const __VLS_129 = {
    onClick: (__VLS_ctx.openCreateDialog)
};
let __VLS_125;
let __VLS_126;
const __VLS_130 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({}));
const __VLS_132 = __VLS_131({}, ...__VLS_functionalComponentArgsRest(__VLS_131));
const __VLS_136 = {}.Plus;
/** @type { [typeof __VLS_components.Plus, ] } */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({}));
const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_135.slots.default;
var __VLS_135;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_127.slots.default;
var __VLS_127;
const __VLS_142 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
    ...{ 'onClick': {} },
    type: ("success"),
}));
const __VLS_144 = __VLS_143({
    ...{ 'onClick': {} },
    type: ("success"),
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
let __VLS_148;
const __VLS_149 = {
    onClick: (__VLS_ctx.openUploadDialog)
};
let __VLS_145;
let __VLS_146;
const __VLS_150 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({}));
const __VLS_152 = __VLS_151({}, ...__VLS_functionalComponentArgsRest(__VLS_151));
const __VLS_156 = {}.Upload;
/** @type { [typeof __VLS_components.Upload, ] } */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({}));
const __VLS_158 = __VLS_157({}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_155.slots.default;
var __VLS_155;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_147.slots.default;
var __VLS_147;
const __VLS_162 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    ...{ 'onClick': {} },
    type: ("danger"),
    disabled: ((__VLS_ctx.selectedRows.length === 0)),
    loading: ((__VLS_ctx.batchDeleteLoading)),
}));
const __VLS_164 = __VLS_163({
    ...{ 'onClick': {} },
    type: ("danger"),
    disabled: ((__VLS_ctx.selectedRows.length === 0)),
    loading: ((__VLS_ctx.batchDeleteLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
let __VLS_168;
const __VLS_169 = {
    onClick: (__VLS_ctx.confirmBatchDelete)
};
let __VLS_165;
let __VLS_166;
const __VLS_170 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({}));
const __VLS_172 = __VLS_171({}, ...__VLS_functionalComponentArgsRest(__VLS_171));
const __VLS_176 = {}.Delete;
/** @type { [typeof __VLS_components.Delete, ] } */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({}));
const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_175.slots.default;
var __VLS_175;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.selectedRows.length ? ` (${__VLS_ctx.selectedRows.length})` : "");
__VLS_167.slots.default;
var __VLS_167;
if (__VLS_ctx.error) {
    const __VLS_182 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
        title: ((__VLS_ctx.error)),
        type: ("error"),
        showIcon: (true),
        ...{ class: ("page-alert") },
    }));
    const __VLS_184 = __VLS_183({
        title: ((__VLS_ctx.error)),
        type: ("error"),
        showIcon: (true),
        ...{ class: ("page-alert") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("table-scroll") },
});
const __VLS_188 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    ...{ 'onSelectionChange': {} },
    ref: ("tableRef"),
    data: ((__VLS_ctx.words)),
    border: (true),
    stripe: (true),
    ...{ class: ("word-table") },
    emptyText: ("暂无词汇数据"),
}));
const __VLS_190 = __VLS_189({
    ...{ 'onSelectionChange': {} },
    ref: ("tableRef"),
    data: ((__VLS_ctx.words)),
    border: (true),
    stripe: (true),
    ...{ class: ("word-table") },
    emptyText: ("暂无词汇数据"),
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.listLoading) }, null, null);
// @ts-ignore navigation for `const tableRef = ref()`
/** @type { typeof __VLS_ctx.tableRef } */ ;
var __VLS_194 = {};
let __VLS_195;
const __VLS_196 = {
    onSelectionChange: (__VLS_ctx.handleSelectionChange)
};
let __VLS_191;
let __VLS_192;
const __VLS_197 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    type: ("selection"),
    width: ("48"),
}));
const __VLS_199 = __VLS_198({
    type: ("selection"),
    width: ("48"),
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
const __VLS_203 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
    prop: ("id"),
    label: ("ID"),
    width: ("90"),
    className: ("column-id"),
    headerClassName: ("column-id"),
}));
const __VLS_205 = __VLS_204({
    prop: ("id"),
    label: ("ID"),
    width: ("90"),
    className: ("column-id"),
    headerClassName: ("column-id"),
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
const __VLS_209 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
    prop: ("word"),
    label: ("词汇"),
    minWidth: ("160"),
    showOverflowTooltip: (true),
}));
const __VLS_211 = __VLS_210({
    prop: ("word"),
    label: ("词汇"),
    minWidth: ("160"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
{
    const { default: __VLS_thisSlot } = __VLS_214.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("word-text") },
    });
    (row.word || "--");
}
__VLS_214.slots.default;
var __VLS_214;
const __VLS_215 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
    label: ("类型"),
    width: ("100"),
    align: ("center"),
}));
const __VLS_217 = __VLS_216({
    label: ("类型"),
    width: ("100"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_216));
{
    const { default: __VLS_thisSlot } = __VLS_220.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_221 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
        type: ((__VLS_ctx.getTypeTag(row.type))),
        effect: ("plain"),
    }));
    const __VLS_223 = __VLS_222({
        type: ((__VLS_ctx.getTypeTag(row.type))),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_222));
    (__VLS_ctx.getTypeLabel(row.type));
    __VLS_226.slots.default;
    var __VLS_226;
}
__VLS_220.slots.default;
var __VLS_220;
const __VLS_227 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
    label: ("推荐词"),
    minWidth: ("140"),
    showOverflowTooltip: (true),
}));
const __VLS_229 = __VLS_228({
    label: ("推荐词"),
    minWidth: ("140"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_228));
{
    const { default: __VLS_thisSlot } = __VLS_232.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.isRecommendType(row.type) ? row.recommend || "--" : "--");
}
__VLS_232.slots.default;
var __VLS_232;
const __VLS_233 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    prop: ("hint"),
    label: ("提示语"),
    minWidth: ("140"),
    className: ("column-hint"),
    headerClassName: ("column-hint"),
    showOverflowTooltip: (true),
}));
const __VLS_235 = __VLS_234({
    prop: ("hint"),
    label: ("提示语"),
    minWidth: ("140"),
    className: ("column-hint"),
    headerClassName: ("column-hint"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
const __VLS_239 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
    prop: ("word_explain"),
    label: ("释义备注"),
    minWidth: ("180"),
    className: ("column-explain"),
    headerClassName: ("column-explain"),
    showOverflowTooltip: (true),
}));
const __VLS_241 = __VLS_240({
    prop: ("word_explain"),
    label: ("释义备注"),
    minWidth: ("180"),
    className: ("column-explain"),
    headerClassName: ("column-explain"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
const __VLS_245 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    prop: ("word_example"),
    label: ("样例备注"),
    minWidth: ("180"),
    className: ("column-example"),
    headerClassName: ("column-example"),
    showOverflowTooltip: (true),
}));
const __VLS_247 = __VLS_246({
    prop: ("word_example"),
    label: ("样例备注"),
    minWidth: ("180"),
    className: ("column-example"),
    headerClassName: ("column-example"),
    showOverflowTooltip: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
const __VLS_251 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    label: ("创建时间"),
    width: ("170"),
    className: ("column-created-at"),
    headerClassName: ("column-created-at"),
}));
const __VLS_253 = __VLS_252({
    label: ("创建时间"),
    width: ("170"),
    className: ("column-created-at"),
    headerClassName: ("column-created-at"),
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
{
    const { default: __VLS_thisSlot } = __VLS_256.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatTime(row.create_time));
}
__VLS_256.slots.default;
var __VLS_256;
const __VLS_257 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    label: ("操作"),
    width: ("150"),
    fixed: ("right"),
    align: ("center"),
}));
const __VLS_259 = __VLS_258({
    label: ("操作"),
    width: ("150"),
    fixed: ("right"),
    align: ("center"),
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
{
    const { default: __VLS_thisSlot } = __VLS_262.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_263 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
        ...{ 'onClick': {} },
        link: (true),
        type: ("primary"),
    }));
    const __VLS_265 = __VLS_264({
        ...{ 'onClick': {} },
        link: (true),
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_264));
    let __VLS_269;
    const __VLS_270 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditDialog(row);
        }
    };
    let __VLS_266;
    let __VLS_267;
    const __VLS_271 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({}));
    const __VLS_273 = __VLS_272({}, ...__VLS_functionalComponentArgsRest(__VLS_272));
    const __VLS_277 = {}.Edit;
    /** @type { [typeof __VLS_components.Edit, ] } */ ;
    // @ts-ignore
    const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({}));
    const __VLS_279 = __VLS_278({}, ...__VLS_functionalComponentArgsRest(__VLS_278));
    __VLS_276.slots.default;
    var __VLS_276;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_268.slots.default;
    var __VLS_268;
    const __VLS_283 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
        ...{ 'onClick': {} },
        link: (true),
        type: ("danger"),
        loading: ((__VLS_ctx.rowDeletingId === row.id)),
    }));
    const __VLS_285 = __VLS_284({
        ...{ 'onClick': {} },
        link: (true),
        type: ("danger"),
        loading: ((__VLS_ctx.rowDeletingId === row.id)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_284));
    let __VLS_289;
    const __VLS_290 = {
        onClick: (...[$event]) => {
            __VLS_ctx.confirmDelete(row);
        }
    };
    let __VLS_286;
    let __VLS_287;
    const __VLS_291 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({}));
    const __VLS_293 = __VLS_292({}, ...__VLS_functionalComponentArgsRest(__VLS_292));
    const __VLS_297 = {}.Delete;
    /** @type { [typeof __VLS_components.Delete, ] } */ ;
    // @ts-ignore
    const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({}));
    const __VLS_299 = __VLS_298({}, ...__VLS_functionalComponentArgsRest(__VLS_298));
    __VLS_296.slots.default;
    var __VLS_296;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_288.slots.default;
    var __VLS_288;
}
__VLS_262.slots.default;
var __VLS_262;
__VLS_193.slots.default;
var __VLS_193;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("pagination-wrap") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("total-count") },
});
(__VLS_ctx.total);
const __VLS_303 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    ...{ class: ("pagination") },
    background: (true),
    layout: ("total, sizes, prev, pager, next, jumper"),
    pageSizes: (([10, 20, 50, 100])),
    currentPage: ((__VLS_ctx.query.num)),
    pageSize: ((__VLS_ctx.query.size)),
    total: ((__VLS_ctx.total)),
}));
const __VLS_305 = __VLS_304({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    ...{ class: ("pagination") },
    background: (true),
    layout: ("total, sizes, prev, pager, next, jumper"),
    pageSizes: (([10, 20, 50, 100])),
    currentPage: ((__VLS_ctx.query.num)),
    pageSize: ((__VLS_ctx.query.size)),
    total: ((__VLS_ctx.total)),
}, ...__VLS_functionalComponentArgsRest(__VLS_304));
let __VLS_309;
const __VLS_310 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_311 = {
    onSizeChange: (__VLS_ctx.handlePageSizeChange)
};
let __VLS_306;
let __VLS_307;
var __VLS_308;
__VLS_121.slots.default;
var __VLS_121;
const __VLS_312 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
    ...{ 'onClosed': {} },
    modelValue: ((__VLS_ctx.wordDialogVisible)),
    title: ((__VLS_ctx.wordDialogTitle)),
    width: ("620px"),
    destroyOnClose: (true),
    appendToBody: (true),
    closeOnClickModal: ((false)),
}));
const __VLS_314 = __VLS_313({
    ...{ 'onClosed': {} },
    modelValue: ((__VLS_ctx.wordDialogVisible)),
    title: ((__VLS_ctx.wordDialogTitle)),
    width: ("620px"),
    destroyOnClose: (true),
    appendToBody: (true),
    closeOnClickModal: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
let __VLS_318;
const __VLS_319 = {
    onClosed: (__VLS_ctx.resetWordDialog)
};
let __VLS_315;
let __VLS_316;
const __VLS_320 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    ref: ("wordFormRef"),
    model: ((__VLS_ctx.wordForm)),
    rules: ((__VLS_ctx.wordFormRules)),
    labelWidth: ("96px"),
}));
const __VLS_322 = __VLS_321({
    ref: ("wordFormRef"),
    model: ((__VLS_ctx.wordForm)),
    rules: ((__VLS_ctx.wordFormRules)),
    labelWidth: ("96px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
// @ts-ignore navigation for `const wordFormRef = ref()`
/** @type { typeof __VLS_ctx.wordFormRef } */ ;
var __VLS_326 = {};
const __VLS_327 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
    label: ("词汇类型"),
    prop: ("type"),
}));
const __VLS_329 = __VLS_328({
    label: ("词汇类型"),
    prop: ("type"),
}, ...__VLS_functionalComponentArgsRest(__VLS_328));
const __VLS_333 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.wordForm.type)),
    ...{ class: ("full-width") },
    disabled: ((__VLS_ctx.wordDialogMode === 'edit')),
}));
const __VLS_335 = __VLS_334({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.wordForm.type)),
    ...{ class: ("full-width") },
    disabled: ((__VLS_ctx.wordDialogMode === 'edit')),
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
let __VLS_339;
const __VLS_340 = {
    onChange: (__VLS_ctx.handleFormTypeChange)
};
let __VLS_336;
let __VLS_337;
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.WORD_TYPE_OPTIONS))) {
    const __VLS_341 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
        key: ((option.value)),
        label: ((option.label)),
        value: ((option.value)),
    }));
    const __VLS_343 = __VLS_342({
        key: ((option.value)),
        label: ((option.label)),
        value: ((option.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_342));
}
__VLS_338.slots.default;
var __VLS_338;
__VLS_332.slots.default;
var __VLS_332;
const __VLS_347 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
    label: ("词汇"),
    prop: ("word"),
}));
const __VLS_349 = __VLS_348({
    label: ("词汇"),
    prop: ("word"),
}, ...__VLS_functionalComponentArgsRest(__VLS_348));
const __VLS_353 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_354 = __VLS_asFunctionalComponent(__VLS_353, new __VLS_353({
    modelValue: ((__VLS_ctx.wordForm.word)),
    maxlength: ("100"),
    showWordLimit: (true),
    placeholder: ("请输入词汇"),
}));
const __VLS_355 = __VLS_354({
    modelValue: ((__VLS_ctx.wordForm.word)),
    maxlength: ("100"),
    showWordLimit: (true),
    placeholder: ("请输入词汇"),
}, ...__VLS_functionalComponentArgsRest(__VLS_354));
__VLS_352.slots.default;
var __VLS_352;
if (__VLS_ctx.formRecommendApplicable) {
    const __VLS_359 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
        label: ("推荐词"),
        prop: ("recommend"),
    }));
    const __VLS_361 = __VLS_360({
        label: ("推荐词"),
        prop: ("recommend"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_360));
    const __VLS_365 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_366 = __VLS_asFunctionalComponent(__VLS_365, new __VLS_365({
        modelValue: ((__VLS_ctx.wordForm.recommend)),
        maxlength: ("100"),
        showWordLimit: (true),
        placeholder: ("错词或敏感词建议修改为该词"),
    }));
    const __VLS_367 = __VLS_366({
        modelValue: ((__VLS_ctx.wordForm.recommend)),
        maxlength: ("100"),
        showWordLimit: (true),
        placeholder: ("错词或敏感词建议修改为该词"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_366));
    __VLS_364.slots.default;
    var __VLS_364;
}
else {
    const __VLS_371 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent(__VLS_371, new __VLS_371({
        label: ("推荐词"),
    }));
    const __VLS_373 = __VLS_372({
        label: ("推荐词"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    const __VLS_377 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
        modelValue: ("当前词汇类型不使用推荐词"),
        disabled: (true),
    }));
    const __VLS_379 = __VLS_378({
        modelValue: ("当前词汇类型不使用推荐词"),
        disabled: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_378));
    __VLS_376.slots.default;
    var __VLS_376;
}
const __VLS_383 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_384 = __VLS_asFunctionalComponent(__VLS_383, new __VLS_383({
    label: ("提示语"),
    prop: ("hint"),
}));
const __VLS_385 = __VLS_384({
    label: ("提示语"),
    prop: ("hint"),
}, ...__VLS_functionalComponentArgsRest(__VLS_384));
const __VLS_389 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_390 = __VLS_asFunctionalComponent(__VLS_389, new __VLS_389({
    modelValue: ((__VLS_ctx.wordForm.hint)),
    maxlength: ("200"),
    showWordLimit: (true),
    placeholder: ("例如：8-1"),
}));
const __VLS_391 = __VLS_390({
    modelValue: ((__VLS_ctx.wordForm.hint)),
    maxlength: ("200"),
    showWordLimit: (true),
    placeholder: ("例如：8-1"),
}, ...__VLS_functionalComponentArgsRest(__VLS_390));
__VLS_388.slots.default;
var __VLS_388;
const __VLS_395 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_396 = __VLS_asFunctionalComponent(__VLS_395, new __VLS_395({
    label: ("释义备注"),
    prop: ("word_explain"),
}));
const __VLS_397 = __VLS_396({
    label: ("释义备注"),
    prop: ("word_explain"),
}, ...__VLS_functionalComponentArgsRest(__VLS_396));
const __VLS_401 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_402 = __VLS_asFunctionalComponent(__VLS_401, new __VLS_401({
    modelValue: ((__VLS_ctx.wordForm.word_explain)),
    type: ("textarea"),
    rows: ((3)),
    maxlength: ("1000"),
    showWordLimit: (true),
    placeholder: ("请输入释义说明或备注"),
}));
const __VLS_403 = __VLS_402({
    modelValue: ((__VLS_ctx.wordForm.word_explain)),
    type: ("textarea"),
    rows: ((3)),
    maxlength: ("1000"),
    showWordLimit: (true),
    placeholder: ("请输入释义说明或备注"),
}, ...__VLS_functionalComponentArgsRest(__VLS_402));
__VLS_400.slots.default;
var __VLS_400;
const __VLS_407 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_408 = __VLS_asFunctionalComponent(__VLS_407, new __VLS_407({
    label: ("样例备注"),
    prop: ("word_example"),
}));
const __VLS_409 = __VLS_408({
    label: ("样例备注"),
    prop: ("word_example"),
}, ...__VLS_functionalComponentArgsRest(__VLS_408));
const __VLS_413 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
    modelValue: ((__VLS_ctx.wordForm.word_example)),
    type: ("textarea"),
    rows: ((3)),
    maxlength: ("1000"),
    showWordLimit: (true),
    placeholder: ("请输入样例或备注"),
}));
const __VLS_415 = __VLS_414({
    modelValue: ((__VLS_ctx.wordForm.word_example)),
    type: ("textarea"),
    rows: ((3)),
    maxlength: ("1000"),
    showWordLimit: (true),
    placeholder: ("请输入样例或备注"),
}, ...__VLS_functionalComponentArgsRest(__VLS_414));
__VLS_412.slots.default;
var __VLS_412;
__VLS_325.slots.default;
var __VLS_325;
{
    const { footer: __VLS_thisSlot } = __VLS_317.slots;
    const __VLS_419 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_420 = __VLS_asFunctionalComponent(__VLS_419, new __VLS_419({
        ...{ 'onClick': {} },
    }));
    const __VLS_421 = __VLS_420({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_420));
    let __VLS_425;
    const __VLS_426 = {
        onClick: (...[$event]) => {
            __VLS_ctx.wordDialogVisible = false;
        }
    };
    let __VLS_422;
    let __VLS_423;
    __VLS_424.slots.default;
    var __VLS_424;
    const __VLS_427 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_428 = __VLS_asFunctionalComponent(__VLS_427, new __VLS_427({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.submitLoading)),
    }));
    const __VLS_429 = __VLS_428({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.submitLoading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_428));
    let __VLS_433;
    const __VLS_434 = {
        onClick: (__VLS_ctx.submitWordForm)
    };
    let __VLS_430;
    let __VLS_431;
    (__VLS_ctx.wordDialogMode === "create" ? "添加" : "保存");
    __VLS_432.slots.default;
    var __VLS_432;
}
__VLS_317.slots.default;
var __VLS_317;
const __VLS_435 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_436 = __VLS_asFunctionalComponent(__VLS_435, new __VLS_435({
    ...{ 'onClosed': {} },
    modelValue: ((__VLS_ctx.uploadDialogVisible)),
    title: ("上传词库文件"),
    width: ("560px"),
    destroyOnClose: (true),
    appendToBody: (true),
    closeOnClickModal: ((false)),
}));
const __VLS_437 = __VLS_436({
    ...{ 'onClosed': {} },
    modelValue: ((__VLS_ctx.uploadDialogVisible)),
    title: ("上传词库文件"),
    width: ("560px"),
    destroyOnClose: (true),
    appendToBody: (true),
    closeOnClickModal: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_436));
let __VLS_441;
const __VLS_442 = {
    onClosed: (__VLS_ctx.resetUploadDialog)
};
let __VLS_438;
let __VLS_439;
const __VLS_443 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_444 = __VLS_asFunctionalComponent(__VLS_443, new __VLS_443({
    labelWidth: ("96px"),
}));
const __VLS_445 = __VLS_444({
    labelWidth: ("96px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_444));
const __VLS_449 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_450 = __VLS_asFunctionalComponent(__VLS_449, new __VLS_449({
    label: ("词汇类型"),
    required: (true),
}));
const __VLS_451 = __VLS_450({
    label: ("词汇类型"),
    required: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_450));
const __VLS_455 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_456 = __VLS_asFunctionalComponent(__VLS_455, new __VLS_455({
    modelValue: ((__VLS_ctx.uploadForm.type)),
    ...{ class: ("full-width") },
    disabled: ((__VLS_ctx.uploadLoading)),
}));
const __VLS_457 = __VLS_456({
    modelValue: ((__VLS_ctx.uploadForm.type)),
    ...{ class: ("full-width") },
    disabled: ((__VLS_ctx.uploadLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_456));
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.WORD_TYPE_OPTIONS))) {
    const __VLS_461 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_462 = __VLS_asFunctionalComponent(__VLS_461, new __VLS_461({
        key: ((option.value)),
        label: ((option.label)),
        value: ((option.value)),
    }));
    const __VLS_463 = __VLS_462({
        key: ((option.value)),
        label: ((option.label)),
        value: ((option.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_462));
}
__VLS_460.slots.default;
var __VLS_460;
__VLS_454.slots.default;
var __VLS_454;
const __VLS_467 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_468 = __VLS_asFunctionalComponent(__VLS_467, new __VLS_467({
    label: ("词库文件"),
    required: (true),
}));
const __VLS_469 = __VLS_468({
    label: ("词库文件"),
    required: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_468));
const __VLS_473 = {}.ElUpload;
/** @type { [typeof __VLS_components.ElUpload, typeof __VLS_components.elUpload, typeof __VLS_components.ElUpload, typeof __VLS_components.elUpload, ] } */ ;
// @ts-ignore
const __VLS_474 = __VLS_asFunctionalComponent(__VLS_473, new __VLS_473({
    ref: ("uploadRef"),
    ...{ class: ("upload-box") },
    autoUpload: ((false)),
    limit: ((1)),
    fileList: ((__VLS_ctx.uploadFiles)),
    accept: (".txt,.csv,.xls,.xlsx"),
    disabled: ((__VLS_ctx.uploadLoading)),
    onChange: ((__VLS_ctx.handleUploadFileChange)),
    onRemove: ((__VLS_ctx.handleUploadFileRemove)),
    onExceed: ((__VLS_ctx.handleUploadExceed)),
}));
const __VLS_475 = __VLS_474({
    ref: ("uploadRef"),
    ...{ class: ("upload-box") },
    autoUpload: ((false)),
    limit: ((1)),
    fileList: ((__VLS_ctx.uploadFiles)),
    accept: (".txt,.csv,.xls,.xlsx"),
    disabled: ((__VLS_ctx.uploadLoading)),
    onChange: ((__VLS_ctx.handleUploadFileChange)),
    onRemove: ((__VLS_ctx.handleUploadFileRemove)),
    onExceed: ((__VLS_ctx.handleUploadExceed)),
}, ...__VLS_functionalComponentArgsRest(__VLS_474));
// @ts-ignore navigation for `const uploadRef = ref()`
/** @type { typeof __VLS_ctx.uploadRef } */ ;
var __VLS_479 = {};
const __VLS_480 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
    type: ("primary"),
    disabled: ((__VLS_ctx.uploadLoading)),
}));
const __VLS_482 = __VLS_481({
    type: ("primary"),
    disabled: ((__VLS_ctx.uploadLoading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_481));
const __VLS_486 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_487 = __VLS_asFunctionalComponent(__VLS_486, new __VLS_486({}));
const __VLS_488 = __VLS_487({}, ...__VLS_functionalComponentArgsRest(__VLS_487));
const __VLS_492 = {}.Upload;
/** @type { [typeof __VLS_components.Upload, ] } */ ;
// @ts-ignore
const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({}));
const __VLS_494 = __VLS_493({}, ...__VLS_functionalComponentArgsRest(__VLS_493));
__VLS_491.slots.default;
var __VLS_491;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_485.slots.default;
var __VLS_485;
{
    const { tip: __VLS_thisSlot } = __VLS_478.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("upload-tip") },
    });
}
__VLS_478.slots.default;
var __VLS_478;
__VLS_472.slots.default;
var __VLS_472;
__VLS_448.slots.default;
var __VLS_448;
if (__VLS_ctx.uploadLoading) {
    const __VLS_498 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_499 = __VLS_asFunctionalComponent(__VLS_498, new __VLS_498({
        percentage: ((__VLS_ctx.uploadProgress)),
    }));
    const __VLS_500 = __VLS_499({
        percentage: ((__VLS_ctx.uploadProgress)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_499));
}
if (__VLS_ctx.uploadResult) {
    const __VLS_504 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_505 = __VLS_asFunctionalComponent(__VLS_504, new __VLS_504({
        ...{ class: ("upload-result") },
        type: ((__VLS_ctx.uploadResult.failCount > 0 ? 'warning' : 'success')),
        closable: ((false)),
        showIcon: (true),
    }));
    const __VLS_506 = __VLS_505({
        ...{ class: ("upload-result") },
        type: ((__VLS_ctx.uploadResult.failCount > 0 ? 'warning' : 'success')),
        closable: ((false)),
        showIcon: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_505));
    {
        const { title: __VLS_thisSlot } = __VLS_509.slots;
        (__VLS_ctx.uploadResult.total);
        (__VLS_ctx.uploadResult.succeedCount);
        (__VLS_ctx.uploadResult.failCount);
    }
    __VLS_509.slots.default;
    var __VLS_509;
}
if (__VLS_ctx.uploadResult?.errors?.length) {
    const __VLS_510 = {}.ElTable;
    /** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
    // @ts-ignore
    const __VLS_511 = __VLS_asFunctionalComponent(__VLS_510, new __VLS_510({
        data: ((__VLS_ctx.uploadResult.errors)),
        border: (true),
        size: ("small"),
        ...{ class: ("upload-error-table") },
        maxHeight: ("220"),
    }));
    const __VLS_512 = __VLS_511({
        data: ((__VLS_ctx.uploadResult.errors)),
        border: (true),
        size: ("small"),
        ...{ class: ("upload-error-table") },
        maxHeight: ("220"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_511));
    const __VLS_516 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
        prop: ("row"),
        label: ("行号"),
        width: ("80"),
    }));
    const __VLS_518 = __VLS_517({
        prop: ("row"),
        label: ("行号"),
        width: ("80"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_517));
    const __VLS_522 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_523 = __VLS_asFunctionalComponent(__VLS_522, new __VLS_522({
        prop: ("word"),
        label: ("词汇"),
        minWidth: ("120"),
        showOverflowTooltip: (true),
    }));
    const __VLS_524 = __VLS_523({
        prop: ("word"),
        label: ("词汇"),
        minWidth: ("120"),
        showOverflowTooltip: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_523));
    const __VLS_528 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({
        prop: ("reason"),
        label: ("失败原因"),
        minWidth: ("180"),
        showOverflowTooltip: (true),
    }));
    const __VLS_530 = __VLS_529({
        prop: ("reason"),
        label: ("失败原因"),
        minWidth: ("180"),
        showOverflowTooltip: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_529));
    __VLS_515.slots.default;
    var __VLS_515;
}
{
    const { footer: __VLS_thisSlot } = __VLS_440.slots;
    const __VLS_534 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_535 = __VLS_asFunctionalComponent(__VLS_534, new __VLS_534({
        ...{ 'onClick': {} },
    }));
    const __VLS_536 = __VLS_535({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_535));
    let __VLS_540;
    const __VLS_541 = {
        onClick: (...[$event]) => {
            __VLS_ctx.uploadDialogVisible = false;
        }
    };
    let __VLS_537;
    let __VLS_538;
    __VLS_539.slots.default;
    var __VLS_539;
    const __VLS_542 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_543 = __VLS_asFunctionalComponent(__VLS_542, new __VLS_542({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.uploadLoading)),
    }));
    const __VLS_544 = __VLS_543({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.uploadLoading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_543));
    let __VLS_548;
    const __VLS_549 = {
        onClick: (__VLS_ctx.submitUpload)
    };
    let __VLS_545;
    let __VLS_546;
    __VLS_547.slots.default;
    var __VLS_547;
}
__VLS_440.slots.default;
var __VLS_440;
['word-dict-page', 'page-header', 'header-copy', 'header-actions', 'filter-card', 'filter-header', 'filter-grid', 'filter-field', 'type-filter', 'type-filter-options', 'filter-help', 'filter-field', 'search-filter', 'search-row', 'search-input', 'filter-help', 'active-filter-bar', 'muted-text', 'table-card', 'table-topbar', 'result-copy', 'action-group', 'page-alert', 'table-scroll', 'word-table', 'word-text', 'pagination-wrap', 'total-count', 'pagination', 'full-width', 'full-width', 'upload-box', 'upload-tip', 'upload-result', 'upload-error-table',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Delete: Delete,
            Edit: Edit,
            Plus: Plus,
            Refresh: Refresh,
            Search: Search,
            Upload: Upload,
            ALL_TYPES_PICKER_VALUE: ALL_TYPES_PICKER_VALUE,
            WORD_TYPE_OPTIONS: WORD_TYPE_OPTIONS,
            words: words,
            total: total,
            listLoading: listLoading,
            error: error,
            selectedRows: selectedRows,
            tableRef: tableRef,
            batchDeleteLoading: batchDeleteLoading,
            rowDeletingId: rowDeletingId,
            submittedSearch: submittedSearch,
            typePickerValues: typePickerValues,
            query: query,
            wordDialogVisible: wordDialogVisible,
            wordDialogMode: wordDialogMode,
            wordFormRef: wordFormRef,
            submitLoading: submitLoading,
            wordForm: wordForm,
            uploadDialogVisible: uploadDialogVisible,
            uploadRef: uploadRef,
            uploadFiles: uploadFiles,
            uploadLoading: uploadLoading,
            uploadProgress: uploadProgress,
            uploadResult: uploadResult,
            uploadForm: uploadForm,
            wordFormRules: wordFormRules,
            wordDialogTitle: wordDialogTitle,
            formRecommendApplicable: formRecommendApplicable,
            hasSearch: hasSearch,
            hasActiveFilters: hasActiveFilters,
            resultTitle: resultTitle,
            resultDescription: resultDescription,
            submitSearch: submitSearch,
            handleSearchInput: handleSearchInput,
            handleSearchClear: handleSearchClear,
            resetFilters: resetFilters,
            refreshList: refreshList,
            handleTypePickerChange: handleTypePickerChange,
            handlePageChange: handlePageChange,
            handlePageSizeChange: handlePageSizeChange,
            handleSelectionChange: handleSelectionChange,
            openCreateDialog: openCreateDialog,
            openEditDialog: openEditDialog,
            handleFormTypeChange: handleFormTypeChange,
            resetWordDialog: resetWordDialog,
            submitWordForm: submitWordForm,
            confirmDelete: confirmDelete,
            confirmBatchDelete: confirmBatchDelete,
            openUploadDialog: openUploadDialog,
            handleUploadFileChange: handleUploadFileChange,
            handleUploadFileRemove: handleUploadFileRemove,
            handleUploadExceed: handleUploadExceed,
            submitUpload: submitUpload,
            resetUploadDialog: resetUploadDialog,
            isRecommendType: isRecommendType,
            getTypeLabel: getTypeLabel,
            getTypeTag: getTypeTag,
            formatTime: formatTime,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
