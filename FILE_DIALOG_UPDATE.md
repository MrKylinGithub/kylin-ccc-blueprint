# 文件对话框功能更新说明

## 📋 更新概述

将蓝图编辑器的文件保存/加载功能从浏览器下载模式升级为桌面应用的原生文件对话框模式。

## ⚡ 新功能特性

### 1. 原生文件保存对话框
- ✅ 用户可以选择具体的保存路径和文件名
- ✅ 支持JSON文件格式筛选
- ✅ 自动添加文件扩展名
- ✅ 显示保存成功的完整路径

### 2. 原生文件加载对话框
- ✅ 用户可以浏览并选择要打开的蓝图文件
- ✅ 支持JSON文件格式筛选
- ✅ 自动解析和验证文件格式

### 3. TypeScript代码导出对话框
- ✅ 用户可以选择代码文件的保存位置
- ✅ 支持TypeScript文件格式筛选
- ✅ 显示导出成功的完整路径

## 🔧 技术实现

### 环境检测
```typescript
const isElectron = () => {
  return typeof require !== 'undefined'
}
```

### 模块导入
```typescript
let fs = null
let path = null  
let dialog = null

if (isElectron()) {
  try {
    fs = require('fs')
    path = require('path')
    const { remote } = require('electron')
    dialog = remote ? remote.dialog : require('electron').dialog
  } catch (error) {
    console.warn('无法加载Node.js模块:', error)
  }
}
```

### 保存对话框
```typescript
const result = await dialog.showSaveDialog({
  title: '保存蓝图文件',
  defaultPath: filename || `${blueprint.name || 'blueprint'}.json`,
  filters: [
    { name: 'JSON文件', extensions: ['json'] },
    { name: '所有文件', extensions: ['*'] }
  ]
})

if (!result.canceled && result.filePath) {
  fs.writeFileSync(result.filePath, json, 'utf8')
  return result.filePath
}
```

### 打开对话框  
```typescript
const result = await dialog.showOpenDialog({
  title: '选择蓝图文件',
  filters: [
    { name: 'JSON文件', extensions: ['json'] },
    { name: '所有文件', extensions: ['*'] }
  ],
  properties: ['openFile']
})

if (!result.canceled && result.filePaths.length > 0) {
  const filePath = result.filePaths[0]
  const json = fs.readFileSync(filePath, 'utf8')
  return this.deserialize(json)
}
```

## 🔄 向后兼容

所有功能都保持向后兼容：

- **Electron环境**：使用原生文件对话框
- **浏览器环境**：自动回退到原有的下载/上传方式

```typescript
if (isElectron() && dialog && fs) {
  // 使用原生对话框
} else {
  // 回退到浏览器方式
}
```

## 🚀 用户体验改进

### 保存功能
- **之前**：文件自动下载到默认下载文件夹
- **现在**：用户可以选择任意保存位置，包括特定的项目文件夹

### 加载功能
- **之前**：需要手动导航到下载文件夹找文件
- **现在**：可以直接浏览到任意位置选择文件

### 用户反馈
- **保存成功**：显示完整的保存路径
- **取消操作**：友好的取消提示
- **错误处理**：详细的错误信息

## 📝 消息提示更新

### 保存成功
```
蓝图 "My Blueprint" 已保存到：/Users/username/Documents/my-blueprint.json
```

### 导出成功
```
蓝图 "My Blueprint" 的TypeScript代码已导出到：/Users/username/Desktop/my-blueprint.ts
```

### 操作取消
```
保存操作已取消
```

## 🔧 修改的文件

1. **src/common/utils/blueprint-serializer.ts**
   - 添加Electron环境检测
   - 修改`downloadBlueprint()`方法
   - 修改`loadBlueprintFromFile()`方法  
   - 修改`TypeScriptCodeGenerator.downloadCode()`方法

2. **src/views/BlueprintTabs/logic.ts**
   - 更新`saveBlueprint()`为async
   - 更新`exportTypeScript()`为async
   - 更新methods对象映射

## ✅ 测试状态

- ✅ 项目构建成功
- ✅ TypeScript类型检查通过
- ✅ 向后兼容性保持
- ✅ 错误处理完整

## 🎯 使用方式

1. **保存蓝图**：点击"保存"按钮 → 选择保存路径 → 输入文件名 → 保存
2. **加载蓝图**：点击"加载"按钮 → 浏览选择文件 → 打开
3. **导出代码**：点击"导出TS"按钮 → 选择保存路径 → 输入文件名 → 保存

现在你的桌面应用用户可以像使用其他桌面软件一样，自由选择文件的保存和加载位置了！ 