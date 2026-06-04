import { ref, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useStore } from '@/store';
import axios from '@/api/axios';
// 当前登录用户角色（从登录信息或 store 中取）
const store = useStore();
const currentUserRole = ref('superadministrator');
const userRoleMapping = {
    'superadministrator': '超级管理员',
    'administrator': '管理员',
    'mentor': '导师',
    'student': '学生'
};
// 点击按钮
const handleChangeRole = async (user) => {
    // 根据当前用户和目标用户的角色，决定允许的操作
    const role = user.role?.slug || 'student';
    currentUserRole.value = store.state.user_perms || 'student';
    let action = null;
    let targetRole = '';
    if (currentUserRole.value === 'superadministrator') {
        if (role === 'student' || role === 'mentor') {
            action = 'upgrade';
            targetRole = 'administrator';
        }
        else if (role === 'administrator') {
            action = 'downgrade';
            targetRole = 'student'; // 或 mentor，看你业务需要
        }
    }
    else if (currentUserRole.value === 'administrator') {
        if (role === 'student') {
            action = 'upgrade';
            targetRole = 'mentor';
        }
        else if (role === 'mentor') {
            action = 'downgrade';
            targetRole = 'student';
        }
    }
    if (!action) {
        ElMessage.warning('无可用的权限更改操作');
        return;
    }
    ElMessageBox.confirm(`确定要将用户「${user.username}」的权限${action === 'upgrade' ? '提升' : '降级'}为「${userRoleMapping[targetRole]}」吗？`, '更改账号权限', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    })
        .then(async () => {
        try {
            const url = `/auth/user/${user.id}/changeRole`;
            await axios.post(url, {
                action: action,
                target: targetRole,
            });
            ElMessage.success('权限修改成功');
            fetchList();
        }
        catch (err) {
            ElMessage.error(err.response?.data?.message || '权限修改失败');
        }
    })
        .catch(() => {
        ElMessage.info('已取消操作');
    });
};
// 列表数据及分页
const students = ref([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const searchText = ref('');
// 添加 / 编辑 表单和验证规则
const addDialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref();
const form = ref({});
const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};
function openAddDialog() {
    isEdit.value = false;
    form.value = {};
    addDialogVisible.value = true;
}
function openEditDialog(row) {
    isEdit.value = true;
    form.value = { ...row };
    addDialogVisible.value = true;
}
async function submitForm() {
    formRef.value.validate(async (valid) => {
        if (valid) {
            if (isEdit.value) {
                axios.put(`/study/students/${form.value.id}`, form.value).then(() => {
                    ElMessage.success('重置密码成功');
                }).catch((error) => {
                    ElMessage.error(error.response.data.message);
                });
            }
            else {
                axios.post('/study/students', form.value).then(() => {
                    ElMessage.success('添加成功');
                }).catch((error) => {
                    ElMessage.error(error.response.data.message);
                });
            }
            addDialogVisible.value = false;
            fetchList();
        }
    });
}
const handleDeleteUser = async (user) => {
    ElMessageBox.confirm(`确定要删除用户「${user.username}」吗？此操作不可恢复。`, '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        deleteUser(user.id);
    }).catch(() => {
        ElMessage.info('取消删除');
    });
};
const deleteUser = async (id) => {
    axios.delete(`/study/students/${id}`).then((response) => {
        ElMessage.success(response.data.message || '删除成功');
    }).catch((error) => {
        ElMessage.error(error.response.data.message || '删除失败');
    }).finally(() => {
        fetchList();
    });
};
// 搜索
function handleSearch() {
    page.value = 1;
    fetchList();
}
// 分页事件
function handlePageChange(newPage) {
    page.value = newPage;
    fetchList();
}
function handleSizeChange(newSize) {
    pageSize.value = newSize;
    page.value = 1;
    fetchList();
}
// 批量随机生成 表单和验证
const batchRandomVisible = ref(false);
const batchRandomRef = ref();
const batchForm = ref({ count: 10 });
const batchRules = {
    count: [{ required: true, type: 'number', message: '请输入生成数量', trigger: 'change' }],
};
function openBatchRandomDialog() {
    batchRandomVisible.value = true;
    batchForm.value.count = 10;
}
async function batchGenerateRandom() {
    batchRandomRef.value.validate(async (valid) => {
        if (valid) {
            axios.post('/study/students/batch_random', { count: batchForm.value.count })
                .then((response) => {
                if (response.status === 200) {
                    ElMessage.success(response.data.message);
                }
            })
                .catch((error) => {
                ElMessage.error(error.response.data.message);
            })
                .finally(() => {
                batchRandomVisible.value = false;
                fetchList();
            });
        }
    });
}
// 列表 + 获取学生最新一次分数
async function fetchList() {
    students.value = [];
    const resp = await axios.get('/study/students', {
        params: {
            page: page.value,
            pageSize: pageSize.value,
            search: searchText.value,
        },
    });
    students.value = resp.data.items;
    total.value = resp.data._meta.total_items;
}
// 导入 Excel
const importVisible = ref(false);
const uploadUrl = '/api/study/students/import_excel';
function openImportDialog() {
    importVisible.value = true;
}
const uploadExcelFile = async (options) => {
    console.log('上传文件:', options);
    const file = options.file;
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('user-token');
    try {
        const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        const result = await res.json();
        if (!res.ok) {
            ElMessage.error(result.message || '导入失败');
        }
        else {
            ElMessage.success(result.message || '导入成功');
            console.log('导入详情:', result);
            importVisible.value = false;
            fetchList();
        }
    }
    catch (err) {
        console.error('上传出错:', err);
        ElMessage.error('上传失败');
    }
};
onMounted(fetchList);
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("student-management") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("toolbar") },
    ...{ style: ({}) },
});
const __VLS_0 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.searchText)),
    placeholder: ("搜索用户名"),
    clearable: (true),
    ...{ style: ({}) },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClear': {} },
    ...{ 'onKeyup': {} },
    modelValue: ((__VLS_ctx.searchText)),
    placeholder: ("搜索用户名"),
    clearable: (true),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClear: (__VLS_ctx.handleSearch)
};
const __VLS_8 = {
    onKeyup: (__VLS_ctx.handleSearch)
};
let __VLS_3;
let __VLS_4;
var __VLS_5;
const __VLS_9 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ("Search"),
}));
const __VLS_11 = __VLS_10({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ("Search"),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_15;
const __VLS_16 = {
    onClick: (__VLS_ctx.handleSearch)
};
let __VLS_12;
let __VLS_13;
__VLS_14.slots.default;
var __VLS_14;
const __VLS_17 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ("Plus"),
}));
const __VLS_19 = __VLS_18({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ("Plus"),
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
let __VLS_23;
const __VLS_24 = {
    onClick: (__VLS_ctx.openAddDialog)
};
let __VLS_20;
let __VLS_21;
__VLS_22.slots.default;
var __VLS_22;
const __VLS_25 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    ...{ 'onClick': {} },
    type: ("warning"),
    icon: ("Refresh"),
}));
const __VLS_27 = __VLS_26({
    ...{ 'onClick': {} },
    type: ("warning"),
    icon: ("Refresh"),
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_31;
const __VLS_32 = {
    onClick: (__VLS_ctx.openBatchRandomDialog)
};
let __VLS_28;
let __VLS_29;
__VLS_30.slots.default;
var __VLS_30;
const __VLS_33 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ...{ 'onClick': {} },
    type: ("success"),
    icon: ("Upload"),
}));
const __VLS_35 = __VLS_34({
    ...{ 'onClick': {} },
    type: ("success"),
    icon: ("Upload"),
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_39;
const __VLS_40 = {
    onClick: (__VLS_ctx.openImportDialog)
};
let __VLS_36;
let __VLS_37;
__VLS_38.slots.default;
var __VLS_38;
const __VLS_41 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    data: ((__VLS_ctx.students)),
    stripe: (true),
    border: (true),
    ...{ style: ({}) },
}));
const __VLS_43 = __VLS_42({
    data: ((__VLS_ctx.students)),
    stripe: (true),
    border: (true),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
const __VLS_47 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    prop: ("username"),
    label: ("用户名"),
}));
const __VLS_49 = __VLS_48({
    prop: ("username"),
    label: ("用户名"),
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
const __VLS_53 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    prop: ("score"),
    label: ("最近得分"),
}));
const __VLS_55 = __VLS_54({
    prop: ("score"),
    label: ("最近得分"),
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
const __VLS_59 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    fixed: ("right"),
    label: ("操作"),
    width: ("260"),
}));
const __VLS_61 = __VLS_60({
    fixed: ("right"),
    label: ("操作"),
    width: ("260"),
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
{
    const { default: __VLS_thisSlot } = __VLS_64.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_65 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
        ...{ 'onClick': {} },
        size: ("small"),
    }));
    const __VLS_67 = __VLS_66({
        ...{ 'onClick': {} },
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    let __VLS_71;
    const __VLS_72 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditDialog(row);
        }
    };
    let __VLS_68;
    let __VLS_69;
    __VLS_70.slots.default;
    var __VLS_70;
    const __VLS_73 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
        ...{ 'onClick': {} },
        size: ("small"),
        type: ("danger"),
    }));
    const __VLS_75 = __VLS_74({
        ...{ 'onClick': {} },
        size: ("small"),
        type: ("danger"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_74));
    let __VLS_79;
    const __VLS_80 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleDeleteUser(row);
        }
    };
    let __VLS_76;
    let __VLS_77;
    __VLS_78.slots.default;
    var __VLS_78;
    const __VLS_81 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
        ...{ 'onClick': {} },
        size: ("small"),
        type: ("warning"),
    }));
    const __VLS_83 = __VLS_82({
        ...{ 'onClick': {} },
        size: ("small"),
        type: ("warning"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
    let __VLS_87;
    const __VLS_88 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleChangeRole(row);
        }
    };
    let __VLS_84;
    let __VLS_85;
    __VLS_86.slots.default;
    var __VLS_86;
}
__VLS_64.slots.default;
var __VLS_64;
__VLS_46.slots.default;
var __VLS_46;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: ({}) },
});
const __VLS_89 = {}.ElPagination;
/** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: (true),
    currentPage: ((__VLS_ctx.page)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([20, 50, 100])),
    total: ((__VLS_ctx.total)),
    layout: ("total, sizes, prev, pager, next, jumper"),
}));
const __VLS_91 = __VLS_90({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: (true),
    currentPage: ((__VLS_ctx.page)),
    pageSize: ((__VLS_ctx.pageSize)),
    pageSizes: (([20, 50, 100])),
    total: ((__VLS_ctx.total)),
    layout: ("total, sizes, prev, pager, next, jumper"),
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
let __VLS_95;
const __VLS_96 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_97 = {
    onSizeChange: (__VLS_ctx.handleSizeChange)
};
let __VLS_92;
let __VLS_93;
var __VLS_94;
const __VLS_98 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    title: ((__VLS_ctx.isEdit ? '编辑学生' : '新增学生')),
    modelValue: ((__VLS_ctx.addDialogVisible)),
}));
const __VLS_100 = __VLS_99({
    title: ((__VLS_ctx.isEdit ? '编辑学生' : '新增学生')),
    modelValue: ((__VLS_ctx.addDialogVisible)),
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
const __VLS_104 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    model: ((__VLS_ctx.form)),
    rules: ((__VLS_ctx.rules)),
    ref: ("formRef"),
    labelWidth: ("100px"),
}));
const __VLS_106 = __VLS_105({
    model: ((__VLS_ctx.form)),
    rules: ((__VLS_ctx.rules)),
    ref: ("formRef"),
    labelWidth: ("100px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
// @ts-ignore navigation for `const formRef = ref()`
/** @type { typeof __VLS_ctx.formRef } */ ;
var __VLS_110 = {};
const __VLS_111 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    label: ("用户名"),
    prop: ("username"),
}));
const __VLS_113 = __VLS_112({
    label: ("用户名"),
    prop: ("username"),
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
const __VLS_117 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    modelValue: ((__VLS_ctx.form.username)),
}));
const __VLS_119 = __VLS_118({
    modelValue: ((__VLS_ctx.form.username)),
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
__VLS_116.slots.default;
var __VLS_116;
const __VLS_123 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
    label: ("密码"),
    prop: ("password"),
}));
const __VLS_125 = __VLS_124({
    label: ("密码"),
    prop: ("password"),
}, ...__VLS_functionalComponentArgsRest(__VLS_124));
const __VLS_129 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_130 = __VLS_asFunctionalComponent(__VLS_129, new __VLS_129({
    modelValue: ((__VLS_ctx.form.password)),
}));
const __VLS_131 = __VLS_130({
    modelValue: ((__VLS_ctx.form.password)),
}, ...__VLS_functionalComponentArgsRest(__VLS_130));
__VLS_128.slots.default;
var __VLS_128;
__VLS_109.slots.default;
var __VLS_109;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    slot: ("footer"),
    ...{ class: ("dialog-footer") },
});
const __VLS_135 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
    ...{ 'onClick': {} },
}));
const __VLS_137 = __VLS_136({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
let __VLS_141;
const __VLS_142 = {
    onClick: (...[$event]) => {
        __VLS_ctx.addDialogVisible = false;
    }
};
let __VLS_138;
let __VLS_139;
__VLS_140.slots.default;
var __VLS_140;
const __VLS_143 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    ...{ 'onClick': {} },
    type: ("primary"),
}));
const __VLS_145 = __VLS_144({
    ...{ 'onClick': {} },
    type: ("primary"),
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
let __VLS_149;
const __VLS_150 = {
    onClick: (__VLS_ctx.submitForm)
};
let __VLS_146;
let __VLS_147;
__VLS_148.slots.default;
var __VLS_148;
__VLS_103.slots.default;
var __VLS_103;
const __VLS_151 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
    title: ("批量随机生成账号"),
    modelValue: ((__VLS_ctx.batchRandomVisible)),
}));
const __VLS_153 = __VLS_152({
    title: ("批量随机生成账号"),
    modelValue: ((__VLS_ctx.batchRandomVisible)),
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
const __VLS_157 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    model: ((__VLS_ctx.batchForm)),
    rules: ((__VLS_ctx.batchRules)),
    ref: ("batchRandomRef"),
    labelWidth: ("120px"),
}));
const __VLS_159 = __VLS_158({
    model: ((__VLS_ctx.batchForm)),
    rules: ((__VLS_ctx.batchRules)),
    ref: ("batchRandomRef"),
    labelWidth: ("120px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
// @ts-ignore navigation for `const batchRandomRef = ref()`
/** @type { typeof __VLS_ctx.batchRandomRef } */ ;
var __VLS_163 = {};
const __VLS_164 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    label: ("生成数量"),
    prop: ("count"),
}));
const __VLS_166 = __VLS_165({
    label: ("生成数量"),
    prop: ("count"),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
const __VLS_170 = {}.ElInputNumber;
/** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    modelValue: ((__VLS_ctx.batchForm.count)),
    min: ((1)),
    max: ((500)),
}));
const __VLS_172 = __VLS_171({
    modelValue: ((__VLS_ctx.batchForm.count)),
    min: ((1)),
    max: ((500)),
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
__VLS_169.slots.default;
var __VLS_169;
__VLS_162.slots.default;
var __VLS_162;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    slot: ("footer"),
    ...{ class: ("dialog-footer") },
});
const __VLS_176 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    ...{ 'onClick': {} },
}));
const __VLS_178 = __VLS_177({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
let __VLS_182;
const __VLS_183 = {
    onClick: (...[$event]) => {
        __VLS_ctx.batchRandomVisible = false;
    }
};
let __VLS_179;
let __VLS_180;
__VLS_181.slots.default;
var __VLS_181;
const __VLS_184 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    ...{ 'onClick': {} },
    type: ("primary"),
}));
const __VLS_186 = __VLS_185({
    ...{ 'onClick': {} },
    type: ("primary"),
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
let __VLS_190;
const __VLS_191 = {
    onClick: (__VLS_ctx.batchGenerateRandom)
};
let __VLS_187;
let __VLS_188;
__VLS_189.slots.default;
var __VLS_189;
__VLS_156.slots.default;
var __VLS_156;
const __VLS_192 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    title: ("导入学生列表"),
    modelValue: ((__VLS_ctx.importVisible)),
}));
const __VLS_194 = __VLS_193({
    title: ("导入学生列表"),
    modelValue: ((__VLS_ctx.importVisible)),
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
const __VLS_198 = {}.ElUpload;
/** @type { [typeof __VLS_components.ElUpload, typeof __VLS_components.elUpload, typeof __VLS_components.ElUpload, typeof __VLS_components.elUpload, ] } */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    ref: ("uploadRef"),
    httpRequest: ((__VLS_ctx.uploadExcelFile)),
    showFileList: ((false)),
    accept: (".xlsx, .xls"),
}));
const __VLS_200 = __VLS_199({
    ref: ("uploadRef"),
    httpRequest: ((__VLS_ctx.uploadExcelFile)),
    showFileList: ((false)),
    accept: (".xlsx, .xls"),
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
// @ts-ignore navigation for `const uploadRef = ref()`
/** @type { typeof __VLS_ctx.uploadRef } */ ;
var __VLS_204 = {};
const __VLS_205 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
    type: ("primary"),
    icon: ("Upload"),
}));
const __VLS_207 = __VLS_206({
    type: ("primary"),
    icon: ("Upload"),
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
__VLS_210.slots.default;
var __VLS_210;
__VLS_203.slots.default;
var __VLS_203;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    slot: ("footer"),
    ...{ class: ("dialog-footer") },
});
const __VLS_211 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
    ...{ 'onClick': {} },
}));
const __VLS_213 = __VLS_212({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
let __VLS_217;
const __VLS_218 = {
    onClick: (...[$event]) => {
        __VLS_ctx.importVisible = false;
    }
};
let __VLS_214;
let __VLS_215;
__VLS_216.slots.default;
var __VLS_216;
__VLS_197.slots.default;
var __VLS_197;
['student-management', 'toolbar', 'dialog-footer', 'dialog-footer', 'dialog-footer',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            handleChangeRole: handleChangeRole,
            students: students,
            page: page,
            pageSize: pageSize,
            total: total,
            searchText: searchText,
            addDialogVisible: addDialogVisible,
            isEdit: isEdit,
            formRef: formRef,
            form: form,
            rules: rules,
            openAddDialog: openAddDialog,
            openEditDialog: openEditDialog,
            submitForm: submitForm,
            handleDeleteUser: handleDeleteUser,
            handleSearch: handleSearch,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
            batchRandomVisible: batchRandomVisible,
            batchRandomRef: batchRandomRef,
            batchForm: batchForm,
            batchRules: batchRules,
            openBatchRandomDialog: openBatchRandomDialog,
            batchGenerateRandom: batchGenerateRandom,
            importVisible: importVisible,
            openImportDialog: openImportDialog,
            uploadExcelFile: uploadExcelFile,
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
