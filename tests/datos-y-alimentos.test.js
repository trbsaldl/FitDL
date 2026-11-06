// Pruebas de la 3.4: base ampliada de alimentos, datos de siempre intactos, copias automáticas, registro limpio y freno de peticiones
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
    run('toast = () => {}; toastUndo = () => {};');
    const json = code => JSON.parse(run(`JSON.stringify(${code})`));
    return { run, json, store, ctx };
}

test('Base de alimentos: más de 1.400, sin ids repetidos y con valores posibles', () => {
    const { run } = loadApp();
    assert.ok(run('FOODS.length') >= 1400);
    assert.equal(run('FOODS.length - new Set(FOODS.map(f => f.id)).size'), 0);
    assert.equal(run('FOODS.filter(f => ![f.p, f.f, f.c, f.fib].every(v => Number.isFinite(v) && v >= 0) || f.p + f.f + f.c > 102).length'), 0);
    // Las marcas cumplen la regla de la etiqueta: kcal ≈ 4·P + 4·HC + 9·G + 2·fibra
    assert.equal(run('FOODS.filter(f => f.brand && f.kcal != null && Math.abs(4*f.p + 4*f.c + 9*f.f + 2*f.fib - f.kcal) > Math.max(12, f.kcal * .18)).length'), 0);
});

test('Base de alimentos: encuentra cocinados, crudos y Hacendado', () => {
    const { json } = loadApp();
    const top = q => json(`searchFoods(${JSON.stringify(q)}).slice(0, 8).map(f => f.name + ' ' + (f.brand || ''))`).join(' | ').toLowerCase();
    assert.match(top('lentejas hervidas'), /lentejas hervidas/);
    assert.match(top('arroz redondo cocido'), /arroz redondo cocido/);
    assert.match(top('pechuga pollo asada'), /pechuga de pollo asada/);
    assert.match(top('yogur hacendado'), /hacendado/);
    assert.match(top('gambas cocidas'), /gambas/);
});

test('Datos de siempre: un perfil antiguo con días de comidas y entrenos se conserva entero', () => {
    const { run, json } = loadApp();
    const diary = {}; for (let i = 1; i <= 9; i++) diary[`2026-10-0${i}`] = [{ id: 'e' + i, slot: 'L', fid: 'pollo', name: 'Pechuga de pollo', g: 150, kcal: 180, p: 34, f: 4, c: 0, fib: 0 }];
    const old = { gender: 'male', age: 30, weight: 80, height: 180, activity: 1.55, calcOk: true, diary, weights: [{ d: '2026-10-01', w: 80 }], workouts: [{ id: 1, d: '2026-10-02', t: 'Día 1', ex: [] }, { id: 2, d: '2026-10-05', t: 'Día 2', ex: [] }] };
    const s = json(`mergeState(${JSON.stringify(old)})`);
    assert.equal(Object.keys(s.diary).length, 9);
    assert.equal(s.diary['2026-10-09'][0].kcal, 180);
    assert.equal(s.workouts.length, 2);
    assert.equal(s.weights.length, 1);
    // El alimento al que apuntan sigue existiendo
    assert.ok(run("!!getFood('pollo')"));
});

test('Copias automáticas: una al día, como mucho 3, y se pueden leer', () => {
    const { run, store } = loadApp();
    run("profiles = { current: 'p1', list: { p1: { name: 'Ana', state: { diary: { '2026-10-10': [] } } } } }; autoBackup();");
    const L = JSON.parse(store.nutridl_autobackup);
    assert.equal(L.length, 1);
    assert.equal(JSON.parse(L[0].data).list.p1.name, 'Ana');
    run('autoBackup()'); assert.equal(JSON.parse(store.nutridl_autobackup).length, 1); // mismo día: no duplica
});

test('Registro de errores: sin correos, teléfonos ni lo que escribiste', () => {
    const { run, store } = loadApp();
    run(`logErr("Fallo con ana.lopez@gmail.com y 612 345 678 al buscar 'mi comida secreta'")`);
    const m = JSON.parse(store.nutridl_errors).pop().m;
    assert.ok(!/gmail|612|secreta/.test(m), m);
});

test('Open Food Facts: como mucho 20 búsquedas por minuto y no repite la misma', async () => {
    const { ctx, run } = loadApp();
    let calls = 0;
    ctx.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({ product: { product_name: 'X', nutriments: {} } }) }; };
    for (let i = 0; i < 20; i++) await run("offProduct('848000000" + String(1000 + i) + "')");
    await run("offProduct('8480000001000')"); // repetido: no vuelve a preguntar
    assert.equal(calls, 20);
    await assert.rejects(() => run("offProduct('8480000009999')"), e => e.limit === true);
});

test('Coach: el chat empieza limpio cada día y el diario no se toca', () => {
    const { run, json } = loadApp();
    const id = t => 'm' + t.toString(36) + 'abcd';
    // Mediodía de hoy y de ayer: así la prueba vale igual a las 23:59 que a las 00:00
    const medio = new Date(); medio.setHours(12, 0, 0, 0);
    const hoy = medio.getTime(), ayer = hoy - 864e5;
    run(`state.diary = { x: [1] }; state.chatDay = '2000-01-01'; state.chat = ${JSON.stringify([{ id: id(ayer), r: 'u', t: 'ayer' }, { id: id(hoy), r: 'u', t: 'hoy' }, { r: 'c', html: '<p>sin id</p>' }])}; freshChat();`);
    assert.deepEqual(json('state.chat.map(m => m.t)'), ['hoy']);
    assert.equal(run('state.chatDay'), run('todayISO()'));
    assert.equal(json('state.diary').x.length, 1);
    run(`pushMsg({ r: 'u', t: 'nuevo' })`);
    assert.deepEqual(json('state.chat.map(m => m.t)'), ['hoy', 'nuevo']);
});
