# Pendências do Modo Pro (Roadmap Seguro + Monetização)

Versão base estável atual: `0.7.0+241`

Objetivo: reintroduzir recursos avançados de monetização (`free/pro/gold`) sem risco para a Home/API principal e com narrativa clara para banca.

## 1) Escopo Pendente (Produto)

1. Tiers completos
- Expandir plano de sebo para `free`, `pro`, `gold`.
- Regras por tier para recursos de vitrine e visibilidade.

2. Avaliações de sebo
- Tabela `sebo_reviews` com nota (1-5) e comentário opcional.
- Um review por comprador por sebo (editável).
- Badge `Top Avaliado` por critério real (ex.: média >= 4.7 e mínimo 10 avaliações visíveis).

3. Flags públicas de contato
- `showPublicPhone`
- `showPublicAddress`
- Exibição somente quando habilitado pelo livreiro/admin.

4. Limites por plano (feature flag)
- Limite de livros ativos visíveis por tier.
- `ENFORCE_PLAN_LIMITS=false` por padrão em validação.

5. UI/Admin avançada
- Gestão de tier no Admin.
- Ajuste de slug/vitrine no Settings.
- Ajuste de limite por sebo (override administrativo).

## 2) Estrutura de Monetização (Proposta)

### Tabela de planos (MVP comercial)

- `Free`
  - vitrine padrão (`/sebo/:id`)
  - sem URL personalizada
  - limite menor de livros ativos (quando enforcement for ativado)
  - sem destaque na listagem

- `Pro`
  - vitrine personalizada (`/s/:slug`)
  - selo Pro
  - limite intermediário de livros ativos
  - destaque leve em busca/listagem

- `Gold`
  - vitrine personalizada (`/s/:slug`)
  - selo Gold
  - limite alto ou ilimitado
  - destaque máximo (ordenação e vitrine)

### Regras comerciais iniciais (sem gateway ainda)

- cobrança manual (pix/assinatura externa) + ativação por admin.
- upgrade/downgrade por ação administrativa (`setPlan`).
- período de cortesia opcional para banca/piloto.

### Recursos extras por plano (evolução)

- Pro: analytics mais detalhado, publicação priorizada.
- Gold: relatórios avançados, maior vitrine, suporte prioritário.

## 3) Estratégia para Não Quebrar

1. Branch isolada
- `feature/tiers-reviews-safe`

2. Deploy de preview
- Push da branch para gerar preview deployment no Cloudflare Pages.

3. Feature flags obrigatórias
- `FEATURE_TIERS=false`
- `FEATURE_REVIEWS=false`
- `FEATURE_PUBLIC_SEBO_CONTACT=false`
- `ENFORCE_PLAN_LIMITS=false`

4. Fail-safe
- `books.list` nunca pode depender dos recursos novos para responder 200.
- Em erro dos módulos novos, fallback para comportamento atual.

5. Migrações idempotentes
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- Evitar migração destrutiva.

## 4) Ordem Recomendada de Implementação

1. Backend base (schema + routers) com flags desligadas.
2. Migrações em preview D1.
3. UI somente leitura (badge de plano, resumo de avaliação).
4. Form de avaliação comprador.
5. Admin de moderação/planos.
6. Ativação gradual de flags (uma por vez).

## 5) Critérios de Go/No-Go

- `GET /trpc/books.list` retorna 200 no preview.
- Home carrega sem fallback de erro JSON.
- Admin e Settings abrem sem erro.
- Sem `error code: 1101` no `wrangler pages deployment tail`.
- Somente após isso considerar merge para `main`.

## 6) Métricas de Negócio (para acompanhar)

- conversão `free -> pro`.
- conversão `pro -> gold`.
- churn mensal por plano.
- MRR estimado por faixa de plano.
- CAC inicial (tempo/esforço comercial por ativação).
- % de sebos com catálogo ativo por plano.

## 7) Plano de Lançamento Comercial

1. Piloto (somente convite)
- ativação manual via admin.
- coleta de feedback de 5 a 10 sebos.

2. Beta pago
- tabela de preços definida.
- comunicação de benefícios por plano.

3. Escala
- automação de cobrança.
- automação de upgrade/downgrade e bloqueios por plano.

## 8) Comandos Úteis

```bash
# criar branch de desenvolvimento seguro
git checkout main
git pull origin main
git checkout -b feature/tiers-reviews-safe

# subir branch para preview deployment
git push -u origin feature/tiers-reviews-safe

# acompanhar logs no preview/produção
npx wrangler pages deployment tail --project-name mvp-teka
```

## 9) Observação

O banco remoto já pode conter colunas extras adicionadas em testes anteriores. Isso não é problema, desde que o código em `main` permaneça compatível e sem hard dependency nos recursos ainda não ativados.
