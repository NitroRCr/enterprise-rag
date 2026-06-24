import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

// baseURL 留空：使用当前源 + 默认 /api/auth（dev 经代理转发到服务端）
export const authClient = createAuthClient({
  plugins: [adminClient()]
})

export const { signIn, signUp, signOut, useSession } = authClient
