<template>
  <!-- 右侧编辑区域 -->
  <div class="edit-panel">
    <!-- 输入区域 -->
    <div class="input-section">
      <div class="title-input">
        <div
          class="title-preview"
          v-html="highlightedTitle"
          @mouseover="handleTitleHover"
          @mouseleave="clearSuggestion"
        ></div>
        <el-button type="primary" :loading="checking" @click="startCheck">
          <template #icon>
            <el-icon><Check /></el-icon>
          </template>
          {{ is_detected ? "重新检测" : "开始检测" }}
        </el-button>
      </div>

      <!-- 校对结果 -->
      <div class="result-section" v-if="showResult">
        <el-alert
          :title="
            !is_detected
              ? '尚未进行检测'
              : totalErrors === 0
              ? '未发现任何错误'
              : `共发现 ${totalErrors} 处问题（标题 ${titleCheck.length} 处，正文 ${contentCheck.length} 处）`
          "
          :type="
            !is_detected ? 'info' : totalErrors === 0 ? 'success' : 'warning'
          "
          show-icon
          :closable="false"
        />

        <!-- 标题错误 -->
        <div class="error-block" v-if="titleCheck.length > 0">
          <div class="error-header">
            <el-icon color="#F56C6C"><Warning /></el-icon>
            <h4>标题问题（{{ titleCheck.length }}处）</h4>
          </div>
          <div
            class="error-item"
            v-for="(mistake, idx) in titleCheck || []"
            :key="idx"
          >
            <div class="error-meta">
              <!-- <el-tag>错误位置：{{ getMistakePosition(mistake) }}</el-tag> -->
              <el-tag type="danger"
                >错误类型：{{ getMistakeType(mistake) }}</el-tag
              >
              <el-tag> 错误说明：{{ getMistakeDescription(mistake) }} </el-tag>
            </div>
            <div
              class="original-snippet"
              v-if="
                getMistakeSentence(currentTitle, mistake) &&
                !getSuggestedSentence(currentTitle, mistake)
              "
            >
              <span class="snippet-label">问题片段</span>
              <span class="snippet-text">
                {{ getMistakeSentence(currentTitle, mistake)?.before
                }}<mark
                  class="issue-word-action clickable"
                  @click="openPositiveWordDialog(currentTitle, mistake)"
                >{{
                  getMistakeSentence(currentTitle, mistake)?.target
                }}</mark
                >{{ getMistakeSentence(currentTitle, mistake)?.after }}
              </span>
            </div>
            <div
              class="rewrite-preview"
              v-if="
                getMistakeSentence(currentTitle, mistake) &&
                getSuggestedSentence(currentTitle, mistake)
              "
            >
              <div class="rewrite-row original-row">
                <span class="rewrite-label">原文</span>
                <span class="rewrite-text">
                  {{ getMistakeSentence(currentTitle, mistake)?.before
                  }}<del
                    class="issue-word-action clickable"
                    @click="openPositiveWordDialog(currentTitle, mistake)"
                  >{{
                    getMistakeSentence(currentTitle, mistake)?.target
                  }}</del
                  >{{ getMistakeSentence(currentTitle, mistake)?.after }}
                </span>
              </div>
              <div class="rewrite-row suggestion-row">
                <span class="rewrite-label">建议</span>
                <span class="rewrite-text">
                  {{ getSuggestedSentence(currentTitle, mistake)?.before
                  }}<ins>{{
                    getSuggestedSentence(currentTitle, mistake)?.target
                  }}</ins
                  >{{ getSuggestedSentence(currentTitle, mistake)?.after }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 正文错误 -->
        <div class="error-block" v-if="contentCheck.length > 0">
          <div class="error-header">
            <el-icon color="#E6A23C"><Warning /></el-icon>
            <h4>正文问题（{{ contentCheck.length }}处）</h4>
          </div>
          <div
            class="error-item"
            v-for="(mistake, index) in contentCheck || []"
            :key="index"
          >
            <div class="error-meta">
              <!-- <el-tag>错误位置：{{ getMistakePosition(mistake) }}</el-tag> -->
              <el-tag type="danger"
                >错误类型：{{ getMistakeType(mistake) }}</el-tag
              >
              <el-tag> 错误说明：{{ getMistakeDescription(mistake) }} </el-tag>
            </div>
            <div
              class="original-snippet"
              v-if="
                getMistakeSentence(currentContent, mistake) &&
                !getSuggestedSentence(currentContent, mistake)
              "
            >
              <span class="snippet-label">问题片段</span>
              <span class="snippet-text">
                {{ getMistakeSentence(currentContent, mistake)?.before
                }}<mark
                  class="issue-word-action clickable"
                  @click="openPositiveWordDialog(currentContent, mistake)"
                >{{
                  getMistakeSentence(currentContent, mistake)?.target
                }}</mark
                >{{ getMistakeSentence(currentContent, mistake)?.after }}
              </span>
            </div>
            <div
              class="rewrite-preview"
              v-if="
                getMistakeSentence(currentContent, mistake) &&
                getSuggestedSentence(currentContent, mistake)
              "
            >
              <div class="rewrite-row original-row">
                <span class="rewrite-label">原文</span>
                <span class="rewrite-text">
                  {{ getMistakeSentence(currentContent, mistake)?.before
                  }}<del
                    class="issue-word-action clickable"
                    @click="openPositiveWordDialog(currentContent, mistake)"
                  >{{
                    getMistakeSentence(currentContent, mistake)?.target
                  }}</del
                  >{{ getMistakeSentence(currentContent, mistake)?.after }}
                </span>
              </div>
              <div class="rewrite-row suggestion-row">
                <span class="rewrite-label">建议</span>
                <span class="rewrite-text">
                  {{ getSuggestedSentence(currentContent, mistake)?.before
                  }}<ins>{{
                    getSuggestedSentence(currentContent, mistake)?.target
                  }}</ins
                  >{{ getSuggestedSentence(currentContent, mistake)?.after }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-editor">
        <!-- 预览模式 -->
        <div
          class="preview-area"
          v-html="highlightedContent"
          @mouseover="handleTextHover"
          @mouseleave="clearSuggestion"
        ></div>
      </div>
      <!-- 悬浮建议框 -->
      <div
        v-if="activeSuggestion"
        class="suggestion-popover"
        :style="popoverStyle"
      >
        <div class="popover-header">
          <span>问题详情</span>
          <el-tag size="small" type="danger">{{
            getMistakeType(activeSuggestion)
          }}</el-tag>
        </div>
        <div class="popover-content">
          <!-- <div class="popover-row">
            <span class="row-label">错误位置</span>
            <span>{{ activeSuggestion.position }}</span>
          </div> -->
          <div class="popover-row">
            <span class="row-label">错误说明</span>
            <span>{{ getMistakeDescription(activeSuggestion) }}</span>
          </div>
          <div class="popover-row">
            <span class="row-label">修改建议</span>
            <span>{{ getMistakeSuggestion(activeSuggestion) }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="positiveWordDialogVisible"
      title="加入正词"
      width="420px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form label-width="72px">
        <el-form-item label="词汇类型">
          <el-input model-value="正词" disabled />
        </el-form-item>
        <el-form-item label="词汇" required>
          <el-input
            v-model="positiveWordForm.word"
            maxlength="100"
            show-word-limit
            placeholder="请输入要加入正词列表的词汇"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="positiveWordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="positiveWordSubmitting" @click="submitPositiveWord">
          加入正词
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElLoading } from "element-plus";
import { Check, Warning } from "@element-plus/icons-vue";
import axios from "@/api/axios";
import { addWord, getWordDictErrorMessage, type WordType } from "@/api/wechatWordDict";

const props = defineProps({
  article_id: {
    type: String,
    required: true,
  },
});

const POSITIVE_WORD_TYPE = 1 as WordType;

// 响应式数据
const currentTitle = ref("");
const currentContent = ref("");
const checking = ref(false);
const contentCheck = ref<any[]>([]);
const titleCheck = ref<any[]>([]);
const activeSuggestion = ref<any | null>(null);
const popoverStyle = ref({});
const showResult = ref(false);
const positiveWordDialogVisible = ref(false);
const positiveWordSubmitting = ref(false);
const positiveWordForm = ref({
  word: "",
});

// 计算属性
const totalErrors = computed(
  () => titleCheck.value.length + contentCheck.value.length
);

function getMistakeType(mistake: any) {
  return mistake?.error_category_name || mistake?.error_category || "未知类型";
}

function getMistakeDescription(mistake: any) {
  return (
    mistake?.extra_info?.desc1 ||
    mistake?.desc ||
    mistake?.description ||
    "暂无说明"
  );
}

function getMistakeSuggestion(mistake: any) {
  return (
    mistake?.recommend_text ||
    mistake?.extra_info?.desc2 ||
    mistake?.suggestion ||
    "暂无修改建议"
  );
}

function hasMistakeSuggestion(mistake: any) {
  const suggestion = getMistakeSuggestion(mistake);
  return suggestion !== "暂无修改建议" && suggestion.trim() !== "";
}

function getSuggestedSentence(source: string, mistake: any) {
  const sentence = getMistakeSentence(source, mistake);
  if (!sentence || !hasMistakeSuggestion(mistake)) return null;

  return {
    before: sentence.before,
    target: getMistakeSuggestion(mistake),
    after: sentence.after,
  };
}

function getMistakePosition(mistake: any) {
  return `${mistake?.start_pos ?? "-"}-${mistake?.end_pos ?? "-"}`;
}

function getMistakeText(source: string, mistake: any) {
  const start = Number(mistake?.start_pos);
  const end = Number(mistake?.end_pos);
  if (!source || Number.isNaN(start) || Number.isNaN(end)) return "";
  return source.slice(start, end);
}

function getMistakeSentence(source: string, mistake: any) {
  const start = Number(mistake?.start_pos);
  const end = Number(mistake?.end_pos);
  if (!source || Number.isNaN(start) || Number.isNaN(end)) return null;

  const leftPunctuation = /[。！？；\n]/;
  const rightPunctuation = /[。！？；\n]/;
  let sentenceStart = start;
  let sentenceEnd = end;

  while (
    sentenceStart > 0 &&
    !leftPunctuation.test(source[sentenceStart - 1])
  ) {
    sentenceStart--;
  }
  while (
    sentenceEnd < source.length &&
    !rightPunctuation.test(source[sentenceEnd])
  ) {
    sentenceEnd++;
  }
  if (sentenceEnd < source.length) sentenceEnd++;

  return {
    before: source.slice(sentenceStart, start),
    target: source.slice(start, end),
    after: source.slice(end, sentenceEnd),
  };
}

function openPositiveWordDialog(source: string, mistake: any) {
  const word = getMistakeSentence(source, mistake)?.target || getMistakeText(source, mistake);
  if (!word.trim()) {
    ElMessage.warning("未找到可加入的词汇");
    return;
  }

  positiveWordForm.value.word = word.trim();
  positiveWordDialogVisible.value = true;
}

async function submitPositiveWord() {
  const word = positiveWordForm.value.word.trim();
  if (!word) {
    ElMessage.warning("请输入词汇");
    return;
  }

  positiveWordSubmitting.value = true;
  try {
    await addWord({
      word,
      type: POSITIVE_WORD_TYPE,
    });
    ElMessage.success("已加入正词列表");
    positiveWordDialogVisible.value = false;
  } catch (err: any) {
    ElMessage.error(getWordDictErrorMessage(err, "加入正词失败"));
  } finally {
    positiveWordSubmitting.value = false;
  }
}

// 高亮标题
const highlightedTitle = computed(() => {
  let title = currentTitle.value;
  const mistakes = titleCheck?.value || [];
  mistakes
    .slice()
    .sort((a, b) => b.start_pos - a.start_pos)
    .forEach((m) => {
      title = insertHighlight(title, m.start_pos, m.end_pos, "highlight_title");
    });
  return title;
});

// 插入高亮标签
const insertHighlight = (str: string, start: number, end: number, className: string) => {
  return (
    str.slice(0, start) +
    `<span class="${className}" data-start="${start}">` +
    str.slice(start, end) +
    "</span>" +
    str.slice(end)
  );
};

// 高亮内容生成
const highlightedContent = computed(() => {
  const text = currentContent.value;
  const mistakes = contentCheck.value || [];

  // 构建 index → classSet 映射
  const classMap: Record<number, Set<string>> = {};
  for (const m of mistakes) {
    const cls = getErrorClass(m.error_type_id);
    for (let i = m.start_pos; i < m.end_pos; i++) {
      if (!classMap[i]) classMap[i] = new Set();
      classMap[i].add(cls);
    }
  }

  let result = "";
  let prevClasses: string[] | null = null;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const classes = classMap[i] ? Array.from(classMap[i]).sort() : null;

    const sameAsPrev =
      prevClasses &&
      classes &&
      classes.length === prevClasses.length &&
      classes.every((c, idx) => c === prevClasses![idx]);

    if (!sameAsPrev) {
      // 关闭旧 span
      if (prevClasses) {
        result += "</span>";
      }
      // 开启新 span
      if (classes) {
        result += `<span class="highlight_content ${classes.join(
          " "
        )}" data-start="${i}">`;
      }
    }

    result += ch;
    prevClasses = classes;
  }

  if (prevClasses) {
    result += "</span>";
  }

  return result;
});

const errorClassMap: Record<number, string> = {
  1: "level-low-prob", // 低概率
  2: "level-high-prob", // 高概率
  3: "level-sensitive-word", // 敏感词
  4: "level-custom-sensitive", // 自定义敏感词
  5: "level-custom-error", // 自定义错词
  8: "level-punctuation", // 标点
  9: "level-custom-focus", // 自定义重点词
  11: "level-advanced-proof", // 高级校对
  12: "level-personal-leader", // 个人领导人词库
  13: "level-team-leader", // 团队领导人词库
  14: "level-lexical", // 字词错误
  15: "level-collocation", // 搭配不当
  16: "level-word-usage", // 用词不当
  17: "level-semantic", // 语义错误
  18: "level-other", // 其他错误
  19: "level-missing-part", // 成分残缺
};

function getErrorClass(error_type_id: number): string {
  return errorClassMap[error_type_id] || "level-unknown";
}

function handleTitleHover(e: MouseEvent) {
  const target = (e.target as HTMLElement | null)?.closest(".highlight_title") as HTMLElement | null;
  if (!target) {
    activeSuggestion.value = null;
    return;
  }

  const startPos = parseInt(target.dataset.start || "0");
  const mistake = titleCheck.value.find(
    (m) => m.start_pos <= startPos && m.end_pos >= startPos
  );

  if (!mistake) return;

  const rect = target.getBoundingClientRect();
  popoverStyle.value = {
    top: `${rect.bottom + window.scrollY + 8}px`,
    left: `${rect.left + window.scrollX}px`,
  };
  activeSuggestion.value = {
    ...mistake,
    category: getMistakeType(mistake),
    position: getMistakePosition(mistake),
    originalText: getMistakeText(currentTitle.value, mistake),
  };
}

// 点击高亮文本
function handleTextHover(e: MouseEvent) {
  const target = (e.target as HTMLElement | null)?.closest(".highlight_content") as HTMLElement | null;
  if (!target) {
    activeSuggestion.value = null;
    return;
  }

  const startPos = parseInt(target.dataset.start || "0");
  const mistake = contentCheck.value.find(
    (m) => m.start_pos <= startPos && m.end_pos >= startPos
  );
  if (!mistake) return;

  const rect = target.getBoundingClientRect();
  popoverStyle.value = {
    top: `${rect.bottom + window.scrollY + 8}px`,
    left: `${rect.left + window.scrollX}px`,
  };
  activeSuggestion.value = {
    ...mistake,
    category: getMistakeType(mistake),
    position: getMistakePosition(mistake),
    originalText: getMistakeText(currentContent.value, mistake),
  };
}
// 鼠标移出时隐藏弹窗
function clearSuggestion() {
  activeSuggestion.value = null;
}

// 开始校对
const startCheck = async () => {
  if (!currentTitle.value || !currentContent.value) {
    ElMessage.warning("请填写标题和内容");
    return;
  }

  checking.value = true;
  const loading = ElLoading.service({ fullscreen: true });

  try {
    const response = await axios.post(
      "/wechat/proofread",
      {
        title: currentTitle.value,
        content: currentContent.value,
      },
      { timeout: 60000 }
    );

    // 更新校验结果
    await handleSave(response.data.content_check, response.data.title_check);

    await loadContent();

    ElMessage.success(`校对完成，发现${totalErrors.value}处问题`);
  } catch (error: any) {
    ElMessage.error("校验失败：" + (error?.message || "请求失败"));
  } finally {
    loading.close();
    checking.value = false;
  }
};

async function handleSave(contentCheck: any[], titleCheck: any[]) {
  const loading = ElLoading.service({ fullscreen: true });
  try {
    await axios.put(
      `/wechat/articles/${props.article_id}/check`,
      {
        check_result: {
          content_check: contentCheck,
          title_check: titleCheck,
        },
      },
      { timeout: 60000 }
    );
  } catch (error: any) {
    console.log(error?.message || error);
  } finally {
    loading.close();
  }
}

onMounted(() => {
  loadContent();
});

const is_detected = ref(false);
async function loadContent() {
  const loading = ElLoading.service({ fullscreen: true });
  try {
    const resp = await axios.get(`/wechat/articles/${props.article_id}/text`, {
      timeout: 60000,
    });
    currentTitle.value = resp.data.title;
    currentContent.value = resp.data.body;

    contentCheck.value = resp.data?.content_check || [];
    titleCheck.value = resp.data?.title_check || [];
    is_detected.value = resp.data?.is_detected || false;

    if (contentCheck.value != null && titleCheck.value != null) {
      showResult.value = true;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.close();
  }
}
</script>

<style scoped lang="scss">
.edit-panel {
  flex: 1;
  padding: 24px;
  overflow-y: auto;

  .input-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    .title-input {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 20px;
      padding: 18px 20px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
      border: 1px solid #e8eef7;

      :deep(.el-input__wrapper) {
        border-radius: 6px;
        &.error-border {
          box-shadow: 0 0 0 1px #f56c6c inset;
        }
      }
    }

    .content-editor {
      border: 1px solid #dcdfe6;
      box-sizing: border-box;
      width: 100%;
      border-radius: 8px;
      display: flex;
      flex-direction: column;

      .editor-toolbar {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid #ebeef5;
        background: #fafafa;
        box-sizing: border-box;

        .el-icon {
          margin-right: 3px;
        }

        .el-button {
          &.active {
            border-color: #409eff;
            background: #ecf5ff;
          }

          margin-right: 0;
          box-sizing: border-box;
        }
      }

      .edit-area {
        width: 100%;
        padding: 16px;
        height: 100%;
        border: none;
        resize: none;
        outline: none; // 去除选中状态边框
        box-sizing: border-box;
        font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.5;
        border-radius: 6px;
      }

      .preview-area {
        min-height: 240px;
        border-radius: 8px;
        padding: 20px;
        border: none;
        resize: none;
        box-sizing: border-box;
        overflow: visible;
        position: relative;
        line-height: 1.8;
        font-size: 16px;
        color: #303133;
        /* 保留换行和空格 */
        white-space: pre-wrap;

        :deep(.highlight_content) {
          background: #fff3eb;
          border-bottom: 2px solid #ff8c00;
          cursor: pointer;
          transition: all 0.2s;
        }
        :deep(.highlight_content:hover) {
          background: #ffe4d3;
        }
        :deep(.highlight_content.active) {
          background: #ffd3b8;
          box-shadow: 0 0 4px rgba(255, 140, 0, 0.3);
        }
      }
    }
  }

  .result-section {
    margin: 20px 0;
    background: #ffffff;
    border-radius: 10px;
    padding: 18px;
    border: 1px solid #ebeef5;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

    .result-section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;

      h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #303133;
      }

      p {
        margin: 4px 0 0;
        font-size: 13px;
        color: #909399;
      }
    }

    .error-block {
      margin-top: 20px;

      .error-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        h4 {
          margin-left: 8px;
          color: #606266;
        }
      }

      .error-item {
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        background: #fafafa;

        .error-meta {
          margin-bottom: 8px;

          .el-tag {
            margin-right: 8px;
          }
        }

        .original-snippet {
          margin: 10px 0;
          padding: 10px 12px;
          border: 1px solid transparent;
          border-radius: 6px;
          background: #f8f9fc;
          line-height: 1.7;
          transition: all 0.18s ease;

          .snippet-label {
            display: inline-block;
            margin-right: 8px;
            color: #909399;
            font-size: 12px;
            font-weight: 600;
          }

          .snippet-text {
            color: #303133;
          }

          mark {
            padding: 1px 4px;
            border-radius: 4px;
            background: #fff3eb;
            color: #c45614;
            font-weight: 600;
          }

        }

        .suggestions {
          margin-top: 8px;
          .el-tag {
            margin-right: 8px;
            cursor: pointer;
            transition: transform 0.2s;

            &:hover {
              transform: translateY(-2px);
            }
          }
        }

        .rewrite-preview {
          margin-top: 12px;
          padding: 12px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #ebeef5;
        }

        .rewrite-row {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 10px;
          align-items: flex-start;
          line-height: 1.7;
        }

        .rewrite-label {
          display: inline-flex;
          justify-content: center;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .rewrite-text {
          color: #303133;
        }

        .rewrite-arrow {
          margin: 6px 0 6px 21px;
          color: #909399;
          font-size: 14px;
        }

        .original-row .rewrite-label {
          color: #c45614;
          background: #fdf6ec;
        }

        .suggestion-row .rewrite-label {
          color: #529b2e;
          background: #f0f9eb;
        }

        del {
          padding: 1px 4px;
          border-radius: 4px;
          color: #c45614;
          background: #fdf6ec;
          text-decoration-color: #c45614;
          text-decoration-thickness: 2px;
          transition: all 0.18s ease;
        }

        .issue-word-action.clickable {
          display: inline-block;
          cursor: pointer;
        }

        .issue-word-action.clickable:hover {
          color: #9a3412;
          background: #fed7aa;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
          transform: translateY(-1px);
        }

        ins {
          padding: 1px 4px;
          border-radius: 4px;
          color: #529b2e;
          background: #f0f9eb;
          font-weight: 600;
          text-decoration: none;
        }
      }
    }
  }
}

