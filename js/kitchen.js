// FitDL · Mi nevera (qué cocinar con lo que tienes) y Compra inteligente (planificada, a tu gusto y editable con palabras)
// Funciones PRO. Todo se calcula en el dispositivo con la base de alimentos.
'use strict';

// =====================================================================
//  MI NEVERA
// =====================================================================
const FRIDGE_QUICK = ['huevo', 'pollo', 'pavo', 'ternera', 'picada', 'salmon', 'merluza', 'atun', 'gambas', 'tofu', 'leche', 'yogdes', 'skyr', 'batido', 'burgos', 'jamon', 'fiambre',
    'arroz', 'pasta', 'patata', 'boniato', 'pan', 'avena', 'wrap', 'lentejas', 'garbanzos', 'brocoli', 'espinacas', 'calabacin', 'pimiento', 'tomate', 'lechuga', 'champi', 'zanahoria', 'cebolla',
    'aguacate', 'platano', 'manzana', 'fresas', 'nueces', 'aove'];
const fr = { slot: null, url: null };
// Lo que más apuntas en el diario, primero: lo de cada día queda a un toque
function usualFoods(n, ok = () => true) {
    const c = foodFreq();
    return Object.keys(c).filter(id => c[id] >= 2).sort((a, b) => c[b] - c[a]).map(getFood).filter(f => f && ok(f)).slice(0, n);
}
const withUsual = (ids, n, ok) => [...new Set(usualFoods(n, ok).map(f => f.id).concat(ids))];
const pantry = () => myPrefs().pantry;
function openFridge(slot) {
    if (needPro('fridge')) return;
    if (!calc.target) { toast('Primero completa tu plan'); return; }
    fr.slot = slot || (nextMeal() || {}).slot || slotByHour();
    openSheet('<i class="fa-solid fa-snowflake text-mint-400"></i> ' + tr('Mi nevera'), `<div class="space-y-4">
        <form ${ND.onsubmit(fridgeText)} class="flex gap-2"><input id="fr-q" autocomplete="off" placeholder="${tr('Escribe lo que tienes: pollo, huevos, arroz…')}" class="flex-1 min-w-0 px-3 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-semibold" aria-label="${tr('Lo que tienes en la nevera')}"><button class="px-4 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-extrabold">${tr('Añadir')}</button></form>
        <div id="fr-have"></div>
        <details class="nd-faq" ${pantry().length < 3 ? 'open' : ''}><summary>${tr('Toca lo que tienes')}<i class="fa-solid fa-chevron-down chev"></i></summary><div id="fr-chips" class="px-3 pb-3 flex flex-wrap gap-1.5"></div></details>
        <label class="nd-photo nd-photo-sm" id="fr-drop"><input type="file" accept="image/*" capture="environment" class="sr-only" ${ND.onchange(e => fridgePhoto(e.target))}><span id="fr-prev" class="flex items-center gap-3 text-left text-neutral-400"><i class="fa-solid fa-camera text-xl text-mint-400"></i><span><span class="block text-sm font-bold">${tr('Foto de tu nevera (opcional)')}</span><span class="block text-xs">${tr('Te sirve de guía para marcar lo que tienes. No sale de tu móvil.')}</span></span></span></label>
        <div class="space-y-2"><div class="text-xs font-extrabold uppercase tracking-wider text-neutral-400">${tr('¿Para qué comida?')}</div><div id="fr-slots" class="flex gap-2 overflow-x-auto nd-noscroll"></div></div>
        <button ${ND.on(fridgeCook)} class="w-full py-3.5 rounded-2xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold"><i class="fa-solid fa-utensils"></i> ${tr('¿Qué cocino?')}</button>
        <div id="fr-out" class="space-y-3"></div>
    </div>`, () => { if (fr.url) URL.revokeObjectURL(fr.url); fr.url = null; });
    renderFridge(); track('fridge_open');
}
function fridgePhoto(inp) {
    const file = inp.files && inp.files[0]; if (!file) return;
    if (fr.url) URL.revokeObjectURL(fr.url);
    fr.url = URL.createObjectURL(file);
    $('fr-prev').innerHTML = `<img src="${fr.url}" alt="${tr('Foto de tu nevera')}" class="w-full max-h-72 object-contain rounded-2xl">`;
    $('fr-drop').classList.add('has');
}
function renderFridge() {
    const P = pantry();
    const have = $('fr-have'); if (!have) return;
    have.innerHTML = P.length ? `<div class="flex items-center justify-between gap-2 mb-2"><div class="text-xs font-extrabold uppercase tracking-wider text-neutral-400">${tr('Tienes ({k})', { k: P.length })}</div><button type="button" ${ND.on(fridgeClear)} class="text-xs font-bold text-neutral-400 underline">${tr('Vaciar')}</button></div>
        <div class="flex flex-wrap gap-1.5">${P.map(getFood).filter(Boolean).map(f => { const fid = f.id; return `<span class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-mint-600/20 border border-mint-500/40 text-xs font-bold text-neutral-100">${emo(f)} ${esc(foodName(f))}<button type="button" ${ND.on(() => fridgeToggle(fid))} class="w-6 h-6 rounded text-neutral-400 hover:text-roseAccent-400" aria-label="${tr('Quitar {n}', { n: esc(foodName(f)) })}"><i class="fa-solid fa-xmark"></i></button></span>`; }).join('')}</div>`
        : '<p class="text-sm text-neutral-400">' + tr('Aún no has marcado nada.') + '</p>';
    $('fr-chips').innerHTML = withUsual(FRIDGE_QUICK, 8, f => !f.brand).map(getFood).filter(f => f && !inPantry(f.id, P)).map(f => { const fid = f.id; return `<button type="button" ${ND.on(() => fridgeToggle(fid))} class="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200 hover:border-mint-500/60">${emo(f)} ${esc(foodName(f).replace(/ \(.*\)$/, ''))}</button>`; }).join('');
    $('fr-slots').innerHTML = planSlots().map(s => `<button type="button" ${ND.on(() => { fr.slot = s; renderFridge(); })} class="shrink-0 px-3.5 py-2 rounded-full text-xs font-extrabold border ${s === fr.slot ? 'bg-mint-600 border-mint-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}">${tr(SLOT_NAME[s])}</button>`).join('');
}
function fridgeToggle(id) { const p = myPrefs(); p.pantry = p.pantry.includes(id) ? p.pantry.filter(x => x !== id) : p.pantry.concat(id); save(); renderFridge(); }
function fridgeClear() { myPrefs().pantry = []; save(); renderFridge(); $('fr-out').innerHTML = ''; }
function fridgeText() {
    const t = ($('fr-q').value || '').trim(); if (!t) return;
    const ids = parseFoodText(t).items.map(i => i.food.id), p = myPrefs();
    if (!ids.length) { toast('No he reconocido ningún alimento'); return; }
    ids.forEach(id => { if (!p.pantry.includes(id)) p.pantry.push(id); });
    $('fr-q').value = ''; save(); renderFridge();
}
let frOpts = [], frTg = null, frAdded = [];
// Platos con lo que tienes (y, si hacen falta más ideas, los que solo necesitan una cosa más)
function fridgeMeals(slot, ids, n = 3) {
    const prefs = { ...myPrefs(), pantry: ids }, tg = targetFor(slot);
    const full = suggestMeals(slot, tg, { n, pantryOnly: true, prefs, seed: Date.now() % 100000 });
    const names = new Set(full.map(o => o.name));
    const near = full.length >= n ? [] : suggestMeals(slot, tg, { n: n * 2, pantryOnly: true, allowMissing: true, prefs }).filter(o => o.missing.length && !names.has(o.name)).slice(0, n - full.length);
    return { tg, opts: full.concat(near) };
}
function fridgeCook() {
    const P = pantry(); if (!P.length) { toast('Marca primero lo que tienes'); return; }
    const { tg, opts } = fridgeMeals(fr.slot, P); frOpts = opts; frTg = tg; frAdded = [];
    renderFridgeOut();
    track('fridge_cook');
    const first = $('fr-out').firstElementChild; if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Pinta los platos ya calculados (abrir una receta o añadir un plato no cambia las propuestas)
function renderFridgeOut() {
    const out = $('fr-out'); if (!out || !frTg) return;
    out.innerHTML = frOpts.length ? `<div class="nd-card p-4 flex items-center justify-between gap-3"><div><div class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">${tr('Para {x}', { x: slotArt(fr.slot) })}</div><div class="text-lg font-extrabold text-neutral-50">${tr('{k} kcal · {p} g de proteína', { k: fmt(frTg.kcal), p: fmt(frTg.p) })}</div></div>${tagPill('rec')}</div>
        ${frOpts.map((o, i) => mealCard(o, { key: 'fr' + i + o.id, add: ND.on(() => fridgeAdd(i)), added: frAdded.includes(i) })).join('')}`
        : '<p class="text-sm text-neutral-300">' + tr('Con eso no me sale un plato completo. Añade alguna proteína (huevos, pollo, atún, legumbres…) y algún hidrato (arroz, pasta, patata, pan…).') + '</p>';
}
function fridgeAdd(i) {
    const o = frOpts[i]; if (!o || frAdded.includes(i)) return;
    mealToDiary(o, fr.slot, todayISO()); frAdded.push(i); track('food_logged'); afterLog(); renderFridgeOut();
    toast(`✓ ${mealText(o).name} → ${slotLow(fr.slot)}`);
}

// =====================================================================
//  COMPRA INTELIGENTE
// =====================================================================
// i18n-ignore-start (lo que se ENTIENDE, no se enseña: vale para español e inglés)
const SHOP_FILL = /\b(quiero|hacer|haz|hazme|crea|crear|prepara|preparame|necesito|una|un|compra|lista|fitness|sana|saludable|semanal|para|la|el|los|las|semana|dias?|adaptada|adaptado|a|mis|preferencias|me|gusta|gustan|encanta|encantan|con|incluye|incluir|que|lleve|tenga|mucho|mucha|muchos|muchas|prefiero|economica|barata|alta|en|proteina|proteica|vegana|vegetariana|pescetariana|de|tambien|algo|cosas|comida|comidas|todo|todos|i|want|make|do|create|prepare|need|shopping|grocery|groceries|list|healthy|weekly|week|days?|the|my|preferences|like|love|with|include|includes|that|has|lots|of|prefer|cheap|budget|high|protein|vegan|vegetarian|pescatarian|also|some|things|food|meals|all|and|for|an|me)\b/g;
const NEG = /^(y\s+)?(pero\s+)?(sin|no me gusta\w*|no quiero|nada de|evita\w*|quita\w*|excepto|menos|odio|no como)\b|^(and\s+)?(but\s+)?(no|without|free|i don.?t (like|want)|nothing with|avoid|remove|except|i hate|i don.?t eat)\b/;
const ALLERGY_WORDS = { lactosa: /lactosa|lacteos|lactose|dairy/, gluten: /gluten/, huevo: /\bhuevos?\b|\beggs?\b/, frutos: /frutos secos|\bnuts\b|tree nuts/, pescado: /\bpescados?\b|\bfish\b/, marisco: /marisco|shellfish|seafood/, soja: /\bsoja\b|\bsoy\b|\bsoya\b/ };
// i18n-ignore-end
const foodIdsIn = t => [...new Set(parseFoodText(t).items.map(i => i.food).filter(f => !f.brand).map(f => f.id))];
function parseShopRequest(text, base = {}) {
    const q = norm(text);
    let days = base.days || 7;
    const md = q.match(/(\d{1,2})\s*(dias?|days?)/);
    if (md) days = +md[1]; else if (/fin de semana|finde|weekend/.test(q)) days = 2; else if (/\b(hoy|un dia|today|one day)\b/.test(q)) days = 1; else if (/(2|dos|two) semanas|(2|two) weeks/.test(q)) days = 14; else if (/semana|week/.test(q)) days = 7;
    days = Math.min(14, Math.max(1, days));
    const like = new Set(base.like || []), avoid = new Set(base.avoid || []), allergies = new Set(base.allergies || []);
    // Cada trozo de la frase: lo que va tras «sin», «no me gusta»… es lo que se evita; lo de antes, lo que se quiere
    const pieces = [];
    for (const raw of q.split(/[,.;]|\bpero\b|\bbut\b/)) {
        const c = raw.trim(); if (!c) continue;
        const i = c.search(/\b(sin|no me gusta\w*|no quiero|nada de|evita\w*|excepto|menos|odio|no como|without|i don.?t (like|want)|nothing with|avoid|except|i hate|i don.?t eat)\b/);
        if (i > 0) pieces.push(c.slice(0, i).trim(), c.slice(i).trim()); else pieces.push(c);
    }
    for (const c of pieces) {
        if (!c) continue;
        if (NEG.test(c)) {
            // «sin lactosa y no me gusta el atún»: cada parte por separado
            for (const part of c.split(/\by\b|\bni\b|\band\b|\bnor\b/)) {
                let rest = part.replace(NEG, ' ').replace(/\b(no|me|gusta\w*|quiero|como|el|la|los|las|nada|de|i|don.?t|like|want|eat|the|free|of|with)\b/g, ' ');
                Object.entries(ALLERGY_WORDS).forEach(([k, re]) => { if (re.test(rest)) { allergies.add(k); rest = rest.replace(re, ' '); } });
                rest = rest.replace(/lacteos|frutos secos|dairy|tree nuts/g, ' ').replace(/\s+/g, ' ').trim();
                if (rest.length > 2) foodIdsIn(rest).forEach(id => { avoid.add(id); like.delete(id); });
            }
        } else {
            const rest = c.replace(SHOP_FILL, ' ').replace(/\s+/g, ' ').trim();
            if (rest) foodIdsIn(rest).forEach(id => { if (!avoid.has(id)) like.add(id); });
        }
    }
    return {
        text, days, like: [...like], avoid: [...avoid], allergies: [...allergies],
        diet: /vegan/.test(q) ? 'vegan' : /vegetarian/.test(q) ? 'veg' : /pescetarian|pescatarian/.test(q) ? 'pesc' : base.diet || null,
        budget: /barat|economic|ajustad|low cost|cheap|budget|on a budget/.test(q) ? 'low' : base.budget || null,
    };
}
function shopPrefs(req) {
    const p = myPrefs();
    return { ...p, diet: req.diet || p.diet, budget: req.budget || p.budget, allergies: [...new Set(p.allergies.concat(req.allergies || []))], dislikes: [...new Set(p.dislikes.concat(req.avoid || []))] };
}
function shopBuild(S) {
    const extra = (S.add || []).length ? [{ meals: [{ items: S.add }] }] : [];
    S.items = buildShopping(S.menus.concat(extra));
}
function shopCreate(req) {
    if (!calc.target) { toast('Primero completa tu plan'); return; }
    const menus = makeMenus(req.days, Date.now() % 1000000, { prefs: shopPrefs(req), like: req.like });
    if (!menus.length) { toast('Con esas preferencias no encuentro platos: prueba con menos restricciones'); return; }
    const old = state.shop && state.shop.v === 2 ? state.shop : null;
    // Lo marcado como comprado solo se conserva si rehaces la lista el mismo día; una compra de otro día empieza sin marcas
    const sameDay = !!old && old.start === todayISO();
    state.shop = { v: 2, req, days: req.days, start: todayISO(), at: Date.now(), menus, add: old ? old.add || [] : [], done: sameDay ? old.done : {}, extra: old ? (sameDay ? old.extra : (old.extra || []).filter(x => !x.done)) : [] };
    shopBuild(state.shop); save(); renderShopView(); track('shop_generated');
    toast(tr('Compra para {x} lista', { x: tp(req.days, 'día', 'días') }));
}
function shopAsk(text) {
    const t = String(text != null ? text : ($('shop-q') && $('shop-q').value) || '').trim();
    if (!t) { toast('Dime qué compra quieres'); return; }
    shopCreate(parseShopRequest(t));
}
// Cambios con palabras: «cambia el salmón por merluza», «quita la leche», «añade plátanos», «me gusta el atún»
function shopEdit(text) {
    const S = state.shop; if (!S || S.v !== 2) return shopAsk(text);
    const q = norm(String(text || ($('shop-edit') && $('shop-edit').value) || '').trim()); if (!q) return;
    let m, msg = '';
    if ((m = q.match(/\b(?:cambia\w*|sustitu\w*|reemplaz\w*|pon|cambiame)\s+(.+?)\s+por\s+(.+)$/))) {
        const from = foodIdsIn(m[1]), to = matchFoods(m[2].replace(/^(el|la|los|las|unos|unas)\s+/, ''), 6).find(f => !f.brand);
        if (!from.length || !to) { toast('No he entendido qué cambiar'); return; }
        const n = shopReplace(from, to.id);
        msg = n ? tr('Cambiado por {x} en {y}', { x: foodName(to).toLowerCase(), y: tp(n, 'comida|plato', 'comidas|plato') }) : tr('Eso no estaba en tu compra');
    } else if (/^(quita\w*|sin|elimina\w*|no quiero|nada de|fuera|borra\w*)\b/.test(q)) {
        const ids = foodIdsIn(q.replace(/^(quita\w*|sin|elimina\w*|no quiero|nada de|fuera|borra\w*)\s*/, ''));
        if (!ids.length) { toast('No he entendido qué quitar'); return; }
        const n = shopAvoid(ids);
        msg = tr('Quitado de la compra') + (n ? ' ' + tr(n === 1 ? '({k} comida cambiada)' : '({k} comidas cambiadas)', { k: n }) : '');
    } else if (/^(añade|anade|agrega|pon|mete|incluye|compra|mas)\b/.test(q)) {
        const daily = /al dia|cada dia|diari|por dia/.test(q);
        const P = parseFoodText(q.replace(/^(añade|anade|agrega|pon|mete|incluye|compra|mas)\s*/, '').replace(/al dia|cada dia|diarios?|por dia/g, ''));
        if (!P.items.length) { toast('No he entendido qué añadir'); return; }
        P.items.forEach(it => { const g = it.est ? it.g * S.days : daily ? it.g * S.days : it.g; S.add.push({ fid: it.food.id, g: Math.round(g) }); });
        msg = tr('Añadido: {x}', { x: P.items.map(i => foodName(i.food).toLowerCase()).join(', ') });
    } else {
        const req = parseShopRequest(q, S.req);
        if (req.days !== S.days || req.diet !== S.req.diet || req.budget !== S.req.budget || req.allergies.length !== (S.req.allergies || []).length || req.like.length !== (S.req.like || []).length || req.avoid.length !== (S.req.avoid || []).length) { shopCreate(req); return; }
        toast('Prueba con «cambia X por Y», «quita X» o «añade X»'); return;
    }
    shopBuild(S); save(); renderShopView(); toast(msg); track('shop_edit');
}
// Cambia un alimento por otro en toda la semana, con la misma proteína (o las mismas calorías si no es proteico)
function shopReplace(fromIds, toId) {
    const S = state.shop, to = getFood(toId), from = new Set(fromIds.flatMap(id => PANTRY_EQ.find(g => g.includes(id)) || [id]));
    let n = 0;
    S.menus.forEach(mn => mn.meals.forEach(ml => {
        let hit = false;
        ml.items.forEach(it => {
            if (!from.has(it.fid)) return;
            const f = getFood(it.fid); hit = true;
            const g = f.p >= 5 && to.p >= 5 ? it.g * f.p / to.p : it.g * (kcal100(f) || 1) / (kcal100(to) || 1);
            it.fid = toId; it.g = Math.max(5, Math.round(g / 5) * 5);
        });
        if (hit) { n++; ml.m = sumMacros(ml.items.map(it => ({ f: getFood(it.fid), g: it.g }))); ml.name = mealNaming(ml.items.map(it => ({ f: getFood(it.fid), kind: it.kind }))).name; }
    }));
    S.add = (S.add || []).map(a => from.has(a.fid) ? { fid: toId, g: a.g } : a);
    S.req.like = [...new Set((S.req.like || []).filter(id => !from.has(id)).concat(toId))];
    S.req.avoid = [...new Set((S.req.avoid || []).concat([...from]))];
    return n;
}
// Quita un alimento: las comidas que lo llevan se cambian por otras sin él
function shopAvoid(ids) {
    const S = state.shop, all = new Set(ids.flatMap(id => PANTRY_EQ.find(g => g.includes(id)) || [id]));
    S.req.avoid = [...new Set((S.req.avoid || []).concat([...all]))];
    S.req.like = (S.req.like || []).filter(id => !all.has(id));
    S.add = (S.add || []).filter(a => !all.has(a.fid));
    const prefs = shopPrefs(S.req); let n = 0;
    S.menus.forEach(mn => mn.meals.forEach((ml, i) => {
        if (!ml.items.some(it => all.has(it.fid))) return;
        if (swapMenuMeal(mn, i, Date.now() % 1000000 + i, { prefs, like: S.req.like })) n++;
        else ml.items = ml.items.filter(it => !all.has(it.fid));
    }));
    return n;
}
function shopSwapItem(fid) {
    if (needPro('shop')) return;
    const f = getFood(fid); if (!f) return;
    openSheet('<i class="fa-solid fa-right-left text-mint-400"></i> ' + esc(tr('Cambiar {x}', { x: foodName(f).toLowerCase() })), `<div class="space-y-3">
        <p class="text-sm text-neutral-300">${tr('Se cambia en todas las comidas de la semana, con cantidades equivalentes.')}</p>
        <input id="sw-q" type="search" autocomplete="off" placeholder="${tr('¿Por qué lo cambio? (p. ej. merluza)')}" ${ND.oninput(e => shopSwapSearch(fid, e.target.value))} class="w-full px-3 py-3 rounded-xl bg-neutral-800 border border-neutral-700 font-semibold">
        <div id="sw-res" class="flex flex-wrap gap-1.5"></div></div>`);
    setTimeout(() => { const i = $('sw-q'); if (i) i.focus(); }, 60);
}
function shopSwapSearch(fid, q) {
    $('sw-res').innerHTML = q.trim().length < 2 ? '' : matchFoods(q, 8).filter(f => !f.brand && f.id !== fid).map(f => { const fid2 = f.id; return `<button type="button" ${ND.on(() => shopSwapDo(fid, fid2))} class="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200 hover:border-mint-500/60">${emo(f)} ${esc(foodName(f))}</button>`; }).join('');
}
function shopSwapDo(fid, toId) {
    const S = state.shop, inAdd = (S.add || []).some(a => a.fid === fid);
    const n = shopReplace([fid], toId);
    shopBuild(S); save(); closeSheet(); renderShopView();
    toast(n || inAdd ? tr('Cambiado por {x}', { x: foodName(getFood(toId)).toLowerCase() }) : 'Cambiado');
}
function shopRemoveItem(fid) {
    if (needPro('shop')) return;
    const S = state.shop;
    if ((S.add || []).some(a => a.fid === fid) && !S.menus.some(mn => mn.meals.some(ml => ml.items.some(it => it.fid === fid)))) S.add = S.add.filter(a => a.fid !== fid);
    else shopAvoid([fid]);
    shopBuild(S); save(); renderShopView(); toast(tr('Quitado: {n}', { n: foodName(getFood(fid)).toLowerCase() }));
}
function shopTick(fid, on) { state.shop.done[fid] = on; save(); renderShopView(); }
function shopTickExtra(i, on) { state.shop.extra[i].done = on; save(); renderShopView(); }
function shopAddExtra() { const t = ($('shop-extra').value || '').trim(); if (!t) return; state.shop.extra = [...(state.shop.extra || []), { t, done: false }]; save(); renderShopView(); }
function shopDelExtra(i) { state.shop.extra.splice(i, 1); save(); renderShopView(); }
function shopClearDone() { const S = state.shop; S.items = S.items.filter(x => !S.done[x.fid]); S.extra = (S.extra || []).filter(x => !x.done); save(); renderShopView(); }
async function shopReset() { if (await askConfirm('¿Empezar una compra nueva? Se borra la lista actual.', 'Nueva compra')) { state.shop = null; save(); renderShopView(); } }
const dayLabel = (start, i) => { const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + i); return d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' }); };
function renderShopView() {
    const box = $('cv-shop'); if (!box) return;
    // Sin PRO: la última compra que hiciste se sigue viendo y se puede ir marcando; lo que no se puede es crear otra
    const proShop = canUse('shop'), compraGuardada = !!(state.shop && state.shop.items && state.shop.items.length);
    if (!proShop && !compraGuardada) { box.innerHTML = proTeaser('shop'); return; }
    if (!calc.target) { box.innerHTML = emptyPlan(tk('crear tu compra')); return; }
    const S = state.shop;
    const avisoSinPro = `<div class="nd-card p-4 flex items-center gap-3"><span class="nd-ic shrink-0">${icon('👑')}</span><div class="min-w-0"><p class="text-sm text-neutral-200">${tr('Tu última compra se queda aquí para consultarla y marcarla. Para crear una nueva necesitas PRO.')}</p><button type="button" ${ND.on(() => openPaywall('shop'))} class="mt-1 text-sm font-extrabold text-mint-300 underline">${tr('Ver FitDL PRO')}</button></div></div>`;
    const ask = `<div class="nd-card p-5 space-y-3">
        <div class="flex items-center justify-between gap-2"><h3 class="text-lg font-extrabold text-neutral-50">${S && S.v === 2 ? tr('Nueva compra') : tr('¿Qué compra quieres?')}</h3>${S && S.v === 2 ? '<button ' + ND.on(shopReset) + ' class="text-xs font-bold text-neutral-400 underline">' + tr('Empezar de cero') + '</button>' : ''}</div>
        <form ${ND.onsubmit(shopAsk)} class="space-y-2"><textarea id="shop-q" rows="2" maxlength="300" placeholder="${tr('Ej: compra fitness para 7 días, me gusta el salmón y el arroz, sin lactosa')}" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl font-semibold text-[15px]" aria-label="${tr('Qué compra quieres')}"></textarea>
        <button class="w-full py-3 rounded-xl bg-mint-600 hover:bg-mint-700 text-white font-extrabold"><i class="fa-solid fa-basket-shopping"></i> ${tr('Crear mi compra')}</button></form>
        <div class="flex gap-2 overflow-x-auto nd-noscroll -mx-1 px-1">${[tk('Compra fitness para la semana'), tk('Para 3 días'), tk('Económica para la semana'), tk('Vegetariana para 5 días')].map(s => `<button type="button" ${ND.on(() => shopAsk(s))} class="shrink-0 px-3 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-200 hover:border-mint-500/50">${esc(tr(s))}</button>`).join('')}</div>
        <button type="button" ${ND.on(() => openFridge())} class="w-full py-2.5 rounded-xl border border-dashed border-neutral-700 text-sm font-bold text-neutral-300 hover:border-mint-500/50"><i class="fa-solid fa-snowflake text-mint-400"></i> ${tr('Marcar lo que ya tengo en la nevera')}</button>
    </div>`;
    if (!S || !S.items) { box.innerHTML = proShop ? ask : avisoSinPro; return; }
    const P = pantry(), all = S.items.length + (S.extra || []).length, done = S.items.filter(x => S.done[x.fid]).length + (S.extra || []).filter(x => x.done).length;
    const v2 = S.v === 2, days = S.days || 1;
    const row = x => { const f = getFood(x.fid); if (!f) return ''; const on = !!S.done[x.fid]; return `<div class="nd-shop ${on ? 'on' : ''}">
        <input type="checkbox" ${on ? 'checked' : ''} ${ND.onchange(e => shopTick(x.fid, e.target.checked))} aria-label="${tr('Comprado: {n}', { n: esc(foodName(f)) })}">
        <span class="flex-1 min-w-0"><span class="block leading-snug">${emo(f)} ${esc(foodName(f))}</span>${v2 && days > 1 ? `<span class="block text-[11px] text-neutral-500">${tr('≈ {k} {u} al día', { k: fmt(x.g / days), u: f.ml ? 'ml' : 'g' })}</span>` : ''}</span>
        <span class="text-sm font-bold text-neutral-200 whitespace-nowrap">${shopQty(f, x.g)}</span>
        ${v2 && canUse('shop') ? `<button type="button" ${ND.on(() => shopSwapItem(x.fid))} class="w-8 h-8 shrink-0 rounded-lg text-neutral-400 hover:text-mint-300 hover:bg-neutral-800" aria-label="${tr('Cambiar {x}', { x: esc(foodName(f)) })}"><i class="fa-solid fa-right-left"></i></button><button type="button" ${ND.on(() => shopRemoveItem(x.fid))} class="w-8 h-8 shrink-0 rounded-lg text-neutral-500 hover:text-roseAccent-400 hover:bg-neutral-800" aria-label="${tr('Quitar {n}', { n: esc(foodName(f)) })}"><i class="fa-solid fa-xmark"></i></button>` : ''}
    </div>`; };
    // Lo que ya tienes en casa va al final, aparte: en el súper no hay que ir saltándolo
    const home = S.items.filter(x => inPantry(x.fid, P));
    const groups = SHOP_GROUPS.map(([g, label, ic]) => { const L = S.items.filter(x => x.group === g && !inPantry(x.fid, P)); return L.length ? `<div class="space-y-0.5"><div class="text-xs font-extrabold uppercase tracking-wider text-neutral-400 pt-3">${icon(ic, "text-mint-400 mr-1")} ${tr(label)}</div>${L.map(row).join('')}</div>` : ''; }).join('')
        + (home.length ? `<div class="space-y-0.5"><div class="text-xs font-extrabold uppercase tracking-wider text-neutral-400 pt-3"><i class="fa-solid fa-house text-mint-400 mr-1" aria-hidden="true"></i> ${tr('Ya lo tienes en casa')}</div><p class="text-[11px] text-neutral-500">${tr('Míralo antes de salir: si no te queda suficiente, cómpralo también.')}</p>${home.map(row).join('')}</div>` : '');
    const extra = (S.extra || []).map((x, i) => `<label class="nd-shop ${x.done ? 'on' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} ${ND.onchange(e => shopTickExtra(i, e.target.checked))}><span class="flex-1 min-w-0">${esc(x.t)}</span><button type="button" ${ND.on(e => { e.preventDefault(); shopDelExtra(i); })} class="w-8 h-8 rounded-lg text-neutral-500 hover:text-roseAccent-400" aria-label="${tr('Quitar {n}', { n: esc(x.t) })}"><i class="fa-solid fa-xmark"></i></button></label>`).join('');
    const tot = v2 ? S.menus.map(menuTotals) : [], avgK = tot.length ? tot.reduce((a, t) => a + t.kcal, 0) / tot.length : 0, avgP = tot.length ? tot.reduce((a, t) => a + t.p, 0) / tot.length : 0;
    const R = S.req || {};
    const chips = [...(R.like || []).map(id => getFood(id)).filter(Boolean).map(f => `${icon('❤️', 'text-mint-400')} ${esc(foodName(f).toLowerCase())}`), ...(R.avoid || []).map(id => getFood(id)).filter(Boolean).map(f => `${icon('🚫', 'text-neutral-400')} ${esc(foodName(f).toLowerCase())}`), ...(R.allergies || []).map(a => tr('sin {x}', { x: ALLERGENS[a] ? tr(ALLERGENS[a][0]).toLowerCase() : a })), R.diet ? tr(DIETS[R.diet]) : '', R.budget === 'low' ? tr('económica') : ''].filter(Boolean);
    const plan = v2 ? `<details class="nd-faq"><summary>${tr('Plan de comidas día a día')}<i class="fa-solid fa-chevron-down chev"></i></summary><div class="px-3 pb-3 space-y-3">${S.menus.map((mn, i) => { const t = menuTotals(mn); return `<div class="rounded-xl bg-neutral-900 border border-neutral-800 p-3 space-y-1.5">
            <div class="flex items-baseline justify-between gap-2"><div class="text-sm font-extrabold text-neutral-100 first-letter:uppercase">${dayLabel(S.start, i)}</div><div class="text-xs font-bold text-neutral-400 whitespace-nowrap">${fmt(t.kcal)} kcal · ${tr('P')} ${fmt(t.p)} g</div></div>
            ${mn.meals.map(ml => `<div class="text-xs text-neutral-300"><b class="text-neutral-200">${tr(SLOT_NAME[ml.slot])}:</b> ${esc(mealText(ml).name)} <span class="text-neutral-500">· ${fmt(ml.m.kcal)} kcal · ${mealIngredients(ml).map(x => esc(x.txt) + ' ' + esc(foodName(x.f).toLowerCase().replace(/ \(.*\)$/, ''))).join(', ')}</span></div>`).join('')}
        </div>`; }).join('')}</div></details>` : '';
    box.innerHTML = `<div class="nd-card p-5 space-y-3">
            <div class="flex items-start justify-between gap-3"><div><div class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">${tr('Tu compra')}</div><div class="text-xl font-extrabold text-neutral-50">${days === 1 ? tr('Para hoy') : tr('Para {k} días', { k: days })}</div>${v2 ? `<div class="text-xs text-neutral-400">${tr('≈ {k} kcal y {p} g de proteína al día (objetivo {t} kcal)', { k: fmt(avgK), p: fmt(avgP), t: fmt(calc.target) })}</div>` : ''}</div>${tagPill('rec')}</div>
            ${chips.length ? `<div class="flex flex-wrap gap-1.5">${chips.map(c => `<span class="px-2 py-1 rounded-lg bg-neutral-800 text-[11px] font-bold text-neutral-300">${c}</span>`).join('')}</div>` : ''}
            ${v2 && proShop ? `<form ${ND.onsubmit(shopEdit)} class="flex gap-2"><input id="shop-edit" autocomplete="off" maxlength="200" placeholder="${tr('Cambia algo: «cambia el salmón por merluza»')}" class="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-semibold" aria-label="${tr('Cambiar algo de la compra')}"><button class="px-4 rounded-xl bg-mint-600 text-white text-sm font-extrabold" aria-label="${tr('Aplicar cambio')}"><i class="fa-solid fa-arrow-up"></i></button></form>
            <div class="flex gap-2 overflow-x-auto nd-noscroll -mx-1 px-1 ${proShop ? '' : 'hidden'}">${[tk('Quita la leche'), tk('Añade 1 plátano al día'), tk('Cambia el pollo por pavo'), tk('Me gusta el atún')].map(s => `<button type="button" ${ND.on(() => shopEdit(s))} class="shrink-0 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-bold text-neutral-300 hover:border-mint-500/50">${esc(tr(s))}</button>`).join('')}</div>` : ''}
            <div class="flex items-center justify-between gap-3 pt-1"><div class="text-sm font-extrabold text-neutral-100">${tr('{a}/{b} comprados', { a: done, b: all })}</div></div>
            <div class="h-1.5 rounded-full bg-neutral-800 overflow-hidden"><div class="h-full rounded-full bg-ok-500 gym-bar" style="width:${all ? done / all * 100 : 0}%"></div></div>
            ${groups}
            ${extra ? `<div class="space-y-1"><div class="text-xs font-extrabold uppercase tracking-wider text-neutral-400 pt-3">${icon('✏️', 'mr-1')} ${tr('Añadidos por ti')}</div>${extra}</div>` : ''}
            <form ${ND.onsubmit(shopAddExtra)} class="flex gap-2 pt-3"><input id="shop-extra" maxlength="40" placeholder="${tr('Apuntar otra cosa (p. ej. café, papel…)')}" class="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-semibold" aria-label="${tr('Apuntar otra cosa')}"><button class="px-4 rounded-xl bg-neutral-800 border border-neutral-700 text-sm font-extrabold" aria-label="${tr('Apuntar')}"><i class="fa-solid fa-plus"></i></button></form>
        </div>
        ${plan}
        <div class="grid grid-cols-2 gap-2"><button ${ND.on(shareShop)} class="nd-mbtn nd-mbtn-main"><i class="fa-solid fa-share-nodes"></i> ${tr('Compartir lista')}</button><button ${ND.on(shopClearDone)} class="nd-mbtn"><i class="fa-solid fa-broom"></i> ${tr('Quitar comprados')}</button></div>
        <p class="text-[11px] text-neutral-500">${tr('Cantidades totales en crudo, redondeadas hacia arriba. Calculado con la base de alimentos.')}</p>
        ${proShop ? ask : avisoSinPro}`;
}
function shopText() {
    const S = state.shop;
    return tr('Lista de la compra · FitDL ({x})', { x: S.days === 1 ? tr('hoy') : tp(S.days, 'día', 'días') }) + '\n' + SHOP_GROUPS.map(([g, label]) => { const L = S.items.filter(x => x.group === g && !S.done[x.fid]); return L.length ? `\n${tr(label)}\n` + L.map(x => { const f = getFood(x.fid); return f ? `- ${foodName(f)}: ${shopQty(f, x.g)}` : ''; }).join('\n') : ''; }).join('') + ((S.extra || []).filter(x => !x.done).length ? '\n\n' + tr('Otros') + '\n' + S.extra.filter(x => !x.done).map(x => '- ' + x.t).join('\n') : '');
}
async function shareShop() {
    // Al compartir, la lista lleva el enlace a la app: así quien la recibe puede probarla
    const t = shopText() + '\n\n' + tr('Hecha con FitDL, gratis: {u}', { u: 'https://' + SHARE_URL + '/' });
    if (navigator.share) { try { await navigator.share({ title: tr('Lista de la compra'), text: t }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(t); toast('Lista copiada: pégala donde quieras'); } catch (e) { toast('No se pudo copiar'); }
}
// Tarjeta para funciones PRO cuando no hay PRO (en lugar de la función)
function proTeaser(feature) {
    const [name, why] = PRO_FEATURES[feature];
    return `<div class="nd-card p-6 sm:p-8 text-center space-y-4"><div class="nd-ic-xl mx-auto">${icon('👑')}</div><h3 class="text-xl font-extrabold text-neutral-50">${esc(tr(name))} <span class="nd-pro-badge">PRO</span></h3><p class="text-sm text-neutral-400 max-w-sm mx-auto">${esc(tr(why))}</p>
        <button ${ND.on(() => openPaywall(feature))} class="nd-btn-primary mx-auto">${proData().trialUsed ? tr('Ver FitDL PRO') : tr('Probar 7 días gratis')}</button></div>`;
}

