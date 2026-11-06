// FitDL · Perfiles en el dispositivo y copias de seguridad
'use strict';

// =====================================================================
//  PERFILES (varias personas en el mismo dispositivo)
// =====================================================================
function mergeState(s) {
    const d = JSON.parse(JSON.stringify(DEFAULT_STATE));
    s = s || {};
    const arr = v => Array.isArray(v) ? v : [];
    const m = { ...d, ...s, diet: { ...d.diet, ...(s.diet || {}) }, gym: { ...d.gym, ...(s.gym || {}) }, diary: (s.diary && typeof s.diary === 'object') ? s.diary : {},
        weights: arr(s.weights), workouts: arr(s.workouts), customFoods: arr(s.customFoods) };
    if (!s.prefs) m.tab = 'home'; // perfiles de la 2.x: la app abre en «Hoy», no en la calculadora
    m.prefs = { ...d.prefs, ...(s.prefs || {}) };
    m.ach = (s.ach && typeof s.ach === 'object') ? s.ach : {}; m.cel = (s.cel && typeof s.cel === 'object') ? s.cel : {};
    m.moments = (s.moments && typeof s.moments === 'object') ? s.moments : {};
    m.chat = arr(s.chat).slice(-40); m.measures = arr(s.measures); m.meals = arr(s.meals);
    m.gym.eq = 'gym'; // la rutina es solo de gimnasio
    if (s.calcOk === undefined) m.calcOk = PAIRS_OK(m);
    delete m.gym.style; // el método FST-7 se quitó: todas las rutinas son las basadas en evidencia
    return m;
}
function persistProfiles() { profiles.v = 1; return storeSet(PROFILES_KEY, JSON.stringify(profiles)); }
function refreshAll() {
    calcEditing = false;
    syncCustomFoods();
    diaryDate = null; diarySel = null; gymDay = 0;
    syncInputsFromState();
    update(); renderTracker(); renderMeasures(); renderProfileChip(); renderDiary(); renderDashboard(); updateSticky(); renderPrefs(); renderTrainCard();
    if (state.tab === 'coach') renderCoach();
    if (state.tab === 'progress') renderProgress();
}
function newProfile() {
    closeProfileMenu();
    wz.prevProfile = profiles.current;
    if (profiles.current) { save(); profiles.current = null; state = mergeState(null); refreshAll(); }
    openWizard('create');
}
function finishProfileFromWizard() {
    wz.done = true;
    if (wz.mode === 'create' || !profiles.current) {
        const id = 'p' + Date.now().toString(36);
        profiles.list[id] = { name: wz.name || 'Yo', created: todayISO(), state };
        profiles.current = id;
    } else profiles.list[profiles.current].name = wz.name || profiles.list[profiles.current].name;
    // El peso del asistente queda registrado como peso de hoy
    const t = todayISO();
    state.weights = state.weights.filter(e => e.d !== t).concat([{ d: t, w: state.weight }]).sort((a, b) => a.d.localeCompare(b.d));
    wz.prevProfile = null;
    save();
}
function switchProfile(id, silent) {
    if (!profiles.list[id]) return;
    save();
    profiles.current = id;
    state = mergeState(profiles.list[id].state);
    profiles.list[id].state = state;
    persistProfiles();
    closeProfileMenu();
    refreshAll(); showTab('home');
    if (!silent) toast(tr('Perfil de {n}', { n: profiles.list[id].name }));
}
async function deleteProfile(id) {
    id = id || profiles.current;
    const target = profiles.list[id]; if (!target) return;
    closeProfileMenu();
    if (!(await askConfirm(tr('¿Borrar el perfil de {n}? Se borrarán sus datos, su diario, sus pesos y sus entrenamientos. No se puede deshacer.', { n: target.name }), 'Borrar perfil'))) return;
    const wasCurrent = id === profiles.current;
    if (!wasCurrent) save();
    delete profiles.list[id];
    if (wasCurrent) {
        profiles.current = Object.keys(profiles.list)[0] || null;
        state = mergeState(profiles.current ? profiles.list[profiles.current].state : null);
        if (profiles.current) profiles.list[profiles.current].state = state;
    }
    persistProfiles(); save();
    if (wasCurrent) { refreshAll(); showTab('home'); } else renderProfileChip();
    toast(tr('Perfil de {n} borrado', { n: target.name }));
}
const initial = n => { const m = String(n || '').match(/\p{L}|\p{N}/u); return esc(m ? m[0].toUpperCase() : '?'); };
function renderProfileChip() {
    const box = $('profile-chip'); if (!box) return;
    const cur = profiles.list[profiles.current];
    if (!cur) {
        box.innerHTML = `<div class="flex items-center gap-2"><button onclick="newProfile()" class="px-4 py-2 rounded-xl bg-mint-600 hover:bg-mint-700 text-white text-sm font-extrabold flex items-center gap-2"><i class="fa-solid fa-user-plus"></i><span class="whitespace-nowrap">${tr('Crear perfil')}</span></button>
            <button onclick="importProfiles()" class="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-mint-500/50" title="${tr('Cargar una copia de seguridad')}" aria-label="${tr('Cargar una copia de seguridad')}"><i class="fa-solid fa-upload"></i></button></div>`;
        return;
    }
    const others = Object.entries(profiles.list);
    box.innerHTML = `<button onclick="toggleProfileMenu(event)" class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-mint-500/50" aria-haspopup="true" aria-expanded="false" id="profile-btn">
            <span class="w-8 h-8 rounded-xl bg-mint-600 text-white font-extrabold grid place-items-center">${initial(cur.name)}</span>
            <span class="hidden sm:block text-sm font-bold text-neutral-100 max-w-[120px] truncate" title="${esc(cur.name)}">${esc(cur.name)}</span>
            <i class="fa-solid fa-chevron-down text-[10px] text-neutral-500"></i>
        </button>
        <div id="profile-menu" class="hidden absolute right-0 mt-2 w-64 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 text-sm z-50">
            <div class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">${tr('Perfiles en este dispositivo')}</div>
            ${others.map(([id, p]) => `<div class="flex items-center gap-1 rounded-xl hover:bg-neutral-800">
                <button onclick="switchProfile('${id}')" class="flex-1 min-w-0 flex items-center gap-3 px-3 py-2 text-left">
                    <span class="w-7 h-7 rounded-lg ${id === profiles.current ? 'bg-mint-600 text-white' : 'bg-neutral-800 text-neutral-300'} font-extrabold grid place-items-center text-xs">${initial(p.name)}</span>
                    <span class="flex-1 truncate font-semibold" title="${esc(p.name)}">${esc(p.name)}</span>${id === profiles.current ? '<i class="fa-solid fa-check text-mint-500"></i>' : ''}</button>
                <button onclick="event.stopPropagation();deleteProfile('${id}')" class="w-9 h-9 shrink-0 rounded-lg text-neutral-500 hover:text-roseAccent-600 hover:bg-neutral-700" aria-label="${tr('Borrar el perfil de {n}', { n: esc(p.name) })}" title="${tr('Borrar este perfil')}"><i class="fa-solid fa-trash text-xs"></i></button>
            </div>`).join('')}
            <div class="my-2 border-t border-neutral-800"></div>
            <button onclick="closeProfileMenu();openWizard('edit')" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-pen w-7 text-center text-neutral-400"></i>${tr('Editar mis datos')}</button>
            <button onclick="newProfile()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-user-plus w-7 text-center text-neutral-400"></i>${tr('Añadir otra persona')}</button>
            <button onclick="exportProfiles()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-download w-7 text-center text-neutral-400"></i>${tr('Guardar copia de seguridad')}</button>
            <button onclick="importProfiles()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-upload w-7 text-center text-neutral-400"></i>${tr('Cargar una copia')}</button>
            <button onclick="openAutoBackups()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-clock-rotate-left w-7 text-center text-neutral-400"></i>${tr('Copias automáticas')}</button>
            <button onclick="deleteProfile(profiles.current)" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left text-roseAccent-600"><i class="fa-solid fa-trash w-7 text-center"></i>${tr('Borrar mi perfil')}</button>
            <div class="my-2 border-t border-neutral-800"></div>
            ${I18N_READY ? `<div class="flex items-center gap-3 px-3 py-2"><i class="fa-solid fa-language w-7 text-center text-neutral-400"></i>
                <span class="flex-1 font-semibold">${tr('Idioma')}</span>
                <div class="nd-langsel" role="group" aria-label="${esc(tr('Idioma'))}">${Object.keys(LANGS).map(l => `<button type="button" onclick="setLang('${l}')" class="${l === LANG ? 'is-on' : ''}" aria-pressed="${l === LANG}">${l.toUpperCase()}</button>`).join('')}</div>
            </div>` : ''}
            <button onclick="openPro()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-crown w-7 text-center text-amber-300"></i>FitDL PRO <span class="nd-pro-badge ml-auto">${isPro() ? tr('Activo') : tr('Probar')}</span></button>
            <button onclick="openSync()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-rotate w-7 text-center text-neutral-400"></i>${tr('Móvil y ordenador')}</button>
            <button data-install onclick="installApp()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-mobile-screen-button w-7 text-center text-mint-400"></i>${tr('Instalar la app')}</button>
                <button onclick="openReport()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-bug w-7 text-center text-neutral-400"></i>${tr('Informe de errores')}</button>
            <a href="${LANG === 'en' ? 'privacy.html' : 'privacidad.html'}" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left"><i class="fa-solid fa-shield-halved w-7 text-center text-neutral-400"></i>${tr('Privacidad')}</a>
            <button onclick="wipeAll()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left text-roseAccent-600"><i class="fa-solid fa-eraser w-7 text-center"></i>${tr('Borrar todos los datos')}</button>
        </div>`;
}
function toggleProfileMenu(e) {
    if (e) e.stopPropagation();
    renderInstall();
    const m = $('profile-menu'); if (!m) return;
    m.classList.toggle('hidden');
    $('profile-btn').setAttribute('aria-expanded', String(!m.classList.contains('hidden')));
}
function closeProfileMenu() { const m = $('profile-menu'); if (m) m.classList.add('hidden'); }

