<template>
    <div id="box" class="disable-select">
        <!-- 给 el-form 加 ref -->
        <el-form 
            ref="registerFormRef"
            :model="registerForm" 
            :rules="rules" 
            label-width="auto"
        >
            <h1 class="register-title">注 册</h1>
    
            <!-- 用户名 -->
            <el-form-item label="用户名" prop="username">
                <el-input 
                    v-model="registerForm.username" 
                    maxlength="15"
                    class="fixed-input"
                >
                    <template #suffix>
                        <span style="font-size:12px;color:#999;">
                            {{ registerForm.username.length }}/15
                        </span>
                    </template>
                </el-input>
            </el-form-item>
    
            <!-- 密码 -->
            <el-form-item label="密码" prop="password">
                <el-input 
                    :type="showPassword ? 'text' : 'password'" 
                    v-model="registerForm.password"
                    maxlength="30"
                    class="fixed-input"
                >
                    <template #suffix>
                        <span style="font-size:12px;color:#999;">
                            {{ registerForm.password.length }}/30
                        </span>
                    </template>
                </el-input>
                <el-icon @click="showPassword = !showPassword" class="eye-icon">
                    <View v-if="showPassword" />
                    <hide v-else />
                </el-icon>
            </el-form-item>
    
            <!-- 重复密码 -->
            <el-form-item label="重复密码" prop="checkPass">
                <el-input 
                    :type="showConfirm ? 'text' : 'password'" 
                    v-model="registerForm.checkPass"
                    maxlength="30"
                    class="fixed-input"
                >
                    <template #suffix>
                        <span style="font-size:12px;color:#999;">
                            {{ registerForm.checkPass.length }}/30
                        </span>
                    </template>
                </el-input>
                <el-icon @click="showConfirm = !showConfirm" class="eye-icon">
                    <View v-if="showConfirm" />
                    <hide v-else />
                </el-icon>
            </el-form-item>

            <!-- 邀请码输入 -->
            <el-form-item label="邀请码" prop="inviteCode">
                <div 
                  class="invite-inputs"
                  @paste.prevent="onPasteInvite"
                  tabindex="0"
                  role="textbox"
                >
                    <template v-for="(ch, idx) in inviteChars" :key="idx">
                        <div 
                          class="char-wrapper" 
                          :class="{ 
                            'group-gap': (idx+1)%4 === 0 && idx !== 15,
                            'group-gap-right': (idx)%4 === 0 && idx !== 0
                        }"
                        >
                            <input
                                :ref="el => setInputRef(el, idx)"
                                class="char-input"
                                type="text"
                                maxlength="1"
                                autocomplete="off"
                                inputmode="text"
                                :data-idx="idx"
                                v-model="inviteChars[idx]"
                                @input="onCharInput($event, idx)"
                                @keydown="onCharKeydown($event, idx)"
                                @focus="onCharFocus(idx)"
                            />
                        </div>
                    </template>
                </div>
                <!-- <div class="invite-note">支持粘贴格式：XXXX-XXXX-XXXX-XXXX；仅大写字母和数字</div> -->
            </el-form-item>
    
            <div class="register-button-container">
                <el-button 
                    type="primary" 
                    @click="onSubmit" 
                    class="register-button"
                >注册</el-button>
                <span>
                    已有账号? 
                    <router-link to="/login" class="to-login">前往登录!</router-link>
                </span>
            </div>
        </el-form>
    </div>
</template>
  
