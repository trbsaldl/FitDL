// Pruebas de la 3.6: dropsets, cronómetro del entreno, azúcares y comida rápida / platos típicos
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

function loadApp() {
    const store = {};
    const noop = () => { };
    const el = new Proxy({}, { get: (t, k) => k === 'classList' ? { add: noop, remove: noop, toggle: noop, contains: () => false } : (k === 'style' || k === 'dataset') ? {} : noop });
    const ctx = {
        console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, setInterval, clearInterval, Map, Set,
        window: { addEventListener: noop }, navigator: {}, location: { protocol: 'file:', hostname: '', search: '' },
        matchMedia: () => ({ matches: false }),
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: { style: {} } },
    };
    vm.createContext(ctx);
    for (const f of ['data/lang-en', 'data/foods-en', 'i18n', 'core', 'data/foods', 'data/foods-marcas', 'data/exercises', 'calc', 'analytics', 'progress', 'engine', 'parser', 'insights', 'gym', 'diary', 'profiles', 'dashboard', 'plans', 'kitchen', 'coach', 'app']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
    }
    const run = code => vm.runInContext(code, ctx);
    run('toast = () => {}; toastUndo = () => {}; renderGym = () => {}; renderDashboard = () => {};');
    const json = code => JSON.parse(run(`JSON.stringify(${code})`));
    return { run, json, store };
}
const setupDay = run => run(`state.gym = { myDays: 1, plan: [{ name: 'Pierna', ex: [{ id: 'sq_barra', n: 'Sentadilla', s: [{ kg: '100', r: '8' }, { kg: '80', r: '10', t: 'drop', d: [{ kg: '60', r: '8' }, { kg: '40', r: '6' }] }] }] }] }; state.workouts = []; gymDay = 0;`);

test('Dropset: se guarda con todas sus bajadas y el volumen las cuenta', () => {
    const { run, json } = loadApp();
    setupDay(run);
    run('saveGymDay()');
    const w = json('state.workouts[0]');
    assert.equal(w.ex[0].sets.length, 2);
    assert.deepEqual(w.ex[0].sets[0], { kg: 100, reps: 8 });           // serie normal: igual que siempre
    assert.deepEqual(w.ex[0].sets[1].drop, [{ kg: 60, reps: 8 }, { kg: 40, reps: 6 }]);
    assert.equal(run('exVol(state.workouts[0].ex[0])'), 100 * 8 + 80 * 10 + 60 * 8 + 40 * 6);
    assert.equal(run('setText(state.workouts[0].ex[0].sets[1])'), '80 kg × 10 ↓ 60 × 8 ↓ 40 × 6');
    // el plan se queda como dropset (vacío) para la próxima vez
    assert.equal(run("curDay().ex[0].s[1].t"), 'drop');
    assert.equal(run("curDay().ex[0].s[1].d.length"), 2);
    // el récord del ejercicio usa el peso de la primera bajada
    assert.equal(run('bestLifts()[0].s.kg'), 100);
});

test('Dropset: activar, añadir y quitar bajadas', () => {
    const { run } = loadApp();
    setupDay(run);
    run('toggleDrop(0, 0)');
    assert.equal(run('curDay().ex[0].s[0].t'), 'drop');
    assert.equal(run('curDay().ex[0].s[0].d.length'), 1);
    run('addDrop(0, 0); removeDrop(0, 0, 0)');
    assert.equal(run('curDay().ex[0].s[0].d.length'), 1);
    run('removeDrop(0, 0, 0)');                                       // sin bajadas vuelve a ser normal
    assert.equal(run('curDay().ex[0].s[0].t'), undefined);
});

test('Entrenos antiguos (sin dropsets ni duración) se leen igual', () => {
    const { run } = loadApp();
    run("state.workouts = [{ id: 1, d: '2026-10-01', t: 'Día 1', di: 0, ex: [{ id: '', name: 'Press banca', sets: [{ kg: 60, reps: 10 }, { kg: 60, reps: 8 }] }] }]");
    assert.equal(run('exVol(state.workouts[0].ex[0])'), 1080);
    assert.equal(run('perfText(state.workouts[0].ex[0].sets)'), '60 kg × 10 · 60 kg × 8');
    assert.equal(run('isDrop(state.workouts[0].ex[0].sets[0])'), false);
});

test('Cronómetro: cuenta desde la hora de inicio, descuenta las pausas y guarda la duración', () => {
    const { run } = loadApp();
    setupDay(run);
    const now = Date.now();
    // empezó hace 50 min y estuvo 5 min en pausa (como si la app se hubiera cerrado y vuelto a abrir)
    run(`myGym().sess = { start: ${now - 50 * 60000}, pausedAt: null, pausedMs: ${5 * 60000} }`);
    const s = run('sessSeconds()');
    assert.ok(s >= 45 * 60 - 2 && s <= 45 * 60 + 2, String(s));
    run('saveGymDay()');
    const dur = run('state.workouts[0].dur');
    assert.ok(dur >= 45 * 60 - 2 && dur <= 45 * 60 + 2, String(dur));
    assert.equal(run('myGym().sess'), undefined);                    // al guardar, el cronómetro se cierra
    assert.equal(run('durTxt(2700)'), '45 min');
    assert.equal(run('durTxt(4500)'), '1 h 15 min');
    // en pausa no avanza
    run(`myGym().sess = { start: ${now - 600000}, pausedAt: ${now - 300000}, pausedMs: 0 }`);
    assert.equal(Math.round(run('sessSeconds()') / 60), 5);
});

test('Azúcares: en los alimentos que lo traen, nunca más que sus hidratos, y se suman al diario', () => {
    const { run } = loadApp();
    assert.ok(run('FOODS.filter(f => f.sug != null).length') > 1500);
    assert.equal(run('FOODS.filter(f => f.sug != null && f.sug > f.c + 0.05).length'), 0);
    assert.equal(run("getFood('pollo').sug"), 0);
    assert.ok(run("getFood('platano').sug") > 10);
    const m = run("JSON.stringify(macrosOf(getFood('platano'), 120))");
    assert.ok(JSON.parse(m).sug > 12);
    // un alimento sin dato de azúcar no se inventa un 0
    run("FOODS.push({ id: 'zz', name: 'Sin dato', p: 1, f: 1, c: 10, fib: 0 })");
    assert.equal(run("macrosOf(getFood('zz'), 100).sug"), undefined);
});

test('Comida rápida, pulled pork y platos de España y Latinoamérica', () => {
    const { run, json } = loadApp();
    const top = q => json(`searchFoods(${JSON.stringify(q)}).slice(0, 6).map(f => f.name + ' ' + (f.brand || ''))`).join(' | ').toLowerCase();
    assert.match(top('big mac'), /big mac.*mcdonald/);
    assert.match(top('pulled pork'), /pulled pork/);
    assert.match(top('tiras pechuga kfc'), /kfc/);
    assert.match(top('arepa'), /arepa/);
    assert.match(top('pupusa'), /pupusa/);
    assert.match(top('mermelada hero'), /hero/);
    assert.match(top('whey'), /whey/);
    // ración oficial: un Big Mac pesa 234 g
    assert.equal(run("FOODS.find(f => f.name === 'Big Mac®').serv[0]"), 234);
});
