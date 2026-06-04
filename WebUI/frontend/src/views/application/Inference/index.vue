<template>
<div class="container">
    <div class="inference_index">
        <div class="index-header">
            <div class="back-button" @click="handleBack">
                <el-icon class="icon"><ArrowLeftBold /></el-icon>
                <span class="text">返回</span>
            </div>
            <div class="card_url" @click="handleOpenLink(data.detail_address)" v-if="data?.detail_address">
                <el-icon><Link /></el-icon>
                <div> 查看原文 </div>
            </div>
        </div>
        <DataImageViewer class="content" :data="data" v-if="dataset_type == 'IMAGE'">
        </DataImageViewer>
        <DialogueViewer class="content" :session="data" v-else-if="dataset_type == 'INTERACTIVE_DIALOGUE'">
        </DialogueViewer>
        <PropagationViewer class="content" v-else-if="dataset_type == 'PROPAGATION'"
            :root="{ id: data?.id, content: data?.content }" 
            :subtree="data?.subtree" 
        >
        </PropagationViewer>
        <section class="content" v-else-if="dataset_type == 'ILLEGAL_ACCOUNT_DETECTION'">
            <header class="item-header">
                <h4 class="item-title">{{ data?.name }}</h4>
            </header>
        </section>
        <section class="content" v-else-if="dataset_type == 'ACCOUNT_ROLE_RECOGNITION'">
            <header class="item-header">
                <h4 class="item-title">{{ data?.username }}</h4>
            </header>
            <div class="item-meta-list">
                <div class="item-meta"><el-icon><User /></el-icon>粉丝：{{ data?.num_followers }}</div>
                <div class="item-meta"><el-icon><Document /></el-icon>博文：{{ data?.num_blogs }}</div>
                <!-- <div class="item-meta"><el-icon><OfficeBuilding /></el-icon>认证：{{ data?.auth_type }}</div> -->
            </div>
        </section>
        <div class="content" v-else>
            <div class="content_title card_title title" v-if="data?.title">
                {{ data.title }}
            </div>
            <div class="content_fields"> 
                <div class="card_station" v-if="data?.source_station">
                    <el-icon><Stopwatch /></el-icon>
                    <div> 来源 {{ data.source_station }} </div>
                </div>
                <div class="card_author" v-if="data?.author">
                    <el-icon><Stopwatch /></el-icon>
                    <div> 作者 {{ data.author }} </div>
                </div>
                <div class="card_keyword" v-if="data?.key_word">
                    <el-icon><CollectionTag /></el-icon>
                    <div> 涉及 {{ data.key_word }} </div>
                </div>
                <div class="card_time" v-if="data?.publish_time">
                    <el-icon><Clock /></el-icon>
                    <div> {{ formatDateTime(data.publish_time) }}</div>
                </div>
            </div>
            <div class="content_main" v-if="data?.text">
                {{ data.text }}
            </div>
        </div>
    </div>
    <div class="divider"></div>
    <div class="inference_box">
        <div class="inference-operation"> 
            <el-select v-model="model_selected" placeholder="请选择使用的模型" 
                class="model-select" 
                @change="fetchResult"
                :disabled="isLoading"
            >
                <el-option 
                    v-for="item in model_options"
                    :key="item.value"
                    :label="item.alias"
                    :value="item.value"
                    :disabled="item.status == 0"
                />
            </el-select>
            <!-- 修改后的模型描述提示 -->
            <el-popover
                placement="bottom"
                trigger="hover"
                :width="280"
                transition="el-zoom-in-top"
                popper-class="model-desc-popper"
            >
                <template #reference>
                    <div class="model-tip-trigger">
                        <el-icon class="tip-icon">
                            <QuestionFilled />
                            <span v-if="isLoading" class="loading-indicator"></span>
                        </el-icon>
                    </div>
                </template>

                <div class="model-desc-content">
                    <div v-if="model_selected">
                        <h3 class="model-name">{{ currentModelInfo.alias || '未知模型' }}</h3>
                        <!-- <p class="desc-text">{{ currentModelInfo.description || '暂无模型描述信息' }}</p> -->
                        <!-- 使用v-html渲染转换后的HTML -->
                        <div class="desc-text" v-html="renderDescription(currentModelInfo.description)"></div>
                    </div>
                    <div v-else class="empty-tip">
                        <el-icon><InfoFilled /></el-icon>
                        <span>请先选择模型</span>
                    </div>
                </div>
            </el-popover>
            <el-tooltip
                :disabled="model_selected && !isLoading"
                content="请先选择有效模型"
                placement="bottom"
            >
                <div>
                    <el-button
                        class="start-inference"
                        :type="inference_content ? 'primary' : 'success'"
                        :disabled="!model_selected || isLoading"
                        :loading="isLoading"
                        @click="handleInference"
                    >
                        {{ inference_content ? '重新推理' : '开始推理' }}
                    </el-button>
                </div>
            </el-tooltip>
            <!-- 新增：置顶按钮，放在最右边 -->
            <div class="pin-control" >
                <el-tooltip :content="pinnedState ? '已置顶 — 点击取消置顶' : '置顶此条数据'" placement="bottom">
                <div>
                    <el-button
                        style="border: none;"
                        :disabled="isLoading || pinLoading"
                        :loading="pinLoading"
                        circle
                        @click="togglePin"
                        aria-label="置顶此条数据"
                    >
                    <svg v-if="!pinnedState" t="1756705968573" class="icon" viewBox="0 0 1025 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11219" width="24" height="24"><path d="M51.196068 1024c-13.021992 0-26.0184-5.091113-36.021541-15.094254-18.113104-18.164271-20.262117-46.050265-5.091113-66.337966l213.059228-288.325828-166.983379-166.983379C39.862586 470.961896 36.639068 445.48075 48.305135 425.2698c7.982046-12.612656 76.699275-112.82315 229.483822-75.010766 2.532765 0.307002 5.270197 0.537253 8.212297 0.793088 6.267953 0.537253 13.277827 1.17684 20.87612 2.404847 32.33752 5.244614 89.516599-20.722619 139.148552-63.037697 47.559691-40.49865 78.285451-87.751339 78.285451-120.344693 0-7.57271-0.179084-15.631507-0.358169-23.536802-1.279174-30.623426-3.223519-77.697031 31.979351-112.874317 41.649907-41.701074 107.552953-45.05251 153.270633-7.854129 0.921005 0.741921 1.76526 1.535009 2.583932 2.379264l-0.025583 0c24.585725 24.048472 276.608594 275.815506 279.243692 278.476188 21.694792 21.694792 33.642277 50.527374 33.693444 81.176384 0.025583 30.674593-11.896319 59.456009-33.539943 81.099634-35.023785 35.049369-82.353225 33.053857-113.565071 31.723516-7.393626-0.153501-15.478006-0.332585-23.025133-0.332585-30.828094 0-67.69389 21.592458-103.715431 60.760767-50.808793 55.260318-82.09739 126.63823-79.411124 158.617581 1.125673 10.258976 3.223519 28.37208 3.607271 30.930428 36.891379 149.612195-63.114447 217.843339-74.627013 225.109047-20.697036 12.484739-46.357267 9.389137-63.012113-7.240125l-178.393611-178.393611c-10.003141-10.003141-10.003141-26.171901 0-36.175042s26.171901-10.003141 36.175042 0l178.393611 178.393611c7.854129-5.091113 80.101878-54.646315 51.320462-171.76749-0.51167-2.35368-3.044434-23.562386-4.374775-35.970374-4.298025-51.115795 35.586622-136.027367 92.688951-198.118475 32.439854-35.254036 83.27423-77.287695 141.348731-77.287695 7.905296 0 16.399011 0.179084 24.662475 0.358169 32.41427 1.355924 58.048918 0.972172 75.77827-16.782763 11.973069-11.973069 18.548024-27.885994 18.548024-44.847842-0.025583-17.013015-6.677288-33.00269-18.701524-45.05251C952.220677 340.23031 683.849964 72.243349 675.944668 64.645055c-24.278723-19.724864-60.7096-17.882853-83.785899 5.21903-17.908437 17.908437-18.317772 43.491917-17.013015 75.087516 0.204668 8.800717 0.383752 17.243266 0.383752 25.148562 0 48.378362-35.995957 107.936705-96.270638 159.282751-49.478452 42.135993-122.979792 83.811483-180.491457 74.60143-6.293536-1.023339-12.049819-1.509425-17.192099-1.944345-3.325852-0.281418-6.421454-0.562837-9.312387-0.921005-2.456014-0.07675-4.860861-0.537253-7.188958-1.304758-117.760762-29.037251-167.597382 43.44075-172.893163 51.806549l182.742803 182.026466c8.954218 8.954218 10.028724 23.101883 2.481598 33.309692L51.170485 973.114457l238.617125-174.530506c11.435816-8.365798 27.425491-5.80745 35.740123 5.602782s5.80745 27.399908-5.602782 35.714539l-238.821793 174.12117C72.148939 1020.699731 61.685295 1024 51.196068 1024z" fill="#2c2c2c" p-id="11220"></path></svg>
                    <svg v-else t="1756706110118" class="icon" viewBox="0 0 1025 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12149" width="24" height="24"><path d="M320 839.68l-238.592 174.08c-8.704 6.656-19.456 9.728-29.696 9.728-12.8 0-26.112-5.12-35.84-14.848-17.92-17.92-20.48-46.08-5.12-66.56l212.992-288.256L56.32 487.424C39.936 471.04 36.864 445.44 48.128 425.472c8.192-12.8 76.8-112.64 229.376-75.264 2.56 0.512 5.12 0.512 8.192 1.024 6.144 0.512 13.312 1.024 20.992 2.56 32.256 5.12 89.6-20.48 139.264-62.976 47.616-40.448 78.336-87.552 78.336-120.32 0-7.68 0-15.872-0.512-23.552-1.024-30.72-3.072-77.824 31.744-112.64 41.472-41.472 107.52-45.056 153.088-7.68 1.024 0.512 1.536 1.536 2.56 2.56 24.576 24.064 276.48 275.968 279.04 278.528 21.504 21.504 33.792 50.688 33.792 81.408s-11.776 59.392-33.792 80.896c-34.816 34.816-82.432 33.28-113.664 31.744-7.168 0-15.36-0.512-23.04-0.512-30.72 0-67.584 21.504-103.936 60.928-50.688 55.296-81.92 126.464-79.36 158.72 1.024 10.24 3.072 28.16 3.584 30.72 36.864 149.504-62.976 217.6-74.752 225.28-20.48 12.288-46.592 9.216-62.976-7.168l-165.376-165.376-50.688 35.328z" p-id="12150" fill="#d81e06"></path></svg>
                    </el-button>
                </div>
                </el-tooltip>
            </div>
        </div>
        <div class="inference_result" v-if="model_selected != null">
            <chatCard 
                v-if="getModelOption(model_selected)?.['label'] == 'DeepSeek'" 
                :inferenceResult="inference_content?.data || {}"
            />
            <StepLLM 
                v-else-if="getModelOption(model_selected)?.['label'] == 'Gleam'" 
                :buffer="parseBuffer" 
                ref="inferenceResult"
                :inferenceResult="inference_content?.data?.answer || []"
            ></StepLLM>
            <ArgResultViewer
                v-else-if="getModelOption(model_selected)?.['label'] == 'ARG'" 
                :result="inference_content || {}"
            ></ArgResultViewer>
            <PIIResultViewer 
                v-else-if="getModelOption(model_selected)?.['label'] == 'PII'" 
                :originalText="data.text"
                :result="inference_content || {}"
            ></PIIResultViewer>
            <ENDEFViewer
                v-else-if="getModelOption(model_selected)?.['label'] == 'ENDEF'"
                :data="inference_content?.data?.[0] || {}"
            >
            </ENDEFViewer>
            <LexiconViewer
                v-else-if="getModelOption(model_selected)?.['label'] == 'Lexicon'"
                :result="inference_content || {}"
            >
            </LexiconViewer>
            <ClassifyLLMReasoningViewer
                v-else-if="MODELS.LLM_REASONING.includes(getModelOption(model_selected)?.['label'])"
                :result="inference_content || {}"
            >
            </ClassifyLLMReasoningViewer>
            <StanceLLMViewer
                v-else-if="MODELS.LLM_STANCE.includes(getModelOption(model_selected)?.['label'])"
                :results="inference_content || []"
            >
            </StanceLLMViewer>
            <MUSEViewer
                v-else-if="getModelOption(model_selected)?.['label'] == 'muse'"
                :result="inference_content || {}"
            >
            </MUSEViewer>
            <Illegal_LLM_Viewer
                v-else-if="MODELS.LLM_ILLEGAL.includes(getModelOption(model_selected)?.['label'])"
                :result="inference_content || {}"
                :labels="inference_content?.labels || []"
            >
            </Illegal_LLM_Viewer>
            <VADViewer
                v-else-if="getModelOption(model_selected)?.['label'] == 'vad'"
                :results="inference_content?.[0] || []"
                :utterances="data?.context_utterances || []"
                :labels="['中性', '沮丧', '悲伤', '愤怒', '兴奋', '快乐', '未预测']"
            >
            </VADViewer>
            <PropaViewer 
                v-else-if="MODELS.PROPA.includes(getModelOption(model_selected)?.['label'])"
                :result="inference_content || {}"
            >
            </PropaViewer>
            <div
                class="result-userrole"
                v-else-if="getModelOption(model_selected)?.label === 'user_role_recognition'"
            >
                <div class="label-row">
                    <el-icon class="label-icon"><User /></el-icon>
                    <span class="label-title">检测结果：</span>
                    <el-tag :type="roleTagType(inference_content?.data)" effect="dark" class="role-tag">
                        {{ inference_content?.data }}
                    </el-tag>
                </div>
            </div>
            <div
                class="result-userrole"
                v-else-if="getModelOption(model_selected)?.task_type === 'il_account_sub'"
            >
                <div class="label-row">
                    <el-icon class="label-icon"><User /></el-icon>
                    <span class="label-title">检测结果：</span>
                    <el-tag :type="illegalTagType(inference_content?.data)" effect="dark" class="role-tag">
                        {{ 
                            inference_content?.data === undefined || inference_content?.data === null 
                            ? '未预测' 
                            : (inference_content.data == 0 ? '正常账号' : '违规账号') 
                        }}
                    </el-tag>
                </div>
            </div>
            <LLM_12_classViewer 
                v-else-if="getModelOption(model_selected)?.label === 'llm_12_class'"
                :result="inference_content || {}"
            >
            </LLM_12_classViewer>
            <OffensiveViewer
                v-else
                :result="inference_content || {}"
            >
            </OffensiveViewer>
            <!-- <div >{{ inference_content?.data || '' }}</div> -->
        </div>
    </div>
