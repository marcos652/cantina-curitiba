import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { MobileDrawer, TopNav } from './TopNav'

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setDrawer(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-screen bg-ground">
      <TopNav onOpenMenu={() => setDrawer(true)} />
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-4 md:px-6 md:pb-12 md:pt-5 print:max-w-none print:p-0">{children}</main>
    </div>
  )
}
