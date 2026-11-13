import { useId } from 'react'
import { useWidth } from './useWidth'

interface Point {
  label: string
  value: number
}

interface Props {
  points: Point[]
  height?: number
  color?: string
  /** Linha em degraus (acumulado por venda) em vez de reta. */
  step?: boolean
}

/** Linha com preenchimento suave abaixo, para o acumulado do período dentro de um cartão. */
export function AreaChart({ points, height = 110, color = '#1565D8', step = true }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const id = useId().replace(/:/g, '')
  const padX = 2
  const padTop = 6
  const padBottom = 18

  const max = Math.max(1, ...points.map((p) => p.value))
  const innerW = Math.max(0, width - padX * 2)
  const innerH = height - padTop - padBottom
  const n = points.length
  const x = (i: number) => padX + (n <= 1 ? innerW : (i / (n - 1)) * innerW)
  const y = (v: number) => padTop + innerH - (v / max) * innerH

  let line = ''
  if (n > 0) {
    line = `M ${x(0)} ${y(points[0].value)}`
    for (let i = 1; i < n; i++) {
      line += step ? ` H ${x(i)} V ${y(points[i].value)}` : ` L ${x(i)} ${y(points[i].value)}`
    }
  }
  const area = n > 0 ? `${line} V ${padTop + innerH} H ${x(0)} Z` : ''

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          <defs>
            <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1={padX} x2={width - padX} y1={padTop + innerH} y2={padTop + innerH} stroke="#E3E6EB" />
          {n === 0 ? (
            <text x={width / 2} y={padTop + innerH / 2} textAnchor="middle" fontSize="12" fill="#6F7B89">
              Sem vendas no período
            </text>
          ) : (
            <>
              <path d={area} fill={`url(#fade-${id})`} />
              <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
              <text x={padX} y={height - 4} fontSize="11" fill="#6F7B89">
                {points[0].label}
              </text>
              {n > 1 && (
                <text x={width - padX} y={height - 4} fontSize="11" fill="#6F7B89" textAnchor="end">
                  {points[n - 1].label}
                </text>
              )}
            </>
          )}
        </svg>
      )}
    </div>
  )
}
