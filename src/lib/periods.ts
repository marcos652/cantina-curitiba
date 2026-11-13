import type { Sale } from '@/types'
import type { BarDatum } from '@/components/charts/StackedBars'
import { addDays, startOfMonthStr, todayStr } from './dates'
import { formatDate, formatTime } from './format'
import { round2 } from './payments'

export type Preset = 'hoje' | 'ontem' | '7' | '30' | 'mes' | 'custom'

export const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: 'mes', label: 'Este mês' },
]

export function presetRange(p: Preset): [string, string] {
  const today = todayStr()
  switch (p) {
    case 'hoje':
      return [today, today]
    case 'ontem':
      return [addDays(today, -1), addDays(today, -1)]
    case '7':
      return [addDays(today, -6), today]
    case '30':
      return [addDays(today, -29), today]
    case 'mes':
      return [startOfMonthStr(), today]
    default:
      return [today, today]
  }
}

export function periodLabel(from: string, to: string): string {
  if (!from || !to) return 'Período'
  if (from === to) {
    if (from === todayStr()) return `Hoje, ${formatDate(from)}`
    if (from === addDays(todayStr(), -1)) return `Ontem, ${formatDate(from)}`
    return formatDate(from)
  }
  return `${formatDate(from)} a ${formatDate(to)}`
}

const hourOf = (s: Sale) => new Date(s.createdAt).getHours()
const dayOf = (s: Sale) => s.createdAt.slice(0, 10)
const shortDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

/** Colunas por hora (um dia) ou por dia (intervalo): [concluídas, canceladas]. */
export function salesBuckets(completed: Sale[], canceled: Sale[], from: string, to: string): BarDatum[] {
  const sum = (list: Sale[]) => round2(list.reduce((a, s) => a + s.total, 0))
  if (from === to) {
    const all = [...completed, ...canceled]
    const minH = Math.min(8, ...all.map(hourOf))
    const maxH = Math.max(18, ...all.map(hourOf))
    const out: BarDatum[] = []
    for (let h = minH; h <= maxH; h++) {
      out.push({
        label: `${String(h).padStart(2, '0')}h`,
        values: [sum(completed.filter((s) => hourOf(s) === h)), sum(canceled.filter((s) => hourOf(s) === h))],
      })
    }
    return out
  }
  const out: BarDatum[] = []
  let d = from
  let guard = 0
  while (d <= to && guard < 92) {
    const key = d
    out.push({
      label: shortDay(d),
      values: [sum(completed.filter((s) => dayOf(s) === key)), sum(canceled.filter((s) => dayOf(s) === key))],
    })
    d = addDays(d, 1)
    guard++
  }
  return out
}

/** Acumulado venda a venda. Começa em zero e termina no último valor, para a linha aparecer mesmo com uma só venda. */
export function cumulativePoints(completed: Sale[], singleDay: boolean): { label: string; value: number }[] {
  const sorted = [...completed].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (sorted.length === 0) return []
  let acc = 0
  const steps = sorted.map((s) => {
    acc = round2(acc + s.total)
    return { label: singleDay ? formatTime(s.createdAt) : shortDay(dayOf(s)), value: acc }
  })
  return [{ label: 'Início', value: 0 }, ...steps, { label: singleDay ? 'Agora' : steps[steps.length - 1].label, value: acc }]
}
