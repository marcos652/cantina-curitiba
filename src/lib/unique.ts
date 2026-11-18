/** Remove itens repetidos pelo id (fica o último). Garante que nada apareça duas vezes. */
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((i) => [i.id, i])).values()]
}
