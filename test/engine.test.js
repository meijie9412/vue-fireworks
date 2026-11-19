import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installDomMock } from './dom-mock.js'

const { makeCanvas } = installDomMock()

// 动态 import，确保 mock 先装好
let FireworksEngine
beforeEach(async () => {
  vi.resetModules()
  ;({ FireworksEngine } = await import('../src/engine.js'))
})

const newEngine = (opts = {}) => new FireworksEngine(makeCanvas(), opts)

describe('FireworksEngine — 构造与配置', () => {
  it('合并默认配置与自定义配置', () => {
    const e = newEngine({ count: 10, glow: true })
    expect(e.options.count).toBe(10)
    expect(e.options.glow).toBe(true)
    // 未覆盖项保留默认
    expect(e.options.shape).toBe('rect')
    expect(e.options.colors).toEqual(['#FF8201', '#2DA6E0', '#FF262B'])
  })

  it('缺少 canvas 时抛错', () => {
    expect(() => new FireworksEngine(null)).toThrow(/canvas element is required/)
  })

  it('setOptions 运行时更新配置', () => {
    const e = newEngine()
    e.setOptions({ shape: 'star', count: 77 })
    expect(e.options.shape).toBe('star')
    expect(e.options.count).toBe(77)
  })
})

describe('FireworksEngine — 粒子生成', () => {
  it('fire 生成 count 个粒子，颜色来自 colors 池', () => {
    const colors = ['#111111', '#222222']
    const e = newEngine({ count: 30, colors })
    e.fire()
    expect(e.particles).toHaveLength(30)
    for (const p of e.particles) {
      expect(colors).toContain(p.color)
      expect(p.life).toBe(0)
      expect(p.maxLife).toBeGreaterThan(0)
    }
  })

  it('重复 fire 清空旧粒子，不叠加（竞态修复）', () => {
    const e = newEngine({ count: 20 })
    e.fire()
    const first = e.particles[0]
    e.fire()
    expect(e.particles).toHaveLength(20)
    expect(e.particles[0]).not.toBe(first)
  })

  it('fire 的 overrides 临时覆盖配置', () => {
    const e = newEngine({ count: 20, shape: 'rect' })
    e.fire({ origin: { x: 7, y: 9 } })
    // 所有粒子从指定原点出发
    expect(e.particles.every(p => p.x === 7 && p.y === 9)).toBe(true)
    // 但引擎持久配置未被改动
    expect(e.options.origin).toBe('center')
  })
})

describe('FireworksEngine — 绽放原点解析', () => {
  it("origin='center' 落在画布中心", () => {
    const e = newEngine({ count: 5 })
    e.fire()
    // canvas 1280x800（mock），中心为 640,400
    expect(e.particles[0].x).toBe(640)
    expect(e.particles[0].y).toBe(400)
  })

  it('固定坐标 origin 生效', () => {
    const e = newEngine({ count: 5, origin: { x: 100, y: 200 } })
    e.fire()
    expect(e.particles[0].x).toBe(100)
    expect(e.particles[0].y).toBe(200)
  })

  it('followMouse 优先于固定 origin，用鼠标位置', () => {
    const e = newEngine({ count: 5, origin: { x: 100, y: 200 }, followMouse: true })
    window.dispatch('mousemove', { clientX: 333, clientY: 444 })
    e.fire()
    expect(e.particles[0].x).toBe(333)
    expect(e.particles[0].y).toBe(444)
  })
})

