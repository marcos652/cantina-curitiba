import type { Customer } from '@/types'
import { newCardNumber } from '@/lib/card'
import { useSession } from './session'
import { useStore } from './useStore'

export interface Member {
  uid: string
  nome: string
  email: string
  role: 'dono' | 'funcionario'
  criadoEm: string
}

export interface NewMember {
  nome: string
  email: string
  senha: string
}

export function createMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'auth/email-already-in-use') return 'Esse e-mail já tem uma conta. Cada e-mail só pode pertencer a uma cantina.'
  if (code === 'auth/weak-password') return 'A senha precisa ter pelo menos 6 caracteres.'
  if (code === 'auth/invalid-email') return 'E-mail inválido.'
  if (code === 'permission-denied' || code.includes('permission-denied')) return 'Sem permissão. Publique as regras novas do Firestore (arquivo firestore.rules).'
  if (code === 'auth/network-request-failed') return 'Sem conexão com a internet.'
  return 'Não foi possível criar o usuário. Tente de novo.'
}

// ---------- Modo demonstração: lista só em memória ----------
const demoMembers: Member[] = [{ uid: 'demo', nome: 'Você', email: 'Modo demonstração', role: 'dono', criadoEm: new Date().toISOString() }]

// ---------- Firebase ----------
async function fb() {
  const [{ app, db }, fs, au, fa] = await Promise.all([import('@/lib/firebase'), import('firebase/firestore'), import('firebase/auth'), import('firebase/app')])
  return { app, db, fs, au, fa }
}

export async function listMembers(): Promise<Member[]> {
  const { memory, lojaId, user } = useSession.getState()
  if (memory) return [...demoMembers]
  const { db, fs } = await fb()
  const snap = await fs.getDocs(fs.collection(db, 'lojas', lojaId, 'membros'))
  const members = snap.docs.map((d) => ({ ...d.data(), uid: d.id }) as Member)
  const owner: Member = { uid: lojaId, nome: 'Dono da cantina', email: user?.uid === lojaId ? (user?.email ?? '') : '', role: 'dono', criadoEm: '' }
  return [owner, ...members.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))]
}

/**
 * Cria o login da pessoa sem tirar o dono da sessão: a conta é criada por um app Firebase
 * secundário, e em seguida o dono grava o vínculo da pessoa com a loja.
 */
export async function createMember(input: NewMember): Promise<void> {
  const { memory, lojaId } = useSession.getState()
  const nome = input.nome.trim()
  const email = input.email.trim()
  if (memory) {
    demoMembers.push({ uid: 'demo-' + Date.now(), nome, email, role: 'funcionario', criadoEm: new Date().toISOString() })
    return
  }
  const { app, db, fs, au, fa } = await fb()
  const secondary = fa.initializeApp(app.options, 'secundario-' + Date.now())
  let uid = ''
  try {
    const sauth = au.getAuth(secondary)
    const cred = await au.createUserWithEmailAndPassword(sauth, email, input.senha)
    uid = cred.user.uid
    await au.signOut(sauth)
  } finally {
    await fa.deleteApp(secondary)
  }
  const batch = fs.writeBatch(db)
  const criadoEm = new Date().toISOString()
  batch.set(fs.doc(db, 'lojas', lojaId, 'membros', uid), { nome, email, role: 'funcionario', criadoEm })
  batch.set(fs.doc(db, 'usuarios', uid), { lojaId, nome, email })
  await batch.commit()
}

export async function removeMember(uid: string): Promise<void> {
  const { memory, lojaId } = useSession.getState()
  if (memory) {
    const i = demoMembers.findIndex((m) => m.uid === uid)
    if (i >= 0) demoMembers.splice(i, 1)
    return
  }
  const { db, fs } = await fb()
  const batch = fs.writeBatch(db)
  batch.delete(fs.doc(db, 'lojas', lojaId, 'membros', uid))
  batch.delete(fs.doc(db, 'usuarios', uid))
  await batch.commit()
}

export interface NewCustomer {
  nome: string
  email: string
  senha: string
  limit: number
}

/** Cria o login do cliente (app secundário, sem tirar o dono da sessão) e o cartão dele. */
export async function createCustomer(input: NewCustomer): Promise<void> {
  const { memory, lojaId } = useSession.getState()
  const name = input.nome.trim()
  const email = input.email.trim()
  const make = (id: string): Customer => ({ id, name, email, cardNumber: newCardNumber(), limit: Math.max(0, input.limit || 0), active: true, createdAt: new Date().toISOString() })
  if (memory) {
    useStore.getState().addCustomer(make('demo-' + Date.now()))
    return
  }
  const { app, db, fs, au, fa } = await fb()
  const secondary = fa.initializeApp(app.options, 'secundario-' + Date.now())
  try {
    const sauth = au.getAuth(secondary)
    const cred = await au.createUserWithEmailAndPassword(sauth, email, input.senha)
    const customer = make(cred.user.uid)
    try {
      const batch = fs.writeBatch(db)
      batch.set(fs.doc(db, 'lojas', lojaId, 'customers', customer.id), customer)
      batch.set(fs.doc(db, 'usuarios', customer.id), { lojaId, nome: name, email })
      await batch.commit()
    } catch (e) {
      // Não deixa um login órfão para trás: desfaz a conta recém-criada.
      await au.deleteUser(cred.user).catch(() => {})
      throw e
    }
    await au.signOut(sauth)
    useStore.getState().addCustomer(customer)
  } finally {
    await fa.deleteApp(secondary)
  }
}

/** Remove o vínculo do cliente com a loja (o login dele deixa de dar acesso). */
export async function removeCustomerAccess(id: string): Promise<void> {
  const { memory, lojaId } = useSession.getState()
  if (!memory) {
    const { db, fs } = await fb()
    const batch = fs.writeBatch(db)
    batch.delete(fs.doc(db, 'usuarios', id))
    await batch.commit()
    void lojaId
  }
  useStore.getState().removeCustomer(id)
}
