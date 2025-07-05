import type { Blueprint, NodeInstance, NodeConnection, NodeDefinition } from '../types/blueprint'

// 蓝图序列化数据格式
export interface SerializedBlueprint {
  version: string
  name: string
  blueprint: Blueprint
  nodeDefinitions: NodeDefinition[]
  metadata: {
    createdAt: string
    lastModified: string
    author?: string
    description?: string
  }
}

// 蓝图序列化工具
export class BlueprintSerializer {
  private static readonly VERSION = '1.0.0'

  /**
   * 序列化蓝图为JSON字符串
   */
  static serialize(
    blueprint: Blueprint, 
    nodeDefinitions: NodeDefinition[],
    metadata?: Partial<SerializedBlueprint['metadata']>
  ): string {
    const serialized: SerializedBlueprint = {
      version: this.VERSION,
      name: blueprint.name,
      blueprint,
      nodeDefinitions,
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        ...metadata
      }
    }

    return JSON.stringify(serialized, null, 2);
  }

  /**
   * 从JSON字符串反序列化蓝图
   */
  static deserialize(json: string): SerializedBlueprint | null {
    try {
      const data = JSON.parse(json) as SerializedBlueprint
      
      // 验证数据格式
      if (!this.validateFormat(data)) {
        throw new Error('Invalid blueprint format')
      }

      return data;
    } catch (error) {
      console.error('Failed to deserialize blueprint:', error);
      return null;
    }
  }

  /**
   * 验证蓝图数据格式
   */
  private static validateFormat(data: any): data is SerializedBlueprint {
    return (
      data &&
      typeof data.version === 'string' &&
      typeof data.name === 'string' &&
      data.blueprint &&
      Array.isArray(data.blueprint.nodes) &&
      Array.isArray(data.blueprint.connections) &&
      Array.isArray(data.nodeDefinitions) &&
      data.metadata &&
      typeof data.metadata.createdAt === 'string'
    )
  }

  /**
   * 下载蓝图为BP文件
   */
  static async downloadBlueprint(
    blueprint: Blueprint,
    nodeDefinitions: NodeDefinition[],
    filename?: string
  ): Promise<string> {
    const json = this.serialize(blueprint, nodeDefinitions)
    
    // 检查是否在 Electron 环境中（Cocos Creator 基于 Electron）
    const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron
    
    if (isElectron) {
      // 方式1: 尝试使用 Cocos Creator 的 Editor.Message API
      if (typeof (window as any).Editor !== 'undefined' && (window as any).Editor.Message) {
        console.log('尝试使用 Cocos Creator Editor.Message API 保存蓝图...')
        try {
          const Editor = (window as any).Editor
          const fileName = filename || `${blueprint.name || 'blueprint'}.bp`
          
          // 检查并获取 blueprints 目录路径
          const blueprintsPath = await Editor.Message.request('asset-db', 'query-path', 'db://assets/blueprints')
          console.log('blueprints 目录路径:', blueprintsPath)
          
          // 创建资源 URL，保存到 assets/blueprints 目录，使用 .bp 扩展名
          const assetUrl = `db://assets/blueprints/${fileName}`
          
          console.log('创建蓝图资源:', assetUrl)
          const result = await Editor.Message.request('asset-db', 'create-asset', assetUrl, json)
          console.log('Cocos Creator 蓝图资源创建结果:', result)
          
          if (result && result.uuid) {
            console.log('蓝图已保存到项目资源:', assetUrl)
            return assetUrl
          }
          
          console.log('蓝图资源创建失败，尝试更新现有资源...')
          
          // 如果创建失败，尝试保存到现有资源
          const saveResult = await Editor.Message.request('asset-db', 'save-asset', assetUrl, json)
          console.log('Cocos Creator 蓝图资源保存结果:', saveResult)
          
          if (saveResult) {
            console.log('蓝图已更新到项目资源:', assetUrl)
            return assetUrl
          }
          
        } catch (error) {
          console.warn('Cocos Creator Editor.Message API 调用失败:', error)
        }
      }
      
      try {
        console.log('尝试使用 Electron 文件对话框保存蓝图...')
        
        // 在渲染进程中，尝试使用 IPC 或预加载的 API
        let saveResult = null
        
        // 方式2: 检查是否有预加载的 electronAPI
        if (typeof (window as any).electronAPI !== 'undefined') {
          console.log('尝试使用 electronAPI')
          try {
            const electronAPI = (window as any).electronAPI
            if (electronAPI.saveFile) {
              const defaultFileName = filename || `${blueprint.name || 'blueprint'}.bp`
              saveResult = await electronAPI.saveFile({
                title: '保存蓝图文件',
                defaultPath: defaultFileName,
                filters: [
                  { name: '蓝图文件', extensions: ['bp'] },
                  { name: '所有文件', extensions: ['*'] }
                ],
                content: json
              })
            }
          } catch (e: any) {
            console.log('electronAPI 不可用:', e.message)
          }
        }
        
        // 方式3: 检查是否有 ipcRenderer
        if (!saveResult && typeof (window as any).electron !== 'undefined') {
          console.log('尝试使用 ipcRenderer')
          try {
            const { ipcRenderer } = (window as any).electron
            if (ipcRenderer) {
              const defaultFileName = filename || `${blueprint.name || 'blueprint'}.bp`
              saveResult = await ipcRenderer.invoke('save-file', {
                title: '保存蓝图文件',
                defaultPath: defaultFileName,
                filters: [
                  { name: '蓝图文件', extensions: ['bp'] },
                  { name: '所有文件', extensions: ['*'] }
                ],
                content: json
              })
            }
          } catch (e: any) {
            console.log('ipcRenderer 不可用:', e.message)
          }
        }
        
        if (saveResult && !saveResult.canceled) {
          return saveResult.filePath || saveResult
        }
        
        if (saveResult && saveResult.canceled) {
          return '' // 用户取消了保存
        }
        
        console.log('无法找到可用的 Electron 文件对话框 API')
      } catch (error) {
        console.warn('无法使用 Electron 文件对话框，回退到浏览器下载:', error)
        // 回退到浏览器下载
      }
    }
    
    // 回退到浏览器下载方式
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const fileName = filename || `${blueprint.name || 'blueprint'}.bp`
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    return fileName
  }

  /**
   * 获取项目中的蓝图文件列表
   */
  static async getBlueprintFileList(): Promise<Array<{ name: string; url: string; uuid: string }> | null> {
    // 检查是否在 Electron 环境中（Cocos Creator 基于 Electron）
    const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron
    
    if (isElectron) {
      // 尝试使用 Cocos Creator 的 Editor.Message API
      if (typeof (window as any).Editor !== 'undefined' && (window as any).Editor.Message) {
        console.log('查询项目中的蓝图文件...')
        try {
          const Editor = (window as any).Editor
          
          // 获取 blueprints 目录的绝对路径
          const blueprintsPath = await Editor.Message.request('asset-db', 'query-path', 'db://assets/blueprints')
          console.log('blueprints 目录路径:', blueprintsPath)
          
          if (blueprintsPath) {
            // 查询 assets/blueprints 目录下的 .bp 文件
            const blueprintAssetsResult = await Editor.Message.request('asset-db', 'query-assets', {
              pattern: 'db://assets/blueprints/**/*.bp'
            })
            
            console.log('查询到的蓝图资源:', blueprintAssetsResult)
            
            if (blueprintAssetsResult && blueprintAssetsResult.length > 0) {
              return blueprintAssetsResult.map((asset: any) => ({
                name: asset.name || asset.url.split('/').pop()?.replace('.bp', '') || 'Unknown',
                url: asset.url,
                uuid: asset.uuid,
                path: blueprintsPath // 添加绝对路径信息
              }))
            }
          } else {
            console.log('blueprints 目录不存在或无法访问')
          }
          
          console.log('项目中未找到蓝图文件')
          return []
          
        } catch (error) {
          console.warn('查询蓝图文件失败:', error)
        }
      }
    }
    
    return null
  }

  /**
   * 根据UUID加载指定的蓝图文件
   */
  static async loadBlueprintByUuid(uuid: string): Promise<SerializedBlueprint | null> {
    // 检查是否在 Electron 环境中（Cocos Creator 基于 Electron）
    const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron
    
    if (isElectron) {
      // 尝试使用 Cocos Creator 的 Editor.Message API
      if (typeof (window as any).Editor !== 'undefined' && (window as any).Editor.Message) {
        console.log('=== 开始加载蓝图文件 ===')
        console.log('UUID:', uuid)
        try {
          const Editor = (window as any).Editor
          
          // 根据UUID获取资源信息
          console.log('1. 查询资源信息...')
          const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', uuid)
          console.log('资源信息:', assetInfo)
          
          if (assetInfo && assetInfo.url) {
            // 使用资源URL读取文件内容
            console.log('2. 使用资源URL读取文件内容...')
            console.log('资源URL:', assetInfo.url)
            
            // 尝试使用文件系统API读取文件
            const fs = (window as any).require ? (window as any).require('fs') : null
            if (fs) {
              // 将 db:// URL 转换为实际文件路径
              const filePath = assetInfo.url.replace('db://assets/', Editor.Project.path + '/assets/')
              console.log('文件路径:', filePath)
              
              try {
                const content = fs.readFileSync(filePath, 'utf8')
                console.log('文件内容类型:', typeof content)
                console.log('文件内容长度:', content ? content.length : '无内容')
                console.log('文件内容预览:', content ? content.substring(0, 200) + '...' : '无内容')
                
                if (content) {
                  console.log('3. 反序列化蓝图数据...')
                  const blueprint = this.deserialize(content)
                  if (blueprint) {
                    console.log('✅ 成功加载蓝图:', blueprint.name)
                    console.log('蓝图信息:', {
                      name: blueprint.name,
                      version: blueprint.version,
                      nodeCount: blueprint.blueprint.nodes.length,
                      connectionCount: blueprint.blueprint.connections.length,
                      nodeDefinitionCount: blueprint.nodeDefinitions.length
                    })
                    return blueprint
                  } else {
                    console.error('❌ 蓝图反序列化失败')
                  }
                } else {
                  console.error('❌ 文件内容为空')
                }
              } catch (fsError) {
                console.error('❌ 文件系统读取失败:', fsError)
              }
            } else {
              console.error('❌ 无法访问文件系统API')
            }
          } else {
            console.error('❌ 无法获取资源信息或资源URL')
          }
          
        } catch (error) {
          console.error('❌ 加载蓝图文件时发生错误:', error)
          if (error instanceof Error) {
            console.error('错误详情:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            })
          }
        }
      } else {
        console.error('❌ Editor.Message API 不可用')
      }
    } else {
      console.error('❌ 不在 Electron 环境中')
    }
    
    console.log('=== 蓝图文件加载失败 ===')
    return null
  }

  /**
   * 从文件系统选择蓝图文件加载（在 Cocos Creator 环境中已废弃）
   */
  static async loadBlueprintFromFileSystem(): Promise<SerializedBlueprint | null> {
    console.warn('loadBlueprintFromFileSystem 已废弃，在 Cocos Creator 环境中应使用项目文件列表')
    
    // 检查是否在 Electron 环境中（Cocos Creator 基于 Electron）
    const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron
    
    if (isElectron) {
      try {
        console.log('尝试使用 Electron 文件对话框加载蓝图...')
        
        // 在渲染进程中，尝试使用 IPC 或预加载的 API
        let loadResult = null
        
        // 方式2: 检查是否有预加载的 electronAPI
        if (typeof (window as any).electronAPI !== 'undefined') {
          console.log('尝试使用 electronAPI')
          try {
            const electronAPI = (window as any).electronAPI
            if (electronAPI.loadFile) {
              loadResult = await electronAPI.loadFile({
                title: '选择蓝图文件',
                filters: [
                  { name: '蓝图文件', extensions: ['bp'] },
                  { name: '所有文件', extensions: ['*'] }
                ],
                properties: ['openFile']
              })
            }
          } catch (e: any) {
            console.log('electronAPI 不可用:', e.message)
          }
        }
        
        // 方式3: 检查是否有 ipcRenderer
        if (!loadResult && typeof (window as any).electron !== 'undefined') {
          console.log('尝试使用 ipcRenderer')
          try {
            const { ipcRenderer } = (window as any).electron
            if (ipcRenderer) {
              loadResult = await ipcRenderer.invoke('load-file', {
                title: '选择蓝图文件',
                filters: [
                  { name: '蓝图文件', extensions: ['bp'] },
                  { name: '所有文件', extensions: ['*'] }
                ],
                properties: ['openFile']
              })
            }
          } catch (e: any) {
            console.log('ipcRenderer 不可用:', e.message)
          }
        }
        
        if (loadResult && !loadResult.canceled && loadResult.content) {
          return this.deserialize(loadResult.content)
        }
        
        if (loadResult && loadResult.canceled) {
          return null // 用户取消了选择
        }
        
        console.log('无法找到可用的 Electron 文件对话框 API')
      } catch (error) {
        console.warn('无法使用 Electron 文件对话框，回退到浏览器文件选择:', error)
        // 回退到浏览器文件选择
      }
    }
    
    // 回退到浏览器文件选择方式
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.bp'
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const json = e.target?.result as string
          const blueprint = this.deserialize(json)
          resolve(blueprint)
        }
        reader.readAsText(file)
      }
      
      input.click()
    })
  }

  /**
   * 获取项目蓝图文件列表（在 Cocos Creator 环境中总是使用项目文件列表）
   */
  static async loadBlueprintFromProject(): Promise<Array<{ name: string; url: string; uuid: string }>> {
    // 获取项目中的蓝图文件列表
    const blueprintList = await this.getBlueprintFileList()
    
    // 在 Cocos Creator 环境中，总是返回项目文件列表
    return blueprintList || []
  }

  /**
   * 从文件上传加载蓝图（在 Cocos Creator 环境中已废弃，使用项目文件列表）
   */
  static async loadBlueprintFromFile(): Promise<SerializedBlueprint | null> {
    console.warn('loadBlueprintFromFile 已废弃，请使用 loadBlueprintFromProject')
    return null
  }
}

