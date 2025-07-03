<template>
  <button
    :class="[
      'base-button',
      `base-button--${type}`,
      `base-button--${size}`,
      {
        'base-button--disabled': disabled,
        'base-button--loading': loading
      }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <el-icon v-if="loading" class="rotating">
      <Loading />
    </el-icon>
    <el-icon v-else-if="icon">
      <component :is="icon" />
    </el-icon>
    <span v-if="$slots.default" class="button-text">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import type { ButtonProps, ButtonEmits } from './types'

defineProps<ButtonProps>()
const emit = defineEmits<ButtonEmits>()

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<style scoped>
@import './style.scss';
</style> 