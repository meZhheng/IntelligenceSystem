import { ref, nextTick, computed, watch } from 'vue';
import axios from '@/api/axios';
import { ElMessage } from 'element-plus';
const props = withDefaults(defineProps(), {
    options: () => []
});
const emit = defineEmits(['update:modelValue', 'change', 'import']);
/* ---------------- v-model ---------------- */
const internalValue = ref(props.modelValue);
watch(() => props.modelValue, (newVal) => {
    internalValue.value = newVal;
});
watch(internalValue, v => emit('update:modelValue', v));
/* ---------------- search state ---------------- */
const searching = ref(false);
const searchText = ref('');
const page = ref(1);
const pageSize = 5;
const hasMore = ref(true);
const searchOptions = ref([]);
const ADD_KEY = '__ADD__';
/* ---------------- display options ---------------- */
const displayOptions = computed(() => {
    // 基础列表：如果是搜索状态就用搜索结果，否则用初始列表
    let list = !searchText.value ? [...props.options] : [...searchOptions.value];
    // 如果没有搜索结果，且有搜索文字，显示“新增”项
    if (searchText.value && list.length === 0 && !searching.value) {
        return [{
                value: ADD_KEY,
                label: `新增公众号: "${searchText.value}"`,
            }];
    }
    return list;
});
/* ---------------- remote search ---------------- */
let searchTimer = null;
function onRemoteSearch(q) {
    searchText.value = q.trim();
    page.value = 1;
    hasMore.value = true;
    searchOptions.value = [];
    if (searchTimer)
        clearTimeout(searchTimer);
    if (!q)
        return;
    searchTimer = setTimeout(() => {
        fetchPage();
    }, 400);
}
async function fetchPage() {
    if (!hasMore.value)
        return;
    searching.value = true;
    try {
        // call backend with page info
        const resp = await axios.post('/wechat/search_affiliation', {
            q: searchText.value,
            page: page.value,
            pageSize
        });
        // expected resp.data.items = [{ fakeid, name, desc, avatar, source }], resp.data.total
        const items = resp.data?.items || [];
        const total = resp.data?._meta.total_items || 0;
        // remove any ADD_KEY placeholder before merging (防止重复)
        searchOptions.value = searchOptions.value.filter(o => o.value !== ADD_KEY);
        // append new items
        const mapped = items.map((it) => ({
            value: it.value, // 使用 fakeid 作为 value（若你后端返回不同，请调整）
            label: it.label
        }));
        searchOptions.value.push(...mapped);
        // paging logic
        if (searchOptions.value.length >= total) {
            hasMore.value = false;
        }
        else {
            page.value += 1;
        }
    }
    catch (e) {
        ElMessage.error(e?.response?.data?.message || e?.message || '搜索公众号失败');
        hasMore.value = false;
    }
    finally {
        searching.value = false;
    }
}
/* ---------------- dropdown scroll load more ---------------- */
function onScroll(e) {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        fetchPage();
    }
}
/* ---------------- change ---------------- */
function onChange(val) {
    if (val === ADD_KEY) {
        // 1. 立即恢复为旧值，防止下次点击失效
        internalValue.value = props.modelValue || null;
        // 2. 打开弹窗
        openImportDialog();
        return;
    }
    // 关键：手动同步给父组件，确保 filters.affiliation 得到更新
    emit('update:modelValue', val);
    // 关键：在 nextTick 后触发 change，确保父组件 fetchArticles 时拿到的已经是新值
    nextTick(() => {
        emit('change', val);
    });
}
/* ========== 当用户在 select 里选择“新增”项时，打开弹窗并调用 crawl 接口 ========== */
const dialogVisible = ref(false);
const dialogLoading = ref(false);
const dialogSaving = ref(false);
const dialogItems = ref([]); // 存放 crawl 返回的 affiliations 列表
const selectedDialogFakeid = ref(null);
const dialogPage = ref(1);
const dialogHasMore = ref(true);
const API_CRAWL = '/wechat/crawl_affiliation';
const API_IMPORT = '/wechat/import_affiliation';
/* 打开弹窗并加载第一页（使用当前 searchText 作为 query） */
async function openImportDialog() {
    dialogVisible.value = true;
    dialogPage.value = 1;
    dialogHasMore.value = true;
    dialogItems.value = [];
    selectedDialogFakeid.value = null;
    await fetchDialogPage(1);
}
/* 抓取指定 page 的数据（由后端 crawl_affiliation 提供） */
async function fetchDialogPage(page) {
    // 如果没有更多数据或正在加载则直接返回
    if (!dialogHasMore.value && page !== 1)
        return;
    if (dialogLoading.value)
        return;
    // first page 使用 dialogLoading 的 spinner，后续页用 dialogLoading 也行（UI 会显示“正在加载更多...”）
    dialogLoading.value = true;
    try {
        const payload = {
            query: searchText.value || '',
            page: page,
            token: props.accountConfig.token,
            fingerprint: props.accountConfig.fingerprint,
            cookie: props.accountConfig.cookie
        };
        // optional: 如果有 fakeid/token/fingerprint/cookie 的场景，可以在 payload 中传入（这里按需求传递）
        const resp = await axios.post(API_CRAWL, payload);
        const affiliations = resp.data?.affiliations || [];
        const hasMoreResp = resp.data?.hasMore;
        // append 去重（以 fakeid 作为唯一键）
        const existFakeids = new Set(dialogItems.value.map(i => i.fakeid));
        const newOnes = affiliations.filter((a) => !existFakeids.has(a.fakeid));
        dialogItems.value.push(...newOnes);
        dialogHasMore.value = !!hasMoreResp;
        dialogPage.value = page + 1;
        // 默认选中第一项（仅当之前没有选中）
        if (!selectedDialogFakeid.value && dialogItems.value.length) {
            selectedDialogFakeid.value = dialogItems.value[0].fakeid;
        }
    }
    catch (e) {
        ElMessage.error(e?.response?.data?.message || e?.message || '抓取公众号失败');
        dialogHasMore.value = false;
    }
    finally {
        dialogLoading.value = false;
    }
}
/* 弹窗内滚动处理：滚动到底触发 fetchDialogPage(nextPage) */
function onDialogScroll(e) {
    const el = e.target;
    // 距底 120px 触发加载更多
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        if (dialogHasMore.value && !dialogLoading.value) {
            fetchDialogPage(dialogPage.value);
        }
    }
}
/* 确认导入：调用后端 import 接口 */
async function confirmImport() {
    if (!selectedDialogFakeid.value) {
        ElMessage.warning('请先选择一个公众号');
        return;
    }
    dialogSaving.value = true;
    try {
        // 根据选中的 fakeid 找到对应的完整项（后端需要 fakeid）
        const chosen = dialogItems.value.find(i => i.fakeid === selectedDialogFakeid.value);
        if (!chosen)
            throw new Error('选中项数据缺失');
        try {
            const resp = await axios.post(API_IMPORT, { fakeid: chosen.fakeid, nickname: chosen.nickname });
            const created = resp.data?.item;
            if (!created) {
                ElMessage.error('公众号导入失败,请重试');
                return;
            }
            // 1. 更新下拉列表
            searchOptions.value = [created, ...searchOptions.value.filter(o => o.value !== created.value)];
            // 2. 先通知父组件修改 v-model 的值
            emit('update:modelValue', created.value);
            internalValue.value = created.value; // 保持内部同步
            // 3. 提示并关闭
            ElMessage.success('公众号导入成功');
            closeDialog();
            // 4. 最后触发父组件的 fetchArticles
            nextTick(() => {
                emit('import', created.value);
                emit('change', created.value);
            });
        }
        catch (e) {
            ElMessage.error(e?.response?.data?.message || e?.message || '导入失败');
        }
    }
    catch (e) {
        ElMessage.error(e?.response?.data?.message || e?.message || '导入失败');
    }
    finally {
        dialogSaving.value = false;
    }
}
/* 关闭 dialog */
function closeDialog() {
    dialogVisible.value = false;
    dialogItems.value = [];
    selectedDialogFakeid.value = null;
    dialogPage.value = 1;
    dialogHasMore.value = true;
    dialogLoading.value = false;
    // 二次保险：如果发现值还是 ADD_KEY（理论上 onChange 已经处理了，这里做兜底）
    if (internalValue.value === ADD_KEY) {
        internalValue.value = props.modelValue || null;
    }
}
// 认证状态配置表
const VERIFY_MAP = {
    0: { label: '未认证', color: '#909399', type: 'info', icon: '' },
    1: { label: '个人认证', color: '#faad14', type: 'warning', icon: 'CircleCheckFilled' }, // 黄V
    2: { label: '官方账号', color: '#2f54eb', type: 'primary', icon: 'CircleCheckFilled' }, // 蓝V
    3: { label: '新闻媒体', color: '#f5222d', type: 'danger', icon: 'CircleCheckFilled' }, // 红V
};
// 获取认证信息的辅助函数
const getVerifyInfo = (status) => {
    return VERIFY_MAP[status] || VERIFY_MAP[0];
};
function serviceLabel(type) {
    if (type === 0)
        return '公众号';
    if (type === 1)
        return '公众号';
    if (type === 2)
        return '服务号';
    return '未知';
}
/* 占位图 */
const placeholderAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUyIiBoZWlnaHQ9IjUyIiBmaWxsPSIjZGRkZGRkIiByeD0iOCI+PC9yZWN0Pjwvc3ZnPg=='; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    options: () => []
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['dialog-scroll-container', 'dialog-scroll-container', 'account-card', 'account-card', 'selected-tip',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("wechat-aff-select") },
});
const __VLS_0 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onPopupScroll': {} },
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.internalValue)),
    filterable: (true),
    remote: (true),
    clearable: (true),
    remoteMethod: ((__VLS_ctx.onRemoteSearch)),
    loading: ((__VLS_ctx.searching)),
    placeholder: ("公众号"),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onPopupScroll': {} },
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.internalValue)),
    filterable: (true),
    remote: (true),
    clearable: (true),
    remoteMethod: ((__VLS_ctx.onRemoteSearch)),
    loading: ((__VLS_ctx.searching)),
    placeholder: ("公众号"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onPopupScroll: (__VLS_ctx.onScroll)
};
const __VLS_8 = {
    onChange: (__VLS_ctx.onChange)
};
let __VLS_3;
let __VLS_4;
for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.displayOptions))) {
    const __VLS_9 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
        key: ((opt.value)),
        value: ((opt.value)),
        label: ((opt.label)),
    }));
    const __VLS_11 = __VLS_10({
        key: ((opt.value)),
        value: ((opt.value)),
        label: ((opt.label)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
}
__VLS_5.slots.default;
var __VLS_5;
const __VLS_15 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    modelValue: ((__VLS_ctx.dialogVisible)),
    title: ("选择并导入公众号"),
    width: ("720px"),
    closeOnClickModal: ((false)),
    showClose: ((false)),
    ...{ class: ("wechat-import-dialog") },
}));
const __VLS_17 = __VLS_16({
    modelValue: ((__VLS_ctx.dialogVisible)),
    title: ("选择并导入公众号"),
    width: ("720px"),
    closeOnClickModal: ((false)),
    showClose: ((false)),
    ...{ class: ("wechat-import-dialog") },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    'element-loading-text': ("正在抓取公众号数据..."),
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.dialogLoading && __VLS_ctx.dialogPage === 1) }, null, null);
if (__VLS_ctx.dialogItems.length === 0 && !__VLS_ctx.dialogLoading) {
    const __VLS_21 = {}.ElEmpty;
    /** @type { [typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ] } */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
        imageSize: ((120)),
        description: ("未检索到匹配的公众号"),
    }));
    const __VLS_23 = __VLS_22({
        imageSize: ((120)),
        description: ("未检索到匹配的公众号"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    {
        const { extra: __VLS_thisSlot } = __VLS_26.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: ({}) },
        });
    }
    __VLS_26.slots.default;
    var __VLS_26;
}
if (__VLS_ctx.dialogLoading && __VLS_ctx.dialogItems.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: ({}) },
    });
    for (const [i] of __VLS_getVForSourceType((3))) {
        const __VLS_27 = {}.ElSkeleton;
        /** @type { [typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ] } */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
            rows: ((3)),
            animated: (true),
            key: ((i)),
            ...{ style: ({}) },
        }));
        const __VLS_29 = __VLS_28({
            rows: ((3)),
            animated: (true),
            key: ((i)),
            ...{ style: ({}) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onScroll: (__VLS_ctx.onDialogScroll) },
        ...{ class: ("dialog-scroll-container") },
        ref: ("dialogScrollEl"),
    });
    // @ts-ignore navigation for `const dialogScrollEl = ref()`
    /** @type { typeof __VLS_ctx.dialogScrollEl } */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-grid") },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.dialogItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.dialogLoading && __VLS_ctx.dialogItems.length === 0))))
                        return;
                    __VLS_ctx.selectedDialogFakeid = item.fakeid;
                } },
            key: ((item.fakeid)),
            ...{ class: ("account-card") },
            ...{ class: (({ 'is-active': __VLS_ctx.selectedDialogFakeid === item.fakeid })) },
        });
        if (__VLS_ctx.selectedDialogFakeid === item.fakeid) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("select-badge") },
            });
            const __VLS_33 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
                color: ("#fff"),
            }));
            const __VLS_35 = __VLS_34({
                color: ("#fff"),
            }, ...__VLS_functionalComponentArgsRest(__VLS_34));
            const __VLS_39 = {}.Check;
            /** @type { [typeof __VLS_components.Check, ] } */ ;
            // @ts-ignore
            const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({}));
            const __VLS_41 = __VLS_40({}, ...__VLS_functionalComponentArgsRest(__VLS_40));
            __VLS_38.slots.default;
            var __VLS_38;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-content") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("avatar-wrapper") },
        });
        const __VLS_45 = {}.ElAvatar;
        /** @type { [typeof __VLS_components.ElAvatar, typeof __VLS_components.elAvatar, ] } */ ;
        // @ts-ignore
        const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
            size: ((56)),
            src: ((item.round_head_img || __VLS_ctx.placeholderAvatar)),
            shape: ("square"),
        }));
        const __VLS_47 = __VLS_46({
            size: ((56)),
            src: ((item.round_head_img || __VLS_ctx.placeholderAvatar)),
            shape: ("square"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_46));
        if (item.verify_status > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("v-badge") },
                ...{ style: (({ backgroundColor: __VLS_ctx.getVerifyInfo(item.verify_status).color })) },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("account-info") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("nickname") },
        });
        (item.nickname);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("tags") },
        });
        const __VLS_51 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
            size: ("small"),
            effect: ("plain"),
            ...{ style: (({
                    color: __VLS_ctx.getVerifyInfo(item.verify_status).color,
                    borderColor: __VLS_ctx.getVerifyInfo(item.verify_status).color,
                    backgroundColor: 'transparent'
                })) },
        }));
        const __VLS_53 = __VLS_52({
            size: ("small"),
            effect: ("plain"),
            ...{ style: (({
                    color: __VLS_ctx.getVerifyInfo(item.verify_status).color,
                    borderColor: __VLS_ctx.getVerifyInfo(item.verify_status).color,
                    backgroundColor: 'transparent'
                })) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: ({}) },
        });
        if (__VLS_ctx.getVerifyInfo(item.verify_status).icon) {
            const __VLS_57 = {}.ElIcon;
            /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
            // @ts-ignore
            const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
                size: ((20)),
            }));
            const __VLS_59 = __VLS_58({
                size: ((20)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_58));
            const __VLS_63 = ((__VLS_ctx.getVerifyInfo(item.verify_status).icon));
            // @ts-ignore
            const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({}));
            const __VLS_65 = __VLS_64({}, ...__VLS_functionalComponentArgsRest(__VLS_64));
            __VLS_62.slots.default;
            var __VLS_62;
        }
        (__VLS_ctx.getVerifyInfo(item.verify_status).label);
        __VLS_56.slots.default;
        var __VLS_56;
        const __VLS_69 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
            size: ("small"),
            type: ("info"),
            effect: ("light"),
        }));
        const __VLS_71 = __VLS_70({
            size: ("small"),
            type: ("info"),
            effect: ("light"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
        (__VLS_ctx.serviceLabel(item.service_type));
        __VLS_74.slots.default;
        var __VLS_74;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alias") },
        });
        (item.alias || '未设置');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("signature") },
            title: ((item.signature)),
        });
        (item.signature || '该公众号暂无简介');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("load-more-status") },
    });
    if (__VLS_ctx.dialogLoading && __VLS_ctx.dialogPage > 1) {
        const __VLS_75 = {}.ElIcon;
        /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
            ...{ class: ("is-loading") },
        }));
        const __VLS_77 = __VLS_76({
            ...{ class: ("is-loading") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        const __VLS_81 = {}.Loading;
        /** @type { [typeof __VLS_components.Loading, ] } */ ;
        // @ts-ignore
        const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({}));
        const __VLS_83 = __VLS_82({}, ...__VLS_functionalComponentArgsRest(__VLS_82));
        __VLS_80.slots.default;
        var __VLS_80;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else if (!__VLS_ctx.dialogHasMore && __VLS_ctx.dialogItems.length > 0) {
        const __VLS_87 = {}.ElDivider;
        /** @type { [typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ] } */ ;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
            borderStyle: ("dashed"),
        }));
        const __VLS_89 = __VLS_88({
            borderStyle: ("dashed"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        __VLS_92.slots.default;
        var __VLS_92;
    }
}
{
    const { footer: __VLS_thisSlot } = __VLS_20.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dialog-footer") },
    });
    if (__VLS_ctx.selectedDialogFakeid) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("selected-tip") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.dialogItems.find(i => i.fakeid === __VLS_ctx.selectedDialogFakeid)?.nickname);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_93 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.dialogSaving)),
    }));
    const __VLS_95 = __VLS_94({
        ...{ 'onClick': {} },
        disabled: ((__VLS_ctx.dialogSaving)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    let __VLS_99;
    const __VLS_100 = {
        onClick: (__VLS_ctx.closeDialog)
    };
    let __VLS_96;
    let __VLS_97;
    __VLS_98.slots.default;
    var __VLS_98;
    const __VLS_101 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.dialogSaving)),
        disabled: ((!__VLS_ctx.selectedDialogFakeid)),
    }));
    const __VLS_103 = __VLS_102({
        ...{ 'onClick': {} },
        type: ("primary"),
        loading: ((__VLS_ctx.dialogSaving)),
        disabled: ((!__VLS_ctx.selectedDialogFakeid)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_102));
    let __VLS_107;
    const __VLS_108 = {
        onClick: (__VLS_ctx.confirmImport)
    };
    let __VLS_104;
    let __VLS_105;
    __VLS_106.slots.default;
    var __VLS_106;
}
__VLS_20.slots.default;
var __VLS_20;
['wechat-aff-select', 'wechat-import-dialog', 'dialog-scroll-container', 'card-grid', 'account-card', 'is-active', 'select-badge', 'card-content', 'avatar-wrapper', 'v-badge', 'account-info', 'info-header', 'nickname', 'tags', 'alias', 'signature', 'load-more-status', 'is-loading', 'dialog-footer', 'selected-tip',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            internalValue: internalValue,
            searching: searching,
            displayOptions: displayOptions,
            onRemoteSearch: onRemoteSearch,
            onScroll: onScroll,
            onChange: onChange,
            dialogVisible: dialogVisible,
            dialogLoading: dialogLoading,
            dialogSaving: dialogSaving,
            dialogItems: dialogItems,
            selectedDialogFakeid: selectedDialogFakeid,
            dialogPage: dialogPage,
            dialogHasMore: dialogHasMore,
            onDialogScroll: onDialogScroll,
            confirmImport: confirmImport,
            closeDialog: closeDialog,
            getVerifyInfo: getVerifyInfo,
            serviceLabel: serviceLabel,
            placeholderAvatar: placeholderAvatar,
        };
    },
    emits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    __typeProps: {},
    props: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
