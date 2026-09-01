import type { Message, MessageResponse, Settings } from '../shared/types'
import { fail, ok } from '../shared/messages'
import { getSettings, watchSettings } from '../shared/storage'
import { initSelection, setSelectionEnabled, translateCurrentSelection } from './selection'
import { getPageStatus, setPageSettings, startPageTranslate, stopPageTranslate } from './pageTranslate'

let settings: Settings | null = null

async function boot() {
  settings = await getSettings()
  setSelectionEnabled(settings.selectionEnabled)
  setPageSettings(settings)
  initSelection()
}

watchSettings((next) => {
  settings = next
  setSelectionEnabled(next.selectionEnabled)
  setPageSettings(next)
})

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  void handle(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse(fail(error instanceof Error ? error.message : String(error)))
    })
  return true
})

async function handle(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case 'PING':
      return ok(true)
    case 'GET_PAGE_STATUS':
      return ok(getPageStatus())
    case 'TRANSLATE_SELECTION':
      translateCurrentSelection()
      return ok(true)
    case 'START_PAGE_TRANSLATE': {
      const current = settings ?? (await getSettings())
      void startPageTranslate(current)
      return ok(getPageStatus())
    }
    case 'STOP_PAGE_TRANSLATE':
      stopPageTranslate()
      return ok(getPageStatus())
    default:
      return fail('内容脚本无法处理该消息')
  }
}

const bootFlag = globalThis as typeof globalThis & { __xtContentBooted?: boolean }
if (!bootFlag.__xtContentBooted) {
  bootFlag.__xtContentBooted = true
  void boot()
}
