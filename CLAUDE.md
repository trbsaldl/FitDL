# FitDL (app)

App de calorías, comidas y gym. HTML + JS sin framework, Tailwind 3 precompilado, service worker. Este repo es la versión que manda.

## Comandos
- `npm start` — servidor local (`tools/serve.js`)
- `npm run build` — iconos + CSS + service worker (ejecutar tras añadir clases de Tailwind o iconos)
- `npm run css` — solo regenerar el CSS
- `npm test` — pruebas (`node --test`)
- `npm run seo` — regenera las páginas públicas «Calorías de…» (`alimentos/`, una por alimento con fuente) y `sitemap.xml`. **Ejecutarlo siempre que cambie `js/data/foods.js`.**

## Reglas
- **Empezar leyendo `docs/ESTADO.md`**: trae las mediciones ya hechas (lighthouse, nº de alimentos, pruebas), la puntuación por apartados y el plan por fases. Evita volver a medir y explorar lo mismo; al terminar una fase, actualizarlo.
- Secciones quitadas por orden de Ángel (calibrar TDEE, base científica, hábitos, FAQ): no volver a añadirlas.
- Al tocar el gym, repetir la auditoría de rutinas (0 sin tríceps, 0 excesos, 0 duplicados).
- Códigos PRO: revisar con gitleaks/semgrep antes de publicar. Nunca mostrar códigos ni claves en informes.
- Datos de usuario solo en el dispositivo (localStorage).

## Terminado
`npm test` y `npm run build` sin errores, y flujo comprobado en el navegador (también en móvil).
