// Tanda 3 de alimentos genéricos (3.30): frutas, platos y básicos colombianos y latinos que faltaban.
// Cada uno enlazado con su ficha EXACTA del USDA FoodData Central · SR Legacy (dominio público). No toca nada de lo anterior: solo añade.
// Fuera a propósito: buñuelo (el del USDA es de trigo y levadura, no el colombiano de queso) y panela (no está en el USDA).
// [id, nombre en la app, categoría, descripción USDA exacta, ración [g, singular, plural], flags]
module.exports = [
    // ---------- Frutas ----------
    ['lulo', 'Lulo (pulpa)', 'fruta', 'Naranjilla (lulo) pulp, frozen, unsweetened', [100, 'ración', 'raciones'], 'N'],
    ['guanabana', 'Guanábana', 'fruta', 'Soursop, raw', [150, 'ración', 'raciones'], 'N'],
    ['jugo_maracuya', 'Jugo de maracuyá natural (sin azúcar)', 'bebida', 'Passion-fruit juice, yellow, raw', [250, 'vaso', 'vasos'], 'N ml'],
    ['uchuva', 'Uchuva', 'fruta', 'Groundcherries, (cape-gooseberries or poha), raw', [100, 'ración', 'raciones'], 'N'],
    ['feijoa', 'Feijoa', 'fruta', 'Feijoa, raw', [50, 'feijoa', 'feijoas'], 'N'],
    ['zapote', 'Zapote / mamey', 'fruta', 'Sapote, mamey, raw', [150, 'ración', 'raciones'], 'N'],

    // ---------- Plátano, yuca y maíz ----------
    ['patacon', 'Patacón (plátano verde frito)', 'hc', 'Plantains, green, fried', [60, 'patacón', 'patacones'], 'N'],
    ['maduro_frito', 'Tajadas de plátano maduro fritas', 'hc', 'Plantains, yellow, fried, Latino restaurant', [100, 'ración', 'raciones'], 'N'],
    ['platano_verde_cocido', 'Plátano verde cocido', 'hc', 'Plantains, green, boiled', [150, 'ración', 'raciones'], 'N'],
    ['chips_yuca', 'Chips de yuca', 'hc', 'Snacks, yucca (cassava) chips, salted', [30, 'paquete pequeño', 'paquetes pequeños'], 'N'],

    // ---------- Platos ----------
    ['arroz_leche_latino', 'Arroz con leche', 'platos', 'Restaurant, Latino, arroz con leche (rice pudding)', [150, 'ración', 'raciones'], 'V L'],
    ['arroz_frijol_negro', 'Arroz con fríjoles negros', 'platos', 'Restaurant, Latino, Arroz con frijoles negros (rice and black beans)', [250, 'plato', 'platos'], ''],
    ['arroz_frijol_rojo', 'Arroz con fríjoles rojos', 'platos', 'Restaurant, Latino, Arroz con habichuelas colorados (Rice And Red Beans)', [250, 'plato', 'platos'], ''],
    ['arroz_guandul', 'Arroz con guandú', 'platos', 'Restaurant, Latino, Arroz con grandules (rice and pigeonpeas)', [250, 'plato', 'platos'], 'M'],
    ['sopa_mondongo', 'Sopa de mondongo', 'platos', 'Restaurant, Latino, tripe soup', [400, 'plato', 'platos'], 'M'],
    ['sopa_frijol_negro', 'Sopa de fríjoles negros', 'platos', 'Restaurant, Latino, black bean soup', [300, 'plato', 'platos'], ''],

    // ---------- Carnes y lácteos ----------
    ['mondongo_cocido', 'Mondongo / callos de res cocidos', 'prot', 'Beef, variety meats and by-products, tripe, cooked, simmered', [150, 'ración', 'raciones'], 'M'],
    ['morcilla', 'Morcilla / rellena', 'prot', 'Blood sausage', [100, 'ración', 'raciones'], 'M'],
    ['sobrebarriga', 'Sobrebarriga (falda de res) guisada', 'prot', 'Beef, flank, steak, separable lean and fat, trimmed to 0" fat, choice, cooked, braised', [150, 'ración', 'raciones'], 'M'],
    ['queso_blanco_latino', 'Queso blanco latino (parecido al campesino)', 'lacteo', 'Cheese, white, queso blanco', [40, 'tajada', 'tajadas'], 'V L'],
    ['queso_fresco_latino', 'Queso fresco latino', 'lacteo', 'Cheese, fresh, queso fresco', [40, 'tajada', 'tajadas'], 'V L'],
    ['crema_cacahuete_natural', 'Crema de cacahuete 100 % (sin sal ni azúcar)', 'grasa', 'Peanut butter, smooth style, without salt', [15, 'cucharada', 'cucharadas'], 'N'],
];
