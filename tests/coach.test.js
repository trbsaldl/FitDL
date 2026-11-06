// Pruebas de la 3.0: motor de comidas, entender texto, rachas, lista de la compra y respuestas del Coach. Uso: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

function loadApp() {
    const store = {};
    const noop = () => { };
    const el = new Proxy({}, { get: (t, k) => k === 'classList' ? { add: noop, remove: noop, toggle: noop, contains: () => false } : (k === 'style' || k === 'dataset') ? {} : noop });
    const ctx = {
        console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
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
    // Sin pantalla: los avisos no se dibujan
    run('toast = () => {}; toastUndo = () => {};');
    const json = code => JSON.parse(run(`JSON.stringify(${code})`));
    // Perfil de ejemplo: mujer, 30 años, 165 cm, 68 kg, actividad ligera, perder grasa
    run("Object.assign(state, { gender: 'female', age: 30, height: 165, weight: 68, activity: 1.375, calcOk: true, goalType: 'lose' }); compute();");
    return { run, json };
}

test('Motor: todos los platos usan alimentos que existen', () => {
    const { run } = loadApp();
    assert.equal(run("MEALS.flatMap(t => t.items.flatMap(([a]) => a.split('|'))).filter(id => !getFood(id)).length"), 0);
});

test('Menú del día: suma las calorías objetivo (±10 %) y casi toda la proteína', () => {
    const { run, json } = loadApp();
    for (const meals of [3, 4, 5]) {
        run(`state.prefs = { meals: ${meals} }`);
        for (const seed of [1, 7, 42]) {
            const t = json(`menuTotals(makeDayMenu(${seed}))`), target = run('calc.target'), prot = run('calc.prot');
            assert.ok(Math.abs(t.kcal - target) / target <= .1, `${meals} comidas, semilla ${seed}: ${Math.round(t.kcal)} kcal frente a ${target}`);
            assert.ok(t.p >= prot * .85, `${meals} comidas, semilla ${seed}: ${Math.round(t.p)} g de proteína frente a ${prot}`);
        }
    }
});

test('Preferencias: dieta vegana y alergias se respetan en todas las sugerencias', () => {
    const { run, json } = loadApp();
    run("state.prefs = { diet: 'vegan', allergies: ['gluten', 'soja'], meals: 4 }");
    const ids = json("makeMenus(3, 5).flatMap(m => m.meals.flatMap(x => x.items.map(i => i.fid)))");
    assert.ok(ids.length > 0);
    for (const id of ids) {
        const f = json(`getFood('${id}')`);
        assert.match(f.flags, /N/, `${f.name} no es vegano`);
        assert.doesNotMatch(f.flags, /G/, `${f.name} tiene gluten`);
        assert.ok(!['tofu', 'tempeh', 'bebsoja', 'edamame', 'soja', 'sojatex'].includes(id), `${f.name} tiene soja`);
    }
    run("state.prefs = { diet: 'omni', allergies: ['lactosa'], dislikes: ['pollo'], meals: 4 }");
    const ids2 = json("makeMenus(3, 9).flatMap(m => m.meals.flatMap(x => x.items.map(i => i.fid)))");
    assert.ok(!ids2.includes('pollo'), 'no debe salir lo que no gusta');
    for (const id of ids2) assert.doesNotMatch(json(`getFood('${id}')`).flags, /L/, `${id} tiene lactosa`);
});

test('Entender texto: alimentos y cantidades de frases habituales', () => {
    const { json } = loadApp();
    const P = s => json(`parseFoodText(${JSON.stringify(s)}).items.map(i => [i.food.id, i.g, i.est])`);
    assert.deepEqual(P('He comido 200 gramos de pechuga de pollo, 100 gramos de arroz y una ensalada'), [['pollo', 200, false], ['arroz', 100, false], ['ensalada', 200, true]]);
    assert.deepEqual(P('una lata de atún'), [['atun', 52, false]]);
    assert.deepEqual(P('medio aguacate'), [['aguacate', 75, false]]);
    assert.deepEqual(P('dos huevos').map(x => x.slice(0, 2)), [['huevo', 110]]);
    assert.deepEqual(P('café con leche').map(x => x[0]), ['cafeleche']);
    assert.deepEqual(P('pollo con arroz').map(x => x[0]), ['pollo', 'arroz']);
    assert.deepEqual(P('150g de pasta cocida').map(x => x.slice(0, 2)), [['pastacocida', 150]]);
    assert.equal(json("parseFoodText('He cenado una tortilla de patatas').slot"), 'D');
});

test('Racha: días seguidos con comidas; si hoy no hay nada sigue viva desde ayer', () => {
    const { run, json } = loadApp();
    run("const t = todayISO(); state.diary = {}; [1, 2, 3].forEach(n => { state.diary[shiftISO(t, -n)] = [{ id: 'x' + n, slot: 'B', kcal: 100, p: 5, f: 1, c: 10 }]; }); state.diary[shiftISO(t, -6)] = [{ id: 'y', slot: 'L', kcal: 1, p: 0, f: 0, c: 0 }];");
    const S = json('streakInfo()');
    assert.equal(S.cur, 3); assert.equal(S.best, 3); assert.equal(S.today, false); assert.equal(S.total, 4);
});

test('Lista de la compra: suma cantidades de varios menús y agrupa por secciones', () => {
    const { json } = loadApp();
    const L = json("buildShopping([{ meals: [{ items: [{ fid: 'pollo', g: 150 }, { fid: 'arroz', g: 80 }] }] }, { meals: [{ items: [{ fid: 'pollo', g: 200 }, { fid: 'brocoli', g: 150 }] }] }])");
    const by = Object.fromEntries(L.map(x => [x.fid, x]));
    assert.equal(by.pollo.g, 350); assert.equal(by.pollo.group, 'prot');
    assert.equal(by.arroz.group, 'hc'); assert.equal(by.brocoli.group, 'verdura');
    assert.equal(json("shopQty(getFood('huevo'), 330)"), '6 huevos');
});

test('Coach: responde con tus datos, propone platos y avisa en situaciones de salud', () => {
    const { run, json } = loadApp();
    const left = json("coachReply('¿Cuánto me queda?')");
    assert.ok(left.tags.includes('dato'));
    const sug = json("coachReply('Quiero un desayuno de 40 g de proteína')");
    assert.equal(sug.slot, 'B'); assert.equal(sug.opts.length, 3);
    sug.opts.forEach(o => assert.ok(o.m.p >= 30, `${o.name}: ${Math.round(o.m.p)} g de proteína`));
    const safe = json("coachReply('Estoy embarazada, ¿cuánto como?')");
    assert.match(safe.html, /profesional sanitario/);
    // «He comido…» se apunta al momento y se puede deshacer
    const log = json("(() => { const m = pushMsg(coachReply('He comido dos huevos y una tostada')); return m; })()");
    assert.equal(log.logged.ids.length, 2, 'apunta los 2 alimentos');
    assert.equal(run("state.diary[todayISO()].length"), 2);
    run(`logUndo('${log.id}')`);
    assert.equal(run("state.diary[todayISO()]"), undefined, 'deshacer lo quita del diario');
    // Un plato que no está en la base ofrece apuntarlo con una estimación
    assert.match(json("coachReply('He comido un plato rarísimo de mi abuela')").html, /estimación/);
});

test('PRO: lo de pago no se puede usar sin PRO; la prueba de 7 días lo abre', () => {
    const { run } = loadApp();
    assert.equal(run("canUse('shop')"), false);
    assert.equal(run("canUse('fridge')"), false);
    assert.equal(run("canUse('nada-de-pago')"), true, 'lo gratis siempre se puede usar');
    run("localStorage.setItem('nutridl_pro', JSON.stringify({ trialUsed: 1, trialEnd: Date.now() + 86400000 }))");
    assert.equal(run("canUse('shop') && canUse('voice') && canUse('menu')"), true);
    run("localStorage.setItem('nutridl_pro', JSON.stringify({ trialUsed: 1, trialEnd: Date.now() - 1000 }))");
    assert.equal(run("isPro()"), false, 'la prueba caduca');
    run("localStorage.setItem('nutridl_pro', JSON.stringify({ trialUsed: 1, trialEnd: Date.now() + 365 * 86400000 }))");
    assert.equal(run("isPro()"), false, 'una prueba inventada de un año no cuela');
    run("localStorage.setItem('nutridl_pro', JSON.stringify({ code: 'cualquier-cosa' }))");
    assert.equal(run("isPro()"), false, 'un código inventado no activa PRO');
    run("localStorage.setItem('nutridl_pro', JSON.stringify({ code: PRO_CODES[0] }))");
    assert.equal(run("isPro()"), true, 'quien ya canjeó un código válido sigue siendo PRO');
});

test('Mi nevera: solo propone platos con lo que tienes (o dice qué falta)', () => {
    const { json } = loadApp();
    const R = json("fridgeMeals('D', ['pollo', 'arroz', 'brocoli', 'huevo', 'patata'])");
    assert.ok(R.opts.length >= 2);
    const ok = new Set(['pollo', 'pollopl', 'muslo', 'arroz', 'arrozcocido', 'arrozint', 'arrozintcocido', 'brocoli', 'brocolicocido', 'huevo', 'claras', 'patata', 'patatacocida', 'patataasada', 'aove']);
    R.opts.forEach(o => o.items.forEach(it => assert.ok(ok.has(it.fid) || o.missing.includes(it.fid), `${o.name}: ${it.fid} no está en la nevera`)));
});

test('Compra inteligente: entiende días, gustos y lo que no quieres, y cambia alimentos en toda la semana', () => {
    const { run, json } = loadApp();
    const R = json("parseShopRequest('quiero una compra fitness para 5 días, me gusta el salmón y el arroz, sin lactosa y no me gusta el atún')");
    assert.equal(R.days, 5);
    assert.ok(R.like.includes('salmon') && R.like.includes('arroz'), 'gustos: ' + R.like);
    assert.ok(R.avoid.includes('atun'), 'evitar: ' + R.avoid);
    assert.ok(R.allergies.includes('lactosa'));
    run("shopCreate(parseShopRequest('compra para 3 días, me gusta el salmón'))");
    assert.equal(run('state.shop.menus.length'), 3);
    const fids = () => json("state.shop.menus.flatMap(m => m.meals.flatMap(x => x.items.map(i => i.fid)))");
    if (fids().includes('salmon')) {
        const pBefore = run("state.shop.menus.reduce((a, m) => a + menuTotals(m).p, 0)");
        run("shopEdit('cambia el salmón por merluza')");
        assert.ok(!fids().includes('salmon'), 'ya no hay salmón');
        const pAfter = run("state.shop.menus.reduce((a, m) => a + menuTotals(m).p, 0)");
        assert.ok(Math.abs(pAfter - pBefore) / pBefore < .05, `la proteína de la semana se mantiene al cambiar (${Math.round(pBefore)} → ${Math.round(pAfter)} g)`);
    }
    run("shopEdit('quita el arroz')");
    assert.ok(!fids().some(id => ['arroz', 'arrozcocido', 'arrozint', 'arrozintcocido'].includes(id)), 'sin arroz');
    run("shopEdit('añade 1 plátano al día')");
    assert.ok(json("state.shop.items.find(x => x.fid === 'platano')").g >= 360, '3 plátanos para 3 días');
});

test('Semana de lunes a domingo e historial de entrenos completo', () => {
    const { run, json } = loadApp();
    const W = json('calWeekStats()');
    assert.equal(W.days.length, 7);
    assert.equal(new Date(W.days[0] + 'T12:00:00').getDay(), 1, 'empieza en lunes');
    run("state.workouts = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, d: shiftISO(todayISO(), -i), t: 'Día', di: 0, ex: [{ id: 'x', name: 'Sentadilla', sets: [{ kg: 50, reps: 5 }] }] }))");
    run("gh.n = 1000");
    assert.equal(run("gymHistoryHtml().split('data-h=\"').length - 1"), 300, 'se ven los 300 entrenos');
});

test('Seguridad: una copia trucada no puede colar código en la página', () => {
    const { run, json } = loadApp();
    run("DOMParser = class { parseFromString(h) { return { body: { textContent: String(h).replace(/<[^>]*>/g, '') } }; } }");
    const evil = {
        name: 'Ana', tab: 'coach',
        chat: [{ r: 'c', html: '<img src=x onerror=alert(1)>Hola', opts: ["x');alert(1);('"] }, { r: 'u', t: 'hola <b>' }],
        weights: [{ d: "2026-01-01');alert(1);('", w: 70 }],
        diary: { '2026-01-01': [{ id: 'a"><img src=x onerror=alert(1)>', name: "Pan d'oro", kcal: 100 }] },
        'x"><img>': 1,
    };
    const s = json(`cleanImportedState(${JSON.stringify(evil)})`);
    const txt = JSON.stringify(s);
    const strs = v => typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...strs(x)]) : [];
    assert.ok(!strs([s.weights, s.diary]).some(x => /[<>'"`\\]/.test(x)), 'sin caracteres peligrosos en datos');
    assert.ok(!txt.includes('onerror=alert') || !/<img/.test(txt), 'el chat no trae HTML ejecutable');
    assert.equal(s.chat[0].html, '<p>Hola</p>');
    assert.equal(s.chat[1].t, 'hola b');
    assert.equal(s['x"><img>'], undefined);
    assert.equal(s.diary['2026-01-01'][0].name, 'Pan doro');
    // Ids sin comillas en los botones (entrenos): siempre número; fechas sin paréntesis
    const w = json(`cleanImportedState({ workouts: [{ id: '1);alert(1', d: '2026-01-01' }, { id: 1700000000000, d: '2026-01-02' }] })`).workouts;
    assert.equal(typeof w[0].id, 'number'); assert.equal(w[1].id, 1700000000000);
    assert.equal(s.weights[0].d, '2026-01-01alert1');
    // Y sigue siendo un perfil válido
    assert.equal(json(`mergeState(cleanImportedState(${JSON.stringify(evil)})).weights.length`), 1);
});
