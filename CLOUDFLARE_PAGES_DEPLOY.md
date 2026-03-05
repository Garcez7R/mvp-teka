# Deploy no Cloudflare Pages com migracao segura (sem quebrar legado)

## Resumo da arquitetura recomendada hoje

- Frontend React/Vite: **Cloudflare Pages**
- API tRPC + MySQL atual: **manter ativa enquanto migra**
- Bridge Cloudflare: Pages Functions em `/trpc` para proxy do backend legado

Motivo: o backend atual usa `mysql2` com pool TCP e isso nao e migracao direta para Pages Functions sem adaptar banco (ex.: Hyperdrive/D1).

## 1) Subir frontend no Cloudflare Pages

No projeto Pages:

- Framework preset: `Vite`
- Build command: `pnpm build`
- Build output directory: `dist/public`
- Root directory: `.`

## 2) Configurar variaveis de ambiente no Pages

Adicione:

Valor:

- `TRPC_UPSTREAM_URL`: URL do backend legado (com ou sem `/trpc`)
  - exemplo: `https://api.seudominio.com/trpc`
  - exemplo: `https://mvp-teka.netlify.app/trpc`
- `API_UPSTREAM_URL`: URL base do backend legado
  - exemplo: `https://api.seudominio.com`

Opcional para transicao sem downtime:

- manter `VITE_PUBLIC_API_URL` apontando para API antiga no primeiro deploy
- depois remover `VITE_PUBLIC_API_URL` para usar same-origin `/trpc` via proxy Cloudflare

## 3) Deploy e teste sem downtime

Depois do deploy, valide:

1. Home abre normalmente.
2. Cadastro de sebo envia sem `Failed to fetch`.
3. Cadastro de livro (ISBN e criar livro) funciona.
4. `GET /health` responde via proxy Cloudflare.

## 4) Migracao futura para full Cloudflare (opcional)

Para ter tudo dentro do ecossistema Cloudflare:

1. Migrar acesso a MySQL para Hyperdrive (ou migrar para D1).
2. Trocar entrypoint Node/Express por handler `fetch` no runtime Workers.
3. Publicar API como Worker e manter frontend em Pages/Assets.

## 5) Hardening recomendado (Cloudflare)

No dashboard da Cloudflare:

1. Security -> Bots -> ativar Bot Fight Mode.
2. Security -> WAF -> criar regra para challenge em paths sensiveis quando necessario.
3. Caching -> respeitar headers para assets estaticos (o projeto publica `/_headers` com cache imutavel para bundles).
