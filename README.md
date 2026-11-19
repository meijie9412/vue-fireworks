# @meijie/vue-fireworks

English | [中文](https://github.com/meijie9412/vue-fireworks/blob/main/README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@meijie/vue-fireworks.svg)](https://www.npmjs.com/package/@meijie/vue-fireworks)
[![license](https://img.shields.io/npm/l/@meijie/vue-fireworks.svg)](./LICENSE)

A canvas-based fireworks / firework-display component for **Vue 2.6+** and **Vue 3**. Particle count, colors, shape, burst position, trails and glow are all configurable. Supports **fixed-position bursts**, **mouse following**, **multi-burst sequences with looping**, and a realistic **launch phase** powered by projectile physics.

## Installation

```bash
npm i @meijie/vue-fireworks
```

`vue` is a peer dependency — Vue 2.6+ or Vue 3 must already be installed in your project.

## Quick start

### Vue 3 (`v-model:show`)

```vue
<template>
  <VueFireworks v-model:show="show" :glow="true" :trail="true" shape="star" />
  <button @click="show = true">Launch</button>
</template>

<script setup>
import { ref } from 'vue'
import VueFireworks from '@meijie/vue-fireworks/vue3'
const show = ref(false)
</script>
```

### Vue 2 (`.sync`)

```vue
<template>
  <VueFireworks :show.sync="show" :glow="true" />
  <button @click="show = true">Launch</button>
</template>

<script>
import VueFireworks from '@meijie/vue-fireworks' // or '/vue2'
export default {
  components: { VueFireworks },
  data: () => ({ show: false })
}
</script>
```

When playback finishes, the component automatically resets `show` to `false`, so it can be triggered repeatedly.

## Import paths

| Path | Purpose |
|---|---|
| `@meijie/vue-fireworks` | Default = Vue 2 build (backwards compatible) |
| `@meijie/vue-fireworks/vue2` | Explicit Vue 2 entry |
| `@meijie/vue-fireworks/vue3` | Vue 3 entry |
| `@meijie/vue-fireworks/engine` | Plain-JS engine, usable without Vue |

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `show` | Boolean | `false` | Show / trigger. Pair with `.sync` (Vue 2) or `v-model:show` (Vue 3). |
| `count` | Number | `60` | Number of particles per burst |
| `colors` | String[] | `['#FF8201','#2DA6E0','#FF262B']` | Particle color pool (one picked at random per particle) |
| `shape` | String | `'rect'` | Particle shape: `rect` / `circle` / `star` |
| `origin` | String \| Object | `'center'` | Burst origin: `'center'` or `{ x, y }` (CSS pixels inside the canvas) |
| `followMouse` | Boolean | `false` | Burst at the mouse position; takes precedence over `origin` |
| `bursts` | Number | `1` | Number of consecutive bursts per trigger (`1` = single, max `50`) |
| `burstInterval` | Number | `280` | Interval between adjacent bursts, in ms |
| `loop` | Boolean | `false` | Keep launching bursts until `stop()` or `show=false` |
| `launch` | Boolean | `false` | Show the launch phase (a rocket rises, then bursts) |
| `launchDuration` | Number | `1200` | Rocket ascent time, in ms |
| `launchFrom` | String \| Object | `'below'` | Launch origin: `'below'` (bottom edge directly under the burst point) / `'center'` / `{ x, y }` |
| `gravity` | Number | `0.12` | Gravity acceleration |
| `friction` | Number | `0.985` | Air drag (velocity damping) |
| `spread` | Number | `5` | Maximum initial explosion speed |
| `size` | Number | `4` | Particle size in px |
| `duration` | Number | `90` | Maximum particle lifetime in frames |
| `trail` | Boolean | `false` | Motion trail (afterimage) |
| `glow` | Boolean | `false` | Glow effect |
| `fps` | Number | `60` | Render frame rate |

### Fixed-position burst

```vue
<VueFireworks v-model:show="show" :origin="{ x: 300, y: 200 }" />
```

### Follow the mouse

```vue
<VueFireworks v-model:show="show" :followMouse="true" />
```

### Multiple bursts and looping

Launch several bursts in a row, each at a random position on the canvas (`origin` / `followMouse` are ignored in this mode):

```vue
<!-- 5 bursts, 300ms apart -->
<VueFireworks v-model:show="show" :bursts="5" :burstInterval="300" />
```

Looping keeps a continuous show going until you call `stop()` or set `show` to `false`:

```vue
<VueFireworks ref="fw" v-model:show="show" :bursts="3" :loop="true" />
<button @click="$refs.fw.stop()">Stop</button>
```

> Calling `ref.fire({ origin })` with an explicit origin, or clicking the canvas, always forces a **single** burst (multi-burst and looping are disabled) — so "click here, burst here" stays deterministic.

### Launch phase

When enabled, a rocket rises from below the burst point, decelerating under gravity and trailing sparks, then bursts at its apex — a complete, realistic firework sequence:

```vue
<VueFireworks v-model:show="show" :launch="true" :launchDuration="700" />
```

The launch origin defaults to the bottom edge directly beneath the burst point. It can be changed to bottom-center or an arbitrary coordinate:

```vue
<VueFireworks v-model:show="show" :launch="true" launchFrom="center" />
<VueFireworks v-model:show="show" :launch="true" :launchFrom="{ x: 100, y: 780 }" />
```

Launch works together with multi-burst and looping: each firework rises independently and bursts in turn.

## Events

| Event | Description |
|---|---|
| `update:show` | Fired when playback ends; used to sync `show` back to `false` |
| `start` | Fired when playback starts |
| `end` | Fired when playback ends |

## Imperative methods (ref)

```vue
<VueFireworks ref="fw" />
<script setup>
const fw = ref()
fw.value.fire({ origin: { x: 100, y: 100 }, count: 100 }) // trigger with temporary overrides
fw.value.stop()                                            // stop immediately
</script>
```

## Using the engine without Vue

```js
import { FireworksEngine } from '@meijie/vue-fireworks/engine'
const engine = new FireworksEngine(canvasEl, { count: 80, glow: true })
engine.onEnd = () => console.log('done')
engine.fire()
// engine.setOptions({ shape: 'star' }); engine.stop(); engine.destroy()
```

## Development

```bash
npm install
npm test        # Vitest unit tests
npm run build   # build dist/ (ESM + CJS + type declarations)
```

Layout: `src/engine.js` is a plain-JS particle engine with no Vue dependency; `src/vue2.js` and `src/vue3.js` are thin framework wrappers. All three share one core.

## Publishing

Releases are published automatically by GitHub Actions via npm Trusted Publishing (OIDC) — no local token required (a Trusted Publisher must first be configured on npmjs.com). Once configured, pushing a version tag triggers the workflow:

```bash
git tag v0.4.0
git push origin v0.4.0
```

The workflow runs `npm ci` → `npm run build` → `npm test` → `npm publish`.

## License

MIT
