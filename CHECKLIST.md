# 📋 Checklist Final de Deployment

## ✅ Código Implementado

- [x] Estrutura servidor tRPC completa
- [x] Endpoints tRPC para books, sebos, users, favorites, upload
- [x] Integração S3 para capas de livros
- [x] Página de cadastro de livros (AddBook.tsx)
- [x] Link WhatsApp integrado (+5551996263385)
- [x] Build scripts para Vercel
- [x] Variáveis de ambiente documentadas

## 🔧 Antes de Publicar no Vercel

### 1. Local - Verificar Build
```bash
# Instalar dependências
pnpm install

# Validar TypeScript
pnpm check

# Build cliente
pnpm build

# Build servidor
pnpm build:server

# Testar servidor localmente
pnpm dev
```

### 2. Preparar Variables de Ambiente

Adicione no Vercel Dashboard (Settings → Environment Variables):

```
DATABASE_URL=mysql://user:pass@host/db
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=teka-uploads
VITE_OAUTH_PORTAL_URL=https://...
VITE_APP_ID=app_...
NODE_ENV=production
```

### 3. Banco de Dados

```bash
# Executar migrações localmente primeiro (para testar)
pnpm db:push

# Depois no Vercel, durante o build ou manualmente via seu provider
# Se usar Planetscale, Vercel Postgres, ou outro, configure lá
```

### 4. AWS S3

Criar bucket S3:
- Nome: `teka-uploads`
- Region: `us-east-1` (ou sua região)
- CORS configurado para aceitar uploads cross-origin
- IAM User com permissões: `s3:GetObject`, `s3:PutObject`

### 5. Git - Preparar Commit Final

```bash
# Adicionar todos os arquivos
git add .

# Commit com mensagem (ajuste a mensagem conforme necessário)
git commit -m "feat: complete backend setup with tRPC, S3 integration and Vercel configuration"

# Push para main
git push origin main
```

## 🚀 Deployment no Vercel

### Opção 1: Via Dashboard
1. Vá para https://vercel.com/dashboard
2. New Project → Connect Git
3. Selecione seu repositório
4. Framework: Vite
5. Configure Environment Variables
6. Deploy!

### Opção 2: Via CLI
```bash
npm i -g vercel
vercel --prod
```

## ✨ Pós-Deploy

### Testar URLs
- [ ] https://seu-dominio.vercel.app/ (home)
- [ ] https://seu-dominio.vercel.app/about (about)
- [ ] https://seu-dominio.vercel.app/add-book (add book)
- [ ] https://seu-dominio.vercel.app/book/1 (book detail)
- [ ] https://seu-dominio.vercel.app/health (health check)

### Verificar tRPC
- [ ] GET `/trpc/books.list` - listar livros
- [ ] GET `/trpc/books.getCategories` - categorias
- [ ] GET `/health` - servidor ativo

### Monitorar
- [ ] Vercel Deployments → Logs em tempo real
- [ ] Console do navegador (F12) → erros?
- [ ] Network tab → requisições tRPC

## 🎯 Próximas Features (Roadmap)

**Curto Prazo** (1-2 semanas):
- [ ] Sistema de autenticação real (OAuth Manus)
- [ ] Criar dashboard do vendedor
- [ ] Melhorar busca com filtros avançados
- [ ] Upload de múltiplas capas

**Médio Prazo** (1-2 meses):
- [ ] Sistema de avaliações
- [ ] Chat entre comprador/vendedor
- [ ] Carrinho de compras
- [ ] Integração pagamento (Pix, Stripe)

**Longo Prazo** (3+ meses):
- [ ] App mobile (React Native)
- [ ] Localização Google Maps
- [ ] Recomendações ML
- [ ] Sistema de pontos/loyalty

## 🆘 Troubleshooting

### Build falha com "DATABASE_URL is required"
- Verificar environment variables no Vercel Dashboard
- Certificar que DATABASE_URL está configurada

### tRPC endpoints retornam 404
- Verificar se rotas no vercel.json estão corretas
- Checar logs do servidor em Vercel Logs

### S3 upload falha
- Verificar AWS credentials (não expiradas)
- CORS do bucket S3 configurado?
- Bucket name correto no .env?

### TypeScript errors in editor VSCode
```bash
# Reinstalar tipos
pnpm add -D @types/node

# Reload VSCode
Ctrl+Shift+P → Reload Window
```

## 📚 Recursos Úteis

- tRPC Docs: https://trpc.io/docs
- Vercel Docs: https://vercel.com/docs
- Drizzle ORM: https://orm.drizzle.team
- AWS S3: https://aws.amazon.com/s3

---

**Status**: 🟢 Pronto para produção
**Última atualização**: 3 de março de 2026
