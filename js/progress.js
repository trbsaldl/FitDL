// FitDL · Mi progreso: peso y medidas corporales
'use strict';

// =====================================================================
//  AÑADIDO: MI PROGRESO (registro de peso)
// =====================================================================
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dayNum = iso => Math.round(new Date(iso + 'T12:00:00').getTime() / 86400000);
function addWeight() {
    const d = $('trk-date').value || todayISO();
    const w = num($('trk-w').value);
    if (!w || w < 30 || w > 300) { toast('Introduce un peso válido en kg'); return; }
    if (d > todayISO()) { toast('La fecha no puede ser futura'); return; }
    state.weights = state.weights.filter(e => e.d !== d).concat([{ d, w }]).sort((a, b) => a.d.localeCompare(b.d));
    $('trk-w').value = '';
    syncWeightFromLog(); track('weight_logged'); checkAchievements(); if (state.tab === 'progress') renderProgress();
    toast('Registro guardado. Tus calorías y macros se han actualizado');
}
// Confirmación propia: devuelve una promesa (true si el usuario acepta)
function askConfirm(msg, okLabel = 'Aceptar') {
    return new Promise(resolve => {
        const m = $('confirm-modal'), ok = $('confirm-ok'), cancel = $('confirm-cancel');
        $('confirm-msg').textContent = tr(msg); ok.textContent = tr(okLabel);
        m.classList.remove('hidden');
        const done = v => { m.classList.add('hidden'); ok.onclick = cancel.onclick = m.onclick = null; document.removeEventListener('keydown', onKey); resolve(v); };
        const onKey = e => { if (e.key === 'Escape') done(false); };
        ok.onclick = () => done(true);
        cancel.onclick = () => done(false);
        m.onclick = e => { if (e.target === m) done(false); };
        document.addEventListener('keydown', onKey);
        setTimeout(() => cancel.focus(), 30);
    });
}
async function delWeight(d) {
    if (!(await askConfirm(tr('¿Borrar el registro de peso del {d}?', { d: new Date(d + 'T12:00:00').toLocaleDateString(locale()) }), 'Borrar'))) return;
    state.weights = state.weights.filter(e => e.d !== d);
    syncWeightFromLog();
}
function avgAround(endDay, list) {
    const win = list.filter(e => dayNum(e.d) <= endDay && dayNum(e.d) > endDay - 7);
    return win.length ? win.reduce((a, e) => a + e.w, 0) / win.length : null;
}
function renderTracker() {
    if (!$('trk-stats')) return;
    if (!$('trk-date').value) $('trk-date').value = todayISO();
    $('trk-date').max = todayISO();
    const L = state.weights;
    if (!L.length) {
        $('trk-stats').innerHTML = '';
        $('trk-chart').innerHTML = '<div class="p-6 rounded-2xl bg-neutral-800/60 border border-dashed border-neutral-700 text-center text-xs text-neutral-400">' + tr('Añade tu primer registro para ver tu gráfica de progreso.') + '</div>';
        $('trk-actions').innerHTML = ''; $('trk-list').innerHTML = '';
        return;
    }
    const first = L[0], last = L[L.length - 1];
    const d0 = dayNum(first.d), d1 = dayNum(last.d);
    const avgNow = avgAround(d1, L), avgStart = avgAround(d0 + 6, L);
    const span = d1 - d0;
    const rate = span >= 14 ? (avgNow - avgStart) / ((span - 6) / 7) : null;
    const stat = (l, v, s) => `<div class="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-800"><div class="text-[10px] font-bold uppercase text-neutral-400">${l}</div><div class="text-lg font-extrabold">${v}</div>${s ? `<div class="text-[10px] text-neutral-500">${s}</div>` : ''}</div>`;
    const diff = avgNow - avgStart;
    $('trk-stats').innerHTML =
        stat(tr('Primer registro'), `${fmt(first.w, 1)} kg`, new Date(first.d + 'T12:00:00').toLocaleDateString(locale())) +
        stat(tr('Media últimos 7 días'), `${fmt(avgNow, 1)} kg`, tp(L.filter(e => dayNum(e.d) > d1 - 7).length, 'registro', 'registros')) +
        stat(tr('Cambio (medias)'), `<span class="${diff < 0 ? 'text-mint-400' : diff > 0 ? 'text-roseAccent-600' : ''}">${diff > 0 ? '+' : ''}${fmt(diff, 1)} kg</span>`, tr('en {k} días', { k: span })) +
        stat(tr('Ritmo semanal'), rate === null ? '—' : `${rate > 0 ? '+' : ''}${fmt(rate, 2)} kg`, rate === null ? tr('necesita 14+ días') : tr('{p} del peso', { p: pctTxt(fmt(rate / avgNow * 100, 1)) }));

    // Gráfica (a ancho real: se lee bien en el móvil)
    const dLabel = d => new Date(d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
    const gw = num(state.goalWeight);
    lineChart($('trk-chart'), {
        // 3.17.1 (Ángel): la línea une TODOS tus registros, no la media de 7 días
        aria: tr('Gráfica de peso'), legend: tr('— tu peso cada vez que lo apuntaste'), dotColor: '#dcc19c',
        points: L.map(e => ({ x: dayNum(e.d), y: e.w, tip: `${dLabel(e.d)}: ${fmt(e.w, 1)} kg` })),
        line: L.map(e => ({ x: dayNum(e.d), y: e.w })),
        goal: gw ? { y: gw, label: tr('Objetivo {k} kg', { k: fmt(gw, 1) }) } : null,
        xLabels: [dLabel(first.d), dLabel(last.d)],
    });

    $('trk-actions').innerHTML =
        `<span class="px-3 py-2.5 text-neutral-400"><i class="fa-solid fa-link text-mint-500"></i> ${tr('Tu último registro ({k} kg) es tu peso actual en la calculadora.', { k: fmt(last.w, 1) })}</span>`;
    $('trk-list').innerHTML = L.slice().reverse().map(e => `<div class="p-2 rounded-xl bg-neutral-800/60 border border-neutral-800 flex items-center justify-between gap-1"><span>${new Date(e.d + 'T12:00:00').toLocaleDateString(locale(), { day: '2-digit', month: 'short' })}: <b>${fmt(e.w, 1)}</b></span><button onclick="delWeight('${e.d}')" class="text-neutral-500 hover:text-roseAccent-600" aria-label="${tr('Borrar registro')}"><i class="fa-solid fa-xmark"></i></button></div>`).join('');
}
// El último registro de peso es el peso actual del perfil: todo se recalcula
function syncWeightFromLog() {
    const L = state.weights;
    if (L.length) state.weight = Math.min(250, Math.max(35, L[L.length - 1].w));
    syncInputsFromState(); update(); renderTracker();
}

// =====================================================================
//  MEDIDAS CORPORALES (opcional)
// =====================================================================
const MEASURES = [['waist', tk('Cintura')], ['hip', tk('Cadera')], ['chest', tk('Pecho')], ['arm', tk('Brazo')], ['thigh', tk('Muslo')]];
function addMeasures() {
    const d = $('ms-date').value || todayISO(), rec = { d };
    MEASURES.forEach(([k]) => { const v = num($('ms-' + k).value); if (v && v > 10 && v < 250) rec[k] = round1(v); });
    if (Object.keys(rec).length < 2) { toast('Apunta al menos una medida en cm'); return; }
    state.measures = (state.measures || []).filter(m => m.d !== d).concat([rec]).sort((a, b) => a.d.localeCompare(b.d));
    MEASURES.forEach(([k]) => $('ms-' + k).value = '');
    save(); renderMeasures(); track('measures_logged'); checkAchievements(); toast('Medidas guardadas');
}
function delMeasures(d) {
    const before = state.measures.slice();
    state.measures = state.measures.filter(m => m.d !== d); save(); renderMeasures();
    toastUndo('Medidas borradas', () => { state.measures = before; save(); renderMeasures(); });
}
function renderMeasures() {
    const box = $('ms-list'); if (!box) return;
    if (!$('ms-date').value) $('ms-date').value = todayISO();
    const L = (state.measures || []).slice().reverse();
    const first = (state.measures || [])[0];
    box.innerHTML = L.length ? L.map(m => `<div class="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-800 flex items-start justify-between gap-3">
        <div class="min-w-0"><div class="text-xs font-bold text-neutral-400">${new Date(m.d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">${MEASURES.filter(([k]) => m[k]).map(([k, l]) => { const dv = first && first[k] && first !== m ? m[k] - first[k] : null; return `<span><span class="text-neutral-400">${tr(l)}</span> <b>${fmt(m[k], m[k] % 1 ? 1 : 0)}</b>${dv ? ` <span class="text-xs ${dv < 0 ? 'text-mint-300' : 'text-neutral-400'}">(${dv > 0 ? '+' : ''}${fmt(dv, 1)})</span>` : ''}</span>`; }).join('')}</div></div>
        <button onclick="delMeasures('${m.d}')" class="w-8 h-8 shrink-0 rounded-lg text-neutral-500 hover:text-roseAccent-400" aria-label="${tr('Borrar medidas del {d}', { d: m.d })}"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('') : '';
    renderMeasureChart();
}

// =====================================================================
//  3.0: PESO OBJETIVO, GRÁFICA DE MEDIDAS, RESUMEN SEMANAL, TENDENCIAS Y LOGROS
// =====================================================================
function setGoalWeight(v) {
    const g = num(v);
    state.goalWeight = g && g >= 35 && g <= 250 ? round1(g) : '';
    save(); renderTracker(); renderProgress();
    // Un objetivo por debajo del peso saludable (IMC < 18,5) no se anima: se avisa con cuidado
    const h = num(state.height) / 100;
    if (state.goalWeight && h > 1 && state.goalWeight / (h * h) < 18.5) { toast('Ese peso queda por debajo del rango saludable para tu estatura (IMC menor de 18,5). Antes de buscarlo, consúltalo con un profesional sanitario.'); return; }
    toast(state.goalWeight ? tr('Peso objetivo: {k} kg', { k: fmt(state.goalWeight, 1) }) : 'Peso objetivo quitado');
}
let msKey = 'waist';
function renderMeasureChart() {
    const box = $('ms-chart-box'); if (!box) return;
    if (!canUse('trends')) { box.innerHTML = (state.measures || []).length > 1 ? `<button type="button" onclick="openPaywall('trends')" class="w-full py-3 rounded-xl border border-dashed border-neutral-700 text-sm font-bold text-neutral-300"><i class="fa-solid fa-lock text-amber-300"></i> ${tr('Gráfica de tus medidas')} · PRO</button>` : ''; return; }
    const have = MEASURES.filter(([k]) => (state.measures || []).some(m => m[k]));
    if (!have.length) { box.innerHTML = ''; return; }
    if (!have.some(([k]) => k === msKey)) msKey = have[0][0];
    const pts = (state.measures || []).filter(m => m[msKey]);
    const dLabel = d => new Date(d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
    const diff = pts.length > 1 ? pts[pts.length - 1][msKey] - pts[0][msKey] : null;
    box.innerHTML = `<div class="flex flex-wrap items-center gap-2">${have.map(([k, l]) => `<button type="button" onclick="msKey='${k}';renderMeasureChart()" class="px-3 py-1.5 rounded-xl border text-xs font-bold ${k === msKey ? 'bg-mint-600 text-white border-mint-600' : 'bg-neutral-800/60 text-neutral-300 border-neutral-800'}">${tr(l)}</button>`).join('')}
        ${diff != null ? `<span class="ml-auto text-xs font-bold ${diff < 0 ? 'text-mint-300' : 'text-neutral-400'}">${tr('{k} cm desde el {d}', { k: (diff > 0 ? '+' : '') + fmt(diff, 1), d: dLabel(pts[0].d) })}</span>` : ''}</div>
        <div id="ms-chart"></div>`;
    if (pts.length > 1) lineChart($('ms-chart'), { aria: tr('Gráfica de medidas'), legend: tr((MEASURES.find(m => m[0] === msKey) || [, ''])[1]) + ' (cm)', points: pts.map(m => ({ x: dayNum(m.d), y: m[msKey], tip: `${dLabel(m.d)}: ${fmt(m[msKey], 1)} cm` })), line: pts.map(m => ({ x: dayNum(m.d), y: m[msKey] })), xLabels: [dLabel(pts[0].d), dLabel(pts[pts.length - 1].d)], minPad: .5 });
    else $('ms-chart').innerHTML = '<p class="text-xs text-neutral-400">' + tr('Con dos registros verás aquí tu evolución.') + '</p>';
}
function renderProgress() {
    const box = $('prog-summary'); if (!box) return;
    if ($('trk-goal')) $('trk-goal').value = state.goalWeight || '';
    renderMeasureChart();
    if (!profiles.current) { box.innerHTML = `<div class="nd-card p-6 text-center space-y-3"><p class="text-sm text-neutral-300">${tr('Crea tu perfil para ver tu progreso.')}</p><button onclick="newProfile()" class="nd-btn-primary mx-auto">${tr('Empezar gratis')}</button></div>`; $('prog-ach').innerHTML = ''; return; }
    const S = streakInfo(), W = calWeekStats(), T = weightTrend(), L = insightsList();
    const days = W.days.map((d, i) => { const on = loggedOn(d), t = on ? diaryTotals(d) : null, ok = t && calc.prot && t.p >= calc.prot * .9, fut = d > todayISO(); return `<div class="flex flex-col items-center gap-1 flex-1 ${fut ? 'opacity-40' : ''}"><span class="text-[10px] font-bold ${d === todayISO() ? 'text-mint-300' : 'text-neutral-500'}">${dowLetters()[i]}</span><span class="w-8 h-8 rounded-full grid place-items-center text-xs ${on ? (ok ? 'bg-ok-500 text-ok-900' : 'bg-mint-600/40 text-mint-200') : 'bg-neutral-800 text-neutral-600'}">${on ? (ok ? '<i class="fa-solid fa-check"></i>' : '•') : ''}</span></div>`; }).join('');
    const stat = (l, v, s) => `<div class="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-800"><div class="text-[11px] font-bold uppercase text-neutral-400">${l}</div><div class="text-lg font-extrabold text-neutral-50">${v}</div>${s ? `<div class="text-[11px] text-neutral-400">${s}</div>` : ''}</div>`;
    const gw = num(state.goalWeight), toGoal = gw && T ? T.now - gw : null;
    box.innerHTML = `<div class="grid lg:grid-cols-5 gap-4">
        <div class="lg:col-span-3 nd-card p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between gap-3"><h3 class="text-lg font-extrabold text-neutral-50">${tr('Tu semana')}</h3>${tagPill('dato')}</div>
            <div class="flex justify-between gap-1">${days}</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                ${stat(tr('Días registrados'), `${W.logged}/${W.past}`)}${stat(tr('Proteína cumplida'), calc.prot ? `${W.protOk}/${W.past}` : '—')}
                ${stat(tr('Media diaria'), W.logged ? `${fmt(W.avgKcal)} kcal` : '—', calc.target ? tr('objetivo {k}', { k: fmt(calc.target) }) : '')}${stat(tr('Entrenos'), W.workouts)}
            </div>
            <p class="text-[11px] text-neutral-500">${tr('De lunes a domingo. ● registrado · ✓ proteína cumplida.')}</p>
        </div>
        <div class="lg:col-span-2 space-y-3">
            <div class="nd-card p-5 flex items-center gap-4"><span class="nd-ic-lg ${S.cur > 0 ? 'text-ok-400' : ''}">${icon('🔥')}</span><div><div class="text-2xl font-extrabold text-neutral-50">${tr(S.cur === 1 ? '{k} día seguido' : '{k} días seguidos', { k: S.cur })}</div><div class="text-xs text-neutral-400">${tr('Mejor racha: {k}', { k: S.best })} · ${S.today ? tr('hoy ya has apuntado ✓') : tr('apunta algo hoy para mantenerla')}</div></div></div>
            ${S.total ? `<button onclick="shareProgress()" class="w-full p-4 rounded-2xl bg-mint-500/10 border border-mint-500/40 hover:bg-mint-500/15 text-left flex items-center gap-3"><span class="nd-ic shrink-0"><i class="fa-solid fa-share-nodes"></i></span><span class="flex-1 min-w-0"><span class="block text-sm font-extrabold text-neutral-50">${tr('Compartir mi semana')}</span><span class="block text-xs text-neutral-400">${tr('Tarjeta para historias y chats, sin tu peso')}</span></span><i class="fa-solid fa-chevron-right text-neutral-500"></i></button>` : ''}
            ${T ? `<div class="nd-card p-5 space-y-1"><div class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">${tr('Peso medio (7 días)')}</div><div class="text-2xl font-extrabold text-neutral-50">${fmt(T.now, 1)} kg</div><div class="text-xs text-neutral-400">${T.week != null ? tr('{k} kg respecto a la semana anterior', { k: (T.week > 0 ? '+' : '') + fmt(T.week, 1) }) : tr('Con 2 semanas de registros verás la tendencia')}${toGoal != null ? ` · ${Math.abs(toGoal) < .3 ? tr('¡en tu objetivo!') : tr('{k} kg para tu objetivo', { k: fmt(Math.abs(toGoal), 1) })}` : ''}</div></div>` : ''}
        </div>
    </div>
    ${L.length && !canUse('trends') ? proTeaser('trends') : ''}${L.length && canUse('trends') ? `<div class="nd-card p-5 sm:p-6 space-y-3"><h3 class="text-lg font-extrabold text-neutral-50">${tr('Lo que dicen tus datos')}</h3>${L.slice(0, 5).map(x => `<div class="flex items-start gap-3"><span class="nd-ic">${icon(x.ic)}</span><span class="flex-1 text-sm text-neutral-200">${esc(x.t)}</span>${tagPill(x.k === 'consejo' ? 'rec' : 'dato')}</div>`).join('')}<p class="text-[11px] text-neutral-500">${tr('Interpretación orientativa de tus registros. No es un diagnóstico.')}</p></div>` : ''}`;
    renderAnalisis();
    checkAchievements(true);
    const A = state.ach || {};
    $('prog-ach').innerHTML = `<div class="flex items-center justify-between gap-3"><h3 class="text-lg font-extrabold text-neutral-50">${tr('Logros')}</h3><span class="text-xs font-bold text-neutral-400">${Object.keys(A).length}/${ACHIEVEMENTS.length}</span></div>
        <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">${ACHIEVEMENTS.map(([id, ic, name, desc]) => `<div class="nd-ach ${A[id] ? 'on' : ''}" title="${esc(tr(desc))}"><span class="nd-ic">${icon(A[id] ? ic : '🔒')}</span><span class="text-xs font-extrabold text-neutral-100 leading-tight">${tr(name)}</span><span class="text-[10px] text-neutral-400 leading-tight">${A[id] ? new Date(A[id] + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) : esc(tr(desc))}</span></div>`).join('')}</div>`;
}

// =====================================================================
//  ANÁLISIS AVANZADO (PRO): medias por periodo, patrón por día de la semana,
//  macros reales frente al objetivo y exportar el historial a Excel/CSV.
//  Solo lee lo que ya tienes apuntado: no envía nada a ningún sitio.
// =====================================================================
let anaDias = 30; // periodo elegido (7, 30 o 90 días)

// Resumen de los últimos N días: solo cuentan los días en los que apuntaste algo
function anaResumen(n) {
    const hoy = todayISO(), dias = [];
    for (let i = 0; i < n; i++) dias.push(shiftISO(hoy, -i));
    const conDatos = dias.filter(d => (state.diary[d] || []).length);
    const t = conDatos.reduce((a, d) => {
        const x = diaryTotals(d);
        a.kcal += x.kcal; a.p += x.p; a.c += x.c; a.f += x.f; a.fib += x.fib;
        if (calc.target && Math.abs(x.kcal - calc.target) <= calc.target * 0.1) a.enObjetivo++;
        if (calc.prot && x.p >= calc.prot * 0.9) a.protOk++;
        return a;
    }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0, enObjetivo: 0, protOk: 0 });
    const n2 = conDatos.length || 1;
    return { dias: n, registrados: conDatos.length, kcal: t.kcal / n2, p: t.p / n2, c: t.c / n2, f: t.f / n2, fib: t.fib / n2, enObjetivo: t.enObjetivo, protOk: t.protOk };
}

// Media de calorías por día de la semana: enseña si los findes se te van
function anaPorDiaSemana(n) {
    const hoy = todayISO(), suma = Array(7).fill(0), cuenta = Array(7).fill(0);
    for (let i = 0; i < n; i++) {
        const d = shiftISO(hoy, -i);
        if (!(state.diary[d] || []).length) continue;
        const dow = (new Date(d + 'T12:00:00').getDay() + 6) % 7; // 0 = lunes
        suma[dow] += diaryTotals(d).kcal; cuenta[dow]++;
    }
    return suma.map((v, i) => ({ dow: i, media: cuenta[i] ? v / cuenta[i] : null, dias: cuenta[i] }));
}

function anaPeriodo(n) { anaDias = n; renderAnalisis(); }

function renderAnalisis() {
    const box = $('prog-ana'); if (!box) return;
    if (!canUse('trends')) { box.innerHTML = ''; return; }
    const R = anaResumen(anaDias);
    if (!R.registrados) { box.innerHTML = `<div class="nd-card p-5 space-y-2"><h3 class="text-lg font-extrabold text-neutral-50">${tr('Análisis avanzado')}</h3><p class="text-sm text-neutral-300">${tr('Apunta algunos días y aquí verás tus medias, en qué días te pasas y podrás exportar tu historial.')}</p></div>`; return; }
    const bot = (n, l) => `<button type="button" onclick="anaPeriodo(${n})" class="px-3 py-1.5 rounded-xl border text-xs font-bold ${n === anaDias ? 'bg-mint-600 border-mint-600 text-white' : 'bg-neutral-800/60 border-neutral-800 text-neutral-300'}">${l}</button>`;
    const dato = (l, v, s2) => `<div class="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-800"><div class="text-[11px] font-bold uppercase text-neutral-400">${l}</div><div class="text-lg font-extrabold text-neutral-50">${v}</div>${s2 ? `<div class="text-[11px] text-neutral-400">${s2}</div>` : ''}</div>`;
    // Macros reales frente a tu objetivo
    const barra = (l, real, obj, col) => {
        const pct = obj ? Math.min(140, real / obj * 100) : 0;
        return `<div class="space-y-1"><div class="flex justify-between text-[11px] font-bold"><span class="text-neutral-400">${l}</span><span class="text-neutral-200">${fmt(real)} / ${fmt(obj)} g</span></div>
            <div class="h-1.5 rounded-full bg-neutral-800 overflow-hidden"><div class="h-full rounded-full" style="width:${Math.min(100, pct)}%;background:${col}"></div></div></div>`;
    };
    const W = anaPorDiaSemana(anaDias).filter(d => d.media != null);
    const peor = W.length > 1 ? W.reduce((a, b) => (b.media > a.media ? b : a)) : null;
    const letras = typeof dowShort === 'function' ? dowShort() : ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const maxD = W.length ? Math.max(...W.map(d => d.media)) : 1;
    const semana = W.length > 1 ? `<div class="space-y-2"><div class="text-xs font-extrabold uppercase tracking-wider text-neutral-400">${tr('Media por día de la semana')}</div>
        <div class="flex items-end gap-1.5 h-24">${anaPorDiaSemana(anaDias).map(d => `<div class="flex-1 flex flex-col items-center gap-1 justify-end h-full" title="${d.media != null ? fmt(d.media) + ' kcal · ' + tp(d.dias, 'día', 'días') : tr('sin datos')}">
            <div class="w-full rounded-t ${d.media != null && calc.target && d.media > calc.target ? 'bg-amber-500/70' : 'bg-mint-500/60'}" style="height:${d.media != null ? Math.max(6, d.media / maxD * 100) : 2}%"></div>
            <span class="text-[10px] font-bold text-neutral-400">${letras[d.dow]}</span></div>`).join('')}</div>
        ${peor && calc.target && peor.media > calc.target ? `<p class="text-xs text-neutral-300">${tr('Tu día más alto es el {d}: {k} kcal de media, {x} por encima de tu objetivo.', { d: DOW_LARGO()[peor.dow], k: fmt(peor.media), x: fmt(peor.media - calc.target) })}</p>` : ''}</div>` : '';

    box.innerHTML = `<div class="nd-card p-5 sm:p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-lg font-extrabold text-neutral-50">${tr('Análisis avanzado')}</h3>
            <div class="flex gap-1.5">${bot(7, tr('7 días'))}${bot(30, tr('30 días'))}${bot(90, tr('90 días'))}</div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${dato(tr('Días apuntados'), `${R.registrados}/${R.dias}`, calc.target ? tr('{k} en tu objetivo', { k: R.enObjetivo }) : '')}
            ${dato(tr('Media diaria'), `${fmt(R.kcal)} kcal`, calc.target ? tr('objetivo {k}', { k: fmt(calc.target) }) : '')}
            ${dato(tr('Proteína cumplida'), calc.prot ? `${R.protOk}/${R.registrados}` : '—', calc.prot ? tr('{k} g al día', { k: fmt(R.p) }) : '')}
            ${dato(tr('Fibra'), `${fmt(R.fib)} g`, tr('al día'))}
        </div>
        ${calc.prot ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${barra(tr('Proteína'), R.p, calc.prot, '#c49a6c')}${barra(tr('Hidratos'), R.c, calc.carbs, '#e6d3b3')}${barra(tr('Grasas'), R.f, calc.fat, '#f59e0b')}</div>` : ''}
        ${semana}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onclick="exportCSV('diario')" class="nd-mbtn nd-mbtn-main"><i class="fa-solid fa-file-csv"></i> ${tr('Exportar mi diario (Excel)')}</button>
            <button onclick="exportCSV('resumen')" class="nd-mbtn"><i class="fa-solid fa-table"></i> ${tr('Exportar resumen por días')}</button>
        </div>
        <p class="text-[11px] text-neutral-500">${tr('Medias de los días en los que apuntaste algo. El archivo se crea en tu dispositivo: no se envía a ningún sitio.')}</p>
    </div>`;
}
const DOW_LARGO = () => [tk('lunes'), tk('martes'), tk('miércoles'), tk('jueves'), tk('viernes'), tk('sábado'), tk('domingo')].map(d => tr(d));

// Exportar a CSV (se abre en Excel, Numbers o Google Sheets). Separador «;» y BOM: Excel en español lo abre bien.
function exportCSV(tipo) {
    if (needPro('trends')) return;
    // Excel y Google Sheets tratan como fórmula lo que empieza por = + - @ o un tabulador. Un nombre de
    // producto puede venir de Open Food Facts (lo edita cualquiera), así que se le pone un apóstrofo
    // delante: se ve igual, pero se lee como texto y nunca se ejecuta.
    const esc2 = v => {
        let t = String(v == null ? '' : v);
        if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
        return `"${t.replace(/"/g, '""')}"`;
    };
    const fechas = Object.keys(state.diary || {}).filter(d => (state.diary[d] || []).length).sort();
    let filas = [], nombre = '';
    if (tipo === 'diario') {
        nombre = 'nutridl-diario';
        filas.push([tr('Fecha'), tr('Comida del día'), tr('Alimento'), tr('Marca'), tr('Cantidad'), tr('Unidad'), 'kcal', tr('Proteína (g)'), tr('Hidratos (g)'), tr('Grasas (g)'), tr('Fibra (g)'), tr('Azúcares (g)')]);
        for (const d of fechas) for (const e of state.diary[d]) {
            filas.push([d, tr(SLOT_NAME[e.slot] || e.slot || ''), e.name || '', e.brand || '', round1(e.g || 0), e.ml ? 'ml' : 'g', Math.round(e.kcal || 0), round1(e.p || 0), round1(e.c || 0), round1(e.f || 0), round1(e.fib || 0), e.sug != null ? round1(e.sug) : '']);
        }
    } else {
        nombre = 'nutridl-resumen';
        filas.push([tr('Fecha'), 'kcal', tr('Proteína (g)'), tr('Hidratos (g)'), tr('Grasas (g)'), tr('Fibra (g)'), tr('Objetivo kcal'), tr('Peso (kg)'), tr('Entrenos')]);
        const pesos = Object.fromEntries((state.weights || []).map(w => [w.d, w.w]));
        const entrenos = (state.workouts || []).reduce((a, w) => (a[w.d] = (a[w.d] || 0) + 1, a), {});
        const todas = [...new Set(fechas.concat(Object.keys(pesos), Object.keys(entrenos)))].sort();
        for (const d of todas) {
            const t = (state.diary[d] || []).length ? diaryTotals(d) : null;
            filas.push([d, t ? Math.round(t.kcal) : '', t ? round1(t.p) : '', t ? round1(t.c) : '', t ? round1(t.f) : '', t ? round1(t.fib) : '', calc.target || '', pesos[d] != null ? pesos[d] : '', entrenos[d] || '']);
        }
    }
    if (filas.length < 2) { toast('Aún no hay nada que exportar'); return; }
    const csv = '\ufeff' + filas.map(f => f.map(esc2).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${nombre}-${todayISO()}.csv`; // i18n-ignore (nombre de archivo)
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    track('export_csv'); toast('Archivo creado: ábrelo con Excel');
}

// Semana de calendario (lunes a domingo): lo que llevas de esta semana
// =====================================================================
//  COMPARTIR MI SEMANA (3.19): una tarjeta de la que dé gusto presumir y que explique qué es FitDL a quien la vea.
//  · Vista previa antes de compartir · formato Historia (9:16, Instagram/WhatsApp) o Publicación (4:5)
//  · El titular sale de lo MEJOR de tu semana (siempre un dato real) · calendario con tus días en verde
//  · Invitación clara para quien la recibe («gratis, sin anuncios» = la promesa pública de la app)
//  Por privacidad NUNCA lleva peso ni medidas. Se dibuja en el propio móvil, sin servidores ni librerías.
// =====================================================================
const SHARE_URL = 'trbsaldl.github.io/FitDL';
let shareFmt = 'story', shareBlob = null, shareImg = null, shareSeq = 0;
function weekShareData() {
    const S = streakInfo(), W = calWeekStats(), c = calc, t0 = todayISO();
    const days = W.days.map(d => { const t = loggedOn(d) ? diaryTotals(d) : null; return { d, on: !!t, prot: !!(t && c.prot && t.p >= c.prot * .9), fut: d > t0 }; });
    const wk = (state.workouts || []).filter(w => w && w.d >= W.days[0] && w.d <= W.days[6]);
    const vol = Math.round(wk.reduce((a, w) => a + (w.ex || []).reduce((b, e) => b + exVol(e), 0), 0));
    return { S, W, days, past: W.past, logged: W.logged, protOk: W.protOk, workouts: wk.length, vol };
}
// El titular: lo mejor de la semana, en este orden. Nunca se inventa nada: todo sale de tus registros.
function weekHero(D) {
    if (D.past >= 3 && D.logged === D.past) return { n: `${D.logged}/${D.past}`, t: tr('días apuntados esta semana'), s: tr('Sin fallar ni uno.') };
    if (D.S.cur >= 3) return { n: String(D.S.cur), t: tr('días seguidos cuidando lo que como'), s: '' };
    if (D.workouts >= 2) return { n: String(D.workouts), t: tr('entrenos esta semana'), s: D.vol ? tr('{k} kg levantados en total', { k: fmt(D.vol) }) : '' };
    if (D.protOk >= 2) return { n: String(D.protOk), t: tr('días con mi proteína cumplida'), s: '' };
    if (D.logged) return { n: `${D.logged}/${D.past}`, t: tr('días apuntados esta semana'), s: '' };
    return { n: '', t: tr('Empiezo a cuidarme con FitDL'), s: '' };
}
const weekRange = D => {
    const a = new Date(D.W.days[0] + 'T12:00:00'), b = new Date(D.W.days[6] + 'T12:00:00'), o = { day: 'numeric', month: 'short' };
    return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.toLocaleDateString(locale(), o)}` : `${a.toLocaleDateString(locale(), o)} – ${b.toLocaleDateString(locale(), o)}`;
};
function weekShareText(D) {
    const bits = [];
    if (D.logged) bits.push(tr('{a}/{b} días apuntados', { a: D.logged, b: D.past }));
    if (D.protOk) bits.push(tr(D.protOk === 1 ? 'proteína cumplida {k} día' : 'proteína cumplida {k} días', { k: D.protOk }));
    if (D.workouts) bits.push(tr(D.workouts === 1 ? '{k} entreno' : '{k} entrenos', { k: D.workouts }));
    if (D.S.cur >= 2) bits.push(tr('racha de {k} días', { k: D.S.cur }));
    return (bits.length ? tr('Mi semana: {x}.', { x: bits.join(' · ') }) + ' ' : '') + tr('Lo llevo con FitDL: calorías, macros, escáner y gym, gratis y sin anuncios. Calcula tu plan en 2 minutos: {u}', { u: `https://${SHARE_URL}/` });
}
const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
async function drawWeekCard(fmtKey, D) {
    const story = fmtKey === 'story', W = 1080, H = story ? 1920 : 1350, P = 90;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const SANS = (w, s) => `${w} ${s}px 'Plus Jakarta Sans', sans-serif`, SERIF = (w, s) => `${w} ${s}px 'Newsreader', Georgia, serif`, ICON = s => `900 ${s}px "Font Awesome 6 Free"`;
    try { await Promise.all([SANS(800, 40), SANS(600, 40), SANS(700, 40), SERIF(600, 40), ICON(40)].map(f => document.fonts.load(f))); } catch (e) { }
    const txt = (s, x, y, font, col, align = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; };
    // Letra que se encoge hasta caber (cifras largas, palabras largas en inglés)
    const fit = (s, maxW, mk, size, min = 12) => { let z = size; g.font = mk(z); while (z > min && g.measureText(s).width > maxW) { z -= 2; g.font = mk(z); } return mk(z); };
    const box = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
    // Varias líneas: devuelve dónde termina
    const wrap = (s, x, y, maxW, font, col, lh) => {
        g.font = font; const words = String(s).split(' '); let line = '';
        for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { txt(line, x, y, font, col); y += lh; line = w; } else line = t; }
        if (line) { txt(line, x, y, font, col); y += lh; }
        return y;
    };
    // Fondo: los mismos marrones de la app, con luz caramelo arriba y un toque verde (= vas bien)
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1c1612'); bg.addColorStop(1, '#0c0a09');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
    glow(W * .9, H * .08, 720, 'rgba(154,107,64,.34)'); glow(0, H * .55, 640, 'rgba(111,207,151,.09)');
    g.textBaseline = 'alphabetic';
    // Marca + semana (en historia se deja aire arriba: ahí Instagram pone su barra)
    let y = story ? 230 : 140;
    const logo = await loadImg('icons/icon-192.png');
    if (logo) { g.save(); g.beginPath(); g.roundRect(P, y - 64, 84, 84, 24); g.clip(); g.drawImage(logo, P, y - 64, 84, 84); g.restore(); }
    const lx = P + (logo ? 106 : 0);
    txt('nutri', lx, y, SANS(800, 52), '#f2ebe3'); g.font = SANS(800, 52);
    txt('DL', lx + g.measureText('nutri').width, y, SANS(800, 52), '#dcc19c');
    txt(tr('MI SEMANA'), W - P, y - 30, SANS(800, 26), '#8f8478', 'right');
    txt(weekRange(D), W - P, y + 6, SANS(700, 32), '#dcc19c', 'right');
    // Titular
    const HH = weekHero(D);
    y += story ? 300 : 230;
    if (HH.n) { txt(HH.n, P - 8, y, fit(HH.n, W - 2 * P, z => SERIF(600, z), story ? 300 : 230), '#f6efe7'); y += story ? 92 : 78; }
    y = wrap(HH.t, P, y, W - 2 * P, SANS(800, story ? 62 : 52), '#eadfd2', story ? 74 : 62);
    if (HH.s) { txt(HH.s, P, y + 4, SANS(700, story ? 40 : 34), '#6fcf97'); y += story ? 56 : 48; }
    // Calendario de la semana: verde = proteína cumplida, caramelo = apuntado
    y += story ? 70 : 40;
    const cell = (W - 2 * P) / 7, R = story ? 48 : 40, L = dowLetters();
    D.days.forEach((x, i) => {
        const cx = P + cell * i + cell / 2, cy = y + 30 + R;
        txt(L[i], cx, y, SANS(800, 26), x.d === todayISO() ? '#dcc19c' : '#8f8478', 'center');
        g.globalAlpha = x.fut ? .35 : 1;
        g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
        if (x.prot) { g.fillStyle = '#4fbf80'; g.fill(); txt('', cx, cy + R * .34, ICON(R * .95), '#0f2a1b', 'center'); }
        else if (x.on) { g.fillStyle = 'rgba(196,154,108,.18)'; g.fill(); g.strokeStyle = '#c49a6c'; g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(cx, cy, R * .2, 0, Math.PI * 2); g.fillStyle = '#dcc19c'; g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); }
        g.globalAlpha = 1;
    });
    y += 30 + 2 * R + (story ? 56 : 44);
    txt(tr('✓ proteína cumplida   ● día apuntado'), P, y, SANS(600, story ? 28 : 24), '#8f8478');
    // Cifras: icono verde si hay algo que celebrar
    y += story ? 60 : 36;
    const tiles = [['', tr('Días apuntados'), `${D.logged}/${D.past}`, D.logged > 0], ['', tr('Proteína cumplida'), tr(D.protOk === 1 ? '{k} día' : '{k} días', { k: D.protOk }), D.protOk > 0],
        ['', tr('Entrenos'), String(D.workouts), D.workouts > 0], ['', tr('Racha'), tr(D.S.cur === 1 ? '{k} día' : '{k} días', { k: D.S.cur }), D.S.cur > 0]];
    const cols = 4, gap = story ? 20 : 18, tw = (W - 2 * P - gap * (cols - 1)) / cols, th = story ? 250 : 190;
    tiles.forEach(([ic, l, v, good], i) => {
        const x = P + (i % cols) * (tw + gap), ty = y + Math.floor(i / cols) * (th + gap);
        box(x, ty, tw, th, story ? 36 : 28, 'rgba(255,255,255,.05)', 'rgba(255,255,255,.07)');
        const pad = story ? 26 : 24;
        txt(ic, x + pad, ty + pad + (story ? 34 : 28), ICON(story ? 34 : 28), good ? '#6fcf97' : '#6d6359');
        const inner = tw - 2 * pad;
        txt(l.toUpperCase(), x + pad, ty + th - (story ? 92 : 76), fit(l.toUpperCase(), inner, z => SANS(800, z), story ? 20 : 18), '#a89c90');
        txt(v, x + pad, ty + th - pad, fit(v, inner, z => SERIF(600, z), story ? 64 : 54), '#f6efe7');
    });
    // Invitación para quien la ve (abajo, por encima de la zona de respuesta de las historias)
    const ch = story ? 300 : 250, cy0 = H - (story ? 220 : 56) - ch;
    box(P, cy0, W - 2 * P, ch, story ? 44 : 36, 'rgba(154,107,64,.16)', 'rgba(196,154,108,.45)');
    const ip = story ? 48 : 38;
    txt(tr('¿Te animas? Es gratis.'), P + ip, cy0 + ip + (story ? 50 : 40), SERIF(600, story ? 58 : 46), '#f6efe7');
    { const sub = tr('Calorías, macros, escáner y gym · sin anuncios'); txt(sub, P + ip, cy0 + ip + (story ? 104 : 84), fit(sub, W - 2 * P - 2 * ip, z => SANS(600, z), story ? 32 : 26), '#cfc5b8'); }
    const pill = SHARE_URL; g.font = SANS(800, story ? 32 : 26); const pw = g.measureText(pill).width + (story ? 64 : 48), ph = story ? 72 : 56;
    box(P + ip, cy0 + ch - ip - ph, pw, ph, ph / 2, '#9a6b40');
    txt(pill, P + ip + pw / 2, cy0 + ch - ip - ph / 2 + (story ? 11 : 9), SANS(800, story ? 32 : 26), '#ffffff', 'center');
    return cv;
}
async function shareProgress() {
    if (!profiles.current) { toast('Crea tu perfil para ver tu progreso.'); return; }
    openSheet('<i class="fa-solid fa-share-nodes text-mint-400"></i> ' + tr('Compartir mi semana'), `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="${tr('Formato')}">${[['story', tk('Historia'), tk('Instagram y WhatsApp')], ['post', tk('Publicación'), tk('Feed y chats')]].map(([k, l, s]) => `<button type="button" role="radio" data-shfmt="${k}" onclick="shareSetFmt('${k}')" class="nd-shfmt p-3 rounded-2xl border text-left"><span class="block text-sm font-extrabold">${tr(l)}</span><span class="block text-[11px] text-neutral-400">${tr(s)}</span></button>`).join('')}</div>
        <div id="sh-prev" class="rounded-2xl bg-neutral-950 border border-neutral-800 grid place-items-center p-2 min-h-[240px]" aria-live="polite"><i class="fa-solid fa-circle-notch fa-spin text-neutral-500"></i></div>
        <p class="text-xs text-neutral-400"><i class="fa-solid fa-lock"></i> ${tr('Sin tu peso ni tus medidas: solo tus hábitos de la semana.')}</p>
        <button type="button" onclick="shareSend()" class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold"><i class="fa-solid fa-share-nodes"></i> ${tr('Compartir')}</button>
        <div class="grid grid-cols-2 gap-2"><button type="button" onclick="shareSave()" class="nd-mbtn"><i class="fa-solid fa-download"></i> ${tr('Guardar imagen')}</button><button type="button" onclick="shareCopy()" class="nd-mbtn"><i class="fa-regular fa-copy"></i> ${tr('Copiar texto')}</button></div>
    </div>`);
    track('share_open');
    shareSetFmt(shareFmt);
}
async function shareSetFmt(k) {
    shareFmt = k === 'post' ? 'post' : 'story';
    document.querySelectorAll('[data-shfmt]').forEach(b => { const on = b.dataset.shfmt === shareFmt; b.setAttribute('aria-checked', on); b.className = 'nd-shfmt p-3 rounded-2xl border text-left ' + (on ? 'border-mint-500 bg-mint-500/10 text-neutral-50' : 'border-neutral-800 bg-neutral-900 text-neutral-300'); });
    const seq = ++shareSeq, cv = await drawWeekCard(shareFmt, weekShareData());
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (seq !== shareSeq) return; // se cambió de formato mientras se dibujaba
    shareBlob = blob;
    if (shareImg) URL.revokeObjectURL(shareImg);
    shareImg = blob ? URL.createObjectURL(blob) : null;
    const box = $('sh-prev'); if (!box) return;
    box.innerHTML = shareImg ? `<img src="${shareImg}" alt="${tr('Vista previa de tu tarjeta de la semana')}" class="max-h-[52vh] w-auto rounded-xl">` : `<p class="text-sm text-neutral-400">${tr('No se pudo crear la imagen')}</p>`;
}
const shareFile = () => shareBlob && new File([shareBlob], `mi-semana-nutridl-${shareFmt === 'story' ? 'historia' : 'post'}.png`, { type: 'image/png' });
async function shareSend() {
    const file = shareFile(); if (!file) { toast('No se pudo crear la imagen'); return; }
    const text = weekShareText(weekShareData());
    track('share_progress');
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
    }
    // Sin «compartir» del sistema (ordenador): se guarda la imagen y se copia el texto para pegarlo
    shareSave(true);
    try { await navigator.clipboard.writeText(text); toast('Imagen guardada y texto copiado: pégalo donde la compartas'); } catch (e) { toast('Imagen guardada: compártela donde quieras'); }
}
function shareSave(quiet) {
    const file = shareFile(); if (!file) { toast('No se pudo crear la imagen'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (quiet !== true) toast('Imagen guardada: compártela donde quieras');
}
async function shareCopy() {
    try { await navigator.clipboard.writeText(weekShareText(weekShareData())); toast('Texto copiado'); }
    catch (e) { toast('No se pudo copiar el texto'); }
}

function calWeekStats() {
    const t0 = todayISO(), dow = (new Date(t0 + 'T12:00:00').getDay() + 6) % 7, mon = shiftISO(t0, -dow);
    const days = Array.from({ length: 7 }, (_, i) => shiftISO(mon, i)), past = days.filter(d => d <= t0);
    const logged = past.filter(loggedOn), tot = logged.map(diaryTotals);
    return {
        days, past: past.length, logged: logged.length,
        protOk: calc.prot ? tot.filter(t => t.p >= calc.prot * .9).length : 0,
        avgKcal: tot.length ? tot.reduce((a, t) => a + t.kcal, 0) / tot.length : 0,
        workouts: state.workouts.filter(w => w.d >= mon && w.d <= t0).length,
    };
}

