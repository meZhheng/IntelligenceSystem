import { computed, ref } from 'vue';
import { Document } from '@element-plus/icons-vue';
import { List } from '@element-plus/icons-vue';
const props = defineProps({
    originalText: {
        type: String,
        required: true
    },
    result: {
        type: Object,
        required: true
    }
});
// 修改3: 新增计算属性
const getAllCollapseNames = computed(() => {
    return formattedEntities.value.map((_, index) => index + 1);
});
const baseStyle = 'padding: 2px 4px; border-radius: 4px; font-weight: 500;';
const styleMap = {
    姓名: `background: #ffcccb; color: #c82333; ${baseStyle}`,
    身份证: `background: #f8d7da; color: #721c24; ${baseStyle}`,
    旧版身份证: `background: #f5c6cb; color: #842029; ${baseStyle}`,
    电话号码: `background: #d1ecf1; color: #0c5460; ${baseStyle}`,
    座机号码: `background: #bee5eb; color: #0a5877; ${baseStyle}`,
    电子邮箱: `background: #d4edda; color: #155724; ${baseStyle}`,
    地址: `background: #fff3cd; color: #856404; ${baseStyle}`,
    IPv4: `background: #e2e3e5; color: #383d41; ${baseStyle}`,
    MAC: `background: #d6d8db; color: #495057; ${baseStyle}`,
    邮政编码: `background: #ffeeba; color: #8a6d3b; ${baseStyle}`
};
// 高亮处理函数
const highlightedText = computed(() => {
    let text = props.originalText;
    const entities = props.result?.log?.entities?.[0] || {};
    // 创建二维排序数组：先按类型分组排序，再按实体长度降序排序
    const sortedEntities = Object.entries(entities)
        .map(([type, items]) => [
        type,
        Array.isArray(items)
            ? items.slice().sort((a, b) => b.length - a.length)
            : []
    ]);
    sortedEntities.forEach(([type, items]) => {
        items.forEach(item => {
            // 转义正则特殊字符
            const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 构建防重复匹配正则，排除已高亮内容和HTML标签
            const regex = new RegExp(`(${escapedItem})(?![^<]*>)(?![^<]*</span>)`, 'g');
            text = text.replace(regex, `<span style="${styleMap[type] || ''}">$1</span>`);
        });
    });
    return text;
});
// 状态显示
const privacyTagType = computed(() => props.result?.data?.[0] ? 'danger' : 'success');
const privacyStatus = computed(() => props.result?.data?.[0] ? '检测到敏感信息' : '未检测到敏感信息');
const typeConfig = {
    姓名: {
        title: '人物身份信息',
        tagType: 'danger',
        icon: 'UserFilled'
    },
    身份证: {
        title: '身份认证信息',
        tagType: 'danger',
        icon: 'CreditCard'
    },
    旧版身份证: {
        title: '历史身份信息',
        tagType: 'warning',
        icon: 'CreditCard'
    },
    电话号码: {
        title: '移动通信信息',
        tagType: 'primary',
        icon: 'Phone'
    },
    座机号码: {
        title: '固定通信信息',
        tagType: 'primary',
        icon: 'Telephone'
    },
    电子邮箱: {
        title: '网络通信信息',
        tagType: 'success',
        icon: 'Message'
    },
    地址: {
        title: '地理位置信息',
        tagType: 'warning',
        icon: 'Location'
    },
    IPv4: {
        title: '网络地址信息',
        tagType: 'info',
        icon: 'Connection'
    },
    MAC: {
        title: '设备标识信息',
        tagType: 'info',
        icon: 'Monitor'
    },
    邮政编码: {
        title: '邮政地理信息',
        tagType: 'warning',
        icon: 'Postcard'
    }
};
// 格式化实体数据
const formattedEntities = computed(() => {
    const entities = props.result?.log?.entities?.[0] || {};
    return Object.entries(entities)
        .filter(([type, items]) => Array.isArray(items) && items.length > 0)
        .map(([type, items]) => ({
        title: typeConfig[type]?.title || type,
        items: items,
        tagType: typeConfig[type]?.tagType || 'info'
    }));
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['always-open',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("highlight-viewer disable-select") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("highlight-viewer disable-select") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header") },
});
const __VLS_6 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    ...{ class: ("icon") },
}));
const __VLS_8 = __VLS_7({
    ...{ class: ("icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const __VLS_12 = {}.Document;
/** @type { [typeof __VLS_components.Document, ] } */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("title") },
});
const __VLS_18 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    type: ((__VLS_ctx.privacyTagType)),
    size: ("small"),
}));
const __VLS_20 = __VLS_19({
    type: ((__VLS_ctx.privacyTagType)),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
(__VLS_ctx.privacyStatus);
__VLS_23.slots.default;
var __VLS_23;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("legend") },
});
for (const [config, type] of __VLS_getVForSourceType((__VLS_ctx.styleMap))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("legend-item") },
        key: ((type)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("color-block") },
        ...{ style: ((config)) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("type-label") },
    });
    (type);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("content") },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedText) }, null, null);
__VLS_5.slots.default;
var __VLS_5;
const __VLS_24 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ class: ("detail-viewer disable-select") },
}));
const __VLS_26 = __VLS_25({
    ...{ class: ("detail-viewer disable-select") },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header") },
});
const __VLS_30 = {}.ElIcon;
/** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    ...{ class: ("icon") },
}));
const __VLS_32 = __VLS_31({
    ...{ class: ("icon") },
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const __VLS_36 = {}.List;
/** @type { [typeof __VLS_components.List, ] } */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_35.slots.default;
var __VLS_35;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("title") },
});
if (__VLS_ctx.formattedEntities.length == 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content") },
    });
}
const __VLS_42 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    modelValue: ((__VLS_ctx.getAllCollapseNames)),
}));
const __VLS_44 = __VLS_43({
    modelValue: ((__VLS_ctx.getAllCollapseNames)),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
for (const [entityGroup, index] of __VLS_getVForSourceType((__VLS_ctx.formattedEntities))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: ((index)),
    });
    const __VLS_48 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        title: ((entityGroup.title)),
        name: ((index + 1)),
        ...{ class: ("always-open") },
    }));
    const __VLS_50 = __VLS_49({
        title: ((entityGroup.title)),
        name: ((index + 1)),
        ...{ class: ("always-open") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("entity-list") },
    });
    for (const [item, idx] of __VLS_getVForSourceType((entityGroup.items))) {
        const __VLS_54 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
            key: ((idx)),
            type: ((entityGroup.tagType)),
            ...{ class: ("entity-tag") },
        }));
        const __VLS_56 = __VLS_55({
            key: ((idx)),
            type: ((entityGroup.tagType)),
            ...{ class: ("entity-tag") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
        (item);
        __VLS_59.slots.default;
        var __VLS_59;
    }
    __VLS_53.slots.default;
    var __VLS_53;
}
__VLS_47.slots.default;
var __VLS_47;
__VLS_29.slots.default;
var __VLS_29;
['highlight-viewer', 'disable-select', 'header', 'icon', 'title', 'legend', 'legend-item', 'color-block', 'type-label', 'content', 'detail-viewer', 'disable-select', 'header', 'icon', 'title', 'content', 'always-open', 'entity-list', 'entity-tag',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            Document: Document,
            List: List,
            getAllCollapseNames: getAllCollapseNames,
            styleMap: styleMap,
            highlightedText: highlightedText,
            privacyTagType: privacyTagType,
            privacyStatus: privacyStatus,
            formattedEntities: formattedEntities,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
        };
    },
});
; /* PartiallyEnd: #4569/main.vue */
