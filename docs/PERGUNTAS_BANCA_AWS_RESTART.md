# Perguntas Possiveis da Banca AWS re/Start

Documento de apoio para apresentação do projeto **TEKA** com foco em perguntas prováveis da banca, respondidas em linguagem simples.

## 1. Perguntas Gerais sobre a Solução

### 1. O que é a TEKA?

Resposta simples:

A TEKA é uma plataforma web que conecta leitores e sebos. Ela permite cadastrar livros, pesquisar ofertas, favoritar itens e administrar catálogos.

Explicando para um leigo:

Pense na TEKA como uma vitrine digital para livrarias de livros usados. O comprador consegue encontrar livros e o livreiro consegue organizar e publicar o catálogo dele.

### 2. Qual problema essa solução resolve?

Resposta simples:

Ela facilita a divulgação e a busca de livros em sebos, organizando catálogos, estoque e contato com compradores em um só sistema.

Explicando para um leigo:

Muitos sebos pequenos não têm estrutura técnica para manter um catálogo online bem organizado. A TEKA simplifica isso e melhora a experiência de quem procura livros.

### 3. Por que usar AWS nesse projeto?

Resposta simples:

Porque a AWS oferece serviços gerenciados para hospedar o site, executar o backend, proteger a aplicação, armazenar o banco e monitorar tudo com escalabilidade.

Explicando para um leigo:

Em vez de montar e cuidar de vários servidores manualmente, a AWS entrega blocos prontos. Isso reduz trabalho operacional e ajuda a solução a crescer com mais segurança.

### 4. Essa arquitetura usa servidores tradicionais?

Resposta simples:

Na proposta principal, não. O processamento usa serviços serverless.

Explicando para um leigo:

Serverless significa que a equipe não precisa administrar uma máquina ligada o tempo todo para a aplicação funcionar. A nuvem executa a parte necessária quando há uso.

## 2. Perguntas sobre o Fluxo da Arquitetura

### 5. O que acontece quando o usuário acessa o sistema?

Resposta simples:

O usuário digita o endereço do sistema, o DNS encontra o destino, o CloudFront entrega a interface do site e as chamadas da aplicação seguem para a API.

Explicando para um leigo:

É como entrar em uma loja:

- o `Route 53` acha o endereço certo;
- o `CloudFront` entrega a vitrine rapidamente;
- o `API Gateway` recebe os pedidos;
- a `Lambda` processa a lógica;
- o `Aurora` guarda os dados.

### 6. Qual é o caminho de uma requisição até o banco?

Resposta simples:

Usuário -> Route 53 -> CloudFront -> API Gateway -> Lambda -> Aurora PostgreSQL.

Explicando para um leigo:

O pedido sai do navegador, passa pela camada de internet e segurança, chega ao backend, que consulta o banco e devolve a resposta pronta ao usuário.

### 7. Onde fica o frontend?

Resposta simples:

No `Amazon S3`, com entrega feita pelo `CloudFront`.

Explicando para um leigo:

O frontend é a parte visual do sistema. Ele é como um conjunto de arquivos do site guardados em um armazenamento e distribuídos por uma rede rápida.

### 8. Onde fica o backend?

Resposta simples:

Na `AWS Lambda`, exposta pelo `API Gateway`.

Explicando para um leigo:

O backend é a parte que recebe pedidos, valida informações, consulta banco e devolve respostas. Na proposta, ele roda sob demanda.

### 9. Onde ficam os dados da aplicação?

Resposta simples:

No `Aurora PostgreSQL Serverless v2`.

Explicando para um leigo:

É o banco principal do sistema. Ele guarda usuários, livros, sebos, favoritos, auditoria e outras informações importantes.

## 3. Perguntas por Serviço AWS

### 10. O que é o ACM?

Resposta simples:

É o serviço que fornece o certificado digital do site.

Explicando para um leigo:

Ele garante que o endereço use `https`, protegendo a comunicação entre o usuário e a aplicação.

### 11. O que é o Route 53?

Resposta simples:

É o serviço de DNS da AWS.

Explicando para um leigo:

Ele funciona como uma agenda de endereços da internet. Quando alguém digita o domínio, o Route 53 ajuda a encontrar para onde esse acesso deve ir.

### 12. O que é o CloudFront?

Resposta simples:

É a CDN da AWS, responsável por entregar o site com mais rapidez.

Explicando para um leigo:

Ele distribui cópias do conteúdo em pontos de presença ao redor do mundo. Assim, o site chega mais rápido ao usuário.

### 13. O que é o AWS WAF?

Resposta simples:

É a camada de proteção contra tráfego malicioso.

Explicando para um leigo:

