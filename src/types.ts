export type PaymentMethod = 'debito' | 'credito' | 'credito_parcelado' | 'dinheiro' | 'pix' | 'voucher' | 'cartao'

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
  /** NSU (número sequencial único) da maquininha ou comprovante do Pix. */
  nsu?: string
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
  /** Cliente do cartão fidelidade (quando pago com o cartão). */
  customerId?: string
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

/** Funcionário que pegou algum produto e vai pagar depois ("fiado"). */
export interface Fiado {
  id: string
  name: string
  /** Data em que o produto foi pego (AAAA-MM-DD). */
  takenAt: string
  /** Data combinada para pagar (AAAA-MM-DD). */
  dueAt: string
  amount: number
  note?: string
  paid: boolean
  paidAt?: string // AAAA-MM-DD
  createdAt: string
}

/** Cliente com cartão fidelidade: carteira devedora paga no fechamento do mês. O id é o uid do login do cliente. */
export interface Customer {
  id: string
  name: string
  email: string
  /** Número do cartão (16 dígitos, só para exibição). */
  cardNumber: string
  /** Limite de dívida em aberto. 0 = sem limite. */
  limit: number
  active: boolean
  createdAt: string
}

/** Lançamento na carteira do cliente: compra (aumenta a dívida) ou pagamento (reduz). */
export interface CardEntry {
  id: string
  customerId: string
  type: 'compra' | 'pagamento'
  amount: number
  items?: { name: string; quantity: number; unitPrice: number }[]
  saleId?: string
  saleNumber?: number
  note?: string
  createdAt: string
}

export interface Settings {
  storeName: string
  fees: Record<PaymentMethod, number>
  expiryWarningDays: number
  /** Logo da cantina em data URL (PNG/JPEG reduzido). */
  logo?: string
  categories: string[]
}

export interface AppData {
  products: Product[]
  lots: Lot[]
  movements: StockMovement[]
  sales: Sale[]
  cashSessions: CashSession[]
  fiados: Fiado[]
  customers: Customer[]
  cardEntries: CardEntry[]
  settings: Settings
  nextSaleNumber: number
}
