// FitDL · Gratis y PRO
// Lo básico es gratis siempre. Las funciones PRO solo se usan con PRO activo en este dispositivo:
//   · prueba gratis de 7 días (una vez), · código de activación (lo das tú tras el pago), · enlace de pago (PAY_LINK).
// Sin servidor no hay forma 100 % segura de comprobar pagos: cuando haya cuentas, PRO se validará en el servidor.
'use strict';

// El código de activación da PRO para siempre (no caduca): por eso el pago único es el precio de verdad de hoy.
// Mensual y anual se enseñan como lo que son: lo que habrá cuando el pago esté dentro de la app.
const PRO_PRICE = { month: 4.99, year: 39.99, life: 24.99 };
// PARA COBRAR DENTRO DE LA APP (cuando quieras):
//  1. Entra en stripe.com → Pagos → Enlaces de pago → crea uno de 24,99 € («FitDL PRO para siempre»).
//  2. Copia la dirección que te da (empieza por https://buy.stripe.com/...) y pégala aquí entre las comillas.
//  3. Al pagar, Stripe te avisa por correo: le mandas a esa persona uno de los códigos de
//     «Nutri versions/nutriDL-codigos-PRO.txt» (cada código vale para un cliente y no caduca).
// Mientras esté vacío, el botón dice que te escriban por correo. En la versión de Google Play no se enseña.
const PAY_LINK = '';
const PRO_KEY = 'nutridl_pro';
// Versión de Google Play (app Android que abre esta web): sin precios, enlace de pago ni códigos comprados fuera,
// porque Google Play tiene sus propias normas de pago. Se detecta al abrir desde la app (referrer android-app://
// o ?src=play en la dirección de inicio) y se recuerda durante la sesión. La prueba gratis de 7 días se mantiene.
const IN_PLAY = (() => {
    try {
        if (document.referrer.startsWith('android-app://') || new URLSearchParams(location.search).get('src') === 'play') sessionStorage.setItem('nd_play', '1');
        return sessionStorage.getItem('nd_play') === '1';
    } catch (e) { return false; }
})();
// Huellas (SHA-256) de los códigos de activación válidos: los códigos no están en el código de la app
const PRO_CODES = ["7ea3fdd4c525c0742a7bfc627cc61338","233e5c78ab6275285c8be98400357702","4d6f5e327b363051c0d98df625bee746","fd02c89ddce6164590eead6d0af72f86","2315259eae4187cd4d933ba46fa05853","33c7f11ddaf6dab00279619dc2105d68","dc3f49124726927df26e483ae3939b19","2e779a3ce619fb5a2a189fad02755816","151b37bf0f1aafc3fafa6fd92fdaabfa","5910e96de74c642a5480de7b7022069c","cb25d9d815e6d36b0290847802aaa3a7","128d8807d2dca9446e475f0086ffcace","3960e99b00bbe974e4babcca9dfef814","fe2634b38de3dcde7534e794cc996c45","6e09aba75d61709eed322258551462f1","e7b0b60d6db23081a0d1aec80391250a","2e8ef05343689c70b8914928ae0c99ec","a1214160e231a5fd26bf8f2d4f6f14f7","526c99d5a549a3258d8e9b4dffccc292","1de43f07207187f59b1329b0491c9d54","b6d8f3054459abc142040ad13239d711","2fc42a28bd9b093a2751441e60e89c36","ca7a655570b45fe9f240d2d73ba6438d","86af3d1c3f5782968e01855371de35fd","566d31f5312cf663d4a7d08527f57f6e"];
// Qué es PRO (clave → [nombre, para qué sirve])
const PRO_FEATURES = {
    voice: [tk('Registro por voz'), tk('Di lo que has comido y se apunta solo.')],
    photo: [tk('Calculadora de plato'), tk('Marca lo que hay en el plato y te digo las calorías y los macros. La foto es solo para recordarlo.')],
    fridge: [tk('Mi nevera'), tk('Dime qué tienes y te digo qué cocinar, con cantidades y macros.')],
    menu: [tk('Menú del día'), tk('Tu día completo con gramos exactos, a tu medida.')],
    shop: [tk('Compra inteligente'), tk('Tu compra de la semana con cantidades, a tu gusto.')],
    trends: [tk('Análisis avanzado'), tk('Tus medias de 7, 30 y 90 días, en qué días fallas, macros reales y exportar tu historial a Excel.')],
};
// [función, gratis, pro]
const PLAN_FEATURES = [
    [tk('Calorías, macros y tu plan explicado'), true, true],
    [tk('Diario, escáner y base de alimentos'), true, true],
    [tk('Coach: apuntar escribiendo, «¿Qué como?», comer fuera…'), true, true],
    [tk('Peso, medidas, racha, logros y tu semana'), true, true],
    [tk('Gym con historial completo'), true, true],
    [tk('Registro por voz'), false, true],
    [tk('Calculadora de plato (marcas lo que hay)'), false, true],
    [tk('Mi nevera: qué cocinar con lo que tienes'), false, true],
    [tk('Menú del día con gramos exactos'), false, true],
    [tk('Compra inteligente semanal a tu gusto'), false, true],
    [tk('Análisis avanzado: medias, patrones y exportar a Excel'), false, true],
    [tk('Sin anuncios'), true, true],
];

