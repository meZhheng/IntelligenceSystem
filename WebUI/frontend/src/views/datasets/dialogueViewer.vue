<template>
<div class="dialogue-viewer" ref="scrollContainer">
    <header class="session-header">
        <h3>会话：{{ props.session?.utterances?.[0].text }}</h3>
    </header>
    <div class="utterances">
        <div
            v-for="utt in props.session?.utterances || []"
            :key="utt.utterance_code"
            class="utterance"
            :class="speakerClass(utt.speaker)"
        >
            <div class="avatar">
                <el-avatar size="small">
                    {{ speakerInitial(utt.speaker) }}
                </el-avatar>
            </div>
            <div class="content">
                <div class="bubble">
                    <p class="text">{{ utt.text }}</p>
                    <div class="meta">
                    <span class="time">{{ formatTime(utt.start_time) }} - {{ formatTime(utt.end_time) }}</span>
                    <!-- <el-tag size="small" class="emotion-tag">{{ utt.emotion }}</el-tag> -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface Utterance {
    utterance_code: string;
    text: string;
    start_time: number;
    end_time: number;
    speaker: string;
    emotion: string;
}
interface Session {
    session_code: string;
    split: string;
    utterances: Utterance[];
}

const props = defineProps<{ session: Session }>()

const scrollContainer = ref<HTMLElement>()

onMounted(async () => {
    await nextTick()
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
})

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const mm = String(m).padStart(2, '0')
    const ss = String(s).padStart(2, '0')
    return `${mm}:${ss}`
}

const speakerClass = (speaker: string) => {
    return speaker.toLowerCase().includes('female') ? 'from-female' : 'from-male'
}

const speakerInitial = (speaker: string) => {
    return speaker.charAt(0).toUpperCase()
}
</script>

<style scoped lang="scss">
.dialogue-viewer {
    margin: 0 auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow-y: auto;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
}
.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h3 {
        margin: 0;
    }
}
.split-label {
    font-size: 12px;
    color: #888;
}
.utterances {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.utterance {
    display: flex;
    align-items: flex-start;
}
.utterance.from-female {
    flex-direction: row;
}
.utterance.from-male {
    flex-direction: row-reverse;
}
.avatar {
    flex-shrink: 0;
}

.bubble {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    padding: 8px 12px;
    position: relative;
}
.utterance.from-male .bubble {
    background: #f5faff;
}
.text {
    margin: 0;
    word-break: break-word;
}
.meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
}
.time {
    font-size: 10px;
    color: #999;
}
.emotion-tag :deep(.el-tag) {
    font-size: 10px;
}
</style>
  