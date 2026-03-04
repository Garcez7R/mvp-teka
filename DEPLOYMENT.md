# 🚀 Guia de Deployment no Vercel

## Pré-requisitos

1. Conta Vercel conectada ao GitHub
2. Variáveis de ambiente configuradas
3. Banco de dados MySQL acessível (Vercel pode acessar)

## Passo 1: Configurar Variáveis de Ambiente

No Vercel Dashboard → Project Settings → Environment Variables, adicione:

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name

# OAuth Manus
VITE_OAUTH_PORTAL_URL=https://your-oauth-portal.com
VITE_APP_ID=your_app_id

# Runtime
NODE_ENV=production
```

## Passo 2: Deploy

### Primeiro Deploy
```bash
git push origin main
```

O Vercel automaticamente:
1. Faz checkout do código
2. Instala dependências: `pnpm install`
3. Build: `pnpm build && pnpm build:server`
4. Inicia servidor: `node dist/index.js`

### Deploy Manual
```bash
pnpm install -g vercel
vercel
```

## Monitorar Build

- Acesse https://vercel.com → seu projeto → Deployments
- Logs aparecem em tempo real durante build

## Possíveis Erros e Soluções

### ❌ Erro: "DATABASE_URL is required"
**Solução**: Adicionar `DATABASE_URL` nas variáveis de ambiente do Vercel

### ❌ Erro: "AWS credentials not found"
**Solução**: Verificar variáveis AWS_* no Vercel

### ❌ Build falha com "cannot find module"
**Solução**: Garantir que todas as importações têm `import.js` ou `import.ts`

## Estrutura Final Deployada

```
Vercel
├── Express Server (Node.js 18+)
│   ├── tRPC Router
│   ├── Database Connection
│   └── S3 Integration
└── Static Files (React Build)
    ├── /public/*
    └── /index.html
```

## Monitoramento Pós-Deploy

### Health Check
```bash
curl https://seu-dominio.vercel.app/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-03-03T10:30:00.000Z"
}
```

### Logs
Via Vercel Dashboard → Logs
- Real-time
- 24h retenção
- Filtrar por tipo

## Performance

- **Time to First Byte (TTFB)**: < 500ms
- **Static Assets**: CDN global Vercel
- **Database**: Otimizar queries com índices

## Rollback

```bash
# Ver deployments anteriores
vercel list

# Revertir para versão anterior
vercel rollback
```

## Scaling

Vercel escala automaticamente:
- Cold starts: ~0.5s
- Concurrent requests: ilimitado
- Storage: 50GB logs gratuito

---

**Precisando de ajuda?**
- Docs Vercel: https://vercel.com/docs
- Suporte: https://vercel.com/support
