# PUNTAJE.md · Auditoría de FitDL

Fecha: 6 de noviembre de 2026 · Versión auditada: 3.27.0 (commit `52e7451`) · Copia de seguridad: `/home/claude/backup/fitdl-original` (antes de cualquier cambio; no se ha modificado ni borrado nada).

## 1. Inventario

El repositorio contiene **una sola app**, no varias: FitDL, una PWA de calorías, macros, Coach y gym.

| App | Tecnología | Cómo se ejecuta | Tamaño |
|---|---|---|---|
| FitDL | HTML + JS sin framework (25 archivos, 6.397 líneas en `js/`), Tailwind 3 precompilado, service worker, datos en `localStorage` | `npm start` (servidor local `tools/serve.js`, puerto 8766); publicada en GitHub Pages | 4.312 archivos; 4.170 son páginas SEO generadas en `alimentos/` |

Si tus otras apps están en otros repositorios, no están incluidas en este puntaje.

## 2. Diagnóstico inicial

Puntaje general (media de las apps, aquí solo una): **73 / 100**.

| Criterio | Máx. | FitDL | Evidencia y límites |
|---|---|---|---|
| Funcionalidad y corrección | 20 | **16** | `node --test`: 88 de 88 pruebas pasan. `tools/i18n-check.js`: cobertura 100 %. Prueba de humo en Chromium (móvil 390 px y escritorio 1280 px): las 6 pestañas (`home, food, coach, progress, gym, calc`) abren sin errores de consola ni peticiones fallidas. **Fallo real:** 4.177 archivos (sitemap, los 4.170 `alimentos/*.html`, `terminos.html`, `terms.html`, `security.txt`) siguen apuntando a `https://trbs-aldl.github.io/nutridl-app/`, mientras `index.html` y el README usan `https://trbsaldl.github.io/FitDL/`. Las canonicals de las páginas SEO apuntan a una dirección que quizá ya no existe (no verificable: la red está restringida). **No verificable aquí:** escáner de códigos de barras, voz, cámara, PDF, modo sin conexión, pago PRO. |
| Fiabilidad | 15 | **12** | `js/core.js`: lecturas y escrituras de `localStorage` con `try/catch`, copia automática al llenarse el almacenamiento (líneas 81-87), copia de rescate de perfiles (107), registro local de errores (39). Hay pruebas de casos límite (NaN sin macros, apóstrofos, almacenamiento lleno). Resta: todo el estado vive en el dispositivo, sin sincronización, y no he podido probar el service worker ni la carga diferida de marcas (`cargarMarcas`) con red lenta. |
| Seguridad | 15 | **10** | A favor: CSP definida (`index.html:16`), `referrer no-referrer`, guardia anti-clickjacking, `esc()` en 105 usos de `innerHTML` con prueba específica, ningún secreto en el código (búsqueda de `key/secret/token/password`), los códigos PRO están como huellas SHA-256 con sal. Resta: la CSP admite `script-src 'unsafe-inline'` (necesario por los ~60 `onclick` en línea), que anula buena parte de la defensa contra XSS; PRO y la prueba de 7 días se guardan en `localStorage` y se pueden saltar (lo dice el propio `plans.js`; es un riesgo de negocio, no del usuario); `security.txt` apunta al dominio antiguo y a un correo personal. **No verificable:** `npm audit`, osv-scanner, gitleaks y semgrep (sin red ni instalados). El proyecto documenta 0 vulnerabilidades al 27-10, no re-medido. |
| Mantenibilidad | 15 | **10** | A favor: estructura clara por archivo, sin framework ni capas innecesarias, funciones más largas de 101 líneas (`renderWz`) y ESLint con 0 errores. Resta: todo está en el ámbito global y se llama desde `onclick` en línea (ESLint da 250 avisos `no-unused-vars`, casi todos falsos positivos por eso); no hay configuración de lint ni formato en el repo; `tests/` se nombra por versión (`v39`, `v311`…) en lugar de por tema; quedan restos del nombre antiguo («nutriDL») en 10 archivos de `js/`, `serve.js` y la documentación; `tools/marcas/` acumula scripts casi duplicados (`off_fetch.js` a `off_fetch9.js`). |
| Rendimiento | 10 | **6** | No he podido ejecutar Lighthouse aquí. Uso la medición documentada del 28-10 (móvil publicado: 84, LCP 4,0 s, FCP 1,5 s, SI 3,6 s), con descuento por no re-medirla. La carga diferida de marcas (502 KB) ya mejora el arranque. El LCP sigue alto por la fuente (decisión pendiente de Ángel: `font-display: optional`). |
| Usabilidad y accesibilidad | 10 | **8** | Medido en Chromium: 0 controles visibles sin nombre accesible, 0 campos sin etiqueta, sin scroll horizontal en 390 px, `lang="es"`, un `h1`, landmark `main`, `focus-visible` y `prefers-reduced-motion` presentes en `css/app.css`. **No verificable:** contraste de color real y lectores de pantalla; el proyecto documenta accesibilidad 100 en Lighthouse. |
| Pruebas | 10 | **7** | 88 pruebas en 13 archivos, todas pasan; el flujo de GitHub Actions (`.github/workflows/test.yml`) las ejecuta en cada push con acciones fijadas por hash. Resta: no hay medición de cobertura, ni lint en CI, ni pruebas en navegador (la prueba de humo de esta auditoría no está en el repo). |
| Documentación | 5 | **4** | README con requisitos, instalación, uso, estructura, datos y licencias; más 8 documentos en `docs/` y `CLAUDE.md`. Resta: nombre antiguo en varios documentos y `ESTADO.md` con cifras de versiones viejas en la tabla de la sección 1. |
| **Total** | **100** | **73** | |

