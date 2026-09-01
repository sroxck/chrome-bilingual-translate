<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { sendRuntimeMessage, sendTabMessage } from '../shared/messages'
import { DEFAULT_SETTINGS } from '../shared/storage'
import type { PageStatus, Settings } from '../shared/types'

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const status = ref<PageStatus>({
  translating: false,
  translatedCount: 0,
  pendingCount: 0,
  error: null,
})
const loading = ref(false)
const message = ref('')
const messageType = ref<'ok' | 'err' | ''>('')
const configured = ref(false)
let timer = 0

onMounted(async () => {
  await refreshSettings()
  await refreshStatus()
  timer = window.setInterval(() => {
    void refreshStatus()
  }, 1200)
})

onUnmounted(() => {
  window.clearInterval(timer)
})

async function refreshSettings() {
  settings.value = await sendRuntimeMessage<Settings>({ type: 'GET_SETTINGS' })
  configured.value = Boolean(settings.value.apiKey && settings.value.baseUrl && settings.value.model)
}

async function activeTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

async function refreshStatus() {
  const tabId = await activeTabId()
  if (!tabId) return
  try {
    status.value = await sendTabMessage<PageStatus>(tabId, { type: 'GET_PAGE_STATUS' })
  } catch {
    status.value.error = '请刷新当前页面后再试'
  }
}

async function persist() {
  await sendRuntimeMessage({ type: 'SAVE_SETTINGS', settings: settings.value })
}

async function toggleSelection() {
  settings.value.selectionEnabled = !settings.value.selectionEnabled
  await persist()
}

async function translatePage() {
  const tabId = await activeTabId()
  if (!tabId) return
  loading.value = true
  message.value = ''
  try {
    await sendTabMessage(tabId, { type: 'START_PAGE_TRANSLATE' })
    messageType.value = 'ok'
    message.value = '已开始全文翻译'
    await refreshStatus()
  } catch (error) {
    messageType.value = 'err'
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function stopPage() {
  const tabId = await activeTabId()
  if (!tabId) return
  try {
    await sendTabMessage(tabId, { type: 'STOP_PAGE_TRANSLATE' })
    messageType.value = 'ok'
    message.value = '已取消对照翻译'
    await refreshStatus()
  } catch (error) {
    messageType.value = 'err'
    message.value = error instanceof Error ? error.message : String(error)
  }
}

function openOptions() {
  void chrome.runtime.openOptionsPage()
}
</script>

<template>
  <main class="popup">
    <header class="hero">
      <div>
        <h1>划词对照翻译</h1>
        <p>{{ configured ? 'API 已配置，可直接使用' : '请先到设置中接入大模型 API' }}</p>
      </div>
    </header>

    <section class="card panel">
      <div class="row">
        <div>
          <strong>划词翻译</strong>
          <p class="hint">选中文本后弹出翻译浮层</p>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="settings.selectionEnabled"
            :disabled="!configured"
            @change="toggleSelection"
          />
          <i />
        </label>
      </div>
    </section>

    <section class="card panel">
      <p class="meta">
        已对照 {{ status.translatedCount }} 段
        <span v-if="status.pendingCount"> · 待译 {{ status.pendingCount }}</span>
      </p>
      <div class="actions">
        <button class="btn btn-primary" :disabled="!configured || loading" @click="translatePage">
          {{ loading || status.translating ? '翻译中…' : '翻译当前页面' }}
        </button>
        <button class="btn btn-danger" @click="stopPage">取消对照</button>
      </div>
    </section>

    <p v-if="message" class="banner" :class="messageType === 'ok' ? 'banner-ok' : 'banner-err'">
      {{ message }}
    </p>
    <p v-else-if="status.error" class="banner banner-err">{{ status.error }}</p>

    <button class="btn btn-ghost link" type="button" @click="openOptions">打开设置</button>
  </main>
</template>

<style scoped>
.popup {
  width: 360px;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.hero h1 {
  margin: 0;
  font-size: 18px;
}

.hero p,
.hint,
.meta {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}

.panel {
  padding: 14px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.link {
  width: 100%;
}
</style>
