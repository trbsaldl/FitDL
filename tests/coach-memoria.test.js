// Pruebas de la 3.9: el Coach recuerda la conversación y responde a los temas nuevos
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


// Un perfil con plan hecho: sin él, el Coach solo pide completar el plan
const conPlan = run => run("Object.assign(state, { gender: 'male', age: 30, height: 178, weight: 75, activity: 1.55, calcOk: true, goalType: 'lose' }); compute(); state.chat = []; coachCtx = { intent: '', q: '', slot: '', offer: '', at: 0 };");
const txt = o => String(o && o.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('Coach: se acuerda de lo que acabáis de hablar', () => {
    const { run, json } = loadApp();
    conPlan(run);
    // «otra» repite la propuesta anterior en vez de perderse
    const s1 = json("coachReply('¿Qué ceno?')");
    assert.equal(s1.slot, 'D');
    const s2 = json("coachReply('otra')");
    assert.equal(s2.slot, 'D', '«otra» mantiene la cena');
    assert.equal(s2.opts.length, 3);
    // «¿y de desayuno?» cambia de comida sin repetir la pregunta entera
    assert.equal(json("coachReply('¿y de desayuno?')").slot, 'B');
    // «¿y el arroz?» después de preguntar por un alimento sigue hablando de alimentos
    conPlan(run);
    assert.match(txt(json("coachReply('¿Cuántas calorías tiene el pollo?')")), /pollo/i);
    assert.match(txt(json("coachReply('¿y el arroz?')")), /arroz/i);
    // Sin conversación reciente no se inventa nada: «otra» cae en la ayuda
    conPlan(run);
    assert.doesNotMatch(txt(json("coachReply('otra')")), /te propongo/i);
});

test('Coach: responde a los temas que antes no entendía', () => {
    const { run, json } = loadApp();
    conPlan(run);
    const ask = q => txt(json(`coachReply(${JSON.stringify(q)})`));
    assert.match(ask('¿puedo comer pizza?'), /pizza/i);
    assert.match(ask('¿la pizza engorda?'), /kcal/);
    assert.match(ask('¿qué es mejor, arroz o pasta?'), /arroz[\s\S]*pasta|pasta[\s\S]*arroz/i);
    assert.match(ask('¿cuánta agua debo beber?'), /litros/i);
    assert.match(ask('¿puedo tomarme una cerveza?'), /7 kcal|caña/i);
    assert.match(ask('¿qué opinas del ayuno intermitente?'), /ayuno/i);
    assert.match(ask('¿me compro creatina?'), /creatina/i);
    assert.match(ask('¿cuándo veré resultados?'), /semana/i);
    assert.match(ask('llevo semanas y no bajo de peso'), /agua|apunta/i);
    assert.match(ask('me he pasado hoy comiendo'), /7.700|no ha pasado|tranquilo|respira/i);
    assert.match(ask('no tengo hambre y no llego'), /batido|grasa/i);
    assert.match(ask('¿qué puedes hacer?'), /apuntar/i);
    assert.match(ask('gracias'), /\w/);
});

test('Coach: dice la verdad sobre lo que es y no promete IA', () => {
    const { run, json } = loadApp();
    conPlan(run);
    const r = txt(json("coachReply('¿eres una inteligencia artificial?')"));
    assert.match(r, /no soy una inteligencia artificial/i, 'no se hace pasar por IA');
    assert.match(r, /sin cobertura|no salen de tu móvil/i, 'explica por qué eso es bueno');
});

test('Coach: si no entiende pero ve un alimento, ofrece algo útil', () => {
    const { run, json } = loadApp();
    conPlan(run);
    const r = json("coachReply('oye una cosa rara sobre el salmón ese')");
    assert.match(txt(r), /salmón/i);
    assert.match(String(r.html), /data-h=/, 'ofrece botones para seguir');
});

test('Coach: una pregunta nunca se apunta sola en el diario', () => {
    const { run, json } = loadApp();
    conPlan(run);
    run("coachReply('¿Puedo comer pizza esta noche?')");
    const r = json("coachReply('¿y el arroz?')");
    assert.equal(run("state.diary[todayISO()]"), undefined, 'preguntar por el arroz no lo mete en el diario');
    assert.match(txt(r), /arroz/i, 'sigue hablando del arroz');
    // Pero escribirlo de verdad sí se apunta
    conPlan(run);
    run("coachReply('He comido arroz')");
    assert.equal(run("state.diary[todayISO()].length"), 1, 'apuntar sigue funcionando');
});

test('Coach: un alimento con apóstrofo o comillas no rompe ni cuela código en los botones', () => {
    const { run, json } = loadApp();
    conPlan(run);
    // Nombre legítimo con apóstrofo, y uno con un intento de colar código
    run(`state.customFoods = [
        { id: 'c_test1', name: "Yogur O'Brien", cat: 'custom', role: 'protein', meals: 'BSLD', p: 10, f: 3, c: 5, fib: 0, min: 0, max: 0, flags: '', custom: 1 },
        { id: 'c_test2', name: "Tarta '); alert(1);//", cat: 'custom', role: 'carb', meals: 'BSLD', p: 2, f: 10, c: 40, fib: 0, min: 0, max: 0, flags: '', custom: 1 }];
        syncCustomFoods();`);
    const h = String(json(`coachReply("¿mmm el o'brien ese?")`).html);
    // Con delegación ND los valores van en closures, no en atributos HTML: no hay onclick que inyectar
    assert.match(h, /O&#39;Brien|O\u0027Brien|O&#x27;Brien|O'Brien/, 'el nombre aparece en el botón');
    // Sin onclick en el HTML, no hay superficie para inyección de código vía atributos
    assert.doesNotMatch(h, /onclick=/, 'sin onclick: la delegación ND elimina el vector de inyección');
    assert.match(h, /data-h=/, 'el botón se genera');
});