</div>
</template>

<style lang="scss" scoped>
/* 原有基础样式保持不变 */
.result-userrole {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #f5f7fa;
    display: flex;
    align-items: center;
    .label-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .label-icon {
        color: #409eff;
    }
    .label-title {
        font-weight: 600;
        font-size: 1rem;
    }
    .role-tag {
        font-size: 0.95rem;
        padding: 0 0.75rem;
    }
}
.el-select.is-disabled {
    opacity: 0.7;
    pointer-events: none;
    
    & + .start-inference {
        margin-left: 16px;
    }
}

.content_main {
    height: 100%;
}
.inference-operation {
    display: flex;
    flex-direction: row;
    gap: 20px;
    align-items: center;
    max-width: 450px;
    height: 32px;
    
    .model-select {
        flex: 1;
        min-width: 200px;
        
        :deep(.el-input__inner) {
            border-color: #dcdfe6;
            transition: all 0.3s;
            cursor: pointer;
        
            &[disabled] {
                cursor: not-allowed;
                background: #f5f7fa;
                opacity: 0.8;
            }
        
            &:hover {
                border-color: #c0c4cc;
            }
        }
    }

    .start-inference {
        padding: 5.5px 16px;
        width: 100%;
        font-weight: 500;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:not([disabled]) {
            &:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            &:active {
                transform: translateY(0);
            }
        }
        
        &[disabled] {
            cursor: not-allowed;
            opacity: 0.7;
        }
    }
}

