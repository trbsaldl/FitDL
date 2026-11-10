# Estado de FitDL y plan «todo por encima del 7»

> **Para Claude: lee este archivo antes de explorar el código o medir nada.**
> Evita repetir lighthouse, greps de estructura y auditorías ya hechas.
> Si una cifra tiene más de un mes o tocas la zona, vuelve a medirla y actualiza aquí.

Última medición: **20 de octubre de 2026** · versión **3.8.1**

> **22-10-2026 · 3.13.0:** ronda con las skills de negocio. Competencia y voz del cliente en `docs/COMPETENCIA.md` (580 reseñas de Play ES: el dolor nº 1 del mercado es «todo es de pago»). Hecho: aviso de fin de prueba PRO, «Seguir gratis» en la pantalla PRO, enlace a la app en PDF y lista de la compra, notas propias + 5 rankings en las páginas SEO (1.920 direcciones en el sitemap), ficha de Play optimizada. Pruebas: 54 pasan. Copia: «appdura 19.0» = 3.12.0 (la próxima es la 20.0).
> **22-10-2026 · 3.14.0:** HECHO lo que aprobó Ángel: titular «Cuenta calorías gratis de verdad», promesa pública de gratuidad (portada, FAQ y Play), objetivo de recomposición corporal y macros a mano. 60 pruebas pasan.
> **22-10-2026 · 3.15.0:** +111 productos más escaneados en España (2.391 alimentos; 2.022 páginas SEO). Tanda v7 en tools/marcas (off_fetch7 → off_build3 v7 → off_v7_revision → off_embed).
> **23-10-2026 · 3.16.0:** auditoría total (seguridad, datos, Coach). Arreglado: Coach que apuntaba sin preguntar, guardado silencioso con almacenamiento lleno, «NaN» con comidas sin macros. Modelo de amenazas en `docs/SEGURIDAD-Y-PUBLICACION.md`. semgrep: 18 avisos, todos falsos positivos en `tools/` (scripts locales). 68 pruebas. Copia «appdura 21.0» = 3.15.0.
> **23-10-2026 · 3.17.0:** paleta mixta C (verde `ok-*` en tailwind solo para «vas bien»), editar nombre/macros en el diario, editar/borrar mis alimentos, renombrar/ordenar/ocultar ejercicios. 72 pruebas. Copia «appdura 22.0» = 3.16.0.
> **23-10-2026 · 3.18.0:** verde en TODO lo de «bien» (decisión de Ángel), superseries de 2 ejercicios (e.ss en el primero; ssFix en gym.js), gráfica de peso con todos los registros. 74 pruebas. Copia «appdura 23.0» = 3.17.0.
> **23-10-2026 · 3.19.0:** «Compartir mi semana» rehecho (vista previa, historia 9:16 y post 4:5, titular con lo mejor de la semana, calendario, invitación «gratis, sin anuncios», texto ya escrito; drawWeekCard en progress.js). 75 pruebas. Copia «appdura 24.0» = 3.18.0 (la próxima es la 25.0).
> **23-10-2026 · 3.20.0:** Coach mucho más listo: quitar/deshacer hablando, guardar el peso, «¿qué entreno hoy?», metas realistas («5 kg en un mes»), deporte, dolor (deriva al profesional), sueño, fibra, azúcar, músculo, cardio… (bloque 3.20 en coach.js, después de replySinHambre). 81 pruebas. Copia «appdura 25.0» = 3.19.0 (la próxima es la 26.0). fmt() agrupa siempre los miles (useGrouping always).
> **24-10-2026 · 3.21.0:** +572 alimentos y bebidas (2.391 → **2.963**; 2.051 de marca, 914 genéricos). Hacendado 499 → **805**. Dos vías nuevas y reutilizables: genéricos con `tools/genericos/sr_simple.js` (convierte el volcado SR Legacy del USDA) + `lista_v2.js` → `build.js` → `usda_v2.json` → `embed.js`; marcas con `tools/marcas/off_fetch8.js` → `off_build8.js` → `off_embed.js` (tanda v8, agrupada por categoría en vez de por marca, con nombres de marca limpios). 2.596 páginas SEO. 81 pruebas. **El volcado del USDA no se guarda en el repo**: se baja de fdc.nal.usda.gov (SR Legacy, JSON, 13 MB). **Open Food Facts estaba caído**: faltan por descargar las categorías de lácteos, bolleria, sándwiches, frutas, zumos y refrescos de marca (`node tools/marcas/off_fetch8.js` las retoma: salta lo ya descargado).
> **25-10-2026 · 3.22.0 · Modo PRO revisado (skills `paywalls` + `mente-emprendedora`).** Lo engañoso, corregido: la tabla ya no marca con ✓ lo que no existe (IA, reconocer foto, sincronizar → nota aparte); «Foto del plato» → **«Calculadora de plato»** (no reconoce nada, lo marcas tú); el precio real es **pago único 24,99 €** porque el código nunca caducó (mensual/anual quedan como «cuando se pueda pagar en la app»). **Al acabar la prueba ya no desaparecen el menú ni la compra** que hiciste: se quedan en solo lectura (`proMenu`/`proShop` en coach.js y kitchen.js) y se avisa antes (`trasLaPrueba()` en plans.js). `proPreview(feature)` enseña una vista previa con los datos del propio usuario antes de pedir dinero. **Análisis avanzado** ya vale lo que cuesta: `renderAnalisis()` + `exportCSV()` en progress.js (medias 7/30/90, patrón por día de la semana, macros reales y exportar diario/resumen a CSV con BOM y `;` para Excel en español). Cifras de la portada al día (2.900+ alimentos, 800+ Hacendado). `PAY_LINK` y el hueco de Cloudflare Web Analytics con instrucciones paso a paso. 81 pruebas, i18n al 100 %.
> **26-10-2026 · 3.24.0:** +356 productos de marca (2.963 → **3.319**: 2.405 de marca, 914 genéricos; 2.242 con código de Open Food Facts) al terminar la tanda v8 (`off_fetch8.js` → `off_build8.js` → `off_embed.js`; 24 archivos en `tools/marcas/cache_off/v8_*`, 786 productos válidos tras limpiar marcas). **2.956 páginas SEO.** +38 ejercicios (95 → **133**) con variaciones de agarre y de máquina y tres grupos nuevos (trapecio, aductores, antebrazo), todos con `cue` y con inglés. 81 pruebas, i18n al 100 %. La copia «appdura 27.0» se hizo ya con la 3.25.0.
> **27-10-2026 · 3.25.0:** +1.213 productos de pan, pasta, galletas y bollos (3.319 → **4.532**: 3.618 de marca, 914 genéricos, 401 marcas). Tanda v9: `tools/marcas/off_fetch9.js` (22 familias, 52 archivos `cache_off/v9_*`, 4.423 productos) → `off_build9.js` (misma revisión que la v8, con la v8 ya contada como «lo que hay» y marcas mejor escritas) → `off_embed.js`. **4.163 páginas SEO** (sitemap con 4.172 direcciones). `js/data/foods.js` = 644 KB. **Escáner propio de códigos de barras** en `js/barras.js` (EAN-13, EAN-8 y UPC leídos de la imagen, sin librerías): funciona aunque el navegador no tenga `BarcodeDetector` (iPhone/Safari, Firefox). Variantes de código (UPC-12, cero delante, ITF-14, UPC-E), kcal calculadas desde los macros o desde la ración, y si el producto no existe, el formulario sale con el código puesto y al guardarlo queda reconocido para siempre (`fs.cfPre`). Freno de Open Food Facts: 8 → 20 por minuto. 88 pruebas (7 nuevas del lector), i18n al 100 %. Copia «appdura 27.0» = 3.25.0 (la próxima es la 28.0).
> **27-10-2026 · 3.26.0 · revisión de seguridad y legal antes de publicar** (detalle en `docs/SEGURIDAD-Y-PUBLICACION.md`). gitleaks (archivos + historial) limpio, `npm audit --omit=dev` 0, **osv-scanner 0** (se fijó `postcss-selector-parser` 6.1.5), semgrep 24 avisos **todos falsos positivos** (`tools/`, servidor local y SRI de archivos propios), 88 pruebas, i18n 100 %. Nuevo: guardia anti-clickjacking en `js/core.js` (GitHub Pages no deja cabeceras), `.well-known/security.txt` + `.nojekyll`, términos **v2.0** (aviso legal con nombre y hueco `hidden` para NIF/domicilio, condiciones del PRO, licencias ODbL, 18+, ley aplicable y reclamaciones) y privacidad **v4.3** (lectura del código en el propio dispositivo, 20 consultas/min, apartado de cookies). Cifras públicas al día (4.532 alimentos, 889 Hacendado). **Lighthouse móvil del sitio publicado: 78 / 100 / 100 / 100, LCP 4,2 s** (antes 88 y 3,1 s con 2.280 alimentos): la base ha crecido y conviene cargar las marcas después del primer dibujado — pendiente de decidir. Copia «appdura 28.0» = 3.26.0 (la próxima es la 29.0).
> **28-10-2026 · 3.27.0 · rendimiento sin quitar alimentos.** Los 3.618 productos de marca salen de `js/data/foods.js` (644 → 143 KB) a **`js/data/foods-marcas.js`** (502 KB), que ya **no** es una etiqueta `<script>`: su ruta va en `<meta name="nutridl-marcas">` (con `?v=` que pone `build-sw.js`) y `cargarMarcas()` en core.js la inserta al `load` (requestIdleCallback) o antes si abres el buscador/escáner; al llegar, `marcasListas()` repite la búsqueda abierta. Tocado también: `off_embed.js` (escribe en el archivo nuevo), `tools/seo/paginas.js`, `off_v7_revision.js`, `genericos/auditar.js` y las 11 pruebas (cargan los dos archivos) y `bundle.js` (la copia de un archivo lo mete dentro como script). Además: precarga de las 4 fuentes de la primera pantalla y `content-visibility` en las secciones de portada que quedan fuera de pantalla. **Lighthouse móvil (local): 80-83 / 100 / 100 / 100 · FCP 1,7 → 1,3 s · SI 5,2 → 3,5 s · TBT 210 → 110 ms · peso inicial 578 → 449 KB.** El LCP (4,3-4,9 s) es el subtítulo de la portada repintado al llegar la letra; medido: con `font-display: optional` sube a **85** y el SI baja a 2,2 s, pero en la primera visita lenta los textos saldrían con la letra del sistema — **decisión de Ángel, no aplicado**. 88 pruebas, i18n 100 %. **Medido ya publicado (28-10, móvil): rendimiento 78 → 84 · FCP 1,8 → 1,5 s · LCP 4,2 → 4,0 s · SI 5,2 → 3,6 s · accesibilidad, buenas prácticas y SEO 100.**
> **10-11-2026 · 3.31.0 · raciones reales de marca.** 1.848 productos tenían «1 ración = 100 g»; 321 pasan a la ración del fabricante (Open Food Facts, `tools/marcas/off_raciones.js` → `raciones.json`, aplicada en `off_embed.js`; caché extra en `cache_off/raciones_extra.json`). Quedan 1.527 en 100 g por falta de dato fiable. `tests/raciones-marca.test.js`. **96 pruebas, ESLint limpio.**
> **09-11-2026 · 3.30.0 · Colombia.** 26 alimentos con ficha USDA (`tools/genericos/lista_v3.js` SR Legacy + `lista_platos_v3.js` FNDDS → `usda_v3.json`/`platos_v3.json`; `embed.js` los incluye). `REGION_WORDS` en `diary.js` (lo usan el buscador y `matchFoods` del lector): papa, jugo, banano, fríjoles, arveja, habichuela, ahuyama, gaseosa, durazno, carne de res/molida, torta, ponqué, tinto, arequipe… Faltan buñuelo colombiano y panela (no están en USDA) y la tabla ICBF 2018 (`Downloads/tcac_web.pdf` es un escaneo cifrado, sin texto). 4.189 páginas SEO. **94 pruebas, ESLint limpio.**
> **06-11-2026 · 3.29.1 · arreglo de botones + pasta y arroz ya cocidos.** El `<body data-tab>` hacía que el listener único de clic (3.28-3.29) se tragara todos los `data-action` (Instalar la app, Empezar gratis, PRO, informe, borrar datos, vistas del Coach, enlaces internos): ahora solo `button[data-tab]`/`button[data-cv]`. `ND.on(fn)` pasa el evento: corregidos los botones rápidos del inicio, «Mi nevera», «Parar» del gym y `shareSave`; `mergeState` repara franjas no válidas a «Otros». 9 alimentos cocidos nuevos (espaguetis, macarrones, tallarines, fideos, penne, espirales, espaguetis integrales, basmati, vaporizado). `tests/clics.test.js` (3). **91 pruebas pasan, ESLint limpio.**
> **06-11-2026 · 3.29.0 · eliminación de `script-src-attr 'unsafe-inline'` de la CSP.** Todos los `on*="…"` de HTML (onclick, oninput, onchange, onsubmit, onkeydown, onblur) reemplazados por delegación de eventos vía `ND` (`data-h`, `data-ih`, `data-ch`, `data-sh`, `data-kd`, `data-bh`) en los 11 archivos JS de la app. `script-src-attr 'unsafe-inline'` eliminado de la CSP en `index.html`. Pruebas de seguridad de apóstrofos/comillas y de historial de gym actualizadas para el nuevo patrón ND. **91 pruebas pasan.** Puntaje de seguridad: 11 → 13,5.
> **06-11-2026 · 3.28.0 · revisión de calidad (ver `PUNTAJE.md`).** Una sola dirección pública (`trbsaldl.github.io/FitDL/`) en sitemap, 4.163 páginas SEO, legales, `security.txt` y licencia. CSP: `script-src 'self'` + `script-src-attr 'unsafe-inline'` (los `onclick` siguen; un `<script>` inyectado ya no corre). ESLint (`npm run lint`, también en GitHub) sin avisos. `tests/humo.test.js`: pruebas en navegador real (pestañas con clic, accesibilidad básica, almacenamiento bloqueado, marcas cargadas aparte, modo sin conexión). Pruebas renombradas por tema. **91 pruebas pasan.** Las claves `nutridl_*` y la sal de los códigos PRO se mantienen a propósito. Puntaje de la auditoría: 73 → 83,5.
> **Quedan como opción (Ángel no las eligió):** exportar a Excel/CSV y capturas de Play con textos.

