// Prueba de humo en un navegador real: abre la app, recorre las pestañas y comprueba lo básico de accesibilidad.
// Necesita Playwright (en GitHub se instala en el flujo de trabajo). Si no está, la prueba se salta con aviso.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* sin Playwright */ }

function arrancarServidor(port) {
    const srv = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'serve.js')], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
    return new Promise((ok, fail) => {
        srv.stdout.once('data', () => ok(srv));
        srv.once('error', fail);
        setTimeout(() => fail(new Error('El servidor no arrancó')), 8000);
    });
}

test('Navegador: la app abre, las pestañas funcionan y no hay errores', { timeout: 90000, skip: chromium ? false : 'Playwright no está instalado (npm i --no-save playwright)' }, async () => {
    const PORT = 8791, srv = await arrancarServidor(PORT);
    const browser = await chromium.launch();
    try {
        for (const [nombre, viewport] of [['móvil', { width: 390, height: 844 }], ['escritorio', { width: 1280, height: 800 }]]) {
            const page = await browser.newPage({ viewport });
            const errores = [], caidas = [];
            page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
            page.on('pageerror', e => errores.push(String(e)));
            page.on('requestfailed', r => caidas.push(r.url()));
            await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
            await page.waitForTimeout(1500);
            const info = await page.evaluate(() => ({
                pestanas: [...new Set([...document.querySelectorAll('[data-tab]')].map(x => x.dataset.tab))],
                scrollH: document.documentElement.scrollWidth > innerWidth,
                lang: document.documentElement.lang,
                h1: document.querySelectorAll('h1').length,
                sinNombre: [...document.querySelectorAll('button,a,input,select,textarea')].filter(e => e.type !== 'hidden' && e.offsetParent !== null && !(e.getAttribute('aria-label') || e.textContent || e.title || e.placeholder || '').trim()).length,
            }));
            assert.ok(info.pestanas.length >= 6, `${nombre}: faltan pestañas`);
            assert.equal(info.scrollH, false, `${nombre}: hay scroll horizontal`);
            assert.ok(info.lang, `${nombre}: falta lang`);
            assert.equal(info.h1, 1, `${nombre}: debe haber un h1`);
            assert.equal(info.sinNombre, 0, `${nombre}: hay controles sin nombre accesible`);
            // Clic real en cada pestaña visible: demuestra que los onclick en línea funcionan con la CSP
            for (const t of info.pestanas) {
                const boton = page.locator(`[data-tab="${t}"]:visible`).first();
                if (await boton.count() === 0) continue;
                await boton.click();
                await page.waitForTimeout(200);
                // showTab marca el panel visible y deja body[data-tab] con la pestaña elegida
                const visible = await page.evaluate(x => ({ body: document.body.dataset.tab, panel: !!document.querySelector(`[data-panel="${x}"]:not(.hidden)`) }), t);
                assert.equal(visible.body, t, `${nombre}: la pestaña ${t} no responde al clic`);
                assert.ok(visible.panel, `${nombre}: el panel ${t} no se muestra`);
            }
            assert.deepEqual(errores, [], `${nombre}: errores de consola`);
            assert.deepEqual(caidas, [], `${nombre}: peticiones caídas`);
            await page.close();
        }
    } finally { await browser.close(); srv.kill(); }
});

test('Navegador: si el almacenamiento está bloqueado o lleno, la app abre igualmente', { timeout: 90000, skip: chromium ? false : 'Playwright no está instalado (npm i --no-save playwright)' }, async () => {
    const PORT = 8792, srv = await arrancarServidor(PORT);
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const fallos = [];
        page.on('pageerror', e => fallos.push(String(e)));
        // Simula navegación privada estricta o disco lleno: cualquier lectura o escritura lanza una excepción
        await page.addInitScript(() => {
            const boom = () => { throw new DOMException('Quota', 'QuotaExceededError'); };
            for (const m of ['getItem', 'setItem', 'removeItem']) Storage.prototype[m] = boom;
        });
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        const abre = await page.evaluate(() => document.querySelectorAll('[data-tab]').length >= 6);
        assert.ok(abre, 'La app no pinta la barra de pestañas sin almacenamiento');
        assert.deepEqual(fallos, [], 'Errores sin controlar con el almacenamiento bloqueado');
    } finally { await browser.close(); srv.kill(); }
});

test('Navegador: los productos de marca cargan aparte y la app abre sin conexión', { timeout: 90000, skip: chromium ? false : 'Playwright no está instalado (npm i --no-save playwright)' }, async () => {
    const PORT = 8793, srv = await arrancarServidor(PORT);
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        // ?sw=1 activa el service worker también en localhost
        await page.goto(`http://localhost:${PORT}/?sw=1`, { waitUntil: 'load' });
        await page.waitForFunction(() => FOODS.length > 4000, null, { timeout: 15000 }); // 143 KB de base + marcas cargadas después
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.reload({ waitUntil: 'load' }); // ya bajo el control del service worker
        await page.waitForTimeout(1500);
        await ctx.setOffline(true);
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => FOODS.length > 4000, null, { timeout: 15000 });
        const pestanas = await page.evaluate(() => new Set([...document.querySelectorAll('[data-tab]')].map(x => x.dataset.tab)).size);
        assert.ok(pestanas >= 6, 'Sin conexión la app no abre');
    } finally { await browser.close(); srv.kill(); }
});
