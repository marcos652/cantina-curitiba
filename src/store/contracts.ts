import { create } from 'zustand'
import type { LgpdContract } from '@/types'
import { useSession } from './session'

/** Termos de LGPD assinados, lidos pela equipe. Somente leitura: quem assina é o próprio cliente. */
interface State {
  items: LgpdContract[]
  loaded: boolean
  error: string
}

export const useContracts = create<State>(() => ({ items: [], loaded: false, error: '' }))

let stop: (() => void) | null = null

export async function startContracts(): Promise<void> {
  stopContracts()
  const { memory, lojaId } = useSession.getState()
  if (memory) return void useContracts.setState({ loaded: true })
  try {
    const [{ db }, fs] = await Promise.all([import('@/lib/firebase'), import('firebase/firestore')])
    stop = fs.onSnapshot(
      fs.collection(db, 'lojas', lojaId, 'lgpdContratos'),
      (snap) =>
        useContracts.setState({
          items: snap.docs.map((d) => ({ ...d.data(), id: d.id }) as LgpdContract).sort((a, b) => b.signedAt.localeCompare(a.signedAt)),
          loaded: true,
          error: '',
        }),
      (e) => useContracts.setState({ loaded: true, error: (e as { code?: string }).code?.includes('permission') ? 'permission' : 'erro' }),
    )
  } catch {
    useContracts.setState({ loaded: true, error: 'erro' })
  }
}

export function stopContracts() {
  stop?.()
  stop = null
}
