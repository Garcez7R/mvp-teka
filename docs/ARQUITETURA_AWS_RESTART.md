# Arquitetura AWS Proposta para o TEKA

Documento de apoio para apresentação técnica à banca do programa AWS re/Start da Escola da Nuvem.

## 1. Objetivo

Apresentar uma proposta de topologia AWS para o projeto **TEKA**, atualmente preparado para execução com frontend em Vite/React, backend em tRPC e banco relacional modelado com Drizzle.

Esta proposta considera uma migração conceitual da arquitetura atual em Cloudflare para uma arquitetura equivalente e escalável na AWS.

## 2. Resumo Executivo

O TEKA é uma plataforma web para conectar leitores e sebos, com funcionalidades de catálogo, autenticação, favoritos, interesses, OCR e painel administrativo.

Na AWS, a recomendação é separar a solução em quatro camadas:

1. Entrega e segurança na borda.
2. Hospedagem do frontend estático.
3. Execução do backend serverless.
4. Persistência relacional e observabilidade.

## 3. Topologia Proposta

```text
Usuário
  |
Route 53
  |
CloudFront + AWS WAF
  |----------------------> S3 (frontend estático React/Vite)
  |
  +----------------------> API Gateway
                               |
                               v
                             AWS Lambda
                               |
          +--------------------+--------------------+
          |                                         |
          v                                         v
 Aurora PostgreSQL Serverless v2            Secrets Manager
 (banco da aplicação)                       (segredos e credenciais)
          |
          v
     CloudWatch
 (logs, métricas e alarmes)
```

## 4. Descritivo dos Módulos AWS

| Módulo AWS | Responsabilidade | Justificativa de uso | Alternativa mais barata | Custo inicial estimado |
|---|---|---|---|---|
| Route 53 | Resolver o domínio da aplicação e direcionar o tráfego para a borda | Serviço DNS gerenciado, integrado ao restante da AWS e adequado para produção | DNS externo já existente | Baixo |
| CloudFront | Entregar o frontend com cache global e baixa latência | Reduz latência, melhora performance e permite regras de cache para SPA e assets | Sem CDN, usando S3 direto, não recomendado para produção | Baixo a moderado |
| AWS WAF | Proteger a aplicação contra abuso e ataques comuns | Adiciona camada de segurança com regras gerenciadas e rate limiting | Rate limit apenas na API, com menos proteção de borda | Moderado |
| S3 | Armazenar o build do frontend e, futuramente, imagens/arquivos | Alta durabilidade, baixo custo e integração nativa com CloudFront | AWS Amplify Hosting ou EC2 simples | Muito baixo |
| API Gateway | Expor rotas HTTP da aplicação, como `/trpc`, `/api/ocr` e `/health` | Padroniza entrada da API, escala sob demanda e integra com Lambda | Application Load Balancer com ECS/Fargate | Baixo a moderado |
| AWS Lambda | Executar o backend serverless da aplicação | Bom encaixe para a API atual, reduz custo ocioso e facilita escalar sob demanda | ECS Fargate ou EC2 | Baixo no início |
| Aurora PostgreSQL Serverless v2 | Armazenar os dados da aplicação com modelo relacional | Melhor aderência ao modelo atual de usuários, livros, sebos, favoritos, auditoria e reviews | RDS PostgreSQL tradicional | Moderado |
| Secrets Manager | Guardar segredos, chaves e credenciais | Centraliza segurança de variáveis sensíveis e evita segredos em código | SSM Parameter Store para parte dos casos | Baixo |
| CloudWatch | Centralizar logs, métricas e alarmes | Essencial para operação, troubleshooting e acompanhamento da solução | Ferramentas externas de observabilidade | Baixo |

## 5. Banco de Dados da Aplicação

Para esta arquitetura, o banco de dados da aplicação será o `Aurora PostgreSQL Serverless v2`.

Motivo da escolha:

- O TEKA possui modelo relacional claro.
- Existem entidades fortemente ligadas entre si.
- O backend usa Drizzle ORM com estrutura mais próxima de banco SQL.
- Há consultas e relacionamentos entre usuários, sebos, livros, favoritos, auditoria e avaliações.

### Entidades principais da aplicação

- `users`
- `sebos`
- `books`
- `favorites`
- `book_interests`
- `wishlist_items`
- `audit_logs`
- `sebo_reviews`

### Papel do Aurora no TEKA