// ----- Usar FitDL en varios dispositivos: hoy con copia de seguridad; la sincronización llegará con las cuentas -----
function openSync() {
    closeProfileMenu();
    openSheet('<i class="fa-solid fa-rotate text-mint-400"></i> ' + tr('Móvil y ordenador'), `<div class="space-y-4 text-sm text-neutral-300">
        <p>${tr('Tus datos viven en este dispositivo. Para pasarlos a otro:')}</p>
        <ol class="nd-steps"><li>${tr('Aquí: <b>Guardar copia de seguridad</b> (descarga un archivo).')}</li><li>${tr('Envíate ese archivo (correo, nube, WhatsApp…).')}</li><li>${tr('En el otro dispositivo: <b>Cargar una copia</b>.')}</li></ol>
        <div class="grid grid-cols-2 gap-2"><button onclick="closeSheet();exportProfiles()" class="py-3 rounded-xl bg-mint-600 text-white font-extrabold"><i class="fa-solid fa-download"></i> ${tr('Guardar copia')}</button><button onclick="closeSheet();importProfiles()" class="py-3 rounded-xl border border-neutral-700 font-bold"><i class="fa-solid fa-upload"></i> ${tr('Cargar copia')}</button></div>
        <div class="p-3 rounded-xl bg-neutral-800/60 border border-neutral-800 text-xs text-neutral-400">${tr('<b class="text-neutral-200">Próximamente:</b> sincronización automática con una cuenta opcional (PRO). Seguirás pudiendo usar FitDL sin cuenta.')}</div>
    </div>`);
    track('sync_open');
}

