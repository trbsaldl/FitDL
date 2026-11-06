// nutriDL · Entender lo que comes en lenguaje natural («200 g de pollo, un plátano y una ensalada»)
// Lo usan el registro por voz, el Coach y la foto. Siempre se muestra una confirmación antes de guardar.
'use strict';

const NUM_WORDS = {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
    quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
    cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
    quinientos: 500, quinientas: 500, medio: .5, media: .5,
    // Inglés (se entienden los dos idiomas a la vez)
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100, half: .5, couple: 2,
};
// Unidad → gramos (null = usar la ración del alimento)
// (cada línea admite la palabra en español y en inglés: «2 slices» = «2 rebanadas»)
const UNIT_WORDS = [
    [/^(g|gr|grs|gramos?|grams?)$/, 'g'], [/^(kg|kilos?|kilogramos?|kilograms?)$/, 'kg'], [/^(ml|mililitros?|milliliters?|millilitres?)$/, 'ml'], [/^(cl|centilitros?|centiliters?|centilitres?)$/, 'cl'], [/^(l|litros?|liters?|litres?)$/, 'l'],
    [/^(vasos?|glass|glasses)$/, 'vaso'], [/^(tazas?|tazones?|boles?|bols|cups?|bowls?|mugs?)$/, 'taza'], [/^(cucharadas?|cdas?|tablespoons?|tbsps?|tbsp)$/, 'cda'], [/^(cucharaditas?|cdtas?|teaspoons?|tsps?|tsp)$/, 'cdta'],
    [/^(latas?|cans?|tins?)$/, 'lata'], [/^(rebanadas?|slices?)$/, 'rebanada'], [/^(tostadas?|toasts?)$/, 'tostada'], [/^(filetes?|fillets?|filets?|steaks?)$/, 'filete'], [/^(lomos?)$/, 'filete'],
    [/^(platos?|plates?)$/, 'plato'], [/^(raciones|racion|porciones|porcion|trozos?|pedazos?|servings?|portions?|pieces?|chunks?)$/, 'racion'], [/^(punados?|handfuls?)$/, 'punado'],
    [/^(piezas?|unidades?|uds?|units?)$/, 'unidad'], [/^(lonchas?|lonchitas?)$/, 'loncha'], [/^(botellas?|bottles?)$/, 'botella'], [/^(copas?|wine glass|wine glasses)$/, 'copa'],
    [/^(canas?)$/, 'cana'], [/^(tercios?)$/, 'tercio'], [/^(botellines?)$/, 'botellin'], [/^(onzas?|ounces?|ozs?|oz)$/, 'onza'], [/^(cacitos?|scoops?)$/, 'cacito'],
];
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'al', 'a', 'en', 'mi', 'unos', 'unas', 'algo', 'poco', 'un', 'una', 'uno', 'y', 'tambien', 'hoy', 'esta', 'este', 'pues', 'luego', 'despues', 'con',
    // Inglés
    'an', 'the', 'of', 'and', 'with', 'some', 'my', 'i', 'to', 'for', 'in', 'on', 'at', 'today', 'also', 'then', 'plus', 'had', 'have', 'ate', 'eaten', 'got', 'this', 'that', 'it']);
