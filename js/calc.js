// FitDL · Calculadora: datos, calorías (Mifflin-St Jeor), objetivo, IMC (OMS) y macros
'use strict';

// =====================================================================
//  INPUTS
// =====================================================================
const PAIRS = { age: [18, 90], weight: [35, 250], height: [130, 220] };
const PAIR_NAME = { age: tk('edad'), weight: tk('peso'), height: tk('estatura') };
function PAIRS_OK(s) { return Object.entries(PAIRS).every(([k, [mn, mx]]) => s[k] >= mn && s[k] <= mx); }
const calcReady = () => !!state.calcOk && PAIRS_OK(state);
// Aceptar: con edad, peso y estatura válidos se calcula todo (IMC, kcal, macros…)
// Con los datos aceptados, edad, peso y estatura quedan bloqueados para no cambiarlos sin querer
// al deslizar la pantalla en el móvil. «Editar datos» los desbloquea; «Aceptar» los vuelve a bloquear.
let calcEditing = false;
function applyCalcLock() {
    const locked = calcReady() && !calcEditing;
    ['age', 'weight', 'height'].forEach(k => {
        const r = $('r-' + k), n = $('n-' + k);
        if (!r || !n) return;
        r.disabled = locked; n.readOnly = locked;
        r.closest('.space-y-2').classList.toggle('nd-locked', locked);
    });
    if ($('btn-edit')) $('btn-edit').classList.toggle('hidden', !locked);
    if ($('btn-accept')) $('btn-accept').classList.toggle('hidden', locked);
}
function editData() {
    calcEditing = true; applyCalcLock();
    toast('Cambia tus datos y pulsa Aceptar');
}
function acceptData() {
    ['age', 'weight', 'height'].forEach(k => { const v = num($('n-' + k).value); state[k] = v || 0; });
    const bad = Object.keys(PAIRS).filter(k => !(state[k] >= PAIRS[k][0] && state[k] <= PAIRS[k][1]));
    Object.keys(PAIRS).forEach(k => $('n-' + k).classList.toggle('nd-invalid', bad.includes(k)));
    if (bad.length) {
        $('calc-err').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + bad.map(k => { const nm = tr(PAIR_NAME[k]); return tr('{x}: entre {a} y {b}', { x: nm[0].toUpperCase() + nm.slice(1), a: PAIRS[k][0], b: PAIRS[k][1] }); }).join(' · ');
        $('calc-err').classList.remove('hidden');
        $('n-' + bad[0]).focus();
        return;
    }
    $('calc-err').classList.add('hidden');
    state.calcOk = true; calcEditing = false;
    syncInputsFromState(); update();
    if (innerWidth < 1024) goTo('sec-resultados');
    toast('Datos guardados: ya tienes tu IMC y tus calorías');
}
function onPair(key, el) {
    const v = parseFloat(el.value);
    el.classList.remove('nd-invalid');
    if (isNaN(v)) { if (el.type !== 'range') { state[key] = 0; state.calcOk = false; update(); } return; }
    const [mn, mx] = PAIRS[key];
    if (el.type === 'range') $('n-' + key).value = v;
    else { if (v < mn || v > mx) return; $('r-' + key).value = v; }
    state[key] = v;
    update();
}
function clampPair(key) {
    const [mn, mx] = PAIRS[key];
    let v = parseFloat($('n-' + key).value);
    if (isNaN(v)) return; // vacío: se queda vacío hasta que lo rellenes
    v = Math.min(mx, Math.max(mn, v));
    $('n-' + key).value = v; $('r-' + key).value = v;
    state[key] = v; update();
}
function setField(k, v) { state[k] = v; update(); }
function setGender(g) { state.gender = g; update(); }

async function resetInputs() {
    // Borra edad, peso, estatura y objetivo: se pide confirmación (antes se borraba al primer toque)
    if (calcReady() && !(await askConfirm('¿Restablecer tus datos? Se borrarán edad, peso, estatura y objetivo (tu diario, pesos y entrenos se conservan).', 'Restablecer'))) return;
    $('calc-err') && $('calc-err').classList.add('hidden');
    // Solo se restablece la calculadora: todo lo demás (diario, medidas, comidas guardadas, preferencias, logros…) se conserva
    const { gender, age, weight, height, calcOk, activity, goal, goalType, goalAdj, stress, exp, strategy, manualMacros, ...keep } = state;
    state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...keep, calcOk: false };
    syncInputsFromState();
    update();
}