// TypeScript代码生成器 - 生成普通的蓝图函数
export class TypeScriptCodeGenerator {
  private blueprint: Blueprint
  private nodeDefinitions: NodeDefinition[]
  private nodeMap: Map<string, NodeInstance>
  private connectionMap: Map<string, NodeConnection[]>
  private inputParams: { name: string; type: string }[] = []
  private outputParams: { name: string; type: string }[] = []
  private usedHelpers: Set<string> = new Set()
  private hasAsyncNodes: boolean = false
  private nodeVariables: Map<string, string> = new Map()

  constructor(blueprint: Blueprint, nodeDefinitions: NodeDefinition[]) {
    this.blueprint = blueprint
    this.nodeDefinitions = nodeDefinitions
    this.nodeMap = new Map(blueprint.nodes.map(node => [node.id, node]))
    this.connectionMap = this.buildConnectionMap()
    this.analyzeBlueprint()
  }

  /**
   * 生成通用函数库 BP_Functions.ts
   */
  static generateBPFunctions(): string {
    return [
      '/**',
      ' * Blueprint Helper Functions',
      ' * Auto-generated - do not modify manually',
      ` * Generated at: ${new Date().toISOString()}`,
      ' */',
      '',
      '// Delay function for blueprint timing',
      'export function delay(ms: number): Promise<void> {',
      '  return new Promise(resolve => setTimeout(resolve, ms));',
      '}',
      '',
      '// Log function for blueprint debugging',
      'export function log(value: any): void {',
      '  console.log(value);',
      '}',
      '',
      '// Math functions',
      'export function add(a: number, b: number): number {',
      '  return a + b;',
      '}',
      '',
      'export function subtract(a: number, b: number): number {',
      '  return a - b;',
      '}',
      '',
      'export function multiply(a: number, b: number): number {',
      '  return a * b;',
      '}',
      '',
      'export function divide(a: number, b: number): number {',
      '  return a / b;',
      '}',
      '',
      '// Logic functions',
      'export function logicAnd(a: boolean, b: boolean): boolean {',
      '  return a && b;',
      '}',
      '',
      'export function logicOr(a: boolean, b: boolean): boolean {',
      '  return a || b;',
      '}',
      '',
      'export function logicNot(value: boolean): boolean {',
      '  return !value;',
      '}',
      '',
      '// Compare functions',
      'export function equal(a: any, b: any): boolean {',
      '  return a === b;',
      '}',
      '',
      'export function greater(a: number, b: number): boolean {',
      '  return a > b;',
      '}',
      '',
      'export function less(a: number, b: number): boolean {',
      '  return a < b;',
      '}',
      '',
      '// String functions',
      'export function concat(a: string, b: string): string {',
      '  return a + b;',
      '}',
      '',
      'export function stringLength(text: string): number {',
      '  return text.length;',
      '}',
      '',
      'export function contains(text: string, search: string): boolean {',
      '  return text.includes(search);',
      '}',
      '',
      '// Type conversion functions',
      'export function toString(value: any): string {',
      '  return String(value);',
      '}',
      '',
      'export function toNumber(value: string): number {',
      '  return Number(value);',
      '}',
      '',
      'export function toBoolean(value: any): boolean {',
      '  return Boolean(value);',
      '}'
    ].join('\n')
  }

