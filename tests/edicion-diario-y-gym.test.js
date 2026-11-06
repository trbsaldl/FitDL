// Pruebas de la 3.17: editar nombre y macros en el diario, editar/borrar tus alimentos, renombrar/ordenar/ocultar ejercicios y el verde de «vas bien»
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
        document: { getElementById: id => (ctx.__v && id in ctx.__v ? { value: ctx.__v[id], checked: ctx.__v[id] === true, focus() { }, select() { }, classList: { contains: () => false } } : null), querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: { style: {} } },
    };
    vm.createContext(ctx);
    for (const f of ['data/lang-en', 'data/foods-en', 'i18n', 'core', 'data/foods', 'data/foods-marcas', 'data/exercises', 'calc', 'analytics', 'progress', 'engine', 'parser', 'insights', 'gym', 'diary', 'profiles', 'dashboard', 'plans', 'kitchen', 'coach', 'app']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
    }
    const run = code => vm.runInContext(code, ctx);
    // Sin pantalla: se simulan los campos de los formularios con __v y se apagan los dibujos
    run(`toast = () => {}; toastUndo = (m, fn) => { __undo = fn; }; var __undo = null; __v = {};
        renderGym = () => {}; renderGymSearch = () => {}; renderDashboard = () => {}; renderDiary = () => {}; fsRender = () => {}; fsBack = () => {};
        closeFoodSheet = () => {}; closeSheet = () => {}; openSheet = () => {}; animDiaryRow = () => {}; checkDayMoments = () => {}; checkAchievements = () => {};
        askConfirm = async () => true;`);
    run("Object.assign(state, { gender: 'male', age: 30, height: 178, weight: 80, activity: 1.55, calcOk: true, goalType: 'lose' }); compute();");
    const json = code => JSON.parse(run(`JSON.stringify(${code})`));
    return { run, json };
}

test('Diario: cambiar nombre y macros conserva cantidad y comida; las kcal salen de las macros si no las pones', () => {
    const { run, json } = loadApp();
    const id = run("logFood(getFood('huevo'), unitsOf(getFood('huevo'))[0], 120, 'B')");
    run(`fs.editId = '${id}'; fs.slot = 'B'; __v = { 'fq-name': 'Huevos de casa', 'fq-kcal': '', 'fq-p': '15', 'fq-f': '11', 'fq-c': '1' }; fsQuickSave()`);
    const e = json(`state.diary[todayISO()].find(x => x.id === '${id}')`);
    assert.equal(e.name, 'Huevos de casa');
    assert.equal(e.g, 120, 'conserva la cantidad');
    assert.equal(e.slot, 'B');
    assert.equal(e.kcal, 15 * 4 + 1 * 4 + 11 * 9, 'kcal = 4P + 4HC + 9G');
    assert.equal(e.fid, undefined, 'ya no se recalcula con el alimento de la base');
    assert.equal(e.edited, 1);
    assert.equal(json('state.diary[todayISO()].length'), 1, 'no duplica');
});

test('Mis alimentos: editar cambia el alimento al momento; borrar no toca lo apuntado y se puede deshacer', async () => {
    const { run, json } = loadApp();
    run("__v = { 'fc-name': 'Wrap', 'fc-brand': '', 'fc-kcal': '', 'fc-p': '10', 'fc-f': '5', 'fc-c': '30', 'fc-fib': '0', 'fc-sug': '', 'fc-serv': '' }; fs.cfEdit = null; fsOpen = () => {}; fsCreateSave()");
    const fid = run('state.customFoods[0].id');
    run(`logFood(getFood('${fid}'), unitsOf(getFood('${fid}'))[0], 100, 'L')`);
    run(`__v['fc-name'] = 'Wrap de pollo'; __v['fc-p'] = '20'; fs.cfEdit = '${fid}'; fsCreateSave()`);
    assert.equal(json(`getFood('${fid}').name`), 'Wrap de pollo');
    assert.equal(json(`getFood('${fid}').p`), 20);
    assert.equal(json('state.customFoods.length'), 1, 'no crea otro');
    assert.equal(json(`state.customFoods[0] === getFood('${fid}')`), true, 'el mismo objeto en la base y en tus alimentos');
    await run(`delCustomFood('${fid}')`);
    assert.equal(json(`getFood('${fid}') || null`), null);
    assert.equal(json('state.customFoods.length'), 0);
    assert.equal(json('state.diary[todayISO()].length'), 1, 'lo apuntado se queda');
    run('__undo()');
    assert.equal(json(`getFood('${fid}').name`), 'Wrap de pollo', 'deshacer lo recupera');
});

