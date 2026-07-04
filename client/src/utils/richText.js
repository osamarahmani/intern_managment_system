const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'DIV', 'EM', 'H1', 'H2', 'H3',
  'H4', 'H5', 'H6', 'HR', 'I', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG',
  'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'U', 'UL'
])

const ALLOWED_STYLES = new Set([
  'background-color', 'color', 'font-family', 'font-size', 'font-style', 'font-weight',
  'letter-spacing', 'line-height', 'margin-left', 'padding-left', 'text-align',
  'text-decoration', 'white-space'
])

const unsafeCss = value => /url\s*\(|expression\s*\(|javascript:|@import|var\s*\(/i.test(value)

const cleanStyle = (source, target) => {
  for (const property of ALLOWED_STYLES) {
    const value = source.style.getPropertyValue(property).trim()
    if (value && !unsafeCss(value)) target.style.setProperty(property, value)
  }
}

const cleanUrl = value => {
  try {
    const url = new URL(value, window.location.origin)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? value : ''
  } catch {
    return ''
  }
}

const cleanNode = (node, outputDocument) => {
  if (node.nodeType === Node.TEXT_NODE) return outputDocument.createTextNode(node.textContent)
  if (node.nodeType !== Node.ELEMENT_NODE) return outputDocument.createDocumentFragment()

  const fragment = outputDocument.createDocumentFragment()
  if (!ALLOWED_TAGS.has(node.tagName)) {
    node.childNodes.forEach(child => fragment.appendChild(cleanNode(child, outputDocument)))
    return fragment
  }

  const element = outputDocument.createElement(node.tagName.toLowerCase())
  cleanStyle(node, element)

  if (node.tagName === 'A') {
    const href = cleanUrl(node.getAttribute('href') || '')
    if (href) {
      element.setAttribute('href', href)
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
    }
  }
  if (['TD', 'TH'].includes(node.tagName)) {
    for (const attribute of ['colspan', 'rowspan']) {
      const value = node.getAttribute(attribute)
      if (/^\d{1,2}$/.test(value || '')) element.setAttribute(attribute, value)
    }
  }

  node.childNodes.forEach(child => element.appendChild(cleanNode(child, outputDocument)))
  return element
}

export const plainTextToRichText = value => {
  const wrapper = document.createElement('div')
  String(value || '').split(/\n{2,}/).forEach(block => {
    const paragraph = document.createElement('p')
    const lines = block.split('\n')
    lines.forEach((line, index) => {
      if (index) paragraph.appendChild(document.createElement('br'))
      paragraph.appendChild(document.createTextNode(line))
    })
    wrapper.appendChild(paragraph)
  })
  return wrapper.innerHTML
}

export const sanitizeRichText = value => {
  const sourceValue = String(value || '')
  if (!sourceValue.trim()) return ''
  if (!/<[a-z][\s\S]*>/i.test(sourceValue)) return plainTextToRichText(sourceValue)

  const source = new DOMParser().parseFromString(sourceValue, 'text/html')
  const output = document.implementation.createHTMLDocument('')
  const wrapper = output.createElement('div')
  source.body.childNodes.forEach(node => wrapper.appendChild(cleanNode(node, output)))
  return wrapper.innerHTML
}

export const isRichTextEmpty = value => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = sanitizeRichText(value)
  return !(wrapper.textContent || '').replace(/\u00a0/g, ' ').trim() && !wrapper.querySelector('img, table, hr')
}