## 3. Qué impide llegar a 90

Alcanzar más de 90 exige subir 18 puntos. Lo que puede mejorarse y lo que no:

| Mejora | Criterio | Puntos posibles | Esfuerzo | ¿Verificable aquí? |
|---|---|---|---|---|
| Unificar las direcciones antiguas en sitemap, páginas SEO, legales y `security.txt` (regenerar con `npm run seo`) | Funcionalidad | +3 | Bajo | Parcial: puedo comprobar los archivos, no que el sitio publicado responda |
| Añadir ESLint, prueba de humo en navegador y lint en CI | Pruebas | +2 | Bajo-medio | Sí |
| Quitar restos de «nutriDL», renombrar pruebas por tema, consolidar scripts duplicados de `tools/marcas/` (solo con tu permiso) | Mantenibilidad | +3 | Medio | Sí |
| Actualizar README y `ESTADO.md` | Documentación | +1 | Bajo | Sí |
| Sustituir `onclick` en línea por escuchadores y quitar `'unsafe-inline'` de `script-src` | Seguridad | +3 | **Alto**: unos 60 usos en `index.html` y cientos generados en `innerHTML` | Sí, con las pruebas y la prueba de humo |
| Manejar `localStorage` bloqueado o lleno con aviso visible y probar la carga diferida | Fiabilidad | +2 | Medio | Parcial |
| Rendimiento (`font-display`, LCP) | Rendimiento | +2 a +3 | Medio | **No**: sin Lighthouse no puedo comprobarlo |
| Cobrar de forma segura (PRO validado en servidor) | Seguridad | +2 | Muy alto, requiere cuentas y servidor | No |

**Conclusión honesta:** con lo verificable aquí se puede llegar a unos **86-88 puntos**. Pasar de 90 necesita medir Lighthouse (rendimiento) y re-ejecutar las auditorías de dependencias y secretos, que necesitan red o tu portátil. No voy a poner esas notas sin medirlas; propongo dejarlas como «no verificable» y que las compruebes tú, o que lo hagamos desde Claude Code en tu equipo.

## 4. Registro de cambios

Aún no se ha modificado ningún archivo del proyecto. Esta tabla se rellenará tras tu visto bueno.

| # | Cambio | Archivos | Resultado |
|---|---|---|---|
| — | — | — | — |
