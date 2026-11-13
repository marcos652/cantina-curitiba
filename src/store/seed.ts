import type { AppData, CashMovement, CashSession, Lot, PaymentMethod, Product, Sale, SaleItem, StockMovement } from '@/types'
import { uid } from '@/lib/ids'
import { addDays, parseDateStr, todayStr } from '@/lib/dates'
import { calcFee, round2 } from '@/lib/payments'
import { emptyData } from './defaults'

/** Gerador pseudoaleatório determinístico para que os dados de exemplo sejam sempre os mesmos. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const PRODUCT_DEFS: Array<[string, string, number, number, number]> = [
  ['Coxinha de frango', 'Salgados', 2.1, 6.5, 10],
  ['Pastel de carne', 'Salgados', 2.4, 7, 10],
  ['Pão de queijo', 'Salgados', 1.2, 4, 15],
  ['Empada de frango', 'Salgados', 2.6, 7.5, 8],
  ['Kibe', 'Salgados', 2, 6, 8],
  ['Enroladinho de salsicha', 'Salgados', 1.6, 5, 10],
  ['Esfiha de carne', 'Salgados', 2.2, 6.5, 8],
  ['Bolinho de bacalhau', 'Salgados', 3, 8.5, 6],
  ['Brigadeiro', 'Doces', 0.9, 3, 12],
  ['Bolo de cenoura (fatia)', 'Doces', 2.3, 7, 5],
  ['Refrigerante lata', 'Bebidas', 2.8, 6, 12],
  ['Suco natural 300ml', 'Bebidas', 2.5, 8, 6],
  ['Água mineral 500ml', 'Bebidas', 1, 3.5, 12],
  ['Café expresso', 'Bebidas', 0.8, 4, 0],
]

/** Dias até vencer de cada lote, por produto (índice). Negativo = já venceu. */
const EXPIRY_PLAN: number[][] = [
  [-2, 14],
  [2, 20],
  [15],
  [1],
  [30],
  [-1, 10],
  [3, 25],
  [12],
  [2],
  [1, 6],
  [120],
  [3],
  [240],
  [90],
]

const METHOD_WEIGHTS: Array<[PaymentMethod, number]> = [
  ['pix', 30],
  ['debito', 25],
  ['credito', 18],
  ['dinheiro', 17],
  ['credito_parcelado', 10],
]

