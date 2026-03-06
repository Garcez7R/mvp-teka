# TEKA

Marketplace de livros usados com foco em sebos e compradores.

## Stack Atual

- Frontend: React 19 + TypeScript + Vite + Tailwind
- Roteamento: `wouter`
- Estado de servidor: TanStack Query + tRPC
- Backend: Express + tRPC
- Banco: Cloudflare D1 (SQLite) com Drizzle ORM
- Deploy alvo: Cloudflare Pages/Functions

## Requisitos

- Node.js 18+
- pnpm

## Setup Local

1. Instale dependências:

```bash
pnpm install
```

2. Crie e ajuste seu `.env.local` na raiz do projeto (não versionado).

3. Crie seu `wrangler.toml` local a partir do exemplo:

```bash
cp wrangler.example.toml wrangler.toml
```

Depois, preencha o `database_id` do D1.

3. Rode em desenvolvimento:

```bash
pnpm dev
```

Servidor local padrão: `http://localhost:3777`

## Scripts

- `pnpm dev`: servidor de desenvolvimento
- `pnpm check`: validação de tipos TypeScript
- `pnpm test`: testes com Vitest
- `pnpm build`: build de produção do frontend
- `pnpm db:push`: gerar e aplicar migrações via Drizzle
- `pnpm db:seed`: seed local

## Banco e Migrações

- Schema: [drizzle/schema.ts](/home/rgarcez/Documentos/mvp-teka/drizzle/schema.ts)
- Migrações SQL: diretório `drizzle/`
- Bootstrap D1: [drizzle/d1-init.sql](/home/rgarcez/Documentos/mvp-teka/drizzle/d1-init.sql)

## Segurança e Operação

- Auth por Google ID Token validado no backend
- Controle de acesso por role (`admin`, `livreiro`, `comprador`, `user`)
- Rate limiting básico para `/trpc` e `/health`
- Service Worker configurado para priorizar sempre conteúdo mais recente em deploy

## Observações

- Upload manual de capa está desativado no fluxo Cloudflare-only.
- Cadastro por ISBN tenta OpenLibrary e fallback Google Books.

## Checklist Cloudflare Release (curto)

1. `git push origin main` e aguarde o deploy no Pages.
2. Verifique `https://mvp-teka.pages.dev/health` e confirme `mode: "local"`.
3. Se houver mudança de schema, aplique no D1 remoto:
   `npx wrangler d1 migrations apply teka-db --remote`
4. Valide homepage e admin sem erro de `Failed to fetch`.
