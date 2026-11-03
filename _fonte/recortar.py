# Recorta os cães do "senta" (app/img/racas/<raça>/senta-640.webp) do fundo creme, para a capa e o post da marca:
# o fundo de cada ilustração tem um creme levemente diferente, e recortado não aparecem quatro quadrados.
# A sombra do chão fica como sombra (transparência pela distância ao fundo); a mão com o petisco fica, e o braço
# some suave na borda da direita (120 px) e na de cima (70 px), onde a ilustração o corta. Saída em _fonte/bruto/marca/ (fora do git)
# e, para os cartões da raiz, img/racas/<raça>-senta.webp (300 px, com transparência).
#   python _fonte/recortar.py
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops
AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(AQUI, '..', '..', 'app', 'img', 'racas')
OUT = os.path.join(AQUI, 'bruto', 'marca'); os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(AQUI, '..', 'img', 'racas'), exist_ok=True)
MARCA = (255, 0, 255)
for r in ['lulu', 'shih-tzu', 'salsicha', 'yorkshire']:
    im = Image.open(os.path.join(APP, r, 'senta-640.webp')).convert('RGB')
    w, h = im.size
    fundo = tuple(sorted(im.getpixel(p)[c] for p in [(4, 4), (4, h - 5), (w // 2, h - 5), (4, h // 2)])[1] for c in range(3))
    # o fundo: tudo o que a enchente alcança a partir das bordas (menos a mão, que toca a borda de cima e a da direita)
    m = im.copy()
    for x in range(0, w, 16):
        for y in (0, h - 1):
            if sum(abs(a - b) for a, b in zip(m.getpixel((x, y)), fundo)) < 30: ImageDraw.floodfill(m, (x, y), MARCA, thresh=22)
    for y in range(0, h, 16):
        for x in (0, w - 1):
            if sum(abs(a - b) for a, b in zip(m.getpixel((x, y)), fundo)) < 30: ImageDraw.floodfill(m, (x, y), MARCA, thresh=22)
    eh_fundo = Image.eval(ImageChops.difference(m, Image.new('RGB', m.size, MARCA)).convert('L'), lambda v: 255 if v < 4 else 0)
    # no fundo, a sombra vira transparência proporcional ao quanto ela escurece o creme
    dif = ImageChops.difference(im, Image.new('RGB', im.size, fundo)).convert('L')
    sombra = Image.eval(dif, lambda v: min(255, v * 6))
    # fora da enchente, o que está muito perto do creme (ruído do fundo preso entre traços) também some aos poucos
    perto = Image.eval(dif, lambda v: 255 if v >= 14 else v * 18)
    alfa = ImageChops.composite(sombra, perto, eh_fundo).filter(ImageFilter.GaussianBlur(0.8))
    # braço cortado na borda: some em 70 px nas bordas de cima e da direita
    g = Image.new('L', im.size, 255); d = ImageDraw.Draw(g)
    for i in range(120):
        d.line([(w - 1 - i, 0), (w - 1 - i, h)], fill=int(255 * (i / 120) ** 1.5))
    g2 = Image.new('L', im.size, 255); d2 = ImageDraw.Draw(g2)
    for i in range(70):
        d2.line([(0, i), (w, i)], fill=int(255 * i / 70))
    borda = ImageChops.darker(g, g2)
    alfa = ImageChops.multiply(alfa, borda)
    out = im.copy(); out.putalpha(alfa)
    out.save(os.path.join(OUT, r + '-senta.png'))
    out.resize((300, 300), Image.LANCZOS).save(os.path.join(AQUI, '..', 'img', 'racas', r + '-senta.webp'), 'WEBP', quality=82, method=6)
    print(r, 'fundo', fundo)