function at(dateStr: string, hour: number, minute: number): string {
  const d = parseDateStr(dateStr)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function buildDemoData(): AppData {
  const rand = rng(20241113)
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
  const data = emptyData()
  const today = todayStr()
  const createdAt = at(addDays(today, -20), 9, 0)

  const products: Product[] = PRODUCT_DEFS.map(([name, category, costPrice, salePrice, minStock]) => ({
    id: uid(),
    name,
    category,
    costPrice,
    salePrice,
    minStock,
    createdAt,
  }))

  const lots: Lot[] = []
  const movements: StockMovement[] = []
  products.forEach((p, i) => {
    const plan = EXPIRY_PLAN[i] ?? [30]
    plan.forEach((offset) => {
      const quantity = i === 7 ? 4 : int(45, 90)
      const lot: Lot = { id: uid(), productId: p.id, quantity, expiresAt: addDays(today, offset), createdAt }
      lots.push(lot)
      movements.push({
        id: uid(),
        productId: p.id,
        productName: p.name,
        lotId: lot.id,
        lotExpiresAt: lot.expiresAt,
        type: 'entrada',
        quantity,
        unitCost: p.costPrice,
        note: 'Compra',
        createdAt,
      })
    })
  })

  const pickMethod = (): PaymentMethod => {
    const total = METHOD_WEIGHTS.reduce((a, [, w]) => a + w, 0)
    let r = rand() * total
    for (const [m, w] of METHOD_WEIGHTS) {
      if (r < w) return m
      r -= w
    }
    return 'pix'
  }

  const sales: Sale[] = []
  const sessions: CashSession[] = []
  let saleNumber = 1
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (let back = 14; back >= 0; back--) {
    const day = addDays(today, -back)
    const isToday = back === 0
    const session: CashSession = {
      id: uid(),
      openedAt: at(day, 7, 30),
      openingAmount: 100,
      movements: [],
      status: isToday ? 'aberto' : 'fechado',
    }

    const count = isToday ? int(4, 7) : int(6, 13)
    let minute = 8 * 60
    for (let n = 0; n < count; n++) {
      minute += int(20, 70)
      if (!isToday && minute > 17 * 60 + 30) break
      if (isToday && minute > nowMinutes) break

      const itemCount = int(1, 3)
      const chosen = new Set<number>()
      const items: SaleItem[] = []
      for (let k = 0; k < itemCount; k++) {
        const idx = int(0, products.length - 1)
        if (chosen.has(idx)) continue
        chosen.add(idx)
        const product = products[idx]
        const wanted = int(1, 3)
        // Consome do lote que vence por último, para manter os lotes vencidos/vencendo visíveis na demonstração.
        const candidates = lots
          .filter((l) => l.productId === product.id && l.quantity > 0)
          .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))
        let remaining = wanted
        const used: SaleItem['lots'] = []
        for (const lot of candidates) {
          if (remaining <= 0) break
          const take = Math.min(lot.quantity - 1, remaining)
          if (take <= 0) continue
          lot.quantity -= take
          used.push({ lotId: lot.id, quantity: take, expiresAt: lot.expiresAt })
          remaining -= take
        }
        const quantity = wanted - remaining
        if (quantity <= 0) continue
        items.push({
          productId: product.id,
          name: product.name,
          unitPrice: product.salePrice,
          unitCost: product.costPrice,
          quantity,
          lots: used,
        })
      }
      if (items.length === 0) continue

      const total = round2(items.reduce((a, i) => a + i.unitPrice * i.quantity, 0))
      const method = pickMethod()
      const feePercent = data.settings.fees[method]
      const { feeValue, net } = calcFee(total, feePercent)
      const sale: Sale = {
        id: uid(),
        number: saleNumber++,
        items,
        total,
        payment: { method, feePercent, feeValue, net },
        status: 'concluida',
        cashSessionId: session.id,
        createdAt: at(day, Math.floor(minute / 60), minute % 60),
      }
      if (method === 'credito_parcelado') sale.payment.installments = int(2, 6)
      if (method === 'dinheiro') {
        const received = Math.ceil(total / 5) * 5
        sale.payment.received = received
        sale.payment.change = round2(received - total)
      }
      sales.push(sale)
      for (const item of items) {
        movements.push({
          id: uid(),
          productId: item.productId,
          productName: item.name,
          type: 'venda',
          quantity: -item.quantity,
          unitCost: item.unitCost,
          saleId: sale.id,
          createdAt: sale.createdAt,
        })
      }
    }

    const cashSales = sales
      .filter((s) => s.cashSessionId === session.id && s.payment.method === 'dinheiro')
      .reduce((a, s) => a + s.total, 0)

    // Sangria só quando há dinheiro suficiente na gaveta, mantendo ao menos R$ 50 de troco.
    const available = Math.floor((session.openingAmount + cashSales - 50) / 10) * 10
    if (!isToday && available >= 20 && rand() < 0.5) {
      const sangria: CashMovement = {
        id: uid(),
        type: 'sangria',
        amount: Math.min(available, int(2, 10) * 10),
        note: 'Depósito',
        createdAt: at(day, 17, 45),
      }
      session.movements.push(sangria)
    }

    if (!isToday) {
      const out = session.movements.filter((m) => m.type === 'sangria').reduce((a, m) => a + m.amount, 0)
      const expected = round2(session.openingAmount + cashSales - out)
      const diff = [0, 0, 0, -2, 1, 0.5][int(0, 5)]
      session.closedAt = at(day, 18, 0)
      session.expectedAmount = expected
      session.countedAmount = round2(expected + diff)
    }
    sessions.push(session)
  }

  // Perdas por vencimento recentes.
  const lossDays = [-6, -3]
  const lossProducts = [products[0], products[5]]
  lossDays.forEach((offset, i) => {
    const p = lossProducts[i]
    const quantity = int(3, 7)
    movements.push({
      id: uid(),
      productId: p.id,
      productName: p.name,
      type: 'descarte',
      quantity: -quantity,
      unitCost: p.costPrice,
      note: 'Vencido',
      createdAt: at(addDays(today, offset), 9, 15),
    })
  })

  movements.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    ...data,
    products,
    lots,
    movements,
    sales,
    cashSessions: sessions,
    nextSaleNumber: saleNumber,
  }
}
