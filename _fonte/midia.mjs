// Captura as mídias da página no app real (rodando em http://127.0.0.1:5180), em 390x844, em navegador próprio:
// prints recortados, o celular do hero e as duas gravações mudas. Saída bruta em _fonte/bruto/<raça>/ (fora do git);
// o otimizar.py converte em WebP e MP4 para img/ e video/.
//   node _fonte/midia.mjs [raça ...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(AQUI, '../../../../.claude/scripts/web/package.json'));
const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:5180/';

// cão de exemplo de cada raça (pagina.md, "O que muda por raça") e a pasta de acesso do app
const RACAS = {
  // foto real no avatar de cada exemplo (fotos do Vini, uso liberado por ele em 2026-11-03), recortada no rosto com as orelhas inteiras
  lulu: { pasta: 'lulu-q7m2xa', nome: 'Thor', sexo: 'm', nota7: { tela: 'senta' }, foto: 'foto-thor-avatar.jpg' },
  'shih-tzu': { pasta: 'shih-tzu-x4k9pe', nome: 'Mel', sexo: 'f', nota7: { tela: 'raca', item: 2 }, foto: 'foto-shih-tzu-avatar.jpg' },
  salsicha: { pasta: 'salsicha-b8r3wd', nome: 'Bidu', sexo: 'm', nota7: { tela: 'raca', item: 1 }, foto: 'foto-salsicha-avatar.jpg' },
  yorkshire: { pasta: 'yorkshire-h5t6nc', nome: 'Nina', sexo: 'f', nota7: { tela: 'senta' }, foto: 'foto-yorkshire-avatar.jpg' }
};
// --so=hero,diario,ficha,... refaz só essas capturas, sem apagar as outras (partes: hero diario comandos nota casos kit ficha videos)
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
const quer = parte => !SO.length || SO.includes(parte);
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const escolha = args.length ? args : Object.keys(RACAS);

const dia = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const em = (diasAtras, h, m) => { const d = new Date(Date.now() - diasAtras * 864e5); d.setHours(h, m, 0, 0); return d.getTime(); };

// diário de uma semana: acertos espalhados, erros juntos entre 14h e 16h (o diário destaca esse horário)
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
// a foto vai como o app guarda depois do campo da ficha: JPEG quadrado de 320 px em data URL (o enquadramento já vem
// centrado no rosto em foto-<raça>-avatar.jpg, feito a partir da foto original da mesma pasta)
const fotoDe = r => RACAS[r].foto ? 'data:image/jpeg;base64,' + fs.readFileSync(path.join(AQUI, RACAS[r].foto)).toString('base64') : '';
const base = r => ({ nome: RACAS[r].nome, foto: fotoDe(r), sexo: RACAS[r].sexo, checagem: {}, familia: { regras: {}, quem: {} }, filhote: { social: [], vet: [] }, favs: [] });
const ESTADOS = {
  // dia 5 de 21: dias 1 a 4 feitos em dias anteriores, isso, atenção e senta aprendidos, uma semana de diário
  exemplo: r => ({ ...base(r), criado: dia(5), feitos: { 1: dia(4), 2: dia(3), 3: dia(2), 4: dia(1) }, tarefas: { 1: true, 2: true, 3: true, 4: true }, aprendidos: ['isso', 'atencao', 'senta'], xixi: semanaDeXixi() }),
  // ficha feita hoje, dia 1
  dia1: r => ({ ...base(r), criado: dia(0), feitos: {}, tarefas: {}, aprendidos: [], xixi: [] }),
  // sem ficha: a primeira tela depois da compra
  vazio: () => null
};

const navegador = await chromium.launch({ headless: true, args: ['--mute-audio'] });
// fora das capturas: o convite de instalar (faixa e linha do Hoje) e os avisos
const CSS = '.inst,.faixa-inst,.lin[data-a="instalar"],.toast{display:none!important}*{animation:none!important;transition:none!important}html{scroll-behavior:auto!important}';

