# Converte as capturas brutas (_fonte/bruto/<raça>/) em mídia leve para a página (versão 2 do pagina.md):
# prints em WebP (img/<raça>/), o celular do hero em três larguras e as gravações em MP4 mudo (video/<raça>/), com capa.
# Diário e ficha chegam em dois recortes cada e saem empilhados num só. Precisa do ffmpeg no PATH.
#   python _fonte/otimizar.py [--so=hero,diario,ficha,...]   (mesmas partes do midia.mjs; sem --so, tudo)
import json, os, subprocess, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)
BRUTO = os.path.join(AQUI, 'bruto')
SO = next((a[5:].split(',') for a in sys.argv if a.startswith('--so=')), [])
quer = lambda parte: not SO or parte in SO
SIMPLES = {'casos': 'casos', 'comandos': 'comandos', 'nota': 'nota-raca', 'kit': 'kit'}
EMPILHADOS = {'diario': 'diario', 'ficha': 'ficha'}
total = 0

def salvar(im, dst, largura, q=80):
    global total
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA') else 'RGB')
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=q, method=6)
    total += os.path.getsize(dst)
    return im.size

def empilhar(a, b, vao=24):
    """dois recortes da mesma tela, um embaixo do outro, com um vão da cor de fundo do primeiro"""
    a, b = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    fundo = a.getpixel((a.width // 2, a.height - 2))
    c = Image.new('RGB', (max(a.width, b.width), a.height + vao + b.height), fundo)
    c.paste(a, (0, 0)); c.paste(b, (0, a.height + vao))
    return c

def video(src, dst, ini, dur, poster):
    global total
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{ini:.2f}', '-i', src, '-t', f'{dur:.2f}', '-an',
                    '-vf', 'scale=540:-2,fps=24', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
                    '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', dst], check=True)
    png = dst[:-4] + '-poster.png'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', dst, '-frames:v', '1', png], check=True)
    salvar(Image.open(png), poster, 540, 78); os.remove(png)
    total += os.path.getsize(dst)

medidas = json.load(open(os.path.join(AQUI, 'medidas.json'))) if os.path.exists(os.path.join(AQUI, 'medidas.json')) else {}
for raca in sorted(os.listdir(BRUTO)):
    b = os.path.join(BRUTO, raca)
    oi = os.path.join(SITE, 'img', raca); ov = os.path.join(SITE, 'video', raca)
    os.makedirs(oi, exist_ok=True); os.makedirs(ov, exist_ok=True)
    m = medidas.setdefault(raca, {})
    for parte, n in SIMPLES.items():
        if quer(parte): m[n] = list(salvar(Image.open(os.path.join(b, n + '.png')), os.path.join(oi, n + '.webp'), 756))
    for parte, n in EMPILHADOS.items():
        if quer(parte): m[n] = list(salvar(empilhar(os.path.join(b, n + '-1.png'), os.path.join(b, n + '-2.png')), os.path.join(oi, n + '.webp'), 756))
    if quer('hero'):
        # celular do hero em três larguras (srcset), para cada densidade de tela baixar só o que usa (LCP)
        for px in (720, 880):
            salvar(Image.open(os.path.join(b, 'hero-celular.png')), os.path.join(oi, f'hero-celular-{px}.webp'), px, 76)
        m['hero-celular'] = list(salvar(Image.open(os.path.join(b, 'hero-celular.png')), os.path.join(oi, 'hero-celular-1080.webp'), 1080, 76))
    if quer('videos'):
        t = json.load(open(os.path.join(b, 'tempos.json')))
        video(os.path.join(b, 'video-dia.webm'), os.path.join(ov, 'dia.mp4'), t['dia'] + 0.2, t['diaFim'] - t['dia'] - 0.3, os.path.join(oi, 'video-dia-capa.webp'))
        video(os.path.join(b, 'video-agora.webm'), os.path.join(ov, 'agora.mp4'), t['agora'] + 0.1, t['agoraFim'] - t['agora'] - 0.2, os.path.join(oi, 'video-agora-capa.webp'))
        m['video-dia-capa'] = list(Image.open(os.path.join(oi, 'video-dia-capa.webp')).size)
        m['video-agora-capa'] = list(Image.open(os.path.join(oi, 'video-agora-capa.webp')).size)
    print(raca, 'ok')

# largura e altura de cada imagem, para o gerar.mjs escrever width/height (sem pulo de layout)
json.dump(medidas, open(os.path.join(AQUI, 'medidas.json'), 'w'), indent=1)
print(f'total {total // 1024} KB')