test('Gym: renombrar en todo conserva el historial; subir/bajar ordena; ocultar de «Tus ejercicios» y volver a usarlo', () => {
    const { run, json } = loadApp();
    run("state.gym = { level: 'beginner', days: 2, eq: 'gym', myDays: 2, plan: [{ name: '', ex: [] }, { name: '', ex: [] }] }; gymDay = 0");
    run("addGymEx('', 'Press inclinado'); addGymEx('', 'Remo'); myGym().plan[1].ex.push({ id: '', n: 'Press inclinado', s: [{ kg: '', r: '' }] })");
    run("state.workouts.push({ id: 1, d: '2026-10-01', t: 'Día 1', di: 0, ex: [{ id: '', name: 'Press inclinado', sets: [{ kg: 40, reps: 8 }] }] })");
    run("__v = { 'rx-name': 'Press inclinado con mancuernas', 'rx-all': true }; renameGymExSave(0)");
    assert.equal(json('curDay().ex[0].n'), 'Press inclinado con mancuernas');
    assert.equal(json('myGym().plan[1].ex[0].n'), 'Press inclinado con mancuernas', 'también en el otro día');
    assert.equal(json('state.workouts[0].ex[0].name'), 'Press inclinado con mancuernas', 'y en el entreno guardado');
    assert.deepEqual(json('lastPerfOf(curDay().ex[0])'), [{ kg: 40, reps: 8 }], '«Última vez» sigue funcionando');
    run('moveGymEx(0, 1)');
    assert.deepEqual(json('curDay().ex.map(e => e.n)'), ['Remo', 'Press inclinado con mancuernas']);
    run('moveGymEx(0, -1)');
    assert.deepEqual(json('curDay().ex.map(e => e.n)'), ['Remo', 'Press inclinado con mancuernas'], 'no se sale de la lista');
    run("myExShown = myExercises(); hideMyEx(myExShown.indexOf('Remo'))");
    assert.ok(!json('myExercises()').includes('Remo'), 'oculto de la lista');
    assert.equal(json('state.workouts.length'), 1, 'los entrenos no cambian');
    run('removeGymEx(0); addGymEx("", "Remo")');
    assert.ok(json('myExercises()').includes('Remo'), 'al volver a usarlo, vuelve a la lista');
});

test('Paleta mixta: el verde solo aparece al llegar al objetivo', () => {
    const { run } = loadApp();
    assert.doesNotMatch(run("macroBar('Proteína', 50, 150, '#a0714b')"), /6fcf97|text-ok-400/);
    assert.match(run("macroBar('Proteína', 148, 150, '#a0714b')"), /6fcf97/);
    assert.match(run('kcalBar(1500, 2000)'), /6fcf97/);
    assert.match(run('kcalBar(2300, 2000)'), /c2603f/, 'pasarse no es verde');
});

test('Gym 3.17.1: superserie de 2 ejercicios (unir, separar, nunca tríos, se guarda en el entreno)', () => {
    const { run, json } = loadApp();
    run("state.gym = { level: 'beginner', days: 1, eq: 'gym', myDays: 1, plan: [{ name: '', ex: [] }] }; gymDay = 0; saveGymDay.length");
    run("addGymEx('', 'Curl'); addGymEx('', 'Extensión tríceps'); addGymEx('', 'Elevaciones laterales')");
    run('toggleSS(0)');
    assert.equal(json('!!curDay().ex[0].ss'), true, 'unidos');
    run('toggleSS(1)'); // el segundo de un par no puede abrir otro
    assert.equal(json('!!curDay().ex[1].ss'), false, 'nunca tres seguidos');
    assert.match(run('gymExList(curDay().ex)'), /nd-ss/);
    // Guardar: la superserie queda en el entreno
    run("curDay().ex.forEach(e => { e.s = [{ kg: '10', r: '10' }]; }); saveGymDay()");
    assert.deepEqual(json('state.workouts[0].ex.map(e => !!e.ss)'), [true, false, false]);
    // Quitar el segundo deja al primero como ejercicio normal
    run('removeGymEx(1)');
    assert.equal(json('!!curDay().ex[0].ss'), false);
    run('__undo()');
    assert.equal(json('!!curDay().ex[0].ss'), true, 'deshacer recupera la superserie');
    // Separar
    run('toggleSS(0)');
    assert.equal(json('curDay().ex.some(e => e.ss)'), false);
});

test('Gym 3.17.1: si solo hay series en uno de los dos, no se guarda como superserie', () => {
    const { run, json } = loadApp();
    run("state.gym = { level: 'beginner', days: 1, eq: 'gym', myDays: 1, plan: [{ name: '', ex: [] }] }; gymDay = 0");
    run("addGymEx('', 'Curl'); addGymEx('', 'Extensión tríceps'); toggleSS(0); curDay().ex[0].s = [{ kg: '10', r: '10' }]; saveGymDay()");
    assert.deepEqual(json('state.workouts[0].ex.map(e => !!e.ss)'), [false]);
});

test('Compartir mi semana 3.19: titular verdadero, texto sin peso y con enlace', () => {
    const { run, json } = loadApp();
    // Semana con todos los días pasados apuntados → «N/N días apuntados»
    run(`(() => { const W = calWeekStats(); W.days.filter(d => d <= todayISO()).forEach(d => { state.diary[d] = [{ id: 'x' + d, slot: 'L', name: 'Pollo', kcal: 500, p: 200, c: 0, f: 5 }]; }); state.weights = [{ d: todayISO(), w: 87.3 }]; })()`);
    const D = json('(() => { const D = weekShareData(); return { past: D.past, logged: D.logged, hero: weekHero(D), text: weekShareText(D) }; })()');
    assert.equal(D.logged, D.past);
    if (D.past >= 3) assert.equal(D.hero.n, `${D.past}/${D.past}`);
    assert.doesNotMatch(D.text, /87[,.]3|87 kg/, 'nunca el peso');
    assert.match(D.text, /https:\/\/trbsaldl\.github\.io\/FitDL\//);
    assert.match(D.text, /gratis y sin anuncios/);
    // Sin nada apuntado: un titular de bienvenida, sin cifras inventadas
    const { run: run2, json: json2 } = loadApp();
    run2('state.diary = {}; state.workouts = []');
    assert.equal(json2('weekHero(weekShareData()).n'), '');
});