// Lo que la gente dice → como se llama en la base
// i18n-ignore-start (frases que se ENTIENDEN, no se enseñan; las inglesas van en su propia lista)
const PHRASES = [
    [/\bpechugas? de pollo\b/g, 'pechuga pollo'], [/\bfiletes? de pollo\b/g, 'pechuga pollo'], [/\bpollo a la plancha\b/g, 'pechuga pollo plancha hecha'],
    [/\bhuevos? (duros?|cocidos?|a la plancha)\b/g, 'huevo'], [/\bhuevos? fritos?\b/g, 'huevo frito'], [/\bhuevos? revueltos?\b/g, 'huevos revueltos'],
    [/\btortilla espanola\b/g, 'tortilla patatas'], [/\btortilla de patatas?\b/g, 'tortilla patatas'], [/\bcafe solo\b/g, 'cafe solo'],
    [/\bcafe\b(?! con| solo)/g, 'cafe con leche'], [/\bensalada mixta\b/g, 'ensalada'], [/\bnueces\b/g, 'nueces'], [/\bnuez\b/g, 'nueces'],
    [/\bchurros con chocolate\b/g, 'churros y chocolate a la taza'],
    [/\b(pan|tostadas?) con tomate( y aceite)?\b/g, 'pantomate'], [/\bpan tostado\b/g, 'pan'], [/\bpatatas fritas de bolsa\b/g, 'patatas fritas bolsa'], [/\bpatatas fritas\b(?! bolsa)/g, 'patatas fritas caseras'],
    [/\b(bocadillo|bocata) de jamon( serrano)?\b/g, 'bocadillo jamon serrano'], [/\b(bocadillo|bocata) de (?!jamon)/g, 'pan barra y '],
    [/\bbocadillo\b(?! jamon)/g, 'pan barra'], [/\bbocata\b/g, 'pan barra'], [/\bcocacola\b|\bcoca cola\b|\bcoca-cola\b/g, 'coca-cola'],
    [/\bproteina en polvo\b|\bbatido de proteinas?\b/g, 'whey'], [/\byogures?\b/g, 'yogur'], [/\byogurt\b/g, 'yogur'],
]; // i18n-ignore-end
// Lo mismo para el inglés: frases que se ENTIENDEN (no se enseñan) → nombre que busca la base
// i18n-ignore-start (frases en inglés que se ENTIENDEN, no se enseñan)
const PHRASES_EN = [
    [/\bchicken breasts?\b/g, 'pechuga pollo'], [/\bgrilled chicken\b/g, 'pechuga pollo plancha hecha'], [/\broast chicken\b/g, 'pollo asado'],
    [/\b(boiled|hard boiled|hard-boiled|poached) eggs?\b/g, 'huevo'], [/\bfried eggs?\b/g, 'huevo frito'], [/\bscrambled eggs?\b/g, 'huevos revueltos'],
    [/\bspanish omelette?\b|\bspanish omelet\b|\bpotato omelette?\b/g, 'tortilla patatas'], [/\bblack coffee\b|\bespresso\b/g, 'cafe solo'],
    [/\bcoffee\b(?! with)/g, 'cafe con leche'], [/\bcoffee with milk\b|\blatte\b|\bflat white\b/g, 'cafe con leche'],
    [/\bmixed salad\b|\bgreen salad\b/g, 'ensalada'], [/\bwhite rice\b/g, 'arroz'], [/\bbrown rice\b/g, 'arroz integral'],
    [/\b(crisps|potato chips)\b/g, 'patatas fritas bolsa'], [/\b(chips|french fries|fries)\b/g, 'patatas fritas caseras'],
    [/\bham (sandwich|baguette|roll)\b/g, 'bocadillo jamon serrano'], [/\bolive oil\b/g, 'aceite oliva virgen extra'],
    [/\bpeanut butter\b/g, 'crema cacahuete'], [/\bgreek yogh?urt\b/g, 'yogur griego'], [/\bprotein (powder|shake)\b|\bwhey\b/g, 'whey'],
    [/\byogh?urts?\b/g, 'yogur'], [/\bwholemeal bread\b|\bwhole wheat bread\b|\bbrown bread\b/g, 'pan integral'],
    [/\bsliced bread\b|\btoast\b/g, 'pan'], [/\bcottage cheese\b/g, 'queso cottage'], [/\begg whites?\b/g, 'claras huevo'],
    [/\bsweet potato(es)?\b/g, 'boniato'], [/\bgreen beans?\b/g, 'judias verdes'], [/\bolive\b/g, 'aceitunas'],
    [/\bskimmed milk\b/g, 'leche desnatada'], [/\bwhole milk\b/g, 'leche entera'], [/\bmilk\b(?! chocolate)/g, 'leche semidesnatada'],
]; // i18n-ignore-end
// Palabra sola → el alimento que casi todo el mundo quiere decir («pan» = pan de barra, «atún» = lata al natural…)
const CANON = { pollo: 'pollo', pechuga: 'pollo', arroz: 'arroz', pasta: 'pasta', macarrones: 'pasta', spaghetti: 'pasta', pan: 'pan', leche: 'leche', yogur: 'yognat',
    atun: 'atun', huevo: 'huevo', aceite: 'aove', patata: 'patata', ternera: 'ternera', galleta: 'galletas', galletas: 'galletas', cerveza: 'cerveza', vino: 'vino',
    cafe: 'cafeleche', salmon: 'salmon', merluza: 'merluza', jamon: 'jamon', pavo: 'pavo', cerdo: 'cerdo', lomo: 'cerdo', avena: 'avena', ensalada: 'ensalada',
    chocolate: 'choco', zumo: 'zumo', hamburguesa: 'hamburguesacomp', tostada: 'pan', sushi: 'sushi', kebab: 'kebab', queso: 'burgos', tortilla: 'tortilla', lentejas: 'lentguisadas', garbanzos: 'garbanzos', fruta: 'manzana', pizza: 'pizza' };
