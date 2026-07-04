import { sanitizeRichText } from '../utils/richText'
import './RichTextEditor.css'

export default function RichTextContent({ value, className = '' }) {
  return <div className={`rich-text-content ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />
}
