// Empaqueta la app en UN solo archivo HTML (CSS, JavaScript, fuentes e iconos dentro) para guardar copias
// que se abren con doble clic y sin internet. Uso: node tools/bundle.js "C:/ruta/copia.html"
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2];
if (!out) { console.log('Uso: node tools/bundle.js "C:/ruta/copia.html"'); process.exit(1); }
const read = f => fs.readFileSync(path.join(root, f.split('?')[0]), 'utf8');
// Fuentes e imágenes referenciadas desde el CSS → data: URI
const inlineUrls = (css, base) => css.replace(/url\((\.\.\/[^)]+)\)/g, (m, rel) => {
    const file = path.join(root, base, rel);
    const type = file.endsWith('.woff2') ? 'font/woff2' : file.endsWith('.png') ? 'image/png' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    return `url(data:${type};base64,${fs.readFileSync(file).toString('base64')})`;
});
let h = read('index.html');
// En la copia los scripts van dentro del HTML: la política de seguridad de la web (solo scripts en archivos aparte) los bloquearía
h = h.replace(/(<meta http-equiv="Content-Security-Policy" content="[^"]*?script-src 'self')/, "$1 'unsafe-inline'");
h = h.replace(/[ \t]*<link rel="manifest"[^>]*>\n/, '');
h = h.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => `<style>${inlineUrls(read(href), path.dirname(href))}</style>`);
h = h.replace(/[ \t]*<link rel="preload"[^>]*>\n/g, ''); // las fuentes ya van dentro del CSS
h = h.replace(/<script src="([^"]+)"(?: defer)?><\/script>/g, (m, src) => `<script>\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);
// La base de marcas se carga desde JavaScript (meta fitdl-marcas): en la copia va dentro, como un script más,
// al final y detrás de los demás (necesita la lista FOODS ya creada)
let marcas = '';
h = h.replace(/<meta name="fitdl-marcas" content="([^"]+)">/, (m, src) => { marcas = `<script>\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>\n`; return ''; });
const fin = h.lastIndexOf('</body>'); // el último: dentro de los scripts también hay textos con «</body>»
h = h.slice(0, fin) + marcas + h.slice(fin);
// Las fuentes de la portada van en un <style> de index.html (url(fonts/…)): también dentro, para que la copia se vea igual sin internet
h = h.replace(/url\((fonts\/[^)]+)\)/g, (m, rel) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, rel)).toString('base64')})`);
const svg = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'icons', 'icon.svg')).toString('base64');
h = h.replace('href="icons/icon.svg"', `href="${svg}"`).replace('href="icons/apple-touch-icon.png"', `href="${svg}"`);
fs.writeFileSync(out, h);
console.log(`${out} · ${(Buffer.byteLength(h) / 1024).toFixed(0)} KB`);
