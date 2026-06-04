<template>
<div class="config-container" :style="{ maxHeight: collapsed ? 'auto' : '500px' }">
    <div class="config-header">
    <div class="status-badge" @click="toggleCollapsed">
        <span class="status-dot" :class="ledClass"></span>
        <span class="status-text">{{ statusText }}</span>
        <el-icon :class="{ 'is-active': !collapsed }" class="arrow-icon"><ArrowRight /></el-icon>
    </div>
    <el-button-group v-if="!collapsed">
        <el-button :loading="validating" size="small" @click="manualValidate">校验</el-button>
        <el-button 
        :disabled="saving" 
        :loading="saving" 
        size="small" 
        type="primary" 
        @click="saveConfig"
        >保存</el-button>
    </el-button-group>
    </div>

    <el-collapse-transition>
    <div v-show="!collapsed" class="config-body">
        <div v-if="cookieSource === 'user'" class="info-alert">
            <el-icon><InfoFilled /></el-icon>
            <a href="https://mp.weixin.qq.com/cgi-bin/home" target="_blank">点击获取个人账号参数</a>
        </div>

        <el-form label-position="top" size="small" :model="activeData">
        <el-form-item label="账号来源">
            <div class="source-wrapper">
            <el-radio-group v-model="cookieSource" class="source-radio" @change="onSourceChange">
                <el-radio-button label="admin">系统</el-radio-button>
                <el-radio-button label="user">个人</el-radio-button>
            </el-radio-group>
            
            <el-button 
                v-if="cookieSource === 'admin'" 
                :type="adminEditEnabled ? 'warning' : 'info'" 
                link 
                size="small"
                @click="adminEditEnabled = !adminEditEnabled"
            >
                {{ adminEditEnabled ? '锁定' : '修改全局配置' }}
            </el-button>
            </div>
        </el-form-item>

        <div class="form-grid">
            <el-form-item label="Token">
            <el-input v-model="activeData.token" :disabled="isReadOnly" placeholder="token" spellcheck="false" clearable />
            </el-form-item>
            <el-form-item label="Fingerprint">
            <el-input v-model="activeData.fingerprint" :disabled="isReadOnly" placeholder="fp" spellcheck="false" clearable />
            </el-form-item>
        </div>

        <el-form-item label="Cookie">
            <el-input
            v-model="activeData.cookie"
            :disabled="isReadOnly"
            type="textarea"
            :rows="3"
            placeholder="请输入完整 Cookie"
            spellcheck="false"
            resize="none"
            />
        </el-form-item>
        </el-form>
    </div>
    </el-collapse-transition>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowRight, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/api/axios'

interface ConfigData {
token: string
fingerprint: string
cookie: string
}

const props = withDefaults(defineProps<{
activeConfig?: ConfigData
}>(), {
activeConfig: () => ({ token: '', fingerprint: '', cookie: '' })
})

const emit = defineEmits(['update:activeConfig'])

// --- 状态变量 ---
const localConfig = ref<ConfigData>({ token: '', fingerprint: '', cookie: '' }) 
const localSystemConfig = ref<ConfigData>({ token: '', fingerprint: '', cookie: '' }) 
const collapsed = ref(true) 
const validating = ref(false)
const validationStatus = ref<'idle' | 'valid' | 'invalid'>('idle')
const cookieSource = ref<'user' | 'admin'>('admin')
const adminEditEnabled = ref(false) 
const saving = ref(false)

// --- 计算属性 ---
const activeData = computed(() => {
return cookieSource.value === 'user' ? localConfig.value : localSystemConfig.value
})

const isReadOnly = computed(() => {
if (cookieSource.value === 'user') return false
return !adminEditEnabled.value
})

const ledClass = computed(() => ({
'led--yellow': validating.value,
'led--green': validationStatus.value === 'valid',
'led--red': validationStatus.value === 'invalid',
'led--gray': validationStatus.value === 'idle'
}))

const statusText = computed(() => {
if (validating.value) return '正在校验...'
return validationStatus.value === 'valid' ? '校验通过' : (validationStatus.value === 'invalid' ? '校验失败' : '未校验')
})

function onSourceChange() {
adminEditEnabled.value = false
validationStatus.value = 'idle'
}

// --- 核心逻辑 ---

async function verifyData(config: ConfigData): Promise<boolean> {
    if (!config.token || !config.fingerprint || !config.cookie) return false
    validating.value = true
    try {
        await axios.post('/wechat/crawl/verify-cookie', { ...config })
        validationStatus.value = 'valid'
        return true
    } catch (e) {
        validationStatus.value = 'invalid'
        return false
    } finally {
        validating.value = false
    }
}

/**
 * 修改后的保存逻辑：先校验，后保存
 * @param silent 是否静默执行（不弹出确认框和成功提示）
 */
