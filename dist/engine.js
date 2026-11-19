const p = {
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
  launch: !1,
  // 是否显示发射过程（弹丸升空后绽放）
  launchDuration: 1200,
  // 弹丸升空时长(ms)
  launchFrom: "below",
  // 'below' | 'center' | { x, y }
  fps: 60
}, f = 50;
class m {
  constructor(t, e = {}) {
    if (!t)
      throw new Error("[vue-fireworks] canvas element is required");
    if (this.canvas = t, this.ctx = t.getContext("2d"), !this.ctx)
      throw new Error("[vue-fireworks] 2d context not available");
    this.options = { ...p, ...e }, this.particles = [], this.rockets = [], this.rafId = null, this.running = !1, this.finished = !1, this.frame = 0, this.lastTime = 0, this.accumulator = 0, this.mousePoint = null, this.onEnd = null, this.burstTimers = [], this.pendingBursts = 0, this.cycleOptions = null, this.loopActive = !1, this._onMouseMove = this._onMouseMove.bind(this), this._loop = this._loop.bind(this), this._resize = this._resize.bind(this), this._bindMouse(), this._resize(), window.addEventListener("resize", this._resize);
  }
  /** 运行时更新配置 */
  setOptions(t = {}) {
    const e = this.options.followMouse;
    this.options = { ...this.options, ...t }, e !== this.options.followMouse && (this._unbindMouse(), this._bindMouse());
  }
  /** 触发一轮烟花。overrides 可临时覆盖配置。 */
  fire(t = {}) {
    const e = { ...this.options, ...t };
    t.origin !== void 0 && (e.bursts = 1, e.loop = !1), this.cycleOptions = e, this.loopActive = !!e.loop, this._clearBurstTimers(), this.particles = [], this.rockets = [], this.finished = !1, this.frame = 0, this.lastTime = 0, this.accumulator = 0, this._scheduleCycle(), this.running || (this.running = !0, this.rafId = requestAnimationFrame(this._loop));
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
  /** 按 bursts/burstInterval 排期一轮发射/绽放 */
  _scheduleCycle() {
    const t = this.cycleOptions;
    if (!t)
      return;
    const e = Math.max(1, Math.min(f, t.bursts || 1)), i = Math.max(16, t.burstInterval || 280);
    for (let s = 0; s < e; s++)
      if (s === 0)
        this._launchOrBurst();
      else {
        this.pendingBursts++;
        const o = setTimeout(() => {
          this.burstTimers = this.burstTimers.filter((r) => r !== o), this.pendingBursts = Math.max(0, this.pendingBursts - 1), this._launchOrBurst();
        }, i * s);
        this.burstTimers.push(o);
      }
  }
  /**
   * 绽放一朵：若开启 launch，先发射弹丸升空、抵达后再绽放；否则立即绽放。
   * 落点在此刻确定（连发随机 / 单朵按 origin），供弹丸与绽放共用。
   */
  _launchOrBurst() {
    const t = this.cycleOptions || this.options, i = Math.max(1, Math.min(f, t.bursts || 1)) > 1 ? this._randomOrigin() : this._resolveOrigin(t);
    t.launch ? this._spawnRocket(i, t) : this._spawnBurstAt(i, t);
  }
  /** 发射一枚弹丸：真实抛体运动，初速度向上、重力匀减速，顶点恰好绽放 */
  _spawnRocket(t, e) {
    const i = this._resolveLaunchOrigin(t, e), s = e.fps || 60, o = Math.max(1, (e.launchDuration || 1200) / (1e3 / s)), r = t.y - i.y, a = (t.x - i.x) / o, n = 2 * r / o, h = -2 * r / (o * o), l = e.colors[Math.floor(Math.random() * e.colors.length)], c = Math.min(10, Math.abs(r) * 0.02) * (Math.random() * 0.5 + 0.5), u = Math.random() * Math.PI * 2;
    this.rockets.push({
      x: i.x,
      y: i.y,
      startX: i.x,
      startY: i.y,
      targetX: t.x,
      targetY: t.y,
      vx: a,
      vy: n,
      ay: h,
      swayAmp: c,
      swayPhase: u,
      progress: 0,
      frames: o,
      color: l,
      tail: [],
      // 拖尾历史点
      sparks: []
      // 尾迹火花
    });
  }
  /** 计算发射起点：默认目标正下方底边 */
  _resolveLaunchOrigin(t, e) {
    const i = e.launchFrom || "below";
    return i === "center" ? { x: this.cssWidth / 2, y: this.cssHeight } : i && typeof i == "object" ? { x: i.x, y: i.y } : { x: t.x, y: this.cssHeight };
  }
  /** 在指定落点绽放 count 个粒子 */
  _spawnBurstAt(t, e) {
    for (let i = 0; i < e.count; i++) {
      const s = Math.random() * Math.PI * 2, o = e.spread * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x: t.x,
        y: t.y,
        vx: Math.cos(s) * o,
        vy: Math.sin(s) * o - 1.5,
        color: e.colors[Math.floor(Math.random() * e.colors.length)],
        size: e.size * (0.6 + Math.random() * 0.8),
        life: 0,
        maxLife: e.duration * (0.75 + Math.random() * 0.5),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
  }
  /** 连发随机落点：距边缘留 12% 边距，保证整朵可见 */
  _randomOrigin() {
    const t = this.cssWidth * 0.12, e = this.cssHeight * 0.15;
    return {
      x: t + Math.random() * Math.max(1, this.cssWidth - t * 2),
      y: e + Math.random() * Math.max(1, this.cssHeight - e * 2)
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
    const e = this.canvas.getBoundingClientRect();
    this.mousePoint = { x: t.clientX - e.left, y: t.clientY - e.top };
  }
  _bindMouse() {
    this.options.followMouse && window.addEventListener("mousemove", this._onMouseMove);
  }
  _unbindMouse() {
    window.removeEventListener("mousemove", this._onMouseMove), this.mousePoint = null;
  }
  _resize() {
    const t = Math.min(window.devicePixelRatio || 1, 2), e = this.canvas.getBoundingClientRect();
    this.cssWidth = e.width || this.canvas.clientWidth || window.innerWidth, this.cssHeight = e.height || this.canvas.clientHeight || window.innerHeight * 0.6, this.canvas.width = Math.round(this.cssWidth * t), this.canvas.height = Math.round(this.cssHeight * t), this.ctx.setTransform(t, 0, 0, t, 0, 0);
  }
  _clear() {
    this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.ctx.restore();
  }
  _loop(t) {
    if (!this.running)
      return;
    this.lastTime || (this.lastTime = t);
    const e = t - this.lastTime;
    this.lastTime = t;
    const i = 1e3 / this.options.fps;
    this.accumulator += Math.min(e, i * 3);
    let s = 0;
    for (; this.accumulator >= i && s < 3; )
      this._update(), this.accumulator -= i, s++;
    if (this._render(), this.frame++, this.particles.length === 0 && this.rockets.length === 0 && this.pendingBursts === 0)
      if (this.loopActive)
        this._scheduleCycle();
      else {
        this._teardown(), this._clear(), typeof this.onEnd == "function" && this.onEnd();
        return;
      }
    this.rafId = requestAnimationFrame(this._loop);
  }
  _update() {
    const { gravity: t, friction: e } = this.options;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const s = this.rockets[i];
      s.progress = Math.min(1, s.progress + 1 / s.frames);
      const o = s.progress;
      s.x = s.startX + s.vx * (o * s.frames) + Math.sin(o * Math.PI * 3 + s.swayPhase) * s.swayAmp * (1 - o);
      const r = o * s.frames;
      s.y = s.startY + s.vy * r + 0.5 * s.ay * r * r, s.tail.push({ x: s.x, y: s.y }), s.tail.length > 18 && s.tail.shift(), o < 0.92 && Math.random() < 0.7 && s.sparks.push({
        x: s.x + (Math.random() - 0.5) * 3,
        y: s.y + 2,
        vx: (Math.random() - 0.5) * 0.6,
        vy: Math.random() * 0.5 + 0.2,
        life: 0,
        maxLife: 8 + Math.random() * 10,
        size: 1 + Math.random() * 1.5
      });
      for (let a = s.sparks.length - 1; a >= 0; a--) {
        const n = s.sparks[a];
        n.x += n.vx, n.y += n.vy, n.life++, n.life >= n.maxLife && s.sparks.splice(a, 1);
      }
      s.progress >= 1 && (this._spawnBurstAt({ x: s.targetX, y: s.targetY }, this.cycleOptions || this.options), this.rockets.splice(i, 1));
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const s = this.particles[i];
      s.vx *= e, s.vy = s.vy * e + t, s.x += s.vx, s.y += s.vy, s.rotation += s.spin, s.life++, (s.life >= s.maxLife || s.y - s.size > this.cssHeight) && this.particles.splice(i, 1);
    }
  }
  _render() {
    const t = this.ctx, e = this.options;
    if (e.trail ? (t.globalCompositeOperation = "destination-out", t.fillStyle = "rgba(0,0,0,0.22)", t.fillRect(0, 0, this.cssWidth, this.cssHeight)) : t.clearRect(0, 0, this.cssWidth, this.cssHeight), e.glow) {
      t.globalCompositeOperation = "lighter";
      for (const i of this.particles) {
        const s = Math.max(0, 1 - i.life / i.maxLife);
        t.globalAlpha = s * 0.9;
        const o = this._getGlowSprite(i.color), r = i.size * 2.4;
        t.drawImage(o, i.x - r, i.y - r, r * 2, r * 2);
      }
    }
    t.globalCompositeOperation = e.glow ? "lighter" : "source-over";
    for (const i of this.particles) {
      const s = Math.max(0, 1 - i.life / i.maxLife);
      t.globalAlpha = s, t.fillStyle = i.color, this._drawShape(t, i, e.shape);
    }
    for (const i of this.rockets) {
      if (i.tail.length > 1) {
        t.lineCap = "round";
        for (let s = 1; s < i.tail.length; s++) {
          const o = i.tail[s - 1], r = i.tail[s], a = s / i.tail.length;
          t.globalAlpha = a * a * 0.8, t.strokeStyle = i.color, t.lineWidth = 0.5 + a * 2, t.beginPath(), t.moveTo(o.x, o.y), t.lineTo(r.x, r.y), t.stroke();
        }
      }
      t.fillStyle = i.color;
      for (const s of i.sparks)
        t.globalAlpha = (1 - s.life / s.maxLife) * 0.9, t.fillRect(s.x, s.y, s.size, s.size);
      if (t.globalAlpha = 1, e.glow) {
        const s = this._getGlowSprite(i.color), o = 10;
        t.drawImage(s, i.x - o, i.y - o, o * 2, o * 2);
      }
      t.fillStyle = "#fff", t.fillRect(i.x - 1.5, i.y - 2.5, 3, 5);
    }
    t.globalAlpha = 1, t.globalCompositeOperation = "source-over";
  }
  /** 按颜色缓存发光贴图（离屏 canvas），一次生成、多帧复用 */
  _getGlowSprite(t) {
    this._glowCache || (this._glowCache = /* @__PURE__ */ new Map());
    let e = this._glowCache.get(t);
    if (e)
      return e;
    const i = 64;
    e = document.createElement("canvas"), e.width = e.height = i;
    const s = e.getContext("2d"), o = s.createRadialGradient(i / 2, i / 2, 0, i / 2, i / 2, i / 2);
    return o.addColorStop(0, t), o.addColorStop(0.35, this._withAlpha(t, 0.5)), o.addColorStop(1, this._withAlpha(t, 0)), s.fillStyle = o, s.fillRect(0, 0, i, i), this._glowCache.set(t, e), e;
  }
  /** 给 hex / rgb 颜色附加 alpha，供渐变使用 */
  _withAlpha(t, e) {
    if (t[0] === "#") {
      let s = t.slice(1);
      s.length === 3 && (s = s.split("").map((r) => r + r).join(""));
      const o = parseInt(s, 16);
      return `rgba(${o >> 16 & 255},${o >> 8 & 255},${o & 255},${e})`;
    }
    const i = t.match(/rgba?\(([^)]+)\)/);
    if (i) {
      const s = i[1].split(",").map((o) => parseFloat(o));
      return `rgba(${s[0]},${s[1]},${s[2]},${e})`;
    }
    return t;
  }
  _drawShape(t, e, i) {
    const s = e.size;
    if (i === "circle") {
      t.beginPath(), t.arc(e.x, e.y, s / 2, 0, Math.PI * 2), t.fill();
      return;
    }
    if (i === "star") {
      this._starPath(t, e.x, e.y, 5, s / 2, s / 4, e.rotation), t.fill();
      return;
    }
    t.save(), t.translate(e.x, e.y), t.rotate(e.rotation), t.fillRect(-s / 2, -s / 2, s, s * 1.6), t.restore();
  }
  _starPath(t, e, i, s, o, r, a) {
    t.save(), t.translate(e, i), t.rotate(a), t.beginPath();
    for (let n = 0; n < s * 2; n++) {
      const h = n % 2 === 0 ? o : r, l = n * Math.PI / s - Math.PI / 2, c = Math.cos(l) * h, u = Math.sin(l) * h;
      n === 0 ? t.moveTo(c, u) : t.lineTo(c, u);
    }
    t.closePath(), t.restore();
  }
  _teardown() {
    this.running = !1, this.loopActive = !1, this._clearBurstTimers(), this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null), this.particles = [], this.rockets = [], this.finished = !0;
  }
}
export {
  m as FireworksEngine,
  m as default
};
