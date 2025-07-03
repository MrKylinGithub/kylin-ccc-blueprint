# Kylin Cocos Creator Blueprint Editor Plugin
# Kylin Cocos Creator 蓝图编辑器插件

[English](#english) | [中文](#中文)

---

## English

### 🎯 Overview

A powerful visual node-based blueprint editor plugin for Cocos Creator, enabling developers to create logic flows through an intuitive drag-and-drop interface. Built with Vue 3, TypeScript, and modern web technologies.

### ✨ Features

- **🎨 Visual Node Editor**: Intuitive drag-and-drop interface for creating logic flows
- **🔗 Connection System**: Connect nodes with smooth Bézier curves and smart arrow indicators
- **📦 Node Management**: Create, edit, and delete custom node definitions
- **🎯 Real-time Preview**: Live drag preview with actual node appearance
- **📱 Responsive Design**: Adaptive layout for different screen sizes
- **🎪 Multiple Tabs**: Organize your blueprints with tabbed interface
- **🎨 Custom Styling**: Beautiful dark theme with smooth animations
- **⚡ High Performance**: Optimized rendering and interaction

### 🛠️ Technology Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **UI Framework**: Element Plus
- **State Management**: Pinia
- **Styling**: SCSS with CSS Variables
- **Build Tool**: Vite
- **Package Manager**: npm

### 🚀 Quick Start

#### Prerequisites
- Node.js 16+ 
- npm or yarn
- Cocos Creator 3.x

#### Installation

```bash
# Clone the repository
git clone https://github.com/MrKylinGithub/kylin-ccc-blueprint.git

# Navigate to project directory
cd kylin-ccc-blueprint

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

#### Integration with Cocos Creator

1. Build the plugin using `npm run build`
2. Copy the generated files to your Cocos Creator project's extensions folder
3. Enable the plugin in Cocos Creator's Extension Manager
4. Access the blueprint editor from the main menu

### 📁 Project Structure

```
kylin-ccc-blueprint/
├── src/
│   ├── common/              # Shared utilities and types
│   │   ├── styles/          # Global styles and variables
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── components/          # Reusable Vue components
│   │   └── base/            # Base UI components
│   ├── views/               # Main view components
│   │   ├── App/             # Main application
│   │   ├── BlueprintEditor/ # Blueprint canvas editor
│   │   ├── BlueprintTabs/   # Tab management
│   │   └── NodeManager/     # Node definition manager
│   ├── stores/              # Pinia state stores
│   ├── panels/              # Cocos Creator panel integration
│   └── main/                # Entry points
├── dist/                    # Build output
└── docs/                    # Documentation
```

### 🎮 Usage

1. **Creating Nodes**: Use the Node Manager to define custom node types with inputs/outputs
2. **Building Logic**: Drag nodes from the manager to the blueprint canvas
3. **Connecting Nodes**: Click and drag between node ports to create connections
4. **Managing Projects**: Use tabs to organize multiple blueprint files
5. **Exporting**: Build and integrate the generated logic into your Cocos Creator project

### 🔧 Development

#### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
```

#### Code Style

- Follow Vue 3 Composition API patterns
- Use TypeScript for type safety
- Maintain component modularity
- Follow SCSS naming conventions

### 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- Vue.js team for the amazing framework
- Element Plus for the UI components
- Cocos Creator team for the game engine
- All contributors who help improve this project

---

## 中文

### 🎯 项目概述

一个强大的Cocos Creator可视化节点蓝图编辑器插件，让开发者能够通过直观的拖拽界面创建逻辑流程。使用Vue 3、TypeScript和现代Web技术构建。

### ✨ 功能特性

- **🎨 可视化节点编辑器**: 直观的拖拽界面，轻松创建逻辑流程
- **🔗 连接系统**: 使用平滑贝塞尔曲线和智能箭头指示器连接节点
- **📦 节点管理**: 创建、编辑和删除自定义节点定义
- **🎯 实时预览**: 拖拽时显示真实节点外观的实时预览
- **📱 响应式设计**: 适配不同屏幕尺寸的自适应布局
- **🎪 多标签页**: 使用标签页界面组织您的蓝图
- **🎨 自定义样式**: 美观的深色主题和流畅动画
- **⚡ 高性能**: 优化的渲染和交互性能

### 🛠️ 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **UI框架**: Element Plus  
- **状态管理**: Pinia
- **样式**: SCSS + CSS变量
- **构建工具**: Vite
- **包管理**: npm

### 🚀 快速开始

#### 环境要求
- Node.js 16+
- npm 或 yarn
- Cocos Creator 3.x

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/MrKylinGithub/kylin-ccc-blueprint.git

# 进入项目目录
cd kylin-ccc-blueprint

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

#### 与Cocos Creator集成

1. 使用 `npm run build` 构建插件
2. 将生成的文件复制到Cocos Creator项目的extensions文件夹
3. 在Cocos Creator的扩展管理器中启用插件
4. 从主菜单访问蓝图编辑器

### 📁 项目结构

```
kylin-ccc-blueprint/
├── src/
│   ├── common/              # 共享工具和类型
│   │   ├── styles/          # 全局样式和变量
│   │   ├── types/           # TypeScript类型定义
│   │   └── utils/           # 工具函数
│   ├── components/          # 可复用Vue组件
│   │   └── base/            # 基础UI组件
│   ├── views/               # 主要视图组件
│   │   ├── App/             # 主应用程序
│   │   ├── BlueprintEditor/ # 蓝图画布编辑器
│   │   ├── BlueprintTabs/   # 标签页管理
│   │   └── NodeManager/     # 节点定义管理器
│   ├── stores/              # Pinia状态存储
│   ├── panels/              # Cocos Creator面板集成
│   └── main/                # 入口文件
├── dist/                    # 构建输出
└── docs/                    # 文档
```

### 🎮 使用方法

1. **创建节点**: 使用节点管理器定义带有输入/输出的自定义节点类型
2. **构建逻辑**: 从管理器拖拽节点到蓝图画布
3. **连接节点**: 点击并拖拽节点端口之间创建连接
4. **管理项目**: 使用标签页组织多个蓝图文件
5. **导出**: 构建并将生成的逻辑集成到您的Cocos Creator项目中

### 🔧 开发指南

#### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本  
npm run preview      # 预览生产构建
npm run type-check   # 运行TypeScript类型检查
```

#### 代码规范

- 遵循Vue 3 Composition API模式
- 使用TypeScript确保类型安全
- 保持组件模块化
- 遵循SCSS命名约定

### 🤝 贡献指南

欢迎贡献代码！请按照以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

### 🙏 致谢

- Vue.js团队提供的优秀框架
- Element Plus提供的UI组件
- Cocos Creator团队的游戏引擎
- 所有帮助改进此项目的贡献者
