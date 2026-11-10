// Uso de cada día en Coach, Nevera, Menú y Compra (3.32). Uso: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

function loadApp() {
    const store = {}, noop = () => { };
    const el = new Proxy({}, { get: (t, k) => k === 'classList' ? { add: noop, remove: noop, toggle: noop, contains: () => false } : (k === 'style' || k === 'dataset') ? {} : noop });
    const ctx = {
        console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, setInterval, clearInterval, Map, Set,
        window: { addEventListener: noop }, navigator: {}, location: { protocol: 'file:', hostname: '', search: '' }, matchMedia: () => ({ matches: false }),
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: { style: {} } },
    };
    vm.createContext(ctx);
    for (const f of ['data/lang-en', 'data/foods-en', 'i18n', 'core', 'data/foods', 'data/foods-marcas', 'data/exercises', 'calc', 'analytics', 'progress', 'engine', 'parser', 'insights', 'gym', 'diary', 'profiles', 'dashboard', 'plans', 'kitchen', 'coach', 'app']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
    }
    const run = code => vm.runInContext(code, ctx);
    run('toast = () => {}; renderMenuView = () => {}; renderShopView = () => {}; renderDashboard = () => {}; renderDiary = () => {}; afterLog = () => {}; checkAchievements = () => {}; needPro = () => false;');
    run("Object.assign(state, { gender: 'male', age: 30, height: 178, weight: 78, activity: 1.55, calcOk: true }); compute();");
    return { run, json: code => JSON.parse(run(`JSON.stringify(${code})`)) };
}

test('Próxima comida por la noche: si la cena ya empezó, se completa la cena y nunca más que una comida normal', () => {
    const { run, json } = loadApp();
    run("state.diary[todayISO()] = [{ id: 'a', slot: 'D', name: 'Galleta', g: 11, kcal: 53, p: 1, c: 8, f: 2 }]");
    const nm = json('nextMeal(todayISO(), 21)');
    const maxComida = json('calc.target * Math.max(...Object.values(SLOT_SHARE[myPrefs().meals]))');
    assert.equal(nm.slot, 'D', 'la cena, no «Otros»');
    assert.ok(nm.tg.kcal <= maxComida + 1, `no propone ${Math.round(nm.tg.kcal)} kcal de golpe (máx. ${Math.round(maxComida)})`);
});

test('Menú: lo «Añadido» es de un día; el menú de ayer se puede volver a apuntar hoy', () => {
    const { run, json } = loadApp();
    run("genMenu(); state.menu.added = [0, 1]; state.menu.addedDay = '2000-01-01'");
    run('menuNewDay()');
    assert.deepEqual(json('state.menu.added'), []);
    run('menuAdd(0)');
    assert.deepEqual(json('state.menu.added'), [0]);
    assert.equal(json('state.menu.addedDay'), json('todayISO()'));
});

test('Compra: una compra nueva de otro día empieza sin marcas; rehacerla el mismo día las conserva', () => {
    const { run, json } = loadApp();
    run("shopAsk('compra para 3 días')");
    const fid = json('state.shop.items[0].fid');
    run(`state.shop.done[${JSON.stringify(fid)}] = true; state.shop.extra = [{ t: 'papel', done: true }, { t: 'café', done: false }]`);
    run("shopAsk('compra para 4 días')");
    assert.equal(json(`!!state.shop.done[${JSON.stringify(fid)}]`), true, 'mismo día: se conserva');
    run("state.shop.start = '2000-01-01'; shopAsk('compra para 7 días')");
    assert.deepEqual(json('state.shop.done'), {}, 'otro día: sin marcas');
    assert.deepEqual(json('state.shop.extra.map(x => x.t)'), ['café'], 'lo apuntado por ti y no comprado se queda');
});

test('Nevera: los botones de los platos son acciones de verdad (nunca texto suelto como «fridgeAdd(0)»)', () => {
    for (const f of fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f.endsWith('.js'))) {
        const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
        assert.doesNotMatch(src, /\b(add|swap):\s*`/, `${f}: mealCard necesita ND.on(...), no una cadena`);
    }
});
