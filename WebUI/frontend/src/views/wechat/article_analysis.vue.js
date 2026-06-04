import { ref, computed, onMounted } from "vue";
import { ElMessage, ElLoading } from "element-plus";
import { Check, Warning } from "@element-plus/icons-vue";
import axios from "@/api/axios";
import { addWord, getWordDictErrorMessage } from "@/api/wechatWordDict";
const props = defineProps({
    article_id: {
        type: String,
        required: true,
    },
});
const POSITIVE_WORD_TYPE = 1;
// 响应式数据
const currentTitle = ref("");
const currentContent = ref("");
const checking = ref(false);
const contentCheck = ref([]);
const titleCheck = ref([]);
const activeSuggestion = ref(null);
const popoverStyle = ref({});
const showResult = ref(false);
const positiveWordDialogVisible = ref(false);
const positiveWordSubmitting = ref(false);
const positiveWordForm = ref({
    word: "",
});
// 计算属性
const totalErrors = computed(() => titleCheck.value.length + contentCheck.value.length);
function getMistakeType(mistake) {
    return mistake?.error_category_name || mistake?.error_category || "未知类型";
}
function getMistakeDescription(mistake) {
    return (mistake?.extra_info?.desc1 ||
        mistake?.desc ||
        mistake?.description ||
        "暂无说明");
}
function getMistakeSuggestion(mistake) {
    return (mistake?.recommend_text ||
        mistake?.extra_info?.desc2 ||
        mistake?.suggestion ||
        "暂无修改建议");
}
function hasMistakeSuggestion(mistake) {
    const suggestion = getMistakeSuggestion(mistake);
    return suggestion !== "暂无修改建议" && suggestion.trim() !== "";
}
function getSuggestedSentence(source, mistake) {
    const sentence = getMistakeSentence(source, mistake);
    if (!sentence || !hasMistakeSuggestion(mistake))
        return null;
    return {
        before: sentence.before,
        target: getMistakeSuggestion(mistake),
        after: sentence.after,
    };
}
function getMistakePosition(mistake) {
    return `${mistake?.start_pos ?? "-"}-${mistake?.end_pos ?? "-"}`;
}
function getMistakeText(source, mistake) {
    const start = Number(mistake?.start_pos);
    const end = Number(mistake?.end_pos);
    if (!source || Number.isNaN(start) || Number.isNaN(end))
        return "";
    return source.slice(start, end);
}
function getMistakeSentence(source, mistake) {
    const start = Number(mistake?.start_pos);
    const end = Number(mistake?.end_pos);
    if (!source || Number.isNaN(start) || Number.isNaN(end))
        return null;
    const leftPunctuation = /[。！？；\n]/;
    const rightPunctuation = /[。！？；\n]/;
    let sentenceStart = start;
    let sentenceEnd = end;
    while (sentenceStart > 0 &&
        !leftPunctuation.test(source[sentenceStart - 1])) {
        sentenceStart--;
    }
    while (sentenceEnd < source.length &&
        !rightPunctuation.test(source[sentenceEnd])) {
        sentenceEnd++;
    }
    if (sentenceEnd < source.length)
        sentenceEnd++;
    return {
        before: source.slice(sentenceStart, start),
        target: source.slice(start, end),
        after: source.slice(end, sentenceEnd),
    };
}
function openPositiveWordDialog(source, mistake) {
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
    }
    catch (err) {
        ElMessage.error(getWordDictErrorMessage(err, "加入正词失败"));
    }
    finally {
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
const insertHighlight = (str, start, end, className) => {
    return (str.slice(0, start) +
        `<span class="${className}" data-start="${start}">` +
        str.slice(start, end) +
        "</span>" +
        str.slice(end));
};
// 高亮内容生成
const highlightedContent = computed(() => {
    const text = currentContent.value;
    const mistakes = contentCheck.value || [];
    // 构建 index → classSet 映射
    const classMap = {};
    for (const m of mistakes) {
        const cls = getErrorClass(m.error_type_id);
        for (let i = m.start_pos; i < m.end_pos; i++) {
            if (!classMap[i])
                classMap[i] = new Set();
            classMap[i].add(cls);
        }
    }
    let result = "";
    let prevClasses = null;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const classes = classMap[i] ? Array.from(classMap[i]).sort() : null;
        const sameAsPrev = prevClasses &&
            classes &&
            classes.length === prevClasses.length &&
            classes.every((c, idx) => c === prevClasses[idx]);
        if (!sameAsPrev) {
            // 关闭旧 span
            if (prevClasses) {
                result += "</span>";
            }
            // 开启新 span
            if (classes) {
                result += `<span class="highlight_content ${classes.join(" ")}" data-start="${i}">`;
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
const errorClassMap = {
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
function getErrorClass(error_type_id) {
    return errorClassMap[error_type_id] || "level-unknown";
}
function handleTitleHover(e) {
    const target = e.target?.closest(".highlight_title");
    if (!target) {
        activeSuggestion.value = null;
        return;
    }
    const startPos = parseInt(target.dataset.start || "0");
    const mistake = titleCheck.value.find((m) => m.start_pos <= startPos && m.end_pos >= startPos);
    if (!mistake)
        return;
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
function handleTextHover(e) {
    const target = e.target?.closest(".highlight_content");
    if (!target) {
        activeSuggestion.value = null;
        return;
    }
    const startPos = parseInt(target.dataset.start || "0");
    const mistake = contentCheck.value.find((m) => m.start_pos <= startPos && m.end_pos >= startPos);
    if (!mistake)
        return;
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
        const response = await axios.post("/wechat/proofread", {
            title: currentTitle.value,
            content: currentContent.value,
        }, { timeout: 60000 });
        // 更新校验结果
        await handleSave(response.data.content_check, response.data.title_check);
        await loadContent();
        ElMessage.success(`校对完成，发现${totalErrors.value}处问题`);
    }
    catch (error) {
        ElMessage.error("校验失败：" + (error?.message || "请求失败"));
    }
    finally {
        loading.close();
        checking.value = false;
    }
};
async function handleSave(contentCheck, titleCheck) {
    const loading = ElLoading.service({ fullscreen: true });
    try {
        await axios.put(`/wechat/articles/${props.article_id}/check`, {
            check_result: {
                content_check: contentCheck,
                title_check: titleCheck,
            },
        }, { timeout: 60000 });
    }
    catch (error) {
        console.log(error?.message || error);
    }
    finally {
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
    }
    catch (err) {
        console.error(err);
    }
    finally {
        loading.close();
    }
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['highlight_content', 'highlight_content', 'active', 'el-tag', 'rewrite-label', 'rewrite-label', 'issue-word-action', 'clickable', 'el-icon', 'highlight_title', 'highlight_title', 'active',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("edit-panel") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("input-section") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("title-input") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseover: (__VLS_ctx.handleTitleHover) },
    ...{ onMouseleave: (__VLS_ctx.clearSuggestion) },
    ...{ class: ("title-preview") },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedTitle) }, null, null);
const __VLS_0 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.checking)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.checking)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.startCheck)
};
let __VLS_3;
let __VLS_4;
{
    const { icon: __VLS_thisSlot } = __VLS_5.slots;
    const __VLS_8 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
    const __VLS_14 = {}.Check;
    /** @type { [typeof __VLS_components.Check, ] } */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({}));
    const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
    __VLS_13.slots.default;
    var __VLS_13;
}
(__VLS_ctx.is_detected ? "重新检测" : "开始检测");
__VLS_5.slots.default;
var __VLS_5;
if (__VLS_ctx.showResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-section") },
    });
    const __VLS_20 = {}.ElAlert;
    /** @type { [typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ] } */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        title: ((!__VLS_ctx.is_detected
            ? '尚未进行检测'
            : __VLS_ctx.totalErrors === 0
                ? '未发现任何错误'
                : `共发现 ${__VLS_ctx.totalErrors} 处问题（标题 ${__VLS_ctx.titleCheck.length} 处，正文 ${__VLS_ctx.contentCheck.length} 处）`)),
        type: ((!__VLS_ctx.is_detected ? 'info' : __VLS_ctx.totalErrors === 0 ? 'success' : 'warning')),
        showIcon: (true),
        closable: ((false)),
    }));
    const __VLS_22 = __VLS_21({
        title: ((!__VLS_ctx.is_detected
            ? '尚未进行检测'
            : __VLS_ctx.totalErrors === 0
                ? '未发现任何错误'
                : `共发现 ${__VLS_ctx.totalErrors} 处问题（标题 ${__VLS_ctx.titleCheck.length} 处，正文 ${__VLS_ctx.contentCheck.length} 处）`)),
        type: ((!__VLS_ctx.is_detected ? 'info' : __VLS_ctx.totalErrors === 0 ? 'success' : 'warning')),
        showIcon: (true),
        closable: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    if (__VLS_ctx.titleCheck.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-block") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-header") },
        });
        const __VLS_26 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
            color: ("#F56C6C"),
        }));
        const __VLS_28 = __VLS_27({
            color: ("#F56C6C"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        const __VLS_32 = {}.Warning;
        /** @type { [typeof __VLS_components.Warning, ] } */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
        const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_31.slots.default;
        var __VLS_31;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        (__VLS_ctx.titleCheck.length);
        for (const [mistake, idx] of __VLS_getVForSourceType((__VLS_ctx.titleCheck || []))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error-item") },
                key: ((idx)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error-meta") },
            });
            const __VLS_38 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
                type: ("danger"),
            }));
            const __VLS_40 = __VLS_39({
                type: ("danger"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_39));
            (__VLS_ctx.getMistakeType(mistake));
            __VLS_43.slots.default;
            var __VLS_43;
            const __VLS_44 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
            (__VLS_ctx.getMistakeDescription(mistake));
            __VLS_49.slots.default;
            var __VLS_49;
            if (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake) &&
                !__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("original-snippet") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("snippet-label") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("snippet-text") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake)?.before);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.mark, __VLS_intrinsicElements.mark)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.showResult)))
                                return;
                            if (!((__VLS_ctx.titleCheck.length > 0)))
                                return;
                            if (!((__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake) &&
                                !__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake))))
                                return;
                            __VLS_ctx.openPositiveWordDialog(__VLS_ctx.currentTitle, mistake);
                        } },
                    ...{ class: ("issue-word-action clickable") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake)?.target);
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake)?.after);
            }
            if (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake) &&
                __VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("rewrite-preview") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("rewrite-row original-row") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-label") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-text") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake)?.before);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.del, __VLS_intrinsicElements.del)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.showResult)))
                                return;
                            if (!((__VLS_ctx.titleCheck.length > 0)))
                                return;
                            if (!((__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake) &&
                                __VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake))))
                                return;
                            __VLS_ctx.openPositiveWordDialog(__VLS_ctx.currentTitle, mistake);
                        } },
                    ...{ class: ("issue-word-action clickable") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake)?.target);
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentTitle, mistake)?.after);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("rewrite-row suggestion-row") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-label") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-text") },
                });
                (__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake)?.before);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.ins, __VLS_intrinsicElements.ins)({});
                (__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake)?.target);
                (__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentTitle, mistake)?.after);
            }
        }
    }
    if (__VLS_ctx.contentCheck.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-block") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-header") },
        });
        const __VLS_50 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
            color: ("#E6A23C"),
        }));
        const __VLS_52 = __VLS_51({
            color: ("#E6A23C"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        const __VLS_56 = {}.Warning;
        /** @type { [typeof __VLS_components.Warning, ] } */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
        const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_55.slots.default;
        var __VLS_55;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        (__VLS_ctx.contentCheck.length);
        for (const [mistake, index] of __VLS_getVForSourceType((__VLS_ctx.contentCheck || []))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error-item") },
                key: ((index)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("error-meta") },
            });
            const __VLS_62 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
                type: ("danger"),
            }));
            const __VLS_64 = __VLS_63({
                type: ("danger"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_63));
            (__VLS_ctx.getMistakeType(mistake));
            __VLS_67.slots.default;
            var __VLS_67;
            const __VLS_68 = {}.ElTag;
            /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
            const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
            (__VLS_ctx.getMistakeDescription(mistake));
            __VLS_73.slots.default;
            var __VLS_73;
            if (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake) &&
                !__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("original-snippet") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("snippet-label") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("snippet-text") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake)?.before);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.mark, __VLS_intrinsicElements.mark)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.showResult)))
                                return;
                            if (!((__VLS_ctx.contentCheck.length > 0)))
                                return;
                            if (!((__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake) &&
                                !__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake))))
                                return;
                            __VLS_ctx.openPositiveWordDialog(__VLS_ctx.currentContent, mistake);
                        } },
                    ...{ class: ("issue-word-action clickable") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake)?.target);
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake)?.after);
            }
            if (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake) &&
                __VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("rewrite-preview") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("rewrite-row original-row") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-label") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-text") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake)?.before);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.del, __VLS_intrinsicElements.del)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.showResult)))
                                return;
                            if (!((__VLS_ctx.contentCheck.length > 0)))
                                return;
                            if (!((__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake) &&
                                __VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake))))
                                return;
                            __VLS_ctx.openPositiveWordDialog(__VLS_ctx.currentContent, mistake);
                        } },
                    ...{ class: ("issue-word-action clickable") },
                });
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake)?.target);
                (__VLS_ctx.getMistakeSentence(__VLS_ctx.currentContent, mistake)?.after);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("rewrite-row suggestion-row") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-label") },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("rewrite-text") },
                });
                (__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake)?.before);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.ins, __VLS_intrinsicElements.ins)({});
                (__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake)?.target);
                (__VLS_ctx.getSuggestedSentence(__VLS_ctx.currentContent, mistake)?.after);
            }
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("content-editor") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMouseover: (__VLS_ctx.handleTextHover) },
    ...{ onMouseleave: (__VLS_ctx.clearSuggestion) },
    ...{ class: ("preview-area") },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedContent) }, null, null);