  /**
   * 测试生成BP_Functions.ts（仅用于调试）
   */
  static testGenerateBPFunctions(): void {
    console.log('=== BP_Functions.ts 生成测试 ===')
    const bpFunctions = TypeScriptCodeGenerator.generateBPFunctions()
    console.log('生成的BP_Functions.ts内容:')
    console.log(bpFunctions)
    console.log('=== 测试完成 ===')
  }

  /**
   * 测试修复后的参数和返回值节点代码生成
   */
  static testFixedParameterNodes(): void {
    console.log('=== 修复后的参数和返回值节点测试 ===')
    
    // 创建一个更完整的测试蓝图，包含开始节点
    const testBlueprint: Blueprint = {
      id: 'test_blueprint_fixed',
      name: 'FixedTestFunction',
      type: 'function' as any,
      variables: {},
      nodes: [
        {
          id: 'start_node',
          definitionId: 'start',
          name: '开始',
          position: { x: 50, y: 100 },
          inputs: {},
          outputs: {}
        },
        {
          id: 'param_node',
          definitionId: 'function_parameter',
          name: '函数参数',
          position: { x: 100, y: 100 },
          inputs: {
            param_name: 'inputValue',
            param_type: 'number'
          },
          outputs: {}
        },
        {
          id: 'print_node',
          definitionId: 'print',
          name: '调试输出',
          position: { x: 300, y: 100 },
          inputs: {},
          outputs: {}
        },
        {
          id: 'return_node',
          definitionId: 'function_return',
          name: '函数返回',
          position: { x: 500, y: 100 },
          inputs: {},
          outputs: {}
        }
      ],
      connections: [
        {
          id: 'conn1',
          fromNodeId: 'start_node',
          fromParamId: 'exec',
          toNodeId: 'print_node',
          toParamId: 'exec'
        },
        {
          id: 'conn2',
          fromNodeId: 'param_node',
          fromParamId: 'value',
          toNodeId: 'print_node',
          toParamId: 'value'
        },
        {
          id: 'conn3',
          fromNodeId: 'print_node',
          fromParamId: 'exec',
          toNodeId: 'return_node',
          toParamId: 'exec'
        },
        {
          id: 'conn4',
          fromNodeId: 'param_node',
          fromParamId: 'value',
          toNodeId: 'return_node',
          toParamId: 'value'
        }
      ]
    }

    // 完整的节点定义
    const testNodeDefinitions: NodeDefinition[] = [
      {
        id: 'start',
        name: '开始',
        category: '事件',
        inputs: [],
        outputs: [
          { id: 'exec', name: '执行', type: 'exec' }
        ]
      },
      {
        id: 'function_parameter',
        name: '函数参数',
        category: '函数',
        inputs: [
          { id: 'param_name', name: '参数名', type: 'string' },
          { id: 'param_type', name: '参数类型', type: 'string' }
        ],
        outputs: [
          { id: 'value', name: '参数值', type: 'object' }
        ]
      },
      {
        id: 'print',
        name: '调试输出',
        category: '事件',
        inputs: [
          { id: 'exec', name: '执行', type: 'exec' },
          { id: 'value', name: '值', type: 'object' }
        ],
        outputs: [
          { id: 'exec', name: '执行完成', type: 'exec' }
        ]
      },
      {
        id: 'function_return',
        name: '函数返回',
        category: '函数',
        inputs: [
          { id: 'exec', name: '执行', type: 'exec' },
          { id: 'value', name: '返回值', type: 'object' }
        ],
        outputs: []
      }
    ]

    try {
      const generator = new TypeScriptCodeGenerator(testBlueprint, testNodeDefinitions)
      const generatedCode = generator.generateCode()
      
      console.log('修复后生成的函数代码:')
      console.log(generatedCode)
      
      console.log('\n期望的输出应该是:')
      console.log('```typescript')
      console.log('import { log } from \'./BP_Functions\'')
      console.log('')
      console.log('export function BP_FixedTestFunction(inputValue: number): number {')
      console.log('  // Variables for node outputs')
      console.log('  let 调试输出_print_node_exec: any')
      console.log('')
      console.log('  // Execute blueprint logic')
      console.log('  // Execute node: 开始 (start_node)')
      console.log('  // Execute node: 调试输出 (print_node)')
      console.log('  log(inputValue)  // 直接使用函数参数名，无额外变量')
      console.log('')
      console.log('  // Process return values')
      console.log('  return inputValue  // 直接返回函数参数，无额外变量')
      console.log('}')
      console.log('```')
    } catch (error) {
      console.error('测试失败:', error)
    }
    
    console.log('=== 测试完成 ===')
  }

