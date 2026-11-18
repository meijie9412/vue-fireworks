import { defineConfig } from 'vite'
import { resolve } from 'path'

const entries = {
  index: resolve(__dirname, 'src/vue2.js'),   // 默认入口 = Vue2（向后兼容）
  vue3: resolve(__dirname, 'src/vue3.js'),
  engine: resolve(__dirname, 'src/engine.js')
}

// 通过 FORMAT 环境变量分两次构建，避免 es/cjs 产物互相覆盖
const format = process.env.FORMAT === 'cjs' ? 'cjs' : 'es'
const ext = format === 'cjs' ? 'cjs' : 'js'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: format === 'es', // 第一次(es)清空，第二次(cjs)追加
    lib: {
      entry: entries,
      formats: [format],
      // Vite4 回调签名: (format, entryName) —— 第二个参数才是入口名
      fileName: (fmt, entryName) => `${entryName}.${ext}`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        chunkFileNames: (chunk) => `shared-${chunk.name}-${format}.${ext}`
      }
    }
  }
})
