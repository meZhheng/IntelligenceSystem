// main.ts 修改后
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/style.css'
import Echarts from 'vue-echarts'
import * as echarts from "echarts"
import 'default-passive-events'
import zhCN from "element-plus/dist/locale/zh-cn.mjs" //引入中文
import NoCopy from '@/directives/no-copy';
 
const app = createApp(App);

app.use(router);
app.use(ElementPlus, {locale: zhCN});

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.component("v-chart", Echarts)
app.config.globalProperties.$echarts = echarts

app.directive('no-copy', NoCopy);
app.mount('#app');