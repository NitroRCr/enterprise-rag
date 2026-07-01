import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DB_PATH } from './config'
import * as schema from '../schema'

// 确保数据库目录存在
mkdirSync(dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH, { create: true })
sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')

export const db = drizzle(sqlite, { schema })

// ───────────── 业务表 + 鉴权表（CREATE TABLE IF NOT EXISTS）─────────────
const baseDDL = `
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS department (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_base_department (
  knowledge_base_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  PRIMARY KEY (knowledge_base_id, department_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_dept_dept ON knowledge_base_department(department_id);

CREATE TABLE IF NOT EXISTS document (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  ext TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_document_kb ON document(knowledge_base_id);

CREATE TABLE IF NOT EXISTS provider (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS model (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS global_settings (
  id TEXT PRIMARY KEY,
  default_model_name TEXT,
  default_knowledge_base_id TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  message_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  knowledge_base_ids TEXT NOT NULL DEFAULT '[]',
  model_name TEXT,
  rating INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS call_log (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  user_id TEXT,
  model_name TEXT,
  knowledge_base_ids TEXT,
  query TEXT,
  result_count INTEGER,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_call_log_created ON call_log(created_at);
CREATE INDEX IF NOT EXISTS idx_call_log_type ON call_log(type);

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  role TEXT,
  banned INTEGER,
  banReason TEXT,
  banExpires INTEGER
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  impersonatedBy TEXT
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauthApplication (
  id TEXT PRIMARY KEY,
  name TEXT,
  icon TEXT,
  metadata TEXT,
  clientId TEXT UNIQUE,
  clientSecret TEXT,
  redirectUrls TEXT,
  type TEXT,
  disabled INTEGER,
  userId TEXT,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS oauthAccessToken (
  id TEXT PRIMARY KEY,
  accessToken TEXT UNIQUE,
  refreshToken TEXT UNIQUE,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  clientId TEXT,
  userId TEXT,
  scopes TEXT,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS oauthConsent (
  id TEXT PRIMARY KEY,
  clientId TEXT,
  userId TEXT,
  scopes TEXT,
  consentGiven INTEGER,
  createdAt INTEGER,
  updatedAt INTEGER
);
`
sqlite.exec(baseDDL)

// ───────────── 增量列迁移（对已存在的库幂等添加新列）─────────────
function addColumnIfMissing(table: string, column: string, definition: string) {
  const cols = sqlite.query(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some(c => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}
addColumnIfMissing('user', 'departmentId', 'TEXT')

// ───────────── FTS5 全文搜索（外部内容表 + 触发器自动同步）─────────────
function createFts(tokenize: string) {
  sqlite.exec(`
CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(
  name, content,
  content='document', content_rowid='rowid',
  tokenize='${tokenize}'
);
CREATE TRIGGER IF NOT EXISTS document_ai AFTER INSERT ON document BEGIN
  INSERT INTO document_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
END;
CREATE TRIGGER IF NOT EXISTS document_ad AFTER DELETE ON document BEGIN
  INSERT INTO document_fts(document_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
END;
CREATE TRIGGER IF NOT EXISTS document_au AFTER UPDATE ON document BEGIN
  INSERT INTO document_fts(document_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
  INSERT INTO document_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
END;
`)
}

try {
  // trigram 对中英文混合搜索友好，且不依赖词边界
  createFts('trigram')
} catch (err) {
  console.error('FTS5 trigram tokenizer unavailable, falling back to unicode61:', err)
  createFts('unicode61')
}
