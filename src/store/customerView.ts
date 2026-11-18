import { create } from 'zustand'
import type { CardEntry, Customer, LgpdContract } from '@/types'
import { LGPD_VERSION, buildContractText, hashInput, sha256 } from '@/lib/lgpd'

/** O que o cliente logado enxerga: só o próprio cartão e os próprios lançamentos. */
interface View {
  customer: Customer | null
  entries: CardEntry[]
  storeName: string
  /** Termo de LGPD assinado (null = ainda não assinou). */
  contract: LgpdContract | null
  /** Já consultou se existe termo assinado. */
  contractLoaded: boolean
}

export const useCustomerView = create<View>(() => ({ customer: null, entries: [], storeName: '', contract: null, contractLoaded: false }))

let ctx: { db: import('firebase/firestore').Firestore; lojaId: string; uid: string } | null = null

let stop: (() => void) | null = null

export async function startCustomerView(db: import('firebase/firestore').Firestore, lojaId: string, uid: string): Promise<void> {
  stopCustomerView()
  const fs = await import('firebase/firestore')
  const at = <T,>(path: string, p: Promise<T>) => p.catch((e) => Promise.reject(Object.assign(e as object, { path })))
  const cust = await at('lojas/…/customers/(seu cartão)', fs.getDoc(fs.doc(db, 'lojas', lojaId, 'customers', uid)))
  if (!cust.exists()) throw Object.assign(new Error('cliente'), { code: 'permission-denied' })
  const q = fs.query(fs.collection(db, 'lojas', lojaId, 'cardEntries'), fs.where('customerId', '==', uid))
  const first = await at('lojas/…/cardEntries (seus lançamentos)', fs.getDocs(q))
  const toEntries = (snap: import('firebase/firestore').QuerySnapshot) =>
    snap.docs.map((d) => ({ ...d.data(), id: d.id }) as CardEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  ctx = { db, lojaId, uid }
  useCustomerView.setState({ customer: { ...cust.data(), id: cust.id } as Customer, entries: toEntries(first) })
  // Termo de LGPD: se já assinou, não precisa assinar de novo.
  // Se a leitura for recusada (regras ainda não publicadas), trata como não assinado: a tela do termo explica.
  const ct = await fs.getDoc(fs.doc(db, 'lojas', lojaId, 'lgpdContratos', uid)).catch(() => null)
  useCustomerView.setState({ contract: ct?.exists() ? ({ ...ct.data(), id: ct.id } as LgpdContract) : null, contractLoaded: true })
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
  ctx = null
  useCustomerView.setState({ customer: null, entries: [], contract: null, contractLoaded: false })
}

/** O cliente assina o termo de LGPD. Fica gravado com o texto aceito, o horário e um código de verificação. */
export async function signContract(signedName: string): Promise<void> {
  const { customer } = useCustomerView.getState()
  if (!ctx || !customer) throw new Error('sessão')
  const fs = await import('firebase/firestore')
  const text = buildContractText({ store: customer.storeName ?? 'Cantina', name: customer.name, email: customer.email })
  const base = { customerId: customer.id, name: customer.name, email: customer.email, signedName: signedName.trim(), signedAt: new Date().toISOString(), version: LGPD_VERSION, text }
  const record: Omit<LgpdContract, 'id'> = { ...base, hash: await sha256(hashInput(base)), userAgent: navigator.userAgent.slice(0, 200) }
  await fs.setDoc(fs.doc(ctx.db, 'lojas', ctx.lojaId, 'lgpdContratos', ctx.uid), record)
  useCustomerView.setState({ contract: { ...record, id: ctx.uid } })
}
