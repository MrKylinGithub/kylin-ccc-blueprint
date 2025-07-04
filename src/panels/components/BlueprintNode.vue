<template>
  <div
    class="blueprint-node"
    :class="{ selected: isSelected }"
    :style="{
      left: node.position.x + 'px',
      top: node.position.y + 'px',
      borderColor: definition?.color || '#666'
    }"
    @mousedown="onMouseDown"
    @contextmenu="onContextMenu"
  >
    <!-- 节点头部 -->
    <div class="node-header" :style="{ backgroundColor: definition?.color || '#666' }">
      <span class="node-title">{{ node.name }}</span>
      <el-button
        type="danger"
        size="small"
        text
        @click.stop="$emit('delete')"
        class="delete-btn"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 节点内容 -->
    <div class="node-content">
      <!-- 输入参数 -->
      <div class="node-inputs">
        <div
          v-for="input in definition?.inputs || []"
          :key="input.id"
          class="node-param input-param"
        >
          <!-- 连接槽 - 当noPort为true时不显示 -->
          <div
            v-if="!input.noPort"
            class="param-port"
            :class="{ 
              'exec-port': input.type === 'exec',
              'connected': connectedPorts?.inputs.has(input.id)
            }"
            :data-node-id="node.id"
            :data-port-type="'input'"
            :data-param-id="input.id"
            @mousedown.stop="onPortMouseDown($event, 'input', input.id)"
            @mouseup.stop="onPortMouseUp($event, 'input', input.id)"
          ></div>
          <span class="param-name">{{ input.name }}</span>
          
          <!-- 非执行流参数显示输入框 -->
          <div v-if="input.type !== 'exec'" class="param-value">
            <el-input
              v-if="input.type === 'string'"
              v-model="node.inputs[input.id]"
              size="small"
              :placeholder="input.defaultValue"
              @input="onInputChange"
            />
            <el-input-number
              v-else-if="input.type === 'number'"
              v-model="node.inputs[input.id]"
              size="small"
              :placeholder="input.defaultValue"
              @change="onInputChange"
            />
            <el-switch
              v-else-if="input.type === 'boolean'"
              v-model="node.inputs[input.id]"
              @change="onInputChange"
            />
            <el-select
              v-else-if="input.type === 'select'"
              v-model="node.inputs[input.id]"
              size="small"
              :placeholder="input.defaultValue"
              @change="onInputChange"
            >
              <el-option
                v-for="option in input.options || []"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
          </div>
        </div>
      </div>

      <!-- 常量节点的值设置 -->
      <div v-if="isConstantNode" class="constant-value">
        <div class="node-param constant-param">
          <span class="param-name">数值</span>
          <div class="param-value">
            <el-input
              v-if="node.definitionId === 'string_constant'"
              v-model="node.inputs.value"
              size="small"
              placeholder="输入字符串"
              @input="onInputChange"
            />
            <el-input-number
              v-else-if="node.definitionId === 'number_constant'"
              v-model="node.inputs.value"
              size="small"
              placeholder="输入数字"
              @change="onInputChange"
            />
            <el-switch
              v-else-if="node.definitionId === 'boolean_constant'"
              v-model="node.inputs.value"
              @change="onInputChange"
            />
          </div>
        </div>
      </div>

      <!-- 输出参数 -->
      <div class="node-outputs">
        <div
          v-for="output in definition?.outputs || []"
          :key="output.id"
          class="node-param output-param"
        >
          <span class="param-name">{{ output.name }}</span>
          <div
            class="param-port"
            :class="{ 
              'exec-port': output.type === 'exec',
              'connected': connectedPorts?.outputs.has(output.id)
            }"
            :data-node-id="node.id"
            :data-port-type="'output'"
            :data-param-id="output.id"
            @mousedown.stop="onPortMouseDown($event, 'output', output.id)"
            @mouseup.stop="onPortMouseUp($event, 'output', output.id)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Close } from '@element-plus/icons-vue';
import { blueprintStore } from '../../stores/blueprint';
import type { NodeInstance } from '../../types/blueprint';