Ele funciona como um porteiro inteligente na entrada da aplicação, ajudando a bloquear acessos abusivos ou suspeitos.

### 14. O que é o S3?

Resposta simples:

É o serviço de armazenamento de arquivos da AWS.

Explicando para um leigo:

No projeto, ele guarda os arquivos do frontend, como HTML, JavaScript, CSS e manifest.

### 15. O que é a VPC?

Resposta simples:

É a rede privada da aplicação dentro da AWS.

Explicando para um leigo:

Ela organiza onde cada recurso fica e quem pode conversar com quem dentro da arquitetura.

### 16. O que são subnets?

Resposta simples:

São divisões internas da rede.

Explicando para um leigo:

É como separar uma empresa por setores. Alguns componentes ficam em áreas mais protegidas e outros em áreas com acesso controlado.

### 17. O que são Security Groups?

Resposta simples:

São regras de segurança de rede.

Explicando para um leigo:

Eles definem quem pode falar com quem. Por exemplo, o banco pode aceitar conexão do backend, mas não da internet pública.

### 18. O que é o NAT Gateway?

Resposta simples:

É o recurso que permite saída para internet a partir de componentes privados.

Explicando para um leigo:

Se a Lambda estiver em uma rede privada, ela ainda pode precisar acessar serviços externos, como OCR ou validação do Google. O NAT permite essa saída sem expor o backend diretamente.

### 19. O que é o API Gateway?

Resposta simples:

É a porta de entrada da API.

Explicando para um leigo:

Ele recebe as requisições do aplicativo e encaminha para o backend correto.

### 20. O que é a AWS Lambda?

Resposta simples:

É o serviço que executa o código do backend sem precisar de servidor fixo.

Explicando para um leigo:

Ela roda quando necessário. Se ninguém estiver usando, não há máquina da aplicação parada esperando.

### 21. O que é o Aurora PostgreSQL Serverless v2?

Resposta simples:

É o banco relacional gerenciado usado para armazenar os dados do sistema.

Explicando para um leigo:

Ele guarda os dados de forma organizada, com suporte a relacionamentos entre tabelas e com capacidade de crescer conforme a demanda.

### 22. O que é o Secrets Manager?

Resposta simples:

É o serviço que guarda segredos da aplicação.

Explicando para um leigo:

Em vez de deixar chaves sensíveis no código, elas ficam armazenadas de forma segura e controlada.

### 23. O que é o IAM?

Resposta simples:

É o serviço que controla permissões na AWS.

Explicando para um leigo:

Ele define o que cada serviço pode ou não pode fazer. Isso reduz risco de acesso indevido.

### 24. O que é o CloudWatch?

Resposta simples:

É o serviço de logs, métricas e monitoramento.

Explicando para um leigo:

Ele ajuda a equipe a enxergar erros, lentidão e comportamentos anormais da aplicação.

## 4. Perguntas sobre Banco de Dados

### 25. Por que escolher Aurora PostgreSQL?

Resposta simples:

Porque o sistema tem dados relacionais, como usuários, livros, sebos e favoritos.

Explicando para um leigo:

Esse tipo de banco é ideal quando as informações têm ligação entre si e precisam ser consultadas com consistência.

### 26. O que o banco armazena na TEKA?

Resposta simples:

Usuários, sebos, livros, favoritos, interesses, auditoria e avaliações.

Explicando para um leigo:

O banco é a memória principal do sistema. Tudo o que precisa ser salvo de forma confiável passa por ele.

### 27. Por que o banco não fica aberto para a internet?

Resposta simples:

Porque isso aumenta o risco de segurança.

Explicando para um leigo:

O ideal é que apenas o backend consiga acessar o banco. O usuário nunca conversa com ele diretamente.

## 5. Perguntas sobre a Estrutura do App

### 28. Como o app está organizado de forma geral?

Resposta simples:

O app está dividido em frontend, backend e banco de dados.

Explicando para um leigo:

- o frontend é a parte visual que o usuário enxerga;
- o backend é a parte que processa regras e consultas;
- o banco guarda os dados da aplicação.

### 29. O que existe no frontend da TEKA?

Resposta simples:

No frontend existem páginas, componentes visuais, navegação e integração com a API.

Explicando para um leigo:

É a parte da aplicação que mostra telas como:

- home;
- login;
- catálogo de livros;
- detalhe do livro;
- criação de sebo;
- cadastro de livros;
- painel administrativo;
- configurações;
- scan em lote.

### 30. O que existe no backend da TEKA?

Resposta simples:

No backend existem rotas, autenticação, regras de negócio e acesso ao banco.

Explicando para um leigo:

É onde o sistema decide:

