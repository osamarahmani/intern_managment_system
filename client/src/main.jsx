import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import '@fontsource-variable/caveat'
import '@fontsource-variable/doto'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/roboto'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