/* 将置顶按钮推到最右侧 */
.pin-control {
    margin-left: auto;
    display: flex;
    align-items: center;
    border: none;
    .el-button {
        border: none;
    }
    .el-button:hover {
        background: none;
        border: none;
    }
}

.inference_box {
    box-sizing: border-box;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 0 auto;
    height: 100%;
    width: 100%;
}

.inference_result {
    box-sizing: border-box;
    overflow-y: auto;
    width: 100%;
    height: 100%;
    scrollbar-width: none;
    display: flex;
    flex-direction: column;
    justify-items: center;
    align-items: center;
}

.card_url {
    margin-left: auto;
    display: inline-flex;
    gap: 5px;
    align-items: center;
    padding: 5.5px 16px;
    background: #f0f2f5;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    color: #1890ff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
    &:hover {
        background: #e6f4ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(24, 144, 255, 0.2);
    }

    .icon {
        margin-right: 4px;
        font-size: 16px;
    }

    .text {
        white-space: nowrap;
    }
}

.container {
    display: flex;
    flex-direction: row;
    justify-items: center;
    flex: 1;
}

.inference_index {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 600px;
    max-width: 626px;
    box-sizing: border-box;
    padding: 20px;
}

.inference_index .content {
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    overflow: auto;
    scrollbar-width: none;

    .item-meta-list {
        display: flex;
        flex-direction: column;
        gap: 25px;

        .item-meta {
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }
}

.card_title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
    white-space: normal; /* 必须设为 normal 才能支持多行 */
    word-break: break-word; /* 防止单词过长导致布局溢出 */
}

