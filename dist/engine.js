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
  fps: 60
};
class p {
  constructor(t, i = {}) {
    if (!t)
      throw new Error("[vue-fireworks] canvas element is required");
    if (this.canvas = t, this.ctx = t.getContext("2d"), !this.ctx)
      throw new Error("[vue-fireworks] 2d context not available");
    this.options = { ...f, ...i }, this.particles = [], this.rafId = null, this.running = !1, this.finished = !1, this.frame = 0, this.lastTime = 0, this.accumulator = 0, this.mousePoint = null, this.onEnd = null, this._onMouseMove = this._onMouseMove.bind(this), this._loop = this._loop.bind(this), this._resize = this._resize.bind(this), this._bindMouse(), this._resize(), window.addEventListener("resize", this._resize);
  }
  /** 运行时更新配置 */
  setOptions(t = {}) {
    const i = this.options.followMouse;
    this.options = { ...this.options, ...t }, i !== this.options.followMouse && (this._unbindMouse(), this._bindMouse());
  }
  /** 触发一轮烟花。overrides 可临时覆盖配置。 */
  fire(t = {}) {
    const i = { ...this.options, ...t }, e = this._resolveOrigin(i);
    this.particles = [], this.finished = !1, this.frame = 0, this.lastTime = 0, this.accumulator = 0;
    for (let s = 0; s < i.count; s++) {
      const o = Math.random() * Math.PI * 2, n = i.spread * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(o) * n,
        vy: Math.sin(o) * n - 1.5,
        // 略微上抛
        color: i.colors[Math.floor(Math.random() * i.colors.length)],
        size: i.size * (0.6 + Math.random() * 0.8),
        life: 0,
        maxLife: i.duration * (0.75 + Math.random() * 0.5),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
    this.running || (this.running = !0, this.rafId = requestAnimationFrame(this._loop));
  }
  /** 立即停止并清空 */
  stop() {
    this._teardown(), this._clear();
  }
  /** 彻底销毁，解绑所有事件 */
  destroy() {
    this.stop(), window.removeEventListener("resize", this._resize), this._unbindMouse(), this.onEnd = null;
  }
  // ---------- private ----------
  _resolveOrigin(t) {
    return t.followMouse && this.mousePoint ? { ...this.mousePoint } : t.origin === "center" ? { x: this.cssWidth / 2, y: this.cssHeight / 2 } : t.origin && typeof t.origin == "object" ? { x: t.origin.x, y: t.origin.y } : { x: this.cssWidth / 2, y: this.cssHeight / 2 };
  }
  _onMouseMove(t) {
    const i = this.canvas.getBoundingClientRect();
    this.mousePoint = { x: t.clientX - i.left, y: t.clientY - i.top };
  }
  _bindMouse() {
    this.options.followMouse && window.addEventListener("mousemove", this._onMouseMove);
  }
  _unbindMouse() {
    window.removeEventListener("mousemove", this._onMouseMove), this.mousePoint = null;
  }
  _resize() {
    const t = Math.min(window.devicePixelRatio || 1, 2), i = this.canvas.getBoundingClientRect();
    this.cssWidth = i.width || this.canvas.clientWidth || window.innerWidth, this.cssHeight = i.height || this.canvas.clientHeight || window.innerHeight * 0.6, this.canvas.width = Math.round(this.cssWidth * t), this.canvas.height = Math.round(this.cssHeight * t), this.ctx.setTransform(t, 0, 0, t, 0, 0);
  }
  _clear() {
    this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.ctx.restore();
  }
  _loop(t) {
    if (!this.running)
      return;
    this.lastTime || (this.lastTime = t);
    const i = t - this.lastTime;
    this.lastTime = t;
    const e = 1e3 / this.options.fps;
    this.accumulator += Math.min(i, e * 3);
    let s = 0;
    for (; this.accumulator >= e && s < 3; )
      this._update(), this.accumulator -= e, s++;
    if (this._render(), this.frame++, this.particles.length === 0) {
      this._teardown(), this._clear(), typeof this.onEnd == "function" && this.onEnd();
      return;
    }
    this.rafId = requestAnimationFrame(this._loop);
  }
  _update() {
    const { gravity: t, friction: i } = this.options;
    for (let e = this.particles.length - 1; e >= 0; e--) {
      const s = this.particles[e];
      s.vx *= i, s.vy = s.vy * i + t, s.x += s.vx, s.y += s.vy, s.rotation += s.spin, s.life++, (s.life >= s.maxLife || s.y - s.size > this.cssHeight) && this.particles.splice(e, 1);
    }
  }
  _render() {
    const t = this.ctx, i = this.options;
    if (i.trail ? (t.globalCompositeOperation = "destination-out", t.fillStyle = "rgba(0,0,0,0.22)", t.fillRect(0, 0, this.cssWidth, this.cssHeight)) : t.clearRect(0, 0, this.cssWidth, this.cssHeight), i.glow) {
      t.globalCompositeOperation = "lighter";
      for (const e of this.particles) {
        const s = Math.max(0, 1 - e.life / e.maxLife);
        t.globalAlpha = s * 0.9;
        const o = this._getGlowSprite(e.color), n = e.size * 2.4;
        t.drawImage(o, e.x - n, e.y - n, n * 2, n * 2);
      }
    }
    t.globalCompositeOperation = i.glow ? "lighter" : "source-over";
    for (const e of this.particles) {
      const s = Math.max(0, 1 - e.life / e.maxLife);
      t.globalAlpha = s, t.fillStyle = e.color, this._drawShape(t, e, i.shape);
    }
    t.globalAlpha = 1, t.globalCompositeOperation = "source-over";
  }
  /** 按颜色缓存发光贴图（离屏 canvas），一次生成、多帧复用 */
  _getGlowSprite(t) {
    this._glowCache || (this._glowCache = /* @__PURE__ */ new Map());
    let i = this._glowCache.get(t);
    if (i)
      return i;
    const e = 64;
    i = document.createElement("canvas"), i.width = i.height = e;
    const s = i.getContext("2d"), o = s.createRadialGradient(e / 2, e / 2, 0, e / 2, e / 2, e / 2);
    return o.addColorStop(0, t), o.addColorStop(0.35, this._withAlpha(t, 0.5)), o.addColorStop(1, this._withAlpha(t, 0)), s.fillStyle = o, s.fillRect(0, 0, e, e), this._glowCache.set(t, i), i;
  }
  /** 给 hex / rgb 颜色附加 alpha，供渐变使用 */
  _withAlpha(t, i) {
    if (t[0] === "#") {
      let s = t.slice(1);
      s.length === 3 && (s = s.split("").map((n) => n + n).join(""));
      const o = parseInt(s, 16);
      return `rgba(${o >> 16 & 255},${o >> 8 & 255},${o & 255},${i})`;
    }
    const e = t.match(/rgba?\(([^)]+)\)/);
    if (e) {
      const s = e[1].split(",").map((o) => parseFloat(o));
      return `rgba(${s[0]},${s[1]},${s[2]},${i})`;
    }
    return t;
  }
  _drawShape(t, i, e) {
    const s = i.size;
    if (e === "circle") {
      t.beginPath(), t.arc(i.x, i.y, s / 2, 0, Math.PI * 2), t.fill();
      return;
    }
    if (e === "star") {
      this._starPath(t, i.x, i.y, 5, s / 2, s / 4, i.rotation), t.fill();
      return;
    }
    t.save(), t.translate(i.x, i.y), t.rotate(i.rotation), t.fillRect(-s / 2, -s / 2, s, s * 1.6), t.restore();
  }
  _starPath(t, i, e, s, o, n, d) {
    t.save(), t.translate(i, e), t.rotate(d), t.beginPath();
    for (let h = 0; h < s * 2; h++) {
      const r = h % 2 === 0 ? o : n, a = h * Math.PI / s - Math.PI / 2, l = Math.cos(a) * r, c = Math.sin(a) * r;
      h === 0 ? t.moveTo(l, c) : t.lineTo(l, c);
    }
    t.closePath(), t.restore();
  }
  _teardown() {
    this.running = !1, this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null), this.particles = [], this.finished = !0;
  }
}
export {
  p as FireworksEngine,
  p as default
};
