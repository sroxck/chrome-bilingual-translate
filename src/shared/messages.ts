import type { Message, MessageResponse } from './types'

export function sendRuntimeMessage<T>(message: Message): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      if (!response?.ok) {
        reject(new Error(response?.error || '请求失败'))
        return
      }
      resolve(response.data)
    })
  })
}

export async function sendTabMessage<T>(tabId: number, message: Message): Promise<T> {
  const response = (await chrome.tabs.sendMessage(tabId, message)) as MessageResponse<T>
  if (!response?.ok) {
    throw new Error(response?.error || '页面脚本未响应，请刷新页面后重试')
  }
  return response.data
}

export function ok<T>(data: T): MessageResponse<T> {
  return { ok: true, data }
}

export function fail(error: string): MessageResponse<never> {
  return { ok: false, error }
}
