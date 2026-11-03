// Identidade da marca (marca.md): avatar do Facebook e do Instagram, capa do Facebook, post fixado do Instagram,
// e a imagem de prévia do link (og). Tudo de HTML para PNG, sem gerador de imagem.
// Usa os cães recortados por recortar.py (_fonte/bruto/marca/). Entrega em ofertas/2026-11-no-tapetinho/marca/ (fora do git);
// a og vai também para img/ do site.
//   python _fonte/recortar.py && node _fonte/marca.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(AQUI);
const ENTREGA = path.resolve(SITE, '..', 'marca');
const require = createRequire(path.resolve(AQUI, '../../../../.claude/scripts/web/package.json'));
const { chromium } = require('playwright');
fs.mkdirSync(ENTREGA, { recursive: true }); fs.mkdirSync(path.join(SITE, 'img', 'racas'), { recursive: true });

// ordem de lançamento, sempre a mesma; nenhuma raça pesa mais
const RACAS = ['lulu', 'shih-tzu', 'salsicha', 'yorkshire'];
const cao = r => 'data:image/png;base64,' + fs.readFileSync(path.join(AQUI, 'bruto', 'marca', r + '-senta.png')).toString('base64');
const FRASE = 'Adestramento em casa, 3 minutos por dia.';
const CREME = '#FFF6EC', TINTA = '#3A2A1F';
// a pata do ícone do app (app/img/icones/icone.svg), no viewBox 512
const PATA = `<path d="M256 262c-38 0-76 34-84 66-7 28 12 46 38 42 18-3 30-10 46-10s28 7 46 10c26 4 45-14 38-42-8-32-46-66-84-66z"/>
<ellipse cx="190" cy="236" rx="25" ry="31" transform="rotate(-24 190 236)"/><ellipse cx="232" cy="196" rx="25" ry="32" transform="rotate(-8 232 196)"/>
<ellipse cx="280" cy="196" rx="25" ry="32" transform="rotate(8 280 196)"/><ellipse cx="322" cy="236" rx="25" ry="31" transform="rotate(24 322 236)"/>`;
const FONTE = '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=block" rel="stylesheet">';
const base = (w, h, corpo, css = '') => `<!doctype html><html><head><meta charset="utf-8">${FONTE}<style>
*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${CREME}}
body{position:relative;font-family:Nunito,sans-serif;color:${TINTA}}
.frase{position:absolute;left:0;right:0;text-align:center;font-weight:900;letter-spacing:-.01em;line-height:1.08}
.cao{position:absolute;display:block}
.tapete{position:absolute}
${css}</style></head><body>${corpo}</body></html>`;
// o tapetinho comprido: creme claro com borda pespontada laranja, como o do ícone do app
const tapete = (x, y, w, h) => `<svg class="tapete" style="left:${x}px;top:${y}px" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="t${x}${y}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF5"/><stop offset="1" stop-color="#FCEBD9"/></linearGradient></defs>
<ellipse cx="${w / 2}" cy="${h - 4}" rx="${w / 2 - 10}" ry="7" fill="#9C3F18" opacity=".14"/>
<rect x="2" y="2" width="${w - 4}" height="${h - 12}" rx="${(h - 12) * .32}" fill="url(#t${x}${y})" stroke="#F6D3B7" stroke-width="2"/>
<rect x="${h * .13}" y="${h * .13}" width="${w - h * .26}" height="${h - 12 - h * .22}" rx="${(h - 12) * .22}" fill="none" stroke="#EE9A6C" stroke-width="${Math.max(3, h * .05)}" stroke-dasharray="${h * .16} ${h * .12}" stroke-linecap="round"/></svg>`;
// uma fileira de cães do mesmo tamanho sentados num tapetinho: cx centro, topo do quadro, lado do quadro, passo entre centros
function fileira(lista, cx, topo, lado, passo) {
  const n = lista.length, x0 = cx + lado * .09 - (passo * (n - 1)) / 2;
  // o corpo do cão fica à esquerda do centro do quadro (a mão ocupa a direita): o tapetinho acompanha o corpo
  const tw = passo * (n - 1) + lado * .8, ty = topo + lado * .755, th = lado * .27, tc = cx;
  return tapete(Math.round(tc - tw / 2), Math.round(ty), Math.round(tw), Math.round(th)) +
    lista.map((r, i) => `<img class="cao" src="${cao(r)}" style="left:${Math.round(x0 + passo * i - lado / 2)}px;top:${topo}px;width:${lado}px;height:${lado}px" alt="">`).join('');
}

