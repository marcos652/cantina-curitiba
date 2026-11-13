const pad = (n: number) => String(n).padStart(2, '0')

/** Data local no formato AAAA-MM-DD. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** Converte AAAA-MM-DD em Date local (meia-noite), sem deslocamento de fuso. */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isoToDateStr(iso: string): string {
  return toDateStr(new Date(iso))
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** Dias entre hoje e a data (negativo quando já passou). */
export function daysUntil(dateStr: string): number {
  const a = parseDateStr(dateStr).getTime()
  const b = parseDateStr(todayStr()).getTime()
  return Math.round((a - b) / 86400000)
}

export function startOfMonthStr(): string {
  const d = new Date()
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** Verifica se um ISO datetime cai dentro do intervalo de datas (inclusivo). */
export function isoInRange(iso: string, from: string, to: string): boolean {
  const s = isoToDateStr(iso)
  return s >= from && s <= to
}
