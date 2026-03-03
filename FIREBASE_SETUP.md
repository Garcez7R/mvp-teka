# 🔥 Firebase Setup - Guia Prático

## ✅ Passo 1: Criar Projeto Firebase

1. Vá para https://console.firebase.google.com
2. Clique "Add project"
3. Nome: `TEKA`
4. Desmarque "Enable Google Analytics" (opcional)
5. Create project

---

## ✅ Passo 2: Habilitar Storage

1. Left menu → "Storage"
2. "Get Started"
3. "Start in Test Mode" (por enquanto)
4. Escolha location: `us-central1` (ou perto de você)
5. "Done"

---

## ✅ Passo 3: Pegar Service Account (Chave)

1. Top right → ⚙️ "Project Settings"
2. Tab "Service Accounts"
3. Botão "Generate New Private Key"
4. "Generate Key"
5. Vai baixar um arquivo `xxxxx-key.json`

⚠️ **GUARDE ESSE ARQUIVO COM CUIDADO!**

---

## ✅ Passo 4: Pegar Storage Bucket Name

Ainda em "Project Settings":

1. Tab "General"
2. Procure por "Cloud Storage bucket"
3. Copie o nome, exemplo: `teka-project.appspot.com`

---

## ✅ Passo 5: Configurar `.env.local`

### **5a. Abrir o arquivo .json baixado**

```bash
cat ~/Downloads/teka-xxxxx-key.json
```

Você vai ver algo como:
```json
{
  "type": "service_account",
  "project_id": "teka-project",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  ...
}
```

### **5b. Criar `.env.local`**

```bash
nano /home/rgarcez/Documentos/teka/.env.local
```

Cole isso (substitua pelos seus valores):

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/teka

# Firebase
FIREBASE_STORAGE_BUCKET=teka-project.appspot.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"teka-project",...}

# OAuth (deixa vazio por enquanto)
VITE_OAUTH_PORTAL_URL=https://oauth.example.com
VITE_APP_ID=app_xxxx
```

⚠️ **Para FIREBASE_SERVICE_ACCOUNT**:
- Pegue TODO o conteúdo do arquivo JSON (chaves e tudo)
- Cole em uma linha só (remova quebras)
- Escapa aspas se precisar

---

## ✅ Passo 6: Instalar Firebase Admin SDK

```bash
cd /home/rgarcez/Documentos/teka
npm install firebase-admin
```

Ou com npm se não tiver pnpm:
```bash
npm install firebase-admin
```

---

## ✅ Passo 7: Testar Local

```bash
npm run dev
```

Vá para http://localhost:5173/add-book

Clique em "Cadastrar Livro" e veja se consegue fazer upload!

---

## 🚀 Passo 8: Deploy Vercel

### **8a. Fazer commit local**

```bash
git add .
git commit -m "feat: integrate Firebase Storage"
git push origin main
```

### **8b. Configurar Vercel**

1. https://vercel.com/dashboard → seu projeto TEKA
2. Settings → Environment Variables
3. Adicione:
   - `DATABASE_URL` = sua conexão MySQL
   - `FIREBASE_STORAGE_BUCKET` = `teka-project.appspot.com`
   - `FIREBASE_SERVICE_ACCOUNT` = Cole o JSON inteiro

### **8c. Deploy**

Vercel faz deploy automático quando você push!

---

## ✨ Rules Firebase (Segurança)

Por padrão, Firebase Storage está em "Test Mode" (qualquer um upload).

**Mudar para Produção**:

1. Firebase Console → Storage → Rules tab
2. Adicione regras de segurança:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload
    match /books/{allPaths=**} {
      allow write: if request.auth != null;
      allow read: if true; // Public read
    }
  }
}
```

3. Publish

---

## 🧪 Testar Upload

**Local**:
```bash
npm run dev
# Vai para http://localhost:5173/add-book
# Tenta fazer upload de uma imagem
```

**Verificar em Firebase**:
1. Firebase Console → Storage
2. Procure pela pasta `books/`
3. Deve ver arquivo lá! ✅

---

## 🎯 Estrutura final no Firebase

```
gs://teka-project.appspot.com/
└── books/
    ├── nanoid1/
    │   └── cover.jpg
    ├── nanoid2/
    │   └── bookcover.png
    └── ...
```

---

## ❌ Troubleshooting

### Erro: "Firebase Storage not configured"
- Verificar `.env.local`
- `FIREBASE_SERVICE_ACCOUNT` tem aspas fechadas?
- JSON está válido?

### Erro: "Permission denied"
- Firebase Rules estão permitindo write?
- Usuário está autenticado?
- Bucket name correto?

### Arquivo não aparece em Storage
- Verificar pasta `books/`
- Upload completou sem erro?

---

## 📊 Custos

- **Primeiros 5GB**: Grátis
- Depois: ~$0.02/GB

Para MVP, você fica no free tier tranquilo!

---

## ✅ Checklist Final

- [ ] Projeto Firebase criado
- [ ] Storage ativado
- [ ] Service Account baixado
- [ ] `.env.local` configurado
- [ ] `FIREBASE_SERVICE_ACCOUNT` é JSON válido
- [ ] `npm install firebase-admin` executado
- [ ] `npm run dev` funciona
- [ ] Upload testa sem erro
- [ ] Arquivo aparece em Storage
- [ ] Push para GitHub
- [ ] Vercel environment variables configuradas
- [ ] Deploy Vercel com sucesso

---

Pronto? Se tiver dúvidas em algum passo, me avisa! 🚀
