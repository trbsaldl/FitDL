// Genera css/icons.css y fonts/fa-*.woff2 SOLO con los iconos de Font Awesome que usa la app
// (Font Awesome Free: iconos CC BY 4.0, fuentes SIL OFL 1.1, código MIT). Uso: npm run icons
const fs = require('fs'), path = require('path');
const subsetFont = require('subset-font');
const root = path.join(__dirname, '..');
const faDir = path.join(root, 'node_modules', '@fortawesome', 'fontawesome-free');

(async () => {
    // 1) Clases fa-* usadas en el HTML y el JavaScript
    const files = [path.join(root, 'index.html')];
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); });
    walk(path.join(root, 'js'));
    const used = new Set(files.flatMap(f => fs.readFileSync(f, 'utf8').match(/fa-[a-z0-9-]+/g) || []));

    // 2) Reglas base + reglas de los iconos usados
    const full = fs.readFileSync(path.join(faDir, 'css', 'all.min.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [];
    for (let i = 0, depth = 0, start = 0; i < full.length; i++) {
        if (full[i] === '{') depth++;
        else if (full[i] === '}' && --depth === 0) { rules.push(full.slice(start, i + 1)); start = i + 1; }
    }
    const solid = new Set(), keep = [];
    for (const r of rules) {
        const sel = r.slice(0, r.indexOf('{')), body = r.slice(r.indexOf('{'));
        if (sel.startsWith('@font-face') || /FontAwesome|fa-v4compat/i.test(r)) continue;
        const icon = body.match(/--fa:"\\?([0-9a-f]+)"/i) || body.match(/content:"\\([0-9a-f]+)"/i);
        if (/^\.fa-[a-z0-9-]+(:before)?(,\.fa-[a-z0-9-]+(:before)?)*$/.test(sel.trim()) && icon) {
            const hit = sel.split(',').map(x => x.replace(':before', '').replace('.', '').trim()).filter(n => used.has(n));
            if (!hit.length) continue;
            solid.add(parseInt(icon[1], 16));
            keep.push(hit.map(n => '.' + n + ':before').join(',') + body);
            continue;
        }
        keep.push(r);
    }
    // Fuentes recortadas: sólida (900) y normal (400, para los iconos fa-regular)
    const text = [...solid].map(c => String.fromCodePoint(c)).join('');
    let total = 0;
    for (const file of ['fa-solid-900.woff2', 'fa-regular-400.woff2']) {
        const buf = await subsetFont(fs.readFileSync(path.join(faDir, 'webfonts', file)), text, { targetFormat: 'woff2' });
        fs.writeFileSync(path.join(root, 'fonts', file), buf); total += buf.length;
    }
    const face = [[900, 'solid-900'], [400, 'regular-400']].map(([w, f]) => `@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:${w};font-display:block;src:url(../fonts/fa-${f}.woff2) format("woff2")}`).join('');
    const css = '/* Font Awesome Free (fontawesome.com · iconos CC BY 4.0, fuentes SIL OFL 1.1, código MIT) — solo los iconos usados */\n' + face + keep.join('');
    fs.writeFileSync(path.join(root, 'css', 'icons.css'), css);
    console.log(`Iconos: ${solid.size} · icons.css ${(css.length / 1024).toFixed(1)} KB · fuentes ${(total / 1024).toFixed(1)} KB`);
})();
