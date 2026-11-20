import { describe, it, expect } from 'vitest'
import DefaultEngine, { FireworksEngine, PRESETS } from '../src/engine-compat.js'

describe('@meijie/vue-fireworks/engine 兼容层', () => {
  it('具名导出引擎类与预设', () => {
    expect(typeof FireworksEngine).toBe('function')
    expect(PRESETS.show.loop).toBe(true)
    expect(PRESETS.salute.secondary).toBeGreaterThan(0)
    expect(PRESETS.waterfall.fall).toBe(true)
  })

  it('default 导出与具名 FireworksEngine 是同一个类', () => {
    expect(DefaultEngine).toBe(FireworksEngine)
  })

  it('导出的预设覆盖三种效果', () => {
    expect(Object.keys(PRESETS)).toEqual(['show', 'salute', 'waterfall'])
    expect(PRESETS.waterfall.fall).toBe(true)
  })
})