## 1. Lo que ya está medido (no repetir)

| Medición | Resultado | Cómo se midió |
|---|---|---|
| Lighthouse escritorio | 99 / 100 / 100 / 100 | `lighthouse <url> --preset=desktop` |
| Lighthouse móvil | 88 / 100 / 100 / 100 | `lighthouse <url>` |
| LCP móvil | 3,1 s · CLS 0 · TBT 170 ms | idem |
| Peso de la portada | 364 KiB | idem |
| Pruebas | 34 pasan, 0 fallan | `npm test` |
| Alimentos | 2.280 (1.909 con azúcares, 1.508 de marca) | `js/data/foods.js` |
| Páginas SEO | 1.913 en `alimentos/` + sitemap de 1.915 | `npm run seo` |
| Código JS | 4.687 líneas en 19 archivos | `wc -l js/*.js` |
| Secretos | gitleaks limpio | `gitleaks detect --source . --redact` |
| Dependencias | 2 avisos, solo herramientas de construcción | `osv-scanner scan source -r .` |

Archivos más grandes: `coach.js` 688 · `diary.js` 560 · `gym.js` 489 · `engine.js` 360.

## 2. Puntuación por apartados (20-10-2026)

**Por encima del 7 — no tocar, ya están bien:**
velocidad escritorio 9,9 · velocidad móvil 8,8 · accesibilidad 9 · buenas prácticas 10 ·
SEO técnico 10 · sin internet 9 · sensación de app 9 · seguridad 8 ·
funciones 9 · base de alimentos 8,5 · diseño 8 · primera vez 8 · legal 7,5

