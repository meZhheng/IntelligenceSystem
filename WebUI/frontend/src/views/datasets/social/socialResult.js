export const SentimentLabelMapping = {
    0: "消极",
    1: "中立",
    2: "积极",
};
export function safeGet(obj, path, defaultVal = null) {
    try {
        return (path
            .split(".")
            .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj) ??
            defaultVal);
    }
    catch {
        return defaultVal;
    }
}
export function getSentimentLabel(label) {
    const key = Number(label);
    if (Number.isNaN(key) || !(key in SentimentLabelMapping))
        return "缺失";
    return SentimentLabelMapping[key];
}
export function getTagTypeByLabel(task, label = "") {
    const normalizedTask = task.toLowerCase();
    const normalizedLabel = label.toLowerCase();
    if (normalizedTask === "emotion") {
        if (["积极", "正面", "positive"].some((key) => normalizedLabel.includes(key)))
            return "success";
        if (["中立", "neutral"].some((key) => normalizedLabel.includes(key)))
            return "info";
        if (["消极", "负面", "negative"].some((key) => normalizedLabel.includes(key)))
            return "danger";
    }
    if (normalizedTask === "stance") {
        if (["支持", "support"].some((key) => normalizedLabel.includes(key)))
            return "success";
        if (["中立", "neutral"].some((key) => normalizedLabel.includes(key)))
            return "info";
        if (["反对", "oppose", "against"].some((key) => normalizedLabel.includes(key)))
            return "danger";
    }
    return "warning";
}
export function formatSocialResultsForDisplay(socialResults) {
    if (!Array.isArray(socialResults) || socialResults.length === 0)
        return [];
    const seen = new Set();
    const output = [];
    for (const result of socialResults) {
        const task = (result.task_name || "").toString().toLowerCase().trim();
        const label = (result.label ?? "").toString();
        const target = safeGet(result, "task_params.config.target") ||
            safeGet(result, "task_params.target") ||
            safeGet(result, "target") ||
            safeGet(result, "raw_result.target") ||
            null;
        let displayLabel = "";
        if (task === "emotion") {
            displayLabel = `情感：${label || "未知情感"}`;
        }
        else if (task === "stance") {
            displayLabel = `${target || "未知目标"}：${label || "未知立场"}`;
        }
        else {
            displayLabel = `${task || "task"}：${label || "N/A"}`;
            if (target)
                displayLabel += `（${target}）`;
        }
        const dedupeKey = `${task}|||${target ?? ""}|||${label}`;
        if (seen.has(dedupeKey))
            continue;
        seen.add(dedupeKey);
        output.push({
            key: `${result.id ?? result.data_id ?? output.length}-${dedupeKey}`,
            label: displayLabel,
            raw: typeof result.raw_result === "string"
                ? result.raw_result
                : JSON.stringify(result.raw_result ?? result.metrics ?? result.task_params ?? ""),
            type: getTagTypeByLabel(task, label),
        });
    }
    return output;
}
export function hasTaskResult(item, taskName) {
    return Array.isArray(item.social_result)
        ? item.social_result.some((result) => (result.task_name || "").toLowerCase() === taskName)
        : false;
}
export function isAnalyzed(item) {
    return Array.isArray(item.social_result) && item.social_result.length > 0;
}
export function getAnalysisStatus(item) {
    return isAnalyzed(item) ? "analyzed" : "unanalyzed";
}
export function getEmotionTagType(emotion) {
    const map = {
        积极: "success",
        中性: "warning",
        中立: "warning",
        消极: "danger",
    };
    return map[emotion] || "info";
}
export function getStanceTagType(stance) {
    const map = {
        支持: "success",
        中立: "warning",
        反对: "danger",
    };
    return map[stance] || "info";
}
export function stringifyRawResult(rawResult) {
    if (typeof rawResult === "string")
        return rawResult;
    return JSON.stringify(rawResult, null, 2);
}
