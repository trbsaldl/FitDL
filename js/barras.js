// FitDL · Lectura de códigos de barras sin depender del navegador
// ---------------------------------------------------------------------
// Muchos móviles (iPhone con Safari, Firefox…) no traen BarcodeDetector, así que aquí va un lector
// propio de EAN-13, EAN-8 y UPC (los códigos de la comida en todo el mundo). Lee una línea de la
// imagen en gris, mide las barras y los huecos y saca los números. Sin librerías ni internet.
'use strict';

// Anchos (en módulos) de cada dígito en el juego A/C. El juego B es el mismo patrón al revés.
const BARRAS_W = [[3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2], [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]];
// El primer dígito del EAN-13 no se dibuja: se lee en la mezcla de juegos (A = 0, B = 1) de los 6 de la izquierda
const BARRAS_PRIM = { '000000': 0, '001011': 1, '001101': 2, '001110': 3, '010011': 4, '011001': 5, '011100': 6, '010101': 7, '010110': 8, '011010': 9 };

// Dígito de control: EAN-13 pesa 1,3,1,3… y EAN-8 pesa 3,1,3,1…
function barrasCheck(code) {
    const d = String(code).split('').map(Number);
    if (d.length !== 13 && d.length !== 8 && d.length !== 12 && d.length !== 14) return false;
    if (d.some(x => !Number.isInteger(x))) return false;
    const cuerpo = d.slice(0, -1), ctrl = d[d.length - 1];
    let suma = 0;
    // Se pesa de derecha a izquierda: el más cercano al control siempre vale 3
    for (let i = cuerpo.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) suma += cuerpo[i] * w;
    return (10 - suma % 10) % 10 === ctrl;
}

// Un dígito a partir de los anchos de sus 4 franjas → { d, juego } (juego 0 = A/C, 1 = B)
function barrasDigito(l) {
    const total = l[0] + l[1] + l[2] + l[3];
    if (!(total > 0)) return null;
    const m = l.map(x => x * 7 / total);
    let mejor = null;
    for (let d = 0; d < 10; d++) {
        const p = BARRAS_W[d];
        for (let juego = 0; juego < 2; juego++) {
            const q = juego ? [p[3], p[2], p[1], p[0]] : p;
            let err = 0;
            for (let k = 0; k < 4; k++) err += (m[k] - q[k]) ** 2;
            if (!mejor || err < mejor.err) mejor = { d, juego, err };
        }
    }
    return mejor && mejor.err < 0.9 ? mejor : null;
}

// Mide una tira de franjas (claro/oscuro alternos) y devuelve el código, o null
function barrasDeFranjas(f, s, digitos) {
    const mod = (f[s] + f[s + 1] + f[s + 2]) / 3;                       // la guía inicial son 3 franjas de 1 módulo
    if (!(mod > 0.6)) return null;
    const mitad = digitos === 13 ? 6 : 4;
    const faltan = 3 + mitad * 4 + 5 + mitad * 4 + 3;
    if (s + faltan > f.length) return null;
    for (let k = s; k < s + 3; k++) if (Math.abs(f[k] / mod - 1) > 0.45) return null;

    let i = s + 3;
    const izq = [], par = [];
    for (let n = 0; n < mitad; n++, i += 4) {
        const r = barrasDigito([f[i], f[i + 1], f[i + 2], f[i + 3]]);
        if (!r) return null;
        izq.push(r.d); par.push(r.juego);
    }
    for (let k = i; k < i + 5; k++) if (Math.abs(f[k] / mod - 1) > 0.5) return null;  // guía del medio
    i += 5;
    const der = [];
    for (let n = 0; n < mitad; n++, i += 4) {
        const r = barrasDigito([f[i], f[i + 1], f[i + 2], f[i + 3]]);
        if (!r || r.juego !== 0) return null;                            // la derecha siempre es juego C
        der.push(r.d);
    }
    for (let k = i; k < i + 3; k++) if (Math.abs(f[k] / mod - 1) > 0.5) return null;  // guía final

    let code;
    if (digitos === 13) {
        const primero = BARRAS_PRIM[par.join('')];
        if (primero == null) return null;
        code = String(primero) + izq.join('') + der.join('');
    } else {
        if (par.some(x => x !== 0)) return null;                         // en EAN-8 la izquierda es todo juego A
        code = izq.join('') + der.join('');
    }
    return barrasCheck(code) ? code : null;
}

