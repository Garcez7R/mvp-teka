# Deploy no Cloudflare Pages com migracao segura

## Resumo da arquitetura recomendada hoje

- Frontend React/Vite: **Cloudflare Pages**
- API tRPC + MySQL atual: **manter ativa enquanto migra**
- Bridge Cloudflare: Pages Functions em `/trpc` para proxy do backend em modo compatibilidade

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

- `TRPC_EXECUTION_MODE`: `proxy` (padrao seguro) ou `local` (Cloudflare-only backend)

- `TRPC_UPSTREAM_URL`: URL do backend em modo compatibilidade (com ou sem `/trpc`)
  - exemplo: `https://api.seudominio.com/trpc`
- `API_UPSTREAM_URL`: URL base do backend em modo compatibilidade
  - exemplo: `https://api.seudominio.com`

Opcional para transicao sem downtime:

- manter `VITE_PUBLIC_API_URL` apontando para API antiga no primeiro deploy
- depois remover `VITE_PUBLIC_API_URL` para usar same-origin `/trpc` via proxy Cloudflare

## 3) Deploy e teste sem downtime

Depois do deploy, valide:

1. Home abre normalmente.
2. Cadastro de sebo envia sem `Failed to fetch`.
3. Cadastro de livro (ISBN e criar livro) funciona.
4. `GET /health` responde (em `proxy` ou `local`).
5. Conferir header `x-teka-trpc-mode` nas respostas de `/trpc` (`proxy` ou `local`).

## 4) Virada para Cloudflare-only (faseada)

Fase A (ja pronta no codigo):

1. Manter `TRPC_EXECUTION_MODE=proxy` (estado atual seguro).
2. Frontend usa same-origin `/trpc` via Cloudflare Function.

Fase B (virada de backend):

1. Criar banco `D1` no Cloudflare.
2. Em `Pages > Settings > Bindings`, adicionar binding:
   - Nome: `DB`
   - Tipo: `D1`
   - Banco: seu banco criado no passo 1
3. Em `Variables and Secrets`, definir:
   - `TRPC_EXECUTION_MODE=local`
   - manter `GOOGLE_CLIENT_ID` e `VITE_GOOGLE_CLIENT_ID`
   - `API_UPSTREAM_URL` e `TRPC_UPSTREAM_URL` podem permanecer como fallback, mas nao sao usados em `local`.
4. Testar fluxo completo: login, criar sebo, cadastrar/editar/deletar livro, favoritos.

Se ocorrer erro, voltar imediatamente para `TRPC_EXECUTION_MODE=proxy` sem downtime.

## 5) Hardening recomendado (Cloudflare)

No dashboard da Cloudflare:

1. Security -> Bots -> ativar Bot Fight Mode.
2. Security -> WAF -> criar regra para challenge em paths sensiveis quando necessario.
3. Caching -> respeitar headers para assets estaticos (o projeto publica `/_headers` com cache imutavel para bundles).
4. Cache Rules (obrigatorio para evitar deploy antigo preso):
   - Bypass cache para `/*` quando `http.request.uri.path` NAO iniciar com `/assets/`
   - Bypass cache para `/index.html`
   - Nunca usar "Cache Everything" para HTML da SPA
