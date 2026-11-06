// FitDL · Panel de inicio del perfil
'use strict';

// =====================================================================
//  PANEL DE INICIO DEL PERFIL
// =====================================================================
function ring(value, target, size = 132) {
    const r = size / 2 - 10, C = 2 * Math.PI * r, pct = target > 0 ? Math.min(1, value / target) : 0;
    const over = value > target * 1.05;
    return `<svg viewBox="0 0 ${size} ${size}" class="w-full h-auto max-w-[150px]" role="img" aria-label="${tr('{a} de {b} kcal', { a: fmt(value), b: fmt(target) })}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2a2521" stroke-width="12"/>
        <circle class="ring-prog" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? '#c2603f' : '#6fcf97'}" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="50%" y="47%" text-anchor="middle" font-size="22" font-weight="800" fill="#f2ede6">${fmt(value)}</text>
        <text x="50%" y="62%" text-anchor="middle" font-size="10" fill="#aea396">${tr('de {b} kcal', { b: fmt(target) })}</text>
    </svg>`;
}
function macroBar(label, val, target, color) {
    const pct = target > 0 ? Math.min(100, val / target * 100) : 0, ok = target > 0 && val >= target * .95;
    return `<div class="space-y-1"><div class="flex justify-between text-[11px] font-bold"><span class="text-neutral-300">${label}</span><span class="${ok ? 'text-ok-400' : 'text-neutral-400'}">${fmt(val)} / ${fmt(target)} g${ok ? ' <i class="fa-solid fa-circle-check"></i>' : ''}</span></div>
        <div class="h-2 rounded-full bg-neutral-800 overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${ok ? '#6fcf97' : color}"></div></div></div>`;
}
// «Hoy»: objetivo, lo que llevas y lo que te queda, qué hacer ahora, accesos rápidos y cómo vas
const GOAL_LABEL = { lose: ['🔥', tk('Perder grasa')], recomp: ['🔄', tk('Recomposición')], maintain: ['⚖️', tk('Mantener peso')], gain: ['💪', tk('Ganar músculo')] };
function kcalBar(v, t) {
    const pct = t > 0 ? Math.min(100, v / t * 100) : 0, over = v > t * 1.05;
    return `<div class="nd-kbar" role="progressbar" aria-valuemin="0" aria-valuemax="${Math.round(t)}" aria-valuenow="${Math.round(v)}" aria-label="${tr('Calorías de hoy')}"><div style="width:${pct}%;background:${over ? '#c2603f' : '#6fcf97'}"></div></div>`;
}
function macroRow(label, val, target, color) {
    const pct = target > 0 ? Math.min(100, val / target * 100) : 0, ok = val >= target * .95;
    return `<div class="space-y-1.5"><div class="flex items-baseline justify-between gap-2"><span class="text-sm font-bold text-neutral-200">${label}</span><span class="text-sm font-extrabold text-neutral-50">${fmt(val)}<span class="text-neutral-400 font-bold"> / ${fmt(target)} g</span>${ok ? ' <i class="fa-solid fa-circle-check text-ok-400"></i>' : ''}</span></div>
        <div class="h-2 rounded-full bg-neutral-800 overflow-hidden"><div class="h-full rounded-full nd-grow" style="width:${pct}%;background:${ok ? '#6fcf97' : color}"></div></div></div>`;
}
// La acción más útil ahora mismo
function nowAction() {
    const c = calc, d = todayISO(), t = diaryTotals(d), R = { kcal: c.target - t.kcal, p: c.prot - t.p }, nm = nextMeal();
    if (R.kcal < -100) return { ic: '🧘', title: tr('Hoy vas {k} kcal por encima', { k: fmt(-R.kcal) }), sub: tr('No pasa nada por un día: lo que cuenta es tu media de la semana.'), btn: [tr('Ver mi semana'), "showTab('progress')"] };
    if (nm && nm.slot && nm.tg.kcal >= 120) return { ic: '🍽️', kicker: tr('Próxima comida'), title: `${tr(SLOT_NAME[nm.slot])} · ${fmt(nm.tg.kcal)} kcal`, sub: tr('Recomendado: unos {g} g de proteína', { g: fmt(nm.tg.p) }), btn: [tr('Ver opciones'), `openWhatToEat('${nm.slot}')`], btn2: [tr('Apuntar'), `openFoodSheet('${nm.slot}')`] };
    if (R.p > 15) return { ic: '🥩', title: tr('Te faltan {g} g de proteína', { g: fmt(R.p) }), sub: tr('Y te quedan {k} kcal. Un lácteo proteico o algo de pavo lo resuelve.', { k: fmt(Math.max(0, R.kcal)) }), btn: [tr('Ideas'), "showTab('coach');coachAsk('¿Cómo llego a mis proteínas?')"] }; // i18n-ignore (la frase ya es clave en chatSuggestions)
    if (t.kcal > 0) return { ic: '🔥', title: tr('Día prácticamente completado'), sub: tr('Buen trabajo. Mañana, a por otro.'), btn: [tr('Ver mi progreso'), "showTab('progress')"] };
    return { ic: '☀️', title: tr('Empieza tu día'), sub: tr('Apunta tu primera comida.'), btn: [tr('Apuntar'), 'openFoodSheet()'] };
}
function renderDashboard() {
    renderLocks();
    const box = $('dashboard'); if (!box) return;
    const cur = profiles.list[profiles.current];
    if ($('landing')) $('landing').classList.toggle('hidden', !!cur);
    box.classList.toggle('hidden', !cur);
    if (!cur) { if (typeof renderLandingPro === 'function') renderLandingPro(); return; }
    const dateTxt = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    const S = streakInfo();
    const head = `<div class="flex items-start justify-between gap-3">
            <div class="min-w-0"><h1 class="text-3xl sm:text-4xl font-extrabold text-neutral-50 truncate">${tr('Hola, {n}', { n: esc(cur.name) })}</h1>
                <p class="text-sm text-neutral-400 first-letter:uppercase">${dateTxt}</p></div>
            <button onclick="showTab('progress')" class="nd-streak shrink-0${S.cur ? '' : ' nd-streak-0'}" aria-label="${tr('Racha de {k} días', { k: S.cur })}"><i class="fa-solid fa-fire ${S.cur ? 'text-ok-400' : 'text-neutral-500'}" aria-hidden="true"></i> ${S.cur}</button>
        </div>`;
    if (!calc.target) {
        box.innerHTML = `<div class="space-y-5 max-w-5xl mx-auto">${head}
            <div class="nd-card p-6 sm:p-8 space-y-4 text-center"><div class="nd-ic-lg mx-auto">${icon('🎯')}</div><h2 class="text-xl font-extrabold text-neutral-50">${tr('Termina tu plan para empezar')}</h2><p class="text-sm text-neutral-400">${tr('Necesitamos tu edad, peso y estatura para calcular tus calorías y macros.')}</p>
            <button onclick="openWizard('edit')" class="nd-btn-primary mx-auto">${tr('Completar mi plan')} <i class="fa-solid fa-arrow-right"></i></button></div></div>`;
        return;
    }
    const c = calc, t = diaryTotals(todayISO()), left = c.target - t.kcal;
    const [gIc, gTxtKey] = GOAL_LABEL[goalTypeOf()] || GOAL_LABEL.maintain;
    const gTxt = tr(gTxtKey);
    const A = nowAction();
    const W = state.weights, T = weightTrend();
    const wk = weekInfo(), gd = gymDays();
    const ins = insightsList()[0];
    const quick = (fn, ic, l, pro) => `<button onclick="${fn}" class="nd-quick"><i class="fa-solid ${ic}"></i><span>${l}</span>${pro && !canUse(pro) ? '<b class="nd-lock" aria-label="PRO"><i class="fa-solid fa-lock"></i></b>' : ''}</button>`;
    const tile = (onclick, l, v, sub) => `<button onclick="${onclick}" class="nd-tile text-left"><div class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">${l}</div><div class="text-xl font-extrabold text-neutral-50 mt-1">${v}</div>${sub ? `<div class="text-xs text-neutral-400 mt-0.5">${sub}</div>` : ''}</button>`;
    const lastW = W.length ? W[W.length - 1] : null;
    // 3.10: el «momento» del día (resumen semanal, racha en peligro, vuelta…). Como mucho uno, y solo si toca.
    const MO = typeof dayMoment === 'function' ? dayMoment() : null;
    const moHtml = MO ? `<div class="nd-moment p-5 sm:p-6">
        <div class="flex items-start gap-3">
            <span class="nd-ic">${icon(MO.ic)}</span>
            <div class="min-w-0 flex-1">
                <div class="text-[11px] font-bold uppercase tracking-wider text-mint-300">${esc(MO.kicker)}</div>
                <div class="text-lg font-extrabold text-neutral-50 leading-snug mt-0.5">${esc(MO.title)}</div>
                <p class="text-sm text-neutral-300 mt-1">${esc(MO.sub)}</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button onclick="${MO.btn[1]}" class="nd-mbtn nd-mbtn-main">${esc(MO.btn[0])}</button>
                    ${MO.btn2 ? `<button onclick="${MO.btn2[1]}" class="nd-mbtn">${esc(MO.btn2[0])}</button>` : ''}
                </div>
            </div>
        </div></div>` : '';
    box.innerHTML = `<div class="space-y-5 max-w-5xl mx-auto">${head}${moHtml}
        <button onclick="showTab('calc')" class="nd-goal"><span class="text-mint-400">${icon(gIc)}</span> ${gTxt} <span class="text-neutral-500">·</span> <span class="text-neutral-300">${fmt(c.target)} ${tr('kcal/día')}</span> <i class="fa-solid fa-chevron-right text-[10px] text-neutral-500"></i></button>
        <div class="grid lg:grid-cols-5 gap-4">
            <div class="lg:col-span-3 nd-card p-5 sm:p-6 space-y-5">
                <div class="flex items-end justify-between gap-3">
                    <div><div class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">${tr('Calorías')}</div>
                        <div class="text-4xl font-extrabold text-neutral-50 leading-tight tabular-nums">${fmt(t.kcal)}<span class="text-base font-bold text-neutral-400"> / ${fmt(c.target)} kcal</span></div></div>
                    <div class="text-right"><div class="text-2xl font-extrabold ${left >= 0 ? 'text-ok-300' : 'text-roseAccent-400'} tabular-nums">${fmt(Math.abs(left))}</div><div class="text-[11px] font-bold text-neutral-400">${left >= 0 ? tr('quedan') : tr('de más')}</div></div>
                </div>
                ${kcalBar(t.kcal, c.target)}
                <div class="space-y-4">${macroRow(tr('Proteína'), t.p, c.prot, '#c49a6c')}${macroRow(tr('Carbohidratos'), t.c, c.carbs, '#e6d3b3')}${macroRow(tr('Grasas'), t.f, c.fat, '#f59e0b')}</div>
            </div>
            <div class="lg:col-span-2 space-y-4">
                <div class="nd-now p-5 space-y-3">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-mint-300">${tr('¿Qué hago ahora?')}</div>
                    <div class="flex items-start gap-3"><span class="nd-ic">${icon(A.ic)}</span><div class="min-w-0">${A.kicker ? `<div class="text-xs font-bold text-neutral-400">${A.kicker}</div>` : ''}<div class="text-lg font-extrabold text-neutral-50 leading-snug">${A.title}</div><div class="text-sm text-neutral-300">${A.sub}</div></div></div>
                    <div class="grid ${A.btn2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2"><button onclick="${A.btn[1]}" class="nd-mbtn nd-mbtn-main">${A.btn[0]}</button>${A.btn2 ? `<button onclick="${A.btn2[1]}" class="nd-mbtn">${A.btn2[0]}</button>` : ''}</div>
                </div>
                <div class="grid grid-cols-5 gap-2">
                    ${quick('openVoiceLog()', 'fa-microphone', tr('Voz'), 'voice')}${quick('openPhotoLog()', 'fa-camera', tr('Foto'), 'photo')}${quick('openFridge()', 'fa-snowflake', tr('Nevera'), 'fridge')}${quick('openFoodSheet()', 'fa-magnifying-glass', tr('Buscar'))}${quick('openScanner()', 'fa-barcode', tr('Escanear'))}
                </div>
            </div>
        </div>
        ${ins ? `<button onclick="showTab('progress')" class="nd-insight w-full text-left"><span class="nd-ic">${icon(ins.ic)}</span><span class="min-w-0 flex-1 text-sm text-neutral-200">${esc(ins.t)}</span>${tagPill(ins.k === 'consejo' ? 'rec' : 'dato')}</button>` : ''}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            ${tile("showTab('progress');setTimeout(()=>{const w=$('trk-w');if(w)w.focus()},300)", tr('Peso'), `${fmt(state.weight, 1)} kg`, T && T.week != null && Math.abs(T.week) >= .05 ? `${T.week > 0 ? '+' : ''}${fmt(T.week, 1)} kg esta semana` : lastW ? `${tr('Último')}: ${new Date(lastW.d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}` : tr('Toca para apuntarlo'))}
            ${tile("showTab('gym')", tr('Entrenos'), gd ? `${wk.done} / ${gd}` : `${wk.done}`, gd ? (wk.done >= gd ? tr('Semana completada') : tr('esta semana')) : tr('Elige tus días'))}
            ${tile("showTab('calc')", tr('IMC'), fmt(c.bmi, 1), c.bmiCat || '')}
            ${tile("showTab('progress')", tr('Mejor racha'), tp(S.best, 'día', 'días'), tp(Object.keys(state.ach || {}).length, 'logro', 'logros'))}
        </div>
        <div class="grid grid-cols-2 gap-3">
            <button onclick="showTab('coach');coachView('menu')" class="nd-wide"><i class="fa-solid fa-calendar-day text-mint-400"></i> ${tr('Menú del día')}</button>
            <button onclick="showTab('coach');coachView('shop')" class="nd-wide"><i class="fa-solid fa-basket-shopping text-mint-400"></i> ${tr('Lista de la compra')}</button>
        </div>
    </div>`;
}

