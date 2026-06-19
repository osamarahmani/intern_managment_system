import { useEffect, useRef } from 'react'
import { sanitizeRichText, plainTextToRichText } from '../utils/richText'
import './RichTextEditor.css'

const command = (name, value = null) => {
  document.execCommand(name, false, value)
}

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write a note…', disabled = false }) {
  const editorRef = useRef(null)

  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.innerHTML !== value) editor.innerHTML = value || ''
  }, [value])

  const emitChange = () => onChange(sanitizeRichText(editorRef.current?.innerHTML || ''))

  const apply = (name, commandValue = null) => {
    editorRef.current?.focus()
    command(name, commandValue)
    emitChange()
  }

  const handlePaste = event => {
    event.preventDefault()
    const clipboard = event.clipboardData
    const html = clipboard.getData('text/html')
    const text = clipboard.getData('text/plain')
    const safeHtml = html ? sanitizeRichText(html) : plainTextToRichText(text)
    command('insertHTML', safeHtml)
    emitChange()
  }

  return (
    <div className={`rich-editor ${disabled ? 'rich-editor--disabled' : ''}`} onClick={event => event.stopPropagation()}>
      <div className="rich-editor__toolbar" role="toolbar" aria-label="Note formatting">
        <select aria-label="Text style" defaultValue="p" onChange={event => apply('formatBlock', event.target.value)} disabled={disabled}>
          <option value="p">Paragraph</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="blockquote">Quote</option>
        </select>
        <button type="button" onClick={() => apply('bold')} disabled={disabled} aria-label="Bold"><strong>B</strong></button>
        <button type="button" onClick={() => apply('italic')} disabled={disabled} aria-label="Italic"><em>I</em></button>
        <button type="button" onClick={() => apply('underline')} disabled={disabled} aria-label="Underline"><u>U</u></button>
        <span className="rich-editor__divider" />
        <button type="button" onClick={() => apply('insertUnorderedList')} disabled={disabled} aria-label="Bulleted list">• List</button>
        <button type="button" onClick={() => apply('insertOrderedList')} disabled={disabled} aria-label="Numbered list">1. List</button>
        <button type="button" onClick={() => apply('outdent')} disabled={disabled} aria-label="Decrease indent">←</button>
        <button type="button" onClick={() => apply('indent')} disabled={disabled} aria-label="Increase indent">→</button>
      </div>
      <div
        ref={editorRef}
        className="rich-editor__content"
        contentEditable={!disabled}
        data-placeholder={placeholder}
        onInput={emitChange}
        onPaste={handlePaste}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
      />
    </div>
  )
}
