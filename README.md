# @meijie/vue-fireworks

English | [中文](https://github.com/meijie9412/vue-fireworks/blob/main/README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@meijie/vue-fireworks.svg)](https://www.npmjs.com/package/@meijie/vue-fireworks)
[![license](https://img.shields.io/npm/l/@meijie/vue-fireworks.svg)](./LICENSE)

A canvas-based fireworks / firework-display component for **Vue 2.6+** and **Vue 3**. Particle count, colors, shape, burst position, trails and glow are all configurable. Supports **fixed-position bursts**, **mouse following**, **multi-burst sequences with looping**, a realistic **launch phase** powered by projectile physics, plus **presets**, **secondary explosions**, **shockwave rings**, **color gradients**, **heart/text particles**, **waterfall mode** and **Web Audio sound effects**.

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
| `@meijie/vue-fireworks/engine` | Backward-compatible re-export of `@meijie/fireworks-core` (unchanged for existing users) |

New projects that only need the engine should install [`@meijie/fireworks-core`](https://www.npmjs.com/package/@meijie/fireworks-core) directly — zero dependencies, no Vue peer requirement.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `show` | Boolean | `false` | Show / trigger. Pair with `.sync` (Vue 2) or `v-model:show` (Vue 3). |
| `count` | Number | `60` | Number of particles per burst |
| `colors` | String[] | `['#FF8201','#2DA6E0','#FF262B']` | Particle color pool (one picked at random per particle) |
| `shape` | String | `'rect'` | Particle shape: `rect` / `circle` / `star` / `heart` / `text` |
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
| `preset` | String | `null` | One-click effect preset: `show` / `salute` / `waterfall` (see below) |
| `secondary` | Number | `0` | Number of child particles spawned by a secondary explosion; `0` disables it |
| `secondaryAt` | Number | `0.5` | When a particle splits, as a fraction of its lifetime (0–1) |
| `colorMode` | String | `'random'` | `random` picks a random color per particle; `gradient` transitions each particle through the color pool over its lifetime |
| `sound` | Boolean | `false` | Synthesized Web Audio SFX (launch whoosh + burst bang); no audio files needed |
| `volume` | Number | `0.35` | Sound volume 0–1 |
| `text` | String | `'★'` | Glyph rendered when `shape="text"` |
| `shockwave` | Number | `0` | Shockwave ring max radius in px; `0` disables it |
| `fall` | Boolean | `false` | Waterfall mode: particles rain down from the top of the canvas |

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

### Presets (one-click effects)

Three built-in presets bundle a complete set of options. Explicit props you pass alongside a preset take precedence:

```vue
<!-- Firework show: 6 looping bursts with rocket launches and color gradients -->
<VueFireworks v-model:show="show" preset="show" />
<!-- Salute: 8 rapid bursts with secondary explosions and shockwaves -->
<VueFireworks v-model:show="show" preset="salute" />
<!-- Waterfall: continuous colored rain from the top -->
<VueFireworks v-model:show="show" preset="waterfall" />
```

| Preset | What it sets |
|---|---|
| `show` | 6 bursts, 260 ms apart, looping, with launch phase + gradient colors |
| `salute` | 8 bursts, 70 ms apart, secondary explosions (`secondary: 14`) + shockwave rings |
| `waterfall` | `fall: true`, long trails, low gravity, gradient colors, looping |

Switching presets at runtime resets prior preset state — call `setOptions`/update the prop with a new `preset` value and the conflicting options are overwritten.

### Secondary explosions & shockwaves

Split each particle into smaller ones partway through its life, and add an expanding ring at every burst:

```vue
<VueFireworks v-model:show="show" :secondary="16" :secondaryAt="0.5" :shockwave="120" />
```

Secondary particles never split again (no runaway cascade), and a hard cap of 6000 particles protects against pathological configs.

### Color gradients

```vue
<VueFireworks v-model:show="show" colorMode="gradient" :colors="['#FF0000','#00FF00','#0000FF']" />
```

Each particle starts at one pool color and transitions to the next over its lifetime. `colorMode="random"` (default) keeps the original behavior.

### Heart & text particles

```vue
<VueFireworks v-model:show="show" shape="heart" />
<VueFireworks v-model:show="show" shape="text" text="🎆" />
```

### Sound effects

```vue
<VueFireworks v-model:show="show" :sound="true" :volume="0.4" />
```

Sounds are synthesized with the Web Audio API (a rising sine sweep on launch, filtered noise on burst) — no audio assets to ship. Browsers require a user gesture before audio can play; if the AudioContext is unavailable the animation still runs silently.

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

The engine now lives in a standalone, zero-dependency package shared by all framework bindings:

```js
import { FireworksEngine } from '@meijie/fireworks-core'
const engine = new FireworksEngine(canvasEl, { count: 80, glow: true })
engine.onEnd = () => console.log('done')
engine.fire()
// engine.setOptions({ shape: 'star' }); engine.stop(); engine.destroy()
```

`@meijie/vue-fireworks/engine` remains as a backward-compatible re-export, so existing imports keep working without changes.

## Development

```bash
npm install
npm test        # Vitest unit tests
npm run build   # build dist/ (ESM + CJS + type declarations)
```

Layout: `src/engine.js` is a plain-JS particle engine with no Vue dependency; `src/vue2.js` and `src/vue3.js` are thin framework wrappers. All three share one core.

## Publishing

A GitHub Actions workflow (`.github/workflows/publish.yml`) is provided for automated releases. It runs `npm ci` → `npm run build` → `npm test` → `npm publish`, and supports npm Trusted Publishing (OIDC) once you configure a Trusted Publisher on npmjs.com. Pushing a version tag then triggers a release:

```bash
git tag v0.5.0
git push origin v0.5.0
```

Until Trusted Publishing is configured, releases can also be published manually from the maintainer's machine.

## License

MIT
