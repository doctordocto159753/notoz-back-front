import sanitizeHtml from 'sanitize-html'

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      's',
      'u',
      'blockquote',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'span',
      'div',
      'a',
      'img'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': ['style']
    },
    allowedSchemes: ['http', 'https', 'data', 'blob'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data', 'blob']
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noreferrer noopener', target: '_blank' })
    },
    // حذف event handlers و javascript: به صورت پیش‌فرض انجام می‌شود
    disallowedTagsMode: 'discard'
  })
}

export function stripHtmlToText(html: string): string {
  const cleaned = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
  return cleaned.replace(/\s+/g, ' ').trim()
}
