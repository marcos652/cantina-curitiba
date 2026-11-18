import type { AppData, Settings } from '@/types'
import { DEFAULT_SETTINGS, emptyData } from './defaults'
import { useStore } from './useStore'
import { setSession } from './session'

/**
 * Sincronização entre o estado do app e o banco (Firestore).
 *
 * - Cada venda, produto, lote, movimentação e caixa é um documento próprio.
 * - Configurações (com a logo em base64) e o contador de vendas ficam em documentos de "config".
 * - Mudanças locais são comparadas com o que já foi enviado e só o que mudou é gravado, em lotes.
 * - Mudanças vindas do banco (outro aparelho, outra aba) atualizam a tela, sem apagar o que ainda
 *   não foi enviado daqui.
 */

export type CollKey = 'products' | 'lots' | 'movements' | 'sales' | 'cashSessions' | 'fiados' | 'customers' | 'cardEntries'
export const COLLS: CollKey[] = ['products', 'lots', 'movements', 'sales', 'cashSessions', 'fiados', 'customers', 'cardEntries']

type Item = { id: string } & Record<string, unknown>
type Counters = { nextSaleNumber: number }

export type Op =
  | { kind: 'set'; target: CollKey | 'settings' | 'counters'; id: string; data: unknown }
  | { kind: 'delete'; target: CollKey; id: string }

export interface RemoteData {
  collections: Record<CollKey, Item[]>
  settings: Settings | null
  counters: Counters | null
}

export interface Adapter {
  loadAll(): Promise<RemoteData>
  commit(ops: Op[]): Promise<void>
  listen(h: {
    onCollection: (key: CollKey, items: Item[]) => void
    onSettings: (s: Settings | null) => void
    onCounters: (c: Counters | null) => void
    onError: (e: unknown) => void
  }): () => void
}

/** JSON com chaves ordenadas: o banco devolve os campos em outra ordem, e isso não pode contar como mudança. */
export function stable(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : val,
  )
}

const ORDER_KEY: Record<CollKey, string> = { products: 'createdAt', lots: 'createdAt', movements: 'createdAt', sales: 'createdAt', cashSessions: 'openedAt', fiados: 'createdAt', customers: 'createdAt', cardEntries: 'createdAt' }

function sorted(key: CollKey, items: Item[]): Item[] {
  const f = ORDER_KEY[key]
  return [...items].sort((a, b) => String(a[f] ?? '').localeCompare(String(b[f] ?? '')) || a.id.localeCompare(b.id))
}

const mergeSettings = (s: Partial<Settings> | null | undefined): Settings => ({
  ...DEFAULT_SETTINGS,
  ...(s ?? {}),
  fees: { ...DEFAULT_SETTINGS.fees, ...(s?.fees ?? {}) },
  categories: s?.categories ?? [...DEFAULT_SETTINGS.categories],
})

const BATCH = 400 // o Firestore aceita no máximo 500 operações por lote

let stop: (() => void) | null = null

