// Comprueba el estado del idioma: qué textos están preparados y cuáles faltan por traducir.
// Uso:  node tools/i18n-check.js            → resumen
//       node tools/i18n-check.js --faltan   → lista lo que falta, archivo por archivo
//       node tools/i18n-check.js --sin-en   → claves marcadas que aún no tienen inglés
//
// Cómo decide:
//  · Una clave es el PRIMER argumento de tr(), tk(), toast(), toastUndo() o askConfirm(), y todos los
//    argumentos de tp(n, 'singular', 'plural'). En el HTML, los atributos data-t, data-t-ph, data-t-al, data-t-ti.
//  · «Falta» = texto en español que se enseñaría tal cual: una cadena entre comillas que no es clave,
//    o texto suelto dentro de una plantilla `…` (lo que va fuera de ${…} se ve siempre igual).
//  · No cuentan las líneas con  // i18n-ignore  ni los bloques entre  // i18n-ignore-start … // i18n-ignore-end
//    (registros internos e informe técnico para el desarrollador).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

// ---------------------------------------------------------------------
// Lector de JavaScript: recorre el código y devuelve sus textos con su línea.
// ---------------------------------------------------------------------
const FN_KEY = new Set(['tr', 'tk', 'trSafe', 'toast', 'toastUndo', 'askConfirm', 'coachAsk', 'askBtn']);
function scanJS(src) {
    const strings = [];   // { txt, line, key: bool, kind: 'q' | 't' }
    let i = 0, line = 1;
    const n = src.length;
    const callStack = [];  // por cada «(» abierto: { fn, arg } (arg = nº de argumento)
    const prevSig = () => { let k = i - 1; while (k >= 0 && /\s/.test(src[k])) k--; return k >= 0 ? src[k] : ''; };
    const wordBefore = pos => { let k = pos - 1; while (k >= 0 && /\s/.test(src[k])) k--; let e = k + 1; while (k >= 0 && /[\w$]/.test(src[k])) k--; const w = src.slice(k + 1, e); return k >= 0 && src[k] === '.' ? '.' + w : w; };
    const isKeyPos = () => {
        const c = callStack[callStack.length - 1];
        if (!c) return false;
        // Texto directo de una llamada, o dentro de una lista que es argumento de una llamada
        const fn = c.fn || c.outerFn, arg = c.fn ? c.arg : c.outerArg, enLista = !c.fn;
        if (fn === 'tp') return arg >= 1;
        if (fn === 'askConfirm') return !enLista && arg <= 1;  // pregunta y texto del botón
        if (fn === 'MT') return arg === 1 || (enLista && arg === 4);   // nombre del plato y sus pasos
        if (fn === 'celebrate') return !enLista && (arg === 1 || arg === 2);  // título y texto de la celebración
        return FN_KEY.has(fn) && arg === 0 && !enLista;
    };
    function readQuoted(q) {
        const startLine = line; let txt = ''; i++;
        while (i < n && src[i] !== q) { if (src[i] === '\\') { txt += src[i + 1]; i += 2; continue; } if (src[i] === '\n') line++; txt += src[i]; i++; }
        i++;
        strings.push({ txt, line: startLine, key: isKeyPos(), kind: 'q' });
    }
    function readTemplate() {
        // Barrera: lo que va dentro de ${…} es código, no el texto de la llamada que contiene la plantilla
        callStack.push({ fn: '`', arg: 0 });
        i++; let seg = '', segLine = line;
        while (i < n) {
            const ch = src[i];
            if (ch === '\\') { seg += src[i + 1]; i += 2; continue; }
            if (ch === '`') { i++; break; }
            if (ch === '$' && src[i + 1] === '{') {
                if (seg.trim()) strings.push({ txt: seg, line: segLine, key: false, kind: 't' });
                seg = ''; i += 2; readCode('}'); segLine = line; continue;
            }
            if (ch === '\n') line++;
            seg += ch; i++;
        }
        if (seg.trim()) strings.push({ txt: seg, line: segLine, key: false, kind: 't' });
        callStack.pop();
    }
    function readCode(until) {
        let depth = 0;
        while (i < n) {
            const ch = src[i];
            if (ch === '\n') { line++; i++; continue; }
            if (ch === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
            if (ch === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
            if (ch === "'" || ch === '"') { readQuoted(ch); continue; }
            if (ch === '`') { readTemplate(); continue; }
            if (ch === '/') {   // ¿expresión regular? (después de un operador o al empezar)
                const p = prevSig();
                if (p === '' || '(,=:[!&|?{};+-*%<>~^'.includes(p) || /\b(return|typeof|in|of)$/.test(src.slice(Math.max(0, i - 7), i).trim())) {
                    i++; let inClass = false;
                    while (i < n) { const c = src[i]; if (c === '\\') { i += 2; continue; } if (c === '[') inClass = true; else if (c === ']') inClass = false; else if (c === '/' && !inClass) break; else if (c === '\n') break; i++; }
                    i++; while (i < n && /[a-z]/i.test(src[i])) i++;
                    continue;
                }
            }
            if (ch === '(') { callStack.push({ fn: wordBefore(i), arg: 0 }); i++; continue; }
            if (ch === ')') { callStack.pop(); i++; continue; }
            if (ch === ',') { const c = callStack[callStack.length - 1]; if (c) c.arg++; i++; continue; }
            if (ch === '{' || ch === '[') {
                depth++;
                const t = callStack[callStack.length - 1];
                // Solo se hereda si la lista cuelga directamente de una llamada (no de otra lista)
                callStack.push({ fn: '', arg: 0, outerFn: t && t.fn ? t.fn : '', outerArg: t && t.fn ? t.arg : 0 });
                i++; continue;
            }
            if (ch === '}' || ch === ']') {
                if (until === '}' && depth === 0 && ch === '}') { i++; return; }
                depth--; callStack.pop(); i++; continue;
            }
            i++;
        }
    }
    readCode(null);
    return strings;
}

// ---------------------------------------------------------------------
// ¿Parece texto en español que alguien vería en pantalla?
// ---------------------------------------------------------------------
function visible(txt) {
    // Fuera etiquetas, entidades y clases de Tailwind / iconos. Una clase lleva guion («p-3», «mt-2», «fa-fire»)
    // o es una utilidad conocida escrita entera; así no se come palabras normales como «para» o «músculo».
    return txt.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ')
        .replace(/(^|\s)(?:[a-z]+:)*!?-?(?:fa|nd|text|bg|border|rounded|px|py|pt|pb|pl|pr|p|m|mt|mb|ml|mr|mx|my|w|h|gap|grid|col|row|space|font|leading|tracking|shadow|ring|divide|min|max|top|left|right|bottom|inset|z|opacity|transition|duration|ease|cursor|place|self|order|aspect|object|translate|scale|rotate|from|to|via|stroke|fill|outline|line|decoration|underline|items|justify|content|overflow|whitespace|break|shrink|grow|basis|flex|inline|sr)-[\w:/.%[\]#-]+(?=\s|$)/g, '$1')
        .replace(/(^|\s)(?:flex|grid|hidden|block|inline|truncate|uppercase|lowercase|capitalize|italic|underline|relative|absolute|fixed|sticky|contents|tabular-nums|sr-only|shrink-0|grow|border|rounded|shadow|transition|antialiased)(?=\s|$)/g, '$1')
        .replace(/\s+/g, ' ').trim();
}
// Palabras españolas muy cortas: solo cuentan como palabra suelta (entre espacios), no dentro de «space-y-4»
const CORTAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'tu', 'tus', 'que', 'para', 'con', 'sin', 'por', 'una', 'uno', 'al', 'se', 'te', 'ya', 'hoy', 'y', 'o', 'en', 'es', 'no', 'si', 'mi', 'mis', 'su', 'sus', 'lo', 'le', 'les', 'un', 'como', 'cuando', 'muy', 'todo', 'nada', 'tienes', 'puedes', 'quieres', 'comida', 'peso', 'datos']);
function pareceEspañol(txt) {
    const v = visible(txt);
    if (v.length < 2 || !/[a-záéíóúñ]{2,}/i.test(v)) return false;
    if (/^(https?:|\/|\.\/|\.\.\/|#|data:|mailto:)/.test(v)) return false;
    if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(v)) return !/^[\w$.-]+$/.test(v) || /[áéíóúñ]/i.test(v);
    // Trozos de código (atributo="…", llamadas…) no son palabras
    const palabras = v.split(/\s+/).filter(w => !/[="<>{}()]/.test(w)).map(w => w.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '')).filter(Boolean);
    if (palabras.length < 2) return false;                                  // una sola palabra sin tilde: casi siempre código
    return palabras.some(w => CORTAS.has(w)) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s[a-záéíóúñ]+/.test(v);
}

// ---------------------------------------------------------------------
// 1. Recorrer los archivos
// ---------------------------------------------------------------------
const claves = new Set();
const faltan = {};
let totalFaltan = 0;
const archivos = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js') && f !== 'i18n.js').map(f => 'js/' + f);
const ignorar = src => {
    const set = new Set(); let on = false;
    src.split('\n').forEach((l, i) => {
        if (/i18n-ignore-start/.test(l)) on = true;
        if (on || /i18n-ignore(?!-)/.test(l)) set.add(i + 1);
        if (/i18n-ignore-end/.test(l)) on = false;
    });
    return set;
};
for (const f of archivos) {
    const src = rd(f), skip = ignorar(src), list = [];
    for (const s of scanJS(src)) {
        if (s.key) { if (s.txt) claves.add(s.txt); continue; }
        if (skip.has(s.line)) continue;
        if (!pareceEspañol(s.txt)) continue;
        const v = visible(s.txt);
        list.push({ linea: s.line, txt: v.length > 90 ? v.slice(0, 87) + '…' : v });
    }
    if (list.length) { faltan[f] = list; totalFaltan += list.length; }
}

// HTML: texto entre etiquetas y atributos de texto
function scanHTML(f) {
    const out = [];
    const s = rd(f).replace(/<script[\s\S]*?<\/script>/g, m => m.replace(/[^\n]/g, ' '))
        .replace(/<style[\s\S]*?<\/style>/g, m => m.replace(/[^\n]/g, ' '))
        .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
    const linea = idx => s.slice(0, idx).split('\n').length;
    const KEY = /data-t(?:-ph|-al|-ti|-co|-alt)?="([^"]+)"/g; let m;
    const deco = v => v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
    while ((m = KEY.exec(s))) claves.add(deco(m[1]));
    // En index.html cualquier texto con letras tiene que estar marcado: lo que no se traduce va en IGUAL
    const IGUAL = new Set(['nutri', 'DL', 'Fit', 'FitDL', 'FitDL PRO', 'Beta', 'Coach', 'PRO', 'IMC Prime (IMC / 25)']);
    const TXT = />([^<>]+)</g;
    while ((m = TXT.exec(s))) {
        const txt = m[1].replace(/\s+/g, ' ').trim();
        if (!txt || IGUAL.has(txt) || !/[a-zA-Záéíóúñ]/i.test(txt)) continue;
        const tag = s.slice(s.lastIndexOf('<', m.index), m.index + 1);
        if (/data-t="/.test(tag)) continue;
        out.push({ linea: linea(m.index), txt: txt.length > 90 ? txt.slice(0, 87) + '…' : txt });
    }
    const ATR = /<[^>]*?\b(placeholder|aria-label|title|content|alt)="([^"]*)"[^>]*>/g;
    while ((m = ATR.exec(s))) {
        const [tag, a, val] = m;
        if (a === 'content' && !/name="(description|apple-mobile-web-app-title)"|property="og:(title|description)"/.test(tag)) continue;
        const marca = { placeholder: 'data-t-ph', 'aria-label': 'data-t-al', title: 'data-t-ti', content: 'data-t-co', alt: 'data-t-alt' }[a];
        if (!val || IGUAL.has(val) || !/[a-zA-Záéíóúñ]/i.test(val) || tag.includes(marca + '=')) continue;
        out.push({ linea: linea(m.index), txt: `[${a}] ${val.length > 80 ? val.slice(0, 77) + '…' : val}` });
    }
    return out;
}
{ const l = scanHTML('index.html'); if (l.length) { faltan['index.html'] = l; totalFaltan += l.length; } }

// ---------------------------------------------------------------------
// 2. Traducciones disponibles
// ---------------------------------------------------------------------
let EN = {};
try {
    const vm = require('vm'), ctx = {};
    vm.createContext(ctx);
    vm.runInContext(rd('js/data/lang-en.js') + ';this.EN = LANG_EN;', ctx);
    EN = ctx.EN || {};
} catch (e) { EN = {}; }
// Toda clave necesita su entrada en inglés, aunque sea igual en los dos idiomas («Gluten»: «Gluten»)
const sinEn = [...claves].filter(k => EN[k] == null);

if (require.main === module) {
    const arg = process.argv[2] || '';
    if (arg === '--faltan') {
        for (const f in faltan) { console.log('\n' + f + '  (' + faltan[f].length + ')'); faltan[f].forEach(x => console.log('  ' + x.linea + ': ' + x.txt)); }
    } else if (arg === '--sin-en') {
        sinEn.forEach(k => console.log(JSON.stringify(k) + ': ,'));
    } else {
        const hechas = [...claves].filter(k => EN[k] != null).length;
        const total = hechas + sinEn.length + totalFaltan;
        console.log(`Con inglés: ${hechas}  ·  marcados sin inglés: ${sinEn.length}  ·  en español sin marcar: ${totalFaltan}`);
        console.log(`Cobertura: ${total ? Math.round(hechas / total * 100) : 0} %`);
        console.log('\nPor archivo (lo que falta):');
        Object.entries(faltan).sort((a, b) => b[1].length - a[1].length).forEach(([f, l]) => console.log('  ' + f.padEnd(22) + l.length));
    }
}
// Para las pruebas
module.exports = { claves: [...claves], sinEn, faltan, totalFaltan };
