/**
 * FireworksEngine — 纯 Canvas 粒子引擎
 * 不依赖任何框架，供 Vue2 / Vue3 薄壳共用。
 */

const DEFAULTS = {
  count: 60,                                   // 每轮粒子数
  colors: ['#FF8201', '#2DA6E0', '#FF262B'],   // 颜色池
  shape: 'rect',            // 'rect' | 'circle' | 'star'
  gravity: 0.12,            // 重力加速度(px/frame^2)
  friction: 0.985,          // 空气阻力(速度衰减系数)
  spread: 5,                // 爆炸初速度上限
  size: 4,                  // 粒子尺寸(px)
  trail: false,             // 拖尾残影
  glow: false,              // 发光
  duration: 90,             // 粒子最大寿命(帧)
  origin: 'center',         // 'center' | { x, y }，(x,y) 为 CSS 像素坐标
  followMouse: false,       // 跟随鼠标
  bursts: 1,                // 一次触发连续绽放几朵（1 = 单朵，保持兼容）
  burstInterval: 280,       // 相邻两朵的间隔(ms)
  loop: false,              // 循环连放，直到 stop()/show=false
  launch: false,            // 是否显示发射过程（弹丸升空后绽放）
  launchDuration: 1200,     // 弹丸升空时长(ms)
  launchFrom: 'below',      // 'below' | 'center' | { x, y }
  fps: 60
}

const MAX_BURSTS = 50       // 连发数上限，防止配置过大卡死

export class FireworksEngine {
  constructor (canvas, options = {}) {
    if (!canvas) throw new Error('[vue-fireworks] canvas element is required')

    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (!this.ctx) throw new Error('[vue-fireworks] 2d context not available')

    this.options = { ...DEFAULTS, ...options }
    this.particles = []
    this.rockets = []           // 飞行中的弹丸
    this.rafId = null
    this.running = false
    this.finished = false
    this.frame = 0
    this.lastTime = 0
    this.accumulator = 0
    this.mousePoint = null
    this.onEnd = null

    // 连发调度状态
    this.burstTimers = []       // 待触发的 setTimeout 句柄
    this.pendingBursts = 0      // 已排期还未绽放的朵数
    this.cycleOptions = null    // 当前一轮的配置快照（loop 复用）
    this.loopActive = false

    this._onMouseMove = this._onMouseMove.bind(this)
    this._loop = this._loop.bind(this)
    this._resize = this._resize.bind(this)

    this._bindMouse()
    this._resize()
    window.addEventListener('resize', this._resize)
  }

  /** 运行时更新配置 */
  setOptions (options = {}) {
    const prevFollow = this.options.followMouse
    this.options = { ...this.options, ...options }
    if (prevFollow !== this.options.followMouse) {
      this._unbindMouse()
      this._bindMouse()
    }
  }

  /** 触发一轮烟花。overrides 可临时覆盖配置。 */
  fire (overrides = {}) {
    const o = { ...this.options, ...overrides }
    // 显式指定落点 = 确定性单朵（点哪爆哪），连发/循环自动让位
    if (overrides.origin !== undefined) {
      o.bursts = 1
      o.loop = false
    }
    this.cycleOptions = o
    this.loopActive = !!o.loop

    // 重新触发时清空旧粒子/弹丸/定时器，避免叠加竞态
    this._clearBurstTimers()
    this.particles = []
    this.rockets = []
    this.finished = false
    this.frame = 0
    this.lastTime = 0
    this.accumulator = 0

    this._scheduleCycle()

    if (!this.running) {
      this.running = true
      this.rafId = requestAnimationFrame(this._loop)
    }
  }

  /** 立即停止并清空（含所有待触发的连发定时器） */
  stop () {
    this.loopActive = false
    this._clearBurstTimers()
    this._teardown()
    this._clear()
  }

  /** 彻底销毁，解绑所有事件 */
  destroy () {
    this.stop()
    window.removeEventListener('resize', this._resize)
    this._unbindMouse()
    this.onEnd = null
  }

  // ---------- 连发调度 ----------

