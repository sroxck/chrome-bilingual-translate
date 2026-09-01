import { reactive } from 'vue'

export interface SelectionPopupState {
  visible: boolean
  x: number
  y: number
  text: string
  result: string
  loading: boolean
  error: string
}

export function createSelectionState(): SelectionPopupState {
  return reactive({
    visible: false,
    x: 24,
    y: 24,
    text: '',
    result: '',
    loading: false,
    error: '',
  })
}
