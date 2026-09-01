import type { Settings, TranslateItem, TranslateResultItem } from '../shared/types'
import {
  BATCH_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  buildBatchUserPrompt,
  buildSingleUserPrompt,
  parseNumberedTranslations,
} from '../shared/prompt'

const DEFAULT_TIMEOUT = 45_000
const BATCH_TIMEOUT = 90_000
const MAX_RETRIES = 2

export class TranslateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TranslateError'
  }
}

export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url) {
    throw new TranslateError('请填写 API Base URL')
  }
  if (url.endsWith('/chat/completions')) {
    url = url.replace(/\/chat\/completions$/, '')
  }
  if (!/\/v\d+$/.test(url) && !url.includes('/v1/')) {
    url += '/v1'
  }
  return url
}

function completionsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TranslateError('请求超时，请稍后重试')
    }
    throw new TranslateError('网络请求失败，请检查 Base URL 或网络')
  } finally {
    clearTimeout(timer)
  }
}

async function chatCompletions(
  settings: Settings,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<string> {
  if (!settings.apiKey.trim()) {
    throw new TranslateError('请先在设置中填写 API Key')
  }
  if (!settings.model.trim()) {
    throw new TranslateError('请先在设置中填写模型名称')
  }

  const url = completionsUrl(settings.baseUrl)
  const body = {
    model: settings.model.trim(),
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.apiKey.trim()}`,
          },
          body: JSON.stringify(body),
        },
        timeoutMs,
      )

      if (response.status === 401 || response.status === 403) {
        throw new TranslateError('鉴权失败，请检查 API Key 是否正确')
      }
      if (response.status === 429) {
        throw new TranslateError('请求过于频繁，请稍后再试')
      }
      if (!response.ok) {
        const detail = await safeReadError(response)
        throw new TranslateError(detail || `接口错误（${response.status}）`)
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) {
        throw new TranslateError('接口未返回译文')
      }
      return content
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const retryable =
        lastError.message.includes('超时') ||
        lastError.message.includes('网络') ||
        lastError.message.includes('频繁')
      if (!retryable || attempt === MAX_RETRIES) break
      await sleep(800 * (attempt + 1))
    }
  }

  throw lastError ?? new TranslateError('翻译失败')
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } }
    return data.error?.message || ''
  } catch {
    return ''
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveSystemPrompt(settings: Settings, fallback: string): string {
  return settings.systemPrompt.trim() || fallback
}

export async function translateText(settings: Settings, text: string): Promise<string> {
  const source = text.trim()
  if (!source) throw new TranslateError('没有可翻译的文本')
  const systemPrompt = resolveSystemPrompt(settings, DEFAULT_SYSTEM_PROMPT)
  return chatCompletions(
    settings,
    systemPrompt,
    buildSingleUserPrompt(source, settings.targetLang),
    DEFAULT_TIMEOUT,
  )
}

export async function translateBatch(
  settings: Settings,
  items: TranslateItem[],
): Promise<TranslateResultItem[]> {
  if (items.length === 0) return []
  const systemPrompt = resolveSystemPrompt(settings, BATCH_SYSTEM_PROMPT)
  const raw = await chatCompletions(
    settings,
    systemPrompt,
    buildBatchUserPrompt(
      items.map((item) => item.text),
      settings.targetLang,
    ),
    BATCH_TIMEOUT,
  )
  const parsed = parseNumberedTranslations(raw, items.length)
  return items.map((item, index) => ({
    id: item.id,
    text: parsed[index] || raw,
  }))
}

export async function testConnection(settings: Settings): Promise<string> {
  return translateText(settings, 'Hello')
}
