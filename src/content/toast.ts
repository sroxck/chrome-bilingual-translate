const TOAST_ID = 'xt-progress-host'

let host: HTMLElement | null = null
let labelEl: HTMLElement | null = null

export function showProgress(text: string) {
  ensure()
  if (host) host.style.display = 'block'
  if (labelEl) labelEl.textContent = text
}

export function hideProgress() {
  if (host) host.style.display = 'none'
}

function ensure() {
  if (host?.isConnected) return
  host = document.createElement('div')
  host.id = TOAST_ID
  host.style.all = 'initial'
  host.style.position = 'fixed'
  host.style.zIndex = '2147483647'
  host.style.left = '50%'
  host.style.bottom = '24px'
  host.style.transform = 'translateX(-50%)'
  document.documentElement.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `
    .toast {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      background: #0f172a;
      color: #f8fafc;
      font: 600 13px/1.4 "PingFang SC", system-ui, sans-serif;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.28);
      white-space: nowrap;
    }
  `
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.setAttribute('role', 'status')
  labelEl = document.createElement('span')
  toast.append(labelEl)
  shadow.append(style, toast)
}
