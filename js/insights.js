// FitDL · Rachas, logros, resumen semanal y mensajes que interpretan tu progreso
// Solo se usan tus datos guardados; nunca se diagnostica nada.
'use strict';

const loggedOn = d => (state.diary[d] || []).length > 0;
const lastDays = (n, from = todayISO()) => Array.from({ length: n }, (_, i) => shiftISO(from, -i)).reverse();

// Racha: días seguidos con alguna comida apuntada. Si hoy aún no has apuntado nada, la racha sigue viva desde ayer.
function streakInfo() {
    const today = todayISO();
    let d = loggedOn(today) ? today : shiftISO(today, -1), cur = 0;
    while (loggedOn(d)) { cur++; d = shiftISO(d, -1); }
    const days = Object.keys(state.diary).filter(loggedOn).sort();
    let best = 0, run = 0, prev = null;
    days.forEach(x => { run = prev && shiftISO(prev, 1) === x ? run + 1 : 1; best = Math.max(best, run); prev = x; });
    return { cur, best: Math.max(best, cur), today: loggedOn(today), total: days.length };
}

// Cómo ha ido una semana (los 7 días anteriores a «hasta», sin incluir hoy si aún no ha terminado)
function weekStats(until = shiftISO(todayISO(), -1)) {
    const days = lastDays(7, until), c = calc;
    const logged = days.filter(loggedOn);
    const tot = logged.map(diaryTotals);
    const protOk = c.prot ? tot.filter(t => t.p >= c.prot * .9).length : 0;
    const kcalOk = c.target ? tot.filter(t => Math.abs(t.kcal - c.target) <= c.target * .1).length : 0;
    const avg = k => tot.length ? tot.reduce((a, t) => a + t[k], 0) / tot.length : 0;
    const wk = state.workouts.filter(w => w.d >= days[0] && w.d <= until).length;
    return { days, logged: logged.length, protOk, kcalOk, avgKcal: avg('kcal'), avgP: avg('p'), workouts: wk };
}

// Tendencia del peso con medias de 7 días (la báscula sube y baja por agua: la media dice la verdad)
function weightTrend() {
    const L = state.weights; if (L.length < 2) return null;
    const lastD = dayNum(L[L.length - 1].d);
    const avg = (end) => { const w = L.filter(e => dayNum(e.d) <= end && dayNum(e.d) > end - 7); return w.length ? w.reduce((a, e) => a + e.w, 0) / w.length : null; };
    const now = avg(lastD), prev = avg(lastD - 7), prev3 = avg(lastD - 21);
    const n21 = L.filter(e => dayNum(e.d) > lastD - 21).length;
    return { now, prev, week: prev != null ? now - prev : null, stable3: prev3 != null && n21 >= 6 && Math.abs(now - prev3) < .3, lastD };
}

