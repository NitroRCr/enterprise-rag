import { hc } from 'hono/client'
import type { AppType } from 'app/src-server'

// 同源（dev 经 quasar 代理 /api 到服务端），自动携带 better-auth Cookie
export const client = hc<AppType>('/', {
  init: { credentials: 'include' }
})

export const api = client.api

/** 统一处理响应：非 2xx 抛错，2xx 返回 json */
export async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`
    try {
      const data = await res.json() as { error?: string }
      if (data.error) msg = data.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}
