import type { FormInstance, FormRules } from 'element-plus'

export interface CreateFormData {
  name: string
  description: string
}

export interface CreateFormRules extends FormRules {
  name: Array<{
    required?: boolean
    message?: string
    trigger?: string
    min?: number
    max?: number
  }>
}

export interface TabMethods {
  saveBlueprint: () => void
  openBlueprint: () => void
  exportTypeScript: () => void
} 