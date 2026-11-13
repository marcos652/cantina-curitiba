import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, FileText, Lock, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { expectedCash, openSession, sessionSales, sumFees, sumNet, sumTotal, totalsByMethod } from '@/store/selectors'
import { formatDateTime, formatTime, money, num } from '@/lib/format'
import { PAYMENT_LABELS, round2 } from '@/lib/payments'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Kpi, KpiStrip } from '@/components/ui/Stat'
import { Badge } from '@/components/ui/Badge'
import { OpenCashModal } from '@/components/OpenCashModal'

function DiffLabel({ diff }: { diff: number }) {
  if (diff === 0) return <Badge tone="ok">Conferido</Badge>
  if (diff < 0) return <Badge tone="danger">Falta {money(-diff)}</Badge>
  return <Badge tone="warn">Sobra {money(diff)}</Badge>
}

export function Cash() {
  const navigate = useNavigate()
  const sessions = useStore((s) => s.cashSessions)
  const sales = useStore((s) => s.sales)
  const addCashMovement = useStore((s) => s.addCashMovement)
  const closeCash = useStore((s) => s.closeCash)
  const notify = useStore((s) => s.notify)

  const [openModal, setOpenModal] = useState(false)
  const [movement, setMovement] = useState<'sangria' | 'reforco' | null>(null)
  const [movForm, setMovForm] = useState({ amount: 0, note: '' })
  const [closing, setClosing] = useState(false)
  const [counted, setCounted] = useState(0)

  const session = openSession(sessions)
  const sSales = session ? sessionSales(sales, session.id) : []
  const expected = session ? expectedCash(session, sales) : 0
  const cashSales = sumTotal(sSales.filter((s) => s.payment.method === 'dinheiro'))
  const reinforcements = round2((session?.movements ?? []).filter((m) => m.type === 'reforco').reduce((a, m) => a + m.amount, 0))
  const withdrawals = round2((session?.movements ?? []).filter((m) => m.type === 'sangria').reduce((a, m) => a + m.amount, 0))
  const byMethod = totalsByMethod(sSales)
  const history = sessions.filter((s) => s.status === 'fechado').sort((a, b) => b.openedAt.localeCompare(a.openedAt))

  function openMovement(type: 'sangria' | 'reforco') {
    setMovement(type)
    setMovForm({ amount: 0, note: '' })
  }

  function saveMovement() {
    if (!movement) return
    const r = addCashMovement(movement, movForm.amount, movForm.note.trim() || undefined)
    if (!r.ok) return notify(r.error, 'error')
    notify(movement === 'sangria' ? `Sangria de ${money(movForm.amount)} registrada.` : `Reforço de ${money(movForm.amount)} registrado.`)
    setMovement(null)
  }

  function confirmClose() {
    const r = closeCash(counted, expected)
    if (!r.ok) return notify(r.error, 'error')
    notify('Caixa fechado.')
    setClosing(false)
    setCounted(0)
  }

  const diff = round2(counted - expected)

  return (
    <>
      <PageHeader
        title="Caixa"
        description={session ? `Aberto em ${formatDateTime(session.openedAt)}` : 'Nenhum caixa aberto'}
      >
        <Button onClick={() => navigate('/extrato')}>
          <FileText size={16} strokeWidth={1.75} /> Extrato do dia
        </Button>
        {session ? (
          <>
            <Button onClick={() => openMovement('sangria')}>
              <ArrowUpFromLine size={16} strokeWidth={1.5} /> Sangria
            </Button>
            <Button onClick={() => openMovement('reforco')}>
              <ArrowDownToLine size={16} strokeWidth={1.5} /> Reforço
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCounted(0)
                setClosing(true)
              }}
            >
              <Lock size={16} strokeWidth={1.5} /> Fechar caixa
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => setOpenModal(true)}>
            Abrir caixa
          </Button>
        )}
      </PageHeader>

      {session ? (
        <>
          <KpiStrip cols={5}>
            <Kpi label="Abertura" value={money(session.openingAmount)} />
            <Kpi label="Vendas em dinheiro" value={money(cashSales)} />
            <Kpi label="Reforços" value={money(reinforcements)} />
            <Kpi label="Sangrias" value={money(withdrawals)} />
            <Kpi label="Esperado na gaveta" value={money(expected)} hint="Abertura + dinheiro + reforços − sangrias" />
          </KpiStrip>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <SectionTitle title="Vendas por forma de pagamento" />
              <div className="card table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Forma</th>
                      <th className="num">Vendas</th>
                      <th className="num">Bruto</th>
                      <th className="num">Taxas</th>
                      <th className="num">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMethod.map((m) => (
                      <tr key={m.method} className={cx(m.count === 0 && 'text-faint')}>
                        <td>{PAYMENT_LABELS[m.method]}</td>
                        <td className="num">{m.count}</td>
                        <td className="num">{money(m.gross)}</td>
                        <td className="num">{m.fees ? `− ${money(m.fees)}` : '—'}</td>
                        <td className="num">{money(m.net)}</td>
                      </tr>
                    ))}
                    <tr className="bg-soft font-medium">
                      <td>Total</td>
                      <td className="num">{sSales.length}</td>
                      <td className="num">{money(sumTotal(sSales))}</td>
                      <td className="num">{sumFees(sSales) ? `− ${money(sumFees(sSales))}` : '—'}</td>
                      <td className="num">{money(sumNet(sSales))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <SectionTitle title="Sangrias e reforços" />
              <div className="card">
                {session.movements.length === 0 ? (
                  <EmptyState compact title="Nenhuma movimentação" description="Registre retiradas (sangria) ou entradas de troco (reforço)." />
                ) : (
                  <ul className="divide-y divide-line">
                    {[...session.movements].reverse().map((m) => (
                      <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="w-12 shrink-0 text-xs text-faint tabular">{formatTime(m.createdAt)}</span>
                        <span className="min-w-0 flex-1">
                          <span>{m.type === 'sangria' ? 'Sangria' : 'Reforço'}</span>
                          {m.note && <span className="block truncate text-xs text-faint">{m.note}</span>}
                        </span>
                        <span className="tabular">{m.type === 'sangria' ? `− ${money(m.amount)}` : `+ ${money(m.amount)}`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={Wallet}
            title="Caixa fechado"
            description="Abra o caixa informando o dinheiro inicial da gaveta para começar a registrar vendas."
          >
            <Button variant="primary" onClick={() => setOpenModal(true)}>
              Abrir caixa
            </Button>
          </EmptyState>
        </div>
      )}

      <section className="mt-8">
        <SectionTitle title="Caixas anteriores" />
        <div className="card table-wrap">
          {history.length === 0 ? (
            <EmptyState compact title="Nenhum caixa fechado ainda" description="Os fechamentos aparecem aqui com a conferência." />
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th className="num">Inicial</th>
                  <th className="num">Vendas</th>
                  <th className="num">Esperado</th>
                  <th className="num">Contado</th>
                  <th>Conferência</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => {
                  const list = sessionSales(sales, s.id)
                  const d = round2((s.countedAmount ?? 0) - (s.expectedAmount ?? 0))
                  return (
                    <tr key={s.id}>
                      <td className="tabular whitespace-nowrap">{formatDateTime(s.openedAt)}</td>
                      <td className="tabular whitespace-nowrap text-muted">{formatDateTime(s.closedAt)}</td>
                      <td className="num text-muted">{money(s.openingAmount)}</td>
                      <td className="num">
                        {money(sumTotal(list))} <span className="text-xs text-faint">({num(list.length)})</span>
                      </td>
                      <td className="num">{money(s.expectedAmount ?? 0)}</td>
                      <td className="num">{money(s.countedAmount ?? 0)}</td>
                      <td>
                        <DiffLabel diff={d} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <OpenCashModal open={openModal} onClose={() => setOpenModal(false)} />

      <Modal
        open={Boolean(movement)}
        onClose={() => setMovement(null)}
        title={movement === 'sangria' ? 'Sangria' : 'Reforço de caixa'}
        description={movement === 'sangria' ? 'Retirada de dinheiro da gaveta.' : 'Entrada de dinheiro na gaveta (troco, por exemplo).'}
        size="sm"
        footer={
          <>
            <Button onClick={() => setMovement(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveMovement}>
              Registrar
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            saveMovement()
          }}
        >
          <Field label="Valor">
            <MoneyInput value={movForm.amount} onChange={(v) => setMovForm({ ...movForm, amount: v })} autoFocus />
          </Field>
          <Field label="Observação">
            <Input value={movForm.note} onChange={(e) => setMovForm({ ...movForm, note: e.target.value })} placeholder="Ex.: Depósito, troco" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        title="Fechar caixa"
        description="Conte o dinheiro da gaveta e informe o valor."
        size="sm"
        footer={
          <>
            <Button onClick={() => setClosing(false)}>Voltar</Button>
            <Button variant="primary" onClick={confirmClose}>
              Confirmar fechamento
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            confirmClose()
          }}
        >
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Esperado na gaveta</dt>
              <dd className="tabular font-medium">{money(expected)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Vendas totais do caixa</dt>
              <dd className="tabular">{money(sumTotal(sSales))}</dd>
            </div>
          </dl>
          <Field label="Valor contado">
            <MoneyInput value={counted} onChange={setCounted} autoFocus />
          </Field>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Diferença</span>
            <DiffLabel diff={diff} />
          </div>
        </form>
      </Modal>
    </>
  )
}
