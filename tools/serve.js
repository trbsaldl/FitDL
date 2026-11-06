// Servidor local de pruebas: node tools/serve.js  →  http://localhost:8766
// Sirve la carpeta del repositorio sin caché, para ver cada cambio al recargar, y comprime como GitHub Pages (gzip).
// Solo escucha en este ordenador (127.0.0.1) y nunca sirve archivos de fuera de la carpeta del proyecto.
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..'), PORT = Number(process.env.PORT) || 8766;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8' };
const ZIP = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.md']);
http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    // Como GitHub Pages: una carpeta (acaba en /) sirve su index.html
    const file = path.normalize(path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
        const ext = path.extname(file), head = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };
        if (ZIP.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { head['Content-Encoding'] = 'gzip'; head.Vary = 'Accept-Encoding'; data = zlib.gzipSync(data); }
        res.writeHead(200, head);
        res.end(data);
    });
}).listen(PORT, '127.0.0.1', () => console.log(`FitDL en http://localhost:${PORT}`));