// Mensajes de seguimiento: datos (lo que has hecho), tendencias (lo que muestran tus datos) y consejos
function insightsList() {
    const out = [], c = calc, S = streakInfo(), W = weekStats(), T = weightTrend(), goal = typeof goalTypeOf === 'function' ? goalTypeOf() : 'maintain';
    if (S.cur >= 2) out.push({ k: 'dato', ic: '🔥', t: tr('Has registrado comida {k} días seguidos.', { k: S.cur }), pr: S.cur >= 7 ? 9 : 6 });
    if (W.logged >= 3 && c.prot) out.push({ k: 'dato', ic: W.protOk >= 5 ? '🏆' : '🥩', t: tr('Has cumplido tu objetivo de proteína {k} de los últimos 7 días.', { k: W.protOk }), pr: W.protOk >= 5 ? 8 : 7 });
    if (W.logged >= 3 && c.target) out.push({ k: 'dato', ic: '🎯', t: tr('Tus calorías han estado en tu objetivo ({x}) {a} de {b} días registrados.', { x: '±' + pctTxt(10), a: W.kcalOk, b: W.logged }), pr: 5 });
    if (T && T.week != null && Math.abs(T.week) >= .1) {
        const good = (goal === 'lose' && T.week < 0) || (goal === 'gain' && T.week > 0);
        const k = fmt(Math.abs(T.week), 1);
        out.push({ k: 'tendencia', ic: good ? '📉' : '📈', t: (T.week < 0 ? tr('Tu peso medio ha bajado {k} kg esta semana.', { k }) : tr('Tu peso medio ha subido {k} kg esta semana.', { k })) + (good ? tr(' Vas en la dirección de tu objetivo.') : ''), pr: 8 });
    }
    if (T && T.stable3) out.push({ k: 'tendencia', ic: '⚖️', t: goal === 'lose' ? tr('Tu peso lleva 3 semanas estable. Si quieres seguir bajando, revisa que apuntas todo (aceite, salsas, bebidas) o suma pasos al día.') : tr('Tu peso lleva 3 semanas estable.'), pr: goal === 'maintain' ? 4 : 8 });
    if (W.logged >= 3 && c.prot && W.avgP < c.prot * .8) out.push({ k: 'consejo', ic: '💡', t: tr('Tu proteína media es de {a} g de {b} g. Añadir un lácteo proteico o una ración más de carne, pescado, huevo o legumbre te acerca.', { a: fmt(W.avgP), b: c.prot }), pr: 7 });
    if (!state.weights.length || (T && dayNum(todayISO()) - T.lastD >= 7)) out.push({ k: 'consejo', ic: '⚖️', t: tr('Pésate una vez por semana, en ayunas, para ver tu tendencia real.'), pr: 3 });
    if (W.workouts) out.push({ k: 'dato', ic: '💪', t: tr('Has guardado {x} en los últimos 7 días.', { x: tp(W.workouts, 'entreno', 'entrenos') }), pr: 4 });
    return out.sort((a, b) => b.pr - a.pr);
}

