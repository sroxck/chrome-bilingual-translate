import type { Settings, TranslateItem, TranslateResultItem } from '../shared/types'
import { sendRuntimeMessage } from '../shared/messages'
import {
  collectBlocks,
  countTranslated,
  getBlockText,
  insertTranslation,
  removeAllTranslations,
  TRANSLATION_CLASS,
} from './dom'
import { hideProgress, showProgress } from './toast'

const BATCH_SIZE = 12

let translating = false
let stopped = false
let error: string | null = null
let settings: Settings | null = null
let observer: MutationObserver | null = null
let debounceTimer = 0
let inserting = false

export function getPageStatus() {
  return {
    translating,
    translatedCount: countTranslated(),
    pendingCount: collectBlocks().length,
    error,
  }
}

export function setPageSettings(next: Settings) {
  settings = next
  document.querySelectorAll<HTMLElement>(`.${TRANSLATION_CLASS}`).forEach((node) => {
    node.style.fontSize = `${next.translationFontSize}px`
    node.style.color = next.translationColor
  })
}

export async function startPageTranslate(nextSettings: Settings) {
  settings = nextSettings
  if (translating) return
  stopped = false
  error = null
  translating = true
  showProgress('正在准备翻译…')
  startObserver()
  try {
    await translatePending()
    if (!stopped) showProgress('翻译完成')
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    showProgress(error)
  } finally {
    translating = false
    window.setTimeout(() => {
      if (!translating) hideProgress()
    }, 1600)
  }
}

export function stopPageTranslate() {
  stopped = true
  translating = false
  observer?.disconnect()
  observer = null
  removeAllTranslations()
  hideProgress()
  error = null
}

async function translatePending() {
  if (!settings) return
  while (!stopped) {
    const blocks = collectBlocks()
    if (blocks.length === 0) break
    const batch = blocks.slice(0, BATCH_SIZE)
    const done = countTranslated()
    const total = done + blocks.length
    showProgress(`正在翻译 ${done}/${total}`)

    const items: TranslateItem[] = batch.map((el, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      text: getBlockText(el),
    }))

    const results = await sendRuntimeMessage<TranslateResultItem[]>({
      type: 'TRANSLATE_BATCH',
      items,
    })

    if (stopped) break

    inserting = true
    const map = new Map(results.map((item) => [item.id, item.text]))
    batch.forEach((el, index) => {
      const translated = map.get(items[index].id)
      if (!translated) return
      insertTranslation(
        el,
        translated,
        items[index].id,
        settings!.translationFontSize,
        settings!.translationColor,
      )
    })
    inserting = false
  }
}

function startObserver() {
  if (observer) return
  observer = new MutationObserver(() => {
    if (inserting || stopped) return
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      if (stopped || translating) return
      void continueTranslate()
    }, 700)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

async function continueTranslate() {
  if (!settings || translating || stopped) return
  if (collectBlocks().length === 0) return
  translating = true
  try {
    await translatePending()
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    showProgress(error)
  } finally {
    translating = false
    window.setTimeout(() => {
      if (!translating) hideProgress()
    }, 1200)
  }
}
