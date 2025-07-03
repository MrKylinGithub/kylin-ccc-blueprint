import type { Component } from 'vue'

export interface ButtonProps {
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: Component | string
}

export interface ButtonEmits {
  click: [event: MouseEvent]
}

export type ButtonType = ButtonProps['type']
export type ButtonSize = ButtonProps['size'] 