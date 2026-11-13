import type { CashSession, Lot, PaymentMethod, Product, Sale, StockMovement } from '@/types'
import { isoInRange, isoToDateStr } from '@/lib/dates'
import { PAYMENT_METHODS, round2 } from '@/lib/payments'
import { isLowStock } from '@/lib/stock'

export function completed(sales: Sale[]): Sale[] {
  return sales.filter((s) => s.status === 'concluida')
}

export function salesOnDay(sales: Sale[], day: string): Sale[] {
  return completed(sales).filter((s) => isoToDateStr(s.createdAt) === day)
}

export function salesBetween(sales: Sale[], from: string, to: string): Sale[] {
  return completed(sales).filter((s) => isoInRange(s.createdAt, from, to))
}

export function sumTotal(sales: Sale[]): number {
  return round2(sales.reduce((a, s) => a + s.total, 0))
}

export function sumNet(sales: Sale[]): number {
  return round2(sales.reduce((a, s) => a + s.payment.net, 0))
}

export function sumFees(sales: Sale[]): number {
  return round2(sales.reduce((a, s) => a + s.payment.feeValue, 0))
}

export function sumCost(sales: Sale[]): number {
  return round2(sales.reduce((a, s) => a + s.items.reduce((b, i) => b + i.unitCost * i.quantity, 0), 0))
}

export interface MethodTotals {
  method: PaymentMethod
  count: number
  gross: number
  fees: number
  net: number
}

export function totalsByMethod(sales: Sale[]): MethodTotals[] {
  return PAYMENT_METHODS.map((method) => {
    const list = sales.filter((s) => s.payment.method === method)
    return {
      method,
      count: list.length,
      gross: sumTotal(list),
      fees: sumFees(list),
      net: sumNet(list),
    }
  })
}

export function openSession(sessions: CashSession[]): CashSession | undefined {
  return sessions.find((s) => s.status === 'aberto')
}

export function sessionSales(sales: Sale[], sessionId: string): Sale[] {
  return completed(sales).filter((s) => s.cashSessionId === sessionId)
}

/** Dinheiro que deveria estar na gaveta: abertura + vendas em dinheiro + reforços − sangrias. */
export function expectedCash(session: CashSession, sales: Sale[]): number {
  const cashSales = sessionSales(sales, session.id).filter((s) => s.payment.method === 'dinheiro')
  const reinforcements = session.movements.filter((m) => m.type === 'reforco').reduce((a, m) => a + m.amount, 0)
  const withdrawals = session.movements.filter((m) => m.type === 'sangria').reduce((a, m) => a + m.amount, 0)
  return round2(session.openingAmount + sumTotal(cashSales) + reinforcements - withdrawals)
}

export interface ProductTotals {
  productId: string
  name: string
  quantity: number
  revenue: number
  cost: number
  profit: number
}

export function totalsByProduct(sales: Sale[]): ProductTotals[] {
  const map = new Map<string, ProductTotals>()
  for (const sale of sales) {
    for (const item of sale.items) {
      const row = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      }
      row.quantity += item.quantity
      row.revenue = round2(row.revenue + item.unitPrice * item.quantity)
      row.cost = round2(row.cost + item.unitCost * item.quantity)
      row.profit = round2(row.revenue - row.cost)
      map.set(item.productId, row)
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
}

export interface DayTotals {
  date: string
  count: number
  total: number
  fees: number
  net: number
}

export function totalsByDay(sales: Sale[]): DayTotals[] {
  const map = new Map<string, DayTotals>()
  for (const sale of sales) {
    const date = isoToDateStr(sale.createdAt)
    const row = map.get(date) ?? { date, count: 0, total: 0, fees: 0, net: 0 }
    row.count += 1
    row.total = round2(row.total + sale.total)
    row.fees = round2(row.fees + sale.payment.feeValue)
    row.net = round2(row.net + sale.payment.net)
    map.set(date, row)
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export interface LossTotals {
  quantity: number
  value: number
}

export function lossesBetween(movements: StockMovement[], from: string, to: string): { descarte: LossTotals; perda: LossTotals } {
  const sum = (type: 'descarte' | 'perda'): LossTotals => {
    const list = movements.filter((m) => m.type === type && isoInRange(m.createdAt, from, to))
    return {
      quantity: list.reduce((a, m) => a + Math.abs(m.quantity), 0),
      value: round2(list.reduce((a, m) => a + Math.abs(m.quantity) * m.unitCost, 0)),
    }
  }
  return { descarte: sum('descarte'), perda: sum('perda') }
}

export function lowStockProducts(products: Product[], lots: Lot[]): Product[] {
  return products.filter((p) => isLowStock(p, lots))
}
