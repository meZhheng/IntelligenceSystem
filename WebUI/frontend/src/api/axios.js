import axios from 'axios';
import store from '@/store'; // ← direct import!
import router from '@/router'; // ← 导入你的 vue-router 实例
import { ElMessage } from 'element-plus';
const api = axios.create({
    baseURL: '/api',
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' }
});
// 请求拦截器：自动在请求头添加 Token
api.interceptors.request.use((config) => {
    const token = window.localStorage.getItem('user-token'); // 从 localStorage 获取 token
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`; // 设置 Authorization 头
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// 响应拦截器：遇到 401，先做页面判断，再决定是否登出并跳转
api.interceptors.response.use(response => response, error => {
    const status = error?.response?.status;
    if (status === 401) {
        // 拿到当前要跳转的路由 path（router.currentRoute 是一个 Ref）
        const currentPath = router.currentRoute.value.path;
        // 如果不在 /login 和 /register 页面，就执行登出+跳转
        if (currentPath !== '/login' && currentPath !== '/register') {
            store.logoutAction();
            ElMessage.success('身份信息已过期，请重新登录');
            // 推荐用编程式路由跳转，而不是 location.reload
            router.replace({ name: 'Login' });
        }
    }
    return Promise.reject(error);
});
export default api;
