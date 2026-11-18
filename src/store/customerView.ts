import { create } from 'zustand'
import type { CardEntry, Customer } from '@/types'

/** O que o cliente logado enxerga: só o próprio cartão e os próprios lançamentos. */
interface View {
  customer: Customer | null
  entries: CardEntry[]
  storeName: string
}

export const useCustomerView = create<View>(() => ({ customer: null, entries: [], storeName: '' }))

let stop: (() => void) | null = null

export async function startCustomerView(db: import('firebase/firestore').Firestore, lojaId: string, uid: string): Promise<void> {
  stopCustomerView()
  const fs = await import('firebase/firestore')
  const cust = await fs.getDoc(fs.doc(db, 'lojas', lojaId, 'customers', uid))
  if (!cust.exists()) throw Object.assign(new Error('cliente'), { code: 'permission-denied' })
  const q = fs.query(fs.collection(db, 'lojas', lojaId, 'cardEntries'), fs.where('customerId', '==', uid))
  const first = await fs.getDocs(q)
  const toEntries = (snap: import('firebase/firestore').QuerySnapshot) =>
    snap.docs.map((d) => ({ ...d.data(), id: d.id }) as CardEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  useCustomerView.setState({ customer: { ...cust.data(), id: cust.id } as Customer, entries: toEntries(first) })
  const un1 = fs.onSnapshot(q, (snap) => useCustomerView.setState({ entries: toEntries(snap) }), () => {})
  const un2 = fs.onSnapshot(fs.doc(db, 'lojas', lojaId, 'customers', uid), (d) => d.exists() && useCustomerView.setState({ customer: { ...d.data(), id: d.id } as Customer }), () => {})
  stop = () => {
    un1()
    un2()
  }
}

export function stopCustomerView() {
  stop?.()
  stop = null
  useCustomerView.setState({ customer: null, entries: [] })
}
