# Deploy no Cloudflare Pages (frontend) + API separada

## Resumo da arquitetura recomendada hoje

- Frontend React/Vite: **Cloudflare Pages**
- API tRPC + MySQL atual: **manter fora do Cloudflare Pages** (Netlify Function ou outro host Node)

Motivo: o backend atual usa `mysql2` com pool TCP e isso nao e migracao direta para Pages Functions sem adaptar banco (ex.: Hyperdrive/D1).

## 1) Subir frontend no Cloudflare Pages

No projeto Pages:

- Framework preset: `Vite`
- Build command: `pnpm build`
- Build output directory: `dist/public`
- Root directory: `.`

## 2) Configurar variaveis de ambiente no Pages

Adicione a variavel:

- `VITE_PUBLIC_API_URL`

Valor:

- URL base publica da API (sem `/trpc` no final), exemplo:
  - `https://mvp-teka.netlify.app`
  - ou `https://api.seudominio.com`

## 3) Deploy e teste

Depois do deploy, valide:

1. Home abre normalmente.
2. Cadastro de sebo envia sem `Failed to fetch`.
3. Cadastro de livro (ISBN e criar livro) funciona.

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