function syncInputsFromState() {
    ['age', 'weight', 'height'].forEach(k => { $('n-' + k).value = state[k] || ''; $('r-' + k).value = state[k] || PAIRS[k][0]; });
    $('input-activity').value = String(state.activity);
}

function renderStaticToggles() {
    const act = 'bg-mint-600 text-white border-mint-600 shadow-sm';
    const actM = 'bg-mint-600 text-white border-mint-600 shadow-sm';
    const off = 'bg-neutral-800 text-neutral-300 border-neutral-800 hover:bg-neutral-700';
    const base = 'py-3 px-4 rounded-2xl font-extrabold text-xs transition border flex items-center justify-center gap-2 ';
    $('btn-gender-female').className = base + (state.gender === 'female' ? act : off);
    $('btn-gender-male').className = base + (state.gender === 'male' ? actM : off);

    document.querySelectorAll('#strategy-btns button').forEach(b => {
        b.className = 'px-3 py-1.5 rounded-xl ' + (b.dataset.strat === state.strategy ? 'bg-neutral-900 text-neutral-100 shadow-sm' : 'text-neutral-300 hover:text-white');
    });

}

// =====================================================================
//  CÁLCULOS METABÓLICOS
// =====================================================================
function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }

function bmrFormulas(w, h, a, male, ffm) {
    return {
        mifflin: 10 * w + 6.25 * h - 5 * a + (male ? 5 : -161),
        hb: male ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a,
        katch: ffm ? 370 + 21.6 * ffm : null,
    };
}

