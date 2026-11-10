// FitDL · service worker (generado por tools/build-sw.js; no editar a mano)
// Se abre al instante con la copia guardada y se refresca desde la red por detrás. Sin internet: la copia guardada.
// Las consultas a Open Food Facts no pasan por aquí.
const CACHE = 'fitdl-18efc14255';
const FILES = [
  "./css/app.css",
  "./css/fonts.css",
  "./css/icons.css",
  "./css/legal.css",
  "./css/tailwind.css",
  "./fonts/fa-regular-400.woff2",
  "./fonts/fa-solid-900.woff2",
  "./fonts/newsreader-500.woff2",
  "./fonts/newsreader-600.woff2",
  "./fonts/plus-jakarta-sans-400.woff2",
  "./fonts/plus-jakarta-sans-500.woff2",
  "./fonts/plus-jakarta-sans-600.woff2",
  "./fonts/plus-jakarta-sans-700.woff2",
  "./fonts/plus-jakarta-sans-800.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./index.html",
  "./js/analytics.js",
  "./js/app.js",
  "./js/barras.js",
  "./js/calc.js",
  "./js/coach.js",
  "./js/core.js",
  "./js/dashboard.js",
  "./js/data/exercises.js",
  "./js/data/foods-en.js",
  "./js/data/foods-marcas.js",
  "./js/data/foods.js",
  "./js/data/lang-en.js",
  "./js/diary.js",
  "./js/engine.js",
  "./js/gym.js",
  "./js/i18n.js",
  "./js/insights.js",
  "./js/kitchen.js",
  "./js/main.js",
  "./js/parser.js",
  "./js/pdf.js",
  "./js/plans.js",
  "./js/profiles.js",
  "./js/progress.js",
  "./js/wizard.js",
  "./manifest.webmanifest",
  "./privacidad.html",
  "./privacy.html",
  "./terminos.html",
  "./terms.html"
];

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
