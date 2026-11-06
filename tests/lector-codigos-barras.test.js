// Pruebas de la 3.25: el lector propio de códigos de barras (js/barras.js) y las variantes de un código
const { test } = require('node:test');
const assert = require('node:assert/strict');
const B = require('../js/barras.js');

// --- Dibuja un código de barras de verdad, para comprobar que el lector lo lee ---
const W = [[3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2], [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]];
const PRIM = ['000000', '001011', '001101', '001110', '010011', '011001', '011100', '010101', '010110', '011010'];
// Anchos → bits. Empieza en blanco (izquierda) o en negro (derecha), y el juego B es el patrón al revés.
function bits(d, juego) {
    const w = juego === 1 ? W[d].slice().reverse() : W[d];
    let s = '', color = juego === 2 ? '1' : '0';   // juego 2 = el de la derecha (empieza en barra)
    for (const n of w) { s += color.repeat(n); color = color === '0' ? '1' : '0'; }
    return s;
}
function dibujar(code) {
    const d = code.split('').map(Number);
    let s = '101';
    if (d.length === 13) {
        const par = PRIM[d[0]];
        for (let i = 1; i <= 6; i++) s += bits(d[i], +par[i - 1]);
        s += '01010';
        for (let i = 7; i < 13; i++) s += bits(d[i], 2);
    } else {
        for (let i = 0; i < 4; i++) s += bits(d[i], 0);
        s += '01010';
        for (let i = 4; i < 8; i++) s += bits(d[i], 2);
    }
    return s + '101';
}
function linea(code, { escala = 3, claro = 255, oscuro = 20, margen = 20, alrevés = false } = {}) {
    let b = dibujar(code);
    if (alrevés) b = b.split('').reverse().join('');
    const px = [];
    for (let i = 0; i < margen; i++) px.push(claro);
    for (const c of b) for (let k = 0; k < escala; k++) px.push(c === '1' ? oscuro : claro);
    for (let i = 0; i < margen; i++) px.push(claro);
    return Uint8Array.from(px);
}

test('dígito de control: acepta los códigos buenos y rechaza los malos', () => {
    assert.equal(B.barrasCheck('8480000123459'), true);   // Hacendado
    assert.equal(B.barrasCheck('3017620422003'), true);   // Nutella
    assert.equal(B.barrasCheck('5449000000996'), true);   // Coca-Cola
    assert.equal(B.barrasCheck('8480000123456'), false);
    assert.equal(B.barrasCheck('20886509'), true);        // EAN-8
    assert.equal(B.barrasCheck('20886500'), false);
});

test('lee un EAN-13 de una línea de píxeles', () => {
    for (const c of ['8480000123459', '3017620422003', '5449000000996', '8410076472106']) {
        assert.equal(B.barrasLeerLinea(linea(c)), c, c);
    }
});

test('lo lee con la cámara lejos o cerca, con poca luz y con el producto boca abajo', () => {
    const c = '8480000123459';
    assert.equal(B.barrasLeerLinea(linea(c, { escala: 1 })), c, 'lejos (1 píxel por módulo)');
    assert.equal(B.barrasLeerLinea(linea(c, { escala: 7 })), c, 'cerca');
    assert.equal(B.barrasLeerLinea(linea(c, { claro: 160, oscuro: 90 })), c, 'poca luz');
    assert.equal(B.barrasLeerLinea(linea(c, { alrevés: true })), c, 'boca abajo');
});

test('lee un EAN-8 (productos pequeños)', () => {
    assert.equal(B.barrasLeerLinea(linea('20886509')), '20886509');
});

test('no se inventa nada: una línea sin código devuelve null', () => {
    assert.equal(B.barrasLeerLinea(new Uint8Array(400).fill(255)), null, 'blanco');
    const ruido = Uint8Array.from({ length: 600 }, (_, i) => (i * 97) % 2 ? 250 : 10);
    assert.equal(B.barrasLeerLinea(ruido), null, 'rayas sin sentido');
});

test('busca el código en toda la imagen, también si el móvil está girado', () => {
    const c = '8410076472106', L = linea(c), w = L.length, h = 40;
    const img = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) img.set(L, y * w);
    assert.equal(B.barrasLeerGris(img, w, h), c, 'horizontal');
    const vert = new Uint8Array(w * h);                     // el mismo código girado 90°
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) vert[x * h + y] = L[x];
    assert.equal(B.barrasLeerGris(vert, h, w), c, 'girado 90°');
});

test('un mismo producto, escrito de varias maneras (UPC de EE. UU., caja de 14, cero delante)', () => {
    assert.deepEqual(B.barrasVariantes('041196910087').slice(0, 2), ['041196910087', '0041196910087']);
    assert.ok(B.barrasVariantes('08480000123459').includes('8480000123459'), 'ITF-14 → EAN-13');
    assert.ok(B.barrasVariantes('0611269991000').includes('611269991000'), 'EAN-13 con cero → UPC-A');
    assert.equal(B.barrasUpcE('04252614'), '042100005264', 'UPC-E → UPC-A');
    assert.deepEqual(B.barrasVariantes('abc'), [], 'sin números no hay nada que buscar');
});
