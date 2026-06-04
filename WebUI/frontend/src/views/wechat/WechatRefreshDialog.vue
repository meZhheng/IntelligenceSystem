<template>
    <el-dialog
      v-model="visibleLocal"
      title="公众号数据采集引擎"
      width="1280px"
      class="crawler-dialog"
      :close-on-click-modal="false"
      :destroy-on-close="true"
      :show-close="false"
      @close="handleClose"
    >
        <template #header>
            <div class="custom-dialog-header">
            <div class="header-left">
                <span class="title-text">公众号数据采集引擎</span>
            </div>
            
            <div class="header-right">
                <span class="engine-status" :class="{ 'is-running': isCrawling, 'is-reconnecting': isReconnecting }">
                    <i class="dot"></i> 
                    {{ isReconnecting ? '连接断开，尝试重连...' : (isCrawling ? '引擎运行中' : '引擎就绪') }}
                </span>
            </div>
            </div>
        </template>
        <div class="header-status">
            <div class="target-info">
                <span class="label">目标公众号:</span>
                <el-tag effect="dark" type="info" class="target-tag">{{ formattedAffiliation }}</el-tag>
            </div>

            <div class="sync-range">
                <span class="label">同步范围:</span>
                <el-date-picker
                    v-model="rangeStart"
                    type="date"
                    placeholder="开始日期"
                    :disabled-date="disabledDate"
                    format="YYYY-MM-DD"
                    clearable
                    :disabled="isCrawling || isReconnecting"
                />
                <span class="date-sep">-</span>
                <el-date-picker
                    v-model="rangeEnd"
                    type="date"
                    placeholder="结束日期"
                    :disabled-date="disabledDate"
                    format="YYYY-MM-DD"
                    clearable
                    :disabled="isCrawling || isReconnecting"
                />
                <el-button link :disabled="isCrawling || isReconnecting" @click="clearSyncRange">清除范围</el-button>
            </div>
            
            <div class="stats-group">
                <div class="stat-item time-stat">
                <span class="val monospace">{{ elapsedTime }}</span>
                <span class="lab">已执行</span>
                </div>
                <div class="divider"></div>
                
                <div class="stat-item time-stat">
                <span class="val monospace highlight">{{ remainingTime }}</span>
                <span class="lab">预计剩余</span>
                </div>
                <div class="divider"></div>

                <div class="stat-item">
                <span class="val success">{{ stats.articlesCrawled }}</span>
                <span class="lab">已采集</span>
                </div>
                <div class="divider"></div>
                <div class="stat-item">
                <span class="val error">{{ stats.errorsOccurred }}</span>
                <span class="lab">错误数</span>
                </div>
            </div>
        </div>
  
      <div class="progress-section">
        <div class="progress-info">
          <span class="current-task">{{ statusLabel }}</span>
          <span class="sub-task">{{ statusSubLabel }}</span>
        </div>
        <el-progress 
          :percentage="progress" 
          :stroke-width="16" 
          :text-inside="true"
          :color="customProgressColors"
          striped 
          :striped-flow="isCrawling" 
        />
      </div>
  
      <div class="main-content-layout">
        <div class="terminal-wrapper">
          <div class="terminal-header">
            <div class="window-dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="terminal-title">CRAWLER CONSOLE — {{ props.affiliationId }}</div>
            <div class="terminal-actions">
              <el-button link @click="clearLogs"><el-icon><Delete /></el-icon> 清空</el-button>
            </div>
          </div>
          
          <div
            ref="logContainerRef"
            class="terminal-body"
            @mouseenter="onLogMouseEnter"
            @mouseleave="onLogMouseLeave"
          >
            <div v-if="logs.length === 0" class="empty-log">
              <p class="blink">> 等待指令输入...</p>
            </div>
            <div v-for="(entry, idx) in logs" :key="idx" class="log-line" :class="`is-${entry.status}`">
              <span class="log-time">[{{ entry.time }}]</span>
              <span class="log-phase">[{{ phaseLabel(entry.phase) }}]</span>
              <span class="log-message">{{ entry.message }}</span>
            </div>
            <div v-if="isCrawling" class="log-line cursor-line">
              <span class="cursor">_</span>
            </div>
          </div>
        </div>
  
        <div class="chart-panel">
          <div class="chart-title">实时采集数据概览</div>
          <div ref="chartContainer" class="chart-container"></div>
          <div class="chart-info" v-if="isCrawling">
            <el-icon><DataLine /></el-icon>
            当前采集速率: <span style="font-weight: bold; color: #409eff;">{{ currentRate.toFixed(2) }}</span> 条/秒
          </div>
          <div class="chart-info" v-else>
             <el-icon><Histogram /></el-icon>
             暂无活跃数据
          </div>
        </div>
      </div>
  
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-tips">
            <el-icon v-if="isCrawling || isReconnecting" class="is-loading"><Loading /></el-icon>
            <template v-if="isReconnecting">
              连接已断开，尝试重连中... (第 {{ reconnectAttempts }} 次)
            </template>
            <template v-else-if="isCrawling">
              正在执行异步抓取任务，请勿关闭窗口
            </template>
            <template v-else-if="crawlingFinished">
              任务已完成，总计采集 {{ stats.articlesCrawled }} 篇文章。
            </template>
            <template v-else>
              任务已就绪
            </template>
          </div>
          <div>
            <el-button @click="handleClose" :disabled="isCrawling">取消</el-button>
            <el-button v-if="isCrawling" type="danger" plain @click="abortCrawl">停止任务</el-button>
            <el-button
                v-else
                type="primary"
                :loading="startLoading"
                @click="startCrawl(false)"
            >
              启动采集引擎
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </template>
  