function proData() { try { return JSON.parse(localStorage.getItem(PRO_KEY) || '{}') || {}; } catch (e) { return {}; } }
function setProData(d) { try { localStorage.setItem(PRO_KEY, JSON.stringify(d)); } catch (e) { } }
const TRIAL_MS = 7 * 86400000;
function isPro() {
    const d = proData();
    // El código guardado tiene que ser una huella válida: escribir cualquier cosa en el almacenamiento no basta
    if (d.code && PRO_CODES.includes(d.code)) return true;
    // Una prueba nunca dura más de 7 días desde ahora (evita fechas de fin inventadas a años vista)
    return !!(d.trialEnd && Date.now() < d.trialEnd && d.trialEnd - Date.now() <= TRIAL_MS + 3600000);
}
const trialDaysLeft = () => { const d = proData(); return d.trialEnd && !d.code ? Math.max(0, Math.ceil((d.trialEnd - Date.now()) / 86400000)) : 0; };
const canUse = feature => !PRO_FEATURES[feature] || isPro();
// Ejecuta una función PRO o enseña qué es PRO
function needPro(feature) {
    if (canUse(feature)) return false;
    openPaywall(feature); track('paywall_' + feature);
    return true;
}
// Candados en los botones fijos de la página (data-lock="función")
function renderLocks() { document.querySelectorAll('[data-lock]').forEach(i => i.classList.toggle('hidden', canUse(i.dataset.lock))); }
const lockIc = feature => canUse(feature) ? '' : ' <i class="fa-solid fa-lock text-[10px] text-amber-300" aria-label="PRO"></i>';

function proTable() {
    const ck = on => on ? '<i class="fa-solid fa-check text-ok-400"></i>' : '<span class="text-neutral-600">—</span>';
    return `<div class="rounded-2xl border border-neutral-800 overflow-hidden text-sm">
        <div class="grid grid-cols-[1fr_4rem_4rem] bg-neutral-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400"><span>${tr('Función')}</span><span class="text-center">${tr('Gratis')}</span><span class="text-center text-mint-300">PRO</span></div>
        ${PLAN_FEATURES.map(([l, f, p]) => `<div class="grid grid-cols-[1fr_4rem_4rem] px-4 py-2.5 border-t border-neutral-800 items-center"><span class="text-neutral-200">${tr(l)}</span><span class="text-center">${ck(f)}</span><span class="text-center">${ck(p)}</span></div>`).join('')}
        <p class="px-4 py-3 border-t border-neutral-800 text-[11px] text-neutral-500">${tr('En camino, todavía no disponible: IA conversacional, reconocer la foto y sincronizar entre móvil y ordenador. No se cobra por lo que aún no existe.')}</p>
    </div>`;
}
function proPrices() {
    if (IN_PLAY) return '';
    const save = Math.round((1 - PRO_PRICE.year / (PRO_PRICE.month * 12)) * 100);
    // Hoy solo se puede comprar el código, y el código no caduca: se dice así de claro.
    const vida = `<div class="nd-price nd-price-best"><div class="text-xs font-bold text-mint-300">${tr('Pago único · para siempre')}</div><div class="text-2xl font-extrabold text-neutral-50">${eur(PRO_PRICE.life)}</div><div class="text-xs text-neutral-400">${tr('se paga una vez y es tuyo')}</div></div>`;
    return `<div class="grid grid-cols-2 gap-3">
        ${vida}
        <div class="nd-price"><div class="text-xs font-bold text-neutral-400">${tr('Mensual')}</div><div class="text-2xl font-extrabold text-neutral-50">${eur(PRO_PRICE.month)}</div><div class="text-xs text-neutral-400">${tr('al mes · cuando se pueda pagar en la app')}</div></div>
        <div class="nd-price"><div class="text-xs font-bold text-neutral-400">${tr('Anual · ahorra {p}', { p: pctTxt(save) })}</div><div class="text-2xl font-extrabold text-neutral-50">${eur(PRO_PRICE.year)}</div><div class="text-xs text-neutral-400">${tr('al año ({m}/mes)', { m: eur(PRO_PRICE.year / 12) })}</div></div>
    </div>`;
}
// Lo que pasa cuando acaba la prueba, dicho claro ANTES de empezarla (es la queja nº 1 del mercado)
const trasLaPrueba = () => `<p class="text-[11px] text-neutral-500 leading-snug">${tr('Al acabar la prueba no pierdes nada de lo tuyo: tus comidas, tu peso y tus entrenos siguen igual, y el último menú y la última compra que hiciste se quedan para consultarlos. Solo dejas de poder crear nuevos.')}</p>`;

