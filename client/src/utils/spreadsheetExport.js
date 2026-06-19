const stripControlCharacters = value => Array.from(String(value ?? ''))
  .filter(character => {
    const code = character.charCodeAt(0)
    return code === 9 || code === 10 || code === 13 || code >= 32
  })
  .join('')

const escapeXml = value => stripControlCharacters(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const safeSheetName = value => Array.from(String(value)).filter(character => !'\\/?*[]:'.includes(character)).join('').slice(0, 31) || 'Sheet'

const worksheetXml = (name, rows) => {
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))]
  const tableRows = [headers, ...rows.map(row => headers.map(header => row[header]))]
  const xmlRows = tableRows.map((row, rowIndex) =>
    `<Row>${row.map(value => `<Cell${rowIndex === 0 ? ' ss:StyleID="Header"' : ''}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`
  ).join('')
  return `<Worksheet ss:Name="${escapeXml(safeSheetName(name))}"><Table>${xmlRows}</Table></Worksheet>`
}

export const downloadWorkbook = (sheets, fileName) => {
  const worksheets = Object.entries(sheets).map(([name, rows]) => worksheetXml(name, rows || [])).join('')
  const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E9E7FF" ss:Pattern="Solid"/></Style></Styles>
${worksheets}</Workbook>`
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.replace(/\.xlsx$/i, '.xls')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
