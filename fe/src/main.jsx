import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/outfit'
import './index.css'
import App from './App.jsx'
import { stampInitialAudience } from './context/AudienceContext.jsx'
import { startPageScale } from './lib/pageScale.js'

// Before the first render, so the loader and the header open in the visitor's
// own segment rather than re-colouring a frame in.
stampInitialAudience()

// Sets --gp-scale, which is what fills a wide screen. Before the first
// render so the page opens at its final size rather than resizing a frame in.
startPageScale()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
