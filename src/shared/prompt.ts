export const DEFAULT_SYSTEM_PROMPT = `你是专业翻译。把用户提供的文本翻译成目标语言。
规则：
- 只输出译文，不要解释、不要复述原文、不要添加引号或前后缀
- 保留专有名词、代码、文件名、URL、变量名
- 保持原文语气与段落结构
- 不要翻译不应翻译的内容（如纯代码块）`

export const BATCH_SYSTEM_PROMPT = `你是专业翻译。用户会提供若干编号文本，请逐条翻译成目标语言。
规则：
- 严格按编号输出，每条一行，格式必须是「1. 译文」
- 编号必须与输入一一对应，不要合并、不要拆分、不要跳号
- 只输出编号译文，不要解释、不要输出原文
- 保留专有名词、代码、文件名、URL、变量名`

export function buildSingleUserPrompt(text: string, targetLang: string): string {
  return `请翻译为${targetLang}：\n\n${text}`
}

export function buildBatchUserPrompt(items: string[], targetLang: string): string {
  const body = items.map((text, i) => `${i + 1}. ${text}`).join('\n\n')
  return `请将以下编号文本翻译为${targetLang}。严格按「n. 译文」格式输出：\n\n${body}`
}

const NUMBERED_RE =
  /(?:^|\n)\s*(\d+)\s*[.、.)]\s*([\s\S]*?)(?=(?:\n\s*\d+\s*[.、.)]\s*)|$)/g

export function parseNumberedTranslations(raw: string, count: number): string[] {
  const results = Array.from({ length: count }, () => '')
  const text = raw.replace(/\r/g, '').trim()
  if (!text) return results

  let matched = false
  for (const match of text.matchAll(NUMBERED_RE)) {
    matched = true
    const index = Number(match[1]) - 1
    if (index >= 0 && index < count) {
      results[index] = match[2].trim()
    }
  }

  if (matched && results.every(Boolean)) return results

  if (!matched) {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === count) return lines
    if (count === 1) return [text]
  }

  for (let i = 0; i < count; i++) {
    if (!results[i]) results[i] = count === 1 ? text : ''
  }
  return results
}
