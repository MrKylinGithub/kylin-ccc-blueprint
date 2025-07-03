<template>
  <div class="node-manager">
    <div class="node-manager-header">
      <h3>节点管理器</h3>
      <el-button type="primary" size="small" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        创建节点
      </el-button>
    </div>

    <div class="node-categories">
      <div v-for="category in categories" :key="category" class="category-section">
        <h4 class="category-title">{{ category }}</h4>
        <div class="node-list">
          <div
            v-for="node in getNodesByCategory(category)"
            :key="node.id"
            class="node-item"
            draggable="true"
            @dragstart="onDragStart($event, node)"
            @click="editNode(node)"
          >
            <div class="node-color" :style="{ backgroundColor: node.color || '#666' }"></div>
            <div class="node-info">
              <div class="node-name">{{ node.name }}</div>
              <div class="node-description">{{ node.description || '无描述' }}</div>
            </div>
            <el-button type="danger" size="small" text @click.stop="deleteNode(node.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的拖拽预览节点 -->
    <div class="drag-preview-container" ref="dragPreviewContainer">
      <BlueprintNode
        ref="dragPreviewRef"
        :node="dragPreviewNode || {
          id: 'placeholder',
          definitionId: 'number_constant',
          name: '占位符',
          position: { x: 0, y: 0 },
          inputs: {},
          outputs: {}
        }"
        :is-selected="false"
        :connected-ports="{ inputs: new Set(), outputs: new Set() }"
        @delete="() => {}"
        @move="() => {}"
        @select="() => {}"
        @port-mouse-down="() => {}"
        @port-mouse-up="() => {}"
        @input-change="() => {}"
      />
    </div>

    <!-- 创建/编辑节点对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingNode ? '编辑节点' : '创建节点'"
      width="60%"
      @close="resetForm"
    >
      <el-form :model="nodeForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="nodeForm.name" placeholder="节点名称" />
        </el-form-item>
        
        <el-form-item label="分类">
          <el-input v-model="nodeForm.category" placeholder="节点分类" />
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input v-model="nodeForm.description" type="textarea" placeholder="节点描述" />
        </el-form-item>
        
        <el-form-item label="颜色">
          <el-color-picker v-model="nodeForm.color" />
        </el-form-item>

        <el-form-item label="输入参数">
          <div class="param-list">
            <div v-for="(input, index) in nodeForm.inputs" :key="index" class="param-item">
              <el-input v-model="input.name" placeholder="参数名" size="small" />
              <el-select v-model="input.type" placeholder="类型" size="small">
                <el-option label="执行流" value="exec" />
                <el-option label="字符串" value="string" />
                <el-option label="数字" value="number" />
                <el-option label="布尔值" value="boolean" />
                <el-option label="对象" value="object" />
              </el-select>
              <el-input v-model="input.description" placeholder="描述" size="small" />
              <el-button type="danger" size="small" @click="removeInput(index)">删除</el-button>
            </div>
            <el-button type="primary" size="small" @click="addInput">添加输入</el-button>
          </div>
        </el-form-item>

        <el-form-item label="输出参数">
          <div class="param-list">
            <div v-for="(output, index) in nodeForm.outputs" :key="index" class="param-item">
              <el-input v-model="output.name" placeholder="参数名" size="small" />
              <el-select v-model="output.type" placeholder="类型" size="small">
                <el-option label="执行流" value="exec" />
                <el-option label="字符串" value="string" />
                <el-option label="数字" value="number" />
                <el-option label="布尔值" value="boolean" />
                <el-option label="对象" value="object" />
              </el-select>
              <el-input v-model="output.description" placeholder="描述" size="small" />
              <el-button type="danger" size="small" @click="removeOutput(index)">删除</el-button>
            </div>
            <el-button type="primary" size="small" @click="addOutput">添加输出</el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeCreateDialog">取消</el-button>
        <el-button type="primary" @click="saveNode">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, Delete } from '@element-plus/icons-vue'
import BlueprintNode from '../../panels/components/BlueprintNode.vue'
import { useNodeManager } from './logic'

const {
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
} = useNodeManager()
</script>

<style scoped lang="scss">
@use './style.scss';
</style> 