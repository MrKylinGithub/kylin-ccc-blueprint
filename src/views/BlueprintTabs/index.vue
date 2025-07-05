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
          <p>点击工具栏中的"打开"按钮来加载蓝图文件</p>
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
  
  // 方法
  selectTab,
  closeTab,
  methods,
  
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