<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick, reactive, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Loading, DataLine, Histogram } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useProgressTimer } from './useProgressTimer'

const { elapsedTime, remainingTime, start: startTimer, update: updateTimer, reset: resetTimer } = useProgressTimer()
/**
 * Props / Emits
 */
interface ConfigData {
    token: string
    fingerprint: string
    cookie: string
}
  
  const props = withDefaults(defineProps<{
    visible: boolean
    affiliationId: string | number
    affiliationName?: string
    accountConfig: ConfigData
    initialStart?: Date | string | null
    initialEnd?: Date | string | null
  }>(), {
    affiliationName: '',
    initialStart: null,
    initialEnd: null
  })
  
  const emit = defineEmits(['update:visible', 'finished'])
  
  /**
   * Local reactive state
   */
  const visibleLocal = ref(props.visible)
  
watch(() => props.visible, async (v) => {
    visibleLocal.value = v
    if (v) {
        resetWhenOpen()
        // 确保 Dialog 动画完成且 DOM 已挂载
        await nextTick()
        // 给一点点延迟确保布局计算完成
        setTimeout(() => {
            initChart()
        }, 100)
    }
})
  
watch(visibleLocal, (v) => {
    emit('update:visible', v)
    if (!v) {
        // 对话框关闭时，停止所有活动
        abortCrawl()
    }
})
  
  const formattedAffiliation = computed(() => {
    return `${props.affiliationName}`
  })

  const rangeStart = ref<Date | null>(null)
  const rangeEnd = ref<Date | null>(null)

  const disabledDate = (time: Date) => {
    const min = new Date('2018-12-30').getTime()
    const max = new Date().getTime()
    return time.getTime() < min || time.getTime() > max
  }

  function toDate(value: Date | string | null | undefined) {
    if (!value) return null
    const date = value instanceof Date ? new Date(value) : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  function startOfDay(d: Date) {
    const t = new Date(d)
    t.setHours(0, 0, 0, 0)
    return t
  }

  function endOfDay(d: Date) {
    const t = new Date(d)
    t.setHours(23, 59, 59, 999)
    return t
  }

  function formatDate(d: Date) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function clearSyncRange() {
    rangeStart.value = null
    rangeEnd.value = null
  }

  // crawling / logs / progress
  const isCrawling = ref(false)
  const startLoading = ref(false)
  const abortController = ref<AbortController | null>(null)
  const crawlingFinished = ref(false) // 标记爬取是否最终完成
  
  // progress & phase info
  const progress = ref(0) // 0-100, 单一进度条（由后端的 json.progress 控制）
  const currentPhase = ref('') // 'list' | 'content' | ''
  const currentStatus = ref('') // 'start' | 'fetching' | 'saved' | 'completed' | 'error' | 'skipped'
  const currentPhaseMessage = ref('') // 可选的更详细文本（从后端 message 取得）
  
  // logs: 每项 { time, phase, status, message }
  const logs = ref<any[]>([])
  
  // autoscroll control
  const logContainerRef = ref<HTMLElement | null>(null)
  const autoScrollEnabled = ref(true)
  
  // Stats for chart and display
  const stats = reactive({
    articlesCrawled: 0,
    articlesSkipped: 0,
    errorsOccurred: 0,
    currentRate: 0,
    lastArticleTime: 0, // 用于计算速率
  })
  const currentRate = ref(0)
  
  // Reconnection logic
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 3
  const reconnectTimeout = ref<number | null>(null) // Used to hold setTimeout ID
  
  // ECharts
  const chartContainer = ref<HTMLElement | null>(null)
  let myChart: echarts.ECharts | null = null
  const chartData = reactive({
    times: [] as string[],
    crawledCounts: [] as number[],
    errorCounts: [] as number[],
    rateData: [] as number[], // 每秒抓取量
  })
  
  // Custom Progress Bar Colors
  const customProgressColors = [
    { color: '#f56c6c', percentage: 20 },
    { color: '#e6a23c', percentage: 40 },
    { color: '#5cb87a', percentage: 60 },
    { color: '#1989fa', percentage: 80 },
    { color: '#6f7ad3', percentage: 100 },
  ]
  
// ECharts initialization and update
const initChart = () => {
    if (chartContainer.value) {
        // 如果已经存在实例，先销毁，防止多次初始化
        if (myChart) {
            myChart.dispose()
        }
        console.log("initialize chart")
        myChart = echarts.init(chartContainer.value)
        updateChart()
        // 强制触发一次大小调整
        nextTick(() => {
            myChart?.resize()
        })
    } else {
        console.warn("Chart container not found!")
    }
}
  
const updateChart = () => {
    if (!myChart) return
    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params: any[]) {
                let res = params[0].name + '<br/>'
                params.forEach(item => {
                res += `${item.marker}${item.seriesName}: ${item.value}<br/>`
                })
                return res
            }
        },
        legend: {
            data: ['已采集文章', '错误数', '采集速率'],
            textStyle: {
                color: '#ccc'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: chartData.times,
            axisLabel: {
                color: '#aaa',
                formatter: (value: string) => value.split(' ')[1] || value // 只显示时间部分
            }
        },
        yAxis: [
        {
            type: 'value',
            name: '数量',
            minInterval: 1, // 确保Y轴是整数
            axisLabel: {
            color: '#aaa'
            },
            splitLine: {
            lineStyle: {
                color: '#333'
            }
            }
        },
        {
            type: 'value',
            name: '速率',
            min: 0,
            axisLabel: {
                color: '#aaa',
                formatter: '{value} 条/秒'
            },
            splitLine: {
                show: false // 速率轴不显示分割线
            }
        }
        ],
        series: [
        {
          name: '已采集文章',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            color: '#4ec9b0'
          },
          areaStyle: {
            opacity: 0.2,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                offset: 0,
                color: '#4ec9b0'
            }, {
                offset: 1,
                color: 'transparent'
            }])
          },
          data: chartData.crawledCounts,
          yAxisIndex: 0
        },
        {
            name: '错误数',
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: {
            width: 2,
            color: '#ff5f56'
            },
            areaStyle: {
            opacity: 0.1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                offset: 0,
                color: '#ff5f56'
            }, {
                offset: 1,
                color: 'transparent'
            }])
            },
            data: chartData.errorCounts,
            yAxisIndex: 0
        },
        {
            name: '采集速率',
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: {
            width: 2,
            color: '#569cd6'
            },
            data: chartData.rateData,
            yAxisIndex: 1
        }
        ],
        backgroundColor: 'transparent'
    }
    myChart.setOption(option)
}
  
  // Update chart data
