<template>
  <div ref="containerRef" class="blueprint-app">
    <!-- 左侧节点管理器 -->
    <div 
      v-if="state.showNodeManager" 
      class="node-manager-panel"
      :style="nodeManagerPanelStyle()"
    >
      <NodeManager />
    </div>
    
    <!-- 调整大小的分割线 -->
    <div 
      v-if="state.showNodeManager"
      :class="['resize-handle', { resizing: resizeState.isResizing }]"
      @mousedown="onResizeStart"
    />
    
    <!-- 右侧蓝图编辑区域 -->
    <div class="blueprint-editor-panel">
      <!-- 顶部工具栏 -->
      <div class="app-toolbar">
        <div class="toolbar-left">
          <!-- 切换节点管理器按钮 -->
          <el-button
            :type="state.showNodeManager ? 'primary' : 'default'"
            size="small"
            @click="toggleNodeManager"
          >
            <el-icon><Menu /></el-icon>
            {{ state.showNodeManager ? '隐藏' : '显示' }}节点管理器
          </el-button>
          
          <el-divider direction="vertical" />
          
          <!-- 蓝图操作按钮 -->
          <el-button size="small" @click="saveBlueprint">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          
          <el-button size="small" @click="openBlueprint">
            <el-icon><Upload /></el-icon>
            打开
          </el-button>
          
          <el-button size="small" @click="exportTypeScript">
            <el-icon><Download /></el-icon>
            导出TS
          </el-button>
        </div>
        
        <div class="toolbar-right">
          <span class="app-version">v1.0.0</span>
        </div>
      </div>
      
      <!-- 蓝图标签页 -->
      <div class="blueprint-tabs-container">
        <BlueprintTabs ref="blueprintTabsRef" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Menu, Document, Download, Upload } from '@element-plus/icons-vue'
import NodeManager from '../NodeManager/index.vue'
import BlueprintTabs from '../BlueprintTabs/index.vue'
import { useAppLogic } from './logic'

// 使用逻辑组合函数
const {
  state,
  refs: { containerRef, blueprintTabsRef },
  resizeState,
  onResizeStart,
  toggleNodeManager,
  saveBlueprint,
  openBlueprint,
  exportTypeScript,
  nodeManagerPanelStyle
} = useAppLogic()
</script>

<style scoped lang="scss">
@use './style.scss';
</style> 