# Homologação Preview - Tiers, Reviews e Vitrine Pro/Gold

Branch alvo: `feature/tiers-reviews-safe`  
Objetivo: validar recursos avançados sem impacto na `main`.

## 1) Pré-requisitos de Ambiente (Preview)

Em `Cloudflare Pages > mvp-teka > Settings > Variables and Secrets > Preview`:

- `VITE_AUTH_GOOGLE_ENABLED=false`
- `ALLOW_LEGACY_EMAIL_AUTH=true`
- `TRPC_EXECUTION_MODE=local`
- `FEATURE_REVIEWS=true`
- `FEATURE_PUBLIC_SEBO_CONTACT=true`
- `ENFORCE_PLAN_LIMITS=true` (ligar para teste de limite; pode desligar depois)

Bindings (Preview):
- `DB -> teka-db-staging`

## 2) Pré-requisitos de Banco (staging)

Garantir schema compatível no `teka-db-staging`:

- Tabela `sebo_reviews` existente.
- Colunas em `sebos`:
  - `plan`
  - `proSlug`
  - `proEnabledAt`
  - `maxActiveBooks`
  - `showPublicPhone`
  - `showPublicAddress`

## 3) Checklist Funcional

### A. Login e sessão (Preview)
1. Abrir `/login`.
2. Confirmar login por e-mail (sem bloqueio por Google).
3. Entrar e navegar em páginas autenticadas.
4. Fazer logout e relogar.

### B. Planos (Admin)
1. Em `Admin > Sebos`, alternar plano:
   - `Free -> Pro`
   - `Pro -> Gold`
   - `Gold -> Free`
2. Confirmar persistência do badge nas páginas:
   - Sebos
   - Vitrine do sebo
   - Detalhe de livro

### C. Slug de vitrine
1. Em sebo Pro/Gold, editar slug.
2. Abrir `/s/:slug`.
3. Confirmar que vitrine carrega livros e dados do sebo.

### D. Avaliações
1. Logar como comprador.
2. Criar/editar avaliação de um sebo.
3. Ver média e contagem atualizadas na vitrine e listagem.
4. Logar como admin e moderar avaliação (ocultar/exibir).
5. Confirmar efeito imediato no frontend.

### E. Contato público (privacidade)
1. Em `Configurações do sebo`, alternar:
   - `showPublicPhone`
   - `showPublicAddress`
2. Confirmar que a vitrine só exibe contato/endereço quando habilitado.
3. Confirmar que admin/owner continuam com visão completa.

### F. Limite por plano
1. Com `ENFORCE_PLAN_LIMITS=true`, tentar exceder limite de livros ativos/visíveis.
2. Confirmar mensagem de bloqueio.
3. Promover plano e validar desbloqueio.
4. Testar `maxActiveBooks` (override admin) e validar comportamento.

### G. Regressão crítica
1. Home carrega sem erro.
2. `/trpc/books.list` retorna `200`.
3. `Admin`, `Meu Catálogo`, `Cadastrar Livro` funcionam.
4. Sem erro `1101` nos logs de deploy.

## 4) Critérios de Go/No-Go

Go para PR quando:
- Todos os blocos A-G passarem.
- Sem erros 500/1101 no preview.
- Sem regressão visual grave em dark/light mode.

No-Go se:
- Home/API falhar intermitente.
- Fluxo de login quebrar.
- Plano/slug/review não persistirem corretamente.

## 5) Passos após aprovação

1. Abrir PR `feature/tiers-reviews-safe -> main`.
2. Merge com `squash` (recomendado).
3. Produção (`main`) mantém login Google e sem fallback e-mail:
   - `VITE_AUTH_GOOGLE_ENABLED=true` (ou ausente)
   - `ALLOW_LEGACY_EMAIL_AUTH=false` (ou ausente)
4. Validar pós-deploy em produção:
   - Home
   - Login
   - Catálogo
   - Admin
   - Cadastro de livro

## 6) Rollback rápido (se necessário)

```bash
git checkout main
git pull origin main
git revert <hash_do_merge>
git push origin main
```