export async function startSync(adapter: Adapter, legacy?: Partial<AppData> | null): Promise<{ usedLegacy: boolean }> {
  stopSync()

  const synced: Record<CollKey, Map<string, string>> = { products: new Map(), lots: new Map(), movements: new Map(), sales: new Map(), cashSessions: new Map(), fiados: new Map(), customers: new Map(), cardEntries: new Map() }
  let syncedSettings: string | null = null
  let syncedCounter: number | null = null
  let inflight = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let hadError = false

  const refreshState = () => {
    if (hadError) return setSession({ sync: 'error' })
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return setSession({ sync: 'offline' })
    setSession({ sync: inflight > 0 ? 'syncing' : 'ok' })
  }

  // ---------- Carga inicial ----------
  const remote = await adapter.loadAll()
  let usedLegacy = false
  const remoteEmpty = COLLS.every((k) => remote.collections[k].length === 0) && !remote.settings

  if (remoteEmpty) {
    // Banco vazio: se havia dados guardados neste navegador (versão antiga), eles são enviados.
    const base = legacy && Array.isArray(legacy.products) && legacy.products.length > 0 ? legacy : null
    usedLegacy = Boolean(base)
    useStore.getState().hydrate(
      base
        ? {
            products: (base.products ?? []) as AppData['products'],
            lots: base.lots ?? [],
            movements: base.movements ?? [],
            sales: base.sales ?? [],
            cashSessions: base.cashSessions ?? [],
            fiados: base.fiados ?? [],
            customers: [],
            cardEntries: [],
            settings: mergeSettings(base.settings),
            nextSaleNumber: base.nextSaleNumber ?? Math.max(0, ...(base.sales ?? []).map((s) => s.number)) + 1,
          }
        : emptyData(),
    )
  } else {
    for (const k of COLLS) for (const it of remote.collections[k]) synced[k].set(it.id, stable(it))
    const sales = remote.collections.sales as unknown as AppData['sales']
    useStore.getState().hydrate({
      products: sorted('products', remote.collections.products) as unknown as AppData['products'],
      lots: sorted('lots', remote.collections.lots) as unknown as AppData['lots'],
      movements: sorted('movements', remote.collections.movements) as unknown as AppData['movements'],
      sales: sorted('sales', remote.collections.sales) as unknown as AppData['sales'],
      cashSessions: sorted('cashSessions', remote.collections.cashSessions) as unknown as AppData['cashSessions'],
      fiados: sorted('fiados', remote.collections.fiados) as unknown as AppData['fiados'],
      customers: sorted('customers', remote.collections.customers) as unknown as AppData['customers'],
      cardEntries: sorted('cardEntries', remote.collections.cardEntries) as unknown as AppData['cardEntries'],
      settings: mergeSettings(remote.settings),
      nextSaleNumber: Math.max(remote.counters?.nextSaleNumber ?? 1, Math.max(0, ...sales.map((s) => s.number)) + 1),
    })
    if (remote.settings) syncedSettings = stable(remote.settings)
    if (remote.counters) syncedCounter = remote.counters.nextSaleNumber
  }

  // ---------- Local -> banco ----------
  function flush() {
    const s = useStore.getState()
    const ops: Op[] = []
    for (const k of COLLS) {
      const ids = new Set<string>()
      for (const it of s[k] as unknown as Item[]) {
        ids.add(it.id)
        const j = stable(it)
        if (synced[k].get(it.id) !== j) {
          ops.push({ kind: 'set', target: k, id: it.id, data: it })
          synced[k].set(it.id, j)
        }
      }
      for (const id of [...synced[k].keys()]) {
        if (!ids.has(id)) {
          ops.push({ kind: 'delete', target: k, id })
          synced[k].delete(id)
        }
      }
    }
    const sj = stable(s.settings)
    if (sj !== syncedSettings) {
      ops.push({ kind: 'set', target: 'settings', id: 'settings', data: s.settings })
      syncedSettings = sj
    }
    if (s.nextSaleNumber !== syncedCounter) {
      ops.push({ kind: 'set', target: 'counters', id: 'counters', data: { nextSaleNumber: s.nextSaleNumber } })
      syncedCounter = s.nextSaleNumber
    }
    if (ops.length === 0) return

    for (let i = 0; i < ops.length; i += BATCH) {
      const chunk = ops.slice(i, i + BATCH)
      inflight++
      refreshState()
      adapter
        .commit(chunk)
        .then(() => {
          hadError = false
        })
        .catch((err) => {
          console.error('Falha ao salvar no banco', err)
          hadError = true
          // Desfaz a marcação para que a próxima tentativa envie de novo.
          for (const op of chunk) {
            if (op.target === 'settings') syncedSettings = null
            else if (op.target === 'counters') syncedCounter = null
            else if (op.kind === 'set') synced[op.target].delete(op.id)
            else synced[op.target].set(op.id, '__reenviar__')
          }
          clearTimeout(retry)
          retry = setTimeout(flush, 6000)
        })
        .finally(() => {
          inflight--
          refreshState()
        })
    }
  }

  const unsubStore = useStore.subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(flush, 250)
  })
  flush() // envia o que já estiver diferente (migração de dados antigos, por exemplo)

  // ---------- Banco -> local ----------
  const unsubRemote = adapter.listen({
    onCollection(key, items) {
      const local = useStore.getState()[key] as unknown as Item[]
      const localMap = new Map(local.map((i) => [i.id, i]))
      const remoteMap = new Map(items.map((i) => [i.id, stable(i)]))

      // Mudanças daqui que ainda não foram enviadas continuam valendo.
      const pending = new Set<string>()
      for (const it of local) if (synced[key].get(it.id) !== stable(it)) pending.add(it.id)
      for (const id of synced[key].keys()) if (!localMap.has(id)) pending.add(id)

      const result: Item[] = []
      for (const it of items) {
        if (pending.has(it.id)) {
          const mine = localMap.get(it.id)
          if (mine) result.push(mine)
        } else result.push(it)
      }
      for (const it of local) if (pending.has(it.id) && !remoteMap.has(it.id)) result.push(it)

      synced[key] = new Map(remoteMap)
      const same = result.length === local.length && result.every((r) => stable(r) === stable(localMap.get(r.id) ?? null))
      if (!same) useStore.setState({ [key]: sorted(key, result) } as Partial<AppData>)
    },
    onSettings(remoteSettings) {
      if (!remoteSettings) return
      const local = useStore.getState().settings
      const pending = syncedSettings !== null && stable(local) !== syncedSettings
      syncedSettings = stable(remoteSettings)
      if (pending) return
      const merged = mergeSettings(remoteSettings)
      if (stable(merged) !== stable(local)) useStore.setState({ settings: merged })
    },
    onCounters(c) {
      if (!c) return
      syncedCounter = c.nextSaleNumber
      if (c.nextSaleNumber > useStore.getState().nextSaleNumber) useStore.setState({ nextSaleNumber: c.nextSaleNumber })
    },
    onError(err) {
      console.error('Erro ao ouvir o banco', err)
      hadError = true
      refreshState()
    },
  })

  const onNet = () => {
    refreshState()
    if (typeof navigator !== 'undefined' && navigator.onLine) flush()
  }
  window.addEventListener('online', onNet)
  window.addEventListener('offline', onNet)
  refreshState()
  void usedLegacy

  stop = () => {
    clearTimeout(timer)
    clearTimeout(retry)
    unsubStore()
    unsubRemote()
    window.removeEventListener('online', onNet)
    window.removeEventListener('offline', onNet)
  }
  return { usedLegacy }
}

export function stopSync() {
  stop?.()
  stop = null
}
