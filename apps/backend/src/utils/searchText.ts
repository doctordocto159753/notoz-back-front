// استخراج متن ساده از ProseMirror/Tiptap JSON برای سرچ

export function extractTextFromProseMirrorJson(doc: any): string {
  const parts: string[] = []

  function walk(node: any) {
    if (!node) return

    if (typeof node === 'string') {
      parts.push(node)
      return
    }

    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
    }

    const content = node.content
    if (Array.isArray(content)) {
      for (const child of content) walk(child)
    }
  }

  walk(doc)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function makeSnippet(text: string, q: string, maxLen = 140): string {
  const query = q.trim()
  if (!query) return text.slice(0, maxLen)

  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text.slice(0, maxLen)

  const start = Math.max(0, idx - Math.floor(maxLen / 2))
  const end = Math.min(text.length, start + maxLen)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return prefix + text.slice(start, end) + suffix
}
