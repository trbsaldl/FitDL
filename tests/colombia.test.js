// Alimentos y palabras de Colombia: «papa», «jugo», «banano»… encuentran los nombres escritos como en España. Uso: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

function loadApp() {
    const noop = () => { }, store = {};
    const el = new Proxy({}, { get: (t, k) => k === 'classList' ? { add: noop, remove: noop, toggle: noop, contains: () => false } : (k === 'style' || k === 'dataset') ? {} : noop });
    const ctx = { console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
        window: { addEventListener: noop }, navigator: {}, location: { protocol: 'file:', hostname: '', search: '' }, matchMedia: () => ({ matches: false }),
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: { style: {} } } };
    vm.createContext(ctx);
    for (const f of ['data/lang-en', 'data/foods-en', 'i18n', 'core', 'data/foods', 'data/foods-marcas', 'data/exercises', 'calc', 'analytics', 'progress', 'engine', 'parser', 'insights', 'gym', 'diary', 'profiles']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
    }
    return code => vm.runInContext(code, ctx);
}

test('Colombia: el buscador entiende papa, jugo, banano, arveja, habichuela, ahuyama, arequipe y carne molida', () => {
    const run = loadApp();
    const first = q => run(`searchFoods(${JSON.stringify(q)})[0].name`);
    assert.match(first('papa cocida'), /^Patata cocida/);
    assert.match(first('jugo de naranja'), /^Zumo de naranja/);
    assert.match(first('banano'), /^Plátano$/);
    assert.match(first('arveja'), /^Guisantes/);
    assert.match(first('habichuela'), /^Judías verdes/);
    assert.match(first('ahuyama'), /^Calabaza/);
    assert.match(first('arequipe'), /^Dulce de leche/);
    assert.match(first('carne molida'), /^Carne picada vacuno/);
});

test('Colombia: el lector de frases apunta lo que se dice en Colombia', () => {
    const run = loadApp();
    const one = q => run(`(() => { const it = parseFoodText(${JSON.stringify(q)}).items[0]; return it.food.name + ' ' + it.g; })()`);
    assert.match(one('un vaso de jugo de naranja'), /^Zumo de naranja/);
    assert.match(one('200 g de papa cocida'), /^Patata cocida 200$/);
    assert.match(one('un banano'), /^Plátano \d+$/);
    assert.match(one('un patacón'), /^Patacón/);
    assert.match(one('un plato de sopa de mondongo'), /^Sopa de mondongo 400$/);
});

test('Colombia: los alimentos nuevos tienen ficha oficial del USDA y nombre en inglés', () => {
    const run = loadApp();
    const ids = ['u_lulo', 'u_guanabana', 'u_uchuva', 'u_patacon', 'u_sopa_mondongo', 'u_morcilla', 'u_sobrebarriga', 'u_pitahaya', 'u_chicharron_cerdo', 'u_chocolate_leche'];
    for (const id of ids) {
        const f = JSON.parse(run(`JSON.stringify(FOODS.find(x => x.id === ${JSON.stringify(id)}) || null)`));
        assert.ok(f, id + ' existe');
        assert.ok(f.fdc > 0, id + ' con ficha del USDA');
        assert.ok(run(`FOOD_EN[${JSON.stringify(id)}]`), id + ' con nombre en inglés');
    }
});
