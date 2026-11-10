// FitDL · Diario de comidas, escáner y comidas guardadas
'use strict';

// =====================================================================
//  ESCÁNER DE CÓDIGO DE BARRAS (cámara + Open Food Facts en vivo)
//  Solo se envía el número del código a openfoodfacts.org; el producto se guarda en "Mis alimentos"
// =====================================================================
let scan = null;
function stopScan() {
    if (!scan) return;
    scan.stop = true;
    if (scan.luz && scan.pista) { try { scan.pista.applyConstraints({ advanced: [{ torch: false }] }); } catch (e) { } }
    if (scan.stream) scan.stream.getTracks().forEach(t => t.stop());
    scan = null;
}
// Linterna: muchos códigos están en estanterías oscuras o en envases brillantes
function scanLuz() {
    if (!scan || !scan.pista) return;
    scan.luz = !scan.luz;
    try { scan.pista.applyConstraints({ advanced: [{ torch: scan.luz }] }); } catch (e) { scan.luz = false; }
    const b = $('sc-luz'); if (b) b.classList.toggle('text-mint-400', scan.luz);
}
// Formatos que sepa leer este navegador (los pocos que no, los lee el lector propio de js/barras.js)
async function scanFormatos() {
    if (typeof BarcodeDetector !== 'function') return [];
    try {
        const sop = await BarcodeDetector.getSupportedFormats();
        return BARRAS_FORMATOS.filter(f => sop.includes(f));
    } catch (e) { return ['ean_13', 'ean_8', 'upc_a', 'upc_e']; }
}
// Lee el fotograma con el lector propio (funciona en iPhone, Firefox y en cualquier navegador viejo)
function scanPropio(v) {
    if (!scan.lienzo) { scan.lienzo = document.createElement('canvas'); scan.ctx = scan.lienzo.getContext('2d', { willReadFrequently: true }); }
    const w = 480, h = Math.round((v.videoHeight || 480) * w / (v.videoWidth || 640)) || 360;
    const c = scan.lienzo; c.width = w; c.height = h;
    scan.ctx.drawImage(v, 0, 0, w, h);
    const d = scan.ctx.getImageData(0, 0, w, h).data, gris = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < gris.length; j++, i += 4) gris[j] = (d[i] * 77 + d[i + 1] * 151 + d[i + 2] * 28) >> 8;
    return barrasLeerGris(gris, w, h, 22);
}
async function openScanner(slot) {
    const canCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    openSheet('<i class="fa-solid fa-barcode text-mint-400"></i> ' + tr('Escanear producto'), `
        <div class="space-y-4">
            ${canCam ? `<div class="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                <video id="sc-video" class="w-full h-full object-cover" playsinline muted></video>
                <div class="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 rounded-2xl border-2 border-mint-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]"></div>
                <button type="button" id="sc-luz" ${ND.on(scanLuz)} class="hidden absolute top-3 right-3 w-10 h-10 rounded-xl bg-black/60 text-white/90" aria-label="${tr('Linterna')}"><i class="fa-solid fa-bolt"></i></button>
                <div id="sc-status" class="absolute bottom-3 inset-x-3 text-center text-xs font-bold text-white/90">${tr('Apunta al código de barras')}</div>
            </div>` : `<div class="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-800 text-sm text-neutral-300"><i class="fa-solid fa-camera text-mint-400"></i> ${tr('Este navegador no puede usar la cámara. Escribe los números que hay debajo de las barras.')}</div>`}
            <form ${ND.onsubmit(() => lookupBarcode($('sc-code').value))} class="flex gap-2">
                <input id="sc-code" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="${tr('Ej: {x}', { x: '8480000123459' })}" class="flex-1 min-w-0 p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold tracking-wider" aria-label="${tr('Número del código de barras')}">
                <button class="px-4 rounded-xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold text-sm">${tr('Buscar')}</button>
            </form>
            <div id="sc-result"></div>
            <p class="text-[11px] text-neutral-500">${tr('Lee los códigos de cualquier país (EAN-13, EAN-8 y UPC). Datos de Open Food Facts (licencia ODbL): comprueba siempre la etiqueta.')}</p>
        </div>`, stopScan);
    cargarMarcas();   // el escáner los necesita para reconocer el producto sin internet
    scan = { slot: slot || (fs && fs.slot) || slotByHour(), stop: false };
    track('scan_open');
    if (!canCam) return;
    try {
        // Se pide la cámara de atrás y la mayor resolución razonable: los códigos pequeños necesitan detalle
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!scan || scan.stop) { stream.getTracks().forEach(t => t.stop()); return; }
        scan.stream = stream;
        scan.pista = stream.getVideoTracks()[0];
        const v = $('sc-video'); v.srcObject = stream; await v.play();
        // Enfoque continuo y linterna, si la cámara los tiene
        try {
            const cap = scan.pista.getCapabilities ? scan.pista.getCapabilities() : {};
            if (cap.focusMode && cap.focusMode.includes('continuous')) await scan.pista.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            if (cap.torch) { const b = $('sc-luz'); if (b) b.classList.remove('hidden'); }
        } catch (e) { }
        const formatos = await scanFormatos();
        const det = formatos.length ? new BarcodeDetector({ formats: formatos }) : null;
        const st = $('sc-status');
        if (st && !det) st.textContent = tr('Apunta al código de barras');
        let vueltas = 0;
        const encontrado = c => {
            if (navigator.vibrate) navigator.vibrate(30);
            const i = $('sc-code'); if (i) i.value = c;
            lookupBarcode(c);
        };
        const loop = async () => {
            if (!scan || scan.stop) return;
            vueltas++;
            try {
                if (det) {
                    const codes = await det.detect(v);
                    // Algunos códigos (QR de la caja, GS1-128) traen el número dentro: se saca igual
                    for (const k of codes) {
                        const n = String(k.rawValue || '').replace(/\D/g, '');
                        if (n.length >= 8) return encontrado(n.length > 14 ? n.slice(0, 14) : n);
                    }
                }
                // Lector propio: siempre que el navegador no tenga lector, y como refuerzo cada 3 vueltas
                if (!det || vueltas % 3 === 0) { const c = scanPropio(v); if (c) return encontrado(c); }
            } catch (e) { }
            if (st && vueltas === 24) st.textContent = tr('Acerca el móvil y que el código quede recto dentro del marco');
            setTimeout(loop, det ? 250 : 160);
        };
        loop();
    } catch (e) {
        const st = $('sc-status'); if (st) st.textContent = tr('Sin permiso para la cámara: escribe el código abajo');
    }
}
// Consultas a Open Food Facts con freno: como mucho 20 por minuto, una a la vez, 8 s de espera máxima
// y memoria de los códigos ya buscados en esta sesión (no se repite la misma consulta)
const OFF_LIMIT = { per: 60000, max: 20, log: [], busy: false, seen: new Map() };
async function offProduct(code) {
    if (OFF_LIMIT.seen.has(code)) return OFF_LIMIT.seen.get(code);
    const now = Date.now();
    OFF_LIMIT.log = OFF_LIMIT.log.filter(t => now - t < OFF_LIMIT.per);
    if (OFF_LIMIT.busy || OFF_LIMIT.log.length >= OFF_LIMIT.max) { const e = new Error('limite'); e.limit = true; throw e; }
    OFF_LIMIT.busy = true; OFF_LIMIT.log.push(now);
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), 8000);
    try {
        const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_es,product_name_en,brands,nutriments,nutrition_data_per,serving_quantity,quantity`, ctl ? { signal: ctl.signal } : {});
        if (r.status === 404) { OFF_LIMIT.seen.set(code, null); return null; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        const p = (j && j.product) || null;
        OFF_LIMIT.seen.set(code, p);
        return p;
    } finally { OFF_LIMIT.busy = false; if (timer) clearTimeout(timer); }
}
// El mismo producto puede estar guardado con el código de otra forma (UPC de 12, cero delante, caja de 14):
// se prueban todas hasta que una responde. Así sale sea de donde sea el producto.
async function offBuscar(code) {
    let ultimo = null;
    for (const v of barrasVariantes(code)) {
        const p = await offProduct(v);
        if (p && (p.product_name || p.product_name_es || p.nutriments)) return { p, code: v };
        if (p) ultimo = { p, code: v };
    }
    return ultimo;
}
// Los valores de la etiqueta por 100 g. Si la etiqueta solo trae la ración, se pasa a 100 g;
// si no trae kcal, se calculan con los macros (4·P + 4·HC + 9·G). Devuelve null si no hay nada.
function offMacros(p) {
    const n = (p && p.nutriments) || {};
    const num = v => (v != null && v !== '' && isFinite(+v) ? +v : null);
    const juego = suf => {
        const kj = num(n['energy-kj' + suf]) != null ? num(n['energy-kj' + suf]) : num(n['energy' + suf]);
        const k = num(n['energy-kcal' + suf]);
        return { kcal: k != null ? k : (kj != null ? kj / 4.184 : null), p: num(n['proteins' + suf]), c: num(n['carbohydrates' + suf]), f: num(n['fat' + suf]), fib: num(n['fiber' + suf]), sug: num(n['sugars' + suf]) };
    };
    const algo = x => x.kcal != null || x.p != null || x.c != null || x.f != null;
    let m = juego('_100g'), escala = 1;
    if (!algo(m)) {
        const r = juego('_serving'), q = +p.serving_quantity;
        if (!algo(r) || !(q > 0 && q < 1000)) return null;
        m = r; escala = 100 / q;
    }
    const o = { kcal: m.kcal, p: m.p || 0, c: m.c || 0, f: m.f || 0, fib: m.fib || 0, sug: m.sug };
    for (const k of ['p', 'c', 'f', 'fib']) o[k] = o[k] * escala;
    if (o.sug != null) o.sug = o.sug * escala;
    o.kcal = o.kcal != null ? o.kcal * escala : 4 * o.p + 4 * o.c + 9 * o.f;
    return o;
}
async function lookupBarcode(raw) {
    const code = String(raw || '').replace(/\D/g, '').slice(0, 14);
    if (code.length < 8) { toast('Escribe un código de 8 a 14 números'); return; }
    if (scan) { scan.stop = true; if (scan.stream) scan.stream.getTracks().forEach(t => t.stop()); }
    const slot = (scan && scan.slot) || slotByHour();
    // Primero lo que ya hay en la app (4.500 alimentos y los tuyos): va al momento y sin internet
    const variantes = barrasVariantes(code);
    const local = FOODS.find(f => variantes.includes(String(f.off)) || variantes.includes(String(f.barcode)));
    if (local) return scanOpenFood(local, slot);
    const box = $('sc-result');
    if (!navigator.onLine) { box.innerHTML = '<p class="text-sm text-amber-200"><i class="fa-solid fa-wifi"></i> ' + tr('Sin conexión: no se puede buscar este producto ahora.') + '</p>'; return; }
    box.innerHTML = '<p class="text-sm text-neutral-400"><i class="fa-solid fa-circle-notch fa-spin"></i> ' + tr('Buscando el producto…') + '</p>';
    // Seguridad: lo que llega de Internet se guarda como texto limpio (sin < > " ' ` \), igual que las copias importadas
    const clean = v => String(v || '').replace(/[<>"'`\\]/g, '').trim();
    let nombreOff = '', marcaOff = '';
    try {
        const hit = await offBuscar(code);
        const p = hit && hit.p;
        nombreOff = p ? (clean(p.product_name_es) || clean(p.product_name) || clean(p.product_name_en)).slice(0, 60) : '';
        marcaOff = p ? clean(String(p.brands || '').split(',')[0]).slice(0, 30) : '';
        const m = p && offMacros(p);
        if (!m) throw new Error('sin datos'); // i18n-ignore (error interno)
        if (m.kcal < 0 || m.kcal > 950 || m.p + m.f + m.c > 101 || [m.kcal, m.p, m.f, m.c].some(v => !isFinite(v))) throw new Error('datos raros'); // i18n-ignore (error interno)
        const codeOk = hit.code;
        const name = (nombreOff || tr('Producto {c}', { c: codeOk })).slice(0, 60);
        const food = { id: 'b_' + codeOk, name, brand: marcaOff, cat: 'custom', role: m.p * 4 >= Math.max(m.c * 4, m.f * 9) ? 'protein' : m.f * 9 > m.c * 4 ? 'fat' : 'carb', meals: 'BSLD', p: round1(m.p), f: round1(m.f), c: round1(m.c), fib: round1(m.fib), kcal: Math.round(m.kcal), min: 0, max: 0, flags: '', custom: 1, barcode: codeOk, off: codeOk };
        if (m.sug != null && m.sug >= 0 && m.sug <= m.c + 0.5) food.sug = round1(m.sug);
        const sq = +p.serving_quantity; if (sq > 0 && sq < 1000) food.serv = [sq, tk('ración'), tk('raciones')];
        if (!FOODS.some(f => f.id === food.id)) { registerCustom(food); state.customFoods.push(food); save(); }
        track('scan_found');
        scanOpenFood(getFood(food.id), slot);
    } catch (e) {
        if (e && e.limit) { box.innerHTML = '<p class="text-sm text-amber-200"><i class="fa-solid fa-hourglass-half"></i> ' + tr('Has buscado muchos productos seguidos. Espera un minuto y vuelve a probar.') + '</p>'; return; }
        if (e && (e.name === 'AbortError' || /^HTTP|Failed to fetch|NetworkError/.test(e.message))) { logErr('Open Food Facts: ' + (e.name === 'AbortError' ? 'tiempo agotado' : e.message)); box.innerHTML = '<p class="text-sm text-amber-200"><i class="fa-solid fa-wifi"></i> ' + tr('El servicio de productos no responde ahora. Prueba en un momento o apúntalo con su etiqueta.') + '</p>'; return; }
        // No se ha quedado sin respuesta: el formulario sale con el código (y el nombre, si se sabe) ya puestos,
        // y al guardarlo el producto queda tuyo: la próxima vez que lo escanees sale solo, también sin internet.
        scanCrear(code, nombreOff, marcaOff, slot);
    }
}
// Crear el alimento con la etiqueta, ya con el código y el nombre que se hayan podido averiguar
function scanCrear(code, nombre, marca, slot) {
    const box = $('sc-result');
    if (box) box.innerHTML = `<div class="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-800 space-y-3 text-sm text-neutral-300">
        <p>${nombre ? tr('«{n}» está en el catálogo, pero sin la tabla nutricional.', { n: esc(nombre) }) : tr('Ese código ({c}) todavía no está en el catálogo mundial.', { c: esc(code) })}</p>
        <p class="text-xs text-neutral-400">${tr('Copia la etiqueta una vez y el producto queda guardado con su código: la próxima vez saldrá solo, incluso sin internet.')}</p>
        <button ${ND.on(() => scanNuevo(code, nombre || '', marca || '', slot))} class="w-full py-3 rounded-xl bg-mint-600 text-white font-extrabold"><i class="fa-solid fa-plus"></i> ${tr('Apuntarlo con su etiqueta')}</button></div>`;
}
function scanNuevo(code, nombre, marca, slot) {
    closeSheet();
    openFoodSheet(slot);
    fs.cfPre = { name: nombre || '', brand: marca || '', barcode: String(code).replace(/\D/g, '').slice(0, 14) };
    fs.mode = 'create'; fsRender();
}
// Los productos de marca se cargan los últimos (así la app abre antes). Cuando llegan, si había
// un buscador abierto se repite la búsqueda para que salgan también ellos.
function marcasListas() {
    try {
        const sheet = $('food-sheet');
        if (sheet && !sheet.classList.contains('hidden') && fs && (fs.mode === 'list' || fs.mode === 'quick')) fsRender();
    } catch (e) { }
}
function scanOpenFood(f, slot) { closeSheet(); openFoodSheet(slot); fsOpen(f.id); }

// =====================================================================
//  COMIDAS GUARDADAS ("mi desayuno de siempre")
// =====================================================================
const myMeals = () => (state.meals = Array.isArray(state.meals) ? state.meals : []);
function saveMealPrompt(slot) {
    const list = (state.diary[diaryDate || todayISO()] || []).filter(e => e.slot === slot);
    if (!list.length) return;
    const def = (DSLOTS.find(s => s[0] === slot) || [, tk('Comida')])[1];
    openSheet('<i class="fa-solid fa-bookmark text-mint-400"></i> ' + tr('Guardar comida'), `
        <form ${ND.onsubmit(() => saveMeal(slot))} class="space-y-4">
            <div class="space-y-1.5"><label for="sm-name" class="block text-xs font-bold text-neutral-300 uppercase tracking-wider">${tr('Nombre')}</label>
                <input id="sm-name" maxlength="40" value="${esc(tr('Mi {x}', { x: tr(def).toLowerCase() }))}" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold"></div>
            <div class="rounded-2xl bg-neutral-800/60 border border-neutral-800 divide-y divide-neutral-800 text-sm">${list.map(e => `<div class="flex justify-between gap-3 px-3 py-2"><span class="truncate">${esc(e.name)}</span><span class="text-neutral-400 whitespace-nowrap">${fmt(e.kcal)} kcal</span></div>`).join('')}</div>
            <button class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold">${tr('Guardar comida')}</button>
        </form>`);
    setTimeout(() => { const i = $('sm-name'); if (i) { i.focus(); i.select(); } }, 50);
}
function saveMeal(slot) {
    const name = ($('sm-name').value || '').trim().slice(0, 40); if (!name) { toast('Ponle un nombre'); return; }
    const items = (state.diary[diaryDate || todayISO()] || []).filter(e => e.slot === slot).map(({ id, slot: s, ...rest }) => rest);
    myMeals().push({ id: 'm' + Date.now().toString(36), name, items });
    save(); closeSheet(); toast(tr('«{n}» guardada en tus comidas', { n: name }));
}
function addSavedMeal(id) {
    const m = myMeals().find(x => x.id === id); if (!m) return;
    const ids = m.items.map(it => pushDiary({ ...it, slot: fs.slot }));
    save(); renderDiary(); renderDashboard(); closeFoodSheet(); track('food_logged'); checkDayMoments(); checkAchievements();
    toastUndo(tr('{n} añadida', { n: m.name }), () => { const d = diaryDate || todayISO(); state.diary[d] = (state.diary[d] || []).filter(e => !ids.includes(e.id)); save(); renderDiary(); renderDashboard(); });
}
async function delSavedMeal(id) {
    const m = myMeals().find(x => x.id === id); if (!m) return;
    if (!(await askConfirm(tr('¿Borrar la comida guardada «{n}»?', { n: m.name }), 'Borrar'))) return;
    state.meals = myMeals().filter(x => x.id !== id); save(); fsRender();
}
function savedMealsHtml() {
    const L = myMeals();
    if (!L.length) return '<p class="text-sm text-neutral-400 py-6 text-center">' + tr('Guarda una comida desde tu diario con el botón {i} y aparecerá aquí.', { i: '<i class="fa-solid fa-bookmark"></i>' }) + '</p>';
    return `<div class="divide-y divide-neutral-800">${L.map(m => { const k = m.items.reduce((a, e) => a + e.kcal, 0); return `<div class="flex items-center gap-2 py-2.5">
        <button type="button" ${ND.on(() => addSavedMeal(m.id))} class="flex-1 min-w-0 text-left"><div class="text-sm font-semibold text-neutral-100 truncate">${esc(m.name)}</div>
            <div class="text-xs text-neutral-400 truncate">${tp(m.items.length, 'alimento', 'alimentos')} · ${fmt(k)} kcal · ${esc(m.items.map(e => e.name).join(', '))}</div></button>
        <button type="button" ${ND.on(() => delSavedMeal(m.id))} class="w-9 h-9 shrink-0 rounded-lg text-neutral-500 hover:text-roseAccent-400" aria-label="${tr('Borrar {n}', { n: esc(m.name) })}"><i class="fa-solid fa-trash-can"></i></button>
        <button type="button" ${ND.on(() => addSavedMeal(m.id))} class="w-9 h-9 shrink-0 rounded-full bg-neutral-800 hover:bg-mint-600 text-mint-400 hover:text-white" aria-label="${tr('Añadir {n}', { n: esc(m.name) })}"><i class="fa-solid fa-plus"></i></button>
    </div>`; }).join('')}</div>`;
}

// =====================================================================
//  DIARIO DE COMIDAS
// =====================================================================
const DSLOTS = [['B', tk('Desayuno'), 'fa-mug-hot'], ['M', tk('Media mañana'), 'fa-sun'], ['L', tk('Comida'), 'fa-bowl-rice'], ['S', tk('Merienda'), 'fa-apple-whole'], ['D', tk('Cena'), 'fa-moon'], ['X', tk('Otros'), 'fa-cookie-bite']];
let diaryDate = null, diarySel = null;
function diaryTotals(d) {
    return (state.diary[d] || []).reduce((a, e) => { a.kcal += e.kcal || 0; a.p += e.p || 0; a.f += e.f || 0; a.c += e.c || 0; a.fib += e.fib || 0; if (e.sug != null) { a.sug += e.sug; a.sugN++; } return a; }, { kcal: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0, sugN: 0 });
}
function slotByHour() { const h = new Date().getHours(); return h < 11 ? 'B' : h < 13 ? 'M' : h < 16 ? 'L' : h < 19 ? 'S' : 'D'; }
function diaryShift(n) { const d = new Date((diaryDate || todayISO()) + 'T12:00:00'); d.setDate(d.getDate() + n); diaryDate = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); renderDiary(); }
function diaryGoToday() { diaryDate = todayISO(); renderDiary(); }
function renderDiary() {
    if (!$('diary-summary')) return;
    if (!diaryDate) diaryDate = todayISO();
    $('dia-date').value = diaryDate;
    const c = calc, t = diaryTotals(diaryDate), left = c.target - t.kcal;
    const isToday = diaryDate === todayISO();
    // El botón dice qué día estás viendo: «Hoy» resaltado, o «Volver a hoy» si estás en otro día
    const tb = $('dia-today');
    if (tb) {
        tb.innerHTML = isToday ? tr('Hoy') : '<i class="fa-solid fa-rotate-left"></i><span class="hidden sm:inline"> ' + tr('Volver a') + '</span> ' + tr('hoy');
        tb.className = 'px-3 h-10 shrink-0 rounded-xl text-xs font-bold whitespace-nowrap ' + (isToday ? 'bg-mint-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300');
        tb.setAttribute('aria-pressed', isToday); tb.setAttribute('aria-label', isToday ? tr('Estás viendo hoy') : tr('Volver a hoy'));
    }
    const dayRel = isToday ? tr('Hoy') : diaryDate === shiftISO(todayISO(), -1) ? tr('Ayer') : diaryDate === shiftISO(todayISO(), 1) ? tr('Mañana') : '';
    $('diary-summary').innerHTML = !c.target ? `<div class="md:col-span-12 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-800/60 border border-neutral-800">
            <div><div class="text-3xl font-extrabold text-neutral-100">${fmt(t.kcal)} <span class="text-sm text-neutral-400">kcal</span></div><div class="text-xs text-neutral-400">${tr('P')} ${fmt(t.p)} · ${tr('G')} ${fmt(t.f)} · ${tr('HC')} ${fmt(t.c)} g</div></div>
            <button ${ND.on(() => showTab('calc'))} class="px-4 py-2.5 rounded-xl bg-mint-600 text-white text-xs font-extrabold"><i class="fa-solid fa-calculator"></i> ${tr('Calcular mi objetivo')}</button></div>` : `
        <div class="md:col-span-3 flex flex-col items-center gap-1">${ring(t.kcal, c.target, 120)}
            <div class="text-xs font-bold ${left >= 0 ? 'text-ok-400' : 'text-roseAccent-400'}">${left >= 0 ? tr('Quedan {k} kcal', { k: fmt(left) }) : tr('+{k} kcal sobre tu objetivo', { k: fmt(-left) })}</div></div>
        <div class="md:col-span-9 space-y-3">
            <div class="text-xs text-neutral-400">${dayRel || new Date(diaryDate + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${tr('objetivo {k} kcal', { k: fmt(c.target) })} · ${tr('fibra {a} / {b} g', { a: fmt(t.fib), b: c.fiber })}${t.sugN ? ` · ${tr('azúcares {k} g', { k: fmt(t.sug) })}` : ''}</div>
            ${macroBar(tr('Proteína'), t.p, c.prot, '#a0714b')}${macroBar(tr('Grasa'), t.f, c.fat, '#f59e0b')}${macroBar(tr('Hidratos'), t.c, c.carbs, '#e6d3b3')}
        </div>`;
    // Todas las comidas siempre visibles, cada una con su «+ Añadir» (como FatSecret)
    const entries = state.diary[diaryDate] || [];
    const yest = state.diary[shiftISO(diaryDate, -1)] || [];
    const showM = (state.prefs && state.prefs.meals === 5) || entries.some(e => e.slot === 'M');
    $('diary-meals').innerHTML = DSLOTS.filter(([k]) => k !== 'M' || showM).map(([k, n, ic]) => {
        const list = entries.filter(e => e.slot === k);
        const tot = list.reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), f: a.f + (e.f || 0), c: a.c + (e.c || 0) }), { kcal: 0, p: 0, f: 0, c: 0 });
        const canCopy = !list.length && yest.some(e => e.slot === k);
        return `<div class="rounded-2xl bg-neutral-900 border border-neutral-800">
            <div class="flex items-center gap-3 p-3.5">
                <div class="w-9 h-9 shrink-0 rounded-xl bg-mint-500/15 text-mint-400 grid place-items-center"><i class="fa-solid ${ic}"></i></div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-extrabold text-neutral-100">${tr(n)}</div>
                    <div class="text-xs text-neutral-400">${list.length ? `${fmt(tot.kcal)} kcal · ${tr('P')} ${fmt(tot.p)} · ${tr('G')} ${fmt(tot.f)} · ${tr('HC')} ${fmt(tot.c)}` : tr('Sin apuntar')}</div>
                </div>
                ${list.length ? `<button type="button" ${ND.on(() => saveMealPrompt(k))} class="w-9 h-9 shrink-0 rounded-xl text-neutral-400 hover:text-mint-300 hover:bg-neutral-800" aria-label="${tr('Guardar {x} como comida', { x: tr(n).toLowerCase() })}" title="${tr('Guardar esta comida para repetirla')}"><i class="fa-solid fa-bookmark"></i></button>` : ''}
                ${canCopy ? `<button type="button" ${ND.on(() => copyMealFromYesterday(k))} class="px-2.5 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-800" title="${tr('Copiar lo que comiste ayer en {x}', { x: tr(n).toLowerCase() })}"><i class="fa-regular fa-copy"></i> ${tr('Ayer')}</button>` : ''}
                <button type="button" ${ND.on(() => openFoodSheet(k))} class="px-3 py-2 rounded-xl bg-mint-600 hover:bg-mint-700 text-white text-xs font-extrabold shrink-0" aria-label="${tr('Añadir alimento a {x}', { x: tr(n) })}"><i class="fa-solid fa-plus"></i> ${tr('Añadir')}</button>
            </div>
            ${list.length ? `<div class="border-t border-neutral-800 divide-y divide-neutral-800/70">${list.map(e => {
                const f = e.fid && getFood(e.fid);
                return `<div class="flex items-center gap-2 px-3.5 py-2.5" data-entry="${e.id}">
                    <button type="button" ${ND.on(() => editDiaryEntry(e.id))} class="flex-1 min-w-0 text-left" aria-label="${tr('Editar {n}', { n: esc(e.name) })}">
                        <div class="text-sm font-semibold text-neutral-100 break-words leading-snug">${f ? emo(f) + ' ' : ''}${esc(e.name)}</div>
                        <div class="text-xs text-neutral-400">${e.brand ? esc(e.brand) + ' · ' : ''}${e.g ? entryAmount(e) : tr('Solo calorías')}${e.est ? ' · <span class="nd-est">' + tr('≈ estimado') + '</span>' : ''}</div>
                        <div class="text-[11px] text-neutral-400 tabular-nums flex flex-wrap gap-x-2.5 mt-0.5">${macroLine(e.p, e.c, e.f)}${e.sug != null ? `<span class="nd-m">${tr('azúc.')} ${fmt(e.sug, e.sug < 10 ? 1 : 0)}</span>` : ''}</div>
                    </button>
                    <span class="text-sm font-extrabold text-neutral-100 shrink-0">${fmt(e.kcal)}<span class="text-xs font-semibold text-neutral-500"> kcal</span></span>
                    <button type="button" ${ND.on(() => diaryDel(e.id))} class="w-8 h-8 shrink-0 rounded-lg text-neutral-500 hover:text-roseAccent-600 hover:bg-neutral-800" aria-label="${tr('Quitar {n}', { n: esc(e.name) })}"><i class="fa-solid fa-xmark"></i></button>
                </div>`;
            }).join('')}</div>` : ''}
        </div>`;
    }).join('');
}
const shiftISO = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
// "2 huevos (110 g)", "1 ración (80 g)", "150 g"
function entryAmount(e) {
    const unit = e.ml ? 'ml' : 'g';
    if (e.u && e.n) return `${fmt(e.n, e.n % 1 ? 1 : 0)} ${tr(e.n === 1 ? e.u : (e.up || e.u))} (${fmt(e.g)} ${unit})`;
    return `${fmt(e.g)} ${unit}`;
}
function copyMealFromYesterday(slot) {
    const prev = (state.diary[shiftISO(diaryDate, -1)] || []).filter(e => e.slot === slot);
    if (!prev.length) return;
    prev.forEach(e => { const { id, ...rest } = e; pushDiary(rest); });
    save(); renderDiary(); renderDashboard(); track('food_logged'); checkDayMoments(); checkAchievements();
    toast(tr('Copiado de ayer: {x}', { x: tp(prev.length, 'alimento', 'alimentos') }));
}

