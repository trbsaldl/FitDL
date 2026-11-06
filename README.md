# FitDL

**Tu entrenador de fitness personal.** Calorías, macros, comidas y progreso en un solo lugar, con un Coach que te dice qué comer. Se instala en el móvil como una app, funciona sin conexión y los datos se quedan en el dispositivo.

**Web:** https://trbsaldl.github.io/FitDL/

## Qué incluye

- **Hoy:** objetivo, calorías y macros del día, «¿Qué hago ahora?», accesos rápidos, racha y dato de la semana.
- **Coach:** conversación con tus datos, «¿Qué como?», menú del día y lista de la compra; registro por voz y foto del plato.
- **Mi plan (calculadora):** gasto basal (Mifflin-St Jeor), mantenimiento, calorías objetivo según tu caso, IMC con la clasificación de la OMS y macros.
- **Comidas:** diario por comidas con buscador (unos 270 alimentos genéricos y 129 de marca), escáner de código de barras (Open Food Facts), comidas guardadas y alimentos propios.
- **Gym:** tú eliges tus días y apuntas tus ejercicios y pesos; temporizador de descanso, entrenos guardados (editar / borrar), pesos más altos al completar la semana y gráfica de progreso por ejercicio.
- **Progreso:** tu semana, racha, peso medio con tendencia y objetivo, medidas con gráfica, mensajes que interpretan tus datos y logros.
- **Perfiles** para varias personas, copias de seguridad, PDF para clientes, informe de errores local y borrado total de datos.

Los datos se guardan solo en el dispositivo de cada persona (consulta [privacidad.html](privacidad.html)).

## Estructura

```
index.html            la app (HTML)
css/                  tailwind.css (generado), app.css (estilos propios), icons.css (generado), fonts.css, legal.css
js/core.js            configuración, estado, guardado y utilidades (se carga primero)
js/data/foods.js      base de alimentos (genéricos + marcas entre // <marcas> … // </marcas>)
js/data/exercises.js  ejercicios para el buscador del gym
js/calc.js            calculadora           js/progress.js   peso y medidas
js/diary.js           diario, escáner, comidas guardadas
js/gym.js             gym                   js/pdf.js        PDF e impresión
js/wizard.js          asistente de perfil   js/profiles.js   perfiles y copias
js/dashboard.js       «Hoy»                 js/app.js        pestañas, hojas, informe de errores
js/engine.js          motor de platos, menú y compra   js/parser.js   entender texto y voz
js/insights.js        rachas, logros y tendencias      js/coach.js    Coach, ¿Qué como?, menú, compra, voz, foto
js/kitchen.js         Mi nevera y compra inteligente
js/plans.js           Gratis / PRO (prueba, códigos, enlace de pago)          js/analytics.js  medición de uso (solo en el dispositivo)
js/main.js            arranque, instalación como app y modo sin conexión (se carga el último)
sw.js                 service worker (generado)
tests/                pruebas automáticas (por tema) y prueba de humo en navegador
eslint.config.js      reglas de ESLint
tools/                herramientas (ver abajo)
```

## Trabajar en la app

Requisito: Node.js 20 o superior.

```bash
npm install          # una vez: instala Tailwind, Font Awesome y subset-font
npm start            # servidor local en http://localhost:8766 (sin caché)
npm run build        # tras cambiar clases o iconos: regenera iconos, CSS y sw.js
npm test             # pruebas automáticas (también se ejecutan en GitHub en cada cambio)
npm run lint         # revisión de código con ESLint (npm i --no-save eslint)
npm run check        # lint + pruebas
node tools/bundle.js "C:/ruta/copia.html"   # copia de la app en un solo archivo (se abre sin internet)
```

Antes de subir cambios: `npm run build`, `npm run lint` y `npm test`. La prueba de navegador (`tests/humo.test.js`) necesita Playwright (`npm i --no-save playwright && npx playwright install chromium`); sin él se salta con aviso. Sube también la versión en `js/core.js` (`APP_VERSION`), `package.json` y [CHANGELOG.md](CHANGELOG.md).

En local el modo sin conexión está desactivado para no ver versiones antiguas; para probarlo abre `http://localhost:8766/?sw=1`.

### Productos de marca

`tools/marcas/`: `off_fetch.js` → `off_fetch2.js` (descargan de Open Food Facts a `cache_off/`) → `off_build.js` (elige y **valida** cada producto) → `off_embed.js` (los mete en `js/data/foods.js`). Para añadir un producto, añade una línea `t(...)` en `off_build.js` y repite los dos últimos pasos.

## Nombres antiguos

La app se llamó nutriDL. Las claves de `localStorage` que empiezan por `nutridl_` y la sal de las huellas de los códigos PRO se mantienen **a propósito**: cambiarlas borraría los datos de quien ya usa la app e invalidaría los códigos vendidos.

## Documentación

- [docs/AUDITORIA-3.0.md](docs/AUDITORIA-3.0.md): análisis, cambios y pendientes de la 3.0.
- [docs/IA.md](docs/IA.md): cómo funciona el Coach y cómo añadir un modelo de IA de forma segura.
- [docs/NEGOCIO.md](docs/NEGOCIO.md): Gratis/PRO, métricas, presupuesto y primeros usuarios.
- [docs/HOJA-DE-RUTA.md](docs/HOJA-DE-RUTA.md): cuentas, nube y modo entrenador.

## Datos y licencias

- Alimentos genéricos: USDA FoodData Central (SR Legacy y, para platos de España y Latinoamérica, FNDDS; dominio público) y BEDCA. Productos de marca: [Open Food Facts](https://world.openfoodfacts.org), licencia [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). Comida colombiana: Tabla de Composición de Alimentos Colombianos (ICBF, 2018). Comida rápida: valores oficiales publicados por McDonald's (mcdonalds.es), Burger King (burgerking.es) y KFC (kfc.es) en España; las marcas pertenecen a sus dueños y solo se citan para identificar el producto.
- Iconos: Font Awesome Free (CC BY 4.0 / SIL OFL 1.1 / MIT). Fuente: Plus Jakarta Sans (SIL OFL 1.1).

## Aviso

FitDL es una herramienta educativa y orientativa; no sustituye el consejo de un médico o dietista-nutricionista.