// ----- Copia de seguridad de los perfiles (para cambiar de móvil o pasar los datos a la app) -----
// =====================================================================
//  COPIAS AUTOMÁTICAS (en este dispositivo): una al día, se guardan las 3 últimas.
//  Sirven para deshacer un error (borrar algo sin querer, cargar una copia equivocada).
//  No sustituyen a «Guardar copia de seguridad», que es un archivo que puedes llevarte a otro sitio.
// =====================================================================
const AUTO_KEY = 'nutridl_autobackup';
const autoList = () => { try { const L = JSON.parse(localStorage.getItem(AUTO_KEY) || '[]'); return Array.isArray(L) ? L : []; } catch (e) { return []; } };
function autoBackup(force) {
    try {
        if (!profiles || !profiles.list || !Object.keys(profiles.list).length) return;
        const L = autoList(), d = todayISO();
        if (!force && L.length && L[0].d === d) return;
        const data = JSON.stringify(profiles);
        if (data.length > 1500000) return; // muy grande para guardar 3 copias aquí: mejor el archivo de copia
        const next = [{ d, t: new Date().toISOString(), n: Object.keys(profiles.list).length, data }, ...L.filter(x => x.d !== d)].slice(0, 3);
        localStorage.setItem(AUTO_KEY, JSON.stringify(next));
    } catch (e) { logErr('Copia automática: ' + e.message); } // i18n-ignore (registro interno)
}
function openAutoBackups() {
    closeProfileMenu();
    const L = autoList();
    openSheet('<i class="fa-solid fa-clock-rotate-left text-mint-400"></i> ' + tr('Copias automáticas'), `
        <div class="space-y-4">
            <p class="text-sm text-neutral-300">${tr('Cada día se guarda sola una copia de todo en este dispositivo (las 3 últimas). Si borras algo sin querer, vuelve a como estaba ese día.')}</p>
            ${L.length ? `<div class="divide-y divide-neutral-800 border border-neutral-800 rounded-xl">${L.map((b, i) => `<div class="flex items-center gap-3 p-3"><div class="flex-1 min-w-0"><div class="text-sm font-bold text-neutral-100">${esc(new Date(b.t).toLocaleString(locale(), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</div><div class="text-xs text-neutral-400">${tp(b.n, 'perfil', 'perfiles')}</div></div><button onclick="restoreAutoBackup(${i})" class="nd-mbtn">${tr('Restaurar')}</button></div>`).join('')}</div>` : '<p class="text-sm text-neutral-400">' + tr('Aún no hay copias. Se crea la primera hoy mismo.') + '</p>'}
            <p class="text-xs text-neutral-400">${tr('Para no perder nada si cambias de móvil o borras el navegador, guarda también de vez en cuando una copia en archivo (menú del perfil → «Guardar copia de seguridad»).')}</p>
        </div>`);
}
async function restoreAutoBackup(i) {
    const b = autoList()[i]; if (!b) return;
    if (!(await askConfirm(tr('¿Volver a como estaba todo el {d}? Lo que hayas apuntado después se perderá (antes guardamos una copia de cómo está ahora).', { d: new Date(b.t).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) }), 'Restaurar'))) return;
    let p; try { p = JSON.parse(b.data); } catch (e) { toast('Esa copia está dañada'); return; }
    if (!p || !p.list || typeof p.list !== 'object') { toast('Esa copia está dañada'); return; }
    save(); autoBackup(true); // la situación actual queda guardada como copia de hoy
    profiles = p;
    if (!profiles.current || !profiles.list[profiles.current]) profiles.current = Object.keys(profiles.list)[0] || null;
    state = mergeState(profiles.current ? profiles.list[profiles.current].state : null);
    if (profiles.current) profiles.list[profiles.current].state = state;
    persistProfiles(); closeSheet(); refreshAll(); showTab('home');
    toast('Copia restaurada');
}
function exportProfiles() {
    closeProfileMenu(); save();
    const data = { app: 'fitdl', v: 1, exported: new Date().toISOString(), profiles };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `fitdl-copia-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Copia descargada: guárdala para recuperar tus perfiles');
}
// Seguridad: una copia puede venir de otra persona. Antes de guardarla se limpia todo lo que podría colarse
// en la página como código: claves raras fuera, textos sin < > " ' ` \ y el chat convertido a texto plano.
const SAFE_KEY = /^[\w.:-]{1,64}$/;
const ID_KEYS = new Set(['id', 'fid', 'd', 'date', 'slot', 'start', 'created', 'tab', 'goalType', 'gender', 'strategy', 'level', 'eq']);
function cleanImported(v, depth = 0) {
    if (depth > 12) return undefined;
    if (typeof v === 'string') return v.replace(/[<>"'`\\]/g, '').slice(0, 2000);
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'boolean' || v === null) return v;
    if (Array.isArray(v)) return v.slice(0, 5000).map(x => cleanImported(x, depth + 1)).filter(x => x !== undefined);
    if (typeof v === 'object') {
        const o = {};
        for (const [k, x] of Object.entries(v)) {
            if (!SAFE_KEY.test(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            let c = cleanImported(x, depth + 1);
            // Identificadores y fechas: solo letras, números, guion, punto y dos puntos (sin paréntesis ni espacios)
            if (typeof c === 'string' && ID_KEYS.has(k)) c = c.replace(/[^\w.:-]/g, '').slice(0, 64);
            if (c !== undefined) o[k] = c;
        }
        return o;
    }
    return undefined;
}
function plainText(html) {
    try { return new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || ''; } catch (e) { return ''; }
}
function cleanImportedState(s) {
    if (!s || typeof s !== 'object') return {};
    const chat = Array.isArray(s.chat) ? s.chat.slice(-40) : [];
    const out = cleanImported({ ...s, chat: [] }) || {};
    // Los entrenos se identifican con un número
    if (Array.isArray(out.workouts)) out.workouts = out.workouts.filter(w => w && typeof w === 'object').map((w, i) => ({ ...w, id: Number.isFinite(+w.id) && +w.id > 0 ? +w.id : Date.now() + i }));
    // Mensajes del chat: solo el texto (las respuestas del Coach se vuelven a mostrar como texto plano, sin botones)
    out.chat = chat.filter(m => m && typeof m === 'object').map(m => {
        const t = String(m.r === 'u' ? (m.t || plainText(m.html)) : plainText(m.html)).slice(0, 2000);
        return m.r === 'u' ? { r: 'u', t: t.replace(/[<>"'`\\]/g, '') } : { r: 'c', html: `<p>${esc(t)}</p>` };
    }).filter(m => (m.t || m.html));
    return out;
}
function importProfiles() {
    closeProfileMenu();
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
        const file = inp.files && inp.files[0]; if (!file) return;
        // Una copia real ocupa como mucho unos pocos MB: un archivo enorme no se lee (bloquearía el móvil)
        if (file.size > 20 * 1024 * 1024) { toast('Ese archivo es demasiado grande para ser una copia de FitDL'); return; }
        const r = new FileReader();
        r.onload = async () => {
            let data; try { data = JSON.parse(r.result); } catch (e) { toast('Ese archivo no es una copia de FitDL'); return; }
            const list = data && (data.app === 'fitdl' || data.app === 'nutridl') && data.profiles && data.profiles.list;
            if (!list || typeof list !== 'object') { toast('Ese archivo no es una copia de FitDL'); return; }
            save();
            // Ids de perfil raros (con comillas, etiquetas…) reciben un id nuevo y seguro
            const entries = Object.entries(list).filter(([, p]) => p && typeof p === 'object')
                .map(([id, p], i) => [/^[\w-]{1,40}$/.test(id) ? id : 'p' + Date.now().toString(36) + i, p]);
            // Mismo perfil (mismo id) ya en este dispositivo: solo se sustituye si lo confirmas
            const clash = entries.filter(([id]) => profiles.list[id]);
            const replace = clash.length ? await askConfirm(tr(clash.length === 1 ? 'La copia trae datos de {n}, que ya existe en este dispositivo. ¿Sustituirlos por los de la copia? Si eliges no, solo se añadirán los perfiles nuevos.' : 'La copia trae datos de {n}, que ya existen en este dispositivo. ¿Sustituirlos por los de la copia? Si eliges no, solo se añadirán los perfiles nuevos.', { n: clash.map(([id]) => profiles.list[id].name).join(', ') }), 'Sustituir') : false;
            // Si se van a sustituir perfiles, lo de antes queda en «Copias automáticas» para poder volver atrás
            if (replace) autoBackup(true);
            let added = 0, updated = 0;
            entries.forEach(([id, p]) => {
                if (profiles.list[id] && !replace) return;
                const created = /^\d{4}-\d{2}-\d{2}$/.test(p.created) ? p.created : todayISO();
                const entry = { name: String(p.name || 'Perfil').replace(/[<>"'`\\]/g, '').slice(0, 40) || 'Perfil', created, state: mergeState(cleanImportedState(p.state)) };
                if (profiles.list[id]) updated++; else added++;
                profiles.list[id] = entry;
            });
            if (!added && !updated) { toast(clash.length ? 'No se ha cambiado nada' : 'La copia no tenía perfiles'); return; }
            if (!profiles.current || !profiles.list[profiles.current]) profiles.current = Object.keys(profiles.list)[0];
            state = mergeState(profiles.list[profiles.current].state);
            profiles.list[profiles.current].state = state;
            persistProfiles(); refreshAll(); showTab('home');
            toast(tr('Copia cargada: {a}', { a: tr(added === 1 ? '{k} perfil nuevo' : '{k} perfiles nuevos', { k: added }) }) + (updated ? ', ' + tr(updated === 1 ? '{k} actualizado' : '{k} actualizados', { k: updated }) : ''));
        };
        r.readAsText(file);
    };
    inp.click();
}
// Si la web está abierta en dos pestañas, la otra se pone al día en vez de pisar los datos
window.addEventListener('storage', e => {
    if (e.key !== PROFILES_KEY || !e.newValue) return;
    try {
        const p = JSON.parse(e.newValue); if (!p || !p.list) return;
        profiles = p;
        const cur = profiles.current && profiles.list[profiles.current];
        state = mergeState(cur ? cur.state : null);
        if (cur) cur.state = state;
        refreshAll();
    } catch (err) { }
});

