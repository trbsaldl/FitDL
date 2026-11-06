// FitDL · Arranque, instalación como app y modo sin conexión
'use strict';

function init() {
    if ($('app-version')) $('app-version').textContent = 'v' + APP_VERSION;
    // Teclado del asistente
    document.addEventListener('keydown', e => {
        if ($('wizard').classList.contains('hidden')) return;
        if (e.key === 'Escape') closeWizard();
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'number') wzNext();
    });
    load();
    state.gym = { level: 'beginner', days: 3, ...(state.gym || {}), eq: 'gym' };
    state.workouts = state.workouts || [];
    syncInputsFromState();
    update();
    renderTracker();
    renderMeasures();
    updateSticky();
    // Listener único de clic: data-h, data-backdrop, data-tab, data-cv, data-action, links internos
    document.addEventListener('click', e => {
        // 1. Handlers dinámicos registrados con ND.on()
        const hEl = e.target.closest('[data-h]');
        if (hEl) {
            const fn = ND._h.get(hEl.dataset.h);
            if (fn) { fn(e); return; }
        }
        // 2. Cierre de modales al hacer clic en el fondo
        const bd = e.target.closest('[data-backdrop]');
        if (bd && e.target === bd) {
            const fn = window[bd.dataset.backdrop];
            if (typeof fn === 'function') fn();
            return;
        }
        // 3. Pestañas de navegación
        // Solo botones: <body> también lleva data-tab (la pestaña actual) y lo contiene todo
        const tabEl = e.target.closest('button[data-tab]');
        if (tabEl) { showTab(tabEl.dataset.tab); return; }
        // 4. Vistas del Coach
        const cvEl = e.target.closest('button[data-cv]');
        if (cvEl) { coachView(cvEl.dataset.cv); return; }
        // 5. Acciones del HTML estático (data-action)
        const aEl = e.target.closest('[data-action]');
        if (aEl) {
            const action = aEl.dataset.action;
            const fn = window[action];
            if (typeof fn === 'function') {
                const arg = aEl.dataset.arg;
                const arg2 = aEl.dataset.arg2;
                if (arg2 !== undefined) fn(isNaN(arg) ? arg : +arg, isNaN(arg2) ? arg2 : +arg2);
                else if (arg !== undefined) fn(isNaN(arg) ? arg : +arg);
                else fn();
            }
            return;
        }
        // 6. Links internos (#seccion)
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href').slice(1);
        if (!id || !$(id)) return;
        e.preventDefault();
        goTo(id);
    });
    // Listener de input (data-ih)
    document.addEventListener('input', e => {
        const t = e.target.closest('[data-ih]');
        if (t) { const fn = ND._h.get(t.dataset.ih); if (fn) fn(e); }
    });
    // Listener de change (data-ch)
    document.addEventListener('change', e => {
        const t = e.target.closest('[data-ch]');
        if (t) { const fn = ND._h.get(t.dataset.ch); if (fn) fn(e); }
    });
    // Listener de submit (data-sh)
    document.addEventListener('submit', e => {
        const t = e.target.closest('[data-sh]');
        if (t) { e.preventDefault(); const fn = ND._h.get(t.dataset.sh); if (fn) fn(e); }
    });
    // Listener de keydown (data-kd)
    document.addEventListener('keydown', e => {
        const t = e.target.closest('[data-kd]');
        if (t) { const fn = ND._h.get(t.dataset.kd); if (fn) fn(e); }
    });
    // Listener de focusout (reemplaza onblur, data-bh)
    document.addEventListener('focusout', e => {
        const t = e.target.closest('[data-bh]');
        if (t) { const fn = ND._h.get(t.dataset.bh); if (fn) fn(e); }
    });
    checkAchievements(true); // logros ya conseguidos con datos anteriores: se anotan sin celebrarlos
    renderProfileChip(); renderDiary(); renderDashboard(); renderPrefs();
    document.addEventListener('click', e => { if (!e.target.closest('#profile-chip') && !e.target.closest('[data-backdrop]')) closeProfileMenu(); });
    // Sin perfil se abre la bienvenida; con perfil, la última pestaña usada (la calculadora antigua es «Mi plan»)
    // Idioma: se aplica a los textos fijos antes de pintar nada
    document.documentElement.lang = LANG;
    applyStaticI18n();
    showTab(profiles.current ? (TABS.includes(state.tab) ? state.tab : 'home') : 'home', false);
    // Accesos directos del icono de la app (mantener pulsado): ?accion=comida / gym / voz / coach
    const accion = new URLSearchParams(location.search).get('accion');
    if (accion === 'comida') { showTab('food'); openFoodSheet(); }
    else if (accion === 'gym') showTab('gym');
    else if (accion === 'voz') { showTab('food'); openVoiceLog(); }
    else if (accion === 'coach') showTab('coach');
    else if (accion === 'nevera') { showTab('coach'); openFridge(); }
    const alimento = new URLSearchParams(location.search).get('alimento');
    if (alimento) openFoodFromLink(alimento);
    // Se limpia la dirección para que al recargar no se repita la acción
    if (accion || alimento) try { history.replaceState(null, '', location.pathname); } catch (e) { }
    // Bindings para elementos estáticos del HTML (sustituyen a los onclick/oninput/onchange/onsubmit inline)
    const bindEl = (id, evt, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); };
    ['age', 'weight', 'height'].forEach(k => {
        bindEl('n-' + k, 'input', function () { onPair(k, this); });
        bindEl('r-' + k, 'input', function () { onPair(k, this); });
        bindEl('n-' + k, 'blur', function () { clampPair(k); });
    });
    bindEl('input-activity', 'change', function () { setField('activity', parseFloat(this.value)); });
    bindEl('dia-date', 'change', function () { diaryDate = this.value || todayISO(); renderDiary(); });
    bindEl('chat-form', 'submit', function (e) { e.preventDefault(); coachSend(); });
    bindEl('trk-goal', 'change', function () { setGoalWeight(this.value); });
    bindEl('fs-slot', 'change', function () { fs.slot = this.value; fsRenderTitle(); });
    bindEl('fs-q', 'input', function () { fs.q = this.value; fsRender(); });
    renderInstall();
    track('visit'); renderLocks();
    // Copia automática del día y petición al navegador para que NO borre los datos de la app por falta de espacio
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('nd-ready')));
    setTimeout(() => autoBackup(), 1500);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => { }); } catch (e) { }
}
// Si algo fallase al arrancar, en vez de una pantalla en blanco se ve cómo descargar los datos y recargar
function bootRescue(err) {
    logErr('Arranque: ' + ((err && err.message) || err));
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:24px;background:#110f0d;color:#f2ede6;font-family:system-ui,sans-serif';
    // Si el arranque falló, puede que el idioma no llegara a cargarse: se usa el texto tal cual
    const trSafe = s => typeof tr === 'function' ? tr(s) : s;
    box.innerHTML = `<div style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 10px">${trSafe('FitDL no ha podido abrirse bien')}</h1>
        <p style="color:#cfc5b8;line-height:1.5;margin:0 0 18px">${trSafe('Tus datos siguen guardados en este dispositivo. Descarga una copia por seguridad y vuelve a cargar la app.')}</p>
        <button id="rescue-dl" style="width:100%;padding:14px;border-radius:12px;border:0;background:#9a6b40;color:#fff;font-weight:700;font-size:16px;margin-bottom:10px">${trSafe('Descargar mis datos')}</button>
        <button id="rescue-reload" style="width:100%;padding:14px;border-radius:12px;border:1px solid #463f38;background:transparent;color:#f2ede6;font-weight:700;font-size:16px">${trSafe('Volver a cargar')}</button></div>`;
    document.body.appendChild(box);
    box.querySelector('#rescue-dl').onclick = () => {
        let raw = ''; try { raw = localStorage.getItem(PROFILES_KEY) || localStorage.getItem(PROFILES_KEY + '_rescate') || ''; } catch (e) { }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([`{"app":"fitdl","v":1,"profiles":${raw && raw.trim().startsWith('{') ? raw : '{"list":{}}'}}`], { type: 'application/json' }));
        a.download = 'fitdl-copia-rescate.json'; document.body.appendChild(a); a.click(); a.remove();
    };
    box.querySelector('#rescue-reload').onclick = () => location.reload();
}

