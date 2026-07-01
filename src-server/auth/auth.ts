import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, mcp } from 'better-auth/plugins'
import { db } from '../utils/db'
import { user, session, account, verification, oauthApplication, oauthAccessToken, oauthConsent } from '../schema/auth'
import { SITE_NAME, SERVER_URL, FRONT_URL, ADMIN_URL, BETTER_AUTH_SECRET } from '../utils/config'
import { genId } from 'app/src-shared/utils/id'

export const auth = betterAuth({
  appName: SITE_NAME,
  baseURL: SERVER_URL,
  secret: BETTER_AUTH_SECRET,
  trustedOrigins: [FRONT_URL, ADMIN_URL],
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: { user, session, account, verification, oauthApplication, oauthAccessToken, oauthConsent }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: password => Bun.password.hash(password, {
        algorithm: 'argon2id',
        memoryCost: 20480,
        timeCost: 2
      }),
      verify: ({ password, hash }) => Bun.password.verify(password, hash)
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300
    }
  },
  plugins: [
    admin(),
    // MCP OAuth（动态客户端注册 + 授权码），loginPage 指向用户端登录页
    mcp({ loginPage: `${FRONT_URL}/auth` })
  ],
  advanced: {
    database: {
      generateId: () => genId()
    }
  }
})

export type Session = typeof auth.$Infer.Session
