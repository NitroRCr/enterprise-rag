export const SITE_NAME = process.env.SITE_NAME || '企业知识库'
export const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me'
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`
export const FRONT_URL = process.env.FRONT_URL || 'http://localhost:9100'
export const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:9200'
export const DB_PATH = process.env.DB_PATH || './data/app.db'
export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
