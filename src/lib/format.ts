import { parseDateStr } from './dates'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const int = new Intl.NumberFormat('pt-BR')

export function money(v: number): string {
  return brl.format(Number.isFinite(v) ? v : 0)
}

export function num(v: number): string {
  return int.format(Number.isFinite(v) ? v : 0)
}

export function pct(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

/** dd/mm/aaaa a partir de AAAA-MM-DD ou ISO datetime. */
export function formatDate(value?: string): string {
  if (!value) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateStr(value) : new Date(value)
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return date + ' ' + time
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return num(n) + ' ' + (n === 1 ? singular : pluralForm)
}
