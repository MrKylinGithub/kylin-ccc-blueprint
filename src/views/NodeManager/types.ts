import type { NodeDefinition, NodeParam } from '../../types/blueprint'

export interface NodeFormData {
  name: string
  category: string
  description: string
  color: string
  inputs: NodeParam[]
  outputs: NodeParam[]
} 