/**
 * Vue 3 薄壳 —— Options API（Vue3 兼容），供 v-model:show 使用。
 * 与 Vue2 版逻辑一致，仅 $emit 的 .sync 语义在 Vue3 由 v-model:show 消费。
 */
import { h } from 'vue'
import { FireworksEngine } from './engine.js'
import { emitUpdate } from './shared.js'

const PROP_KEYS = [
  'count', 'colors', 'shape', 'gravity', 'friction', 'spread',
  'size', 'trail', 'glow', 'duration', 'origin', 'followMouse',
  'bursts', 'burstInterval', 'loop',
  'launch', 'launchDuration', 'launchFrom', 'fps'
]

const VueFireworks = {
  name: 'VueFireworks',
  props: {
    show: { type: Boolean, default: false },
    count: { type: Number },
    colors: { type: Array },
    shape: { type: String, validator: v => ['rect', 'circle', 'star'].includes(v) },
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
    loop: { type: Boolean, default: false },
    launch: { type: Boolean, default: false },
    launchDuration: { type: Number, default: 500 },
    launchFrom: { type: [String, Object], default: 'below' },
    fps: { type: Number }
  },
  emits: ['update:show', 'start', 'end'],
  data () {
    return { engine: null }
  },
  watch: {
    show (val) {
      if (val) this.fire()
      else if (this.engine) this.engine.stop()
    },
    ...PROP_KEYS.reduce((acc, key) => {
      acc[key] = {
        handler (val) {
          if (this.engine) this.engine.setOptions({ [key]: val })
        }
      }
      return acc
    }, {})
  },
  mounted () {
    this.engine = new FireworksEngine(this.$refs.canvas, this._engineOptions())
    this.engine.onEnd = () => {
      emitUpdate(this, false)
      this.$emit('end')
    }
    if (this.show) this.fire()
  },
  beforeUnmount () {
    if (this.engine) this.engine.destroy()
    this.engine = null
  },
  methods: {
    _engineOptions () {
      const opts = {}
      for (const key of PROP_KEYS) {
        const val = this[key]
        if (val !== undefined) opts[key] = val
      }
      return opts
    },
    fire (overrides) {
      if (!this.engine) return
      this.$emit('start')
      this.engine.fire(overrides)
    },
    stop () {
      if (this.engine) this.engine.stop()
    }
  },
  render () {
    // 直接从 'vue' 导入 h，避免依赖 render 参数注入
    return h('div', {
      class: 'fireworks-container',
      style: {
        position: 'fixed', inset: '0', zIndex: '11',
        pointerEvents: this.followMouse ? 'none' : 'auto'
      }
    }, [
      h('canvas', {
        ref: 'canvas',
        style: { width: '100%', height: '100%', display: 'block' }
      })
    ])
  }
}

VueFireworks.install = function (app) {
  app.component(VueFireworks.name, VueFireworks)
}

export default VueFireworks
