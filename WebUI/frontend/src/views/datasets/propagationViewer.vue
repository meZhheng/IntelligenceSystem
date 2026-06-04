<template>
<div class="propagation-viewer">
    <header class="root-comment">
    <h3>原评论</h3>
    <div class="comment-content depth-0">
        {{ rootComment.content }}
    </div>
    </header>
    <div class="subtree">
    <div
        v-for="(node, idx) in subtree"
        :key="node.comment.id"
        class="node"
        :class="`depth-${node.depth}`"
        :style="{ marginLeft: `${node.depth * 20}px` }"
    >
        <div class="comment-box">
        <div class="comment-meta">
            <span class="comment-id">#{{ node.comment.id }}</span>
            <span v-if="node.depth">回复于 #{{ node.comment.parent_id }}</span>
        </div>
        <p class="comment-text">{{ node.comment.content }}</p>
        </div>
    </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type CommentNode = {
comment: {
    id: number;
    content: string;
    parent_id: number | null;
};
depth: number;
}

const props = defineProps<{
    root: { id: number; content: string };
    subtree: CommentNode[];
}>()

const rootComment = computed(() => props.root)
</script>

<style scoped>
.propagation-viewer {
background: #fff;
border-radius: 8px;
padding: 16px;
max-width: 800px;
margin: auto;
box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.root-comment h3 {
margin: 0 0 8px;
font-size: 18px;
}
.comment-content {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.5;
}
.subtree .node {
    margin-top: 12px;
}
.comment-box {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
    position: relative;
}
.depth-1 .comment-box { background: #fcfcfc; }
.depth-2 .comment-box { background: #fafafa; }
/* 更深层可以相应加淡色 */
.comment-meta {
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
}
.comment-id {
    font-weight: bold;
    margin-right: 8px;
}
.comment-text {
    margin: 0;
    font-size: 14px;
    color: #333;
}
</style>
  