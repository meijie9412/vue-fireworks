import { FireworksOptions } from './index'

export * from './index'

export declare class FireworksEngine {
  constructor(canvas: HTMLCanvasElement, options?: FireworksOptions)
  options: FireworksOptions
  /** 运行时更新配置 */
  setOptions(options?: FireworksOptions): void
  /** 触发一轮，overrides 临时覆盖配置 */
  fire(overrides?: FireworksOptions): void
  /** 立即停止并清空 */
  stop(): void
  /** 彻底销毁并解绑事件 */
  destroy(): void
  /** 播放结束回调 */
  onEnd: (() => void) | null
}

export default FireworksEngine
