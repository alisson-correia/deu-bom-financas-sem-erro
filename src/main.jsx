import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './appearance.css'
import { cleanupLegacyServiceWorkers } from './serviceWorkerCleanup.js'

cleanupLegacyServiceWorkers()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
