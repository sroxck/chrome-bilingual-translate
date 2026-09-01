<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { sendRuntimeMessage } from '../shared/messages'
import { DEFAULT_SETTINGS } from '../shared/storage'
import type { Settings } from '../shared/types'

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const showKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const message = ref('')
const messageType = ref<'ok' | 'err' | ''>('')

onMounted(async () => {
  settings.value = await sendRuntimeMessage<Settings>({ type: 'GET_SETTINGS' })
})

async function save() {
  saving.value = true
  message.value = ''
  try {
    await sendRuntimeMessage({ type: 'SAVE_SETTINGS', settings: settings.value })
    messageType.value = 'ok'
    message.value = '设置已保存'
  } catch (error) {
    messageType.value = 'err'
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}

async function testApi() {
  testing.value = true
  message.value = ''
  try {
    await sendRuntimeMessage({ type: 'SAVE_SETTINGS', settings: settings.value })
    const sample = await sendRuntimeMessage<string>({ type: 'TEST_API' })
    messageType.value = 'ok'
    message.value = `连接成功：${sample}`
  } catch (error) {
    messageType.value = 'err'
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <main class="page wrap">
    <header class="intro">
      <h1>API 与显示设置</h1>
      <p>接入任意 OpenAI 兼容接口（OpenAI / DeepSeek / 通义兼容端 / 自建），用于划词翻译和全文中英对照。</p>
    </header>

    <form class="card form" @submit.prevent="save">
      <label class="field">
        <span>Base URL</span>
        <input v-model="settings.baseUrl" type="url" placeholder="https://api.openai.com/v1" autocomplete="off" />
        <small>可填写到 /v1，或只填域名，插件会自动补全 chat/completions。</small>
      </label>

      <label class="field">
        <span>API Key</span>
        <div class="key-row">
          <input
            v-model="settings.apiKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="sk-..."
            autocomplete="off"
          />
          <button class="btn btn-ghost" type="button" @click="showKey = !showKey">
            {{ showKey ? '隐藏' : '显示' }}
          </button>
        </div>
        <small>仅保存在本地浏览器，翻译请求由后台脚本发出。</small>
      </label>

      <label class="field">
        <span>模型名称</span>
        <input v-model="settings.model" type="text" placeholder="gpt-4o-mini" autocomplete="off" />
      </label>

      <label class="field">
        <span>目标语言</span>
        <input v-model="settings.targetLang" type="text" placeholder="中文" />
      </label>

      <label class="field">
        <span>自定义 System Prompt（可选）</span>
        <textarea
          v-model="settings.systemPrompt"
          placeholder="留空则使用内置翻译提示词"
        />
      </label>

      <div class="row">
        <label class="field grow">
          <span>对照文字号 {{ settings.translationFontSize }}px</span>
          <input v-model.number="settings.translationFontSize" type="range" min="12" max="22" />
        </label>
        <label class="field color">
          <span>对照色</span>
          <input v-model="settings.translationColor" type="color" />
        </label>
      </div>

      <label class="row check">
        <div>
          <strong>启用划词翻译</strong>
          <small>在输入框内选中文本时不会触发</small>
        </div>
        <span class="switch">
          <input v-model="settings.selectionEnabled" type="checkbox" />
          <i />
        </span>
      </label>

      <p v-if="message" class="banner" :class="messageType === 'ok' ? 'banner-ok' : 'banner-err'">
        {{ message }}
      </p>

      <div class="actions">
        <button class="btn btn-ghost" type="button" :disabled="testing" @click="testApi">
          {{ testing ? '测试中…' : '测试连接' }}
        </button>
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px 64px;
}

.intro h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.intro p {
  margin: 0 0 24px;
  color: var(--muted);
}

.form {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.key-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.grow {
  flex: 1;
}

.color {
  width: 96px;
}

.color input {
  min-height: 40px;
  padding: 4px;
}

.check {
  align-items: center;
}

.check small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-weight: 400;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
