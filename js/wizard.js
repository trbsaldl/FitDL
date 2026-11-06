// FitDL · Asistente para crear el perfil
'use strict';

// =====================================================================
//  AÑADIDO: ASISTENTE PASO A PASO
// =====================================================================
const WZ_STEPS = ['name', 'goal', 'gender', 'body', 'activity', 'training', 'diet', 'meals', 'loading', 'done'];
const WZ_Q = WZ_STEPS.indexOf('loading'); // nº de preguntas
const wz = { i: 0, timers: [] };

function openWizard(mode) {
    wz.mode = mode || (profiles.current ? 'edit' : 'create');
    wz.name = profiles.current && wz.mode === 'edit' ? profiles.list[profiles.current].name : (wz.mode === 'create' ? '' : wz.name || '');
    wz.done = false; wz.i = 0; $('wizard').classList.remove('hidden'); document.body.style.overflow = 'hidden'; renderWz();
}
function closeWizard() {
    wz.timers.forEach(clearTimeout); wz.timers = []; $('wizard').classList.add('hidden'); document.body.style.overflow = '';
    // Si se cancela la creación de una persona nueva, se vuelve al perfil que había
    if (wz.mode === 'create' && !wz.done && wz.prevProfile) { const prev = wz.prevProfile; wz.prevProfile = null; switchProfile(prev, true); }
    if (wz.done && typeof pendingFoodLink === 'function') pendingFoodLink();
}
function wzSet(k, v) { state[k] = v; wzNext(); }
// Entrenamiento de fuerza: si aún no has elegido tus días de gym, se preparan con ese número
function wzTraining(n) {
    state.training = n;
    if (n > 0 && !gymDays()) { const g = myGym(); g.myDays = n; while (g.plan.length < n) g.plan.push({ name: '', ex: [] }); }
    if (!state.exp) state.exp = 'beginner';
    wzNext();
}
function wzPref(k, v) { myPrefs()[k] = v; if (k === 'meals') return wzNext(); renderWz(); }
function wzAllergy(k) { const p = myPrefs(); p.allergies = p.allergies.includes(k) ? p.allergies.filter(x => x !== k) : p.allergies.concat(k); renderWz(); }
function wzGoal(t, adj) { state.goalType = t; state.goalAdj = adj; state.goal = t === 'lose' ? -0.15 : t === 'gain' ? 0.10 : t === 'recomp' ? -0.05 : 0; if (t === 'gain' && !state.exp) state.exp = state.gym.level || 'beginner'; wzNext(); }
function wzNext() {
    const step = WZ_STEPS[wz.i];
    if (step === 'name') {
        const n = ($('wz-name').value || '').trim();
        if (!n) { toast('Escribe tu nombre para crear tu perfil'); return; }
        wz.name = n.slice(0, 30);
    }
    if (step === 'body') {
        const a = num($('wz-age').value), h = num($('wz-h').value), w = num($('wz-w').value);
        if (!a || a < 18 || a > 90) { toast('Edad entre 18 y 90 años'); return; }
        if (!h || h < 130 || h > 220) { toast('Estatura entre 130 y 220 cm'); return; }
        if (!w || w < 35 || w > 250) { toast('Peso entre 35 y 250 kg'); return; }
        Object.assign(state, { age: a, height: h, weight: w, calcOk: true });
    }
    wz.i++;
    renderWz();
    if (WZ_STEPS[wz.i] === 'loading') wzLoading();
}
function wzBack() {
    if (wz.i <= 0) return;
    wz.i--;
    renderWz();
}
function wzLoading() {
    const n = document.querySelectorAll('#wz-body [data-load]').length;
    for (let k = 0; k < n; k++) {
        wz.timers.push(setTimeout(() => {
            const el = document.querySelector(`#wz-body [data-load="${k}"]`);
            if (el) { el.querySelector('i').className = 'fa-solid fa-circle-check text-mint-600'; el.classList.remove('text-neutral-500'); }
        }, 450 * (k + 1)));
    }
    wz.timers.push(setTimeout(() => {
        finishProfileFromWizard(); track('onboarding_done');
        syncInputsFromState();
        update();
        renderTracker(); renderProfileChip(); renderDiary(); renderGym();
        wz.i++; renderWz();
    }, 450 * n + 350));
}
function countUp(el, to) {
    const t0 = performance.now(), dur = 900;
    const tick = now => { const p = Math.min(1, (now - t0) / dur); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
}
function renderWz() {
    const step = WZ_STEPS[wz.i];
    $('wz-bar').style.width = Math.min(100, wz.i / WZ_Q * 100) + '%';
    $('wz-count').innerText = wz.i < WZ_Q ? tr('Paso {a} de {b}', { a: wz.i + 1, b: WZ_Q }) : step === 'loading' ? tr('Creando tu plan…') : tr('¡Plan listo!');
    $('wz-back').style.visibility = wz.i > 0 && wz.i < WZ_Q ? 'visible' : 'hidden';
    const title = t => `<h2 id="wz-title" class="text-xl sm:text-2xl font-extrabold text-neutral-100 mb-5">${t}</h2>`; // sin subtítulos
    const tile = (on, onclick, emoji, t, d) => `<button onclick="${onclick}" class="wz-tile w-full text-left p-4 rounded-2xl border flex items-center gap-4 ${on ? 'border-mint-600 bg-mint-500/10' : 'border-neutral-800 hover:border-mint-400 bg-neutral-900'}">${emoji ? `<span class="nd-ic">${icon(emoji)}</span>` : ""}<span class="min-w-0"><span class="block font-extrabold text-sm text-neutral-100">${t}</span>${d && step === 'activity' ? `<span class="block text-xs text-neutral-400">${d}</span>` : ''}</span></button>`;
    const next = (label, dis) => `<button onclick="wzNext()" ${dis ? 'disabled' : ''} class="w-full py-4 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold text-sm cta-glow flex items-center justify-center gap-2 ${dis ? 'opacity-50' : ''}">${label || tr('Continuar')} <i class="fa-solid fa-arrow-right"></i></button>`;
    // Opciones cortas en rejilla de 2: emoji arriba y texto debajo (cabe en móviles pequeños)
    const tileV = (on, onclick, emoji, t) => `<button onclick="${onclick}" class="wz-tile w-full p-4 rounded-2xl border flex flex-col items-center gap-2 text-center ${on ? 'border-mint-600 bg-mint-500/10' : 'border-neutral-800 hover:border-mint-400 bg-neutral-900'}">${emoji ? `<span class="nd-ic">${icon(emoji)}</span>` : ""}<span class="font-extrabold text-sm text-neutral-100">${t}</span></button>`;
    let body = '', foot = '';
    switch (step) {
        case 'name':
            body = title(wz.mode === 'edit' ? tr('Tu perfil') : tr('¿Cómo te llamas?'), wz.mode === 'edit' ? 'Revisa tus datos: todo se recalculará al terminar.' : 'Crearemos tu perfil: la próxima vez que entres estará todo listo (peso, calorías, menú, diario y gym).') + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                `<label class="block p-4 rounded-2xl border-2 border-neutral-800 focus-within:border-mint-500"><span class="text-xs font-bold text-neutral-400 uppercase">${tr('Nombre')}</span><input id="wz-name" type="text" maxlength="30" autocomplete="given-name" value="${esc(wz.name || '')}" placeholder="${tr('Ej: {x}', { x: 'Laura' })}" class="w-full text-3xl font-extrabold text-neutral-100 outline-none bg-transparent"></label>
                <p class="text-xs text-neutral-500 mt-3"><i class="fa-solid fa-lock"></i> ${tr('Sin contraseñas: tu perfil se guarda solo en este dispositivo.')}</p>`;
            foot = next();
            break;
        case 'goal':
            body = title(tr('¿Qué quieres conseguir?'), 'Elige tu objetivo principal. Podrás cambiarlo después.') + `<div class="grid gap-3">` + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(goalTypeOf() === 'lose' && (state.goalAdj || 0) >= 0, "wzGoal('lose',0)", '🔥', tr('Perder grasa'), 'Bajar de peso a un ritmo saludable y sostenible') + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(goalTypeOf() === 'lose' && state.goalAdj === -1, "wzGoal('lose',-1)", '🌱', tr('Perder peso poco a poco'), 'Sin prisa y con el mínimo hambre posible') + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(goalTypeOf() === 'recomp', "wzGoal('recomp',0)", '🔄', tr('Recomposición corporal'), 'Perder grasa y ganar músculo a la vez') + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(goalTypeOf() === 'maintain', "wzGoal('maintain',0)", '⚖️', tr('Mantener mi peso'), 'Comer mejor, tener energía y tonificar') + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(goalTypeOf() === 'gain', "wzGoal('gain',0)", '💪', tr('Ganar músculo'), 'Superávit moderado para minimizar grasa') + `</div>`; // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
            break;
        case 'gender':
            body = title(tr('¿Cuál es tu sexo biológico?'), 'Hombres y mujeres tienen metabolismos distintos: lo necesitamos para la fórmula.') + `<div class="grid grid-cols-2 gap-3">` + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(state.gender === 'female', "wzSet('gender','female')", '👩', tr('Mujer'), '') +
                tile(state.gender === 'male', "wzSet('gender','male')", '👨', tr('Hombre'), '') + `</div>`;
            break;
        case 'body': {
            const inp = (id, lab, val, unit, st) => `<label class="block p-4 rounded-2xl border-2 border-neutral-800 focus-within:border-mint-500"><span class="text-xs font-bold text-neutral-400 uppercase">${lab}</span><span class="flex items-baseline gap-2"><input id="${id}" type="number" inputmode="decimal" step="${st}" value="${val || ''}" placeholder="0" class="w-full text-3xl font-extrabold text-neutral-100 outline-none bg-transparent"><span class="text-sm font-bold text-neutral-500">${unit}</span></span></label>`;
            body = title(tr('Cuéntanos sobre tu cuerpo'), 'Datos privados: se quedan en tu navegador.') + `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">` + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                inp('wz-age', tr('Edad'), state.age, tr('años'), 1) + inp('wz-h', tr('Estatura'), state.height, 'cm', 1) + inp('wz-w', tr('Peso actual'), state.weight, 'kg', 0.1) + `</div>`;
            foot = next();
            break;
        }
        case 'activity':
            body = title(tr('¿Cómo de activo es tu día a día?'), 'Sé sincero: casi todos nos sobreestimamos. Si dudas, elige el nivel inferior.') + `<div class="grid gap-3">` + // i18n-ignore (el 2.º texto de title() y las descripciones de objetivo ya no se enseñan)
                tile(state.activity === 1.2, "wzSet('activity',1.2)", '🛋️', tr('Sedentario'), tr('Trabajo sentado, menos de 5.000 pasos, sin ejercicio')) +
                tile(state.activity === 1.375, "wzSet('activity',1.375)", '🚶', tr('Ligero'), tr('5.000-7.500 pasos o ejercicio 1-3 días/semana')) +
                tile(state.activity === 1.55, "wzSet('activity',1.55)", '🏃', tr('Moderado'), tr('7.500-10.000 pasos o ejercicio 3-5 días/semana')) +
                tile(state.activity === 1.725, "wzSet('activity',1.725)", '🏋️', tr('Alto'), tr('Más de 10.000 pasos y entreno 6-7 días')) +
                tile(state.activity === 1.9, "wzSet('activity',1.9)", '⛏️', tr('Muy alto'), tr('Trabajo físico duro y entreno diario')) + `</div>`;
            break;
        case 'training':
            body = title(tr('¿Entrenas fuerza (pesas, máquinas)?')) + `<div class="grid grid-cols-2 gap-3">` +
                tileV(state.training === 0, 'wzTraining(0)', '🚶', tr('No entreno'), '') +
                tileV(state.training === 2, 'wzTraining(2)', '🏋️', tr('1-2 días'), '') +
                tileV(state.training === 3, 'wzTraining(3)', '💪', tr('3 días'), '') +
                tileV(state.training === 4, 'wzTraining(4)', '🔥', tr('4 días o más'), '') + `</div>`;
            break;
        case 'diet': {
            const p = myPrefs();
            const chip = (on, onclick, l) => `<button type="button" onclick="${onclick}" aria-pressed="${on}" class="px-3 py-2 rounded-xl border text-xs font-bold ${on ? 'bg-mint-600 text-white border-mint-600' : 'bg-neutral-800/60 text-neutral-300 border-neutral-800'}">${l}</button>`;
            body = title(tr('¿Cómo comes?')) + `<div class="grid grid-cols-2 gap-3">` +
                tileV(p.diet === 'omni', "wzPref('diet','omni')", '🍗', tr('De todo'), '') + tileV(p.diet === 'pesc', "wzPref('diet','pesc')", '🐟', tr('Pescetariana'), '') +
                tileV(p.diet === 'veg', "wzPref('diet','veg')", '🥚', tr('Vegetariana'), '') + tileV(p.diet === 'vegan', "wzPref('diet','vegan')", '🌱', tr('Vegana'), '') + `</div>
                <div class="mt-5 space-y-2"><div class="text-xs font-bold text-neutral-400 uppercase">${tr('Alergias o intolerancias')}</div><div class="flex flex-wrap gap-2">${Object.entries(ALLERGENS).map(([k, [l]]) => chip(p.allergies.includes(k), `wzAllergy('${k}')`, tr(l))).join('')}</div></div>`;
            foot = next();
            break;
        }
        case 'meals':
            body = title(tr('¿Cuántas comidas haces al día?')) + `<div class="grid grid-cols-3 gap-3">` +
                [3, 4, 5].map(n => tileV(myPrefs().meals === n, `wzPref('meals',${n})`, ['', '', '', '🍽️', '🥪', '🍎'][n], tr('{k} comidas', { k: n }), '')).join('') + `</div>`;
            break;
        case 'loading': {
            const items = [tr('Calculando tu metabolismo basal (Mifflin-St Jeor)'), tr('Ajustando tu objetivo de forma segura'), tr('Repartiendo proteína, grasa e hidratos'), tr('Preparando tu Coach, tu diario y tu gym')];
            body = `<div class="py-6 text-center space-y-6"><div class="nd-ic-xl mx-auto">${icon('🥗')}</div><h2 id="wz-title" class="text-xl font-extrabold">${tr('Creando tu plan personalizado…')}</h2>
                <ul class="text-left max-w-sm mx-auto space-y-3 text-sm font-semibold">${items.map((t, k) => `<li data-load="${k}" class="flex items-center gap-3 text-neutral-500"><i class="fa-solid fa-circle-notch fa-spin text-mint-500"></i>${t}</li>`).join('')}</ul></div>`;
            break;
        }
        case 'done': {
            const c = calc, wk = c.weeklyKg;
            const mac = (l, v, col) => `<div class="p-3 rounded-2xl bg-neutral-900/70 border border-white/5 text-center"><div class="text-xl font-extrabold text-neutral-50">${v} g</div><div class="text-[11px] font-bold" style="color:${col}">${l}</div></div>`;
            body = `<div class="text-center space-y-1 mb-5"><div class="nd-ic-xl mx-auto">${icon('🎯')}</div><h2 id="wz-title" class="text-2xl font-extrabold">${tr('Tu plan personal')}</h2></div>
                <div class="space-y-3">
                    <div class="p-5 rounded-2xl nd-now text-center">
                        <div class="text-xs font-bold uppercase tracking-wider text-mint-300">${tr('Calorías al día')}</div>
                        <div class="text-5xl font-extrabold text-neutral-50"><span id="wz-kcal">0</span> <span class="text-base text-neutral-400">kcal</span></div>
                        <div class="text-xs text-neutral-300 mt-1">${Math.abs(wk) < 0.01 ? tr('Para mantener tu peso') : wk < 0 ? tr('Perderás ≈ {k} kg por semana', { k: fmt(Math.abs(wk), 2) }) : tr('Ganarás ≈ {k} kg por semana', { k: fmt(Math.abs(wk), 2) })}</div>
                    </div>
                    <div class="grid grid-cols-3 gap-2">${mac(tr('Proteína'), c.prot, '#c49a6c')}${mac(tr('Hidratos'), c.carbs, '#e6d3b3')}${mac(tr('Grasas'), c.fat, '#f59e0b')}</div>
                    <details class="rounded-2xl border border-neutral-800" open><summary class="p-3 text-xs font-bold text-neutral-300 flex items-center justify-between"><span><i class="fa-solid fa-circle-info text-mint-400"></i> ${tr('Cómo lo hemos calculado')}</span><i class="fa-solid fa-chevron-down chev text-neutral-500"></i></summary>
                        <div class="px-3 pb-3 space-y-1.5 text-xs text-neutral-300 leading-relaxed">${explainLines().map(l => `<p>${l}</p>`).join('')}</div></details>
                    ${c.alerts.filter(a => a.t !== 'info').map(a => `<div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">${a.m}</div>`).join('')}
                </div>`;
            foot = `<button onclick="closeWizard();showTab('home')" class="w-full py-4 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold text-base cta-glow flex items-center justify-center gap-2">${tr('Empezar')} <i class="fa-solid fa-arrow-right"></i></button>
                <button onclick="closeWizard();showTab('calc')" class="w-full mt-2 py-2 text-xs font-bold text-neutral-400 hover:text-neutral-200">${tr('Ver mi plan completo')}</button>`;
            break;
        }
    }
    $('wz-body').innerHTML = `<div class="wz-anim">${body}</div>`;
    $('wz-foot').innerHTML = foot;
    $('wz-foot').classList.toggle('hidden', !foot);
    if (step === 'done') countUp($('wz-kcal'), calc.target);
    const firstInput = $('wz-body').querySelector('input[type=number]');
    if (firstInput && window.innerWidth >= 640) firstInput.focus();
}

