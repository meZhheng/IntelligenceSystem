import { ref, onBeforeUnmount, onMounted, watch, nextTick, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from '@/api/axios';
import * as echarts from 'echarts';
import blogViewer from './weibo_blog.vue';
import { getTodayDate } from '@/utils/date';
import CrawlerProgress from './CrawlerProgress.vue';
import InteractionViewer from './InteractionViewer.vue';
import OnlineDetect from './OnlineDetect.vue';
const showCrawlerProgress = ref(false);
const showWblogsConfig = ref(false);
const wbolgsConfig = ref({
    max_blog_pages: 5,
    like_per_blog: 20,
    forwrd_per_blog: 20,
    comment_per_blog: 20
});
// 全部数据
const threatUserList = ref([]);
// 当前显示的窗口起始索引
const container = ref(null);
// rAF 控制
let rafId = null;
let lastTime = 0;
// 滚动速度：px per ms
const speed = 0.025; // 0.025px 每毫秒，即 25px/s
// 可见列表切片
const fullLoopList = ref([]);
// 拉取排行榜
async function fetchTopThreats() {
    const res = await axios.post('/weibo/users/top-threats', { page: 1, per_page: 100 }, {
        timeout: 100000
    });
    threatUserList.value = res.data.items;
    fullLoopList.value = [...threatUserList.value, ...threatUserList.value];
    await nextTick();
    if (container.value)
        container.value.scrollTop = 0;
    startAutoScroll();
    // 绑定 hover 暂停/继续
    if (container.value) {
        container.value.addEventListener('mouseenter', stopAutoScroll);
        container.value.addEventListener('mouseleave', () => {
            // 只有在抽屉关闭时才恢复自动滚动
            if (!showSidebar.value) {
                startAutoScroll();
            }
        });
        container.value.addEventListener('scroll', onScrollLoop);
    }
}
function toUserSpace(user) {
    stopAutoScroll();
    handleNodeClickAsync({
        data: {
            id: user.id,
            name: user.username
        }
    });
}
// 无缝回环逻辑
function onScrollLoop() {
    if (!container.value)
        return;
    const el = container.value;
    const half = el.scrollHeight / 2;
    if (el.scrollTop >= half) {
        el.scrollTop -= half;
    }
    else if (el.scrollTop <= 0) {
        el.scrollTop += half;
    }
}
// rAF 步进函数
function step(timestamp) {
    if (!container.value)
        return;
    if (lastTime) {
        const delta = timestamp - lastTime;
        container.value.scrollTop += speed * delta;
    }
    lastTime = timestamp;
    onScrollLoop(); // 保证无缝回环
    rafId = requestAnimationFrame(step);
}
function startAutoScroll() {
    if (rafId !== null)
        return;
    lastTime = 0;
    rafId = requestAnimationFrame(step);
}
function stopAutoScroll() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}
// 关闭时恢复到最新生效值（可选） 
function onConfigClose() {
    // 如果想重置到上次生效的值，可以在这里处理
}
// 应用配置：把 config 同步到 pager、或保存到后端/本地
function applyWblogsConfig() {
}
function closeWblogsCrawler() {
    showCrawlerProgress.value = false;
}
const selectedSeed = ref(null);
const userFound = ref(null);
const logs = ref([]);
const weiboPosts = ref({
    items: [],
    _meta: {
        page: null,
        per_page: null,
        total_items: null,
        total_pages: null
    }
});
const relationChart = ref(null);
const rawNodes = ref([]);
const nodes = ref([]);
const links = ref([]);
const categories = ref([]);
function formatDateTime(dt) {
    const d = new Date(dt);
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
// 分页状态
const pager = ref({ page: 1, per_page: 10 });
const chartHeader = ref(null);
// 改变页码
function onPageChange(page) {
    pager.value.page = page;
    fetchBlogs();
}
// 改变每页大小
function onSizeChange(size) {
    pager.value.per_page = size;
    pager.value.page = 1;
    fetchBlogs();
}
async function handleCommitCrawl(valid_user) {
    try {
        await ElMessageBox.confirm(`是否开始挖掘用户 ${valid_user.username} 的信息？`, '确认操作', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'success',
        });
        // 用户确认后，调用爬取接口或导航到爬取流程
        // 例如：
        startCrawl(valid_user.id);
    }
    catch {
        // 取消
    }
}
async function goToInternal(valid_user) {
    await ElMessageBox.confirm(`是否跳转到种子用户 ${valid_user.username} 的页面？`, '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success',
    });
    // 导航到系统内部该用户页面，比如 /seeds/:uid
    selectSeed(valid_user);
}
async function goToWeiboProfile(valid_user) {
    await ElMessageBox.confirm(`是否跳转到微博用户 ${valid_user.username} 个人主页？确认后前往外部连接 ${valid_user.profile_url}`, '警告：正在前往外部连接', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    });
    // 导航到系统内部该用户页面，比如 /seeds/:uid
    window.open(valid_user.profile_url, '_blank');
}
async function queryUser() {
    if (!query_user)
        return ElMessage.warning("请输入查询内容");
    loading.value = true;
    try {
        const { data } = await axios.post(`/crawling/query_user`, {
            q: query_user.value,
            cookie: config.value.cookie
        }, {
            timeout: 100000
        });
        userFound.value = data;
    }
    catch (err) {
        ElMessage.error("查询失败");
    }
    finally {
        loading.value = false;
    }
}
async function fetchBlogs(scrollToTop = true) {
    if (!selectedSeed.value)
        return;
    loading.value = true;
    try {
        const { data } = await axios.get(`/search/wblogs/${selectedSeed.value.id}`, { params: { page: pager.value.page, per_page: pager.value.per_page }, timeout: 100000 });
        weiboPosts.value = data;
        if (scrollToTop) {
            await nextTick();
            chartHeader.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    finally {
        loading.value = false;
    }
}
async function crawlingBlogs() {
    if (!selectedSeed.value)
        return;
    loading.value = true;
    // 1. 创建 AbortController
    const controller = new AbortController();
    const { signal } = controller;
    // 2. 先设一个全局超时，超时后 abort() 整个 fetch
    const globalTimeout = setTimeout(() => {
        controller.abort();
    }, 5 * 60 * 1000); // 5 分钟
    try {
        const token = localStorage.getItem('user-token');
        const url = `/api/crawling/blogs/${selectedSeed.value.id}`;
        const response = await fetch(url, {
            method: 'POST',
            signal, // ← 传入 signal
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ config: config.value }),
        });
        if (!response.ok)
            throw new Error(`请求失败：${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        // 3. 然后再对「流中断」设局部超时
        let streamTimeout = null;
        const resetStreamTimeout = () => {
            if (streamTimeout)
                clearTimeout(streamTimeout);
            streamTimeout = setTimeout(() => {
                controller.abort(); // 中断整个请求
                ElMessage.error('网络连接超时');
                setTimeout(() => window.location.reload(), 2000);
            }, 5 * 60 * 1000);
        };
        resetStreamTimeout();
        // 4. 读取流
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            resetStreamTimeout();
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\n/);
            buffer = lines.pop();
            for (const line of lines) {
                const text = line.trim();
                if (!text)
                    continue;
                try {
                    console.log('[爬取日志]', JSON.parse(text));
                }
                catch {
                    console.log('[爬取日志]', text);
                }
            }
        }
        if (buffer.trim())
            console.log('[爬取日志]', buffer.trim());
        console.log('✅ 爬取微博完毕');
        fetchBlogs();
        fetchUserInfo(selectedSeed.value.id);
    }
    catch (err) {
        if (err.name === 'AbortError') {
            console.error('❌ 请求已超时并被中断');
        }
        else {
            console.error('❌ 爬取微博出错:', err);
        }
    }
    finally {
        clearTimeout(globalTimeout);
        loading.value = false;
    }
}
// 五种关系类型
const TYPES = ['following', 'fan', 'like', 'retweet', 'comment'];
async function fetchAndRender(refresh = false) {
    const el = document.getElementById('relationChart');
    relationChart.value = echarts.init(el);
    relationChart.value.on('click', handleNodeClickSync);
    loading.value = true;
    nodes.value = [];
    links.value = [];
    categories.value = [];
    renderWithCurrentSize();
    relationChart.value.showLoading();
    const { data } = await axios.get(`/crawling/relations/${selectedSeed.value.id}`, {
        params: {
            k: 3,
            refresh: refresh
        },
        timeout: 600000
    });
    relationChart.value.hideLoading();
    loading.value = false;
    rawNodes.value = data.nodes;
    links.value = data.links;
    categories.value = data.node_categories;
    renderWithCurrentSize();
    // 绑定 legend 过滤逻辑
    relationChart.value.off('legendselectchanged');
    relationChart.value.on('legendselectchanged', (params) => {
        // 1. 哪几种边被选中
        const selectedEdgeTypes = Object.entries(params.selected)
            .filter(([type, checked]) => checked && TYPES.includes(type))
            .map(([type]) => type);
        // 2. 先给每一种 edge-series 重新设置 links
        const updatedEdgeSeries = TYPES.map(t => ({
            name: t,
            // 如果这个类型被选中，就保留对应 links，否则清空
            links: selectedEdgeTypes.includes(t)
                ? links.value.filter(l => l.type === t)
                : []
        }));
        // 3. 计算哪些节点还有连线
        const aliveNodeIds = new Set();
        updatedEdgeSeries.forEach(es => {
            es.links.forEach(l => {
                aliveNodeIds.add(l.source);
                aliveNodeIds.add(l.target);
            });
        });
        // 永远保留根节点
        aliveNodeIds.add(selectedSeed.value.id);
        // 4. 重新计算要渲染的节点数组（带 x,y）
        const W = relationChart.value.getDom().clientWidth;
        const H = relationChart.value.getDom().clientHeight;
        const filteredNodes = rawNodes.value
            .filter(n => aliveNodeIds.has(n.id))
            .map(n => ({
            ...n,
            x: n.x_norm * W,
            y: n.y_norm * H
        }));
        // 5. 一次性下发所有更新：nodeSeries + edge-series
        relationChart.value.setOption({
            series: [
                {
                    name: 'nodes',
                    data: filteredNodes
                },
                // 把 updatedEdgeSeries 里的 links 覆盖到原来的那五个 series
                ...updatedEdgeSeries.map(es => ({
                    name: es.name,
                    // 只更新 links，就能触发边的增删，不会影响它们的坐标或颜色
                    data: filteredNodes,
                    links: es.links
                }))
            ]
        });
    });
}
// 定义一个映射表
const TYPE_LABELS = {
    following: '关注',
    fan: '粉丝',
    like: '点赞',
    retweet: '转发',
    comment: '评论'
};
// 根据当前 container 大小，给 nodes 计算 x,y
function renderWithCurrentSize() {
    if (!relationChart.value)
        return;
    const container = relationChart.value.getDom();
    const W = container.clientWidth;
    const H = container.clientHeight;
    nodes.value = rawNodes.value.map(n => ({
        ...n,
        x: n.x_norm * W,
        y: n.y_norm * H
    }));
    const nodeSeries = {
        name: 'nodes',
        type: 'graph',
        layout: 'none',
        data: nodes.value,
        links: [],
        categories: categories.value,
        label: { show: true, position: 'right', formatter: '{b}' },
        lineStyle: { opacity: 0 },
        z: 10 // 保证节点在最上层
    };
    // 2) 五个 edge-series：每个只渲染一种 type
    const edgeSeries = TYPES.map(t => {
        const lineColor = t === 'following' ? '#4caf50' :
            t === 'fan' ? '#2196f3' :
                t === 'like' ? '#ff9800' :
                    t === 'retweet' ? '#9c27b0' :
                        t === 'comment' ? '#f44336' : '#ccc';
        return {
            name: t, // ← 用中文名,
            type: 'graph',
            layout: 'none',
            data: nodes.value,
            links: links.value.filter(l => l.type === t),
            // ① 把颜色放到 series.color 上
            color: lineColor,
            lineStyle: {
                color: lineColor, // ② 继续在 lineStyle 里用
                curveness: 0.3
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: { width: 4 }
            },
            label: { show: false },
            z: 5
        };
    });
    const option = {
        title: {
            text: '图例用户交互关系',
            subtext: '', // ← 在这里写说明
            top: 'bottom',
            left: 'right',
            textStyle: { fontSize: 12, color: '#888' }
        },
        tooltip: {
            show: true,
            // params.data 指的是节点的数据对象
            formatter: params => {
                // 节点
                if (params.dataType === 'node') {
                    return `
                    <strong>${params.data.name}</strong><br/>
                    影响力：${params.data.value}
                    `;
                }
                // 定制 link 的悬浮
                if (params.dataType === 'edge') {
                    return `
                    <strong>关系：${params.data.type}</strong><br/>
                    从：${params.data.source}<br/>
                    到：${params.data.target}
                    `;
                }
                return '';
            }
        },
        legend: [{
                data: TYPES, // ['following','fan', …]
                formatter: name => TYPE_LABELS[name] || name,
                // selected: {
                //     following: true,
                //     fan: true,
                //     like: true,
                //     retweet: true,
                //     comment: true
                // },
                top: 'top',
                left: 'right'
            }],
        series: [
            nodeSeries,
            ...edgeSeries
        ],
        animationDuration: 1500,
    };
    relationChart.value.setOption(option);
}
// 监听窗口 resize，重新渲染坐标
function onResize() {
    if (relationChart.value) {
        relationChart.value.resize();
        renderWithCurrentSize();
    }
}
watch(logs, () => {
    scrollToBottom();
}, { deep: true });
watch(() => selectedSeed, async (user) => {
    weiboPosts.value.items = [];
    if (user.value && user.value.id) {
        await nextTick();
        fetchAndRender();
        fetchBlogs(false);
    }
}, { deep: true });
const userInfo = ref({
    id: '',
    username: '',
    gender: '',
    location: '',
    birthday: '',
    description: '',
    verified_reason: '',
    education: '',
    work: '',
    weibo_num: 0,
    following: 0,
    followers: 0,
    last_crawled: '',
    last_crawled_wblogs: '',
});
const activateUserInfo = ref({
    id: '',
    username: '',
    gender: '',
    location: '',
    birthday: '',
    description: '',
    verified_reason: '',
    education: '',
    work: '',
    weibo_num: 0,
    following: 0,
    followers: 0
});
const userInfoExists = ref(false);
const seedSearch = ref('');
const query_user = ref('');
const showConfig = ref(false);
const view = ref('home');
watch(view, async (newView, oldView) => {
    // 如果切换到了首页
    if (newView === 'home') {
        fetchTopThreats();
    }
    // 如果离开了首页
    if (oldView === 'home' && newView !== 'home') {
        stopAutoScroll();
        if (container.value) {
            container.value.removeEventListener('mouseenter', stopAutoScroll);
            container.value.removeEventListener('mouseleave', startAutoScroll);
            container.value.removeEventListener('scroll', onScrollLoop);
        }
    }
}, { immediate: true });
const config = ref({
    since_date: '2024-01-01',
    end_date: 'now',
    cookie: ''
});
const seed_list = ref([]);
const searchSeeds = async (keyword = null) => {
    try {
        const params = {
            q: keyword,
            page: 1,
            pageSize: 100
        };
        const res = await axios.get('/crawling/search', { params, timeout: 10000 }); // 假设后端支持搜索参数
        seed_list.value = res.data.items;
    }
    catch (error) {
        console.error('种子账号搜索失败', error);
    }
};
function createSeed() {
    view.value = 'create';
    selectedSeed.value = null;
    if (showSidebar)
        showSidebar.value = false;
}
function goHome() {
    view.value = 'home';
    selectedSeed.value = null;
}
function goDetect() {
    view.value = 'online-detect';
    selectedSeed.value = null;
}
const formatFans = (num) => {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
};
const scrollContainer = ref(null);
function selectSeed(seed) {
    if (loading.value)
        return;
    if (!seed)
        return;
    if (showSidebar)
        showSidebar.value = false;
    selectedSeed.value = seed;
    view.value = 'detail';
    // 清空旧日志和用户信息
    logs.value = [];
    fetchUserInfo(seed.id).then(async () => {
        // 等待 DOM 更新
        await nextTick();
        if (scrollContainer.value) {
            scrollContainer.value.scrollTop = 0;
        }
    });
}
function applyConfig() {
    showConfig.value = false;
    localStorage.setItem('crawl-config', JSON.stringify(config.value));
    loadConfig();
    ElMessage.success('配置已更新');
}
const loading = ref(false);
async function startCrawl(user_id) {
    logs.value = [];
    loading.value = true;
    try {
        const token = localStorage.getItem('user-token');
        const response = await fetch('/api/crawling', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ uid: user_id, config: config.value }),
        });
        // 预检查：如果后端直接返回 JSON 且 exists=true
        const ct = response.headers.get('Content-Type') || '';
        if (ct.includes('application/json')) {
            const data = await response.json();
            if (data.exists) {
                ElMessage.info(`用户 ${data.user.username} 已存在，无需重复爬取`);
                await new Promise(r => setTimeout(r, 1000));
                // 直接选中已有 seed
                selectSeed({ id: data.user.id, username: data.user.username });
                loading.value = false;
                return;
            }
        }
        if (!response.ok) {
            throw new Error('请求失败 ' + response.status);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        // 流式读取
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value, { stream: true });
            for (let line of chunk.split('\n')) {
                if (!line.trim())
                    continue;
                if (line.startsWith('ERROR:')) {
                    const errObj = JSON.parse(line.slice(6));
                    logs.value.push(`❌ 爬虫中断：${errObj.message}`);
                    ElMessage.error(errObj.message);
                    await reader.cancel();
                    loading.value = false;
                    return;
                }
                logs.value.push(line);
            }
        }
        // 完成
        logs.value.push('✅ 爬取完成');
        loading.value = false;
        // 清空搜索输入，刷新 seed 列表
        seedSearch.value = '';
        await searchSeeds(seedSearch.value);
        // **关键：用传入的 user_id 去匹配**
        const crawledSeed = seed_list.value.find(s => s.id === user_id);
        if (crawledSeed) {
            selectSeed(crawledSeed);
        }
        else {
            // 万一没取到，也可以提示或 fallback
            console.warn('未在列表中找到新爬取的 seed', user_id);
        }
    }
    catch (err) {
        console.error(err);
        logs.value.push('❌ 爬取出错：' + err.message);
        loading.value = false;
        await searchSeeds(seedSearch.value);
    }
}
async function fetchUserInfo(uid) {
    // 模拟请求
    const response = await axios.get(`/crawling/search/${uid}`, { timeout: 10000 });
    userInfo.value = response.data;
}
function loadConfig() {
    const configStr = localStorage.getItem('crawl-config');
    if (configStr) {
        config.value = JSON.parse(configStr);
    }
    // 无论本地是否有存储，都将 end_date 更新为今天
    config.value.end_date = getTodayDate();
}
// 引用日志容器
const logContainer = ref(null);
// 自动滚动到底部
const scrollToBottom = () => {
    nextTick(() => {
        if (logContainer.value) {
            logContainer.value.scrollTop = logContainer.value.scrollHeight;
        }
    });
};
// 新增：点击后要展示的侧边栏控制
const showSidebar = ref(false);
const activeNode = ref(null);
watch(showSidebar, (visible) => {
    if (!visible) {
        // 抽屉关闭后，如果还是在 home 视图，重新启动自动滚动
        if (view.value === 'home') {
            startAutoScroll();
        }
    }
});
function handleNodeClickSync(params) {
    if (params.dataType === 'node') {
        handleNodeClickAsync(params);
    }
}
async function handleNodeClickAsync(params) {
    activeNode.value = params.data;
    showSidebar.value = true;
    try {
        const res = await axios.get(`/crawling/search/${params.data.id}`, { timeout: 10000 });
        activateUserInfo.value = res.data;
        userInfoExists.value = true;
    }
    catch (err) {
        if (err.response && err.response.status === 404) {
            userInfoExists.value = false;
        }
        else {
            ElMessage.error('获取用户信息失败');
            showSidebar.value = false;
        }
    }
}
async function copyUserName(username) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // 主流现代浏览器、HTTPS 环境下
            await navigator.clipboard.writeText(username);
        }
        else {
            // 兼容老浏览器/非安全上下文的回退方案
            const textarea = document.createElement('textarea');
            textarea.value = username;
            // 把它放到屏幕外
            textarea.style.position = 'fixed';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        ElMessage.success('UID 已复制，可以去“新增种子账号”粘贴使用');
    }
    catch (err) {
        console.error('复制失败：', err);
        ElMessage.error('复制失败，请手动复制');
    }
    await nextTick();
    createSeed();
}
onMounted(() => {
    nextTick(() => {
        loadConfig();
        searchSeeds();
        window.addEventListener('resize', onResize);
    });
});
onBeforeUnmount(() => {
    if (relationChart.value)
        relationChart.value.off('click', handleNodeClickSync);
    window.removeEventListener('resize', onResize);
});
const filteredThreatUsers = computed(() => (threatUserList?.value || []).filter(u => u.threat_index > 0));
function exportThreatUsers() {
    const data = filteredThreatUsers.value;
    if (!data || data.length === 0) {
        ElMessage.warning('当前没有风险用户（threat_index > 0）可导出。');
        return;
    }
    // 保留全部字段（如需只导出部分字段，在这里做 map）
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-'); // 形如 2025-09-06T05-30-00
    const filename = `threat-users-${timestamp}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ElMessage.success(`已导出 ${data.length} 条风险用户，文件名：${filename}`);
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['user-info-preview-card', 'section-title', 'user-info', 'advanced', 'section-title', 'relation-chart', 'section-title', 'el-icon', 'blog-viewer', 'chart-header', 'section-title', 'refresh-btn', 'last-refresh', 'el-button', 'el-icon', 'value', 'label', 'detail-item', 'user-info-card', 'missing', 'header', 'el-icon', 'el-button', 'user-card', 'username', 'username',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("crawler-dashboard") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: ("sidebar") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("sidebar-header") },
});
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ("Plus"),
    disabled: ((__VLS_ctx.loading)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: ("primary"),
    icon: ("Plus"),
    disabled: ((__VLS_ctx.loading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.createSeed)
};
let __VLS_3;
let __VLS_4;
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("sidebar-search") },
});
const __VLS_8 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onInput': {} },
    modelValue: ((__VLS_ctx.seedSearch)),
    placeholder: ("搜索种子账号昵称或UID"),
    clearable: (true),
    prefixIcon: ("Search"),
    disabled: ((__VLS_ctx.loading)),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onInput': {} },
    modelValue: ((__VLS_ctx.seedSearch)),
    placeholder: ("搜索种子账号昵称或UID"),
    clearable: (true),
    prefixIcon: ("Search"),
    disabled: ((__VLS_ctx.loading)),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_14;
