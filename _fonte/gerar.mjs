// Gera a página de vendas por raça (/lulu, /shih-tzu, /salsicha, /yorkshire), a raiz, privacidade e termos.
// Texto em _fonte/conteudo.mjs (literal do pagina.md); mídia em img/<raça> e video/<raça> (midia.mjs + otimizar.py).
//   node _fonte/gerar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { racas, texto as T } from './conteudo.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(AQUI);
const MED = JSON.parse(fs.readFileSync(path.join(AQUI, 'medidas.json'), 'utf8'));

// Checkout Cakto de cada raça (produto "No Tapetinho - <raça>", com os 5 bumps). Vazio: o botão aponta para #checkout-pendente.
const CHECKOUT = { lulu: 'https://pay.cakto.com.br/4335byt', 'shih-tzu': 'https://pay.cakto.com.br/38uhrzs', salsicha: 'https://pay.cakto.com.br/evzg3t6', yorkshire: 'https://pay.cakto.com.br/bci7s4g' };
// Rastreio. PENDENTE: id do pixel da oferta (compartilhado com a Conta 01). painel: chave do script de visitas do painel
// (instalacao.script do diagnostico-rastreio). Vazio = nada carrega.
const RASTREIO = { pixel: '', painel: '7c65ca17fb0c624457cb6c87d1063a69' };