  /** 按 bursts/burstInterval 排期一轮发射/绽放 */
  _scheduleCycle () {
    const o = this.cycleOptions
    if (!o) return
    const bursts = Math.max(1, Math.min(MAX_BURSTS, o.bursts || 1))
    const interval = Math.max(16, o.burstInterval || 280)

    for (let i = 0; i < bursts; i++) {
      if (i === 0) {
        // 第一朵立即绽放
        this._launchOrBurst()
      } else {
        this.pendingBursts++
        const timer = setTimeout(() => {
          this.burstTimers = this.burstTimers.filter(t => t !== timer)
          this.pendingBursts = Math.max(0, this.pendingBursts - 1)
          this._launchOrBurst()
        }, interval * i)
        this.burstTimers.push(timer)
      }
    }
  }

  /**
   * 绽放一朵：若开启 launch，先发射弹丸升空、抵达后再绽放；否则立即绽放。
   * 落点在此刻确定（连发随机 / 单朵按 origin），供弹丸与绽放共用。
   */
  _launchOrBurst () {
    const o = this.cycleOptions || this.options
    const bursts = Math.max(1, Math.min(MAX_BURSTS, o.bursts || 1))
    const origin = bursts > 1
      ? this._randomOrigin()
      : this._resolveOrigin(o)

    if (o.launch) {
      this._spawnRocket(origin, o)
    } else {
      this._spawnBurstAt(origin, o)
    }
  }

  /** 发射一枚弹丸：真实抛体运动，初速度向上、重力匀减速，顶点恰好绽放 */
  _spawnRocket (target, o) {
    const start = this._resolveLaunchOrigin(target, o)
    const fps = o.fps || 60
    const frames = Math.max(1, (o.launchDuration || 1200) / (1000 / fps))
    const dy = target.y - start.y          // 负值（向上）
    const vx = (target.x - start.x) / frames
    const vy0 = 2 * dy / frames            // 顶点速度归零所需的初速度
    const ay = -2 * dy / (frames * frames) // 重力加速度（向下，为正）
    const color = o.colors[Math.floor(Math.random() * o.colors.length)]
    // 横向轻微摇摆，幅度随上升衰减，模拟空气扰动
    const swayAmp = Math.min(10, Math.abs(dy) * 0.02) * (Math.random() * 0.5 + 0.5)
    const swayPhase = Math.random() * Math.PI * 2

    this.rockets.push({
      x: start.x,
      y: start.y,
      startX: start.x,
      startY: start.y,
      targetX: target.x,
      targetY: target.y,
      vx, vy: vy0, ay,
      swayAmp,
      swayPhase,
      progress: 0,
      frames,
      color,
      tail: [],      // 拖尾历史点
      sparks: []     // 尾迹火花
    })
  }

  /** 计算发射起点：默认目标正下方底边 */
  _resolveLaunchOrigin (target, o) {
    const from = o.launchFrom || 'below'
    if (from === 'center') return { x: this.cssWidth / 2, y: this.cssHeight }
    if (from && typeof from === 'object') return { x: from.x, y: from.y }
    // 'below'：目标正下方的画布底边
    return { x: target.x, y: this.cssHeight }
  }