// Lo mismo en inglés
Object.assign(CANON, { chicken: 'pollo', breast: 'pollo', rice: 'arroz', pasta: 'pasta', bread: 'pan', milk: 'leche', yogurt: 'yognat', yoghurt: 'yognat',
    tuna: 'atun', egg: 'huevo', eggs: 'huevo', oil: 'aove', potato: 'patata', potatoes: 'patata', beef: 'ternera', steak: 'ternera', biscuits: 'galletas', cookies: 'galletas',
    beer: 'cerveza', wine: 'vino', coffee: 'cafeleche', salmon: 'salmon', hake: 'merluza', ham: 'jamon', turkey: 'pavo', pork: 'cerdo', oats: 'avena', oatmeal: 'avena',
    salad: 'ensalada', chocolate: 'choco', juice: 'zumo', burger: 'hamburguesacomp', hamburger: 'hamburguesacomp', toast: 'pan', sushi: 'sushi', kebab: 'kebab',
    cheese: 'burgos', omelette: 'tortilla', omelet: 'tortilla', lentils: 'lentguisadas', chickpeas: 'garbanzos', fruit: 'manzana', pizza: 'pizza',
    banana: 'platano', apple: 'manzana', avocado: 'aguacate', almonds: 'almendras', water: 'agua', tea: 'te', prawns: 'gambas', shrimp: 'gambas', tofu: 'tofu' });
// Palabras que la base escribe de otra forma
const ALIAS_W = { espaguetis: 'espaguetis', spaghetti: 'espaguetis', macarrones: 'macarrones', pasta: 'espaguetis', croissant: 'cruasan', croissants: 'cruasan', donut: 'donut', donuts: 'donut', tostada: 'pan', tostadas: 'pan', hamburguesas: 'hamburguesa', bolonesa: 'bolonesa' };
// Cosas que se comen de varias en varias: sin cantidad, una ración típica (no una sola pieza)
const TYPICAL_N = { sushi: 10, nigiri: 8, gyozas: 6, croquetas: 5, churros: 4, falafel: 5, tacos: 2, empanadilla: 3, montadito: 2, galletas: 4, galletachoco: 3, alitas: 1, nuggets: 1, rollito: 2, boquerones: 1, almendras: 20, pancakes: 3, tortitas: 3 };
const COOKED_ALT = { arroz: 'arrozcocido', arrozint: 'arrozintcocido', pasta: 'pastacocida', pastaint: 'pastaintcocida', pollo: 'pollopl', pavo: 'pavopl', ternera: 'terneraplancha', salmon: 'salmonpl', merluza: 'merluzapl', gambas: 'gambaspl', patata: 'patatacocida', boniato: 'boniatoasado', quinoa: 'quinoacocida', cuscus: 'cuscuscocido', brocoli: 'brocolicocido' };
const SLOT_HINTS = [[/\b(desayun\w*|breakfast)\b/, 'B'], [/\b(almuerz\w*|media manana|mid morning)\b/, 'M'], [/\b(merend\w*|merienda|afternoon snack)\b/, 'S'], [/\b(cen\w*|dinner|supper)\b/, 'D'], [/\b(comida|al mediodia|lunch)\b/, 'L']];

