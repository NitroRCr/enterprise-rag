import { eq } from 'drizzle-orm'
import { db } from './db'
import { globalSettings, knowledgeBase } from '../schema'
import { genId } from 'app/src-shared/utils/id'

const GLOBAL_ID = 'global'

/** 读取全局设置（不存在则创建空行） */
export async function getGlobalSettings() {
  let row = await db.select().from(globalSettings).where(eq(globalSettings.id, GLOBAL_ID)).get()
  if (!row) {
    row = { id: GLOBAL_ID, defaultModelName: null, defaultKnowledgeBaseId: null }
    await db.insert(globalSettings).values(row).onConflictDoNothing()
  }
  return row
}

export async function updateGlobalSettings(patch: Partial<{ defaultModelName: string | null; defaultKnowledgeBaseId: string | null }>) {
  await getGlobalSettings()
  await db.update(globalSettings).set(patch).where(eq(globalSettings.id, GLOBAL_ID))
}

/** 启动时初始化：全局设置行 + 默认知识库 */
export async function seed() {
  await getGlobalSettings()
  const kbCount = await db.$count(knowledgeBase)
  if (kbCount === 0) {
    const id = genId()
    await db.insert(knowledgeBase).values({
      id,
      name: '默认知识库',
      description: '系统初始化创建的默认知识库',
      isDefault: true,
      createdAt: Date.now()
    })
    await updateGlobalSettings({ defaultKnowledgeBaseId: id })
  }
}
