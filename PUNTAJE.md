# PUNTAJE.md · Auditoría de FitDL

Fecha: 6 de noviembre de 2026 · Versión inicial: 3.27.0 (commit `52e7451`) · Versión final: 3.28.0 · Copia de seguridad previa a cualquier cambio: `/home/claude/backup/fitdl-original`. No se ha borrado ningún archivo; los únicos movimientos son 11 archivos de pruebas renombrados con `git mv`.

## 1. Inventario

El repositorio contiene **una sola app**: FitDL, una PWA de calorías, macros, Coach y gym (HTML + JS sin framework, Tailwind precompilado, service worker, datos en `localStorage`). Se ejecuta con `npm start` (puerto 8766) y se publica en GitHub Pages. Si tus otras apps están en otros repositorios, no entran en este puntaje.

## 2. Puntaje inicial frente a final

Puntaje general (media de las apps, aquí una sola): **73 → 83,5 / 100**. No se ha alcanzado el 90 % en todos los criterios; el detalle está abajo.

| Criterio | Máx. | Inicial | Final | % final | Meta 90 % (= mín.) |
|---|---|---|---|---|---|
| Funcionalidad y corrección | 20 | 16 | **18** | 90 % | 18 · alcanzada |
| Fiabilidad | 15 | 12 | **14** | 93 % | 13,5 · alcanzada |
| Seguridad | 15 | 10 | **11** | 73 % | 13,5 · **no alcanzada** |
| Mantenibilidad | 15 | 10 | **13** | 87 % | 13,5 · **no alcanzada** |
| Rendimiento | 10 | 6 | **6** | 60 % | 9 · **no alcanzada, no verificable** |
| Usabilidad y accesibilidad | 10 | 8 | **8** | 80 % | 9 · **no alcanzada** |
| Pruebas | 10 | 7 | **9** | 90 % | 9 · alcanzada |
| Documentación | 5 | 4 | **4,5** | 90 % | 4,5 · alcanzada |
| **Total** | **100** | **73** | **83,5** | | |

## 3. Evidencia de la nota final

**Funcionalidad (18).** `node --test`: 91 de 91 pruebas pasan. Cobertura de idioma 100 %. En Chromium (móvil 390 px y escritorio 1280 px), clic real en las 6 pestañas sin errores de consola ni peticiones caídas. La base de marcas (más de 4.000 alimentos en total) carga después del primer dibujado, y con el service worker activo la app abre **sin conexión**; ambas cosas comprobadas por `tests/humo.test.js`, y la prueba de conexión falla si se quita el service worker (comprobación negativa hecha). Corregido: 4.177 archivos apuntaban a la dirección antigua. **No verificable aquí:** escáner de códigos de barras, voz, cámara, PDF, pago PRO y que el sitio publicado responda en la nueva dirección.

**Fiabilidad (14).** Nuevas pruebas en navegador: la app abre sin errores cuando `localStorage` lanza excepciones (modo privado estricto o disco lleno) y abre sin conexión. Se mantienen las copias automáticas, la copia de rescate de perfiles y el registro local de errores de `js/core.js`. Resta: no he probado red lenta ni la actualización del service worker entre versiones.

**Seguridad (11).** Cambio: `script-src 'self'` en lugar de `'self' 'unsafe-inline'`, con `script-src-attr 'unsafe-inline'` solo para los `onclick`. Un `<script>` inyectado ya no se ejecuta; una prueba confirma que los `onclick` siguen funcionando y fallan si se bloquean. Sigue sin cambios: unos 300 manejadores en línea (64 en `index.html`, 199 `onclick` generados en `js/`), `style-src 'unsafe-inline'`, y PRO y la prueba de 7 días guardados en el dispositivo (los puede saltar quien sepa; lo dice `plans.js`). `security.txt` corregido a la dirección nueva. **No verificable aquí:** `npm audit`, osv-scanner, gitleaks, semgrep (sin red). Búsqueda manual de patrones de secretos en los cambios: nada.

**Mantenibilidad (13).** ESLint configurado (`eslint.config.js`, `npm run lint`) y en cero avisos tras eliminar código muerto real (`FNAME` en `calc.js`, variables sin uso en `diary.js`, `setupDay` en 3 pruebas, `ES` en `i18n-check.js`). Pruebas renombradas por tema (`idioma`, `coach-memoria`, `lector-codigos-barras`…). Marca «nutriDL» sustituida en comentarios, textos públicos y documentación. Resta: todo sigue en el ámbito global con `onclick` en línea, y `tools/marcas/` conserva scripts casi duplicados (`off_fetch.js` a `off_fetch9.js`) que no he tocado sin tu permiso.

**Rendimiento (6).** No he podido ejecutar Lighthouse aquí, así que no cambio la nota. Se mantiene la medición documentada del 28-10 (móvil publicado 84, LCP 4,0 s) con descuento. Subirla exige tu decisión sobre `font-display: optional` y medirlo con Lighthouse.

