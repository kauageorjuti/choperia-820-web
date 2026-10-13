# Choperia 820 Web

Cardápio web integrado ao painel administrativo existente. Frontend React/TypeScript, API REST em Next.js/Node.js e persistência no Firebase Firestore. Firestore foi aprovado para a Prática Extensionista VII pelo professor, conforme informado pelo aluno.

## Executar

Requisitos: Node.js 22 ou superior; Java 21 ou superior apenas para os emuladores.

```powershell
npm ci
Copy-Item .env.example .env.local
# Preencher .env.local com as configurações do projeto e a credencial Admin SDK.
npm run dev
```

- Cardápio: `http://localhost:3000/`
- Acesso ao painel: `http://localhost:3000/admin`
- Login por e-mail/senha: `http://localhost:3000/admin/login`
- Administração: `/admin/dashboard`
- Histórico completo: `/admin/dashboard/historico`
- Swagger: `/api/docs`
- OpenAPI: `/api/openapi`

Os arquivos `.env.local` e as chaves privadas não podem ser publicados. `NEXT_PUBLIC_*` contém apenas a configuração pública do cliente Firebase. `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` ficam exclusivamente no servidor.

## Fluxo

O cliente consulta `/api/menu`, escolhe produtos, porções e observações e envia nome, telefone, modalidade, endereço de entrega, pagamento e itens a `/api/menu/orders`. O backend confere disponibilidade e preço em transação e grava em `orders`, coleção já consumida pelo painel. A sessão HttpOnly limita a consulta do cliente aos próprios pedidos. O requestId evita pedidos duplicados nas tentativas repetidas.

O painel escuta o Firestore para atualizar a lista em tempo real. CRUD do cardápio e alterações de status usam endpoints `/api/admin`, com Firebase ID token e claim `admin: true`. O histórico registra horário e UID. O cliente acompanha o estado por consultas REST a cada 5 segundos; o cardápio é atualizado a cada 30 segundos.

O fluxo web público atende delivery e retirada, com pagamento no recebimento. O aplicativo Flutter e as funções preexistentes do painel continuam contemplando entrega/retirada.

## Autenticação

O acesso por perfil/PIN usa os funcionários existentes e custom tokens Firebase. O login por e-mail/senha exige habilitar o provedor no Firebase Auth e uma conta administrativa com claim `admin: true`. Os testes criam essa conta somente no Auth Emulator. Não conceda acesso administrativo a contas de clientes.

## Testar sem afetar produção

Abra três terminais no diretório do projeto:

```powershell
# Terminal 1
npm run emulators

# Terminal 2
powershell -NoProfile -ExecutionPolicy Bypass -File tests/start-web.ps1

# Terminal 3
npm run test:domain
npm run test:integration
```

O teste usa exclusivamente `demo-choperia820`, Auth em `127.0.0.1:9095`, Firestore em `127.0.0.1:8085` e web em `127.0.0.1:3002`. A configuração `firebase.test.json` carrega as regras locais. A conta fictícia do emulador é `admin@teste.local`, senha `Teste-local-820!`, perfil `test-admin`, PIN `123456`. Esses dados servem apenas para o emulador e não representam acesso ao projeto real.

Os testes incluem CRUD, pedidos, cálculo do preço pelo servidor, porções, idempotência concorrente, autorização, isolamento das sessões, disponibilidade da loja, auditoria, status, login e Swagger. Resultado em `docs/VALIDACAO.md`.

```powershell
npx tsc --noEmit
npm run build
npm start
```

## Materiais acadêmicos

`docs/REQUISITOS.md` mapeia RF001–RF009 e explicita as pendências. `docs/RELATORIO_CHOPERIA_820.pdf` contém a contextualização, termo, artefatos e questionário. A fonte editável está em `docs/gerar_relatorio.py`; pode ser regenerada com Python e reportlab. `docs/ENTREGA.txt` contém os campos dos integrantes e links, e `docs/ROTEIRO_VIDEO.md` organiza uma apresentação inferior a cinco minutos.

Preencher nomes/códigos, obter assinatura e avaliação reais do proprietário, anexar foto do cardápio físico e definir os links públicos antes de entregar. Repositório público: https://github.com/kauageorjuti/choperia-820-web. O vídeo docs/DEMONSTRACAO_CHOPERIA_820.mp4 tem 3:02, sem áudio, com capturas reais e legendas. O deploy público ainda depende da escolha de hospedagem.

## Publicação

O backend precisa de hospedagem com runtime Node.js. Firebase Hosting estático sozinho não executa as rotas da API Next.js. Escolha uma hospedagem compatível e configure as variáveis do servidor; revise as regras Firebase publicadas e mantenha contas/chaves fora do repositório público. Preserve as mesmas coleções se desejar que o aplicativo e o painel continuem integrados.


## Recuperação de cadastro pelo WhatsApp

Ao digitar o telefone com DDD, o checkout busca o cadastro. No mesmo navegador, recupera somente o perfil ligado à sessão. Em outro aparelho, exige código antes de retornar nome/endereço. Perfis do aplicativo são recuperados pelas coleções users e orders após confirmação; novos perfis web usam web_customers e web_customer_sessions, acessíveis somente pelo servidor.

O envio real exige WhatsApp Business Cloud API, um número registrado e um template AUTHENTICATION com botão COPY_CODE aprovado. Configure no servidor WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_AUTH_TEMPLATE, WHATSAPP_GRAPH_VERSION (versão habilitada na conta) e WHATSAPP_TEMPLATE_LANGUAGE. Não publique esses valores. Referência oficial da Meta: https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api.

Sem essa configuração, o cliente pode preencher nome/endereço e enviar o pedido normalmente; não recebe mensagem falsa de código enviado. O código expira em 10 minutos, tem limite de cinco tentativas, uso único e pertence à sessão que o solicitou. Há limite de três envios por telefone/hora. Configure TTL nas coleções web_verifications e web_limits pelo campo expiresAt para eliminar registros expirados.

Somente no projeto demo-choperia820 com emuladores explicitamente habilitados, o envio é simulado e o código é 654321. Nenhum WhatsApp real é enviado nos testes.
