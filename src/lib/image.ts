const MAX_W = 320
const MAX_H = 120

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Lê a imagem e a reduz para caber em 320x120, mantendo a transparência (PNG). SVG é guardado como está. */
export async function fileToLogo(file: File): Promise<string> {
  const src = await readAsDataURL(file)
  if (file.type === 'image/svg+xml') return src
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('imagem inválida'))
    img.src = src
  })
  const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}
