/** 粒子形状 */
export type FireworksShape = 'rect' | 'circle' | 'star' | 'heart' | 'text'

/** 绽放原点：'center' / 'top'(瀑布顶部) 或 canvas 内的 CSS 像素坐标 */
export type FireworksOrigin = 'center' | 'top' | { x: number; y: number }

/** 预设效果名 */
export type FireworksPreset = 'show' | 'salute' | 'waterfall'

/** 颜色池取色模式 */
export type ColorMode = 'random' | 'gradient'

/** 所有可配置项（props 与 engine options 共用） */
export interface FireworksOptions {
  /** 每轮粒子数，默认 60 */
  count?: number
  /** 颜色池，默认 ['#FF8201','#2DA6E0','#FF262B'] */
  colors?: string[]
  /** 粒子形状，默认 'rect' */
  shape?: FireworksShape
  /** 重力加速度(px/frame²)，默认 0.12 */
  gravity?: number
  /** 空气阻力(速度衰减系数)，默认 0.985 */
  friction?: number
  /** 爆炸初速度上限，默认 5 */
  spread?: number
  /** 粒子尺寸(px)，默认 4 */
  size?: number
  /** 拖尾残影，默认 false */
  trail?: boolean
  /** 发光，默认 false */
  glow?: boolean
  /** 粒子最大寿命(帧)，默认 90 */
  duration?: number
  /** 绽放原点，默认 'center' */
  origin?: FireworksOrigin
  /** 跟随鼠标（优先级高于 origin），默认 false */
  followMouse?: boolean
  /** 一次触发连续绽放几朵（1 = 单朵），默认 1，最大 50 */
  bursts?: number
  /** 相邻两朵的间隔(ms)，默认 280 */
  burstInterval?: number
  /** 循环连放，直到 stop()/show=false，默认 false */
  loop?: boolean
  /** 是否显示发射过程（弹丸升空后绽放），默认 false */
  launch?: boolean
  /** 弹丸升空时长(ms)，默认 1200 */
  launchDuration?: number
  /** 发射起点：'below'(绽放点正下方底边) | 'center' | {x,y}，默认 'below' */
  launchFrom?: 'below' | 'center' | { x: number; y: number }
  /** 帧率，默认 60 */
  fps?: number
  /** 预设效果，传入时展开为一组配置；同对象内的显式键优先，默认 null */
  preset?: FireworksPreset | null
  /** 二次爆炸分裂出的子粒子数，0 = 关闭，默认 0 */
  secondary?: number
  /** 二次爆炸触发时机（占粒子寿命比例 0~1），默认 0.5 */
  secondaryAt?: number
  /** 颜色池取色模式：random 随机 / gradient 生命周期内渐变，默认 'random' */
  colorMode?: ColorMode
  /** Web Audio 合成音效（发射咻声 + 绽放爆响），默认 false */
  sound?: boolean
  /** 音效音量 0~1，默认 0.35 */
  volume?: number
  /** shape='text' 时的文字内容，默认 '★' */
  text?: string
  /** 冲击波环最大半径(px)，0 = 关闭，默认 0 */
  shockwave?: number
  /** 瀑布下落模式：粒子从顶部向下洒落，默认 false */
  fall?: boolean
}

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