if (__VLS_ctx.activeSuggestion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("suggestion-popover") },
        ...{ style: ((__VLS_ctx.popoverStyle)) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("popover-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_74 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        size: ("small"),
        type: ("danger"),
    }));
    const __VLS_76 = __VLS_75({
        size: ("small"),
        type: ("danger"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    (__VLS_ctx.getMistakeType(__VLS_ctx.activeSuggestion));
    __VLS_79.slots.default;
    var __VLS_79;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("popover-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("popover-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("row-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.getMistakeDescription(__VLS_ctx.activeSuggestion));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("popover-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("row-label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.getMistakeSuggestion(__VLS_ctx.activeSuggestion));
}
const __VLS_80 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: ((__VLS_ctx.positiveWordDialogVisible)),
    title: ("加入正词"),
    width: ("420px"),
    appendToBody: (true),
    destroyOnClose: (true),
    closeOnClickModal: ((false)),
}));
const __VLS_82 = __VLS_81({
    modelValue: ((__VLS_ctx.positiveWordDialogVisible)),
    title: ("加入正词"),
    width: ("420px"),
    appendToBody: (true),
    destroyOnClose: (true),
    closeOnClickModal: ((false)),
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
const __VLS_86 = {}.ElForm;
/** @type { [typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ] } */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
    labelWidth: ("72px"),
}));
const __VLS_88 = __VLS_87({
    labelWidth: ("72px"),
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
const __VLS_92 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: ("词汇类型"),
}));
const __VLS_94 = __VLS_93({
    label: ("词汇类型"),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
const __VLS_98 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    modelValue: ("正词"),
    disabled: (true),
}));
const __VLS_100 = __VLS_99({
    modelValue: ("正词"),
    disabled: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_97.slots.default;
var __VLS_97;
const __VLS_104 = {}.ElFormItem;
/** @type { [typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ] } */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    label: ("词汇"),
    required: (true),
}));
const __VLS_106 = __VLS_105({
    label: ("词汇"),
    required: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
const __VLS_110 = {}.ElInput;
/** @type { [typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ] } */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    modelValue: ((__VLS_ctx.positiveWordForm.word)),
    maxlength: ("100"),
    showWordLimit: (true),
    placeholder: ("请输入要加入正词列表的词汇"),
}));
const __VLS_112 = __VLS_111({
    modelValue: ((__VLS_ctx.positiveWordForm.word)),
    maxlength: ("100"),
    showWordLimit: (true),
    placeholder: ("请输入要加入正词列表的词汇"),
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
__VLS_109.slots.default;
var __VLS_109;
__VLS_91.slots.default;
var __VLS_91;
{
    const { footer: __VLS_thisSlot } = __VLS_85.slots;
    const __VLS_116 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ 'onClick': {} },
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_122;
    const __VLS_123 = {
        onClick: (...[$event]) => {
            __VLS_ctx.positiveWordDialogVisible = false;
        }
    };
    let __VLS_119;
    let __VLS_120;
    __VLS_121.slots.default;
    var __VLS_121;
    const __VLS_124 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.positiveWordSubmitting)),
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.positiveWordSubmitting)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_130;
    const __VLS_131 = {
        onClick: (__VLS_ctx.submitPositiveWord)
    };
    let __VLS_127;
    let __VLS_128;
    __VLS_129.slots.default;
    var __VLS_129;
}
__VLS_85.slots.default;
var __VLS_85;
['edit-panel', 'input-section', 'title-input', 'title-preview', 'result-section', 'error-block', 'error-header', 'error-item', 'error-meta', 'original-snippet', 'snippet-label', 'snippet-text', 'issue-word-action', 'clickable', 'rewrite-preview', 'rewrite-row', 'original-row', 'rewrite-label', 'rewrite-text', 'issue-word-action', 'clickable', 'rewrite-row', 'suggestion-row', 'rewrite-label', 'rewrite-text', 'error-block', 'error-header', 'error-item', 'error-meta', 'original-snippet', 'snippet-label', 'snippet-text', 'issue-word-action', 'clickable', 'rewrite-preview', 'rewrite-row', 'original-row', 'rewrite-label', 'rewrite-text', 'issue-word-action', 'clickable', 'rewrite-row', 'suggestion-row', 'rewrite-label', 'rewrite-text', 'content-editor', 'preview-area', 'suggestion-popover', 'popover-header', 'popover-content', 'popover-row', 'row-label', 'popover-row', 'row-label',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            Warning: Warning,
            currentTitle: currentTitle,
            currentContent: currentContent,
            checking: checking,
            contentCheck: contentCheck,
            titleCheck: titleCheck,
            activeSuggestion: activeSuggestion,
            popoverStyle: popoverStyle,
            showResult: showResult,
            positiveWordDialogVisible: positiveWordDialogVisible,
            positiveWordSubmitting: positiveWordSubmitting,
            positiveWordForm: positiveWordForm,
            totalErrors: totalErrors,
            getMistakeType: getMistakeType,
            getMistakeDescription: getMistakeDescription,
            getMistakeSuggestion: getMistakeSuggestion,
            getSuggestedSentence: getSuggestedSentence,
            getMistakeSentence: getMistakeSentence,
            openPositiveWordDialog: openPositiveWordDialog,
            submitPositiveWord: submitPositiveWord,
            highlightedTitle: highlightedTitle,
            highlightedContent: highlightedContent,
            handleTitleHover: handleTitleHover,
            handleTextHover: handleTextHover,
            clearSuggestion: clearSuggestion,
            startCheck: startCheck,
            is_detected: is_detected,
        };
    },
    props: {
        article_id: {
            type: String,
            required: true,
        },
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    props: {
        article_id: {
            type: String,
            required: true,
        },
    },
});
; /* PartiallyEnd: #4569/main.vue */
