# Negocio: Gratis / PRO, métricas y primeros usuarios

## Posicionamiento
**FitDL, tu entrenador nutricional personal.** No es otro contador de calorías: responde a «¿qué hago ahora para acercarme a mi objetivo?». Diferencia: nutrición + Coach + objetivo físico + acompañamiento diario + privacidad (sin cuentas, sin anuncios).

## Cómo funciona PRO hoy (3.1)
- Las funciones PRO (voz, foto, nevera, menú del día, compra inteligente, análisis avanzado) **solo se usan con PRO activo** en el dispositivo.
- **Prueba de 7 días** gratis, una vez, sin tarjeta.
- **Códigos de activación**: `Escritorio/nutriDL-codigos-PRO.txt` (fuera del repositorio; en la app solo están sus huellas SHA-256). Para vender ahora: cobra por Bizum, PayPal o Stripe y envía un código por persona.
- **Enlace de pago**: rellena `PAY_LINK` en `js/plans.js` con un Stripe Payment Link (o similar) y el botón «Hazte PRO» lo abrirá.
- Limitación conocida: sin servidor, alguien con conocimientos podría saltarse el bloqueo modificando la app en su navegador. La validación segura llega con las cuentas.

## Gratis y PRO (`js/plans.js`)
- **Gratis siempre**: plan (calorías, macros, cómo se calcula), diario, escáner, peso, medidas, progreso básico, Coach básico, gym, sin anuncios.
- **PRO**: voz, calculadora de plato, «Mi nevera», menú del día, compra inteligente y análisis avanzado (medias, patrones y exportar a Excel). **Lo que de verdad se vende hoy es el pago único de 24,99 € «para siempre»**, porque el código de activación no caduca; 4,99 €/mes y 39,99 €/año quedan para cuando se pueda pagar dentro de la app. *IA conversacional, reconocer la foto y sincronizar NO existen todavía: no se cobran ni se anuncian como incluidos.*
- **Medición**: cada vez que alguien ve la pantalla PRO, prueba PRO o activa un código queda contado en el dispositivo («Informe de errores»).
- Para cobrar hacen falta: cuentas (Supabase), un proveedor de pago (Stripe; en las tiendas de apps, sus propios pagos), términos de venta, derecho de desistimiento y facturación. **No activar pagos antes.**

## Métricas
**Métrica clave (North Star):** personas que apuntan comidas y vuelven al menos 7 días.

Hoy se miden en cada dispositivo (`js/analytics.js`, visibles en «Informe de errores»): primer uso, días activos, días con comidas, plan completado, primera comida, retención a 1, 7 y 30 días, interés en PRO.
Para verlas de todos los usuarios: Plausible o Umami (sin cookies, ~9 €/mes o gratis autoalojado), solo eventos anónimos y con aviso en la política de privacidad. `ANALYTICS_ENDPOINT` está preparado y vacío.

## Presupuesto inicial: 500 €
| Prioridad | Gasto | Para qué |
|---|---|---|
| 1. Producto | 0 € | GitHub Pages es gratis |
| 2. Dominio | ~15 €/año | nutridl.es o similar (más confianza) |
| 3. Validación | 0-9 €/mes | Analítica sin cookies cuando haya 50+ usuarios |
| 4. Legal | ~150-300 € | Revisión de privacidad/términos por un especialista antes de cobrar |
| 5. IA | Reservar ~100 € | Créditos del modelo para la beta PRO, con límites por usuario |
| Publicidad | 0 € | **No** hasta demostrar retención a 7 días |

## Primeros 100 usuarios (sin anuncios)
1. Amigos, familia y gente del gym: pedirles que la instalen y la usen 7 días; preguntar qué falta.
2. Entrenadores personales y dietistas locales: herramienta gratis para sus clientes (PDF del plan).
3. Contenido corto (TikTok/Instagram/Reels): «¿Qué ceno con 600 kcal?» resuelto con la app en 15 segundos.
4. Comunidades (Reddit r/fitnessES, foros, Discord de gym): aportar valor, sin spam.
5. Medir cada semana: cuántos completan el plan, apuntan su primera comida y vuelven a los 7 días.

Después: 500 usuarios (mejorar lo que más se usa) → 1.000 (activar cuentas, sincronización y PRO).
