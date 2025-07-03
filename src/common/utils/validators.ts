// ============ 验证工具函数 ============

/**
 * 验证是否为有效的数字
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

/**
 * 验证是否为有效的字符串
 */
export function isValidString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 验证是否为有效的邮箱
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证是否为有效的URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证是否为有效的颜色值（hex）
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexRegex.test(color)
}

/**
 * 验证节点ID格式
 */
export function isValidNodeId(id: string): boolean {
  return isValidString(id) && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(id)
}

/**
 * 验证是否为有效的JSON字符串
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString)
    return true
  } catch {
    return false
  }
}

/**
 * 验证文件名是否合法
 */
export function isValidFileName(fileName: string): boolean {
  if (!isValidString(fileName)) return false
  
  // 检查非法字符
  const invalidChars = /[<>:"/\\|?*]/
  return !invalidChars.test(fileName)
}

/**
 * 验证数值范围
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isValidNumber(value) && value >= min && value <= max
}

/**
 * 验证字符串长度
 */
export function isValidLength(str: string, minLength: number, maxLength: number): boolean {
  return isValidString(str) && str.length >= minLength && str.length <= maxLength
}

/**
 * 验证是否为纯对象
 */
export function isPlainObject(obj: any): obj is Record<string, any> {
  return obj !== null && 
         typeof obj === 'object' && 
         obj.constructor === Object &&
         Object.prototype.toString.call(obj) === '[object Object]'
}

/**
 * 验证数组是否非空
 */
export function isNonEmptyArray<T>(arr: any): arr is T[] {
  return Array.isArray(arr) && arr.length > 0
}

/**
 * 验证是否为函数
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function'
} 