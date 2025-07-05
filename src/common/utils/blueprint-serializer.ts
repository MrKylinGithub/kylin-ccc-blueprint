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
          const blueprintsPath = await Editor.Message.request('asset-db', 'query-path', 'blueprints')
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
    
    const link = document.createElement('a')
    link.href = url
    const fileName = filename || `${blueprint.name || 'blueprint'}.bp`
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
          const blueprintsPath = await Editor.Message.request('asset-db', 'query-path', 'blueprints')
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
        console.log('加载蓝图文件，UUID:', uuid)
        try {
          const Editor = (window as any).Editor
          
          // 根据UUID获取资源内容
          const assetContent = await Editor.Message.request('asset-db', 'query-asset-info', uuid)
          console.log('蓝图资源信息:', assetContent)
          
          if (assetContent && assetContent.source) {
            // 读取文件内容
            const content = await Editor.Message.request('asset-db', 'get-asset-by-uuid', uuid)
            console.log('蓝图文件内容:', content)
            
            if (content) {
              const blueprint = this.deserialize(content)
              if (blueprint) {
                console.log('成功加载蓝图:', blueprint.name)
                return blueprint
              }
            }
          }
          
          console.log('蓝图文件加载失败')
          
        } catch (error) {
          console.warn('加载蓝图文件失败:', error)
        }
      }
    }
    
    return null
  }

  /**
   * 从文件上传加载蓝图（保留原有的文件选择功能作为备用）
   */
  static async loadBlueprintFromFile(): Promise<SerializedBlueprint | null> {
    // 优先尝试从项目中获取蓝图文件列表
    const blueprintList = await this.getBlueprintFileList()
    
    if (blueprintList && blueprintList.length > 0) {
      console.log('找到项目中的蓝图文件:', blueprintList)
      
      // 如果只有一个蓝图文件，直接加载
      if (blueprintList.length === 1) {
        console.log('自动加载唯一的蓝图文件:', blueprintList[0].name)
        return await this.loadBlueprintByUuid(blueprintList[0].uuid)
      }
      
      // 如果有多个蓝图文件，需要在UI层面提供选择
      // 这里暂时返回蓝图列表信息，让UI层面处理选择逻辑
      console.log('发现多个蓝图文件，需要用户选择')
      
      // 临时解决方案：加载第一个蓝图文件
      console.log('临时加载第一个蓝图文件:', blueprintList[0].name)
      return await this.loadBlueprintByUuid(blueprintList[0].uuid)
    }
    
    // 如果项目中没有蓝图文件，回退到原有的文件选择方式
    console.log('项目中没有蓝图文件，使用文件选择方式')
    
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
}

// TypeScript代码生成器 - 生成普通的蓝图函数
export class TypeScriptCodeGenerator {
  private blueprint: Blueprint
  private nodeDefinitions: NodeDefinition[]
  private nodeMap: Map<string, NodeInstance>
  private connectionMap: Map<string, NodeConnection[]>
  private inputParams: { name: string; type: string }[] = []
  private outputParams: { name: string; type: string }[] = []

  constructor(blueprint: Blueprint, nodeDefinitions: NodeDefinition[]) {
    this.blueprint = blueprint
    this.nodeDefinitions = nodeDefinitions
    this.nodeMap = new Map(blueprint.nodes.map(node => [node.id, node]))
    this.connectionMap = this.buildConnectionMap()
    this.analyzeInputOutputs()
  }

  /**
   * 生成TypeScript函数代码
   */
  generateCode(): string {
    const code: string[] = []
    
    // 生成文件头
    code.push(this.generateHeader())
    code.push('')
    
    // 生成主函数
    code.push(this.generateMainFunction())
    
    return code.join('\n')
  }

  /**
   * 生成文件头部
   */
  private generateHeader(): string {
    return [
      '/**',
      ` * Generated from blueprint: ${this.blueprint.name}`,
      ` * Generated at: ${new Date().toISOString()}`,
      ' * Auto-generated - do not modify manually',
      ' */',
      '',
      '// Helper functions',
      'function delay(ms: number): Promise<void> {',
      '  return new Promise(resolve => setTimeout(resolve, ms))',
      '}',
      '',
      'function log(value: any): void {',
      '  console.log(value)',
      '}'
    ].join('\n')
  }

  /**
   * 分析输入输出参数
   */
  private analyzeInputOutputs(): void {
    for (const node of this.blueprint.nodes) {
      const definition = this.getNodeDefinition(node.definitionId)
      if (!definition) continue

      // 分析输入节点
      if (definition.id === 'input') {
        const paramName = node.inputs?.name || 'input'
        const paramType = node.inputs?.type || 'any'
        this.inputParams.push({ name: paramName, type: paramType })
      }

      // 分析输出节点
      if (definition.id === 'output') {
        const paramName = node.inputs?.name || 'output'
        const paramType = node.inputs?.type || 'any'
        this.outputParams.push({ name: paramName, type: paramType })
      }
    }
  }

