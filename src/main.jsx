import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'   // <-- must be here

createRoot(document.getElementById('root')).render(<App />)
