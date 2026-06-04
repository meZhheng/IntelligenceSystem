<!-- CategoryAccordion.vue -->
<template>
<el-collapse v-model="activeCategory" accordion>
    <el-collapse-item 
    v-for="group in matchGroups" 
    :key="group.category"
    :name="group.category"
    >
    <template #title>
        <div class="category-header">
        <el-tag 
            :style="{ backgroundColor: getCategoryColor(group.category) }"
            class="category-tag"
        >
            {{ CATEGORY_MAP[group.category] || group.category }}
        </el-tag>
        <span class="count">{{ group.items.length }}项</span>
        </div>
    </template>

    <ul class="word-list">
        <li 
        v-for="(item, index) in group.items" 
        :key="index"
        class="word-item"
        @click="handleClick(item.positions[0])"
        >
        <el-tooltip 
            :content="`出现次数: ${item.positions.length}`"
            placement="right"
        >
            <span class="word">{{ item.word }}</span>
        </el-tooltip>
        <span class="positions">在文本中首次出现的位置: {{ item.positions[0] }}</span>
        </li>
    </ul>
    </el-collapse-item>
</el-collapse>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MatchDetail } from './Lexicon.vue'
import { CATEGORY_MAP } from './Lexicon.vue'

interface MatchGroup {
    category: string
    items: MatchDetail[]
}

const props = defineProps<{
matches: MatchGroup[]
}>()

const emit = defineEmits<{
(e: 'highlight', position: number): void
}>()

const activeCategory = ref('')
const COLOR_MAP = {
general: '#fde2e2',
LGBT: '#d3e8ff',
racism: '#fee4cb',
region: '#e4f5d4',
sexism: '#fbedf5'
}

const matchGroups = computed(() => 
props.matches.map(g => ({
    ...g,
    items: g.items.sort((a, b) => a.positions[0] - b.positions[0])
}))
)

const getCategoryColor = (category: string) => 
COLOR_MAP[category as keyof typeof COLOR_MAP] || '#f0f0f0'

const handleClick = (position: number) => {
emit('highlight', position)
}
</script>

<style lang="scss">
.category-header {
display: flex;
align-items: center;
padding: 8px 0;

.category-tag {
    color: #333;
    border: none;
    margin-right: 12px;
}

.count {
    font-size: 0.9em;
    color: #909399;
}
}

.word-list {
margin: 0;
padding: 0;
list-style: none;

.word-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
    background: #f5f7fa;
    
    .word {
        color: #409eff;
    }
    }
    
    .word {
    font-weight: 500;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    }
    
    .positions {
    font-size: 0.85em;
    color: #909399;
    }
}
}
</style>