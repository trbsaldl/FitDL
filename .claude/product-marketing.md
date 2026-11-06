# FitDL · contexto de producto y marketing

> Lo leen las skills de marketing (aso, onboarding, paywalls, pricing, cro, copywriting, referrals, churn-prevention, programmatic-seo). Hechos, no deseos. Estado técnico y plan: `docs/ESTADO.md`. Modelo de negocio: `docs/NEGOCIO.md`.

## Producto
- **Qué es:** «Tu entrenador nutricional personal». App web instalable (PWA) de calorías, macros, comidas, gym y progreso, con un Coach que dice qué comer. Funciona sin conexión.
- **Web:** https://trbsaldl.github.io/FitDL/ · páginas SEO «Calorías de…» en `/alimentos/` (unas 1.900, una por alimento con fuente).
- **Idiomas:** español e inglés (selector ES/EN).
- **Estado:** publicada, sin analítica todavía (no se sabe cuántos usuarios hay). Google Play preparado, sin publicar (falta cuenta y 12 testers).
- **Creador:** Ángel, en solitario, sin presupuesto de anuncios (plan inicial ~500 €).

## Para quién
- Gente en España (y ahora también inglés) que quiere perder grasa, ganar músculo o mantenerse, que compra en supermercados (sobre todo Mercadona/Hacendado) y va al gimnasio.
- Entrenadores y dietistas que quieren mandar un plan en PDF a sus clientes (segmento B2B futuro).

## Diferencias frente a la competencia (comprobadas)
- Escáner de código de barras y macros completos **gratis** (MyFitnessPal los cobra o los limita; Yazio reserva las macros detalladas a Pro).
- **Sin anuncios y sin cuenta**: los datos se quedan en el móvil.
- **Más de 2.300 alimentos comprobados**, casi 500 Hacendado; cada dato con fuente (etiqueta, USDA, web oficial).
- Coach que responde («¿Qué ceno con 600 kcal?»), gym incluido, tarjeta «Compartir mi semana».
- Competidores principales: Fitia (fuerte en España/Latam, ~9,99 €/mes), MyFitnessPal, Yazio, FatSecret.

## Promesa pública (desde la 3.14.0)
El escáner, las macros, el diario, el Coach básico, el progreso y el gym seguirán siendo gratis. Lo que hoy es gratis no pasará a ser de pago. **No proponer nunca cobrar por estas funciones.**

## Precio
- Gratis siempre: plan, diario, escáner, base de alimentos, Coach básico, peso, progreso, gym.
- **PRO: 4,99 €/mes · 39,99 €/año** (prueba de 7 días sin tarjeta): voz, foto, Mi nevera, menú del día, compra inteligente, análisis avanzado.
- Hoy solo se cobra con códigos vendidos a mano; sin pasarela de pago todavía. En la versión de Google Play no se muestran precios ni códigos.

## Métrica principal
Personas que apuntan comidas y vuelven al menos 7 días. Hoy solo se mide en cada móvil (sin analítica global).

## Reglas de Ángel (obligatorias)
- Nada de reseñas falsas, cifras inventadas, urgencias o cuentas atrás falsas ni patrones oscuros.
- No quitar ni sustituir nada de la app sin preguntar; ampliar.
- No volver a añadir las secciones que él quitó: calibrar TDEE, base científica, hábitos, FAQ de la pestaña Comidas.
- Datos de usuario solo en el dispositivo hasta que se active la nube (Supabase, fase F5).
