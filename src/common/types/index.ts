// 类型定义入口文件
export * from './blueprint'

// 通用类型定义
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Position, Size {}

export interface MessageOptions {
  message: string
  type?: 'success' | 'warning' | 'error' | 'info'
  duration?: number
}

// 事件类型
export interface DragEvent {
  position: Position
  offset: Position
  target: EventTarget | null
}

// 颜色相关
export type NodeColor = string

// 可选的回调函数类型
export type VoidCallback = () => void
export type ValueCallback<T> = (value: T) => void

// 通用配置类型
export interface BaseConfig {
  enabled: boolean
  visible: boolean
}

// 编辑器状态
export interface EditorState {
  selectedNodeId: string
  selectedConnectionId: string
  isConnecting: boolean
  isDragging: boolean
} 