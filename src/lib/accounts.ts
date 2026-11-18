/**
 * Contas em paralelo: cada aba pode estar logada com um e-mail diferente sem derrubar as outras.
 * A conta é escolhida pelo endereço (?conta=2) e lembrada na aba. Cada conta tem o seu próprio login
 * e o seu próprio cache de dados no navegador. Sem o parâmetro, vale a conta principal (a de sempre).
 */
const KEY = 'cantina-conta'

export const ACCOUNT_SLOTS = ['1', '2', '3', '4'] as const

function read(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('conta')
    const raw = (q ?? sessionStorage.getItem(KEY) ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20)
    const slot = raw === '1' ? '' : raw
    if (q !== null) sessionStorage.setItem(KEY, slot)
    return slot
  } catch {
    return ''
  }
}

/** Vazio = conta principal. */
export const accountSlot = read()
export const accountLabel = accountSlot ? `Conta ${accountSlot}` : 'Conta 1'

/** Endereço que abre o sistema em outra conta. */
export function accountUrl(slot: string): string {
  const u = new URL(window.location.href)
  if (slot === '1') u.searchParams.delete('conta')
  else u.searchParams.set('conta', slot)
  u.hash = '#/'
  return u.toString()
}
