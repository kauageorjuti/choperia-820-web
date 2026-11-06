# Auditoria de requisitos — Choperia 820 Web

**Revisão:** 6 de novembro de 2026. **Versão funcional analisada:** `bdc3a6b`. As árvores `src` da cópia de execução e do repositório público estavam equivalentes no início da revisão. Esta é uma conferência técnica do enunciado, não uma nota acadêmica.

| Requisito | Situação | Evidência e limite |
| --- | --- | --- |
| RF001 — Visualizar cardápio | Atende | Catálogo dinâmico via `GET /api/menu`; organização por categorias e filtro no cliente sem recarga. A leitura de produção retornou 62 produtos ativos e 10 categorias. |
| RF002 — Detalhes | Atende | Modal com descrição, ingredientes, preço, foto ampliada, opções de porção e inclusão no carrinho. Os 62 produtos ativos consultados tinham descrição, ingredientes e referência de imagem. Isso não equivale a testar cada URL de imagem em produção. |
| RF003 — Adicionar itens | Atende | Carrinho persistido no navegador, contador, ajuste de quantidade e preservação ao navegar entre categorias. |
| RF004 — Revisar e enviar | Atende | Revisão, quantidades, preço unitário, subtotal e total; identificação e endereço quando necessário; POST e número de confirmação. A modalidade do projeto é entrega ou retirada. |
| RF005 — Login administrativo | Atende no ambiente de teste | Login com e-mail e senha via Firebase Auth, token com claim administrativa e proteção de rotas. Para demonstração em hospedagem, confirme uma conta de e-mail/senha autorizada no ambiente publicado. |
| RF006 — Gerenciar itens | Atende ao CRUD; upload a validar | Cadastro, edição, exclusão, validação e atualização automática. O painel implementa upload no Storage, mas os testes de integração não incluem esse serviço. |
| RF007 — Listar pedidos | Parcial | Painel atualizado via Firestore, notificações, detalhes e histórico. O histórico filtra “Em andamento”, “Concluídos” e “Cancelados”; as colunas separam etapas no painel, mas falta filtrar “Em preparo” e “Pronto” individualmente na lista. |
| RF008 — Atualizar status | Parcial | Persistência e auditoria com data/hora e UID. Retirada tem “Pronto”; delivery passa de “Em preparo” direto para “Saiu para entrega”. Para aderência literal, inclua “Pronto” como etapa própria no delivery. O cliente consulta automaticamente a API a cada 5 segundos, enquanto o painel recebe eventos do Firestore. |
| RF009 — Swagger | Atende às rotas principais | Swagger UI em `/api/docs` e especificação em `/api/openapi`. Rotas auxiliares como `/api/staff`, `/api/logs` e `/api/setup-cors` não estão descritas; não classificar a cobertura como integral. |

A solução usa React/TypeScript, API REST Next.js/Node.js e Cloud Firestore. O enunciado admite banco NoSQL, cita MongoDB e também lista bancos relacionais na seção de arquitetura. O registro anterior do projeto informa que o Firestore foi aceito; mantenha essa confirmação com os materiais de entrega se for solicitada.

## Validação desta revisão

- Compilação de produção e TypeScript concluídos com sucesso.
- 10 verificações de domínio e 48 de integração passaram. A integração usou o projeto de demonstração `demo-choperia820`, com o servidor na porta alternativa 3102 para evitar conflito local; nenhum pedido real foi alterado.
- A conferência de catálogo real foi somente leitura. Os testes não substituem a avaliação do proprietário, nem validam o Storage ou o envio real de códigos por WhatsApp.

## Hospedagem

**Atualização posterior:** o [cardápio Next.js](https://choperia-820-web--choperia-820-app-4f675.us-east4.hosted.app/) e o [painel administrativo por PIN](https://choperia-820-web--choperia-820-app-4f675.us-east4.hosted.app/admin) foram publicados no Firebase App Hosting do mesmo projeto. O aplicativo Flutter continua no Firebase Hosting. As observações abaixo registram o estado encontrado antes da publicação.

- [Repositório público](https://github.com/kauageorjuti/choperia-820-web): confirmado. Sem homepage cadastrada, sem registros públicos de deployment e sem GitHub Pages identificado.
- [Endereço Firebase conhecido](https://choperia-820-app-4f675.web.app/): responde com o aplicativo Flutter. Nesse domínio, `/admin` devolveu o mesmo conteúdo da página inicial, e `/api/openapi` retornou HTML. Esses resultados não correspondem ao painel ou à API do Next.js.
- Não foi localizado um deploy público da versão Next.js. O cardápio e o painel estão no mesmo código e podem ser servidos no mesmo domínio, desde que a hospedagem execute o servidor Next.js. Um deploy público não foi realizado nesta revisão.

## Entrega

Vídeo MP4 confirmado com duração de 3 min 02 s. A minuta local segue as quatro seções do modelo, incorpora a contextualização adaptada para a aplicação web e a foto do cardápio físico encontrada no acervo do projeto. Faltam os dados da equipe, a digitalização do termo assinado e a avaliação real assinada pelo proprietário. Não marcar o relatório como final antes da complementação.

**Próxima ação técnica:** separar os filtros do RF007, acrescentar “Pronto” no delivery, demonstrar o upload e, caso seja desejado disponibilizar o sistema ao público, definir a hospedagem e validar as rotas no domínio final.
