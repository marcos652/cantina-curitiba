import { create } from 'zustand'

export type Phase = 'init' | 'login' | 'loading' | 'ready' | 'error'
export type SyncState = 'ok' | 'syncing' | 'offline' | 'error'

interface Session {
  phase: Phase
  user: { uid: string; email: string } | null
  sync: SyncState
  errorMessage: string
  /** Detalhe técnico do erro (código e caminho no banco), para facilitar o suporte. */
  errorDetail: string
  /** Aviso mostrado na tela de login (ex.: conta de cliente tentando entrar pelo painel). */
  notice: string
  memory: boolean
  /** Pasta de dados da loja no banco. É o uid do dono; os funcionários usam a mesma. */
  lojaId: string
  role: 'dono' | 'funcionario' | 'cliente'
}

/** Estado de acesso e de sincronização. Fica separado dos dados da cantina de propósito. */
export const useSession = create<Session>(() => ({
  phase: 'init',
  user: null,
  sync: 'ok',
  errorMessage: '',
  errorDetail: '',
  notice: '',
  memory: false,
  lojaId: '',
  role: 'dono',
}))

export const setSession = (patch: Partial<Session>) => useSession.setState(patch)