.title {
    font-family: 'Microsoft YaHei';
    font-weight: bold;
    color: rgb(30, 42, 66);
}

.card_author, .card_keyword, .card_time, .card_station {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    color: rgb(135, 131, 131);
}

.card_time {
    font-size: 14px;
    color: rgb(135, 131, 131);
    display: flex;
    align-items: center;
    justify-content: end;
}
.content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    line-height: 2;
    /* border-bottom: 1.5px solid lightgray; */
    box-sizing: border-box;
    width: 100%;
    height: 100%;
}
.content_fields {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 15px;
}

.index-header {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    
    .back-button {
        display: inline-flex;
        align-items: center;
        padding: 5.5px 16px;
        background: #f0f2f5;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        color: #333;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        
        &:hover {
            background: #e6f4ff;
            color: #1890ff;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(24, 144, 255, 0.2);
        }
        
        &.disabled {
            cursor: not-allowed;
            opacity: 0.6;
            pointer-events: none;
        }

        .icon {
            margin-right: 4px;
            font-size: 16px;
        }

        .text {
            white-space: nowrap;
        }
    }
}

/* 分割线样式 */
.divider {
    position: relative;
    width: 2px;
    height: calc(100% - 40px);
    margin: 20px 0;
    background: linear-gradient(to bottom, #e8e8e8, #c0c0c0, #e8e8e8);
    border-radius: 1px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.66);
    box-sizing: border-box;
    
    &::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    }
    
    &::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    }
}

