<template>
    <div class="item"> 
        <div class="header">
            <h2>情感分析</h2>
        </div>
        <div class="content">
            <div class="intro-row">
                <!-- <div class="intro-header">
                    应用简介
                </div> -->
                <div class="intro-content">
                    暂无数据，请先创建应用组。
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    export default {
        name: 'EmotionAnalysis'
    }

</script>

<style scoped>  
    .item {
        width: 100%;
    }
    .header {
        margin: 0 auto;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 768px;
    }

    .content {
        margin: 0 auto;
        display: flex;
        flex: 1;
        gap: 50px;
        box-sizing: border-box;
        flex-direction: column;
        align-items: center;
        max-width: 768px;
        /* background-color: #F5F7FA; */
        padding: 30px 16px;
        border-radius: 5px;
    }

    .intro-row {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 15px;
    }
    
    .intro-header {
        font-weight: bold;
    }
</style>