import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/** Abre a câmera, lê o QR Code do cartão e devolve o texto lido. Funciona no celular e no computador. */
function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let alive = true
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setError('Este navegador não permite usar a câmera. Use o endereço seguro (https) do sistema.')
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } catch (e) {
        const name = (e as { name?: string })?.name
        return setError(name === 'NotAllowedError' ? 'Permita o uso da câmera no navegador e tente de novo.' : 'Não foi possível abrir a câmera.')
      }
      if (!alive || !video.current) return stream.getTracks().forEach((t) => t.stop())
      video.current.srcObject = stream
      await video.current.play().catch(() => {})
      tick()
    }

    function tick() {
      const v = video.current
      if (!alive || !v || !ctx) return
      if (v.readyState >= 2 && v.videoWidth > 0 && !done.current) {
        const w = Math.min(640, v.videoWidth)
        const h = Math.round((v.videoHeight / v.videoWidth) * w)
        canvas.width = w
        canvas.height = h
        ctx.drawImage(v, 0, 0, w, h)
        const img = ctx.getImageData(0, 0, w, h)
        const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          done.current = true
          navigator.vibrate?.(60)
          onCode(code.data)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }

    void start()
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])

  if (error) return <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>
  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
      <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
      <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/90">Aponte para o QR Code do cartão</p>
    </div>
  )
}

/** Botão "Ler com a câmera" + janela com a câmera. `onCode` recebe o texto do QR Code. */
export function CameraScanButton({ onCode, label = 'Ler com a câmera' }: { onCode: (code: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Camera size={16} strokeWidth={1.75} /> {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ler QR Code" size="sm">
        <div className="pb-3">
          {open && (
            <Scanner
              onCode={(c) => {
                setOpen(false)
                onCode(c)
              }}
            />
          )}
        </div>
      </Modal>
    </>
  )
}
