/**
 * 最小 DOM/Canvas mock：引擎的纯逻辑测试不需要真实渲染，
 * 只需要 2d context 的方法存在、window/document 的事件与尺寸接口。
 */
export function installDomMock () {
  const listeners = { window: {}, canvas: {} }

  const makeCtx = () => ({
    canvas: null,
    setTransform () {}, save () {}, restore () {},
    clearRect () {}, fillRect () {}, drawImage () {},
    beginPath () {}, arc () {}, fill () {}, moveTo () {}, lineTo () {}, closePath () {}, translate () {}, rotate () {},
    createRadialGradient () { return { addColorStop () {} } },
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '', shadowBlur: 0, shadowColor: ''
  })

  const makeCanvas = () => {
    const ctx = makeCtx()
    const canvas = {
      width: 0, height: 0, clientWidth: 1280, clientHeight: 800,
      _listeners: {},
      getContext () { return ctx },
      getBoundingClientRect () { return { left: 0, top: 0, width: 1280, height: 800 } },
      addEventListener (t, fn) { (this._listeners[t] ||= []).push(fn) },
      removeEventListener (t, fn) { this._listeners[t] = (this._listeners[t] || []).filter(f => f !== fn) }
    }
    ctx.canvas = canvas
    return canvas
  }

  globalThis.document = {
    documentElement: { clientWidth: 1280, clientHeight: 800 },
    body: { clientWidth: 1280, clientHeight: 800 },
    createElement (tag) { return tag === 'canvas' ? makeCanvas() : {} }
  }
  globalThis.window = {
    devicePixelRatio: 1,
    addEventListener (t, fn) { (listeners.window[t] ||= []).push(fn) },
    removeEventListener (t, fn) { listeners.window[t] = (listeners.window[t] || []).filter(f => f !== fn) },
    dispatch (t, e) { (listeners.window[t] || []).forEach(fn => fn(e)) },
    listenerCount (t) { return (listeners.window[t] || []).length }
  }
  globalThis.requestAnimationFrame = () => 1
  globalThis.cancelAnimationFrame = () => {}

  return { makeCanvas, listeners }
}
