<template>
<div class="student-management">
    <div class="toolbar" style="display: flex; align-items: center; gap: 8px;">
    <el-input
        v-model="searchText"
        placeholder="搜索用户名"
        clearable
        @clear="handleSearch"
        @keyup.enter.native="handleSearch"
        style="width: 200px;"
    />
    <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>

    <el-button type="primary" icon="Plus" @click="openAddDialog">新增学生</el-button>
    <el-button type="warning" icon="Refresh" @click="openBatchRandomDialog">批量随机生成</el-button>
    <el-button type="success" icon="Upload" @click="openImportDialog">导入 Excel</el-button>
    </div>

    <el-table
        :data="students"
        stripe
        border
        style="width: 100%"
    >
    <el-table-column prop="username" label="用户名" />
    <el-table-column prop="score" label="最近得分" />
    <el-table-column fixed="right" label="操作" width="260">
        <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDeleteUser(row)">删除</el-button>
            <!-- 新增：更改账号权限 -->
            <el-button size="small" type="warning" @click="handleChangeRole(row)">更改权限</el-button>
        </template>
    </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: auto; text-align: right;">
    <el-pagination
        background
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
    />
    </div>

    <!-- 添加 / 编辑 弹窗 -->
    <el-dialog :title="isEdit ? '编辑学生' : '新增学生'" v-model="addDialogVisible">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" />
        </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
    </span>
    </el-dialog>

    <!-- 批量随机生成 弹窗 -->
    <el-dialog title="批量随机生成账号" v-model="batchRandomVisible">
    <el-form :model="batchForm" :rules="batchRules" ref="batchRandomRef" label-width="120px">
        <el-form-item label="生成数量" prop="count">
        <el-input-number v-model="batchForm.count" :min="1" :max="500" />
        </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
        <el-button @click="batchRandomVisible = false">取消</el-button>
        <el-button type="primary" @click="batchGenerateRandom">生成</el-button>
    </div>
    </el-dialog>

    <!-- 导入 Excel 弹窗 -->
    <el-dialog title="导入学生列表" v-model="importVisible">
        <el-upload
            ref="uploadRef"
            :http-request="uploadExcelFile"
            :show-file-list="false"
            accept=".xlsx, .xls"
            >
            <el-button type="primary" icon="Upload">选择文件</el-button>
        </el-upload>
    <div slot="footer" class="dialog-footer">
        <el-button @click="importVisible = false">关闭</el-button>
    </div>
    </el-dialog>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus'
import { useStore } from '@/store'
import axios from '@/api/axios';

// 当前登录用户角色（从登录信息或 store 中取）
const store = useStore()
const currentUserRole = ref<string>('superadministrator')
const userRoleMapping = {
    'superadministrator': '超级管理员',
    'administrator': '管理员',
    'mentor': '导师',
    'student': '学生'
}
// 点击按钮
const handleChangeRole = async (user: any) => {
  
    // 根据当前用户和目标用户的角色，决定允许的操作
    const role = user.role?.slug || 'student'
    currentUserRole.value = store.state.user_perms || 'student'

    let action: 'upgrade' | 'downgrade' | null = null
    let targetRole = ''

    if (currentUserRole.value === 'superadministrator') {
        if (role === 'student' || role === 'mentor') {
            action = 'upgrade'
            targetRole = 'administrator'
        } else if (role === 'administrator') {
            action = 'downgrade'
            targetRole = 'student' // 或 mentor，看你业务需要
        }
    } else if (currentUserRole.value === 'administrator') {
        if (role === 'student') {
            action = 'upgrade'
            targetRole = 'mentor'
        } else if (role === 'mentor') {
            action = 'downgrade'
            targetRole = 'student'
        }
    }

    if (!action) {
        ElMessage.warning('无可用的权限更改操作')
        return
    }

    ElMessageBox.confirm(
        `确定要将用户「${user.username}」的权限${action === 'upgrade' ? '提升' : '降级'}为「${userRoleMapping[targetRole]}」吗？`,
        '更改账号权限',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        }
    )
        .then(async () => {
            try {
                const url = `/auth/user/${user.id}/changeRole`

                await axios.post(url, {
                    action: action,
                    target: targetRole,
                })
                ElMessage.success('权限修改成功')
                fetchList()
            } catch (err: any) {
                ElMessage.error(err.response?.data?.message || '权限修改失败')
            }
        })
        .catch(() => {
            ElMessage.info('已取消操作')
        })
}


// 接口返回结构
interface Student {
id: number;
username: string;
password?: string;
}
interface ListResponse {
    items: Student[];
    _meta: {
        total_items: number;
    }
}

// 列表数据及分页
const students = ref<Student[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const searchText = ref('');

// 添加 / 编辑 表单和验证规则
const addDialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref();
const form = ref<Partial<Student>>({});
const rules = {
username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

function openAddDialog() {
isEdit.value = false;
form.value = {};
addDialogVisible.value = true;
}
function openEditDialog(row: Student) {
isEdit.value = true;
form.value = { ...row };
addDialogVisible.value = true;
}
async function submitForm() {
formRef.value.validate(async (valid: boolean) => {
    if (valid) {
        if (isEdit.value) {
            axios.put(`/study/students/${form.value.id}`, form.value).then(() => {
                ElMessage.success('重置密码成功');
            }).catch((error) => {
                ElMessage.error(error.response.data.message);
            });
        } else {
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
const handleDeleteUser = async (user: any) => {
    ElMessageBox.confirm(
        `确定要删除用户「${user.username}」吗？此操作不可恢复。`,
        '确认删除',
        {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        }
    ).then(() => {
        deleteUser(user.id)
    }).catch(() => {
        ElMessage.info('取消删除')
    })
}

const deleteUser = async (id: number) => {
    axios.delete(`/study/students/${id}`).then((response)=>{
        ElMessage.success(response.data.message || '删除成功')
    }).catch((error) => {
        ElMessage.error(error.response.data.message || '删除失败')
    }).finally(() => {
        fetchList()
    })
}

// 搜索
function handleSearch() {
page.value = 1;
fetchList();
}

// 分页事件
function handlePageChange(newPage: number) {
page.value = newPage;
fetchList();
}
function handleSizeChange(newSize: number) {
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
    batchRandomRef.value.validate(async (valid: boolean) => {
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
    const resp = await axios.get<ListResponse>('/study/students', {
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
const uploadExcelFile = async (options: any) => {
    console.log('上传文件:', options)
    const file = options.file
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('user-token')

    try {
        const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        })

        const result = await res.json()
        if (!res.ok) {
            ElMessage.error(result.message || '导入失败')
        } else {
            ElMessage.success(result.message || '导入成功')
            console.log('导入详情:', result)
            importVisible.value = false
            fetchList()
        }
    } catch (err) {
        console.error('上传出错:', err)
        ElMessage.error('上传失败')
    }
}

onMounted(fetchList);
</script>

<style lang="scss" scoped>
.student-management {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: 24px;
    gap: 35px;
    background: #f5f7fa;

    .toolbar {
        button {
            margin-right: 8px;
        }
    }
}
</style>
  