const addChartDataPoint = () => {
    const now = new Date()
    const time = now.toLocaleTimeString()
    const crawled = stats.articlesCrawled
    const errors = stats.errorsOccurred
    const rate = currentRate.value
  
    chartData.times.push(time)
    chartData.crawledCounts.push(crawled)
    chartData.errorCounts.push(errors)
    chartData.rateData.push(rate)
  
    // Keep chart data length reasonable (e.g., last 60 points)
    if (chartData.times.length > 60) {
      chartData.times.shift()
      chartData.crawledCounts.shift()
      chartData.errorCounts.shift()
      chartData.rateData.shift()
    }
    updateChart()
  }
  
  let chartUpdateInterval: number | null = null;
  const startChartUpdates = () => {
    if (chartUpdateInterval) clearInterval(chartUpdateInterval);
    chartUpdateInterval = window.setInterval(addChartDataPoint, 3000); // 每3秒更新一次图表
  }
  const stopChartUpdates = () => {
    if (chartUpdateInterval) {
      clearInterval(chartUpdateInterval);
      chartUpdateInterval = null;
    }
}
  
onMounted(() => {
    initChart()
    window.addEventListener('resize', () => myChart?.resize())
})
  
  onUnmounted(() => {
    stopChartUpdates()
    if (myChart) {
      myChart.dispose()
      myChart = null
    }
    window.removeEventListener('resize', () => myChart?.resize())
  })
  
  // helpers for display
  function nowTimeString() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
  }
  
  // append log (structured)
  function appendLogEntry({ phase = '', status = '', message = '', raw = null }) {
    const entry = {
      time: nowTimeString(),
      phase: phase || currentPhase.value || '',
      status: status || currentStatus.value || 'info',
      message: message || (raw ? JSON.stringify(raw) : ''),
    }
    logs.value.push(entry)
    // 保持长度
    if (logs.value.length > 2000) logs.value.splice(0, logs.value.length - 2000)
  
    // 自动滚动
    if (autoScrollEnabled.value) {
      nextTick(() => {
        try {
          const el = logContainerRef.value
          if (el) {
            el.scrollTop = el.scrollHeight
          }
        } catch (e) { /* ignore */ }
      })
    }
  }
  
  // clear logs
  function clearLogs() {
    logs.value = []
  }
  
  // mouse handlers for log area
  function onLogMouseEnter() {
    autoScrollEnabled.value = false
  }
  function onLogMouseLeave() {
    autoScrollEnabled.value = true
    nextTick(() => {
      try {
        const el = logContainerRef.value
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      } catch (e) {}
    })
  }
  
  // map phase to label
  function phaseLabel(phase: string) {
    if (phase === 'list') return '文章列表'
    if (phase === 'content') return '正文抓取'
    if (phase === 'validate') return '验证配置'
    if (phase === 'init') return '准备阶段'
    return phase || '通用通知'
  }
  
  // user-facing status label (main header above progress bar)
  const statusLabel = computed(() => {
    const phase = currentPhase.value
    const status = currentStatus.value
    if (!phase) return isReconnecting.value ? '正在重试...' : (isCrawling.value ? '准备爬取...' : (crawlingFinished.value ? '采集完成' : '就绪'))
    const phaseName = phaseLabel(phase)
    // human readable
    if (status === 'start') return `${phaseName}：开始`
    if (status === 'fetching') return `${phaseName}：处理中`
    if (status === 'saved') return `${phaseName}：已保存`
    if (status === 'skipped') return `${phaseName}：已跳过`
    if (status === 'completed') return `${phaseName}：已完成`
    if (status === 'error') return `${phaseName}：发生错误`
    if (status === 'no_new') return `${phaseName}：无新数据`
    return `${phaseName}：${status}`
  })
  const statusSubLabel = computed(() => {
    if (currentPhaseMessage.value) return currentPhaseMessage.value
    if (!currentPhase.value) return ''
    return `阶段: ${phaseLabel(currentPhase.value)} · 状态: ${currentStatus.value || 'unknown'}`
  })
  
  // helper to safely parse JSON line
  function tryParseJSONLine(line: string) {
    try {
      return JSON.parse(line)
    } catch (e) {
      return null
    }
  }
  
  // Process streamed data
  function processStreamedData(parsed: any) {
    const { type, phase, status, progress: p, message } = parsed
  
    if (phase) currentPhase.value = phase
    if (status) currentStatus.value = status
    if (parsed.message) currentPhaseMessage.value = parsed.message
    if (typeof p === 'number') {
      progress.value = Math.min(100, Math.max(0, p))
      if (phase === 'content') {
        updateTimer(progress.value, 100)
      }
    }
  
    // Update statistics
    if (status === 'saved') {
      stats.articlesCrawled++
      const now = Date.now()
      if (stats.lastArticleTime > 0) {
        currentRate.value = 1 / ((now - stats.lastArticleTime) / 1000)
      }
      stats.lastArticleTime = now
    } else if (status === 'skipped') {
      stats.articlesSkipped++
    } else if (status === 'error') {
      stats.errorsOccurred++
    }
  
    // append structured log entry
    if (type === 'data' || type === 'info') {
      appendLogEntry({ phase, status: status || 'info', message: message || JSON.stringify(parsed), raw: parsed })
    } else if (type === 'error') {
      appendLogEntry({ phase, status: 'error', message: message || JSON.stringify(parsed), raw: parsed })
    } else {
      appendLogEntry({ phase, status: status || 'info', message: message || JSON.stringify(parsed), raw: parsed })
    }
  }
  
  /**
   * Start crawling
   */