// =====================================================================
//  INSTALAR COMO APP Y FUNCIONAR SIN CONEXIÓN
// =====================================================================
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvt = null;
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && (!/^(localhost|127\.)/.test(location.hostname) || new URLSearchParams(location.search).has('sw'))) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
            // Al volver a la app (desde otra app o la pantalla de inicio) se busca versión nueva
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => { }); });
        }).catch(e => logErr('Service worker: ' + e.message)); // i18n-ignore (registro interno)
    });
    // Cuando se instala una versión nueva con la app abierta, se recarga sola una vez (lo apuntado ya está guardado)
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || sessionStorage.getItem('nd-reloaded') === APP_VERSION) return;
        try { sessionStorage.setItem('nd-reloaded', APP_VERSION); } catch (e) { }
        save();
        location.reload();
    });
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderInstall(); });
window.addEventListener('appinstalled', () => { installEvt = null; renderInstall(); track('installed'); toast('FitDL instalada en tu dispositivo'); });
function renderInstall() {
    document.querySelectorAll('[data-install]').forEach(b => b.classList.toggle('hidden', isInstalled()));
}
async function installApp() {
    closeProfileMenu();
    if (installEvt) {
        installEvt.prompt();
        try { await installEvt.userChoice; } catch (e) { }
        installEvt = null; renderInstall();
        return;
    }
    // iPhone/iPad y navegadores sin botón de instalar: instrucciones
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    openSheet('<i class="fa-solid fa-mobile-screen-button text-mint-400"></i> ' + tr('Instalar FitDL'), `
        <ol class="space-y-3 text-sm text-neutral-200 list-decimal pl-5">
            ${ios ? `<li>${tr('Abre esta página en <b>Safari</b>.')}</li><li>${tr('Pulsa el botón <b>Compartir</b> {i}.', { i: '<i class="fa-solid fa-arrow-up-from-bracket text-mint-400"></i>' })}</li><li>${tr('Elige <b>«Añadir a pantalla de inicio»</b> y pulsa <b>Añadir</b>.')}</li>`
                : `<li>${tr('Abre el menú del navegador {i}.', { i: '<i class="fa-solid fa-ellipsis-vertical text-mint-400"></i>' })}</li><li>${tr('Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.')}</li>`}
        </ol>
        <p class="mt-4 text-xs text-neutral-400">${tr('Así se abre como una app, a pantalla completa, y funciona sin conexión.')}</p>`);
}

try { init(); } catch (e) { bootRescue(e); }

