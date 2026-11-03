// Os 4 posts de perfil (posts.md): 15 imagens de 1080x1350, de HTML para PNG, sem gerador de imagem.
// (1) captura recortes de telas reais do app (rodando em http://127.0.0.1:5180) com o estado de exemplo de cada raça,
//     como o midia.mjs: Thor, Mel, Bidu e Nina, com a foto no avatar; nada de bloco de saúde nem "Para ir além" com preço;
// (2) monta as telas com os recortes, os cães recortados (recortar.py) e o avatar da marca.
// Saída em ofertas/2026-11-no-tapetinho/posts/<post>/ (fora do git), com o legenda.txt copiado do posts.md.
//   python _fonte/recortar.py && node _fonte/marca.mjs && node _fonte/posts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(AQUI), OFERTA = path.resolve(SITE, '..');
const ENTREGA = path.join(OFERTA, 'posts'), BRUTO = path.join(AQUI, 'bruto', 'posts');
const require = createRequire(path.resolve(AQUI, '../../../../.claude/scripts/web/package.json'));
const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:5180/';
fs.mkdirSync(BRUTO, { recursive: true });

// o cão de exemplo de cada raça, igual ao midia.mjs
const RACAS = {
  lulu: { pasta: 'lulu-q7m2xa', nome: 'Thor', sexo: 'm', foto: 'foto-thor-avatar.jpg' },
  'shih-tzu': { pasta: 'shih-tzu-x4k9pe', nome: 'Mel', sexo: 'f', foto: 'foto-shih-tzu-avatar.jpg' },
  salsicha: { pasta: 'salsicha-b8r3wd', nome: 'Bidu', sexo: 'm', foto: 'foto-salsicha-avatar.jpg' },
  yorkshire: { pasta: 'yorkshire-h5t6nc', nome: 'Nina', sexo: 'f', foto: 'foto-yorkshire-avatar.jpg' }
};
const ORDEM = Object.keys(RACAS);
const dia = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const em = (diasAtras, h, m) => { const d = new Date(Date.now() - diasAtras * 864e5); d.setHours(h, m, 0, 0); return d.getTime(); };
function semanaDeXixi() {
  const x = [];
  for (let d = 7; d >= 1; d--) {
    for (const [h, m] of [[7, 10], [9, 40], [12, 15], [17, 30], [20, 5], [22, 20]]) x.push({ t: em(d, h, m + d), ok: true });
    if (d !== 3) x.push({ t: em(d, 14, 10 + d * 4), ok: false });
    if (d % 2) x.push({ t: em(d, 15, 5 + d * 3), ok: false });
    if (d === 6) x.push({ t: em(d, 10, 50), ok: false });
  }
  x.push({ t: em(0, 7, 5), ok: true }, { t: em(0, 9, 35), ok: true });
  return x.filter(i => i.t < Date.now()).sort((a, b) => a.t - b.t);
}
// dia 5 de 21: dias 1 a 4 feitos, isso, atenção e senta aprendidos, uma semana de diário
const exemplo = r => ({ nome: RACAS[r].nome, sexo: RACAS[r].sexo, foto: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(AQUI, RACAS[r].foto)).toString('base64'),
  checagem: {}, familia: { regras: {}, quem: {} }, filhote: { social: [], vet: [] }, favs: [],
  criado: dia(5), feitos: { 1: dia(4), 2: dia(3), 3: dia(2), 4: dia(1) }, tarefas: { 1: true, 2: true, 3: true, 4: true }, aprendidos: ['isso', 'atencao', 'senta'], xixi: semanaDeXixi() });
const CSS_APP = '.inst,.faixa-inst,.lin[data-a="instalar"],.toast{display:none!important}*{animation:none!important;transition:none!important}html{scroll-behavior:auto!important}';

const nav = await chromium.launch({ headless: true, args: ['--mute-audio'] });

