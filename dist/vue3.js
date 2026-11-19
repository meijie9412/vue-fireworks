import { h as s } from "vue";
import { FireworksEngine as r } from "./engine.js";
import { e as a } from "./shared-shared-es.js";
const o = [
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
  "fps"
], n = {
  name: "VueFireworks",
  props: {
    show: { type: Boolean, default: !1 },
    count: { type: Number },
    colors: { type: Array },
    shape: { type: String, validator: (e) => ["rect", "circle", "star"].includes(e) },
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
    fps: { type: Number }
  },
  emits: ["update:show", "start", "end"],
  data() {
    return { engine: null };
  },
  watch: {
    show(e) {
      e ? this.fire() : this.engine && this.engine.stop();
    },
    ...o.reduce((e, t) => (e[t] = {
      handler(i) {
        this.engine && this.engine.setOptions({ [t]: i });
      }
    }, e), {})
  },
  mounted() {
    this.engine = new r(this.$refs.canvas, this._engineOptions()), this.engine.onEnd = () => {
      a(this, !1), this.$emit("end");
    }, this.show && this.fire();
  },
  beforeUnmount() {
    this.engine && this.engine.destroy(), this.engine = null;
  },
  methods: {
    _engineOptions() {
      const e = {};
      for (const t of o) {
        const i = this[t];
        i !== void 0 && (e[t] = i);
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
  render() {
    return s("div", {
      class: "fireworks-container",
      style: {
        position: "fixed",
        inset: "0",
        zIndex: "11",
        pointerEvents: this.followMouse ? "none" : "auto"
      }
    }, [
      s("canvas", {
        ref: "canvas",
        style: { width: "100%", height: "100%", display: "block" }
      })
    ]);
  }
};
n.install = function(e) {
  e.component(n.name, n);
};
export {
  n as default
};
