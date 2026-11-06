// Pruebas de la 3.16: el Coach no apunta sin preguntar, entiende órdenes, cambios y «no tengo»; guardar sin espacio; diario robusto
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
    run('toast = () => {}; toastUndo = () => {}; renderGym = () => {}; renderDashboard = () => {}; renderDiary = () => {}; coachView = () => {};');
    run("Object.assign(state, { gender: 'male', age: 30, height: 178, weight: 80, activity: 1.55, calcOk: true, goalType: 'lose' }); compute();");
    const json = code => JSON.parse(run(`JSON.stringify(${code})`));
    const today = () => json('(state.diary[todayISO()] || []).map(e => ({ id: e.id, fid: e.fid, g: e.g, kcal: e.kcal, slot: e.slot }))');
    const ask = q => json(`[].concat(coachReply(${JSON.stringify(q)}))[0]`);
    return { run, json, today, ask };
}

test('Lector: lo negado no se apunta y «no» no es «Nocilla»', () => {
    const { json } = loadApp();
    const items = t => json(`parseFoodText(${JSON.stringify(t)}).items.map(i => i.food.id)`);
    assert.deepEqual(items('no tengo pollo'), []);
    assert.deepEqual(items('no'), []);
    assert.deepEqual(items('dos huevos y no pan'), ['huevo']);
    assert.equal(items('un té verde').length, 1, 'las palabras cortas enteras siguen valiendo');
});

test('Coach: «No tengo pollo» propone ideas sin pollo y no toca el diario', () => {
    const { json, today, ask } = loadApp();
    const r = ask('No tengo pollo');
    assert.deepEqual(today(), []);
    assert.ok(r.opts && r.opts.length, 'debe proponer opciones');
    for (const id of r.opts.flatMap(o => o.items.map(i => i.fid))) assert.doesNotMatch(json(`norm(getFood('${id}').name)`), /\bpollo\b/, id);
});

test('Coach: si está adivinando, pregunta antes de apuntar', () => {
    const { run, today, ask } = loadApp();
    const r = ask('pollo con arroz');
    assert.deepEqual(today(), [], 'no se apunta solo');
    assert.ok(r.p && r.p.items.length === 2, 'muestra lo entendido para confirmarlo');
    run(`pend['${r.id}'] = ${JSON.stringify(r.p)}; pendAdd('${r.id}')`);
    assert.equal(today().length, 2, 'al confirmar sí se apunta');
});

test('Coach: «Añade dos huevos a la comida» apunta 2 huevos en la comida', () => {
    const { today, ask } = loadApp();
    ask('Añade dos huevos a la comida');
    const t = today();
    assert.equal(t.length, 1);
    assert.equal(t[0].fid, 'huevo');
    assert.equal(t[0].slot, 'L');
    assert.equal(t[0].g, 110);
});

test('Coach: cambiar un alimento mantiene las calorías y solo toca el diario al confirmar', () => {
    const { run, today, ask } = loadApp();
    ask('He comido 80 g de arroz');
    const before = today();
    assert.equal(before.length, 1);
    const r = ask('Quiero cambiar el arroz por patata');
    assert.match(r.html, /coachSwap/);
    assert.deepEqual(today(), before, 'sin confirmar no cambia nada');
    const m = r.html.match(/coachSwap\(&quot;([^&]+)&quot;,&quot;([^&]+)&quot;,(\d+)\)/);
    assert.ok(m, 'botón con el cambio');
    run(`coachSwap('${m[1]}', '${m[2]}', ${m[3]})`);
    const after = today();
    assert.equal(after.length, 1);
    assert.equal(after[0].id, before[0].id, 'misma entrada');
    assert.notEqual(after[0].fid, before[0].fid);
    assert.ok(Math.abs(after[0].kcal - before[0].kcal) <= before[0].kcal * .03, `${after[0].kcal} frente a ${before[0].kcal}`);
    // Si no está en el diario, solo informa
    assert.doesNotMatch(ask('cambia el salmón por merluza').html, /coachSwap/);
});

test('Coach: «¿Qué puedo comer ahora?», «comida barata» y «mañana» dan ideas', () => {
    const { run, ask } = loadApp();
    assert.ok(ask('¿Qué puedo comer ahora?').opts.length);
    const cheap = ask('Dame una comida barata');
    assert.ok(cheap.opts.length);
    assert.match(cheap.html, /económicos/);
    // Mañana: aunque hoy ya esté completo, propone la comida entera de mañana
    run("pushDiary({ slot: 'L', name: 'Mucho', kcal: 4000, p: 200, c: 400, f: 150 }, todayISO())");
    const m = ask('¿Qué debería preparar mañana?');
    assert.ok(m.opts && m.opts.length, 'ideas para mañana');
});

test('Guardar sin espacio: se sacrifican las copias automáticas, nunca los datos', () => {
    const { run } = loadApp();
    run("localStorage.setItem('nutridl_autobackup', JSON.stringify([{ d: 'a' }, { d: 'b' }]))");
    run("var _set = localStorage.setItem; localStorage.setItem = (k, v) => { if (k === 'x' && localStorage.getItem('nutridl_autobackup')) throw new Error('QuotaExceededError'); _set(k, v); }");
    assert.equal(run("storeSet('x', 'datos')"), true);
    assert.equal(run("localStorage.getItem('x')"), 'datos');
    assert.equal(run("localStorage.getItem('nutridl_autobackup')"), null);
    // Si ni así cabe: devuelve false y lo anota (sin romper la app)
    run("localStorage.setItem = (k, v) => { if (k === 'y') throw new Error('QuotaExceededError'); _set(k, v); }");
    assert.equal(run("storeSet('y', 'datos')"), false);
    assert.match(run('localStorage.getItem(ERR_KEY)'), /No se pudo guardar/);
});

test('Diario: una comida sin proteína/hidratos/grasa no rompe los totales', () => {
    const { run, json } = loadApp();
    run("state.diary[todayISO()] = [{ id: 'a', slot: 'L', name: 'Viejo', kcal: 300 }, { id: 'b', slot: 'L', name: 'Otro', kcal: 100, p: 10, c: 5, f: 2 }]");
    const t = json('diaryTotals(todayISO())');
    assert.equal(t.kcal, 400);
    assert.equal(t.p, 10);
    assert.ok(Number.isFinite(t.c) && Number.isFinite(t.f));
    assert.doesNotMatch(run('macroLine(undefined, undefined, undefined)'), /NaN/);
});
