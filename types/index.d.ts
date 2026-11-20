import type { FireworksOptions } from '@meijie/fireworks-core'

// Framework-agnostic types are now owned by @meijie/fireworks-core.
export type {
  FireworksShape,
  FireworksOrigin,
  FireworksPreset,
  ColorMode,
  FireworksOptions
} from '@meijie/fireworks-core'

/** Vue 组件实例上暴露的命令式方法 */
export interface VueFireworksInstance {
  /** 手动触发一轮，可临时覆盖配置 */
  fire(overrides?: FireworksOptions): void
  /** 立即停止并清空 */
  stop(): void
}

declare const VueFireworks: {
  name: string
  install(app: any): void
}

export default VueFireworks
