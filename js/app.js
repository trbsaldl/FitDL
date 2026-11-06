// FitDL · App: pestañas, barra móvil, hojas, informe de errores
'use strict';

// =====================================================================
//  AÑADIDO: BARRA FIJA EN MÓVIL
// =====================================================================
function updateSticky() {
    const b = $('sticky-cta-btn'); if (!b) return;
    b.innerHTML = profiles.current ? '<i class="fa-solid fa-plus"></i> ' + tr('Apuntar comida') : tr('Crear mi perfil gratis') + ' <i class="fa-solid fa-arrow-right"></i>';
}
function stickyAction() {
    if (profiles.current) openFoodSheet();
    else openWizard();
}

// =====================================================================
//  AÑADIDO: PESTAÑAS DE LA APP (Calculadora · Comidas · Gym)
// =====================================================================
const TABS = ['home', 'food', 'coach', 'progress', 'gym', 'calc'];
function showTab(t, scrollTop = true) {
    if (!TABS.includes(t)) t = 'home';
    state.tab = t; track('tab_' + t);
    document.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== t));
    document.querySelectorAll('#tabbar-top [data-tab]').forEach(b => {
        b.className = 'px-3.5 lg:px-4 py-2 rounded-xl flex items-center gap-2 transition ' + (b.dataset.tab === t ? 'bg-mint-600 text-white shadow' : 'text-neutral-300 hover:text-white hover:bg-neutral-800');
        b.setAttribute('aria-current', b.dataset.tab === t ? 'page' : 'false');
    });
    document.querySelectorAll('#tabbar-bottom [data-tab]').forEach(b => {
        b.className = 'py-2.5 flex flex-col items-center gap-1 transition ' + (b.dataset.tab === t ? 'text-mint-400 is-on' : 'text-neutral-500');
        b.setAttribute('aria-current', b.dataset.tab === t ? 'page' : 'false');
    });
    document.body.dataset.tab = t;
    if (t === 'gym') renderGym();
    if (t === 'home') renderDashboard();
    if (t === 'coach') renderCoach();
    if (t === 'progress') renderProgress();
    if (t === 'calc') { renderPrefs(); renderTrainCard(); }
    if (scrollTop) window.scrollTo({ top: 0 });
    save();
}
function goTo(id) {
    const el = $(id); if (!el) return;
    const panel = el.closest('[data-panel]');
    if (panel && panel.classList.contains('hidden')) showTab(panel.dataset.panel, false);
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

// =====================================================================
//  HOJA GENÉRICA (escáner, comidas guardadas, editar entrenos, progreso, informe)
// =====================================================================
let sheetOnClose = null;
function openSheet(title, html, onClose) {
    if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); }
    $('nd-sheet-title').innerHTML = title;
    $('nd-sheet-body').innerHTML = html;
    $('nd-sheet').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    sheetOnClose = onClose || null;
}
function closeSheet() {
    $('nd-sheet').classList.add('hidden'); document.body.style.overflow = '';
    if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); }
}

// =====================================================================
//  REGISTRO DE ERRORES Y USO (solo en este dispositivo; nada se envía)
// =====================================================================
function track(k) { try { const u = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}'); u[k] = (u[k] || 0) + 1; localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch (e) { } if (typeof ev === 'function') ev(k); }
// El informe es para quien desarrolla la app: se deja en español a propósito
function reportText() { // i18n-ignore-start
    let errs = [], use = {};
    try { errs = JSON.parse(localStorage.getItem(ERR_KEY) || '[]'); use = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}'); } catch (e) { }
    return `FitDL ${APP_VERSION} · ${new Date().toISOString().slice(0, 16)}\n${navigator.userAgent}\n\nUso en este dispositivo:\n${typeof evReport === 'function' ? evReport() : ''}\n\nErrores (${errs.length}):\n${errs.map(e => `- ${e.t.slice(0, 16)} [${e.v}] ${e.m}`).join('\n') || '- ninguno'}\n\nUso:\n${Object.entries(use).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- sin datos'}`;
}
function openReport() {
    closeProfileMenu();
    // i18n-ignore-end
    openSheet('<i class="fa-solid fa-bug text-mint-400"></i> ' + tr('Informe de errores'), `
        <div class="space-y-4">
            <p class="text-sm text-neutral-300">${tr('Este informe se guarda solo en tu dispositivo. Si algo falla, cópialo y envíaselo a quien te pasó la app.')}</p>
            <pre class="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 whitespace-pre-wrap break-words max-h-72 overflow-y-auto">${esc(reportText())}</pre>
            <div class="grid grid-cols-2 gap-2">
                <button ${ND.on(copyReport)} class="py-3 rounded-xl bg-mint-600 text-white font-extrabold text-sm"><i class="fa-solid fa-copy"></i> ${tr('Copiar')}</button>
                <button ${ND.on(clearReport)} class="py-3 rounded-xl border border-neutral-700 text-neutral-200 font-bold text-sm">${tr('Vaciar')}</button>
            </div>
        </div>`);
}
function copyReport() { if (navigator.clipboard) navigator.clipboard.writeText(reportText()).then(() => toast('Informe copiado'), () => toast('No se pudo copiar')); }
function clearReport() { try { localStorage.removeItem(ERR_KEY); } catch (e) { } openReport(); toast('Registro vaciado'); }
// Borrar TODO lo de FitDL en este dispositivo (derecho de supresión)
async function wipeAll() {
    closeProfileMenu();
    if (!(await askConfirm('¿Borrar TODOS los datos de FitDL en este dispositivo? Perfiles, diario, pesos, medidas y entrenos. No se puede deshacer: si quieres, guarda antes una copia de seguridad.', 'Continuar'))) return;
    if (!(await askConfirm('Última confirmación: se borrará todo.', 'Borrar todo'))) return;
    try { [PROFILES_KEY, STORAGE_KEY, ERR_KEY, USAGE_KEY, 'nutridl_events', 'nutridl_consent', 'nutridl_autobackup', 'nutridl_run'].forEach(k => localStorage.removeItem(k)); } catch (e) { }
    location.reload();
}
