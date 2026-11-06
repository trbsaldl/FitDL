// Genera las páginas públicas «Calorías de…» (una por alimento con fuente comprobable) en alimentos/,
// el índice alimentos/index.html y sitemap.xml. Los números salen de js/data/foods.js, igual que en la app.
// Solo entran los alimentos con fuente por producto: etiqueta (Open Food Facts), USDA, ICBF o web oficial del restaurante.
// Uso: npm run seo   (no hace falta conexión; no toca la app)
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const SITE = 'https://trbsaldl.github.io/FitDL/';
const OUT = path.join(root, 'alimentos');
const TODAY = new Date().toISOString().slice(0, 10);

// La base se ejecuta en una caja aislada (sin acceso a require, process ni archivos): solo devuelve FOODS
const leerDatos = f => fs.readFileSync(path.join(root, 'js', 'data', f), 'utf8');
const FOODS = require('vm').runInNewContext(leerDatos('foods.js') + '\n' + leerDatos('foods-marcas.js') + '\n;FOODS', Object.create(null), { timeout: 5000 });
const kcal100 = f => f.kcal != null ? f.kcal : 4 * f.p + 9 * f.f + 4 * f.c + 2 * f.fib + 7 * (f.alc || 0);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('es-ES', { maximumFractionDigits: d });
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/®|™/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const CAT = {
    prot: 'Carnes, pescados y huevos', vprot: 'Proteína vegetal', lacteo: 'Lácteos', hc: 'Cereales, pan, pasta y patata',
    legum: 'Legumbres', verdura: 'Verduras y hortalizas', fruta: 'Frutas', grasa: 'Aceites, frutos secos y grasas',
    bebida: 'Bebidas', platos: 'Platos preparados',
};
const fullName = f => f.brand ? `${f.name} ${f.brand}` : f.name;
const source = f => {
    if (f.off) return { t: 'Datos de la etiqueta del producto en Open Food Facts (licencia ODbL)', u: `https://world.openfoodfacts.org/product/${f.off}` };
    if (f.fdc) return { t: 'USDA FoodData Central (dominio público)', u: `https://fdc.nal.usda.gov/food-details/${f.fdc}/nutrients` };
    if (f.icbf) return { t: `Tabla de Composición de Alimentos Colombianos (ICBF), código ${f.icbf}`, u: '' };
    const dom = String(f.src).split(' ')[0];
    return { t: `Información nutricional oficial publicada en ${f.src}`, u: `https://www.${dom}/` };
};

// Solo alimentos con fuente comprobable
const list = FOODS.filter(f => f.off || f.fdc || f.icbf || f.src);
const used = new Set();
for (const f of list) { let s = slug(fullName(f)) || f.id; const b = s; let i = 2; while (used.has(s)) s = `${b}-${i++}`; used.add(s); f._slug = s; }

const CSP = "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'self'; form-action 'none'";
const STYLE = `/* Generado por tools/seo/paginas.js: estilos de las páginas «Calorías de…» */
.kcal { font: 600 3.4rem/1 'Newsreader', Georgia, serif; color: #faf7f3; margin: 18px 0 2px; }
.kcal small { font: 600 1rem 'Plus Jakarta Sans', sans-serif; color: #aea396; }
table { width: 100%; border-collapse: collapse; margin: 14px 0; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #2a231c; }
th { color: #aea396; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
td + td, th + th { text-align: right; }
td + td { white-space: nowrap; }
.bar { display: flex; height: 12px; border-radius: 99px; overflow: hidden; margin: 10px 0 6px; background: #2a231c; }
.bar span:nth-child(1) { background: #a0714b; } .bar span:nth-child(2) { background: #e6d3b3; } .bar span:nth-child(3) { background: #f59e0b; }
.cta { display: block; text-align: center; margin: 26px 0; padding: 16px; border-radius: 16px; background: #9a6b40; color: #fff; font-weight: 800; text-decoration: none; }
.cta:hover { background: #855c36; color: #fff; }
.rel { list-style: none; padding: 0; display: grid; gap: 8px; }
.rel li { margin: 0; } .rel a { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; padding: 12px 14px; border-radius: 12px; background: #1a1612; text-decoration: none; }
.rel span { color: #aea396; white-space: nowrap; }
.idx { columns: 2 16rem; column-gap: 24px; padding-left: 1em; } .idx li { break-inside: avoid; }
nav.toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; } nav.toc a { padding: 6px 10px; border-radius: 99px; background: #1a1612; text-decoration: none; font-size: .9rem; }`;