  /**
   * 生成TypeScript函数代码
   */
  generateCode(): string {
    const code: string[] = []
    
    // 生成文件头
    code.push(this.generateHeader())
    code.push('')
    
    // 根据蓝图类型生成不同的代码
    if (this.blueprint.type === 'component') {
      code.push(this.generateComponentClass())
    } else {
      code.push(this.generateMainFunction())
    }
    
    return code.join('\n')
  }

  /**
   * 生成文件头部
   */
  private generateHeader(): string {
    const lines = []

    // 如果是组件蓝图，不需要导入BP_Functions，因为组件方法会直接包含在类中
    if (this.blueprint.type === 'component') {
      // 组件蓝图的导入语句会在generateComponentClass中处理
      return ''
    }

    // 生成import语句，只导入实际使用的函数（仅适用于普通蓝图）
    if (this.usedHelpers.size > 0) {
      const imports: string[] = []
      
      if (this.usedHelpers.has('log')) {
        imports.push('log')
      }
      if (this.usedHelpers.has('delay')) {
        imports.push('delay')
      }
      if (this.usedHelpers.has('add')) {
        imports.push('add')
      }
      if (this.usedHelpers.has('subtract')) {
        imports.push('subtract')
      }
      if (this.usedHelpers.has('multiply')) {
        imports.push('multiply')
      }
      if (this.usedHelpers.has('divide')) {
        imports.push('divide')
      }
      if (this.usedHelpers.has('logicAnd')) {
        imports.push('logicAnd')
      }
      if (this.usedHelpers.has('logicOr')) {
        imports.push('logicOr')
      }
      if (this.usedHelpers.has('logicNot')) {
        imports.push('logicNot')
      }
      if (this.usedHelpers.has('equal')) {
        imports.push('equal')
      }
      if (this.usedHelpers.has('greater')) {
        imports.push('greater')
      }
      if (this.usedHelpers.has('less')) {
        imports.push('less')
      }
      
      if (imports.length > 0) {
        lines.push(`import { ${imports.join(', ')} } from './BP_Functions'`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 分析蓝图特性
   */
  private analyzeBlueprint(): void {
    // 分析输入输出参数
    for (const node of this.blueprint.nodes) {
      const definition = this.getNodeDefinition(node.definitionId)
      if (!definition) continue

      // 分析函数参数节点
      if (definition.id === 'function_parameter') {
        const paramName = node.inputs?.param_name || 'param'
        const paramType = node.inputs?.param_type || 'any'
        this.inputParams.push({ name: paramName, type: paramType })
        // 函数参数节点不需要生成变量，直接使用参数名
        continue
      }

      // 分析函数返回值节点
      if (definition.id === 'function_return') {
        const returnType = this.getConnectionType(node.id, 'value') || 'any'
        this.outputParams.push({ name: 'return', type: returnType })
        // 函数返回值节点不需要生成变量
        continue
      }

      // 分析输入节点（保持向后兼容）
      if (definition.id === 'input') {
        const paramName = node.inputs?.name || 'input'
        const paramType = node.inputs?.type || 'any'
        this.inputParams.push({ name: paramName, type: paramType })
      }

      // 分析输出节点（保持向后兼容）
      if (definition.id === 'output') {
        const paramName = node.inputs?.name || 'output'
        const paramType = node.inputs?.type || 'any'
        this.outputParams.push({ name: paramName, type: paramType })
      }

      // 分析使用的helper函数
      if (definition.id === 'print' || definition.id === 'debug_log') {
        this.usedHelpers.add('log')
      }
      if (definition.id === 'delay') {
        this.usedHelpers.add('delay')
        this.hasAsyncNodes = true
      }
      
      // 数学运算函数
      if (definition.id === 'add_numbers') {
        this.usedHelpers.add('add')
      }
      if (definition.id === 'subtract_numbers') {
        this.usedHelpers.add('subtract')
      }
      if (definition.id === 'multiply_numbers') {
        this.usedHelpers.add('multiply')
      }
      if (definition.id === 'divide_numbers') {
        this.usedHelpers.add('divide')
      }
      
      // 逻辑运算函数
      if (definition.id === 'logic_and') {
        this.usedHelpers.add('logicAnd')
      }
      if (definition.id === 'logic_or') {
        this.usedHelpers.add('logicOr')
      }
      if (definition.id === 'logic_not') {
        this.usedHelpers.add('logicNot')
      }
      
      // 比较函数
      if (definition.id === 'compare_equal') {
        this.usedHelpers.add('equal')
      }
      if (definition.id === 'compare_greater') {
        this.usedHelpers.add('greater')
      }
      if (definition.id === 'compare_less') {
        this.usedHelpers.add('less')
      }

      // 为节点输出生成变量名（跳过函数参数和返回值节点）
      if (definition.id !== 'function_parameter' && definition.id !== 'function_return') {
        for (const output of definition.outputs) {
          if (output.type !== 'exec') {
            // 简化变量名生成
            const baseName = definition.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            const nodeIndex = node.id.replace(/[^0-9]/g, '')
            const varName = `${baseName}_${nodeIndex}_${output.id}`
            this.nodeVariables.set(`${node.id}_${output.id}`, varName)
          }
        }
      }
    }
  }

  /**
   * 生成组件类代码
   */
  private generateComponentClass(): string {
    const code: string[] = []
    
    // 生成导入语句
    code.push(`import { _decorator, Component, Node } from 'cc';`)
    code.push(`const { ccclass, property } = _decorator;`)
    
    // 如果使用了helper函数，也导入BP_Functions
    if (this.usedHelpers.size > 0) {
      const imports: string[] = []
      
      if (this.usedHelpers.has('log')) imports.push('log')
      if (this.usedHelpers.has('delay')) imports.push('delay')
      if (this.usedHelpers.has('add')) imports.push('add')
      if (this.usedHelpers.has('subtract')) imports.push('subtract')
      if (this.usedHelpers.has('multiply')) imports.push('multiply')
      if (this.usedHelpers.has('divide')) imports.push('divide')
      if (this.usedHelpers.has('logicAnd')) imports.push('logicAnd')
      if (this.usedHelpers.has('logicOr')) imports.push('logicOr')
      if (this.usedHelpers.has('logicNot')) imports.push('logicNot')
      if (this.usedHelpers.has('equal')) imports.push('equal')
      if (this.usedHelpers.has('greater')) imports.push('greater')
      if (this.usedHelpers.has('less')) imports.push('less')
      
      if (imports.length > 0) {
        code.push(`import { ${imports.join(', ')} } from './BP_Functions';`)
      }
    }
    
    code.push('')
    
    // 生成类定义
    const className = `${this.blueprint.name || 'Component'}Component`
    code.push(`@ccclass('${className}')`)
    code.push(`export class ${className} extends Component {`)
    
    // 生成变量声明（如果有的话）
    if (this.nodeVariables.size > 0) {
      const variables = Array.from(this.nodeVariables.values())
      variables.forEach(varName => {
        code.push(`  private ${varName}: any;`)
      })
      code.push('')
    }
    
    // 生成生命周期方法
    const lifecycleMethods = ['onLoad', 'start', 'update', 'lateUpdate', 'onEnable', 'onDisable', 'onDestroy']
    
    for (const methodName of lifecycleMethods) {
      const methodNodes = this.blueprint.nodes.filter(node => 
        this.getNodeDefinition(node.definitionId)?.id === methodName
      )
      
      if (methodNodes.length > 0) {
        code.push('')
        
        // 生成方法签名
        if (methodName === 'update' || methodName === 'lateUpdate') {
          const asyncKeyword = this.hasAsyncNodes ? 'async ' : ''
          code.push(`  ${asyncKeyword}${methodName}(deltaTime: number): ${this.hasAsyncNodes ? 'Promise<void>' : 'void'} {`)
        } else {
          const asyncKeyword = this.hasAsyncNodes ? 'async ' : ''
          code.push(`  ${asyncKeyword}${methodName}(): ${this.hasAsyncNodes ? 'Promise<void>' : 'void'} {`)
        }
        
        // 生成方法体
        for (const node of methodNodes) {
          const nextConnections = this.getExecutionConnections(node.id)
          for (const connection of nextConnections) {
            const nextNode = this.nodeMap.get(connection.toNodeId)
            if (nextNode) {
              const nodeCode = this.generateNodeExecution(nextNode, new Set())
              nodeCode.forEach(line => code.push(line))
            }
          }
        }
        
        code.push('  }')
      }
    }
    
    code.push('}')
    
    return code.join('\n')
  }

  /**
   * 生成主函数
   */
  private generateMainFunction(): string {
    const code: string[] = []
    
    // 生成函数签名
    const functionName = `BP_${this.blueprint.name || 'Blueprint'}`
    const params = this.inputParams.map(p => `${p.name}: ${p.type}`).join(', ')
    
    // 根据是否有异步节点确定返回类型
    let returnType = 'void'
    let isAsync = this.hasAsyncNodes
    
    if (this.outputParams.length === 1) {
      returnType = this.outputParams[0].type
      if (isAsync) returnType = `Promise<${returnType}>`
    } else if (this.outputParams.length > 1) {
      const returnObj = this.outputParams.map(p => `${p.name}: ${p.type}`).join(', ')
      returnType = `{ ${returnObj} }`
      if (isAsync) returnType = `Promise<${returnType}>`
    } else if (isAsync) {
      returnType = 'Promise<void>'
    }
    
    const asyncKeyword = isAsync ? 'async ' : ''
    code.push(`export ${asyncKeyword}function ${functionName}(${params}): ${returnType} {`)
    
    // 生成变量声明（只为非函数参数和非返回值节点生成变量）
    if (this.nodeVariables.size > 0) {
      for (const [nodeOutput, varName] of this.nodeVariables) {
        code.push(`  let ${varName}: any`)
      }
    }
    
    // 查找开始节点
    const startNodes = this.blueprint.nodes.filter(node => {
      const definition = this.getNodeDefinition(node.definitionId)
      return definition?.id === 'start'
    })

    if (startNodes.length === 0) {
      // 如果没有开始节点，执行所有非参数非返回值节点
      const executableNodes = this.blueprint.nodes.filter(node => {
        const definition = this.getNodeDefinition(node.definitionId)
        return definition && definition.id !== 'function_parameter' && definition.id !== 'function_return'
      })
      
      for (const node of executableNodes) {
        code.push(...this.generateNodeExecution(node))
      }
    } else {
      // 从开始节点开始执行
      for (const startNode of startNodes) {
        code.push(...this.generateNodeExecution(startNode))
      }
    }
    
    // 处理返回值节点
    const returnNodes = this.blueprint.nodes.filter(node => {
      const definition = this.getNodeDefinition(node.definitionId)
      return definition?.id === 'function_return'
    })
    
    if (returnNodes.length > 0) {
      for (const returnNode of returnNodes) {
        const valueConnection = this.getInputConnections(returnNode.id, 'value')[0]
        if (valueConnection) {
          const returnValue = this.getConnectionValue(valueConnection.fromNodeId, valueConnection.fromParamId)
          code.push(`  return ${returnValue};`)
          break // 只处理第一个返回节点
        }
      }
    } else {
      // 生成默认返回语句
      if (this.outputParams.length === 0) {
        code.push('  return;')
      } else if (this.outputParams.length === 1) {
        code.push(`  return ${this.outputParams[0].name};`)
      } else {
        const returnObj = this.outputParams.map(p => `${p.name}`).join(', ')
        code.push(`  return { ${returnObj} };`)
      }
    }
    
    code.push('}')
    
    return code.join('\n')
  }

  /**
   * 生成节点执行代码
   */
  private generateNodeExecution(node: NodeInstance, visitedNodes = new Set<string>()): string[] {
    const code: string[] = []
    
    if (visitedNodes.has(node.id)) {
      return code
    }
    
    visitedNodes.add(node.id)
    const definition = this.getNodeDefinition(node.definitionId)
    
    if (!definition) {
      return code
    }
    
    switch (definition.id) {
      case 'start':
        // 开始节点不需要特殊处理，直接执行后续节点
        break
      case 'constant':
      case 'number_constant':
      case 'string_constant':
      case 'boolean_constant':
        code.push(...this.generateConstantNode(node, definition))
        break
      case 'print':
      case 'debug_log':
        code.push(...this.generatePrintNode(node, definition))
        break
      case 'delay':
        code.push(...this.generateDelayNode(node, definition))
        break
      case 'sequence':
        code.push(...this.generateSequenceNode(node, definition, visitedNodes))
        break
      case 'parallel':
        code.push(...this.generateParallelNode(node, definition, visitedNodes))
        break
      case 'input':
        code.push(...this.generateInputNode(node, definition))
        break
      case 'output':
        code.push(...this.generateOutputNode(node, definition))
        break
      case 'function_parameter':
        // 函数参数节点已经在函数开始时初始化，这里跳过
        break
      case 'function_return':
        // 函数返回节点在函数末尾统一处理，这里跳过
        break
      case 'add_numbers':
      case 'subtract_numbers':
      case 'multiply_numbers':
      case 'divide_numbers':
        code.push(...this.generateMathNode(node, definition))
        break
      case 'logic_and':
      case 'logic_or':
      case 'logic_not':
        code.push(...this.generateLogicNode(node, definition))
        break
      case 'compare_equal':
      case 'compare_greater':
      case 'compare_less':
        code.push(...this.generateCompareNode(node, definition))
        break
      default:
        // 不支持的节点类型，跳过
        break
    }

    // 执行后续节点
    const nextConnections = this.getExecutionConnections(node.id)
    for (const connection of nextConnections) {
      const nextNode = this.nodeMap.get(connection.toNodeId)
      if (nextNode && !visitedNodes.has(nextNode.id)) {
        code.push(...this.generateNodeExecution(nextNode, visitedNodes))
      }
    }

    return code
  }

  /**
   * 生成常量节点代码
   */
  private generateConstantNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const value = node.inputs?.value ?? ''
    const outputParam = definition.outputs.find(o => o.type !== 'exec')
    
    if (outputParam) {
      const varName = this.nodeVariables.get(`${node.id}_${outputParam.id}`)
      if (varName) {
        code.push(`  ${varName} = ${JSON.stringify(value)};`)
      }
    }
    
    return code
  }

  /**
   * 生成打印节点代码
   */
  private generatePrintNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const inputParam = definition.inputs.find(i => i.type !== 'exec')
    
    if (inputParam) {
      // 查找输入连接
      const inputConnections = this.getInputConnections(node.id, inputParam.id)
      if (inputConnections.length > 0) {
        const connection = inputConnections[0]
        const value = this.getConnectionValue(connection.fromNodeId, connection.fromParamId)
        code.push(`  log(${value});`)
      } else {
        code.push(`  log('${node.inputs?.message || 'Hello World'}');`)
      }
    }
    
    return code
  }

  /**
   * 生成延迟节点代码
   */
  private generateDelayNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const duration = node.inputs?.duration || 1000
    code.push(`  await delay(${duration});`)
    return code
  }

  /**
   * 生成序列节点代码
   */
  private generateSequenceNode(node: NodeInstance, definition: NodeDefinition, visitedNodes: Set<string>): string[] {
    const code: string[] = []
    
    // 按顺序执行输出
    for (const output of definition.outputs) {
      if (output.type === 'exec') {
        const connections = this.getOutputConnections(node.id, output.id)
        for (const connection of connections) {
          const nextNode = this.nodeMap.get(connection.toNodeId)
          if (nextNode && !visitedNodes.has(nextNode.id)) {
            code.push(...this.generateNodeExecution(nextNode, new Set(visitedNodes)))
          }
        }
      }
    }

    return code
  }

  /**
   * 生成并行节点代码
   */
  private generateParallelNode(node: NodeInstance, definition: NodeDefinition, visitedNodes: Set<string>): string[] {
    const code: string[] = []
    const parallelTasks: string[] = []
    
    // 收集所有并行任务
    for (const output of definition.outputs) {
      if (output.type === 'exec') {
        const connections = this.getOutputConnections(node.id, output.id)
        for (const connection of connections) {
          const nextNode = this.nodeMap.get(connection.toNodeId)
          if (nextNode && !visitedNodes.has(nextNode.id)) {
            // 对于并行节点，我们需要创建独立的执行函数
            const taskName = `task_${connection.toNodeId}`
            parallelTasks.push(taskName)
            
            code.push(`  const ${taskName} = async () => {`)
            code.push(...this.generateNodeExecution(nextNode, new Set(visitedNodes)).map(line => '  ' + line))
            code.push('  };')
          }
        }
      }
    }

    if (parallelTasks.length > 0) {
      code.push(`  await Promise.all([${parallelTasks.join(', ')}].map(task => task()));`)
    }

    return code
  }

  /**
   * 生成输入节点代码
   */
  private generateInputNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const paramName = node.inputs?.name || 'input'
    const outputParam = definition.outputs.find(o => o.type !== 'exec')
    
    if (outputParam) {
      const varName = this.nodeVariables.get(`${node.id}_${outputParam.id}`)
      if (varName) {
        code.push(`  ${varName} = ${paramName};`)
      }
    }
    
    return code
  }

