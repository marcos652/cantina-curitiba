import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Largura real do elemento, atualizada quando a janela muda de tamanho. */
export function useWidth<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** Arredonda o máximo do eixo para um número "redondo" (1, 2, 5 × 10^k) acima do valor. */
export function niceMax(max: number, ticks = 4): number {
  if (max <= 0) return ticks
  const raw = max / ticks
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
  return step * ticks
}