- armazenar os dados transacionais da plataforma;
- sustentar consultas relacionais entre usuários, sebos, livros e interações;
- permitir crescimento com administração reduzida;
- manter aderência ao modelo atual usado pelo backend.

### Conclusão sobre banco

`Aurora PostgreSQL Serverless v2` é a opção recomendada para o TEKA porque combina modelo relacional, elasticidade e boa aderência ao desenho atual da aplicação.

## 6. Mapeamento da Arquitetura Atual para AWS

| Arquitetura atual | Equivalente na AWS |
|---|---|
| Cloudflare Pages | S3 + CloudFront |
| Cloudflare Pages Functions | API Gateway + Lambda |
| Cloudflare D1 | Aurora PostgreSQL Serverless v2 |
| Variáveis/Secrets no Cloudflare | Secrets Manager / Parameter Store |
| Cloudflare WAF/Bot features | AWS WAF |

## 7. Como cada camada seria usada no TEKA

### Frontend

- O build gerado pelo Vite seria publicado em um bucket S3.
- O CloudFront entregaria `index.html`, `manifest.json`, `sw.js` e os bundles em `/assets`.
- O cache seria agressivo para assets versionados e conservador para HTML e service worker.

### Backend

- O backend rodaria em funções Lambda.
- As rotas públicas seriam expostas pelo API Gateway.
- O handler processaria autenticação Google, chamadas tRPC, OCR e verificações de saúde.

### Banco de dados

- O Aurora PostgreSQL armazenaria os dados transacionais da aplicação.
- O Drizzle ORM seria adaptado para um driver SQL compatível com PostgreSQL.

### Segurança

- O WAF filtraria tráfego suspeito.
- O Secrets Manager armazenaria segredos de produção.
- O CloudFront e a API manteriam headers de segurança e controle de cache.

### Operação

- O CloudWatch receberia logs das funções.
- Alarmes poderiam notificar falhas de autenticação, picos de erro 5xx e timeout de OCR.

## 8. Alternativa mais econômica

Se a prioridade fosse reduzir custo ao máximo para um MVP ou ambiente acadêmico, a versão mais enxuta seria:

- `Route 53`
- `CloudFront`
- `S3`
- `API Gateway`
- `Lambda`
- `RDS PostgreSQL` pequeno em vez de `Aurora Serverless`
- `CloudWatch`

Essa alternativa tende a reduzir custo de banco no início, mas perde parte da elasticidade e da sofisticação operacional do Aurora Serverless.

## 9. Estimativa inicial mensal

Valores abaixo são apenas uma simulação de referência para apresentação. Eles variam conforme região, volume de acesso, tráfego, armazenamento e quantidade de chamadas.

| Serviço | Faixa estimada mensal |
|---|---|
| Route 53 | US$ 1 a US$ 5 |
| S3 | US$ 1 a US$ 10 |
| CloudFront | US$ 5 a US$ 30 |
| API Gateway | US$ 3 a US$ 20 |
| Lambda | US$ 1 a US$ 15 |
| Secrets Manager | US$ 1 a US$ 5 |
| CloudWatch | US$ 2 a US$ 15 |
| AWS WAF | US$ 5 a US$ 20 |
| Aurora PostgreSQL Serverless v2 | US$ 40 a US$ 120 |

### Faixa total estimada

- Ambiente acadêmico ou MVP com baixo tráfego: `US$ 59 a US$ 240 / mês`
- Ambiente enxuto com banco mais barato em RDS pequeno: `US$ 25 a US$ 120 / mês`

## 10. Justificativa final da proposta

Essa topologia foi escolhida porque:

- separa bem frontend, backend e banco;
- usa serviços gerenciados;
- reduz esforço operacional;
- escala de forma adequada para MVP e crescimento;
- mantém coerência com a arquitetura lógica do projeto atual;
- facilita apresentar conceitos de DNS, CDN, serverless, banco relacional, segurança e observabilidade.

## 11. Conclusão

Para a banca, a proposta mais coerente é apresentar o TEKA na AWS com:

- `Route 53` para DNS;
- `CloudFront` e `S3` para entrega do frontend;
- `API Gateway` e `Lambda` para o backend;
- `Aurora PostgreSQL Serverless v2` para o banco principal;
- `Secrets Manager`, `WAF` e `CloudWatch` para segurança e operação.

Essa arquitetura é tecnicamente consistente com o tipo de aplicação desenvolvida e demonstra boa prática de desenho em nuvem.
