<template>
<div class="ranking-board disable-select">
    <div class="chart-title">
        {{ header_content }}
    </div>
    <div class="ranking_board" v-if="loading !== true">
        <div class="ranking_board_header">
            <span>排名</span>
            <span v-for="(item, index) in ranking_data.title" :key="index">
                {{ item }}
            </span>
        </div>
        <div class="ranking_list">
            <div class="ranking_item" v-for="(item, index) in ranking_data.content.slice(0, 15)" :key="index">
                <div class="ranking_item_rank"             
                :class="{
                    'rank-1': index === 0,
                    'rank-2': index === 1,
                    'rank-3': index === 2,
                    'rank-other': index >= 3
                }">{{ index + 1 }}
                </div>
                <span v-for="(type, index) in ranking_data.field" :key="index">
                    {{ item?.[type] || '未认证' }}
                </span>
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">

export default {
    name: 'RankingBoard',

    props: {
        ranking_data: {
            type: Object,
            required: true
        },

        header_content: {
            type: String,
            required: false,
        }
    },

    watch: {
        ranking_data:{
            handler(newValue) {
                if (newValue && Object.keys(newValue).length > 0) {
                    this.loading = false;
                }
            },
        }
    },

    data() {
        return {
            loading: true,
        }
    }
}

</script>

<style scoped>
.ranking_list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.ranking_item_rank {
    width: 24px;
    color: white;
    text-align: center;
    box-sizing: border-box;
    border-radius: 3px;
}

.ranking_item {
    display: grid;
    gap: 100px;
    grid-template-columns: 50px 1fr 80px 80px 50px;
    align-items: center;
}

.ranking_item span:nth-last-child(4),
.ranking_item span:nth-last-child(3),
.ranking_item span:nth-last-child(2),
.ranking_item span:last-child {
    justify-self: center; /* 让最后一个元素靠右 */
    text-align: center; /* 适用于文本 */
}

.ranking_board {
    box-sizing: border-box;
    height: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.ranking_board_header {
    width: 100%;
    display: grid;
    grid-template-columns: 50px 1fr 80px 80px 50px;
    gap: 100px;
    overflow: hidden;
}

.ranking_board_header span:nth-last-child(4),
.ranking_board_header span:nth-last-child(3),
.ranking_board_header span:nth-last-child(2),
.ranking_board_header span:last-child {
    justify-self: center; /* 让最后一个元素靠右 */
    text-align: center; /* 适用于文本 */
}

.ranking-board { 
    width: 100%;
    height: 100%;
    background-color: #fff;
    box-sizing: border-box;
    padding: 20px;
    border-radius: 5px;
    height: 680px;
}

.chart-title {
    margin: 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    justify-content: space-between;
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 22px;
    box-sizing: border-box;
    border-bottom: rgb(232, 232, 232) 1px solid;
    margin-bottom: 10px;
}

/* 配色方案 */
.rank-1 { background-color: rgb(245, 69, 69); } /* 鲜艳红 */
.rank-2 { background-color: rgb(255, 133, 71); } /* 复古棕 */
.rank-3 { background-color: rgb(255, 172, 56); } /* 温暖黄 */
.rank-other { background-color: rgb(142, 185, 245); } /* 深蓝色 */
</style>