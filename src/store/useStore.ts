import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, Lot, PaymentMethod, Product, Sale, SaleItem, SalePayment, Settings, StockMovement } from '@/types'
import { uid } from '@/lib/ids'
import { nowISO } from '@/lib/dates'
import { calcFee, round2 } from '@/lib/payments'
import { pickLotsFIFO, productLots } from '@/lib/stock'
import { DEFAULT_SETTINGS, emptyData } from './defaults'
import { buildDemoData } from './seed'

export interface Toast {
  id: string
  message: string
  kind: 'ok' | 'error' | 'info'
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string }

export interface ProductInput {
  name: string
  category: string
  costPrice: number
  salePrice: number
  minStock: number
}

export interface SaleInput {
  items: { productId: string; quantity: number }[]
  method: PaymentMethod
  installments?: number
  received?: number
}

export interface RemoveStockInput {
  productId: string
  lotId?: string
  quantity: number
  type: 'perda' | 'descarte' | 'ajuste'
  note?: string
}

export interface Store extends AppData {
  toasts: Toast[]

  addProduct(input: ProductInput, initialLot?: { quantity: number; expiresAt: string }): Product
  updateProduct(id: string, input: ProductInput): void
  deleteProduct(id: string): void

  addLot(productId: string, quantity: number, expiresAt: string, note?: string): Result
  removeStock(input: RemoveStockInput): Result

  createSale(input: SaleInput): Result<Sale>
  cancelSale(id: string): Result

  openCash(amount: number): Result
  addCashMovement(type: 'sangria' | 'reforco', amount: number, note?: string): Result
  closeCash(countedAmount: number, expectedAmount: number): Result

  updateSettings(patch: Partial<Settings>): void

  exportData(): string
  importData(json: string): Result
  loadDemoData(): void
  resetAll(): void

  notify(message: string, kind?: Toast['kind']): void
  dismissToast(id: string): void
}

const fail = (error: string): Result<never> => ({ ok: false, error })
const done: Result = { ok: true, value: undefined }

