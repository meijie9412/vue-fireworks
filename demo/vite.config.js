import { defineConfig } from 'vite'
import { resolve } from 'path'

// 演示用：root 指向包目录，/engine.js 重定向到 dist/engine.js
// 引擎已抽离到 @meijie/fireworks-core，本地联调指向其构建产物
const LOCAL_CORE = resolve(__dirname, '../../fireworks-core/dist/engine.js')

export default defineConfig({
  root: resolve(__dirname, '..'),
  server: { host: '127.0.0.1', port: 5190, strictPort: true },
  resolve: {
    alias: {
      '/engine.js': resolve(__dirname, '../dist/engine.js'),
      '@meijie/fireworks-core': LOCAL_CORE
    }
  }
})
