import { unzipSync, strFromU8 } from 'fflate'
import { getExt } from 'app/src-shared/utils/functions'

export interface ParseResult {
  content: string
  /** markdown | html | text */
  language: string
}

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf'
}

async function parseDocx(buf: ArrayBuffer): Promise<ParseResult> {
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(buf) })
  return { content: result.value, language: 'html' }
}

function rowsToMarkdown(rows: unknown[][]) {
  if (!rows.length) return ''
  const head = rows[0].map(c => (c == null ? '' : String(c)))
  const body = rows.slice(1).map(r => r.map(c => (c == null ? '' : String(c))))
  const headerLine = '| ' + head.join(' | ') + ' |'
  const sepLine = '| ' + head.map(() => '---').join(' | ') + ' |'
  const bodyLines = body.map(r => '| ' + r.join(' | ') + ' |')
  return [headerLine, sepLine].concat(bodyLines).join('\n')
}

async function parseXlsx(buf: ArrayBuffer): Promise<ParseResult> {
  const { read, utils } = await import('xlsx-republish')
  const workbook = read(new Uint8Array(buf))
  const content = workbook.SheetNames.map(name => {
    const rows = utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1 })
    return `## ${name}\n\n${rowsToMarkdown(rows)}`
  }).join('\n\n')
  return { content, language: 'markdown' }
}

function parsePptx(buf: ArrayBuffer): ParseResult {
  const files = unzipSync(new Uint8Array(buf))
  const slideNames = Object.keys(files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => parseInt(a.match(/\d+/)?.[0] ?? '0') - parseInt(b.match(/\d+/)?.[0] ?? '0'))

  const slides = slideNames.map((name, i) => {
    const xml = strFromU8(files[name])
    // 服务端无 DOMParser，使用正则提取 <a:t> 文本节点
    const texts = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)).map(m =>
      m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    )
    return `## 幻灯片 ${i + 1}\n\n${texts.join('\n')}`
  })
  return { content: slides.join('\n\n'), language: 'markdown' }
}

async function parsePdf(buf: ArrayBuffer): Promise<ParseResult> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const { text } = await extractText(pdf, { mergePages: true })
  return { content: typeof text === 'string' ? text : (text as string[]).join('\n\n'), language: 'text' }
}

/**
 * 将上传文件解析为文本/markdown 内容。
 */
export async function parseFile(filename: string, mimeType: string, buf: ArrayBuffer): Promise<ParseResult> {
  const ext = getExt(filename)
  const type = mimeType || ''

  if (type === MIME.docx || ext === 'docx') return await parseDocx(buf)
  if (type === MIME.xlsx || ext === 'xlsx' || ext === 'xls') return await parseXlsx(buf)
  if (type === MIME.pptx || ext === 'pptx') return parsePptx(buf)
  if (type === MIME.pdf || ext === 'pdf') return await parsePdf(buf)

  // md / markdown / txt / 其它纯文本
  const content = new TextDecoder('utf-8').decode(buf)
  const language = ext === 'md' || ext === 'markdown' ? 'markdown' : 'text'
  return { content, language }
}
