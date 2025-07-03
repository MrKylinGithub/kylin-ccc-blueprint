import type { NodeInstance, NodeConnection, Blueprint } from '../../common/types/blueprint'

export interface Props {
  blueprint: Blueprint
}

export interface ConnectionStart {
  nodeId: string
  paramId: string
  type: 'input' | 'output'
  position: { x: number; y: number }
}

export interface TempConnection {
  path: string
}

export interface NodeConnections {
  inputs: Set<string>
  outputs: Set<string>
}

export interface PortPosition {
  x: number
  y: number
}

export interface DropData {
  type: string
  nodeDefinitionId: string
} 