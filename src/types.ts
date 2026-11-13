export type PaymentMethod = 'debito' | 'credito' | 'credito_parcelado' | 'dinheiro' | 'pix'

export interface Product {
  id: string
  name: string
  category: string
  costPrice: number
  salePrice: number
  minStock: number
  createdAt: string
}

/** Lote de estoque: cada entrada tem sua própria quantidade e validade. */
export interface Lot {
  id: string
  productId: string
  quantity: number
  expiresAt: string // AAAA-MM-DD
  createdAt: string
}

export type MovementType = 'entrada' | 'venda' | 'cancelamento' | 'perda' | 'descarte' | 'ajuste'

export interface StockMovement {
  id: string
  productId: string
  productName: string
  lotId?: string
  lotExpiresAt?: string
  type: MovementType
  /** Positivo entra, negativo sai. */
  quantity: number
  unitCost: number
  note?: string
  saleId?: string
  createdAt: string
}

export interface SaleItemLot {
  lotId: string
  quantity: number
  expiresAt: string
}

export interface SaleItem {
  productId: string
  name: string
  unitPrice: number
  unitCost: number
  quantity: number
  lots: SaleItemLot[]
}

export interface SalePayment {
  method: PaymentMethod
  installments?: number
  received?: number
  change?: number
  feePercent: number
  feeValue: number
  net: number
}

export interface Sale {
  id: string
  number: number
  items: SaleItem[]
  total: number
  payment: SalePayment
  status: 'concluida' | 'cancelada'
  cashSessionId: string
  createdAt: string
  canceledAt?: string
}

export interface CashMovement {
  id: string
  type: 'sangria' | 'reforco'
  amount: number
  note?: string
  createdAt: string
}

export interface CashSession {
  id: string
  openedAt: string
  closedAt?: string
  openingAmount: number
  movements: CashMovement[]
  countedAmount?: number
  expectedAmount?: number
  status: 'aberto' | 'fechado'
}

export interface Settings {
  storeName: string
  fees: Record<PaymentMethod, number>
  expiryWarningDays: number
  categories: string[]
  accent: string
}

export interface AppData {
  products: Product[]
  lots: Lot[]
  movements: StockMovement[]
  sales: Sale[]
  cashSessions: CashSession[]
  settings: Settings
  nextSaleNumber: number
}
