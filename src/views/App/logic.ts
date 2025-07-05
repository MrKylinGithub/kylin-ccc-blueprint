import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Menu, Document, Download, Upload } from '@element-plus/icons-vue'
import type { AppState, AppRefs, ResizeState, ToolbarAction, AppConfig } from './types'

// 配置常量
const APP_CONFIG: AppConfig = {
  minNodeManagerWidth: 200,
  maxNodeManagerWidth: 600,
  minContainerWidth: 800,
  resizeHandleWidth: 4,
  toolbarHeight: 48
}

export function useAppLogic() {
  // 状态管理
  const state = reactive<AppState>({
    showNodeManager: true,
    nodeManagerWidth: 300,
    containerWidth: 800
  })

  // 引用管理
  const refs: AppRefs = {
    containerRef: ref<HTMLElement>(),
    blueprintTabsRef: ref()
  }

  // 调整状态
  const resizeState = reactive<ResizeState>({
    isResizing: false,
    startX: 0,
    startWidth: 0
  })

  // ResizeObserver
  let resizeObserver: ResizeObserver | null = null

  // 监听容器大小变化
  const handleResize = () => {
    if (refs.containerRef.value) {
      state.containerWidth = refs.containerRef.value.clientWidth
    }
    
    // 在小容器时自动隐藏节点管理器
    if (state.containerWidth < APP_CONFIG.minContainerWidth && state.showNodeManager) {
      state.showNodeManager = false
    }
    
    // 调整节点管理器宽度以适应容器
    if (state.nodeManagerWidth > state.containerWidth * 0.5) {
      state.nodeManagerWidth = Math.max(
        APP_CONFIG.minNodeManagerWidth, 
        state.containerWidth * 0.3
      )
    }
  }

  // 调整节点管理器宽度
  const onResizeStart = (event: MouseEvent) => {
    resizeState.isResizing = true
    resizeState.startX = event.clientX
    resizeState.startWidth = state.nodeManagerWidth
    
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeState.isResizing) return
      
      const newWidth = resizeState.startWidth + (e.clientX - resizeState.startX)
      const maxWidth = Math.min(state.containerWidth * 0.6, APP_CONFIG.maxNodeManagerWidth)
      const minWidth = Math.max(APP_CONFIG.minNodeManagerWidth, state.containerWidth * 0.2)
      
      state.nodeManagerWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    }
    
    const onMouseUp = () => {
      resizeState.isResizing = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // 切换节点管理器显示状态
  const toggleNodeManager = () => {
    state.showNodeManager = !state.showNodeManager
    
    // 如果容器太小，调整宽度
    if (state.showNodeManager && state.containerWidth < 1000) {
      state.nodeManagerWidth = Math.min(
        state.nodeManagerWidth, 
        state.containerWidth * 0.4
      )
    }
  }

  // 蓝图操作方法
  const saveBlueprint = () => {
    refs.blueprintTabsRef.value?.saveBlueprint?.()
  }

  const openBlueprint = () => {
    refs.blueprintTabsRef.value?.openBlueprint?.()
  }

  const exportTypeScript = () => {
    refs.blueprintTabsRef.value?.exportTypeScript?.()
  }

  // 工具栏按钮配置
  const toolbarActions: ToolbarAction[] = [
    {
      id: 'toggle-node-manager',
      label: state.showNodeManager ? '隐藏节点管理器' : '显示节点管理器',
      icon: Menu,
      action: toggleNodeManager,
      type: state.showNodeManager ? 'primary' : 'secondary'
    },
    {
      id: 'save-blueprint',
      label: '保存',
      icon: Document,
      action: saveBlueprint
    },
    {
      id: 'open-blueprint',
      label: '打开',
      icon: Upload,
      action: openBlueprint
    },
    {
      id: 'export-typescript',
      label: '导出TS',
      icon: Download,
      action: exportTypeScript
    }
  ]

  // 计算属性样式
  const nodeManagerPanelStyle = () => ({
    width: `${state.nodeManagerWidth}px`
  })

  // 生命周期钩子
  const setupResize = () => {
    if (refs.containerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(refs.containerRef.value)
      handleResize() // 初始检查
    }
    
    // 后备方案：监听窗口大小变化
    window.addEventListener('resize', handleResize)
  }

  const cleanupResize = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    window.removeEventListener('resize', handleResize)
  }

  // 组件挂载
  onMounted(() => {
    setupResize()
  })

  onUnmounted(() => {
    cleanupResize()
  })

  return {
    // 状态
    state,
    refs,
    resizeState,
    
    // 配置
    APP_CONFIG,
    toolbarActions,
    
    // 方法
    onResizeStart,
    toggleNodeManager,
    saveBlueprint,
    openBlueprint,
    exportTypeScript,
    
    // 样式计算
    nodeManagerPanelStyle
  }
} 