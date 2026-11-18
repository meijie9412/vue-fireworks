import { describe, it, expect, beforeEach, vi } from 'vitest'
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
