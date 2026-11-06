# Auditoría y plan de FitDL 3.0

Fecha: 8 de octubre de 2026. Punto de partida: FitDL 2.1.4 (copia guardada en `Escritorio/web/appdura 6.0.html`).

## 1. Qué había y funcionaba (se conserva todo)

| Función | Estado en 2.1.4 | En 3.0 |
|---|---|---|
| Calculadora (Mifflin-St Jeor, actividad, objetivo personalizado, mínimo seguro 1200/1500 kcal) | Correcta, con pruebas | Igual, ahora en «Mi plan» y con «Cómo se ha calculado» |
| IMC con tabla OMS (redondeo CDC) | Correcta | Igual |
| Macros (3 estrategias), fibra y agua | Correcta | Igual |
| Diario por comidas, buscador (388 alimentos, 129 de marca), cantidades por unidad o ración | Bueno | + macros por alimento, duplicar, «≈ estimado», voz y foto |
| Escáner de código de barras (Open Food Facts) | Bueno | Igual |
| Comidas guardadas, copiar de ayer, alimentos propios, solo calorías | Bueno | Igual |
| Peso con media de 7 días y gráfica a ancho real | Bueno | + peso objetivo, tendencia y lectura de la tendencia |
| Medidas corporales | Lista sin gráfica | + gráfica por medida (cintura, cadera…) |
| Gym: días, ejercicios, series, descanso, récords, gráfica | Bueno | Igual (el asistente puede dejar preparados tus días) |
| Perfiles, copias de seguridad, PDF, informe de errores, borrar datos | Bueno | + «Móvil y ordenador» explicado |
| PWA instalable, sin conexión, actualizaciones al momento | Bueno | Igual (+ accesos directos «Registrar por voz» y «Coach») |

## 2. Problemas encontrados

**Producto / UX**
- La app abría en la calculadora: un usuario nuevo veía un formulario, no un producto. No había una pantalla de «hoy».
- La app solo registraba: no decía qué comer ni qué hacer después (no era proactiva).
- No había respuesta a «¿cómo voy?»: el progreso eran cifras sin interpretación, sin rachas ni logros (poca razón para volver).
- Apuntar comida exigía buscar cada alimento: lento para el uso diario.
- El asistente no preguntaba entrenamiento, preferencias ni número de comidas, y no explicaba el cálculo.
- No había landing que explicara el producto en segundos.

**Visual**
- Cada sección tenía su propio estilo de tarjeta; faltaba un sistema común (tarjetas, botones, etiquetas, barras).
- En tablet (768-1023 px) la barra superior no cabía con 6 secciones.

**Técnico**
- `tools/bundle.js` fallaba con las marcas de versión `?v=` (corregido: era lo que impedía guardar la copia).
- Sin política de seguridad de contenidos (CSP).
- La medición de uso solo contaba clics: no permitía ver retención.

**Redundancias**: ninguna función se ha quitado. El bloque de bienvenida antiguo se ha convertido en la landing.

## 3. Qué se ha hecho (las funciones principales, bien hechas)