**Usabilidad y accesibilidad (8).** Medido y ahora comprobado en cada ejecución: 0 controles sin nombre accesible, un `h1`, `lang` definido y sin scroll horizontal en 390 px. Sin cambios en la interfaz. **No verificable:** contraste real y lectores de pantalla.

**Pruebas (9).** 91 pruebas (88 anteriores + 3 en navegador real). ESLint y Playwright se ejecutan en el flujo de GitHub (`.github/workflows/test.yml`; no he podido probar ese flujo desde aquí). Resta: no hay medición de cobertura.

**Documentación (4,5).** README con lint, prueba de navegador y la nota sobre las claves `nutridl_*`; `ESTADO.md`, `SEGURIDAD-Y-PUBLICACION.md`, `PLAY-STORE.md` y `LICENSE` con la dirección nueva; entrada 3.28.0 en `CHANGELOG.md`. Resta: la tabla de la sección 1 de `ESTADO.md` conserva cifras antiguas.

## 4. Por qué no se llega al 90 % en todo y qué haría falta

| Criterio | Qué falta | Por qué no lo hice o no puedo | Alternativa propuesta |
|---|---|---|---|
| Seguridad (11 → 13,5) | Sustituir ~300 `onclick` por escuchadores y quitar `script-src-attr 'unsafe-inline'`; validar PRO en servidor; auditorías de dependencias | Los `onclick` generados llevan argumentos dinámicos; reescribirlos sin pruebas de cada flujo arriesga romper la app. PRO en servidor necesita cuentas y backend. Las auditorías necesitan red | Hacerlo por pestañas, una por versión, con una prueba de clic por flujo; ejecutar `npm audit`, osv-scanner y gitleaks en tu portátil o con Claude Code |
| Mantenibilidad (13 → 13,5) | Consolidar `tools/marcas/off_fetch*.js` | Pediste no borrar sin avisar | Dime si los fusiono en un solo script con parámetro de versión |
| Rendimiento (6 → 9) | Bajar LCP y subir Lighthouse móvil | Sin Lighthouse no se puede medir | Medirlo tú o desde Claude Code; decidir sobre `font-display: optional` (+1 a +2 según tu propia medición) |
| Usabilidad (8 → 9) | Comprobar contraste y lectores de pantalla | No verificable aquí | Pasar axe o Lighthouse accesibilidad en tu equipo |

## 5. Cambios realizados

| # | Cambio | Archivos |
|---|---|---|
| 1 | Dirección única `trbsaldl.github.io/FitDL/`; páginas SEO regeneradas (`npm run seo`); marca visible «FitDL» | `tools/seo/paginas.js`, `sitemap.xml`, 4.163 `alimentos/*.html`, `terminos.html`, `terms.html`, `.well-known/security.txt`, `LICENSE`, `docs/*.md`, `.claude/product-marketing.md` |
| 2 | ESLint, scripts `lint` y `check`, código muerto eliminado | `eslint.config.js` (nuevo), `package.json`, `js/calc.js`, `js/diary.js`, `tools/build-icons.js`, `tools/i18n-check.js`, `tools/serve.js` |
| 3 | Pruebas en navegador (pestañas con clic, accesibilidad, almacenamiento bloqueado, carga de marcas, sin conexión) y pruebas renombradas por tema | `tests/humo.test.js` (nuevo), 11 archivos de `tests/` renombrados, `tests/coach-memoria`, `tests/momentos-de-hoy`, `tests/ejercicios-propios-y-alimentos-colombianos` (línea sin uso) |
| 4 | Integración continua con lint y navegador | `.github/workflows/test.yml` |
| 5 | CSP: `script-src 'self'` + `script-src-attr 'unsafe-inline'` | `index.html` (línea 16) |
| 6 | Marca «nutriDL» → «FitDL» en comentarios y textos públicos (se conservan `nutridl_*` y la sal PRO) | `js/*.js` (comentarios), `css/app.css`, `tools/tailwind.config.js`, `docs/*.md` |
| 7 | Versión 3.28.0, `sw.js` regenerado con `tools/build-sw.js`, README, ESTADO y CHANGELOG | `js/core.js`, `package.json`, `package-lock.json`, `sw.js`, `index.html` (marcas `?v=`), `README.md`, `docs/ESTADO.md`, `CHANGELOG.md` |

## 6. Qué queda pendiente

- Ejecutar Lighthouse, `npm audit`, osv-scanner, gitleaks y semgrep fuera de este entorno y anotar las cifras.
- Comprobar que la dirección nueva responde y que el flujo de GitHub pasa con ESLint y Playwright.
- `npm run build` no se pudo ejecutar completo (faltan dependencias sin red): se regeneró solo `sw.js`. Antes de publicar, ejecútalo en tu equipo.
- Decisiones tuyas: fusionar scripts de `tools/marcas/`, `font-display: optional`, y si seguimos con la retirada de los `onclick`.