- quem pode acessar o quê;
- como buscar livros;
- como criar sebos;
- como salvar favoritos;
- como registrar auditoria;
- como consultar e alterar dados.

### 31. Como o frontend conversa com o backend?

Resposta simples:

Por meio de chamadas de API.

Explicando para um leigo:

Quando o usuário clica em algo, o frontend envia uma solicitação para o backend. O backend processa e devolve a resposta.

### 32. Quais são os principais módulos funcionais do app?

Resposta simples:

Os módulos principais são catálogo, usuários, sebos, livros, favoritos, interesses, OCR e administração.

Explicando para um leigo:

Cada módulo representa uma parte importante da plataforma:

- catálogo para exibir livros;
- usuários para login e perfil;
- sebos para as lojas;
- livros para o estoque;
- favoritos e interesses para o comprador;
- OCR para ajudar no cadastro;
- administração para gestão da plataforma.

### 33. Quais perfis de usuário existem?

Resposta simples:

Comprador, livreiro e administrador.

Explicando para um leigo:

- comprador navega, busca, favorita e acompanha livros;
- livreiro cria sebo e gerencia catálogo;
- administrador tem visão global da plataforma.

### 34. O que o comprador consegue fazer?

Resposta simples:

Buscar livros, filtrar resultados, ver detalhes, favoritar e demonstrar interesse.

Explicando para um leigo:

Esse perfil representa o usuário que quer encontrar livros e comparar ofertas.

### 35. O que o livreiro consegue fazer?

Resposta simples:

Criar sebo, cadastrar livros, editar estoque e publicar catálogo.

Explicando para um leigo:

Esse perfil representa quem vende livros e precisa gerenciar seus itens dentro da plataforma.

### 36. O que o administrador consegue fazer?

Resposta simples:

Gerenciar usuários, sebos, livros e acompanhar métricas da plataforma.

Explicando para um leigo:

É o perfil com mais controle. Ele ajuda a manter a operação organizada e segura.

### 37. Como os livros entram no sistema?

Resposta simples:

Por cadastro manual, ISBN, scanner e OCR.

Explicando para um leigo:

O objetivo foi facilitar o trabalho do livreiro. Ele pode digitar, escanear o código ou usar recursos de captura para acelerar o cadastro.

### 38. O que é o OCR dentro do app?

Resposta simples:

É a leitura de texto a partir de imagem.

Explicando para um leigo:

Se o usuário fotografa uma capa ou uma informação do livro, o OCR ajuda a extrair texto e acelerar o preenchimento.

### 39. Como a estrutura de dados do app está organizada?

Resposta simples:

Ela está organizada em entidades principais ligadas entre si.

Explicando para um leigo:

As entidades centrais são:

- usuários;
- sebos;
- livros;
- favoritos;
- interesses;
- auditoria;
- avaliações.

Essas partes se relacionam. Por exemplo, um sebo possui livros, um usuário pode favoritar livros e um admin pode registrar ações de gestão.

### 40. O que significa dizer que o app é relacional?

Resposta simples:

Significa que os dados têm ligação entre si.

Explicando para um leigo:

No TEKA, as tabelas não vivem isoladas. Um livro pertence a um sebo, um sebo pertence a um usuário e um favorito depende de usuário e livro ao mesmo tempo.

### 41. Onde entra a auditoria no app?

Resposta simples:

A auditoria registra ações importantes feitas por usuários com mais poder de controle.

Explicando para um leigo:

Ela serve para saber quem alterou algo sensível, quando alterou e o que foi alterado.

### 42. Como eu explico a pasta do projeto se perguntarem?

Resposta simples:

O projeto está separado por responsabilidade.

Explicando para um leigo:

- `client/` contém a interface do usuário;
- `server/` contém a lógica do backend;
- `functions/` concentra handlers de execução e integração;
- `drizzle/` guarda schema e migrações do banco;
- `docs/` reúne a documentação do projeto.

### 43. Como eu explico as páginas do sistema?

Resposta simples:

As páginas representam as telas que atendem cada fluxo do usuário.

Explicando para um leigo:

Exemplos:

- `Home` mostra o catálogo;
- `Login` trata autenticação;
- `CreateSebo` permite criar uma loja;
- `AddBook` cadastra livros;
- `ManageBooks` organiza estoque;
- `Admin` concentra visão gerencial;
- `BatchScan` ajuda no cadastro em lote.

### 44. Como eu explico as rotas do backend?

Resposta simples:

As rotas do backend são os pontos de entrada da lógica da aplicação.

Explicando para um leigo:

Existem rotas para:

- usuários;
- livros;
- sebos;
- favoritos;
- wishlist;
- autenticação;
- saúde da aplicação;
- OCR.

