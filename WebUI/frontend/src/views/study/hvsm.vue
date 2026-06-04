<template>
<section class="adversarial-training">
  <h2 class="title">🎯 人机对抗训练</h2>
  <!-- 模式切换 -->
  <div class="mode-switch">
    <el-button
      :type="startMvsh ? 'primary' : 'default'"
      @click="onStartMvsh"
    >机器生成 &gt; 人类判定</el-button>
    <el-button
      :type="startHvsm ? 'primary' : 'default'"
      @click="onStartHvsm"
    >人类生成 &gt; 机器判定</el-button>
  </div>

  <!-- 机器 -> 人类 模式 -->
  <div v-if="startMvsh" class="mvsh-mode">
    <!-- 进度条 -->
    <el-progress
      class="quiz-progress"
      :text-inside="true"
      :stroke-width="18"
      :percentage="round((currentIndex/total) * 100)"
      :format="() => `${currentIndex}/${total}`"
    />

    <!-- 题目卡片 -->
    <el-card
      :loading="loading"
      v-for="(item, idx) in dataList"
      :key="idx"
      class="quiz-card"
      :body-style="{ padding: '20px' }"
      :class="{
        correct: showAnswer && selected[idx] === item.label,
        wrong:   showAnswer && selected[idx] && selected[idx] !== item.label
      }"
    >
      <div class="card-header">
        <span class="question-no">题 {{ idx + 1 }}</span>
        <span v-if="showAnswer && selected[idx] && selected[idx] !== item.label" class="correct-label">
          正确答案：{{ item.label }}
        </span>
      </div>
      <p class="question-text">{{ item.text }}</p>

      <el-select
        v-model="selected[idx]"
        placeholder="请选择类别"
        :disabled="showAnswer"
        clearable
      >
        <el-option
          v-for="opt in options"
          :key="opt.value"
          :label="opt.value"
          :value="opt.value"
        />
      </el-select>
    </el-card>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <el-button
        type="primary"
        :disabled="!allAnswered || showAnswer"
        @click="submitAnswers"
        :loading="loading"
      >提交全部答案</el-button>
      <el-button
        v-if="showAnswer"
        @click="resetQuiz"
      >再来一次</el-button>
    </div>

    <!-- 结果统计 -->
    <div v-if="showAnswer" class="result-summary">
      <el-card class="result-card">
        <el-progress
          type="circle"
          :percentage="scorePercent"
          :width="120"
        />
        <div class="score-text">
          正确 {{ score }} / {{ total }}  （{{ scorePercent }}%）
        </div>
      </el-card>
    </div>
  </div>

  <!-- 人类 -> 机器 模式 -->
  <div v-if="startHvsm" class="hvsm-mode">
    <el-input
      type="textarea"
      v-model="inputText"
      placeholder="请输入一段测试文字…"
      :rows="4"
    />
    <div class="bottom-bar">
      <el-button
        type="primary"
        :disabled="!inputText"
        :loading="loading"
        @click="fetchAiJudgment"
      >提交给模型</el-button>
    </div>
    <div v-if="aiOutput" class="ai-output">
      <h4>模型判定结果：</h4>
      <p style="white-space: pre-line;">{{ aiOutput }}</p>
    </div>
  </div>
</section>
</template>

