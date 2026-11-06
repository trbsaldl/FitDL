// nutriDL · Idioma de la app (español / inglés)
// La clave del diccionario es el propio texto en español. Si falta una traducción se ve en español:
// así nunca aparece un hueco vacío ni se rompe la pantalla.
'use strict';

const LANGS = { es: 'Español', en: 'English' };
// Mientras la traducción al inglés no esté terminada, el selector no se enseña:
// media app en inglés y media en español es peor que dejarlo en español.
// Lo vigila tests/v311.test.js: no se puede poner en true si queda algo sin traducir.
const I18N_READY = true;
const LANG_KEY = 'nutridl_lang';
const LOCALES = { es: 'es-ES', en: 'en-GB' };

function detectLang() {
    try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS[s]) return s; } catch (e) { }
    const n = String((typeof navigator !== 'undefined' && navigator.language) || 'es').slice(0, 2).toLowerCase();
    return LANGS[n] ? n : 'es';
}
let LANG = detectLang();
const locale = () => LOCALES[LANG] || LOCALES.es;

// Traduce. `v` sustituye {trozos}: tr('Te quedan {k} kcal', { k: 300 })
// Se llama `tr` y no `t` a propósito: `t` se usa como variable local en varios sitios del código
// y una local tapando a la global haría que la traducción reventara dentro de esa función.
function tr(s, v) {
    let out = s == null ? '' : String(s);
    const d = LANG !== 'es' && typeof LANG_EN !== 'undefined' && LANG === 'en' ? LANG_EN : null;
    if (d && d[out] != null) out = d[out];
    else if (out.includes('|')) out = out.slice(0, out.indexOf('|')); // clave con contexto: sin traducción, la parte española
    if (v) for (const k in v) out = out.split('{' + k + '}').join(v[k]);
    return out;
}
// tk('texto'): no hace nada, devuelve el mismo texto. Sirve para listas de datos (nombres de comida,
// objetivos, unidades…) que se guardan en español y se traducen con tr() justo al enseñarlas.
// Así tools/i18n-check.js sabe que ese texto es traducible y comprueba que tiene su inglés.
const tk = s => s;
// Nombre de un alimento en el idioma activo (f.en lo traen los genéricos; las marcas se llaman igual)
// Precio en euros con el formato de cada idioma: «4,99 €» / «€4.99»
const eur = v => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR' }).format(v);
// Porcentaje: «13 %» en español, «13%» en inglés
const pctTxt = v => LANG === 'es' ? v + ' %' : v + '%';
function foodName(f) {
    if (!f) return '';
    if (LANG === 'en') {
        const en = f.en || (typeof FOOD_EN !== 'undefined' && FOOD_EN[f.id]);
        if (en) return en;
    }
    return f.name || '';
}
// Plural sencillo: tp(2, 'día', 'días') → «2 días» · en inglés usa el diccionario de cada forma
const tp = (n, uno, varios) => `${typeof fmt === 'function' ? fmt(n) : n} ${tr(n === 1 ? uno : varios)}`;

// Fechas y horas en el idioma activo
const dateTxt = (iso, opts) => new Date(String(iso).length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString(locale(), opts);
// Iniciales de los días de la semana, empezando en lunes
const dowLetters = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i); // 1 de enero de 2024 fue lunes
    return d.toLocaleDateString(locale(), { weekday: 'narrow' }).toUpperCase();
});

// Días de la semana abreviados («Lun», «Mar»… / «Mon», «Tue»…), empezando en lunes
const dowShort = () => Array.from({ length: 7 }, (_, i) => {
    const s = new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'short' }).replace(/\.$/, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
});
// Textos fijos del HTML: data-t (contenido), data-t-ph (placeholder), data-t-al (aria-label), data-t-ti (title)
function applyStaticI18n(root) {
    const r = root || document;
    r.querySelectorAll('[data-t]').forEach(el => { const k = el.getAttribute('data-t'); if (k) el.textContent = tr(k); });
    [['data-t-ph', 'placeholder'], ['data-t-al', 'aria-label'], ['data-t-ti', 'title'], ['data-t-co', 'content'], ['data-t-alt', 'alt']].forEach(([a, p]) => {
        r.querySelectorAll('[' + a + ']').forEach(el => { const k = el.getAttribute(a); if (k) el.setAttribute(p, tr(k)); });
    });
    // Enlaces con una página propia en inglés (privacidad, términos): data-t-hr guarda la dirección inglesa
    r.querySelectorAll('[data-t-hr]').forEach(el => {
        if (!el.dataset.hrEs) el.dataset.hrEs = el.getAttribute('href') || '';
        el.setAttribute('href', LANG === 'en' ? el.getAttribute('data-t-hr') : el.dataset.hrEs);
    });
}

function setLang(l) {
    if (!LANGS[l] || l === LANG) return;
    LANG = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (e) { }
    document.documentElement.lang = l;
    applyStaticI18n();
    if (typeof refreshAll === 'function') refreshAll();           // vuelve a pintar todo con el idioma nuevo
    if (typeof renderChat === 'function' && state && state.tab === 'coach') renderChat();
    if (typeof track === 'function') track('lang_' + l);
    if (typeof toast === 'function') toast(tr('Idioma cambiado'));
}