  /**
   * 生成输出节点代码
   */
  private generateOutputNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const paramName = node.inputs?.name || 'output'
    const inputParam = definition.inputs.find(i => i.type !== 'exec')
    
    if (inputParam) {
      // 查找输入连接
      const inputConnections = this.getInputConnections(node.id, inputParam.id)
      if (inputConnections.length > 0) {
        const connection = inputConnections[0]
        const value = this.getConnectionValue(connection.fromNodeId, connection.fromParamId)
        code.push(`  ${paramName} = ${value};`)
      } else {
        code.push(`  ${paramName} = undefined;`)
      }
    }
    
    return code
  }

  /**
   * 构建连接映射
   */
  private buildConnectionMap(): Map<string, NodeConnection[]> {
    const map = new Map<string, NodeConnection[]>()
    
    for (const connection of this.blueprint.connections) {
      const key = `${connection.fromNodeId}:${connection.fromParamId}`
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(connection)
    }

    return map
  }

  /**
   * 获取节点定义
   */
  private getNodeDefinition(definitionId: string): NodeDefinition | undefined {
    return this.nodeDefinitions.find(def => def.id === definitionId)
  }

  /**
   * 获取执行流连接
   */
  private getExecutionConnections(nodeId: string): NodeConnection[] {
    return this.blueprint.connections.filter(
      conn => conn.fromNodeId === nodeId && conn.fromParamId.includes('exec')
    )
  }

  /**
   * 获取输入连接
   */
  private getInputConnections(nodeId: string, paramId: string): NodeConnection[] {
    return this.blueprint.connections.filter(
      conn => conn.toNodeId === nodeId && conn.toParamId === paramId
    )
  }

  /**
   * 获取输出连接
   */
  private getOutputConnections(nodeId: string, paramId: string): NodeConnection[] {
    return this.blueprint.connections.filter(
      conn => conn.fromNodeId === nodeId && conn.fromParamId === paramId
    )
  }

  /**
   * 生成数学运算节点代码
   */
  private generateMathNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const outputParam = definition.outputs.find(o => o.type !== 'exec')
    
    if (outputParam) {
      const varName = this.nodeVariables.get(`${node.id}_${outputParam.id}`)
      if (varName) {
        const aConnection = this.getInputConnections(node.id, 'a')[0]
        const bConnection = this.getInputConnections(node.id, 'b')[0]
        
        const aValue = aConnection ? 
          this.getConnectionValue(aConnection.fromNodeId, aConnection.fromParamId) : 
          (node.inputs?.a || 0)
        const bValue = bConnection ? 
          this.getConnectionValue(bConnection.fromNodeId, bConnection.fromParamId) : 
          (node.inputs?.b || 0)
        
        let functionName = 'add'
        switch (definition.id) {
          case 'add_numbers': functionName = 'add'; break
          case 'subtract_numbers': functionName = 'subtract'; break
          case 'multiply_numbers': functionName = 'multiply'; break
          case 'divide_numbers': functionName = 'divide'; break
        }
        
        code.push(`  ${varName} = ${functionName}(${aValue}, ${bValue});`)
      }
    }
    
    return code
  }

  /**
   * 生成逻辑运算节点代码
   */
  private generateLogicNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const outputParam = definition.outputs.find(o => o.type !== 'exec')
    
    if (outputParam) {
      const varName = this.nodeVariables.get(`${node.id}_${outputParam.id}`)
      if (varName) {
        if (definition.id === 'logic_not') {
          const valueConnection = this.getInputConnections(node.id, 'value')[0]
          const value = valueConnection ? 
            this.getConnectionValue(valueConnection.fromNodeId, valueConnection.fromParamId) : 
            (node.inputs?.value || false)
          code.push(`  ${varName} = logicNot(${value});`)
        } else {
          const aConnection = this.getInputConnections(node.id, 'a')[0]
          const bConnection = this.getInputConnections(node.id, 'b')[0]
          
          const aValue = aConnection ? 
            this.getConnectionValue(aConnection.fromNodeId, aConnection.fromParamId) : 
            (node.inputs?.a || false)
          const bValue = bConnection ? 
            this.getConnectionValue(bConnection.fromNodeId, bConnection.fromParamId) : 
            (node.inputs?.b || false)
          
          const functionName = definition.id === 'logic_and' ? 'logicAnd' : 'logicOr'
          code.push(`  ${varName} = ${functionName}(${aValue}, ${bValue});`)
        }
      }
    }
    
    return code
  }

  /**
   * 生成比较运算节点代码
   */
  private generateCompareNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const outputParam = definition.outputs.find(o => o.type !== 'exec')
    
    if (outputParam) {
      const varName = this.nodeVariables.get(`${node.id}_${outputParam.id}`)
      if (varName) {
        const aConnection = this.getInputConnections(node.id, 'a')[0]
        const bConnection = this.getInputConnections(node.id, 'b')[0]
        
        const aValue = aConnection ? 
          this.getConnectionValue(aConnection.fromNodeId, aConnection.fromParamId) : 
          (node.inputs?.a || 0)
        const bValue = bConnection ? 
          this.getConnectionValue(bConnection.fromNodeId, bConnection.fromParamId) : 
          (node.inputs?.b || 0)
        
        let functionName = 'equal'
        switch (definition.id) {
          case 'compare_equal': functionName = 'equal'; break
          case 'compare_greater': functionName = 'greater'; break
          case 'compare_less': functionName = 'less'; break
        }
        
        code.push(`  ${varName} = ${functionName}(${aValue}, ${bValue});`)
      }
    }
    
    return code
  }

  /**
   * 获取连接到指定节点输入的连接类型
   */
  private getConnectionType(nodeId: string, paramId: string): string | undefined {
    const connections = this.getInputConnections(nodeId, paramId)
    if (connections.length === 0) return undefined
    
    const connection = connections[0]
    const sourceNode = this.nodeMap.get(connection.fromNodeId)
    if (!sourceNode) return undefined
    
    const sourceDefinition = this.getNodeDefinition(sourceNode.definitionId)
    if (!sourceDefinition) return undefined
    
    const sourceOutput = sourceDefinition.outputs.find(o => o.id === connection.fromParamId)
    return sourceOutput?.type
  }

  /**
   * 获取连接的值（函数参数节点直接返回参数名，其他节点返回变量名）
   */
  private getConnectionValue(fromNodeId: string, fromParamId: string): string {
    const sourceNode = this.nodeMap.get(fromNodeId)
    if (!sourceNode) return 'undefined'
    
    const sourceDefinition = this.getNodeDefinition(sourceNode.definitionId)
    if (!sourceDefinition) return 'undefined'
    
    // 如果是函数参数节点，直接返回参数名
    if (sourceDefinition.id === 'function_parameter') {
      return sourceNode.inputs?.param_name || 'param'
    }
    
    // 其他节点返回生成的变量名
    const varName = this.nodeVariables.get(`${fromNodeId}_${fromParamId}`)
    return varName || 'undefined'
  }

  /**
   * 生成函数返回节点代码
   */
  private generateReturnNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const inputParam = definition.inputs.find(i => i.type !== 'exec')
    
    if (inputParam) {
      const inputConnections = this.getInputConnections(node.id, inputParam.id)
      if (inputConnections.length > 0) {
        const connection = inputConnections[0]
        const value = this.getConnectionValue(connection.fromNodeId, connection.fromParamId)
        code.push(`  return ${value};`)
      }
    }
    
    return code
  }

  /**
   * 下载生成的TypeScript代码
   */
  async downloadCode(filename?: string): Promise<string> {
    const code = this.generateCode()
    const bpFunctionsCode = TypeScriptCodeGenerator.generateBPFunctions()
    
    // 检查是否在 Electron 环境中（Cocos Creator 基于 Electron）
    const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron
    
    console.log('=== 导出TS调试信息 ===')
    console.log('isElectron:', isElectron)
    console.log('window.process?.versions?.electron:', window.process?.versions?.electron)
    console.log('typeof window.electron:', typeof (window as any).electron)
    console.log('typeof window.electronAPI:', typeof (window as any).electronAPI)
    console.log('typeof Editor:', typeof (window as any).Editor)
    
    if (isElectron) {
      // 方式1: 尝试使用 Cocos Creator 的 Editor.Message API
      if (typeof (window as any).Editor !== 'undefined' && (window as any).Editor.Message) {
        console.log('尝试使用 Cocos Creator Editor.Message API...')
        try {
          const Editor = (window as any).Editor
          const fileName = filename || `BP_${this.blueprint.name || 'Blueprint'}.ts`
          
          // 首先保存 BP_Functions.ts
          const bpFunctionsUrl = `db://assets/scripts/BP_Functions.ts`
          console.log('创建 BP_Functions.ts 资源:', bpFunctionsUrl)
          
                     try {
             // 先检查资源是否存在
             let bpFunctionsExists = false
             try {
               const existingAsset = await Editor.Message.request('asset-db', 'query-asset-info', bpFunctionsUrl)
               bpFunctionsExists = !!(existingAsset && existingAsset.uuid)
               console.log('BP_Functions.ts 资源是否存在:', bpFunctionsExists)
             } catch (error) {
               console.log('检查 BP_Functions.ts 资源存在性失败:', error)
             }
             
             if (bpFunctionsExists) {
               // 资源存在，直接更新
               const bpFunctionsSaveResult = await Editor.Message.request('asset-db', 'save-asset', bpFunctionsUrl, bpFunctionsCode)
               console.log('BP_Functions.ts 更新结果:', bpFunctionsSaveResult)
             } else {
               // 资源不存在，创建新资源
               const bpFunctionsResult = await Editor.Message.request('asset-db', 'create-asset', bpFunctionsUrl, bpFunctionsCode)
               console.log('BP_Functions.ts 创建结果:', bpFunctionsResult)
             }
           } catch (error) {
             console.warn('BP_Functions.ts 保存失败:', error)
           }
          
          // 然后保存蓝图函数
          const assetUrl = `db://assets/scripts/${fileName}`
          console.log('处理蓝图函数资源:', assetUrl)
          
          // 先检查蓝图函数资源是否存在
          let blueprintExists = false
          try {
            const existingAsset = await Editor.Message.request('asset-db', 'query-asset-info', assetUrl)
            blueprintExists = !!(existingAsset && existingAsset.uuid)
            console.log('蓝图函数资源是否存在:', blueprintExists)
          } catch (error) {
            console.log('检查蓝图函数资源存在性失败:', error)
          }
          
          if (blueprintExists) {
            // 资源存在，直接更新
            const saveResult = await Editor.Message.request('asset-db', 'save-asset', assetUrl, code)
            console.log('蓝图函数更新结果:', saveResult)
            
            if (saveResult) {
              console.log('TypeScript 代码已更新到项目资源:', assetUrl)
              return assetUrl
            }
          } else {
            // 资源不存在，创建新资源
            const result = await Editor.Message.request('asset-db', 'create-asset', assetUrl, code)
            console.log('蓝图函数创建结果:', result)
            
            if (result && result.uuid) {
              console.log('TypeScript 代码已保存到项目资源:', assetUrl)
              return assetUrl
            }
          }
        } catch (error) {
          console.warn('Cocos Creator Editor.Message API 调用失败:', error)
        }
      }
    }
    
    // 回退到浏览器下载方式
    console.log('开始浏览器下载...')
    try {
      const fileName = filename || `BP_${this.blueprint.name || 'Blueprint'}.ts`
      
      // 下载 BP_Functions.ts
      const bpFunctionsBlob = new Blob([bpFunctionsCode], { type: 'text/typescript' })
      const bpFunctionsUrl = URL.createObjectURL(bpFunctionsBlob)
      const bpFunctionsLink = document.createElement('a')
      bpFunctionsLink.href = bpFunctionsUrl
      bpFunctionsLink.download = 'BP_Functions.ts'
      document.body.appendChild(bpFunctionsLink)
      bpFunctionsLink.click()
      document.body.removeChild(bpFunctionsLink)
      URL.revokeObjectURL(bpFunctionsUrl)
      console.log('BP_Functions.ts 下载完成')
      
      // 下载蓝图函数
      const blob = new Blob([code], { type: 'text/typescript' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('蓝图函数下载完成')
      return fileName
    } catch (error) {
      console.error('浏览器下载失败:', error)
      throw new Error('下载失败，请手动复制代码')
    }
  }
}