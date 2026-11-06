// nutriDL · Motor de comidas: «¿Qué como?», menú del día, recetas y lista de la compra
// Todo se calcula en el dispositivo con la base de alimentos (USDA / BEDCA): nada se inventa ni se envía.
'use strict';

// =====================================================================
//  PREFERENCIAS (dieta, alergias, alimentos que no gustan, nº de comidas, presupuesto, despensa)
// =====================================================================
const DIETS = { omni: tk('Como de todo'), pesc: tk('Pescetariana'), veg: tk('Vegetariana'), vegan: tk('Vegana') };
const EGG_IDS = new Set(['huevo', 'claras', 'tortilla', 'huevofrito', 'revuelto', 'tortillafr', 'mayonesa', 'flan']);
const NUT_IDS = new Set(['almendras', 'nueces', 'cacahuete', 'pistachos', 'anacardos', 'avellanas', 'cacahuetes', 'macadamia', 'cremaalmendra', 'cremacacao']);
const SOY_IDS = new Set(['tofu', 'tempeh', 'bebsoja', 'sojatex', 'edamame', 'soja', 'salsasoja']);
const SHELL_IDS = new Set(['gambas', 'mejillones', 'calamares', 'almejas', 'pulpo', 'sepia', 'surimi', 'calamaresrom']);
const ALLERGENS = {
    gluten: [tk('Gluten'), f => /G/.test(f.flags || '')],
    lactosa: [tk('Lactosa'), f => /L/.test(f.flags || '')],
    huevo: [tk('Huevo'), f => EGG_IDS.has(f.id)],
    frutos: [tk('Frutos secos'), f => NUT_IDS.has(f.id)],
    pescado: [tk('Pescado'), f => /P/.test(f.flags || '') && !SHELL_IDS.has(f.id)],
    marisco: [tk('Marisco'), f => SHELL_IDS.has(f.id)],
    soja: [tk('Soja'), f => SOY_IDS.has(f.id)],
};
const EXPENSIVE = new Set(['salmon', 'gambas', 'dorada', 'ternera', 'tempeh', 'quinoa', 'atunfresco', 'entrecot']);
const DEFAULT_PREFS = { diet: 'omni', allergies: [], dislikes: [], meals: 4, budget: 'normal', pantry: [] };
function myPrefs() {
    const p = state.prefs = { ...DEFAULT_PREFS, ...(state.prefs || {}) };
    ['allergies', 'dislikes', 'pantry'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
    if (![3, 4, 5].includes(p.meals)) p.meals = 4;
    return p;
}
function dietOk(f, diet) {
    const fl = f.flags || '';
    if (diet === 'omni') return true;
    if (/M/.test(fl)) return false;
    if (diet === 'pesc') return true;
    if (/P/.test(fl)) return false;
    if (diet === 'veg') return true;
    return /N/.test(fl);
}
function foodOk(f, p = myPrefs()) {
    if (!f || !dietOk(f, p.diet)) return false;
    if (p.allergies.some(a => ALLERGENS[a] && ALLERGENS[a][1](f))) return false;
    return !p.dislikes.includes(f.id);
}

// =====================================================================
//  REPARTO DEL DÍA ENTRE COMIDAS
// =====================================================================
const SLOT_SHARE = { 3: { B: .30, L: .40, D: .30 }, 4: { B: .25, L: .35, S: .12, D: .28 }, 5: { B: .22, M: .10, L: .33, S: .10, D: .25 } };
const SLOT_ORDER = ['B', 'M', 'L', 'S', 'D', 'X'];
const SLOT_NAME = { B: tk('Desayuno'), M: tk('Media mañana'), L: tk('Comida'), S: tk('Merienda'), D: tk('Cena'), X: tk('Otros') };
const planSlots = () => Object.keys(SLOT_SHARE[myPrefs().meals]);

// Lo que queda hoy y cuánto toca en la próxima comida (las comidas ya pasadas sin apuntar se dan por saltadas)
function nextMeal(date = todayISO(), hour = new Date().getHours()) {
    if (!calc.target) return null;
    const t = diaryTotals(date), entries = state.diary[date] || [];
    const R = { kcal: calc.target - t.kcal, p: calc.prot - t.p, f: calc.fat - t.f, c: calc.carbs - t.c };
    const logged = new Set(entries.map(e => e.slot));
    const share = SLOT_SHARE[myPrefs().meals];
    const nowIdx = date === todayISO() ? SLOT_ORDER.indexOf(slotForHour(hour)) : 0;
    let slots = planSlots().filter(s => !logged.has(s) && SLOT_ORDER.indexOf(s) >= nowIdx);
    if (!slots.length && R.kcal > 150) slots = [SLOT_ORDER.indexOf('S') >= nowIdx && share.S ? 'S' : 'X'];
    if (!slots.length) return { R, slot: null, tg: null, slots: [] };
    const sum = slots.reduce((a, s) => a + (share[s] || .12), 0);
    const k = (share[slots[0]] || .12) / sum;
    const tg = { kcal: Math.max(0, R.kcal * k), p: Math.max(8, R.p * k), f: Math.max(4, R.f * k), c: Math.max(5, R.c * k) };
    return { R, slot: slots[0], tg, slots };
}
function slotForHour(h) { return h < 11 ? 'B' : h < 13 ? 'M' : h < 16 ? 'L' : h < 19 ? 'S' : 'D'; }
function dayTargets() {
    const share = SLOT_SHARE[myPrefs().meals];
    return Object.fromEntries(Object.entries(share).map(([s, k]) => [s, { kcal: calc.target * k, p: calc.prot * k, f: calc.fat * k, c: calc.carbs * k }]));
}

// =====================================================================
//  PLATOS BASE (las cantidades se calculan para cada persona)
//  items: [alimento(s) alternativos separados por |, tipo, gramos fijos]
//  P/C/F = se ajusta (proteína, hidratos, grasa) · V = verdura en cantidad fija · X = cantidad fija
// =====================================================================
const MEALS = [];
function MT(id, name, slots, items, steps, min) { MEALS.push({ id, name, slots, items, steps, min }); }
// Desayunos
MT('avena_skyr', 'Porridge de avena con skyr y plátano', 'B', [['avena', 'C'], ['skyr|batido|yogdes|bebsoja', 'P'], ['platano', 'X', 120], ['nueces|almendras|chia', 'F']], ['Calienta la avena con agua o leche 2-3 minutos.', 'Mezcla con el skyr cuando se temple.', 'Añade el plátano en rodajas y los frutos secos.'], 5);
MT('tostadas_pavo', 'Tostadas integrales con pavo, tomate y aceite', 'BS', [['panint|pancenteno|pan', 'C'], ['fiambre|jamoncocido|jamon', 'P'], ['tomate', 'X', 80], ['aove', 'F']], ['Tuesta el pan.', 'Ralla o corta el tomate y ponlo encima con el aceite.', 'Termina con el pavo.'], 5);
MT('tortilla_claras', 'Tortilla de claras con pan integral', 'BD', [['claras', 'P'], ['huevo', 'X', 55], ['panint|pancenteno|pan', 'C'], ['aove', 'F'], ['espinacas', 'X', 60]], ['Bate el huevo con las claras y una pizca de sal.', 'Saltea las espinacas con el aceite 1 minuto.', 'Añade el huevo y cuaja a fuego medio. Acompaña con el pan.'], 8);
MT('batido_fresas', 'Queso batido con fresas, avena y nueces', 'BS', [['batido|skyr|yogdes', 'P'], ['fresas|arandanos|kiwi', 'X', 120], ['avena|muesli', 'C'], ['nueces|almendras|chia', 'F']], ['Pon el queso batido en un bol.', 'Añade la fruta troceada, la avena y los frutos secos.'], 3);
MT('tostada_aguacate', 'Tostada con aguacate y huevos', 'BD', [['panint|pancenteno|pan', 'C'], ['huevo', 'P'], ['aguacate', 'F']], ['Cuece los huevos 8 minutos (o hazlos a la plancha).', 'Machaca el aguacate sobre el pan tostado con sal y pimienta.', 'Pon los huevos encima.'], 10);
MT('cafe_jamon', 'Café con leche y tostada con aceite y jamón', 'B', [['cafeleche', 'X', 200], ['pan|panint', 'C'], ['jamon|fiambre', 'P'], ['aove', 'F'], ['tomate', 'X', 50]], ['Prepara el café con leche.', 'Tuesta el pan, añade tomate, aceite y el jamón.'], 5);
MT('tortitas_cacahuete', 'Tortitas de arroz con crema de cacahuete y plátano', 'BS', [['tortitas', 'C'], ['cacahuete|cremaalmendra|aguacate', 'F'], ['platano', 'X', 120], ['bebsoja|skyr|yogdes|leche', 'P']], ['Unta las tortitas con la crema de cacahuete.', 'Pon el plátano en rodajas encima.', 'Acompaña con la bebida o el yogur.'], 3);
MT('batido_vegetal', 'Batido de proteína vegetal con plátano y crema de cacahuete', 'BS', [['guisante|whey', 'P'], ['platano', 'X', 120], ['bebsoja|bebalmendra|leche', 'X', 250], ['cacahuete|cremaalmendra', 'F'], ['tortitas|patatacocida', 'C']], ['Bate la proteína con la bebida, el plátano y la crema de cacahuete.', 'Acompaña con las tortitas.'], 3);
MT('huevos_patata', 'Huevos revueltos con patata y espinacas', 'BD', [['huevo|tofu', 'P'], ['patata|boniato', 'C'], ['espinacas|champi', 'X', 80], ['aove', 'F']], ['Cuece o haz la patata en el microondas (6 minutos) en dados.', 'Saltéala con el aceite y las espinacas.', 'Añade los huevos batidos y remueve hasta que cuajen.'], 12);
MT('batido_whey', 'Batido de proteína con avena y plátano', 'BS', [['whey|guisante', 'P'], ['avena', 'C'], ['platano', 'X', 120], ['leche|bebsoja|lechesinlac|lechedes', 'X', 250]], ['Pon todo en la batidora con unos hielos.', 'Bate 30 segundos.'], 3);
MT('tofu_revuelto', 'Tofu revuelto con pan integral', 'BD', [['tofu', 'P'], ['panint|pancenteno|pan', 'C'], ['aove', 'F'], ['espinacas|champi|tomate', 'X', 80]], ['Desmenuza el tofu con un tenedor.', 'Saltéalo con el aceite, la verdura, sal y una pizca de cúrcuma 5 minutos.', 'Sírvelo con el pan.'], 10);
MT('yogur_cereales', 'Yogur con cereales y fruta', 'BS', [['yogdes|skyr|yognat|bebsoja', 'P'], ['muesli|cereales|avena', 'C'], ['platano|manzana|pera|fresas|kiwi', 'X', 120]], ['Mezcla el yogur con los cereales.', 'Añade la fruta troceada.'], 2);
// Tentempiés y meriendas
MT('skyr_nueces', 'Skyr con nueces y fruta', 'SM', [['skyr|batido|yogdes', 'P'], ['nueces|almendras|pistachos', 'F'], ['fresas|arandanos|kiwi|manzana', 'X', 100]], ['Sirve el skyr con la fruta y los frutos secos.'], 2);
MT('tortitas_pavo', 'Tortitas de arroz con pavo', 'SM', [['tortitas', 'C'], ['fiambre|jamoncocido|jamon', 'P']], ['Pon el pavo sobre las tortitas.'], 2);
MT('hummus_zanahoria', 'Hummus con zanahoria y tortitas', 'SM', [['hummus', 'F'], ['zanahoria|pepino', 'X', 100], ['tortitas|panint', 'C']], ['Corta la zanahoria en bastones.', 'Úsala con las tortitas para coger el hummus.'], 3);
MT('fruta_almendras', 'Fruta y un puñado de almendras', 'SM', [['manzana|pera|platano|naranja|mandarina', 'X', 160], ['almendras|nueces|avellanas|pistachos', 'F']], ['Lava la fruta y acompáñala con los frutos secos.'], 1);
MT('bocadillo_atun', 'Bocadillo de atún con tomate', 'SM', [['pan|panint', 'C'], ['atun|atunaceite|sardinas', 'P'], ['tomate', 'X', 50]], ['Abre el pan, pon el tomate en rodajas y el atún escurrido.'], 3);
MT('queso_fruta', 'Queso fresco batido con kiwi', 'SM', [['batido|cottage|skyr', 'P'], ['kiwi|fresas|mandarina|melocoton', 'X', 150]], ['Sirve el queso batido con la fruta troceada.'], 2);
MT('edamame_snack', 'Edamame con sal', 'SM', [['edamame', 'P']], ['Cuece el edamame 4 minutos (o en el microondas) y añade sal.'], 5);
MT('batido_leche', 'Vaso de leche con cacao y galletas', 'S', [['leche|bebsoja|lechesinlac', 'P'], ['galletas|biscotes', 'C'], ['colacao', 'X', 10]], ['Mezcla la leche con el cacao.', 'Acompaña con las galletas.'], 2);
// Comidas y cenas
MT('pollo_arroz', 'Pollo a la plancha con arroz y verduras', 'LD', [['pollo|pavo|muslo', 'P'], ['arroz|arrozint', 'C'], ['brocoli|judias|calabacin|pimiento', 'V', 150], ['aove', 'F']], ['Cuece el arroz en agua con sal (unos 15 minutos).', 'Haz el pollo a la plancha con una pizca de sal y especias.', 'Saltea o cuece la verdura y aliña todo con el aceite.'], 20);
MT('salmon_patata', 'Salmón al horno con patata y ensalada', 'LD', [['salmon|caballa|trucha', 'P'], ['patata|boniato', 'C'], ['ensalada|lechuga', 'V', 150], ['aove', 'F']], ['Hornea la patata en rodajas a 200 °C 25 minutos.', 'Añade el salmón los últimos 12 minutos.', 'Sirve con la ensalada aliñada con el aceite.'], 30);
MT('lentejas_huevo', 'Lentejas con verduras y huevo', 'LD', [['lentejas', 'C'], ['huevo', 'P'], ['pimiento|zanahoria|calabacin', 'V', 100], ['aove', 'F']], ['Sofríe la verdura picada con el aceite.', 'Añade las lentejas cocidas y calienta 5 minutos con un poco de agua y pimentón.', 'Sirve con el huevo cocido o a la plancha.'], 15);
MT('pasta_atun', 'Pasta integral con atún y tomate', 'LD', [['pastaint|pasta', 'C'], ['atun|atunaceite|pollo', 'P'], ['tomatetriturado', 'X', 120], ['aove', 'F']], ['Cuece la pasta según el paquete.', 'Calienta el tomate con el aceite y orégano 5 minutos.', 'Mezcla con la pasta y el atún escurrido.'], 15);
MT('ternera_boniato', 'Ternera con boniato y brócoli', 'LD', [['ternera|cerdo|pavo', 'P'], ['boniato|patata', 'C'], ['brocoli|judias|esparragos', 'V', 150], ['aove', 'F']], ['Asa el boniato en dados a 200 °C 25 minutos (o 6 en el microondas).', 'Haz la carne a la plancha.', 'Cuece el brócoli al vapor y aliña con el aceite.'], 25);
MT('merluza_patata', 'Merluza con patata y judías verdes', 'LD', [['merluza|bacalao|dorada', 'P'], ['patata', 'C'], ['judias|calabacin|esparragos', 'V', 150], ['aove', 'F']], ['Cuece la patata y las judías 15 minutos.', 'Haz la merluza a la plancha o al vapor.', 'Aliña con el aceite, ajo y perejil.'], 20);
MT('tortilla_ensalada', 'Tortilla francesa con ensalada y pan', 'LD', [['huevo', 'P'], ['panint|pancenteno|pan', 'C'], ['ensalada|lechuga|tomate', 'V', 150], ['aove', 'F']], ['Bate los huevos con sal.', 'Cuaja la tortilla con unas gotas del aceite.', 'Sirve con la ensalada aliñada y el pan.'], 8);
MT('tofu_arroz', 'Salteado de tofu con arroz integral y verduras', 'LD', [['tofu|tempeh|seitan', 'P'], ['arrozint|arroz|fideosarroz', 'C'], ['pimiento|brocoli|champi|calabacin', 'V', 150], ['aove', 'F']], ['Cuece el arroz.', 'Dora el tofu en dados con el aceite.', 'Añade la verdura en tiras y saltea 5 minutos con un chorrito de salsa de soja.'], 20);
MT('garbanzos_espinacas', 'Garbanzos con espinacas y huevo', 'LD', [['garbanzos', 'C'], ['huevo|tofu', 'P'], ['espinacas', 'V', 150], ['aove', 'F']], ['Sofríe ajo con el aceite y añade las espinacas.', 'Incorpora los garbanzos cocidos con comino y pimentón, 5 minutos.', 'Sirve con el huevo cocido.'], 12);
MT('pavo_quinoa', 'Pavo con quinoa y calabacín', 'LD', [['pavo|pollo', 'P'], ['quinoa|cuscus|arroz', 'C'], ['calabacin|berenjena|pimiento', 'V', 150], ['aove', 'F']], ['Lava y cuece la quinoa 12 minutos.', 'Haz el pavo a la plancha.', 'Saltea el calabacín con el aceite.'], 20);
MT('pasta_gambas', 'Pasta con gambas al ajillo', 'LD', [['pasta|pastaint', 'C'], ['gambas|calamares|pollo', 'P'], ['aove', 'F'], ['tomate|champi', 'V', 80]], ['Cuece la pasta.', 'Saltea ajo y guindilla con el aceite y añade las gambas 2 minutos.', 'Mezcla con la pasta y perejil.'], 15);
MT('cerdo_patata', 'Lomo con patatas al horno y pimientos', 'LD', [['cerdo|solomillocerdo|pollo', 'P'], ['patata', 'C'], ['pimiento|cebolla|calabacin', 'V', 150], ['aove', 'F']], ['Hornea la patata y el pimiento a 200 °C 30 minutos con el aceite.', 'Haz el lomo a la plancha.'], 30);
MT('dorada_cuscus', 'Dorada al horno con cuscús y verduras', 'LD', [['dorada|merluza|salmon', 'P'], ['cuscus|quinoa|arroz', 'C'], ['calabacin|pimiento|tomate', 'V', 150], ['aove', 'F']], ['Hornea el pescado con las verduras a 200 °C 18 minutos.', 'Hidrata el cuscús con el mismo peso de agua caliente 5 minutos.', 'Aliña con el aceite y limón.'], 25);
MT('wrap_pollo', 'Wrap de pollo con aguacate', 'LDS', [['wrap', 'C'], ['pollo|pavo|pollopl', 'P'], ['ensalada|lechuga|tomate', 'V', 80], ['aguacate', 'F']], ['Haz el pollo a la plancha en tiras.', 'Rellena el wrap con el pollo, la verdura y el aguacate.', 'Enróllalo y dóralo 1 minuto por cada lado.'], 12);
MT('ensalada_garbanzos', 'Ensalada de garbanzos con atún', 'LD', [['garbanzos|alubias|lentejas', 'C'], ['atun|atunaceite|huevo', 'P'], ['ensalada|lechuga|tomate|pimiento', 'V', 150], ['aove', 'F']], ['Escurre y enjuaga los garbanzos.', 'Mézclalos con la verdura picada y el atún.', 'Aliña con el aceite, vinagre y sal.'], 8);
MT('hamburguesa_casera', 'Hamburguesa casera con patata asada', 'LD', [['picada|hamburguesa|pavo', 'P'], ['patata|boniato', 'C'], ['ensalada|lechuga|tomate', 'V', 120], ['aove', 'F']], ['Forma la hamburguesa con sal y pimienta y hazla a la plancha.', 'Asa la patata (microondas 6 minutos o horno 25).', 'Acompaña con la ensalada.'], 25);
MT('tempeh_quinoa', 'Bol de tempeh con quinoa y brócoli', 'LD', [['tempeh|tofu', 'P'], ['quinoa|arrozint', 'C'], ['brocoli|espinacas|calabacin', 'V', 150], ['aove|aguacate', 'F']], ['Cuece la quinoa.', 'Dora el tempeh en láminas.', 'Cuece el brócoli al vapor y monta el bol.'], 20);
MT('poke_salmon', 'Bol de salmón con arroz, aguacate y pepino', 'LD', [['salmon|atunfresco|pollo', 'P'], ['arroz|arrozint', 'C'], ['pepino|ensalada|zanahoria', 'V', 100], ['aguacate', 'F']], ['Cuece el arroz y déjalo templar.', 'Haz el salmón a la plancha en dados.', 'Monta el bol con el pepino y el aguacate.'], 20);
MT('seitan_patata', 'Seitán a la plancha con patata y pimientos', 'LD', [['seitan|tofu', 'P'], ['patata|boniato', 'C'], ['pimiento|cebolla', 'V', 150], ['aove', 'F']], ['Cuece o asa la patata.', 'Haz el seitán en filetes a la plancha.', 'Saltea el pimiento con el aceite.'], 20);
MT('pollo_horno', 'Muslos de pollo al horno con patata y ensalada', 'LD', [['muslo|pollo', 'P'], ['patata', 'C'], ['ensalada|lechuga', 'V', 150], ['aove', 'F']], ['Hornea el pollo y la patata a 200 °C 35 minutos con especias.', 'Sirve con la ensalada aliñada.'], 40);
MT('alubias_verduras', 'Alubias con verduras', 'LD', [['alubias|garbanzos', 'C'], ['menestra|pimiento|calabacin', 'V', 200], ['aove', 'F'], ['tofu|huevo|seitan', 'P']], ['Sofríe la verdura con el aceite.', 'Añade las alubias cocidas, pimentón y un poco de agua: 8 minutos.', 'Incorpora la proteína al final.'], 15);
MT('sardinas_tosta', 'Tostas de sardinas con tomate y ensalada', 'D', [['panint|pancenteno|pan', 'C'], ['sardinas|caballa|anchoas', 'P'], ['tomate', 'X', 80], ['ensalada|lechuga', 'V', 120]], ['Tuesta el pan y pon el tomate rallado.', 'Coloca las sardinas escurridas.', 'Acompaña con la ensalada.'], 8);
MT('revuelto_champi', 'Revuelto de huevo y champiñones con pan', 'D', [['huevo', 'P'], ['champi|espinacas|calabacin', 'V', 150], ['panint|pancenteno|pan', 'C'], ['aove', 'F']], ['Saltea los champiñones con el aceite y ajo.', 'Añade los huevos batidos y remueve hasta que cuajen.', 'Sirve con el pan.'], 10);
MT('crema_pollo', 'Crema de calabacín con pechuga de pollo', 'D', [['calabacin|calabaza|menestra', 'V', 250], ['patata', 'C'], ['pollo|pavo|merluza|tofu', 'P'], ['aove', 'F']], ['Cuece el calabacín con la patata 15 minutos y tritúralo con el aceite.', 'Haz el pollo a la plancha y sírvelo aparte.'], 25);

// Pasos y límites por defecto de cada tipo
const KIND_LIM = { P: [40, 300], C: [15, 150], F: [0, 30] };
function itemStep(f, kind) { return f.u && kind !== 'F' ? f.u[0] : kind === 'F' ? 5 : 10; }

// Alimentos que cuentan como «lo mismo» al mirar la despensa (crudo / cocinado / variantes)
const PANTRY_EQ = [['pollo', 'pollopl', 'muslo', 'polloasado'], ['pavo', 'pavopl', 'fiambre'], ['ternera', 'terneraplancha', 'picada', 'hamburguesa'], ['salmon', 'salmonpl'], ['merluza', 'merluzapl', 'bacalao'],
    ['gambas', 'gambaspl'], ['arroz', 'arrozcocido', 'arrozint', 'arrozintcocido'], ['pasta', 'pastacocida', 'pastaint', 'pastaintcocida'], ['patata', 'patatacocida', 'patataasada'],
    ['boniato', 'boniatoasado'], ['quinoa', 'quinoacocida'], ['cuscus', 'cuscuscocido'], ['pan', 'panint', 'pancenteno', 'panmolde', 'panmulti'], ['leche', 'lechedes', 'lechentera', 'lechesinlac'],
    ['yognat', 'yogdes', 'yoggr'], ['skyr', 'batido'], ['atun', 'atunaceite'], ['brocoli', 'brocolicocido'], ['ensalada', 'lechuga'], ['jamon', 'jamoncocido']];
const STAPLES = new Set(['aove']); // se da por hecho que hay aceite
function inPantry(id, pantry) {
    if (pantry.includes(id)) return true;
    const g = PANTRY_EQ.find(x => x.includes(id));
    return !!g && g.some(x => pantry.includes(x));
}
// Elige, de las alternativas de cada ingrediente, la primera que encaja con tus preferencias (antes lo que tienes en casa
// y lo que te gusta). Con o.pantryOnly solo usa lo que tienes: si falta la proteína o el hidrato, el plato no vale
// (o, con o.allowMissing, vale apuntando qué falta comprar).
function resolveMeal(t, p = myPrefs(), o = {}) {
    const out = [], missing = [], like = o.like || [];
    let changed = !!o.forceName;
    for (const [alts, kind, fixed] of t.items) {
        const ids = alts.split('|').filter(id => getFood(id) && foodOk(getFood(id), p));
        if (!ids.length) {
            if (kind !== 'P' && kind !== 'C') continue; // un acompañamiento se puede omitir
            return null;
        }
        let id = ids.find(x => inPantry(x, p.pantry)) || ids.find(x => like.includes(x)) || ids[0];
        if (o.pantryOnly && !inPantry(id, p.pantry) && !STAPLES.has(id)) {
            if (kind === 'P' || kind === 'C') { if (!o.allowMissing || missing.length) return null; missing.push(id); }
            else { if (kind === 'V') changed = true; continue; } // sin ese acompañamiento
        }
        if (id !== alts.split('|')[0] && kind !== 'F') changed = true;
        out.push({ f: getFood(id), kind, fixed });
    }
    if (!out.some(x => x.kind === 'P' || x.kind === 'C' || x.kind === 'X')) return null; // p. ej. fruta + frutos secos
    out.missing = missing; out.changed = changed;
    return out;
}
const sumMacros = items => items.reduce((a, it) => { const m = macrosOf(it.f, it.g); a.kcal += m.kcal; a.p += m.p; a.f += m.f; a.c += m.c; a.fib += m.fib; return a; }, { kcal: 0, p: 0, f: 0, c: 0, fib: 0 });

// Ajusta los gramos de cada ingrediente para acercarse a las kcal y la proteína de esa comida
function fitMeal(t, tg, p, o = {}) {
    const items = resolveMeal(t, p, o); if (!items) return null;
    const missing = items.missing || [];
    const named = items.changed ? mealNaming(items) : { name: t.name, steps: t.steps };
    items.forEach(it => {
        if (it.kind === 'V' || it.kind === 'X') { it.g = it.fixed || it.f.fixed || 150; return; }
        const [lo0, hi0] = KIND_LIM[it.kind], st = itemStep(it.f, it.kind);
        it.st = st;
        it.lo = it.kind === 'F' ? 0 : Math.max(st, Math.ceil(Math.min(lo0, it.f.min > 0 ? it.f.min : lo0) / st) * st); // p. ej. 1 cacito de proteína (30 g)
        // Topes realistas para un solo plato (p. ej. no más de 300 g de queso batido o de carne)
        const big = Math.min(1.8, Math.max(1, tg.kcal / 800)); // comidas muy grandes (dietas de volumen) admiten más cantidad
        const cap = (it.kind === 'P' ? 300 : it.kind === 'C' ? (it.f.cat === 'legum' ? 350 : 250) : 40) * big;
        const fmax = it.f.max > 0 ? it.f.max * big : hi0 * big;
        it.hi = Math.max(it.lo, Math.floor(Math.min(fmax, cap) / st) * st);
        it.g = Math.min(it.hi, Math.max(it.lo, Math.round((it.lo + it.hi) / 3 / st) * st));
    });
    const K = Math.max(tg.kcal, 60), P = Math.max(tg.p, 5), Fa = Math.max(tg.f, 3), C = Math.max(tg.c, 5);
    const err = () => {
        const m = sumMacros(items);
        const under = Math.max(0, P - m.p) / P, over = Math.max(0, m.p - P * 1.5) / P;
        return 3 * ((m.kcal - K) / K) ** 2 + 2 * under ** 2 + .6 * over ** 2 + .35 * ((m.f - Fa) / Fa) ** 2 + .35 * ((m.c - C) / C) ** 2;
    };
    const vars = items.filter(it => it.st);
    let best = err();
    for (let pass = 0; pass < 5; pass++) {
        let moved = false;
        for (const it of vars) {
            const keep = it.g; let bg = keep;
            const step = (it.hi - it.lo) / it.st > 60 ? it.st * 2 : it.st;
            for (let g = it.lo; g <= it.hi + 1e-9; g += step) { it.g = g; const e = err(); if (e < best - 1e-9) { best = e; bg = g; } }
            it.g = bg; if (bg !== keep) moved = true;
        }
        if (!moved) break;
    }
    const m = sumMacros(items);
    const ok = Math.abs(m.kcal - K) / K <= (K < 250 ? .3 : .15);
    return { id: t.id, name: named.name, steps: named.steps, min: t.min, items: items.filter(it => it.g > 0).map(it => ({ fid: it.f.id, g: Math.round(it.g * 10) / 10, kind: it.kind })), m, err: best, ok, main: (items.find(it => it.kind === 'P') || items[0]).f.id, missing };
}

// Si un ingrediente se ha cambiado (dieta, alergia, lo que tienes en casa…), el nombre y los pasos se rehacen con lo que lleva
const shortName = f => foodName(f).replace(/\s*\(.*?\)/g, '').replace(/ \/.*$/, '').replace(/ a la plancha$/, '').toLowerCase();
function mealNaming(items) {
    const P = items.find(i => i.kind === 'P'), C = items.find(i => i.kind === 'C'), V = items.find(i => i.kind === 'V');
    const X = items.filter(i => i.kind === 'X').map(i => shortName(i.f));
    const parts = [P, C].filter(Boolean).map(i => shortName(i.f));
    let name = parts.length === 2 ? tr('{a} con {b}', { a: parts[0], b: parts[1] }) : (parts[0] || '');
    const extra = V ? shortName(V.f) : X.length ? X[0] : '';
    if (extra) name = name ? tr('{a} y {b}', { a: name, b: extra }) : extra;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const steps = [], oil = items.some(i => i.f.id === 'aove');
    if (P) steps.push(tr('Prepara {x} como más te guste (plancha, horno o cocido).', { x: shortName(P.f) }));
    if (C) steps.push(C.f.raw ? tr('Cuece {x} según el paquete (el peso indicado es en crudo).', { x: shortName(C.f) }) : tr('Añade {x}.', { x: shortName(C.f) }));
    if (V) steps.push(oil ? tr('Acompaña con {x} y aliña con el aceite.', { x: shortName(V.f) }) : tr('Acompaña con {x}.', { x: shortName(V.f) }));
    else if (oil) steps.push(tr('Aliña con el aceite.'));
    X.slice(V ? 0 : 1).forEach(x => steps.push(tr('Completa con {x}.', { x })));
    return { name, steps };
}
// Nombre y pasos de un plato en el idioma activo, para enseñarlo.
// Los platos base se traducen por su clave. Los que se rehicieron al cambiar un ingrediente se vuelven a
// componer con sus ingredientes, así un menú guardado también cambia de idioma. En español se usa
// siempre el texto guardado, para que salga exactamente igual que antes.
function mealText(ml) {
    if (!ml) return { name: '', steps: [] };
    const t = MEALS.find(x => x.id === ml.id);
    if (t && ml.name === t.name) return { name: tr(t.name), steps: (t.steps || []).map(x => tr(x)) };
    if (LANG === 'es') return { name: ml.name, steps: ml.steps || [] };
    const items = (ml.items || []).map(it => ({ f: getFood(it.fid), kind: it.kind })).filter(x => x.f && x.kind);
    return items.length ? mealNaming(items) : { name: ml.name, steps: ml.steps || [] };
}
// Generador pseudoaleatorio con semilla (para «Regenerar» sin repetir siempre lo mismo)
function seeded(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Las mejores opciones para una comida. opts: { n, seed, avoid: [ids de proteína a evitar], exclude: [ids de plato],
//   prefs (preferencias puntuales), like: [alimentos que gustan], pantryOnly, allowMissing }
function suggestMeals(slot, tg, opts = {}) {
    const p = opts.prefs || myPrefs(), rnd = seeded(opts.seed || 1), n = opts.n || 3, like = opts.like || [];
    const slotKey = slot === 'X' ? 'S' : slot;
    const avoid = new Set(opts.avoid || []), exclude = new Set(opts.exclude || []);
    const cands = MEALS.filter(t => t.slots.includes(slotKey) && !exclude.has(t.id))
        .filter(t => p.budget !== 'low' || !t.items.some(([a, k]) => (k === 'P' || k === 'C') && EXPENSIVE.has(a.split('|')[0])))
        .map(t => fitMeal(t, tg, p, { like, pantryOnly: opts.pantryOnly, allowMissing: opts.allowMissing })).filter(Boolean)
        .map(r => {
            let score = r.err + (r.ok ? 0 : 1) + (avoid.has(r.main) ? .08 : 0) + rnd() * (opts.seed ? .06 : 0);
            const have = r.items.filter(it => inPantry(it.fid, p.pantry)).length;
            score -= Math.min(.06, have * .02);
            // Lo que te gusta sale antes (pero sin repetirlo en todas las comidas: eso lo controla «avoid»)
            score -= Math.min(.3, r.items.filter(it => like.includes(it.fid)).length * .15);
            score += r.missing.length * .2;
            return { ...r, score };
        })
        .sort((a, b) => a.score - b.score);
    // Variedad: no dos opciones con la misma proteína principal
    const out = [], mains = new Set(), names = new Set();
    for (const r of cands) { if (out.length >= n) break; if (names.has(r.name) || (mains.has(r.main) && cands.length > n)) continue; mains.add(r.main); names.add(r.name); out.push(r); }
    for (const r of cands) { if (out.length >= n) break; if (!out.includes(r) && !names.has(r.name)) { names.add(r.name); out.push(r); } }
    return out;
}

// =====================================================================
//  MENÚ DEL DÍA (y de varios días, para la lista de la compra)
// =====================================================================
function makeDayMenu(seed = Date.now(), avoidIds = [], o = {}) {
    if (!calc.target) return null;
    const T = dayTargets();
    const build = (slots, k) => {
        const used = new Set(avoidIds), mains = [], meals0 = [];
        return slots.map(slot => {
            const tg = { kcal: T[slot].kcal * k, p: T[slot].p * k, f: T[slot].f * k, c: T[slot].c * k };
            const so = { n: 1, seed: seed + SLOT_ORDER.indexOf(slot) * 97, avoid: mains, prefs: o.prefs, like: o.like };
            // Si no queda nada sin repetir (pocas opciones por dieta o alergias), se permite repetir de otros días
            // Siempre antes un plato que encaje en las calorías de esa comida (ok) que uno que no
            const A = suggestMeals(slot, tg, { ...so, n: 3, exclude: [...used] }), B = A.some(x => x.ok) ? [] : suggestMeals(slot, tg, { ...so, n: 3, exclude: meals0 });
            const opt = A.find(x => x.ok) || B.find(x => x.ok) || A[0] || B[0];
            if (!opt) return null;
            used.add(opt.id); mains.push(opt.main); meals0.push(opt.id);
            return { slot, ...opt };
        }).filter(Boolean);
    };
    let meals = build(Object.keys(T), 1);
    // Si alguna comida no tiene opciones con tus preferencias, sus calorías se reparten entre las demás
    if (meals.length && meals.length < Object.keys(T).length) {
        const share = SLOT_SHARE[myPrefs().meals], have = meals.reduce((a, m) => a + (share[m.slot] || 0), 0);
        if (have > 0) meals = build(meals.map(m => m.slot), Math.min(1.6, 1 / have));
    }
    return { seed, meals };
}
function menuTotals(menu) {
    return menu.meals.reduce((a, ml) => { a.kcal += ml.m.kcal; a.p += ml.m.p; a.f += ml.m.f; a.c += ml.m.c; return a; }, { kcal: 0, p: 0, f: 0, c: 0 });
}
// Cambia una sola comida del menú por la siguiente mejor opción
function swapMenuMeal(menu, idx, seed = Date.now(), o = {}) {
    const ml = menu.meals[idx], T = dayTargets();
    const others = menu.meals.filter((_, i) => i !== idx);
    const opt = suggestMeals(ml.slot, T[ml.slot], { n: 1, seed, exclude: [ml.id, ...others.map(x => x.id), ...(ml.tried || [])], avoid: others.map(x => x.main), prefs: o.prefs, like: o.like })[0];
    if (!opt) return false;
    menu.meals[idx] = { slot: ml.slot, ...opt, tried: [...(ml.tried || []), ml.id].slice(-6) };
    return true;
}
// Para varios días: menús distintos (sin repetir platos el mismo día ni seguidos)
function makeMenus(days, seed = Date.now(), o = {}) {
    const out = []; let prev = [];
    for (let d = 0; d < days; d++) {
        const m = makeDayMenu(seed + d * 7919, prev, o); if (!m) break;
        // Sin repetir platos en dos días seguidos
        out.push(m); prev = out.slice(-3).flatMap(x => x.meals.map(y => y.id));
    }
    return out;
}

// =====================================================================
//  RECETA E INGREDIENTES
// =====================================================================
function amountText(f, g) {
    const unit = f.ml ? 'ml' : 'g';
    if (f.u && g >= f.u[0] * .99 && Math.abs(g / f.u[0] - Math.round(g / f.u[0])) < .01) {
        const n = Math.round(g / f.u[0]);
        return `${n} ${tr(n === 1 ? f.u[1] : f.u[2])}${f.u[0] >= 20 ? ` (${fmt(g)} ${unit})` : ''}`;
    }
    return `${fmt(g)} ${unit}${f.raw ? ' ' + tr('en crudo') : ''}`;
}
function mealIngredients(meal) { return meal.items.map(it => { const f = getFood(it.fid); return f ? { f, g: it.g, txt: amountText(f, it.g) } : null; }).filter(Boolean); }

// Añadir un plato al diario (cada ingrediente como una línea, con sus macros)
function mealToDiary(meal, slot, date) {
    const prev = diaryDate; diaryDate = date || diaryDate || todayISO();
    const ids = meal.items.map(it => {
        const f = getFood(it.fid); if (!f) return null;
        const m = macrosOf(f, it.g);
        const e = { slot, fid: f.id, name: f.name, brand: f.brand || '', g: it.g, ml: !!f.ml, kcal: Math.round(m.kcal), p: round1(m.p), f: round1(m.f), c: round1(m.c), fib: round1(m.fib) };
        if (f.u && Math.abs(it.g / f.u[0] - Math.round(it.g / f.u[0])) < .01) Object.assign(e, { u: f.u[1], up: f.u[2], n: Math.round(it.g / f.u[0]) });
        return pushDiary(e);
    }).filter(Boolean);
    diaryDate = prev || diaryDate;
    return ids;
}

// =====================================================================
//  LISTA DE LA COMPRA (agrupada y con lo que ya has comprado marcado)
// =====================================================================
const SHOP_GROUPS = [['prot', tk('Proteínas'), '🍗'], ['hc', tk('Carbohidratos'), '🍚'], ['fruta', tk('Frutas'), '🍎'], ['verdura', tk('Verduras'), '🥦'], ['lacteo', tk('Lácteos'), '🥛'], ['otros', tk('Otros'), '🛒']];
function shopGroupOf(f) {
    if (f.cat === 'prot' || f.cat === 'vprot') return 'prot';
    if (f.cat === 'hc' || f.cat === 'legum') return 'hc';
    if (f.cat === 'fruta') return 'fruta';
    if (f.cat === 'verdura') return 'verdura';
    if (f.cat === 'lacteo') return 'lacteo';
    return 'otros';
}
function buildShopping(menus) {
    const tot = {};
    menus.forEach(mn => mn.meals.forEach(ml => ml.items.forEach(it => { tot[it.fid] = (tot[it.fid] || 0) + it.g; })));
    return Object.entries(tot).map(([fid, g]) => {
        const f = getFood(fid); if (!f) return null;
        return { fid, g: Math.round(g), group: shopGroupOf(f) };
    }).filter(Boolean).sort((a, b) => foodName(getFood(a.fid)).localeCompare(foodName(getFood(b.fid)), locale()));
}
// Cantidad para comprar: unidades si es algo que se cuenta, si no kilos, gramos o mililitros redondeados
function shopQty(f, g) {
    if (f.u && f.u[0] >= 20) { const n = Math.ceil(g / f.u[0] - .05); return `${n} ${tr(n === 1 ? f.u[1] : f.u[2])}`; }
    const unit = f.ml ? 'ml' : 'g', r = g >= 200 ? Math.ceil(g / 50) * 50 : Math.ceil(g / 10) * 10;
    if (r >= 1000) return `${fmt(r / 1000, r % 1000 ? 1 : 0)} ${f.ml ? 'l' : 'kg'}`;
    return `${fmt(r)} ${unit}`;
}

