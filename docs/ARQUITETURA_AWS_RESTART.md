# Arquitetura AWS Proposta para a TEKA

Documento de apoio para apresentação técnica à banca do programa AWS re/Start da Escola da Nuvem.

## 1. Objetivo

Apresentar uma proposta de topologia AWS para o projeto **TEKA**, com frontend em Vite/React, backend em tRPC e banco relacional modelado com Drizzle.

## 2. Resumo Executivo

A TEKA é uma plataforma web para conectar leitores e sebos, com funcionalidades de catálogo, autenticação, favoritos, interesses, OCR e painel administrativo.

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
| ACM | Emitir o certificado TLS do domínio | Necessário para HTTPS no CloudFront e domínio próprio | Certificado externo, com maior complexidade operacional | Muito baixo |
| Route 53 | Resolver o domínio da aplicação e direcionar o tráfego para a borda | Serviço DNS gerenciado, integrado ao restante da AWS e adequado para produção | DNS externo já existente | Baixo |
| CloudFront | Entregar o frontend com cache global e baixa latência | Reduz latência, melhora performance e permite regras de cache para SPA e assets | Sem CDN, usando S3 direto, não recomendado para produção | Baixo a moderado |
| AWS WAF | Proteger a aplicação contra abuso e ataques comuns | Adiciona camada de segurança com regras gerenciadas e rate limiting | Rate limit apenas na API, com menos proteção de borda | Moderado |
| S3 | Armazenar o build do frontend e, futuramente, imagens/arquivos | Alta durabilidade, baixo custo e integração nativa com CloudFront | AWS Amplify Hosting ou EC2 simples | Muito baixo |
| VPC | Isolar a camada privada da aplicação | Necessária para hospedar banco e funções de backend com controle de rede | Arquitetura sem isolamento de rede, não indicada para produção | Baixo |
| Subnets + Security Groups | Separar tráfego público e privado e controlar acesso entre serviços | Permite restringir banco apenas ao backend e manter segmentação por função | Regras abertas, com risco maior de exposição | Baixo |
| NAT Gateway | Permitir saída para internet a partir de Lambdas privadas | Necessário para OCR externo, validação Google e outros acessos HTTP de saída | NAT Instance, com mais operação manual | Moderado a alto |
| API Gateway | Expor rotas HTTP da aplicação, como `/trpc`, `/api/ocr` e `/health` | Padroniza entrada da API, escala sob demanda e integra com Lambda | Application Load Balancer com ECS/Fargate | Baixo a moderado |
| AWS Lambda | Executar o backend serverless da aplicação | Bom encaixe para a API atual, reduz custo ocioso e facilita escalar sob demanda | ECS Fargate ou EC2 | Baixo no início |
| Aurora PostgreSQL Serverless v2 | Armazenar os dados da aplicação com modelo relacional | Melhor aderência ao modelo atual de usuários, livros, sebos, favoritos, auditoria e reviews | RDS PostgreSQL tradicional | Moderado |
| Secrets Manager | Guardar segredos, chaves e credenciais | Centraliza segurança de variáveis sensíveis e evita segredos em código | SSM Parameter Store para parte dos casos | Baixo |
| IAM | Controlar permissões entre os serviços | Garante princípio do menor privilégio e separação de papéis | Permissões amplas, não recomendado | Muito baixo |
| CloudWatch | Centralizar logs, métricas e alarmes | Essencial para operação, troubleshooting e acompanhamento da solução | Ferramentas externas de observabilidade | Baixo |

## 5. Escopo Técnico Detalhado por Serviço

### ACM

- 1 certificado público para o domínio principal da aplicação.
- Uso esperado:
  - `teka.seudominio.com` ou `www.seudominio.com`
  - opcionalmente `api.seudominio.com`
- Função no projeto:
  - habilitar HTTPS no CloudFront;
  - garantir comunicação segura com o usuário final.

### Route 53

- 1 hosted zone pública.
- Registros principais:
  - `A/AAAA Alias` para CloudFront;
  - opcionalmente subdomínio dedicado para API.
