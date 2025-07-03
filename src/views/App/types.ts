import type { Ref } from 'vue'
import type { Position } from '../../common/types'

export interface AppState {
  showNodeManager: boolean
  nodeManagerWidth: number
  containerWidth: number
}

export interface AppRefs {
  containerRef: Ref<HTMLElement | undefined>
  blueprintTabsRef: Ref<any>
}

export interface ResizeState {
  isResizing: boolean
  startX: number
  startWidth: number
}

export interface ToolbarAction {
  id: string
  label: string
  icon: any
  action: () => void
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  disabled?: boolean
}

export interface AppConfig {
  minNodeManagerWidth: number
  maxNodeManagerWidth: number
  minContainerWidth: number
  resizeHandleWidth: number
  toolbarHeight: number
} 