const PECAS = {
  // avatar: a pata creme sobre o laranja do ícone, em círculo cheio; a pata com 55% do diâmetro
  avatar: { w: 1080, h: 1080, html: base(1080, 1080, `<svg width="1080" height="1080" viewBox="0 0 1080 1080" style="position:absolute;inset:0">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F29360"/><stop offset="1" stop-color="#D45A28"/></linearGradient></defs>
<rect width="1080" height="1080" fill="url(#g)"/><g id="pata" fill="${CREME}">${PATA}</g></svg>`), pata: 0.55 },
  // capa do Facebook 1640x624: frase e cães no miolo seguro (~1100x520), canto de baixo à esquerda livre
  capa: { w: 1640, h: 624, html: base(1640, 624, `<div class="frase" data-cabe="900" style="top:74px;font-size:60px">${FRASE}</div>` + fileira(RACAS, 820, 146, 330, 268)) },
  // post fixado do Instagram 1080x1350: frase em duas linhas e os quatro em 2 por 2
  post: { w: 1080, h: 1350, html: base(1080, 1350, `<div class="frase" style="top:100px;font-size:80px">Adestramento em casa,<br>3 minutos por dia.</div>` +
    fileira(RACAS.slice(0, 2), 540, 330, 450, 420) + fileira(RACAS.slice(2), 540, 800, 450, 420)) },
  // prévia do link 1200x630: a capa nessa proporção
  og: { w: 1200, h: 630, html: base(1200, 630, `<div class="frase" data-cabe="980" style="top:72px;font-size:62px">${FRASE}</div>` + fileira(RACAS, 600, 168, 320, 262)) }
};

const nav = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const ctx = await nav.newContext({ deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const [nome, pc] of Object.entries(PECAS)) {
  await p.setViewportSize({ width: pc.w, height: pc.h });
  await p.setContent(pc.html, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  if (!(await p.evaluate(async () => { if (!document.querySelector('.frase')) return true; await document.fonts.load('900 40px Nunito'); return document.fonts.check('900 40px Nunito'); }))) throw new Error('Nunito não carregou');
  await p.evaluate(({ k }) => {
    // frase numa linha só, na largura pedida
    document.querySelectorAll('[data-cabe]').forEach(f => { f.style.whiteSpace = 'nowrap'; const alvo = +f.dataset.cabe; const r = document.createRange(); r.selectNodeContents(f);
      const w = r.getBoundingClientRect().width; f.style.fontSize = (parseFloat(f.style.fontSize) * alvo / w) + 'px'; });
    // a pata no centro, com a fração pedida do diâmetro
    const g = document.getElementById('pata'); if (g) { const b = g.getBBox(), s = 1080 * k / Math.max(b.width, b.height);
      g.setAttribute('transform', `translate(540 540) scale(${s}) translate(${-(b.x + b.width / 2)} ${-(b.y + b.height / 2)})`); }
  }, { k: pc.pata || 0 });
  await p.waitForTimeout(150);
  const arq = { avatar: 'avatar-no-tapetinho-1080.png', capa: 'capa-facebook-1640x624.png', post: 'post-fixado-instagram-1080x1350.png', og: 'og-1200x630.png' }[nome];
  await p.screenshot({ path: path.join(ENTREGA, arq) });
  if (nome === 'og') await p.screenshot({ path: path.join(SITE, 'img', 'og.jpg'), type: 'jpeg', quality: 86 });
  console.log('ok', arq);
}
await nav.close();
