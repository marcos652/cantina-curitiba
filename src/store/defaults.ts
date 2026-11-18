import type { AppData, Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'Cantina Curitiba',
  fees: { debito: 1.99, credito: 3.19, credito_parcelado: 4.49, dinheiro: 0, pix: 0, voucher: 0, cartao: 0 },
  expiryWarningDays: 3,
  categories: ['Salgados', 'Doces', 'Bebidas', 'Lanches', 'Outros'],
}

export function emptyData(): AppData {
  return {
    products: [],
    lots: [],
    movements: [],
    sales: [],
    cashSessions: [],
    fiados: [],
    customers: [],
    cardEntries: [],
    settings: { ...DEFAULT_SETTINGS, fees: { ...DEFAULT_SETTINGS.fees }, categories: [...DEFAULT_SETTINGS.categories] },
    nextSaleNumber: 1,
  }
}
