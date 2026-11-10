// Mete tools/genericos/usda.json (SR Legacy), platos.json (FNDDS, platos de España y Latinoamérica) e icbf.json (Tabla de Composición de Alimentos Colombianos, ICBF 2018) en js/data/foods.js, entre // <usda> y // </usda> (justo antes de las marcas).
// Las kcal NO se fijan: la app las calcula como en las etiquetas europeas (4·P + 4·HC + 9·G + 2·fibra).
// Uso: node tools/genericos/embed.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const file = path.join(__dirname, '..', '..', 'js', 'data', 'foods.js');
let js = fs.readFileSync(file, 'utf8');
const re = /\/\/ <usda>[\s\S]*?\/\/ <\/usda>\n/;
const base = js.replace(re, '');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(base + ';this.FOODS=FOODS', ctx);
const ids = new Set(ctx.FOODS.map(f => f.id));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const names = new Set(ctx.FOODS.filter(f => !f.brand).map(f => norm(f.name)));
const U = ['usda.json', 'platos.json', 'icbf.json', 'usda_v2.json', 'usda_v3.json', 'platos_v3.json'].filter(f => fs.existsSync(path.join(__dirname, f))).flatMap(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const rows = [], skip = [];
for (const u of U) {
    let id = 'u_' + u.id;
    if (ids.has(id)) { skip.push(id + ' (id repetido)'); continue; }
    if (names.has(norm(u.name))) { skip.push(u.name + ' (ya existe)'); continue; }
    ids.add(id); names.add(norm(u.name));
    const tok = u.flags.split(/\s+/), x = {};
    if (tok.includes('raw')) x.raw = 1;
    if (tok.includes('ml')) x.ml = 1;
    if (u.sug != null) x.sug = u.sug; // azúcares del USDA (nutriente 2000); si no hay dato, no se pone
    if (u.fdc) x.fdc = u.fdc;
    if (u.icbf) { x.icbf = u.icbf; x.kcal = u.kcal; } // código de la tabla del ICBF (o la receta con sus códigos) y su energía oficial
    const flags = tok.filter(t => t !== 'raw' && t !== 'ml').join('');
    rows.push(`D(${JSON.stringify(id)}, ${JSON.stringify(u.name)}, '${u.cat}', ${u.p}, ${u.f}, ${u.c}, ${u.fib}, ${JSON.stringify(u.serv)}, '', '${flags}', ${JSON.stringify(x)});`);
}
const block = `// <usda> (lo genera tools/genericos/embed.js · USDA FoodData Central: SR Legacy y FNDDS, dominio público · ICBF: Tabla de Composición de Alimentos Colombianos 2018 · ${new Date().toISOString().slice(0, 10)})
// Alimentos crudos y cocinados con su ficha oficial (fdc = ficha del USDA · icbf = código de la tabla colombiana). HC sin fibra, como las etiquetas de la UE.
${rows.join('\n')}
// </usda>
`;
if (!/\/\/ <marcas>/.test(base)) { console.log('Falta el marcador // <marcas>'); process.exit(1); }
fs.writeFileSync(file, base.replace('// <marcas>', block + '// <marcas>'));
console.log(rows.length, 'genéricos USDA incluidos ·', skip.length, 'omitidos:', skip.join(', '));
