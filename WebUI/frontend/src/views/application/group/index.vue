<template>
  <div class="main-box">
    <Overview 
      v-if="item_selected==='overview'" 
      :group="pass_datasets"
    />
    <dataChart
      v-else-if="item_selected==='analysis'"
      :group="pass_datasets"
    />
    <datasetSpace v-else-if="item_selected==='datasets'" :path="passPath"/>
    <modelSpace v-else-if="item_selected==='models'" />
    <EmotionIntro v-else />
  </div>
</template>

<script lang="ts">
  import Sidebar from '@/components/layouts/Sidebar.vue';
  import EmotionIntro from './introduction.vue';
  import Overview from './overview.vue';
  import dataChart from './dataChart.vue';
  import { useStore } from '@/store';
  import datasetSpace from '@/views/application/datasetSpace.vue';
  import modelSpace from '@/views/models/modelSpace.vue';

  export default {
    components: {
      Sidebar,
      EmotionIntro,
      Overview,
      dataChart,
      datasetSpace,
      modelSpace,
    },


    data() {
      return {
        app_groups: [],
        default_groups: [],

        groupExpand: {},
        item_selected: null,

        workshop_visible: false,
        default_visible: false,

        select_default: null,
        select_index: null,

        store: useStore(),

        create_group_info: {
          name: '',
          dataset_selected: [],
          default: false,
        },
        
        dataset_available: [],
        create_group_visible: false,
        checkAll_dataset: false,
        indeterminate_dataset: false,

        datasets_visable: true,
        datasets_path: '',
      };
    },

    computed: {
      pass_datasets() {
        return this.select_default 
          ? this.default_groups.find(group => group.id === this.select_index) || {}
          : this.app_groups.find(group => group.id === this.select_index) || {};
      },

      passPath() {
        return this.datasets_path
      }
    },

    methods: {
      showDatasets(path: string) {
        this.item_selected = 'datasets'
        this.datasets_path = path
      },

      handleCreateGroupClick(mode: string) {
        this.create_group_info.default = mode === 'default';
        this.create_group_visible = true;
      },
    
    },

    watch: { 
      'create_group_info.dataset_selected': {
        handler(newVal) {
          const total = this.dataset_available.length;
          if (newVal.length === 0) {
            this.checkAll_dataset = false;
            this.indeterminate_dataset = false;
          } else if (newVal.length === total) {
            this.checkAll_dataset = true;
            this.indeterminate_dataset = false;
          } else {
            this.indeterminate_dataset = true;
          }
        },
      },
    }
  }
</script>
