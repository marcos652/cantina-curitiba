import type { AppData } from '@/types'
import { FirestoreAdapter, MemoryAdapter } from './adapters'
import { setSession, useSession } from './session'
import { startSync, stopSync, type Adapter } from './sync'
import { startCustomerView, stopCustomerView } from './customerView'
import { useStore } from './useStore'

const params = new URLSearchParams(window.location.search)

/** ?backend=memory abre o sistema sem login e sem gravar em lugar nenhum (demonstração e testes). */
export const MEMORY = params.get('backend') === 'memory'
export const memoryDb = new MemoryAdapter()
if (MEMORY) (window as unknown as { __memdb: MemoryAdapter }).__memdb = memoryDb

const LEGACY_KEY = 'cantina-curitiba'

function legacyData(): Partial<AppData> | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? (JSON.parse(raw).state ?? null) : null
  } catch {
    return null
  }
}

export function explain(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code.includes('permission-denied')) return 'O banco de dados recusou o acesso. As regras do Firestore ainda não foram publicadas para este projeto (arquivo firestore.rules).'
  if (code.includes('unavailable') || code.includes('network')) return 'Sem conexão com o banco de dados. Verifique a internet e tente de novo.'
  if (code.includes('failed-precondition')) return 'O banco de dados do Firestore ainda não foi criado neste projeto do Firebase.'
  return 'Não foi possível carregar os dados da cantina.'
}

/** Código do erro e onde ele aconteceu (ex.: permission-denied em lojas/…/customers). */
export function detail(e: unknown): string {
  const err = e as { code?: string; message?: string; path?: string }
  return [err?.code, err?.path ? `em ${err.path}` : '', err?.code ? '' : err?.message].filter(Boolean).join(' ')
}

export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) return 'E-mail ou senha incorretos.'
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  if (code === 'auth/network-request-failed') return 'Sem conexão com a internet.'
  if (code === 'auth/configuration-not-found') return 'O login ainda não foi ativado no Firebase deste projeto (Authentication, Começar, e-mail e senha).'
  if (code === 'auth/operation-not-allowed') return 'O login por e-mail e senha não está ativado no Firebase deste projeto.'
  if (code === 'auth/unauthorized-domain') return 'Este endereço não está autorizado no Firebase (Authentication, Domínios autorizados).'
  if (code === 'auth/email-already-in-use') return 'Já existe uma conta com esse e-mail. Use a aba Entrar.'
  if (code === 'auth/weak-password') return 'A senha precisa ter pelo menos 6 caracteres.'
  if (code === 'auth/user-disabled') return 'Este usuário está desativado.'
  return 'Não foi possível entrar. Tente de novo.'
}

let retryWith: (() => Promise<void>) | null = null
/** Nome da cantina digitado no cadastro: vira o nome da loja assim que a conta nova abrir. */
let pendingStoreName: string | null = null

async function load(makeAdapter: () => Promise<Adapter>) {
  retryWith = () => load(makeAdapter)
  setSession({ phase: 'loading', errorMessage: '', errorDetail: '' })
  try {
    const { usedLegacy } = await startSync(await makeAdapter(), legacyData())
    // Os dados antigos (guardados só neste navegador) já foram enviados ao banco: fica uma cópia de segurança.
    if (usedLegacy) {
      try {
        const raw = localStorage.getItem(LEGACY_KEY)
        if (raw) localStorage.setItem(LEGACY_KEY + '-copia-local', raw)
        localStorage.removeItem(LEGACY_KEY)
      } catch {
        /* sem acesso ao armazenamento local: segue em frente */
      }
    }
    if (pendingStoreName) {
      const st = useStore.getState()
      if (st.products.length === 0 && st.sales.length === 0) st.updateSettings({ storeName: pendingStoreName })
      pendingStoreName = null
    }
    setSession({ phase: 'ready' })
  } catch (e) {
    console.error('Falha ao carregar os dados', e)
    setSession({ phase: 'error', errorMessage: explain(e), errorDetail: detail(e) })
  }
}