async function contexto(r, estado, video, dsf = 2, vp = { width: 390, height: 844 }) {
  // gravação: o vídeo do Playwright sai no tamanho CSS da tela; para sair nítido, a tela tem 780x1688 e o app é ampliado 2x (zoom),
  // o que dá o mesmo layout de 390x844 com o dobro de pixels
  const ctx = await navegador.newContext({ viewport: video ? { width: 780, height: 1688 } : vp, deviceScaleFactor: video ? 1 : dsf, isMobile: true, hasTouch: true, locale: 'pt-BR',
    ...(video ? { recordVideo: { dir: video, size: { width: 780, height: 1688 } } } : {}) });
  const e = ESTADOS[estado](r);
  await ctx.addInitScript(([raca, e]) => {
    if (sessionStorage.getItem('__ok')) return; sessionStorage.setItem('__ok', '1');
    localStorage.clear(); localStorage.setItem('nt_acesso', JSON.stringify([raca])); localStorage.setItem('nt_raca', JSON.stringify(raca));
    if (e) localStorage.setItem('nt_cao_' + raca, JSON.stringify(e));
  }, [r, e]);
  return ctx;
}
async function abrir(ctx, r, zoom) {
  const p = await ctx.newPage();
  await p.goto(APP + RACAS[r].pasta + '/'); await p.addStyleTag({ content: CSS + (zoom ? 'html{zoom:2}' : '') });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  return p;
}
// recorte: do topo do primeiro seletor ao fim do último, na largura da tela, com uma margem
async function recorte(p, arq, de, ate, margem = 12) {
  await p.waitForTimeout(250);
  const box = await p.evaluate(([de, ate, m]) => {
    const a = typeof de === 'string' ? document.querySelector(de) : de, b = document.querySelector(ate || de);
    if (!a || !b) return null;
    const y0 = a.getBoundingClientRect().top + scrollY, y1 = b.getBoundingClientRect().bottom + scrollY;
    return { x: 6, y: Math.max(0, y0 - m), width: 378, height: y1 - y0 + 2 * m };
  }, [de, ate, margem]);
  if (!box) throw new Error('não achei ' + de + ' / ' + ate + ' em ' + arq);
  // a barra de baixo é fixa: num recorte longo ela cairia no meio da imagem
  await p.evaluate(() => document.querySelector('nav.nav')?.style.setProperty('display', 'none'));
  await p.screenshot({ path: arq, clip: box, fullPage: true });
  await p.evaluate(() => document.querySelector('nav.nav')?.style.removeProperty('display'));
}
const marcar = (p, sel, attr = 'data-rec') => p.evaluate(([s, a]) => { document.querySelectorAll('[' + a + ']').forEach(e => e.removeAttribute(a)); const e = typeof s === 'string' ? document.querySelector(s) : null; if (e) e.setAttribute(a, '1'); return !!e; }, [sel, attr]);

