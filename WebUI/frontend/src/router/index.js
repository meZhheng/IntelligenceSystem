import { createRouter, createWebHistory } from "vue-router";
import model_detail from "../views/models/detail.vue";
import Login from "@/views/auth/Login.vue";
import Register from "@/views/auth/Register.vue";
import Task from "@/views/tasks/index.vue";
// 图表实现
import Charts from "@/views/charts/index.vue";
// 大屏实现
import LargeScreen from "@/views/large_screen/index.vue";
import { ElMessage } from "element-plus";
import store from "@/store";
const routes = [
    {
        path: "/",
        redirect: "/application/analysis/10",
    },
    {
        path: "/home",
        name: "Home",
        component: LargeScreen,
    },
    {
        path: "/login",
        name: "Login",
        component: Login,
        meta: { hideNavbar: true },
    },
    {
        path: "/register",
        name: "Register",
        component: Register,
        meta: { hideNavbar: true },
    },
    {
        path: "/tasks",
        name: "Tasks",
        component: Task,
    },
    {
        path: "/admin/scheduler/jobs",
        name: "SchedulerJobs",
        component: () => import("@/views/scheduler/jobs.vue"),
    },
    {
        path: "/charts",
        name: "Charts",
        component: Charts,
    },
    {
        path: "/large_screen",
        name: "LargeScreen",
        component: LargeScreen,
        meta: { hideNavbar: true },
    },
    {
        path: "/application/modelSpace",
        name: "ModelSpace",
        component: () => import("@/views/models/modelSpace.vue"),
    },
    {
        path: "/wechatPA/proofread",
        name: "WechatPA_proofread",
        component: () => import("@/views/wechat/PublicAccount.vue"),
    },
    {
        path: "/wechatPA/history",
        name: "WechatPA_history",
        component: () => import("@/views/wechat/history.vue"),
    },
    {
        path: "/wechatPA/autoDetect",
        name: "WechatPA_autoDetect",
        component: () => import("@/views/wechat/AutoDetect.vue"),
    },
    {
        path: "/wechatPA/history/:article_id",
        name: "WechatPA_history_content",
        component: () => import("@/views/wechat/content.vue"),
        props: true,
    },
    {
        path: "/wechatPA/analysis/:article_id",
        name: "WechatPA_analysis_content",
        component: () => import("@/views/wechat/article_analysis.vue"),
        props: true,
    },
    {
        path: "/wechatPA/wordDict",
        name: "WechatPA_wordDict",
        component: () => import("@/views/wechat/wordDict.vue"),
    },
    {
        path: "/operation/seedbase",
        name: "WeiboSpider",
        component: () => import("@/views/weiboSpider/index.vue"),
    },
    {
        path: "/operation/report",
        name: "WeiboReport",
        component: () => import("@/views/weiboSpider/Report.vue"),
    },
    {
        path: "/study",
        name: "Study",
        component: () => import("@/views/study/index.vue"),
    },
    {
        path: "/study/students",
        name: "StudentManagement",
        component: () => import("@/views/study/students.vue"),
    },
    {
        path: "/study/report",
        name: "Report",
        component: () => import("@/views/study/report.vue"),
    },
    {
        path: "/study/adversarial",
        name: "Adversarial",
        component: () => import("@/views/study/hvsm.vue"),
    },
    {
        path: "/application/datasetSpace/:path",
        name: "DatasetSpace",
        component: () => import("@/views/datasets/datasetSpace.vue"),
    },
    {
        path: "/models/:model_id",
        name: "ModelDetail",
        component: model_detail,
    },
    {
        path: "/datasets",
        name: "DatasetIndex",
        component: () => import("@/views/datasets/index.vue"),
    },
    {
        path: "/datasets/upload",
        name: "DatasetUpload",
        component: () => import("@/views/datasets/upload.vue"),
    },
    {
        path: "/datasets/:dataset_id",
        name: "DatasetDetail",
        component: () => import("@/views/datasets/detail.vue"),
    },
    {
        path: "/datasets/:dataset_id/single",
        name: "SingleData",
        component: () => import("@/views/datasets/singleData.vue"),
    },
    {
        path: "/application/InferenceIndex",
        name: "InferenceIndex",
        component: () => import("@/views/application/Inference/index.vue"),
    },
    {
        path: "/application/overview/:groupId",
        name: "ApplicationOverview",
        component: () => import("@/views/application/group/overview.vue"),
        meta: { keepAlive: true },
    },
    // {
    //   path: '/application/analysis/:groupId',
    //   name: 'ApplicationAnalysis',
    //   component: () => import('@/views/application/group/analysis.vue'),
    // },
    {
        path: "/application/analysis/10",
        name: "ApplicationAnalysis10",
        component: () => import("@/views/application/group/analysis_emotion.vue"),
    },
    {
        path: "/application/analysis/12",
        name: "ApplicationAnalysis12",
        component: () => import("@/views/application/group/analysis_stance.vue"),
    },
    {
        path: "/application/analysis/11",
        name: "ApplicationAnalysis11",
        component: () => import("@/views/application/group/analysis_illegal.vue"),
    },
    {
        path: "/application/analysis/13",
        name: "ApplicationAnalysis13",
        component: () => import("@/views/application/group/analysis_name.vue"),
    },
    // {
    //   path: '/application/analysis/:groupId={10}',
    //   name: 'ApplicationAnalysis',
    //   component: () => import('@/views/application/group/analysis.vue'),
    // },
    //   {
    //   path: '/application/analysis/12',
    //   name: 'ApplicationAnalysis',
    //   component: () => import('@/views/application/group/analysis.vue'),
    // },
    {
        path: "/test_model",
        name: "TestModel",
        component: () => import("@/views/evaluation/index.vue"),
    },
    {
        path: "/evaluations/:id",
        name: "EvaluationDetail",
        component: () => import("@/views/evaluation/detail.vue"),
        props: true,
    },
    {
        path: "/evaluations/offline",
        name: "OfflineDetect",
        component: () => import("@/views/evaluation/offlineDetect.vue"),
        meta: { keepAlive: true },
    },
    {
        path: "/evaluations/offline2",
        name: "OfflineDetect2",
        component: () => import("@/views/evaluation/offlineDetect2.vue"),
        meta: { keepAlive: true },
    },
    {
        path: "/rolling",
        name: "RollingView",
        component: () => import("@/views/rolling.vue"),
    },
];
const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        // 如果是浏览器前进/后退触发的导航，就返回 savedPosition
        if (savedPosition) {
            return savedPosition;
        }
        // 否则什么都不做（保持当前滚动位置）
        return false;
    },
});
// 定义不需要登录访问的页面列表
const publicPages = ["Home", "Login", "Register"];
const adminPages = [
    "StudentManagement",
    "DatasetIndex",
    "WechatPA_history",
    "WechatPA_autoDetect",
    "WechatPA_analysis_content",
    "SchedulerJobs",
];
router.beforeEach((to, from, next) => {
    // 1. 根据路径前缀控制侧边栏
    store.state.sidebarOpen = to.path.startsWith("/application");
    // 2. 鉴权逻辑
    const token = window.localStorage.getItem("user-token");
    const isAdmin = store.state.user_perms === "administrator" ||
        store.state.user_perms === "superadministrator";
    if (!publicPages.includes(String(to.name)) && (!token || token === null)) {
        // 需要登录但没有 token
        next({
            path: "/login",
            query: { redirect: to.fullPath },
        });
    }
    else if (token && to.name === "Login") {
        // 已登录访问登录页
        ElMessage.error("您已登录，请勿重复登录");
        next({
            path: from.fullPath,
        });
    }
    else if (adminPages.includes(String(to.name)) && !isAdmin) {
        // 访问管理员页面但不是管理员
        ElMessage.error("您无权限访问该页面");
        next({
            path: from.fullPath || "/", // 返回原页面，或者默认回首页
        });
    }
    else {
        if (!to.meta.fromPath && from.fullPath) {
            to.meta.fromPath = from.fullPath;
        }
        next();
    }
});
export default router;
