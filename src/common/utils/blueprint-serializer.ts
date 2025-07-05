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

    return JSON.stringify(serialized, null, 2)
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

      return data
    } catch (error) {
      console.error('Failed to deserialize blueprint:', error)
      return null
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
   * 下载蓝图为JSON文件
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
          const fileName = filename || `${blueprint.name || 'blueprint'}.json`
          
          // 创建资源 URL，保存到 assets 目录
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
              const defaultFileName = filename || `${blueprint.name || 'blueprint'}.json`
              saveResult = await electronAPI.saveFile({
                title: '保存蓝图文件',
                defaultPath: defaultFileName,
                filters: [
                  { name: 'JSON文件', extensions: ['json'] },
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
              const defaultFileName = filename || `${blueprint.name || 'blueprint'}.json`
              saveResult = await ipcRenderer.invoke('save-file', {
                title: '保存蓝图文件',
                defaultPath: defaultFileName,
                filters: [
                  { name: 'JSON文件', extensions: ['json'] },
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
    
    const link = document.createElement('a')
    link.href = url
    const fileName = filename || `${blueprint.name || 'blueprint'}.json`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    return fileName
  }

  /**
   * 从文件上传加载蓝图
   */
  static async loadBlueprintFromFile(): Promise<SerializedBlueprint | null> {
    // 检查是否在 Electron 环境中（Cocos Creator 基于 Electron）
    const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron
    
    if (isElectron) {
      // 方式1: 尝试使用 Cocos Creator 的 Editor.Message API
      if (typeof (window as any).Editor !== 'undefined' && (window as any).Editor.Message) {
        console.log('尝试使用 Cocos Creator Editor.Message API 加载蓝图...')
        try {
          const Editor = (window as any).Editor
          
          // 尝试获取资源数据库中的蓝图文件
          // 这里我们可以尝试查询 assets/blueprints 目录
          const blueprintAssetsResult = await Editor.Message.request('asset-db', 'query-assets', {
            pattern: 'db://assets/blueprints/**/*.json'
          })
          
          console.log('查询到的蓝图资源:', blueprintAssetsResult)
          
          if (blueprintAssetsResult && blueprintAssetsResult.length > 0) {
            // 如果找到蓝图文件，使用第一个（后续可以改为让用户选择）
            const firstBlueprint = blueprintAssetsResult[0]
            console.log('尝试读取蓝图资源:', firstBlueprint.url)
            
            const assetContent = await Editor.Message.request('asset-db', 'query-asset-info', firstBlueprint.uuid)
            console.log('蓝图资源信息:', assetContent)
            
            if (assetContent && assetContent.source) {
              const json = await Editor.Message.request('asset-db', 'get-asset-by-uuid', firstBlueprint.uuid)
              console.log('蓝图内容:', json)
              
              if (json) {
                const blueprint = this.deserialize(json)
                if (blueprint) {
                  console.log('成功加载蓝图:', blueprint.name)
                  return blueprint
                }
              }
            }
          }
          
          console.log('未找到蓝图资源或加载失败')
          
        } catch (error) {
          console.warn('Cocos Creator Editor.Message API 调用失败:', error)
        }
      }
      
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
                  { name: 'JSON文件', extensions: ['json'] },
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
                  { name: 'JSON文件', extensions: ['json'] },
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
      input.accept = '.json'
      
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
}

// TypeScript代码生成器
export class TypeScriptCodeGenerator {
  private blueprint: Blueprint
  private nodeDefinitions: NodeDefinition[]
  private nodeMap: Map<string, NodeInstance>
  private connectionMap: Map<string, NodeConnection[]>

  constructor(blueprint: Blueprint, nodeDefinitions: NodeDefinition[]) {
    this.blueprint = blueprint
    this.nodeDefinitions = nodeDefinitions
    this.nodeMap = new Map(blueprint.nodes.map(node => [node.id, node]))
    this.connectionMap = this.buildConnectionMap()
  }

  /**
   * 生成TypeScript代码
   */
  generateCode(): string {
    const code: string[] = []
    
    // 生成文件头
    code.push(this.generateHeader())
    code.push('')
    
    // 生成主类
    code.push(this.generateMainClass())
    
    return code.join('\n')
  }

  /**
   * 生成文件头部
   */
  private generateHeader(): string {
    return [
      '/**',
      ` * Generated TypeScript code from blueprint: ${this.blueprint.name}`,
      ` * Generated at: ${new Date().toISOString()}`,
      ' * Auto-generated - do not modify manually',
      ' */',
      '',
      '// Blueprint execution engine',
      'class BlueprintExecutor {',
      '  private variables: Record<string, any> = {}',
      '  private outputs: Record<string, any> = {}',
      '',
      '  async execute(): Promise<void> {',
      '    try {',
      '      await this.executeBlueprint()',
      '    } catch (error) {',
      '      console.error("Blueprint execution failed:", error)',
      '    }',
      '  }',
      '',
      '  private async executeBlueprint(): Promise<void> {'
    ].join('\n')
  }

  /**
   * 生成主类的执行逻辑
   */
  private generateMainClass(): string {
    const code: string[] = []
    
    // 查找开始节点
    const startNodes = this.blueprint.nodes.filter(node => {
      const definition = this.getNodeDefinition(node.definitionId)
      return definition?.id === 'start'
    })

    if (startNodes.length === 0) {
      code.push('    // No start node found')
      code.push('    console.warn("No start node found in blueprint")')
    } else {
      // 从开始节点开始执行
      for (const startNode of startNodes) {
        code.push(`    // Execute from start node: ${startNode.id}`)
        code.push(...this.generateNodeExecution(startNode))
      }
    }

    code.push('  }')
    code.push('')
    code.push(this.generateHelperMethods())
    code.push('}')
    code.push('')
    code.push('// Export and execute')
    code.push('export async function executeBlueprint() {')
    code.push('  const executor = new BlueprintExecutor()')
    code.push('  await executor.execute()')
    code.push('}')
    code.push('')
    code.push('// Auto-execute if run directly')
    code.push('if (require.main === module) {')
    code.push('  executeBlueprint()')
    code.push('}')

    return code.join('\n')
  }

  /**
   * 生成节点执行代码
   */
  private generateNodeExecution(node: NodeInstance, visitedNodes = new Set<string>()): string[] {
    if (visitedNodes.has(node.id)) {
      return [`    // Circular reference detected for node ${node.id}`]
    }

    visitedNodes.add(node.id)
    const code: string[] = []
    const definition = this.getNodeDefinition(node.definitionId)
    
    if (!definition) {
      code.push(`    // Unknown node type: ${node.definitionId}`)
      return code
    }

    code.push(`    // Execute node: ${definition.name} (${node.id})`)
    
    // 根据节点类型生成不同的执行代码
    switch (definition.id) {
      case 'number_constant':
        code.push(...this.generateConstantNode(node, definition))
        break
      case 'string_constant':
        code.push(...this.generateConstantNode(node, definition))
        break
      case 'boolean_constant':
        code.push(...this.generateConstantNode(node, definition))
        break
      case 'print':
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
      default:
        code.push(`    // Custom node: ${definition.name}`)
        code.push(`    console.log("Executing custom node: ${definition.name}")`)
    }

    // 继续执行连接的节点
    const execConnections = this.getExecutionConnections(node.id)
    for (const connection of execConnections) {
      const nextNode = this.nodeMap.get(connection.toNodeId)
      if (nextNode && !visitedNodes.has(nextNode.id)) {
        code.push(...this.generateNodeExecution(nextNode, new Set(visitedNodes)))
      }
    }

    return code
  }

  /**
   * 生成常量节点代码
   */
  private generateConstantNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const valueInput = definition.inputs.find(input => input.id === 'value')
    const value = node.inputs.value || valueInput?.defaultValue || null
    
    let formattedValue: string
    if (typeof value === 'string') {
      formattedValue = `"${value.replace(/"/g, '\\"')}"`
    } else {
      formattedValue = String(value)
    }

    return [
      `    this.outputs["${node.id}"] = ${formattedValue}`
    ]
  }

  /**
   * 生成打印节点代码
   */
  private generatePrintNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const valueConnections = this.getInputConnections(node.id, 'value')
    let valueSource = 'null'
    
    if (valueConnections.length > 0) {
      const sourceNodeId = valueConnections[0].fromNodeId
      valueSource = `this.outputs["${sourceNodeId}"]`
    } else {
      const value = node.inputs.value || 0
      valueSource = typeof value === 'string' ? `"${value}"` : String(value)
    }

    return [
      `    console.log(${valueSource})`
    ]
  }

  /**
   * 生成延时节点代码
   */
  private generateDelayNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const duration = node.inputs.duration || 1
    return [
      `    await new Promise(resolve => setTimeout(resolve, ${duration * 1000}))`
    ]
  }

  /**
   * 生成顺序执行节点代码
   */
  private generateSequenceNode(node: NodeInstance, definition: NodeDefinition, visitedNodes: Set<string>): string[] {
    const code: string[] = []
    
    // 按顺序执行每个输出
    for (const output of definition.outputs) {
      if (output.type === 'exec') {
        const connections = this.getOutputConnections(node.id, output.id)
        for (const connection of connections) {
          const nextNode = this.nodeMap.get(connection.toNodeId)
          if (nextNode && !visitedNodes.has(nextNode.id)) {
            code.push(`    // Sequence output: ${output.name}`)
            code.push(...this.generateNodeExecution(nextNode, new Set(visitedNodes)))
          }
        }
      }
    }

    return code
  }

  /**
   * 生成并行执行节点代码
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
            parallelTasks.push(`this.executeNode_${nextNode.id}()`)
          }
        }
      }
    }

    if (parallelTasks.length > 0) {
      code.push(`    // Parallel execution`)
      code.push(`    await Promise.all([${parallelTasks.join(', ')}])`)
    }

    return code
  }

  /**
   * 生成辅助方法
   */
  private generateHelperMethods(): string {
    return [
      '  private async delay(ms: number): Promise<void> {',
      '    return new Promise(resolve => setTimeout(resolve, ms))',
      '  }',
      '',
      '  private log(value: any): void {',
      '    console.log(value)',
      '  }'
    ].join('\n')
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
   * 下载生成的TypeScript代码
   */
  async downloadCode(filename?: string): Promise<string> {
    const code = this.generateCode()
    
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
          const fileName = filename || `${this.blueprint.name || 'blueprint'}.ts`
          
          // 创建资源 URL，保存到 assets 目录
          const assetUrl = `db://assets/scripts/${fileName}`
          
          console.log('创建 TypeScript 资源:', assetUrl)
          const result = await Editor.Message.request('asset-db', 'create-asset', assetUrl, code)
          console.log('Cocos Creator 资源创建结果:', result)
          
          if (result && result.uuid) {
            console.log('TypeScript 代码已保存到项目资源:', assetUrl)
            return assetUrl
          }
          
          console.log('资源创建失败，尝试更新现有资源...')
          
          // 如果创建失败，尝试保存到现有资源
          const saveResult = await Editor.Message.request('asset-db', 'save-asset', assetUrl, code)
          console.log('Cocos Creator 资源保存结果:', saveResult)
          
          if (saveResult) {
            console.log('TypeScript 代码已更新到项目资源:', assetUrl)
            return assetUrl
          }
          
        } catch (error) {
          console.warn('Cocos Creator Editor.Message API 调用失败:', error)
        }
      }
      
      try {
        console.log('尝试使用 Electron 文件对话框...')
        
        // 在渲染进程中，尝试使用 IPC 或预加载的 API
        let saveResult = null
        
        // 方式2: 检查是否有预加载的 electronAPI
        if (typeof (window as any).electronAPI !== 'undefined') {
          console.log('尝试使用 electronAPI')
          try {
            const electronAPI = (window as any).electronAPI
            if (electronAPI.saveFile) {
              const defaultFileName = filename || `${this.blueprint.name || 'blueprint'}.ts`
              saveResult = await electronAPI.saveFile({
                title: '保存TypeScript代码',
                defaultPath: defaultFileName,
                filters: [
                  { name: 'TypeScript文件', extensions: ['ts'] },
                  { name: '所有文件', extensions: ['*'] }
                ],
                content: code
              })
              console.log('electronAPI 保存结果:', saveResult)
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
              const defaultFileName = filename || `${this.blueprint.name || 'blueprint'}.ts`
              saveResult = await ipcRenderer.invoke('save-file', {
                title: '保存TypeScript代码',
                defaultPath: defaultFileName,
                filters: [
                  { name: 'TypeScript文件', extensions: ['ts'] },
                  { name: '所有文件', extensions: ['*'] }
                ],
                content: code
              })
              console.log('ipcRenderer 保存结果:', saveResult)
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
    } else {
      console.log('不在 Electron 环境中，使用浏览器下载')
    }
    
    // 回退到浏览器下载方式
    console.log('开始浏览器下载...')
    try {
      const fileName = filename || `${this.blueprint.name || 'blueprint'}.ts`
      
      // 在 Electron 环境中，尝试使用 data URI 替代 blob URL
      if (isElectron) {
        console.log('在 Electron 环境中使用 data URI 下载')
        const dataUri = `data:text/typescript;charset=utf-8,${encodeURIComponent(code)}`
        const link = document.createElement('a')
        link.href = dataUri
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log('data URI 下载完成')
        return fileName
      } else {
        console.log('使用 blob URL 下载')
        const blob = new Blob([code], { type: 'text/typescript' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(url)
        console.log('blob URL 下载完成')
        return fileName
      }
    } catch (error) {
      console.error('浏览器下载失败:', error)
      
      // 最终回退：直接复制到剪贴板
      try {
        await navigator.clipboard.writeText(code)
        console.log('已复制TypeScript代码到剪贴板')
        return '已复制到剪贴板'
      } catch (clipboardError) {
        console.error('复制到剪贴板也失败:', clipboardError)
        throw new Error('下载失败，请手动复制代码')
      }
    }
  }
} 