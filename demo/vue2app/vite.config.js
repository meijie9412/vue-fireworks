import { defineConfig } from 'vite'
import { createVuePlugin } from 'vite-plugin-vue2'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname),
  server: { host: '127.0.0.1', port: 5192, strictPort: true },
  plugins: [createVuePlugin()],
  resolve: { alias: { 'vue': resolve(__dirname, 'node_modules/vue/dist/vue.common.dev.js') } }
})
