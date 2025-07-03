<template>
  <div class="blueprint-editor">
    <!-- 信息栏 -->
    <div class="editor-info">
      <div class="info-content">
        <span>节点数量: {{ nodeCount }}</span>
        <span>连接数量: {{ connectionCount }}</span>
      </div>
    </div>

    <!-- 编辑器画布 -->
    <div
      ref="canvasRef"
      class="editor-canvas"
      @drop="onDrop"
      @dragover="onDragOver"
      @mousedown="onCanvasMouseDown"
      @mousemove="onCanvasMouseMove"
      @mouseup="onCanvasMouseUp"
      @contextmenu="onCanvasContextMenu"
      @dblclick="onCanvasDoubleClick"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 背景网格 -->
      <div class="canvas-grid"></div>

      <!-- 可变换的画布内容容器 -->
      <div 
        class="canvas-content" 
        :style="{
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`
        }"
      >
        <!-- 节点 -->
        <BlueprintNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :is-selected="selectedNodeId === node.id"
          :connected-ports="getNodeConnections(node.id)"
          @delete="deleteNode(node.id)"
          @move="moveNode(node.id, $event)"
          @select="selectNode(node.id)"
          @port-mouse-down="onPortMouseDown"
          @port-mouse-up="onPortMouseUp"
          @input-change="onNodeInputChange"
        />

        <!-- 连接线 -->
        <svg class="connections-svg" :style="{ width: '100%', height: '100%' }">
        <!-- SVG 标记定义 -->
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10" 
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
            viewBox="0 0 10 6"
          >
            <path
              d="M 0 0 L 0 6 L 9 3 z"
              fill="#cccccc"
            />
          </marker>
          <!-- 临时连接的箭头（蓝色） -->
          <marker
            id="arrowhead-temp"
            markerWidth="10"
            markerHeight="10" 
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
            viewBox="0 0 10 6"
          >
            <path
              d="M 0 0 L 0 6 L 9 3 z"
              fill="#409eff"
            />
          </marker>
        </defs>
        
        <!-- 现有连接 -->
        <g v-for="connection in connections" :key="connection.id">
          <!-- 连接线路径，使用 marker-end 自动添加箭头 -->
          <path
            :d="getConnectionPath(connection)"
            stroke="#cccccc"
            stroke-width="2"
            fill="none"
            class="connection-path"
            marker-end="url(#arrowhead)"
            @click="selectConnection(connection.id)"
          />
        </g>
        
        <!-- 正在创建的连接 -->
        <path
          v-if="tempConnection"
          :d="tempConnection.path"
          stroke="#409eff"
          stroke-width="2"
          fill="none"
          stroke-dasharray="5,5"
          class="temp-connection"
          marker-end="url(#arrowhead-temp)"
        />
      </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BlueprintNode from '../../panels/components/BlueprintNode.vue'
import { useBlueprintEditor } from './logic'
import type { Props } from './types'

const props = defineProps<Props>()

const {
  // 响应式引用
  canvasRef,
  selectedNodeId,
  tempConnection,
  canvasTransform,
  
  // 计算属性
  nodes,
  connections,
  nodeCount,
  connectionCount,
  
  // 方法
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
  deleteNode,
  moveNode,
  selectNode,
  onNodeInputChange,
  onPortMouseDown,
  onPortMouseUp,
  selectConnection,
  getConnectionPath
} = useBlueprintEditor(props)
</script>

<style scoped lang="scss">
@use './style.scss';
</style> 