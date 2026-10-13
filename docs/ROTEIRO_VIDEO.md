# Roteiro de demonstração de até 5 minutos

Gravar a versão de teste em `http://127.0.0.1:3002`, com os emuladores ativos. Usar exclusivamente produtos e pedidos de demonstração. O vídeo final deve estar em MP4, mostrando o aplicativo e seu código.

| Tempo | Demonstração | Explicação |
|---|---|---|
| 00:00–00:25 | Página inicial e layout em computador/celular | Contexto da Choperia 820 e objetivo do projeto web |
| 00:25–01:05 | Categorias, busca, foto ampliada e ingredientes | Cardápio obtido via GET `/api/menu` |
| 01:05–01:45 | Porção, observação, quantidades, nome e mesa | Carrinho preservado e revisão do total |
| 01:45–02:15 | Enviar e mostrar número/status | POST `/api/menu/orders`, validação e persistência |
| 02:15–03:00 | Login admin, pedido e avanço até entregue | Listeners, autorização, filtros e histórico de auditoria |
| 03:00–03:35 | Criar, editar e remover um produto de teste | CRUD via API com Firebase Auth |
| 03:35–04:10 | Swagger e código das rotas | Frontend React/TypeScript, backend Node.js, banco Firestore |
| 04:10–04:40 | Testes e resultados | Preços calculados no servidor, idempotência, isolamento de sessão |
| 04:40–04:55 | Encerramento | Resultado e validação pelo estabelecimento, quando realizada |

Arquivos para mostrar: `src/components/Menu.tsx`, `src/app/api/menu/orders/route.ts`, `src/app/api/admin/[resource]/[id]/route.ts` e `tests/integration.mjs`. Explicar o código com suas palavras e substituir informações acadêmicas pendentes antes da entrega.
