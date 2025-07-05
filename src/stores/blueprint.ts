import { reactive } from 'vue';
import type { NodeDefinition, Blueprint, BlueprintTab, NodeInstance, NodeConnection } from '../common/types/blueprint';
import { BlueprintType } from '../common/types/blueprint';

// 蓝图状态管理
export const blueprintStore = reactive({
  // 自定义节点定义
  nodeDefinitions: [] as NodeDefinition[],
  
  // 蓝图标签页
  tabs: [] as BlueprintTab[],
  
  // 当前活跃的标签页
  activeTabId: '' as string,
  
  // 添加节点定义
  addNodeDefinition(definition: NodeDefinition) {
    this.nodeDefinitions.push(definition);
  },
  
  // 更新节点定义
  updateNodeDefinition(id: string, definition: Partial<NodeDefinition>) {
    const index = this.nodeDefinitions.findIndex(d => d.id === id);
    if (index !== -1) {
      Object.assign(this.nodeDefinitions[index], definition);
    }
  },
  
  // 删除节点定义
  removeNodeDefinition(id: string) {
    const index = this.nodeDefinitions.findIndex(d => d.id === id);
    if (index !== -1) {
      this.nodeDefinitions.splice(index, 1);
    }
  },
  
  // 创建新蓝图标签页
  createTab(name: string = '新蓝图', type: BlueprintType = 'component' as BlueprintType) {
    const id = 'tab_' + Date.now();
    const blueprint: Blueprint = {
      id: 'blueprint_' + Date.now(),
      name,
      type,
      nodes: [],
      connections: [],
      variables: {}
    };
    
    // 为组件蓝图添加生命周期节点
    if (type === 'component') {
      const lifecycleNodes = [
        { id: 'onLoad', position: { x: 100, y: 100 } },
        { id: 'start', position: { x: 100, y: 200 } },
        { id: 'update', position: { x: 100, y: 300 } },
        { id: 'lateUpdate', position: { x: 100, y: 400 } },
        { id: 'onEnable', position: { x: 400, y: 100 } },
        { id: 'onDisable', position: { x: 400, y: 200 } },
        { id: 'onDestroy', position: { x: 400, y: 300 } }
      ];
      
      lifecycleNodes.forEach(({ id: definitionId, position }) => {
        const node: NodeInstance = {
          id: 'node_' + Date.now() + '_' + definitionId,
          definitionId,
          name: this.nodeDefinitions.find(d => d.id === definitionId)?.name || definitionId,
          position,
          inputs: {},
          outputs: {}
        };
        blueprint.nodes.push(node);
      });
    } else if (type === 'function') {
      // 为函数蓝图添加开始节点
      const startNode: NodeInstance = {
        id: 'node_' + Date.now() + '_function_start',
        definitionId: 'function_start',
        name: '函数开始',
        position: { x: 100, y: 200 },
        inputs: {},
        outputs: {}
      };
      blueprint.nodes.push(startNode);
    }
    
    const tab: BlueprintTab = {
      id,
      name,
      blueprint,
      isDirty: false
    };
    
    this.tabs.push(tab);
    this.activeTabId = id;
    return tab;
  },
  
  // 关闭标签页
  closeTab(id: string) {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tabs.splice(index, 1);
      
      // 如果关闭的是当前活跃标签页，切换到其他标签页
      if (this.activeTabId === id) {
        if (this.tabs.length > 0) {
          this.activeTabId = this.tabs[Math.max(0, index - 1)].id;
        } else {
          this.activeTabId = '';
        }
      }
    }
  },
  
  // 获取当前活跃的蓝图
  get activeBlueprint(): Blueprint | null {
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);
    return activeTab ? activeTab.blueprint : null;
  },
  
  // 获取当前活跃的标签页
  get activeTab(): BlueprintTab | null {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  },
  
  // 添加节点到当前蓝图
  addNode(definitionId: string, position: { x: number; y: number }) {
    const blueprint = this.activeBlueprint;
    const definition = this.nodeDefinitions.find(d => d.id === definitionId);
    
    if (!blueprint || !definition) return null;
    
    const node: NodeInstance = {
      id: 'node_' + Date.now(),
      definitionId,
      name: definition.name,
      position,
      inputs: {},
      outputs: {}
    };
    
    // 为常量节点设置默认值
    if (definitionId === 'number_constant') {
      node.inputs.value = 0;
    } else if (definitionId === 'string_constant') {
      node.inputs.value = '';
    } else if (definitionId === 'boolean_constant') {
      node.inputs.value = false;
    }
    
    blueprint.nodes.push(node);
    this.markTabDirty(this.activeTabId);
    return node;
  },
  
  // 删除节点
  removeNode(nodeId: string) {
    const blueprint = this.activeBlueprint;
    if (!blueprint) return;
    
    // 删除节点
    const nodeIndex = blueprint.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      blueprint.nodes.splice(nodeIndex, 1);
    }
    
    // 删除相关连接
    blueprint.connections = blueprint.connections.filter(
      c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    );
    
    this.markTabDirty(this.activeTabId);
  },
  
  // 添加连接
  addConnection(connection: Omit<NodeConnection, 'id'>) {
    const blueprint = this.activeBlueprint;
    if (!blueprint) return;
    
    const newConnection: NodeConnection = {
      id: 'conn_' + Date.now(),
      ...connection
    };
    
    blueprint.connections.push(newConnection);
    this.markTabDirty(this.activeTabId);
    return newConnection;
  },
  
  // 删除连接
  removeConnection(connectionId: string) {
    const blueprint = this.activeBlueprint;
    if (!blueprint) return;
    
    const index = blueprint.connections.findIndex(c => c.id === connectionId);
    if (index !== -1) {
      blueprint.connections.splice(index, 1);
      this.markTabDirty(this.activeTabId);
    }
  },
  
  // 标记标签页为已修改
  markTabDirty(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isDirty = true;
    }
  },
  
  // 标记标签页为已保存
  markTabClean(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isDirty = false;
    }
  },
  
  // 导出蓝图为JSON
  exportBlueprint(tabId?: string): string {
    const tab = tabId ? this.tabs.find(t => t.id === tabId) : this.activeTab;
    if (!tab) return '';
    
    return JSON.stringify({
      blueprint: tab.blueprint,
      nodeDefinitions: this.nodeDefinitions
    }, null, 2);
  },
  
  // 从JSON导入蓝图
  importBlueprint(json: string): boolean {
    try {
      const data = JSON.parse(json);
      
      if (data.blueprint) {
        const tab: BlueprintTab = {
          id: 'tab_' + Date.now(),
          name: data.blueprint.name || '导入的蓝图',
          blueprint: data.blueprint,
          isDirty: false
        };
        
        this.tabs.push(tab);
        this.activeTabId = tab.id;
      }
      
      if (data.nodeDefinitions && Array.isArray(data.nodeDefinitions)) {
        // 合并节点定义，避免重复
        data.nodeDefinitions.forEach((def: NodeDefinition) => {
          if (!this.nodeDefinitions.find(d => d.id === def.id)) {
            this.nodeDefinitions.push(def);
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('导入蓝图失败:', error);
      return false;
    }
  }
});

// 初始化默认的节点定义
blueprintStore.nodeDefinitions.push(
  // === 函数参数节点 ===
  {
    id: 'function_parameter',
    name: '函数参数',
    category: '函数',
    description: '定义函数的输入参数',
    inputs: [
      { id: 'param_name', name: '参数名', type: 'string', defaultValue: 'param' },
      { id: 'param_type', name: '参数类型', type: 'string', defaultValue: 'any' },
      { id: 'default_value', name: '默认值', type: 'object', defaultValue: undefined }
    ],
    outputs: [
      { id: 'value', name: '参数值', type: 'object' }
    ],
    color: '#9C27B0'
  },
  {
    id: 'function_return',
    name: '函数返回',
    category: '函数',
    description: '定义函数的返回值',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'value', name: '返回值', type: 'object', defaultValue: undefined }
    ],
    outputs: [],
    color: '#E91E63'
  },
  
  // === 常量/立即数节点 ===
  {
    id: 'number_constant',
    name: '数字常量',
    category: '常量',
    description: '提供一个固定的数字值',
    inputs: [],
    outputs: [
      { id: 'value', name: '数值', type: 'number' }
    ],
    color: '#3F51B5'
  },
  {
    id: 'string_constant',
    name: '字符串常量',
    category: '常量',
    description: '提供一个固定的字符串值',
    inputs: [],
    outputs: [
      { id: 'value', name: '字符串', type: 'string' }
    ],
    color: '#3F51B5'
  },
  {
    id: 'boolean_constant',
    name: '布尔常量',
    category: '常量',
    description: '提供一个固定的布尔值（真/假）',
    inputs: [],
    outputs: [
      { id: 'value', name: '布尔值', type: 'boolean' }
    ],
    color: '#3F51B5'
  },
  {
    id: 'null_constant',
    name: '空值常量',
    category: '常量',
    description: '提供一个空值（null）',
    inputs: [],
    outputs: [
      { id: 'value', name: '空值', type: 'object' }
    ],
    color: '#3F51B5'
  },

  // === 事件节点 ===
  {
    id: 'function_start',
    name: '函数开始',
    category: '事件',
    description: '函数蓝图执行的起始点',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#4CAF50'
  },
  {
    id: 'print',
    name: '打印输出',
    category: '事件',
    description: '将值打印到控制台',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'value', name: '值', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'exec', name: '执行完成', type: 'exec' }
    ],
    color: '#4CAF50'
  },
  {
    id: 'end',
    name: '结束',
    category: '事件',
    description: '蓝图执行的结束点',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    outputs: [],
    color: '#F44336'
  },
  {
    id: 'delay',
    name: '延时',
    category: '事件',
    description: '延时执行',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'duration', name: '延时(秒)', type: 'number', defaultValue: 1 }
    ],
    outputs: [
      { id: 'exec', name: '执行完成', type: 'exec' }
    ],
    color: '#9C27B0'
  },

  // === 组件生命周期节点 ===
  {
    id: 'onLoad',
    name: 'onLoad',
    category: '生命周期',
    description: '组件加载时调用，早于 start',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  },
  {
    id: 'start',
    name: 'start',
    category: '生命周期',
    description: '组件第一次激活前调用，晚于 onLoad',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  },
  {
    id: 'update',
    name: 'update',
    category: '生命周期',
    description: '每帧更新时调用',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'deltaTime', name: '帧间隔时间', type: 'number' }
    ],
    color: '#FF9800'
  },
  {
    id: 'lateUpdate',
    name: 'lateUpdate',
    category: '生命周期',
    description: '在所有组件的 update 之后调用',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'deltaTime', name: '帧间隔时间', type: 'number' }
    ],
    color: '#FF9800'
  },
  {
    id: 'onEnable',
    name: 'onEnable',
    category: '生命周期',
    description: '组件启用时调用',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  },
  {
    id: 'onDisable',
    name: 'onDisable',
    category: '生命周期',
    description: '组件禁用时调用',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  },
  {
    id: 'onDestroy',
    name: 'onDestroy',
    category: '生命周期',
    description: '组件被销毁时调用',
    inputs: [],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  },

  // === 控制流节点 ===
  {
    id: 'sequence',
    name: '顺序执行',
    category: '控制流',
    description: '按顺序依次执行多个输出流',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    outputs: [
      { id: 'exec_1', name: '执行 1', type: 'exec' },
      { id: 'exec_2', name: '执行 2', type: 'exec' },
      { id: 'exec_3', name: '执行 3', type: 'exec' }
    ],
    color: '#FF5722'
  },
  {
    id: 'parallel',
    name: '并行执行',
    category: '控制流',
    description: '同时触发多个执行流',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    outputs: [
      { id: 'exec_1', name: '并行 1', type: 'exec' },
      { id: 'exec_2', name: '并行 2', type: 'exec' },
      { id: 'exec_3', name: '并行 3', type: 'exec' }
    ],
    color: '#FF5722'
  },
  {
    id: 'if_condition',
    name: '条件判断',
    category: '控制流',
    description: '根据条件选择执行路径',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'condition', name: '条件', type: 'boolean', defaultValue: true }
    ],
    outputs: [
      { id: 'true', name: '真', type: 'exec' },
      { id: 'false', name: '假', type: 'exec' }
    ],
    color: '#FF5722'
  },
  {
    id: 'for_loop',
    name: '循环',
    category: '控制流',
    description: '循环执行指定次数',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'count', name: '次数', type: 'number', defaultValue: 10 }
    ],
    outputs: [
      { id: 'loop_body', name: '循环体', type: 'exec' },
      { id: 'index', name: '索引', type: 'number' },
      { id: 'completed', name: '完成', type: 'exec' }
    ],
    color: '#795548'
  },
  {
    id: 'switch',
    name: '开关',
    category: '控制流',
    description: '根据值选择执行路径',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'value', name: '值', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'case_0', name: '情况0', type: 'exec' },
      { id: 'case_1', name: '情况1', type: 'exec' },
      { id: 'default', name: '默认', type: 'exec' }
    ],
    color: '#607D8B'
  },

  // === 数学运算节点 ===
  {
    id: 'add_numbers',
    name: '加法',
    category: '数学',
    description: '将两个数字相加',
    inputs: [
      { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' }
    ],
    color: '#2196F3'
  },
  {
    id: 'subtract_numbers',
    name: '减法',
    category: '数学',
    description: '两个数字相减',
    inputs: [
      { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' }
    ],
    color: '#2196F3'
  },
  {
    id: 'multiply_numbers',
    name: '乘法',
    category: '数学',
    description: '两个数字相乘',
    inputs: [
      { id: 'a', name: 'A', type: 'number', defaultValue: 1 },
      { id: 'b', name: 'B', type: 'number', defaultValue: 1 }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' }
    ],
    color: '#2196F3'
  },
  {
    id: 'divide_numbers',
    name: '除法',
    category: '数学',
    description: '两个数字相除',
    inputs: [
      { id: 'a', name: '被除数', type: 'number', defaultValue: 1 },
      { id: 'b', name: '除数', type: 'number', defaultValue: 1 }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' }
    ],
    color: '#2196F3'
  },
  {
    id: 'random_number',
    name: '随机数',
    category: '数学',
    description: '生成指定范围的随机数',
    inputs: [
      { id: 'min', name: '最小值', type: 'number', defaultValue: 0 },
      { id: 'max', name: '最大值', type: 'number', defaultValue: 100 }
    ],
    outputs: [
      { id: 'result', name: '随机数', type: 'number' }
    ],
    color: '#2196F3'
  },
  {
    id: 'math_abs',
    name: '绝对值',
    category: '数学',
    description: '获取数字的绝对值',
    inputs: [
      { id: 'value', name: '值', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'result', name: '绝对值', type: 'number' }
    ],
    color: '#2196F3'
  },

  // === 字符串操作节点 ===
  {
    id: 'string_concat',
    name: '字符串拼接',
    category: '字符串',
    description: '将多个字符串拼接在一起',
    inputs: [
      { id: 'a', name: '字符串A', type: 'string', defaultValue: '' },
      { id: 'b', name: '字符串B', type: 'string', defaultValue: '' }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'string' }
    ],
    color: '#8BC34A'
  },
  {
    id: 'string_length',
    name: '字符串长度',
    category: '字符串',
    description: '获取字符串的长度',
    inputs: [
      { id: 'text', name: '文本', type: 'string', defaultValue: '' }
    ],
    outputs: [
      { id: 'length', name: '长度', type: 'number' }
    ],
    color: '#8BC34A'
  },
  {
    id: 'string_contains',
    name: '包含检查',
    category: '字符串',
    description: '检查字符串是否包含指定文本',
    inputs: [
      { id: 'text', name: '文本', type: 'string', defaultValue: '' },
      { id: 'search', name: '搜索', type: 'string', defaultValue: '' }
    ],
    outputs: [
      { id: 'result', name: '包含', type: 'boolean' }
    ],
    color: '#8BC34A'
  },
  {
    id: 'string_replace',
    name: '字符串替换',
    category: '字符串',
    description: '替换字符串中的文本',
    inputs: [
      { id: 'text', name: '文本', type: 'string', defaultValue: '' },
      { id: 'search', name: '搜索', type: 'string', defaultValue: '' },
      { id: 'replace', name: '替换', type: 'string', defaultValue: '' }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'string' }
    ],
    color: '#8BC34A'
  },

  // === 逻辑运算节点 ===
  {
    id: 'logic_and',
    name: '逻辑与',
    category: '逻辑',
    description: '逻辑与运算',
    inputs: [
      { id: 'a', name: 'A', type: 'boolean', defaultValue: true },
      { id: 'b', name: 'B', type: 'boolean', defaultValue: true }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'boolean' }
    ],
    color: '#E91E63'
  },
  {
    id: 'logic_or',
    name: '逻辑或',
    category: '逻辑',
    description: '逻辑或运算',
    inputs: [
      { id: 'a', name: 'A', type: 'boolean', defaultValue: false },
      { id: 'b', name: 'B', type: 'boolean', defaultValue: false }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'boolean' }
    ],
    color: '#E91E63'
  },
  {
    id: 'logic_not',
    name: '逻辑非',
    category: '逻辑',
    description: '逻辑非运算',
    inputs: [
      { id: 'value', name: '值', type: 'boolean', defaultValue: true }
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'boolean' }
    ],
    color: '#E91E63'
  },

  // === 比较运算节点 ===
  {
    id: 'compare_equal',
    name: '等于',
    category: '比较',
    description: '比较两个值是否相等',
    inputs: [
      { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'result', name: '相等', type: 'boolean' }
    ],
    color: '#FF9800'
  },
  {
    id: 'compare_greater',
    name: '大于',
    category: '比较',
    description: '比较A是否大于B',
    inputs: [
      { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'result', name: '大于', type: 'boolean' }
    ],
    color: '#FF9800'
  },
  {
    id: 'compare_less',
    name: '小于',
    category: '比较',
    description: '比较A是否小于B',
    inputs: [
      { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
      { id: 'b', name: 'B', type: 'number', defaultValue: 0 }
    ],
    outputs: [
      { id: 'result', name: '小于', type: 'boolean' }
    ],
    color: '#FF9800'
  },

  // === 变量操作节点 ===
  {
    id: 'get_variable',
    name: '获取变量',
    category: '变量',
    description: '获取蓝图变量的值',
    inputs: [
      { id: 'name', name: '变量名', type: 'string', defaultValue: 'variable' }
    ],
    outputs: [
      { id: 'value', name: '值', type: 'object' }
    ],
    color: '#673AB7'
  },
  {
    id: 'set_variable',
    name: '设置变量',
    category: '变量',
    description: '设置蓝图变量的值',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'name', name: '变量名', type: 'string', defaultValue: 'variable' },
      { id: 'value', name: '值', type: 'object' }
    ],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#673AB7'
  },

  // === 类型转换节点 ===
  {
    id: 'to_string',
    name: '转字符串',
    category: '类型转换',
    description: '将值转换为字符串',
    inputs: [
      { id: 'value', name: '值', type: 'object' }
    ],
    outputs: [
      { id: 'result', name: '字符串', type: 'string' }
    ],
    color: '#00BCD4'
  },
  {
    id: 'to_number',
    name: '转数字',
    category: '类型转换',
    description: '将值转换为数字',
    inputs: [
      { id: 'value', name: '值', type: 'string', defaultValue: '0' }
    ],
    outputs: [
      { id: 'result', name: '数字', type: 'number' }
    ],
    color: '#00BCD4'
  },
  {
    id: 'to_boolean',
    name: '转布尔值',
    category: '类型转换',
    description: '将值转换为布尔值',
    inputs: [
      { id: 'value', name: '值', type: 'object' }
    ],
    outputs: [
      { id: 'result', name: '布尔值', type: 'boolean' }
    ],
    color: '#00BCD4'
  },

  // === 调试节点 ===
  {
    id: 'debug_log',
    name: '调试输出',
    category: '调试',
    description: '输出调试信息',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'message', name: '消息', type: 'string', defaultValue: 'Hello World' }
    ],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  },
  {
    id: 'debug_break',
    name: '断点',
    category: '调试',
    description: '设置断点，暂停执行',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#F44336'
  },
  {
    id: 'debug_watch',
    name: '监视',
    category: '调试',
    description: '监视变量值的变化',
    inputs: [
      { id: 'exec', name: '执行', type: 'exec' },
      { id: 'value', name: '值', type: 'object' },
      { id: 'label', name: '标签', type: 'string', defaultValue: 'Watch' }
    ],
    outputs: [
      { id: 'exec', name: '执行', type: 'exec' }
    ],
    color: '#FF9800'
  }
); 