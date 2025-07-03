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
          <p>点击工具栏中的"新建蓝图"开始创建你的第一个蓝图</p>
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

    <!-- 新建蓝图模态弹窗 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建蓝图"
      width="400px"
      :before-close="handleCreateDialogClose"
      center
    >
      <el-form 
        ref="createForm" 
        :model="createFormData" 
        :rules="createFormRules"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="蓝图名称" prop="name">
          <el-input
            v-model="createFormData.name"
            placeholder="请输入蓝图名称"
            maxlength="50"
            show-word-limit
            @keyup.enter="confirmCreate"
          />
        </el-form-item>
        <el-form-item label="蓝图描述" prop="description">
          <el-input
            v-model="createFormData.description"
            type="textarea"
            placeholder="可选：输入蓝图描述"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelCreate">取消</el-button>
          <el-button type="primary" @click="confirmCreate">
            创建蓝图
          </el-button>
        </span>
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
  methods
} = useBlueprintTabs()

// 暴露方法供父组件调用
defineExpose(methods)
</script>

<style scoped lang="scss">
@use './style.scss';
</style> 