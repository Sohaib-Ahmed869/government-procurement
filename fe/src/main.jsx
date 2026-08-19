import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/outfit'
import './index.css'
import App from './App.jsx'
import { stampInitialAudience } from './context/AudienceContext.jsx'

// Before the first render, so the loader and the header open in the visitor's
// own segment rather than re-colouring a frame in.
stampInitialAudience()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
