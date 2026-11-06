// Pruebas de la 3.13: recomposición corporal, macros a mano y aviso de fin de prueba PRO
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
    return { run, json };
}
const base = (run, extra) => run(`Object.assign(state, { gender:'male', age:30, height:178, weight:75, activity:1.55, calcOk:true, strategy:'balanced', manualMacros:null }, ${JSON.stringify(extra)}); compute();`);

test('Recomposición: déficit pequeño (2,5-7,5 %) y proteína alta (2,2 g/kg)', () => {
    const { run, json } = loadApp();
    for (const [adj, pct] of [[-1, -0.025], [0, -0.05], [1, -0.075]]) {
        base(run, { goalType: 'recomp', goalAdj: adj });
        const c = json('{ goal: calc.goal, prot: calc.prot, t: calc.G.t }');
        assert.equal(c.t, 'recomp');
        assert.equal(c.goal, pct, `ajuste ${adj}`);
        assert.equal(c.prot, Math.round(2.2 * 75), 'proteína a 2,2 g/kg');
    }
    // Más déficit que mantener y menos que perder grasa
    base(run, { goalType: 'lose', goalAdj: 0 });
    const lose = json('calc.target');
    base(run, { goalType: 'maintain', goalAdj: 0 });
    const keep = json('calc.target');
    base(run, { goalType: 'recomp', goalAdj: 0 });
    const recomp = json('calc.target');
    assert.ok(recomp < keep && recomp > lose, `recomp ${recomp} entre ${lose} y ${keep}`);
});

test('Recomposición con bajo peso: no hay déficit', () => {
    const { run, json } = loadApp();
    base(run, { goalType: 'recomp', goalAdj: 0, weight: 52, height: 180 });
    assert.equal(json('calc.goal'), 0);
});

test('Macros a mano: las calorías salen de las macros y se puede volver al automático', () => {
    const { run, json } = loadApp();
    base(run, { goalType: 'lose', goalAdj: 0 });
    const auto = json('calc.target');
    base(run, { goalType: 'lose', goalAdj: 0, manualMacros: { on: 1, p: 180, c: 200, f: 60 } });
    const m = json('{ t: calc.target, p: calc.prot, c: calc.carbs, f: calc.fat, fib: calc.fiber, manual: calc.manual }');
    assert.equal(m.manual, true);
    assert.deepEqual([m.p, m.c, m.f], [180, 200, 60]);
    assert.equal(m.t, 180 * 4 + 200 * 4 + 60 * 9 + m.fib * 2);
    base(run, { goalType: 'lose', goalAdj: 0, manualMacros: null });
    assert.equal(json('calc.target'), auto);
});

test('Macros a mano: datos raros (texto, negativos, enormes) no rompen nada', () => {
    const { run, json } = loadApp();
    base(run, { goalType: 'maintain', goalAdj: 0, manualMacros: { on: 1, p: '<img src=x>', c: -50, f: 60 } });
    assert.equal(json('calc.manual'), false, 'sin proteína válida no se usa');
    base(run, { goalType: 'maintain', goalAdj: 0, manualMacros: { on: 1, p: 99999, c: -50, f: 60 } });
    const m = json('{ p: calc.prot, c: calc.carbs }');
    assert.equal(m.p, 600, 'tope de 600 g');
    assert.equal(m.c, 0, 'sin negativos');
});

test('Macros a mano muy bajas: avisa del mínimo seguro', () => {
    const { run, json } = loadApp();
    base(run, { goalType: 'maintain', goalAdj: 0, manualMacros: { on: 1, p: 80, c: 50, f: 20 } });
    assert.ok(json('calc.alerts').some(a => /mínimo seguro/.test(a.m)));
});

test('Aviso de fin de prueba PRO a 2 y 1 días, y nunca antes', () => {
    const { run, json } = loadApp();
    base(run, { goalType: 'lose', goalAdj: 0 });
    run('state.diary = {}; state.moments = {};');
    const DAY = 86400000;
    for (const [left, expect] of [[5, null], [2, 'trial'], [1, 'trial']]) {
        run(`setProData({ trialUsed: 1, trialEnd: Date.now() + ${left} * ${DAY} - 60000 })`);
        const m = json('dayMoment()');
        assert.equal(m ? m.k : null, expect, `${left} días`);
    }
    run("momentSeen('trial')");
    assert.notEqual((json('dayMoment()') || {}).k, 'trial', 'una vez al día');
});
