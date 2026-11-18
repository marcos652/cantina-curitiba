import type { LgpdContract } from '@/types'
import { contractFileName } from './lgpd'

const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'medium' })

/** Gera o PDF do termo assinado, sempre igual ao que ficou gravado (texto, assinatura e código de verificação). */
export async function buildContractPdf(c: LgpdContract) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 20
  const maxW = W - M * 2
  let y = M

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage()
      y = M
    }
  }

  const lines = c.text.split('\n')
  lines.forEach((line, i) => {
    const title = i === 0
    const heading = /^\d+\. [A-ZÀ-Ú ]+$/.test(line)
    doc.setFont('helvetica', title || heading ? 'bold' : 'normal')
    doc.setFontSize(title ? 14 : heading ? 11 : 10.5)
    if (line === '') {
      y += 3
      return
    }
    const wrapped = doc.splitTextToSize(line, maxW) as string[]
    const lh = title ? 7 : 5.2
    if (heading) y += 1
    for (const w of wrapped) {
      ensure(lh)
      doc.text(w, M, y)
      y += lh
    }
  })

  // Bloco de assinatura
  ensure(58)
  y += 6
  doc.setDrawColor(150)
  doc.line(M, y, W - M, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('ASSINATURA ELETRÔNICA', M, y)
  y += 6.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  const rows: [string, string][] = [
    ['Assinado por', c.signedName],
    ['Nome no cadastro', c.name],
    ['E-mail da conta', c.email],
    ['Data e hora', fmt(c.signedAt)],
    ['Versão do termo', c.version],
  ]
  for (const [k, v] of rows) {
    ensure(6)
    doc.setFont('helvetica', 'bold')
    doc.text(`${k}:`, M, y)
    doc.setFont('helvetica', 'normal')
    doc.text(doc.splitTextToSize(v, maxW - 42) as string[], M + 42, y)
    y += 5.5
  }
  ensure(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Código de verificação (SHA-256):', M, y)
  y += 5
  doc.setFont('courier', 'normal')
  doc.setFontSize(8.5)
  for (const part of doc.splitTextToSize(c.hash, maxW) as string[]) {
    doc.text(part, M, y)
    y += 4.2
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Termo LGPD - ${c.name} - página ${p} de ${pages}`, W / 2, H - 10, { align: 'center' })
  }
  return doc
}

export async function downloadContract(c: LgpdContract) {
  const doc = await buildContractPdf(c)
  doc.save(contractFileName(c))
}

export async function viewContract(c: LgpdContract) {
  const doc = await buildContractPdf(c)
  const url = URL.createObjectURL(doc.output('blob'))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
