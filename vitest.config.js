import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// 本地联调：兼容层指向 core 源码，发布后消费者走真实依赖
const LOCAL_CORE = resolve(__dirname, '../fireworks-core/src/engine.js')

export default defineConfig({
  resolve: {
    alias: [{ find: /^@meijie\/fireworks-core$/, replacement: LOCAL_CORE }]
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
})
