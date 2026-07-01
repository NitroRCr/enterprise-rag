import { db } from './db'
import { callLog } from '../schema'
import { genId } from 'app/src-shared/utils/id'
import type { CallType } from 'app/src-shared/utils/types'

interface LogInput {
  type: CallType
  userId?: string | null
  modelName?: string | null
  knowledgeBaseIds?: string[] | null
  query?: string | null
  resultCount?: number | null
  durationMs: number
  success: boolean
}

/**
 * 写入调用日志。fire-and-forget：任何异常都被吞掉，绝不影响主链路。
 */
export function logCall(input: LogInput) {
  try {
    db.insert(callLog).values({
      id: genId(),
      type: input.type,
      userId: input.userId ?? null,
      modelName: input.modelName ?? null,
      knowledgeBaseIds: input.knowledgeBaseIds ? JSON.stringify(input.knowledgeBaseIds) : null,
      query: input.query ?? null,
      resultCount: input.resultCount ?? null,
      durationMs: Math.round(input.durationMs),
      success: input.success,
      createdAt: Date.now()
    }).run()
  } catch (err) {
    console.error('logCall failed:', err)
  }
}