- Função no projeto:
  - resolver o domínio e direcionar o usuário para a camada de borda.

### CloudFront

- 1 distribuição principal.
- Origins sugeridas:
  - bucket S3 do frontend;
  - API Gateway para rotas dinâmicas.
- Comportamentos recomendados:
  - `/assets/*` com cache longo e `immutable`;
  - `/index.html`, `/sw.js` e `manifest.json` com cache controlado;
  - `/trpc/*`, `/api/*` e `/health` sem cache.
- Função no projeto:
  - entregar a SPA com baixa latência;
  - proteger e otimizar o acesso ao frontend.

### AWS WAF

- 1 Web ACL associada ao CloudFront.
- Regras iniciais:
  - AWS Managed Rules;
  - rate limit por IP;
  - bloqueio básico para padrões maliciosos.
- Função no projeto:
  - reduzir risco de abuso, scraping agressivo e ataques comuns.

### S3

- 1 bucket principal para frontend.
- Conteúdo esperado:
  - `index.html`
  - `assets/*.js`
  - `assets/*.css`
  - `manifest.json`
  - `sw.js`
- Configuração recomendada:
  - acesso privado;
  - entrega apenas via CloudFront;
  - versionamento opcional.
- Função no projeto:
  - armazenar o build estático do Vite.

### VPC

- 1 VPC dedicada para a aplicação.
- Estrutura sugerida:
  - 2 Availability Zones;
  - 2 subnets públicas;
  - 2 subnets privadas para Lambda e Aurora.
- Função no projeto:
  - isolar a camada de dados;
  - organizar conectividade entre backend e banco.

### Subnets e Security Groups

- Subnets públicas:
  - reservadas para recursos com saída controlada, como NAT Gateway.
- Subnets privadas:
  - usadas pela Lambda e pelo Aurora.
- Security Groups:
  - 1 grupo para Lambda;
  - 1 grupo para Aurora;
  - regra permitindo acesso ao banco apenas a partir da Lambda na porta PostgreSQL.
- Função no projeto:
  - segmentar a rede;
  - evitar exposição direta do banco.

### NAT Gateway

- 1 NAT Gateway inicial em subnet pública.
- Necessidade no cenário atual:
  - acesso da Lambda a serviços externos, como OCR e endpoints do Google.
- Observação:
  - é um item importante de custo em arquiteturas privadas com saída para internet.

### API Gateway

- 1 HTTP API.
- Rotas sugeridas:
  - `GET /health`
  - `POST /api/ocr`
  - `/trpc/*`
- Função no projeto:
  - publicar a API da aplicação;
  - encaminhar chamadas para Lambda.

### AWS Lambda

- 1 ou 2 funções, dependendo da separação desejada:
  - `teka-api` para tRPC e health check;
  - `teka-ocr` opcionalmente separada para OCR.
- Configuração inicial sugerida:
  - runtime Node.js;
  - 512 MB a 1024 MB de memória;
  - timeout de 10 a 20 segundos;
  - concorrência sob demanda.
- Função no projeto:
  - executar autenticação;
  - aplicar regra de negócio;
  - integrar com banco e serviços externos.
- Modelo de execução esperado:
  - receber a requisição;
  - processar a lógica necessária;
  - consultar ou gravar dados;
  - opcionalmente acionar outro fluxo assíncrono;
  - finalizar a execução rapidamente.
- Vantagem de custo:
  - como a cobrança ocorre por invocação e tempo de execução, esse uso curto e sob demanda tende a ser bem mais econômico do que manter servidor dedicado ligado continuamente.

### Aurora PostgreSQL Serverless v2

- 1 cluster Aurora PostgreSQL Serverless v2.
- Configuração inicial sugerida:
  - 1 database cluster;
  - 1 writer instance serverless;
  - faixa inicial de capacidade pequena para MVP.
- Estruturas esperadas no banco:
  - usuários;
  - sebos;
  - livros;
  - favoritos;
  - interesses;
  - auditoria;
  - avaliações.
- Função no projeto:
  - persistir o banco transacional principal da aplicação.

