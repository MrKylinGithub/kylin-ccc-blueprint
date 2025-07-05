// Electron 渲染进程中可能存在的全局对象类型定义

interface ElectronAPI {
  saveFile?: (options: {
    title: string
    defaultPath: string
    filters: { name: string; extensions: string[] }[]
    content: string
  }) => Promise<{ canceled: boolean; filePath?: string }>

  loadFile?: (options: {
    title: string
    filters: { name: string; extensions: string[] }[]
    properties: string[]
  }) => Promise<{ canceled: boolean; content?: string }>
}

interface ElectronIPCRenderer {
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

interface ElectronGlobal {
  ipcRenderer?: ElectronIPCRenderer
}

// Cocos Creator Editor API 类型定义
interface EditorMessage {
  request: (system: string, command: string, ...args: any[]) => Promise<any>
}

interface CocosCreatorEditor {
  Message: EditorMessage
}

declare global {
  interface Window {
    process?: {
      versions?: {
        electron?: string
      }
    }
    electronAPI?: ElectronAPI
    electron?: ElectronGlobal
    Editor?: CocosCreatorEditor
  }
}

export {} 