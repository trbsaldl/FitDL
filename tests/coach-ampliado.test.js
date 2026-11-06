// Pruebas de la 3.20: el Coach entiende borrar, entreno de hoy, peso, metas, deporte, dolor y dudas frecuentes
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

const txt = r => (r.html || '').replace(/<[^>]+>/g, ' ');

test('Coach: «quita el pan» lo quita del diario de hoy y se puede deshacer', () => {
    const { today, ask } = loadApp();
    ask('Añade dos huevos y 40 g de pan al desayuno');
    assert.equal(today().length, 2);
    const r = ask('quita el pan');
    assert.match(txt(r), /Quitado del diario/);
    assert.deepEqual(today().map(e => e.fid), ['huevo']);
    ask('deshaz');
    assert.equal(today().length, 2, 'deshacer lo vuelve a poner');
    const n = ask('borra el chocolate');
    assert.match(txt(n), /no tienes/);
    assert.equal(today().length, 2, 'si no está, no se toca nada');
});

test('Coach: «deshaz» quita lo último que apuntó', () => {
    const { run, today, ask } = loadApp();
    run("renderChat = () => {}; state.chat = [].concat(coachReply('Añade 100 g de pollo a la comida'))");
    assert.equal(today().length, 1);
    ask('deshaz');
    assert.deepEqual(today(), []);
});

test('Coach: preguntas que antes no entendía ya tienen respuesta propia', () => {
    const { ask } = loadApp();
    const cases = {
        'qué entreno hoy': /rutina|toca/,
        'cuánto debería pesar': /rango de peso saludable/,
        'cuántas calorías quemo corriendo 45 minutos': /Correr .* 45 min/,
        'me duele la rodilla': /fisioterapeuta/,
        'tengo ansiedad por comer dulce': /antojos/,
        'cuánta proteína necesito': /proteína al día/,
        'estoy cansado': /energía/,
        'cuántos pasos debo dar': /pasos al día/,
        'es malo cenar tarde': /no engorda por sí mismo/,
        'cuánta fibra': /fibra al día/,
        'cardio o pesas': /prioriza las pesas/,
        'quiero ganar músculo sin grasa': /ganar músculo/,
        'cuantas proteinas llevo': /Proteína: .*de/,
    };
    for (const [q, re] of Object.entries(cases)) assert.match(txt(ask(q)), re, q);
});

test('Coach: «quiero perder 5 kilos en un mes» avisa de que es demasiado rápido y da una fecha realista', () => {
    const { ask } = loadApp();
    const t = txt(ask('quiero perder 5 kilos en un mes'));
    assert.match(t, /demasiado rápido/);
    assert.match(t, /semanas\s*,\s*hacia el/);
    assert.doesNotMatch(txt(ask('quiero perder 2 kilos en 2 meses')), /demasiado rápido/);
});

test('Coach: «me peso 79,4» propone guardar el peso y no lo guarda solo', () => {
    const { run, json, ask } = loadApp();
    const n = json('(state.weights || []).length');
    const r = ask('me peso 79,4');
    assert.match(txt(r), /79,4 kg/);
    assert.equal(json('(state.weights || []).length'), n, 'no se guarda sin pulsar');
    run('syncWeightFromLog = () => {}; coachWeight(79.4)');
    assert.equal(json('state.weights[state.weights.length - 1].w'), 79.4);
});

test('Coach: dar una cantidad de peso que no es mía no se toma como peso', () => {
    const { ask } = loadApp();
    assert.doesNotMatch(txt(ask('he comido 100 g de pollo')), /peso de hoy/);
});
