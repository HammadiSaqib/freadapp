import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { consumeCrossSubdomainAuthTransfer } from './lib/authStorage'
import { installUsDateLocaleDefaults } from './lib/installUsDateLocaleDefaults'

installUsDateLocaleDefaults()
consumeCrossSubdomainAuthTransfer()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)