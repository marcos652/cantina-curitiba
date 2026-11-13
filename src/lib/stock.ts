import type { Lot, Product, SaleItemLot } from '@/types'
import { daysUntil, todayStr } from './dates'

export type ExpiryStatus = 'vencido' | 'vencendo' | 'ok'

export function lotStatus(lot: Pick<Lot, 'expiresAt'>, warningDays: number): ExpiryStatus {
  const d = daysUntil(lot.expiresAt)
  if (d < 0) return 'vencido'
  if (d <= warningDays) return 'vencendo'
  return 'ok'
}

export function isExpired(lot: Pick<Lot, 'expiresAt'>): boolean {
  return lot.expiresAt < todayStr()
}

/** Lotes com saldo de um produto, do que vence primeiro ao que vence por último. */
export function productLots(lots: Lot[], productId: string): Lot[] {
  return lots
    .filter((l) => l.productId === productId && l.quantity > 0)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
}

export function productStock(lots: Lot[], productId: string): number {
  return productLots(lots, productId).reduce((s, l) => s + l.quantity, 0)
}

export function sellableStock(lots: Lot[], productId: string): number {
  return productLots(lots, productId)
    .filter((l) => !isExpired(l))
    .reduce((s, l) => s + l.quantity, 0)
}

export function expiredStock(lots: Lot[], productId: string): number {
  return productLots(lots, productId)
    .filter(isExpired)
    .reduce((s, l) => s + l.quantity, 0)
}

export function nextExpiry(lots: Lot[], productId: string): string | undefined {
  return productLots(lots, productId)[0]?.expiresAt
}

/** Escolhe lotes não vencidos, do que vence primeiro. Retorna null se faltar estoque. */
export function pickLotsFIFO(lots: Lot[], productId: string, quantity: number): SaleItemLot[] | null {
  let remaining = quantity
  const picked: SaleItemLot[] = []
  for (const lot of productLots(lots, productId)) {
    if (isExpired(lot)) continue
    if (remaining <= 0) break
    const take = Math.min(lot.quantity, remaining)
    picked.push({ lotId: lot.id, quantity: take, expiresAt: lot.expiresAt })
    remaining -= take
  }
  return remaining > 0 ? null : picked
}

export function isLowStock(product: Product, lots: Lot[]): boolean {
  return sellableStock(lots, product.id) <= product.minStock
}
