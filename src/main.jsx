import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'   // <-- must be here
import { ThemeProvider } from './theme/ThemeContext'

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)
