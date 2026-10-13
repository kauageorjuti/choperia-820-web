from pathlib import Path
import sys, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent
sys.path.insert(0,str(root.parent/'.tools/video'))
import imageio_ffmpeg
frames=root/'qa-video';frames.mkdir(exist_ok=True)
font=lambda size:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)
bold=lambda size:ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',size)
mono=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',25)
slides=[
('Choperia 820 Web','cardapio-desktop.jpg','Prática Extensionista VII. Interface web em TypeScript, React e Next.js, integrada ao painel e ao Firestore.',12),
('Cardápio em computadores e celulares','cardapio-mobile.jpg','Categorias e busca sem recarregar a página. O cardápio da página inicial consulta os produtos ativos via HTTP REST.',12),
('Detalhes do produto','detalhes.jpg','Foto, descrição, ingredientes, porção e observações. As próximas capturas mostram dados fictícios no Firebase Emulator.',12),
('Revisão do pedido','carrinho.jpg','O carrinho mantém os itens durante a navegação. O cliente confere as quantidades e informa telefone, nome e endereço, escolhendo entrega ou retirada.',12),
('Pedido recebido pelo servidor','pedido-recebido.jpg','O backend confere disponibilidade, recalcula o total e registra o pedido. O cliente recebe o número da solicitação.',12),
('Administração integrada','painel-pedidos.jpg','Login por e-mail e senha validado no emulador. O painel escuta os pedidos em tempo real e identifica o cliente, a modalidade e as observações.',14),
('Acompanhamento do preparo','pedido-preparo.jpg','A equipe avança o status por API autenticada. O cliente consulta automaticamente o estado do pedido a cada cinco segundos.',12),
('Pedido saiu para entrega','pedido-pronto.jpg','O cliente vê a mudança para Saiu para entrega. A operação não pode pular etapas; o servidor valida a transição de status.',10),
('Entrega e histórico','historico.jpg','O histórico inclui pedidos concluídos e cancelados. Cada alteração feita pela API registra status, data/hora e UID do administrador.',14),
('Documentação Swagger','swagger.jpg','Swagger UI permite consultar contratos, parâmetros e respostas das rotas públicas e administrativas.',14),
]
def base(title,caption,index):
 im=Image.new('RGB',(1920,1080),'#f7f8f5');d=ImageDraw.Draw(im)
 d.rectangle((0,0,1920,120),fill='#193e32');d.text((48,32),title,font=bold(42),fill='white')
 for n,line in enumerate(textwrap.wrap(caption,110)):d.text((48,910+n*42),line,font=font(30),fill='#202923')
 d.text((48,1040),'CHOPERIA 820  |  DEMONSTRAÇÃO COM CAPTURAS REAIS E LEGENDAS',font=font(18),fill='#6b756d')
 d.text((1780,1040),str(index),font=font(18),fill='#6b756d')
 return im
files=[]
for i,(title,filename,caption,duration) in enumerate(slides,1):
 im=base(title,caption,i);photo=Image.open(root/'evidencias'/filename).convert('RGB');photo.thumbnail((1824,740))
 im.paste(photo,((1920-photo.width)//2,145+(740-photo.height)//2));out=frames/f'{i:02}.png';im.save(out);files.append((out,duration))
code=(root.parent/'src/lib/menu-domain.ts').read_text(encoding='utf8')
start=code.index('    const product =');end=code.index('    cents +=')
snippet=code[start:end]
im=base('Código que valida e calcula o pedido','O preço vem do banco, e não do navegador. A API valida a porção e a quantidade, calcula o total em centavos e grava em transação.',11)
d=ImageDraw.Draw(im);d.rounded_rectangle((48,150,1872,850),radius=12,fill='#202923');d.text((80,172),'src/lib/menu-domain.ts — priceOrder',font=font(24),fill='#edbf60')
lines=[]
for line in snippet.splitlines():lines.extend(textwrap.wrap(line,110,subsequent_indent='      ',replace_whitespace=False) or [''])
for i,line in enumerate(lines[:17]):d.text((80,230+i*32),line,font=mono,fill='#eff3ec')
out=frames/'11.png';im.save(out);files.append((out,22))
im=base('Validação automatizada e entrega','Testes executados somente em emuladores. A leitura do Firebase real também foi conferida. Assinaturas, avaliação e dados da equipe devem ser reais.',12)
d=ImageDraw.Draw(im)
lines=['Frontend: TypeScript + React + Next.js','Backend: API REST em Node.js','Banco: Firestore aprovado pelo professor','','48 verificações de integração aprovadas','Cálculo, CRUD, autorização e isolamento de sessão','Idempotência, porções, status e histórico','Cadastro, WhatsApp (emulador), login e Swagger','Fluxo de pedido confirmado também pelo navegador','Compilação de produção aprovada']
for i,line in enumerate(lines):d.text((160,190+i*57),line,font=font(32),fill='#193e32')
out=frames/'12.png';im.save(out);files.append((out,18))
concat=frames/'concat.txt';concat.write_text('\n'.join(f"file '{p.as_posix()}'\nduration {duration}" for p,duration in files)+f"\nfile '{files[-1][0].as_posix()}'\n",encoding='utf8')
out=root/'DEMONSTRACAO_CHOPERIA_820.mp4'
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','22','-movflags','+faststart',str(out)],check=True)
print('MP4 gerado:',sum(t for _,t in files)+files[-1][1],'segundos; sem áudio, com capturas reais e legendas.')

