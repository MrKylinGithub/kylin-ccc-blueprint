import { computed, ref, reactive, inject } from 'vue'
import { ElMessageBox, type FormInstance } from 'element-plus'
import { blueprintStore } from '../../stores/blueprint'
import { keyMessage } from '../../panels/provide-inject'
import { BlueprintSerializer, TypeScriptCodeGenerator } from '../../common/utils/blueprint-serializer'
import type { CreateFormData, CreateFormRules, TabMethods } from './types'

export const useBlueprintTabs = () => {
  // 注入插件环境专用的消息系统
  const showMessage = inject(keyMessage)

  // 响应式数据
  const tabs = computed(() => blueprintStore.tabs)
  const activeTabId = computed(() => blueprintStore.activeTabId)

  // 新建蓝图对话框相关
  const showCreateDialog = ref(false)
  const createForm = ref<FormInstance>()
  const createFormData = reactive<CreateFormData>({
    name: '',
    description: ''
  })

  const createFormRules: CreateFormRules = {
    name: [
      { required: true, message: '请输入蓝图名称', trigger: 'blur' },
      { min: 1, max: 50, message: '名称长度应在 1 到 50 个字符', trigger: 'blur' }
    ]
  }

  // 选择标签页
  const selectTab = (tabId: string) => {
    blueprintStore.activeTabId = tabId
  }

  // 显示创建对话框时重置表单
  const handleCreateDialogClose = (done: () => void) => {
    createFormData.name = ''
    createFormData.description = ''
    createForm.value?.clearValidate()
    done()
  }

  // 确认创建蓝图
  const confirmCreate = async () => {
    if (!createForm.value) return
    
    try {
      await createForm.value.validate()
      
      const tab = blueprintStore.createTab()
      tab.name = createFormData.name.trim()
      tab.blueprint.name = createFormData.name.trim()
      
      if (createFormData.description.trim()) {
        tab.blueprint.description = createFormData.description.trim()
      }
      
      showCreateDialog.value = false
      
      // 使用插件环境专用的消息系统
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: `蓝图 "${tab.name}" 创建成功`,
          type: 'success',
          duration: 3000
        })
      }
    } catch (error) {
      // 表单验证失败
    }
  }

  // 取消创建
  const cancelCreate = () => {
    showCreateDialog.value = false
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

  // 从文件加载蓝图
  const loadBlueprint = async () => {
    try {
      const data = await BlueprintSerializer.loadBlueprintFromFile()
      
      if (data) {
        // 创建新的标签页
        const tab = blueprintStore.createTab(data.name)
        tab.blueprint = { ...data.blueprint }
        
        // 合并节点定义
        data.nodeDefinitions.forEach(def => {
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
      } else if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '加载已取消',
          type: 'info',
          duration: 2000
        })
      }
    } catch (error) {
      if (showMessage && typeof showMessage === 'function') {
        showMessage({
          message: '加载蓝图失败，请检查文件格式',
          type: 'error',
          duration: 3000
        })
      }
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

  // 返回的方法对象
  const methods: TabMethods = {
    saveBlueprint,
    openBlueprint: loadBlueprint,
    exportTypeScript
  }

  return {
    // 响应式数据
    tabs,
    activeTabId,
    activeTab,
    showCreateDialog,
    createForm,
    createFormData,
    createFormRules,
    
    // 方法
    selectTab,
    handleCreateDialogClose,
    confirmCreate,
    cancelCreate,
    closeTab,
    methods,
    
    // 序列化方法
    saveBlueprint,
    loadBlueprint,
    exportTypeScript
  }
} 