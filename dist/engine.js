const f = {
  count: 60,
  // 每轮粒子数
  colors: ["#FF8201", "#2DA6E0", "#FF262B"],
  // 颜色池
  shape: "rect",
  // 'rect' | 'circle' | 'star'
  gravity: 0.12,
  // 重力加速度(px/frame^2)
  friction: 0.985,
  // 空气阻力(速度衰减系数)
  spread: 5,
  // 爆炸初速度上限
  size: 4,
  // 粒子尺寸(px)
  trail: !1,
  // 拖尾残影
  glow: !1,
  // 发光
  duration: 90,
  // 粒子最大寿命(帧)
  origin: "center",
  // 'center' | { x, y }，(x,y) 为 CSS 像素坐标
  followMouse: !1,
  // 跟随鼠标
  bursts: 1,
  // 一次触发连续绽放几朵（1 = 单朵，保持兼容）
  burstInterval: 280,
  // 相邻两朵的间隔(ms)
  loop: !1,
  // 循环连放，直到 stop()/show=false
  fps: 60
}, u = 50;
class m {
  constructor(t, s = {}) {
    if (!t)
      throw new Error("[vue-fireworks] canvas element is required");
    if (this.canvas = t, this.ctx = t.getContext("2d"), !this.ctx)
      throw new Error("[vue-fireworks] 2d context not available");
    this.options = { ...f, ...s }, this.particles = [], this.rafId = null, this.running = !1, this.finished = !1, this.frame = 0, this.lastTime = 0, this.accumulator = 0, this.mousePoint = null, this.onEnd = null, this.burstTimers = [], this.pendingBursts = 0, this.cycleOptions = null, this.loopActive = !1, this._onMouseMove = this._onMouseMove.bind(this), this._loop = this._loop.bind(this), this._resize = this._resize.bind(this), this._bindMouse(), this._resize(), window.addEventListener("resize", this._resize);
  }
  /** 运行时更新配置 */
  setOptions(t = {}) {
    const s = this.options.followMouse;
    this.options = { ...this.options, ...t }, s !== this.options.followMouse && (this._unbindMouse(), this._bindMouse());
  }
  /** 触发一轮烟花。overrides 可临时覆盖配置。 */
  fire(t = {}) {
    const s = { ...this.options, ...t };
    t.origin !== void 0 && (s.bursts = 1, s.loop = !1), this.cycleOptions = s, this.loopActive = !!s.loop, this._clearBurstTimers(), this.particles = [], this.finished = !1, this.frame = 0, this.lastTime = 0, this.accumulator = 0, this._scheduleCycle(), this.running || (this.running = !0, this.rafId = requestAnimationFrame(this._loop));
  }
  /** 立即停止并清空（含所有待触发的连发定时器） */
  stop() {
    this.loopActive = !1, this._clearBurstTimers(), this._teardown(), this._clear();
  }
  /** 彻底销毁，解绑所有事件 */
  destroy() {
    this.stop(), window.removeEventListener("resize", this._resize), this._unbindMouse(), this.onEnd = null;
  }
  // ---------- 连发调度 ----------
  /** 按 bursts/burstInterval 排期一轮绽放 */
  _scheduleCycle() {
    const t = this.cycleOptions;
    if (!t)
      return;
    const s = Math.max(1, Math.min(u, t.bursts || 1)), e = Math.max(16, t.burstInterval || 280);
    for (let i = 0; i < s; i++)
      if (i === 0)
        this._spawnBurst();
      else {
        this.pendingBursts++;
        const o = setTimeout(() => {
          this.burstTimers = this.burstTimers.filter((n) => n !== o), this.pendingBursts = Math.max(0, this.pendingBursts - 1), this._spawnBurst();
        }, e * i);
        this.burstTimers.push(o);
      }
  }
  /** 绽放单朵：随机落点，生成 count 个粒子 */
  _spawnBurst() {
    const t = this.cycleOptions || this.options, e = Math.max(1, Math.min(u, t.bursts || 1)) > 1 ? this._randomOrigin() : this._resolveOrigin(t);
    for (let i = 0; i < t.count; i++) {
      const o = Math.random() * Math.PI * 2, n = t.spread * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(o) * n,
        vy: Math.sin(o) * n - 1.5,
        color: t.colors[Math.floor(Math.random() * t.colors.length)],
        size: t.size * (0.6 + Math.random() * 0.8),
        life: 0,
        maxLife: t.duration * (0.75 + Math.random() * 0.5),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
  }
  /** 连发随机落点：距边缘留 12% 边距，保证整朵可见 */
  _randomOrigin() {
    const t = this.cssWidth * 0.12, s = this.cssHeight * 0.15;
    return {
      x: t + Math.random() * Math.max(1, this.cssWidth - t * 2),
      y: s + Math.random() * Math.max(1, this.cssHeight - s * 2)
    };
  }
  /** 清空所有待触发定时器 */
  _clearBurstTimers() {
    for (const t of this.burstTimers)
      clearTimeout(t);
    this.burstTimers = [], this.pendingBursts = 0;
  }
  // ---------- private ----------
  _resolveOrigin(t) {
    return t.followMouse && this.mousePoint ? { ...this.mousePoint } : t.origin === "center" ? { x: this.cssWidth / 2, y: this.cssHeight / 2 } : t.origin && typeof t.origin == "object" ? { x: t.origin.x, y: t.origin.y } : { x: this.cssWidth / 2, y: this.cssHeight / 2 };
  }
  _onMouseMove(t) {
    const s = this.canvas.getBoundingClientRect();
    this.mousePoint = { x: t.clientX - s.left, y: t.clientY - s.top };
  }
  _bindMouse() {
    this.options.followMouse && window.addEventListener("mousemove", this._onMouseMove);
  }
  _unbindMouse() {
    window.removeEventListener("mousemove", this._onMouseMove), this.mousePoint = null;
  }
  _resize() {
    const t = Math.min(window.devicePixelRatio || 1, 2), s = this.canvas.getBoundingClientRect();
    this.cssWidth = s.width || this.canvas.clientWidth || window.innerWidth, this.cssHeight = s.height || this.canvas.clientHeight || window.innerHeight * 0.6, this.canvas.width = Math.round(this.cssWidth * t), this.canvas.height = Math.round(this.cssHeight * t), this.ctx.setTransform(t, 0, 0, t, 0, 0);
  }
  _clear() {
    this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.ctx.restore();
  }
  _loop(t) {
    if (!this.running)
      return;
    this.lastTime || (this.lastTime = t);
    const s = t - this.lastTime;
    this.lastTime = t;
    const e = 1e3 / this.options.fps;
    this.accumulator += Math.min(s, e * 3);
    let i = 0;
    for (; this.accumulator >= e && i < 3; )
      this._update(), this.accumulator -= e, i++;
    if (this._render(), this.frame++, this.particles.length === 0 && this.pendingBursts === 0)
      if (this.loopActive)
        this._scheduleCycle();
      else {
        this._teardown(), this._clear(), typeof this.onEnd == "function" && this.onEnd();
        return;
      }
    this.rafId = requestAnimationFrame(this._loop);
  }
  _update() {
    const { gravity: t, friction: s } = this.options;
    for (let e = this.particles.length - 1; e >= 0; e--) {
      const i = this.particles[e];
      i.vx *= s, i.vy = i.vy * s + t, i.x += i.vx, i.y += i.vy, i.rotation += i.spin, i.life++, (i.life >= i.maxLife || i.y - i.size > this.cssHeight) && this.particles.splice(e, 1);
    }
  }
  _render() {
    const t = this.ctx, s = this.options;
    if (s.trail ? (t.globalCompositeOperation = "destination-out", t.fillStyle = "rgba(0,0,0,0.22)", t.fillRect(0, 0, this.cssWidth, this.cssHeight)) : t.clearRect(0, 0, this.cssWidth, this.cssHeight), s.glow) {
      t.globalCompositeOperation = "lighter";
      for (const e of this.particles) {
        const i = Math.max(0, 1 - e.life / e.maxLife);
        t.globalAlpha = i * 0.9;
        const o = this._getGlowSprite(e.color), n = e.size * 2.4;
        t.drawImage(o, e.x - n, e.y - n, n * 2, n * 2);
      }
    }
    t.globalCompositeOperation = s.glow ? "lighter" : "source-over";
    for (const e of this.particles) {
      const i = Math.max(0, 1 - e.life / e.maxLife);
      t.globalAlpha = i, t.fillStyle = e.color, this._drawShape(t, e, s.shape);
    }
    t.globalAlpha = 1, t.globalCompositeOperation = "source-over";
  }
  /** 按颜色缓存发光贴图（离屏 canvas），一次生成、多帧复用 */
  _getGlowSprite(t) {
    this._glowCache || (this._glowCache = /* @__PURE__ */ new Map());
    let s = this._glowCache.get(t);
    if (s)
      return s;
    const e = 64;
    s = document.createElement("canvas"), s.width = s.height = e;
    const i = s.getContext("2d"), o = i.createRadialGradient(e / 2, e / 2, 0, e / 2, e / 2, e / 2);
    return o.addColorStop(0, t), o.addColorStop(0.35, this._withAlpha(t, 0.5)), o.addColorStop(1, this._withAlpha(t, 0)), i.fillStyle = o, i.fillRect(0, 0, e, e), this._glowCache.set(t, s), s;
  }
  /** 给 hex / rgb 颜色附加 alpha，供渐变使用 */
  _withAlpha(t, s) {
    if (t[0] === "#") {
      let i = t.slice(1);
      i.length === 3 && (i = i.split("").map((n) => n + n).join(""));
      const o = parseInt(i, 16);
      return `rgba(${o >> 16 & 255},${o >> 8 & 255},${o & 255},${s})`;
    }
    const e = t.match(/rgba?\(([^)]+)\)/);
    if (e) {
      const i = e[1].split(",").map((o) => parseFloat(o));
      return `rgba(${i[0]},${i[1]},${i[2]},${s})`;
    }
    return t;
  }
  _drawShape(t, s, e) {
    const i = s.size;
    if (e === "circle") {
      t.beginPath(), t.arc(s.x, s.y, i / 2, 0, Math.PI * 2), t.fill();
      return;
    }
    if (e === "star") {
      this._starPath(t, s.x, s.y, 5, i / 2, i / 4, s.rotation), t.fill();
      return;
    }
    t.save(), t.translate(s.x, s.y), t.rotate(s.rotation), t.fillRect(-i / 2, -i / 2, i, i * 1.6), t.restore();
  }
  _starPath(t, s, e, i, o, n, d) {
    t.save(), t.translate(s, e), t.rotate(d), t.beginPath();
    for (let r = 0; r < i * 2; r++) {
      const h = r % 2 === 0 ? o : n, a = r * Math.PI / i - Math.PI / 2, l = Math.cos(a) * h, c = Math.sin(a) * h;
      r === 0 ? t.moveTo(l, c) : t.lineTo(l, c);
    }
    t.closePath(), t.restore();
  }
  _teardown() {
    this.running = !1, this.loopActive = !1, this._clearBurstTimers(), this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null), this.particles = [], this.finished = !0;
  }
}
export {
  m as FireworksEngine,
  m as default
};