const enNameOf = f => f.en || (typeof FOOD_EN !== 'undefined' && FOOD_EN[f.id]) || '';
const stem = w => w.length > 4 && w.endsWith('es') && !/[aeiou]es$/.test(w.slice(-3)) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
function tokMatch(t, w) {
    // Palabras de 1-2 letras solo valen enteras: «no» no es el principio de «Nocilla», ni «te» el de «ternera»
    if (t.length < 3) return w === t ? 3 : 0;
    if (w.startsWith(t)) return 3;
    const a = stem(t), b = stem(w);
    if (a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b))) return 2.5;
    return 0;
}
// Los alimentos que más se parecen a lo escrito (el primero es el elegido, el resto son alternativas)
function matchFoods(q, max = 6) {
    const raw = norm(q);
    const wantsCooked = /\b(cocid|hech|plancha|asad|cocinad|cooked|grilled|roast|boiled|baked)/.test(raw);
    const toks = raw.split(/[^a-z0-9ñ%-]+/).filter(t => t && !STOP.has(t));
    const alt = t => [t, (typeof SYN !== 'undefined' && SYN[t]) || t, ALIAS_W[t] || t];
    if (!toks.length) return [];
    const freq = typeof foodFreq === 'function' ? foodFreq() : {};
    const res = [];
    for (const f of FOODS) {
        const enName = enNameOf(f);
        const words = norm(`${f.name} ${enName} ${f.brand || ''} ${f.alias || ''}`).split(/[^a-z0-9ñ%-]+/).filter(Boolean);
        let score = 0, hits = 0;
        toks.forEach((t, i) => {
            const best = Math.max(0, ...alt(t).flatMap(a => words.map(w => tokMatch(a, w))));
            if (best) { score += best * (i === 0 ? 1.4 : 1); hits++; } else score -= 2;
        });
        if (!hits || !alt(toks[0]).some(a => words.some(w => tokMatch(a, w))) && hits < 2) continue;
        const nameWords = norm(f.name).split(/[^a-z0-9ñ%-]+/).filter(w => w && !STOP.has(w));
        if (tokMatch(toks[0], nameWords[0] || '')) score += 2;
        score -= Math.max(0, nameWords.length - hits) * .35;
        if (!f.brand) score += 1.2; else if (toks.some(t => norm(f.brand).includes(t))) score += 2;
        if (f.custom) score += .5;
        const canon = CANON[toks[0]] || CANON[stem(toks[0])];
        if (canon === f.id) score += toks.length === 1 ? 6 : 2.5;
        score += Math.min(2, (freq[f.id] || 0) * .5);
        const cookedName = /cocid|hech|plancha|asad/.test(norm(f.name)) || /cooked|grilled|roast|boiled|baked/.test(norm(enNameOf(f)));
        if (wantsCooked && cookedName) score += 2.5; else if (!wantsCooked && cookedName && /\b(ya cocid)/.test(norm(f.name))) score -= .5;
        res.push({ f, score });
    }
    return res.sort((a, b) => b.score - a.score || a.f.name.length - b.f.name.length).slice(0, max).map(x => x.f);
}

