<template>
<div style="border: 1px solid #ccc; width: 100%;">
  <div class="custom-toolbar">
    <!-- 左侧功能区 -->
  <div class="left-controls">
    <!-- 预设模板选择 -->
    <select 
      v-model="selectedTemplate" 
      @change="loadTemplate"
      class="template-selector"
    >
      <option value="">选择模板...</option>
      <option 
        v-for="[name, content] in Object.entries(templates)" 
        :key="name" 
        :value="name"
      >
        {{ name }}
      </option>
    </select>
    <!-- 下载格式选择 -->
    <select 
      v-model="downloadFormat" 
      class="template-selector"
      style="margin-left: 10px;"
    >
      <option value="html">HTML格式</option>
      <option value="text">纯文本格式</option>
    </select>
  </div>

  <!-- 右侧功能区 -->
  <div class="right-controls">
    <!-- 文件名输入 -->
    <input
      v-model="filename"
      placeholder="输入文件名"
      class="filename-input"
      type="text"
    />

    <!-- 下载按钮 -->
    <button 
      class="template-selector download-btn"
      @click="downloadContent"
    >
      下载内容
    </button>

    <!-- 评估按钮 -->
    <button 
      class="template-selector download-btn"
      @click="fetchReportEval"
    >
      报告评估
    </button>

    <div v-if="is_eval" class="dialog-overlay">
        <div class="dialog">
          <p style="white-space: pre-line;">{{ eval_data }}</p>
          <button @click="is_eval = false">关闭</button>
        </div>
      </div>

  </div>

    <!-- 原有工具栏 -->
    <Toolbar
      style="flex: 1; border-left: 1px solid #ccc;"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="mode"
    />
  </div>

  <Editor
    style="height: calc(100%-60px); width: 100%;"
    v-model="valueHtml"
    :defaultConfig="editorConfig"
    :mode="mode"
    @onCreated="handleCreated"
  />
