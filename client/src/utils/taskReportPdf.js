const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const COLORS = {
  ink: [0.13, 0.13, 0.18],
  muted: [0.42, 0.43, 0.5],
  purple: [0.24, 0.21, 0.77],
  pale: [0.96, 0.96, 0.99],
  white: [1, 1, 1],
  green: [0.18, 0.49, 0.2],
  blue: [0.08, 0.4, 0.75],
  orange: [0.9, 0.32, 0]
}

const windows1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f
}

const toPdfByte = character => {
  const code = character.codePointAt(0)
  if (code <= 0xff) return String.fromCharCode(code)
  if (windows1252[code]) return String.fromCharCode(windows1252[code])
  return '?'
}

const pdfText = value => Array.from(String(value || ''))
  .map(toPdfByte)
  .join('')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')
  .replace(/[\r\n]+/g, ' ')

const formatDate = value => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusLabel = value => String(value || 'not_started').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const richTextBlocks = html => {
  const source = String(html || '').trim()
  if (!source) return []
  if (!/<[a-z][\s\S]*>/i.test(source)) return source.split(/\n+/).filter(Boolean).map(text => ({ text }))

  const documentNode = new DOMParser().parseFromString(source, 'text/html')
  const blocks = []
  const visit = (node, depth = 0, listIndex = null) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = node.tagName
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text && !['BR', 'HR'].includes(tag)) return

    if (tag === 'DIV' && node.querySelector(':scope > p, :scope > div, :scope > ul, :scope > ol, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')) {
      Array.from(node.children).forEach(child => visit(child, depth, listIndex))
      return
    }

    if (/^H[1-6]$/.test(tag)) blocks.push({ text, size: tag === 'H1' ? 15 : tag === 'H2' ? 13 : 11, bold: true, spaceBefore: 5 })
    else if (tag === 'LI') blocks.push({ text: `${listIndex === null ? '•' : `${listIndex}.`} ${text}`, indent: 12 + depth * 10 })
    else if (tag === 'BLOCKQUOTE') blocks.push({ text, indent: 14, italic: true, color: COLORS.muted })
    else if (tag === 'PRE') blocks.push({ text, indent: 8, size: 8.5, color: COLORS.muted })
    else if (['P', 'DIV'].includes(tag) && !node.querySelector(':scope > p, :scope > div, :scope > ul, :scope > ol, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')) blocks.push({ text })
    else if (tag === 'UL' || tag === 'OL') {
      Array.from(node.children).forEach((child, index) => visit(child, depth + 1, tag === 'OL' ? index + 1 : null))
      return
    }

    if (!['LI', 'P', 'DIV', 'BLOCKQUOTE', 'PRE'].includes(tag) && !/^H[1-6]$/.test(tag)) {
      Array.from(node.children).forEach(child => visit(child, depth, listIndex))
    }
  }
  Array.from(documentNode.body.children).forEach(node => visit(node))
  return blocks.length ? blocks : [{ text: documentNode.body.textContent || '' }]
}

