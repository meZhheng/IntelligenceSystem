<template>
  <div class="dashboard" v-loading="loading" element-loading-text="数据加载中...">
    <!-- 头部 -->
    <div class="header">
      <div class="title-container">
        <div class="title">
          <svg @click="toggleFullScreen" v-if="!isFullScreen" t="1756606642562" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10117" width="48" height="48"><path d="M149.333333 394.666667c17.066667 0 32-14.933333 32-32v-136.533334l187.733334 187.733334c6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333c12.8-12.8 12.8-32 0-44.8l-187.733333-187.733334H362.666667c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32H149.333333c-4.266667 0-8.533333 0-10.666666 2.133334-8.533333 4.266667-14.933333 10.666667-19.2 17.066666-2.133333 4.266667-2.133333 8.533333-2.133334 12.8v213.333334c0 17.066667 14.933333 32 32 32zM874.666667 629.333333c-17.066667 0-32 14.933333-32 32v136.533334L642.133333 597.333333c-12.8-12.8-32-12.8-44.8 0s-12.8 32 0 44.8l200.533334 200.533334H661.333333c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h213.333334c4.266667 0 8.533333 0 10.666666-2.133334 8.533333-4.266667 14.933333-8.533333 17.066667-17.066666 2.133333-4.266667 2.133333-8.533333 2.133333-10.666667V661.333333c2.133333-17.066667-12.8-32-29.866666-32zM381.866667 595.2l-200.533334 200.533333V661.333333c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v213.333334c0 4.266667 0 8.533333 2.133334 10.666666 4.266667 8.533333 8.533333 14.933333 17.066666 17.066667 4.266667 2.133333 8.533333 2.133333 10.666667 2.133333h213.333333c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32h-136.533333l200.533333-200.533333c12.8-12.8 12.8-32 0-44.8s-29.866667-10.666667-42.666666 0zM904.533333 138.666667c0-2.133333 0-2.133333 0 0-4.266667-8.533333-10.666667-14.933333-17.066666-17.066667-4.266667-2.133333-8.533333-2.133333-10.666667-2.133333H661.333333c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h136.533334l-187.733334 187.733333c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333l187.733333-187.733333V362.666667c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V149.333333c-2.133333-4.266667-2.133333-8.533333-4.266667-10.666666z" fill="#ffffff" p-id="10118"></path></svg>
          <svg @click="toggleFullScreen" v-else t="1756606560392" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="9811" width="48" height="48"><path d="M313.6 358.4H177.066667c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h213.333333c4.266667 0 8.533333 0 10.666667-2.133333 8.533333-4.266667 14.933333-8.533333 17.066666-17.066667 2.133333-4.266667 2.133333-8.533333 2.133334-10.666667v-213.333333c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v136.533333L172.8 125.866667c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l185.6 187.733333zM695.466667 650.666667H832c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32H618.666667c-4.266667 0-8.533333 0-10.666667 2.133333-8.533333 4.266667-14.933333 8.533333-17.066667 17.066667-2.133333 4.266667-2.133333 8.533333-2.133333 10.666666v213.333334c0 17.066667 14.933333 32 32 32s32-14.933333 32-32v-136.533334l200.533333 200.533334c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333c12.8-12.8 12.8-32 0-44.8l-204.8-198.4zM435.2 605.866667c-4.266667-8.533333-8.533333-14.933333-17.066667-17.066667-4.266667-2.133333-8.533333-2.133333-10.666666-2.133333H192c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h136.533333L128 851.2c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466666-8.533333l200.533334-200.533333V832c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V618.666667c-2.133333-4.266667-2.133333-8.533333-4.266667-12.8zM603.733333 403.2c4.266667 8.533333 8.533333 14.933333 17.066667 17.066667 4.266667 2.133333 8.533333 2.133333 10.666667 2.133333h213.333333c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32h-136.533333L896 170.666667c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0l-187.733333 187.733333V177.066667c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v213.333333c2.133333 4.266667 2.133333 8.533333 4.266666 12.8z" fill="#ffffff" p-id="9812"></path></svg>
          <span>舆情系统可视化平台</span>
        </div>
        <div class="extra_info">
          <div class="username">
            <span>{{ store.state.user_name }}</span>  欢迎您
          </div>
          <div class="time-now">{{ time_now }}</div>
          <div class="exit" @click="ExitLargeScreen">
            退出
            <svg t="1756464507448" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1489" width="32" height="32"><path d="M918.4 489.6l-160-160c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l105.6 105.6L512 480c-19.2 0-32 12.8-32 32s12.8 32 32 32l307.2 0-105.6 105.6c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 12.8 9.6 22.4 9.6 9.6 0 16-3.2 22.4-9.6l160-163.2c0 0 0-3.2 3.2-3.2C931.2 518.4 931.2 499.2 918.4 489.6z" p-id="1490" fill="#bae6fd"></path><path d="M832 736c-19.2 0-32 12.8-32 32l0 64c0 19.2-12.8 32-32 32L224 864c-19.2 0-32-12.8-32-32L192 192c0-19.2 12.8-32 32-32l544 0c19.2 0 32 12.8 32 32l0 64c0 19.2 12.8 32 32 32s32-12.8 32-32L864 192c0-54.4-41.6-96-96-96L224 96C169.6 96 128 137.6 128 192l0 640c0 54.4 41.6 96 96 96l544 0c54.4 0 96-41.6 96-96l0-64C864 748.8 851.2 736 832 736z" p-id="1491" fill="#bae6fd"></path></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 左侧列 -->
      <div class="left-column">
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>公众号监测</span></div>
          <WechatPaBoard
            :stats="PassWechatPaStatsData"
            :violationTypes="PassWechatPaCategoryData"
          ></WechatPaBoard>
        </div>
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>热点词云</span></div>
          <WordCloud 
            :keywords="KeywordsCloudData"
            height="500px"
            :rotation-range="[0, 0]"
            :min-size="48"
            :max-size="120"
            shape="circle"
          >
          </WordCloud>
        </div>
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>情感趋势</span></div>
          <SentimentLineChart :content="SentimentLineChartData"></SentimentLineChart>
        </div>
      </div>

      <!-- 中间列 -->
      <div class="center-column">
        <div class="chart-box main-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>舆情态势</span></div>
          <statsBoard 
            :total="StatsBoard.total" 
            :negative="StatsBoard.negative" 
            :positive="StatsBoard.positive" 
          ></statsBoard>
          <LocationDistribution
            :mapData="LocationDistributionMapData"
          >
          </LocationDistribution>
        </div>
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>风险舆情</span></div>
          <MilitaryBar :data="MilitaryIllegalBar"></MilitaryBar>
        </div>
      </div>

      <!-- 右侧列 -->
      <div class="right-column">
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>实时舆情</span></div>
          <RollingTextList :items="RollingIllegalInfoList"></RollingTextList>
        </div>
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>威胁账号</span></div>
          <RollingTextList :items="RollingIllegalAccountList"></RollingTextList>
        </div>
        <div class="chart-box">
          <div class="chart-bottom-glow"></div>
          <div class="chart-title"><span>立场趋势</span></div>
          <StanceLineChart :content="StanceLineChartData"></StanceLineChart>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import { useStore } from '@/store'
