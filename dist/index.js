import { FireworksEngine as r } from "@meijie/fireworks-core";
import { e as s } from "./shared-shared-es.js";
const i = [
  "count",
  "colors",
  "shape",
  "gravity",
  "friction",
  "spread",
  "size",
  "trail",
  "glow",
  "duration",
  "origin",
  "followMouse",
  "bursts",
  "burstInterval",
  "loop",
  "launch",
  "launchDuration",
  "launchFrom",
  "fps",
  "preset",
  "secondary",
  "secondaryAt",
  "colorMode",
  "sound",
  "volume",
  "text",
  "shockwave",
  "fall"
], o = {
  name: "VueFireworks",
  props: {
    show: { type: Boolean, default: !1 },
    count: { type: Number },
    colors: { type: Array },
    shape: { type: String, validator: (e) => ["rect", "circle", "star", "heart", "text"].includes(e) },
    gravity: { type: Number },
    friction: { type: Number },
    spread: { type: Number },
    size: { type: Number },
    trail: { type: Boolean },
    glow: { type: Boolean },
    duration: { type: Number },
    origin: { type: [String, Object] },
    followMouse: { type: Boolean },
    bursts: { type: Number, default: 1 },
    burstInterval: { type: Number, default: 280 },
    loop: { type: Boolean, default: !1 },
    launch: { type: Boolean, default: !1 },
    launchDuration: { type: Number, default: 1200 },
    launchFrom: { type: [String, Object], default: "below" },
    fps: { type: Number },
    // 新配置不设 default：undefined 时跳过，避免 default 覆盖 preset 展开值
    preset: { type: String },
    secondary: { type: Number },
    secondaryAt: { type: Number },
    colorMode: { type: String, validator: (e) => ["random", "gradient"].includes(e) },
    sound: { type: Boolean },
    volume: { type: Number },
    text: { type: String },
    shockwave: { type: Number },
    fall: { type: Boolean }
  },
  data() {
    return { engine: null };
  },
  watch: {
    show(e) {
      e ? this.fire() : this.engine && this.engine.stop();
    },
    // 深层配置变化时同步给引擎
    ...i.reduce((e, t) => (e[t] = {
      handler(n) {
        n !== void 0 && this.engine && this.engine.setOptions({ [t]: n });
      }
    }, e), {})
  },
  mounted() {
    this.engine = new r(this.$refs.canvas, this._engineOptions()), this.engine.onEnd = () => {
      s(this, !1), this.$emit("end");
    }, this.show && this.fire();
  },
  beforeDestroy() {
    this.engine && this.engine.destroy(), this.engine = null;
  },
  methods: {
    _engineOptions() {
      const e = {};
      for (const t of i) {
        const n = this[t];
        n !== void 0 && (e[t] = n);
      }
      return e;
    },
    fire(e) {
      this.engine && (this.$emit("start"), this.engine.fire(e));
    },
    stop() {
      this.engine && this.engine.stop();
    }
  },
  render(e) {
    return e("div", {
      class: "fireworks-container",
      style: {
        position: "fixed",
        inset: "0",
        zIndex: "11",
        pointerEvents: this.followMouse ? "none" : "auto"
      }
    }, [
      e("canvas", {
        ref: "canvas",
        style: { width: "100%", height: "100%", display: "block" }
      })
    ]);
  }
};
o.install = function(e) {
  e.component(o.name, o);
};
export {
  o as default
};
