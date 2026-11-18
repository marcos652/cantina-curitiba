import type { LgpdContract } from '@/types'

/** Versão do texto do termo. Mude quando o texto mudar: cada assinatura guarda a versão que o cliente aceitou. */
export const LGPD_VERSION = 'v1-2026-11'

interface Parties {
  store: string
  name: string
  email: string
}

/**
 * Termo de consentimento para tratamento de dados pessoais (Lei 13.709/2018, a LGPD).
 * É um texto-modelo: vale a revisão de um advogado antes do uso oficial.
 * Fica só com caracteres simples para sair certo no PDF.
 */
export function buildContractText({ store, name, email }: Parties): string {
  const loja = store.trim() || 'a Cantina'
  return [
    'TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS',
    'Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD)',
    '',
    '1. IDENTIFICAÇÃO DAS PARTES',
    `Controlador dos dados: ${loja} ("Cantina").`,
    `Titular dos dados: ${name}, e-mail ${email} ("Titular").`,
    '',
    '2. OBJETO',
    'Este termo registra a ciência e a concordância do Titular com o tratamento dos seus dados pessoais pela Cantina, para que ele possa usar o cartão fidelidade e a carteira digital da Cantina, pelo aplicativo e no balcão.',
    '',
    '3. DADOS TRATADOS',
    'Nome, e-mail de acesso, número do cartão fidelidade, histórico de compras (produtos, valores, datas e horários), pagamentos registrados, saldo devedor e limite, além da data e do horário em que este termo foi assinado.',
    '',
    '4. FINALIDADES',
    'Criar e manter o acesso do Titular ao aplicativo; registrar o que o Titular retira na Cantina e controlar a carteira devedora; permitir o fechamento e a cobrança do mês; emitir comprovantes e prestar atendimento; cumprir obrigações legais e regulatórias; e proteger a Cantina e o Titular contra erros e fraudes.',
    '',
    '5. BASE LEGAL',
    'O tratamento ocorre com base no consentimento do Titular, na execução do contrato de uso do cartão fidelidade e no cumprimento de obrigações legais, conforme o artigo 7º da LGPD.',
    '',
    '6. COMPARTILHAMENTO',
    'A Cantina não vende nem cede os dados do Titular. Os dados ficam armazenados em serviços de computação em nuvem da Google (Firebase), que atuam como operadores e seguem as instruções da Cantina. Os dados só serão repassados a terceiros se a lei exigir ou com autorização do Titular.',
    '',
    '7. ARMAZENAMENTO E SEGURANÇA',
    'Os dados são protegidos por login individual e por regras de acesso: o Titular vê apenas o próprio cartão, e apenas a equipe autorizada da Cantina acessa o cadastro. Os dados são mantidos enquanto o cartão estiver ativo e, depois, pelo prazo necessário para cumprir obrigações legais, fiscais e para o exercício regular de direitos.',
    '',
    '8. DIREITOS DO TITULAR',
    'Nos termos do artigo 18 da LGPD, o Titular pode, a qualquer momento e mediante pedido à Cantina: confirmar que há tratamento; acessar os seus dados; corrigir dados incompletos ou desatualizados; pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários; pedir a portabilidade; obter informações sobre o compartilhamento; e revogar este consentimento.',
    '',
    '9. REVOGAÇÃO',
    'O Titular pode revogar o consentimento a qualquer momento, o que encerrará o acesso ao aplicativo e ao cartão. A revogação não afeta o tratamento já realizado, nem a guarda dos registros que a Cantina deva manter por obrigação legal, e não cancela valores já devidos.',
    '',
    '10. CONTATO',
    'Pedidos e dúvidas sobre dados pessoais devem ser feitos diretamente à Cantina, no balcão ou pelos canais de atendimento informados por ela.',
    '',
    '11. ACEITE',
    'Ao assinar eletronicamente este termo, o Titular declara que leu e compreendeu o texto acima e concorda, de forma livre, informada e inequívoca, com o tratamento dos seus dados pessoais nas condições descritas. A assinatura eletrônica registra o nome digitado, o e-mail da conta, a data, o horário e um código de verificação do conteúdo.',
  ].join('\n')
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Conteúdo que entra no código de verificação: se qualquer parte mudar, o código deixa de bater. */
export const hashInput = (c: Pick<LgpdContract, 'version' | 'text' | 'signedName' | 'email' | 'signedAt' | 'customerId'>) =>
  JSON.stringify([c.version, c.customerId, c.email, c.signedName, c.signedAt, c.text])

export async function verifyContract(c: LgpdContract): Promise<boolean> {
  return (await sha256(hashInput(c))) === c.hash
}

export const contractFileName = (c: Pick<LgpdContract, 'name' | 'signedAt'>) =>
  `termo-lgpd-${c.name.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cliente'}-${c.signedAt.slice(0, 10)}.pdf`
