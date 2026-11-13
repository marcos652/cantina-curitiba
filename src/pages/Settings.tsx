import { useRef, useState, type ReactNode } from 'react'
import { Download, Plus, Upload, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PAYMENT_LABELS, PAYMENT_METHODS } from '@/lib/payments'
import { todayStr } from '@/lib/dates'
import { downloadJSON } from '@/lib/download'
import { Button } from '@/components/ui/Button'
import { Field, Input, NumberInput } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card mb-4 grid grid-cols-1 gap-4 p-5 md:grid-cols-[260px_1fr] md:gap-8">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="max-w-xl">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const loadDemo = useStore((s) => s.loadDemoData)
  const resetAll = useStore((s) => s.resetAll)
  const notify = useStore((s) => s.notify)
  const productCount = useStore((s) => s.products.length)
  const saleCount = useStore((s) => s.sales.length)
  const counts = { products: productCount, sales: saleCount }

  const [newCategory, setNewCategory] = useState('')
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addCategory() {
    const c = newCategory.trim()
    if (!c) return
    if (settings.categories.some((x) => x.toLowerCase() === c.toLowerCase())) {
      notify('Essa categoria já existe.', 'error')
      return
    }
    updateSettings({ categories: [...settings.categories, c] })
    setNewCategory('')
  }

  function removeCategory(c: string) {
    updateSettings({ categories: settings.categories.filter((x) => x !== c) })
  }

  function exportBackup() {
    downloadJSON(`backup-cantina-${todayStr()}.json`, JSON.parse(exportData()))
    notify('Backup exportado.')
  }

  async function importBackup(file: File) {
    const text = await file.text()
    const r = importData(text)
    if (!r.ok) return notify(r.error, 'error')
    notify('Backup importado.')
  }

  return (
    <>
      <PageHeader title="Configurações" description="As alterações são salvas automaticamente." />

      <Section title="Loja" description="Nome exibido no menu e na aba do navegador.">
        <Field label="Nome">
          <Input value={settings.storeName} onChange={(e) => updateSettings({ storeName: e.target.value })} />
        </Field>
      </Section>

      <Section title="Taxas da maquininha" description="Percentual descontado em cada forma de pagamento. Usado para calcular o valor líquido.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PAYMENT_METHODS.map((m) => (
            <Field key={m} label={PAYMENT_LABELS[m]}>
              <div className="relative">
                <NumberInput
                  value={settings.fees[m]}
                  step={0.01}
                  onChange={(v) => updateSettings({ fees: { ...settings.fees, [m]: Math.max(0, v) } })}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">%</span>
              </div>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Vencimentos" description="Com quantos dias de antecedência um lote passa a ser marcado como “vencendo”.">
        <Field label="Dias de aviso" className="w-40">
          <NumberInput value={settings.expiryWarningDays} min={0} onChange={(v) => updateSettings({ expiryWarningDays: Math.max(0, Math.floor(v)) })} />
        </Field>
      </Section>

      <Section title="Categorias" description="Sugestões usadas no cadastro de produtos.">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {settings.categories.map((c) => (
            <span key={c} className="inline-flex h-8 items-center gap-1.5 rounded border border-line pl-3 pr-1 text-[13px]">
              {c}
              <button type="button" onClick={() => removeCategory(c)} className="rounded p-1 text-faint hover:bg-soft hover:text-ink" aria-label={`Remover ${c}`}>
                <X size={14} strokeWidth={1.5} />
              </button>
            </span>
          ))}
          {settings.categories.length === 0 && <span className="text-sm text-faint">Nenhuma categoria.</span>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addCategory()
          }}
        >
          <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nova categoria" className="sm:w-64" />
          <Button type="submit">
            <Plus size={16} strokeWidth={1.5} /> Adicionar
          </Button>
        </form>
      </Section>


      <Section title="Dados" description="Tudo fica salvo neste navegador. Exporte um backup de tempos em tempos.">
        <p className="mb-3 text-sm text-muted tabular">
          {counts.products} {counts.products === 1 ? 'produto' : 'produtos'} · {counts.sales} {counts.sales === 1 ? 'venda' : 'vendas'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportBackup}>
            <Download size={16} strokeWidth={1.5} /> Exportar backup
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={16} strokeWidth={1.5} /> Importar backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importBackup(f)
              e.target.value = ''
            }}
          />
          <Button onClick={() => setConfirmDemo(true)}>Carregar dados de exemplo</Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Apagar todos os dados
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        onConfirm={() => {
          loadDemo()
          notify('Dados de exemplo carregados.')
        }}
        title="Carregar dados de exemplo?"
        message="Produtos, vendas e caixas atuais serão substituídos pelos dados de exemplo. As configurações são mantidas."
        confirmLabel="Carregar"
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll()
          notify('Todos os dados foram apagados.')
        }}
        title="Apagar todos os dados?"
        message="Produtos, estoque, vendas, caixas e configurações serão removidos deste navegador. Esta ação não pode ser desfeita."
        confirmLabel="Apagar tudo"
        danger
      />
    </>
  )
}