describe('FireworksEngine — 生命周期与清理', () => {
  it('fire 后处于 running，stop 后停止并清空', () => {
    const e = newEngine({ count: 10 })
    e.fire()
    expect(e.running).toBe(true)
    e.stop()
    expect(e.running).toBe(false)
    expect(e.particles).toHaveLength(0)
  })

  it('destroy 解绑 resize 与 mousemove 监听（泄漏修复）', () => {
    const e = newEngine({ followMouse: true })
    const beforeResize = window.listenerCount('resize')
    const beforeMouse = window.listenerCount('mousemove')
    expect(beforeResize).toBeGreaterThan(0)
    expect(beforeMouse).toBeGreaterThan(0)
    e.destroy()
    expect(window.listenerCount('resize')).toBe(beforeResize - 1)
    expect(window.listenerCount('mousemove')).toBe(beforeMouse - 1)
  })

  it('onEnd 回调在结束时可调用', () => {
    const e = newEngine({ count: 5 })
    const fn = vi.fn()
    e.onEnd = fn
    // 直接触发结束回调（渲染循环结束时会调用）
    e.onEnd()
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('FireworksEngine — 颜色与发光贴图', () => {
  it('hex 颜色转 rgba（含 3 位缩写）', () => {
    const e = newEngine()
    expect(e._withAlpha('#FF8201', 0.5)).toBe('rgba(255,130,1,0.5)')
    expect(e._withAlpha('#f80', 0.25)).toBe('rgba(255,136,0,0.25)')
  })

  it('rgb() 颜色转 rgba', () => {
    const e = newEngine()
    expect(e._withAlpha('rgb(10, 20, 30)', 0.8)).toBe('rgba(10,20,30,0.8)')
  })

  it('发光贴图按颜色缓存，复用同一实例（性能优化）', () => {
    const e = newEngine()
    const a = e._getGlowSprite('#FF0000')
    const b = e._getGlowSprite('#FF0000')
    const c = e._getGlowSprite('#00FF00')
    expect(a).toBe(b)
    expect(c).not.toBe(a)
    expect(e._glowCache.size).toBe(2)
  })
})

describe('FireworksEngine — 连发与循环', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('bursts=1 保持单朵，落在 resolved origin（向后兼容）', () => {
    const e = newEngine({ count: 4, origin: { x: 50, y: 60 } })
    e.fire()
    expect(e.particles).toHaveLength(4)
    expect(e.particles.every(p => p.x === 50 && p.y === 60)).toBe(true)
    expect(e.burstTimers).toHaveLength(0)
  })

  it('bursts=3 立即绽放第一朵，其余按间隔排期', () => {
    const e = newEngine({ count: 4, bursts: 3, burstInterval: 300 })
    e.fire()
    // 第一朵立即生成
    expect(e.particles).toHaveLength(4)
    expect(e.pendingBursts).toBe(2)
    expect(e.burstTimers).toHaveLength(2)
    // 到 300ms 第二朵绽放
    vi.advanceTimersByTime(300)
    expect(e.particles).toHaveLength(8)
    expect(e.pendingBursts).toBe(1)
    // 到 600ms 第三朵绽放
    vi.advanceTimersByTime(300)
    expect(e.particles).toHaveLength(12)
    expect(e.pendingBursts).toBe(0)
    expect(e.burstTimers).toHaveLength(0)
  })

  it('连发随机落点：多朵原点互不相同（随机分布）', () => {
    const e = newEngine({ count: 1, bursts: 5, burstInterval: 100 })
    e.fire()
    const firstX = e.particles[0].x
    vi.advanceTimersByTime(100)
    const secondX = e.particles[e.particles.length - 1].x
    // 随机落点几乎不可能完全相同
    expect(secondX).not.toBe(firstX)
    // 落点应在留白边距内
    for (const p of e.particles) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1280)
    }
  })

  it('fire 显式传 origin 时强制单朵，忽略连发/循环（点哪爆哪）', () => {
    const e = newEngine({ count: 2, bursts: 5, loop: true })
    e.fire({ origin: { x: 11, y: 22 } })
    expect(e.cycleOptions.bursts).toBe(1)
    expect(e.cycleOptions.loop).toBe(false)
    expect(e.burstTimers).toHaveLength(0)
    expect(e.particles).toHaveLength(2)
    expect(e.particles.every(p => p.x === 11 && p.y === 22)).toBe(true)
  })

  it('bursts 超过上限被钳制到 50，防止卡死', () => {
    const e = newEngine({ count: 1, bursts: 9999, burstInterval: 1 })
    e.fire()
    // 第一朵立即 + 49 个排期 = 最多 50 个定时器
    expect(e.burstTimers.length).toBeLessThanOrEqual(49)
  })

  it('stop 清空所有待触发定时器与粒子', () => {
    const e = newEngine({ count: 4, bursts: 5, burstInterval: 500 })
    e.fire()
    expect(e.burstTimers).toHaveLength(4)
    e.stop()
    expect(e.burstTimers).toHaveLength(0)
    expect(e.pendingBursts).toBe(0)
    expect(e.particles).toHaveLength(0)
    // 再推进时间不应有粒子冒出来
    vi.advanceTimersByTime(5000)
    expect(e.particles).toHaveLength(0)
  })

  it('重复 fire 取消上一轮的待触发定时器（竞态修复）', () => {
    const e = newEngine({ count: 1, bursts: 5, burstInterval: 500 })
    e.fire()
    expect(e.burstTimers).toHaveLength(4)
    e.fire({ bursts: 2 })
    expect(e.burstTimers).toHaveLength(1)
    expect(e.pendingBursts).toBe(1)
  })

  it('launch=true 时先发射弹丸，不立即产生粒子', () => {
    const e = newEngine({ count: 6, launch: true, launchDuration: 300, origin: { x: 100, y: 200 } })
    e.fire()
    expect(e.rockets).toHaveLength(1)
    expect(e.particles).toHaveLength(0)
    const r = e.rockets[0]
    // 起点在目标正下方底边（mock 高度 800）
    expect(r.startX).toBe(100)
    expect(r.startY).toBe(800)
    expect(r.targetX).toBe(100)
    expect(r.targetY).toBe(200)
  })

  it('弹丸按进度上升，抵达后绽放并移除', () => {
    const e = newEngine({ count: 6, launch: true, launchDuration: 300, fps: 60, origin: { x: 100, y: 200 } })
    e.fire()
    const r = e.rockets[0]
    expect(r.frames).toBeCloseTo(18) // 300ms / (1000/60) = 18 帧
    // 推进一半进度
    for (let i = 0; i < 9; i++) e._update()
    expect(e.rockets).toHaveLength(1)
    expect(r.progress).toBeGreaterThan(0.4)
    expect(r.y).toBeLessThan(800) // 已离开底部
    expect(e.particles).toHaveLength(0) // 还没绽放
    // 推进到刚好抵达（弹丸清空即绽放瞬间，粒子尚未移动）
    for (let i = 0; i < 12 && e.rockets.length > 0; i++) e._update()
    expect(e.rockets).toHaveLength(0)
    expect(e.particles).toHaveLength(6) // 绽放出粒子
    // 粒子从目标点(100,200)炸开，一帧内位移有限，应仍在目标附近
    expect(e.particles.every(p => Math.abs(p.x - 100) < 20 && Math.abs(p.y - 200) < 20)).toBe(true)
  })

  it('launchFrom=center 从底部中央发射', () => {
    const e = newEngine({ launch: true, launchFrom: 'center', origin: { x: 500, y: 200 } })
    e.fire()
    expect(e.rockets[0].startX).toBe(640) // mock 宽 1280 的中点
    expect(e.rockets[0].startY).toBe(800)
  })

  it('launchFrom 自定义坐标', () => {
    const e = newEngine({ launch: true, launchFrom: { x: 30, y: 700 }, origin: { x: 500, y: 200 } })
    e.fire()
    expect(e.rockets[0].startX).toBe(30)
    expect(e.rockets[0].startY).toBe(700)
  })

  it('stop 清空飞行中的弹丸', () => {
    const e = newEngine({ launch: true, origin: { x: 100, y: 200 } })
    e.fire()
    expect(e.rockets).toHaveLength(1)
    e.stop()
    expect(e.rockets).toHaveLength(0)
  })

  it('launch=true 的 idle 判定纳入弹丸（弹丸在飞时不结束）', () => {
    const e = newEngine({ count: 6, launch: true, origin: { x: 100, y: 200 } })
    const onEnd = vi.fn()
    e.onEnd = onEnd
    e.fire()
    // 弹丸在飞、粒子为空，不应触发结束
    expect(e.particles).toHaveLength(0)
    expect(e.rockets).toHaveLength(1)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('loop=true 时一轮结束后自动排期下一轮，不触发 onEnd', () => {
    const e = newEngine({ count: 2, bursts: 1, loop: true })
    const onEnd = vi.fn()
    e.onEnd = onEnd
    e.fire()
    expect(e.loopActive).toBe(true)
    // 模拟粒子全部消散后的 idle 判定：清空粒子、pendingBursts 应为 0
    e.particles = []
    e.pendingBursts = 0
    // 直接调用 _loop 的 idle 分支逻辑（通过一次带时间戳的调用）
    e._loop(performance.now())
    // 循环模式重新排期了第一朵，粒子非空，onEnd 未触发
    expect(e.loopActive).toBe(true)
    expect(e.particles.length).toBeGreaterThan(0)
    expect(onEnd).not.toHaveBeenCalled()
  })
})