**Por debajo del 7 — objetivo de este plan:**

| Apartado | Ahora | Meta | Decisión de Ángel (20-10-2026) |
|---|---|---|---|
| Saber cuánta gente la usa | 2 | 8 | Cloudflare Web Analytics (gratis, sin cookies) |
| ~~Idiomas~~ | ~~3~~ **8,5** | ✅ | HECHA en la 3.12.0 · ES/EN completo; faltan los nombres de marca y las páginas SEO |
| Estar en Play Store | 3 | 7 | Guía en `PLAY-STORE.md`; falta cuenta y 12 testers |
| Cobrar | 3 | 7 | Códigos a mano ahora; Stripe cuando llegue el momento |
| Guardar datos en la nube | 4 | 8 | **Supabase gratis**: cuentas, sincronización y PRO no falseable |
| ~~Coach «inteligente»~~ | ~~5~~ **7,5** | ✅ | Hecho en la 3.9.0 · reglas, sin IA |
| ~~Que la gente vuelva~~ | ~~5,5~~ **7,5** | ✅ | Hecho en la 3.10.0 · push real queda para la F5 |
| Pruebas automáticas | 6,5 → **7,5** | 9 | 51 pruebas. Para un 9 hacen falta ~100 (diario, perfiles, gym) |

## 3. Plan por fases

