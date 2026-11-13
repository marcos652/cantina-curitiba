import type { PaymentMethod } from '@/types'
import { Banknote, CreditCard, Layers, QrCode, type LucideIcon } from 'lucide-react'

export const PAYMENT_METHODS: PaymentMethod[] = ['debito', 'credito', 'credito_parcelado', 'dinheiro', 'pix']

export const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  debito: CreditCard,
  credito: CreditCard,
  credito_parcelado: Layers,
  dinheiro: Banknote,
  pix: QrCode,
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  debito: 'Débito',
  credito: 'Crédito à vista',
  credito_parcelado: 'Crédito parcelado',
  dinheiro: 'Dinheiro',
  pix: 'Pix',
}

export const PAYMENT_SHORT: Record<PaymentMethod, string> = {
  debito: 'Débito',
  credito: 'Crédito',
  credito_parcelado: 'Parcelado',
  dinheiro: 'Dinheiro',
  pix: 'Pix',
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function calcFee(total: number, percent: number): { feeValue: number; net: number } {
  const feeValue = round2(total * (percent / 100))
  return { feeValue, net: round2(total - feeValue) }
}

export function installmentValue(total: number, n: number): number {
  return round2(total / n)
}

export function paymentDescription(p: { method: PaymentMethod; installments?: number }): string {
  if (p.method === 'credito_parcelado' && p.installments) return 'Crédito ' + p.installments + 'x'
  return PAYMENT_SHORT[p.method]
}