.desc-text {
  white-space: pre-wrap;
}

/* 全局弹出层样式（需单独放在非scoped样式块） */
</style>

<style>
/* 对话框主体样式 */
.model-desc-popper {
  box-shadow: 0 6px 16px -4px rgba(0,0,0,.12), 0 9px 28px 0 rgba(0,0,0,.08) !important;
  border-radius: 12px !important;
  border: 1px solid #ebeef5 !important;
  padding: 16px !important;
  max-width: 320px !important;

  .model-desc-content {
    .desc-header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;

      .model-name {
        margin: 0;
        font-size: 16px;
        color: #303133;
        font-weight: 600;
        line-height: 1.4;
      }

      .el-tag {
        margin-left: 8px;
        height: 24px;
        padding: 0 8px;
        line-height: 22px;
        font-size: 12px;
      }
    }

    .desc-text {
      margin: 0 0 12px;
      font-size: 13px;
      line-height: 1.6;
      color: #606266;
      word-break: break-word;
    }

    .meta-info {
      border-top: 1px solid #f0f2f5;
      padding-top: 12px;
      margin-top: 12px;

      .meta-item {
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #909399;
        margin-bottom: 8px;

        .el-icon {
          margin-right: 6px;
          font-size: 14px;
          color: #c0c4cc;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .empty-tip {
    display: flex;
    align-items: center;
    padding: 8px;
    color: #909399;
    font-size: 13px;

    .el-icon {
      margin-right: 6px;
      font-size: 14px;
    }
  }
}

/* 分割线等原有样式保持不变 */
.divider {
    position: relative;
    width: 2px;
    height: calc(100% - 40px);
    margin: 20px 0;
    background: linear-gradient(to bottom, #e8e8e8, #c0c0c0, #e8e8e8);
    border-radius: 1px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.66);
    box-sizing: border-box;
    
    &::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    }
    
    &::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    }
}
</style>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/api/axios'
import { formatDateTime } from '@/utils/date'
import { render as markdownRender } from '@/utils/markdown.js'
import chatCard from '@/components/InferenceResultCard/NormalLLM.vue'
import StepLLM from '@/components/InferenceResultCard/StepLLM.vue'
import ArgResultViewer from '@/components/InferenceResultCard/ARG.vue'
import PIIResultViewer from '@/components/InferenceResultCard/PII.vue'
import OffensiveViewer from '@/components/InferenceResultCard/Offensive.vue'
import ENDEFViewer from '@/components/InferenceResultCard/ENDEF.vue'
import LexiconViewer from '@/components/InferenceResultCard/Lexicon.vue'
import DataImageViewer from '@/views/datasets/dataImageViewer.vue'
import ClassifyLLMReasoningViewer from '@/components/InferenceResultCard/Classify_LLM_reasoning.vue'
import StanceLLMViewer from '@/components/InferenceResultCard/StanceLLM.vue'
import MUSEViewer from '@/components/InferenceResultCard/MUSE.vue'
import Illegal_LLM_Viewer from '@/components/InferenceResultCard/Illegal_LLM.vue'
import DialogueViewer from '@/views/datasets/dialogueViewer.vue'
import VADViewer from '@/components/InferenceResultCard/VAD.vue'
import PropagationViewer from '@/views/datasets/propagationViewer.vue'
import PropaViewer from '@/components/InferenceResultCard/Propa.vue'
import LLM_12_classViewer from '@/components/InferenceResultCard/llm_12_class.vue'
import { ElMessage } from 'element-plus'

