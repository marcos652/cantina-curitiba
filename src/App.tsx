import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/Toaster'
import { useStore } from '@/store/useStore'
import { Home } from '@/pages/Home'
import { Sales } from '@/pages/Sales'
import { SalesHistory } from '@/pages/SalesHistory'
import { Stock } from '@/pages/Stock'
import { Movements } from '@/pages/Movements'
import { Expirations } from '@/pages/Expirations'
import { Cash } from '@/pages/Cash'
import { Reports } from '@/pages/Reports'
import { SettingsPage } from '@/pages/Settings'

export function App() {
  const storeName = useStore((s) => s.settings.storeName)

  useEffect(() => {
    document.title = storeName || 'Cantina'
  }, [storeName])

  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/vendas/historico" element={<SalesHistory />} />
          <Route path="/estoque" element={<Stock />} />
          <Route path="/estoque/movimentacoes" element={<Movements />} />
          <Route path="/vencimentos" element={<Expirations />} />
          <Route path="/caixa" element={<Cash />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </HashRouter>
  )
}
