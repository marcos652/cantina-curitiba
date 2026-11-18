import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR Code do número do cartão: o balconista lê com a câmera do celular. */
export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''))
    return () => {
      alive = false
    }
  }, [value, size])
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-md bg-raised" />
  return <img src={src} alt={`QR Code do cartão ${value}`} width={size} height={size} className="rounded-md bg-white" />
}
