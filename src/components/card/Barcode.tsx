import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/** Código de barras (Code 128) do número do cartão: o leitor do balcão lê esse número. */
export function Barcode({ value, height = 38 }: { value: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, margin: 0, height, width: 1.6, background: 'transparent', lineColor: '#111' })
    } catch {
      /* número inválido: não desenha nada */
    }
  }, [value, height])
  return <svg ref={ref} className="h-full w-full" preserveAspectRatio="none" aria-label={`Código de barras ${value}`} />
}