import { useRouter, useRoute } from 'vue-router'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import axios from '@/api/axios';
import { ElMessage, ElLoading } from 'element-plus'
import { getCurrentDateTime } from '@/utils/date'
import SentimentLineChart from './sentiment_trendline.vue'
import StanceLineChart from './stance_trendline.vue'
import RollingTextList from './rolling_text.vue'
import MilitaryBar from './military_bar.vue'
import WordCloud from './wordcloud_dict.vue'
import statsBoard from './stats-board.vue'
import LocationDistribution from './location_distribution.vue'
import WechatPaBoard from './wechat_pa.vue'

// --- 响应式数据（等同 data()） ---
const loading = ref(false)
const store = useStore()


const router = useRouter()
const route = useRoute()
function ExitLargeScreen() {
  router.push(route.query.redirect as string || '/').then(() => {
    // 跳转完成后刷新整页
    window.location.reload()
  })
}

const LineChartData = ref({
  sentiment: [],
  stance: [],
})

const RollingIllegalInfoData = ref([])
const RollingIllegalAccountData = ref([])

const MilitaryIllegalData = ref([])

const StatsBoard = ref({
  total: 0,
  negative: 0,
  positive: 0,
})

const WechatPaStatsData = ref({})
const WechatPaCategoryData = ref([])

const WordCloudData = ref([]);
const LocationDistributionData = ref({})

onMounted(() => {
  // 初始同步，避免初始 total 与正负不一致
  StatsBoard.value.total = (StatsBoard.value.negative || 0) + (StatsBoard.value.positive || 0);

  const tid = setInterval(() => {
    const incNeg = Math.floor(Math.random() * 5);             // 0..4
    const incPos = Math.floor(Math.random() * 10) + 3;        // 3..12

    StatsBoard.value.negative += incNeg;
    StatsBoard.value.positive += incPos;

    // 始终把 total 设为 正 + 负，防止漂移
    StatsBoard.value.total = StatsBoard.value.negative + StatsBoard.value.positive;
  }, 2000);

  // 可选：组件卸载时清理定时器
  onBeforeUnmount(() => clearInterval(tid));
});

