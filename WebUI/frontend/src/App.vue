<script setup lang="ts">
import { provideStore } from "@/store";

provideStore();
</script>

<template>
  <navbar v-if="!$route.meta.hideNavbar"></navbar>
  <div class="page-main-content">
    <Sidebar></Sidebar>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component
          v-if="$route.meta.keepAlive"
          :is="Component"
          :key="$route.fullPath"
        />
      </keep-alive>
      <component
        v-if="!$route.meta.keepAlive"
        :is="Component"
        :key="$route.fullPath"
      />
    </router-view>
  </div>
</template>

<script lang="ts">
import Navbar from "@/components/layouts/Navbar.vue";
import Sidebar from "./components/layouts/Sidebar.vue";

export default {
  name: "App",
  components: {
    navbar: Navbar,
  },
  computed: {
    isHideNavbar() {
      // 获取当前路由的所有层级
      const currentRoute = this.$route.matched;

      //检查所有路由层级的meta信息
      return currentRoute.some((route) => route.meta && route.meta.hideNavbar);
    },
  },
};
</script>

<style>
.page-main-content {
  display: flex;
  flex-direction: row;
  flex: 1;

  box-sizing: border-box;
  width: 100%;
  height: calc(100% - 60px);
}

#app {
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
}

html {
  width: 100%;
  height: 100%;
  display: flex;
}

body {
  margin: 0 auto;
  width: 100%;
  height: 100%;
}

#box {
  box-sizing: border-box;
  width: 100%;
  height: calc(100% - 60px);
}

.disable-select {
  -webkit-user-select: none; /* Chrome/Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE10+ */
  user-select: none; /* 标准 */
}

h2 {
  margin: 20px 0;
}
</style>
