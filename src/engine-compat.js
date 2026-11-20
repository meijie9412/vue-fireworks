// Backward-compatible /engine entry.
// The real engine now lives in @meijie/fireworks-core (zero dependencies).
// Existing imports like `import FireworksEngine from '@meijie/vue-fireworks/engine'`
// keep working unchanged.
export * from '@meijie/fireworks-core'
export { default } from '@meijie/fireworks-core'
