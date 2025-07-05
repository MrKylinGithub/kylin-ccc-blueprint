// 蓝图类型
export enum BlueprintType {
  FUNCTION = 'function',
  COMPONENT = 'component'
}

// 节点参数类型
export interface NodeParam {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'exec' | 'select'; // exec 表示执行流，select 表示下拉选择
  defaultValue?: any;
  description?: string;
  options?: string[]; // 下拉选择的选项，当type为select时使用
  noPort?: boolean; // 是否不显示连接槽
}

// 自定义节点定义
export interface NodeDefinition {
  id: string;
  name: string;
  category: string;
  description?: string;
  inputs: NodeParam[];
  outputs: NodeParam[];
  color?: string;
}

// 蓝图中的节点实例
export interface NodeInstance {
  id: string;
  definitionId: string;
  name: string;
  position: { x: number; y: number };
  inputs: { [paramId: string]: any };
  outputs: { [paramId: string]: any };
}

// 节点连接
export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromParamId: string;
  toNodeId: string;
  toParamId: string;
}

// 蓝图数据
export interface Blueprint {
  id: string;
  name: string;
  type: BlueprintType;
  nodes: NodeInstance[];
  connections: NodeConnection[];
  variables: { [name: string]: any };
  description?: string;
}

// 蓝图标签页
export interface BlueprintTab {
  id: string;
  name: string;
  blueprint: Blueprint;
  isDirty: boolean;
} 