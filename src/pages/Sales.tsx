import { useMemo, useState } from 'react'
import { Minus, Plus, Search, ShoppingCart, TriangleAlert, X } from 'lucide-react'
import type { PaymentMethod, Product } from '@/types'
import { useStore } from '@/store/useStore'
import { openSession } from '@/store/selectors'
import { money, num, pct } from '@/lib/format'
import { PAYMENT_ICONS, PAYMENT_LABELS, PAYMENT_METHODS, calcFee, installmentValue, round2 } from '@/lib/payments'
import { sellableStock } from '@/lib/stock'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Chips, Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { OpenCashModal } from '@/components/OpenCashModal'

export const SALES_TABS = [
  { to: '/vendas', label: 'Nova venda', end: true },
  { to: '/vendas/historico', label: 'Histórico' },
  { to: '/vendas/fiado', label: 'Fiado' },
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
  const [nsu, setNsu] = useState('')
  const [nsuOpen, setNsuOpen] = useState(false)
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
    setNsu('')
    setNsuOpen(false)
  }

  function finalize() {
    const r = createSale({
      items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      method,
      installments,
      nsu: method !== 'dinheiro' ? nsu : undefined,
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
      {!inModal && (
        <div className="card-head">
          <p className="card-title flex items-center gap-2">
            Carrinho <span className="count-pill">{itemCount}</span>
          </p>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Limpar
            </Button>
          )}
        </div>
      )}

      <div className="px-4 pt-3">
        {items.length === 0 ? (
          <EmptyState compact icon={ShoppingCart} title="Carrinho vazio" description="Toque nos produtos para adicionar." />
        ) : (
          <ul className="divide-y divide-rule">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium leading-snug">{product.name}</p>
                  <button type="button" onClick={() => remove(product.id)} aria-label="Remover" className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-faint hover:bg-raised hover:text-danger-text">
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center rounded-md border border-control bg-white">
                    <button type="button" onClick={() => dec(product.id)} aria-label="Diminuir" className="flex h-8 w-8 items-center justify-center text-accent hover:bg-accent-soft">
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular">{quantity}</span>
                    <button type="button" onClick={() => add(product)} aria-label="Aumentar" className="flex h-8 w-8 items-center justify-center text-accent hover:bg-accent-soft">
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular">{money(product.salePrice * quantity)}</p>
                    <p className="text-xs text-muted tabular">{money(product.salePrice)} cada</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Total</span>
          <span className="text-[26px] font-bold tracking-tight tabular">{money(total)}</span>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[13px] font-medium text-muted">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = PAYMENT_ICONS[m]
              const active = method === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cx(
                    'flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-center text-[13px] leading-tight transition-colors',
                    active ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line text-ink hover:border-accent hover:bg-accent-soft/40',
                  )}
                >
                  <Icon size={20} strokeWidth={1.75} className="shrink-0 text-accent" />
                  {PAYMENT_LABELS[m]}
                </button>
              )
            })}
          </div>
        </div>

        {method === 'credito_parcelado' && (
          <div className="mt-3 flex items-center gap-3 rounded-md bg-raised p-3">
            <Field label="Parcelas" className="w-24">
              <Select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {INSTALLMENTS.map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </Select>
            </Field>
            <p className="pt-5 text-sm tabular">
              {installments}x de <span className="font-semibold">{money(installmentValue(total, installments))}</span>
            </p>
          </div>
        )}

        {method !== 'dinheiro' &&
          (nsuOpen || nsu ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="shrink-0 text-[13px] text-muted">NSU</span>
              <Input
                value={nsu}
                onChange={(e) => setNsu(e.target.value.replace(/\s+/g, ''))}
                inputMode="numeric"
                placeholder="Opcional"
                maxLength={20}
                className="h-8"
                autoFocus={nsuOpen && !nsu}
              />
              <button
                type="button"
                onClick={() => {
                  setNsu('')
                  setNsuOpen(false)
                }}
                aria-label="Remover NSU"
                className="shrink-0 rounded p-1 text-faint hover:bg-raised hover:text-ink"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setNsuOpen(true)} className="link mt-3">
              <Plus size={13} strokeWidth={2} /> Adicionar NSU <span className="font-normal text-faint">(opcional)</span>
            </button>
          ))}

        {method === 'dinheiro' && (
          <div className="mt-3 rounded-md bg-raised p-3">
            <Field label="Valor recebido">
              <MoneyInput value={received} onChange={setReceived} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setReceived(total)} className="h-7 rounded border border-control bg-white px-2 text-xs text-muted hover:text-ink">
                Exato
              </button>
              {QUICK_CASH.filter((v) => v >= total && total > 0).map((v) => (
                <button key={v} type="button" onClick={() => setReceived(v)} className="h-7 rounded border border-control bg-white px-2 text-xs text-muted tabular hover:text-ink">
                  {money(v)}
                </button>
              ))}
            </div>
            {received > 0 && (
              <p className={cx('mt-2 text-sm tabular', cashShort ? 'font-medium text-danger-text' : '')}>
                {cashShort ? (
                  `Faltam ${money(-change)}`
                ) : (
                  <>
                    Troco <span className="font-semibold">{money(change)}</span>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <dl className="mt-4 space-y-1.5 text-[13px]">
          <div className="flex justify-between text-muted">
            <dt>Taxa da maquininha{feePercent > 0 ? ` (${pct(feePercent)})` : ''}</dt>
            <dd className="tabular">{feeValue > 0 ? `− ${money(feeValue)}` : 'Sem taxa'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Líquido a receber</dt>
            <dd className="font-semibold text-ok-text tabular">{money(net)}</dd>
          </div>
        </dl>
      </div>

      <div className="p-4 pt-4">
        <Button variant="primary" size="lg" full disabled={!canFinalize} onClick={finalize}>
          Finalizar venda{total > 0 ? ` · ${money(total)}` : ''}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader title="Vendas" />
      <Tabs items={SALES_TABS} />

      {!session && (
        <div className="notice mb-4 items-center justify-between">
          <span className="flex items-center gap-2.5">
            <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0 text-warn-text" />
            <span>
              <span className="font-medium">Caixa fechado.</span> Abra o caixa para registrar vendas.
            </span>
          </span>
          <Button variant="primary" size="sm" onClick={() => setOpenCash(true)}>
            Abrir caixa
          </Button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="card">
          <EmptyState title="Nenhum produto cadastrado" description="Cadastre produtos no estoque para começar a vender." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
          <div className="card">
            <div className="card-head">
              <p className="card-title flex items-center gap-2">
                Produtos <span className="count-pill">{filtered.length}</span>
              </p>
              <div className="relative w-full sm:w-64">
                <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input placeholder="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-9" />
              </div>
            </div>
            {categories.length > 1 && (
              <div className="px-4 pt-3">
                <Chips value={category} onChange={setCategory} options={[{ value: 'todas', label: 'Todas' }, ...categories.map((c) => ({ value: c, label: c }))]} />
              </div>
            )}
            <div className="card-body">
              {filtered.length === 0 ? (
                <EmptyState compact title="Nenhum produto encontrado" description="Tente outro nome ou categoria." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((p) => {
                    const stock = stockOf(p.id)
                    const inCart = cart[p.id] ?? 0
                    const out = stock <= 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={out}
                        onClick={() => add(p)}
                        className={cx(
                          'relative flex min-h-[96px] flex-col items-start rounded-lg border p-3 text-left transition-colors',
                          out ? 'cursor-not-allowed border-line bg-raised opacity-60' : 'border-line bg-white hover:border-accent hover:bg-accent-soft/40',
                          inCart > 0 && 'border-accent',
                        )}
                      >
                        {inCart > 0 && (
                          <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white tabular">
                            {inCart}
                          </span>
                        )}
                        <span className="line-clamp-2 pr-6 text-sm font-semibold leading-snug">{p.name}</span>
                        <span className="mt-auto flex w-full flex-wrap items-baseline justify-between gap-x-2 pt-2">
                          <span className="whitespace-nowrap text-[15px] font-bold tabular">{money(p.salePrice)}</span>
                          {out ? (
                            <Badge tone="danger">Esgotado</Badge>
                          ) : (
                            <span className="whitespace-nowrap text-xs text-muted tabular">{num(stock)} un.</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="hidden md:block">
            <div className="card sticky top-16">{renderCart(false)}</div>
          </aside>
        </div>
      )}

      {products.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 md:hidden">
          <div className="text-sm">
            <span className="text-muted">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
            <span className="ml-2 font-bold tabular">{money(total)}</span>
          </div>
          <Button variant="primary" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={16} strokeWidth={1.75} /> Ver carrinho
          </Button>
        </div>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Carrinho" size="md">
        <div className="-mx-5">{renderCart(true)}</div>
      </Modal>

      <OpenCashModal open={openCash} onClose={() => setOpenCash(false)} />
    </>
  )
}
