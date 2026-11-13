import { collection, doc, getDoc, getDocs, onSnapshot, writeBatch, type Firestore } from 'firebase/firestore'
import type { Settings } from '@/types'
import { COLLS, type Adapter, type CollKey, type Op, type RemoteData } from './sync'

type Item = { id: string } & Record<string, unknown>

/**
 * Estrutura no Firestore, uma pasta por loja (o id da loja é o uid do dono):
 *   lojas/{lojaId}/products | lots | movements | sales | cashSessions   (um documento por registro)
 *   lojas/{lojaId}/config/settings   (nome, taxas, categorias e a logo em base64)
 *   lojas/{lojaId}/config/counters   (próximo número de venda)
 */
export class FirestoreAdapter implements Adapter {
  constructor(
    private db: Firestore,
    private lojaId: string,
  ) {}

  private col(key: CollKey) {
    return collection(this.db, 'lojas', this.lojaId, key)
  }
  private cfg(id: 'settings' | 'counters') {
    return doc(this.db, 'lojas', this.lojaId, 'config', id)
  }

  async loadAll(): Promise<RemoteData> {
    const [snaps, settings, counters] = await Promise.all([
      Promise.all(COLLS.map((k) => getDocs(this.col(k)))),
      getDoc(this.cfg('settings')),
      getDoc(this.cfg('counters')),
    ])
    const collections = {} as Record<CollKey, Item[]>
    COLLS.forEach((k, i) => {
      collections[k] = snaps[i].docs.map((d) => ({ ...d.data(), id: d.id }) as Item)
    })
    return {
      collections,
      settings: settings.exists() ? (settings.data() as Settings) : null,
      counters: counters.exists() ? (counters.data() as { nextSaleNumber: number }) : null,
    }
  }

  commit(ops: Op[]): Promise<void> {
    const batch = writeBatch(this.db)
    for (const op of ops) {
      const ref = op.target === 'settings' || op.target === 'counters' ? this.cfg(op.target) : doc(this.col(op.target), op.id)
      if (op.kind === 'set') batch.set(ref, op.data as Record<string, unknown>)
      else batch.delete(ref)
    }
    return batch.commit()
  }

  listen(h: Parameters<Adapter['listen']>[0]) {
    const unsubs = [
      ...COLLS.map((k) =>
        onSnapshot(
          this.col(k),
          (snap) => h.onCollection(k, snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Item)),
          h.onError,
        ),
      ),
      onSnapshot(this.cfg('settings'), (s) => h.onSettings(s.exists() ? (s.data() as Settings) : null), h.onError),
      onSnapshot(this.cfg('counters'), (s) => h.onCounters(s.exists() ? (s.data() as { nextSaleNumber: number }) : null), h.onError),
    ]
    return () => unsubs.forEach((u) => u())
  }
}

/** Banco falso, só em memória: usado em demonstração e em testes (?backend=memory). Não grava nada em lugar nenhum. */
export class MemoryAdapter implements Adapter {
  data: Record<CollKey, Map<string, Item>> = { products: new Map(), lots: new Map(), movements: new Map(), sales: new Map(), cashSessions: new Map() }
  settings: Settings | null = null
  counters: { nextSaleNumber: number } | null = null
  commits = 0
  private handlers: Parameters<Adapter['listen']>[0] | null = null

  async loadAll(): Promise<RemoteData> {
    const collections = {} as Record<CollKey, Item[]>
    for (const k of COLLS) collections[k] = [...this.data[k].values()].map((i) => structuredClone(i))
    return { collections, settings: this.settings ? structuredClone(this.settings) : null, counters: this.counters ? { ...this.counters } : null }
  }

  async commit(ops: Op[]): Promise<void> {
    await new Promise((r) => setTimeout(r, 60))
    this.commits++
    for (const op of ops) {
      if (op.target === 'settings') this.settings = structuredClone(op.data) as Settings
      else if (op.target === 'counters') this.counters = structuredClone(op.data) as { nextSaleNumber: number }
      else if (op.kind === 'set') this.data[op.target].set(op.id, structuredClone(op.data) as Item)
      else this.data[op.target].delete(op.id)
    }
    this.notify()
  }

  /** Simula outro aparelho gravando direto no banco. */
  external(fn: (db: MemoryAdapter) => void) {
    fn(this)
    this.notify()
  }

  private notify() {
    const h = this.handlers
    if (!h) return
    for (const k of COLLS) h.onCollection(k, [...this.data[k].values()].map((i) => structuredClone(i)))
    h.onSettings(this.settings ? structuredClone(this.settings) : null)
    h.onCounters(this.counters ? { ...this.counters } : null)
  }

  listen(h: Parameters<Adapter['listen']>[0]) {
    this.handlers = h
    return () => {
      this.handlers = null
    }
  }
}