<script>
import axios from '@/api/axios';
export default {
data() {
  return {
    startMvsh: false,
    startHvsm: false,
    loading: false,
    dataList: [],      // 题目列表
    selected: [],      // 用户选项
    options: [
      { value: '泄露J调整组建、编制部署' },
      { value: '泄露高新武器装备动态' },
      { value: '历史虚无主义' },
      { value: '抹黑丑化J队作风形象' },
      { value: '涉J网络暴力' },
      { value: '涉J谣言' },
      { value: '暴露涉J单位、人员信息' },
      { value: '煽动J地对立、夸大渲染J队腐败矛盾' },
      { value: '涉J婚恋纠纷、征婚交友' },
      { value: '涉J性别歧视' },
      { value: '涉J政治言论' },
      { value: '涉“J贷”等网络借贷' },
    ],
    showAnswer: false,
    score: 0,

    inputText: '',
    aiOutput: '',
  }
},
computed: {
  total() {
    return this.dataList.length;
  },
  currentIndex() {
    // 在未提交前，已答题数
    return this.selected.filter(v => v).length;
  },
  allAnswered() {
    return this.currentIndex === this.total;
  },
  scorePercent() {
    return this.total > 0
      ? Math.round((this.score / this.total) * 100)
      : 0;
  }
},
methods: {
  round(v) { return Math.round(v); },

  onStartMvsh() {
    this.startMvsh = true;
    this.startHvsm = false;

    if (this.dataList.length > 0) return;
    this.loadQuestions();
  },
  onStartHvsm() {
    this.startHvsm = true;
    this.startMvsh = false;
  },

  // 加载题目示例
  async loadQuestions() {
    this.dataList = []
    this.loading = true;
    axios.get('/hvsm/questions', {timeout: 600000}).then(res => {
      this.dataList = res.data;
    }).catch(err => {
      console.error('加载题目失败:', err);
      this.dataList = [];
    }).finally(() => {
      this.loading = false;
    });

    this.selected = Array(this.total).fill('');
    this.showAnswer = false;
    this.score = 0;
  },

  submitAnswers() {
    // 统计分数
    this.score = this.selected.reduce((sum, v, i) =>
      console.log(sum, v, this.dataList[i].label) ||
      sum + (v === this.dataList[i].label ? 1 : 0)
    , 0);
    this.showAnswer = true;

    // 将分数发送到后端
    const link = `/hvsm/score`
    
    axios.post(link, {
      score: this.score * 10
      }, {
        timeout: 10000
    }).then((response) => {
      console.log('分数存储:', response.data.status)

    }).catch((error) => {
        console.error(error)
    })


  },

  resetQuiz() {
    this.loadQuestions();
  },

  async fetchAiJudgment() {
    if (!this.inputText) return;
    this.loading = true;
    
    response = axios.post('/hvsm/ai/judgment', {
      text: this.inputText,
    }, {
      timeout: 600000
    }).then(response => {
      this.aiOutput = response.data;
    }).finally(() => {
      this.loading = false;
    });
  }
}
}
</script>

<style scoped>
.adversarial-training {
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 960px;
  margin: 2rem auto;
  padding: 1rem;
  background: #fafafa;
  border-radius: 8px;
}
.title {
  margin-top: 0;
  text-align: center;
  margin-bottom: 1rem;
  color: #409EFF;
}
.mode-switch {
  text-align: center;
  margin-bottom: 1rem;
}
.mode-switch .el-button {
  width: 300px;
  margin: 0 0.5rem;
}

.quiz-progress {
  margin: 1rem 0;
}

.quiz-card {
  margin-bottom: 1rem;
  border: 1px solid #ebeef5;
  transition: border-color .3s, background-color .3s;

  &.correct {
    border-color: #67C23A;
    background-color: #f0f9eb;
  }
  &.wrong {
    border-color: #F56C6C;
    background-color: #fef0f0;
  }
}


.card-header {
display: flex;
justify-content: space-between;
margin-bottom: 0.5rem;
}
.question-no {
font-weight: bold;
color: #606266;
}
.correct-label {
  color: #e80606;
  font-weight: 500;
}
.question-text {
margin-bottom: 0.8rem;
line-height: 1.6;
}

.bottom-bar {
  width: 100%;
  text-align: right;
  margin: 1rem, 0;
  padding: 1rem 0;
  border-top: 1px solid #ebeef5;
}
.bottom-bar .el-button {
  margin-left: 0.5rem;
}

.result-summary {
  text-align: center;
  margin: 1rem 0;
}
.result-card {
  display: inline-block;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.score-text {
  margin-top: 0.5rem;
  font-size: 1.1rem;
  color: #303133;
}

.hvsm-mode {
display: flex;
flex-direction: column;
align-items: center;
}
.hvsm-mode .el-input {
width: 100%;
margin-bottom: 1rem;
}
.hvsm-mode .el-button {
margin-bottom: 1rem;
}
.ai-output {
width: 100%;
background: #f5f7fa;
padding: 1rem;
border-radius: 6px;
}
</style>
