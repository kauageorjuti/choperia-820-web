# Prática Extensionista VII — Choperia 820

## Implementação

| Requisito | Implementação | Verificação |
|---|---|---|
| RF001 | `/`: produtos ativos da API REST, categorias sem recarga, busca e layout responsivo | Integração da API e navegação no navegador |
| RF002 | Modal com foto, descrição, ingredientes, porções e observações | Navegador e cálculo de porções |
| RF003 | Carrinho persistido localmente, quantidades e contador | Navegador e testes de cálculo |
| RF004 | Revisão, nome, telefone, entrega/retirada, endereço, pagamento, POST validado, confirmação numerada e proteção contra duplicação | Emulador: envio, preço recalculado, concorrência e sessão |
| RF005 | `/admin`: perfil/PIN; `/admin/login`: e-mail/senha; Firebase Auth e autorização por claim admin | PIN correto/incorreto, tokens de teste e bloqueio da API |
| RF006 | CRUD REST autenticado; upload existente no Storage; ingredientes editáveis | Cadastro, edição, exclusão e rejeição de dados inválidos no emulador |
| RF007 | Painel Kanban em tempo real; `/admin/dashboard/historico` inclui concluídos/cancelados e filtros | Listener existente do painel e testes da listagem REST |
| RF008 | Status validado no servidor, histórico com horário e UID; cliente consulta a cada 5 s | Fluxo completo e auditoria no emulador |
| RF009 | `/api/docs`: Swagger UI local; `/api/openapi`: especificação dos endpoints públicos/admin | Disponibilidade e especificação nos testes |

O cliente atualiza o cardápio a cada 30 segundos. O painel mantém listeners Firestore em tempo real. O acompanhamento do cliente consulta a API a cada 5 segundos; portanto, existe essa latência máxima nominal, além da rede.

## Arquitetura

Cliente web React/TypeScript → API HTTP REST Next.js/Node.js → Firestore. Administração usa Firebase Auth para autenticação, endpoints protegidos para CRUD/status e listeners Firestore para atualizações. Imagens são servidas localmente ou pelo Firebase Storage. Firestore foi aprovado pelo professor, conforme confirmação do aluno nesta conversa.

O cardápio web atende delivery e retirada. Pedidos antigos de mesa continuam visíveis no painel. O cliente é identificado por telefone, com recuperação de cadastro na sessão e confirmação WhatsApp em outro aparelho.

## Entrega externa

- Preencher nomes e códigos dos integrantes em `ENTREGA.txt` e no relatório.
- Preencher o proprietário, coletar assinaturas do termo e anexar a digitalização.
- Fotografar o cardápio físico. `assets/images/cardapio.jpg` é material preexistente a confirmar com o proprietário antes de usar como evidência.
- Aplicar o questionário ao proprietário e anexar as respostas reais.
- Criar/publicar repositório GitHub após revisar arquivos. Nunca publicar `.env.local`, chaves privadas, dados de clientes ou logs.
- Informar o link do GitHub e o link/arquivo do vídeo.
- Cada integrante realiza sua própria entrega; confirmar a data com o professor.

As assinaturas e a avaliação do proprietário não foram simuladas. O código foi preparado para o repositório público autorizado: https://github.com/kauageorjuti/choperia-820-web. O deploy público permanece pendente de definição de hospedagem.

## Limites de validação

Testes de escrita foram realizados somente nos emuladores. A leitura dos 62 produtos e das 10 categorias reais foi validada. O login por e-mail exige uma conta existente com claim `admin: true` e o provedor E-mail/Senha habilitado no Firebase Auth. O upload de imagem real não foi executado para evitar gravar arquivos de teste no Storage de produção. Configurações e regras locais devem ser comparadas com as publicadas antes do deploy.

Validação concluída: 10 verificações de domínio, 48 de integração, TypeScript e compilação de produção aprovados. No navegador: cardápio desktop/mobile sem transbordamento, detalhes, carrinho, envio, login e avanço do pedido até entregue, histórico com auditoria e criação/edição de produto fictício no emulador. Vídeo MP4 de 3:02 com capturas reais legendadas, sem áudio, incluído em docs/DEMONSTRACAO_CHOPERIA_820.mp4.


Atualização de interface: histórico em lista compacta com busca por número/cliente/telefone, filtros de data e status, paginação e linha do tempo. Site público sem links administrativos, fonte Arial única, banner sem selo, contatos e horários com links Maps/WhatsApp/Instagram. O envio WhatsApp real depende das credenciais e do template da Meta; fluxo de código validado no emulador.