// 路由相关
const route = useRoute()
const router = useRouter()

// 状态管理
const group_id = ref<string | null>(null)
const dataset_id = ref<string | null>(null)
const data_id = ref<string | null>(null)
const dataset_type = ref<string | null>(null)
const task_type = ref<string | null>(null)

const data = ref<any>(null)
const model_options = ref<any[]>([])
const model_selected = ref<number | null>(null)
const inference_content = ref<any>(null)
const isLoading = ref(false)
const buffer = ref('')
const parseBuffer = ref<string[]>([])

// 模型类型常量
const MODELS = {
  LLM_REASONING: ['XLNetStanceClassifier1', 'XLNetStanceClassifier2', 'XLNetStanceClassifier3', 'sentiment_xlnet'],
  LLM_STANCE: ['stance_llm', 'stance_llm_target', 'sentiment_llm', 'sentiment_llm_target', 'mm_sentiment_llm'],
  LLM_ILLEGAL: [
    'history_nihilism', 'polity_speech', 'gender_discrimination', 'army_loans', 'people_locaion_leak', 
    'blacken_army_style', 'army_marriage', 'army_rumor', 'army_adapt_leak', 'weapon_leak', 'illegal_10_class',
    'bert_history_nihilism', 'bert_polity_speech', 'bert_gender_discrimination', 'bert_army_loans', 
    'bert_people_locaion_leak', 'bert_blacken_army_style', 'bert_army_marriage', 'bert_army_rumor', 
    'bert_army_adapt_leak', 'bert_weapon_leak', 'bert_army_information', 'army_violence', 'bert_army_violence', 
    'army_local', 'bert_army_local', 'bert_army_kn'
  ],
  PROPA: ['propa_cross', 'propa_few', 'propa', 'FNDCLIP']
}