</div>
</template>
<script>
  import '@wangeditor/editor/dist/css/style.css' // 引入 css

  import { onBeforeUnmount, ref, shallowRef, onMounted } from 'vue'
  import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
  import axios from '@/api/axios'

  export default {
    components: { Editor, Toolbar },
    setup() {
      // 编辑器实例，必须用 shallowRef
      const editorRef = shallowRef()
      // 新增响应式数据
      const filename = ref('')
      const downloadFormat = ref('html')
      // 内容 HTML
      const valueHtml = ref('<p>hello</p>')
      const selectedTemplate = ref('')  // 新增：当前选中的模板
    //   模拟 ajax 异步获取内容
    //   onMounted(() => {
    //     setTimeout(() => {
    //       valueHtml.value = '<p>模拟 Ajax 异步设置内容</p>'
    //     }, 1500)
    //   })
    //   新增：预设模板库
    const templates = ref({
  '空白文档': ' ',

  '商务邮件': `尊敬的[姓名]：
    您好！
    [正文内容]
    
    此致
    敬礼
    
    [您的姓名]
    [联系方式]`,

  '项目报告': `项目名称：[项目名称]
负责人：[负责人]
截止日期：YYYY-MM-DD

一、项目进展
1. 当前进度：
   - [进度详情1]
   - [进度详情2]
2. 存在问题：
   ! [问题描述1]
   ! [问题描述2]

二、下一步计划
* [计划内容1]（负责人：）
* [计划内容2]（负责人：）`,

  '会议纪要': `会议主题：[会议主题]
时间：${new Date().toISOString().slice(0, 16).replace('T', ' ')}
参会人员：
1. [姓名1]（[部门/角色]）
2. [姓名2]（[部门/角色]）
3. [姓名3]（[部门/角色]）

会议内容：
一、当前进展
- [进展详情1]
- [进展详情2]

二、存在问题
! [问题描述1]
! [问题描述2]

三、行动计划
* [行动项1]（负责人：）
* [行动项2]（负责人：）
* [行动项3]（负责人：）`,
// 项目管理类模板
  '项目报告': `# [项目名称]阶段报告
**负责人**：[姓名] | **周期**：${new Date().toISOString().slice(0, 10)} ~ [截止日期]

## 里程碑进度（完成度${Math.floor(Math.random()*40+60)}%）
✅ [已完成任务1]（负责人：[姓名]）
🔄 [进行中任务2]（进度：${Math.floor(Math.random()*50+30)}%）
⏳ [待启动任务3]

## 风险预警（❗️需重点关注）
! [技术瓶颈描述]（影响度：⭐️⭐️⭐️）
! [资源短缺问题]（紧急程度：🔥🔥）

## 决策需求
❓ [需确认事项1]（关联方：[部门/角色]）
❓ [需审批事项2]（关联文档：[文件名.doc]）`,

  // 会议管理类模板
  '会议纪要': `# ${new Date().toISOString().slice(0, 10)} [会议主题]
**召集人**：[姓名] | **时长**：[实际时长]分钟

## 参会人员
👨💻 [技术部] 张三
👩💼 [市场部] 李四
👨🔧 [运维部] 王五

## 核心决议
✔️ 通过[某方案名称]（赞成率：${Math.floor(Math.random()*40+60)}%）
✔️ 确定[某时间节点]前完成[具体任务]

## 待办事项
📌 [任务A]（责任人：@张三 | 截止日：${new Date(Date.now() + 604800000).toISOString().slice(0,10)}）
📌 [任务B]（责任人：@李四 | 需协调：[资源列表]）`,

  // 新增学习类模板
  '学习周报': `# 第${Math.ceil((new Date().getDate())/7)}周学习报告
**领域**：[技术/业务领域] | **总时长**：[学习小时数]h

## 知识图谱
📚 已掌握：
   - [概念/技能1]（掌握度：✅）
   - [工具/方法2]（熟练度：${Math.floor(Math.random()*40+60)}%）

💡 待深化：
   ! [难点1]（卡点描述）
   ? [疑问2]（需请教：[导师/资料]）

## 实践成果
🛠️ 完成[实验/项目名称]
   - 关键收获：[具体收获]
   - 验证数据：[数据/图表链接]

## 下周计划
📅 [学习主题]（预计${Math.floor(Math.random()*15+15)}h）
   * 理论部分：[书籍/课程名称]
   * 实践部分：[实验目标]`,

  '读书笔记': `# 《[书籍名称]》深度笔记
**作者**：[作者] | **领域**：[学科分类] | **阅读进度**：${Math.floor(Math.random()*50+50)}%

## 核心观点
💎 [观点1]（页码：PXX）
   - 理论支撑：[相关研究]
   - 现实关联：[实际案例]

## 思维碰撞
🤔 质疑点：[存疑观点]
   ? 反驳依据：[相关文献]
   💡 延伸思考：[个人见解]

## 应用设想
🚀 可用于：[工作场景]
   * 实施步骤：[1.2.3...]
   ! 潜在障碍：[可能困难]`,

  '实验报告': `# [实验名称] 
**实验日期**：${new Date().toISOString().slice(0, 10)} | **环境**：[硬件/软件配置]

## 方法论
🔬 实验设计：
   1. 控制变量：[变量说明]
   2. 测量指标：[指标列表]

## 数据记录
📊 数据集（样本量：${Math.floor(Math.random()*500+500)}）
| 条件组 | 均值 | 标准差 | 显著性(p值) |
|-------|-----|-------|------------|
| [A组] | ${Math.random().toFixed(2)} | ${Math.random().toFixed(2)} | <0.0${Math.floor(Math.random()*5+1)} |

## 结论验证
✅/[❌] 原假设[成立/不成立]
   ! 实验局限性：[影响因素]
   💡 改进方案：[优化建议]`,

  // 新增科研类模板
  '研究计划': `# [课题名称]研究方案
**研究周期**：${new Date().getFullYear()}年度 ~ ${new Date().getFullYear()+1}年度

## 理论框架
📌 关键假设：
   - [假设1]（创新性：⭐️⭐️⭐️）
   - [假设2]（已有研究支撑：[文献引用]）

## 技术路线
🛠️ 阶段规划：
   🗓️ Q1: [文献综述]（完成度：${Math.floor(Math.random()*40+60)}%）
   🗓️ Q2: [方法开发]
   🗓️ Q3: [数据采集]
   
## 资源需求
❗️ 急需：[特殊设备/数据]
💵 预算：[金额]万元（明细：[...]）`
})

    // 新增：加载模板方法
    const loadTemplate = () => {
      if (selectedTemplate.value && templates.value[selectedTemplate.value]) {
        if (editorRef.value) {
          editorRef.value.clear()
        }
        
        setTimeout(() => {
          valueHtml.value = templates.value[selectedTemplate.value]
          editorRef.value?.focus()
        //   selectedTemplate.value = '' // 清空选择
        }, 50)
      }
    }
      const toolbarConfig = {}
      const editorConfig = { placeholder: '请输入内容...' }
        // 初始化内容
    onMounted(() => {
      setTimeout(() => {
        valueHtml.value = '<p>请从上方下拉菜单中选择模板</p>'
      }, 1500)
    })
      // 组件销毁时，也及时销毁编辑器
      onBeforeUnmount(() => {
        const editor = editorRef.value
        if (editor == null) return
        editor.destroy()
      })

      const handleCreated = (editor) => {
        editorRef.value = editor // 记录 editor 实例，重要！
      }

    // 修改后的下载方法
    const downloadContent = () => {
      // 获取内容
      let content = valueHtml.value
      let extension = '.html'
      
      if (downloadFormat.value === 'text') {
        content = editorRef.value.getText() // 获取纯文本
        extension = '.txt'
      }

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const finalFilename = filename.value 
        ? `${filename.value}_${timestamp}${extension}`
        : `document-${timestamp}${extension}`

      // 创建Blob
      const blob = new Blob([content], { 
        type: downloadFormat.value === 'html' 
          ? 'text/html' 
          : 'text/plain'
      })

      // 创建下载链接
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = finalFilename

      // 触发下载
      document.body.appendChild(link)
      link.click()

      // 清理
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      // 显示通知
      alert(`文件 ${finalFilename} 下载成功！`)
      filename.value = '' // 清空文件名输入
    }

    const eval_data = ref("无")
    const is_eval = ref(false)

    async function fetchReportEval() {
      let content = editorRef.value.getText() // 获取纯文本
      const link = `/report/evaluation`
      eval_data.value = "正在评估..."
      axios.post(link, {
        content: content 
        }, {
          timeout: 50000
      }).then((response) => {

        console.log('赋值前:', eval_data)
        eval_data.value = response.data.result
        console.log('赋值后:', eval_data)

      }).catch((error) => {
          console.error(error)
      })
      // eval_data.value = "这是评估结果这是评估结果"
      // console.log('赋值后:', eval_data.value)
      is_eval.value  = true

    }

      return {
        editorRef,
        valueHtml,
        mode: 'default', // 或 'simple'
        toolbarConfig,
        editorConfig,
        handleCreated,
        templates,
        selectedTemplate,
        loadTemplate,
        downloadFormat,
        filename,
        downloadContent,
        fetchReportEval,
        is_eval,
        eval_data
      }
    },
  }
</script>
<style scoped>
.custom-toolbar {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  gap: 10px;
}

.left-controls {
  display: flex;
  align-items: center;
}

.right-controls {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.template-selector {
  padding: 6px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.filename-input {
  padding: 6px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  margin-right: 10px;
  width: 200px;
}

.download-btn {
  background-color: #4CAF50;
  color: white;
  border-color: #45a049;
  margin-right: 8px;
  margin-left: 8px;
}

.download-btn:hover {
  background-color: #45a049;
}

.template-selector:hover {
  border-color: #adb5bd;
}

.template-selector:focus {
  outline: none;
  border-color: #86b7fe;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
}

.dialog-overlay {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;      /* 限制最大宽度，防止太宽 */
  width: 90vw;           /* 默认宽度是视口宽度的90%，自适应缩放 */
  
  max-height: 80vh;      /* 限制最大高度，防止过高 */
  overflow-y: auto;      /* 内容超出时显示垂直滚动条 */
  box-sizing: border-box; /* 让 padding 包含在宽高内，避免撑开 */
  word-break: break-word; /* 长单词或长文本自动换行 */
}
</style>