# Choperia 820 Web

Cardápio digital da Choperia 820, em Orlândia/SP, desenvolvido para a Prática Extensionista VII de Engenharia da Computação da Universidade de Ribeirão Preto. Clientes consultam o cardápio e fazem pedidos para entrega ou retirada. A equipe gerencia produtos e pedidos pelo painel administrativo.

- **Código-fonte:** [repositório público](https://github.com/kauageorjuti/choperia-820-web)
- **Demonstração:** [vídeo MP4 de 3min02s](docs/DEMONSTRACAO_CHOPERIA_820.mp4), com telas, fluxo de pedidos e código.
- **Hospedagem:** a versão Next.js e o painel rodam juntos na mesma aplicação. A versão pública está em [Cardápio Web](https://choperia-820-web--choperia-820-app-4f675.us-east4.hosted.app/) e [Painel por PIN](https://choperia-820-web--choperia-820-app-4f675.us-east4.hosted.app/admin). O [endereço Firebase existente](https://choperia-820-app-4f675.web.app/) serve o aplicativo Flutter; ele não é o deploy do painel Next.js.

## O que o sistema faz

| Cliente | Administração |
| --- | --- |
| Navega por categorias e busca produtos sem recarregar a página. | Entra com e-mail e senha do Firebase Auth; há também acesso legado por perfil/PIN. |
| Abre os detalhes, escolhe porção, quantidade e observações. | Cadastra, edita e exclui itens e categorias. |
| Mantém o carrinho no navegador e revisa preços e quantidades. | Recebe novos pedidos no painel em tempo real, com notificações. |
| Informa nome, telefone, modalidade, endereço quando necessário e forma de pagamento. | Atualiza o status e consulta o histórico com data, hora e responsável. |
| Recebe o número do pedido e acompanha o andamento. | Consulta detalhes do pedido, totais e identificação do cliente. |

O pagamento é combinado para o recebimento ou a retirada. Não há cobrança online pelo site.

## Arquitetura

~~~text
Navegador (React + TypeScript)
  ├─ Cardápio, checkout e acompanhamento → API HTTP/REST (Next.js + Node.js)
  └─ Painel → Firebase Auth + API administrativa + listeners Firestore
                                            ↓
                       Cloud Firestore: catálogo, pedidos, auditoria
                       Firebase Storage: imagens enviadas pelo painel
~~~

As rotas REST ficam em `src/app/api`; `src/components` contém os fluxos da interface; `src/lib` concentra as regras de preço, sessão, autenticação e persistência. A API recalcula os preços e a taxa, rejeita itens indisponíveis e usa um identificador de solicitação para evitar duplicação. O acompanhamento é vinculado a uma sessão HttpOnly. As operações administrativas exigem ID token com `admin: true`.

O painel usa listeners para refletir alterações em tempo real. O cliente consulta o status em intervalos de 5 segundos e atualiza o catálogo a cada 30 segundos enquanto a aba está visível. O fluxo de retirada passa por Recebido → Em preparo → Pronto → Entregue; o delivery atual passa por Recebido → Em preparo → Saiu para entrega → Entregue.

## Executar localmente

Requisitos: **Node.js 22 ou superior**, npm e um projeto Firebase para uso com dados reais. **Java 21 ou superior** é necessário apenas para os emuladores.

~~~powershell
git clone https://github.com/kauageorjuti/choperia-820-web.git
cd choperia-820-web
npm ci
Copy-Item .env.example .env.local
# Configure o Firebase em .env.local antes de executar.
npm run dev
~~~

Para usar o painel local sem compilar páginas ao clicar, encerre o servidor de desenvolvimento e execute:

~~~powershell
npm run build:local
npm run start:local
~~~

A versão compilada usa `.next-build` e atende em `127.0.0.1:3000`. Recompile após mudanças no código ou na configuração pública.

| Rota local | Finalidade |
| --- | --- |
| [`/`](http://127.0.0.1:3000/) | Cardápio e checkout |
| [`/admin`](http://127.0.0.1:3000/admin) | Entrada por perfil/PIN |
| [`/admin/login`](http://127.0.0.1:3000/admin/login) | Entrada por e-mail e senha |
| [`/admin/dashboard/pedidos`](http://127.0.0.1:3000/admin/dashboard/pedidos) | Pedidos em andamento |
| [`/admin/dashboard/cardapio`](http://127.0.0.1:3000/admin/dashboard/cardapio) | Gestão de produtos |
| [`/admin/dashboard/historico`](http://127.0.0.1:3000/admin/dashboard/historico) | Histórico e filtros |
| [`/api/docs`](http://127.0.0.1:3000/api/docs) | Swagger UI |
| [`/api/openapi`](http://127.0.0.1:3000/api/openapi) | Especificação OpenAPI em JSON |

### Configuração Firebase

| Variáveis de `.env.example` | Origem |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Configuração pública do app Web no Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Mesma configuração do app Web |
| `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` | Conta de serviço Firebase Admin SDK; manter somente no servidor |
| `WHATSAPP_*` | Integração opcional de recuperação de cadastro; manter o token no servidor |

Use o mesmo projeto Firebase no cliente e no servidor. Habilite e-mail/senha no Firebase Auth e configure a claim `admin: true` para as contas administrativas autorizadas. O catálogo utiliza as coleções `products` e `categories`; a disponibilidade e a taxa vêm de `store_settings/main`. O painel lê `orders` e, conforme o módulo, coleções como `staff` e `couriers`. A integração com o aplicativo legado depende de preservar os dados e as regras compatíveis. Não publique `.env.local`, chaves, PINs reais nem dados de clientes.

## API REST

| Método e rota | Comportamento |
| --- | --- |
| `GET /api/menu` | Obtém catálogo, disponibilidade e taxa; inicia sessão do cliente. |
| `POST /api/menu/orders` | Valida e registra pedido; retorna seu número. |
| `GET /api/menu/orders/{id}` | Consulta o estado de um pedido da própria sessão. |
| `POST /api/menu/customer` e `/code`, `/verify` | Consulta e recuperação de cadastro conforme a sessão e o código de verificação. |
| `GET/POST /api/admin/{resource}` | Lista recursos e permite criar produtos e categorias. |
| `PATCH/DELETE /api/admin/{resource}/{id}` | Edita ou exclui itens e categorias; pedidos têm atualização de status por PATCH. |

Para experimentar o envio pelo Swagger, abra primeiro `GET /api/menu` no mesmo host para obter a sessão e use apenas o ambiente de testes. Para chamadas administrativas, use o Firebase ID token de uma conta autorizada.

## Testar sem credenciais de produção

Após `npm ci`, use três terminais no diretório do projeto:

~~~powershell
# Terminal 1: aguarde a mensagem de emuladores prontos
npm run emulators

# Terminal 2: aplicação de teste, em 127.0.0.1:3002
powershell -NoProfile -ExecutionPolicy Bypass -File tests/start-web.ps1

# Terminal 3: testes e preparação dos dados fictícios
npm run test:domain
npm run test:integration
~~~

O script usa o projeto `demo-choperia820`, Auth na porta `9095` e Firestore na `8085`. A integração cria a conta fictícia `admin@teste.local` / `Teste-local-820!` e um perfil de teste por PIN. Essas credenciais são exclusivas do emulador. Para validação adicional da compilação, com a configuração local preenchida, use `npm run build:local`.

O cenário automatizado cobre catálogo, CRUD, cálculos, autorização, isolamento de sessão, pedidos de entrega e retirada, mudanças de status e auditoria. Consulte [validação registrada](docs/VALIDACAO.md) e [desempenho do painel](docs/PERFORMANCE.md). O ambiente de testes não inclui Storage; o upload de imagem deve ser validado separadamente. O WhatsApp é simulado apenas nos emuladores; sem configuração real, o checkout aceita o preenchimento manual normalmente.

## Publicar cardápio e painel juntos

1. Hospede este repositório como aplicação **Next.js com servidor Node.js**. Uma hospedagem que serve só arquivos estáticos não executa as rotas `/api/*`.
2. Configure as variáveis do Firebase no ambiente de hospedagem, no build e no runtime conforme aplicável. Não configure as flags dos emuladores no ambiente real.
3. Revise as regras de Firestore e Storage e o acesso administrativo no projeto usado. Se usar a configuração de CORS do painel, ajuste `STORAGE_CORS_ORIGINS` ao domínio de publicação. Teste com dados descartáveis antes de conectar o ambiente público a pedidos reais.
4. Confirme no mesmo domínio o cardápio `/`, o login `/admin/login`, o painel `/admin/dashboard` e o Swagger `/api/docs`. Atualize a URL de demonstração quando o deploy estiver pronto.

Para atualizar somente o backend público, a partir de um clone limpo, use `firebase deploy --only apphosting:choperia-820-web --project choperia-820-app-4f675`. A configuração do App Hosting está em `apphosting.yaml`. O site Flutter continua no Firebase Hosting. Se o domínio público mudar, atualize `CHOPERIA_PUBLIC_ORIGIN` para que o checkout valide o endereço correto. O login por PIN publicado limita tentativas por perfil.

A recuperação de cadastro em outro aparelho exige a API do WhatsApp Business, número registrado e template de autenticação aprovado. O token e demais variáveis estão listados em `.env.example`. Consulte o [manual](docs/MANUAL.md) para a configuração complementar.

## Entrega acadêmica e pontos de revisão

- [Auditoria de requisitos e hospedagem](docs/AUDITORIA.md), [matriz de requisitos](docs/REQUISITOS.md), [modelo de relatório](docs/RELATORIO_CHOPERIA_820.pdf), [roteiro de vídeo](docs/ROTEIRO_VIDEO.md) e [identificação da equipe](docs/ENTREGA.txt).
- Preencha nomes e códigos, anexe o termo assinado, inclua a foto física e registre a avaliação real do proprietário.
- Para aderência literal ao enunciado, a etapa “Pronto” deve ser considerada também no delivery e a lista deve permitir filtrar separadamente “Em preparo” e “Pronto”. Os 62 produtos ativos consultados tinham descrição, ingredientes e referência de imagem; o upload de uma nova imagem ainda deve ser demonstrado.
- O projeto usa Cloud Firestore (NoSQL). O enunciado menciona MongoDB entre as opções NoSQL; mantenha registrada a aceitação do Firestore para esta entrega.
