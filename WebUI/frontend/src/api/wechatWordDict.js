import axios from "@/api/axios";
export function getWordDictErrorMessage(error, fallback = "请求失败") {
    return (error?.response?.data?.message ||
        error?.response?.data?.msg ||
        error?.response?.data?.error ||
        error?.message ||
        fallback);
}
function normalizeWordType(value, fallback) {
    const type = Number(value);
    return [1, 2, 3, 4].includes(type) ? type : fallback;
}
function normalizeWords(rawWords, fallbackType) {
    return rawWords.map((item) => ({
        id: item.id,
        word: item.word || "",
        type: normalizeWordType(item.type, fallbackType),
        recommend: item.recommend || "",
        hint: item.hint || "",
        word_explain: item.word_explain || "",
        word_example: item.word_example || "",
        create_time: item.create_time || item.created_at || "",
        update_time: item.update_time || item.updated_at || "",
    }));
}
export function normalizeWordListResponse(data, fallbackType) {
    const source = data?.word_dict || data?.data || data || {};
    const rawWords = source.words || source.items || [];
    const total = source.total ?? source._meta?.total_items ?? data?._meta?.total_items ?? rawWords.length;
    return {
        words: normalizeWords(Array.isArray(rawWords) ? rawWords : [], fallbackType),
        total: Number(total) || 0,
    };
}
export function normalizeUploadResult(data) {
    const source = data?.word_upload || data?.data || data || {};
    const total = source.total ?? 0;
    const succeedCount = source.succeedCount ?? source.success_count ?? source.succeed_count ?? 0;
    const failCount = source.failCount ?? source.failure_count ?? source.fail_count ?? 0;
    return {
        total: Number(total) || 0,
        succeedCount: Number(succeedCount) || 0,
        failCount: Number(failCount) || 0,
        errors: Array.isArray(source.errors) ? source.errors : [],
        message: data?.message || data?.msg || source.message,
    };
}
export function getResponseMessage(data, fallback = "操作成功") {
    return data?.message || data?.msg || data?.data?.message || fallback;
}
function getQueryTypes(query) {
    const types = query.types?.length ? query.types : query.type ? [query.type] : [3];
    return Array.from(new Set(types)).filter((type) => [1, 2, 3, 4].includes(type));
}
function getWordSortValue(word) {
    const time = word.create_time ? new Date(word.create_time).getTime() : NaN;
    if (!Number.isNaN(time))
        return time;
    const id = Number(word.id);
    return Number.isNaN(id) ? 0 : id;
}
export async function listWords(query) {
    const types = getQueryTypes(query);
    if (types.length === 1) {
        const type = types[0];
        const { data } = await axios.post("/wechat/wordDict", { ...query, type, types: undefined });
        return normalizeWordListResponse(data, type);
    }
    const requestSize = query.size * query.num;
    const results = await Promise.all(types.map(async (type) => {
        const { data } = await axios.post("/wechat/wordDict", {
            size: requestSize,
            num: 1,
            search: query.search,
            type,
        });
        return normalizeWordListResponse(data, type);
    }));
    const words = results
        .flatMap((result) => result.words)
        .sort((left, right) => getWordSortValue(right) - getWordSortValue(left));
    const start = (query.num - 1) * query.size;
    const end = start + query.size;
    return {
        words: words.slice(start, end),
        total: results.reduce((sum, result) => sum + result.total, 0),
    };
}
export async function addWord(payload) {
    const { data } = await axios.post("/wechat/addWord", payload);
    return data;
}
export async function updateWord(payload) {
    const { data } = await axios.post("/wechat/updateWord", payload);
    return data;
}
export async function deleteWord(payload) {
    const { data } = await axios.post("/wechat/deleteWord", payload);
    return data;
}
export async function deleteWords(payload) {
    const { data } = await axios.post("/wechat/deleteWords", payload);
    return data;
}
export async function uploadWords(formData, onUploadProgress) {
    const { data } = await axios.post("/wechat/uploadWordFile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
        onUploadProgress,
    });
    return normalizeUploadResult(data);
}
