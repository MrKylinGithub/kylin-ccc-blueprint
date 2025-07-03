import { ref, computed, inject, nextTick } from 'vue'
import { blueprintStore } from '../../stores/blueprint'
import { keyMessage } from '../../panels/provide-inject'
import type { NodeDefinition, NodeParam, NodeInstance } from '../../types/blueprint'
import type { NodeFormData } from './types'

export const useNodeManager = () => {
  // 注入插件环境专用的消息系统
  const showMessage = inject(keyMessage)

  // 响应式数据
  const showCreateDialog = ref(false)
  const editingNode = ref<NodeDefinition | null>(null)
  
  // 拖拽预览相关
  const dragPreviewNode = ref<NodeInstance | null>(null)
  const dragPreviewRef = ref<any>(null)
  const dragPreviewContainer = ref<HTMLElement | null>(null)

  const nodeForm = ref<NodeFormData>({
    name: '',
    category: '',
    description: '',
    color: '#666666',
    inputs: [],
    outputs: []
  })

  // 获取所有分类
  const categories = computed(() => {
    const cats = new Set(blueprintStore.nodeDefinitions.map((n: any) => n.category))
    return Array.from(cats).sort()
  })

  // 根据分类获取节点
  const getNodesByCategory = (category: string) => {
    return blueprintStore.nodeDefinitions.filter((n: any) => n.category === category)
  }

  // 拖拽开始
  const onDragStart = (event: DragEvent, node: NodeDefinition) => {
    if (!event.dataTransfer) return
    
    // 设置传输数据
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'node',
      nodeDefinitionId: node.id
    }))
    
    // 设置拖拽效果
    event.dataTransfer.effectAllowed = 'copy'
    
    // 使用与 blueprintStore.addNode 完全相同的逻辑创建节点实例
    const definition = blueprintStore.nodeDefinitions.find(d => d.id === node.id)
    if (!definition) return
    
    // 创建预览节点数据
    dragPreviewNode.value = {
      id: 'preview_' + Date.now(),
      definitionId: node.id,
      name: definition.name,
      position: { x: 0, y: 0 },
      inputs: {},
      outputs: {}
    }
    
    // 同步设置拖拽图像
    if (dragPreviewRef.value?.$el && dragPreviewContainer.value) {
      const previewElement = dragPreviewRef.value.$el
      const container = dragPreviewContainer.value
      
      // 暂时显示预览元素
      container.style.opacity = '1'
      container.style.position = 'fixed'
      container.style.top = '-500px'
      container.style.left = '0px'
      container.style.zIndex = '10000'
      
      // 强制重新计算布局
      container.offsetHeight
      
      // 设置自定义拖拽图像（必须在dragstart同步阶段）
      if (previewElement.offsetWidth > 0) {
        event.dataTransfer.setDragImage(previewElement, 90, 30)
        console.log('设置自定义拖拽图像成功')
      } else {
        console.log('预览元素尺寸为0，使用默认拖拽图像')
      }
      
      // 恢复隐藏状态
      setTimeout(() => {
        container.style.opacity = '0'
        container.style.position = 'absolute'
        container.style.top = '-2000px'
        container.style.left = '-2000px'
        container.style.zIndex = '-1'
      }, 50)
    } else {
      console.log('预览元素不存在，使用默认拖拽图像')
    }
  }

  // 编辑节点
  const editNode = (node: NodeDefinition) => {
    editingNode.value = node
    nodeForm.value = {
      name: node.name,
      category: node.category,
      description: node.description || '',
      color: node.color || '#666666',
      inputs: JSON.parse(JSON.stringify(node.inputs)),
      outputs: JSON.parse(JSON.stringify(node.outputs))
    }
    showCreateDialog.value = true
  }

  // 删除节点
  const deleteNode = (id: string) => {
    blueprintStore.removeNodeDefinition(id)
    
    // 使用插件环境专用的消息系统
    if (showMessage && typeof showMessage === 'function') {
      showMessage({
        message: '节点已删除',
        type: 'success',
        duration: 2000
      })
    }
  }

  // 添加输入参数
  const addInput = () => {
    nodeForm.value.inputs.push({
      id: 'input_' + Date.now(),
      name: '',
      type: 'string',
      description: ''
    })
  }

  // 移除输入参数
  const removeInput = (index: number) => {
    nodeForm.value.inputs.splice(index, 1)
  }

  // 添加输出参数
  const addOutput = () => {
    nodeForm.value.outputs.push({
      id: 'output_' + Date.now(),
      name: '',
      type: 'string',
      description: ''
    })
  }

  // 移除输出参数
  const removeOutput = (index: number) => {
    nodeForm.value.outputs.splice(index, 1)
  }

  // 保存节点
  const saveNode = () => {
    if (!nodeForm.value.name.trim()) {
      // 使用插件环境专用的消息系统
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '请输入节点名称',
          type: 'error',
          duration: 2000
        })
      }
      return
    }

    // 为参数生成ID
    nodeForm.value.inputs.forEach((input: NodeParam) => {
      if (!input.id) {
        input.id = 'input_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      }
    })
    
    nodeForm.value.outputs.forEach((output: NodeParam) => {
      if (!output.id) {
        output.id = 'output_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      }
    })

    const nodeDefinition: NodeDefinition = {
      id: editingNode.value?.id || 'node_def_' + Date.now(),
      name: nodeForm.value.name,
      category: nodeForm.value.category || '自定义',
      description: nodeForm.value.description,
      color: nodeForm.value.color,
      inputs: nodeForm.value.inputs,
      outputs: nodeForm.value.outputs
    }

    if (editingNode.value) {
      blueprintStore.updateNodeDefinition(editingNode.value.id, nodeDefinition)
      // 使用插件环境专用的消息系统
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '节点已更新',
          type: 'success',
          duration: 2000
        })
      }
    } else {
      blueprintStore.addNodeDefinition(nodeDefinition)
      // 使用插件环境专用的消息系统
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '节点已创建',
          type: 'success',
          duration: 2000
        })
      }
    }

    showCreateDialog.value = false
    resetForm()
  }

  // 重置表单
  const resetForm = () => {
    editingNode.value = null
    nodeForm.value = {
      name: '',
      category: '',
      description: '',
      color: '#666666',
      inputs: [],
      outputs: []
    }
  }

  // 打开创建对话框
  const openCreateDialog = () => {
    showCreateDialog.value = true
  }

  // 关闭创建对话框
  const closeCreateDialog = () => {
    showCreateDialog.value = false
    resetForm()
  }

  return {
    // 响应式数据
    showCreateDialog,
    editingNode,
    nodeForm,
    categories,
    
    // 拖拽预览
    dragPreviewNode,
    dragPreviewRef,
    dragPreviewContainer,
    
    // 方法
    getNodesByCategory,
    onDragStart,
    editNode,
    deleteNode,
    addInput,
    removeInput,
    addOutput,
    removeOutput,
    saveNode,
    resetForm,
    openCreateDialog,
    closeCreateDialog
  }
} 