const SentimentLineChartData = computed(()=>{
  return LineChartData.value.sentiment
}) 

const StanceLineChartData = computed(()=>{
  return LineChartData.value.stance
})

const RollingIllegalInfoList = computed(()=>{
  return RollingIllegalInfoData.value
})

const RollingIllegalAccountList = computed(()=>{
  return RollingIllegalAccountData.value
})

const MilitaryIllegalBar = computed(()=>{
  return MilitaryIllegalData.value
})

const KeywordsCloudData = computed(()=>{
  return WordCloudData.value
})

const LocationDistributionMapData = computed(()=>{
  return LocationDistributionData.value
})

const PassWechatPaStatsData = computed(() => {
  return WechatPaStatsData.value
})

const PassWechatPaCategoryData = computed(() => {
  const src = WechatPaCategoryData.value || [];
  return src.map(item => {
    if (!item || typeof item.type !== 'string') return item;
    // 按英文逗号或中文逗号分割，取第一个片段并去除首尾空白
    const newType = item.type.split(/[，,]/)[0].trim();
    return { ...item, type: newType };
  });
});


async function fetchSentimentLineData() {
  const link = `/large_screen/sentiment/trendline`
  axios.post(link, {}, {
    timeout: 10000
  }).then((response) => {
    LineChartData.value.sentiment = response.data.response

  }).catch((error) => {
    console.error(error)
  })  
}

async function fetchStanceLineData() {
  const link = `/large_screen/stance/trendline`
  axios.post(link, {}, {
    timeout: 10000
  }).then((response) => {
    LineChartData.value.stance = response.data.response
  }).catch((error) => {
    console.error(error)
  })  
}

