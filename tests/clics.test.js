// Botones: el listener único de clic no se puede tragar los data-action, y ningún botón pasa el clic
// a una función que espera otro dato (comida, modo…). Uso: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

const js = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const archivos = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f.endsWith('.js'));

test('Clics: <body data-tab> no atrapa los botones data-action (Instalar, Empezar, PRO…)', () => {
    assert.match(js('app.js'), /document\.body\.dataset\.tab\s*=/, 'el body lleva la pestaña actual');
    const main = js('main.js');
    assert.doesNotMatch(main, /closest\('\[data-tab\]'\)/, 'data-tab solo en botones');
    assert.doesNotMatch(main, /closest\('\[data-cv\]'\)/, 'data-cv solo en botones');
    assert.ok(main.indexOf("closest('button[data-tab]')") < main.indexOf("closest('[data-action]')"));
});

test('Clics: ND.on(funcion) solo con funciones sin parámetros (el clic no se cuela como dato)', () => {
    const params = {};
    for (const f of archivos) for (const m of js(f).matchAll(/^(?:async )?function (\w+)\(([^)]*)\)/gm)) params[m[1]] = m[2].trim();
    const malos = [];
    for (const f of archivos) for (const m of js(f).matchAll(/ND\.on\(([A-Za-z_$][\w$]*)\)/g)) {
        if (params[m[1]]) malos.push(`${f}: ND.on(${m[1]}) y ${m[1]}(${params[m[1]]})`);
    }
    assert.deepEqual(malos, []);
});

test('Diario: una comida guardada con franja inválida se repara a «Otros» al cargar', () => {
    const noop = () => { };
    const ctx = { console, Intl, Date, Math, JSON, window: { addEventListener: noop }, navigator: {}, location: { protocol: 'file:', hostname: '', search: '' },
        matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
        document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, body: { style: {} } } };
    vm.createContext(ctx);
    for (const f of ['data/lang-en', 'i18n', 'core', 'data/foods', 'calc', 'profiles']) vm.runInContext(js(f + '.js'), ctx);
    const m = vm.runInContext(`mergeState({ diary: { '2026-11-06': [{ name: 'Macarrones', slot: { isTrusted: true } }, { name: 'Pollo', slot: 'L' }] } })`, ctx);
    assert.deepEqual([...m.diary['2026-11-06'].map(x => x.slot)], ['X', 'L']);
});
