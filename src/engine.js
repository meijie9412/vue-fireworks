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
  fps: 60
}

export class FireworksEngine {
  constructor (canvas, options = {}) {
    if (!canvas) throw new Error('[vue-fireworks] canvas element is required')

    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (!this.ctx) throw new Error('[vue-fireworks] 2d context not available')

    this.options = { ...DEFAULTS, ...options }
    this.particles = []
    this.rafId = null
    this.running = false
    this.finished = false
    this.frame = 0
    this.lastTime = 0
    this.accumulator = 0
    this.mousePoint = null
    this.onEnd = null

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
    const origin = this._resolveOrigin(o)

    // 重新触发时清空旧粒子，避免叠加竞态
    this.particles = []
    this.finished = false
    this.frame = 0
    this.lastTime = 0
    this.accumulator = 0

    for (let i = 0; i < o.count; i++) {
      const angle = Math.random() * Math.PI * 2
      // 初速度带随机大小，形成爆炸层次
      const speed = o.spread * (0.35 + Math.random() * 0.65)
      this.particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // 略微上抛
        color: o.colors[Math.floor(Math.random() * o.colors.length)],
        size: o.size * (0.6 + Math.random() * 0.8),
        life: 0,
        maxLife: o.duration * (0.75 + Math.random() * 0.5),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      })
    }

    if (!this.running) {
      this.running = true
      this.rafId = requestAnimationFrame(this._loop)
    }
  }

  /** 立即停止并清空 */
  stop () {
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

    if (this.particles.length === 0) {
      this._teardown()
      this._clear()
      if (typeof this.onEnd === 'function') this.onEnd()
      return
    }
    this.rafId = requestAnimationFrame(this._loop)
  }

  _update () {
    const { gravity, friction } = this.options
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
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.particles = []
    this.finished = true
  }
}

export default FireworksEngine
