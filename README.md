# 企业知识库 RAG 问答系统

面向企业制度、产品手册、技术文档、售后文档等场景的知识库 RAG 问答系统。用户登录后选择一个或多个知识库与模型提问，系统通过 **BM25 全文搜索**从知识库检索相关文档，由大模型基于检索结果生成**带来源引用**的回答。

采用 **Agentic RAG** 架构：助手通过工具调用主动搜索知识库并获取文档全文，**不分片、不向量化**，全部检索在本地 SQLite（FTS5）完成。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 运行时 | Bun |
| 服务端 | Hono（`/api`）+ `@hono/zod-validator` + `hono/client`（类型安全 RPC） |
| 数据库 | drizzle-orm + `bun:sqlite` + SQLite（FTS5 全文搜索 / trigram 分词） |
| 鉴权 | better-auth（drizzle sqlite 适配器 + admin 插件 + 邮箱密码） |
| 前端 | Vue 3 + Quasar + UnoCSS（Material You 动态主题）+ Pinia |
| 本地存储 | dexie（IndexedDB，仅存对话/消息） |
| AI | Vercel AI SDK（`ai` + `@ai-sdk/openai-compatible`，客户端 `streamText` + `tool` 工具循环） |
| 文件解析 | mammoth(docx) / unpdf(pdf) / xlsx-republish(xlsx) / fflate(pptx) / md·txt 直读 |
| Markdown 渲染 | md-editor-v3（MdPreview） |

## 架构说明

- **客户端 Agentic RAG 循环**：浏览器用 AI SDK 发起多步工具循环，模型指向服务端 `/api/v1`（OpenAI 兼容代理）。
- **两个工具**：`search`（在所选知识库 FTS5 全文搜索，返回名称/高亮片段/链接/ID）、`get_documents`（按 ID 取完整内容）。
- **多 Provider 代理**：服务端按模型名查对应服务商，转发补全请求并流式透传 SSE；**API Key 仅存服务端，永不返回客户端**。
- **数据存储**：知识库/文档/服务商/模型/设置/鉴权存 SQLite；原文件存文件系统 `uploads/`；对话/消息存浏览器本地 dexie。
- **双应用**：用户端（front）与管理端（admin）两套独立构建，通过 `TARGET_APP` + `@routes` alias 切换。

## 目录结构

```
src-server/        服务端（Hono）
  index.ts         入口，挂载路由并导出 AppType
  auth/            better-auth 配置与 handler
  schema/          drizzle schema（业务表 + 鉴权表）
  routes/          knowledge-bases / documents / search / providers / models / settings / ai
  utils/           db(含 FTS5) / file-parser / auth-guard / seed / config
src-shared/        前后端共享类型与工具（id 生成、types）
src/               用户端（front）
  composables/     useChat / useStream / useSetTheme
  utils/           hc(RPC) / auth-client / model / ai-tools / db(dexie) / system-prompt
  pages/ layouts/ components/
src/admin/         管理端（admin）
```

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`（已提供默认开发配置），按需修改：

```bash
cp .env.example .env
```

| 变量 | 说明 |
| --- | --- |
| `SITE_NAME` | 站点名称 |
| `BETTER_AUTH_SECRET` | 鉴权密钥（生产务必替换） |
| `PORT` | 服务端端口（默认 3000） |
| `DB_PATH` | SQLite 数据库文件路径 |
| `UPLOAD_DIR` | 原文件存储目录 |

### 3. 启动（需开三个终端）

```bash
# 终端 1：服务端
bun run dev:server          # http://localhost:3000

# 终端 2：用户端
bun run dev:front           # http://localhost:9100

# 终端 3：管理端
bun run dev:admin           # http://localhost:9200
```

> 前端通过 Vite 代理将 `/api` 转发到服务端（`SERVER_URL`）。

### 4. 初始化使用流程

1. 打开**管理端** `http://localhost:9200`，注册账号并登录。
2. 首位登录用户可点击「领取管理员角色」成为管理员。
3. 在「服务商」添加一个 OpenAI 兼容服务商（Base URL + API Key）。
4. 在「模型」添加模型（模型名为上游真实名称，如 `gpt-4o-mini`），并设为默认。
5. 在「知识库」创建知识库并上传文档（支持 PDF/Word/Excel/PPT/Markdown/纯文本，可批量）。
6. 打开**用户端** `http://localhost:9100`，登录后选择知识库与模型即可开始提问。

系统启动时会自动创建一个「默认知识库」。

## 构建

```bash
bun run build:server        # 输出到 dist/server
bun run build:front         # 用户端静态资源
bun run build:admin         # 管理端静态资源
```

## 设计要点

- **FTS5 外部内容表 + 触发器**：`document` 表内容/名称通过触发器自动同步到 `document_fts`，使用 `bm25()` 排序、`snippet()` 生成高亮片段；trigram 分词器对中英文混合友好（不可用时自动降级 unicode61）。
- **引用溯源**：系统提示词要求助手对每个结论用 `[文档名](/doc/文档ID)` 标注来源，前端拦截这类链接跳转到文档页。
- **流式透传**：服务端将上游 SSE 直接透传，首字延迟低。
