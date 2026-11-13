function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJSON(filename: string, data: unknown) {
  download(filename, JSON.stringify(data, null, 2), 'application/json')
}

/** CSV com ponto e vírgula como separador (abre direto no Excel em português). */
export function downloadCSV(filename: string, rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(v)
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const body = rows.map((r) => r.map(esc).join(';')).join('\r\n')
  download(filename, '\uFEFF' + body, 'text/csv;charset=utf-8')
}