async function startCrawl(isRetry = false) {
    if (isCrawling.value && !isRetry) return // 避免重复点击

    const hasStart = !!rangeStart.value
    const hasEnd = !!rangeEnd.value
    if (hasStart !== hasEnd) {
        ElMessage.warning('请选择完整的开始和结束日期')
        return
    }

    if (rangeStart.value && rangeEnd.value && rangeStart.value.getTime() > rangeEnd.value.getTime()) {
        const start = rangeStart.value
        rangeStart.value = rangeEnd.value
        rangeEnd.value = start
    }

    if (!isRetry) {
        // Reset UI only if not a retry
        progress.value = 0
        logs.value = []
        stats.articlesCrawled = 0
        stats.articlesSkipped = 0
        stats.errorsOccurred = 0
        stats.lastArticleTime = 0
        currentRate.value = 0
        currentPhase.value = ''
        currentStatus.value = ''
        currentPhaseMessage.value = ''
        crawlingFinished.value = false
    
        // Clear chart data
        chartData.times = []
        chartData.crawledCounts = []
        chartData.errorCounts = []
        chartData.rateData = []
        updateChart()
        resetTimer() // 重置时间
        startTimer() // 开始计时
    }
  
    isCrawling.value = true
    startLoading.value = true

    if (reconnectTimeout.value) {
        clearTimeout(reconnectTimeout.value)
        reconnectTimeout.value = null
    }
  
    abortController.value = new AbortController()
    const signal = abortController.value.signal

    appendLogEntry({ phase: 'init', message: isRetry ? `尝试第 ${reconnectAttempts.value} 次重连并恢复爬取...` : '开始请求后端，准备爬取...' })
    if (!isRetry) {
        appendLogEntry({
            phase: 'init',
            message: rangeStart.value && rangeEnd.value
                ? `同步范围：${formatDate(rangeStart.value)} 至 ${formatDate(rangeEnd.value)}`
                : '同步范围：全部历史文章'
        })
    }
    startChartUpdates()

    const body: Record<string, any> = {
        fakeid: props.affiliationId,
        token: props.accountConfig.token,
        fingerprint: props.accountConfig.fingerprint,
        cookie: props.accountConfig.cookie
    }

    if (rangeStart.value && rangeEnd.value) {
        body.start = startOfDay(rangeStart.value).toISOString()
        body.end = endOfDay(rangeEnd.value).toISOString()
    }
  
    try {
        const auth_token = localStorage.getItem('user-token') || ''
        const response = await fetch('/api/wechat/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth_token ? `Bearer ${auth_token}` : '',
            },
            body: JSON.stringify(body),
            signal,
        })
  
        if (!response.ok) {
            let errMsg = `请求失败 (HTTP ${response.status})`
            try {
                const errData = await response.json()
                errMsg = errData.message || errMsg
            } catch (_) {}

            const isRangeParamError = [400, 422].includes(response.status) && /start|end|range|date|time/i.test(errMsg)
            if (isRangeParamError) {
                errMsg = '后端暂不支持或拒绝了时间范围参数，请按约定的 /api/wechat/refresh 接口协议更新后端。'
            }

            appendLogEntry({ status: 'error', message: errMsg })
            ElMessage.error(errMsg)

            if (isRangeParamError) {
                stopChartUpdates()
                resetTimer()
                return
            }

            handleCrawlError(new Error(errMsg)) // Trigger reconnection attempt
            return
        }
  
        const contentType = response.headers.get('Content-Type') || ''
        if (contentType.includes('application/json')) {
            // 非流式，直接返回 JSON
            const data = await response.json()
            if (data.status === 'no_new') {
                appendLogEntry({ status: 'info', message: '返回：公众号没有新文章' })
                ElMessage.success('公众号文章更新成功（无新文章）')
            } else if (data.status === 'locked') {
                appendLogEntry({ status: 'warning', message: '返回：已有任务在执行，操作被拒绝' })
                ElMessage.warning(data.message || '已有任务在执行，请稍后再试')
            } else {
                appendLogEntry({ status: 'info', message: '返回 JSON：' + (data.message || JSON.stringify(data)) })
                ElMessage.info(data.message || '操作完成')
            }
            progress.value = 100
            crawlingFinished.value = true
            stopChartUpdates() // 停止图表更新
        } else if (response.body) {
            // 流式处理（按行 JSON）
            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            let buffer = ''
  
            appendLogEntry({ message: '开始读取流式响应...' })
  
        while (isCrawling.value) { // Keep trying while crawling is active
          try {
            const { value, done } = await reader.read()
            if (done) {
              appendLogEntry({ message: '流式响应结束 (正常关闭)' })
              break // End of stream
            }
            buffer += decoder.decode(value, { stream: true })
  
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
  
            for (const line of lines) {
              if (!line.trim()) continue
              const parsed = tryParseJSONLine(line)
              if (!parsed) {
                appendLogEntry({ status: 'error', message: `[PARSE-FAIL] ${line}` })
                continue
              }
              isReconnecting.value = false
              crawlingFinished.value = false
              reconnectAttempts.value = 0
              processStreamedData(parsed)
            }
          } catch (readError: any) {
            if (readError.name === 'AbortError') {
              appendLogEntry({ status: 'info', message: '流式读取已取消 (Abort)' })
              break
            }
            appendLogEntry({ status: 'error', message: `[流式读取错误] ${readError?.message || String(readError)}` })
            handleCrawlError(readError) // Handle connection error, might try reconnect
            return // Exit loop and function to handle reconnection
          }
        }
  
        // 处理剩余 buffer（最后一行）
        if (buffer.trim()) {
          const last = tryParseJSONLine(buffer)
          if (last) {
            processStreamedData(last)
          } else {
            appendLogEntry({ status: 'error', message: `[LEFTOVER-PARSE-FAIL] ${buffer}` })
          }
        }
  
        if (progress.value == 100) {
            ElMessage.success('公众号文章更新操作完成')
            crawlingFinished.value = true
        }

        stopChartUpdates() // 停止图表更新
        resetTimer()
      } else {
        appendLogEntry({ status: 'error', message: '不支持的响应格式' })
        ElMessage.error('❌ 不支持的响应格式')
      }
    } catch (error: any) {
        if (error && error.name === 'AbortError') {
            appendLogEntry({ status: 'info', message: '已取消爬取 (Abort)' })
            ElMessage.info('已取消爬取')
        } else {
            appendLogEntry({ status: 'error', message: '[异常] ' + (error?.message || String(error)) })
            ElMessage.error('加载失败：' + (error?.message || '未知错误'))
            handleCrawlError(error) // Trigger reconnection attempt
        }
    } finally {
        if (!isReconnecting.value) { // If not in reconnection process
            isCrawling.value = false
            startLoading.value = false
            abortController.value = null
            currentRate.value = 0 // Reset rate
        }
        // 通知父组件操作完成（可选，父可据此刷新列表）
        emit('finished', { affiliationId: props.affiliationId, success: progress.value >= 100 })
    }
}
  
  // Handle errors during crawl, trigger reconnection