// =====================================================================
//  MOMENTOS (3.10): lo que te encuentras al abrir «Hoy» cuando toca
//  Nunca se inventa nada ni se mete prisa: todo sale de lo que ya has apuntado.
// =====================================================================
const moments = () => (state.moments && typeof state.moments === 'object') ? state.moments : (state.moments = {});
const momentSeen = (k, v) => { const M = moments(); M[k] = v == null ? todayISO() : v; M.last = todayISO(); save(); };
function dismissMoment(k) { momentSeen(k); renderDashboard(); }
// El lunes de la semana a la que pertenece una fecha (para enseñar el resumen una vez por semana)
function mondayOf(iso) { const d = new Date(iso + 'T12:00:00'); return shiftISO(iso, -((d.getDay() + 6) % 7)); }
// El último día con algo apuntado
function lastLoggedDay() {
    const days = Object.keys(state.diary).filter(loggedOn).sort();
    return days.length ? days[days.length - 1] : null;
}
// Devuelve COMO MUCHO un momento, el más importante. Si no toca ninguno, null.
function dayMoment() {
    if (!calc.target) return null;
    const M = moments(), today = todayISO(), S = streakInfo();
    const last = lastLoggedDay(), fuera = last ? dayNum(today) - dayNum(last) : 0;

    // 0. La prueba PRO acaba en 1-2 días: avisar con tiempo, sin presión (no se cobra nada ni se renueva sola)
    const tl = typeof trialDaysLeft === 'function' ? trialDaysLeft() : 0;
    if (tl >= 1 && tl <= 2 && M.trial !== today) return {
        k: 'trial', ic: '👑', kicker: tr('Prueba PRO'),
        title: tl === 1 ? tr('Tu prueba PRO termina mañana') : tr('Tu prueba PRO termina en 2 días'),
        sub: tr('Después sigues con todo lo gratis: diario, escáner, Coach, progreso y gym. No se cobra nada: la prueba no se renueva sola.'),
        btn: [tr('Ver qué incluye PRO'), "momentSeen('trial'); openPro()"], btn2: [tr('Entendido'), "dismissMoment('trial')"] };

    // 1. Vuelve después de unos días: ni regañar ni fingir que no ha pasado
    if (last && fuera >= 3 && M.back !== today) return {
        k: 'back', ic: '🌱', kicker: tr('{k} días sin apuntar', { k: fuera }),
        title: tr('Me alegra verte de vuelta'),
        sub: tr('Tu plan sigue donde lo dejaste: {k} kcal y {p} g de proteína. No hay nada que recuperar, se empieza por la comida de hoy.', { k: fmt(calc.target), p: fmt(calc.prot) }),
        btn: [tr('Apuntar algo'), 'openFoodSheet()'], btn2: [tr('Ahora no'), "dismissMoment('back')"] };

    // 2. La racha se pierde esta noche: solo a partir de las 17 h y solo si es verdad.
    //    Va antes que el resumen semanal: el resumen aguanta hasta el miércoles, la racha no.
    if (S.cur >= 2 && !S.today && new Date().getHours() >= 17 && M.risk !== today) return {
        k: 'risk', ic: '🔥', kicker: tr('Racha de {k} días', { k: S.cur }),
        title: tr('Hoy aún no has apuntado nada'),
        sub: tr('Con apuntar una comida la mantienes.') + ' ' + (S.cur === S.best ? tr('Además es tu mejor racha hasta ahora.') : tr('Tu récord está en {k} días.', { k: S.best })),
        btn: [tr('Apuntar en 10 segundos'), 'openFoodSheet()'], btn2: [tr('Hoy no'), "dismissMoment('risk')"] };

    // 3. Resumen de la semana pasada: lunes, martes o miércoles, una vez por semana
    const lunes = mondayOf(today);
    if (new Date(today + 'T12:00:00').getDay() <= 3 && M.week !== lunes) {
        const W = weekStats(shiftISO(lunes, -1));
        if (W.logged >= 3) {
            const T = weightTrend();
            const kg = T && T.week != null && Math.abs(T.week) >= 0.1 ? fmt(Math.abs(T.week), 1) : null;
            const peso = kg ? ' ' + (T.week < 0 ? tr('Tu peso medio bajó {k} kg.', { k: kg }) : tr('Tu peso medio subió {k} kg.', { k: kg })) : '';
            return { k: 'week', ic: '⭐', kicker: tr('La semana pasada'),
                title: tr('{k} de 7 días apuntados', { k: W.logged }),
                sub: tr('Media de {k} kcal y {p} g de proteína.', { k: fmt(W.avgKcal), p: fmt(W.avgP) })
                    + ' ' + (W.protOk ? tr('Cumpliste tu proteína {x}.', { x: tp(W.protOk, 'día', 'días') }) : tr('Esta semana, apunta a {p} g de proteína al día.', { p: fmt(calc.prot) }))
                    + (W.workouts ? ' ' + tr('Guardaste {x}.', { x: tp(W.workouts, 'entreno', 'entrenos') }) : '') + peso,
                btn: [tr('Ver mi progreso'), `momentSeen('week','${lunes}'); showTab('progress')`],
                btn2: [tr('Compartirla'), `momentSeen('week','${lunes}'); shareProgress()`] };
        }
    }

    // 4. Ofrecer el recordatorio diario una sola vez, cuando ya se sabe que la app le sirve
    if (S.total >= 3 && !M.remind && M.last !== today) return {
        k: 'remind', ic: '🔔', kicker: tr('Para no olvidarte'),
        title: tr('Ponte un recordatorio diario'),
        sub: tr('Se añade a tu calendario y te avisa a la hora que elijas. Funciona aunque no abras la app.'),
        btn: [tr('Ponerlo'), "momentSeen('remind', 1); openReminder()"], btn2: [tr('No, gracias'), "dismissMoment('remind')"] };

    return null;
}
// =====================================================================
//  LOGROS
// =====================================================================
const ACHIEVEMENTS = [
    ['first_food', '🍽️', tk('Primera comida'), tk('Apunta tu primera comida'), () => streakInfo().total >= 1],
    ['streak7', '🔥', tk('7 días'), tk('7 días seguidos registrando'), () => streakInfo().best >= 7],
    ['streak14', '🔥', tk('14 días'), tk('14 días seguidos registrando'), () => streakInfo().best >= 14],
    ['streak30', '🏅', tk('30 días'), tk('30 días seguidos registrando'), () => streakInfo().best >= 30],
    ['streak60', '🏆', tk('60 días'), tk('60 días seguidos registrando'), () => streakInfo().best >= 60],
    ['streak100', '👑', tk('100 días'), tk('100 días seguidos registrando'), () => streakInfo().best >= 100],
    ['protein5', '🥩', tk('Semana proteica'), tk('Proteína cumplida 5 de 7 días'), () => weekStats(todayISO()).protOk >= 5],
    ['first_weight', '⚖️', tk('Primer pesaje'), tk('Apunta tu peso'), () => state.weights.length >= 1],
    ['weights8', '📈', tk('Constancia'), tk('8 pesajes registrados'), () => state.weights.length >= 8],
    ['first_workout', '💪', tk('Primer entreno'), tk('Guarda un entreno'), () => state.workouts.length >= 1],
    ['workouts20', '🏋️', tk('20 entrenos'), tk('20 entrenos guardados'), () => state.workouts.length >= 20],
    ['measures', '📏', tk('Medidas'), tk('Guarda tus medidas'), () => (state.measures || []).length >= 1],
];
// Comprueba logros nuevos y los celebra (una sola vez cada uno)
function checkAchievements(silent) {
    if (!profiles.current) return [];
    state.ach = state.ach || {};
    const fresh = ACHIEVEMENTS.filter(([id, , , , ok]) => !state.ach[id] && ok());
    fresh.forEach(([id]) => { state.ach[id] = todayISO(); });
    if (fresh.length) { save(); if (!silent) { const [, ic, name] = fresh[fresh.length - 1]; celebrate(ic, name, 'Logro desbloqueado'); } }
    return fresh;
}

