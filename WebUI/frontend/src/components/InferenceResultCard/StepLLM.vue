<template>
    <div class="phase-container">
        <div 
            v-for="(item, index) in isLoading ? phaseList : inferenceResult" 
            :key="item.phase" 
            class="phase-card"
        >
            <!-- 可折叠标题区域 -->
            <div 
                class="phase-header clickable disable-select"
                @click="togglePhase(item.phase)"
            >
                <div class="phase-title">
                    <el-icon v-if="!isExpanded(item.phase)"><CaretRight /></el-icon>
                    <el-icon v-if="isExpanded(item.phase)"><CaretBottom /></el-icon>
                    步骤{{ index+1 }} {{ item.phase }}
                </div>
                <el-icon v-if="isLoading && isLastPhase(index)">
                    <RefreshRight color="blue" class="spin-icon" />
                </el-icon>
                <el-icon color="green" v-else>
                    <SuccessFilled />
                </el-icon>
            </div>
            
            <!-- 可折叠内容区域 -->
            <div 
                class="phase-content" 
                v-show="isExpanded(item.phase)"
                v-html="render(item.data)"
                v-if="item.phase !== 'stances'"
            ></div>
            <div v-else class="stance-container" v-show="isExpanded(item.phase)">
                <div 
                    v-for="(stance, index) in item.stances"
                    :key="index"
                    class="stance-block"
                >
                    <!-- 立场标题 -->
                    <div class="stance-header">
                        <el-icon><Flag /></el-icon>
                        <span>立场 {{ index }}</span>
                    </div>
                    
                    <!-- 内容区域 -->
                    <div class="stance-content" v-html="render(stance.data)"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">

    import { render } from "@/utils/markdown.js";

    export default {
        name: "StepLLM",
        data() {
            return {
                isReflectionBtn: true,

                internalBuffer: {},
                processedIndex: 0,
                phaseOrder: [],
                expandedPhases: {},

                isLoading: false,

                fieldLabelMapping: {},
            }
        },

        props: {
            buffer: {
                type: Object,
                default: [],
            },

            inferenceResult: {
                type: Object,
                default: [],
            },
        },

        watch: {
            buffer: {
                handler() {
                    const newChunks = this.buffer.slice(this.processedIndex);
                    newChunks.forEach(chunk => {
                        this.processChunk(chunk);
                        this.processedIndex++;
                    });
                },
                deep: true
            }
        },

        computed: {
            // 最终结果转换为列表形式
            phaseList() {
                console.log(this.internalBuffer['stances'])
                return this.phaseOrder.map(phase => ({
                    phase,
                    ...this.internalBuffer[phase]
                }));
            }
        },

        methods: {
            render,

            isLastPhase(index) {
                return index === this.phaseList.length - 1;
            },

            isExpanded(phase) {
                return this.expandedPhases[phase] ?? true;  // 默认展开
            },
            togglePhase(phase) {
                if(this.expandedPhases[phase] != null) {
                    this.expandedPhases[phase] = !this.expandedPhases[phase];
                } else {
                    this.expandedPhases[phase] = false;
                }
            },

            reflectionBtn() {
                this.isReflectionBtn = !this.isReflectionBtn;
            },

            processChunk(chunkText) {
                const fixedChunkText = chunkText.replace(/}\s*{/g, '}\n{');
                const lines = fixedChunkText.split('\n');
                lines.forEach(line => {
                    if (!line.trim()) return;
                    
                    try {
                        const obj = JSON.parse(line);
                        if (obj.status === 'success') return;
                        if (obj.status === 'failed') {
                            this.$message.error(obj.error) 
                            return
                        }

                        if (obj.phase === 'stances') {
                            if (!this.internalBuffer[obj.phase]) {
                                this.internalBuffer[obj.phase] = {}
                                this.internalBuffer[obj.phase].stances = {};
                                this.phaseOrder.push(obj.phase);  // 记录顺序
                            }

                            if (!this.internalBuffer[obj.phase].stances[obj.stance]) {
                                this.internalBuffer[obj.phase].stances[obj.stance] = {
                                    data: '',
                                }
                            }
                        }

                        // 创建新阶段
                        if (!this.internalBuffer[obj.phase]) {
                            this.internalBuffer[obj.phase] = {
                                data: '',
                            }
                            this.phaseOrder.push(obj.phase);  // 记录顺序
                        }
                        
                        if (typeof obj.data === 'object' && obj.data !== null) {
                            if (obj.phase === 'stances') {
                                this.internalBuffer[obj.phase].stances[obj.stance].data += JSON.stringify(obj.data);
                            } else {
                                this.internalBuffer[obj.phase].data += JSON.stringify(obj.data);
                            }
                        } else {
                            if (obj.phase === 'stances') {
                                this.internalBuffer[obj.phase].stances[obj.stance].data += obj.data;
                            } else {
                                this.internalBuffer[obj.phase].data += obj.data;
                            }
                        }

                    } catch (e) {
                        console.error("解析异常:", e, "行内容:", line);
                    }
                });
            },

            flushBuffer() {
                this.internalBuffer = {}
                this.processedIndex = 0
                this.phaseOrder = []
                this.expandedPhases = {}
            },
        }
    };

</script>

<style lang="scss" scoped>
.phase-content {
  transition: all 0.3s ease-in-out;
}

.phase-header {
    cursor: pointer;

  .el-icon {
    transition: transform 0.3s ease;
  }
  
  &.collapsed {
    .el-icon {
      transform: rotate(-90deg);
    }
  }
}

.phase-card {
  // 添加折叠时的投影变化
  &.collapsed {
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
}

.phase-container {
    .stance-container {
        padding-bottom: 6px;
    }
    .stance-block {
        margin: 16px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #1890ff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        
        &:not(:last-child) {
            margin-bottom: 12px;
        }
    }

    .stance-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        color: #1890ff;
        font-weight: 600;
        
        .el-icon {
            margin-right: 8px;
            font-size: 16px;
        }
    }

    .stance-content {
        :deep(p) {
            margin: 8px 0;
            line-height: 1.6;
        }
        
        :deep(pre) {
            background: #e6f4ff;
            border-radius: 4px;
        }
    }
    
    /* 嵌套代码块样式 */
    :deep(pre) {
            code {
            display: block;
            padding: 12px;
            background: #e6f4ff;
            border-radius: 4px;
            white-space: pre-wrap;
        }
    }
}

.phase-container {
  padding: 5px 0;
  max-width: 996px;
  margin: 0 auto;
  box-sizing: border-box;

    // 旋转动画
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .spin-icon {
        animation: spin 1.5s linear infinite;
    }

    .el-icon {
        font-size: 18px;
        transition: color 0.3s;
    }
  
  .phase-card {
    margin-bottom: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    transition: transform 0.3s ease;
    background: white;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  }

  .phase-header {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
    border-radius: 12px 12px 0 0;
  }

  .phase-title {
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    
    .el-icon {
      margin-right: 8px;
      font-size: 18px;
    }
  }

  .phase-content {
    padding: 20px;
    min-height: 80px;
    
    // Markdown 样式覆盖
    :deep(p) {
      margin: 12px 0;
      line-height: 1.6;
    }
    
    :deep(pre) {
      background: #f8f8f8;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }
    
    :deep(code) {
      background: #f0f0f0;
      padding: 2px 4px;
      border-radius: 4px;
    }
    
    :deep(ul), :deep(ol) {
      margin: 12px 0;
      padding-left: 20px;
    }
  }
}

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