function handleCrawlError(error: any) {
    stopChartUpdates() // 停止图表更新
    isReconnecting.value = true

    if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++
        appendLogEntry({ 
            status: 'warning', 
            message: `连接中断，将在 ${60} 秒后尝试重连...` 
        })
    
        reconnectTimeout.value = window.setTimeout(async () => {
            await startCrawl(true) // Attempt to restart the crawl
        }, reconnectAttempts.value * 36000) // Exponential backoff for reconnection
    } else if (reconnectAttempts.value >= maxReconnectAttempts) {
        appendLogEntry({ status: 'error', message: `达到最大重连次数 (${maxReconnectAttempts})，放弃重连。` })
        ElMessage.error('连接已断开，无法自动恢复。请检查网络或稍后手动重试。')
        isCrawling.value = false
        startLoading.value = false
        isReconnecting.value = false
        crawlingFinished.value = false // If it failed, it's not finished
        reconnectAttempts.value = 0
    }
}
  
// Abort crawl
function abortCrawl() {
    if (abortController.value) {
        abortController.value.abort()
    }
    if (reconnectTimeout.value) {
        clearTimeout(reconnectTimeout.value)
        reconnectTimeout.value = null
    }
    isCrawling.value = false
    startLoading.value = false
    isReconnecting.value = false
    crawlingFinished.value = false // If it failed, it's not finished
    reconnectAttempts.value = 0
    stopChartUpdates()
    resetTimer()

    appendLogEntry({ status: 'info', message: '已中止任务。' })
    ElMessage.info('已中止任务。')
}