/** Cliente do cartão fidelidade: tem vínculo com a loja, mas não é da equipe. Vê só o próprio cartão. */
async function loadCustomer(uid: string, db: import('firebase/firestore').Firestore): Promise<boolean> {
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const me = await getDoc(doc(db, 'usuarios', uid)).catch(() => null)
    const lojaId = me?.exists() ? String(me.data().lojaId ?? '') : ''
    if (!lojaId || lojaId === uid) return false
    // O cliente só consegue ler o próprio cartão (não a lista da equipe), então é por aqui que ele é reconhecido.
    // Se a leitura for recusada, a pessoa não é cliente: segue o fluxo normal da equipe.
    const cust = await getDoc(doc(db, 'lojas', lojaId, 'customers', uid)).catch(() => null)
    if (!cust?.exists()) return false
    setSession({ phase: 'loading', errorMessage: '', errorDetail: '' })
    retryWith = () => loadCustomer(uid, db).then(() => undefined)
    stopSync()
    await startCustomerView(db, lojaId, uid)
    setSession({ lojaId, role: 'cliente', phase: 'ready' })
    return true
  } catch (e) {
    console.error('Falha ao abrir o cartão', e)
    setSession({ phase: 'error', errorMessage: explain(e), errorDetail: detail(e) })
    return true
  }
}

export function retry() {
  void retryWith?.()
}

let booted = false

export async function boot() {
  if (booted) return
  booted = true
  if (MEMORY) {
    setSession({ memory: true, lojaId: 'demo', role: 'dono', user: { uid: 'demo', email: 'Modo demonstração' } })
    await load(async () => memoryDb)
    if (params.get('demo') === '1' && useStore.getState().products.length === 0) useStore.getState().loadDemoData()
    return
  }
  const [{ auth, db }, { onAuthStateChanged }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')])
  onAuthStateChanged(auth, (u) => {
    if (!u) {
      stopSync()
      stopCustomerView()
      useStore.getState().clear()
      setSession({ phase: 'login', user: null, sync: 'ok' })
      return
    }
    setSession({ user: { uid: u.uid, email: u.email ?? '' } })
    void loadCustomer(u.uid, db).then((isCustomer) => {
      if (!isCustomer) void load(async () => {
      // Funcionários têm um registro apontando para a loja do dono; quem não tem é o dono da própria loja.
      let lojaId = u.uid
      let role: 'dono' | 'funcionario' = 'dono'
      const { doc, getDoc } = await import('firebase/firestore')
      // Se a leitura do vínculo falhar (regras antigas), segue como dono da própria loja.
      const me = await getDoc(doc(db, 'usuarios', u.uid)).catch(() => null)
      if (me?.exists() && me.data().lojaId && me.data().lojaId !== u.uid) {
        // Só vale se o dono da loja ainda mantém esta pessoa na equipe.
        const member = await getDoc(doc(db, 'lojas', String(me.data().lojaId), 'membros', u.uid)).catch((e) => Promise.reject(Object.assign(e as object, { path: 'lojas/…/membros (equipe)' })))
        if (member.exists()) {
          lojaId = String(me.data().lojaId)
          role = 'funcionario'
        }
      }
      setSession({ lojaId, role })
      return new FirestoreAdapter(db, lojaId)
    })
    })
  })
}

export async function login(email: string, password: string) {
  const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')])
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function signup(storeName: string, email: string, password: string) {
  const [{ auth }, { createUserWithEmailAndPassword }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')])
  pendingStoreName = storeName.trim() || null
  try {
    await createUserWithEmailAndPassword(auth, email.trim(), password)
  } catch (e) {
    pendingStoreName = null
    throw e
  }
}

export async function sendReset(email: string) {
  const [{ auth }, { sendPasswordResetEmail }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')])
  await sendPasswordResetEmail(auth, email.trim())
}

export async function logout() {
  if (MEMORY) {
    window.location.reload()
    return
  }
  const [{ auth }, { signOut }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')])
  await signOut(auth)
}

export const isMemory = () => useSession.getState().memory
