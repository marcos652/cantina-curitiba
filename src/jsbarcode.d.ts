declare module 'jsbarcode' {
  const JsBarcode: (el: SVGElement | string, value: string, options?: Record<string, unknown>) => void
  export default JsBarcode
}
