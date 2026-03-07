<p align="center">
  <img src="client/public/teka-logo.png" alt="Logo TEKA" width="220" />
</p>

# TEKA

Plataforma para conectar leitores e sebos, com foco em catálogo de livros (usados e novos), gestão de estoque por livreiro e experiência de compra simples.

## Status Atual

`Pronto para validação com usuários de teste (Beta controlado)`

Escopo recomendado para teste:
- fluxo de comprador (busca, filtros, detalhe, WhatsApp);
- fluxo de livreiro (criação do sebo, cadastro por ISBN/scan, gestão de catálogo);
- fluxo admin (gestão de usuários/sebos/livros + métricas);
- fluxo mobile (scanner, OCR, menu e responsividade).

## Guia de Uso

Acesse o guia completo de operação:

- [Guia de Uso - TEKA](docs/GUIA-USO-TEKA.md)

## Visão Geral

O TEKA foi desenhado para:

- permitir cadastro rápido de livros por ISBN/câmera;
- suportar múltiplos lotes do mesmo livro (ex.: mesmo ISBN com estados e preços diferentes);
- exibir catálogo unificado para compradores;
- dar controle operacional para livreiro e admin.

## Perfis e Funcionalidades

### Comprador

- catálogo com filtros (categoria, sebo, condição, status, cidade/UF, preço);
- busca por título, autor e ISBN;
- favoritos e lista de interesses;
- visualização de variações de oferta por estado/preço.
- priorização opcional de ofertas próximas (`Ver perto de mim: ON/OFF`) com selo `Na sua cidade` / `No seu estado`.

### Livreiro

- cadastro manual de livros;
- scanner por código de barras/ISBN;
- **scan em lote** com revisão antes de publicar;
- gestão de estoque (quantidade, status, visibilidade, edição e exclusão);
- exportação CSV do catálogo.

### Admin

- visão administrativa de usuários, sebos e livros;
- edição e ações de gestão centralizadas;
- controle por role.

## Métricas e Dashboards

- **Livreiro**: cards operacionais + gráficos de status do catálogo e top livros por favoritos.
- **Admin**: visão consolidada da plataforma com usuários por perfil, status de livros, crescimento 7d e ações recentes de auditoria.
- Gráficos implementados com `recharts`, mantendo identidade visual do produto.

## Privacidade e Compliance

- dados de comprador são privados por padrão;
- visualização de dados sensíveis restrita ao admin;
- consentimento informado no onboarding de comprador e livreiro;
- referência legal informativa: LGPD (Lei nº 13.709/2018, arts. 7º, 18 e 46) e Marco Civil da Internet (Lei nº 12.965/2014, art. 15).

## Segurança (Hardening)

- proteção de headers de segurança em rotas críticas;
- rate limit em endpoints sensíveis (ex.: OCR);
- sanitização de erros internos para não expor SQL/infra;
- trilha de auditoria para ações administrativas e de gestão.

## Fluxos de Cadastro de Livro

1. **ISBN manual**: preenche metadados e capa automaticamente.
2. **Scanner de código de barras**: leitura direta de ISBN.
3. **Fotografar capa e extrair dados**:
   - OCR remoto (OCR.space) com fallback local;
   - busca de sugestões de livro;
   - escolha de capa entre opções encontradas.
4. **Scan em lote (`/batch-scan`)**:
   - leitura contínua;
   - cooldown anti-duplicação;
   - som/vibração ao detectar;
   - revisão em fila e publicação em lote.

## Demonstração

<table>
  <tr>
    <td align="center">
      <strong>Mobile</strong><br />
      <img src="docs/screenshots/demo.gif" alt="Demo TEKA Mobile" height="180" />
    </td>
    <td align="center">
      <strong>Web/Desktop</strong><br />
      <img src="docs/screenshots/demo-web.gif" alt="Demo TEKA Web" height="180" />
    </td>
  </tr>
</table>

## Stack Técnica

- Frontend: React 19 + TypeScript + Vite + Tailwind
- Roteamento: `wouter`
- Estado de servidor: TanStack Query + tRPC
- Backend: tRPC + Cloudflare Pages Functions
- Banco: Cloudflare D1 (SQLite) + Drizzle ORM
- Deploy: Cloudflare Pages

## Configuração de Ambiente

Crie `.env.local` (não versionado) com as variáveis necessárias para dev/build.

Variáveis importantes de produção (Cloudflare Pages > Settings > Variables and Secrets):

- `OCR_SPACE_API_KEY`
- `TRPC_EXECUTION_MODE`
- `TRPC_UPSTREAM_URL` / `API_UPSTREAM_URL` (quando aplicável)
- `GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `ALLOWED_ORIGINS` (origens permitidas no servidor Express local, separado por vírgula)

## Scripts

- `pnpm dev` - desenvolvimento
- `pnpm check` - validação TypeScript
- `pnpm test` - testes (Vitest)
- `pnpm build` - build de produção
- `pnpm db:push` - geração/aplicação de migrações Drizzle
- `pnpm db:seed` - seed local

## Estrutura de Dados (resumo)

- `books`: título, autor, ISBN, categoria, preço, condição, quantidade, capa
- `sebos`: dados da loja + logística de entrega
- `favorites`, `wishlist`, `book_interests`: suporte a descoberta e interesse do comprador
- `audit_logs`: trilha de ações sensíveis (admin/livreiro)

## Observações Operacionais

- upload manual de capa está desativado no fluxo Cloudflare-only;
- OCR remoto depende de chave válida no ambiente;
- mudanças de schema no D1 exigem sincronização de migrações/colunas.
