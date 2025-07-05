<template>
  <div class="blueprint-tabs">
    <!-- 标签页头部 -->
    <div class="tabs-header">
      <div class="tabs-nav">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-item', { active: tab.id === activeTabId }]"
          @click="selectTab(tab.id)"
        >
          <el-icon class="tab-icon">
            <Document />
          </el-icon>
          <span class="tab-title">{{ tab.name }}</span>
          <span v-if="tab.isDirty" class="tab-dirty">●</span>
          <el-button
            class="tab-close"
            text
            size="small"
            @click.stop="closeTab(tab.id)"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
      

    </div>

    <!-- 标签页内容 -->
    <div class="tabs-content">
      <div v-if="tabs.length === 0" class="empty-state">
        <div class="empty-content">
          <el-icon size="48" color="#cccccc">
            <Document />
          </el-icon>
          <h3>暂无蓝图</h3>
          <p>点击工具栏中的"新建"按钮创建新蓝图，或点击"打开"按钮加载已有蓝图文件</p>
        </div>
      </div>
      
      <div
        v-for="tab in tabs"
        :key="tab.id"
        v-show="tab.id === activeTabId"
        class="tab-content"
      >
        <BlueprintEditor :blueprint="tab.blueprint" />
      </div>
    </div>
    
    <!-- 新建蓝图对话框 -->
    <el-dialog
      v-model="showNewBlueprintDialog"
      title="新建蓝图"
      width="400px"
      :before-close="cancelNewBlueprint"
      center
    >
      <div style="padding: 20px 0;">
        <p style="margin-bottom: 16px; color: #666;">
          请输入新蓝图的名称：
        </p>
        
        <el-input
          v-model="newBlueprintName"
          placeholder="请输入蓝图名称"
          maxlength="50"
          show-word-limit
          @keyup.enter="confirmNewBlueprint"
        />
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelNewBlueprint">取消</el-button>
          <el-button 
            type="primary" 
            @click="confirmNewBlueprint"
          >
            创建蓝图
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 蓝图文件选择对话框 -->
    <el-dialog
      v-model="showFileSelectDialog"
      title="选择蓝图文件"
      width="60%"
      :before-close="cancelSelectFile"
      center
      class="file-select-dialog"
    >
      <div v-if="projectBlueprintFiles.length > 0">
        <!-- 可滚动的文件列表容器 -->
        <div class="file-list-container">
          <el-radio-group v-model="selectedFileUuid" class="file-list">
            <div
              v-for="file in projectBlueprintFiles"
              :key="file.uuid"
              class="file-list-item"
            >
              <el-radio
                :value="file.uuid"
                class="file-radio"
              >
                <div class="file-info">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-path">{{ file.url }}</span>
                </div>
              </el-radio>
            </div>
          </el-radio-group>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>项目中没有找到蓝图文件</p>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelSelectFile">取消</el-button>
          <el-button 
            v-if="projectBlueprintFiles.length > 0"
            type="primary" 
            @click="confirmSelectFile"
          >
            打开选中文件
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Close, Document } from '@element-plus/icons-vue'
import BlueprintEditor from '../BlueprintEditor/index.vue'
import { useBlueprintTabs } from './logic'

const {
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
  saveBlueprint,
  loadBlueprint,
  exportTypeScript
} = useBlueprintTabs()

// 暴露方法供父组件调用
defineExpose(methods)
</script>

<style scoped lang="scss">
@use './style.scss';
</style> 