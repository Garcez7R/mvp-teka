<p align="center">
  <img src="client/public/teka-logo.png" alt="Logo TEKA" width="220" />
</p>

# TEKA

Plataforma para conectar leitores e sebos, com foco em catálogo de livros (usados e novos), gestão de estoque por livreiro e experiência de compra simples.

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

Quando o GIF estiver disponível em `docs/screenshots/demo.gif`, use:

```md
![Demo TEKA](docs/screenshots/demo.gif)
```

Para gerar o GIF a partir de imagens sequenciais (`1.jpg`, `2.jpg`, `3.jpg`...), exemplo:

```bash
ffmpeg -framerate 1.2 -pattern_type glob -i "docs/screenshots/*.jpg" -vf "scale=1280:-1:flags=lanczos" -loop 0 docs/screenshots/demo.gif
```

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

## Checklist de Release (Cloudflare)

1. `git push origin main`
2. aguardar deploy no Pages
3. validar:
   - `https://mvp-teka.pages.dev/health`
   - login e catálogo
   - cadastro por ISBN/scanner
4. se houve alteração de banco, aplicar migrações D1 conforme estratégia do ambiente.
   - exemplo:
   ```bash
   npx wrangler d1 migrations apply teka-db --remote
   ```
