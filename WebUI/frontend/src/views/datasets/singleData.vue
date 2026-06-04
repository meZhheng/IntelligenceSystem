<template>
<div class="container">
    <div class="inference_index">
        <DataImageViewer class="content" :data="data" v-if="dataset_type == 'IMAGE'">
        </DataImageViewer>
        <DialogueViewer class="content" :session="data" v-else-if="dataset_type == 'INTERACTIVE_DIALOGUE'">
        </DialogueViewer>
        <PropagationViewer class="content" v-else-if="dataset_type == 'PROPAGATION'"
            :root="{ id: data?.id, content: data?.content }" 
            :subtree="data?.subtree" 
        >
        </PropagationViewer>
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
</div>
</template>

<script setup lang="ts">
import DataImageViewer from '@/views/datasets/dataImageViewer.vue';
import DialogueViewer from '@/views/datasets/dialogueViewer.vue';
import PropagationViewer from '@/views/datasets/propagationViewer.vue';
import { formatDateTime } from '@/utils/date';
import { useRoute } from 'vue-router'
import { onMounted, ref } from "vue";
import axios from '@/api/axios';
import { ElMessage } from 'element-plus';

const data = ref<any>(null);
const dataset_type = ref<string | null>(null);

const route = useRoute();

function fetchData(){
    const link = `/datasets/SingleData`
    const payload = {
        dataset_id: route.params.dataset_id,
        data_id:  route.query.data_id,
    }

    axios.post(link, payload).then((response) => {
        data.value = response.data
    }).catch((e) => {
        ElMessage.error(String(e))
    })
}

onMounted(() => {
    dataset_type.value = Array.isArray(route.query.dataset_type)
        ? route.query.dataset_type[0]
        : route.query.dataset_type
    fetchData()
})

</script>

<style scoped lang="scss">
.content_main {
    height: 100%;
}
.container {
    display: flex;
    flex-direction: row;
    justify-items: center;
    justify-content: center;
    flex: 1;
}

.inference_index {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 600px;
    max-width: 1280px;
    box-sizing: border-box;
    padding: 20px;
}

.inference_index .content {
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    overflow: auto;
    scrollbar-width: thin;
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
</style>