Marca cada fase como HECHA aquí al terminarla.

- [x] **F1 · Coach que parece IA** — HECHA en la 3.9.0 (20-10-2026). Nota 5 → 7,5.
  Memoria de 20 min (`coachCtx`, `followUp()` en `js/coach.js`), 13 temas nuevos en `RX`,
  frases variables con `vary()`, y una pregunta ya no se apunta sola en el diario.
  Pruebas en `tests/coach-memoria.test.js`. Pendiente si se quiere subir más: notas de voz y
  que recuerde entre días (ahora el chat se borra cada día, a propósito).
- [ ] **F2 · Analítica** · Ángel crea cuenta en Cloudflare → una línea en `index.html`.
- [x] **F3 · Enganche** — HECHA en la 3.10.0 (20-10-2026). Nota 5,5 → 7,5.
  `dayMoment()` en `js/insights.js` + tarjeta `.nd-moment` arriba de «Hoy»: racha en peligro,
  resumen semanal (lunes a miércoles), vuelta tras 3+ días y oferta del recordatorio `.ics`.
  Como mucho un aviso al día (`state.moments`). Pruebas en `tests/momentos-de-hoy.test.js`.
  **Lo que falta para un 9**: avisos de verdad al móvil (push), y eso necesita servidor → va con la F5.