// Momentos del día: proteína conseguida y día completado (una vez al día)
function checkDayMoments() {
    if (!profiles.current || !calc.target) return;
    const d = todayISO(), t = diaryTotals(d);
    state.cel = state.cel || {};
    const done = state.cel[d] || (state.cel[d] = {});
    // Solo se guarda lo de los últimos 10 días
    Object.keys(state.cel).forEach(k => { if (k < shiftISO(d, -10)) delete state.cel[k]; });
    if (!done.prot && t.p >= calc.prot) { done.prot = 1; save(); celebrate('🏆', 'Objetivo de proteína conseguido', tr('{a} g de {b} g', { a: fmt(t.p), b: calc.prot })); return; }
    if (!done.day && t.p >= calc.prot * .9 && t.kcal >= calc.target * .9 && t.kcal <= calc.target * 1.05) { done.day = 1; save(); celebrate('🔥', 'Día completado', 'Calorías y proteína en tu objetivo'); return; }
    const S = streakInfo();
    if (S.today && [7, 14, 30, 60, 100].includes(S.cur) && !done['s' + S.cur]) { done['s' + S.cur] = 1; save(); celebrate('🔥', tr('{k} días seguidos', { k: S.cur }), 'Tu racha sigue creciendo'); }
}

// Aviso de celebración (discreto, arriba, 3 s)
let celT;
function celebrate(ic, title, sub) {
    const el = $('nd-celebrate'); if (!el) return;
    el.innerHTML = `<span class="nd-ic">${icon(ic)}</span><span class="min-w-0"><span class="block text-sm font-extrabold text-neutral-50">${esc(tr(title))}</span>${sub ? `<span class="block text-xs text-neutral-300">${esc(tr(sub))}</span>` : ''}</span>`;
    el.classList.add('show');
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(12); } catch (e) { }
    clearTimeout(celT); celT = setTimeout(() => el.classList.remove('show'), 3200);
    track('celebrate');
}