async function fetchRealTimeRollingIllegalInfo() {
  const link = '/large_screen/RollingIllegalInfo';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    RollingIllegalInfoData.value = response.data.response;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

async function fetchRealTimeRollingIllegalAccount() {
  const link = '/large_screen/RollingIllegalAccount';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    RollingIllegalAccountData.value = response.data.response;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

async function fetchMilitaryInfoData() {
  const link = '/large_screen/MilitaryIllegalInfo';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    MilitaryIllegalData.value = response.data.response;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

async function fetchWordCloudData() {
  const link = '/large_screen/WordCloudData';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    WordCloudData.value = response.data;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

async function fetchLocationDistrubutionData() {
  const link = '/large_screen/LocationDistribution';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    LocationDistributionData.value = response.data;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

async function fetchStatsBoardData() {
  const link = '/large_screen/StatsBoard';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    StatsBoard.value = response.data;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

async function fetchWechatPaStats() { 
  const link = '/large_screen/wechat_pa';
  try {
    const response = await axios.post(link, /* data */ {}, {
      timeout: 10000, // 放在 config（第三个参数）
      // 可以添加其他 config: headers, params 等
    });
    WechatPaStatsData.value = response.data.stats;
    WechatPaCategoryData.value = response.data.violationTypes;
  } catch (error) {
    console.error('fetchRealTimeRollingText error:', error);
  }
}

// --- 初始化与配置更新 ---
function initCharts() {
  fetchSentimentLineData()
  fetchStanceLineData()
  fetchRealTimeRollingIllegalInfo()
  fetchRealTimeRollingIllegalAccount()
  fetchMilitaryInfoData()
  fetchWordCloudData()
  fetchLocationDistrubutionData()
  fetchStatsBoardData()
  fetchWechatPaStats()
}

// --- 生命周期 ---
onMounted(async () => {
  // 等待 DOM 渲染完成
  await nextTick()
  initCharts()
})

const time_now = ref(getCurrentDateTime()) // 初始值
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    time_now.value = getCurrentDateTime() // 使用你的格式化器
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})


const isFullScreen = ref(false);

function toggleFullScreen() {
  if (!isFullScreen.value) {
    // 进入全屏
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    } else if ((el as any).mozRequestFullScreen) {
      (el as any).mozRequestFullScreen();
    } else if ((el as any).msRequestFullscreen) {
      (el as any).msRequestFullscreen();
    }
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }
}

// 监听页面全屏状态变化
function fullscreenChangeHandler() {
  isFullScreen.value = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

onMounted(() => {
  document.addEventListener("fullscreenchange", fullscreenChangeHandler);
  document.addEventListener("webkitfullscreenchange", fullscreenChangeHandler);
  document.addEventListener("mozfullscreenchange", fullscreenChangeHandler);
  document.addEventListener("MSFullscreenChange", fullscreenChangeHandler);
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
  document.removeEventListener("webkitfullscreenchange", fullscreenChangeHandler);
  document.removeEventListener("mozfullscreenchange", fullscreenChangeHandler);
  document.removeEventListener("MSFullscreenChange", fullscreenChangeHandler);
});
</script>

<style lang="scss" scoped>
.dashboard {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  // overflow: hidden;

  .header {
    padding: 20px 30px;
    box-sizing: border-box;
    background-color: rgb(30 41 59);

    .title-container {
      display: flex;
      width: 100%;

      .title {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 50px;
        cursor: pointer;
        font-size: 38px;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: 5px; /* 改成你想要的间距，支持 px / em 等单位 */
      }

      .extra_info {
        margin-left: auto;
        display: flex;
        flex-direction: row;
        gap: 50px;
        font-size: 20px;
        font-weight: 500;
        align-items: flex-end;   /* 垂直底对齐 */
        .username, .time-now, .exit {
          color: #bae6fd;
          cursor: pointer;
        }

        .exit {
          display: flex;
          align-items: center;
          flex-direction: row;
          gap: 10px;
        }
      }
    }
  }

  .content {
    width: 100%;
    height: 100%;
    display: grid;
    box-sizing: border-box;
    grid-template-columns:30% 1fr 30%;
    gap: 30px;
    padding: 20px 30px;
    background-color: rgb(15 23 42);

    .left-column, .right-column {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: 1fr 1fr 1fr;
      box-sizing: border-box;
    }

    .center-column {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: 2fr 1fr;
      box-sizing: border-box;

      .main-chart {
        min-height: 150px;
        border-radius: 12px;
        box-sizing: border-box;
      }

      .list-container {
        min-height: 300px;
        border-radius: 12px;
        box-sizing: border-box;
      }
    }

    .chart-box {
      display: flex;
      flex-direction: column;
      margin-top: 50px;
      box-sizing: border-box;

      .chart-title {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
          padding: 10px 20px;
          font-size: 1.15rem;
          color: #cfeeff;
          letter-spacing: 1px;
          font-weight: 700;
          text-transform: uppercase;
          box-sizing: border-box;
          border-radius: 8px;

          /* 深色蓝青渐变背景 + 内阴影制造凹陷感 */
          background: linear-gradient(180deg, rgba(6,18,36,0.95) 0%, rgba(4,40,80,0.86) 40%, rgba(8,60,110,0.78) 100%);
          box-shadow:
            inset 0 2px 12px rgba(0,0,0,0.6),
            inset 0 -10px 30px rgba(4,25,60,0.45),
            0 6px 24px rgba(2,12,30,0.5);

          /* 发光边框（外侧浅光 + 内侧细线）*/
          border: 1px solid rgba(70,160,255,0.08);
          outline: 1px solid transparent;
          /* 可选微弱发光 */
          filter: drop-shadow(0 6px 18px rgba(10,120,220,0.08));

          /* 悬浮时强化光效 */
          transition: transform .22s ease, box-shadow .22s ease, filter .22s ease;
          &:hover {
            box-shadow:
              inset 0 4px 18px rgba(0,0,0,0.55),
              0 12px 40px rgba(6,120,220,0.12);
            filter: drop-shadow(0 10px 28px rgba(20,160,255,0.12));
          }

          /* 中央文字背景微粒与边框加强（轻微内发光） */
          span {
            position: relative;
            z-index: 3;
            padding: 4px 14px;
            background: linear-gradient(180deg, rgba(3,18,40,0.36), rgba(6,35,60,0.18));
            border-radius: 6px;
            box-shadow: inset 0 1px 8px rgba(0,80,140,0.06);
            text-shadow: 0 1px 6px rgba(0,120,180,0.15);
            font-size: 40px;
            letter-spacing: 2px;
          }

          /* 两侧小折角块，增加机械感 */
          .chart-title-corner {
            position: absolute;
            top: 8px;
            width: 18px;
            height: 10px;
            background: linear-gradient(90deg, rgba(60,180,255,0.9), rgba(20,120,200,0.9));
            z-index: 2;
            border-radius: 2px;
            box-shadow: 0 2px 8px rgba(0,110,180,0.12);
            opacity: 0.95;
            pointer-events: none;
          }
          /* 左右折角位置（如果需要在 DOM 中插入 .chart-title-corner 元素） */
          .chart-title-corner.left { left: 10px; transform: rotate(-18deg); }
          .chart-title-corner.right { right: 10px; transform: rotate(18deg); }

          /* 可选：一条细的内部分割线靠近下边，增加层次 */
          & > .subtitle-line {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 6px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(150,220,255,0.06), transparent);
            z-index: 2;
          }
        }
    }
  }
}
.main-box {
  background: linear-gradient(180deg, #000428 0%, #004e92 100%);
  padding-bottom: 20px;
  box-sizing: border-box;
}
/* 可调变量（按需调整）*/
.chart-box {
  --edge-size: 5px;                 /* 左右边条与底部边条厚度 */
  --edge-gap: 12px;                 /* 左右边条离容器左右内边距的偏移（留白） */
  --glow-color-start: rgba(70,200,255,0.95);
  --glow-color-mid: rgba(16,185,249,0.9);
  --glow-color-end: rgba(30,120,255,0.85);
  --base-bg: linear-gradient(180deg, rgba(6,18,36,0.95), rgba(8,60,110,0.78)); /* fallback/background */
  position: relative; /* 确保背景层次定位合理 */

  /* 多层背景：
     1) 左侧竖条（使用线性渐变）
     2) 右侧竖条（同上，镜像）
     3) 底部横条（水平渐变）
     4) 最下层为原来的容器背景（你可以替换为已有的背景定义）
  */

  /* 背景层次大小与位置：
     注意：background-position, background-size 对应每一层（从左到右）
     我们把左右竖条放在两层（第2、3层），底部横条在第4层，最后一层为整体底色
  */
  background-repeat: no-repeat, no-repeat, no-repeat, no-repeat, no-repeat;
  background-position:
    left top,
    calc(var(--edge-gap)) top,
    calc(100% - var(--edge-gap)) top,
    left calc(100% - var(--edge-size)),
    left top;
  background-size:
    auto,                              /* placeholder */
    var(--edge-size) 100%,             /* 左侧竖条：宽 x 高(100%) */
    var(--edge-size) 100%,             /* 右侧竖条：宽 x 高(100%) */
    calc(100% - (var(--edge-gap) * 2)) var(--edge-size), /* 底部横条 */
    cover;                             /* 主背景充满 */

  /* 添加轻微发光 + 内阴影，使边条更立体 */
  box-shadow:
    inset 0 8px 24px rgba(2,12,36,0.6),
    0 8px 30px rgba(2,12,36,0.45);
  /* 让边条上层的渐变显得更柔和 */
  -webkit-mask-image: linear-gradient(#000, #000); /* 保证兼容性 */
  mask-image: linear-gradient(#000, #000);
  overflow: hidden;
}

/* 左右分别放置并做镜像 */
.chart-box::before {
  left: var(--edge-gap);
}
.chart-box::after {
  right: var(--edge-gap);
  transform: scaleX(-1);
}

/* 底部高亮使用一个内部伪元素（避免改动 DOM），通过 box-shadow + inset line 达成更明显的底线 */
.chart-box .chart-bottom-glow {
  position: absolute;
  left: calc(var(--edge-gap));
  right: calc(var(--edge-gap));
  bottom: 8px; /* 距离底部微调 */
  height: calc(var(--edge-size) * 1.2);
  pointer-events: none;
  z-index: 1;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04), var(--glow-color-mid), rgba(255,255,255,0.06));
  box-shadow:
    0 6px 18px rgba(10,140,220,0.08),
    inset 0 1px 6px rgba(255,255,255,0.04);
  transform-origin: center;
  animation: bottomPulse 4.5s ease-in-out infinite;
}

/* 动画关键帧 */
@keyframes edgeFlow {
  0% { background-position: 50% 0%; }
  50% { background-position: 50% 100%; }
  100% { background-position: 50% 0%; }
}

@keyframes bottomPulse {
  0% { opacity: 0.85; transform: scaleX(0.98); }
  50% { opacity: 1; transform: scaleX(1.02); }
  100% { opacity: 0.85; transform: scaleX(0.98); }
}

/* 兼容窄屏：缩小边距与厚度 */
@media (max-width: 720px) {
  .chart-box {
    --edge-size: 4px;
    --edge-gap: 8px;
  }
}

@keyframes titleGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 关键：允许 grid/flex 子项收缩 */
.left-column,
.center-column,
.right-column,
.chart-box {
  min-height: 0;   /* ← 这句非常关键 */
}

/* 标题不参与伸缩 */
.chart-box .chart-title {
  flex: 0 0 auto;
}

.chart-box > *:not(.chart-title) {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden; /* 如果内部有滚动行为，交给内部处理（组件内已有 overflow 设置） */
}
</style>