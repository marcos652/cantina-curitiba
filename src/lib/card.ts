import type { CardEntry } from '@/types'
import { round2 } from './payments'

export interface Balance {
  /** Tudo que já foi pego no cartão. */
  consumed: number
  /** Tudo que já foi pago. */
  paid: number
  /** Dívida em aberto (consumido − pago). */
  owed: number
}

export function customerBalance(entries: CardEntry[], customerId: string, upTo?: string): Balance {
  let consumed = 0
  let paid = 0
  for (const e of entries) {
    if (e.customerId !== customerId) continue
    if (upTo && e.createdAt > upTo) continue
    if (e.type === 'compra') consumed += e.amount
    else paid += e.amount
  }
  consumed = round2(consumed)
  paid = round2(paid)
  return { consumed, paid, owed: round2(Math.max(0, consumed - paid)) }
}

/** Número de cartão fictício de 16 dígitos (só para exibição). */
export function newCardNumber(): string {
  let n = '5'
  for (let i = 1; i < 16; i++) n += Math.floor(Math.random() * 10)
  return n
}

export const formatCardNumber = (n: string) => (n.replace(/\D/g, '').match(/.{1,4}/g) ?? []).join(' ')

export const monthKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Acha o cliente pelo número do cartão (aceita o que o leitor digitar, com ou sem espaços). */
export function findByCardNumber<T extends { cardNumber: string }>(list: T[], raw: string): T | undefined {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 ? list.find((c) => c.cardNumber.replace(/\D/g, '') === digits) : undefined
}