/**
 * reset when dialog opens
 */
function resetWhenOpen() {
    progress.value = 0
    logs.value = []
    rangeStart.value = toDate(props.initialStart)
    rangeEnd.value = toDate(props.initialEnd)
    isCrawling.value = false
    startLoading.value = false
    crawlingFinished.value = false
    isReconnecting.value = false
    reconnectAttempts.value = 0
    stats.articlesCrawled = 0
    stats.articlesSkipped = 0
    stats.errorsOccurred = 0
    stats.lastArticleTime = 0
    currentRate.value = 0
    stopChartUpdates()

    // Clear chart data
    chartData.times = []
    chartData.crawledCounts = []
    chartData.errorCounts = []
    chartData.rateData = []
    updateChart()
}
  
/**
 * 关闭对话框
 */
function handleClose() {
    if (isCrawling.value || isReconnecting.value) {
        ElMessage.warning('当前正在爬取或尝试重连，请先停止任务或等待完成后再关闭')
        return
    }
    visibleLocal.value = false
}
</script>
  
<style scoped>
/* 字体引入 - 建议在全局引入更专业的等宽字体 */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

.crawler-dialog :deep(.el-dialog__body) {
    padding: 20px;
    background-color: #f8f9fb;
}

/* 顶部状态栏样式 */
.header-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.target-info {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #606266;
}

