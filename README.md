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

## Screenshots

Estrutura pronta para inserir capturas futuras:

- `docs/screenshots/home-desktop.png`
- `docs/screenshots/home-mobile.png`
- `docs/screenshots/add-book.png`
- `docs/screenshots/batch-scan.png`
- `docs/screenshots/manage-books.png`

Quando as imagens estiverem prontas, basta adicionar no diretório e descomentar/usar as linhas abaixo:

```md
![Home Desktop](docs/screenshots/home-desktop.png)
![Home Mobile](docs/screenshots/home-mobile.png)
![Cadastrar Livro](docs/screenshots/add-book.png)
![Scan em Lote](docs/screenshots/batch-scan.png)
![Meus Livros](docs/screenshots/manage-books.png)
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
