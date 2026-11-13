import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Product } from '@/types'
import { useStore } from '@/store/useStore'
import { addDays, todayStr } from '@/lib/dates'
import { formatDate, money, num, pct } from '@/lib/format'
import { expiredStock, lotStatus, nextExpiry, productLots, sellableStock } from '@/lib/stock'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput, NumberInput, Select } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Chips, Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

export const STOCK_TABS = [
  { to: '/estoque', label: 'Produtos', end: true },
  { to: '/estoque/movimentacoes', label: 'Movimentações' },
]

interface FormState {
  name: string
  category: string
  costPrice: number
  salePrice: number
  minStock: number
  initialQty: number
  initialExpiry: string
}

const emptyForm = (category: string): FormState => ({
  name: '',
  category,
  costPrice: 0,
  salePrice: 0,
  minStock: 5,
  initialQty: 0,
  initialExpiry: addDays(todayStr(), 7),
})

const EXIT_TYPES = [
  { value: 'perda', label: 'Perda' },
  { value: 'descarte', label: 'Descarte' },
  { value: 'ajuste', label: 'Ajuste de estoque' },
] as const

export function Stock() {
  const products = useStore((s) => s.products)
  const lots = useStore((s) => s.lots)
  const settings = useStore((s) => s.settings)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)
  const deleteProduct = useStore((s) => s.deleteProduct)
  const addLot = useStore((s) => s.addLot)
  const removeStock = useStore((s) => s.removeStock)
  const notify = useStore((s) => s.notify)

  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('todas')

  const [form, setForm] = useState<FormState | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [entry, setEntry] = useState<Product | null>(null)
  const [entryForm, setEntryForm] = useState({ quantity: 0, expiresAt: addDays(todayStr(), 7), note: 'Compra' })

  const [exit, setExit] = useState<Product | null>(null)
  const [exitForm, setExitForm] = useState({ type: 'perda' as 'perda' | 'descarte' | 'ajuste', lotId: '', quantity: 0, note: '' })

  const [toDelete, setToDelete] = useState<Product | null>(null)

  const categories = useMemo(
    () =>
      Array.from(new Set([...settings.categories, ...products.map((p) => p.category)].filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [settings.categories, products],
  )

  useEffect(() => {
    if (params.get('novo')) {
      setEditing(null)
      setForm(emptyForm(settings.categories[0] ?? ''))
      setErrors({})
      setParams({}, { replace: true })
    }
  }, [params, setParams, settings.categories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => (category === 'todas' || p.category === category) && (!q || p.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, query, category])

  function openNew() {
    setEditing(null)
    setForm(emptyForm(settings.categories[0] ?? ''))
    setErrors({})
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name,
      category: p.category,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      minStock: p.minStock,
      initialQty: 0,
      initialExpiry: '',
    })
    setErrors({})
  }

  function saveForm() {
    if (!form) return
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Informe o nome do produto.'
    if (form.salePrice <= 0) e.salePrice = 'Informe o preço de venda.'
    if (!editing && form.initialQty > 0 && !form.initialExpiry) e.initialExpiry = 'Informe a validade do lote.'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const input = {
      name: form.name.trim(),
      category: form.category.trim() || 'Outros',
      costPrice: form.costPrice,
      salePrice: form.salePrice,
      minStock: Math.max(0, Math.floor(form.minStock)),
    }
    if (editing) {
      updateProduct(editing.id, input)
      notify('Produto atualizado.')
    } else {
      addProduct(input, form.initialQty > 0 ? { quantity: Math.floor(form.initialQty), expiresAt: form.initialExpiry } : undefined)
      notify('Produto cadastrado.')
    }
    setForm(null)
  }

  function openEntry(p: Product) {
    setEntry(p)
    setEntryForm({ quantity: 0, expiresAt: addDays(todayStr(), 7), note: 'Compra' })
  }

  function saveEntry() {
    if (!entry) return
    const r = addLot(entry.id, Math.floor(entryForm.quantity), entryForm.expiresAt, entryForm.note.trim() || undefined)
    if (!r.ok) return notify(r.error, 'error')
    notify(`Entrada registrada: ${num(Math.floor(entryForm.quantity))} un. de ${entry.name}.`)
    setEntry(null)
  }

  function openExit(p: Product) {
    setExit(p)
    setExitForm({ type: 'perda', lotId: '', quantity: 0, note: '' })
  }

  function saveExit() {
    if (!exit) return
    const r = removeStock({
      productId: exit.id,
      lotId: exitForm.lotId || undefined,
      quantity: Math.floor(exitForm.quantity),
      type: exitForm.type,
      note: exitForm.note.trim() || undefined,
    })
    if (!r.ok) return notify(r.error, 'error')
    notify(`Saída registrada: ${num(Math.floor(exitForm.quantity))} un. de ${exit.name}.`)
    setExit(null)
  }

  const exitLots = exit ? productLots(lots, exit.id) : []
  const exitMax = exitForm.lotId ? (exitLots.find((l) => l.id === exitForm.lotId)?.quantity ?? 0) : exitLots.reduce((a, l) => a + l.quantity, 0)

  return (
    <>
      <PageHeader title="Estoque">
        <Button variant="primary" onClick={openNew}>
          <Plus size={16} strokeWidth={1.5} /> Novo produto
        </Button>
      </PageHeader>
      <Tabs items={STOCK_TABS} />

      {products.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Cadastre o primeiro produto com preço de custo, preço de venda e o lote inicial com validade."
          >
            <Button variant="primary" onClick={openNew}>
              <Plus size={16} strokeWidth={1.5} /> Novo produto
            </Button>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <Input placeholder="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <Chips
              value={category}
              onChange={setCategory}
              options={[{ value: 'todas', label: 'Todas' }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
          </div>

          <div className="table-wrap">
            {filtered.length === 0 ? (
              <EmptyState compact title="Nenhum produto encontrado" description="Tente outro nome ou categoria." />
            ) : (
              <table className="table hover">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="num">Custo</th>
                    <th className="num">Venda</th>
                    <th className="num">Margem</th>
                    <th className="num">Estoque</th>
                    <th className="num">Mínimo</th>
                    <th>Próx. validade</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const stock = sellableStock(lots, p.id)
                    const expired = expiredStock(lots, p.id)
                    const next = nextExpiry(lots, p.id)
                    const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0
                    const status = next ? lotStatus({ expiresAt: next }, settings.expiryWarningDays) : null
                    return (
                      <tr key={p.id}>
                        <td>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-faint">{p.category}</p>
                        </td>
                        <td className="num text-muted">{money(p.costPrice)}</td>
                        <td className="num">{money(p.salePrice)}</td>
                        <td className="num text-muted">{pct(margin)}</td>
                        <td className="num">
                          <span className="inline-flex items-center gap-2">
                            {stock <= 0 ? (
                              <Badge tone="danger">Zerado</Badge>
                            ) : stock <= p.minStock ? (
                              <Badge tone="warn">Baixo</Badge>
                            ) : null}
                            <span>{num(stock)}</span>
                          </span>
                          {expired > 0 && <p className="text-xs text-danger">+{num(expired)} vencidos</p>}
                        </td>
                        <td className="num text-muted">{num(p.minStock)}</td>
                        <td className="whitespace-nowrap">
                          {next ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="tabular">{formatDate(next)}</span>
                              {status === 'vencido' && <Badge tone="danger">Vencido</Badge>}
                              {status === 'vencendo' && <Badge tone="warn">Vencendo</Badge>}
                            </span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" icon title="Entrada" onClick={() => openEntry(p)}>
                            <ArrowDownToLine size={16} strokeWidth={1.5} />
                          </Button>
                          <Button variant="ghost" size="sm" icon title="Saída" onClick={() => openExit(p)} disabled={stock + expired <= 0}>
                            <ArrowUpFromLine size={16} strokeWidth={1.5} />
                          </Button>
                          <Button variant="ghost" size="sm" icon title="Editar" onClick={() => openEdit(p)}>
                            <Pencil size={16} strokeWidth={1.5} />
                          </Button>
                          <Button variant="ghost" size="sm" icon title="Excluir" onClick={() => setToDelete(p)} className="text-faint hover:text-danger">
                            <Trash2 size={16} strokeWidth={1.5} />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Cadastro / edição */}
      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={editing ? 'Editar produto' : 'Novo produto'}
        footer={
          <>
            <Button onClick={() => setForm(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveForm}>
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveForm()
            }}
          >
            <Field label="Nome" error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="Ex.: Coxinha de frango" />
            </Field>
            <Field label="Categoria" hint="Escolha uma existente ou digite uma nova.">
              <Input list="categorias" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="categorias">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço de custo">
                <MoneyInput value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
              </Field>
              <Field label="Preço de venda" error={errors.salePrice}>
                <MoneyInput value={form.salePrice} onChange={(v) => setForm({ ...form, salePrice: v })} />
              </Field>
            </div>
            <Field label="Estoque mínimo" hint="Avisa quando o estoque ficar igual ou abaixo deste valor.">
              <NumberInput value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} />
            </Field>
            {!editing && (
              <div className="border-t border-line pt-4">
                <p className="mb-3 text-sm font-medium">Estoque inicial (opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade">
                    <NumberInput value={form.initialQty} onChange={(v) => setForm({ ...form, initialQty: v })} />
                  </Field>
                  <Field label="Validade" error={errors.initialExpiry}>
                    <Input type="date" value={form.initialExpiry} onChange={(e) => setForm({ ...form, initialExpiry: e.target.value })} />
                  </Field>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Entrada */}
      <Modal
        open={Boolean(entry)}
        onClose={() => setEntry(null)}
        title="Entrada de estoque"
        description={entry?.name}
        size="sm"
        footer={
          <>
            <Button onClick={() => setEntry(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveEntry}>
              Registrar entrada
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            saveEntry()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade">
              <NumberInput value={entryForm.quantity} onChange={(v) => setEntryForm({ ...entryForm, quantity: v })} autoFocus />
            </Field>
            <Field label="Validade do lote">
              <Input type="date" value={entryForm.expiresAt} onChange={(e) => setEntryForm({ ...entryForm, expiresAt: e.target.value })} />
            </Field>
          </div>
          <Field label="Observação">
            <Input value={entryForm.note} onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })} placeholder="Ex.: Compra, produção" />
          </Field>
        </form>
      </Modal>

      {/* Saída */}
      <Modal
        open={Boolean(exit)}
        onClose={() => setExit(null)}
        title="Saída de estoque"
        description={exit?.name}
        size="sm"
        footer={
          <>
            <Button onClick={() => setExit(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveExit}>
              Registrar saída
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            saveExit()
          }}
        >
          <Field label="Motivo">
            <Select value={exitForm.type} onChange={(e) => setExitForm({ ...exitForm, type: e.target.value as typeof exitForm.type })}>
              {EXIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lote">
            <Select value={exitForm.lotId} onChange={(e) => setExitForm({ ...exitForm, lotId: e.target.value })}>
              <option value="">Automático (vence primeiro)</option>
              {exitLots.map((l) => (
                <option key={l.id} value={l.id}>
                  Validade {formatDate(l.expiresAt)} · {num(l.quantity)} un.
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantidade" hint={`Disponível: ${num(exitMax)} un.`}>
            <NumberInput value={exitForm.quantity} onChange={(v) => setExitForm({ ...exitForm, quantity: v })} max={exitMax} />
          </Field>
          <Field label="Observação">
            <Input value={exitForm.note} onChange={(e) => setExitForm({ ...exitForm, note: e.target.value })} placeholder="Ex.: Caiu no chão" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          deleteProduct(toDelete.id)
          notify('Produto excluído.')
        }}
        title={toDelete ? `Excluir ${toDelete.name}?` : ''}
        message="O estoque atual deste produto será removido. As vendas já registradas continuam no histórico."
        confirmLabel="Excluir"
        danger
      />
    </>
  )
}