const saveConfig = async (silent = false): Promise<boolean> => {
    // 1. 自动校验
    const isValid = await verifyData(activeData.value)
    if (!isValid) {
        if (!silent) ElMessage.error('校验失败，无法保存')
        return false
    }

    // 2. 校验成功，执行保存
    try {
        if (cookieSource.value === 'admin') {
            if (!silent) {
                await ElMessageBox.confirm('修改系统全局配置将影响所有用户，确定继续？', '警告', {
                type: 'warning', confirmButtonText: '确定修改'
                })
            }
            saving.value = true
            await axios.put('/wechat/crawl/systemConfig', {
                module: 'wechat',
                value: localSystemConfig.value,
                value_type: 'json',
            })
            adminEditEnabled.value = false
        } else {
            saving.value = true
            localStorage.setItem('wechat-config', JSON.stringify(localConfig.value))
        }
        
        if (!silent) ElMessage.success('保存成功并已同步')
        syncToParent()
        return true
    } catch (e: any) {
        if (!silent) ElMessage.error(e.response?.data?.message || '保存失败')
        return false
    } finally {
        saving.value = false
    }
}

// 初始化加载
async function initComponent() {
const savedUserConfig = localStorage.getItem('wechat-config')
if (savedUserConfig) localConfig.value = JSON.parse(savedUserConfig)

try {
    const resp = await axios.get('/wechat/crawl/systemConfig')
    localSystemConfig.value = resp.data || { token: '', fingerprint: '', cookie: '' }
} catch (e) {
    console.error('获取系统配置失败')
}

// 初始自动寻找可用配置
const userValid = await verifyData(localConfig.value)
if (userValid) {
    cookieSource.value = 'user'
    syncToParent()
    return
}

const systemValid = await verifyData(localSystemConfig.value)
if (systemValid) {
    cookieSource.value = 'admin'
    syncToParent()
} else {
    collapsed.value = false // 全部无效则展开
}
}

function syncToParent() {
    emit('update:activeConfig', { ...activeData.value })
}

async function manualValidate() {
    const success = await verifyData(activeData.value)
    if (success) {
        ElMessage.success('校验通过')
        syncToParent()
    } else {
        ElMessage.error('校验失败，参数无效')
    }
}

// 修改后的切换折叠逻辑
async function toggleCollapsed() {
    if (!collapsed.value) {
        // 正在尝试收起：走校验-->保存逻辑
        const success = await saveConfig(true)
    
        if (success) {
            collapsed.value = true
        } else {
            // 当前配置无效，尝试检查另一种配置是否有效（满足“都无效则展开”的逻辑）
            const otherSource = cookieSource.value === 'user' ? 'admin' : 'user'
            const otherData = otherSource === 'user' ? localConfig.value : localSystemConfig.value
            const otherValid = await verifyData(otherData)
            
            if (otherValid) {
                // 如果另一种配置是好的，切换过去并允许折叠
                cookieSource.value = otherSource
                syncToParent()
                collapsed.value = true
            } else {
                // 确实都无效
                collapsed.value = false
                ElMessage.warning('配置校验不通过，请修正后再收起')
            }
        }
    } else {
        // 展开逻辑保持简单
        collapsed.value = false
    }
}

onMounted(() => { 
initComponent()
})
</script>

<style scoped>
.config-container {
border: 1px solid #e4e7ed;
border-radius: 8px;
background: #fff;
display: flex; /* 使用 Flex 布局实现固定头部 */
flex-direction: column;
overflow: hidden;
}

.config-header {
padding: 8px 12px;
display: flex;
justify-content: space-between;
align-items: center;
background: #f8f9fa;
border-bottom: 1px solid #f0f0f0;
flex-shrink: 0; /* 禁止头部压缩 */
z-index: 10;
}

.config-body {
padding: 12px;
overflow-y: auto; /* 只有 body 部分滚动 */
overflow-x: hidden;
scrollbar-width: thin;
flex: 1;
}

/* 2. 解决溢出问题：优化网格 */
.form-grid {
display: grid;
grid-template-columns: 6fr 10fr;
gap: 8px;
}

/* 强制 Input 不撑开容器 */
:deep(.el-input__inner) {
text-overflow: ellipsis;
}

.source-wrapper {
display: flex;
justify-content: space-between;
align-items: center;
width: 100%;
}

.info-alert {
background: #ecf5ff;
color: #409eff;
padding: 6px 10px;
border-radius: 4px;
font-size: 12px;
margin-bottom: 12px;
display: flex;
align-items: center;
gap: 6px;
}
.info-alert a { color: #409eff; text-decoration: none; font-weight: bold; }

.status-badge { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #C0C4CC; }
.led--green { background: #67C23A; box-shadow: 0 0 5px #67c23a; }
.led--yellow { background: #E6A23C; animation: blink 1s infinite; }
.led--red { background: #F56C6C; }
@keyframes blink { 50% { opacity: 0.5; } }

.status-text { font-size: 12px; color: #606266; }
.arrow-icon { transition: transform 0.3s; font-size: 12px; }
.arrow-icon.is-active { transform: rotate(90deg); }

/* 针对侧边栏窄小区域优化单选框 */
:deep(.el-radio-button--small .el-radio-button__inner) {
padding: 5px 8px;
}
</style>