.suggestion-popover {
  position: fixed;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  max-width: 450px;
  min-width: 300px;

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid #ebeef5;
    font-weight: 500;
    color: #303133;
  }

  .popover-content {
    padding: 12px;

    .popover-row {
      display: grid;
      grid-template-columns: 64px 1fr;
      gap: 10px;
      margin-bottom: 10px;
      line-height: 1.6;
      font-size: 13px;

      .row-label {
        color: #909399;
        font-weight: 600;
      }

      .original-inline {
        color: #c45614;
        font-weight: 600;
      }
    }

    .suggestion-item {
      display: flex;
      align-items: flex-start;
      line-height: 1.6;

      .el-icon {
        margin-right: 8px;
        margin-top: 3px;
        color: #409eff;
      }
    }
  }
}

/* 标题预览高亮样式 */
.title-preview {
  font-size: 24px;
  line-height: 1.45;
  color: #1f2d3d;
  font-weight: 700;
  letter-spacing: 0.2px;
  white-space: pre-wrap;

  :deep(.highlight_title) {
    background: #ffebeb;
    border-bottom: 2px solid #ff2200;
    cursor: pointer;
    transition: all 0.2s;
  }
  :deep(.highlight_title:hover) {
    background: #ffd3d3;
  }
  :deep(.highlight_title.active) {
    background: #ffb8b8;
    box-shadow: 0 0 4px rgba(255, 140, 0, 0.3);
  }
}

