// Pruebas de la 3.7: tus ejercicios en el buscador del gym y alimentos colombianos (ICBF)
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


test('Gym: los ejercicios que creaste tú salen en el buscador (sin repetir, los recientes primero)', () => {
    const { run, json } = loadApp();
    run(`state.gym = { myDays: 2, plan: [{ name: 'Pierna', ex: [{ id: 'sq_barra', n: 'Sentadilla', s: [{ kg: '', r: '' }] }] }, { name: 'Brazo', ex: [{ id: '', n: 'Curl araña', s: [{ kg: '', r: '' }] }] }] };
        state.workouts = [
            { id: 1, d: '2026-10-01', t: 'Pierna', di: 0, ex: [{ id: '', name: 'Hip thrust en Smith', sets: [{ kg: 60, reps: 10 }] }] },
            { id: 2, d: '2026-10-03', t: 'Pierna', di: 0, ex: [{ id: '', name: 'Zancada búlgara', sets: [{ kg: 20, reps: 10 }] }, { id: '', name: 'hip thrust en smith', sets: [{ kg: 70, reps: 8 }] }] },
            { id: 3, d: '2026-10-04', t: 'Raro', ex: 'no es una lista' }];
        gymDay = 0;`);
    // solo los tuyos (los de la lista ya salen en el buscador), sin duplicados por mayúsculas, y el más reciente primero
    assert.deepEqual(json('myExercises()'), ['Zancada búlgara', 'hip thrust en smith', 'Curl araña']);
    // al tocar uno, se añade al día con su mismo nombre (así su historial y «Última vez» siguen juntos)
    run('myExShown = myExercises(); addMyEx(2)');
    assert.deepEqual(json('curDay().ex.map(e => [e.id, e.n])'), [['sq_barra', 'Sentadilla'], ['', 'Curl araña']]);
    run('addMyEx(99)'); // un índice que no existe no hace nada
    assert.equal(run('curDay().ex.length'), 2);
});

test('Alimentos colombianos de la tabla oficial del ICBF', () => {
    const { run, json } = loadApp();
    const top = q => json(`searchFoods(${JSON.stringify(q)}).slice(0, 5).map(f => f.name)`).join(' | ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const q of ['salchipapa', 'almojabana', 'pandebono', 'pandeyuca', 'ajiaco', 'bandeja paisa', 'lechona', 'sancocho']) assert.match(top(q), new RegExp(q.split(' ')[0].slice(0, 6)));
    // energía oficial por 100 g (no calculada)
    const k100 = id => run(`macrosOf(FOODS.find(f => f.id === '${id}'), 100).kcal`);
    assert.equal(Math.round(k100('u_co_almojabana')), 285);
    assert.equal(Math.round(k100('u_co_pandebono')), 357);
    // cada uno con su código de la tabla, sin azúcares inventados (la tabla no los da)
    const co = json("FOODS.filter(f => f.icbf).map(f => ({ id: f.id, sug: f.sug ?? null, icbf: f.icbf }))");
    assert.ok(co.length >= 26);
    assert.ok(co.every(f => f.icbf && f.sug === null));
});
