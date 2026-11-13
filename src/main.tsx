import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { useStore } from './store/useStore'
import './index.css'

// `?demo=1` carrega os dados de exemplo quando o sistema ainda está vazio (útil para demonstração e testes).
if (new URLSearchParams(window.location.search).get('demo') === '1' && useStore.getState().products.length === 0) {
  useStore.getState().loadDemoData()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