// 计算属性
const currentModelInfo = computed(() => {
  const model = model_options.value.find(item => item.value === model_selected.value) || {}
  return {
    alias: model.alias || '未知模型',
    description: model.description || '暂无模型描述',
    model_type: model.model_type || 'DEFAULT',
    version: model.version || '1.0.0',
    framework: model.framework || 'PyTorch'
  }
})

// 方法
const roleTagType = (role: string): 'success' | 'info' | 'warning' | 'danger' => {
  switch (role) {
    case '企业机构官方': return 'success'
    case '大V/公众人物': return 'info'
    case '一般创作者': return 'warning'
    case '一般用户': return 'danger'
    default: return 'info'
  }
}

const illegalTagType = (label: number): 'success' | 'danger' | 'info' => {
  return label === 0 ? 'success' : label === 1 ? 'danger' : 'info'
}

const renderDescription = (markdownText: string) => {
  if (!markdownText) return '暂无模型描述信息'
  return markdownRender(markdownText).replace(/\\n/g, '<br>')
}

const pinLoading = ref(false)
// 计算当前是否置顶（从 props.currentData 中读取）
const pinnedState = computed(() => !!(data.value && data.value.is_pinned))

/**
 * 切换置顶状态：发请求到后端更新该条数据的 is_pinned 字段
 * - 使用 PATCH / POST 等语义化方法均可，示例用 PATCH 到 `${pinApiBase}/${id}/pin`
 * - 成功后 emit 一个事件供父组件刷新或本地更新
 */
async function togglePin() {
    console.log('togglePin', data.value)
    if (!data.value) {
        ElMessage.warning('无效的数据项，无法置顶')
        return
    }
    const newPinned = !pinnedState.value

    pinLoading.value = true
    try {
        // axios 写法
        const res = await axios.patch(`datasets/pin`, {
            dataset_id: dataset_id.value,
            data_id: data_id.value,
            is_pinned: newPinned,
        })

        if (res.status !== 200) {
            throw new Error(res.statusText || `HTTP ${res.status}`)
        }

        ElMessage.success(newPinned ? '已置顶' : '已取消置顶')
        data.value.is_pinned = res.data.is_pinned

    } catch (err: any) {
        console.error('togglePin error', err)
        ElMessage.error('置顶失败，请重试')
    } finally {
        pinLoading.value = false
    }
}

// 模板引用
const inferenceResultRef = ref<InstanceType<typeof StepLLM> | null>(null)

