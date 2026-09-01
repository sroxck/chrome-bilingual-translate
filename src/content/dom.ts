const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IFRAME',
])

const SKIP_CLOSEST = 'script, style, noscript, textarea, input, select, code, pre, kbd, samp, svg, canvas, video, audio, iframe, [contenteditable="true"]'

export const BLOCK_SELECTOR = [
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'td',
  'th',
  'figcaption',
  'dd',
  'dt',
  'summary',
  'article > div',
  'section > div',
].join(',')

export const TRANSLATION_CLASS = 'xt-translation'
export const TRANSLATED_ATTR = 'data-xt-translated'
export const TRANSLATE_ID_ATTR = 'data-xt-id'
export const HOST_ID = 'xt-translate-root'

const SHORT_NAV_MAX = 24

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

export function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

function isMostlyNonLanguage(text: string): boolean {
  const compact = text.replace(/\s+/g, '')
  if (!compact) return true
  const letters = compact.replace(/[\d\p{P}\p{S}]+/gu, '')
  return letters.length < 2
}

function isLikelyNav(el: HTMLElement, text: string): boolean {
  if (text.length > SHORT_NAV_MAX) return false
  return Boolean(el.closest('nav, header, footer, button, [role="button"], [role="navigation"]'))
}

export function getDirectText(el: HTMLElement): string {
  const parts: string[] = []
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || '')
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim()
}

export function getBlockText(el: HTMLElement): string {
  return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
}

export function hasTranslatableChild(el: HTMLElement): boolean {
  return Boolean(el.querySelector(BLOCK_SELECTOR))
}

export function isTranslatableBlock(el: HTMLElement): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.classList.contains(TRANSLATION_CLASS)) return false
  if (el.hasAttribute(TRANSLATED_ATTR)) return false
  if (SKIP_TAGS.has(el.tagName)) return false
  if (el.closest(SKIP_CLOSEST)) return false
  if (el.closest(`.${TRANSLATION_CLASS}`)) return false
  if (!isVisible(el)) return false
  if (hasTranslatableChild(el)) return false

  const text = getBlockText(el)
  if (text.length < 2) return false
  if (isMostlyNonLanguage(text)) return false
  if (isLikelyNav(el, text)) return false
  return true
}

export function collectBlocks(root: ParentNode = document): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
  return nodes.filter(isTranslatableBlock)
}

export function applyTranslationStyle(
  el: HTMLElement,
  fontSize: number,
  color: string,
): void {
  el.style.fontSize = `${fontSize}px`
  el.style.color = color
  el.style.lineHeight = '1.65'
  el.style.fontWeight = '400'
  el.style.display = 'block'
  el.style.marginTop = '0.2em'
  el.style.marginBottom = '0.55em'
}

export function insertTranslation(
  source: HTMLElement,
  translated: string,
  id: string,
  fontSize: number,
  color: string,
): HTMLElement {
  source.setAttribute(TRANSLATED_ATTR, '1')
  source.setAttribute(TRANSLATE_ID_ATTR, id)

  const isCell = source.tagName === 'TD' || source.tagName === 'TH'
  const existing = isCell
    ? source.querySelector<HTMLElement>(`:scope > .${TRANSLATION_CLASS}`)
    : source.nextElementSibling instanceof HTMLElement &&
        source.nextElementSibling.classList.contains(TRANSLATION_CLASS)
      ? source.nextElementSibling
      : null

  if (existing) {
    existing.textContent = translated
    applyTranslationStyle(existing, fontSize, color)
    return existing
  }

  const node = document.createElement(isCell ? 'DIV' : source.tagName)
  node.className = TRANSLATION_CLASS
  node.lang = 'zh-CN'
  node.textContent = translated
  applyTranslationStyle(node, fontSize, color)
  if (isCell) {
    source.appendChild(node)
  } else {
    source.insertAdjacentElement('afterend', node)
  }
  return node
}

export function removeAllTranslations(): void {
  document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((node) => node.remove())
  document.querySelectorAll(`[${TRANSLATED_ATTR}]`).forEach((node) => {
    node.removeAttribute(TRANSLATED_ATTR)
    node.removeAttribute(TRANSLATE_ID_ATTR)
  })
}

export function countTranslated(): number {
  return document.querySelectorAll(`[${TRANSLATED_ATTR}]`).length
}