const page = ({ title, desc, canonical, body, ld }) => `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="${CSP}">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${canonical}">
    <meta name="theme-color" content="#110f0d">
    <link rel="icon" href="../icons/icon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="../css/fonts.css">
    <link rel="stylesheet" href="../css/legal.css">
    <link rel="stylesheet" href="alimentos.css">
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<main>
${body}
    <p class="note">FitDL es una herramienta educativa y orientativa: no sustituye el consejo de un médico o dietista-nutricionista. Los fabricantes cambian sus recetas: comprueba siempre la etiqueta. <a href="../privacidad.html">Privacidad</a> · <a href="../terminos.html">Términos</a></p>
</main>
</body>
</html>
`;
const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });

// Alimentos parecidos: misma marca (o misma categoría si es genérico), los de calorías más cercanas
const groupKey = f => f.brand ? 'b:' + f.brand : 'c:' + f.cat;
const groups = {};
for (const f of list) (groups[groupKey(f)] = groups[groupKey(f)] || []).push(f);
// Orden: comparten palabras del nombre (carne, picada…) → mismo tipo (proteína/hidratos/grasa) → calorías parecidas
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'en', 'al', 'y', 'a', 'para', 'por', 'cruda', 'crudo', 'hecha', 'hecho']);
const words = f => new Set(slug(f.name).split('-').filter(w => w.length > 2 && !STOP.has(w)));
const related = f => {
    const w = words(f), k = kcal100(f);
    const score = x => { let s = 0; for (const t of words(x)) if (w.has(t)) s += 1000; if (x.role === f.role) s += 300; return s - Math.abs(kcal100(x) - k); };
    return groups[groupKey(f)].filter(x => x !== f).map(x => [x, score(x)]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([x]) => x);
};

// Notas propias de cada ficha, calculadas con sus datos (contenido único, no solo la plantilla con otros números).
// Semáforo de la FSA / Department of Health (Reino Unido, guía de etiquetado frontal de 2016), por 100 g o 100 ml.
const FSA = { solid: { fat: [3, 17.5], sug: [5, 22.5] }, liquid: { fat: [1.5, 8.75], sug: [2.5, 11.25] } };
const protPer100kcal = f => kcal100(f) > 0 ? f.p / kcal100(f) * 100 : 0;
const notes = f => {
    const out = [], L = f.ml ? FSA.liquid : FSA.solid, u = f.ml ? '100 ml' : '100 g';
    const fsa = (v, [lo, hi], what) => v > hi ? `Alto en ${what} según el semáforo nutricional de la FSA (más de ${num(hi)} g por ${u}).`
        : v <= lo ? `Bajo en ${what} según el semáforo nutricional de la FSA (${num(lo)} g o menos por ${u}).` : null;
    const g = fsa(f.f, L.fat, 'grasas'); if (g) out.push(g);
    if (f.sug != null) { const s = fsa(f.sug, L.sug, 'azúcares'); if (s) out.push(s); }
    const grp = groups[groupKey(f)].filter(x => kcal100(x) >= 20);
    if (grp.length >= 8 && kcal100(f) >= 20) {
        const mine = protPer100kcal(f), below = grp.filter(x => protPer100kcal(x) < mine).length, p = Math.round(below / (grp.length - 1) * 100);
        const quien = f.brand ? `los productos de ${f.brand}` : `«${CAT[f.cat] || 'su grupo'}»`;
        if (p >= 75) out.push(`Da ${num(mine)} g de proteína por cada 100 kcal: más que el ${p} % de ${quien} de esta lista.`);
        else if (p <= 25 && mine < 4) out.push(`Da ${num(mine)} g de proteína por cada 100 kcal, de las más bajas entre ${quien} de esta lista.`);
    }
    return out;
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'alimentos.css'), STYLE.trim() + '\n');
for (const old of fs.readdirSync(OUT)) if (old.endsWith('.html')) fs.unlinkSync(path.join(OUT, old)); // páginas generadas: se rehacen enteras

