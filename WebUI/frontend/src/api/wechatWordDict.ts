import axios from "@/api/axios";

export type WordType = 1 | 2 | 3 | 4;

export interface WordDictItem {
  id: number | string;
  word: string;
  type: WordType;
  recommend?: string;
  hint?: string;
  word_explain?: string;
  word_example?: string;
  create_time?: string;
  update_time?: string;
}

export interface WordListQuery {
  size: number;
  num: number;
  search: string;
  type?: WordType;
  types?: WordType[];
}

export interface WordPayload {
  id?: number | string;
  word: string;
  type: WordType;
  recommend?: string;
  hint?: string;
  word_explain?: string;
  word_example?: string;
}

export interface DeleteWordPayload {
  id: number | string;
  type: WordType;
}

export interface DeleteWordsPayload {
  ids: Array<number | string>;
  type: WordType;
}

export interface WordUploadResult {
  total: number;
  succeedCount: number;
  failCount: number;
  errors: Array<Record<string, any>>;
  message?: string;
}

export interface WordListResult {
  words: WordDictItem[];
  total: number;
}

export function getWordDictErrorMessage(error: any, fallback = "请求失败") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeWordType(value: any, fallback: WordType): WordType {
  const type = Number(value);
  return [1, 2, 3, 4].includes(type) ? (type as WordType) : fallback;
}

function normalizeWords(rawWords: any[], fallbackType: WordType): WordDictItem[] {
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

export function normalizeWordListResponse(data: any, fallbackType: WordType): WordListResult {
  const source = data?.word_dict || data?.data || data || {};
  const rawWords = source.words || source.items || [];
  const total = source.total ?? source._meta?.total_items ?? data?._meta?.total_items ?? rawWords.length;

  return {
    words: normalizeWords(Array.isArray(rawWords) ? rawWords : [], fallbackType),
    total: Number(total) || 0,
  };
}

export function normalizeUploadResult(data: any): WordUploadResult {
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

export function getResponseMessage(data: any, fallback = "操作成功") {
  return data?.message || data?.msg || data?.data?.message || fallback;
}

function getQueryTypes(query: WordListQuery): WordType[] {
  const types = query.types?.length ? query.types : query.type ? [query.type] : [3];
  return Array.from(new Set(types)).filter((type): type is WordType => [1, 2, 3, 4].includes(type));
}

function getWordSortValue(word: WordDictItem) {
  const time = word.create_time ? new Date(word.create_time).getTime() : NaN;
  if (!Number.isNaN(time)) return time;

  const id = Number(word.id);
  return Number.isNaN(id) ? 0 : id;
}

export async function listWords(query: WordListQuery): Promise<WordListResult> {
  const types = getQueryTypes(query);

  if (types.length === 1) {
    const type = types[0];
    const { data } = await axios.post("/wechat/wordDict", { ...query, type, types: undefined });
    return normalizeWordListResponse(data, type);
  }

  const requestSize = query.size * query.num;
  const results = await Promise.all(
    types.map(async (type) => {
      const { data } = await axios.post("/wechat/wordDict", {
        size: requestSize,
        num: 1,
        search: query.search,
        type,
      });
      return normalizeWordListResponse(data, type);
    })
  );

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

export async function addWord(payload: WordPayload) {
  const { data } = await axios.post("/wechat/addWord", payload);
  return data;
}

export async function updateWord(payload: Required<Pick<WordPayload, "id">> & WordPayload) {
  const { data } = await axios.post("/wechat/updateWord", payload);
  return data;
}

export async function deleteWord(payload: DeleteWordPayload) {
  const { data } = await axios.post("/wechat/deleteWord", payload);
  return data;
}

export async function deleteWords(payload: DeleteWordsPayload) {
  const { data } = await axios.post("/wechat/deleteWords", payload);
  return data;
}

export async function uploadWords(
  formData: FormData,
  onUploadProgress?: (progressEvent: any) => void
): Promise<WordUploadResult> {
  const { data } = await axios.post("/wechat/uploadWordFile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
    onUploadProgress,
  });

  return normalizeUploadResult(data);
}