### Secrets Manager

- Segredos iniciais esperados:
  - `GOOGLE_CLIENT_ID`
  - `VITE_GOOGLE_CLIENT_ID` quando necessário ao pipeline;
  - `OCR_SPACE_API_KEY`
  - credenciais do banco, se aplicável.
- Função no projeto:
  - armazenar informações sensíveis de forma segura.

### IAM

- Papéis mínimos esperados:
  - role da Lambda com acesso a CloudWatch, Secrets Manager e conectividade ao banco;
  - permissões restritas por serviço.
- Função no projeto:
  - limitar acesso entre componentes e reforçar segurança operacional.

### CloudWatch

- Itens iniciais:
  - log groups das Lambdas;
  - métricas de erro, duração e invocação;
  - alarmes para 5xx, timeout e falhas repetidas.
- Função no projeto:
  - observabilidade da aplicação e suporte à operação.

### Observação sobre instâncias

Nesta proposta principal, **não há instâncias EC2 dedicadas para a aplicação**.

Os componentes de processamento são serverless:

- `AWS Lambda` para execução do backend;
- `Aurora Serverless v2` para banco relacional com capacidade elástica.

Isso simplifica a operação e reduz a necessidade de administração de servidores.

### Observação sobre processamento longo

Nesta arquitetura, a Lambda foi pensada para tarefas curtas de API.

Se existir necessidade de processamento mais longo, a função pode apenas iniciar outro fluxo e encerrar, por exemplo com:

- fila;
- orquestração;
- processamento assíncrono separado.

## 6. Banco de Dados da Aplicação

Para esta arquitetura, o banco de dados da aplicação será o `Aurora PostgreSQL Serverless v2`.

Motivo da escolha:

- A TEKA possui modelo relacional claro.
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

### Papel do Aurora na TEKA

- armazenar os dados transacionais da plataforma;
- sustentar consultas relacionais entre usuários, sebos, livros e interações;
- permitir crescimento com administração reduzida;
- manter aderência ao modelo atual usado pelo backend.

### Conclusão sobre banco

`Aurora PostgreSQL Serverless v2` é a opção recomendada para a TEKA porque combina modelo relacional, elasticidade e boa aderência ao desenho atual da aplicação.

## 7. Como cada camada seria usada na TEKA

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
- sem NAT Gateway, caso a arquitetura seja simplificada e não exija backend privado com saída externa

Essa alternativa tende a reduzir custo de banco no início, mas perde parte da elasticidade e da sofisticação operacional do Aurora Serverless.

## 9. Estimativa inicial mensal

Valores abaixo são apenas uma simulação de referência para apresentação. Eles variam conforme região, volume de acesso, tráfego, armazenamento e quantidade de chamadas.

| Serviço | Faixa estimada mensal |
|---|---|
| Route 53 | US$ 1 a US$ 5 |
| S3 | US$ 1 a US$ 10 |
| CloudFront | US$ 5 a US$ 30 |
| NAT Gateway | US$ 15 a US$ 45 |
| API Gateway | US$ 3 a US$ 20 |
| Lambda | US$ 1 a US$ 15 |
| Secrets Manager | US$ 1 a US$ 5 |
| CloudWatch | US$ 2 a US$ 15 |
| AWS WAF | US$ 5 a US$ 20 |
| Aurora PostgreSQL Serverless v2 | US$ 40 a US$ 120 |

### Faixa total estimada

- Ambiente acadêmico ou MVP com baixo tráfego: `US$ 74 a US$ 285 / mês`
- Ambiente enxuto com banco mais barato em RDS pequeno: `US$ 25 a US$ 120 / mês`

## 10. Justificativa final da proposta

Essa topologia foi escolhida porque:

- separa bem frontend, backend e banco;
- usa serviços gerenciados;
- reduz esforço operacional;
- escala de forma adequada para MVP e crescimento;
- mantém coerência com a arquitetura lógica do projeto atual;
- facilita apresentar conceitos de DNS, CDN, serverless, banco relacional, segurança e observabilidade.