### 45. Se perguntarem “onde está a inteligência do sistema?”, o que responder?

Resposta simples:

Ela está principalmente no backend e nas regras de negócio.

Explicando para um leigo:

O frontend mostra a interface, mas a decisão sobre permissões, validações, cadastros, filtros e persistência acontece no backend.

## 6. Perguntas sobre Segurança

### 46. Como a solução protege os dados?

Resposta simples:

Com HTTPS, controle de acesso, rede privada, segredos protegidos e monitoramento.

Explicando para um leigo:

A proteção é feita em camadas. Uma camada cuida do tráfego, outra da rede, outra das permissões e outra do monitoramento.

### 47. Como a solução reduz ataques?

Resposta simples:

Com AWS WAF, regras de rate limit, isolamento de rede e controle de permissões.

Explicando para um leigo:

A ideia é não depender de uma única barreira. Existem vários controles para diminuir o risco.

### 48. Onde ficam as chaves da aplicação?

Resposta simples:

No Secrets Manager.

Explicando para um leigo:

Isso evita deixar informações críticas expostas no código ou em arquivos inseguros.

## 7. Perguntas sobre Escalabilidade e Custos

### 49. Como essa arquitetura cresce se muitos usuários acessarem ao mesmo tempo?

Resposta simples:

CloudFront, API Gateway, Lambda e Aurora Serverless conseguem crescer conforme a demanda.

Explicando para um leigo:

Os serviços aumentam a capacidade quando o uso sobe, sem exigir troca manual de servidor na maior parte dos casos.

### 50. Por que essa arquitetura pode ser boa para um MVP?

Resposta simples:

Porque usa serviços gerenciados e reduz esforço operacional.

Explicando para um leigo:

Em um MVP, é importante validar o produto sem gastar energia demais administrando infraestrutura.

### 51. Qual item pode pesar mais no custo?

Resposta simples:

Normalmente o banco, o NAT Gateway e, dependendo do uso, o tráfego do CloudFront.

Explicando para um leigo:

Nem sempre o custo maior está no processamento. Rede e banco muitas vezes pesam mais que o restante.

### 52. Existe uma versão mais barata?

Resposta simples:

Sim. A arquitetura pode ser simplificada usando um banco menor e reduzindo componentes de rede.

Explicando para um leigo:

É possível economizar, mas normalmente isso reduz elasticidade, segurança ou robustez operacional.

## 8. Perguntas sobre Decisões Técnicas

### 53. Por que usar Lambda e não EC2?

Resposta simples:

Porque a proposta busca menos operação e mais elasticidade.

Explicando para um leigo:

Na EC2, a equipe cuida mais diretamente da máquina. Na Lambda, a AWS gerencia essa parte e a aplicação roda sob demanda.

### 54. Por que usar CloudFront se o S3 já armazena o frontend?

Resposta simples:

Porque o S3 armazena, mas o CloudFront distribui com mais performance e controle.

Explicando para um leigo:

O S3 é o depósito. O CloudFront é a rede de entrega rápida.

### 55. Por que usar API Gateway junto com Lambda?

Resposta simples:

Porque o API Gateway organiza e publica a API, enquanto a Lambda executa a lógica.

Explicando para um leigo:

Um recebe a chamada, o outro faz o trabalho.

### 56. Por que usar um banco relacional?

Resposta simples:

Porque os dados da aplicação têm relacionamento entre si.

Explicando para um leigo:

Um usuário pode ter favoritos, um sebo pode ter vários livros e um livro pode gerar interesse. Esse tipo de ligação combina bem com banco relacional.

## 9. Perguntas Finais de Apresentação

### 57. Qual é o principal benefício dessa arquitetura?

Resposta simples:

Ela combina escalabilidade, segurança, organização e menor esforço operacional.

Explicando para um leigo:

É uma arquitetura pensada para permitir crescimento sem obrigar a equipe a administrar muitos servidores manualmente.

### 58. Qual é o principal risco ou ponto de atenção?

Resposta simples:

Custo de componentes de rede e banco, além da necessidade de boa configuração de segurança.

Explicando para um leigo:

Mesmo em nuvem, a arquitetura precisa ser bem planejada. Se a rede ou as permissões forem mal configuradas, o custo ou o risco aumentam.

### 59. Se a banca pedir um resumo em uma frase, o que responder?

Resposta simples:

A TEKA foi desenhada na AWS com frontend distribuído globalmente, backend serverless, banco relacional gerenciado e camadas de segurança e monitoramento.

Explicando para um leigo:

É uma solução moderna na nuvem, com foco em performance, organização dos dados e redução de trabalho operacional.
