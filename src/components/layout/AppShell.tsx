import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { DesktopSidebar, MobileDrawer } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const storeName = useStore((s) => s.settings.storeName)
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setDrawer(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-screen bg-white">
      <DesktopSidebar />
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />

      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-line bg-white px-2 md:hidden">
        <Button variant="ghost" icon onClick={() => setDrawer(true)} aria-label="Abrir menu">
          <Menu size={20} strokeWidth={1.5} />
        </Button>
        <span className="text-sm font-medium tracking-tight">{storeName || 'Cantina'}</span>
      </header>

      <main className={cx('transition-[padding] duration-150', collapsed ? 'md:pl-[60px]' : 'md:pl-[220px]')}>
        <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</div>
      </main>
    </div>
  )
}
