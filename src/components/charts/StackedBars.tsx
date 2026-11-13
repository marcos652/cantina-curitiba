import { niceMax, useWidth } from './useWidth'

export interface BarSeries {
  name: string
  color: string
}

export interface BarDatum {
  label: string
  values: number[]
}

interface Props {
  data: BarDatum[]
  series: BarSeries[]
  height?: number
  formatY: (v: number) => string
  emptyText?: string
}

/** Colunas empilhadas com linhas de grade, eixo com valores redondos e legenda em pontos. */
export function StackedBars({ data, series, height = 230, formatY, emptyText = 'Sem dados no período' }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const gutterL = 56
  const padR = 8
  const padTop = 10
  const padBottom = 24
  const ticks = 4

  const totals = data.map((d) => d.values.reduce((a, v) => a + v, 0))
  const max = niceMax(Math.max(0, ...totals), ticks)
  const plotW = Math.max(0, width - gutterL - padR)
  const plotH = height - padTop - padBottom
  const slot = data.length > 0 ? plotW / data.length : 0
  const barW = Math.max(6, Math.min(40, slot * 0.6))
  const y = (v: number) => padTop + plotH - (v / max) * plotH
  const labelEvery = Math.max(1, Math.ceil(data.length / 8))
  const hasData = totals.some((t) => t > 0)

  return (
    <div ref={ref} className="w-full">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      {width > 0 && (
        <svg width={width} height={height} className="block">
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const v = (max / ticks) * i
            const yy = y(v)
            return (
              <g key={i}>
                <line x1={gutterL} x2={width - padR} y1={yy} y2={yy} stroke={i === 0 ? '#D3D8DF' : '#EEF0F3'} />
                <text x={gutterL - 8} y={yy + 4} fontSize="11" fill="#6F7B89" textAnchor="end">
                  {formatY(v)}
                </text>
              </g>
            )
          })}
          {!hasData && (
            <text x={gutterL + plotW / 2} y={padTop + plotH / 2} fontSize="12" fill="#6F7B89" textAnchor="middle">
              {emptyText}
            </text>
          )}
          {data.map((d, i) => {
            const cx = gutterL + slot * i + slot / 2
            let acc = 0
            return (
              <g key={d.label}>
                {d.values.map((v, k) => {
                  const y0 = y(acc)
                  const y1 = y(acc + v)
                  acc += v
                  if (v <= 0) return null
                  const h = Math.max(0, y0 - y1 - (k > 0 ? 1 : 0))
                  return <rect key={k} x={cx - barW / 2} y={y1} width={barW} height={h} fill={series[k]?.color ?? '#1565D8'} />
                })}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 6} fontSize="11" fill="#6F7B89" textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
