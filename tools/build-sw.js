// 1) Pone a cada CSS/JS de index.html una marca de versión (?v=huella del contenido): así ningún móvil
//    ni el servidor de GitHub mezclan archivos de versiones distintas.
// 2) Genera sw.js: abre al instante con lo guardado y lo refresca por detrás; las versiones nuevas se instalan solas.
// Uso: npm run build (lo incluye)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const hashOf = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

// --- 1. Marcas de versión en index.html ---
const idxPath = path.join(root, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
idx = idx.replace(/(<(?:link rel="stylesheet" href|script src)=")((?:css|js)\/[^"?]+)(?:\?v=[0-9a-f]+)?(")/g,
    (m, a, file, b) => `${a}${file}?v=${hashOf(fs.readFileSync(path.join(root, file)))}${b}`);
// Las @font-face (1 KB) van dentro de index.html: una petición menos que bloquee el primer pintado.
// Se copian siempre de css/fonts.css (rutas ../fonts → fonts), así nunca se desincronizan.
const fontsCss = fs.readFileSync(path.join(root, 'css', 'fonts.css'), 'utf8').trim().replace(/\.\.\/fonts\//g, 'fonts/');
idx = idx.replace(/<link rel="stylesheet" href="css\/fonts\.css(?:\?v=[0-9a-f]+)?">|<style id="fonts-inline">[\s\S]*?<\/style>/,
    () => `<style id="fonts-inline">${fontsCss}</style>`);
// La base de marcas se carga desde JavaScript, así que su versión va en la <meta> que la nombra
idx = idx.replace(/(<meta name="fitdl-marcas" content=")((?:js)\/[^"?]+)(?:\?v=[0-9a-f]+)?(")/,
    (m, a, file, b) => `${a}${file}?v=${hashOf(fs.readFileSync(path.join(root, file)))}${b}`);
fs.writeFileSync(idxPath, idx);

// --- 2. Lista de archivos y versión global ---
const files = ['index.html', 'privacidad.html', 'terminos.html', 'privacy.html', 'terms.html', 'manifest.webmanifest'];
for (const d of ['css', 'js', 'fonts', 'icons']) {
    const walk = p => fs.readdirSync(p, { withFileTypes: true }).forEach(e => { const f = path.join(p, e.name); if (e.isDirectory()) walk(f); else files.push(path.relative(root, f).replace(/\\/g, '/')); });
    walk(path.join(root, d));
}
files.sort();
const h = crypto.createHash('sha256');
files.forEach(f => h.update(f).update(fs.readFileSync(path.join(root, f))));
const version = h.digest('hex').slice(0, 10);

const sw = `// FitDL · service worker (generado por tools/build-sw.js; no editar a mano)
// Se abre al instante con la copia guardada y se refresca desde la red por detrás. Sin internet: la copia guardada.
// Las consultas a Open Food Facts no pasan por aquí.
const CACHE = 'fitdl-${version}';
const FILES = ${JSON.stringify(files.map(f => './' + f), null, 2)};

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', ...FILES].map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fitdl-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    const req = e.request, url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    // Las páginas públicas «Calorías de…» (alimentos/) van siempre por la red: no son la app ni se guardan en el móvil
    if (url.pathname.includes('/alimentos/')) return;
    // Abre AL INSTANTE con la copia guardada de esta versión y, a la vez, la refresca desde la red.
    // (Antes esperaba a la red hasta 4 s en cada apertura.) Las versiones nuevas llegan con un sw.js nuevo:
    // se instala por detrás y la app se recarga sola una vez (main.js), con todo lo apuntado ya guardado.
    e.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req) || await cache.match(req, { ignoreSearch: true })
            || (req.mode === 'navigate' ? await cache.match('./index.html') || await cache.match('./') : null);
        const net = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
        if (hit) { e.waitUntil(net.catch(() => { })); return hit; }
        return net;
    })());
});
`;
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log(`sw.js: ${files.length} archivos · versión ${version} · index.html con marcas de versión`);