function pickData(s: AppData): AppData {
  return {
    products: s.products,
    lots: s.lots,
    movements: s.movements,
    sales: s.sales,
    cashSessions: s.cashSessions,
    settings: s.settings,
    nextSaleNumber: s.nextSaleNumber,
  }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      toasts: [],

      // ---------- Produtos ----------
      addProduct(input, initialLot) {
        const product: Product = { id: uid(), ...input, createdAt: nowISO() }
        set((s) => ({ products: [...s.products, product] }))
        if (initialLot && initialLot.quantity > 0) {
          get().addLot(product.id, initialLot.quantity, initialLot.expiresAt, 'Estoque inicial')
        }
        return product
      },

      updateProduct(id, input) {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...input } : p)) }))
      },

      deleteProduct(id) {
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          lots: s.lots.filter((l) => l.productId !== id),
        }))
      },

      // ---------- Estoque ----------
      addLot(productId, quantity, expiresAt, note) {
        const product = get().products.find((p) => p.id === productId)
        if (!product) return fail('Produto não encontrado.')
        if (quantity <= 0) return fail('Informe uma quantidade maior que zero.')
        if (!expiresAt) return fail('Informe a data de validade do lote.')
        const now = nowISO()
        const lot: Lot = { id: uid(), productId, quantity, expiresAt, createdAt: now }
        const movement: StockMovement = {
          id: uid(),
          productId,
          productName: product.name,
          lotId: lot.id,
          lotExpiresAt: expiresAt,
          type: 'entrada',
          quantity,
          unitCost: product.costPrice,
          note,
          createdAt: now,
        }
        set((s) => ({ lots: [...s.lots, lot], movements: [...s.movements, movement] }))
        return done
      },

      removeStock({ productId, lotId, quantity, type, note }) {
        const s = get()
        const product = s.products.find((p) => p.id === productId)
        if (!product) return fail('Produto não encontrado.')
        if (quantity <= 0) return fail('Informe uma quantidade maior que zero.')

        const lots = s.lots.map((l) => ({ ...l }))
        const candidates = lotId
          ? lots.filter((l) => l.id === lotId && l.quantity > 0)
          : productLots(lots, productId)
        const available = candidates.reduce((a, l) => a + l.quantity, 0)
        if (available < quantity) return fail('Quantidade maior que o saldo disponível.')

        const now = nowISO()
        const movements: StockMovement[] = []
        let remaining = quantity
        for (const lot of candidates) {
          if (remaining <= 0) break
          const take = Math.min(lot.quantity, remaining)
          const target = lots.find((l) => l.id === lot.id)!
          target.quantity -= take
          remaining -= take
          movements.push({
            id: uid(),
            productId,
            productName: product.name,
            lotId: lot.id,
            lotExpiresAt: lot.expiresAt,
            type,
            quantity: -take,
            unitCost: product.costPrice,
            note,
            createdAt: now,
          })
        }
        set({ lots, movements: [...s.movements, ...movements] })
        return done
      },

      // ---------- Vendas ----------
      createSale(input) {
        const s = get()
        const session = s.cashSessions.find((c) => c.status === 'aberto')
        if (!session) return fail('Abra o caixa antes de registrar vendas.')
        if (input.items.length === 0) return fail('Adicione produtos ao carrinho.')

        const lots = s.lots.map((l) => ({ ...l }))
        const now = nowISO()
        const saleId = uid()
        const items: SaleItem[] = []
        const movements: StockMovement[] = []

        for (const it of input.items) {
          const product = s.products.find((p) => p.id === it.productId)
          if (!product) return fail('Produto não encontrado.')
          if (it.quantity <= 0) continue
          const picked = pickLotsFIFO(lots, product.id, it.quantity)
          if (!picked) return fail(`Estoque insuficiente para ${product.name}.`)
          for (const pk of picked) {
            const lot = lots.find((l) => l.id === pk.lotId)!
            lot.quantity -= pk.quantity
          }
          items.push({
            productId: product.id,
            name: product.name,
            unitPrice: product.salePrice,
            unitCost: product.costPrice,
            quantity: it.quantity,
            lots: picked,
          })
          movements.push({
            id: uid(),
            productId: product.id,
            productName: product.name,
            type: 'venda',
            quantity: -it.quantity,
            unitCost: product.costPrice,
            saleId,
            createdAt: now,
          })
        }
        if (items.length === 0) return fail('Adicione produtos ao carrinho.')

        const total = round2(items.reduce((a, i) => a + i.unitPrice * i.quantity, 0))
        const feePercent = s.settings.fees[input.method] ?? 0
        const { feeValue, net } = calcFee(total, feePercent)
        const payment: SalePayment = { method: input.method, feePercent, feeValue, net }

        if (input.method === 'credito_parcelado') {
          payment.installments = Math.min(12, Math.max(2, input.installments ?? 2))
        }
        if (input.method === 'dinheiro') {
          const received = round2(input.received ?? total)
          if (received < total) return fail('Valor recebido menor que o total da venda.')
          payment.received = received
          payment.change = round2(received - total)
        }

        const sale: Sale = {
          id: saleId,
          number: s.nextSaleNumber,
          items,
          total,
          payment,
          status: 'concluida',
          cashSessionId: session.id,
          createdAt: now,
        }
        set({
          lots,
          sales: [...s.sales, sale],
          movements: [...s.movements, ...movements],
          nextSaleNumber: s.nextSaleNumber + 1,
        })
        return { ok: true, value: sale }
      },

      cancelSale(id) {
        const s = get()
        const sale = s.sales.find((x) => x.id === id)
        if (!sale) return fail('Venda não encontrada.')
        if (sale.status === 'cancelada') return fail('Esta venda já foi cancelada.')

        const now = nowISO()
        const lots = s.lots.map((l) => ({ ...l }))
        const movements: StockMovement[] = []
        for (const item of sale.items) {
          for (const used of item.lots) {
            const lot = lots.find((l) => l.id === used.lotId)
            if (lot) {
              lot.quantity += used.quantity
            } else if (s.products.some((p) => p.id === item.productId)) {
              lots.push({
                id: used.lotId,
                productId: item.productId,
                quantity: used.quantity,
                expiresAt: used.expiresAt,
                createdAt: now,
              })
            }
          }
          movements.push({
            id: uid(),
            productId: item.productId,
            productName: item.name,
            type: 'cancelamento',
            quantity: item.quantity,
            unitCost: item.unitCost,
            saleId: sale.id,
            note: `Cancelamento da venda #${sale.number}`,
            createdAt: now,
          })
        }
        set({
          lots,
          movements: [...s.movements, ...movements],
          sales: s.sales.map((x) => (x.id === id ? { ...x, status: 'cancelada', canceledAt: now } : x)),
        })
        return done
      },

      // ---------- Caixa ----------
      openCash(amount) {
        const s = get()
        if (s.cashSessions.some((c) => c.status === 'aberto')) return fail('Já existe um caixa aberto.')
        if (amount < 0) return fail('Informe um valor inicial válido.')
        set({
          cashSessions: [
            ...s.cashSessions,
            { id: uid(), openedAt: nowISO(), openingAmount: round2(amount), movements: [], status: 'aberto' },
          ],
        })
        return done
      },

      addCashMovement(type, amount, note) {
        const s = get()
        const session = s.cashSessions.find((c) => c.status === 'aberto')
        if (!session) return fail('Nenhum caixa aberto.')
        if (amount <= 0) return fail('Informe um valor maior que zero.')
        const movement = { id: uid(), type, amount: round2(amount), note, createdAt: nowISO() }
        set({
          cashSessions: s.cashSessions.map((c) =>
            c.id === session.id ? { ...c, movements: [...c.movements, movement] } : c,
          ),
        })
        return done
      },

      closeCash(countedAmount, expectedAmount) {
        const s = get()
        const session = s.cashSessions.find((c) => c.status === 'aberto')
        if (!session) return fail('Nenhum caixa aberto.')
        if (countedAmount < 0) return fail('Informe o valor contado.')
        set({
          cashSessions: s.cashSessions.map((c) =>
            c.id === session.id
              ? {
                  ...c,
                  status: 'fechado',
                  closedAt: nowISO(),
                  countedAmount: round2(countedAmount),
                  expectedAmount: round2(expectedAmount),
                }
              : c,
          ),
        })
        return done
      },

      // ---------- Configurações ----------
      updateSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
      },

      // ---------- Dados ----------
      exportData() {
        return JSON.stringify({ app: 'cantina-curitiba', version: 1, exportedAt: nowISO(), data: pickData(get()) }, null, 2)
      },

      importData(json) {
        try {
          const parsed = JSON.parse(json)
          const data: Partial<AppData> = parsed?.data ?? parsed
          const arrays = ['products', 'lots', 'movements', 'sales', 'cashSessions'] as const
          for (const key of arrays) {
            if (!Array.isArray(data[key])) return fail('Arquivo inválido: não é um backup deste sistema.')
          }
          set({
            products: data.products!,
            lots: data.lots!,
            movements: data.movements!,
            sales: data.sales!,
            cashSessions: data.cashSessions!,
            settings: {
              ...DEFAULT_SETTINGS,
              ...(data.settings ?? {}),
              fees: { ...DEFAULT_SETTINGS.fees, ...(data.settings?.fees ?? {}) },
              categories: data.settings?.categories ?? DEFAULT_SETTINGS.categories,
            },
            nextSaleNumber:
              typeof data.nextSaleNumber === 'number'
                ? data.nextSaleNumber
                : Math.max(0, ...data.sales!.map((x) => x.number)) + 1,
          })
          return done
        } catch {
          return fail('Não foi possível ler o arquivo.')
        }
      },

      loadDemoData() {
        set({ ...buildDemoData(), settings: { ...get().settings } })
      },

      resetAll() {
        set({ ...emptyData() })
      },

      // ---------- Interface ----------
      notify(message, kind = 'ok') {
        const id = uid()
        set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
        setTimeout(() => get().dismissToast(id), 3500)
      },

      dismissToast(id) {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      },
    }),
    {
      name: 'cantina-curitiba',
      version: 1,
      partialize: (s) => pickData(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
            fees: { ...DEFAULT_SETTINGS.fees, ...(p.settings?.fees ?? {}) },
          },
        }
      },
    },
  ),
)