.sync-range {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #606266;
}

.sync-range :deep(.el-date-editor) {
    width: 150px;
}

.date-sep {
    color: #909399;
}

.label {
    margin-right: 8px;
    font-weight: bold;
}

.target-tag {
    font-family: 'JetBrains Mono', monospace;
    font-weight: bold;
    margin-right: 15px;
}

/* 对话框头部整体样式 */
:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 15px 20px;
  background: #1a1a1a; /* 深色背景增强科技感 */
  border-bottom: 1px solid #333;
}

.custom-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 标题左侧样式 */
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 1px;
}

/* 状态指示样式 (移入标题栏) */
.engine-status {
  font-size: 13px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s;
  color: #909399; /* 默认灰色 */
}

/* 运行状态 */
.engine-status.is-running {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.2);
}

/* 重连状态 */
.engine-status.is-reconnecting {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
  border: 1px solid rgba(230, 162, 60, 0.2);
}

.engine-status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background: currentColor;
}

/* 动画效果保持不变 */
.is-running .dot {
  animation: pulse 1.5s infinite;
  box-shadow: 0 0 8px #67c23a;
}

.is-reconnecting .dot {
  animation: heartbeat 0.8s infinite;
  background-color: #e6a23c !important;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes heartbeat {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.is-running .dot {
    animation: pulse 1.5s infinite;
}
.is-reconnecting .dot {
    animation: heartbeat 1s infinite;
    background-color: #e6a23c;
}
  