// ---------- Objetivo personalizado ----------
// Perder grasa: déficit del 10-25 % según tu IMC y tu estrés diario, sin pasar del 1 % del peso por semana
//   (ritmo 0,5-1 %/sem: Garthe 2011, Helms 2014). Ganar músculo: superávit moderado según tu experiencia
//   entrenando (mayor si empiezas, menor si eres avanzado: Iraki et al., 2019).
// Recomposición: déficit pequeño (2,5-7,5 %) con proteína alta (2,2 g/kg) y fuerza, para perder grasa y ganar
//   músculo a la vez; funciona mejor si empiezas o vuelves a entrenar (Barakat et al., 2020; Morton et al., 2018).
const GOAL_TYPES = { lose: [tk('Perder grasa'), 'fa-fire'], recomp: [tk('Recomposición'), 'fa-arrows-rotate'], maintain: [tk('Mantener'), 'fa-scale-balanced'], gain: [tk('Ganar músculo'), 'fa-dumbbell'] };
function goalTypeOf() { return state.goalType || (state.goal < 0 ? 'lose' : state.goal > 0 ? 'gain' : 'maintain'); }
function personalGoal(bmi, w, tdee) {
    const t = goalTypeOf(), adj = state.goalAdj || 0;
    if (!state.goalType) state.goalType = t; // perfiles anteriores: se fija el tipo de objetivo
    if (t === 'maintain') return { t, pct: 0, why: tr('Comes lo mismo que gastas: tu peso se mantiene y, entrenando fuerza, mejoras tu composición corporal.') };
    if (t === 'recomp') return { t, pct: -Math.min(0.075, Math.max(0.025, 0.05 + adj * 0.025)),
        why: tr('Un déficit pequeño con mucha proteína y entrenamiento de fuerza: pierdes grasa y ganas músculo a la vez. Funciona mejor si empiezas o vuelves a entrenar; tu peso cambiará poco, mira también tus medidas.') };
    if (t === 'gain') {
        const exp = state.exp || state.gym.level || 'beginner';
        const base = { beginner: 0.15, intermediate: 0.10, advanced: 0.05 }[exp];
        const pct = Math.min(0.20, Math.max(0.03, base + adj * 0.05));
        return { t, exp, pct, why: exp === 'beginner' ? tr('Si empiezas, el músculo crece más rápido: un superávit algo mayor lo aprovecha.') : exp === 'intermediate' ? tr('Con experiencia el músculo crece más despacio: un superávit moderado evita ganar grasa de más.') : tr('Cerca de tu potencial, el músculo crece lento: un superávit pequeño basta.') };
    }
    const stress = state.stress || 'mid';
    let base = bmi >= 30 ? 0.25 : bmi >= 25 ? 0.20 : 0.15;
    base += { low: 0, mid: -0.025, high: -0.05 }[stress];
    let pct = Math.min(0.25, Math.max(0.10, base + adj * 0.05));
    // Tope: nunca más del 1 % del peso por semana
    const maxDef = 0.01 * w * KCAL_PER_KG / 7;
    let capped = false;
    if (pct * tdee > maxDef) { pct = maxDef / tdee; capped = true; }
    const why = tr(bmi >= 30 ? 'Con tu IMC puedes permitirte un déficit mayor' : bmi >= 25 ? 'Con tu IMC, un déficit moderado' : 'Con un IMC en rango saludable conviene un déficit suave para no perder músculo')
        + (stress === 'high' ? tr(', y como llevas un día a día exigente lo hemos suavizado.') : stress === 'low' ? '.' : tr(', algo suavizado para que sea llevadero.'))
        + (capped ? tr(' Limitado para no perder más del 1 % de tu peso por semana.') : '');
    return { t, stress, pct: -pct, why, capped };
}
function setGoalType(t) {
    state.goalType = t; state.goalAdj = 0;
    if (t === 'gain' && !state.exp) state.exp = state.gym.level || 'beginner';
    update();
}
function renderGoalPanel() {
    const c = calc, G = c.G, t = G.t;
    const chip = (on, fn, label) => `<button type="button" ${ND.on(fn)} class="px-3 py-2 rounded-xl border text-xs font-bold ${on ? 'bg-mint-600 text-white border-mint-600' : 'bg-neutral-800/60 text-neutral-300 border-neutral-800 hover:bg-neutral-700'}">${label}</button>`;
    const types = Object.entries(GOAL_TYPES).map(([k, [l, ic]]) => `<button type="button" ${ND.on(() => setGoalType(k))} class="py-3 px-2 rounded-2xl border text-xs font-extrabold flex flex-col items-center gap-1 ${t === k ? 'bg-mint-600 text-white border-mint-600' : 'bg-neutral-800/60 text-neutral-300 border-neutral-800 hover:bg-neutral-700'}"><i class="fa-solid ${ic} text-base"></i>${tr(l)}</button>`).join('');
    let ctx = '';
    if (t === 'lose') ctx = `<div class="space-y-2"><div class="text-xs font-bold text-neutral-300">${tr('¿Cómo es tu día a día?')}</div><div class="flex flex-wrap gap-2">${chip(G.stress === 'low', () => setField('stress','low'), tr('Tranquilo'))}${chip(G.stress === 'mid', () => setField('stress','mid'), tr('Normal'))}${chip(G.stress === 'high', () => setField('stress','high'), tr('Mucho estrés'))}</div></div>`;
    if (t === 'gain') ctx = `<div class="space-y-2"><div class="text-xs font-bold text-neutral-300">${tr('¿Cuánto llevas entrenando fuerza?')}</div><div class="flex flex-wrap gap-2">${chip(G.exp === 'beginner', () => setField('exp','beginner'), tr('Menos de 1 año'))}${chip(G.exp === 'intermediate', () => setField('exp','intermediate'), tr('1-3 años'))}${chip(G.exp === 'advanced', () => setField('exp','advanced'), tr('Más de 3 años'))}</div></div>`;
    const adj = state.goalAdj || 0;
    const kcal = Math.round(c.target - c.tdee);
    const res = (t === 'lose' || t === 'recomp') && c.goal === 0 ? '<div class="text-sm font-extrabold text-neutral-100">' + tr('Sin déficit: con tu IMC no se recomienda perder peso') + '</div>'
        : t === 'maintain' ? `<div class="text-sm font-extrabold text-neutral-100">${fmt(c.target)} ${tr('kcal/día')} · ${tr('mantenimiento')}</div>`
        : `<div class="flex flex-wrap items-baseline justify-between gap-2"><div class="text-sm font-extrabold text-neutral-100">${t !== 'gain' ? tr('Déficit recomendado:') : tr('Superávit recomendado:')} <span class="text-mint-400">${G.pct > 0 ? '+' : '−'}${pctTxt(fmt(Math.abs(c.goal) * 100, 0))}</span></div><div class="text-xs font-bold text-neutral-400">${kcal > 0 ? '+' : '−'}${fmt(Math.abs(kcal))} ${tr('kcal/día')}</div></div>
           <div class="flex flex-wrap gap-2">${chip(adj === -1, () => setField('goalAdj',-1), t !== 'gain' ? tr('Más suave') : tr('Más limpio'))}${chip(adj === 0, () => setField('goalAdj',0), tr('Recomendado'))}${chip(adj === 1, () => setField('goalAdj',1), tr('Más rápido'))}</div>`;
    const M = state.manualMacros || {};
    // Siempre número: una copia de seguridad manipulada no puede colar texto en la página
    const val = k => Math.round(Number(M.on ? M[k] : (k === 'p' ? c.prot : k === 'c' ? c.carbs : c.fat))) || 0;
    const manualBox = `<details class="nd-faq" ${M.on ? 'open' : ''}><summary>${tr('Fijar mis macros a mano')}<i class="fa-solid fa-chevron-down chev"></i></summary><div class="px-3 pb-3 space-y-3">
        <p class="text-xs text-neutral-400">${tr('Si te las ha dado tu entrenador o dietista, ponlas aquí. Las calorías salen solas de las macros.')}</p>
        <div class="grid grid-cols-3 gap-2">${[['p', tk('Proteína')], ['c', tk('Hidratos')], ['f', tk('Grasas')]].map(([k, l]) => `<label class="block"><span class="text-[11px] font-bold text-neutral-400">${tr(l)} (g)</span><input id="mm-${k}" type="number" inputmode="numeric" min="0" max="600" value="${val(k)}" class="w-full mt-1 px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 font-bold text-neutral-100"></label>`).join('')}</div>
        <div class="flex flex-wrap gap-2"><button type="button" ${ND.on(saveManualMacros)} class="px-4 py-2.5 rounded-xl bg-mint-600 hover:bg-mint-700 text-white text-sm font-extrabold">${tr('Usar mis macros')}</button>${M.on ? `<button type="button" ${ND.on(clearManualMacros)} class="px-4 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm font-bold">${tr('Volver al cálculo automático')}</button>` : ''}</div>
    </div></details>`;
    const resBox = c.manual ? `<div class="text-sm font-extrabold text-neutral-100">${tr('Usando tus macros: {k} kcal/día', { k: fmt(c.target) })}</div>` : res;
    $('goal-list').innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${types}</div>${ctx}
        <div class="p-3 rounded-2xl bg-mint-500/10 border border-mint-500/30 space-y-2">${resBox}</div>${manualBox}`;
}
function saveManualMacros() {
    const v = k => Math.max(0, Math.min(600, Math.round(num($('mm-' + k).value) || 0)));
    const p = v('p'), c = v('c'), f = v('f');
    if (!p || !f) { toast(tr('Pon al menos la proteína y las grasas')); return; }
    state.manualMacros = { on: 1, p, c, f }; update(); toast(tr('Plan actualizado con tus macros'));
}
function clearManualMacros() { state.manualMacros = null; update(); toast(tr('Vuelves al cálculo automático')); }
function compute() {
    const male = state.gender === 'male';
    const w = state.weight, hcm = state.height, a = state.age, h = hcm / 100;
    const alerts = [];
    const bmiRaw = w / (h * h);
    // IMC redondeado a 1 decimal ANTES de clasificar: la categoría coincide siempre con la cifra mostrada (criterio CDC)
    const bmi = Math.round(bmiRaw * 10) / 10;
    const bf = null, bfSrc = '', ffm = null;
    // Mifflin-St Jeor: la ecuación más precisa en población general (Frankenfield et al., 2005)
    const B = bmrFormulas(w, hcm, a, male, null);
    const formula = 'mifflin';
    const bmr = B[formula];
    const tdeeEst = bmr * state.activity;
    const tdee = tdeeEst; // la calibración manual se quitó (2026-10-06)

    const G = personalGoal(bmi, w, tdee);
    let goal = G.pct;
    if (bmi < 18.5 && goal < 0) {
        goal = 0;
        alerts.push({ t: 'danger', m: tr('Tu IMC indica bajo peso. No recomendamos hacer déficit calórico: te mostramos calorías de mantenimiento. Consulta con un profesional.') });
    }
    let target = tdee * (1 + goal);
    const floor = male ? 1500 : 1200;
    if (goal < 0 && target < floor) {
        const newT = Math.min(floor, tdee);
        if (newT > target) {
            target = newT;
            alerts.push({ t: 'warn', m: tr('Hemos subido tus calorías al mínimo seguro de {k} kcal (sin supervisión médica no se recomienda comer menos). Para perder más, aumenta tu actividad diaria (pasos).', { k: fmt(floor) }) });
        }
    }
    if (goal <= -0.25 && bmi < 27) alerts.push({ t: 'warn', m: tr('Con tu IMC, un déficit del 25 % aumenta el riesgo de perder músculo. Recomendamos −20 % o menos.') });
    target = Math.round(target);

    let weeklyKg = (target - tdee) * 7 / KCAL_PER_KG;
    let weeklyPct = weeklyKg / w * 100;
    if (weeklyPct < -1) alerts.push({ t: 'warn', m: tr('Ritmo previsto: {p} % de tu peso por semana. Por encima del 1 % semanal aumenta la pérdida de masa muscular.', { p: fmt(weeklyPct, 1) }) });
    if (a >= 65) alerts.push({ t: 'info', m: tr('A partir de 65 años las necesidades de proteína son mayores (≥ {g} g/kg) y el IMC saludable se desplaza algo hacia arriba. Valida el plan con un profesional.', { g: fmt(1.2, 1) }) });

    // Macros
    const refWeight = bmi >= 30 ? 25 * h * h : w;
    const gkg = G.t === 'recomp' ? 2.2 : { highprotein: goal < 0 ? 2.0 : 1.8, balanced: 1.6, lowcarb: 1.8 }[state.strategy];
    const fatPct = { highprotein: 0.25, balanced: 0.30, lowcarb: 0.40 }[state.strategy];
    let prot = Math.round(gkg * refWeight);
    if (prot * 4 > 0.40 * target) prot = Math.round(0.40 * target / 4);
    let fat = Math.round(Math.max(fatPct * target, 0.20 * target, 0.6 * refWeight * 9) / 9);
    const fiber = Math.max(25, Math.round(14 * target / 1000));
    let carbs = Math.round((target - prot * 4 - fat * 9 - fiber * 2) / 4);
    if (carbs < 0) {
        fat = Math.round(0.20 * target / 9);
        carbs = Math.max(0, Math.round((target - prot * 4 - fat * 9 - fiber * 2) / 4));
    }
    // Macros a mano (las fija la persona, p. ej. las de su entrenador): las calorías salen de ellas,
    // con la misma cuenta que el cálculo automático (4·P + 4·HC + 9·G + 2·fibra). Solo se avisa, no se bloquea.
    const MM = state.manualMacros, mm = k => Math.min(600, Math.max(0, Math.round(Number(MM && MM[k])) || 0));
    const manual = !!(MM && MM.on && mm('p') > 0 && mm('f') > 0);
    if (manual) {
        prot = mm('p'); carbs = mm('c'); fat = mm('f');
        target = Math.round(prot * 4 + carbs * 4 + fat * 9 + fiber * 2);
        weeklyKg = (target - tdee) * 7 / KCAL_PER_KG; weeklyPct = weeklyKg / w * 100;
        if (target < floor) alerts.push({ t: 'warn', m: tr('Tus macros suman {k} kcal, por debajo del mínimo seguro de {m} kcal sin supervisión médica.', { k: fmt(target), m: fmt(floor) }) });
    }

    const minIdeal = 18.5 * h * h, maxIdeal = 24.9 * h * h;
    const actExtra = { 1.2: 0, 1.375: 0.25, 1.55: 0.5, 1.725: 0.75, 1.9: 1.0 }[state.activity] || 0;
    const water = (male ? 2.0 : 1.6) + actExtra;
    const whtr = null;

    state.goal = Math.round(goal * 1000) / 1000;
    calc = { male, w, h, hcm, a, bmi, bmiRaw, G, bf, bfSrc, ffm, B, formula, bmr, tdeeEst, tdee, goal, target, weeklyKg, weeklyPct, refWeight, gkg, prot, fat, carbs, fiber, minIdeal, maxIdeal, water, whtr, alerts, manual };
}

// =====================================================================
//  RENDER RESULTADOS
// =====================================================================
function renderResults() {
    const c = calc;
    $('res-bmr').innerText = fmt(c.bmr);
    $('res-tdee').innerText = fmt(c.tdee);
    $('res-target-kcal').innerText = fmt(c.target);
    renderGoalPanel();
    const wk = c.weeklyKg;
    $('res-rate').innerHTML = Math.abs(wk) < 0.01 ? tr('Peso estable.') :
        tr(wk < 0 ? 'Pérdida estimada: {k} ({p} % del peso)' : 'Ganancia estimada: {k} ({p} % del peso)', { k: `<strong class="text-white">${fmt(Math.abs(wk), 2)} ${tr('kg/semana')}</strong>`, p: fmt(Math.abs(c.weeklyPct), 1) });

    const alertCls = { danger: 'bg-roseAccent-50 border-roseAccent-200 text-roseAccent-800', warn: 'bg-amber-500/10 border-amber-500/30 text-amber-200', info: 'bg-blue-500/10 border-blue-500/30 text-blue-200' };
    const alertIcon = { danger: 'fa-circle-exclamation', warn: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    $('alerts').innerHTML = c.alerts.map(al => `<div class="flex gap-3 items-start p-3 rounded-2xl border text-xs font-semibold ${alertCls[al.t]}"><i class="fa-solid ${alertIcon[al.t]} mt-0.5"></i><span>${al.m}</span></div>`).join('');

    // IMC exacto (OMS, adultos ≥ 18 años)
    const b = c.bmi;
    const WHO = [[16, tk('Delgadez severa'), 'blue'], [17, tk('Delgadez moderada'), 'blue'], [18.5, tk('Delgadez leve'), 'blue'], [25, tk('Peso normal'), 'mint'], [30, tk('Sobrepeso (preobesidad)'), 'amber'], [35, tk('Obesidad de grado I'), 'rose'], [40, tk('Obesidad de grado II'), 'rose'], [999, tk('Obesidad de grado III'), 'rose']];
    const who = WHO.find(x => b < x[0]);
    const cat = b < 18.5 ? tr('Bajo peso') : b < 25 ? tr('Peso saludable') : b < 30 ? tr('Sobrepeso') : b < 35 ? tr('Obesidad grado I') : b < 40 ? tr('Obesidad grado II') : tr('Obesidad grado III');
    const CLS = { blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30', mint: 'bg-mint-500/15 text-mint-300 border-mint-500/30', amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30', rose: 'bg-roseAccent-100 text-roseAccent-800 border-roseAccent-200' };
    c.bmiCat = cat;
    $('res-bmi-val').innerText = fmt(b, 1);
    const badge = $('badge-bmi-category'); badge.innerText = cat;
    badge.className = 'px-3 py-1 rounded-full text-xs font-extrabold border whitespace-nowrap ' + CLS[who[2]];
    $('bmi-marker').style.left = ((Math.min(40, Math.max(15, b)) - 15) / 25 * 100) + '%';
    $('res-ideal-weight').innerText = `${fmt(c.minIdeal, 1)} – ${fmt(c.maxIdeal, 1)} kg`;
    $('res-bmi-gap').innerHTML = b < 18.5 ? `<span class="text-blue-300">${tr('Ganar {k} kg', { k: fmt(c.minIdeal - c.w, 1) })}</span>` : b > 24.9 ? `<span class="text-amber-300">${tr('Perder {k} kg', { k: fmt(c.w - c.maxIdeal, 1) })}</span>` : '<span class="text-mint-400">' + tr('Ya estás dentro ✓') + '</span>';
    $('res-bmi-prime').innerText = fmt(c.bmiRaw / 25, 2);
    $('res-bmi-who').innerText = tr(who[1]);
    $('bmi-table').innerHTML = WHO.map((x, i) => { const lo = i ? WHO[i - 1][0] : null; const rng = lo === null ? '< ' + fmt(16, 1) : x[0] === 999 ? '≥ ' + fmt(40, 1) : `${fmt(lo, 1)} – ${fmt(x[0] - 0.1, 1)}`; const on = x === who; return `<span class="${on ? 'font-extrabold text-mint-400' : ''}">${tr(x[1])}${on ? ' ← ' + tr('tú') : ''}</span><span class="text-right ${on ? 'font-extrabold text-mint-400' : 'text-neutral-400'}">${rng}</span>`; }).join('');
    const notes = [tr('El IMC no distingue músculo de grasa: si entrenas fuerza y tienes mucha masa muscular puede salir alto sin que sobre grasa.')];
    if (c.a >= 65) notes.push(tr('Mayor de 65 años: el menor riesgo de mortalidad se observa con un IMC algo más alto, en torno a 24-30 (Winter et al., 2014); por debajo de 23 conviene vigilar la pérdida de músculo.'));
    notes.push(tr('En población de origen asiático la OMS propone puntos de acción más bajos: 23 (riesgo aumentado) y {x} (riesgo alto).', { x: fmt(27.5, 1) }));

    // Macros
    const pk = c.prot * 4, fk = c.fat * 9, ck = c.carbs * 4, tot = c.target;
    const pp = Math.round(pk / tot * 100), fp = Math.round(fk / tot * 100), cp = Math.round(ck / tot * 100);
    $('res-prot-grams').innerText = `${c.prot} g`; $('res-prot-kcal').innerText = `${fmt(pk)} kcal`; $('pct-prot').innerText = `${pp} %`; $('bar-prot').style.width = pp + '%';
    $('res-fats-grams').innerText = `${c.fat} g`; $('res-fats-kcal').innerText = `${fmt(fk)} kcal`; $('pct-fats').innerText = `${fp} %`; $('bar-fats').style.width = fp + '%';
    $('res-carbs-grams').innerText = `${c.carbs} g`; $('res-carbs-kcal').innerText = `${fmt(ck)} kcal`; $('pct-carbs').innerText = `${cp} %`; $('bar-carbs').style.width = cp + '%';
    $('res-fiber').innerText = `${c.fiber} ${tr('g/día')} (${fmt(c.fiber * 2)} kcal)`;
    $('res-water').innerText = tr('≈ {l} L/día + {m} L por hora de ejercicio', { l: fmt(c.water, 1), m: fmt(0.5, 1) });
    renderExplain();
}
// «Cómo se ha calculado»: los pasos del plan con tus números (también en el asistente)
const ACT_NAME = { 1.2: tk('sedentaria|actividad'), 1.375: tk('ligera|actividad'), 1.55: tk('moderada|actividad'), 1.725: tk('alta|actividad'), 1.9: tk('muy alta|actividad') };
function explainLines() {
    const c = calc;
    return [
        tr('<b>Gasto basal:</b> {b} kcal, con la ecuación de Mifflin-St Jeor (sexo, edad, peso y estatura).', { b: fmt(c.bmr) }),
        tr('<b>Mantenimiento:</b> {b} × {f} por tu actividad {a} = {t} kcal.', { b: fmt(c.bmr), f: fmt(state.activity, 3).replace(/[,.]?0+$/, ''), a: tr(ACT_NAME[state.activity] || ''), t: fmt(c.tdee) }),
        tr('<b>Objetivo:</b> {g} → <b>{t} kcal/día</b>{m}.', { g: c.goal === 0 ? tr('mantenimiento') : tr(c.goal < 0 ? 'déficit del {p} %' : 'superávit del {p} %', { p: fmt(Math.abs(c.goal) * 100, 0) }), t: fmt(c.target), m: c.goal < 0 ? tr(', sin bajar nunca de {k} kcal', { k: fmt(c.male ? 1500 : 1200) }) : '' }),
        tr('<b>Proteína:</b> {g} g por kg de {r} → {p} g. <b>Grasa:</b> {f} g ({fp} % de las calorías). <b>Hidratos:</b> el resto, {c} g.', { g: fmt(c.gkg, 1), r: tr(c.bmi >= 30 ? 'tu peso de referencia' : 'peso|referencia'), p: c.prot, f: c.fat, fp: Math.round(c.fat * 9 / c.target * 100), c: c.carbs }),
    ];
}
function renderExplain() {
    const box = $('calc-explain'); if (!box || !calc.target) return;
    box.innerHTML = `<details class="rounded-2xl border border-neutral-800"><summary class="p-3 text-xs font-bold text-neutral-300 flex items-center justify-between"><span><i class="fa-solid fa-circle-info text-mint-400"></i> ${tr('Cómo se ha calculado')}</span><i class="fa-solid fa-chevron-down chev text-neutral-500"></i></summary>
        <div class="px-3 pb-3 space-y-1.5 text-xs text-neutral-300 leading-relaxed">${explainLines().map(l => `<p>${l}</p>`).join('')}</div></details>`;
}