- [ ] **F4 · Pruebas** · subir de 34 a ~55 cubriendo Coach, diario y perfiles.
- [ ] **F5 · Nube (Supabase)** · la más grande, en 3 pasos: cuentas → sincronizar → PRO real.
- [x] **F6 · Inglés (ES / EN)** — HECHA en la 3.12.0 (21-10-2026). Nota 3 → 8,5.
  Selector ES/EN en el menú del perfil (`I18N_READY = true`). Cobertura del comprobador: **100 %**
  (1.382 textos con inglés, 0 sin marcar). Medir siempre con `node tools/i18n-check.js`
  (y `--faltan` / `--sin-en`); el comprobador ya marca como fallo **cualquier** texto de `index.html`
  con letras que no esté marcado (la lista de excepciones es `IGUAL`, dentro de `tools/i18n-check.js`).
  - Motor: `js/i18n.js` (`tr()`, `tk()`, `tp()`, `setLang()`, `locale()`, `dateTxt()`, `pctTxt()`,
    `eur()`, `foodName()`, `applyStaticI18n()` — que también cambia `content`, `alt` y el `href`
    de las páginas legales con `data-t-hr`). Diccionario: `js/data/lang-en.js`.
  - Nombres de alimentos genéricos en inglés: `js/data/foods-en.js` (772, por id). `foodName(f)` usa
    `f.en` si existe y si no esa tabla. El buscador (`matchFoods`) mira los dos idiomas a la vez.
  - El Coach y el lector de comidas entienden inglés: patrones `RX` y `FOLLOW` (coach.js),
    `NUM_WORDS`, `UNIT_WORDS`, `STOP`, `PHRASES_EN`, `CANON` y `SLOT_HINTS` (parser.js),
    y `SHOP_FILL` / `NEG` / `ALLERGY_WORDS` (kitchen.js). Dictado por voz con `locale()`.
  - Páginas legales en inglés: `privacy.html` y `terms.html`.
  - **Lo que sigue en español, a propósito o pendiente:**
    1. Los 1.508 productos **de marca** (McDonald's, Hacendado, Danone…). Un producto se llama
       como se llama; traducirlos es una decisión, no un fallo. 1.112 llevan alguna palabra
       en español («Hamburguesa con queso»). Si se hace: añadir su `en` a `js/data/foods-en.js`.
    2. Las 1.913 páginas públicas «Calorías de…» (`npm run seo`): decidir si se generan en inglés.
    3. Los mensajes **ya guardados** del chat conservan el idioma en el que se escribieron
       (se guardan como HTML). El chat se vacía cada día, así que se arregla solo.

- [ ] **F8 · Subir a 9 lo que está en 7,5** (encargo del 20-10-2026)
  - **Coach 7,5 → 9**: inglés HECHO en la 3.12.0 (entiende las mismas preguntas en los dos idiomas).
    Queda: más temas y que el lector de comidas acepte frases sueltas mejor. Sin IA externa, por decisión de Ángel.
  - **Enganche 7,5 → 9**: necesita avisos de verdad al móvil (push) → depende de la F5 (servidor).
    Sin servidor no se puede pasar de 7,5 honestamente.
  - **Pruebas 7,5 → 9**: de 51 a ~100, cubriendo diario, perfiles, gym y calculadora.
- [ ] **F7 · Play Store** · cuenta de desarrollador y 12 testers (necesita a Ángel).

## 4. Lo que necesita a Ángel (no lo puede hacer Claude)

1. Cuenta gratis en **cloudflare.com** → Web Analytics → copiar el token. (F2)
2. Cuenta gratis en **supabase.com** → proyecto nuevo → copiar URL y clave pública. (F5)
3. Cuenta de **Google Play** (25 $ una vez) y 12 personas que prueben 14 días. (F7)
4. Dominio propio (opcional, pero subiría el SEO de 7,5 a 9).

## 5. Atajos que ahorran tiempo

- Copia de seguridad **antes de cualquier cambio**:
  `node tools/bundle.js "C:/Users/angel/Desktop/Trbs-aldl/Nutri versions/appdura N.0.html"`
  Hecha hasta la **24.0** → la próxima es la 25.0.
- Tras tocar `js/data/foods.js`: `npm run seo`. Tras tocar clases o iconos: `npm run build`.
- Publicar: subir `APP_VERSION` (js/core.js), `package.json` y `CHANGELOG.md`, luego commit y push a `main`.
- Los códigos PRO están **fuera del repo**, en `Desktop/Trbs-aldl/Nutri versions/`. Nunca mostrarlos.
- **Texto dentro de un `onclick`**: `esc()` solo vale para el contenido HTML. Dentro de un atributo
  `onclick` hay que hacer `esc(JSON.stringify(texto))`, porque el navegador deshace `&#39;` antes de
  leer el JavaScript y un nombre con apóstrofo (o con código) se saldría de la cadena.
