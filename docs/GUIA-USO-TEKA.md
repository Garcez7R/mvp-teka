# Guia de Uso - TEKA

Este guia explica, de forma prática, como usar todas as opções principais do app.

Versão de referência deste guia: `0.7.0+233`

Voltar para o documento principal:
- [README](../README.md)

## 1. Visão Geral

O TEKA conecta compradores e livreiros para negociação de livros.

Perfis:
- Comprador: busca, filtros, favoritos e interesse.
- Livreiro: cria sebo, cadastra e gerencia catálogo.
- Admin: gestão total de usuários, sebos e livros.

Rotas principais:
- `/` Início (catálogo)
- `/book/:id` Detalhe do livro
- `/login` Login
- `/sebos` Lista de sebos
- `/sebo/novo` Criar sebo
- `/add-book` Cadastrar livro
- `/batch-scan` Scan em lote
- `/manage-books` Meu Catálogo
- `/my-interests` Meus Interesses/Favoritos
- `/settings` Configurações
- `/admin` Painel Admin
- `/about` Sobre

## 2. Fluxo do Comprador

### 2.1 Início (`/`)
- Use a barra de busca para procurar por título, autor ou ISBN.
- Use ordenação: Recentes, Menor preço, Maior preço.
- Use filtros: categoria, sebo, condição, status, cidade/UF e faixa de preço.
- Livros sem capa aparecem por último na listagem, para manter a vitrine mais uniforme.
- A Home usa visualização compacta como padrão fixo, priorizando leitura rápida em mobile e web.
- Use o botão `Ver perto de mim: ON/OFF` para priorizar ofertas locais.
- Use o botão `Modo Escuro/Modo Claro` para trocar tema; a escolha fica salva para próximas aberturas.
- Se seus dados de comprador tiverem cidade/UF em `Configurações`, o catálogo pode mostrar:
  - selo `Na sua cidade`
  - selo `No seu estado`

### 2.2 Card e Detalhe do Livro (`/book/:id`)
- No card: veja capa, título, condição, status, preço e sebo.
- Clique no livro para abrir detalhes.
- Na tela de detalhe:
  - confirme preço e status;
  - veja informações do sebo em bloco compacto;
  - use `Ver mais detalhes do sebo` para abrir logística e observações;
  - clique em Contato via WhatsApp para negociar.

### 2.3 Favoritos e Interesses (`/my-interests`)
- Favoritar: clique no coração no card do livro.
- Interesse: registre interesse no detalhe do livro.
- Acompanhe alterações de status (reservado/vendido) quando aplicável.

### 2.4 Sebos (`/sebos`)
- Liste todos os sebos cadastrados.
- Filtre por cidade, UF e CEP.

## 3. Fluxo do Livreiro

## 3.1 Criar Sebo (`/sebo/novo`)
- Preencha nome do sebo e WhatsApp (obrigatórios).
- Preencha campos adicionais (opcionais): descrição, dono, documento, endereço, CEP, logo, logística.
- Marque ciência legal quando solicitado.

## 3.2 Cadastrar Livro (`/add-book`)
Opções disponíveis:
- ISBN manual
- Escanear código de barras
- Fotografar capa e extrair dados (OCR)

Regras úteis:
- Preço usa formatação em moeda.
- Quantidade define unidades em estoque.
- É possível ter o mesmo título/ISBN em itens diferentes, com condição/preço distintos.
- Você pode escolher capa por sugestões (ISBN/título/autor).

## 3.3 Scan em Lote (`/batch-scan`)
- Abra o scanner em modo guiado.
- Após cada leitura válida, use `Próximo scan` para liberar a leitura seguinte.
- Revise os rascunhos: título, autor, condição, preço, quantidade, capa.
- Filtre por status: Todos, Escaneados, Revisados, Prontos.
- Clique em Salvar itens no catálogo para publicar.

