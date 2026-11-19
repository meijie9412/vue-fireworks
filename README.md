# @meijie/vue-fireworks

[![npm version](https://img.shields.io/npm/v/@meijie/vue-fireworks.svg)](https://www.npmjs.com/package/@meijie/vue-fireworks)
[![license](https://img.shields.io/npm/l/@meijie/vue-fireworks.svg)](./LICENSE)

基于 Canvas 的烟花/礼花特效组件。支持 **Vue 2.6+** 与 **Vue 3**，粒子数量、颜色、形状、绽放位置、拖尾、发光全部可配置，支持**固定位置绽放**与**跟随鼠标**。

## 安装

```bash
npm i @meijie/vue-fireworks
```

`vue` 为 peerDependency，需项目中已安装 Vue 2.6+ 或 Vue 3。

## 快速开始

### Vue 3（`v-model:show`）

```vue
<template>
  <VueFireworks v-model:show="show" :glow="true" :trail="true" shape="star" />
  <button @click="show = true">放烟花</button>
</template>

<script setup>
import { ref } from 'vue'
import VueFireworks from '@meijie/vue-fireworks/vue3'
const show = ref(false)
</script>
```

### Vue 2（`.sync`）

```vue
<template>
  <VueFireworks :show.sync="show" :glow="true" />
  <button @click="show = true">放烟花</button>
</template>

<script>
import VueFireworks from '@meijie/vue-fireworks' // 或 '/vue2'
export default {
  components: { VueFireworks },
  data: () => ({ show: false })
}
</script>
```

播放完毕组件会自动把 `show` 置回 `false`，可连续触发。

## 导入路径

| 路径 | 用途 |
|---|---|
| `@meijie/vue-fireworks` | 默认 = Vue 2 版本（兼容老用户） |
| `@meijie/vue-fireworks/vue2` | Vue 2 显式入口 |
| `@meijie/vue-fireworks/vue3` | Vue 3 入口 |
| `@meijie/vue-fireworks/engine` | 纯 JS 引擎，脱离 Vue 直接用 |

## Props

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `show` | Boolean | `false` | 显示/触发，配合 `.sync`（Vue2）或 `v-model:show`（Vue3） |
| `count` | Number | `60` | 每轮粒子数量 |
| `colors` | String[] | `['#FF8201','#2DA6E0','#FF262B']` | 粒子颜色池 |
| `shape` | String | `'rect'` | 粒子形状：`rect` / `circle` / `star` |
| `origin` | String \| Object | `'center'` | 绽放原点，`'center'` 或 `{ x, y }`（canvas 内 CSS 像素） |
| `followMouse` | Boolean | `false` | 跟随鼠标绽放，优先级高于 `origin` |
| `bursts` | Number | `1` | 一次触发连续绽放几朵（1 = 单朵，最大 50） |
| `burstInterval` | Number | `280` | 相邻两朵的间隔(ms) |
| `loop` | Boolean | `false` | 循环连放，直到 `stop()` / `show=false` |
| `gravity` | Number | `0.12` | 重力加速度 |
| `friction` | Number | `0.985` | 空气阻力（速度衰减） |
| `spread` | Number | `5` | 爆炸初速度上限 |
| `size` | Number | `4` | 粒子尺寸(px) |
| `duration` | Number | `90` | 粒子最大寿命(帧) |
| `trail` | Boolean | `false` | 拖尾残影 |
| `glow` | Boolean | `false` | 发光效果 |
| `fps` | Number | `60` | 渲染帧率 |

### 固定位置绽放

```vue
<VueFireworks v-model:show="show" :origin="{ x: 300, y: 200 }" />
```

### 跟随鼠标

```vue
<VueFireworks v-model:show="show" :followMouse="true" />
```

### 连发与循环

一次触发连续绽放多朵，每朵随机分布在画布上（此时 `origin` / `followMouse` 忽略）：

```vue
<!-- 一次放 5 朵，间隔 300ms -->
<VueFireworks v-model:show="show" :bursts="5" :burstInterval="300" />
```

循环连放像一场持续烟花秀，直到调用 `stop()` 或把 `show` 设为 `false`：

```vue
<VueFireworks ref="fw" v-model:show="show" :bursts="3" :loop="true" />
<button @click="$refs.fw.stop()">停止</button>
```

> 通过 `ref.fire({ origin })` 指定落点、或点击画布时，会强制单朵绽放（连发/循环不生效），保证"点哪爆哪"的确定性。

## 事件

| 事件 | 说明 |
|---|---|
| `update:show` | 播放结束时触发，用于同步 `show` 为 `false` |
| `start` | 开始播放时触发 |
| `end` | 播放结束时触发 |

## 命令式方法（ref）

```vue
<VueFireworks ref="fw" />
<script setup>
const fw = ref()
fw.value.fire({ origin: { x: 100, y: 100 }, count: 100 }) // 带临时配置触发
fw.value.stop()                                            // 立即停止
</script>
```

## 脱离 Vue 使用引擎

```js
import { FireworksEngine } from '@meijie/vue-fireworks/engine'
const engine = new FireworksEngine(canvasEl, { count: 80, glow: true })
engine.onEnd = () => console.log('done')
engine.fire()
// engine.setOptions({ shape: 'star' }); engine.stop(); engine.destroy()
```

## 开发

```bash
npm install
npm test        # Vitest 单元测试
npm run build   # 构建 dist/（ESM + CJS + 类型声明）
```

项目结构：`src/engine.js` 为纯 JS 粒子引擎（不依赖 Vue），`src/vue2.js` / `src/vue3.js` 为框架薄壳，三者共用一份核心。

## 发布

发布由 GitHub Actions 通过 npm Trusted Publishing (OIDC) 自动完成，无需本地 token。维护者推送版本标签即触发：

```bash
git tag v0.2.1
git push origin v0.2.1
```

workflow 会依次执行 `npm ci` → `npm run build` → `npm test` → `npm publish`。

## License

MIT
