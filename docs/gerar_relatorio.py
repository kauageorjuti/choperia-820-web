from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
root=Path(__file__).parent
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyPT',fontName='Helvetica',fontSize=11,leading=17,spaceAfter=12,alignment=TA_JUSTIFY))
styles.add(ParagraphStyle(name='CenterPT',fontName='Helvetica',fontSize=12,leading=20,alignment=TA_CENTER,spaceAfter=12))
styles.add(ParagraphStyle(name='SmallPT',fontName='Helvetica',fontSize=9,leading=13,spaceAfter=8))
story=[]
def p(text,style='BodyPT'): story.append(Paragraph(text,styles[style]))
def title(text): p(text,'Heading1');story.append(Spacer(1,10))
p('UNIVERSIDADE DE RIBEIRÃO PRETO','CenterPT');p('ENGENHARIA DA COMPUTAÇÃO','CenterPT');story.append(Spacer(1,3*cm))
p('Relatório Final da Prática Extensionista VII','Title');p('Desenvolvimento de uma Aplicação Web Distribuída','CenterPT');p('Choperia 820 Web','CenterPT');story.append(Spacer(1,2*cm))
for i in range(1,6):p(f'Integrante {i}: [NOME E CÓDIGO - PREENCHER OU REMOVER]','CenterPT')
story.append(Spacer(1,2*cm));p('Ribeirão Preto<br/>2026','CenterPT');story.append(PageBreak())
title('1 Contextualização')
context=[
'A Choperia 820 é o estabelecimento escolhido para o desenvolvimento deste projeto de Prática Extensionista VII. O endereço apresentado no cardápio digital existente é Rua Hum, 820. O estabelecimento dispõe de um cardápio organizado em categorias, entre elas couvert simples, couvert especial, petiscos, saladas, Lanche 820, combinados frios, porções quentes, adicionais e pratos. Os produtos possuem nomes, descrições, valores e imagens; alguns pratos oferecem porções com preços distintos. Essa organização é a base para a apresentação das opções aos clientes na aplicação web.',
'Antes deste projeto, já existiam um aplicativo desenvolvido em Flutter e um painel administrativo local em Next.js. Ambos utilizavam serviços do Firebase para manter as informações do estabelecimento. Embora o aplicativo anterior pudesse ser aberto pelo navegador, sua interface seguia a estrutura da experiência móvel. A proposta desta etapa é disponibilizar uma interface web específica, utilizável em computadores e celulares, preservando a administração já existente e o cadastro centralizado dos produtos. Dessa forma, a equipe não precisa manter dois cardápios independentes nem repetir as alterações de preços e disponibilidade.',
'O projeto permite consultar produtos por categoria, buscar itens, visualizar detalhes e ingredientes, selecionar porções e registrar observações. O cliente monta um carrinho, revisa quantidades e valores, informa nome e número da mesa e envia o pedido ao servidor. O servidor confere os produtos e recalcula os preços a partir do banco antes de registrar a solicitação. Após o envio, a aplicação apresenta o número do pedido e permite acompanhar seu andamento. O pagamento é realizado no estabelecimento.',
'Na administração, os responsáveis autenticados podem gerenciar o cardápio e acompanhar os pedidos. O fluxo de preparo é registrado com os estados recebido, em preparo, pronto e entregue, além da possibilidade de cancelamento. Cada alteração realizada pela API registra horário e identificação do administrador. A integração utiliza comunicação HTTP REST entre o frontend e o backend em TypeScript, com persistência no Firestore, cuja utilização foi aprovada pelo professor. A documentação Swagger descreve as operações e os testes usam emuladores para verificar o fluxo sem interferir nos pedidos reais. A validação final com o proprietário será registrada no questionário desta documentação.'
]
assert sum(len(t) for t in context)>=1000
for text in context:p(text)
story.append(PageBreak());title('2 Termo de Consentimento')
p('TERMO DE CONSENTIMENTO PARA DESENVOLVIMENTO DO CARDÁPIO DIGITAL','Heading2')
p('Proprietário do estabelecimento: [NOME COMPLETO], Choperia 820.<br/>Alunos desenvolvedores: [NOMES DOS INTEGRANTES].')
p('O proprietário do estabelecimento concorda com a especificação e desenvolvimento de uma aplicação web com objetivo de disponibilizar um Cardápio Digital, que será conduzida pelos alunos do curso de Engenharia da Computação da Universidade de Ribeirão Preto.')
p('A aplicação web faz parte de um projeto acadêmico do curso, assim, a propriedade intelectual permanecerá com os alunos envolvidos. Caso o proprietário tenha interesse em implantar a aplicação no estabelecimento, a negociação deverá ser realizada diretamente com os alunos desenvolvedores.')
p('Ambas as partes concordam em manter a confidencialidade de todas as informações comerciais e técnicas do estabelecimento que possam ser acessadas durante a realização do projeto.')
story.append(Spacer(1,1.4*cm));p('________________________________________<br/>Assinatura do proprietário','CenterPT');story.append(Spacer(1,1*cm));p('________________________________________<br/>Assinaturas dos desenvolvedores','CenterPT');story.append(Spacer(1,1*cm));p('Ribeirão Preto, ______ de __________________ de 2026.','CenterPT')
p('Imprimir, coletar as assinaturas e substituir esta página pela versão digitalizada antes da entrega.','SmallPT')
story.append(PageBreak());title('3 Artefatos')
p('<b>Endereço do repositório GitHub</b><br/>https://github.com/kauageorjuti/choperia-820-web')
p('<b>Endereço do vídeo de demonstração</b><br/>DEMONSTRACAO_CHOPERIA_820.mp4 — 3 minutos e 2 segundos, capturas reais com legendas, sem áudio.')
p('<b>Imagem do cardápio físico</b><br/>[INSERIR FOTO REAL DO CARDÁPIO DO ESTABELECIMENTO, CONFIRMADA PELO PROPRIETÁRIO]')
table=Table([[Paragraph('Foto do cardápio físico',styles['CenterPT'])]],colWidths=[16*cm],rowHeights=[8*cm]);table.setStyle(TableStyle([('BOX',(0,0),(-1,-1),1,colors.HexColor('#d9d9d9')),('VALIGN',(0,0),(-1,-1),'MIDDLE')]));story.append(table)
story.append(Spacer(1,15));p('A foto deve documentar o cardápio utilizado pelo estabelecimento e o processo de sua digitalização.','SmallPT')
story.append(PageBreak());title('4 Avaliação da Aplicação')
p('Disponibilizar este questionário ao proprietário após apresentar a versão final. Marcar uma opção por pergunta. As respostas devem refletir a avaliação real do estabelecimento.')
questions=['O design da aplicação é visualmente atraente e bem organizado.','As informações sobre os itens do cardápio são exibidas de forma clara e acessível.','A aplicação melhora a experiência dos clientes em relação à visualização do cardápio.','O processo de realizar um pedido pela aplicação é simples e descomplicado.','A visualização de detalhes dos pratos, como ingredientes e preços, é satisfatória.','Qual o meu nível de satisfação em relação à aplicação web.','A aplicação atendeu às minhas expectativas em termos de funcionalidades.','Recomendo o uso desta aplicação para outros estabelecimentos.']
rows=[[Paragraph('Pergunta',styles['SmallPT'])]+[Paragraph(t,styles['SmallPT']) for t in ['Muito insatisfeito','Insatisfeito','Satisfeito','Muito satisfeito']]]
rows += [[Paragraph(q,styles['SmallPT'])]+['[  ]']*4 for q in questions]
table=Table(rows,colWidths=[8*cm,2*cm,2*cm,2*cm,2*cm],repeatRows=1)
table.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.5,colors.HexColor('#d9d9d9')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eeeeee')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(1,1),(-1,-1),'CENTER'),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]));story.append(table)
story.append(Spacer(1,1*cm));p('Ciente e de acordo,','CenterPT');p('________________________________________<br/>[PROPRIETÁRIO DO ESTABELECIMENTO]','CenterPT')
SimpleDocTemplate(str(root/'RELATORIO_CHOPERIA_820.pdf'),pagesize=A4,rightMargin=2.2*cm,leftMargin=2.2*cm,topMargin=2*cm,bottomMargin=2*cm,title='Relatório da Prática Extensionista VII Choperia 820').build(story)
print('Relatório PDF gerado. Contextualização:',sum(len(t) for t in context),'caracteres.')