// largura do celular do hero: quase a tela toda no celular (margem de 18 px de cada lado), 330 px no computador (o botão cabe na primeira tela)
const SIZES_HERO = '(max-width: 860px) calc(100vw - 36px), 330px';
const ok = (c, m) => { if (!c) { console.error('ERRO:', m); process.exit(1); } };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function pagina(id) {
  const r = racas[id];
  const tk = s => s.replaceAll('{R}', r.R).replaceAll('{C}', r.C).replaceAll('{oC}', (r.f ? 'a ' : 'o ') + r.C).replaceAll('{OC}', (r.f ? 'A ' : 'O ') + r.C);
  const t = s => md(tk(s));
  const m = MED[id];
  const img = (n, alt, extra = '') => `<img src="../img/${id}/${n}.webp" width="${m[n][0]}" height="${m[n][1]}" alt="${esc(tk(alt))}" loading="lazy" decoding="async"${extra}>`;
  const shot = (n, alt, cls = '') => `<figure class="shot ${cls}">${img(n, alt)}</figure>`;
  const fig = (n, alt, legenda, cls = '') => `<figure class="legendada ${cls}"><div class="shot">${img(n, alt)}</div><figcaption>${t(legenda)}</figcaption></figure>`;
  const video = (n, alt, legenda) => `<figure class="legendada"><div class="tela-video"><video muted loop playsinline preload="none" width="540" height="1168" poster="../img/${id}/video-${n}-capa.webp" data-src="../video/${id}/${n}.mp4" aria-label="${esc(tk(alt))}"></video></div>${legenda ? `<figcaption>${t(legenda)}</figcaption>` : ''}</figure>`;
  const ck = CHECKOUT[id] || '#checkout-pendente';
  const botao = micro => `<div class="cta"><a class="btn" href="${esc(ck)}" data-checkout="${id}">${t(T.botao)}</a><p class="micro">${t(micro)}</p></div>`;
  // seção em três partes: texto, mídia, fecho do texto. No celular nessa ordem; no computador, texto e fecho de um lado e mídia do outro
  const sec3 = (cls, a, midia, b, inverte) => `<section class="${cls}"><div class="wrap tri${inverte ? ' inv' : ''}"><div class="ta">${a}</div><div class="tm">${midia}</div><div class="tb">${b}</div></div></section>`;
  const sec = (cls, corpo, midia, inverte) => `<section class="${cls}"><div class="wrap grade${inverte ? ' inv' : ''}"><div class="texto">${corpo}</div><div class="midia">${midia}</div></div></section>`;

  const rastreio = (RASTREIO.pixel ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${RASTREIO.pixel}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${RASTREIO.pixel}&ev=PageView&noscript=1"></noscript>` : '<!-- RASTREIO PENDENTE: pixel da oferta (Meta, compartilhado com a Conta 01). Preencher RASTREIO.pixel em _fonte/gerar.mjs. -->')
    + '\n' + (RASTREIO.painel ? `<script async src="https://painel.labofertas.com/api/lp/script?k=${RASTREIO.painel}"></script>` : '<!-- RASTREIO PENDENTE: script de visitas do painel labofertas. Preencher RASTREIO.painel em _fonte/gerar.mjs. -->');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t(T.marca + " · {R}")}</title>
<meta name="description" content="${esc(tk(T.hero.sub))}">
<link rel="icon" type="image/svg+xml" href="../img/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="../img/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="../img/apple-touch-180.png">
<link rel="preload" as="image" imagesrcset="../img/${id}/hero-celular-720.webp 720w, ../img/${id}/hero-celular-880.webp 880w, ../img/${id}/hero-celular-1080.webp 1080w" imagesizes="${SIZES_HERO}" fetchpriority="high">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">
${rastreio}
<link rel="stylesheet" href="../estilo.css">
</head>
<body>
<header class="barra"><div class="wrap"><img src="../img/icone-64.png" width="28" height="28" alt=""><span>${t(T.marca)}</span></div></header>
<main>
<section class="hero"><div class="wrap hero-grade">
 <div class="texto">
  <p class="chapeu">${t(r.chapeu)}</p>
  <h1>${t(T.hero.h1)}</h1>
  <p class="sub">${t(T.hero.sub)}</p>
 </div>
 <div class="midia"><img class="celular" src="../img/${id}/hero-celular-1080.webp" srcset="../img/${id}/hero-celular-720.webp 720w, ../img/${id}/hero-celular-880.webp 880w, ../img/${id}/hero-celular-1080.webp 1080w" sizes="${SIZES_HERO}" width="${m['hero-celular'][0]}" height="${m['hero-celular'][1]}" alt="${esc(tk('Tela Hoje do app: {C} no Tapetinho, dia 5 de 21'))}" fetchpriority="high" decoding="async"></div>
 ${botao(T.hero.micro)}
</div></section>

${sec('s-dor', `<h2>${t(r.dor)}</h2><p>${t(T.dor.p)}</p>`,
  fig('casos', 'Tela Agora, xixi: os casos rasga o tapetinho, faz do lado, erra de dia e acerta à noite', T.dor.legenda))}

${sec3('s-dia claro', `<h2>${t(T.dia.h2)}</h2>${T.dia.itens.map(i => `<p>${t(i)}</p>`).join('')}`,
  video('dia', 'Gravação do app: o dia 5 começa, o relógio conta 3 minutos, Feito, e o dia 6 aparece para amanhã', T.dia.legenda),
  `<p class="plano-linha">${t(T.dia.plano)}</p>`, true)}

${sec3('s-xixi', `<h2>${t(T.xixi.h2)}</h2>${T.xixi.itens.map(i => `<p>${t(i)}</p>`).join('')}`,
  `<div class="pilha">${shot('diario', 'Diário do xixi: os dois botões e o gráfico por horário dos últimos 7 dias')}<p class="menor">${t(T.xixi.menor)}</p></div>`,
  botao(T.xixi.micro))}

<section class="s-raca claro"><div class="wrap raca-grade">
 <div class="ra">
  <h2>${t(T.raca.h2)}</h2><p>${t(T.raca.p.replace('{corpo}', r.corpo))}</p>
 </div>
 <div class="rm1">${shot('comandos', 'Tela Comandos: os 7 cartões desenhados com um {R}', 'alto')}</div>
 <div class="rb"><ul class="lista-ok">${r.lista5.map(i => `<li>${t(i)}</li>`).join('')}</ul></div>
 <div class="rm2">${shot('nota-raca', 'O ajuste do {R} dentro do app')}</div>
 <div class="rc"><p class="menor">${t(T.raca.menor)}</p></div>
</div></section>

${sec('s-agora', `<h2>${t(T.agora.h2)}</h2><p>${t(T.agora.p)}</p>`,
  video('agora', 'Gravação do app: tela Agora, toque em Late demais e o que fazer agora aparece'))}

<section class="s-vem claro"><div class="wrap">
 <h2 class="centro">${t(T.vem.h2)}</h2>
 <ul class="lista-ok colunas">${T.vem.itens.map((i, k) => `<li${k === 7 ? ' class="bonus"' : ''}>${t(i)}</li>`).join('')}</ul>
 ${fig('kit', 'Kit para imprimir: o calendário dos 21 dias com o nome do cão', T.vem.legenda, 'largo')}
</div></section>

<section class="s-oferta" id="oferta"><div class="wrap tri caixa-oferta">
 <div class="ta"><h2>${t(T.oferta.h2)}</h2>
  <div class="preco-bloco"><p class="lancamento">${t(T.oferta.lancamento)}</p><p class="preco-linha">de <s><span class="sr">preço cheio </span>${t(T.oferta.de)}</s> <strong>${t(T.oferta.por)}</strong></p></div>
  ${T.oferta.itens.map(i => `<p>${t(i)}</p>`).join('')}</div>
 <div class="tm">${fig('ficha', 'A ficha do cão: a foto, o nome, e o aviso de que ficam só no celular', T.oferta.legenda)}</div>
 <div class="tb">${botao(T.oferta.micro)}</div>
</div></section>

<section class="s-faq claro"><div class="wrap estreito"><h2 class="centro">Dúvidas</h2>
${T.faq.map(([q, a]) => `<details><summary>${t(q)}</summary><p>${t(a)}</p></details>`).join('\n')}
<div class="fecho centro"><p class="fecho-linha"><strong>${t(T.fecho.linha)}</strong></p>${botao(T.fecho.micro)}</div>
</div></section>
</main>
<footer><div class="wrap">
 <p class="aviso">${t(T.fecho.aviso)}</p>
 <p><strong>${t(T.rodape.marca)}</strong> · <a href="mailto:${T.rodape.email}">${T.rodape.email}</a></p>
 <p class="links"><a href="../privacidade/">Privacidade</a> · <a href="../termos/">Termos de uso</a></p>
</div></footer>
<div class="barra-compra" aria-hidden="true" inert><div class="dentro"><p class="preco-bc"><strong>R$ 37</strong> uma vez só</p><a class="btn" href="${esc(ck)}" data-checkout="${id}" tabindex="-1">${t(T.botao)}</a></div></div>
<script>
/* repassa a query (UTMs e fbclid) para o checkout */
(function(){var q=location.search.slice(1);if(!q)return;document.querySelectorAll('a[data-checkout]').forEach(function(a){if(!/^https?:/.test(a.getAttribute('href')))return;a.href+=(a.href.indexOf('?')<0?'?':'&')+q;});})();
/* barra de compra fixa: aparece quando nenhum dos botões principais está na tela, some quando algum aparece.
   O hero inteiro conta como botão (o do hero fica abaixo do celular): enquanto o hero está na tela, a barra não entra */
(function(){var bar=document.querySelector('.barra-compra'),vis=new Set();if(!bar||!('IntersectionObserver' in window))return;
var alvos=[document.querySelector('.hero')].concat([].slice.call(document.querySelectorAll('main .cta .btn')));
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)vis.add(e.target);else vis.delete(e.target);});var on=vis.size===0;
bar.classList.toggle('on',on);bar.inert=!on;bar.setAttribute('aria-hidden',String(!on));bar.querySelector('a').tabIndex=on?0:-1;});
alvos.forEach(function(a){if(a)io.observe(a);});})();
/* gravações do app: carregam e tocam só quando aparecem na tela (mudas, em loop) */
(function(){var vs=document.querySelectorAll('video[data-src]');if(!('IntersectionObserver' in window)){vs.forEach(function(v){v.src=v.dataset.src;});return;}
var io=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting){if(!v.src){v.src=v.dataset.src;}v.play().catch(function(){});}else if(v.src){v.pause();}});},{rootMargin:'200px 0px'});
vs.forEach(function(v){io.observe(v);});})();
</script>
</body>
</html>
`;
  ok(!/\u2014/.test(html), 'travessão na página ' + id);
  ok(!/\{(R|C|oC|OC)\}/.test(html), 'marcador sobrando em ' + id);
  return html;
}

for (const id of Object.keys(racas)) {
  fs.mkdirSync(path.join(SITE, id), { recursive: true });
  fs.writeFileSync(path.join(SITE, id, 'index.html'), pagina(id));
}

// páginas simples: raiz (escolher a raça), privacidade e termos
const simples = (titulo, corpo, raiz) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title><link rel="icon" type="image/png" sizes="32x32" href="${raiz}img/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${raiz}estilo.css"></head>
<body><header class="barra"><div class="wrap"><img src="${raiz}img/icone-64.png" width="28" height="28" alt=""><span>No Tapetinho</span></div></header>
<main><section><div class="wrap estreito simples">${corpo}</div></section></main>
<footer><div class="wrap"><p><strong>No Tapetinho</strong> · <a href="mailto:contato@notapetinho.com">contato@notapetinho.com</a></p></div></footer></body></html>
`;
fs.writeFileSync(path.join(SITE, 'index.html'), simples('No Tapetinho', `<h1>No Tapetinho</h1><ul class="escolha">${Object.entries(racas).map(([id, r]) => `<li><a href="${id}/"><img src="img/${id}/hero-celular-720.webp" width="120" height="${Math.round(120 * MED[id]['hero-celular'][1] / MED[id]['hero-celular'][0])}" alt="" loading="lazy">${esc(r.R)}</a></li>`).join('')}</ul>`, ''));
fs.mkdirSync(path.join(SITE, 'privacidade'), { recursive: true });
fs.mkdirSync(path.join(SITE, 'termos'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'privacidade', 'index.html'), simples('Privacidade · No Tapetinho', fs.readFileSync(path.join(AQUI, 'privacidade.html'), 'utf8'), '../'));
fs.writeFileSync(path.join(SITE, 'termos', 'index.html'), simples('Termos de uso · No Tapetinho', fs.readFileSync(path.join(AQUI, 'termos.html'), 'utf8'), '../'));
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
console.log('ok:', Object.keys(racas).join(', '), '| checkout:', Object.values(CHECKOUT).some(Boolean) ? 'ligado' : 'PENDENTE', '| rastreio:', RASTREIO.pixel && RASTREIO.painel ? 'ligado' : 'PENDENTE');
