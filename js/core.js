// FitDL · Núcleo: configuración, estado, guardado, utilidades y nutrientes
'use strict';

// =====================================================================
//  CONFIGURACIÓN
// =====================================================================
const KCAL_PER_KG = 7700;
const STORAGE_KEY = 'nutridl_v2';
const PROFILES_KEY = 'nutridl_profiles';
const APP_VERSION = '3.27.0';
const ERR_KEY = 'nutridl_errors', USAGE_KEY = 'nutridl_usage';
// Estado de la persona activa (se guarda en su perfil)
const DEFAULT_STATE = {
    gender: 'female', age: 0, weight: 0, height: 0, calcOk: false, activity: 1.375, goal: -0.20, strategy: 'highprotein',
    goalWeight: '', customFoods: [], weights: [], measures: [], meals: [], tab: 'home',
    gym: { level: 'beginner', days: 3, eq: 'gym' }, workouts: [], diary: {},
    // 3.0: preferencias para «¿Qué como?», menú del día, lista de la compra, logros y conversación con el Coach
    prefs: { diet: 'omni', allergies: [], dislikes: [], meals: 4, budget: 'normal', pantry: [] }, menu: null, shop: null, ach: {}, cel: {}, chat: [],
    // 3.10: qué «momentos» (resumen semanal, racha en peligro…) ya se han enseñado, para no repetirlos
    moments: {},
};
let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
let calc = {};
// Seguridad: nadie puede meter nutriDL dentro de su web (clickjacking). GitHub Pages no deja poner
// cabeceras y «frame-ancestors» no vale dentro de una etiqueta <meta>, así que se comprueba aquí.
// Las apps de tienda (TWA, Capacitor) no son marcos: no les afecta.
(function () {
    try {
        if (window.top === window.self) return;
        document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.innerHTML = '<body style="margin:0;background:#110f0d;color:#f5f5f4;font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><div style="padding:24px"><p><strong>FitDL</strong> no se puede usar dentro de otra web.<br>FitDL can’t be used inside another website.</p><p><a href="https://trbsaldl.github.io/FitDL/" target="_blank" rel="noopener" style="color:#5eead4">Abrir FitDL</a></p></div></body>'; // i18n-ignore (pantalla de emergencia, en los dos idiomas)
        });
    } catch (e) { }
})();
// Los errores se guardan solo en este dispositivo (últimos 30) para el «Informe de errores»
// Antes de guardarlo se limpia: sin correos, teléfonos, números largos ni texto entre comillas (podría ser lo que escribiste)
const scrubLog = m => String(m).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo]').replace(/\+?\d[\d\s-]{7,}\d/g, '[número]') // i18n-ignore (registro interno)
    .replace(/(["'«])[^"'»]{3,}(["'»])/g, '$1…$2').replace(/https?:\/\/[^\s)]+/g, u => u.split('?')[0]).slice(0, 300);
function logErr(m) { try { const L = JSON.parse(localStorage.getItem(ERR_KEY) || '[]'); L.push({ t: new Date().toISOString(), m: scrubLog(m), v: APP_VERSION }); localStorage.setItem(ERR_KEY, JSON.stringify(L.slice(-30))); } catch (e) { } }
// Cierres inesperados: al abrir se marca «en marcha»; al salir bien (cambiar de app, cerrar), «cerrada bien».
// Si al volver a abrir seguía «en marcha», la última vez se cerró de golpe (fallo o falta de memoria) y se anota.
const RUN_KEY = 'nutridl_run';
(function watchCrashes() {
    try {
        const prev = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
        if (prev && prev.open && Date.now() - prev.t < 7 * 864e5) logErr(`Cierre inesperado detectado (versión ${prev.v}, ${new Date(prev.t).toISOString().slice(0, 16)})`); // i18n-ignore (registro interno)
        const mark = open => { try { localStorage.setItem(RUN_KEY, JSON.stringify({ open, t: Date.now(), v: APP_VERSION })); } catch (e) { } };
        mark(true);
        addEventListener('pagehide', () => mark(false));
        document.addEventListener('visibilitychange', () => mark(document.visibilityState === 'visible'));
    } catch (e) { }
})();
window.addEventListener('error', e => /ResizeObserver loop/.test(e.message || '') || logErr(`${e.message} @ ${String(e.filename || '').split('/').pop()}:${e.lineno || 0}`));
window.addEventListener('unhandledrejection', e => logErr('Promesa: ' + ((e.reason && e.reason.message) || e.reason)));
let profiles = { current: null, list: {} }; // list[id] = { name, created, state }

