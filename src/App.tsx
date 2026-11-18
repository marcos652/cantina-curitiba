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
import { Customers } from '@/pages/Customers'
import { Access, Contracts } from '@/pages/Access'
import { CustomerDetail } from '@/pages/CustomerDetail'
import { CustomerArea } from '@/pages/MyCard'
import { useSession } from '@/store/session'
import { accountSlot, accountLabel } from '@/lib/accounts'

export function App() {
  const storeName = useStore((s) => s.settings.storeName)
  const role = useSession((s) => s.role)
  const phase = useSession((s) => s.phase)
  const customerCount = useStore((s) => s.customers.length)

  // Clientes criados antes do termo não tinham o nome da cantina gravado: completa para o termo e o cartão.
  useEffect(() => {
    if (role !== 'dono' || phase !== 'ready') return
    const st = useStore.getState()
    st.customers.filter((c) => !c.storeName && st.settings.storeName).forEach((c) => st.updateCustomer(c.id, { storeName: st.settings.storeName }))
  }, [role, phase, customerCount])

  useEffect(() => {
    document.title = (storeName || 'Cantina') + (accountSlot ? ` · ${accountLabel}` : '')
  }, [storeName])

  return (
    <AuthGate>
    {phase === 'ready' && role === 'cliente' ? <CustomerArea /> : (
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
          <Route path="/clientes" element={<Customers />} />
          <Route path="/clientes/:id" element={<CustomerDetail />} />
          <Route path="/acessos" element={<Access />} />
          <Route path="/acessos/contratos" element={<Contracts />} />
          <Route path="/usuarios" element={<Users />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </HashRouter>
    )}
    </AuthGate>
  )
}