/* styles.css */
/* 低概率：灰色，提示可忽略 */
.level-low-prob {
  color: #888;
  background-color: #f5f5f5;
}

/* 高概率：橙色，需重点关注 */
.level-high-prob {
  color: #d97706;
  background-color: #ffedd5;
}

/* 敏感词：红色警告 */
.level-sensitive-word {
  color: #b91c1c;
  background-color: #fee2e2;
}

/* 自定义敏感词：深红 */
.level-custom-sensitive {
  color: #7f1d1d;
  background-color: #fca5a5;
}

/* 自定义错词：紫色 */
.level-custom-error {
  color: #6b21a8;
  background-color: #e9d5ff;
}

/* 标点：蓝色 */
.level-punctuation {
  color: #1e3a8a;
  background-color: #dbeafe;
}

/* 自定义重点词：深蓝 */
.level-custom-focus {
  color: #1e40af;
  background-color: #c7d2fe;
}

/* 高级校对：青色 */
.level-advanced-proof {
  color: #0f766e;
  background-color: #ccfbf1;
}

/* 个人领导人词库：褐色 */
.level-personal-leader {
  color: #92400e;
  background-color: #ffe8d6;
}

/* 团队领导人词库：橄榄绿 */
.level-team-leader {
  color: #365314;
  background-color: #ecfccb;
}

/* 字词错误：深青 */
.level-lexical {
  color: #164e63;
  background-color: #cffafe;
}

/* 搭配不当：橄榄 */
.level-collocation {
  color: #4d7c0f;
  background-color: #ecfdf5;
}

/* 用词不当：墨绿 */
.level-word-usage {
  color: #065f46;
  background-color: #d1fae5;
}

/* 语义错误：靛青 */
.level-semantic {
  color: #4338ca;
  background-color: #ede9fe;
}

/* 其他错误：黑色 */
.level-other {
  color: #111;
  background-color: #f3f4f6;
}

/* 成分残缺：暗灰 */
.level-missing-part {
  color: #374151;
  background-color: #e5e7eb;
}

/* 未知等级：浅灰提示 */
.level-unknown {
  color: #6b7280;
  background-color: #f9fafb;
}
</style>
