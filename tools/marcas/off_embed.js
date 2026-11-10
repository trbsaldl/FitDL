// Mete marcas.json (generado por off_build.js) en js/data/foods-marcas.js, entre los marcadores // <marcas> y // </marcas>
// Uso: node tools/marcas/off_embed.js
// Proceso completo para añadir productos: off_fetch.js → off_fetch2.js → off_build.js (valida kcal y rangos) → off_embed.js
// 3.6: azúcares de la etiqueta (campo «sug» de cada lista o, para las listas antiguas, marcas_azucar.json de off_azucar.js)
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', '..', 'js', 'data', 'foods-marcas.js');
// marcas.json (la base de siempre) va primero para que sus ids no cambien; detrás, por orden de llegada:
// marcas_v3.json (3.4), marcas_v4.json (3.5, añadidos a mano y comprobados) , marcas_v5.json (3.6, proteínas y despensa), marcas_v6.json (3.6, bebidas) marcas_v7.json (3.15, los más escaneados en España, revisados a mano) marcas_v8.json (3.21, Mercadona y frutos secos) y marcas_v9.json (3.25, panes, pastas, galletas y bollos)
const extra = f => fs.existsSync(path.join(__dirname, f)) ? JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')) : [];
const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'marcas.json'), 'utf8')).concat(extra('marcas_v3.json'), extra('marcas_v4.json'), extra('marcas_v5.json'), extra('marcas_v6.json'), extra('marcas_v7.json'), extra('marcas_v8.json'), extra('marcas_v9.json'));
// 3.31: raciones reales del fabricante (off_raciones.js) para los que tenían la genérica «1 ración = 100 g»
const RAC = fs.existsSync(path.join(__dirname, 'raciones.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'raciones.json'), 'utf8')) : {};
const AZ = fs.existsSync(path.join(__dirname, 'marcas_azucar.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'marcas_azucar.json'), 'utf8')) : {};
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const seen = new Set();
const rows = M.map(m => {
    let id = 'm_' + slug(m.brand).slice(0, 10) + '_' + slug(m.label).slice(0, 24);
    while (seen.has(id)) id += '2';
    seen.add(id);
    let sug = m.sug != null ? m.sug : AZ[String(m.off)];
    sug = sug != null && sug >= 0 ? Math.min(sug, m.c) : null; // nunca más azúcar que hidratos; sin dato = null (no un 0)
    // [id, nombre, marca, kcal, P, HC, G, fibra, [ración g, nombre, plural], emoji, ml, crudo, código de barras, azúcares]
    const serv = m.serv && m.serv[0] === 100 && m.serv[1] === 'ración' && RAC[String(m.off)] ? RAC[String(m.off)] : m.serv;
    return JSON.stringify([id, m.label, m.brand, m.kcal, m.p, m.c, m.f, m.fib, serv, m.em, m.ml, m.raw, m.off, sug]);
});
const block = `// <marcas> (lo genera tools/marcas/off_embed.js · datos: Open Food Facts, licencia ODbL · ${new Date().toISOString().slice(0, 10)})
const BRAND_FOODS = [
    ${rows.join(',\n    ')}
];
BRAND_FOODS.forEach(([id, name, brand, kcal, p, c, f, fib, serv, em, ml, raw, off, sug]) => {
    const role = p * 4 >= Math.max(c * 4, f * 9) ? 'protein' : f * 9 > c * 4 ? 'fat' : 'carb';
    FOODS.push({ id, name, brand, cat: 'marca', role, meals: 'BSLD', p, f, c, fib, kcal, min: 0, max: 0, flags: '', diaryOnly: 1, serv, em, ...(ml ? { ml: 1 } : {}), ...(raw ? { raw: 1 } : {}), off, ...(sug != null ? { sug } : {}) });
});
// </marcas>`;
let js = fs.readFileSync(file, 'utf8');
const re = /\/\/ <marcas>[\s\S]*?\/\/ <\/marcas>/;
if (!re.test(js)) { console.log('No están los marcadores // <marcas> … // </marcas> en js/data/foods-marcas.js'); process.exit(1); }
fs.writeFileSync(file, js.replace(re, () => block));
console.log(`${rows.length} productos de marca incluidos en js/data/foods-marcas.js · ${rows.filter(r => !/,null\]$/.test(r)).length} con azúcares`);
