# Validação da resposta do painel — 13/10/2026

O servidor local da porta 3000 passou de next dev para next start, usando .next-build. Medição HTTP das páginas pedidos/cardápio/histórico: antes 1056/37/1882 ms; depois 152/18/23 ms. São tempos de entrega das páginas locais, não um benchmark da rede do Firebase ou de cada salvamento.

Header: o relógio só atualiza o React quando muda o minuto e a consulta dos 100 pedidos do histórico só é assinada quando esse painel é aberto.

Pedidos: ATUALIZANDO… e botão desabilitado aparecem imediatamente; chamadas repetidas ao mesmo pedido são bloqueadas. Após confirmação da API, o cartão recebe o novo status sem esperar outro evento do Firestore. O listener permanece ativo para alterações feitas por outras pessoas.

Validação: TypeScript/compilação aprovados, lint dos novos arquivos aprovado. No navegador do emulador, pedido fictício PERF exibiu o estado de espera e passou de recebido para em preparo após resposta bem-sucedida. Não foram alterados pedidos reais neste teste.

Para iniciar a versão compilada: npm run build:local; npm run start:local. npm run dev continua disponível para desenvolvimento.