interface Props {
  node: NodeInstance;
  isSelected?: boolean;
  connectedPorts?: {
    inputs: Set<string>;
    outputs: Set<string>;
  };
  canvasTransform?: {
    x: number;
    y: number;
    scale: number;
  };
}

interface Emits {
  (e: 'delete'): void;
  (e: 'move', position: { x: number; y: number }): void;
  (e: 'select'): void;
  (e: 'dragEnd'): void;
  (e: 'portMouseDown', event: MouseEvent, nodeId: string, portType: 'input' | 'output', paramId: string): void;
  (e: 'portMouseUp', event: MouseEvent, nodeId: string, portType: 'input' | 'output', paramId: string): void;
  (e: 'inputChange'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 获取节点定义
const definition = computed(() => {
  return blueprintStore.nodeDefinitions.find(d => d.id === props.node.definitionId);
});

let isDragging = false;
let dragStartMouse = { x: 0, y: 0 };
let dragStartPosition = { x: 0, y: 0 };

// 鼠标按下
const onMouseDown = (event: MouseEvent) => {
  emit('select');
  
  if (event.button === 0) { // 左键
    // 只有在节点主体（非按钮区域）上才启动拖拽
    const target = event.target as HTMLElement;
    
    // 检查是否点击了删除按钮（包括其内部元素）
    if (target.closest('.delete-btn') || 
        target.closest('.el-button') || 
        target.closest('.param-port') || 
        target.closest('.param-value') ||
        target.closest('.el-input') ||
        target.closest('.el-input-number') ||
        target.closest('.el-switch')) {
      // 点击的是删除按钮、端口或输入控件，不启动拖拽
      return;
    }
    
    event.stopPropagation(); // 只在启动拖拽时阻止事件传播
    isDragging = true;
    
    // 记录拖拽开始时的鼠标位置和节点位置
    dragStartMouse.x = event.clientX;
    dragStartMouse.y = event.clientY;
    dragStartPosition.x = props.node.position.x;
    dragStartPosition.y = props.node.position.y;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
};

// 鼠标移动
const onMouseMove = (event: MouseEvent) => {
  if (isDragging && props.canvasTransform) {
    // 计算鼠标移动的距离
    const mouseDeltaX = event.clientX - dragStartMouse.x;
    const mouseDeltaY = event.clientY - dragStartMouse.y;
    
    // 将屏幕像素距离转换为逻辑坐标距离（考虑缩放）
    const logicalDeltaX = mouseDeltaX / props.canvasTransform.scale;
    const logicalDeltaY = mouseDeltaY / props.canvasTransform.scale;
    
    // 计算新的节点位置
    const newPosition = {
      x: dragStartPosition.x + logicalDeltaX,
      y: dragStartPosition.y + logicalDeltaY
    };
    
    emit('move', newPosition);
  }
};

// 鼠标释放
const onMouseUp = () => {
  isDragging = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  
  // 拖拽结束时，触发一次额外的更新以确保连接线对齐
  emit('dragEnd');
};

// 右键菜单
const onContextMenu = (event: MouseEvent) => {
  // 可以在这里添加右键菜单逻辑
};

// 端口鼠标按下
const onPortMouseDown = (event: MouseEvent, portType: 'input' | 'output', paramId: string) => {
  emit('portMouseDown', event, props.node.id, portType, paramId);
};

// 端口鼠标释放
const onPortMouseUp = (event: MouseEvent, portType: 'input' | 'output', paramId: string) => {
  emit('portMouseUp', event, props.node.id, portType, paramId);
};

// 输入值变化
const onInputChange = () => {
  emit('inputChange');
};

// 判断是否为常量节点
const isConstantNode = computed(() => {
  return props.node.definitionId === 'string_constant' ||
         props.node.definitionId === 'number_constant' ||
         props.node.definitionId === 'boolean_constant';
});
</script>

<style scoped>
.blueprint-node {
  position: absolute;
  background: #4a4a4a;
  border: 2px solid #666;
  border-radius: 8px;
  min-width: 180px;
  max-width: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: move;
  user-select: none;
  z-index: 1;
  color: #ffffff;
}

.blueprint-node.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.4);
}

.node-header {
  padding: 8px 12px;
  color: white;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px 6px 0 0;
}

.node-title {
  flex: 1;
  font-size: 14px;
}

.delete-btn {
  padding: 0;
  width: 20px;
  height: 20px;
  color: white;
  opacity: 0.8;
}

.delete-btn:hover {
  opacity: 1;
}

.node-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-inputs,
.node-outputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-param {
  display: flex;
  align-items: center;
  min-height: 24px;
}

.input-param {
  justify-content: flex-start;
}

.output-param {
  justify-content: flex-end;
}

.param-port {
  width: 12px;
  height: 12px;
  border: 2px solid #888;
  border-radius: 50%;
  background: #2b2b2b;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.param-port:hover {
  border-color: #409eff;
  background: #409eff;
}

.param-port.connected {
  background: #409eff;
  border-color: #409eff;
}

.exec-port {
  border-radius: 2px;
  border-color: #4CAF50;
}

.exec-port:hover {
  border-color: #4CAF50;
  background: #4CAF50;
}

.exec-port.connected {
  background: #4CAF50;
  border-color: #4CAF50;
}

.param-name {
  font-size: 12px;
  color: #cccccc;
  margin: 0 8px;
  white-space: nowrap;
}

.param-value {
  flex: 1;
  max-width: 120px;
}

.param-value .el-input,
.param-value .el-input-number,
.param-value .el-select {
  width: 100%;
}

.param-value .el-input-number {
  width: 100%;
}

.param-value .el-switch {
  margin-left: auto;
}

/* 下拉选择器样式 */
.param-value .el-select .el-input__wrapper {
  background-color: #3a3a3a !important;
  border: 1px solid #555555 !important;
  box-shadow: none !important;
}

.param-value .el-select .el-input__wrapper:hover {
  border-color: #409eff !important;
}

.param-value .el-select .el-input__wrapper.is-focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.2) !important;
}

