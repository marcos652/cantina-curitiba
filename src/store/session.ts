import { create } from 'zustand'

export type Phase = 'init' | 'login' | 'loading' | 'ready' | 'error'
export type SyncState = 'ok' | 'syncing' | 'offline' | 'error'

interface Session {
  phase: Phase
  user: { uid: string; email: string } | null
  sync: SyncState
  errorMessage: string
  memory: boolean
}

/** Estado de acesso e de sincronização. Fica separado dos dados da cantina de propósito. */
export const useSession = create<Session>(() => ({
  phase: 'init',
  user: null,
  sync: 'ok',
  errorMessage: '',
  memory: false,
}))

export const setSession = (patch: Partial<Session>) => useSession.setState(patch)