// ---------- Hoja de búsqueda y registro ----------
const fs = { slot: 'B', tab: 'recent', q: '', mode: 'list', food: null, editId: null };
// Sinónimos y escrituras frecuentes, para que la búsqueda encuentre lo que la gente escribe
const SYN = { espagueti: 'spaghetti', espaguetis: 'spaghetti', spagetti: 'spaghetti', macarron: 'macarrones', yogurt: 'yogur', yoghurt: 'yogur', cacahuate: 'cacahuete', mani: 'cacahuete', whey: 'whey', proteina: 'prote', proteinas: 'prote', hacendao: 'hacendado', mercadona: 'hacendado', cocacola: 'coca', 'coca-cola': 'coca', jamon: 'jamon', atun: 'atun' };
// Palabras de Colombia y Latinoamérica para nombres escritos como en España («papa» encuentra «Patata cocida»)
const REGION_WORDS = [
    [/\bpatata/, 'papa papas'], [/\bzumo/, 'jugo'], [/\balubia/, 'frijol frijoles'], [/\bjudias? verdes?/, 'habichuela habichuelas'],
    [/\bguisante/, 'arveja arvejas'], [/\bcalabaza/, 'ahuyama'], [/\brefresco/, 'gaseosa'], [/\bmelocoton/, 'durazno'],
    [/\bternera|\bvacuno/, 'carne res'], [/\btarta\b/, 'torta'], [/\bbizcocho/, 'ponque'], [/^cafe solo/, 'tinto'], [/^dulce de leche/, 'arequipe'],
    [/\bpimiento/, 'pimenton'], [/^carne picada vacuno/, 'molida'], [/\bgambas?\b|\blangostino/, 'camaron camarones'], [/\bpan de molde/, 'pan tajado'], [/^huevos revueltos/, 'pericos'],
    [/^platano(?!.*(macho|verde|maduro|patacon|frit|chips|cocido|asado))/, 'banano banana'],
];
const foodText = f => {
    const t = norm(`${f.name} ${f.brand || ''} ${f.alias || ''}`);
    return f.brand ? t : REGION_WORDS.reduce((s, [re, w]) => re.test(t) ? s + ' ' + w : s, t);
};
function searchFoods(q) {
    const toks = norm(q).split(/\s+/).filter(Boolean).map(t => SYN[t] || t);
    if (!toks.length) return [];
    const freq = foodFreq();
    return FOODS.map(f => {
        const txt = foodText(f), words = txt.split(/[^a-z0-9ñ%+]+/);
        let score = 0;
        for (const t of toks) {
            // «cocidas» encuentra «cocido», «patatas» encuentra «patata»: se prueba también sin la terminación de género/número
            const stem = t.length >= 5 ? t.replace(/(as|os|es|a|o|s)$/, '') : null;
            if (words.some(w => w.startsWith(t))) score += 3;
            else if (stem && words.some(w => w.startsWith(stem))) score += 2;
            else if (txt.includes(t)) score += 1;
            else return null;
        }
        if (norm(f.name).startsWith(toks[0])) score += 2;
        score += Math.min(4, (freq[f.id] || 0));
        return { f, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.f.name.length - b.f.name.length).slice(0, 60).map(x => x.f);
}
function foodFreq() {
    const c = {};
    Object.values(state.diary).forEach(list => list.forEach(e => { if (e.fid) c[e.fid] = (c[e.fid] || 0) + 1; }));
    return c;
}
function recentFoods() {
    const seen = new Set(), out = [];
    Object.keys(state.diary).sort().reverse().forEach(d => (state.diary[d] || []).slice().reverse().forEach(e => {
        if (e.fid && !seen.has(e.fid) && getFood(e.fid)) { seen.add(e.fid); out.push(getFood(e.fid)); }
    }));
    return out.slice(0, 40);
}
// Raciones de un alimento: gramos siempre, y su unidad/ración habitual si la tiene
function unitsOf(f) {
    const g = f.ml ? 'ml' : 'g', out = [{ key: 'g', label: g, plural: g, g: 1 }];
    if (f.serv) out.push({ key: 's', label: f.serv[1], plural: f.serv[2] || f.serv[1], g: f.serv[0] });
    if (f.u && !(f.serv && f.serv[0] === f.u[0] && f.serv[1] === f.u[1])) out.push({ key: 'u', label: f.u[1], plural: f.u[2], g: f.u[0] });
    if (f.fixed && !f.u && !f.serv) out.push({ key: 'r', label: tk('ración'), plural: tk('raciones'), g: f.fixed });
    return out;
}
const defUnit = f => unitsOf(f).find(u => u.key !== 'g') || null;
function defaultPortion(f) { const u = defUnit(f); return u ? { unit: u, n: 1, g: u.g } : { unit: unitsOf(f)[0], n: 100, g: 100 }; }
const portionLabel = (u, n, f) => u.key === 'g' ? `${fmt(n)} ${u.label}` : `${fmt(n, n % 1 ? 1 : 0)} ${tr(n === 1 ? u.label : u.plural)} (${fmt(u.g * n)} ${f && f.ml ? 'ml' : 'g'})`;

function openFoodSheet(slot) {
    cargarMarcas();   // por si aún no habían llegado los productos de marca
    fs.slot = slot || slotByHour(); fs.mode = 'list'; fs.food = null; fs.editId = null; fs.cfEdit = null; fs.cfPre = null; fs.q = '';
    fs.tab = recentFoods().length ? 'recent' : 'all';
    $('fs-slot').innerHTML = DSLOTS.map(([k, n]) => `<option value="${k}">${tr(n)}</option>`).join('');
    $('fs-q').value = '';
    $('food-sheet').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    fsRender();
    setTimeout(() => { if (!$('food-sheet').classList.contains('hidden')) $('fs-q').focus(); }, 60);
}
// Enlace desde las páginas «Calorías de…» (?alimento=id): abre ese alimento listo para apuntar.
// Sin perfil, se guarda y se abre al terminar de crearlo (ver closeWizard).
const FOOD_LINK_KEY = 'nd_food_link';
function openFoodFromLink(id) {
    if (!getFood(id)) return;
    if (!profiles.current) {
        try { sessionStorage.setItem(FOOD_LINK_KEY, id); } catch (e) { }
        toast(tr('Crea tu perfil (2 minutos) y te abro «{n}» para apuntarlo', { n: getFood(id).name })); return;
    }
    showTab('food'); openFoodSheet(); fsOpen(id); track('food_link');
}
function pendingFoodLink() {
    let id = null; try { id = sessionStorage.getItem(FOOD_LINK_KEY); sessionStorage.removeItem(FOOD_LINK_KEY); } catch (e) { }
    if (id && profiles.current) setTimeout(() => openFoodFromLink(id), 350);
}
function closeFoodSheet() { $('food-sheet').classList.add('hidden'); document.body.style.overflow = ''; }
function fsBack() { fs.mode = 'list'; fs.food = null; fs.editId = null; fs.cfEdit = null; fs.cfPre = null; fsRender(); setTimeout(() => { if (!$('food-sheet').classList.contains('hidden')) $('fs-q').focus(); }, 30); }
function fsRenderTitle() {
    const n = (DSLOTS.find(s => s[0] === fs.slot) || [])[1] || '';
    $('fs-title').innerText = fs.editId ? tr('Editar en') : fs.mode === 'create' ? tr(fs.cfEdit ? 'Editar alimento' : 'Crear alimento') : fs.mode === 'quick' ? tr('Solo calorías en') : tr('Añadir a');
    $('fs-slot').value = fs.slot;
    const btn = $('fs-detail-add'); if (btn && !fs.editId) btn.innerHTML = `<i class="fa-solid fa-plus"></i> ${tr('Añadir a {x}', { x: tr(n).toLowerCase() })}`;
}
function fsRender() {
    const list = fs.mode === 'list';
    $('fs-back').classList.toggle('hidden', list);
    $('fs-searchbar').classList.toggle('hidden', !list);
    $('fs-tabs').classList.toggle('hidden', !list || !!fs.q.trim());
    fsRenderTitle();
    if (fs.mode === 'detail') return fsRenderDetail();
    if (fs.mode === 'create') return fsRenderCreate();
    if (fs.mode === 'quick') return fsRenderQuick();
    const mine = FOODS.filter(f => f.custom);
    const tabs = [['recent', tk('Recientes')], ['freq', tk('Frecuentes')], ['meals', tk('Comidas guardadas')], ['all', tk('Todos')], ...(mine.length ? [['mine', tk('Mis alimentos')]] : [])];
    $('fs-tabs').innerHTML = tabs.map(([k, l]) => `<button type="button" ${ND.on(() => { fs.tab = k; fsRender(); })} class="px-3 py-1.5 rounded-xl border ${fs.tab === k ? 'bg-mint-600 text-white border-mint-600' : 'bg-neutral-800/60 text-neutral-300 border-neutral-700'}">${tr(l)}</button>`).join('');
    let items, empty;
    const q = fs.q.trim();
    if (q) { items = searchFoods(q); empty = tr('No hay resultados para «{q}».', { q: esc(q) }); }
    else if (fs.tab === 'recent') { items = recentFoods(); empty = tr('Aún no has apuntado nada. Busca arriba con la lupa.'); }
    else if (fs.tab === 'freq') { const fr = foodFreq(); items = Object.keys(fr).sort((a, b) => fr[b] - fr[a]).map(getFood).filter(Boolean).slice(0, 40); empty = tr('Aquí saldrá lo que más apuntas.'); }
    else if (fs.tab === 'mine') { items = mine; empty = tr('Aún no has creado alimentos.'); }
    else { items = FOODS.filter(f => f.brand).concat(FOODS.filter(f => !f.brand)).slice(0, 80); empty = ''; }
    const row = f => {
        const d = defaultPortion(f), kc = macrosOf(f, d.g).kcal;
        return `<div class="flex items-center gap-2 py-2.5">
            <button type="button" ${ND.on(() => fsOpen(f.id))} class="flex-1 min-w-0 text-left">
                <div class="text-sm font-semibold text-neutral-100 break-words leading-snug">${emo(f)} ${esc(f.name)}</div>
                <div class="text-xs text-neutral-400">${f.brand ? `<span class="text-mint-300/90">${esc(f.brand)}</span> · ` : ''}${portionLabel(d.unit, d.n, f)} · ${fmt(kc)} kcal</div>
            </button>
            <button type="button" ${ND.on(() => fsQuickAdd(f.id))} class="w-9 h-9 shrink-0 rounded-full bg-neutral-800 hover:bg-mint-600 text-mint-400 hover:text-white" aria-label="${tr('Añadir {n}', { n: `${esc(f.name)} (${portionLabel(d.unit, d.n, f)})` })}"><i class="fa-solid fa-plus"></i></button>
        </div>`;
    };
    const scanBtn = `<button type="button" ${ND.on(() => openScanner(fs.slot))} class="py-3 rounded-xl border border-dashed border-neutral-700 text-sm font-bold text-neutral-300 hover:border-mint-500/50"><i class="fa-solid fa-barcode text-mint-400"></i> ${tr('Escanear código de barras')}</button>`;
    if (!q && fs.tab === 'meals') { $('fs-body').innerHTML = savedMealsHtml(); $('fs-body').scrollTop = 0; return; }
    $('fs-body').innerHTML = (items.length ? `<div class="divide-y divide-neutral-800">${items.map(row).join('')}</div>` : `<p class="text-sm text-neutral-400 py-6 text-center">${empty}</p>`) +
        `<div class="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${scanBtn}
            <button type="button" ${ND.on(() => { fs.mode = 'create'; fsRender(); })} class="py-3 rounded-xl border border-dashed border-neutral-700 text-sm font-bold text-neutral-300 hover:border-mint-500/50"><i class="fa-solid fa-plus text-mint-400"></i> ${tr('Crear alimento')}</button>
            <button type="button" ${ND.on(() => { fs.mode = 'quick'; fsRender(); })} class="py-3 rounded-xl border border-dashed border-neutral-700 text-sm font-bold text-neutral-300 hover:border-mint-500/50"><i class="fa-solid fa-bolt text-mint-400"></i> ${tr('Apuntar solo calorías')}</button>
        </div>
        ${FOODS.some(f => f.off) ? '<p class="mt-3 text-[11px] text-neutral-500">' + tr('Alimentos genéricos y platos: USDA FoodData Central (dominio público) y, para Colombia, la Tabla de Composición de Alimentos Colombianos del ICBF (2018). Productos de marca: Open Food Facts (openfoodfacts.org), licencia ODbL. Comida rápida: información nutricional oficial de cada cadena en España. Comprueba la etiqueta: las recetas cambian.') + '</p>' : ''}`;
    $('fs-body').scrollTop = 0;
}
function fsQuickAdd(id) {
    const f = getFood(id); if (!f) return;
    const d = defaultPortion(f);
    const newId = logFood(f, d.unit, d.n, fs.slot);
    const n = (DSLOTS.find(s => s[0] === fs.slot) || [])[1] || '';
    toast(`✓ ${f.name} → ${tr(n).toLowerCase()}`);
    animDiaryRow(newId);
}
function logFood(f, unit, n, slot, replaceId) {
    const g = Math.round(unit.g * n * 10) / 10, m = macrosOf(f, g);
    const entry = { slot, fid: f.id, name: f.name, brand: f.brand || '', g, ml: !!f.ml, kcal: Math.round(m.kcal), p: round1(m.p), f: round1(m.f), c: round1(m.c), fib: round1(m.fib) };
    if (m.sug != null) entry.sug = round1(m.sug);
    if (unit.key !== 'g') Object.assign(entry, { u: unit.label, up: unit.plural, n });
    let id;
    if (replaceId) {
        const d = diaryDate || todayISO(), list = state.diary[d] || [], i = list.findIndex(e => e.id === replaceId);
        if (i >= 0) { list[i] = { id: replaceId, ...entry }; id = replaceId; }
    }
    if (!id) { id = pushDiary(entry); track('food_logged'); }
    save(); renderDiary(); renderDashboard(); checkDayMoments(); checkAchievements();
    return id;
}
function fsOpen(id, editId) {
    const f = getFood(id); if (!f) return;
    fs.food = f; fs.mode = 'detail'; fs.editId = editId || null;
    const d = defaultPortion(f);
    fs.unit = d.unit.key; fs.n = d.n;
    if (editId) {
        const e = (state.diary[diaryDate || todayISO()] || []).find(x => x.id === editId);
        if (e) { fs.slot = e.slot; const u = e.u && unitsOf(f).find(x => x.label === e.u); if (u) { fs.unit = u.key; fs.n = e.n; } else { fs.unit = 'g'; fs.n = e.g; } }
    }
    fsRender();
}
function fsRenderDetail() {
    const f = fs.food, units = unitsOf(f), u = units.find(x => x.key === fs.unit) || units[0];
    const k = kcal100(f) || 1;
    $('fs-body').innerHTML = `<div class="space-y-5">
        <div>
            <div class="text-xl font-extrabold text-neutral-100 leading-tight">${emo(f)} ${esc(f.name)}</div>
            ${f.brand ? `<div class="text-sm font-semibold text-mint-300/90">${esc(f.brand)}</div>` : ''}
            <div class="text-xs text-neutral-400 mt-1">${tr('Por 100 {u}:', { u: f.ml ? 'ml' : 'g' })} ${fmt(k)} kcal · ${tr('P')} ${fmt(f.p, 1)} · ${tr('G')} ${fmt(f.f, 1)} · ${tr('HC')} ${fmt(f.c, 1)}${f.sug != null ? ` ${tr('(azúcares {k})', { k: fmt(f.sug, 1) })}` : ''}${f.raw ? ' · ' + tr('peso en crudo') : ''}</div>
        </div>
        <div class="grid grid-cols-5 gap-2">
            <label class="col-span-2 block"><span class="text-xs font-bold text-neutral-400">${tr('Cantidad')}</span>
                <input id="fs-n" type="number" inputmode="decimal" min="0" step="${u.key === 'g' ? 1 : 0.5}" value="${fs.n}" ${ND.oninput(e => { fs.n = e.target.value; fsUpdateDetail(); })} class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-extrabold"></label>
            <label class="col-span-3 block"><span class="text-xs font-bold text-neutral-400">${tr('Medida')}</span>
                <select id="fs-unit" ${ND.onchange(e => fsSetUnit(e.target.value))} class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold">${units.map(x => `<option value="${x.key}" ${x.key === u.key ? 'selected' : ''}>${x.key === 'g' ? x.label : `${tr(x.label)} (${fmt(x.g)} ${f.ml ? 'ml' : 'g'})`}</option>`).join('')}</select></label>
        </div>
        <div id="fs-macros" class="grid grid-cols-4 gap-2 text-center"></div>
        <div class="grid ${fs.editId ? 'grid-cols-3' : 'grid-cols-1'} gap-2">
            ${fs.editId ? `<button type="button" ${ND.on(() => { const id = fs.editId; closeFoodSheet(); diaryDel(id); })} class="py-3.5 rounded-2xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"><i class="fa-solid fa-trash"></i> ${tr('Quitar')}</button>` : ''}
            ${fs.editId ? `<button type="button" ${ND.on(() => { const id = fs.editId; closeFoodSheet(); dupEntry(id); })} class="py-3.5 rounded-2xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"><i class="fa-regular fa-copy"></i> ${tr('Duplicar')}</button>` : ''}
            <button id="fs-detail-add" type="button" ${ND.on(fsConfirm)} class="py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold">${fs.editId ? '<i class="fa-solid fa-check"></i> ' + tr('Guardar cambios') : ''}</button>
        </div>
        ${fs.editId || f.custom ? `<div class="flex flex-wrap gap-2 pt-1">
            ${fs.editId ? `<button type="button" ${ND.on(() => { fs.mode = 'quick'; fsRender(); })} class="nd-mbtn flex-1"><i class="fa-solid fa-pen"></i> ${tr('Cambiar nombre o macros')}</button>` : ''}
            ${f.custom ? `<button type="button" ${ND.on(() => fsEditCustom(f.id))} class="nd-mbtn flex-1"><i class="fa-solid fa-pen-to-square"></i> ${tr('Editar mi alimento')}</button>
            <button type="button" ${ND.on(() => delCustomFood(f.id))} class="nd-mbtn flex-1"><i class="fa-solid fa-trash-can"></i> ${tr('Borrar mi alimento')}</button>` : ''}
        </div>` : ''}
    </div>`;
    fsRenderTitle(); fsUpdateDetail();
}
function fsSetUnit(key) {
    const units = unitsOf(fs.food), from = units.find(x => x.key === fs.unit), to = units.find(x => x.key === key);
    const grams = from.g * (num(fs.n) || 0);
    fs.unit = key; fs.n = key === 'g' ? Math.round(grams) || 100 : Math.max(0.5, Math.round(grams / to.g * 2) / 2) || 1;
    $('fs-n').value = fs.n; $('fs-n').step = key === 'g' ? 1 : 0.5;
    fsUpdateDetail();
}
function fsUpdateDetail() {
    const f = fs.food, u = unitsOf(f).find(x => x.key === fs.unit), g = u.g * (num(fs.n) || 0), m = macrosOf(f, g);
    const box = (l, v, unit, col) => `<div class="p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-800"><div class="text-[11px] font-bold text-neutral-400">${l}</div><div class="text-lg font-extrabold" style="color:${col}">${fmt(v, v < 10 && v % 1 ? 1 : 0)}<span class="text-xs text-neutral-400 font-semibold">${unit}</span></div></div>`;
    $('fs-macros').innerHTML = box('Kcal', m.kcal, '', '#f2ede6') + box(tr('Proteína'), m.p, ' g', '#c49a6c') + box(tr('Grasa'), m.f, ' g', '#f59e0b') + box(tr('Hidratos'), m.c, ' g', '#e6d3b3')
        + (m.sug != null ? `<div class="col-span-4 text-xs text-neutral-400 text-right -mt-1">${tr('de los cuales azúcares')} <b class="text-neutral-200">${fmt(m.sug, m.sug < 10 ? 1 : 0)} g</b></div>` : '');
}
function fsConfirm() {
    const f = fs.food, u = unitsOf(f).find(x => x.key === fs.unit), n = num(fs.n);
    if (!n || n <= 0 || u.g * n > 5000) { toast('Indica una cantidad válida'); $('fs-n').focus(); return; }
    const editing = fs.editId;
    const id = logFood(f, u, n, fs.slot, editing);
    closeFoodSheet(); animDiaryRow(id);
    toast(editing ? 'Cambios guardados' : tr('✓ Apuntado: {n}', { n: f.name }));
}
function editDiaryEntry(id) {
    const e = (state.diary[diaryDate || todayISO()] || []).find(x => x.id === id); if (!e) return;
    openFoodSheet(e.slot);
    if (e.fid && getFood(e.fid)) fsOpen(e.fid, id);
    else { fs.mode = 'quick'; fs.editId = id; fsRender(); }
}
// Apuntar solo calorías (comida fuera de casa, algo que no está en la base…)
function fsRenderQuick() {
    const e = fs.editId && (state.diary[diaryDate || todayISO()] || []).find(x => x.id === fs.editId);
    const inp = (id, label, v, extra = '') => `<label class="block"><span class="text-xs font-bold text-neutral-400">${label}</span><input id="${id}" ${extra} value="${v ?? ''}" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold"></label>`;
    $('fs-body').innerHTML = `<div class="space-y-3">
        ${inp('fq-name', tr('Nombre'), e ? esc(e.name) : '', `type="text" maxlength="40" placeholder="${tr('Ej: Menú del día')}"`)}
        <div class="grid grid-cols-2 gap-2">
            ${inp('fq-kcal', 'Kcal', e ? e.kcal : '', `type="number" inputmode="decimal" min="0" placeholder="${tr('sale de las macros')}"`)}
            ${inp('fq-p', tr('Proteína (g)'), e ? e.p : '', `type="number" inputmode="decimal" min="0" placeholder="${tr('opcional')}"`)}
            ${inp('fq-f', tr('Grasa (g)'), e ? e.f : '', `type="number" inputmode="decimal" min="0" placeholder="${tr('opcional')}"`)}
            ${inp('fq-c', tr('Hidratos (g)'), e ? e.c : '', `type="number" inputmode="decimal" min="0" placeholder="${tr('opcional')}"`)}
        </div>
        <button type="button" ${ND.on(fsQuickSave)} class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold">${tr(e ? 'Guardar cambios' : 'Apuntar')}</button>
        ${e ? `<div class="grid grid-cols-2 gap-2"><button type="button" ${ND.on(() => { const id = fs.editId; closeFoodSheet(); diaryDel(id); })} class="py-3 rounded-2xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"><i class="fa-solid fa-trash"></i> ${tr('Quitar')}</button>
            <button type="button" ${ND.on(() => { const id = fs.editId; closeFoodSheet(); dupEntry(id); })} class="py-3 rounded-2xl border border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800"><i class="fa-regular fa-copy"></i> ${tr('Duplicar')}</button></div>` : ''}
    </div>`;
    setTimeout(() => { const el = $('fq-name'); if (el) el.focus(); }, 30);
}
function fsQuickSave() {
    const name = $('fq-name').value.trim().slice(0, 40);
    const p = Math.max(0, num($('fq-p').value) || 0), f = Math.max(0, num($('fq-f').value) || 0), c = Math.max(0, num($('fq-c').value) || 0);
    // Sin calorías pero con macros: se calculan solas (4 kcal/g proteína e hidratos, 9 kcal/g grasa)
    let kcal = num($('fq-kcal').value);
    if (!kcal && (p || f || c)) kcal = p * 4 + c * 4 + f * 9;
    if (!name) { toast('Escribe un nombre'); $('fq-name').focus(); return; }
    if (!kcal || kcal < 0 || kcal > 5000) { toast('Escribe sus calorías o sus macros'); $('fq-kcal').focus(); return; }
    const entry = { slot: fs.slot, name, kcal: Math.round(kcal), p: round1(p), f: round1(f), c: round1(c), fib: 0 };
    let id = fs.editId;
    if (id) {
        const list = state.diary[diaryDate || todayISO()] || [], i = list.findIndex(x => x.id === id);
        if (i >= 0) {
            // Se conserva la cantidad y la marca; deja de estar ligado al alimento de la base (sus macros ya son las tuyas)
            const { fid, sug, est, ...old } = list[i];
            list[i] = { ...old, ...entry, fib: old.fib || 0, id, ...(fid ? { edited: 1 } : {}) };
        } else id = null;
    }
    const editing = !!id;
    if (!id) { id = pushDiary(entry); track('food_logged'); }
    save(); renderDiary(); renderDashboard(); closeFoodSheet(); animDiaryRow(id); checkDayMoments(); checkAchievements();
    toast(editing ? 'Cambios guardados' : tr('✓ Apuntado: {n}', { n: name }));
}
// Crear un alimento propio con los datos de su etiqueta (queda en «Mis alimentos» y también sirve para el menú)
function fsRenderCreate() {
    // fs.cfEdit = id de un alimento tuyo que se está editando (mismo formulario, ya relleno)
    // fs.cfPre = lo que se sabe de un producto escaneado que todavía no estaba (nombre, marca y su código)
    const E = fs.cfEdit && getFood(fs.cfEdit), YA = E || fs.cfPre, v = x => YA && x != null && x !== '' ? ` value="${esc(String(x))}"` : '';
    const inp = (id, label, extra = '') => `<label class="block"><span class="text-xs font-bold text-neutral-400">${label}</span><input id="${id}" ${extra} class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold"></label>`;
    $('fs-body').innerHTML = `<div class="space-y-3">
        ${inp('fc-name', tr('Nombre'), `type="text" maxlength="40" placeholder="${tr('Ej: Wrap de pollo')}"${v(YA && YA.name)}`)}
        ${inp('fc-brand', tr('Marca (opcional)'), `type="text" maxlength="30" placeholder="${tr('Ej: {x}', { x: 'Hacendado' })}"${v(YA && YA.brand)}`)}
        <div class="text-xs font-bold text-neutral-300 pt-1">${tr('Por cada 100 g (tabla nutricional)')}</div>
        <div class="grid grid-cols-2 gap-2">
            ${inp('fc-kcal', tr('Energía (kcal)'), `type="number" inputmode="decimal" min="0" max="950" placeholder="${tr('Opcional')}"${v(E && E.kcal)}`)}
            ${inp('fc-f', tr('Grasas (g)'), `type="number" inputmode="decimal" min="0" max="100"${v(E && E.f)}`)}
            ${inp('fc-c', tr('Hidratos (g)'), `type="number" inputmode="decimal" min="0" max="100"${v(E && E.c)}`)}
            ${inp('fc-sug', tr('de los cuales azúcares (g)'), `type="number" inputmode="decimal" min="0" max="100"${v(E && E.sug)}`)}
            ${inp('fc-p', tr('Proteínas (g)'), `type="number" inputmode="decimal" min="0" max="100"${v(E && E.p)}`)}
            ${inp('fc-fib', tr('Fibra (g, opcional)'), `type="number" inputmode="decimal" min="0" max="100"${E ? v(E.fib) : ' value="0"'}`)}
        </div>
        ${inp('fc-serv', tr('Peso de una ración (g, opcional)'), `type="number" inputmode="decimal" min="1" max="2000" placeholder="${tr('Ej: {x}', { x: '60' })}"${v(E && E.serv && E.serv[0])}`)}
        <button type="button" ${ND.on(fsCreateSave)} class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold">${E ? '<i class="fa-solid fa-check"></i> ' + tr('Guardar cambios') : tr('Crear y elegir cantidad')}</button>
        ${E ? `<p class="text-xs text-neutral-400">${tr('Lo que ya apuntaste no cambia: los cambios cuentan desde ahora.')}</p>` : ''}
        ${!E && fs.cfPre && fs.cfPre.barcode ? `<p class="text-xs text-neutral-400"><i class="fa-solid fa-barcode text-mint-400"></i> ${tr('Se guardará con su código ({c}): la próxima vez que lo escanees saldrá solo.', { c: esc(fs.cfPre.barcode) })}</p>` : ''}
    </div>`;
    setTimeout(() => { const el = $('fc-name'); if (el) el.focus(); }, 30);
}
function fsCreateSave() {
    const name = $('fc-name').value.trim(), brand = $('fc-brand').value.trim();
    const p = num($('fc-p').value) ?? 0, f = num($('fc-f').value) ?? 0, c = num($('fc-c').value) ?? 0, fib = num($('fc-fib').value) ?? 0, serv = num($('fc-serv').value);
    const kcal = num($('fc-kcal').value), sug = num($('fc-sug').value);
    if (!name) { toast('Escribe el nombre del alimento'); $('fc-name').focus(); return; }
    if (p + f + c + fib > 100.5 || p + f + c <= 0) { toast('Revisa los valores: deben ser por 100 g y sumar ≤ 100'); return; }
    if (sug != null && sug > c + 0.5) { toast('Los azúcares no pueden ser más que los hidratos'); $('fc-sug').focus(); return; }
    if (kcal != null && (kcal < 0 || kcal > 950)) { toast('Las kcal por 100 g deben estar entre 0 y 950'); $('fc-kcal').focus(); return; }
    const role = p * 4 >= Math.max(c * 4, f * 9) ? 'protein' : f * 9 > c * 4 ? 'fat' : 'carb';
    const editId = fs.cfEdit && getFood(fs.cfEdit) ? fs.cfEdit : null;
    const food = { id: editId || 'c_' + Date.now().toString(36), name, brand, cat: 'custom', role, meals: 'BSLD', p, f, c, fib, min: role === 'fat' ? 5 : 30, max: role === 'fat' ? 60 : 300, flags: '', custom: true };
    if (kcal != null && kcal > 0) food.kcal = Math.round(kcal); // las kcal de la etiqueta mandan
    if (sug != null) food.sug = sug;
    if (serv && serv > 0) food.serv = [serv, tk('ración'), tk('raciones')];
    // Si venía de un escaneo, se guarda el código: así el producto se reconoce al momento la próxima vez
    if (!editId && fs.cfPre && fs.cfPre.barcode) { food.barcode = fs.cfPre.barcode; fs.cfPre = null; }
    if (editId) {
        // Se cambia el mismo objeto (en FOODS y en tus alimentos) para que el buscador y los menús lo vean al momento
        const live = getFood(editId), i = state.customFoods.findIndex(x => x.id === editId);
        Object.keys(live).forEach(k => delete live[k]); Object.assign(live, food);
        if (i >= 0) state.customFoods[i] = live; else state.customFoods.push(live);
        fs.cfEdit = null; save(); fsOpen(editId);
        toast('Cambios guardados');
        return;
    }
    registerCustom(food); state.customFoods.push(food); save();
    fsOpen(food.id);
    toast(tr('«{n}» creado', { n: name }));
}
function fsEditCustom(id) { if (!getFood(id)) return; fs.cfEdit = id; fs.mode = 'create'; fsRender(); }
// Borrar un alimento tuyo: lo ya apuntado se queda tal cual (cada entrada guarda sus propios valores)
async function delCustomFood(id) {
    const f = getFood(id); if (!f || !f.custom) return;
    if (!(await askConfirm(tr('¿Borrar «{n}» de tus alimentos? Lo que ya apuntaste no se borra.', { n: f.name }), 'Borrar'))) return;
    const iF = FOODS.indexOf(f), iS = state.customFoods.findIndex(x => x.id === id), saved = state.customFoods[iS];
    if (iF >= 0) FOODS.splice(iF, 1);
    if (iS >= 0) state.customFoods.splice(iS, 1);
    save(); fsBack();
    toastUndo(tr('Borrado: {n}', { n: f.name }), () => { if (saved) { state.customFoods.splice(Math.min(iS, state.customFoods.length), 0, saved); registerCustom(saved); save(); const sh = $('food-sheet'); if (sh && !sh.classList.contains('hidden')) fsRender(); } });
}
function pushDiary(entry, date) {
    const d = date || diaryDate || todayISO();
    const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.diary[d] = (state.diary[d] || []).concat([{ id, ...entry }]);
    return id;
}
function round1(x) { return Math.round(x * 10) / 10; }
// Duplicar un alimento del diario en otra comida y/o en otro día
function dupEntry(id) {
    const from = diaryDate || todayISO(), e = (state.diary[from] || []).find(x => x.id === id); if (!e) return;
    openSheet('<i class="fa-regular fa-copy text-mint-400"></i> ' + tr('Duplicar'), `<div class="space-y-4">
        <div class="p-3 rounded-xl bg-neutral-800/60 border border-neutral-800 text-sm"><b>${esc(e.name)}</b> · ${e.g ? entryAmount(e) : tr('Solo calorías')} · ${fmt(e.kcal)} kcal</div>
        <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="text-xs font-bold text-neutral-400">${tr('Comida|etiqueta')}</span><select id="dup-slot" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold">${DSLOTS.map(([k, n]) => `<option value="${k}" ${k === e.slot ? 'selected' : ''}>${tr(n)}</option>`).join('')}</select></label>
            <label class="block"><span class="text-xs font-bold text-neutral-400">${tr('Día')}</span><input id="dup-date" type="date" value="${todayISO()}" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold"></label>
        </div>
        <button ${ND.on(() => dupConfirm(id, from))} class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold"><i class="fa-regular fa-copy"></i> ${tr('Duplicar')}</button></div>`);
}
function dupConfirm(id, from) {
    const e = (state.diary[from] || []).find(x => x.id === id); if (!e) return;
    const d = $('dup-date').value || todayISO(), slot = $('dup-slot').value;
    const { id: _, ...rest } = e;
    pushDiary({ ...rest, slot }, d);
    save(); renderDiary(); renderDashboard(); closeSheet(); track('food_logged'); checkDayMoments(); checkAchievements();
    toast(tr('Duplicado en {x}', { x: tr((DSLOTS.find(s => s[0] === slot) || [, ''])[1]).toLowerCase() }) + (d === from ? '' : ' · ' + new Date(d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' })));
}
function animDiaryRow(id) {
    ndAnim(document.querySelector(`#diary-meals [data-entry="${id}"]`), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], 180);
}
function diaryDel(id) {
    const d = diaryDate || todayISO();
    const list = state.diary[d] || [], idx = list.findIndex(e => e.id === id), removed = list[idx];
    state.diary[d] = list.filter(e => e.id !== id);
    if (!state.diary[d].length) delete state.diary[d];
    save(); renderDiary(); renderDashboard();
    if (removed) toastUndo(tr('Quitado: {n}', { n: removed.name }), () => {
        const cur = state.diary[d] || [];
        cur.splice(Math.min(idx, cur.length), 0, removed);
        state.diary[d] = cur;
        save(); renderDiary(); renderDashboard(); animDiaryRow(removed.id);
    });
}
// Aviso con botón «Deshacer» (5 s). Usa el mismo aviso de siempre, con un botón dentro
let undoFn = null;
function toastUndo(msg, fn) {
    undoFn = fn;
    const t = $('toast');
    t.innerHTML = `<span>${esc(tr(msg))}</span><button type="button" ${ND.on(runUndo)} class="ml-3 underline font-extrabold">${tr('Deshacer')}</button>`;
    t.style.pointerEvents = 'auto'; t.style.transitionDuration = '';
    t.style.opacity = '1'; t.style.transform = 'translate(-50%, 0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { undoFn = null; t.style.pointerEvents = ''; t.style.transitionDuration = '.18s'; t.style.opacity = '0'; t.style.transform = 'translate(-50%, 10px)'; }, 5000);
}
function runUndo() { const fn = undoFn; undoFn = null; if (fn) fn(); toast('Deshecho'); }

