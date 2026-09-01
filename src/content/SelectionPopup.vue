<script setup lang="ts">
import type { SelectionPopupState } from './selectionState'

defineProps<{
  state: SelectionPopupState
  handleTranslate: () => void
  handleCopy: () => void
  handleClose: () => void
}>()
</script>

<template>
  <div v-show="state.visible" class="xt-card" role="dialog" aria-label="划词翻译">
    <div class="xt-head">
      <p class="xt-title">划词翻译</p>
      <button class="xt-close" type="button" aria-label="关闭" @click="handleClose">
        ×
      </button>
    </div>
    <div class="xt-source">{{ state.text }}</div>
    <p v-if="state.error" class="xt-error">{{ state.error }}</p>
    <div v-else class="xt-result">{{ state.loading ? '正在翻译…' : state.result }}</div>
    <div class="xt-actions">
      <button
        class="xt-btn xt-btn-primary"
        type="button"
        :disabled="state.loading"
        @click="handleTranslate"
      >
        {{ state.loading ? '翻译中' : state.result ? '重新翻译' : '翻译' }}
      </button>
      <button
        v-if="state.result"
        class="xt-btn xt-btn-ghost"
        type="button"
        @click="handleCopy"
      >
        复制
      </button>
    </div>
  </div>
</template>
