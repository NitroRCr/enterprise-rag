import { streamText, stepCountIs, type ModelMessage } from 'ai'
import { getModel } from 'src/utils/model'
import { makeTools } from 'src/utils/ai-tools'
import { SYSTEM_PROMPT } from 'src/utils/system-prompt'
import type { Message, ToolCallRecord } from 'src/utils/types'

export interface StreamOptions {
  modelName: string
  knowledgeBaseIds: string[]
  messages: ModelMessage[]
  assistant: Message
  onUpdate: () => void
  abortSignal: AbortSignal
}

/**
 * 运行 Agentic RAG 工具循环：streamText + 工具自动调用，逐步更新 assistant 消息。
 */
export async function streamAssistant(opts: StreamOptions) {
  const { assistant } = opts
  const result = streamText({
    model: getModel(opts.modelName),
    system: SYSTEM_PROMPT,
    messages: opts.messages,
    tools: makeTools(opts.knowledgeBaseIds),
    stopWhen: stepCountIs(8),
    abortSignal: opts.abortSignal
  })

  const toolMap = new Map<string, ToolCallRecord>()

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'text-delta':
        assistant.content += part.text
        opts.onUpdate()
        break
      case 'reasoning-delta':
        assistant.reasoning = (assistant.reasoning || '') + part.text
        opts.onUpdate()
        break
      case 'tool-call': {
        const rec: ToolCallRecord = {
          id: part.toolCallId,
          name: part.toolName,
          args: (part.input ?? {}) as Record<string, unknown>,
          status: 'calling'
        }
        toolMap.set(part.toolCallId, rec)
        assistant.toolCalls = [...(assistant.toolCalls || []), rec]
        opts.onUpdate()
        break
      }
      case 'tool-result': {
        const rec = toolMap.get(part.toolCallId)
        if (rec) {
          rec.status = 'completed'
          rec.result = part.output
          assistant.toolCalls = [...(assistant.toolCalls || [])]
          opts.onUpdate()
        }
        break
      }
      case 'tool-error': {
        const rec = toolMap.get(part.toolCallId)
        if (rec) {
          rec.status = 'failed'
          rec.error = String(part.error)
          assistant.toolCalls = [...(assistant.toolCalls || [])]
          opts.onUpdate()
        }
        break
      }
      case 'error':
        assistant.error = String((part.error as { message?: string })?.message || part.error)
        opts.onUpdate()
        break
    }
  }
}
