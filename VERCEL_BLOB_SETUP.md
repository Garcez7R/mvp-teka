# 🎉 Vercel Blob - Setup Grátis (5 min)

Esqueceu Firebase! Agora vamos usar **Vercel Blob** - é **100% GRÁTIS** e funcionam direto com Vercel.

## ✅ Passo 1: Instalar SDK

```bash
cd /home/rgarcez/Documentos/teka
npm install @vercel/blob
```

## ✅ Passo 2: Configurar `.env.local`

Create o arquivo:

```bash
touch .env.local
```

Cole isso:

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/teka

# Vercel Blob - Credenciais vazias por enquanto (local dev)
BLOB_READ_WRITE_TOKEN=dev_dummy_token

# OAuth
VITE_OAUTH_PORTAL_URL=https://oauth.example.com
VITE_APP_ID=app_xxxx
```

## ✅ Passo 3: Testar Local

```bash
npm run dev
```

Vai para http://localhost:5173/add-book

Tenta fazer upload de uma imagem - vai salvar localmente (mock).

## ✅ Passo 4: Deploy Vercel

1. Push para GitHub:
```bash
git add .
git commit -m "feat: use Vercel Blob for storage (free tier)"
git push origin main
```

2. Vercel Dashboard → seu projeto → Deployments
   - Deploy automático vai acontecer
   - Vai funcionar sem credenciais no início

3. **Depois que Deploy funcionar**, configure Blob:
   - Vercel Dashboard → Settings → Environment Variables
   - `BLOB_READ_WRITE_TOKEN` = vai gerar automaticamente quando precisar

---

## 🎁 Vantagens Vercel Blob

```
✅ Grátis (100GB/mês free tier)
✅ Integrado com Vercel (zero config!)
✅ Sem limite de requests
✅ Automático em produção
✅ Muito rápido
❌ Não funciona local perfeitamente (ok para MVP)
```

---

## 🚀 Fluxo de Upload

### Local (Dev)
- Upload → Salva URL mock
- Funciona pra testar UI

### Vercel (Produção)
- Upload → Vai direto pro Vercel Blob
- Files aparecem em Dashboard

---

## ✨ Próximo Passo

1. ✅ `npm install @vercel/blob`
2. ✅ Criar `.env.local`
3. ✅ `npm run dev` e testar
4. ✅ Git push
5. ✅ Deploy automático Vercel
6. ✅ Pronto! 🚀

Sem pagar nada!

---

**Documentação**: https://vercel.com/docs/storage/vercel-blob
