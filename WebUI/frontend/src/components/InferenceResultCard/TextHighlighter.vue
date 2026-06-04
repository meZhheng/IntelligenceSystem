<template>
<div class="text-content">
    <template v-for="(char, index) in processedText" :key="index">
    <span 
        v-if="char.highlight"
        :class="['highlight', char.category]"
        :data-pos="index"
        :title="`${char.word} (${CATEGORY_MAP[char.category] || char.category})`"
    >
        {{ char.char }}
    </span>
    <span v-else>
        {{ char.char }}
    </span>
    </template>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_MAP } from './Lexicon.vue'

const props = defineProps<{
    text: string
    matches: Array<{
        category: string
        positions: number[]
        word: string
    }>
}>()

// 处理文本标记
const processedText = computed(() => {
    if (!props.text) return []
    
    const chars = props.text.split('').map((char, index) => ({
        char,
        index,
        highlight: false,
        category: '',
        word: ''
    }))

    const matches = props.matches ?? []
    matches.forEach(match => {
        match.positions.forEach(pos => {
            const length = match.word.length
            for (let i = 0; i < length; i++) {
                const targetIndex = pos + i
                if (targetIndex < chars.length) {
                    chars[targetIndex].highlight = true
                    chars[targetIndex].category = match.category
                    chars[targetIndex].word = match.word
                }
            }
        })
    })

    return chars
})
</script>

<style lang="scss">
.highlight {
    padding: 2px 4px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    &::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
    }

    &:hover {
        z-index: 10;
        transform: translateY(-2px);
        
        &::after {
        opacity: 1;
        }
    }

    // 不同类别的颜色
    &.general { background: #fde2e2; }
    &.LGBT { background: #d3e8ff; }
    &.racism { background: #fee4cb; }
    &.region { background: #e4f5d4; }
    &.sexism { background: #fbedf5; }
}
</style>