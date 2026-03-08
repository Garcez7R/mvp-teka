# Branch de Testes: `feature/tiers-reviews-safe`

## Objetivo
Documentar de forma clara o que está sendo aplicado nesta branch e como mesclar em `main` sem quebrar o ambiente de produção.

## Escopo Atual da Branch

Estado base:
- A branch foi criada a partir de `main` após o hotfix que restaurou estabilidade da Home/API.

Commits exclusivos desta branch (até agora):
- `de04eaf` - `feat(auth): enable preview email login mode without Google`

Resumo funcional do commit:
- Adiciona modo de autenticação por e-mail para ambiente de preview/teste.
- Mantém login Google para produção.
- Evita bloqueio de autenticação em Preview quando origem OAuth não está autorizada.

Arquivos alterados:
- `client/src/pages/Login.tsx`
- `client/src/_core/hooks/useAuth.ts`
- `client/src/main.tsx`
- `client/src/lib/session.ts`
- `client/src/lib/auth-mode.ts` (novo)
- `client/src/components/Header.tsx`
- `server/routers/_utils/context.ts`

## Configuração de Ambiente (Importante)

### Preview (Cloudflare Pages > Environment: Preview)
Definir:
- `VITE_AUTH_GOOGLE_ENABLED=false`
- `ALLOW_LEGACY_EMAIL_AUTH=true`

### Produção (Cloudflare Pages > Environment: Production)
Manter:
- `VITE_AUTH_GOOGLE_ENABLED=true` (ou ausente)
- `ALLOW_LEGACY_EMAIL_AUTH=false` (ou ausente)

Observações:
- O fallback por e-mail só deve ficar habilitado em preview/testes.
- Produção deve continuar com autenticação Google como fonte principal.

## Checklist de Validação Antes do Merge

Executar no deploy Preview desta branch:
1. Abrir `/login`.
2. Confirmar que aparece login por e-mail (sem botão Google).
3. Entrar com e-mail + consentimento LGPD.
4. Validar navegação autenticada nas páginas protegidas.
5. Validar logout.
6. Verificar Home sem erro 500/1101.

Executar em produção (`main`) após merge:
1. Confirmar que botão Google continua ativo.
2. Confirmar que login por e-mail não aparece em produção.
3. Validar fluxo normal de comprador/livreiro/admin.

## Como Mesclar em `main` Sem Quebrar

Fluxo recomendado:
1. Garantir que Preview desta branch passou no checklist.
2. Abrir PR `feature/tiers-reviews-safe -> main`.
3. Fazer `squash merge` (mantém histórico limpo).
4. Após merge, validar deploy de produção:
   - Home
   - Login Google
   - Catálogo
   - Admin
   - Cadastro de livro

Comandos (local):
```bash
git checkout main
git pull origin main
git merge --ff-only feature/tiers-reviews-safe
git push origin main
```

## Plano de Rollback Rápido

Se produção falhar após merge:
1. Reverter o commit de merge no `main`.
2. Fazer novo deploy.
3. Validar `/health` e Home.

Exemplo:
```bash
git checkout main
git pull origin main
git revert <hash_do_commit_merge>
git push origin main
```

## Próximos Passos (após estabilizar esta branch)

- Reintroduzir tiers/reviews em fases (feature-flag).
- Validar cada fase em Preview com D1 staging.
- Mesclar incrementalmente para reduzir risco de regressão.
