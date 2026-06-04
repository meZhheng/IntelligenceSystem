<template>
    <div id="box">
        <el-form :model="loginForm" :rules="rules" label-width="auto">
            <h1 class="login-title">登录</h1>
             <!-- 用户名 -->
            <el-form-item label="用户名" prop="username">
                <div class="form-item-row">
                    <el-input
                        type="text"
                        v-model="loginForm.username"
                        placeholder="请输入用户名"
                        maxlength="15"
                        class="fixed-input"
                        @input="onUsernameInput"
                    >
                        <template #suffix>
                            <span style="font-size: 12px; color: #999;">
                            {{ loginForm.username.length }}/15
                            </span>
                        </template>
                    </el-input>
                    <div class="input-hint">
                    </div>
                </div>
            </el-form-item>

            <!-- 密码 -->
            <el-form-item label="密码" prop="password">
                <div class="form-item-row">
                    <div class="from-item-input">
                        <el-input
                            :type="showPassword ? 'text' : 'password'"
                            v-model="loginForm.password"
                            placeholder="请输入密码"
                            maxlength="30"
                            class="fixed-input"
                            v-no-copy
                            @input="onPasswordInput"
                        >
                            <template #suffix>
                                <span style="font-size: 12px; color: #999;">
                                {{ loginForm.password.length }}/30
                                </span>
                            </template>
                        </el-input>
                        <el-icon @click="showPassword = !showPassword" class="eye-icon">
                            <el-icon v-if="showPassword"><View /></el-icon>
                            <el-icon v-else><Hide /></el-icon>
                        </el-icon>
                    </div>
                    <div class="input-hint">
                    </div>
                </div>
            </el-form-item>
            <div class="login-button-container">
                <el-button type="primary" @click="onLogin" class="login-button">登录</el-button>
                <span>还没有账号? <router-link to="/register">去注册!</router-link></span>
                <!-- <span>
                    忘记密码？
                    <a href="#">重置密码</a>
                </span> -->
            </div>
        </el-form>
    </div>
</template>
  
<script lang="ts">
    import axios from '@/api/axios'
    import { useStore } from '@/store';
  
    export default {
        name: 'Login',  //this is the name of the component

        data () {
            

            return {
                allowedRegex: /[^\u4E00-\u9FFFA-Za-z0-9_!@#$%^&*]/g,
                aloowedPasswordRegex: /[^A-Za-z0-9_!@#$%^&*]/g,
                loginForm: {
                    username: '',
                    password: '',
                    errors: 0,  // 表单是否在前端验证通过，0 表示没有错误，验证通过
                    usernameError: null,
                    passwordError: null,
                },
                rules: {
                    username: [
                        { required: true, message: '请输入用户名', trigger: 'blur' },
                        {
                            pattern: this.allowedRegex,
                            message: '用户名只能包含常用中文字符、数字、字母和 _!@#$%^&*',
                            trigger: 'blur',
                        },
                    ],

                    password: [
                        { required: true, message: '请输入密码', trigger: 'blur' },
                        {
                            pattern: this.aloowedPasswordRegex,
                            message: '密码只能包含数字、字母和 _!@#$%^&*',
                            trigger: 'blur',
                        },
                    ],
                },

                store: useStore(),
                // 控制明／暗文
                showPassword: false,
            }
        },
        methods: {
            // 实时过滤不合法字符
            onUsernameInput(val: string) {
            // 把所有不在白名单里的字符替换为空
                this.loginForm.username = val.replace(this.allowedRegex, '')
            },
            onPasswordInput(val: string) {
                this.loginForm.password = val.replace(/[^A-Za-z0-9_!@#$%^&*]/g, '')
            },
            onLogin () {
                // 1. 统一校验：只要 username 或 password 有任何一个为空，就提示并 return
                if (!this.loginForm.username || !this.loginForm.password) {
                    this.$message.error('请输入账号或者密码')
                    return
                }

                // 2. 如果都不为空，就清除之前的错误信息（可选）
                this.loginForm.usernameError = null
                this.loginForm.passwordError = null

                // Helper: 对 Unicode 安全的 Base64 编码（把 UTF-8 -> base64）
                function base64EncodeUnicode(str) {
                    // encodeURIComponent -> 把 UTF-8 转为 %xx 序列，
                    // 然后把 %xx 替换成对应的字符，最后 btoa 编码成 base64
                    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                        (match, p1) => {
                            return String.fromCharCode(parseInt(p1, 16)); // ✅ Correct usage
                        }
                    ));
                }

                // 3. 发起登录请求（手动设置 Authorization，避免使用 axios 的 auth：{}）
                const path = '/auth/tokens';
                const credentials = `${this.loginForm.username}:${this.loginForm.password}`;
                const basicToken = base64EncodeUnicode(credentials);

                axios.post(path, {}, {
                    headers: {
                        Authorization: `Basic ${basicToken}`
                    }
                })
                .then((response) => {
                    // handle success
                    this.store.loginAction(response.data);

                    this.$message.success('登录成功');

                    setTimeout(() => {
                    if (this.$route.query.redirect == undefined) {
                        this.$router.push('/');
                    } else {
                        this.$router
                        .push(this.$route.query.redirect)
                        .then(() => {
                            // 跳转完成后刷新整页
                            window.location.reload();
                        });
                    }
                    }, 500);
                })
                .catch((error) => {
                    // handle error
                    if (error.response && error.response.data.status == 402) {
                        this.$message.error(error.response.data.message);
                    } else {
                        this.$message.error('服务器出错');
                        console.log(error);
                    }
                });
            }
        }
    }
</script>

<style scoped lang="scss">
.el-form {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    max-width: 720px;
    padding-bottom: 120px;
    gap: 10px;

    .login-title {
        margin: 20px auto;
    }
    .login-button-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;

        .register-login {
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
    width: 240px;
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
.input-hint {
    font-size: 12px;
    color: #ff0000;
    margin-top: 4px;
}
.form-item-row {
    display: flex;
    flex-direction: column;
}
.from-item-input {
    display: flex;
    flex-direction: row;
    align-items: center;
}
</style>