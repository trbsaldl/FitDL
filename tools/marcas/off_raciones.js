// Raciones reales de los productos de marca que tenían la genérica «1 ración = 100 g».
// Fuente: la ración que declara el fabricante en Open Food Facts (serving_quantity / serving_size, licencia ODbL),
// de la caché de tools/marcas/cache_off (incluida cache_off/raciones_extra.json, pedida con solo esos campos).
// Sin ración oficial, o si la oficial es «100 g» (es la referencia, no una ración), se deja como estaba: no se inventa.
// Uso: node tools/marcas/off_raciones.js  →  tools/marcas/raciones.json  { código: [gramos, singular, plural] }
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'cache_off');
const S = {};
for (const f of fs.readdirSync(dir)) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    const L = j.products || (Array.isArray(j) ? j : null);
    if (L) { for (const p of L) if (p && p.code && +p.serving_quantity > 0) S[String(p.code)] = { q: +p.serving_quantity, s: p.serving_size || '' }; }
    else for (const [c, v] of Object.entries(j)) if (v && +v.q > 0 && !S[c]) S[c] = { q: +v.q, s: v.s || '' };
}
// Unidad en español a partir de lo que escribe el fabricante (en cualquier idioma habitual en Open Food Facts)
const UNITS = [
    [/slices?|rebanadas?|tranches?|fette?a?\b/, 'rebanada', 'rebanadas'], [/cookies?|biscuits?|galletas?|\[image of an oreo/, 'galleta', 'galletas'],
    [/lonchas?/, 'loncha', 'lonchas'], [/scoops?|cacitos?/, 'cacito', 'cacitos'], [/tbsp|cucharadas?\b|cuillères? à soupe/, 'cucharada', 'cucharadas'],
    [/teaspoons?|tsp|cucharaditas?/, 'cucharadita', 'cucharaditas'], [/squares?|onzas?/, 'onza', 'onzas'], [/bagels?/, 'bagel', 'bagels'],
    [/quesitos?/, 'quesito', 'quesitos'], [/tortitas?/, 'tortita', 'tortitas'], [/tortillas?/, 'tortilla', 'tortillas'],
    [/yogur|pots?\b|vaschetta|tarrinas?/, 'tarrina', 'tarrinas'], [/\bbars?\b|barritas?|sticks?|palitos?/, 'barrita', 'barritas'],
    [/\bbags?\b|bolsas?|zakje|flowpack/, 'bolsa', 'bolsas'], [/\bcups?\b|tazas?\b/, 'taza', 'tazas'], [/bowl|\bbol\b/, 'bol', 'boles'],
];
const ex = f => fs.existsSync(path.join(__dirname, f)) ? JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')) : [];
const M = ['marcas.json', 'marcas_v3.json', 'marcas_v4.json', 'marcas_v5.json', 'marcas_v6.json', 'marcas_v7.json', 'marcas_v8.json', 'marcas_v9.json'].flatMap(ex);
const out = {}, motivo = { sinDato: 0, es100: 0, fueraDeRango: 0 };
for (const m of M) {
    if (!m.serv || m.serv[0] !== 100 || m.serv[1] !== 'ración') continue;
    const x = S[String(m.off)];
    if (!x) { motivo.sinDato++; continue; }
    if (Math.round(x.q) === 100) { motivo.es100++; continue; }
    // Menos de 5 g suele ser un error de la ficha; más de 350 g (500 ml en bebidas) suele ser el envase entero, no una ración
    if (x.q < 5 || x.q > (m.ml ? 500 : 350)) { motivo.fueraDeRango++; continue; }
    // Polvos, salsas y condimentos: una ración no pasa de 60 g (más es el bote o el batido ya preparado). Cereales: no menos de 20 g
    const nombre = m.label.toLowerCase();
    if (/whey|prote[ií]na|cacao|nesquik|cola ?cao|sirope|salsa|vinagre|barbe?c?que|barbacoa|ketchup|mayonesa|mostaza|aceite|harina|az[uú]car|ch[ií]a|semillas/.test(nombre) && x.q > 60) { motivo.fueraDeRango++; continue; }
    if (/cereales|muesli|granola|copos/.test(nombre) && x.q < 20) { motivo.fueraDeRango++; continue; }
    const s = String(x.s).toLowerCase(), u = UNITS.find(([re]) => re.test(s));
    const n = u ? Math.max(1, Math.min(20, parseFloat((s.match(/^\s*(\d+(?:[.,]\d+)?)/) || [0, '1'])[1].replace(',', '.')) || 1)) : 1;
    const g = Math.round(x.q / n * 10) / 10;
    // Sin unidad en la ficha: la del nombre, si la ración es de una sola pieza
    const porNombre = [[/galleta|cookie|oreo/, 25, 'galleta', 'galletas'], [/pan de molde|pan tostado|biscote|tostada/, 50, 'rebanada', 'rebanadas'], [/lonchas/, 40, 'loncha', 'lonchas'], [/tortitas/, 15, 'tortita', 'tortitas']]
        .find(([re, max]) => re.test(nombre) && x.q <= max);
    out[String(m.off)] = porNombre ? [Math.round(x.q * 10) / 10, porNombre[2], porNombre[3]] : u && g >= 5 ? [g, u[1], u[2]] : [Math.round(x.q * 10) / 10, 'ración', 'raciones'];
}
fs.writeFileSync(path.join(__dirname, 'raciones.json'), JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"'));
console.log(Object.keys(out).length, 'raciones reales ·', 'se quedan en 100 g:', JSON.stringify(motivo));
