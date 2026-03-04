# TEKA - Marketplace de Sebos

Plataforma para conectar compradores de livros usados com sebos (livrarias especializadas em livros usados).

## 🚀 Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Express + tRPC + Drizzle ORM
- **Database**: MySQL
- **Storage**: AWS S3
- **Deployment**: Vercel

## 📋 Pré-requisitos

- Node.js 18+
- pnpm (recomendado)
- MySQL 8.0+
- Conta AWS (para S3)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <seu-repo>
cd teka
```

2. **Instale dependências**
```bash
pnpm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### Variáveis de Ambiente Necessárias

- `DATABASE_URL`: String de conexão MySQL
- `AWS_REGION`: Região AWS (padrão: us-east-1)
- `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`: Credenciais AWS
- `AWS_S3_BUCKET`: Nome do bucket S3
- `VITE_OAUTH_PORTAL_URL`: URL do portal OAuth
- `VITE_APP_ID`: ID da aplicação OAuth

4. **Configure o banco de dados**
```bash
pnpm db:push
```

## 💻 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
pnpm dev

# Abrir em http://localhost:5173
```

### Estrutura do Projeto

```
.
├── client/                    # Frontend React
│   └── src/
│       ├── pages/            # Páginas da aplicação
│       ├── components/        # Componentes React
│       ├── hooks/            # Custom hooks
│       └── lib/              # Utilitários
├── server/                    # Backend Express + tRPC
│   ├── _core/               # Inicialização do servidor
│   └── routers/             # Endpoints tRPC
├── drizzle/                  # Migrações de banco de dados
└── shared/                   # Código compartilhado
```

## 📦 Build e Deploy

### Build Local
```bash
# Build cliente + servidor
pnpm build

# Build apenas servidor
pnpm build:server

# Iniciar em produção
pnpm start
```

### Deploy no Vercel

1. **Conecte seu repositório ao Vercel**
2. **Defina as variáveis de ambiente** no dashboard Vercel
3. **Deploy automático** ao fazer push para main

O Vercel executará automaticamente:
- `pnpm build` - Compila o frontend React
- `pnpm build:server` - Compila o backend Node.js
- Inicia o servidor com `node dist/index.js`

## 🛣️ Principais Rotas

### Frontend
- `/` - Home (catálogo de livros)
- `/book/:id` - Detalhes do livro
- `/add-book` - Cadastrar novo livro (sellers)
- `/about` - Sobre

### API (tRPC)
- `/trpc/books.list` - Listar livros com filtros
- `/trpc/books.getById` - Detalhes de um livro
- `/trpc/books.create` - Criar novo livro (autenticado)
- `/trpc/sebos.getMySebo` - Obter sebo do usuário
- `/trpc/upload.getSignedUrl` - Obter URL assinada S3

## 🔐 Autenticação

O projeto usa autenticação OAuth via Manus. Para implementar login:

1. Registre a aplicação no portal Manus OAuth
2. Configure `VITE_OAUTH_PORTAL_URL` e `VITE_APP_ID`
3. Implemente o callback: `/api/oauth/callback`

## 📸 Capas de Livros

As capas são:
- Primeiro: Buscadas via OpenLibrary (ISBN)
- Depois: Upload manual para S3
- Fallback: Imagem padrão (BookCover.tsx)

## 🚀 Próximas Features

- [ ] Sistema de avaliações
- [ ] Carrinho de compras
- [ ] Dashboard de vendedor
- [ ] Chat entre comprador e vendedor
- [ ] Localização (Google Maps)
- [ ] Sistema de pagamento

## 📝 Licença

MIT

## 👨‍💻 Autor

Desenvolvido por você!

---

**Precisa de ajuda?** Verifique:
- `.env.example` para configuração de variáveis
- `ideas.md` para visão do design
- Documentação de tRPC: https://trpc.io/
