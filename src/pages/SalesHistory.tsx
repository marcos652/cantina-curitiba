import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, ChevronLeft, ChevronRight, Coins, FileDown, Percent, Receipt, Search, ShoppingBag } from 'lucide-react'
import type { PaymentMethod } from '@/types'
import { useStore } from '@/store/useStore'
import { sumFees, sumNet, sumTotal } from '@/store/selectors'
import { isoInRange } from '@/lib/dates'
import { formatDate, formatDateTime, formatTime, money, num } from '@/lib/format'
import { PAYMENT_ICONS, PAYMENT_LABELS, PAYMENT_METHODS, paymentDescription } from '@/lib/payments'
import { PRESET_OPTIONS, presetRange, type Preset } from '@/lib/periods'
import { downloadCSV } from '@/lib/download'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { DateRange } from '@/components/ui/DateRange'
import { Chips, Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Kpi, KpiStrip } from '@/components/ui/Stat'
import { SALES_TABS } from './Sales'

const PER_PAGE = 15

function pageNumbers(current: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(pages - 1, current + 1)
  if (from > 2) out.push('…')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pages - 1) out.push('…')
  out.push(pages)
  return out
}

export function SalesHistory() {
  const navigate = useNavigate()
  const sales = useStore((s) => s.sales)

  const [preset, setPreset] = useState<Preset>('7')
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('7'))
  const [method, setMethod] = useState<'todas' | PaymentMethod>('todas')
  const [status, setStatus] = useState<'todas' | 'concluida' | 'cancelada'>('todas')
  const [nsuQuery, setNsuQuery] = useState('')
  const [page, setPage] = useState(1)

  function applyPreset(p: Preset) {
    setPreset(p)
    setPage(1)
    if (p !== 'custom') setRange(presetRange(p))
  }

  // Resumo e tabela partem do mesmo recorte de período, forma de pagamento e NSU.
  const base = useMemo(
    () =>
      sales
        .filter(
          (s) =>
            (!from || !to || isoInRange(s.createdAt, from, to)) &&
            (method === 'todas' || s.payment.method === method) &&
            (!nsuQuery.trim() || (s.payment.nsu ?? '').includes(nsuQuery.trim())),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales, from, to, method, nsuQuery],
  )
  const done = base.filter((s) => s.status === 'concluida')
  const canceled = base.filter((s) => s.status === 'cancelada')
  const list = status === 'todas' ? base : base.filter((s) => s.status === status)

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const current = Math.min(page, pages)
  const visible = list.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  function exportCSV() {
    downloadCSV(`vendas_${from}_${to}.csv`, [
      ['Nº', 'Data', 'Itens', 'Forma', 'NSU', 'Parcelas', 'Total', 'Taxa', 'Líquido', 'Status'],
      ...list.map((s) => [
        s.number,
        formatDateTime(s.createdAt),
        s.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
        PAYMENT_LABELS[s.payment.method],
        s.payment.nsu ?? '',
        s.payment.installments ?? 1,
        s.total,
        s.payment.feeValue,
        s.payment.net,
        s.status === 'concluida' ? 'Concluída' : 'Cancelada',
      ]),
    ])
  }

  return (
    <>
      <PageHeader title="Vendas" />
      <Tabs items={SALES_TABS} />

      <div className="card mb-4 px-4 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[15px] font-semibold leading-tight">Histórico de vendas</p>
            <p className="mt-0.5 text-xs text-muted">Acompanhe as vendas do período e abra qualquer uma para ver os detalhes</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full sm:w-52">
              <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={nsuQuery}
                onChange={(e) => {
                  setNsuQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Pesquisar por NSU..."
                inputMode="numeric"
                className="pl-9"
                aria-label="Pesquisar por NSU"
              />
            </div>
            <DateRange
              from={from}
              to={to}
              onChange={(f, t) => {
                setPreset('custom')
                setPage(1)
                setRange([f, t])
              }}
            />
            <Chips value={preset} onChange={applyPreset} options={PRESET_OPTIONS} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <Field label="Forma de pagamento" className="w-48">
            <Select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as typeof method)
                setPage(1)
              }}
            >
              <option value="todas">Todas</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Situação" className="w-40">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status)
                setPage(1)
              }}
            >
              <option value="todas">Todas</option>
              <option value="concluida">Concluídas</option>
              <option value="cancelada">Canceladas</option>
            </Select>
          </Field>
          <Button onClick={exportCSV} disabled={list.length === 0} className="ml-auto">
            <FileDown size={16} strokeWidth={1.75} /> Exportar CSV
          </Button>
        </div>
      </div>

      <p className="mb-2 text-sm font-semibold">Resumo de vendas</p>
      <KpiStrip cols={4} className="mb-4">
        <Kpi icon={Receipt} label="Vendas concluídas" value={money(sumTotal(done))} size="lg" hint={`${num(done.length)} ${done.length === 1 ? 'venda' : 'vendas'}`} />
        <Kpi icon={Ban} label="Vendas canceladas" value={money(sumTotal(canceled))} size="lg" tone={canceled.length > 0 ? 'danger' : 'ink'} hint={`${num(canceled.length)} ${canceled.length === 1 ? 'venda' : 'vendas'}`} />
        <Kpi icon={Percent} label="Taxas da maquininha" value={money(sumFees(done))} size="lg" hint="Descontadas das vendas concluídas" />
        <Kpi icon={Coins} label="Líquido a receber" value={money(sumNet(done))} size="lg" highlight hint="Bruto menos taxas" />
      </KpiStrip>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">
            {num(list.length)} {list.length === 1 ? 'venda' : 'vendas'}
          </p>
          {pages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Paginação">
              <button type="button" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} aria-label="Página anterior" className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-raised disabled:opacity-30">
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>
              {pageNumbers(current, pages).map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="px-1 text-sm text-faint">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cx('h-8 min-w-8 rounded px-2 text-sm tabular transition-colors', p === current ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:bg-raised hover:text-ink')}
                  >
                    {p}
                  </button>
                ),
              )}
              <button type="button" onClick={() => setPage(Math.min(pages, current + 1))} disabled={current === pages} aria-label="Próxima página" className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-raised disabled:opacity-30">
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </nav>
          )}
        </div>

        <div className="table-wrap">
          {list.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Nenhuma venda encontrada" description="Ajuste o período, a forma de pagamento ou o NSU para ver outras vendas." />
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nº</th>
                  <th>Forma</th>
                  <th>NSU</th>
                  <th>Itens</th>
                  <th className="num">Parcelas</th>
                  <th className="num">Valor</th>
                  <th className="num">Taxa</th>
                  <th className="num">Líquido</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const Icon = PAYMENT_ICONS[s.payment.method]
                  const cancelled = s.status === 'cancelada'
                  return (
                    <tr key={s.id} className="cursor-pointer" onClick={() => navigate(`/vendas/${s.id}`)}>
                      <td className="whitespace-nowrap tabular">
                        {formatDate(s.createdAt)}
                        <span className="block text-xs text-muted">{formatTime(s.createdAt)}</span>
                      </td>
                      <td className="tabular font-medium text-accent">#{s.number}</td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <Icon size={16} strokeWidth={1.75} className="text-accent" />
                          {paymentDescription(s.payment)}
                        </span>
                      </td>
                      <td className="tabular text-muted">{s.payment.nsu ?? '—'}</td>
                      <td className="max-w-[260px]">
                        <span className="block truncate">{s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</span>
                      </td>
                      <td className="num text-muted">{s.payment.installments ?? 1}x</td>
                      <td className={cx('num font-semibold', cancelled && 'text-faint line-through')}>{money(s.total)}</td>
                      <td className="num text-muted">{s.payment.feeValue ? `− ${money(s.payment.feeValue)}` : '—'}</td>
                      <td className={cx('num', cancelled && 'text-faint line-through')}>{money(s.payment.net)}</td>
                      <td>{cancelled ? <Badge tone="danger">Cancelada</Badge> : <Badge tone="ok">Concluída</Badge>}</td>
                      <td className="w-8 text-right text-faint">
                        <ChevronRight size={16} strokeWidth={1.75} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