## 3.4 Meu Catálogo (`/manage-books`)
- Edite todos os campos do livro: título, autor, ISBN, categoria, descrição, preço, condição, páginas, ano, quantidade, status, visibilidade e capa.
- Ajuste quantidade rapidamente (+/-).
- Altere status: ativo, reservado, vendido.
- Oculte/exiba livro para compradores.
- Use o filtro de capa: `Todos`, `Sem capa`, `Com capa`.
- Itens sem imagem exibem badge `Sem capa` e ação rápida `Adicionar capa`.
- Duplique livro para criar novo item de mesmo título com outra condição/preço.
- Exporte CSV do catálogo.
- Use gráficos (colapsáveis) para visão operacional.

## 4. Configurações (`/settings`)

Para livreiro/admin:
- Atualize dados do sebo.
- Revise disponibilidade da câmera e instruções de uso em mobile.

Para comprador:
- Ajuste dados básicos de conta (quando disponível).

## 5. Painel Admin (`/admin`)

Abas principais:
- Usuários: criar, editar role e excluir.
- Sebos: criar, editar e excluir.
- Livros: editar todos os campos de cadastro (incluindo descrição), além de capa, status, visibilidade e exclusão.
- No Admin, a edição abre em formulário dedicado, com ações explícitas de `Salvar` e `Cancelar`.
- Livros: filtro de capa (`Todos`, `Sem capa`, `Com capa`) e badge `Sem capa`.

Capas no Admin:
- Trocar capa (ISBN)
- Trocar capa (título/autor)
- Selecionar miniatura sugerida
- Remover capa

Métricas:
- Cards de resumo e gráficos (colapsáveis).
- Auditoria de ações recentes: exibe as 5 últimas por padrão, com opção de expandir para histórico completo.

## 6. Boas Práticas de Operação

- Sempre confirme status do livro antes de negociar.
- Mantenha quantidade atualizada para evitar frustração de compra.
- Use visibilidade do livro para ocultar itens não disponíveis sem apagar histórico.
- Para privacidade, negocie encontro em local seguro.
- Use sempre o domínio principal da aplicação para evitar sessões/cache antigos.

## 6.1 Segurança Operacional (Aplicado)

- Endpoints públicos exibem apenas dados essenciais (sem expor dados sensíveis de cadastro).
- Livros ocultos não aparecem para público.
- Login social usa validação estrita de token.
- Endpoints sensíveis possuem limitação de taxa.
- Auditoria de ações administrativas permanece ativa para rastreabilidade.

## 7. Problemas Comuns

### 7.1 App não atualiza após deploy
- Faça hard reload no navegador.
- Verifique se está abrindo o domínio principal (`mvp-teka.pages.dev`), não URL antiga de deploy específico.

### 7.2 Câmera não abre no celular
- Confirme permissão de câmera no navegador.
- Use HTTPS.
- Teste pelo menu de Configurações.

### 7.3 OCR demorado ou falhando
- Tente código de barras primeiro (mais rápido e preciso).
- Use OCR como fallback para capa/lombada.
- Garanta que `OCR_SPACE_API_KEY` está configurada no ambiente.

### 7.4 Login Google com erro de origem
- Verifique no Google Cloud as origens autorizadas do OAuth.
- Use o domínio correto do app em produção.

## 8. Atalho de Fluxo para Demo

Comprador:
1. Buscar livro na Home.
2. Abrir detalhe.
3. Acionar contato via WhatsApp.

Livreiro:
1. Criar sebo.
2. Cadastrar livro por ISBN.
3. Ajustar status/quantidade em Meu Catálogo.

Admin:
1. Abrir painel.
2. Gerir usuários/sebos/livros.
3. Validar métricas e auditoria.

## 9. Checklist de Teste com Usuários

1. Comprador consegue encontrar um livro em até 3 ações (buscar, abrir detalhe, contatar sebo).
2. Livreiro consegue cadastrar via ISBN e via scan em lote sem erro.
3. Livreiro consegue alterar quantidade/status e ocultar item no catálogo.
4. Admin consegue editar/excluir entidades e trocar capa de livro.
5. Em mobile, câmera abre e o scanner funciona em modo guiado com `Próximo scan`.

---

Voltar para o documento principal:
- [README](../README.md)