function proActions() {
    const d = proData();
    if (isPro()) return `<div class="p-4 rounded-2xl bg-mint-600/15 border border-mint-500/30 text-sm text-neutral-100"><i class="fa-solid fa-crown text-amber-300"></i> <b>${tr('PRO activo')}</b>${d.code ? ' ' + tr('(código de activación)') : ' · ' + tr('prueba gratis: te quedan {x}', { x: tp(trialDaysLeft(), 'día', 'días') })}</div>`;
    // Sin prueba gastada: el único botón grande es la prueba (no pide tarjeta). Ya gastada: el pago único.
    const codigo = `<details class="nd-faq"><summary>${tr('Ya tengo un código')}<i class="fa-solid fa-chevron-down chev"></i></summary>
        <form onsubmit="event.preventDefault(); redeemCode()" class="flex gap-2 p-3"><input id="pro-code" autocomplete="off" autocapitalize="characters" placeholder="NDL-XXXX-XXXX-XXXX" class="flex-1 min-w-0 px-3 py-3 rounded-xl bg-neutral-800 border border-neutral-700 font-bold tracking-wide text-sm" aria-label="${tr('Código de activación')}"><button class="px-4 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-extrabold">${tr('Activar')}</button></form></details>`;
    return `<div class="space-y-2">
        ${!d.trialUsed ? `<button onclick="startTrial()" class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold">${tr('Probar PRO 7 días gratis')}</button>
        <p class="text-xs text-center text-neutral-400">${tr('Sin tarjeta y sin renovación automática. Al acabar vuelves a la versión gratis tú solo.')}</p>` : ''}
        ${IN_PLAY ? (d.trialUsed ? '<p class="text-sm text-neutral-300">' + tr('Muy pronto podrás hacerte PRO desde la app. Lo básico sigue siendo gratis.') + '</p>' : '') : `<button onclick="payPro()" class="w-full py-3.5 rounded-2xl ${d.trialUsed ? 'bg-mint-600 hover:bg-mint-700 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-100'} font-extrabold">${tr('Hazte PRO para siempre · {m}', { m: eur(PRO_PRICE.life) })}</button>
        ${codigo}`}
    </div>`;
}