for (const r of escolha) {
  const out = path.join(AQUI, 'bruto', r); if (!SO) fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const f = n => path.join(out, n);
  let ctx, p;

  if (quer('diario') || quer('comandos') || quer('nota') || quer('casos') || quer('kit')) {
  // ---- estado de exemplo, dia 5 ----
  ctx = await contexto(r, 'exemplo'); p = await abrir(ctx, r);
  if (quer('diario')) {
    // 4: diário em dois recortes, os dois botões e o gráfico por horário (o otimizar.py empilha)
    await p.click('nav button[data-t="diario"]'); await p.waitForTimeout(300);
    await p.evaluate(() => { const c = [...document.querySelectorAll('.cartao')].find(c => c.textContent.includes('Por horário')); c.setAttribute('data-graf', '1'); });
    await recorte(p, f('diario-1.png'), '.xixi-bt');
    await recorte(p, f('diario-2.png'), '[data-graf]');
  }
  if (quer('comandos') || quer('nota')) {
    // 5: grade dos comandos e a nota da raça
    await p.click('nav button[data-t="comandos"]'); await p.waitForTimeout(500);
    await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    if (quer('comandos')) await recorte(p, f('comandos.png'), 'h1', '.grade');
    if (RACAS[r].nota7.tela === 'senta') { await p.click('.cmd[data-id="senta"]'); await p.waitForTimeout(500); if (quer('nota')) await recorte(p, f('nota-raca.png'), '.cartao.raca'); }
    else if (quer('nota')) {
      await p.click('nav button[data-t="hoje"]'); await p.click('button[data-t="raca"]'); await p.waitForTimeout(300);
      await p.evaluate(i => document.querySelectorAll('.sec-raca')[i].setAttribute('data-rec', '1'), RACAS[r].nota7.item);
      await recorte(p, f('nota-raca.png'), '[data-rec]');
    }
  }
  if (quer('casos')) {
    // 2: Agora > Xixi, os casos
    await p.click('nav button[data-t="agora"]'); await p.click('.lin[data-id="xixi"]'); await p.waitForTimeout(300);
    await p.evaluate(() => { const d = document.querySelectorAll('details.caso'); d[0].open = true; d[2].setAttribute('data-fim', '1'); [...document.querySelectorAll('h3')].find(h => h.textContent.includes('Qual é o caso')).setAttribute('data-ini', '1'); });
    await recorte(p, f('casos.png'), '[data-ini]', '[data-fim]');
  }
  if (quer('kit')) {
    // 7: kit para imprimir (calendário com o nome do cão)
    await p.click('nav button[data-t="hoje"]'); await p.click('button[data-t="kit"]'); await p.waitForTimeout(500);
    await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    await p.evaluate(() => document.querySelector('.cal').closest('.cartao').setAttribute('data-rec', '1'));
    await recorte(p, f('kit.png'), '[data-rec]');
  }
  await ctx.close();
  }

  if (quer('hero')) {
  // ---- 1: a tela Hoje do exemplo num iPhone grande (430x932, tamanho Pro Max), em 3x ----
  // O navegador sem tela não tem área segura, então ela é simulada com os valores do iPhone: 59 px no topo (barra de
  // status e ilha) e 34 px embaixo (indicador de início). É o que o app real faz no iPhone com env(safe-area-inset-*).
  ctx = await contexto(r, 'exemplo', null, 3, { width: 430, height: 932 }); p = await abrir(ctx, r);
  await p.addStyleTag({ content: '.tela{padding-top:73px!important}.nav{padding-bottom:40px!important}' }); await p.waitForTimeout(200);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  await p.screenshot({ path: f('hoje-tela.png') });
  await ctx.close();
  }

  if (quer('ficha')) {
  // ---- sem ficha (8): da foto ao campo do nome, e a linha "O nome e a foto ficam só neste celular" (o otimizar.py empilha) ----
  ctx = await contexto(r, 'vazio'); p = await abrir(ctx, r);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  await recorte(p, f('ficha-1.png'), '.foto-bt', '.campo', 14);
  await recorte(p, f('ficha-2.png'), '.ficha > p:last-of-type', null, 10);
  await ctx.close();
  }

  if (!quer('videos')) { console.log('ok', r, fs.readdirSync(out).join(' ')); continue; }
  // ---- gravação 4: o dia inteiro em 3 toques ----
  const vdir = path.join(out, 'v'); const tempos = {};
  ctx = await contexto(r, 'exemplo', vdir); const t0 = Date.now(); p = await abrir(ctx, r, true);
  tempos.dia = (Date.now() - t0) / 1000;
  await p.waitForTimeout(1300);
  await p.click('button[data-a="sessao"][data-d="5"]'); await p.waitForTimeout(900);
  await p.click('button[data-a="rodar"]'); await p.waitForTimeout(2600);
  await p.evaluate(() => { const el = document.getElementById('passos'); const y = el.getBoundingClientRect().top + scrollY - 90; let i = 0; const iv = setInterval(() => { scrollTo(0, scrollY + (y - scrollY) / 6); if (++i > 18) clearInterval(iv); }, 40); });
  await p.waitForTimeout(1800);
  await p.evaluate(() => { let i = 0; const iv = setInterval(() => { scrollTo(0, scrollY * 0.75); if (++i > 14) { clearInterval(iv); scrollTo(0, 0); } }, 35); });
  await p.waitForTimeout(700);
  await p.click('button[data-a="fim-dia"]'); await p.waitForTimeout(1600);
  await p.click('button[data-a="ir-raiz"][data-t="hoje"]'); await p.waitForTimeout(2200);
  tempos.diaFim = (Date.now() - t0) / 1000;
  const v1 = await p.video().path(); await ctx.close();
  fs.renameSync(v1, f('video-dia.webm'));

  // ---- gravação 8: Agora > Late demais ----
  ctx = await contexto(r, 'exemplo', vdir); const t1 = Date.now(); p = await abrir(ctx, r, true);
  await p.click('nav button[data-t="agora"]'); await p.waitForTimeout(200);
  tempos.agora = (Date.now() - t1) / 1000;
  await p.waitForTimeout(1500);
  await p.click('.lin[data-id="latido"]'); await p.waitForTimeout(3300);
  tempos.agoraFim = (Date.now() - t1) / 1000;
  const v2 = await p.video().path(); await ctx.close();
  fs.renameSync(v2, f('video-agora.webm'));
  fs.rmSync(vdir, { recursive: true, force: true });
  fs.writeFileSync(f('tempos.json'), JSON.stringify(tempos));
  console.log('ok', r, fs.readdirSync(out).length, 'arquivos', JSON.stringify(tempos));
}

