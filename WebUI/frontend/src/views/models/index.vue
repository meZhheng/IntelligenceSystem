<template>
  <div>
    <el-card v-for="(model, index) in models" :key="index" style="max-width: 720px">
      <template #header>
        <div class="card-header">
          <a :href="'models/' + model.id" target="_blank">{{ model.name }}</a>
        </div>
      </template>
      <p>{{ model.description }}</p>
      <p>Last updated: {{ model.updated }}</p>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import axios from '@/api/axios'

  interface Model {
    id: string;
    name: string;
    description: string;
    updated: string;
  }

  const models = ref<Model[]>([])

  const fetchData = async () => {
    try {
      const response = await axios.get('/models')
      models.value = response.data

      console.log(models.value)
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  }

  fetchData()
  
</script>

<style scoped>
  .el-card {
    margin: 0 auto;
    margin-bottom: 20px;
  }
</style>