  /**
   * 生成主函数
   */
  private generateMainFunction(): string {
    const code: string[] = []
    
    // 生成函数签名
    const functionName = `BP_${this.blueprint.name || 'Blueprint'}`
    const params = this.inputParams.map(p => `${p.name}: ${p.type}`).join(', ')
    
    // 确定返回类型
    let returnType = 'void'
    if (this.outputParams.length === 1) {
      returnType = `Promise<${this.outputParams[0].type}>`
    } else if (this.outputParams.length > 1) {
      const returnObj = this.outputParams.map(p => `${p.name}: ${p.type}`).join(', ')
      returnType = `Promise<{ ${returnObj} }>`
    } else {
      returnType = 'Promise<void>'
    }
    
    code.push(`export async function ${functionName}(${params}): ${returnType} {`)
    
    // 生成函数体
    code.push('  // Local variables')
    code.push('  const locals: Record<string, any> = {}')
    code.push('  const outputs: Record<string, any> = {}')
    code.push('')
    
    // 查找开始节点
    const startNodes = this.blueprint.nodes.filter(node => {
      const definition = this.getNodeDefinition(node.definitionId)
      return definition?.id === 'start'
    })

    if (startNodes.length === 0) {
      code.push('  // No start node found')
      code.push('  console.warn("No start node found in blueprint")')
    } else {
      // 从开始节点开始执行
      code.push('  // Execute blueprint logic')
      for (const startNode of startNodes) {
        code.push(...this.generateNodeExecution(startNode))
      }
    }
    
    // 生成返回语句
    code.push('')
    code.push('  // Return results')
    if (this.outputParams.length === 0) {
      code.push('  return')
    } else if (this.outputParams.length === 1) {
      code.push(`  return outputs['${this.outputParams[0].name}']`)
    } else {
      const returnObj = this.outputParams.map(p => `${p.name}: outputs['${p.name}']`).join(', ')
      code.push(`  return { ${returnObj} }`)
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
      code.push(`  // Unknown node type: ${node.definitionId}`)
      return code
    }

    code.push(`  // Execute node: ${definition.name} (${node.id})`)
    
    switch (definition.id) {
      case 'constant':
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
      case 'input':
        code.push(...this.generateInputNode(node, definition))
        break
      case 'output':
        code.push(...this.generateOutputNode(node, definition))
        break
      default:
        code.push(`  // Unsupported node type: ${definition.id}`)
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
    const outputId = outputParam?.id || 'output'
    
    code.push(`  locals['${node.id}_${outputId}'] = ${JSON.stringify(value)}`)
    return code
  }

  /**
   * 生成打印节点代码
   */
  private generatePrintNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const inputParam = definition.inputs.find(i => i.type !== 'exec')
    const inputId = inputParam?.id || 'input'
    
    // 查找输入连接
    const inputConnections = this.getInputConnections(node.id, inputId)
    if (inputConnections.length > 0) {
      const connection = inputConnections[0]
      const fromOutputId = connection.fromParamId
      code.push(`  log(locals['${connection.fromNodeId}_${fromOutputId}'])`)
    } else {
      code.push(`  log('${node.inputs?.message || 'Hello World'}')`)
    }
    
    return code
  }

  /**
   * 生成延迟节点代码
   */
  private generateDelayNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const duration = node.inputs?.duration || 1000
    code.push(`  await delay(${duration})`)
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
            code.push(`  // Sequence output: ${output.name}`)
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
            code.push('  }')
          }
        }
      }
    }

    if (parallelTasks.length > 0) {
      code.push(`  // Parallel execution`)
      code.push(`  await Promise.all([${parallelTasks.join(', ')}].map(task => task()))`)
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
    const outputId = outputParam?.id || 'output'
    
    code.push(`  locals['${node.id}_${outputId}'] = ${paramName}`)
    return code
  }

  /**
   * 生成输出节点代码
   */
  private generateOutputNode(node: NodeInstance, definition: NodeDefinition): string[] {
    const code: string[] = []
    const paramName = node.inputs?.name || 'output'
    const inputParam = definition.inputs.find(i => i.type !== 'exec')
    const inputId = inputParam?.id || 'input'
    
    // 查找输入连接
    const inputConnections = this.getInputConnections(node.id, inputId)
    if (inputConnections.length > 0) {
      const connection = inputConnections[0]
      const fromOutputId = connection.fromParamId
      code.push(`  outputs['${paramName}'] = locals['${connection.fromNodeId}_${fromOutputId}']`)
    } else {
      code.push(`  outputs['${paramName}'] = undefined`)
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
          const fileName = filename || `BP_${this.blueprint.name || 'Blueprint'}.ts`
          
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
              const defaultFileName = filename || `BP_${this.blueprint.name || 'Blueprint'}.ts`
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
              const defaultFileName = filename || `BP_${this.blueprint.name || 'Blueprint'}.ts`
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
      const fileName = filename || `BP_${this.blueprint.name || 'Blueprint'}.ts`
      
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