// ---- o celular do hero: a tela Hoje do exemplo numa moldura realista (a única da página) ----
const moldura = img => `<!doctype html><html><head><style>
*{box-sizing:border-box;margin:0}body{background:transparent;padding:2px 3px}
.fone{position:relative;width:456px;height:958px;border-radius:70px;padding:9px;
 background:linear-gradient(145deg,#d9dde0 0%,#8e959b 18%,#eef1f3 36%,#7c838a 60%,#c9ced2 82%,#6f767c 100%);
 box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}
.bot{position:absolute;width:4px;border-radius:3px;background:linear-gradient(90deg,#6f767c,#c9ced2)}
.b1{left:-3px;top:170px;height:34px}.b2{left:-3px;top:232px;height:66px}.b3{left:-3px;top:312px;height:66px}.b4{right:-3px;top:262px;height:102px}
.tela{position:relative;width:100%;height:100%;border-radius:61px;background:#000;padding:4px;overflow:hidden}
.vidro{position:relative;width:430px;height:932px;border-radius:57px;overflow:hidden;background:#FDE7D2}
.app{display:block;width:430px;height:932px}
.status{position:absolute;top:0;left:0;right:0;z-index:2;height:54px;display:flex;align-items:center;justify-content:space-between;padding:6px 34px 0 46px;font:600 17px -apple-system,"Segoe UI",sans-serif;color:#3A2A1F}
.ilha{position:absolute;z-index:3;top:12px;left:50%;transform:translateX(-50%);width:125px;height:37px;border-radius:20px;background:#000}
.ic{display:flex;gap:6px;align-items:center}
.inicio{position:absolute;z-index:3;bottom:8px;left:50%;transform:translateX(-50%);width:146px;height:5px;border-radius:3px;background:#1d1d1f}
.brilho{position:absolute;inset:0;border-radius:57px;background:linear-gradient(115deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 30%);pointer-events:none}
</style></head><body><div class="fone"><i class="bot b1"></i><i class="bot b2"></i><i class="bot b3"></i><i class="bot b4"></i>
<div class="tela"><div class="vidro"><img class="app" src="data:image/png;base64,${img}"><div class="status"><span>9:41</span><span class="ic">
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.4-3a3.4 3.4 0 0 0-4.8 0zM3.3 6.3a6.6 6.6 0 0 1 9.4 0l1.6-1.9a9.1 9.1 0 0 0-12.6 0zM.3 2.9a11 11 0 0 1 15.4 0" fill="currentColor"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="14" height="9" rx="2" fill="currentColor"/><rect x="24.5" y="4.5" width="2" height="4" rx="1" fill="currentColor" opacity=".5"/></svg>
</span></div><div class="ilha"></div><div class="inicio"></div><div class="brilho"></div></div></div></div></body></html>`;
if (quer('hero')) {
const ctx = await navegador.newContext({ viewport: { width: 462, height: 962 }, deviceScaleFactor: 3 });
const pm = await ctx.newPage();
for (const r of escolha) {
  const tela = fs.readFileSync(path.join(AQUI, 'bruto', r, 'hoje-tela.png')).toString('base64');
  await pm.setContent(moldura(tela)); await pm.waitForTimeout(200);
  await pm.screenshot({ path: path.join(AQUI, 'bruto', r, 'hero-celular.png'), omitBackground: true });
}
console.log('ok: celulares');
}
await navegador.close();