.param-value .el-select .el-input__inner {
  color: #cccccc !important;
  background-color: transparent !important;
}

.param-value .el-select .el-input__suffix {
  color: #888888 !important;
}

.param-value .el-select .el-input__suffix:hover {
  color: #409eff !important;
}

/* 下拉选项面板样式 */
:deep(.el-select-dropdown) {
  background-color: #3a3a3a !important;
  border: 1px solid #555555 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.el-select-dropdown .el-select-dropdown__item) {
  background-color: transparent !important;
  color: #cccccc !important;
}

:deep(.el-select-dropdown .el-select-dropdown__item:hover) {
  background-color: #525252 !important;
}

:deep(.el-select-dropdown .el-select-dropdown__item.selected) {
  background-color: #409eff !important;
  color: white !important;
}

/* 输入参数端口在左侧 */
.input-param .param-port {
  margin-right: 8px;
}

/* 输出参数端口在右侧 */
.output-param .param-port {
  margin-left: 8px;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .blueprint-node {
    min-width: 160px;
  }
  
  .node-header {
    padding: 6px 10px;
  }
  
  .node-title {
    font-size: 13px;
  }
  
  .node-content {
    padding: 10px;
  }
  
  .param-name {
    font-size: 11px;
  }
}

@media (max-width: 900px) {
  .blueprint-node {
    min-width: 140px;
  }
  
  .param-value {
    max-width: 100px;
  }
}

@media (max-width: 600px) {
  .blueprint-node {
    min-width: 120px;
  }
  
  .param-value {
    max-width: 80px;
  }
  
  .param-name {
    font-size: 10px;
  }
}

/* 常量节点样式 */
.constant-value {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.constant-param {
  display: flex;
  align-items: center;
  min-height: 24px;
  justify-content: space-between;
}

.constant-param .param-name {
  font-size: 12px;
  color: #cccccc;
  margin-right: 8px;
  white-space: nowrap;
}

.constant-param .param-value {
  flex: 1;
  max-width: 120px;
}
</style> 