import { createApp, watch } from 'vue'
import { sendRuntimeMessage } from '../shared/messages'
import { isEditableTarget } from './dom'
import SelectionPopup from './SelectionPopup.vue'
import popupCss from './selection.css?inline'
import { createSelectionState } from './selectionState'

const HOST_ID = 'xt-selection-host'

let enabled = true
let host: HTMLElement | null = null
let state = createSelectionState()

export function setSelectionEnabled(value: boolean) {
  enabled = value
  if (!value) hide()
}

export function initSelection() {
  ensureHost()
  document.addEventListener('mouseup', onMouseUp, true)
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('mousedown', onMouseDown, true)
  window.addEventListener('scroll', () => hide(), true)
}

export function translateCurrentSelection() {
  const text = window.getSelection()?.toString().trim() || state.text
  if (!text) return
  const rect = getSelectionRect() || { left: 24, bottom: 24, right: 24, top: 24, width: 0, height: 0 }
  showAt(text, rect, true)
}

function ensureHost() {
  if (host?.isConnected) return
  host = document.getElementById(HOST_ID) as HTMLElement | null
  if (!host) {
    host = document.createElement('div')
    host.id = HOST_ID
    host.style.all = 'initial'
    host.style.position = 'fixed'
    host.style.zIndex = '2147483646'
    host.style.top = '0'
    host.style.left = '0'
    document.documentElement.appendChild(host)
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  shadow.innerHTML = ''
  const style = document.createElement('style')
  style.textContent = popupCss
  const mount = document.createElement('div')
  mount.style.position = 'fixed'
  mount.style.top = '0'
  mount.style.left = '0'
  shadow.append(style, mount)

  state = createSelectionState()
  createApp(SelectionPopup, {
    state,
    handleTranslate: () => void runTranslate(),
    handleCopy: () => void copyResult(),
    handleClose: hide,
  }).mount(mount)

  const apply = () => {
    mount.style.display = state.visible ? 'block' : 'none'
    mount.style.transform = `translate(${state.x}px, ${state.y}px)`
  }
  apply()
  watch(() => [state.x, state.y, state.visible], apply)
}

function onMouseUp(event: MouseEvent) {
  if (!enabled || isInHost(event) || isEditableTarget(event.target)) return
  window.setTimeout(() => {
    const text = window.getSelection()?.toString().trim() || ''
    if (!text) return
    const rect = getSelectionRect()
    if (!rect) return
    showAt(text, rect, true)
  }, 10)
}

function onMouseDown(event: MouseEvent) {
  if (!state.visible || isInHost(event)) return
  hide()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') hide()
}

function showAt(
  text: string,
  rect: { left: number; bottom: number; right: number; top: number },
  autoTranslate: boolean,
) {
  ensureHost()
  const reused = state.text === text && (state.loading || Boolean(state.result)) && !state.error
  if (!reused) {
    state.text = text
    state.result = ''
    state.error = ''
    state.loading = false
  }
  state.visible = true
  place(rect)
  if (autoTranslate && !reused) void runTranslate()
}

function place(rect: { left: number; bottom: number; right: number; top: number }) {
  const width = 360
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12)
  const below = rect.bottom + 10
  const y = below + 180 > window.innerHeight ? Math.max(12, rect.top - 190) : below
  state.x = left
  state.y = y
}

function hide() {
  state.visible = false
  state.loading = false
}

async function runTranslate() {
  if (!state.text || state.loading) return
  state.loading = true
  state.error = ''
  try {
    state.result = await sendRuntimeMessage<string>({
      type: 'TRANSLATE_TEXT',
      text: state.text,
    })
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error)
  } finally {
    state.loading = false
  }
}

async function copyResult() {
  if (!state.result) return
  try {
    await navigator.clipboard.writeText(state.result)
  } catch {
    state.error = '复制失败'
  }
}

function getSelectionRect() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (!rect.width && !rect.height) return null
  return rect
}

function isInHost(event: Event): boolean {
  if (!host) return false
  return event.composedPath().includes(host)
}
