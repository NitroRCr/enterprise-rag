import { eq } from 'drizzle-orm'
import { db } from './db'
import { knowledgeBaseDepartment, user } from '../schema'
import type { AuthUser } from './auth-guard'

/** 是否管理员 */
export function isAdmin(u: AuthUser) {
  return u.role === 'admin'
}

/** 查询用户所属部门 id（不存在返回 null） */
export function getUserDepartmentId(userId: string): string | null {
  const row = db.select({ departmentId: user.departmentId }).from(user).where(eq(user.id, userId)).get()
  return row?.departmentId ?? null
}

/** 某部门关联的知识库 id 列表 */
export function getDepartmentKbIds(departmentId: string): string[] {
  const rows = db
    .select({ id: knowledgeBaseDepartment.knowledgeBaseId })
    .from(knowledgeBaseDepartment)
    .where(eq(knowledgeBaseDepartment.departmentId, departmentId))
    .all()
  return rows.map(r => r.id)
}

/** 按用户 id 计算其所属部门关联的知识库 id 列表（无部门则为空数组，不区分管理员） */
export function getUserKbIds(userId: string): string[] {
  const departmentId = getUserDepartmentId(userId)
  if (!departmentId) return []
  return getDepartmentKbIds(departmentId)
}

/**
 * 计算某用户可见的知识库 id 集合。
 * - 管理员：返回 null（表示不受限，可见全部）
 * - 普通用户：返回其所属部门关联的 KB id 数组（无部门则为空数组）
 */
export function getVisibleKbIds(u: AuthUser): string[] | null {
  if (isAdmin(u)) return null
  return getUserKbIds(u.id)
}
