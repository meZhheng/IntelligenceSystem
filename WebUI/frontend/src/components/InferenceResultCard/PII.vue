<template>
<el-card class="highlight-viewer disable-select">
    <div class="header">
        <el-icon class="icon"><Document /></el-icon>
        <span class="title">原文标注视图</span>
        <el-tag :type="privacyTagType" size="small">{{ privacyStatus }}</el-tag>
    </div>
    <!-- 图例区域 -->
    <div class="legend">
      <div class="legend-item" v-for="(config, type) in styleMap" :key="type">
        <span class="color-block" :style="config"></span>
        <span class="type-label">{{ type }}</span>
      </div>
    </div>
    <div class="content" v-html="highlightedText"></div>
</el-card>
<el-card class="detail-viewer disable-select">
    <div class="header">
        <el-icon class="icon"><List /></el-icon>
        <span class="title">识别结果详情</span>
    </div>
    <div class="content" v-if="formattedEntities.length == 0">没有识别到敏感信息</div>
    <!-- 修改1: 移除v-model绑定，改为动态设置所有折叠项展开 -->
    <el-collapse v-model="getAllCollapseNames">
        <div v-for="(entityGroup, index) in formattedEntities" :key="index">
            <!-- 修改2: 添加always-open类名防止意外收起 -->
            <el-collapse-item 
                :title="entityGroup.title" 
                :name="index+1"
                class="always-open"
            >
                <div class="entity-list">
                    <el-tag 
                        v-for="(item, idx) in entityGroup.items" 
                        :key="idx"
                        :type="entityGroup.tagType"
                        class="entity-tag"
                    >
                        {{ item }}
                    </el-tag>
                </div>
            </el-collapse-item>
        </div>
    </el-collapse>
</el-card>
</template>

<script setup>
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
    return formattedEntities.value.map((_, index) => index + 1)
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
            const regex = new RegExp(
                `(${escapedItem})(?![^<]*>)(?![^<]*</span>)`,
                'g'
            );
            text = text.replace(regex, 
                `<span style="${styleMap[type] || ''}">$1</span>`
            );
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
</script>


<style scoped>
/* 修改4: 添加强制展开的样式 */
.always-open .el-collapse-item__wrap {
    display: block !important;
    overflow: visible !important;
}
.always-open .el-collapse-item__header {
    cursor: default !important;
    border-bottom: none;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin: 15px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
}

.color-block {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
}

.type-label {
    color: #666;
}

.detail-viewer {
    margin: 20px 0;
    border-radius: 12px;
    width: 100%;
}

.entity-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px;
}

.entity-tag {
    margin: 5px 0;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 18px;
}

.highlight-viewer {
    border-radius: 12px;
    width: 100%;
}

.header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
}

.icon {
    font-size: 20px;
    margin-right: 10px;
}

.title {
    font-size: 16px;
    font-weight: 600;
    margin-right: 15px;
}

.content {
    line-height: 1.8;
    white-space: pre-line;
    min-height: 100px;
}
</style>