1. **Hoy**: saludo, objetivo, calorías consumidas/objetivo con barra, proteína/hidratos/grasas, «¿Qué hago ahora?», accesos rápidos (voz, foto, buscar, escanear), dato de la semana, peso, entrenos, IMC y racha.
2. **¿Qué como?**: motor propio que ajusta los gramos de 41 platos base a tus calorías y proteína restantes, con dieta, alergias, alimentos que no gustan, presupuesto y lo que tienes en casa. Opciones con «Añadir», «Cambiar» y «Receta».
3. **Menú del día**: el día completo (3, 4 o 5 comidas) con gramos exactos, regenerar, cambiar una comida y añadir todo al diario.
4. **Lista de la compra**: para hoy, 3 días o la semana, agrupada (proteínas, carbohidratos, frutas, verduras, lácteos, otros), marcar comprados, añadir productos y compartir.
5. **Coach**: entiende frases como «He comido pollo con arroz», «¿Cuánto me queda?», «Voy a cenar fuera», «Me quedan 600 kcal y necesito mucha proteína», «Quiero un desayuno de 40 g de proteína», «¿Cómo llego a mis proteínas?». Cada respuesta indica si es **Tus datos**, **Estimación**, **Recomendación** o **Base de alimentos**. Deriva a un profesional en embarazo, diabetes, TCA, etc.
6. **Registro por voz** con confirmación editable (y por texto si el navegador no tiene dictado).
7. **Foto del plato**: alternativa honesta (ver más abajo) con raciones pequeña/normal/grande en peso cocinado, marcada como «Estimación aproximada».
8. **Diario mejorado**: macros de cada alimento, duplicar a otra comida u otro día, «Otros», media mañana solo si haces 5 comidas.
9. **Mi progreso**: tu semana (días registrados, proteína cumplida, media diaria, entrenos), racha, peso medio con tendencia y objetivo, medidas con gráfica, mensajes que interpretan tus datos y 12 logros.
10. **Onboarding**: objetivo, sexo, edad, altura, peso, actividad, entrenamiento, dieta y alergias, nº de comidas → «Tu plan personal» con calorías, macros y cómo se ha calculado.

Además: celebraciones discretas (proteína conseguida, día completado, rachas de 7/14/30/60/100 días, logros), recordatorio diario en el calendario (.ics, sin servidores), landing con FAQ, pantalla Gratis/PRO, medición de retención en el dispositivo, CSP y 10 platos típicos españoles nuevos.

## 4. Lo que no se puede hacer exactamente (y la alternativa aplicada)

| Pedido | Limitación | Alternativa implementada | Pendiente |
|---|---|---|---|
| IA conversacional (modelo de lenguaje) | Necesita un servidor con clave privada; ponerla en la web la expondría | Coach local con reglas, tus datos y la base de alimentos; nunca inventa | Proxy seguro + modelo (ver [IA.md](IA.md)) |
| Foto → reconocimiento automático | Igual: necesita un modelo de visión en un servidor | Tú marcas qué hay; la app estima con raciones en peso cocinado | Mismo proxy, función PRO |
| Pagos PRO | Requieren cuentas, proveedor de pago y textos legales | Arquitectura Gratis/PRO lista; en beta todo abierto | Ver [NEGOCIO.md](NEGOCIO.md) |
| Sincronización | Requiere cuentas y nube (RGPD: datos de salud) | Copia de seguridad explicada en «Móvil y ordenador» | Supabase ([HOJA-DE-RUTA.md](HOJA-DE-RUTA.md)) |
| Notificaciones | Avisos web fiables necesitan servidor de envío | Recordatorio diario en tu calendario (.ics) | Push con la nube |
| Analítica de todos los usuarios | Enviar datos requiere consentimiento y un servicio | Medición en el dispositivo (retención 1/7/30 días y métrica clave) en «Informe de errores» | Plausible/Umami sin cookies, con consentimiento |

## 5. Auditoría final (comprobado en el navegador a 375 px y 1280 px)

- **Diseño**: sistema común (tarjetas `nd-card`, botones, etiquetas, barras), paleta marrón/beige de siempre, sin gradientes chillones.
- **UX**: un usuario nuevo ve qué es la app y un único botón «Empezar gratis»; tras el asistente, «Hoy» le dice qué hacer.
- **Velocidad**: sin dependencias nuevas ni peticiones nuevas; el menú completo se calcula en ~60 ms.
- **Móvil**: barra inferior de 5 pestañas, botones de 44 px o más, hojas desde abajo, entrada del chat fija sobre la barra.
- **Nutrición**: los gramos y macros salen de la base (USDA/BEDCA/Open Food Facts); las estimaciones se marcan siempre.
- **Seguridad**: sin claves en el código; CSP que solo permite archivos propios y Open Food Facts; todo el texto del usuario se escapa.
- **Privacidad**: todo en el dispositivo; consentimiento antes del micrófono; política actualizada.
- **Pruebas**: 14 pruebas automáticas (7 nuevas: menú ±10 %, dietas y alergias, frases, rachas, compra, Coach).