// Convierte una línea en gris (0-255) en franjas y prueba a leerla en los dos sentidos
function barrasLeerLinea(gris) {
    const n = gris.length;
    if (n < 60) return null;
    let min = 255, max = 0;
    for (let i = 0; i < n; i++) { const v = gris[i]; if (v < min) min = v; if (v > max) max = v; }
    if (max - min < 45) return null;                                     // esa línea no tiene barras
    const corte = (min + max) / 2;
    // Franjas: cuántos píxeles seguidos del mismo color, empezando siempre por una oscura
    const f = []; let ini = -1, oscuro = false;
    for (let i = 0; i < n; i++) {
        const o = gris[i] < corte;
        if (ini < 0) { if (!o) continue; ini = i; oscuro = true; continue; }
        if (o !== oscuro) { f.push(i - ini); ini = i; oscuro = o; }
    }
    if (ini >= 0) f.push(n - ini);
    if (f.length < 43) return null;                                      // un EAN-8 ya son 43 franjas
    for (const franjas of [f, f.slice().reverse()]) {
        // Si se lee al revés (producto boca abajo), la primera franja tiene que volver a ser oscura
        const base = franjas === f ? 0 : (franjas.length % 2 ? 0 : 1);
        for (let s = base; s + 43 <= franjas.length; s += 2)
            for (const d of [13, 8]) { const c = barrasDeFranjas(franjas, s, d); if (c) return c; }
    }
    return null;
}

// Recorre una imagen en gris por líneas horizontales y verticales (por si el móvil está girado)
function barrasLeerGris(gris, w, h, lineas) {
    const N = lineas || 24;
    for (let k = 1; k <= N; k++) {
        const y = Math.round(h * k / (N + 1));
        const fila = gris.subarray ? gris.subarray(y * w, y * w + w) : gris.slice(y * w, y * w + w);
        const c = barrasLeerLinea(fila);
        if (c) return c;
    }
    const col = new Uint8Array(h);
    for (let k = 1; k <= N; k++) {
        const x = Math.round(w * k / (N + 1));
        for (let y = 0; y < h; y++) col[y] = gris[y * w + x];
        const c = barrasLeerLinea(col);
        if (c) return c;
    }
    return null;
}

// =====================================================================
//  El mismo producto, escrito de varias maneras
//  Un código se puede imprimir como UPC de 12, EAN de 13 con un cero delante, ITF-14 en la caja…
//  Se prueban todas las formas para que el producto salga sea de donde sea.
// =====================================================================
function barrasVariantes(raw) {
    const base = String(raw || '').replace(/\D/g, '');
    const v = [];
    const add = c => { if (c && c.length >= 8 && c.length <= 14 && !v.includes(c)) v.push(c); };
    add(base);
    if (base.length === 12) add('0' + base);                             // UPC-A de EE. UU. → EAN-13
    if (base.length === 13 && base[0] === '0') add(base.slice(1));
    if (base.length === 14) { add(base.slice(1)); if (base.slice(0, 2) === '00') add(base.slice(2)); }
    if (base.length === 13) add('0' + base);                             // en la caja (ITF-14)
    if (base.length === 8) { add(base.padStart(13, '0')); const u = barrasUpcE(base); if (u) { add(u); add('0' + u); } }
    add(base.replace(/^0+/, ''));
    return v.filter(Boolean);
}

// UPC-E (8 números) → UPC-A (12) → EAN-13: así también salen los productos americanos pequeños
function barrasUpcE(c) {
    if (!/^[01]\d{7}$/.test(c)) return null;
    const s = c.slice(1, 7), ult = c[6], ctrl = c[7], sis = c[0];
    let cuerpo;
    if (ult <= '2') cuerpo = s.slice(0, 2) + ult + '0000' + s.slice(2, 5);
    else if (ult === '3') cuerpo = s.slice(0, 3) + '00000' + s.slice(3, 5);
    else if (ult === '4') cuerpo = s.slice(0, 4) + '00000' + s[4];
    else cuerpo = s.slice(0, 5) + '0000' + ult;
    return sis + cuerpo + ctrl;
}

// Formatos que se le piden al lector del navegador cuando existe (los que soporte, no más)
const BARRAS_FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'code_128', 'code_39', 'code_93', 'codabar', 'databar', 'data_matrix', 'qr_code'];

if (typeof module !== 'undefined' && module.exports) module.exports = { barrasCheck, barrasLeerLinea, barrasLeerGris, barrasVariantes, barrasUpcE, BARRAS_FORMATOS };

