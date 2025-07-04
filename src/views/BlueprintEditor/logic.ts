import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue'
import { blueprintStore } from '../../stores/blueprint'
import { keyMessage } from '../../panels/provide-inject'
import type { NodeConnection } from '../../types/blueprint'
import type { 
  Props, 
  ConnectionStart, 
  TempConnection, 
  NodeConnections, 
  PortPosition,
  DropData 
} from './types'

export const useBlueprintEditor = (props: Props) => {
  // 注入插件环境专用的消息系统
  const showMessage = inject(keyMessage)

  // 响应式引用
  const canvasRef = ref<HTMLElement>()
  const selectedNodeId = ref<string>('')
  const selectedConnectionId = ref<string>('')

  // 连接相关状态
  const isConnecting = ref(false)
  const connectionStart = ref<ConnectionStart | null>(null)
  const tempConnection = ref<TempConnection | null>(null)
  
  // 强制连接线更新的触发器
  const connectionUpdateTrigger = ref(0)

  // 画布平移相关状态
  const canvasTransform = ref({ x: 0, y: 0, scale: 1 })
  const isPanning = ref(false)
  const lastTouchDistance = ref(0)
  const lastTouchCenter = ref({ x: 0, y: 0 })
  const initialPinchDistance = ref(0)
  const initialScale = ref(1)
  
  // 鼠标拖拽状态
  const isMouseDragging = ref(false)
  const lastMousePosition = ref({ x: 0, y: 0 })
  const dragStartPosition = ref({ x: 0, y: 0 })

  // 计算属性
  const blueprint = computed(() => props.blueprint)
  const nodes = computed(() => blueprint.value?.nodes || [])
  const connections = computed(() => blueprint.value?.connections || [])
  const nodeCount = computed(() => nodes.value.length)
  const connectionCount = computed(() => connections.value.length)
  
  // 画布状态信息
  const canvasInfo = computed(() => ({
    x: Math.round(canvasTransform.value.x),
    y: Math.round(canvasTransform.value.y),
    scale: Math.round(canvasTransform.value.scale * 100) / 100
  }))

  // 检查端口是否已连接
  const isPortConnected = (nodeId: string, portType: 'input' | 'output', paramId: string): boolean => {
    return connections.value.some((conn: NodeConnection) => {
      if (portType === 'input') {
        return conn.toNodeId === nodeId && conn.toParamId === paramId
      } else {
        return conn.fromNodeId === nodeId && conn.fromParamId === paramId
      }
    })
  }

  // 获取节点的连接状态
  const getNodeConnections = (nodeId: string): NodeConnections => {
    const nodeConnections = {
      inputs: new Set<string>(),
      outputs: new Set<string>()
    }
    
    connections.value.forEach((conn: NodeConnection) => {
      if (conn.toNodeId === nodeId) {
        nodeConnections.inputs.add(conn.toParamId)
      }
      if (conn.fromNodeId === nodeId) {
        nodeConnections.outputs.add(conn.fromParamId)
      }
    })
    
    return nodeConnections
  }

  // 画布事件处理
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    
    const data = event.dataTransfer?.getData('application/json')
    if (!data) return
    
    try {
      const dropData = JSON.parse(data) as DropData
      
      if (dropData.type === 'node') {
        const canvasRect = canvasRef.value!.getBoundingClientRect()
        const position = {
          x: event.clientX - canvasRect.left,
          y: event.clientY - canvasRect.top
        }
        
        blueprintStore.addNode(dropData.nodeDefinitionId, position)
      }
    } catch (error) {
      console.error('拖拽数据解析失败:', error)
    }
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  const onCanvasMouseDown = (event: MouseEvent) => {
    // 只有在点击背景网格时才触发画布拖拽
    if (event.target === event.currentTarget) {
      // 背景网格触发拖拽，清除选择状态
      selectedNodeId.value = ''
      selectedConnectionId.value = ''
      
      // 开始拖拽画布内容
      isMouseDragging.value = true
      lastMousePosition.value = { x: event.clientX, y: event.clientY }
      dragStartPosition.value = { x: event.clientX, y: event.clientY }
    }
  }

  const onCanvasMouseMove = (event: MouseEvent) => {
    if (isConnecting.value && connectionStart.value && canvasRef.value) {
      const canvasRect = canvasRef.value.getBoundingClientRect()
      
      // 计算鼠标在画布内容中的位置，需要考虑画布变换
      const mouseInCanvas = {
        x: (event.clientX - canvasRect.left - canvasTransform.value.x) / canvasTransform.value.scale,
        y: (event.clientY - canvasRect.top - canvasTransform.value.y) / canvasTransform.value.scale
      }
      
      // 调整起始位置和当前位置到SVG坐标系
      const adjustedStartPos = { 
        x: connectionStart.value.position.x + 5000, 
        y: connectionStart.value.position.y + 5000 
      }
      const adjustedCurrentPos = { 
        x: mouseInCanvas.x + 5000, 
        y: mouseInCanvas.y + 5000 
      }
      
      tempConnection.value = {
        path: createBezierPath(adjustedStartPos, adjustedCurrentPos)
      }
    }
    
    // 处理画布拖拽
    if (isMouseDragging.value) {
      const deltaX = event.clientX - lastMousePosition.value.x
      const deltaY = event.clientY - lastMousePosition.value.y
      
      canvasTransform.value.x += deltaX
      canvasTransform.value.y += deltaY
      
      lastMousePosition.value = { x: event.clientX, y: event.clientY }
    }
  }

  const onCanvasMouseUp = () => {
    if (isConnecting.value) {
      // 如果没有连接到有效端口，取消连接
      cancelConnection()
    }
    
    // 结束画布拖拽
    isMouseDragging.value = false
  }

  const onCanvasContextMenu = (event: MouseEvent) => {
    // 可以在这里添加右键菜单逻辑
  }

  // 双击重置画布位置
  const onCanvasDoubleClick = (event: MouseEvent) => {
    // 背景网格双击重置画布
    canvasTransform.value = { x: 0, y: 0, scale: 1 }
  }

  // 触摸事件处理
  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      // 只有在双指操作时才preventDefault，避免影响单指点击
      event.preventDefault()
      isPanning.value = true
      
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      
      // 计算双指中心点
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      lastTouchCenter.value = { x: centerX, y: centerY }
      
      // 计算双指距离（用于缩放）
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      lastTouchDistance.value = distance
      initialPinchDistance.value = distance
      initialScale.value = canvasTransform.value.scale
    }
    // 单指操作不调用preventDefault，允许正常的点击事件
  }

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2 && isPanning.value) {
      event.preventDefault()
      
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      
      // 计算双指中心点（用于缩放中心）
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      
      const rect = canvasRef.value?.getBoundingClientRect()
      if (!rect) return
      
      const scaleCenterX = centerX - rect.left
      const scaleCenterY = centerY - rect.top
      
      // 计算新的双指距离（用于缩放）
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // 计算缩放比例
      if (initialPinchDistance.value > 0) {
        const scaleRatio = distance / initialPinchDistance.value
        const newScale = Math.max(0.5, Math.min(3, initialScale.value * scaleRatio))
        
        // 以双指中心为缩放点
        const scale = newScale / canvasTransform.value.scale
        canvasTransform.value.x = scaleCenterX - (scaleCenterX - canvasTransform.value.x) * scale
        canvasTransform.value.y = scaleCenterY - (scaleCenterY - canvasTransform.value.y) * scale
        canvasTransform.value.scale = newScale
      }
      
      lastTouchDistance.value = distance
    }
  }

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length < 2) {
      isPanning.value = false
      lastTouchDistance.value = 0
      initialPinchDistance.value = 0
    }
  }

  // Mac触控板支持 - 滚轮事件处理
  const onWheel = (event: WheelEvent) => {
    // 检查是否是触控板的缩放手势 (通常 ctrlKey 为 true)
    if (event.ctrlKey || event.metaKey) {
      // 缩放手势
      event.preventDefault()
      
      const rect = canvasRef.value?.getBoundingClientRect()
      if (!rect) return
      
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      
      // 计算缩放因子
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.5, Math.min(3, canvasTransform.value.scale * scaleFactor))
      
      // 以鼠标位置为中心进行缩放
      const scaleRatio = newScale / canvasTransform.value.scale
      canvasTransform.value.x = mouseX - (mouseX - canvasTransform.value.x) * scaleRatio
      canvasTransform.value.y = mouseY - (mouseY - canvasTransform.value.y) * scaleRatio
      canvasTransform.value.scale = newScale
    }
    // 移除wheel事件的平移功能，改为鼠标拖拽
  }

  // 节点操作
  const deleteNode = (nodeId: string) => {
    blueprintStore.removeNode(nodeId)
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = ''
    }
  }

  const moveNode = (nodeId: string, position: { x: number; y: number }) => {
    const blueprint = blueprintStore.activeBlueprint
    if (!blueprint) return
    
    const node = blueprint.nodes.find((n: any) => n.id === nodeId)
    if (node) {
      // 传入的 position 已经是相对于 canvas-content 的坐标，直接使用
      node.position = position
      blueprintStore.markTabDirty(blueprintStore.activeTabId)
      
      // 触发连接线实时更新
      connectionUpdateTrigger.value++
    }
  }

  const onNodeDragEnd = (nodeId: string) => {
    // 强制重新渲染：先将触发器设为一个随机值，强制所有连接线重新计算
    const forceUpdate = () => {
      connectionUpdateTrigger.value = Math.random()
    }
    
    // 多重强制更新
    requestAnimationFrame(() => {
      forceUpdate()
      requestAnimationFrame(() => {
        forceUpdate()
      })
    })
  }

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId
    selectedConnectionId.value = ''
  }

  const onNodeInputChange = () => {
    blueprintStore.markTabDirty(blueprintStore.activeTabId)
  }

  // 端口连接
  const onPortMouseDown = (event: MouseEvent, nodeId: string, portType: 'input' | 'output', paramId: string) => {
    event.stopPropagation()
    
    const node = nodes.value.find((n: any) => n.id === nodeId)
    if (!node) return
    
    // 计算端口位置
    const portPosition = getPortPosition(nodeId, portType, paramId)
    if (!portPosition) return
    
    connectionStart.value = {
      nodeId,
      paramId,
      type: portType,
      position: portPosition
    }
    
    isConnecting.value = true
  }

  const onPortMouseUp = (event: MouseEvent, nodeId: string, portType: 'input' | 'output', paramId: string) => {
    event.stopPropagation()
    
    if (isConnecting.value && connectionStart.value) {
      const start = connectionStart.value
      
      // 检查是否是有效连接（输出到输入）
      if (start.type === 'output' && portType === 'input' && start.nodeId !== nodeId) {
        createConnection(start.nodeId, start.paramId, nodeId, paramId)
      } else if (start.type === 'input' && portType === 'output' && start.nodeId !== nodeId) {
        createConnection(nodeId, paramId, start.nodeId, start.paramId)
      }
      
      cancelConnection()
    }
  }

  // 创建连接
  const createConnection = (fromNodeId: string, fromParamId: string, toNodeId: string, toParamId: string) => {
    // 检查是否已存在相同连接
    const existingConnection = connections.value.find(
      (c: NodeConnection) => c.fromNodeId === fromNodeId && c.fromParamId === fromParamId && 
           c.toNodeId === toNodeId && c.toParamId === toParamId
    )
    
    if (existingConnection) {
      // 使用插件环境专用的消息系统
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '连接已存在',
          type: 'warning',
          duration: 2000
        })
      }
      return
    }
    
    blueprintStore.addConnection({
      fromNodeId,
      fromParamId,
      toNodeId,
      toParamId
    })
  }

  // 取消连接
  const cancelConnection = () => {
    isConnecting.value = false
    connectionStart.value = null
    tempConnection.value = null
  }

  // 选择连接
  const selectConnection = (connectionId: string) => {
    selectedConnectionId.value = connectionId
    selectedNodeId.value = ''
  }

  // 获取端口位置
  const getPortPosition = (nodeId: string, portType: 'input' | 'output', paramId: string): PortPosition | null => {
    const node = nodes.value.find((n: any) => n.id === nodeId)
    if (!node) return null
    
    const definition = blueprintStore.nodeDefinitions.find((d: any) => d.id === node.definitionId)
    if (!definition) return null
    
    // 尝试从DOM获取准确的端口位置，然后转换为canvas-content坐标系
    const canvasElement = canvasRef.value
    if (canvasElement) {
      const portSelector = `[data-node-id="${nodeId}"][data-port-type="${portType}"][data-param-id="${paramId}"]`
      const portElement = canvasElement.querySelector(portSelector) as HTMLElement
      const canvasContentElement = canvasElement.querySelector('.canvas-content') as HTMLElement
      
      if (portElement && canvasContentElement) {
        const portRect = portElement.getBoundingClientRect()
        const canvasContentRect = canvasContentElement.getBoundingClientRect()
        
        // 计算端口中心相对于canvas-content的位置
        const portCenterX = (portRect.left + portRect.width / 2 - canvasContentRect.left) / canvasTransform.value.scale
        const portCenterY = (portRect.top + portRect.height / 2 - canvasContentRect.top) / canvasTransform.value.scale
        
        return { x: portCenterX, y: portCenterY }
      }
    }
    
    // 回退到计算方法
    // 节点布局常数（对应实际CSS）
    const NODE_HEADER_HEIGHT = 36 // 头部高度 (8px + 8px padding + ~20px文字高度)
    const NODE_CONTENT_PADDING = 12 // 内容区域padding
    const NODE_BORDER = 2 // 节点边框
    const PARAM_HEIGHT = 24 // 每个参数的高度 (min-height)
    const PARAM_GAP = 8 // 参数间距
    const PORT_SIZE = 12 // 端口大小
    const PORT_BORDER = 2 // 端口边框
    const MIN_NODE_WIDTH = 180 // 节点最小宽度
    
    // 计算节点实际宽度
    const estimatedNodeWidth = Math.max(MIN_NODE_WIDTH, 
      Math.min(400, definition.name.length * 8 + 100))
    
    let paramIndex = -1
    
    if (portType === 'input') {
      const inputs = definition.inputs || []
      paramIndex = inputs.findIndex((input: any) => input.id === paramId)
    } else {
      const outputs = definition.outputs || []
      paramIndex = outputs.findIndex((output: any) => output.id === paramId)
    }
    
    if (paramIndex === -1) return null
    
    // 计算端口的垂直位置
    const baseY = node.position.y + NODE_HEADER_HEIGHT + NODE_CONTENT_PADDING
    
    // 端口中心点尺寸（包含边框）
    const portFullSize = PORT_SIZE + PORT_BORDER * 2
    const portRadius = portFullSize / 2
    
    if (portType === 'input') {
      // 输入参数在上方，直接按索引计算
      const portY = baseY + paramIndex * (PARAM_HEIGHT + PARAM_GAP) + PARAM_HEIGHT / 2
      // 输入端口位置：节点左边框 + 内容padding + 端口半径
      const portCenterX = node.position.x + NODE_BORDER + NODE_CONTENT_PADDING + portRadius
      return { x: portCenterX, y: portY }
    } else {
      // 输出参数在下方，需要加上所有输入参数的高度
      const inputCount = definition.inputs?.length || 0
      const inputSectionHeight = inputCount > 0 ? inputCount * (PARAM_HEIGHT + PARAM_GAP) : 0
      const gapBetweenSections = inputCount > 0 ? PARAM_GAP : 0
      
      const portY = baseY + inputSectionHeight + gapBetweenSections + 
        paramIndex * (PARAM_HEIGHT + PARAM_GAP) + PARAM_HEIGHT / 2
      // 输出端口位置：节点右边界 - 边框 - 内容padding - 端口半径
      const portCenterX = node.position.x + estimatedNodeWidth - NODE_BORDER - NODE_CONTENT_PADDING - portRadius
      return { x: portCenterX, y: portY }
    }
  }

  // 获取连接路径
  const getConnectionPath = (connection: NodeConnection): string => {
    // 添加对触发器的依赖，确保节点移动时连接线实时更新
    connectionUpdateTrigger.value // 这行代码的作用是建立响应式依赖
    
    const fromPos = getPortPosition(connection.fromNodeId, 'output', connection.fromParamId)
    const toPos = getPortPosition(connection.toNodeId, 'input', connection.toParamId)
    
    if (!fromPos || !toPos) return ''
    
    // 由于SVG坐标系从(-5000, -5000)开始，需要加上偏移量
    const adjustedFromPos = { x: fromPos.x + 5000, y: fromPos.y + 5000 }
    const adjustedToPos = { x: toPos.x + 5000, y: toPos.y + 5000 }
    
    return createBezierPath(adjustedFromPos, adjustedToPos)
  }

  // 创建贝塞尔曲线路径
  const createBezierPath = (start: { x: number; y: number }, end: { x: number; y: number }): string => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    // 计算距离
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // 起始控制点：从输出端口水平向右延伸
    const startControlOffset = Math.min(Math.max(Math.abs(dx) * 0.4, 80), distance * 0.5)
    const cp1x = start.x + startControlOffset
    const cp1y = start.y
    
    // 终点控制点：让箭头指向正确的方向
    // 关键：控制点应该沿着 start->end 的方向延伸，这样终点切线就会指向正确方向
    const endControlOffset = Math.min(startControlOffset * 0.8, 60)
    
    // 计算单位方向向量（从 end 指向 start）
    const dirX = -dx / distance
    const dirY = -dy / distance
    
    // 终点控制点：沿着反方向延伸，让终点切线指向 start->end 方向
    const cp2x = end.x + dirX * endControlOffset
    const cp2y = end.y + dirY * endControlOffset
    
    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`
  }

  // 键盘事件处理
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedNodeId.value) {
        deleteNode(selectedNodeId.value)
      } else if (selectedConnectionId.value) {
        blueprintStore.removeConnection(selectedConnectionId.value)
        selectedConnectionId.value = ''
      }
    }
  }

  // 挂载时添加事件监听
  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
  })

  return {
    // 响应式引用
    canvasRef,
    selectedNodeId,
    selectedConnectionId,
    isConnecting,
    connectionStart,
    tempConnection,
    canvasTransform,
    
    // 计算属性
    blueprint,
    nodes,
    connections,
    nodeCount,
    connectionCount,
    canvasInfo,
    
    // 方法
    isPortConnected,
    getNodeConnections,
    onDrop,
    onDragOver,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    onCanvasContextMenu,
    onCanvasDoubleClick,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onWheel,
    deleteNode,
    moveNode,
    selectNode,
    onNodeDragEnd,
    onNodeInputChange,
    onPortMouseDown,
    onPortMouseUp,
    createConnection,
    cancelConnection,
    selectConnection,
    getPortPosition,
    getConnectionPath,
    createBezierPath
  }
} 