<script lang="ts">
import axios from '@/api/axios'
import { defineComponent, ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

export default defineComponent({
    name: 'Register',
    setup() {
        const registerForm = ref({
            username: '',
            password: '',
            checkPass: '',
            inviteCode: '', // 存储 16 位不带 '-' 的邀请码（用于 validator 与提交）
        })
        const showPassword = ref(false)
        const showConfirm = ref(false)

        // 邀请码 16 位字符数组（每项是单字符或空字符串）
        const inviteChars = ref<string[]>(Array.from({length:16}, () => ''))

        // refs for inputs
        const inputRefs = ref<HTMLInputElement[]>([])
        // 将 el 与对应 idx 关联起来
        const setInputRef = (el: any, idx: number) => {
            if (!el) {
                // 当元素卸载时，清除对应位置的引用
                inputRefs.value[idx] = undefined as any
                return
            }
            inputRefs.value[idx] = el
        }

        // 当 inviteChars 改变时，更新 registerForm.inviteCode（不带 '-')
        watch(inviteChars, (val) => {
            registerForm.value.inviteCode = val.join('')
        }, { deep: true })

        // allowed charset 正则（大写字母与数字）
        const VALID_CHAR_RE = /^[A-Z0-9]$/
        const NORMALIZE_RE = /[^A-Z0-9]/g

        // 处理输入（单字符或粘贴）
        const onCharInput = (e: Event, idx: number) => {
            const el = e.target as HTMLInputElement
            let v = el.value || ''
            // 可能是粘贴进来的多字符，这里只保留可用字符并分配
            if (v.length > 1) {
                // handle paste-like multi char input
                handleFillFromString(v, idx)
                return
            }
            v = v.toUpperCase()
            // 只允许 A-Z0-9
            if (!VALID_CHAR_RE.test(v)) {
                // 非法字符，清空该格
                inviteChars.value[idx] = ''
                el.value = ''
                return
            }
            inviteChars.value[idx] = v
            // 自动跳到下一个格子（如果有）
            if (idx < 15) {
                nextTick(() => {
                    inputRefs.value[idx+1]?.focus()
                    inputRefs.value[idx+1]?.select()
                })
            }
        }

        // 处理粘贴 / 批量填充：从给定字符串开始填充到 idx（或从0）
        const handleFillFromString = (s: string, startIdx = 0) => {
            const normalized = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '')
            if (!normalized) return
            let pos = startIdx
            for (let i = 0; i < normalized.length && pos < 16; i++, pos++) {
                inviteChars.value[pos] = normalized[i]
            }
            // focus the next empty or last
            nextTick(() => {
                let focusIdx = inviteChars.value.findIndex(ch => !ch)
                if (focusIdx === -1) focusIdx = 15
                inputRefs.value[focusIdx]?.focus()
                inputRefs.value[focusIdx]?.select()
            })
        }

        // 处理整段粘贴（支持带 '-' 的完整格式）
        const onPasteInvite = (event: ClipboardEvent) => {
            const text = event.clipboardData?.getData('text') || ''
            if (!text) return
            // 解析出 A-Z0-9，填满 16 位
            const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
            handleFillFromString(cleaned, 0)
        }

        // 键盘事件处理：Backspace 自动回退、左右键移动
        const onCharKeydown = (e: KeyboardEvent, idx: number) => {
            const key = e.key
            const el = e.target as HTMLInputElement
            if (key === 'Backspace') {
                // 若当前有字符，则清空；若为空则移动到上一个并清空
                if (inviteChars.value[idx]) {
                    inviteChars.value[idx] = ''
                    // 保持焦点在当前
                    nextTick(() => el.value = '')
                    e.preventDefault()
                } else if (idx > 0) {
                    const prev = inputRefs.value[idx-1]
                    prev?.focus()
                    inviteChars.value[idx-1] = ''
                    prev && (prev.value = '')
                    e.preventDefault()
                }
            } else if (key === 'ArrowLeft') {
                if (idx > 0) {
                    inputRefs.value[idx-1]?.focus()
                    e.preventDefault()
                }
            } else if (key === 'ArrowRight') {
                if (idx < 15) {
                    inputRefs.value[idx+1]?.focus()
                    e.preventDefault()
                }
            } else {
                // 允许默认行为（字符输入由 onCharInput 处理）
            }
        }

        const onCharFocus = (idx: number) => {
            // select 内容以便覆盖
            nextTick(() => {
                inputRefs.value[idx]?.select()
            })
        }

        // 校验器：必须填满16位，仅 A-Z0-9
        const validateInviteCode = (_: any, value: string, callback: any) => {
            const raw = String(value || '').toUpperCase().replace(NORMALIZE_RE, '')
            if (!raw || raw.length === 0) {
                return callback(new Error('请输入邀请码（16 位）'))
            }
            if (raw.length !== 16) {
                return callback(new Error('邀请码必须为 16 位'))
            }
            if (!/^[A-Z0-9]{16}$/.test(raw)) {
                return callback(new Error('邀请码只能包含大写字母和数字'))
            }
            callback()
        }

        // 自定义重复密码校验器
        const checkPass = (_: any, value: string, callback: any) => {
            if (!value) {
                return callback(new Error('请再次输入密码！'))
            }
            if (value !== registerForm.value.password) {
                return callback(new Error('两次输入的密码不相同！'))
            }
            callback()
        }
  
        const rules = {
            username: [
                { required: true, message: '请输入用户名！', trigger: 'blur' },
            ],
            password: [
                { required: true, message: '请输入密码！', trigger: 'blur' },
            ],
            checkPass: [
                { required: true, validator: checkPass, trigger: 'blur' },
            ],
            inviteCode: [
                { required: true, validator: validateInviteCode, trigger: 'blur' },
            ],
        }
  
        // 这里用来拿表单实例
        const registerFormRef = ref()

        // 提交：先 validate，再发送 registerForm（包含 inviteCode）
        const onSubmit = () => {
            // 触发表单校验
            registerFormRef.value.validate((valid: boolean) => {
                if (!valid) {
                    return
                }
                // 构造提交体：邀请 code 以不含 '-' 的 16 位字符串提交（或按后端要求格式化）
                const payload = {
                    username: registerForm.value.username,
                    password: registerForm.value.password,
                    inviteCode: registerForm.value.inviteCode, // 16 位大写字母+数字
                }
                axios.post('/auth/register', payload)
                .then(() => {
                    ElMessage.success('注册成功')
                    setTimeout(() => {
                        window.location.href = '/login'
                    }, 2000)
                })
                .catch(err => {
                    const msgs = err.response?.data?.message || {}
                    Object.entries(msgs).forEach(([field, msg]) => {
                        ElMessage.error(msg as string)
                        if (registerFormRef.value) {
                            registerFormRef.value.validateField(field as any)
                        }
                    })
                })
            })
        }

        // expose
        return {
            registerForm,
            rules,
            showPassword,
            showConfirm,
            onSubmit,
            registerFormRef,
            inviteChars,
            setInputRef,
            onCharInput,
            onCharKeydown,
            onPasteInvite,
            onCharFocus,
        }
    },
})
</script>  