const fetchResult = async () => {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const { data: response } = await axios.post('/application/groups/SingleResult', {
      group_id: group_id.value,
      dataset_id: dataset_id.value,
      data_id: data_id.value,
      model_id: model_selected.value
    })
    
    inference_content.value = response.result ?? null
  } catch (error) {
    console.error('Fetch result failed:', error)
  } finally {
    isLoading.value = false
  }
}

const handleInference = async () => {
  if (!model_selected.value) {
    ElMessage.warning('请先选择模型')
    return
  }

  if (isLoading.value) return
  isLoading.value = true

  const payload = {
    group_id: group_id.value,
    dataset_id: dataset_id.value,
    data_id: data_id.value,
    model_id: model_selected.value,
  }

  const modelType = getModelOption(model_selected.value)?.model_type
  if (modelType === 'LLM') {
    flushBuffer()
    inferenceResultRef.value!.isLoading = true
    await startInferenceStreaming(payload)
  } else {
    inference_content.value = null
    try {
      await axios.post('/application/inference_item', payload, { timeout: 100000 })
    } catch (error) {
      console.error('Inference failed:', error)
    } finally {
      isLoading.value = false
      fetchResult()
    }
  }
}

const startInferenceStreaming = async (payload: object) => {
  const token = localStorage.getItem('user-token')
  
  try {
    const response = await fetch("/api/application/inference_streaming", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let done = false

    while (!done) {
      const { value, done: streamDone } = await reader.read()
      done = streamDone
      if (value) {
        buffer.value += decoder.decode(value, { stream: true })
        processBuffer(false)
      }
    }

    processBuffer(true)
  } catch (error) {
    console.error('Streaming failed:', error)
  } finally {
    isLoading.value = false
    fetchResult()
    inferenceResultRef.value!.isLoading = false
  }
}

const processBuffer = (final = false) => {
  const lines = buffer.value.split('\n')
  buffer.value = final ? '' : lines.pop() || ''
  
  lines.forEach(line => {
    if (line.trim()) parseBuffer.value.push(line)
  })
}

const getModelOption = (key: number) => {
  return model_options.value.find(option => option.value === key) || {}
}

const fetchData = async () => {
  try {
    const { data: response } = await axios.post(`/application/groups/${group_id.value}/SingleData`, {
      dataset_id: dataset_id.value,
      data_id: data_id.value,
    })
    data.value = response
  } catch (e) {
    ElMessage.error(e.message || '数据加载失败')
  }
}

const handleOpenLink = (url: string) => {
  if (!url) {
    ElMessage.warning('原文链接不存在')
    return
  }
  const fullUrl = url.startsWith('http') ? url : `http://${url}`
  window.open(fullUrl, '_blank')
}

const handleBack = () => {
  router.back()
}

const flushBuffer = () => {
  buffer.value = ''
  parseBuffer.value = []
  inferenceResultRef.value?.flushBuffer?.()
}

const fetchAvailableModel = async () => {
  try {
    const { data: response } = await axios.post('/models', {
      dataset_id: dataset_id.value,
      group_id: group_id.value,
      task_type: task_type.value
    })
    model_options.value = response
  } catch (e) {
    ElMessage.error(e.message || '模型列表加载失败')
  }
}

// 生命周期钩子
onMounted(() => {
  // 从路由获取参数
  const { group_id: gid, dataset_id: did, data_id: dId, dataset_type: dt, task_type: tt } = route.query
  group_id.value = Array.isArray(gid) ? gid[0] : gid
  dataset_id.value = Array.isArray(did) ? did[0] : did
  data_id.value = Array.isArray(dId) ? dId[0] : dId
  dataset_type.value = Array.isArray(dt) ? dt[0] : dt
  task_type.value = Array.isArray(tt) ? tt[0] : tt

  fetchData()
  fetchAvailableModel()
})

// 监听模型选择变化
watch(model_selected, (newVal) => {
  if (newVal !== null) {
    handleInference()
  }
})
</script>