/* 统计数据布局 */
/* 统计区域增强 */
.stats-group {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
}

.stat-item .val {
    font-size: 18px;
    font-weight: 700;
    color: #000000;
}

.stat-item .val.error {
    color: #ff0000;
}

.stat-item .val.success {
    color: #67c23a;
}

/* 时间数字建议使用等宽字体，防止抖动 */
.monospace {
    font-family: 'Monaco', 'Ubuntu Mono', 'Consolas', monospace;
    letter-spacing: 0.5px;
}

.stat-item .val.highlight {
    color: #409eff;
    text-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
    padding: 0 2px;
}

.stat-item .lab {
    font-size: 11px;
    color: #909399;
    margin-top: 4px;
    text-transform: uppercase;
}

.divider {
    width: 1px;
    height: 24px;
    background: #ebeef5;
}

/* 主内容布局：左侧日志，右侧图表 */
.main-content-layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 16px;
    height: 360px;
}

/* 终端样式 */
.terminal-wrapper {
    background: #1e1e1e;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.terminal-header {
    background: #333;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.window-dots {
  display: flex;
  gap: 6px;
}

.window-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27c93f; }

.terminal-title {
  color: #aaa;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
}

.terminal-body {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #d4d4d4;
    background: #1e1e1e;
}

.log-line {
  margin-bottom: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time { color: #569cd6; margin-right: 8px; }
.log-phase { color: #4ec9b0; margin-right: 8px; }

.is-error .log-message { color: #f44336; }
.is-warning .log-message { color: #ce9178; }
.is-saved .log-message { color: #b5cea8; }

/* 图表面板 */
.chart-title {
    color: #eee;
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* 确保 chart-panel 能够撑开 */
.chart-panel {
    background: #252526;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    border: 1px solid #333;
    min-height: 300px; /* 显式设置最小高度 */
}

.chart-container {
    flex: 1;
    width: 100%;
    min-height: 200px;
}

.chart-info {
    margin-top: 8px;
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    gap: 5px;
}

/* 动画效果 */
@keyframes heartbeat {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
}

.is-reconnecting .dot {
    animation: heartbeat 0.8s infinite;
    background-color: #e6a23c !important;
}

/* 动画 */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}

@keyframes blink {
  50% { opacity: 0; }
}

.blink { animation: blink 1s step-end infinite; }
.cursor {
  display: inline-block;
  width: 8px;
  height: 15px;
  background: #67c23a;
  animation: blink 1s step-end infinite;
}

/* 进度区域 */
.progress-section {
    padding: 15px 20px;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.current-task {
  font-weight: 600;
  font-size: 14px;
  color: #409eff;
}

.sub-task {
  font-size: 12px;
  color: #909399;
}

/* 底部操作 */
.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-tips {
    font-size: 13px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>