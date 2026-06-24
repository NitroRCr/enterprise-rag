import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src-server/schema/index.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH || './data/app.db'
  }
})
