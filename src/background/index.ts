import { getSettings, saveSettings } from '../shared/storage'
import { fail, ok } from '../shared/messages'
import type { Message, MessageResponse, Settings } from '../shared/types'
import { testConnection, translateBatch, translateText } from './openai'

const MENU_SELECTION = 'xt-translate-selection'
const MENU_PAGE = 'xt-translate-page'
const MENU_STOP = 'xt-translate-stop'

chrome.runtime.onInstalled.addListener(() => {
  setupMenus()
})

chrome.runtime.onStartup.addListener(() => {
  setupMenus()
})

function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SELECTION,
      title: '翻译选中文本',
      contexts: ['selection'],
    })
    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: '翻译整个页面',
      contexts: ['page', 'frame'],
    })
    chrome.contextMenus.create({
      id: MENU_STOP,
      title: '取消页面翻译',
      contexts: ['page', 'frame'],
    })
  })
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return
  const tabId = tab.id
  if (info.menuItemId === MENU_SELECTION) {
    await sendToTab(tabId, { type: 'TRANSLATE_SELECTION' })
    return
  }
  if (info.menuItemId === MENU_PAGE) {
    await sendToTab(tabId, { type: 'START_PAGE_TRANSLATE' })
    return
  }
  if (info.menuItemId === MENU_STOP) {
    await sendToTab(tabId, { type: 'STOP_PAGE_TRANSLATE' })
  }
})

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  void handleMessage(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse(fail(error instanceof Error ? error.message : String(error)))
    })
  return true
})

async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_SETTINGS':
      return ok(await getSettings())
    case 'SAVE_SETTINGS':
      await saveSettings(sanitizeSettings(message.settings))
      return ok(true)
    case 'TEST_API': {
      const settings = await getSettings()
      const sample = await testConnection(settings)
      return ok(sample)
    }
    case 'TRANSLATE_TEXT': {
      const settings = await getSettings()
      const text = await translateText(settings, message.text)
      return ok(text)
    }
    case 'TRANSLATE_BATCH': {
      const settings = await getSettings()
      const items = await translateBatch(settings, message.items)
      return ok(items)
    }
    default:
      return fail('未知消息类型')
  }
}

function sanitizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    baseUrl: settings.baseUrl.trim(),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
    targetLang: settings.targetLang.trim() || '中文',
    translationFontSize: Math.min(24, Math.max(12, Number(settings.translationFontSize) || 16)),
    translationColor: settings.translationColor || '#047857',
  }
}

async function sendToTab(tabId: number, message: Message): Promise<void> {
  try {
    await ensureContentScript(tabId)
    await chrome.tabs.sendMessage(tabId, message)
  } catch {
    // Restricted pages (chrome://, Web Store) cannot be injected.
  }
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' })
    return
  } catch {
    const files = ['content.js']
    await chrome.scripting.executeScript({
      target: { tabId },
      files,
    })
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
}