<style scoped lang="scss">
.el-form {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    max-width: 720px;
    padding-bottom: 120px;
    gap: 10px;

    .register-title {
        margin: 20px auto;
    }
    .register-button-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;

        .register-button {
            min-width: 100px;
            max-width: 200px;
        }
    }
}

#box {
    display: flex;
    align-items: center;
}
.fixed-input {
    /* 固定宽度，根据你的布局调整 */
    width: 330px;
    /* 超出内容水平滚动 */
    white-space: nowrap;
    overflow-x: auto;
    /* 隐藏原生滚动条：Chrome/Safari */
}
.fixed-input::-webkit-scrollbar {
    display: none;
}
/* 隐藏滚动条：Firefox */
.fixed-input {
    scrollbar-width: none;
}
/* 隐藏滚动条：IE10+ */
.fixed-input {
    -ms-overflow-style: none;
}
/* 给眼睛图标加点间距和手势 */
.eye-icon {
    cursor: pointer;
    margin-left: 8px;
    vertical-align: middle;
}

/* ====== 邀请码输入样式 ====== */
.invite-inputs {
  display: flex;
  flex-wrap: nowrap;
  gap: 5px;
  align-items: center;
  outline: none;
  /* 鼠标悬停时能提示可粘贴 */
  cursor: text;
}

.char-wrapper {
  display: inline-flex;
  position: relative;
}

/* 每个位的输入框样式 —— 去除默认边框，仅显示下划线 */
.char-input {
    width: 14px;
    height: 20px;
    text-align: center;
    font-family: monospace;
    font-size: 14px;
    // border: none;
    border: 1px solid #cfd8e3; /* 下划线 */
    background: transparent;
    outline: none;
    box-sizing: border-box;
    color: #333;
    font-weight: 600;
}

/* 聚焦时下划线颜色更明显 */
.char-input:focus {
  border-color: #409EFF;
}

.char-wrapper.group-gap {
    margin-right: 5px;
    position: relative;
}

.char-wrapper.group-gap-right {
    margin-left: 6px;
}

/* 在每组结尾（即在第 3,7,11 位后）显示一个横杠（用伪元素在 group-gap 的右侧） */
/* 在父元素宽度之外显示横杠，并向右偏移 gap */
.char-wrapper.group-gap::after {
  content: "-";
  position: absolute;
  left: 100%;                     /* 紧贴父元素右侧 */
  top: 45%;
  transform: translate(5px, -50%); /* 向右偏移 gap，并垂直居中 */
  color: #333;
  font-weight: 600;
  font-size: 14px;
  pointer-events: none;
}

/* 小提示文字 */
.invite-note {
  margin-top: 6px;
  font-size: 12px;
  color: #888;
}
</style>
