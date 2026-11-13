# Cantina Curitiba

Sistema web de gestão para cantina de salgados: vendas, estoque por lote, vencimentos, caixa e relatórios. Em português do Brasil, responsivo (desktop, tablet e celular) e com visual limpo em fundo branco.

Os dados ficam salvos no **Firebase (Firestore)**, em uma conta protegida por login, e aparecem em qualquer aparelho em que você entrar. A logo da cantina é guardada em base64 dentro das configurações. O sistema também funciona sem internet: grava no aparelho e envia quando a conexão volta. Use **Configurações → Exportar backup** para guardar uma cópia em arquivo.

## Firebase (banco de dados e login)

Projeto: `cantina-5a4c5`. Passos, uma única vez, no [console do Firebase](https://console.firebase.google.com/):

1. **Authentication**: clique em *Começar* e ative o provedor **E-mail/senha**.
2. **Authentication → Usuários**: adicione o e-mail e a senha de quem vai usar o sistema (um usuário por cantina).
3. **Firestore Database**: crie o banco, se ainda não existir.
4. **Firestore → Regras**: cole o conteúdo de `firestore.rules` e publique. Ou, com o Firebase CLI: `firebase deploy --only firestore:rules`.
5. **Authentication → Configurações → Domínios autorizados**: adicione `marcos652.github.io` para o site publicado no GitHub Pages (o `localhost` já vem liberado).

Cada usuário só enxerga os próprios dados (`lojas/{uid}/...`), então várias cantinas podem usar o mesmo projeto sem se misturar.

Para testar sem login e sem gravar nada, abra o sistema com `?backend=memory` no endereço (acrescente `&demo=1` para carregar dados de exemplo).

## Rodando localmente

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço indicado no terminal (normalmente http://localhost:5173).

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Publicando no GitHub Pages

O repositório já inclui um workflow em `.github/workflows/deploy.yml` que faz o build e publica a pasta `dist` a cada push na branch `main`.

Para ativar, uma única vez: no GitHub, abra **Settings → Pages** e em **Build and deployment → Source** escolha **GitHub Actions**. O site ficará em `https://<usuario>.github.io/cantina-curitiba/`.

## Funcionalidades

- **Início**: resumo do dia (vendido, em caixa, número de vendas, ticket médio), vendas por forma de pagamento, alertas de vencimento e estoque baixo, últimas vendas.
- **Vendas**: venda rápida com grade de produtos, busca e carrinho. Pagamento em débito, crédito à vista, crédito parcelado (2x a 12x), dinheiro (com troco) e Pix. Taxa da maquininha por forma de pagamento, com valor bruto e líquido. Histórico com filtros e cancelamento (devolve o estoque).
- **Estoque**: produtos com custo, venda, estoque mínimo e lotes com validade. Entrada e saída manual (perda, descarte, ajuste) e histórico de movimentações.
- **Vencimentos**: lotes ordenados por validade com status vencido / vencendo / ok e baixa rápida por descarte, registrando o valor perdido.
- **Caixa**: abertura com valor inicial, sangrias e reforços, fechamento com conferência e saldo esperado em dinheiro.
- **Relatórios**: vendas por dia, por produto e por forma de pagamento; mais e menos vendidos; lucro estimado; perdas por vencimento. Exportação em CSV.
- **Configurações**: nome da loja, taxas, dias de aviso de vencimento, categorias, backup (exportar/importar), dados de exemplo.

## Tecnologias

React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router, ícones Lucide e Firebase (Authentication e Firestore).

## Estrutura

```
src/
  components/   layout (sidebar, shell) e componentes de interface
  lib/          formatação, datas, pagamentos, estoque (FIFO por validade)
  pages/        uma tela por arquivo
  store/        estado global, persistência, seletores e dados de exemplo
  types.ts      modelos de dados
```
