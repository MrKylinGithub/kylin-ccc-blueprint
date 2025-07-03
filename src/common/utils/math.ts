import type { Position } from '../types'

// ============ 数学工具函数 ============

/**
 * 计算两点之间的距离
 */
export function distance(p1: Position, p2: Position): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 计算两点之间的角度（弧度）
 */
export function angle(p1: Position, p2: Position): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

/**
 * 将角度从弧度转换为度数
 */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI)
}

/**
 * 将角度从度数转换为弧度
 */
export function degToRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * 线性插值
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * 位置插值
 */
export function lerpPosition(start: Position, end: Position, t: number): Position {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t)
  }
}

/**
 * 规范化值到0-1范围
 */
export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min)
}

/**
 * 检查点是否在矩形内
 */
export function pointInRect(point: Position, rect: { x: number, y: number, width: number, height: number }): boolean {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width && 
         point.y >= rect.y && 
         point.y <= rect.y + rect.height
}

/**
 * 生成贝塞尔曲线路径
 */
export function createBezierPath(start: Position, end: Position, curvature = 0.3): string {
  const dx = Math.abs(end.x - start.x)
  const offset = dx * curvature
  
  const cp1x = start.x + offset
  const cp1y = start.y
  const cp2x = end.x - offset
  const cp2y = end.y
  
  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`
}

/**
 * 获取随机数
 */
export function random(min = 0, max = 1): number {
  return Math.random() * (max - min) + min
}

/**
 * 获取随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1))
} 