// ---------------- (1) recortes das telas do app ----------------
async function app(r, largura = 390) {
  const ctx = await nav.newContext({ viewport: { width: largura, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  // aparelho com nt_ guardado: a ativação trata como "legado" e abre direto no app
  await ctx.addInitScript(([raca, e]) => {
    if (sessionStorage.getItem('__ok')) return; sessionStorage.setItem('__ok', '1');
    localStorage.clear(); localStorage.setItem('nt_acesso', JSON.stringify([raca])); localStorage.setItem('nt_raca', JSON.stringify(raca));
    localStorage.setItem('nt_cao_' + raca, JSON.stringify(e));
  }, [r, exemplo(r)]);
  const p = await ctx.newPage();
  await p.goto(APP + RACAS[r].pasta + '/'); await p.addStyleTag({ content: CSS_APP });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  if (await p.locator('#ativ').count()) throw new Error('a tela de ativação apareceu em ' + r);
  return { ctx, p };
}
const imagens = p => p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
// do topo do primeiro seletor ao fim do último, na largura da tela, sem a barra de baixo
async function recorte(p, arq, de, ate, margem = 14) {
  await imagens(p); await p.waitForTimeout(200);
  const box = await p.evaluate(([de, ate, m]) => {
    const a = document.querySelector(de), b = document.querySelector(ate || de); if (!a || !b) return null;
    const y0 = a.getBoundingClientRect().top + scrollY, y1 = b.getBoundingClientRect().bottom + scrollY;
    return { x: 4, y: Math.max(0, y0 - m), width: innerWidth - 8, height: y1 - y0 + 2 * m };
  }, [de, ate, margem]);
  if (!box) throw new Error('não achei ' + de + ' / ' + ate + ' em ' + arq);
  await p.evaluate(() => document.querySelector('nav.nav')?.style.setProperty('display', 'none'));
  await p.screenshot({ path: path.join(BRUTO, arq), clip: box, fullPage: true });
  await p.evaluate(() => document.querySelector('nav.nav')?.style.removeProperty('display'));
}
const marcar = (p, js) => p.evaluate(js);

for (const r of ORDEM) {
  // post 1, tela 2: o topo da Hoje (avatar, "<nome> no Tapetinho", "Dia 5 de 21"), num celular de 320 px de largura
  let { ctx, p } = await app(r, 320);
  await recorte(p, `hoje-topo-${r}.png`, '.hero', null, 12);
  await ctx.close(); ({ ctx, p } = await app(r));
  if (r === 'shih-tzu') await recorte(p, 'treino-mel.png', '.cartao.treino');           // post 2, tela 1
  if (r === 'lulu') {                                                                  // post 2, tela 4: Plano, dias 1 a 4 feitos e o 5 em destaque
    await p.click('nav button[data-t="plano"]'); await p.waitForTimeout(300);
    await recorte(p, 'plano-thor.png', '.semana h3', '.dia-l[data-d="5"]');
  }
  if (r === 'salsicha') {
    // post 1, tela 3: a sessão do dia 2 (etiqueta, título, relógio de 3:00, Começar e Feito)
    await p.click('nav button[data-t="plano"]'); await p.click('.dia-l[data-d="2"]'); await p.waitForTimeout(300);
    await recorte(p, 'sessao-dia2-bidu.png', '.tela > .etiq', '.controles');
    // post 2, tela 3: passos 1 a 3 da sessão do dia 5
    await p.click('nav button[data-t="hoje"]'); await p.click('button[data-a="sessao"][data-d="5"]'); await p.waitForTimeout(300);
    await marcar(p, () => { const c = document.getElementById('passos').closest('.cartao'); c.setAttribute('data-ini', '1'); document.querySelectorAll('#passos li')[2].setAttribute('data-fim', '1'); });
    await recorte(p, 'passos-bidu.png', '[data-ini]', '[data-fim]', 2);
  }
  if (r === 'yorkshire') {
    // post 2, tela 2: título do dia 5 e o relógio
    await p.click('button[data-a="sessao"][data-d="5"]'); await p.waitForTimeout(300);
    await recorte(p, 'sessao-nina.png', '.tela > .etiq', '.relogio', 4);
    // post 3, tela 5: os dois botões do diário e o gráfico por horário
    await p.click('nav button[data-t="diario"]'); await p.waitForTimeout(300);
    await marcar(p, () => [...document.querySelectorAll('.cartao')].find(c => c.textContent.includes('Por horário')).setAttribute('data-graf', '1'));
    await recorte(p, 'diario-1-nina.png', '.xixi-bt');
    await recorte(p, 'diario-2-nina.png', '[data-graf]');
  }
  if (r === 'shih-tzu') {
    // post 3, tela 1: Agora > Xixi, a lista "Qual é o caso?", abaixo do topo com o nome
    await p.click('nav button[data-t="agora"]'); await p.click('.lin[data-id="xixi"]'); await p.waitForTimeout(300);
    await marcar(p, () => { [...document.querySelectorAll('h3')].find(h => h.textContent.includes('Qual é o caso')).setAttribute('data-ini', '1'); const d = document.querySelectorAll('details.caso'); d[d.length - 1].setAttribute('data-fim', '1'); });
    await recorte(p, 'casos-xixi.png', '[data-ini]', '[data-fim]');
  }
  await ctx.close();
}
console.log('ok: recortes', fs.readdirSync(BRUTO).length);

// ---------------- (2) as telas dos posts ----------------
const uri = (arq, tipo = 'png') => `data:image/${tipo};base64,` + fs.readFileSync(arq).toString('base64');
const rec = n => uri(path.join(BRUTO, n));
const cao = r => uri(path.join(AQUI, 'bruto', 'marca', r + '-senta.png'));
const isso = r => uri(path.join(OFERTA, 'app', 'img', 'racas', r, 'isso-640.webp'), 'webp');
const ICONE = uri(path.join(OFERTA, 'app', 'img', 'icones', 'icone-192.png'));
const AVATAR = uri(path.join(OFERTA, 'marca', 'avatar-no-tapetinho-1080.png'));
const NOMES = { lulu: 'Lulu', 'shih-tzu': 'Shih Tzu', salsicha: 'Salsicha', yorkshire: 'Yorkshire' };

const tela = corpo => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=block" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{position:relative;background:linear-gradient(180deg,#FDE7D2 0,#FFF6EC 420px) no-repeat,#FFF6EC;font-family:Nunito,sans-serif;color:#3A2A1F;padding:84px 72px 0}
h1{font-weight:900;font-size:66px;line-height:1.1;letter-spacing:-.015em;text-wrap:balance}
.sub{font-weight:700;font-size:37px;line-height:1.32;color:#6F5A4B;margin-top:20px;text-wrap:pretty}
.sub b{color:#3A2A1F;font-weight:900}
.cta{font-weight:900;font-size:40px;color:#B8552A;margin-top:18px}
.pata{position:absolute;right:56px;bottom:52px;width:64px;height:64px;border-radius:17px;box-shadow:0 4px 12px rgba(90,50,20,.18)}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:40px;margin-bottom:34px}
.logo img{width:64px;height:64px;border-radius:17px}
.print{display:block;border-radius:30px;box-shadow:0 2px 4px rgba(90,50,20,.08),0 18px 44px -12px rgba(90,50,20,.3);background:#FFF6EC}
.centro{position:absolute;left:0;right:0;display:flex;justify-content:center}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.cao{display:block}
.nome{text-align:center;font-weight:900;font-size:40px;margin-top:-6px}
.ilus{display:block;width:760px;height:760px;border-radius:44px;box-shadow:0 18px 44px -14px rgba(90,50,20,.3)}
</style></head><body>${corpo}<img class="pata" src="${ICONE}" alt=""></body></html>`;
// os cães no tapetinho da capa (mesma conta do marca.mjs)
const tapete = (x, y, w, h) => `<svg style="position:absolute;left:${x}px;top:${y}px" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="t${x}${y}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF5"/><stop offset="1" stop-color="#FCEBD9"/></linearGradient></defs>
<ellipse cx="${w / 2}" cy="${h - 4}" rx="${w / 2 - 10}" ry="7" fill="#9C3F18" opacity=".14"/>
<rect x="2" y="2" width="${w - 4}" height="${h - 12}" rx="${(h - 12) * .32}" fill="url(#t${x}${y})" stroke="#F6D3B7" stroke-width="2"/>
<rect x="${h * .13}" y="${h * .13}" width="${w - h * .26}" height="${h - 12 - h * .22}" rx="${(h - 12) * .22}" fill="none" stroke="#EE9A6C" stroke-width="${Math.max(3, h * .05)}" stroke-dasharray="${h * .16} ${h * .12}" stroke-linecap="round"/></svg>`;
function fileira(lista, cx, topo, lado, passo, nomes) {
  const n = lista.length, x0 = cx + lado * .09 - (passo * (n - 1)) / 2;
  const tw = passo * (n - 1) + lado * .8, ty = topo + lado * .755, th = lado * .27;
  return tapete(Math.round(cx - tw / 2), Math.round(ty), Math.round(tw), Math.round(th)) +
    lista.map((r, i) => `<img src="${cao(r)}" style="position:absolute;left:${Math.round(x0 + passo * i - lado / 2)}px;top:${topo}px;width:${lado}px;height:${lado}px" alt="">` +
      (nomes ? `<div class="nome" style="position:absolute;width:${lado}px;left:${Math.round(x0 + passo * i - lado / 2 - lado * .09)}px;top:${Math.round(topo + lado * 1.03)}px">${NOMES[r]}</div>` : '')).join('');
}
const logo = '<div class="logo"><img src="' + ICONE + '" alt="">No Tapetinho</div>';
// recorte grande, sem moldura de celular: cabe na caixa (largura, altura) e centraliza
const print = (src, top, maxW, maxH, extra = '') => `<div class="centro" style="top:${top}px;bottom:130px;align-items:center"><img class="print" src="${src}" style="max-width:${maxW}px;max-height:${Math.min(maxH, 1220 - top)}px;${extra}" alt=""></div>`;

const POSTS = {
  'post-1-o-que-e': [
    tela(`${logo}<h1>Adestramento em casa, 3 minutos por dia.</h1><p class="sub">Um app feito para a raça do seu cachorro.</p>` +
      fileira(ORDEM.slice(0, 2), 540, 470, 380, 390) + fileira(ORDEM.slice(2), 540, 880, 380, 390)),
    tela(`<h1>O app chama o seu cachorro pelo nome.</h1><p class="sub">Você põe o nome e a foto dele, e cada dia aparece pronto.</p>
      <div class="grade" style="position:absolute;left:30px;right:30px;top:410px;bottom:130px;gap:20px;align-content:center">${ORDEM.map(r => `<img class="print" src="${rec(`hoje-topo-${r}.png`)}" style="width:100%" alt="">`).join('')}</div>`),
    tela(`<h1>Todo dia, uma sessão de 3 minutos.</h1><p class="sub">Plano de 21 dias, com o xixi treinado desde o dia 1. Sem gritar e sem castigo.</p>` + print(rec('sessao-dia2-bidu.png'), 470, 760, 780)),
    tela(`<h1>Escolha a raça do seu cachorro.</h1><p class="sub">Lulu, Shih Tzu, Salsicha e Yorkshire</p><p class="cta">Link na bio.</p>` +
      fileira(ORDEM.slice(0, 2), 540, 380, 350, 390, true) + fileira(ORDEM.slice(2), 540, 800, 350, 390, true) +
      `<img src="${AVATAR}" style="position:absolute;left:72px;bottom:44px;width:84px;height:84px;border-radius:50%" alt="">`)
  ],
  'post-2-o-dia-no-app': [
    tela(`<h1>Como é o treino de hoje no No Tapetinho</h1><p class="sub">3 minutos, no celular.</p>` + print(rec('treino-mel.png'), 470, 936, 760, 'width:936px')),
    tela(`<h1>Toque em Começar.</h1><p class="sub">O relógio conta 3 minutos.</p>` + print(rec('sessao-nina.png'), 380, 800, 860)),
    tela(`<h1>Os passos ficam embaixo.</h1><p class="sub">Curtos, para ler com o petisco na outra mão.</p>` + print(rec('passos-bidu.png'), 400, 936, 830, 'width:936px')),
    tela(`<h1>Terminou? Toque em Feito.</h1><p class="sub">Amanhã o próximo dia já está pronto.</p>` + print(rec('plano-thor.png'), 400, 900, 840)),
    tela(`<h1>Não deu certo hoje? Repita o dia.</h1><p class="sub">É roteiro de treino, não promessa. Cada cachorro tem o seu ritmo.</p><p class="cta">Link na bio.</p>` +
      fileira(ORDEM, 540, 600, 290, 220))
  ],
  'post-3-xixi-fora-do-tapetinho': [
    tela(`<h1>Fez xixi fora do tapetinho?</h1><p class="sub">O que fazer na hora, do jeito que está no app.</p>` + print(rec('casos-xixi.png'), 400, 900, 850)),
    tela(`<h1>1. Não brigue e não esfregue o focinho.</h1><p class="sub">Com bronca, ele aprende a esconder o xixi, não a usar o tapetinho.</p>` + `<div class="centro" style="top:470px"><img class="ilus" src="${isso('lulu')}" alt=""></div>`),
    tela(`<h1>2. Pegou no flagra? Uma palma e leve ao tapetinho.</h1><p class="sub">Espere em silêncio. Fez lá: "isso!" e petisco na hora.</p>` + `<div class="centro" style="top:500px"><img class="ilus" src="${isso('shih-tzu')}" style="width:730px;height:730px" alt=""></div>`),
    tela(`<h1>3. Limpe sem amoníaco e sem cloro.</h1><p class="sub">Produto enzimático de pet ou água e sabão neutro. O cheiro chama de volta.</p>` + `<div class="centro" style="top:470px"><img class="ilus" src="${isso('salsicha')}" alt=""></div>`),
    tela(`<h1 style="max-width:700px">4. Anote a hora.</h1><p class="sub" style="max-width:700px">O diário do app mostra em que horário ele mais erra.</p>
      <div style="position:absolute;left:72px;right:72px;top:330px;bottom:200px;display:flex;flex-direction:column;gap:20px;align-items:center;justify-content:center">
        <img class="print" src="${rec('diario-1-nina.png')}" style="width:640px" alt=""><img class="print" src="${rec('diario-2-nina.png')}" style="width:640px" alt=""></div>
      <img src="${isso('yorkshire')}" style="position:absolute;right:60px;top:70px;width:200px;height:200px;border-radius:30px;box-shadow:0 10px 26px -10px rgba(90,50,20,.35)" alt="">
      <p class="sub" style="position:absolute;left:72px;right:160px;bottom:60px;font-size:30px">Xixi toda hora e pouco de cada vez? Leve ao veterinário antes de treinar.</p>`)
  ],
  'post-4-as-racas': [
    tela(`<div class="logo" style="justify-content:center;font-size:34px;margin-bottom:22px"><img src="${ICONE}" style="width:54px;height:54px" alt="">No Tapetinho</div>
      <h1 style="text-align:center">Tem a raça do seu cachorro?</h1>` +
      fileira(ORDEM.slice(0, 2), 540, 250, 360, 400, true) + fileira(ORDEM.slice(2), 540, 660, 360, 400, true) +
      `<div style="position:absolute;left:0;right:0;bottom:0;height:250px;background:#FDE7D2;display:flex;align-items:center;gap:28px;padding:0 160px 0 72px">
        <img src="${AVATAR}" style="width:112px;height:112px;border-radius:50%;flex:none" alt="">
        <div><p class="sub" style="margin:0;font-size:32px;color:#3A2A1F">Cada app tem o treino, os comandos e os cuidados da raça.</p><p class="cta" style="margin-top:8px;font-size:38px">Escolha a sua no link da bio.</p></div></div>`)
  ]
};

const ctx = await nav.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const [pasta, telas] of Object.entries(POSTS)) {
  const dir = path.join(ENTREGA, pasta); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const [i, html] of telas.entries()) {
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { await document.fonts.load('900 40px Nunito'); await document.fonts.load('700 40px Nunito'); });
    if (!(await p.evaluate(() => document.fonts.check('900 40px Nunito')))) throw new Error('Nunito não carregou');
    if (await p.evaluate(() => document.documentElement.outerHTML.includes('—'))) throw new Error('travessão em ' + pasta);
    await p.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log('ok', pasta, telas.length);
}
await nav.close();

// legendas: copiadas do posts.md, a do Instagram literal e a do Facebook com a troca que o roteiro manda
const md = fs.readFileSync(path.join(OFERTA, 'posts.md'), 'utf8');
const PASTAS = Object.keys(POSTS);
md.split(/^## Post /m).slice(1).forEach((bloco, i) => {
  const ig = bloco.split('**Legenda do Instagram:**')[1].split('**Legenda do Facebook:**')[0].trim().split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
  const regra = bloco.split('**Legenda do Facebook:**')[1].split(/\n## |\nHashtags de raça/)[0].replace(/\s+/g, ' ').trim();
  const troca = (regra.match(/"([^"]+)"/) || [])[1];
  const linhas = ig.split('\n');
  const semTags = linhas.filter(l => !/^#/.test(l.trim()));
  while (semTags.length && !semTags[semTags.length - 1].trim()) semTags.pop();
  // a frase do link da bio é a que muda; o resto da linha fica
  const k = semTags.findIndex(l => /link da bio/.test(l));
  const fb = semTags.slice(); const fraseBio = fb[k].match(/[^.?!]*link da bio\./)[0].trim();
  fb[k] = fb[k].replace(fraseBio, troca.endsWith('.') ? troca : troca + '.');
  fs.writeFileSync(path.join(ENTREGA, PASTAS[i], 'legenda.txt'), `INSTAGRAM\n\n${ig}\n\n\nFACEBOOK\n\n${fb.join('\n')}\n`);
});
console.log('ok: legendas');
