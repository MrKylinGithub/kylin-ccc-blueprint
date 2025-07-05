import { computed, ref, inject } from 'vue'
import { ElMessageBox } from 'element-plus'
import { blueprintStore } from '../../stores/blueprint'
import { BlueprintType } from '../../common/types/blueprint'
import { keyMessage } from '../../panels/provide-inject'
import { BlueprintSerializer, TypeScriptCodeGenerator } from '../../common/utils/blueprint-serializer'
import type { TabMethods } from './types'

export const useBlueprintTabs = () => {
  // 注入插件环境专用的消息系统
  const showMessage = inject(keyMessage)

  // 响应式数据
  const tabs = computed(() => blueprintStore.tabs)
  const activeTabId = computed(() => blueprintStore.activeTabId)
  
  // 文件选择对话框相关
  const showFileSelectDialog = ref(false)
  const projectBlueprintFiles = ref<Array<{ name: string; url: string; uuid: string }>>([])
  const selectedFileUuid = ref('')
  
  // 新建蓝图对话框相关
  const showNewBlueprintDialog = ref(false)
  const newBlueprintName = ref('')
  const blueprintType = ref<BlueprintType>(BlueprintType.COMPONENT)



  // 选择标签页
  const selectTab = (tabId: string) => {
    blueprintStore.activeTabId = tabId
  }



  // 关闭标签页
  const closeTab = async (tabId: string) => {
    const tab = tabs.value.find((t: any) => t.id === tabId)
    if (!tab) return
    
    // 如果有未保存的更改，询问是否保存
    if (tab.isDirty) {
      try {
        const action = await ElMessageBox.confirm(
          `蓝图 "${tab.name}" 有未保存的更改，是否保存？`,
          '确认关闭',
          {
            confirmButtonText: '保存并关闭',
            cancelButtonText: '直接关闭',
            distinguishCancelAndClose: true,
            type: 'warning'
          }
        )
        
        if (action === 'confirm') {
          // 保存蓝图
          blueprintStore.markTabClean(tabId)
        }
      } catch (action) {
        if (action === 'cancel') {
          // 直接关闭，不保存
        } else {
          // 点击了 X 或按了 ESC，取消关闭
          return
        }
      }
    }
    
    blueprintStore.closeTab(tabId)
  }



  // ========== 新的序列化工具方法 ==========

  // 获取当前活跃标签页
  const activeTab = computed(() => blueprintStore.activeTab)

  // 保存蓝图为BP文件
  const saveBlueprint = async () => {
    const tab = activeTab.value
    if (!tab) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '没有可保存的蓝图',
          type: 'warning',
          duration: 2000
        })
      }
      return
    }

    try {
      const filePath = await BlueprintSerializer.downloadBlueprint(
        tab.blueprint,
        blueprintStore.nodeDefinitions,
        `${tab.name}.bp`
      )
      
      if (filePath) {
        blueprintStore.markTabClean(tab.id)
        
        if (showMessage && typeof showMessage === 'function') {
          showMessage({
            message: `蓝图 "${tab.name}" 已保存：${filePath}`,
            type: 'success',
            duration: 3000
          })
        }
      } else if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '保存已取消',
          type: 'info',
          duration: 2000
        })
      }
    } catch (error) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '保存蓝图失败',
          type: 'error',
          duration: 3000
        })
      }
    }
  }

  // 从项目文件加载蓝图
  const loadBlueprint = async () => {
    try {
      const blueprintList = await BlueprintSerializer.loadBlueprintFromProject()
      
      // 总是显示文件选择对话框，无论是否找到文件
      projectBlueprintFiles.value = blueprintList
      if (blueprintList.length > 0) {
        selectedFileUuid.value = blueprintList[0].uuid
      } else {
        selectedFileUuid.value = ''
      }
      showFileSelectDialog.value = true
      
    } catch (error) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '获取蓝图文件列表失败',
          type: 'error',
          duration: 3000
        })
      }
    }
  }
  
  // 确认选择项目文件
  const confirmSelectFile = async () => {
    if (!selectedFileUuid.value) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '请选择一个蓝图文件',
          type: 'warning',
          duration: 2000
        })
      }
      return
    }
    
    try {
      const data = await BlueprintSerializer.loadBlueprintByUuid(selectedFileUuid.value)
      if (data) {
        await loadBlueprintData(data)
        showFileSelectDialog.value = false
      } else {
        if (showMessage && typeof showMessage === 'function') {
          showMessage({
            message: '加载蓝图文件失败',
            type: 'error',
            duration: 3000
          })
        }
      }
    } catch (error) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '加载蓝图文件失败',
          type: 'error',
          duration: 3000
        })
      }
    }
  }
  

  
  // 取消文件选择
  const cancelSelectFile = () => {
    showFileSelectDialog.value = false
    selectedFileUuid.value = ''
  }
  
  // 加载蓝图数据的公共方法
  const loadBlueprintData = async (data: any) => {
    // 创建新的标签页
    const tab = blueprintStore.createTab(data.name)
    tab.blueprint = { ...data.blueprint }
    
    // 合并节点定义
    data.nodeDefinitions.forEach((def: any) => {
      if (!blueprintStore.nodeDefinitions.find(d => d.id === def.id)) {
        blueprintStore.addNodeDefinition(def)
      }
    })
    
    if (showMessage && typeof showMessage === 'function') {
      showMessage({
        message: `蓝图 "${data.name}" 加载成功`,
        type: 'success',
        duration: 2000
      })
    }
  }

  // 导出TypeScript代码
  const exportTypeScript = async () => {
    const tab = activeTab.value
    if (!tab) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '没有可导出的蓝图',
          type: 'warning',
          duration: 2000
        })
      }
      return
    }

    try {
      const generator = new TypeScriptCodeGenerator(
        tab.blueprint,
        blueprintStore.nodeDefinitions
      )
      
      const filePath = await generator.downloadCode(`${tab.name}.ts`)
      
      if (filePath && showMessage && typeof showMessage === 'function') {
        showMessage({
          message: `蓝图 "${tab.name}" 的TypeScript代码已导出：${filePath}`,
          type: 'success',
          duration: 3000
        })
      } else if (!filePath && showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '导出已取消',
          type: 'info',
          duration: 2000
        })
      }
    } catch (error) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '导出TypeScript代码失败',
          type: 'error',
          duration: 3000
        })
      }
    }
  }

  // 新建蓝图
  const newBlueprint = () => {
    newBlueprintName.value = ''
    blueprintType.value = BlueprintType.COMPONENT
    showNewBlueprintDialog.value = true
  }
  
  // 确认新建蓝图
  const confirmNewBlueprint = () => {
    const name = newBlueprintName.value.trim()
    if (!name) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '请输入蓝图名称',
          type: 'warning',
          duration: 2000
        })
      }
      return
    }
    
    const tab = blueprintStore.createTab(name, blueprintType.value)
    showNewBlueprintDialog.value = false
    
    if (showMessage && typeof showMessage === 'function') {
      const typeText = blueprintType.value === BlueprintType.COMPONENT ? '组件蓝图' : '普通蓝图'
      showMessage({
        message: `已创建新${typeText} "${tab.name}"`,
        type: 'success',
        duration: 2000
      })
    }
  }
  
  // 取消新建蓝图
  const cancelNewBlueprint = () => {
    showNewBlueprintDialog.value = false
    newBlueprintName.value = ''
    blueprintType.value = BlueprintType.COMPONENT
  }

  // 返回的方法对象
  const methods: TabMethods = {
    newBlueprint,
    saveBlueprint,
    openBlueprint: loadBlueprint,
    exportTypeScript
  }

  return {
    // 响应式数据
    tabs,
    activeTabId,
    activeTab,
    
    // 文件选择对话框状态
    showFileSelectDialog,
    projectBlueprintFiles,
    selectedFileUuid,
    
    // 新建蓝图对话框状态
    showNewBlueprintDialog,
    newBlueprintName,
    blueprintType,
    
    // 方法
    selectTab,
    closeTab,
    methods,
    
    // 文件选择方法
    confirmSelectFile,
    cancelSelectFile,
    
    // 新建蓝图方法
    confirmNewBlueprint,
    cancelNewBlueprint,
    
    // 序列化方法
    newBlueprint,
    saveBlueprint,
    loadBlueprint,
    exportTypeScript
  }
} 