for (const f of list) {
    const k = kcal100(f), unit = f.ml ? 'ml' : 'g', [sg, s1] = f.serv || [100, 'ración'];
    const r = sg / 100, name = fullName(f), url = `${SITE}alimentos/${f._slug}.html`;
    const pk = f.p * 4, ck = f.c * 4, fk = f.f * 9, tot = (pk + ck + fk) || 1;
    const pct = v => Math.round(v / tot * 100);
    const rows = [['Energía', `${num(k, 0)} kcal`, `${num(k * r, 0)} kcal`], ['Proteína', `${num(f.p)} g`, `${num(f.p * r)} g`],
        ['Hidratos de carbono', `${num(f.c)} g`, `${num(f.c * r)} g`], ...(f.sug != null ? [['  de los cuales azúcares', `${num(f.sug)} g`, `${num(f.sug * r)} g`]] : []),
        ['Grasas', `${num(f.f)} g`, `${num(f.f * r)} g`], ['Fibra', `${num(f.fib)} g`, `${num(f.fib * r)} g`]];
    const src = source(f), crumb = f.brand ? f.brand : CAT[f.cat] || 'Alimentos';
    const title = `Calorías de ${name}: ${num(k, 0)} kcal por 100 ${unit}`;
    const desc = `${name} tiene ${num(k, 0)} kcal por 100 ${unit}: ${num(f.p)} g de proteína, ${num(f.c)} g de hidratos y ${num(f.f)} g de grasa. 1 ${s1} (${sg} ${unit}) son ${num(k * r, 0)} kcal. Apúntalo gratis en FitDL.`;
    const body = `    <a class="back" href="./">← Calorías de los alimentos</a>
    <h1>Calorías de ${esc(name)}</h1>
    <p class="meta">${esc(crumb)}${f.raw ? ' · valores en crudo' : ''}</p>
    <p class="kcal">${num(k, 0)} <small>kcal por 100 ${unit}</small></p>
    <p>1 ${esc(s1)} (${sg} ${unit}) = <strong>${num(k * r, 0)} kcal</strong> y <strong>${num(f.p * r)} g de proteína</strong>.</p>
    <div class="bar" role="img" aria-label="Reparto de calorías: proteína ${pct(pk)} %, hidratos ${pct(ck)} %, grasas ${pct(fk)} %"><span style="width:${pct(pk)}%"></span><span style="width:${pct(ck)}%"></span><span style="width:${pct(fk)}%"></span></div>
    <p class="meta">De sus calorías: proteína ${pct(pk)} % · hidratos ${pct(ck)} % · grasas ${pct(fk)} %</p>
    ${notes(f).length ? `<ul>${notes(f).map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <h2>Información nutricional</h2>
    <table><thead><tr><th>Nutriente</th><th>Por 100 ${unit}</th><th>Por ${esc(s1)} (${sg} ${unit})</th></tr></thead>
    <tbody>${rows.map(([a, b, c]) => `<tr><td>${esc(a.trim())}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table>
    <p class="meta">Fuente: ${src.u ? `<a href="${src.u}" rel="nofollow noopener">${esc(src.t)}</a>` : esc(src.t)}. Hidratos sin fibra, como en las etiquetas de la UE.</p>
    <a class="cta" href="../?alimento=${encodeURIComponent(f.id)}">Apunta ${esc(f.name)} en FitDL · gratis y sin anuncios</a>
    ${related(f).length ? `<h2>Parecidos${f.brand ? ` de ${esc(f.brand)}` : ''}</h2>
    <ul class="rel">${related(f).map(x => `<li><a href="${x._slug}.html">${esc(fullName(x))}<span>${num(kcal100(x), 0)} kcal/100 ${x.ml ? 'ml' : 'g'}</span></a></li>`).join('')}</ul>` : ''}`;
    fs.writeFileSync(path.join(OUT, f._slug + '.html'), page({ title, desc, canonical: url, body,
        ld: crumbs([['FitDL', SITE], ['Calorías de los alimentos', SITE + 'alimentos/'], [name, url]]) }));
}

// Rankings con datos reales (playbook «curación»): búsquedas tipo «productos Mercadona con más proteína»
const solid = f => !f.ml;
const perServ = (f, v) => v * ((f.serv || [100])[0] / 100);
const RANKINGS = [
    { slug: 'hacendado-mas-proteina', title: 'Productos Hacendado con más proteína',
      intro: 'Los productos Hacendado (Mercadona) de esta lista con más proteína por cada 100 g, según su etiqueta.',
      pick: f => f.brand === 'Hacendado' && solid(f), val: f => f.p, show: f => `${num(f.p)} g proteína/100 g`, n: 25 },
    { slug: 'hacendado-proteina-por-caloria', title: 'Productos Hacendado con más proteína por caloría',
      intro: 'Para ganar músculo o perder grasa sin pasarte de calorías: los productos Hacendado que más proteína dan por cada 100 kcal.',
      pick: f => f.brand === 'Hacendado' && kcal100(f) >= 40 && f.p >= 5, val: protPer100kcal, show: f => `${num(protPer100kcal(f))} g proteína/100 kcal`, n: 25 },
    { slug: 'alimentos-mas-proteina', title: 'Alimentos con más proteína',
      intro: 'Alimentos básicos (sin marca) con más proteína por cada 100 g, con valores oficiales del USDA.',
      pick: f => !f.brand && solid(f), val: f => f.p, show: f => `${num(f.p)} g proteína/100 g`, n: 30 },
    { slug: 'comida-rapida-menos-calorias', title: 'Comida rápida con menos calorías por ración',
      intro: 'Platos de McDonald’s, Burger King y KFC con menos calorías por ración (raciones de 100 g o más; sin salsas ni bebidas), según la información nutricional oficial de cada cadena.',
      pick: f => f.fast && solid(f) && kcal100(f) > 0 && (f.serv || [0])[0] >= 100 && !/salsa|ketchup|mayonesa|ali[ñn]o|caf[eé]|capuchino|batido|sirope|zumo|refresco|bebida|don sim[oó]n|agua/i.test(f.name + " " + (f.brand || "")),
      val: f => -perServ(f, kcal100(f)), show: f => `${num(perServ(f, kcal100(f)), 0)} kcal/ración`, n: 25 },
    { slug: 'comida-rapida-mas-proteina', title: 'Comida rápida con más proteína por ración',
      intro: 'Si comes fuera y quieres llegar a tu proteína: lo que más proteína da por ración en McDonald’s, Burger King y KFC.',
      pick: f => f.fast, val: f => perServ(f, f.p), show: f => `${num(perServ(f, f.p))} g proteína/ración`, n: 25 },
];
for (const R of RANKINGS) {
    const items = list.filter(R.pick).sort((a, b) => R.val(b) - R.val(a)).slice(0, R.n);
    R.count = items.length; if (!items.length) continue;
    const url = `${SITE}alimentos/ranking-${R.slug}.html`;
    fs.writeFileSync(path.join(OUT, `ranking-${R.slug}.html`), page({
        title: `${R.title} · FitDL`, desc: `${R.intro} Top ${items.length} con calorías y fuente de cada dato.`, canonical: url,
        ld: crumbs([['FitDL', SITE], ['Calorías de los alimentos', SITE + 'alimentos/'], [R.title, url]]),
        body: `    <a class="back" href="./">← Calorías de los alimentos</a>
    <h1>${esc(R.title)}</h1>
    <p>${esc(R.intro)}</p>
    <ol class="rel">${items.map(x => `<li><a href="${x._slug}.html">${esc(fullName(x))}<span>${R.show(x)} · ${num(kcal100(x), 0)} kcal/100 ${x.ml ? 'ml' : 'g'}</span></a></li>`).join('')}</ol>
    <p class="meta">Calculado con los ${list.filter(R.pick).length} alimentos de la base de FitDL que cumplen el criterio (${TODAY}). Cada ficha enlaza a su fuente. No es una lista de todo el supermercado.</p>
    <a class="cta" href="../">Calcula tu plan y apunta lo que comes en FitDL · gratis y sin anuncios</a>` }));
}

// Índice: marcas (de más a menos productos) y alimentos genéricos por grupo
const brands = Object.entries(groups).filter(([g]) => g.startsWith('b:')).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'es'));
const cats = Object.keys(CAT).map(c => ['c:' + c, groups['c:' + c] || []]).filter(([, l]) => l.length);
const sec = ([g, l]) => { const t = g.startsWith('b:') ? g.slice(2) : CAT[g.slice(2)], id = slug(t);
    return { id, t, html: `<h2 id="${id}">${esc(t)} <span class="meta">(${l.length})</span></h2>
    <ul class="idx">${l.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map(x => `<li><a href="${x._slug}.html">${esc(x.name)}</a> · ${num(kcal100(x), 0)} kcal</li>`).join('')}</ul>` }; };
const secs = [...cats, ...brands].map(sec);
const idxTitle = `Calorías de ${list.length.toLocaleString('es-ES')} alimentos y productos de supermercado`;
fs.writeFileSync(path.join(OUT, 'index.html'), page({
    title: `${idxTitle} · FitDL`,
    desc: `Calorías, proteína, hidratos y grasas de ${list.length.toLocaleString('es-ES')} alimentos: productos Hacendado, marcas de supermercado, comida rápida y alimentos básicos. Datos con su fuente.`,
    canonical: SITE + 'alimentos/',
    ld: crumbs([['FitDL', SITE], ['Calorías de los alimentos', SITE + 'alimentos/']]),
    body: `    <a class="back" href="../">← FitDL</a>
    <h1>${esc(idxTitle)}</h1>
    <p>Valores por 100 g (o 100 ml) con la fuente de cada dato: la etiqueta del producto, el USDA o la información oficial del restaurante. Para llevar la cuenta de tu día, <a href="../">usa FitDL gratis</a>.</p>
    <h2>Listas</h2>
    <ul class="rel">${RANKINGS.filter(R => R.count).map(R => `<li><a href="ranking-${R.slug}.html">${esc(R.title)}<span>top ${R.count}</span></a></li>`).join('')}</ul>
    <nav class="toc" aria-label="Secciones">${secs.map(s => `<a href="#${s.id}">${esc(s.t)}</a>`).join('')}</nav>
${secs.map(s => s.html).join('\n')}`,
}));

// sitemap.xml
const urls = [[SITE, TODAY], [SITE + 'privacidad.html'], [SITE + 'terminos.html'], [SITE + 'alimentos/', TODAY], ...RANKINGS.filter(R => R.count).map(R => [`${SITE}alimentos/ranking-${R.slug}.html`, TODAY]), ...list.map(f => [`${SITE}alimentos/${f._slug}.html`])];
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
console.log(`${list.length} páginas en alimentos/ · índice · sitemap.xml con ${urls.length} direcciones`);
