export interface Settings {
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  targetLang: string
  selectionEnabled: boolean
  translationFontSize: number
  translationColor: string
}

export interface TranslateItem {
  id: string
  text: string
}

export interface TranslateResultItem {
  id: string
  text: string
}

export type Message =
  | { type: 'PING' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings }
  | { type: 'TEST_API' }
  | { type: 'TRANSLATE_TEXT'; text: string }
  | { type: 'TRANSLATE_BATCH'; items: TranslateItem[] }
  | { type: 'START_PAGE_TRANSLATE' }
  | { type: 'STOP_PAGE_TRANSLATE' }
  | { type: 'TRANSLATE_SELECTION' }
  | { type: 'GET_PAGE_STATUS' }

export type PageStatus = {
  translating: boolean
  translatedCount: number
  pendingCount: number
  error: string | null
}

export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
