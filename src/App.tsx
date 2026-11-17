import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/Toaster'
import { AuthGate } from '@/components/AuthGate'
import { useStore } from '@/store/useStore'
import { Home } from '@/pages/Home'
import { Sales } from '@/pages/Sales'
import { SalesHistory } from '@/pages/SalesHistory'
import { Fiados } from '@/pages/Fiados'
import { Stock } from '@/pages/Stock'
import { Movements } from '@/pages/Movements'
import { Expirations } from '@/pages/Expirations'
import { Cash } from '@/pages/Cash'
import { Reports } from '@/pages/Reports'
import { SettingsPage } from '@/pages/Settings'
import { Statement } from '@/pages/Statement'
import { SaleDetail } from '@/pages/SaleDetail'
import { Users } from '@/pages/Users'

export function App() {
  const storeName = useStore((s) => s.settings.storeName)

  useEffect(() => {
    document.title = storeName || 'Cantina'
  }, [storeName])

  return (
    <AuthGate>
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/vendas/historico" element={<SalesHistory />} />
          <Route path="/vendas/fiado" element={<Fiados />} />
          <Route path="/vendas/:id" element={<SaleDetail />} />
          <Route path="/estoque" element={<Stock />} />
          <Route path="/estoque/movimentacoes" element={<Movements />} />
          <Route path="/vencimentos" element={<Expirations />} />
          <Route path="/caixa" element={<Cash />} />
          <Route path="/extrato" element={<Statement />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/usuarios" element={<Users />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </HashRouter>
    </AuthGate>
  )
}