  /** 在指定落点绽放 count 个粒子 */
  _spawnBurstAt (origin, o) {
    for (let i = 0; i < o.count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = o.spread * (0.35 + Math.random() * 0.65)
      this.particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: o.colors[Math.floor(Math.random() * o.colors.length)],
        size: o.size * (0.6 + Math.random() * 0.8),
        life: 0,
        maxLife: o.duration * (0.75 + Math.random() * 0.5),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      })
    }
  }

  /** 连发随机落点：距边缘留 12% 边距，保证整朵可见 */
  _randomOrigin () {
    const padX = this.cssWidth * 0.12
    const padY = this.cssHeight * 0.15
    return {
      x: padX + Math.random() * Math.max(1, this.cssWidth - padX * 2),
      y: padY + Math.random() * Math.max(1, this.cssHeight - padY * 2)
    }
  }

  /** 清空所有待触发定时器 */
  _clearBurstTimers () {
    for (const t of this.burstTimers) clearTimeout(t)
    this.burstTimers = []
    this.pendingBursts = 0
  }

  // ---------- private ----------

  _resolveOrigin (o) {
    if (o.followMouse && this.mousePoint) return { ...this.mousePoint }
    if (o.origin === 'center') {
      return { x: this.cssWidth / 2, y: this.cssHeight / 2 }
    }
    if (o.origin && typeof o.origin === 'object') {
      return { x: o.origin.x, y: o.origin.y }
    }
    return { x: this.cssWidth / 2, y: this.cssHeight / 2 }
  }

  _onMouseMove (e) {
    const rect = this.canvas.getBoundingClientRect()
    this.mousePoint = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  _bindMouse () {
    if (this.options.followMouse) window.addEventListener('mousemove', this._onMouseMove)
  }

  _unbindMouse () {
    window.removeEventListener('mousemove', this._onMouseMove)
    this.mousePoint = null
  }

  _resize () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = this.canvas.getBoundingClientRect()
    this.cssWidth = rect.width || this.canvas.clientWidth || window.innerWidth
    this.cssHeight = rect.height || this.canvas.clientHeight || window.innerHeight * 0.6
    this.canvas.width = Math.round(this.cssWidth * dpr)
    this.canvas.height = Math.round(this.cssHeight * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  _clear () {
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.restore()
  }

  _loop (timestamp) {
    if (!this.running) return
    if (!this.lastTime) this.lastTime = timestamp
    const delta = timestamp - this.lastTime
    this.lastTime = timestamp

    // 固定步长累加，最多补 3 帧，避免掉帧后爆炸式推进
    const step = 1000 / this.options.fps
    this.accumulator += Math.min(delta, step * 3)
    let steps = 0
    while (this.accumulator >= step && steps < 3) {
      this._update()
      this.accumulator -= step
      steps++
    }

    this._render()
    this.frame++

    const idle = this.particles.length === 0 && this.rockets.length === 0 && this.pendingBursts === 0
    if (idle) {
      if (this.loopActive) {
        // 循环模式：一轮结束，排期下一轮（不触发 onEnd）
        this._scheduleCycle()
      } else {
        this._teardown()
        this._clear()
        if (typeof this.onEnd === 'function') this.onEnd()
        return
      }
    }
    this.rafId = requestAnimationFrame(this._loop)
  }

  _update () {
    const { gravity, friction } = this.options

    // 弹丸上升：抛体物理（匀减速到顶点），抵达后绽放
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i]
      r.progress = Math.min(1, r.progress + 1 / r.frames)
      const p = r.progress
      // 横向：匀速推进 + 随高度衰减的正弦摆动
      r.x = r.startX + r.vx * (p * r.frames)
        + Math.sin(p * Math.PI * 3 + r.swayPhase) * r.swayAmp * (1 - p)
      // 纵向：y = y0 + v0*t + 0.5*a*t²（t 以帧计），匀减速，顶点速度归零
      const t = p * r.frames
      r.y = r.startY + r.vy * t + 0.5 * r.ay * t * t

      // 拖尾历史点
      r.tail.push({ x: r.x, y: r.y })
      if (r.tail.length > 18) r.tail.shift()

      // 尾迹火花：随机小火星，短命，向下飘散
      if (p < 0.92 && Math.random() < 0.7) {
        r.sparks.push({
          x: r.x + (Math.random() - 0.5) * 3,
          y: r.y + 2,
          vx: (Math.random() - 0.5) * 0.6,
          vy: Math.random() * 0.5 + 0.2,
          life: 0,
          maxLife: 8 + Math.random() * 10,
          size: 1 + Math.random() * 1.5
        })
      }
      for (let s = r.sparks.length - 1; s >= 0; s--) {
        const sp = r.sparks[s]
        sp.x += sp.vx
        sp.y += sp.vy
        sp.life++
        if (sp.life >= sp.maxLife) r.sparks.splice(s, 1)
      }

      if (r.progress >= 1) {
        // 精确落在目标点，避免浮点累积误差
        this._spawnBurstAt({ x: r.targetX, y: r.targetY }, this.cycleOptions || this.options)
        this.rockets.splice(i, 1)
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.vx *= friction
      p.vy = p.vy * friction + gravity
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.spin
      p.life++
      if (p.life >= p.maxLife || p.y - p.size > this.cssHeight) {
        this.particles.splice(i, 1)
      }
    }
  }

  _render () {
    const ctx = this.ctx
    const o = this.options

    // 拖尾：用 destination-out 降低已有像素 alpha，透明擦除，不引入黑底
    if (o.trail) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.fillRect(0, 0, this.cssWidth, this.cssHeight)
    } else {
      ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)
    }

    if (o.glow) {
      // 发光：预渲染的径向渐变贴图 + lighter 叠加。
      // 不用 ctx.shadowBlur —— 阴影是逐像素高斯模糊，几十倍慢。
      ctx.globalCompositeOperation = 'lighter'
      for (const p of this.particles) {
        const alpha = Math.max(0, 1 - p.life / p.maxLife)
        ctx.globalAlpha = alpha * 0.9
        const sprite = this._getGlowSprite(p.color)
        const r = p.size * 2.4 // 光晕半径
        ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2)
      }
    }

    // 粒子本体：正常合成模式下画清晰实体
    ctx.globalCompositeOperation = o.glow ? 'lighter' : 'source-over'
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      this._drawShape(ctx, p, o.shape)
    }

    // 弹丸：平滑渐隐尾迹（历史点连成渐变线）+ 火花 + 亮头
    for (const r of this.rockets) {
      // 尾迹：逐段连线，越靠近弹丸越亮越粗
      if (r.tail.length > 1) {
        ctx.lineCap = 'round'
        for (let i = 1; i < r.tail.length; i++) {
          const a = r.tail[i - 1]
          const b = r.tail[i]
          const f = i / r.tail.length
          ctx.globalAlpha = f * f * 0.8
          ctx.strokeStyle = r.color
          ctx.lineWidth = 0.5 + f * 2
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
      // 火花
      ctx.fillStyle = r.color
      for (const sp of r.sparks) {
        ctx.globalAlpha = (1 - sp.life / sp.maxLife) * 0.9
        ctx.fillRect(sp.x, sp.y, sp.size, sp.size)
      }
      // 亮头
      ctx.globalAlpha = 1
      if (o.glow) {
        const sprite = this._getGlowSprite(r.color)
        const rad = 10
        ctx.drawImage(sprite, r.x - rad, r.y - rad, rad * 2, rad * 2)
      }
      ctx.fillStyle = '#fff'
      ctx.fillRect(r.x - 1.5, r.y - 2.5, 3, 5)
    }

    // 复原上下文状态，避免污染外部
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  /** 按颜色缓存发光贴图（离屏 canvas），一次生成、多帧复用 */
  _getGlowSprite (color) {
    if (!this._glowCache) this._glowCache = new Map()
    let sprite = this._glowCache.get(color)
    if (sprite) return sprite

    const size = 64
    sprite = document.createElement('canvas')
    sprite.width = sprite.height = size
    const c = sprite.getContext('2d')
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, color)
    g.addColorStop(0.35, this._withAlpha(color, 0.5))
    g.addColorStop(1, this._withAlpha(color, 0))
    c.fillStyle = g
    c.fillRect(0, 0, size, size)
    this._glowCache.set(color, sprite)
    return sprite
  }

  /** 给 hex / rgb 颜色附加 alpha，供渐变使用 */
  _withAlpha (color, a) {
    if (color[0] === '#') {
      let hex = color.slice(1)
      if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('')
      const n = parseInt(hex, 16)
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
    }
    const m = color.match(/rgba?\(([^)]+)\)/)
    if (m) {
      const parts = m[1].split(',').map(s => parseFloat(s))
      return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`
    }
    return color
  }

  _drawShape (ctx, p, shape) {
    const s = p.size
    if (shape === 'circle') {
      ctx.beginPath()
      ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    if (shape === 'star') {
      this._starPath(ctx, p.x, p.y, 5, s / 2, s / 4, p.rotation)
      ctx.fill()
      return
    }
    // rect 默认，带旋转
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillRect(-s / 2, -s / 2, s, s * 1.6)
    ctx.restore()
  }

  _starPath (ctx, cx, cy, points, outer, inner, rotation) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = (i * Math.PI) / points - Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.restore()
  }

  _teardown () {
    this.running = false
    this.loopActive = false
    this._clearBurstTimers()
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.particles = []
    this.rockets = []
    this.finished = true
  }
}

export default FireworksEngine
