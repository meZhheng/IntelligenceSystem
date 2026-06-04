import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src') 
      // 兼容src目录下的文件夹可通过 @/components/HelloWorld.vue写法 
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/rq': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/apidocs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/flasgger_static': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    }
  }
})