const $ = id => document.getElementById(id);
const fmt = (n, d = 0) => Number(n).toLocaleString(typeof locale === 'function' ? locale() : 'es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Iconos de línea en lugar de emojis en toda la app (los emojis se veían infantiles).
// Las claves van sin el selector de variante (U+FE0F): icon() lo quita antes de buscar.
const EMOJI_IC = {
    '🔥': 'fa-fire', '🔄': 'fa-arrows-rotate', '⚖': 'fa-scale-balanced', '🧘': 'fa-spa', '🥩': 'fa-drumstick-bite', '💪': 'fa-dumbbell', '💡': 'fa-lightbulb',
    '🎯': 'fa-bullseye', '🍽': 'fa-utensils', '☀': 'fa-sun', '📈': 'fa-arrow-trend-up', '📉': 'fa-arrow-trend-down', '🏆': 'fa-trophy',
    '🥗': 'fa-leaf', '💧': 'fa-droplet', '😴': 'fa-moon', '⭐': 'fa-star', '🎉': 'fa-champagne-glasses', '🌱': 'fa-seedling',
    '👩': 'fa-venus', '👨': 'fa-mars', '🛋': 'fa-couch', '🚶': 'fa-person-walking', '🏃': 'fa-person-running', '🏋': 'fa-dumbbell',
    '⛏': 'fa-helmet-safety', '🍗': 'fa-drumstick-bite', '🐟': 'fa-fish', '🥚': 'fa-egg', '🥪': 'fa-bread-slice', '🍎': 'fa-apple-whole',
    '🏅': 'fa-medal', '👑': 'fa-crown', '📏': 'fa-ruler', '🔒': 'fa-lock', '🛒': 'fa-cart-shopping', '🍚': 'fa-bowl-rice',
    '🥛': 'fa-glass-water', '🥦': 'fa-carrot', '❤': 'fa-heart', '🚫': 'fa-ban', '✏': 'fa-pen', '🥫': 'fa-jar', '🧂': 'fa-mortar-pestle',
    '🍫': 'fa-cookie', '🥤': 'fa-bottle-water', '☕': 'fa-mug-hot', '🍺': 'fa-beer-mug-empty', '🍷': 'fa-wine-glass', '🧊': 'fa-snowflake', '🔔': 'fa-bell',
};
const icon = (e, cls = '') => { const k = String(e || '').replace(/️/g, ''); return EMOJI_IC[k] ? `<i class="fa-solid ${EMOJI_IC[k]} ${cls}" aria-hidden="true"></i>` : esc(e || ''); };

// =====================================================================
//  PERSISTENCIA
// =====================================================================
// Guardar sin perder nada: si el almacenamiento está lleno se sacrifican primero las copias automáticas
// (la más antigua antes), nunca los datos de verdad. Si aun así no cabe, se avisa una vez (antes fallaba en silencio).
let storeWarned = false;
function storeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) {
        try {
            const AK = 'nutridl_autobackup', L = JSON.parse(localStorage.getItem(AK) || '[]');
            while (Array.isArray(L) && L.length) {
                L.pop();
                if (L.length) localStorage.setItem(AK, JSON.stringify(L)); else localStorage.removeItem(AK);
                try { localStorage.setItem(key, val); return true; } catch (e2) { }
            }
        } catch (e3) { }
        logErr('No se pudo guardar (' + key + '): ' + e.message); // i18n-ignore (registro interno)
        if (!storeWarned && typeof toast === 'function') { storeWarned = true; toast('No queda espacio para guardar en este dispositivo. Guarda una copia de seguridad (menú del perfil) para no perder datos.'); }
        return false;
    }
}
function save() {
    if (profiles.current && profiles.list[profiles.current]) {
        profiles.list[profiles.current].state = state;
        return storeSet(PROFILES_KEY, JSON.stringify(profiles));
    }
    return storeSet(STORAGE_KEY, JSON.stringify(state));
}
function load() {
    try {
        try { profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || 'null') || profiles; }
        catch (e) {
            // Datos ilegibles: se apartan tal cual ANTES de que nada los pise, para poder recuperarlos
            try { const raw = localStorage.getItem(PROFILES_KEY); if (raw && !localStorage.getItem(PROFILES_KEY + '_rescate')) localStorage.setItem(PROFILES_KEY + '_rescate', raw); } catch (e2) { }
            logErr('Datos de perfiles ilegibles: copia apartada en ' + PROFILES_KEY + '_rescate'); // i18n-ignore (registro interno)
        }
        if (!profiles || typeof profiles !== 'object' || !profiles.list || typeof profiles.list !== 'object') profiles = { current: null, list: {} };
        const cur = profiles.current && profiles.list[profiles.current];
        const s = cur ? cur.state : JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (s && typeof s === 'object') state = mergeState(s);
        if (cur) cur.state = state;
    } catch (e) { }
    syncCustomFoods();
}
// Los productos de marca (3.618) se cargan aparte y DESPUÉS de que la app esté en pantalla:
// la primera pantalla aparece antes y no falta ningún alimento. Si abres el buscador o el escáner
// antes de tiempo, se piden ya mismo; cuando llegan, marcasListas() repite la búsqueda abierta.
let marcasPedidas = false;
function cargarMarcas() {
    if (marcasPedidas || typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="fitdl-marcas"]');
    if (!meta || !meta.content) return;
    marcasPedidas = true;
    const sc = document.createElement('script');
    sc.src = meta.content;
    sc.onerror = () => {
        marcasPedidas = false;
        logErr('No se pudieron cargar los productos de marca'); // i18n-ignore (registro interno)
    };
    document.head.appendChild(sc);
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const pedir = () => (window.requestIdleCallback ? requestIdleCallback(cargarMarcas, { timeout: 1500 }) : setTimeout(cargarMarcas, 1));
    if (document.readyState === 'complete') pedir(); else window.addEventListener('load', pedir, { once: true });
}
function registerCustom(cf) {
    if (FOODS.some(f => f.id === cf.id)) return;
    FOODS.push(cf);
}
// Cada perfil ve solo SUS alimentos personalizados (antes se quedaban los del perfil anterior al cambiar)
function syncCustomFoods() {
    const mine = new Set((state.customFoods || []).map(cf => cf.id));
    for (let i = FOODS.length - 1; i >= 0; i--) if (FOODS[i].custom && !mine.has(FOODS[i].id)) FOODS.splice(i, 1);
    (state.customFoods || []).forEach(registerCustom);
}