// Vista previa honesta de cada función: lo que vas a ver DE VERDAD, con tus propios números cuando los hay
function proPreview(feature) {
    const fila = (t, v) => `<div class="flex items-center justify-between gap-3 text-sm"><span class="text-neutral-300">${t}</span><b class="text-neutral-50 whitespace-nowrap">${v}</b></div>`;
    let cuerpo = '';
    if (feature === 'menu' && calc.target) cuerpo = fila(tr('Comidas al día'), myPrefs().meals) + fila(tr('Suman'), tr('{k} kcal', { k: fmt(calc.target) })) + fila(tr('Proteína'), calc.prot + ' g') + `<p class="text-xs text-neutral-400">${tr('Cada plato con sus gramos exactos, receta y botón para apuntarlo.')}</p>`;
    else if (feature === 'shop' && calc.target) cuerpo = fila(tr('Tu compra'), tr('7 días')) + fila(tr('Agrupada por'), tr('pasillo del súper')) + `<p class="text-xs text-neutral-400">${tr('Cantidades exactas, cambias lo que no te guste y la compartes.')}</p>`;
    else if (feature === 'trends') {
        const W = typeof calWeekStats === 'function' ? calWeekStats() : null;
        cuerpo = (W ? fila(tr('Días registrados'), `${W.logged}/${W.past}`) : '') + fila(tr('Medias'), tr('7, 30 y 90 días')) + fila(tr('Exportar'), tr('Excel / CSV')) + `<p class="text-xs text-neutral-400">${tr('En qué días de la semana te pasas y tus macros reales frente a tu objetivo.')}</p>`;
    } else if (feature === 'fridge') cuerpo = `<p class="text-sm text-neutral-300">${tr('Marcas lo que tienes («pollo, arroz, espinacas») y te propone platos completos con cantidades y macros.')}</p>`;
    else if (feature === 'voice') cuerpo = `<p class="text-sm text-neutral-300">${tr('Dices «dos huevos y una tostada con aceite» y lo deja preparado para que lo confirmes.')}</p>`;
    else if (feature === 'photo') cuerpo = `<p class="text-sm text-neutral-300">${tr('Marcas lo que hay en el plato y eliges el tamaño de la ración: te damos las calorías y los macros. La foto es solo para que lo recuerdes.')}</p>`;
    return cuerpo ? `<div class="nd-card p-4 space-y-2"><div class="text-[11px] font-bold uppercase tracking-wider text-mint-300">${tr('Esto es lo que verás')}</div>${cuerpo}</div>` : '';
}
function openPro() {
    closeProfileMenu();
    openSheet('<span class="nd-pro-badge">PRO</span> FitDL PRO', `<div class="space-y-4">${proActions()}${trasLaPrueba()}${proPrices()}${proTable()}
        <p class="text-[11px] text-neutral-500">${tr('Lo básico es gratis siempre. La prueba no pide tarjeta y no se renueva sola.')}</p></div>`);
    track('pro_open');
}
function openPaywall(feature) {
    const [nameKey, whyKey] = PRO_FEATURES[feature] || [tk('Función PRO'), ''];
    const name = tr(nameKey), why = whyKey ? tr(whyKey) : '';
    openSheet('<span class="nd-pro-badge">PRO</span> ' + esc(name), `<div class="space-y-4">
        <div class="text-center space-y-2 py-2"><div class="nd-ic-xl mx-auto">${icon('👑')}</div><h3 class="text-xl font-extrabold text-neutral-50">${tr('{n} es de FitDL PRO', { n: esc(name) })}</h3><p class="text-sm text-neutral-300">${esc(why)}</p></div>
        ${proPreview(feature)}${proActions()}${trasLaPrueba()}${proPrices()}
        <details class="nd-faq"><summary>${tr('Qué incluye PRO')}<i class="fa-solid fa-chevron-down chev"></i></summary><div class="px-3 pb-3">${proTable()}</div></details>
        <button type="button" onclick="closeSheet()" class="w-full py-2.5 text-sm font-bold text-neutral-400 hover:text-neutral-200">${tr('Seguir con la versión gratis')}</button>
    </div>`);
}
function afterProChange() { closeSheet(); renderDashboard(); renderDiary(); if (state.tab === 'coach') renderCoach(); if (state.tab === 'progress') renderProgress(); }
function startTrial() {
    const d = proData(); if (d.trialUsed) return;
    setProData({ ...d, trialUsed: 1, trialEnd: Date.now() + TRIAL_MS });
    track('pro_trial'); afterProChange(); celebrate('👑', 'PRO activado 7 días', 'Prueba todo sin límites');
}
function payPro() {
    track('pro_pay_click');
    if (PAY_LINK) { window.open(PAY_LINK, '_blank', 'noopener'); toast('Tras pagar recibirás tu código de activación'); return; }
    toast('Escríbeme a aannggeelltrabajos@gmail.com y te paso el código');
}
async function redeemCode() {
    const raw = ($('pro-code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const code = raw.length === 15 && raw.startsWith('NDL') ? `NDL-${raw.slice(3, 7)}-${raw.slice(7, 11)}-${raw.slice(11, 15)}` : '';
    if (!code) { toast('Revisa el código: NDL-XXXX-XXXX-XXXX'); return; }
    let h = '';
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nutridl|' + code)); h = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32); } catch (e) { toast('Tu navegador no puede comprobar el código'); return; }
    if (!PRO_CODES.includes(h)) { toast('Ese código no es válido'); track('pro_code_bad'); return; }
    setProData({ ...proData(), code: h, codeDate: todayISO() });
    track('pro_code_ok'); afterProChange(); celebrate('👑', 'FitDL PRO activado', 'Es tuyo para siempre. Gracias por apoyar FitDL');
}
function renderLandingPro() {
    const box = $('landing-pro'); if (!box || box.dataset.done === LANG) return;
    box.dataset.done = LANG; // se vuelve a pintar si cambia el idioma
    box.innerHTML = `<div class="grid lg:grid-cols-2 gap-8 items-start">
        <div class="space-y-4"><span class="nd-eyebrow">${tr('Gratis y PRO')}</span><h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-50">${tr('Lo importante, gratis. Siempre.')}</h2>
            <p class="text-neutral-300">${tr('Calcula tu plan, apunta tus comidas, sigue tu progreso y usa el Coach sin pagar. PRO añade voz, calculadora de plato, «Mi nevera», menú del día, compra inteligente y análisis avanzado. <b class="text-neutral-100">Pruébalo 7 días gratis, sin tarjeta.</b>')}</p>${proPrices()}</div>
        ${proTable()}
    </div>`;
}