const wrapText = (text, width, fontSize) => {
  const maxCharacters = Math.max(12, Math.floor(width / (fontSize * 0.51)))
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  words.forEach(word => {
    if (word.length > maxCharacters) {
      if (line) lines.push(line)
      for (let index = 0; index < word.length; index += maxCharacters) lines.push(word.slice(index, index + maxCharacters))
      line = ''
    } else if (!line || `${line} ${word}`.length <= maxCharacters) line = line ? `${line} ${word}` : word
    else { lines.push(line); line = word }
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

const makeDocument = ({ internName, tasks, consolidated }) => {
  const pages = [[]]
  let pageIndex = 0
  let y = 48
  const page = () => pages[pageIndex]
  const command = value => page().push(value)
  const color = value => `${value.join(' ')} rg`

  const addPage = () => { pages.push([]); pageIndex += 1; y = 52 }
  const ensureSpace = height => { if (y + height > PAGE_HEIGHT - 54) addPage() }
  const text = (value, x, top, size = 10, bold = false, textColor = COLORS.ink) => {
    command(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color(textColor)} ${x} ${PAGE_HEIGHT - top} Td (${pdfText(value)}) Tj ET`)
  }
  const rectangle = (x, top, width, height, fill) => command(`${fill.join(' ')} rg ${x} ${PAGE_HEIGHT - top - height} ${width} ${height} re f`)
  const line = (x1, top1, x2, top2, stroke = [0.88, 0.88, 0.92]) => command(`${stroke.join(' ')} RG 0.7 w ${x1} ${PAGE_HEIGHT - top1} m ${x2} ${PAGE_HEIGHT - top2} l S`)
  const paragraph = (value, options = {}) => {
    const size = options.size || 9.5
    const indent = options.indent || 0
    const lineHeight = size * 1.42
    if (options.spaceBefore) y += options.spaceBefore
    const lines = wrapText(value, CONTENT_WIDTH - indent, size)
    lines.forEach(content => {
      ensureSpace(lineHeight + 2)
      text(content, MARGIN + indent, y, size, options.bold, options.color || COLORS.ink)
      y += lineHeight
    })
    y += options.spaceAfter ?? 3
  }

  rectangle(0, 0, PAGE_WIDTH, 106, COLORS.purple)
  text(consolidated ? 'INTERNSHIP PROGRESS REPORT' : 'TASK PROGRESS REPORT', MARGIN, 48, 19, true, COLORS.white)
  text(internName || 'Intern', MARGIN, 73, 11, false, COLORS.white)
  text(`Generated ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN - 145, 73, 9, false, COLORS.white)
  y = 134

  const completed = tasks.filter(task => task.status === 'completed').length
  rectangle(MARGIN, y, CONTENT_WIDTH, 52, COLORS.pale)
  text(`${tasks.length}`, MARGIN + 18, y + 21, 15, true, COLORS.purple)
  text(tasks.length === 1 ? 'Task included' : 'Tasks included', MARGIN + 18, y + 39, 8.5, false, COLORS.muted)
  text(`${completed}`, MARGIN + 165, y + 21, 15, true, COLORS.green)
  text('Completed', MARGIN + 165, y + 39, 8.5, false, COLORS.muted)
  text(`${tasks.reduce((sum, task) => sum + (task.notes?.length || 0), 0)}`, MARGIN + 310, y + 21, 15, true, COLORS.blue)
  text('Progress notes', MARGIN + 310, y + 39, 8.5, false, COLORS.muted)
  y += 78

  tasks.forEach((task, taskIndex) => {
    ensureSpace(110)
    if (taskIndex) { line(MARGIN, y, PAGE_WIDTH - MARGIN, y); y += 19 }
    text(`TASK ${taskIndex + 1}`, MARGIN, y, 8.5, true, COLORS.purple)
    y += 19
    paragraph(task.title || 'Untitled task', { size: 14, bold: true, spaceAfter: 7 })

    const statusColor = task.status === 'completed' ? COLORS.green : task.status === 'in_progress' ? COLORS.blue : COLORS.orange
    paragraph(`Status: ${statusLabel(task.status)}    Expected: ${formatDate(task.expected_date)}    Submitted: ${formatDate(task.submission_date)}`, { size: 8.5, color: statusColor, spaceAfter: 10 })

    if (task.description) {
      paragraph('ASSIGNED WORK / OBJECTIVE', { size: 8.5, bold: true, color: COLORS.muted, spaceAfter: 5 })
      richTextBlocks(task.description).forEach(block => paragraph(block.text, block))
      y += 4
    }

    if (task.subtasks?.length) {
      paragraph('WORK BREAKDOWN & PROGRESS', { size: 8.5, bold: true, color: COLORS.muted, spaceAfter: 5 })
      task.subtasks.forEach((subtask, index) => {
        const detail = `${index + 1}. ${subtask.title} — ${statusLabel(subtask.status)}${subtask.expected_date ? ` (Due ${formatDate(subtask.expected_date)})` : ''}`
        paragraph(detail, { size: 9, bold: subtask.status === 'completed', indent: 6, spaceAfter: 1 })
        if (subtask.description) paragraph(subtask.description, { size: 8.5, color: COLORS.muted, indent: 18, spaceAfter: 3 })
      })
      y += 5
    }

    paragraph('PROGRESS, RESEARCH & LEARNINGS', { size: 8.5, bold: true, color: COLORS.muted, spaceAfter: 5 })
    if (!task.notes?.length) paragraph('No progress notes were documented for this task.', { color: COLORS.muted })
    else task.notes.forEach((note, noteIndex) => {
      ensureSpace(45)
      rectangle(MARGIN, y - 4, CONTENT_WIDTH, 22, [0.98, 0.97, 0.9])
      text(`Update ${noteIndex + 1}  •  ${formatDate(note.updated_at || note.created_at)}`, MARGIN + 8, y + 10, 8.5, true, COLORS.muted)
      y += 27
      richTextBlocks(note.note).forEach(block => paragraph(block.text, block))
      y += 5
    })
    y += 10
  })

  pages.forEach((commands, index) => {
    commands.push(`0.55 0.55 0.62 RG 0.5 w ${MARGIN} 31 m ${PAGE_WIDTH - MARGIN} 31 l S`)
    commands.push(`BT /F1 8 Tf ${COLORS.muted.join(' ')} rg ${MARGIN} 18 Td (Internship Management System) Tj ET`)
    commands.push(`BT /F1 8 Tf ${COLORS.muted.join(' ')} rg ${PAGE_WIDTH - MARGIN - 58} 18 Td (Page ${index + 1} of ${pages.length}) Tj ET`)
  })
  return pages
}

const buildPdf = pages => {
  const objects = []
  const pageReferences = pages.map((_, index) => 6 + index * 2)
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageReferences.map(reference => `${reference} 0 R`).join(' ')}] >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'

  pages.forEach((commands, index) => {
    const contentReference = 5 + index * 2
    const pageReference = 6 + index * 2
    const stream = commands.join('\n')
    objects[contentReference] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    objects[pageReference] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentReference} 0 R >>`
  })

  let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets = [0]
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = output.length
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`
  }
  const xrefOffset = output.length
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let index = 1; index < objects.length; index += 1) output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Uint8Array(Array.from(output, character => character.charCodeAt(0) & 0xff))
}

const safeFilename = value => String(value || 'intern').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'intern'

export const downloadTaskReportPdf = ({ internName, tasks, consolidated = false }) => {
  const pages = makeDocument({ internName, tasks, consolidated })
  const blob = new Blob([buildPdf(pages)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = consolidated
    ? `${safeFilename(internName)}-internship-progress-report.pdf`
    : `${safeFilename(tasks[0]?.title)}-task-report.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
