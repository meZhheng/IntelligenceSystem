<template>
    <div v-if="inferenceResult.inversion" class="msg-content">
        <div>
            <el-button
            class="reflectionBtn"
            type="primary"
            v-if="inferenceResult.reasoning && inferenceResult.reasoning.length > 2"
            @click="reflectionBtn"
            :icon="isReflectionBtn ? 'ArrowUp' : 'ArrowDown'"
            >深度思考
            </el-button>
        </div>
        <div class="think" v-if="inferenceResult.reasoning.length > 2 && isReflectionBtn">
            {{ inferenceResult.reasoning }}
        </div>
        <div v-html="render(inferenceResult.answer)"></div>
    </div>
    <div v-else class="msg-content">{{ inferenceResult.answer }}</div>
</template>

<script lang="ts">

    import { render } from "@/utils/markdown.js";
    export default {
        name: "ChatCard",
        data() {
            return {
                isReflectionBtn: true,
            }
        },

        props: {
            inferenceResult: {
                type: Object,
                default: () => ({ inversion: true, answer: "Hello, I am Ollama...", reasoning: "我是一个AI" }),
            },
        },

        methods: {
            render,
            botThinking() {
                const thinkingText = ["⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏", "⠋", "⠙", "⠹"];
                let i = 0;
                const loadingInterval = setInterval(() => {
                    this.inferenceResult.answer = thinkingText[i];
                    i = (i + 1) % thinkingText.length;
                }, 100);
                return () => {
                    clearInterval(loadingInterval);
                    this.inferenceResult.answer = "";
                };
            },

            reflectionBtn() {
                this.isReflectionBtn = !this.isReflectionBtn;
            },

            processChunk(chunkText) {
                // 拆分每行数据（假设每行是一个完整的 JSON 对象）
                const lines = chunkText.split('\n');
                for (const line of lines) {
                    if (line.trim().length) {
                        try {
                            const obj = JSON.parse(line);
                            if (obj.data && obj.status === 'reasoning') {
                                this.buffer.reasoning += obj.data;
                            } else if (obj.data && obj.status === 'streaming') {
                                this.buffer.answer += obj.data;
                            }
                        } catch (e) {
                            console.error("解析 JSON 行失败:", e);
                            console.error("JSON 行:", line);
                        }
                    }
                }
            }
        }
    };

</script>

<style scoped>

    .msg-content {
        background-color: rgb(255, 255, 255);
        box-shadow: 0px 1px 4px rgba(65, 65, 65, 0.339);
        padding: 0.6em 1.4em;
        border-radius: 5px;
    }

    .think {
        color: #8b8b8b;
        padding: 0 0 20px 0;
        box-sizing: border-box;
        border-radius: 10px;
        font-size: 14px;
        line-height: 30px;
    }

    .reflectionBtn {
        width: 80px;
        height: 30px;
        font-size: 12px;
        margin-bottom: 10px;
    }
</style>