import { useMemo, useState } from 'react'
import { Minus, Plus, Search, ShoppingCart, X } from 'lucide-react'
import type { PaymentMethod, Product } from '@/types'
import { useStore } from '@/store/useStore'
import { openSession } from '@/store/selectors'
import { money, pct } from '@/lib/format'
import { PAYMENT_LABELS, PAYMENT_METHODS, calcFee, installmentValue, round2 } from '@/lib/payments'
import { sellableStock } from '@/lib/stock'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Chips, Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { OpenCashModal } from '@/components/OpenCashModal'

export const SALES_TABS = [
  { to: '/vendas', label: 'Nova venda', end: true },
  { to: '/vendas/historico', label: 'Histórico' },
]

const INSTALLMENTS = Array.from({ length: 11 }, (_, i) => i + 2)
const QUICK_CASH = [10, 20, 50, 100, 200]

type Cart = Record<string, number>

export function Sales() {
  const products = useStore((s) => s.products)
  const lots = useStore((s) => s.lots)
  const settings = useStore((s) => s.settings)
  const sessions = useStore((s) => s.cashSessions)
  const createSale = useStore((s) => s.createSale)
  const notify = useStore((s) => s.notify)

  const [cart, setCart] = useState<Cart>({})
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('todas')
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [installments, setInstallments] = useState(2)
  const [received, setReceived] = useState(0)
  const [cartOpen, setCartOpen] = useState(false)
  const [openCash, setOpenCash] = useState(false)

  const session = openSession(sessions)

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => (category === 'todas' || p.category === category) && (!q || p.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, query, category])

  const stockOf = (id: string) => sellableStock(lots, id)

  const items = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => ({ product: products.find((p) => p.id === id) as Product, quantity }))
        .filter((i) => i.product),
    [cart, products],
  )
  const itemCount = items.reduce((a, i) => a + i.quantity, 0)
  const total = round2(items.reduce((a, i) => a + i.product.salePrice * i.quantity, 0))
  const feePercent = settings.fees[method] ?? 0
  const { feeValue, net } = calcFee(total, feePercent)
  const change = round2(received - total)
  const cashShort = method === 'dinheiro' && received > 0 && received < total

  function add(p: Product) {
    const max = stockOf(p.id)
    if ((cart[p.id] ?? 0) + 1 > max) {
      notify(`Sem estoque suficiente de ${p.name}.`, 'error')
      return
    }
    setCart((prev) => {
      const current = prev[p.id] ?? 0
      if (current + 1 > max) return prev
      return { ...prev, [p.id]: current + 1 }
    })
  }

  function dec(id: string) {
    setCart((prev) => {
      const next = { ...prev }
      const c = (next[id] ?? 0) - 1
      if (c <= 0) delete next[id]
      else next[id] = c
      return next
    })
  }

  function remove(id: string) {
    setCart((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function clear() {
    setCart({})
    setReceived(0)
  }

  function finalize() {
    const r = createSale({
      items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      method,
      installments,
      received: method === 'dinheiro' && received > 0 ? received : undefined,
    })
    if (!r.ok) return notify(r.error, 'error')
    const msg = `Venda #${r.value.number} registrada · ${money(r.value.total)}`
    notify(r.value.payment.change ? `${msg} · Troco ${money(r.value.payment.change)}` : msg)
    clear()
    setCartOpen(false)
  }

  const canFinalize = items.length > 0 && Boolean(session) && !cashShort

  const renderCart = (inModal: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-3">
        {inModal ? <span /> : <h2 className="text-sm font-medium">Carrinho</h2>}
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Limpar
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState compact icon={ShoppingCart} title="Carrinho vazio" description="Toque nos produtos para adicionar." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{product.name}</p>
                <p className="text-xs text-faint tabular">{money(product.salePrice)} cada</p>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" icon onClick={() => dec(product.id)} aria-label="Diminuir">
                  <Minus size={14} strokeWidth={1.5} />
                </Button>
                <span className="w-7 text-center text-sm tabular">{quantity}</span>
                <Button variant="ghost" size="sm" icon onClick={() => add(product)} aria-label="Aumentar">
                  <Plus size={14} strokeWidth={1.5} />
                </Button>
              </div>
              <span className="w-20 text-right text-sm font-medium tabular">{money(product.salePrice * quantity)}</span>
              <Button variant="ghost" size="sm" icon onClick={() => remove(product.id)} aria-label="Remover" className="-mr-2 text-faint">
                <X size={14} strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm text-muted">Total</span>
        <span className="text-2xl font-medium tabular tracking-tight">{money(total)}</span>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[13px] text-muted">Pagamento</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PAYMENT_METHODS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={cx(
                'h-9 rounded border px-2 text-[13px] transition-colors',
                i === PAYMENT_METHODS.length - 1 && 'col-span-2',
                method === m ? 'border-ink bg-soft font-medium text-ink' : 'border-line text-muted hover:bg-soft hover:text-ink',
              )}
            >
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {method === 'credito_parcelado' && (
        <div className="mt-3 flex items-center gap-3">
          <Field label="Parcelas" className="w-28">
            <Select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
              {INSTALLMENTS.map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </Select>
          </Field>
          <p className="pt-5 text-sm tabular">
            {installments}x de <span className="font-medium">{money(installmentValue(total, installments))}</span>
          </p>
        </div>
      )}

      {method === 'dinheiro' && (
        <div className="mt-3">
          <Field label="Valor recebido">
            <MoneyInput value={received} onChange={setReceived} />
          </Field>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setReceived(total)} className="h-7 rounded border border-line px-2 text-xs text-muted hover:bg-soft hover:text-ink">
              Exato
            </button>
            {QUICK_CASH.filter((v) => v >= total && total > 0).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setReceived(v)}
                className="h-7 rounded border border-line px-2 text-xs text-muted tabular hover:bg-soft hover:text-ink"
              >
                {money(v)}
              </button>
            ))}
          </div>
          {received > 0 && (
            <p className={cx('mt-2 text-sm tabular', cashShort ? 'text-danger' : '')}>
              {cashShort ? `Faltam ${money(-change)}` : <>Troco <span className="font-medium">{money(change)}</span></>}
            </p>
          )}
        </div>
      )}

      <dl className="mt-4 space-y-1 text-[13px] text-muted">
        <div className="flex justify-between">
          <dt>Taxa da maquininha{feePercent > 0 ? ` (${pct(feePercent)})` : ''}</dt>
          <dd className="tabular">{feeValue > 0 ? `− ${money(feeValue)}` : 'Sem taxa'}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Líquido a receber</dt>
          <dd className="tabular text-ink">{money(net)}</dd>
        </div>
      </dl>

      <Button variant="primary" size="lg" full className="mt-4" disabled={!canFinalize} onClick={finalize}>
        Finalizar venda
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader title="Vendas" />
      <Tabs items={SALES_TABS} />

      {!session && (
        <div className="panel mb-5 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-medium">Caixa fechado.</span>{' '}
            <span className="text-muted">Abra o caixa para registrar vendas.</span>
          </p>
          <Button variant="primary" onClick={() => setOpenCash(true)}>
            Abrir caixa
          </Button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="panel">
          <EmptyState title="Nenhum produto cadastrado" description="Cadastre produtos no estoque para começar a vender." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input placeholder="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
            {categories.length > 1 && (
              <div className="mb-4">
                <Chips
                  value={category}
                  onChange={setCategory}
                  options={[{ value: 'todas', label: 'Todas' }, ...categories.map((c) => ({ value: c, label: c }))]}
                />
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="panel">
                <EmptyState compact title="Nenhum produto encontrado" description="Tente outro nome ou categoria." />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => {
                  const stock = stockOf(p.id)
                  const inCart = cart[p.id] ?? 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={stock <= 0}
                      onClick={() => add(p)}
                      className="panel relative flex min-h-[88px] flex-col items-start p-3 text-left transition-colors hover:bg-soft active:bg-line/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {inCart > 0 && (
                        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-medium text-white tabular">
                          {inCart}
                        </span>
                      )}
                      <span className="line-clamp-2 pr-6 text-sm font-medium leading-snug">{p.name}</span>
                      <span className="mt-auto flex w-full flex-wrap items-baseline justify-between gap-x-2 pt-2">
                        <span className="whitespace-nowrap text-sm tabular">{money(p.salePrice)}</span>
                        <span className="whitespace-nowrap text-xs text-faint tabular">{stock > 0 ? `${stock} un.` : 'Sem estoque'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="hidden md:block">
            <div className="panel sticky top-6 p-4">{renderCart(false)}</div>
          </aside>
        </div>
      )}

      {products.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 md:hidden">
          <div className="text-sm">
            <span className="text-muted">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
            <span className="ml-2 font-medium tabular">{money(total)}</span>
          </div>
          <Button variant="primary" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={16} strokeWidth={1.5} /> Ver carrinho
          </Button>
        </div>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Carrinho" size="md">
        <div className="pb-3">{renderCart(true)}</div>
      </Modal>

      <OpenCashModal open={openCash} onClose={() => setOpenCash(false)} />
    </>
  )
}