function unitGrams(f, unit, n) {
    const lab = re => [f.u, f.serv].find(u => u && re.test(norm(u[1])));
    const byLabel = re => { const u = lab(re); return u ? u[0] : null; };
    switch (unit) {
        case 'g': case 'ml': return n;
        case 'kg': case 'l': return n * 1000;
        case 'cl': return n * 10;
        case 'vaso': return n * (byLabel(/vaso/) || 250);
        case 'taza': return n * (f.ml ? 250 : /avena|cereal|muesli/.test(f.id) ? 50 : 250);
        case 'cda': return n * (byLabel(/cucharada|cda/) || (f.cat === 'grasa' && f.f > 90 ? 10 : 15));
        case 'cdta': return n * (byLabel(/cucharadita/) || 5);
        case 'lata': return n * (byLabel(/lata/) || (f.ml ? 330 : 80));
        case 'rebanada': return n * (byLabel(/rebanada/) || 30);
        case 'tostada': return n * (byLabel(/tostada/) || 40);
        case 'filete': return n * (byLabel(/filete|lomo/) || 125);
        case 'plato': return n * (byLabel(/plato/) || (f.raw && f.cook ? 80 : 300));
        case 'racion': return n * ((f.serv && f.serv[0]) || (f.u && f.u[0]) || f.fixed || 100);
        case 'punado': return n * (byLabel(/punado/) || 30);
        case 'unidad': return n * ((f.u && f.u[0]) || (f.serv && f.serv[0]) || 100);
        case 'loncha': return n * (byLabel(/loncha/) || 15);
        case 'botella': return n * (byLabel(/botella/) || 500);
        case 'copa': return n * (byLabel(/copa/) || 150);
        case 'cana': return n * 200;
        case 'tercio': return n * 330;
        case 'botellin': return n * 250;
        case 'onza': return n * (byLabel(/onza/) || 10);
        case 'cacito': return n * (byLabel(/cacito/) || 30);
    }
    return null;
}
function readQty(words) {
    // Devuelve { n, unit, rest } a partir de las primeras palabras
    let i = 0, n = null, unit = null;
    if (words[0] === 'un' && words[1] === 'par' && words[2] === 'de') { n = 2; i = 3; }
    else if ((words[0] === 'a' || words[0] === 'an') && words[1] === 'couple' && words[2] === 'of') { n = 2; i = 3; }
    else if (words[0] === 'half' && (words[1] === 'a' || words[1] === 'an')) { n = .5; i = 2; }
    else if ((words[0] === 'a' || words[0] === 'an') && UNIT_WORDS.some(([re]) => re.test(words[1] || ''))) { n = 1; i = 1; }
    else if (/^\d+(\.\d+)?$/.test(words[0] || '')) { n = parseFloat(words[0]); i = 1; }
    else if (/^\d+(\.\d+)?(g|gr|kg|ml|l)$/.test(words[0] || '')) { const m = words[0].match(/^(\d+(?:\.\d+)?)([a-z]+)$/); n = parseFloat(m[1]); words.splice(0, 1, m[1], m[2]); i = 1; }
    else if (NUM_WORDS[words[0]] != null) {
        n = NUM_WORDS[words[0]]; i = 1;
        // «ciento cincuenta», «doscientos cincuenta»
        if (n >= 100 && NUM_WORDS[words[1]] != null && NUM_WORDS[words[1]] < 100) { n += NUM_WORDS[words[1]]; i = 2; }
        if (words[i] === 'y' && (words[i + 1] === 'medio' || words[i + 1] === 'media')) { n += .5; i += 2; }
    }
    if (n != null) {
        const u = UNIT_WORDS.find(([re]) => re.test(words[i] || ''));
        if (u) { unit = u[1]; i++; }
        if (words[i] === 'de' || words[i] === 'of') i++;
    }
    return { n, unit, rest: words.slice(i) };
}
function parseOne(seg) {
    let words = seg.split(/\s+/).filter(Boolean);
    let q = readQty(words);
    // «pollo 200 g» / «arroz 100 gramos»
    if (q.n == null) {
        const m = seg.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(g|gr|gramos?|ml|kg|kilos?)?$/);
        if (m && m[1]) { q = { n: parseFloat(m[2]), unit: m[3] ? (/^k/.test(m[3]) ? 'kg' : m[3] === 'ml' ? 'ml' : 'g') : null, rest: m[1].split(/\s+/) }; }
    }
    let name = q.rest.join(' ').trim();
    // «3 tostadas» → pan (40 g cada una); «2 yogures» → yogur
    if (!name && q.unit === 'tostada') name = 'pan barra';
    if (!name && q.unit) { name = words[words.length - 1]; q.unit = null; }
    if (!name) return null;
    const cands = matchFoods(name);
    if (!cands.length) return { text: seg, food: null };
    let f = cands[0];
    if (/\b(cocid|hech|cooked|boiled|grilled)/.test(name) && COOKED_ALT[f.id] && getFood(COOKED_ALT[f.id])) f = getFood(COOKED_ALT[f.id]);
    let g, est = false, n = null, u = null;
    if (q.n != null && q.unit) g = unitGrams(f, q.unit, q.n);
    else if (q.n != null && !q.unit) {
        const cu = f.u || (f.serv && !/racion/.test(norm(f.serv[1])) ? f.serv : null);
        // «medio aguacate»: la ración es medio, así que la pieza entera vale el doble
        if (cu && q.n < 20) { const half = /^medi/.test(norm(cu[1])); g = (half ? cu[0] * 2 : cu[0]) * q.n; n = q.n; u = half ? null : cu; }
        else if (q.n >= 20) g = q.n;
        else { const d = defaultPortion(f); g = d.g * q.n; est = true; }
    } else {
        const d = defaultPortion(f), k = TYPICAL_N[f.id] || 1; g = d.g * k; est = true;
        if (d.unit.key !== 'g') { n = d.n * k; u = [d.unit.g, d.unit.label, d.unit.plural]; }
    }
    if (!g || g <= 0 || g > 5000) return { text: seg, food: null };
    if (!u && f.u && Math.abs(g / f.u[0] - Math.round(g / f.u[0])) < .01 && g >= f.u[0]) { u = f.u; n = Math.round(g / f.u[0]); }
    const alts = [COOKED_ALT[f.id], ...cands.map(x => x.id)].filter((id, i, a) => id && id !== f.id && getFood(id) && a.indexOf(id) === i).slice(0, 5);
    return { text: seg, food: f, g: Math.round(g * 10) / 10, n, u, est, alts };
}
// Texto libre → lista de alimentos con cantidades
function parseFoodText(text) {
    let s = norm(String(text || '')).replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)\s*(g|gr|ml|kg)\b/g, '$1 $2');
    let slot = null;
    for (const [re, k] of SLOT_HINTS) if (re.test(s)) { slot = k; break; }
    // Lo negado no se ha comido: «no tengo pollo», «no he cenado nada», «ni pan» (hasta la coma o el punto)
    s = s.replace(/\b(no|ni|nada de|not|never)\b[^,;.\n]*/g, ' , ');
    s = s.replace(/\b(tengo|tenemos|hay|me queda|me quedan|en (la|mi) nevera|en casa)\b/g, ' , ')
        .replace(/\b(me he|he|hemos|acabo de|voy a|quiero|para)\s+(comido|tomado|bebido|desayunado|cenado|merendado|almorzado|picado|comer|tomar|cenar|desayunar|merendar)\b/g, ' , ')
        .replace(/\b(de|en el|en la|para)\s+(desayuno|comida|cena|merienda|almuerzo)\b/g, ' , ')
        .replace(/\b(desayuno|comida|cena|merienda|almuerzo|hoy|esta manana|esta tarde|esta noche|anoche)\b\s*:?/g, ' , ')
        // Inglés: lo mismo («I have / I ate / for dinner / in the fridge…»)
        .replace(/\bi (have|ve) got\b|\bi have\b|\bthere (is|are)\b|\bin (the|my) (fridge|freezer|pantry)\b|\bat home\b/g, ' , ')
        .replace(/\bi\s*(?:just\s+|already\s+)?(ate|had|have eaten|drank|have had|am going to eat|want|will have)\b/g, ' , ')
        .replace(/\bfor (breakfast|lunch|dinner|supper|my snack)\b/g, ' , ')
        .replace(/\b(breakfast|lunch|dinner|supper|snack|today|this morning|this afternoon|tonight|last night)\b\s*:?/g, ' , ');
    PHRASES.forEach(([re, rep]) => { s = s.replace(re, rep); });
    PHRASES_EN.forEach(([re, rep]) => { s = s.replace(re, rep); });
    const parts = s.split(/\s*(?:,|;|\+|\.\s|\n|\by\b|\be\b|\bmas\b|\bademas\b|\bjunto con\b|\btambien\b|\band\b|\bplus\b|\balong with\b|\bas well as\b)\s*/).map(x => x.trim()).filter(Boolean);
    const items = [], unknown = [];
    for (const part of parts) {
        // «pollo con arroz» = dos cosas; «café con leche» o «arroz con leche» = una
        const whole = /\bcon\b|\bwith\b/.test(part) ? parseOne(part) : null;
        const wn = whole && whole.food ? norm(whole.food.name).replace(/\s*\(.*?\)/g, '') : '';
        // Solo si el orden coincide: «arroz con pollo» es el plato; «pollo con arroz» son dos cosas
        const sep = / con /.test(wn) ? ' con ' : ' with ';
        const parts2 = wn.split(sep), keys = parts2.map(w => w.trim().split(' ').pop()), pos = keys.map(k => part.indexOf(k));
        const keepWhole = new RegExp('[a-z]' + sep + '[a-z]').test(wn) && pos.every(p => p >= 0) && pos.every((p, i) => !i || p > pos[i - 1]);
        const pieces = keepWhole ? [part] : part.split(/\s+(?:con|with)\s+/);
        for (const pc of pieces) {
            const r = parseOne(pc.trim());
            if (!r) continue;
            if (r.food) items.push(r); else if (r.text.replace(/\W/g, '').length > 2) unknown.push(r.text);
        }
    }
    return { items, unknown, slot };
}
// De un plato servido (foto) se ven gramos ya cocinados: se usa el alimento «ya cocido» si existe
const cookedFood = f => (COOKED_ALT[f.id] && getFood(COOKED_ALT[f.id])) || f;