// =====================================================================
//  ALIMENTOS: búsqueda por id y texto sin tildes
// =====================================================================
const getFood = id => FOODS.find(f => f.id === id);
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// =====================================================================
//  NUTRIENTES (kcal y macros de una cantidad)
// =====================================================================
// Energía por 100 g: Atwater 4/9/4, fibra 2 kcal/g y alcohol 7 kcal/g (Reglamento UE 1169/2011)
function kcal100(f) { if (f.kcal != null) return f.kcal; return 4 * f.p + 9 * f.f + 4 * f.c + 2 * f.fib + 7 * (f.alc || 0); }
function macrosOf(food, g) {
    const k = g / 100;
    const m = { p: food.p * k, f: food.f * k, c: food.c * k, fib: food.fib * k, kcal: kcal100(food) * k };
    if (food.sug != null) m.sug = food.sug * k; // azúcares: solo si la fuente los da
    return m;
}

// =====================================================================
//  UTILIDADES
// =====================================================================
// Añadido: micro-animaciones (WAAPI, solo transform/opacity/filter, curva ease-out fuerte)
function ndAnim(el, frames, ms) {
    if (!el || !el.animate) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.animate(reduce ? [{ opacity: 0.4 }, { opacity: 1 }] : frames, { duration: reduce ? 150 : ms, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
}
let toastTimer;
function toast(msg) {
    const t = $('toast'); t.innerText = typeof tr === 'function' ? tr(msg) : msg; t.style.pointerEvents = ''; undoFn = null;
    t.style.opacity = '1'; t.style.transform = 'translate(-50%, 0)';
    clearTimeout(toastTimer);
    t.style.transitionDuration = '';
    // Los avisos largos se quedan más tiempo para que dé tiempo a leerlos (hasta 7 s)
    toastTimer = setTimeout(() => { t.style.transitionDuration = '.18s'; t.style.opacity = '0'; t.style.transform = 'translate(-50%, 10px)'; }, Math.min(7000, 2600 + Math.max(0, t.innerText.length - 60) * 40));
}

function update() {
    renderStaticToggles(); applyCalcLock();
    const ok = calcReady();
    $('sec-resultados').classList.toggle('calc-pending', !ok);
    $('goal-block').classList.toggle('hidden', !ok);
    if (!ok) {
        calc = {};
        renderGym(); renderDiary(); renderDashboard(); updateSticky();
        save();
        return;
    }
    compute();
    renderResults();
    renderGym();
    if ($('diary-summary')) renderDiary();
    if ($('dashboard')) renderDashboard();
    save();
}

// =====================================================================
//  AÑADIDO: EMOJIS (solo para los elementos nuevos)
// =====================================================================
const EMOJI = {
    pollo: '🍗', pavo: '🦃', ternera: '🥩', picada: '🍔', cerdo: '🥩', salmon: '🐟', merluza: '🐟', atun: '🥫', gambas: '🦐',
    huevo: '🥚', claras: '🥚', jamon: '🍖', fiambre: '🥪', skyr: '🥛', yogdes: '🥛', yoggr: '🥛', batido: '🥛', cottage: '🧀',
    burgos: '🧀', curado: '🧀', leche: '🥛', bebsoja: '🥛', whey: '💪', guisante: '💪', tofu: '🌱', tempeh: '🌱', seitan: '🌱',
    sojatex: '🌱', lentejas: '🫘', garbanzos: '🫘', alubias: '🫘', hummus: '🥙', arroz: '🍚', arrozint: '🍚', pasta: '🍝',
    pastaint: '🍝', quinoa: '🌾', cuscus: '🌾', patata: '🥔', boniato: '🍠', avena: '🥣', panint: '🍞', pan: '🥖', tortitas: '🍘',
    wrap: '🌯', cereales: '🥣', aove: '🫒', aguacate: '🥑', almendras: '🌰', nueces: '🌰', cacahuete: '🥜', chia: '🌱',
    choco: '🍫', aceitunas: '🫒', platano: '🍌', manzana: '🍎', naranja: '🍊', fresas: '🍓', arandanos: '🫐', kiwi: '🥝',
    pera: '🍐', pina: '🍍', mango: '🥭', brocoli: '🥦', espinacas: '🥬', calabacin: '🥒', ensalada: '🥗', judias: '🫛',
    pimiento: '🫑', champi: '🍄', coliflor: '🥦', esparragos: '🌿', menestra: '🥕', tomate: '🍅',
    muslo: '🍗', hamburguesa: '🍔', conejo: '🥩', jamoncocido: '🥪', chorizo: '🌭', salchichas: '🌭', dorada: '🐟', sardinas: '🐟', atunaceite: '🥫', caballa: '🐟',
    calamares: '🦑', mejillones: '🦪', lechentera: '🥛', lechedes: '🥛', yognat: '🥛', yogsab: '🍦', kefir: '🥛', mozzarella: '🧀', quesolonchas: '🧀',
    panmolde: '🍞', biscotes: '🍞', galletas: '🍪', muesli: '🥣', arrozcocido: '🍚', pastacocida: '🍝', gnocchi: '🍝', tortilla: '🍳', paella: '🥘', pizza: '🍕',
    croquetas: '🧆', ensaladilla: '🥗', lentguisadas: '🍲', gazpacho: '🍅', patatasbolsa: '🥔', patatasfritas: '🍟', uvas: '🍇', sandia: '🍉', melon: '🍈',
    melocoton: '🍑', mandarina: '🍊', cerezas: '🍒', zumo: '🧃', zanahoria: '🥕', berenjena: '🍆', pepino: '🥒', alcachofas: '🥬', guisantes: '🫛', repollo: '🥬',
    cebolla: '🧅', pistachos: '🥜', anacardos: '🥜', pipas: '🌻', mantequilla: '🧈', mayonesa: '🥚', girasol: '🌻', chocoleche: '🍫', cola: '🥤', colazero: '🥤',
    cerveza: '🍺', vino: '🍷', cafeleche: '☕', colacao: '🥛', azucar: '🍬'
};
// Icono de cada alimento: un glifo de línea según lo que es (sin emojis). Primero por palabras del id/nombre, luego por categoría.
const FOOD_IC_RULES = [
    [/pizza/, 'fa-pizza-slice'], [/hamburgues|burger/, 'fa-burger'], [/perrito|hotdog/, 'fa-hotdog'], [/helado|yogsab/, 'fa-ice-cream'],
    [/sushi|nigiri|sashimi|poke|maki/, 'fa-fish'], [/gamba|calamar|mejill|pulpo|marisc|langost|sepia/, 'fa-shrimp'],
    [/salmon|merluza|atun|dorada|sardin|caballa|bacalao|boquer|lubina|pescad|trucha|rape|ceviche/, 'fa-fish'],
    [/huevo|claras|tortilla|revuelto/, 'fa-egg'], [/jamon|fiambre|chorizo|salchich|lomo embuchado|bacon|beicon|secreto|costilla/, 'fa-bacon'],
    [/queso|mozzarella|burgos|cottage|curado|parmesano/, 'fa-cheese'],
    [/cafe|cortado|capuchino|^te\b|infusion|chocolatetaza|colacao/, 'fa-mug-hot'], [/cerveza/, 'fa-beer-mug-empty'],
    [/vino|tinto|sangria|cava/, 'fa-wine-glass'], [/gintonic|vermut|copa|cubata/, 'fa-martini-glass-citrus'],
    [/cola|aquarius|refresco|naranjada|teefrio|zumo|isoton|bebidaprot/, 'fa-bottle-water'],
    [/tarta|brownie|galleta|cookie|croissant|napolitana|ensaimada|churro|donut|bolleria|gofre|crepe|pancake|magdalena|bizcocho|choco|azucar|tiramisu|barrita/, 'fa-cookie'],
    [/bocadillo|boca|sandw|montadito|pan|tostada|biscote|bagel|wrap|durum|kebab|burrito|taco|fajita|pita/, 'fa-bread-slice'],
    [/arroz|paella|risotto|fideua|sushi/, 'fa-bowl-rice'], [/pasta|espagueti|macarron|gnocchi|carbonara|bolonesa|pesto|lasana|ramen|fideo|padthai/, 'fa-bowl-food'],
    [/naranja|mandarina|limon|pomelo/, 'fa-lemon'], [/pimiento|guindilla|chili|padron/, 'fa-pepper-hot'],
    [/ensalada|lechuga|espinaca|canonigo|rucula|acelga|kale/, 'fa-leaf'], [/aceite|aove|mantequilla/, 'fa-droplet'],
    [/almendra|nuez|nueces|cacahuete|pistacho|anacardo|avellana|frutossecos|pipas|semilla|chia/, 'fa-seedling'],
    [/pollo|pavo|pechuga|ternera|vacuno|cerdo|cordero|conejo|pato|codorniz|carne|lomo|solomillo|chuleta|higado|lengua|mortadela|chopped|salchich|fuet|sobrasada/, 'fa-drumstick-bite'],
    [/whey|protein|proteina en polvo|caseina|isolate/, 'fa-dumbbell'], [/spaghetti|cous ?cous/, 'fa-bowl-food'],
    [/quesito|havarti|gouda|edam|emmental|brie|feta/, 'fa-cheese'], [/surimi/, 'fa-fish'],
    [/cacao|excellence|oreo|kitkat|kinder|pringles/, 'fa-cookie'], [/red bull|monster|energy|isotonic/, 'fa-bottle-water'],
    [/oikos|activia|yopro|danone|arla|actimel/, 'fa-jar'], [/special k|fitness|kellogg/, 'fa-wheat-awn'], [/margarina/, 'fa-droplet'],
    [/pipa|frutos secos|coctel/, 'fa-seedling'], [/lonchas vegetarianas|vegalia/, 'fa-seedling'],
    [/leche|bebida|kefir|batido|horchata|latte|caldo/, 'fa-glass-water'], [/yogur|skyr|natillas|flan|postre|cuajada|gelatina|mousse|pudin|pudding|quark|nata/, 'fa-jar'],
    [/cereal|muesli|granola|copos|avena|corn ?flakes|espelta|harina|quinoa|bulgur|cuscus|mijo|cebada|maiz|palomitas/, 'fa-wheat-awn'],
    [/lenteja|garbanzo|alubia|judia|soja|tofu|tempeh|seitan|hummus|edamame|guisante|haba|altramuz/, 'fa-seedling'],
    [/salsa|ketchup|mayonesa|mostaza|alioli|allioli|tomate frito|vinagre|tsatsiki|guacamole/, 'fa-bottle-droplet'],
    [/miel|mermelada|confitura|sirope|crema de cacao|nocilla|nutella|tahini|panela/, 'fa-jar'],
    [/patata|boniato|yuca|gnocchi|nachos|tortitas|crackers|picos|regana/, 'fa-bowl-food'],
    [/manzana|pera|platano|fresa|arandano|frambuesa|mora|uva|melocoton|cereza|kiwi|pina|mango|melon|sandia|higo|datil|ciruela|orejon|pasas|fruta|macedonia|coco/, 'fa-apple-whole'],
    [/brocoli|coliflor|calabac|berenjena|zanahoria|pepino|cebolla|puerro|champi|seta|esparrago|alcachofa|col |repollo|lombarda|remolacha|rabano|apio|hinojo|verdura|pisto|gazpacho|salmorejo|crema de/, 'fa-carrot'],
];
const FOOD_IC_CAT = { prot: 'fa-drumstick-bite', vprot: 'fa-seedling', lacteo: 'fa-glass-water', hc: 'fa-wheat-awn', legum: 'fa-seedling', grasa: 'fa-droplet', fruta: 'fa-apple-whole', verdura: 'fa-carrot', bebida: 'fa-glass-water', platos: 'fa-bowl-food' };
function foodIcon(f) {
    if (!f) return 'fa-utensils';
    if (f._ic) return f._ic;
    const k = (String(f.id || '') + ' ' + norm(f.name || '')).toLowerCase();
    const r = FOOD_IC_RULES.find(([re]) => re.test(k));
    const ic = r ? r[1] : f.fast ? 'fa-burger' : FOOD_IC_CAT[f.cat] || (f.brand || String(f.id).startsWith('b_') ? 'fa-barcode' : 'fa-utensils');
    try { Object.defineProperty(f, '_ic', { value: ic, enumerable: false, configurable: true }); } catch (e) { }
    return ic;
}
// Mensajes guardados de versiones anteriores: sus emojis se muestran como iconos (o se quitan)
const EMOJI_RE = /(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}](?:️)?(?:‍[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}](?:️)?)*)/gu;
let EMOJI_FOOD = null; // emoji antiguo de un alimento → id del alimento
function deEmoji(html) {
    if (!EMOJI_FOOD) { EMOJI_FOOD = {}; Object.entries(EMOJI).forEach(([id, e]) => { const k = e.replace(/️/g, ''); if (!EMOJI_FOOD[k]) EMOJI_FOOD[k] = id; }); }
    return String(html || '').replace(EMOJI_RE, e => {
        const k = e.replace(/️/g, '');
        const f = EMOJI_FOOD[k] && typeof getFood === 'function' && getFood(EMOJI_FOOD[k]);
        if (f) return emo(f);
        return EMOJI_IC[k] ? icon(k, 'text-mint-400') : '';
    });
}
// Línea de macros con su punto de color: P (proteína) · HC (hidratos) · G (grasa)
const macroLine = (p, c, f) => `<span class="nd-m nd-m-p">${tr('P')} ${fmt(p || 0)}</span> <span class="nd-m nd-m-c">${tr('HC')} ${fmt(c || 0)}</span> <span class="nd-m nd-m-f">${tr('G')} ${fmt(f || 0)}</span>`;
const emo = f => `<span class="nd-fi" aria-hidden="true"><i class="fa-solid ${foodIcon(f)}"></i></span>`;

