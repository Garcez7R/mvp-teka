# Esboco da Apresentacao - TEKA (AWS re/Start + Extensao IA)

Documento de apoio para montar a apresentacao da TEKA conforme as etapas do Modulo de IA.

## 0. Resumo Rapido (para abrir a apresentacao)

- Projeto: TEKA
- Problema: sebos pequenos precisam de vitrine digital e gestao simples de catalogo.
- Solucao: plataforma web que conecta leitores e sebos, com catalogo unificado, cadastro de livros e painel administrativo.
- Resultado: MVP funcional com fluxos de comprador, livreiro e admin.

## 1. Componentes e Containers (Entrega 1)

### 1.1 Componentes da solucao (o que sao e como se integram)

1. Frontend (Web/PWA)
   - Interface para compradores, livreiros e admin.
   - Entrega via CDN.

2. Backend (API)
   - Regras de negocio.
   - Autenticacao e autorizacao.
   - Integracao com banco.

3. Banco de dados (Relacional)
   - Entidades principais: usuarios, sebos, livros, favoritos, interesses, auditoria, avaliacoes.

4. OCR (servico externo)
   - Extracao de texto de imagem para apoiar cadastro de livros.

5. Observabilidade e seguranca
   - Logs, metricas, alarmes.
   - WAF e controle de acesso.

### 1.2 Integracao entre componentes (fluxo simples)

- Usuario acessa o site (frontend).
- Frontend chama a API (backend).
- Backend consulta o banco.
- Backend pode chamar OCR externo.
- Resposta retorna para o frontend.

### 1.3 Arquitetura de containers (diagrama solicitado)

Como nao criamos containers no projeto atual, sugerimos um diagrama de referencia:

- Container Frontend
- Container Backend API
- Container Banco (conceitual, pois em producao seria banco gerenciado)

Orientacao para o diagrama de containers:

- Use setas para mostrar:
  - Frontend -> Backend
  - Backend -> Banco
  - Backend -> OCR externo
- Destacar que o banco e um servico gerenciado (na nuvem), nao um container real.

## 2. Arquitetura do Projeto (Entrega 2)

### 2.1 Diagrama arquitetonico (AWS)

Resumo da arquitetura proposta:

- Route 53: DNS
- CloudFront: CDN
- S3: frontend estatico
- API Gateway: entrada da API
- Lambda: backend
- Aurora PostgreSQL Serverless v2: banco
- WAF: seguranca
- CloudWatch: logs e monitoramento
- Secrets Manager: segredos
- VPC + Subnets + Security Groups + NAT: rede e isolamento

Orientacao para o diagrama:

- Mostrar o fluxo Usuario -> Route 53 -> CloudFront.
- CloudFront apontando para S3 e API Gateway.
- API Gateway chamando Lambda.
- Lambda acessando Aurora.
- WAF na borda.
- CloudWatch e Secrets Manager conectados ao backend.

### 2.2 Descricao curta do diagrama

- O frontend fica em S3 e e distribuido pelo CloudFront.
- A API entra pelo API Gateway e executa em Lambda.
- O banco transacional e Aurora PostgreSQL Serverless v2.
- Seguranca e observabilidade sao tratadas com WAF, IAM, CloudWatch e Secrets Manager.

## 3. Desenvolvimento da Apresentacao (Entrega 3)

### 3.1 Estrutura sugerida de slides (15 minutos)

1. Capa
   - Nome do projeto, equipe, turma, data.

2. Problema e contexto
   - Dificuldade de sebos pequenos para ter catalogo online organizado.

3. Solucao proposta
   - O que e a TEKA e para quem serve.

4. Fluxos principais
   - Comprador, Livreiro, Admin.

5. Tecnologias usadas
   - Frontend, Backend, Banco, OCR.

6. Componentes e containers
   - Lista de componentes e como se conectam.

7. Arquitetura AWS
   - Diagrama arquitetonico.

8. Seguranca e observabilidade
   - WAF, IAM, CloudWatch, Secrets Manager.

9. Custos e escalabilidade
   - Por que serverless reduz custo no inicio.

10. Resultados do MVP
   - O que ja esta funcionando.

11. Proximos passos
   - Evolucoes planejadas.

12. Encerramento
   - Resumo em uma frase.

### 3.2 Itens visuais sugeridos

- Print da Home
- Print do Meu Catalogo
- Print do Admin
- Diagrama AWS
- Diagrama de containers

## 4. Apresentacao Final (Entrega 4)

### 4.1 Roteiro oral sugerido (15 minutos)

- 2 min: problema e solucao
- 4 min: demostracao rapida do app
- 4 min: arquitetura AWS + containers
- 3 min: seguranca, custos e escalabilidade
- 2 min: proximos passos e encerramento

### 4.2 Perguntas possiveis da banca

Use o guia:

- `docs/PERGUNTAS_BANCA_AWS_RESTART.md`

## 5. Arquivos para o Google Classroom

- Apresentacao em PDF
- Este documento (Entrega 1 + 2 + 3 + 4)
- Diagramas (PNG ou PDF)
- Outros arquivos relevantes (prints, docs)

## 6. O que nao foi feito automaticamente aqui

1. Diagrama de containers
2. Diagrama arquitetonico em ferramenta grafica
3. Slides em PowerPoint/Canva/Google Slides

## 7. Orientacao para completar o que falta

### 7.1 Diagrama de containers

Ferramentas:

- Draw.io
- LucidChart

Passos:

1. Crie 3 blocos (Frontend, Backend, Banco).
2. Adicione setas mostrando as comunicacoes.
3. Marque o Banco como "gerenciado".

### 7.2 Diagrama de arquitetura AWS

Passos:

1. Coloque o Usuario na esquerda.
2. Route 53 e CloudFront na borda.
3. CloudFront conectando em S3 e API Gateway.
4. API Gateway chamando Lambda.
5. Lambda acessando Aurora.
6. WAF na borda.
7. CloudWatch e Secrets Manager conectados ao backend.
8. Adicione VPC e Subnets em volta de Lambda e Aurora.

### 7.3 Slides

Passos:

1. Use o roteiro da secao 3.
2. Insira prints do app e diagramas.
3. Mantenha pouco texto por slide.
4. Treine o roteiro de 15 minutos.
