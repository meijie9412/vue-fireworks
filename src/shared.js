/** 跨版本共用的小工具 */

/** 触发 .sync / v-model:show 的更新事件（两版事件名一致） */
export function emitUpdate (vm, value) {
  vm.$emit('update:show', value)
}