// =====================================================================
//  GRÁFICA DE LÍNEAS (peso, progreso del gym)
//  Se dibuja al ancho real del contenedor: en el móvil la letra y los puntos se ven a tamaño normal
//  o = { points: [{ x, y, tip }], line: [{ x, y }], goal: { y, label }, xLabels: [izq, dcha], legend, dec, unit }
// =====================================================================
function lineChart(el, o) {
    if (!el || !o.points.length) return;
    const draw = () => {
        const W = Math.max(260, Math.round(el.clientWidth || 600)), H = W < 480 ? 230 : 250;
        const L = 46, R = 16, T = 34, B = 30, dec = o.dec ?? 1;
        const ys = o.points.map(p => p.y).concat((o.line || []).map(p => p.y), o.goal ? [o.goal.y] : []);
        let mn = Math.min(...ys), mx = Math.max(...ys);
        const padY = Math.max((mx - mn) * 0.15, o.minPad ?? 0.5); mn -= padY; mx += padY;
        const xs = o.points.map(p => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
        const X = x => L + (W - L - R) * (x1 > x0 ? (x - x0) / (x1 - x0) : 0.5);
        const Y = y => T + (H - T - B) * (1 - (y - mn) / (mx - mn));
        const grid = [0, 0.5, 1].map(f => { const v = mn + (mx - mn) * f, y = Y(v).toFixed(1); return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#2e2e2e"/><text x="${L - 8}" y="${(+y + 4).toFixed(1)}" font-size="12" fill="#aea396" text-anchor="end">${fmt(v, dec)}</text>`; }).join('');
        const line = o.line && o.line.length > 1 ? `<polyline points="${o.line.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}" fill="none" stroke="#c49a6c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : '';
        const goal = o.goal && o.goal.y > mn && o.goal.y < mx ? `<line x1="${L}" x2="${W - R}" y1="${Y(o.goal.y).toFixed(1)}" y2="${Y(o.goal.y).toFixed(1)}" stroke="#f59e0b" stroke-dasharray="6 5"/><text x="${W - R}" y="${(Y(o.goal.y) - 6).toFixed(1)}" font-size="12" fill="#f59e0b" font-weight="700" text-anchor="end">${o.goal.label}</text>` : '';
        const r = W < 480 ? 4.5 : 4;
        const dots = o.points.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r}" fill="${o.dotColor || '#dcc19c'}"><title>${p.tip || ''}</title></circle>`).join('');
        el.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || tr('Gráfica')}" style="display:block">
            <text x="${L}" y="16" font-size="12" fill="#c49a6c" font-weight="700">${o.legend || ''}</text>
            ${grid}${goal}${line}${dots}
            <text x="${L}" y="${H - 8}" font-size="12" fill="#aea396">${(o.xLabels || [])[0] || ''}</text>
            <text x="${W - R}" y="${H - 8}" font-size="12" fill="#aea396" text-anchor="end">${(o.xLabels || [])[1] || ''}</text>
        </svg>`;
    };
    el._draw = draw; draw();
    if (!el._ro && window.ResizeObserver) {
        let w = el.clientWidth;
        el._ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 8) { w = el.clientWidth; requestAnimationFrame(el._draw); } });
        el._ro.observe(el);
    }
}