const __VLS_15 = {
    onInput: (__VLS_ctx.searchSeeds)
};
let __VLS_11;
let __VLS_12;
var __VLS_13;
__VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
    ...{ class: ("seed-list") },
});
for (const [seed, idx] of __VLS_getVForSourceType((__VLS_ctx.seed_list))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectSeed(seed);
            } },
        key: ((seed.id)),
        ...{ class: (({ active: seed.id == __VLS_ctx.selectedSeed?.id, disabled: __VLS_ctx.loading })) },
    });
    (seed.username);
    (seed.id);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.goDetect) },
    ...{ class: ("sidebar-footer") },
    ...{ style: ({}) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.goHome) },
    ...{ class: ("sidebar-footer") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: ("main") },
});
if (__VLS_ctx.view === 'create') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("config-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("section-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("config-form") },
    });
    const __VLS_16 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onKeyup': {} },
        modelValue: ((__VLS_ctx.query_user)),
        placeholder: ("搜索种子账号"),
        ...{ class: ("uid-input") },
        disabled: ((__VLS_ctx.loading)),
        clearable: (true),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onKeyup': {} },
        modelValue: ((__VLS_ctx.query_user)),
        placeholder: ("搜索种子账号"),
        ...{ class: ("uid-input") },
        disabled: ((__VLS_ctx.loading)),
        clearable: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_22;
    const __VLS_23 = {
        onKeyup: (__VLS_ctx.queryUser)
    };
    let __VLS_19;
    let __VLS_20;
    var __VLS_21;
    const __VLS_24 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((__VLS_ctx.loading)),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        type: ("primary"),
        disabled: ((__VLS_ctx.loading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.queryUser)
    };
    let __VLS_27;
    let __VLS_28;
    __VLS_29.slots.default;
    var __VLS_29;
    const __VLS_32 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        icon: ("Setting"),
        disabled: ((__VLS_ctx.loading)),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        icon: ("Setting"),
        disabled: ((__VLS_ctx.loading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_38;
    const __VLS_39 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.view === 'create')))
                return;
            __VLS_ctx.showConfig = true;
        }
    };
    let __VLS_35;
    let __VLS_36;
    __VLS_37.slots.default;
    var __VLS_37;
    if (__VLS_ctx.userFound && __VLS_ctx.userFound.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("user-info-preview") },
        });
        for (const [valid_user, key] of __VLS_getVForSourceType((__VLS_ctx.userFound))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.view === 'create')))
                            return;
                        if (!((__VLS_ctx.userFound && __VLS_ctx.userFound.length > 0)))
                            return;
                        valid_user.exists ? __VLS_ctx.goToInternal(valid_user) : __VLS_ctx.handleCommitCrawl(valid_user);
                    } },
                key: ((key)),
                ...{ class: ("user-info-preview-card") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("header-row") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("username") },
            });
            (valid_user.username);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("status") },
                ...{ class: (({ exists: valid_user.exists, missing: !valid_user.exists })) },
            });
            (valid_user.exists ? '已在库中' : '尚未入库');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.view === 'create')))
                            return;
                        if (!((__VLS_ctx.userFound && __VLS_ctx.userFound.length > 0)))
                            return;
                        __VLS_ctx.goToWeiboProfile(valid_user);
                    } },
                ...{ onClick: () => { } },
                ...{ class: ("profile-link") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("description") },
            });
            (valid_user.description);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("followers_count") },
            });
            (valid_user.followers_count);
        }
    }
    else if (Array.isArray(__VLS_ctx.userFound) && __VLS_ctx.userFound.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("no-results") },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("no-search") },
        });
    }
    const __VLS_40 = {}.ElDialog;
    /** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        title: ("挖掘参数配置"),
        modelValue: ((__VLS_ctx.showConfig)),
    }));
    const __VLS_42 = __VLS_41({
        title: ("挖掘参数配置"),
        modelValue: ((__VLS_ctx.showConfig)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    const __VLS_46 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
        ...{ class: ("alert-info") },
        type: ("info"),
        showIcon: (true),
        closable: ((false)),
        ...{ style: ({}) },
    }));
    const __VLS_48 = __VLS_47({
        ...{ class: ("alert-info") },
        type: ("info"),
        showIcon: (true),
        closable: ((false)),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: ("https://weibo.cn/"),
        target: ("_blank"),
        ...{ style: ({}) },
    });
    __VLS_51.slots.default;
    var __VLS_51;
    const __VLS_52 = {}.ElForm;
    /** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        model: ((__VLS_ctx.config)),
        labelWidth: ("80px"),
    }));
    const __VLS_54 = __VLS_53({
        model: ((__VLS_ctx.config)),
        labelWidth: ("80px"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    const __VLS_58 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        label: ("起始日期"),
    }));
    const __VLS_60 = __VLS_59({
        label: ("起始日期"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    const __VLS_64 = {}.ElDatePicker;
    /** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        modelValue: ((__VLS_ctx.config.since_date)),
        type: ("date"),
        placeholder: ("选择日期"),
        valueFormat: ("YYYY-MM-DD"),
    }));
    const __VLS_66 = __VLS_65({
        modelValue: ((__VLS_ctx.config.since_date)),
        type: ("date"),
        placeholder: ("选择日期"),
        valueFormat: ("YYYY-MM-DD"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_63.slots.default;
    var __VLS_63;
    const __VLS_70 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
        label: ("结束日期"),
    }));
    const __VLS_72 = __VLS_71({
        label: ("结束日期"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_71));
    const __VLS_76 = {}.ElDatePicker;
    /** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        modelValue: ((__VLS_ctx.config.end_date)),
        type: ("date"),
        placeholder: ("选择日期 或 now"),
        valueFormat: ("YYYY-MM-DD"),
    }));
    const __VLS_78 = __VLS_77({
        modelValue: ((__VLS_ctx.config.end_date)),
        type: ("date"),
        placeholder: ("选择日期 或 now"),
        valueFormat: ("YYYY-MM-DD"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_75.slots.default;
    var __VLS_75;
    const __VLS_82 = {}.ElFormItem;
    /** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
        label: ("Cookie"),
    }));
    const __VLS_84 = __VLS_83({
        label: ("Cookie"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    const __VLS_88 = {}.ElInput;
    /** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        modelValue: ((__VLS_ctx.config.cookie)),
        type: ("textarea"),
        autosize: (({ minRows: 3, maxRows: 8 })),
        placeholder: ("输入 Cookie"),
        resize: ("none"),
    }));
    const __VLS_90 = __VLS_89({
        modelValue: ((__VLS_ctx.config.cookie)),
        type: ("textarea"),
        autosize: (({ minRows: 3, maxRows: 8 })),
        placeholder: ("输入 Cookie"),
        resize: ("none"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_87.slots.default;
    var __VLS_87;
    __VLS_57.slots.default;
    var __VLS_57;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        slot: ("footer"),
        ...{ class: ("dialog-footer") },
    });
    const __VLS_94 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
        ...{ 'onClick': {} },
    }));
    const __VLS_96 = __VLS_95({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_95));
    let __VLS_100;
    const __VLS_101 = {
        onClick: (...[$event]) => {
            if (!((__VLS_ctx.view === 'create')))
                return;
            __VLS_ctx.showConfig = false;
        }
    };
    let __VLS_97;
    let __VLS_98;
    __VLS_99.slots.default;
    var __VLS_99;
    const __VLS_102 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_104 = __VLS_103({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    let __VLS_108;
    const __VLS_109 = {
        onClick: (__VLS_ctx.applyConfig)
    };
    let __VLS_105;
    let __VLS_106;
    __VLS_107.slots.default;
    var __VLS_107;
    __VLS_45.slots.default;
    var __VLS_45;
}
if (__VLS_ctx.view === 'create') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-log") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("section-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ref: ("logContainer"),
    });
    // @ts-ignore navigation for `const logContainer = ref()`
    /** @type { typeof __VLS_ctx.logContainer } */ ;
    for (const [msg, idx] of __VLS_getVForSourceType((__VLS_ctx.logs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: ((idx)),
        });
        (msg);
    }
}
if (__VLS_ctx.view === 'detail') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-panel") },
        ref: ("scrollContainer"),
    });
    // @ts-ignore navigation for `const scrollContainer = ref()`
    /** @type { typeof __VLS_ctx.scrollContainer } */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-info advanced") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("section-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-card") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile-header") },
    });
    const __VLS_110 = {}.ElAvatar;
    /** @type { [typeof __VLS_components.ElAvatar, typeof __VLS_components.elAvatar, ] } */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
        ...{ class: ("user-avatar") },
        size: ("large"),
        icon: ("User"),
    }));
    const __VLS_112 = __VLS_111({
        ...{ class: ("user-avatar") },
        size: ("large"),
        icon: ("User"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("user-basic") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("nickname") },
    });
    (__VLS_ctx.userInfo.username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("id") },
    });
    (__VLS_ctx.userInfo.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile-stats") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.userInfo.weibo_num);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.userInfo.following);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
        ...{ class: (({ 'large-number': __VLS_ctx.userInfo.followers >= 10000 })) },
    });
    (__VLS_ctx.formatFans(__VLS_ctx.userInfo.followers));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("profile-details") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item description-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.userInfo.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.userInfo.birthday);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.userInfo.verified_reason);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.userInfo.education);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.userInfo.work);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.userInfo.location);
    if (__VLS_ctx.view === 'detail') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("relation-chart") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("chart-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("section-title") },
        });
        const __VLS_116 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            size: ((24)),
        }));
        const __VLS_118 = __VLS_117({
            size: ((24)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        const __VLS_122 = {}.FullScreen;
        /** @type { [typeof __VLS_components.FullScreen, ] } */ ;
        // @ts-ignore
        const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({}));
        const __VLS_124 = __VLS_123({}, ...__VLS_functionalComponentArgsRest(__VLS_123));
        __VLS_121.slots.default;
        var __VLS_121;
        if (__VLS_ctx.userInfo.last_crawled) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("last-refresh") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatDateTime(__VLS_ctx.userInfo.last_crawled));
        }
        const __VLS_128 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
            ...{ 'onClick': {} },
            circle: (true),
            loading: ((__VLS_ctx.loading)),
            title: ("重新计算并更新关系图"),
            ...{ class: ("refresh-btn") },
        }));
        const __VLS_130 = __VLS_129({
            ...{ 'onClick': {} },
            circle: (true),
            loading: ((__VLS_ctx.loading)),
            title: ("重新计算并更新关系图"),
            ...{ class: ("refresh-btn") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        let __VLS_134;
        const __VLS_135 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.view === 'detail')))
                    return;
                if (!((__VLS_ctx.view === 'detail')))
                    return;
                __VLS_ctx.fetchAndRender(true);
            }
        };
        let __VLS_131;
        let __VLS_132;
        {
            const { icon: __VLS_thisSlot } = __VLS_133.slots;
            const __VLS_136 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
                size: ((18)),
            }));
            const __VLS_138 = __VLS_137({
                size: ((18)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_137));
            const __VLS_142 = {}.Refresh;
            /** @type { [typeof __VLS_components.Refresh, ] } */ ;
            // @ts-ignore
            const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({}));
            const __VLS_144 = __VLS_143({}, ...__VLS_functionalComponentArgsRest(__VLS_143));
            __VLS_141.slots.default;
            var __VLS_141;
        }
        __VLS_133.slots.default;
        var __VLS_133;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            id: ("relationChart"),
        });
    }
    if (__VLS_ctx.view === 'detail') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("blog-viewer") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ref: ("chartHeader"),
            ...{ class: ("chart-header disable-select") },
        });
        // @ts-ignore navigation for `const chartHeader = ref()`
        /** @type { typeof __VLS_ctx.chartHeader } */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("section-title") },
        });
        const __VLS_148 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            ...{ 'onClick': {} },
            circle: (true),
            ...{ class: ("config-btn") },
            title: ("微博爬取配置"),
            ...{ style: ({}) },
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onClick': {} },
            circle: (true),
            ...{ class: ("config-btn") },
            title: ("微博爬取配置"),
            ...{ style: ({}) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_154;
        const __VLS_155 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.view === 'detail')))
                    return;
                if (!((__VLS_ctx.view === 'detail')))
                    return;
                __VLS_ctx.showWblogsConfig = true;
            }
        };
        let __VLS_151;
        let __VLS_152;
        {
            const { icon: __VLS_thisSlot } = __VLS_153.slots;
            const __VLS_156 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
                size: ((24)),
            }));
            const __VLS_158 = __VLS_157({
                size: ((24)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_157));
            const __VLS_162 = {}.Setting;
            /** @type { [typeof __VLS_components.Setting, ] } */ ;
            // @ts-ignore
            const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({}));
            const __VLS_164 = __VLS_163({}, ...__VLS_functionalComponentArgsRest(__VLS_163));
            __VLS_161.slots.default;
            var __VLS_161;
        }
        __VLS_153.slots.default;
        var __VLS_153;
        if (__VLS_ctx.userInfo.last_crawled_wblogs) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("last-refresh") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatDateTime(__VLS_ctx.userInfo.last_crawled_wblogs));
        }
        const __VLS_168 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
            ...{ 'onClick': {} },
            circle: (true),
            loading: ((__VLS_ctx.loading)),
            title: ("获取用户最新博客"),
            ...{ class: ("refresh-btn") },
        }));
        const __VLS_170 = __VLS_169({
            ...{ 'onClick': {} },
            circle: (true),
            loading: ((__VLS_ctx.loading)),
            title: ("获取用户最新博客"),
            ...{ class: ("refresh-btn") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        let __VLS_174;
        const __VLS_175 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.view === 'detail')))
                    return;
                if (!((__VLS_ctx.view === 'detail')))
                    return;
                __VLS_ctx.showCrawlerProgress = true;
            }
        };
        let __VLS_171;
        let __VLS_172;
        {
            const { icon: __VLS_thisSlot } = __VLS_173.slots;
            const __VLS_176 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
                size: ((18)),
            }));
            const __VLS_178 = __VLS_177({
                size: ((18)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_177));
            const __VLS_182 = {}.Refresh;
            /** @type { [typeof __VLS_components.Refresh, ] } */ ;
            // @ts-ignore
            const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({}));
            const __VLS_184 = __VLS_183({}, ...__VLS_functionalComponentArgsRest(__VLS_183));
            __VLS_181.slots.default;
            var __VLS_181;
        }
        __VLS_173.slots.default;
        var __VLS_173;
        // @ts-ignore
        /** @type { [typeof blogViewer, typeof blogViewer, ] } */ ;
        // @ts-ignore
        const __VLS_188 = __VLS_asFunctionalComponent(blogViewer, new blogViewer({
            ...{ 'onRefresh': {} },
            posts: ((__VLS_ctx.weiboPosts.items)),
            handleNodeClickAsync: ((__VLS_ctx.handleNodeClickAsync)),
            fetchBlogs: ((__VLS_ctx.fetchBlogs)),
        }));
        const __VLS_189 = __VLS_188({
            ...{ 'onRefresh': {} },
            posts: ((__VLS_ctx.weiboPosts.items)),
            handleNodeClickAsync: ((__VLS_ctx.handleNodeClickAsync)),
            fetchBlogs: ((__VLS_ctx.fetchBlogs)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_188));
        let __VLS_193;
        const __VLS_194 = {
            onRefresh: (__VLS_ctx.crawlingBlogs)
        };
        let __VLS_190;
        let __VLS_191;
        var __VLS_192;
        if (__VLS_ctx.weiboPosts._meta.total_pages > 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("pagination-wrap") },
            });
            const __VLS_195 = {}.ElPagination;
            /** @type { [typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ] } */ ;
            // @ts-ignore
            const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
                ...{ 'onSizeChange': {} },
                ...{ 'onCurrentChange': {} },
                currentPage: ((__VLS_ctx.pager.page)),
                pageSize: ((__VLS_ctx.pager.per_page)),
                pageSizes: (([10, 20, 50])),
                layout: ("total, sizes, prev, pager, next, jumper"),
                total: ((__VLS_ctx.weiboPosts._meta.total_items)),
            }));
            const __VLS_197 = __VLS_196({
                ...{ 'onSizeChange': {} },
                ...{ 'onCurrentChange': {} },
                currentPage: ((__VLS_ctx.pager.page)),
                pageSize: ((__VLS_ctx.pager.per_page)),
                pageSizes: (([10, 20, 50])),
                layout: ("total, sizes, prev, pager, next, jumper"),
                total: ((__VLS_ctx.weiboPosts._meta.total_items)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_196));
            let __VLS_201;
            const __VLS_202 = {
                onSizeChange: (__VLS_ctx.onSizeChange)
            };
            const __VLS_203 = {
                onCurrentChange: (__VLS_ctx.onPageChange)
            };
            let __VLS_198;
            let __VLS_199;
            var __VLS_200;
        }
    }
    if (__VLS_ctx.view === 'detail') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("interaction-viewer") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("interaction-viewer-header disable-select") },
        });
        // @ts-ignore
        /** @type { [typeof InteractionViewer, typeof InteractionViewer, ] } */ ;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent(InteractionViewer, new InteractionViewer({
            selectedSeed: ((__VLS_ctx.selectedSeed)),
            handleNodeClickAsync: ((__VLS_ctx.handleNodeClickAsync)),
        }));
        const __VLS_205 = __VLS_204({
            selectedSeed: ((__VLS_ctx.selectedSeed)),
            handleNodeClickAsync: ((__VLS_ctx.handleNodeClickAsync)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_204));
    }
}
if (__VLS_ctx.view === 'home') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("home-leaderboard") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("title-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("title") },
    });
    const __VLS_209 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
        ...{ 'onClick': {} },
        size: ("large"),
        type: ("primary"),
    }));
    const __VLS_211 = __VLS_210({
        ...{ 'onClick': {} },
        size: ("large"),
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_210));
    let __VLS_215;
    const __VLS_216 = {
        onClick: (__VLS_ctx.exportThreatUsers)
    };
    let __VLS_212;
    let __VLS_213;
    const __VLS_217 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({}));
    const __VLS_219 = __VLS_218({}, ...__VLS_functionalComponentArgsRest(__VLS_218));
    const __VLS_223 = {}.Download;
    /** @type { [typeof __VLS_components.Download, ] } */ ;
    // @ts-ignore
    const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({}));
    const __VLS_225 = __VLS_224({}, ...__VLS_functionalComponentArgsRest(__VLS_224));
    __VLS_222.slots.default;
    var __VLS_222;
    __VLS_214.slots.default;
    var __VLS_214;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("leaderboard-container") },
        ref: ("container"),
    });
    // @ts-ignore navigation for `const container = ref()`
    /** @type { typeof __VLS_ctx.container } */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("scroll-content") },
    });
    for (const [user, idx] of __VLS_getVForSourceType((__VLS_ctx.fullLoopList))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((`usr-${idx}-${user.id}`)),
            ...{ class: ((['user-card', { 'user-card--safe': user.threat_index === 0 }])) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("rank") },
        });
        ((idx % __VLS_ctx.threatUserList.length) + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.view === 'home')))
                        return;
                    __VLS_ctx.toUserSpace(user);
                } },
            ...{ class: ("username") },
        });
        (user.username);
        if (user.threat_index > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("meta") },
            });
            const __VLS_229 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
                size: ((16)),
                ...{ class: ("threat") },
            }));
            const __VLS_231 = __VLS_230({
                size: ((16)),
                ...{ class: ("threat") },
            }, ...__VLS_functionalComponentArgsRest(__VLS_230));
            const __VLS_235 = {}.Warning;
            /** @type { [typeof __VLS_components.Warning, ] } */ ;
            // @ts-ignore
            const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({}));
            const __VLS_237 = __VLS_236({}, ...__VLS_functionalComponentArgsRest(__VLS_236));
            __VLS_234.slots.default;
            var __VLS_234;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("threat") },
            });
            (user.threat_index);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("meta meta--safe") },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
    }
}
if (__VLS_ctx.view === 'online-detect') {
    // @ts-ignore
    /** @type { [typeof OnlineDetect, typeof OnlineDetect, ] } */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(OnlineDetect, new OnlineDetect({}));
    const __VLS_242 = __VLS_241({}, ...__VLS_functionalComponentArgsRest(__VLS_241));
}
const __VLS_246 = {}.ElDrawer;
/** @type { [typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ] } */ ;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
    modelValue: ((__VLS_ctx.showSidebar)),
    direction: ("rtl"),
    size: ("20%"),
    withHeader: ((false)),
    ...{ class: ("node-sidebar") },
    destroyOnClose: ((true)),
}));
const __VLS_248 = __VLS_247({
    modelValue: ((__VLS_ctx.showSidebar)),
    direction: ("rtl"),
    size: ("20%"),
    withHeader: ((false)),
    ...{ class: ("node-sidebar") },
    destroyOnClose: ((true)),
}, ...__VLS_functionalComponentArgsRest(__VLS_247));
{
    const { default: __VLS_thisSlot } = __VLS_251.slots;
    if (__VLS_ctx.userInfoExists) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("user-info-card") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("header") },
        });
        const __VLS_252 = {}.ElAvatar;
        /** @type { [typeof __VLS_components.ElAvatar, typeof __VLS_components.elAvatar, ] } */ ;
        // @ts-ignore
        const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
            size: ("large"),
            icon: ("User"),
        }));
        const __VLS_254 = __VLS_253({
            size: ("large"),
            icon: ("User"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_253));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("basic") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.activateUserInfo.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("uid") },
        });
        (__VLS_ctx.activateUserInfo.id);
        const __VLS_258 = {}.ElDivider;
        /** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
        // @ts-ignore
        const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({}));
        const __VLS_260 = __VLS_259({}, ...__VLS_functionalComponentArgsRest(__VLS_259));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stats") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("value") },
        });
        (__VLS_ctx.activateUserInfo.weibo_num);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("value") },
        });
        (__VLS_ctx.activateUserInfo.following);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("value") },
            ...{ class: (({ 'highlight': __VLS_ctx.activateUserInfo.followers > 10000 })) },
        });
        (__VLS_ctx.formatFans(__VLS_ctx.activateUserInfo.followers));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label") },
        });
        const __VLS_264 = {}.ElDivider;
        /** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
        // @ts-ignore
        const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({}));
        const __VLS_266 = __VLS_265({}, ...__VLS_functionalComponentArgsRest(__VLS_265));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("details") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.gender);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.location);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.birthday);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.verified_reason);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.education);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.work);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("detail-item full") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activateUserInfo.description);
        const __VLS_270 = {}.ElDivider;
        /** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
        // @ts-ignore
        const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({}));
        const __VLS_272 = __VLS_271({}, ...__VLS_functionalComponentArgsRest(__VLS_271));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("actions") },
        });
        const __VLS_276 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
            ...{ 'onClick': {} },
            type: ("primary"),
            icon: ("UserFilled"),
        }));
        const __VLS_278 = __VLS_277({
            ...{ 'onClick': {} },
            type: ("primary"),
            icon: ("UserFilled"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_277));
        let __VLS_282;
        const __VLS_283 = {
            onClick: (...[$event]) => {
                if (!((__VLS_ctx.userInfoExists)))
                    return;
                __VLS_ctx.selectSeed(__VLS_ctx.activateUserInfo);
            }
        };
        let __VLS_279;
        let __VLS_280;
        __VLS_281.slots.default;
        var __VLS_281;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("user-info-card missing") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("header") },
        });
        const __VLS_284 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({}));
        const __VLS_286 = __VLS_285({}, ...__VLS_functionalComponentArgsRest(__VLS_285));
        const __VLS_290 = {}.WarningFilled;
        /** @type { [typeof __VLS_components.WarningFilled, ] } */ ;
        // @ts-ignore
        const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({}));
        const __VLS_292 = __VLS_291({}, ...__VLS_functionalComponentArgsRest(__VLS_291));
        __VLS_289.slots.default;
        var __VLS_289;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("basic") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.activeNode.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("uid") },
        });
        (__VLS_ctx.activeNode.id);
        const __VLS_296 = {}.ElDivider;
        /** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
        // @ts-ignore
        const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({}));
        const __VLS_298 = __VLS_297({}, ...__VLS_functionalComponentArgsRest(__VLS_297));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        const __VLS_302 = {}.ElButton;
        /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
        // @ts-ignore
        const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
            ...{ 'onClick': {} },
            type: ("primary"),
            icon: ("CopyDocument"),
        }));
        const __VLS_304 = __VLS_303({
            ...{ 'onClick': {} },
            type: ("primary"),
            icon: ("CopyDocument"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_303));
        let __VLS_308;
        const __VLS_309 = {
            onClick: (...[$event]) => {
                if (!(!((__VLS_ctx.userInfoExists))))
                    return;
                __VLS_ctx.copyUserName(__VLS_ctx.activeNode.name);
            }
        };
        let __VLS_305;
        let __VLS_306;
        __VLS_307.slots.default;
        var __VLS_307;
    }
}
__VLS_251.slots.default;
var __VLS_251;
const __VLS_310 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_311 = __VLS_asFunctionalComponent(__VLS_310, new __VLS_310({
    ...{ 'onClose': {} },
    title: ("用户博客爬取配置"),
    modelValue: ((__VLS_ctx.showWblogsConfig)),
    width: ("520px"),
}));
const __VLS_312 = __VLS_311({
    ...{ 'onClose': {} },
    title: ("用户博客爬取配置"),
    modelValue: ((__VLS_ctx.showWblogsConfig)),
    width: ("520px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_311));
let __VLS_316;
const __VLS_317 = {
    onClose: (__VLS_ctx.onConfigClose)
};
let __VLS_313;
let __VLS_314;
const __VLS_318 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_319 = __VLS_asFunctionalComponent(__VLS_318, new __VLS_318({
    model: ((__VLS_ctx.config)),
    labelWidth: ("240px"),
}));
const __VLS_320 = __VLS_319({
    model: ((__VLS_ctx.config)),
    labelWidth: ("240px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_319));
const __VLS_324 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    label: ("最大爬取博客页数"),
}));
const __VLS_326 = __VLS_325({
    label: ("最大爬取博客页数"),
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
const __VLS_330 = {}.ElInputNumber;
/** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
// @ts-ignore
const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
    modelValue: ((__VLS_ctx.wbolgsConfig.max_blog_pages)),
    min: ((1)),
    max: ((50)),
}));
const __VLS_332 = __VLS_331({
    modelValue: ((__VLS_ctx.wbolgsConfig.max_blog_pages)),
    min: ((1)),
    max: ((50)),
}, ...__VLS_functionalComponentArgsRest(__VLS_331));
__VLS_329.slots.default;
var __VLS_329;
const __VLS_336 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    label: ("爬取的点赞关系数(页/博客)"),
}));
const __VLS_338 = __VLS_337({
    label: ("爬取的点赞关系数(页/博客)"),
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
const __VLS_342 = {}.ElInputNumber;
/** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
// @ts-ignore
const __VLS_343 = __VLS_asFunctionalComponent(__VLS_342, new __VLS_342({
    modelValue: ((__VLS_ctx.wbolgsConfig.like_per_blog)),
    min: ((1)),
    max: ((20)),
}));
const __VLS_344 = __VLS_343({
    modelValue: ((__VLS_ctx.wbolgsConfig.like_per_blog)),
    min: ((1)),
    max: ((20)),
}, ...__VLS_functionalComponentArgsRest(__VLS_343));
__VLS_341.slots.default;
var __VLS_341;
const __VLS_348 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
    label: ("爬取的转发关系数(页/博客)"),
}));
const __VLS_350 = __VLS_349({
    label: ("爬取的转发关系数(页/博客)"),
}, ...__VLS_functionalComponentArgsRest(__VLS_349));
const __VLS_354 = {}.ElInputNumber;
/** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
// @ts-ignore
const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({
    modelValue: ((__VLS_ctx.wbolgsConfig.forwrd_per_blog)),
    min: ((1)),
    max: ((20)),
}));
const __VLS_356 = __VLS_355({
    modelValue: ((__VLS_ctx.wbolgsConfig.forwrd_per_blog)),
    min: ((1)),
    max: ((20)),
}, ...__VLS_functionalComponentArgsRest(__VLS_355));
__VLS_353.slots.default;
var __VLS_353;
const __VLS_360 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
    label: ("爬取的评论关系数(页/博客)"),
}));
const __VLS_362 = __VLS_361({
    label: ("爬取的评论关系数(页/博客)"),
}, ...__VLS_functionalComponentArgsRest(__VLS_361));
const __VLS_366 = {}.ElInputNumber;
/** @type { [typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ] } */ ;
// @ts-ignore
const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
    modelValue: ((__VLS_ctx.wbolgsConfig.comment_per_blog)),
    min: ((1)),
    max: ((20)),
}));
const __VLS_368 = __VLS_367({
    modelValue: ((__VLS_ctx.wbolgsConfig.comment_per_blog)),
    min: ((1)),
    max: ((20)),
}, ...__VLS_functionalComponentArgsRest(__VLS_367));
__VLS_365.slots.default;
var __VLS_365;
__VLS_323.slots.default;
var __VLS_323;
{
    const { footer: __VLS_thisSlot } = __VLS_315.slots;
    const __VLS_372 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        ...{ 'onClick': {} },
    }));
    const __VLS_374 = __VLS_373({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    let __VLS_378;
    const __VLS_379 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showWblogsConfig = false;
        }
    };
    let __VLS_375;
    let __VLS_376;
    __VLS_377.slots.default;
    var __VLS_377;
    const __VLS_380 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
        ...{ 'onClick': {} },
        type: ("primary"),
    }));
    const __VLS_382 = __VLS_381({
        ...{ 'onClick': {} },
        type: ("primary"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_381));
    let __VLS_386;
    const __VLS_387 = {
        onClick: (__VLS_ctx.applyWblogsConfig)
    };
    let __VLS_383;
    let __VLS_384;
    __VLS_385.slots.default;
    var __VLS_385;
}
__VLS_315.slots.default;
var __VLS_315;
if (__VLS_ctx.showCrawlerProgress) {
    // @ts-ignore
    /** @type { [typeof CrawlerProgress, typeof CrawlerProgress, ] } */ ;
    // @ts-ignore
    const __VLS_388 = __VLS_asFunctionalComponent(CrawlerProgress, new CrawlerProgress({
        userId: ((__VLS_ctx.selectedSeed.id)),
        crawlingConfig: ((__VLS_ctx.wbolgsConfig)),
        config: ((__VLS_ctx.config)),
        closeWblogsCrawler: ((__VLS_ctx.closeWblogsCrawler)),
        fetchBlogs: ((__VLS_ctx.fetchBlogs)),
    }));
    const __VLS_389 = __VLS_388({
        userId: ((__VLS_ctx.selectedSeed.id)),
        crawlingConfig: ((__VLS_ctx.wbolgsConfig)),
        config: ((__VLS_ctx.config)),
        closeWblogsCrawler: ((__VLS_ctx.closeWblogsCrawler)),
        fetchBlogs: ((__VLS_ctx.fetchBlogs)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_388));
}
['crawler-dashboard', 'sidebar', 'sidebar-header', 'sidebar-search', 'seed-list', 'active', 'disabled', 'sidebar-footer', 'sidebar-footer', 'main', 'config-panel', 'section-title', 'config-form', 'uid-input', 'user-info-preview', 'user-info-preview-card', 'header-row', 'username', 'status', 'exists', 'missing', 'profile-link', 'description', 'followers_count', 'no-results', 'no-search', 'alert-info', 'dialog-footer', 'progress-log', 'section-title', 'result-panel', 'user-info', 'advanced', 'section-title', 'user-card', 'profile-header', 'user-avatar', 'user-basic', 'nickname', 'id', 'profile-stats', 'stat-item', 'stat-value', 'stat-label', 'stat-item', 'stat-value', 'stat-label', 'stat-item', 'stat-value', 'large-number', 'stat-label', 'profile-details', 'detail-item', 'description-item', 'label', 'value', 'detail-item', 'label', 'value', 'detail-item', 'label', 'value', 'detail-item', 'label', 'value', 'detail-item', 'label', 'value', 'detail-item', 'label', 'value', 'relation-chart', 'chart-header', 'section-title', 'last-refresh', 'refresh-btn', 'blog-viewer', 'chart-header', 'disable-select', 'section-title', 'config-btn', 'last-refresh', 'refresh-btn', 'pagination-wrap', 'interaction-viewer', 'interaction-viewer-header', 'disable-select', 'home-leaderboard', 'title-row', 'title', 'leaderboard-container', 'scroll-content', 'user-card', 'user-card--safe', 'rank', 'info', 'username', 'meta', 'threat', 'threat', 'meta', 'meta--safe', 'node-sidebar', 'user-info-card', 'header', 'basic', 'uid', 'stats', 'stat', 'value', 'label', 'stat', 'value', 'label', 'stat', 'value', 'highlight', 'label', 'details', 'detail-item', 'detail-item', 'detail-item', 'detail-item', 'detail-item', 'detail-item', 'detail-item', 'full', 'actions', 'user-info-card', 'missing', 'header', 'basic', 'uid',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            blogViewer: blogViewer,
            CrawlerProgress: CrawlerProgress,
            InteractionViewer: InteractionViewer,
            OnlineDetect: OnlineDetect,
            showCrawlerProgress: showCrawlerProgress,
            showWblogsConfig: showWblogsConfig,
            wbolgsConfig: wbolgsConfig,
            threatUserList: threatUserList,
            container: container,
            fullLoopList: fullLoopList,
            toUserSpace: toUserSpace,
            onConfigClose: onConfigClose,
            applyWblogsConfig: applyWblogsConfig,
            closeWblogsCrawler: closeWblogsCrawler,
            selectedSeed: selectedSeed,
            userFound: userFound,
            logs: logs,
            weiboPosts: weiboPosts,
            formatDateTime: formatDateTime,
            pager: pager,
            chartHeader: chartHeader,
            onPageChange: onPageChange,
            onSizeChange: onSizeChange,
            handleCommitCrawl: handleCommitCrawl,
            goToInternal: goToInternal,
            goToWeiboProfile: goToWeiboProfile,
            queryUser: queryUser,
            fetchBlogs: fetchBlogs,
            crawlingBlogs: crawlingBlogs,
            fetchAndRender: fetchAndRender,
            userInfo: userInfo,
            activateUserInfo: activateUserInfo,
            userInfoExists: userInfoExists,
            seedSearch: seedSearch,
            query_user: query_user,
            showConfig: showConfig,
            view: view,
            config: config,
            seed_list: seed_list,
            searchSeeds: searchSeeds,
            createSeed: createSeed,
            goHome: goHome,
            goDetect: goDetect,
            formatFans: formatFans,
            scrollContainer: scrollContainer,
            selectSeed: selectSeed,
            applyConfig: applyConfig,
            loading: loading,
            logContainer: logContainer,
            showSidebar: showSidebar,
            activeNode: activeNode,
            handleNodeClickAsync: handleNodeClickAsync,
            copyUserName: copyUserName,
            exportThreatUsers: exportThreatUsers,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
});
; /* PartiallyEnd: #4569/main.vue */
