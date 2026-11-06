// FitDL · PDF del plan e impresión
'use strict';

// =====================================================================
//  IMPRESIÓN
// =====================================================================

function triggerPrintReport() {
    const c = calc;
    const row = (k, v) => `<div><strong>${k}:</strong> ${v}</div>`;
    $('printable-report').innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center border-b-2 border-mint-600 pb-3">
                <div>
                    <h1 class="text-2xl font-extrabold">nutri<span class="text-mint-600">DL</span> · ${tr('Informe nutricional')}</h1>
                    <p class="text-xs text-neutral-400">${tr('Estimación orientativa basada en ecuaciones validadas')}</p>
                </div>
                <div class="text-right text-xs font-bold">${new Date().toLocaleDateString(locale())}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 bg-neutral-800/60 rounded-xl border space-y-1">
                    <div class="font-bold border-b pb-1">${tr('Datos')}</div>
                    ${row(tr('Sexo'), c.male ? tr('Hombre') : tr('Mujer'))}${row(tr('Edad'), tr('{k} años', { k: state.age }))}
                    ${row(tr('Peso / estatura'), `${state.weight} kg · ${state.height} cm`)}
                    ${row(tr('IMC'), `${fmt(c.bmi, 1)} (${c.bmiCat})`)}
                    ${c.bf !== null ? row(tr('% grasa'), tr('{p} ({s}) · masa magra {k} kg', { p: pctTxt(fmt(c.bf, 1)), s: tr(c.bfSrc), k: fmt(c.ffm, 1) })) : ''}
                    ${c.whtr ? row(tr('Cintura/altura'), fmt(c.whtr, 2)) : ''}
                </div>
                <div class="p-3 bg-neutral-800/60 rounded-xl border space-y-1">
                    <div class="font-bold border-b pb-1">${tr('Metabolismo y objetivo')}</div>
                    ${row(tr('Gasto basal'), `${fmt(c.bmr)} kcal (${{ mifflin: 'Mifflin-St Jeor', katch: 'Katch-McArdle', hb: 'Harris-Benedict' }[c.formula]})`)}
                    ${row(tr('Mantenimiento'), `${fmt(c.tdee)} kcal`)}
                    ${row(tr('Calorías objetivo'), tr('{k} kcal/día', { k: fmt(c.target) }))}
                    ${row(tr('Ritmo estimado'), tr('{k} kg/semana', { k: fmt(c.weeklyKg, 2) }))}
                    ${row(tr('Agua de bebida'), tr('≈ {k} L/día', { k: fmt(c.water, 1) }))}
                </div>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center text-xs">
                <div class="p-2 border rounded-xl"><div class="font-bold">${tr('Proteínas')}</div><div class="font-extrabold text-sm">${c.prot} g</div></div>
                <div class="p-2 border rounded-xl"><div class="font-bold">${tr('Grasas')}</div><div class="font-extrabold text-sm">${c.fat} g</div></div>
                <div class="p-2 border rounded-xl"><div class="font-bold">${tr('Hidratos')}</div><div class="font-extrabold text-sm">${c.carbs} g</div></div>
                <div class="p-2 border rounded-xl"><div class="font-bold">${tr('Fibra')}</div><div class="font-extrabold text-sm">≥ ${c.fiber} g</div></div>
            </div>
            <div class="border-t pt-3 text-[10px] text-neutral-400 text-center">${tr('Documento orientativo generado por FitDL. No sustituye el consejo de un profesional sanitario. Pesos de cereales, legumbre seca y carnes en crudo.')}</div>
        </div>`;
    window.print();
}

// =====================================================================
//  AÑADIDO: PLAN EN PDF (archivo .pdf real, sin librerías ni internet)
//  window.print() no funciona en muchos móviles ni navegadores integrados (WhatsApp, Instagram...):
//  aquí se genera el PDF directamente (Helvetica, codificación WinAnsi: admite tildes y ñ)
// =====================================================================
const PDF_W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const PDF_WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‰': 0x89, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
function pdfClean(s) {
    return String(s ?? '').replace(/≈\s?/g, tr('aprox.') + ' ').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[→➜]/g, '->').replace(/−/g, '-').replace(/[   ]/g, ' ')
        .replace(/[^\x20-\x7e¡-ÿ€‚„…‰‘’“”•–—™]/gu, '').replace(/\s{2,}/g, ' ').trim();
}
function pdfCharW(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 32 && c <= 126) return PDF_W[c - 32];
    const base = ch.normalize('NFD')[0];
    if (base !== ch && base.charCodeAt(0) <= 126) return PDF_W[base.charCodeAt(0) - 32];
    return 556;
}
const pdfTextW = (s, size, bold) => [...s].reduce((a, ch) => a + pdfCharW(ch), 0) * size / 1000 * (bold ? 1.1 : 1);
function pdfWrap(s, width, size, bold) {
    const words = pdfClean(s).split(' '), lines = []; let cur = '';
    words.forEach(w => {
        const t = cur ? cur + ' ' + w : w;
        if (pdfTextW(t, size, bold) <= width || !cur) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
}
function pdfDoc() {
    const W = 595.28, H = 841.89, M = 42;
    const pages = []; let ops = null;
    const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(v => v.toFixed(3)).join(' '); };
    const enc = s => [...pdfClean(s)].map(ch => { const c = ch.charCodeAt(0); const b = c <= 255 ? c : PDF_WIN[ch] || 63; return b === 40 || b === 41 || b === 92 ? '\\' + String.fromCharCode(b) : String.fromCharCode(b); }).join('');
    const d = {
        W, H, M, y: 0, cw: W - 2 * M,
        page() { ops = []; pages.push(ops); d.y = M; },
        ensure(h) { if (!ops || d.y + h > H - M - 18) d.page(); },
        text(x, y, s, o = {}) {
            const size = o.size || 10, str = pdfClean(s);
            if (o.align === 'right') x -= pdfTextW(str, size, o.bold);
            ops.push(`BT /${o.bold ? 'F2' : 'F1'} ${size} Tf ${rgb(o.color || '#1f1f1f')} rg ${x.toFixed(2)} ${(H - y).toFixed(2)} Td (${enc(str)}) Tj ET`);
        },
        rect(x, y, w, h, color) { ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${(H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); },
        line(x1, y1, x2, y2, color = '#dddddd', lw = 0.6) { ops.push(`${rgb(color)} RG ${lw} w ${x1.toFixed(2)} ${(H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(H - y2).toFixed(2)} l S`); },
        // Párrafo con salto de línea y de página automáticos
        para(s, o = {}) {
            const size = o.size || 9.5, lh = size * 1.38, x = M + (o.indent || 0), width = (o.width || d.cw) - (o.indent || 0);
            pdfWrap(s, width, size, o.bold).forEach(l => { d.ensure(lh); d.text(x, d.y + size, l, { ...o, size }); d.y += lh; });
        },
        h1(s) { d.ensure(40); d.y += 8; d.rect(M, d.y, 4, 18, '#9a6b40'); d.text(M + 12, d.y + 14, s, { size: 15, bold: 1, color: '#2a1d12' }); d.y += 28; },
        h2(s, right) {
            d.ensure(30); d.y += 4;
            d.rect(M, d.y, d.cw, 20, '#f3ece3');
            d.text(M + 8, d.y + 14, s, { size: 10.5, bold: 1, color: '#5b3d22' });
            if (right) d.text(M + d.cw - 8, d.y + 14, right, { size: 9, color: '#5b3d22', align: 'right' });
            d.y += 26;
        },
        // Fila "nombre ........ cantidad" con nota debajo
        row(left, right, note, o = {}) {
            const size = o.size || 9.5, rw = right ? pdfTextW(pdfClean(right), size, true) + 12 : 0;
            const lines = pdfWrap(left, d.cw - rw - (o.indent || 0) - 8, size, o.bold);
            const noteLines = note ? pdfWrap(note, d.cw - (o.indent || 0) - 20, size - 1.5) : [];
            d.ensure(lines.length * size * 1.35 + noteLines.length * (size - 1.5) * 1.35 + 4);
            lines.forEach((l, k) => {
                d.text(M + 8 + (o.indent || 0), d.y + size, l, { size, bold: o.bold });
                if (!k && right) d.text(M + d.cw - 8, d.y + size, right, { size, bold: 1, color: '#7a5230', align: 'right' });
                d.y += size * 1.35;
            });
            noteLines.forEach(l => { d.text(M + 18 + (o.indent || 0), d.y + size - 1.5, l, { size: size - 1.5, color: '#6b6b6b' }); d.y += (size - 1.5) * 1.35; });
            d.y += 2;
        },
        gap(h = 8) { d.y += h; },
        build(meta) {
            const N = pages.length;
            pages.forEach((p, i) => {
                ops = p;
                d.line(M, H - 30, W - M, H - 30, '#e4dcd2');
                d.text(M, H - 18, meta.footer, { size: 7.5, color: '#8a8a8a' });
                d.text(W - M, H - 18, tr('Página {a} de {b}', { a: i + 1, b: N }), { size: 7.5, color: '#8a8a8a', align: 'right' });
            });
            const objs = [];
            objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
            objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
            objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
            const kids = [];
            pages.forEach((p, i) => {
                const pi = 5 + i * 2, ci = pi + 1, body = p.join('\n');
                kids.push(`${pi} 0 R`);
                objs[pi] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci} 0 R >>`;
                objs[ci] = `<< /Length ${body.length} >>\nstream\n${body}\nendstream`;
            });
            objs[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${N} >>`;
            objs.push(`<< /Title (${enc(meta.title)}) /Producer (FitDL) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}) >>`);
            const info = objs.length - 1;
            let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const off = [];
            for (let i = 1; i < objs.length; i++) { off[i] = out.length; out += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
            const xref = out.length;
            out += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + off.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
            out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
            const bytes = new Uint8Array(out.length);
            for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
            return bytes;
        },
    };
    return d;
}

function buildPlanPdf(opt) {
    const c = calc, d = pdfDoc(), name = pdfClean(opt.name) || tr('Cliente');
    d.page();
    // Cabecera
    d.rect(0, 0, d.W, 92, '#2a1d12');
    d.rect(0, 92, d.W, 4, '#9a6b40');
    d.text(d.M, 40, 'nutri', { size: 24, bold: 1, color: '#ffffff' });
    d.text(d.M + pdfTextW('nutri', 24, 1), 40, 'DL', { size: 24, bold: 1, color: '#dcc19c' });
    d.text(d.M, 62, opt.title, { size: 12, color: '#e6d3b3' });
    d.text(d.M, 79, tr('Para: {n}', { n: name }), { size: 10, bold: 1, color: '#ffffff' });
    d.text(d.W - d.M, 40, new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }), { size: 10, color: '#e6d3b3', align: 'right' });
    d.y = 116;

    if (opt.summary) {
        d.h1(tr('Resumen y objetivo'));
        const goal = { t: tr(GOAL_TYPES[c.G.t][0]), tag: c.G.t === 'maintain' ? pctTxt(0) : (c.goal > 0 ? '+' : '−') + pctTxt(fmt(Math.abs(c.goal) * 100, 0)) };
        const kcalDia = v => tr('{k} kcal/día', { k: fmt(v) });
        const kv = [
            [tr('Datos'), `${c.male ? tr('Hombre') : tr('Mujer')} · ${tr('{k} años', { k: state.age })} · ${state.weight} kg · ${state.height} cm`],
            [tr('IMC'), `${fmt(c.bmi, 1)} (${c.bmiCat})${c.bf !== null ? ' · ' + tr('grasa {p}', { p: pctTxt(fmt(c.bf, 1)) }) : ''}`],
            [tr('Gasto basal'), kcalDia(c.bmr)],
            [tr('Mantenimiento'), kcalDia(c.tdee)],
            [tr('Objetivo'), `${goal.t} · ${goal.tag}`],
            [tr('Calorías del plan'), kcalDia(c.target)],
            [tr('Ritmo estimado'), tr('{k} kg/semana', { k: fmt(c.weeklyKg, 2) })],
            [tr('Agua de bebida'), tr('≈ {k} L/día', { k: fmt(c.water, 1) })],
        ];
        kv.forEach(([k, v]) => { d.ensure(15); d.text(d.M + 8, d.y + 10, k, { size: 9.5, color: '#6b6b6b' }); d.text(d.M + 130, d.y + 10, v, { size: 9.5, bold: 1 }); d.y += 15; });
        d.gap(6); d.ensure(52);
        const bw = (d.cw - 18) / 4;
        [[tr('Proteínas'), `${c.prot} g`], [tr('Grasas'), `${c.fat} g`], [tr('Hidratos'), `${c.carbs} g`], [tr('Fibra'), `>= ${c.fiber} g`]].forEach(([k, v], i) => {
            const x = d.M + i * (bw + 6);
            d.rect(x, d.y, bw, 44, '#f3ece3');
            d.text(x + bw / 2 - pdfTextW(k, 8.5) / 2, d.y + 16, k, { size: 8.5, color: '#7a5230' });
            d.text(x + bw / 2 - pdfTextW(v, 14, 1) / 2, d.y + 35, v, { size: 14, bold: 1, color: '#2a1d12' });
        });
        d.y += 56;
    }
    if (opt.gym) {
        const g = myGym(), N = gymDays();
        d.page();
        d.h1(tr('Entrenamiento · {x}/semana', { x: tp(N, 'día', 'días') }));
        if (!N) d.para(tr('Aún no se han elegido los días de entrenamiento.'), { size: 9 });
        g.plan.slice(0, N).forEach((p, i) => {
            d.h2(p.name ? wTitle(p.name) : tr('Día {k}', { k: i + 1 }), tp(p.ex.length, 'ejercicio', 'ejercicios'));
            if (!p.ex.length) d.para(tr('Sin ejercicios todavía.'), { size: 9 });
            p.ex.forEach((e, k) => {
                const lp = lastPerfOf(e);
                const nd = e.s.filter(s => s.t === 'drop').length;
                d.row(`${k + 1}. ${exLabel(e)}`, tp(e.s.length, 'serie', 'series') + (nd ? ` (${nd} dropset)` : ''), lp ? tr('Última vez: {x}', { x: lp.map(s => setText(s, ' x ').replace(/↓/g, 'drop')).join(' · ') }) : '');
            });
            d.gap(4);
        });
        const L = bestLifts();
        if (L.length) {
            d.h2(tr('Pesos más altos'), '');
            L.forEach(b => d.row(exLabel(b), b.s.kg ? `${kgTxt(b.s.kg)} kg x ${b.s.reps}` : `${b.s.reps} reps`, tp(b.n, 'serie', 'series')));
        }
    }
    d.gap(10); d.ensure(40);
    d.line(d.M, d.y, d.M + d.cw, d.y, '#cccccc'); d.gap(6);
    d.para(tr('Documento orientativo generado con FitDL. No sustituye el consejo de un médico o dietista-nutricionista. No indicado en embarazo, lactancia, menores de 18 años, trastornos de la conducta alimentaria u otras patologías sin supervisión profesional.'), { size: 7.5, color: '#8a8a8a' });
    return d.build({ title: `${opt.title} - ${name}`, footer: `${opt.title} · ${name} · FitDL · ${SHARE_URL}` });
}

// ----- Ventana "Descargar plan en PDF" -----
let pdfUrl = null;
function openPdfModal(focus) {
    if (!calc.target && focus !== 'gym') { toast('Primero pon tus datos en la Calculadora y pulsa Aceptar'); showTab('calc'); return; }
    const cur = profiles.list[profiles.current];
    $('pdf-name').value = $('pdf-name').value || (cur ? cur.name : '');
    $('pdf-opt-summary').checked = focus !== 'gym';
    $('pdf-opt-gym').checked = focus === 'gym';
    $('pdf-result').innerHTML = '';
    $('pdf-share').classList.toggle('hidden', !(navigator.canShare && window.File && (() => { try { return navigator.canShare({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] }); } catch (e) { return false; } })()));
    $('pdf-modal').classList.remove('hidden');
    setTimeout(() => { if (matchMedia('(pointer: fine)').matches) $('pdf-name').focus(); }, 30);
}
function closePdfModal() { $('pdf-modal').classList.add('hidden'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('pdf-modal').classList.contains('hidden')) closePdfModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('gym-records') && !$('gym-records').classList.contains('hidden')) closeRecords(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('nd-sheet') && !$('nd-sheet').classList.contains('hidden') && $('confirm-modal').classList.contains('hidden')) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('food-sheet') && !$('food-sheet').classList.contains('hidden')) closeFoodSheet(); });
function pdfOptions() {
    const o = { name: $('pdf-name').value.trim() || (profiles.list[profiles.current] || {}).name || tr('Cliente'), summary: $('pdf-opt-summary').checked, gym: $('pdf-opt-gym').checked };
    const food = o.summary;
    o.title = food && o.gym ? tr('Plan nutricional y de entrenamiento') : o.gym ? tr('Plan de entrenamiento') : tr('Plan nutricional');
    return o;
}
async function makePdf(mode) {
    const o = pdfOptions();
    if (!o.summary && !o.gym) { toast('Marca al menos una parte del plan'); return; }
    let bytes;
    try { bytes = buildPlanPdf(o); } catch (e) { console.error(e); toast('No se pudo crear el PDF'); return; }
    const slug = norm(o.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente'; // i18n-ignore (nombre de archivo)
    const filename = `FitDL-plan-${slug}-${todayISO()}.pdf`;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    if (mode === 'share') {
        const file = new File([blob], filename, { type: 'application/pdf' });
        try { await navigator.share({ files: [file], title: o.title }); toast('PDF compartido'); closePdfModal(); return; }
        catch (e) { if (e && e.name === 'AbortError') return; } // si falla, se descarga
    }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = pdfUrl; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    // Por si el navegador no permite descargas (algunos navegadores dentro de apps): enlace para abrirlo
    $('pdf-result').innerHTML = `<div class="p-3 rounded-xl bg-mint-500/10 border border-mint-500/30 text-xs text-neutral-200 space-y-1">
        <p><i class="fa-solid fa-circle-check text-ok-400"></i> ${tr('{n} creado ({k} KB).', { n: '<b>' + esc(filename) + '</b>', k: Math.max(1, Math.round(bytes.length / 1024)) })}</p>
        <p>${tr('¿No se ha descargado? {a} y guárdalo o compártelo desde ahí.', { a: `<a href="${pdfUrl}" target="_blank" rel="noopener" class="underline font-bold text-mint-300">${tr('Abrir el PDF')}</a>` })}</p></div>`;
    toast('PDF descargado');
}
function printFromPdfModal() { closePdfModal(); triggerPrintReport(); }

