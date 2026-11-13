import type { AppData, Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'Cantina Curitiba',
  fees: { debito: 1.99, credito: 3.19, credito_parcelado: 4.49, dinheiro: 0, pix: 0 },
  expiryWarningDays: 3,
  categories: ['Salgados', 'Doces', 'Bebidas', 'Lanches', 'Outros'],
  accent: '#2E5BFF',
}

export const ACCENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Azul', value: '#2E5BFF' },
  { label: 'Índigo', value: '#4F46E5' },
  { label: 'Roxo', value: '#7C3AED' },
  { label: 'Rosa', value: '#DB2777' },
  { label: 'Grafite', value: '#374151' },
]

export function emptyData(): AppData {
  return {
    products: [],
    lots: [],
    movements: [],
    sales: [],
    cashSessions: [],
    settings: { ...DEFAULT_SETTINGS, fees: { ...DEFAULT_SETTINGS.fees }, categories: [...DEFAULT_SETTINGS.categories] },
    nextSaleNumber: 1,
  }
}
