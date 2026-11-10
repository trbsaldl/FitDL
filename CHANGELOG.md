# Cambios de FitDL

## 3.31.0 · 10 de noviembre de 2026

**Raciones reales en los productos de marca**

- 321 productos de marca que tenían la ración genérica «1 ración = 100 g» pasan a la ración que declara el fabricante en Open Food Facts (ODbL), con su unidad cuando se sabe: una Oreo es «1 galleta (11 g)», el pan de molde «1 rebanada», el pavo «1 loncha». Antes, pulsar «+» en unas galletas apuntaba 100 g.
- Se dejan en 100 g, sin inventar: los que no tienen ración en Open Food Facts (1.189), los que dicen «100 g» (es la referencia, no una ración: 297) y los que dan una cifra sin sentido (41: menos de 5 g, el envase entero o el batido ya preparado).
- Lo ya apuntado no cambia (el diario guarda gramos y calorías). Kcal, macros e ids de los productos no se tocan.
- Nuevo `tools/marcas/off_raciones.js` → `raciones.json`, que aplica `off_embed.js`. `tests/raciones-marca.test.js` (2 pruebas). 96 pruebas pasan.

## 3.30.0 · 9 de noviembre de 2026

**Colombia: más alimentos y la búsqueda entiende cómo se habla allí**

- 26 alimentos nuevos con su ficha oficial del USDA (dominio público): lulo, guanábana, uchuva, feijoa, zapote, pitahaya, jugo de maracuyá, patacón, tajadas de maduro, plátano verde cocido, chips de yuca, mote, arroz con fríjoles negros/rojos, arroz con guandú, sopa de mondongo, sopa de fríjoles negros, mondongo, morcilla, sobrebarriga, chicharrón, pescado frito, queso blanco y queso fresco latinos, chocolate caliente con leche y crema de cacahuete 100 %.
- El buscador y el lector de frases entienden papa, jugo, banano, fríjoles, arveja, habichuela, ahuyama, gaseosa, durazno, carne de res, carne molida, torta, ponqué, tinto, arequipe, pimentón, camarones, pan tajado y pericos (encuentran los nombres escritos como en España).
- Fuera a propósito: buñuelo (el del USDA es de trigo, no el colombiano de queso) y panela/aguapanela (no están en el USDA). La tabla del ICBF 2018 está en PDF escaneado y protegido, sin texto que se pueda leer.
- `tests/colombia.test.js`: 3 pruebas nuevas. 94 pruebas pasan (3 de navegador se omiten sin Playwright). 4.189 páginas «Calorías de…».

## 3.29.1 · 6 de noviembre de 2026

**Arreglo: botones que no respondían y pasta/arroz ya cocidos**

- En la 3.28-3.29 no hacían nada los botones fijos de la página: «Instalar la app», «Empezar gratis», «Ya tengo una copia», FitDL PRO, Informe de errores, Borrar mis datos, las vistas del Coach y los enlaces internos. El `<body>` lleva `data-tab` (la pestaña actual) y el listener único de clic lo tomaba por un botón de pestaña. Ahora solo cuentan los `<button data-tab>` / `<button data-cv>`.
- Los botones rápidos del inicio (Voz, Foto, Nevera, Buscar, Escanear), «Mi nevera» y «Parar» del cronómetro del gym recibían el clic como si fuera un dato: el buscador abría sin comida elegida, Voz abría solo para escribir y «Parar» paraba el entreno sin preguntar. Arreglado.
- Las comidas que se hubieran guardado con esa franja inválida pasan a «Otros» al abrir la app (no se borra nada).
- Nuevos alimentos ya cocidos (USDA): espaguetis, macarrones, tallarines, fideos de trigo, plumas/penne, espirales/hélices, espaguetis integrales, arroz basmati y arroz vaporizado.
- `tests/clics.test.js`: 3 pruebas nuevas para que no vuelva a pasar. 91 pruebas pasan (3 de navegador se omiten sin Playwright).

## 3.29.0 · 6 de noviembre de 2026

**Seguridad: eliminación de `script-src-attr 'unsafe-inline'` de la CSP**

- Todos los atributos HTML `onclick`, `oninput`, `onchange`, `onsubmit`, `onkeydown` y `onblur` reemplazados por delegación de eventos vía el registro `ND` en los 11 archivos JS de la app (`coach.js`, `diary.js`, `gym.js`, `plans.js`, `kitchen.js`, `insights.js`, `progress.js`, `dashboard.js`, `wizard.js`, `calc.js`, `app.js`).
- `script-src-attr 'unsafe-inline'` eliminado de la CSP en `index.html`. La política queda `script-src 'self'`: sin vectores de inyección vía atributos.
- 91 pruebas pasan (actualización de las de seguridad de cadenas con apóstrofos y del historial de entrenos para el nuevo patrón ND).

## 3.28.0 · 6 de noviembre de 2026

**Revisión de calidad: direcciones, código y pruebas (sin cambios para quien usa la app)**

- **Una sola dirección pública**: el sitemap, las 4.163 páginas «Calorías de…», los textos legales, `security.txt` y la licencia apuntaban a la dirección antigua (`trbs-aldl.github.io/nutridl-app/`). Ahora todo usa `trbsaldl.github.io/FitDL/`, y las páginas públicas dicen «FitDL» en vez de «nutriDL».
- **Política de seguridad más estricta**: `script-src` ya no admite `'unsafe-inline'`; solo los atributos `onclick` y similares siguen permitidos (`script-src-attr`). Un `<script>` inyectado ya no se ejecuta.
- **Revisión de código con ESLint** (`npm run lint`, también en GitHub) y limpieza de código muerto que encontró.
- **Pruebas en navegador real** (`tests/humo.test.js`): abre la app en móvil y escritorio, hace clic en cada pestaña, comprueba accesibilidad básica y que la app abre con el almacenamiento bloqueado o lleno.
- Pruebas renombradas por tema (antes por versión). 90 pruebas en total.
- Se conservan a propósito las claves `nutridl_*` del almacenamiento y la sal de los códigos PRO: cambiarlas borraría datos y códigos.

## 3.27.0 · 28 de octubre de 2026

**La app abre antes, con los mismos 4.532 alimentos**

- **Los productos de marca se cargan aparte**, en cuanto la primera pantalla está dibujada (o al momento si abres el buscador o el escáner). **No falta ni un alimento**: solo llegan unas décimas más tarde. Al arrancar, la app lee 143 KB en vez de 644 KB.
- **Las cuatro letras de la primera pantalla se piden desde el principio** (antes el navegador no descubría dos de ellas hasta aplicar el CSS).
- **Las secciones de la portada que no se ven no se calculan** hasta que llegas a ellas.
- Resultado medido con Lighthouse (móvil simulado): **primer dibujado 1,7 s → 1,3 s**, **Speed Index 5,2 s → 3,5 s**, bloqueo 210 ms → 110 ms, peso inicial 578 KB → 449 KB. Nota de rendimiento **78 → 80-83**; accesibilidad, buenas prácticas y SEO siguen en **100**.
- Cifras de la portada al día también en la lista de ventajas (4.500 alimentos, 880 Hacendado).

## 3.26.0 · 27 de octubre de 2026

**Repaso de seguridad y de lo legal, pensando en abrirla al público**

- **Términos de uso v2.0**: quién está detrás de la app, condiciones claras de nutriDL PRO (hoy **no se cobra nada**: prueba de 7 días y códigos, sin suscripción ni renovación automática), licencias de los datos (USDA, Open Food Facts con ODbL, información oficial de las cadenas), edad mínima de 18 años, ley aplicable y cómo reclamar.
- **Privacidad v4.3**: se explica que el código de barras **se lee dentro de tu dispositivo** y que la imagen de la cámara no sale nunca; que los productos que guardas al escanear se quedan en tu móvil con su código; y un apartado claro de cookies: **nutriDL no usa ninguna**, por eso no verás ventanas de consentimiento.
- **Nadie puede meter nutriDL dentro de su web** (clickjacking): si la app se abre dentro de un marco ajeno, no se carga y ofrece un enlace para abrirla aparte.
- **`security.txt`**: dirección donde avisar si alguien encuentra un fallo de seguridad.
- **Dependencia con un fallo conocido arreglada** (solo de construcción): el análisis de dependencias queda limpio.
- **Cifras de la portada al día**: 4.500+ alimentos y 880+ productos Hacendado, que es lo que hay de verdad.

## 3.25.0 · 27 de octubre de 2026

**+1.213 panes, pastas, galletas y bollos · y el escáner lee ya cualquier código**

- **4.532 alimentos** (antes 3.319): 3.618 de marca y 914 genéricos. Entran panes y pan de molde, pan tostado y picos, bollos, croissants, magdalenas, bizcochos, galletas de todo tipo, pastas secas, frescas y rellenas, fideos, cereales de desayuno y barritas. De 401 marcas distintas (Hacendado, Carrefour, Dia, Gullón, Lidl, Eroski, Dulcesol, Consum, Alcampo, Bimbo, Gallo, Rana…). **4.163 páginas** en `alimentos/`.
- **El escáner ya no depende del navegador.** nutriDL trae su propio lector de códigos (`js/barras.js`): lee **EAN-13, EAN-8 y UPC** de cualquier país midiendo las barras de la imagen, así que también funciona en iPhone con Safari, en Firefox y en navegadores viejos, donde antes no había nada. Si el navegador sí trae lector, se le piden todos los formatos que sepa (ITF-14 de las cajas, Code-128, QR…) y el lector propio sigue de refuerzo.
- **El mismo producto, escrito de varias maneras.** Un código se busca tal cual, como UPC de 12 números, con el cero delante y como ITF-14 de la caja: así salen también los productos de fuera de España.
- **Siempre te da algo.** Si la etiqueta no trae kcal, se calculan con los macros; si solo trae la ración, se pasa a 100 g. Y si el producto no está en el catálogo mundial, el formulario sale **con su código ya puesto**: copias la etiqueta una vez y el producto queda guardado con ese código, así que la próxima vez que lo escanees sale solo e incluso sin internet.
- **Linterna** (si la cámara la tiene), enfoque continuo y más resolución para los códigos pequeños.

## 3.24.0 · 26 de octubre de 2026

**+356 productos de marca y +38 ejercicios**

- **3.319 alimentos** (2.405 de marca y 914 genéricos; antes 2.963). La tanda v8 de Open Food Facts terminó de descargarse: lácteos, bollos, sándwiches, frutas, zumos y refrescos de marca. Cada producto pasa el filtro de `off_build8.js`: etiqueta completa, kcal que cuadran con los macros, solo España, nombre en español y la marca escrita como la conoce la gente (Hacendado, Carrefour, Dia, Lidl, Alcampo, Consum, Alesto, Puleva, Gullón…). **2.956 páginas** en `alimentos/`.
- **133 ejercicios** (antes 95). Lo que más se pedía en las reseñas de otras apps de gym: el mismo movimiento cambia según el agarre o la máquina y hay que seguirlo por separado. Entran variaciones de agarre (jalón supino y ancho, remo supino, dominadas supinas, press cerrado…), de máquina (fondos asistidos, prensa a una pierna, hip thrust, aductores) y tres grupos que faltaban: **trapecio, aductores y antebrazo**. Todos con su técnica explicada y con nombre en inglés.

Nada quitado: los entrenos y las comidas de antes se leen igual.

## 3.23.0 · 25 de octubre de 2026

**Gym: lo que piden en las reseñas de Hevy y Strong**

Leí 640 reseñas de Hevy y 20 de Strong en Google Play España. Esto es lo que salió y ya está hecho:

- **«Hoy prueba: 65 kg × 8».** Debajo de «Última vez», cada ejercicio te dice qué intentar hoy. Subes repeticiones hasta 12 y entonces subes peso (progresión doble). La queja literal en Hevy era: *«le falta incitarte a progresar en peso o repeticiones; si no tienes experiencia o no tienes entrenador, no es tu app»*.
- **Series de calentamiento.** Toca el número de una serie y pasa por normal → calentamiento (○) → dropset (↓). Los calentamientos **no cuentan** para tus récords, tu volumen ni tu progresión, que es como debe ser.
- **RIR** (las repeticiones que te habrían sobrado), opcional: se enciende en los ajustes del gym y añade una casilla por serie. Si no lo usas, no ves ningún cambio.
- **Series por músculo de los últimos 7 días**, con la referencia habitual de 10-20 series. Sale solo: cada ejercicio ya tenía su músculo principal y el secundario (que cuenta media serie).
- **El aviso de descanso ahora se oye.** Tres pitidos y vibración, con tres niveles (fuerte, suave o solo vibrar) en los ajustes. En Hevy se quejaban: *«lo noto muy suave y no lo escucho con el ruido de fondo»*.

Nada de esto quita ni cambia lo que ya tenías: los entrenos antiguos se leen igual que siempre.

## 3.22.0 · 25 de octubre de 2026

**Modo PRO: honesto, más útil y sin quitarte nada**

Revisión a fondo de PRO. Lo que estaba mal, corregido:

- **Ya no se promete nada que no exista.** La tabla tenía un ✓ en «Próximamente: IA conversacional, foto con reconocimiento y sincronización». Ahora va como nota debajo: *en camino, todavía no disponible. No se cobra por lo que aún no existe.*
- **«Foto del plato» pasa a llamarse «Calculadora de plato».** No reconocía la foto: marcas tú lo que hay. El nombre ahora dice la verdad.
- **El precio dice lo que de verdad compras.** El código de activación nunca caducaba, así que lo que se vendía era PRO para siempre: ahora aparece como **pago único de 24,99 €**. Mensual y anual quedan marcados como lo que habrá cuando se pueda pagar dentro de la app.
- **Al acabar la prueba ya no desaparece lo que habías creado.** El último menú del día y la última lista de la compra se quedan para consultarlos, marcarlos y apuntarlos. Lo único que necesita PRO es crear nuevos. Y se dice **antes** de empezar la prueba.
- Cifras al día: la portada decía «más de 2.200 alimentos y casi 500 Hacendado»; son **más de 2.900 y más de 800**. La FAQ se dejaba fuera el análisis avanzado.

**«Análisis avanzado» ahora vale lo que cuesta:**

- **Exportar tu historial a Excel/CSV**, lo más pedido en las reseñas del sector: el diario completo (alimento a alimento) o un resumen por días con peso y entrenos. El archivo se crea en tu móvil; no se envía a ningún sitio.
- **Medias de 7, 30 y 90 días**: calorías, proteína, fibra, días apuntados y cuántos estuvieron en tu objetivo.
- **En qué días de la semana te pasas**, con una gráfica por día y el aviso de cuál es tu día más alto.
- **Tus macros reales frente a tu objetivo** en el periodo elegido.

**La pantalla PRO convence mejor, sin presionar:**

- Antes de pedirte nada, te enseña **«Esto es lo que verás»** con tus propios números.
- Un solo botón principal (la prueba, que no pide tarjeta) y el campo del código recogido detrás de «Ya tengo un código».
- Debajo, en claro: qué pasa cuando acabe la prueba.

También queda preparado, con instrucciones dentro del código, el enlace de pago de Stripe y la analítica sin cookies de Cloudflare: solo hay que pegar un dato cuando Ángel abra esas cuentas.

## 3.21.0 · 24 de octubre de 2026

**572 alimentos y bebidas nuevos (2.391 → 2.963)**

- **+306 productos de Mercadona (Hacendado)**: ahora hay 805. Pan de molde, lácteos, fiambres, snacks, postres proteicos, congelados…
- **Muchos más frutos secos**: almendras, anacardos, cacahuetes y pistachos tostados, fritos o con miel; cóctel de frutos secos; cremas de anacardo y de pipas; pipas de girasol y de calabaza; sésamo tostado. También de marca (Alesto, Borges, Carrefour, Lidl, Dia…).
- **Comidas cocidas y fritas**, que es como se comen de verdad: pollo frito rebozado o enharinado, contramuslo empanado, pescado y bagre empanados, gambas y almejas rebozadas, calamares fritos, aros de cebolla, patata cocida con piel, al microondas o frita de bolsa al horno, puré con leche, verduras cocidas y congeladas, legumbres de bote.
- **Bocadillos y sándwiches**: de atún, de pavo y jamón, de roast beef, de bacon con lechuga y tomate, de ternera con queso, de pollo (asado, a la plancha, crujiente, teriyaki) y de pescado.
- **Bollos y dulces**: dónut de chocolate, relleno y de masa, bizcocho de chocolate, tarta de manzana y de queso, brownie, magdalena de arándanos, galletas de avena y de mantequilla, natillas y helado de vainilla.
- **Más frutas**: níspero, carambola, kumquat, tamarindo, higo chumbo, arándanos rojos, grosellas negras, yaca, melón cantalupo y honeydew, fruta en almíbar, congelada y deshidratada.
- **Más lácteos**: quesos gruyère, suizo, muenster, fontina, roquefort, monterey, provolone y cheddar light; suero de leche, leche en polvo, natas de café y yogures desnatados de vainilla y de frutas.
- **Más bebidas**: zumos de pomelo, arándanos, zanahoria, néctares de melocotón y pera, limonada, té verde y negro (también descafeinado), café de filtro y descafeinado, agua con gas, tónica, refresco de uva y vinos.
- Todo con su ficha oficial: los genéricos del USDA FoodData Central y los de marca de Open Food Facts, revisados uno a uno (las calorías de la etiqueta tienen que cuadrar con sus macros).
- Las páginas públicas «Calorías de…» pasan de 2.022 a **2.596**.
- Los alimentos genéricos nuevos también tienen su nombre en inglés.

*Pendiente:* más productos de marca de lácteos, bolleria, sándwiches y bebidas. Open Food Facts estaba caído al preparar esta versión; la descarga se retoma cuando vuelva.

## 3.20.0 · 23 de octubre de 2026

**Coach mucho más listo** (se probó con ~50 preguntas reales; muchas no las entendía o respondía mal).

- **Quitar lo apuntado hablando**: «quita el pan», «borra el café» → se quita del diario de hoy con «Deshacer». Antes «borra el café» proponía *añadirlo*.
- **«Deshaz»**: vuelve a poner lo último que quitaste, o quita lo último que apuntó el Coach.
- **«Me peso 84,2»**: propone guardar el peso (un toque) y te dice cuánto ha cambiado desde la última vez. No se guarda sin pulsar.
- **«¿Qué entreno hoy?»**: te dice qué día de tu rutina toca, con lo que levantaste la última vez en cada ejercicio, y te lleva al gym. Antes proponía queso brie.
- **«Quiero perder 5 kilos en un mes»**: calcula el ritmo que haría falta, avisa si es demasiado rápido (más del 1 % del peso a la semana) y da la fecha realista a tu ritmo.
- Respuestas nuevas: cuánta proteína necesito, cuánto llevo de proteína, antojos y ansiedad por el dulce, peso saludable para tu estatura, calorías que quemas haciendo deporte (9 actividades, con los minutos que digas), dolor o lesión (siempre deriva al profesional), cansancio, dormir mal, pasos al día, cenar tarde, cuántas comidas al día, qué comer antes y después de entrenar, fibra, azúcar (límite de la OMS), ganar músculo, cardio o pesas, «¿voy bien?» y «tengo 600 kcal para cenar».
- «¿Qué puedes hacer?» y las sugerencias rápidas incluyen lo nuevo («¿Qué entreno hoy?» si tienes gym).
- Arreglado: «no tengo hambre» ya no se confunde con un antojo.
- La racha en **0 días** ya no sale en verde (verde = vas bien).
- Números iguales en toda la app: siempre con punto de miles («2.324 kcal», antes «2324» dentro de la app y «2.100» en la portada).
- Quitado del código un patrón del Coach que no se usaba (con permiso de Ángel).
- Todo en español e inglés (cobertura 100 %). 6 pruebas nuevas (81 en total).

## 3.19.0 · 23 de octubre de 2026

**«Compartir mi semana» rehecho** (skill `referrals`: el resultado que compartes es la mejor publicidad de la app).

- **Vista previa** antes de compartir (antes se compartía a ciegas) y 2 formatos: **Historia 9:16** (Instagram y WhatsApp, con márgenes para sus barras) y **Publicación 4:5**.
- **Titular automático con lo mejor de tu semana**, siempre un dato real: «5/5 días apuntados · Sin fallar ni uno», racha, entrenos (con kg levantados) o días con la proteína cumplida.
- **Calendario de la semana** con tus días en verde (proteína cumplida) y caramelo (apuntado), igual que en la app.
- 4 cifras con iconos dibujados (antes un emoji 🔥 que cada móvil pinta distinto) y la letra se encoge sola si no cabe (también en inglés).
- **Invitación para quien la ve**: «¿Te animas? Es gratis. Calorías, macros, escáner y gym · sin anuncios» + la dirección de la app.
- **Texto ya escrito** al compartir con tus datos de la semana y el enlace; «Guardar imagen» y «Copiar texto» por separado. En ordenador, guarda la imagen y copia el texto.
- Nunca lleva peso ni medidas (prueba automática). Botón de Progreso más visible.
- 1 prueba nueva: 75 en total.

## 3.18.0 · 23 de octubre de 2026

- **Verde con sentido en toda la app** (decisión de Ángel): todo lo que significa «bien», «hecho» o «conseguido» es verde. Nuevos en verde: «Quedan X kcal», racha (chip de Hoy y tarjeta de Progreso), logros conseguidos, días cumplidos del calendario semanal, celebraciones, lista de la compra (barra y casillas compradas), barras del menú del día al cumplir, «Mis pesos más altos», ✓ de «PDF creado» y de lo incluido en Gratis/PRO. Botones y marca siguen en caramelo.
- **Superseries en el gym**: botón 🔗 para unir un ejercicio con el siguiente. Se ven juntos en un bloque «Superserie» con la indicación de hacerlos seguidos; cada uno guarda sus series y pesos (no se pierde el historial ni los récords). «Separar» para deshacerlo. Siempre de 2 en 2; mover o quitar uno deja al otro como ejercicio normal. Se guarda en el entreno y se ve en el historial («Superserie con…»).
- **Gráfica de peso**: la línea une todas las veces que apuntaste tu peso (antes seguía la media de 7 días). Las cifras de media y ritmo semanal siguen igual.
- 2 pruebas nuevas: 74 en total.

## 3.17.0 · 23 de octubre de 2026

Editar todo rápido y paleta mixta (elegida por Ángel).

- **Paleta mixta**: el caramelo sigue siendo la marca (botones, logo); el **verde solo significa «vas bien»**: barra y anillo de calorías mientras no te pasas, macro cumplida (≥ 95 %) con ✓, días entrenados del gym y «Añadido». Contraste 10:1 sobre el fondo.
- **Diario**: al tocar un alimento apuntado, nuevo botón «Cambiar nombre o macros» (conserva cantidad y comida). En «solo calorías», si dejas las kcal vacías se calculan solas con las macros (4·P + 4·HC + 9·G). «Quitar» también desde ese editor.
- **Mis alimentos**: ya se pueden **editar** (mismo formulario, relleno) y **borrar** (con Deshacer). Lo ya apuntado no cambia.
- **Gym**: tocar el nombre de un ejercicio para **cambiarlo** (opción de cambiarlo también en tus otros días y entrenos guardados, sin perder «Última vez» ni tus récords); flechas para **subir/bajar** ejercicios; «Editar» en «Tus ejercicios» para quitar los que ya no usas (vuelven si los usas otra vez).
- 4 pruebas nuevas (`tests/edicion-diario-y-gym.test.js`): 72 en total.

## 3.16.0 · 23 de octubre de 2026

Auditoría de seguridad, datos y Coach (modelo de amenazas completo en `docs/SEGURIDAD-Y-PUBLICACION.md`).

- **El Coach ya no apunta nada sin preguntar cuando adivina**: enseña lo que ha entendido, con gramos editables, y pide «Añadir al diario». Antes, «No tengo pollo» apuntaba Nocilla y pollo.
- El lector de comidas ignora lo negado («no tengo…», «ni pan») y las palabras de 1-2 letras solo valen enteras («no» ya no es «Nocilla»).
- El Coach entiende más: «Añade dos huevos a la comida», «Cambia el arroz por patata» (mismas calorías, botón para cambiarlo y Deshacer), «No tengo pollo» (ideas sin pollo), «Dame una comida barata» (ingredientes económicos), «¿Qué preparo mañana?» y «¿Qué puedo comer ahora?» (antes respondía «Sí, puedes»).
- **Guardar sin espacio**: si el almacenamiento del móvil se llena, se borran primero las copias automáticas antiguas; si aun así no cabe, avisa (antes fallaba en silencio y se podían perder datos).
- Cargar una copia: archivos de más de 20 MB se rechazan, y si sustituye perfiles, antes se guarda una copia automática para poder volver atrás.
- Aviso prudente si el peso objetivo queda por debajo del rango saludable (IMC < 18,5).
- Los avisos largos se quedan más tiempo en pantalla (hasta 7 s) para poder leerlos.
- Privacidad: la política explica que Open Food Facts puede ver la IP y el navegador al escanear; `no-referrer` en todas las páginas y CSP estricta (sin scripts) en las páginas legales.
- 8 pruebas nuevas (`tests/coach-ordenes-y-lector.test.js`): 68 en total.

## 3.15.0 · 22 de octubre de 2026

- **111 productos nuevos (2.391 alimentos en total)**: los **más escaneados en España** en Open Food Facts, de cualquier marca (la mejor medida pública de lo que la gente apunta en las apps de calorías). Gullón Zero, Old El Paso, Wasa, Oatly, Alpro, Carrefour, Lidl (Milbona, Alesto, Crownfield…), Príncipe, Lotus Biscoff, Barilla, Weetabix, Hacendado y más.
- Revisados **uno a uno**: nombre claro en español y la marca de la tienda (no la razón social); fuera 29 (solo de Francia/Italia, sin marca, datos imposibles o nombre dudoso) y 13 repetidos con otro nombre. Mismas reglas de siempre: las calorías tienen que cuadrar con la etiqueta.
- Proceso repetible: `node tools/marcas/off_fetch7.js` → `off_build3.js v7` → `off_v7_revision.js` → `off_embed.js` → `npm run seo`.
- El cruasán genérico también se encuentra buscando «croissant». Páginas «Calorías de…»: 2.022.
- Más robusto: si una copia de seguridad antigua trae una comida sin proteína/hidratos/grasa, el diario muestra 0 en vez de «NaN».

## 3.14.0 · 22 de octubre de 2026

Los puntos débiles que salieron de las reseñas de la competencia y de la revisión de la portada (`docs/COMPETENCIA.md`):

- **Portada nueva**: titular «Cuenta calorías gratis de verdad» (el anterior queda encima como subtítulo) y **promesa pública**: el escáner, las macros, el diario, el Coach básico, el progreso y el gym seguirán siendo gratis. También en las preguntas frecuentes y en la ficha de Google Play.
- **Nuevo objetivo: recomposición corporal** (perder grasa y ganar músculo a la vez): déficit pequeño de 2,5 / 5 / 7,5 % y proteína a 2,2 g/kg (Barakat 2020, Morton 2018). En el asistente, en «Mi plan», en «Hoy» y en el PDF.
- **Macros a mano** en «Mi plan»: pones proteína, hidratos y grasas y las calorías salen solas; botón para volver al cálculo automático. Avisa (sin bloquear) si quedan por debajo del mínimo seguro. Los valores se limpian (solo números, de 0 a 600 g).
- 6 pruebas nuevas (`tests/recomposicion-y-pro.test.js`): 60 en total.

## 3.13.0 · 22 de octubre de 2026

Ronda de mejoras con las skills de negocio (review-mining, competitive-analysis, aso, onboarding, paywalls, pricing, churn-prevention, referrals, cro, copywriting, programmatic-seo, mvp-scoping).

- **Aviso antes de que acabe la prueba PRO** (a 2 días y a 1 día) en «Hoy»: explica que lo gratis sigue y que no se cobra nada. Una vez al día como mucho.
- **Pantalla PRO**: botón «Seguir con la versión gratis», además de la X.
- **Boca a boca**: el PDF del plan lleva el enlace a la app en el pie, y la lista de la compra compartida termina con «Hecha con nutriDL, gratis: …».
- **Páginas «Calorías de…»**: cada ficha añade notas propias calculadas con sus datos (semáforo de la FSA para grasas y azúcares; proteína por 100 kcal frente a su grupo). Las listas de «parecidos» ya no se salen de la pantalla en el móvil.
- **5 rankings nuevos** con datos reales: productos Hacendado con más proteína, Hacendado con más proteína por caloría, alimentos con más proteína, comida rápida con menos calorías y con más proteína por ración. Enlazados desde el índice y en el sitemap.
- **Ficha de Google Play** (`docs/PLAY-STORE.md`): título «nutriDL: Contador de Calorías», descripción con las búsquedas reales («contar calorías», «dieta», «adelgazar», «Mercadona») y cifras al día (2.280 alimentos).
- Nuevo `docs/COMPETENCIA.md`: 580 reseñas de Google Play España (Fitia, Yazio, MyFitnessPal) y posicionamiento.

## 3.12.0 · 21 de octubre de 2026

**La app ya está en inglés: puedes elegir ES o EN**

- **Nuevo selector de idioma** en el menú del perfil (ES / EN). Se recuerda y no toca tus datos.
- **Toda la app traducida**, no solo los botones: el Coach y sus respuestas, «¿Qué como?», el menú del día, «Mi nevera», la lista de la compra, el diario, el gym, el progreso, los logros, el asistente de alta, el PDF del plan, la portada y las páginas de privacidad y términos (`privacy.html` y `terms.html`).
- **Los alimentos genéricos tienen nombre en inglés** (772: «Pechuga de pollo» → «Chicken breast»), y el buscador entiende los dos idiomas: «chicken» y «pollo» encuentran lo mismo.
- **El Coach entiende inglés igual que español.** «I had 200 g of chicken and 100 g of rice» se apunta solo; «what can i have for dinner?» propone platos; también las preguntas de agua, alcohol, ayuno, suplementos, estancamiento, comer fuera, la nevera y la compra. Comprobado: las 28 preguntas de prueba se reconocen igual en los dos idiomas.
- **Las cantidades también se traducen**: «1 filete», «2 lonchas», «un puñado» pasan a «1 fillet», «2 slices», «a handful». Y al revés: «a slice of bread», «3 tablespoons» o «half an avocado» se entienden al apuntar.
- Números, fechas, días de la semana, porcentajes y precios siguen el formato de cada idioma (1.234,5 frente a 1,234.5).
- El dictado por voz escucha en el idioma elegido.
- **En español no cambia nada**: mismos textos y mismos resultados.

*Lo que sigue en español:* los nombres de los productos de marca (McDonald's, Hacendado, Danone...) y las páginas públicas «Calorías de...».

## 3.11.1 · 20 de octubre de 2026

- Inglés: la pestaña «Hoy» entera ya tiene su traducción (saludo, fechas, tarjetas, avisos, accesos rápidos y comidas). El selector sigue oculto hasta terminar.

## 3.11.0 · 20 de octubre de 2026

**Base para el inglés (aún no visible)**
- La app ya puede funcionar en español o en inglés: los textos, los números (1.234,5 / 1,234.5), las fechas y las iniciales de los días se adaptan al idioma, y la elección se recuerda.
- **El selector todavía no se enseña**, a propósito: hasta que la traducción esté completa, media app en inglés y media en español sería peor que dejarla en español. Una prueba automática impide publicarlo a medias.
- Para quien usa la app hoy **no cambia nada**: sigue igual, en español.
- Nueva herramienta `npm run i18n` para ver cuánto falta.

## 3.10.1 · 20 de octubre de 2026

- **El aviso de racha manda sobre el resumen semanal.** Un lunes por la tarde podían salir los dos; ahora sale primero el que caduca hoy (la racha), porque el resumen aguanta hasta el miércoles.
- Pruebas: ya no dependen del día ni del huso horario en el que se ejecuten (47, comprobadas en cuatro husos).

## 3.10.0 · 20 de octubre de 2026

**La pestaña «Hoy» te dice lo que toca**
Arriba del todo aparece, como mucho, **un aviso al día**, y solo cuando de verdad viene a cuento:

- **Tu racha se pierde esta noche.** A partir de las 17 h, si llevas 2 días o más seguidos y hoy no has apuntado nada, te avisa con un botón para apuntar en 10 segundos. Si ya has apuntado, no aparece.
- **El resumen de la semana pasada**, los lunes (y hasta el miércoles si no lo has visto): días apuntados, media de calorías y proteína, entrenos y cómo se movió tu peso. Con botones para ver tu progreso o compartirlo. No desaparece al refrescarse la pantalla: se va cuando lo usas.
- **Si vuelves después de 3 días o más**, te recibe sin regañarte: tu plan sigue donde lo dejaste y se empieza por la comida de hoy.
- **El recordatorio diario** (el del calendario, que ya existía escondido en el Coach) ahora se te ofrece una sola vez, cuando ya llevas 3 días usando la app.

Todos se pueden apartar y ninguno se repite. Si hoy ya has atendido un aviso, el siguiente espera a mañana.

**Por dentro**
- 46 pruebas automáticas (6 nuevas).

## 3.9.0 · 20 de octubre de 2026

**El Coach entiende mucho más**
- **Se acuerda de lo que acabas de decir.** Si te propone cenas y escribes «otra», te da otras tres. Si escribes «¿y de desayuno?», cambia de comida sin repetir la pregunta. Si preguntas por un alimento, «¿y el arroz?» sigue hablando del arroz. La memoria dura 20 minutos.
- **13 temas nuevos** que antes caían en «no te he entendido»: si puedes comer algo («¿puedo comer pizza?»), comparar dos alimentos («¿arroz o pasta?»), cuánta agua, alcohol, ayuno intermitente, suplementos, cuándo se ven resultados, estancamientos, haberse pasado un día, no tener hambre, qué sabe hacer, quién es y dar las gracias. Todas las respuestas usan tus números: tus calorías, tu proteína y lo que te queda hoy.
- **Dice la verdad sobre lo que es**: si le preguntas si es una IA, responde que no, que funciona con reglas y con tus datos dentro de tu móvil. Por eso va sin cobertura y nada sale de tu teléfono.
- **Si no entiende pero reconoce un alimento**, en vez de rendirse te ofrece sus calorías, si te cabe hoy o apuntarlo.
- **Las frases ya no se repiten** palabra por palabra.
- **Arreglado**: preguntar «¿y el arroz?» apuntaba arroz en el diario sin querer. Una pregunta ya nunca se apunta sola (si lleva cantidad, como «2 huevos», sí se apunta).

**Por dentro**
- 39 pruebas automáticas (5 nuevas).
- `docs/ESTADO.md`: estado medido de la app y plan por fases.

## 3.8.1 · 19 de octubre de 2026

- **Seguridad de PRO:** la app comprueba que el código guardado es uno válido (antes bastaba con que hubiera algo guardado) y que una prueba gratis no dure más de 7 días. Quien ya activó PRO con su código o está en su prueba no nota nada.

## 3.8.0 · 18 de octubre de 2026

- **1.911 páginas públicas «Calorías de…»** (`alimentos/`), una por cada alimento con fuente comprobable (etiqueta de Open Food Facts, USDA, ICBF o web oficial del restaurante): calorías y macros por 100 g y por ración, reparto de calorías, fuente enlazada, alimentos parecidos e índice por marcas y grupos. Lighthouse móvil de una ficha: 99 · 100 · 100 · 100. Se generan con `npm run seo`.
- **Botón «Apúntalo en nutriDL»** en cada ficha: abre la app con ese alimento listo para añadir (`?alimento=id`). Si aún no hay perfil, avisa y lo abre al terminar de crearlo.
- El modo sin conexión deja pasar las páginas de `alimentos/` (no se guardan en el móvil ni se confunden con la app).
- Pie de la app: enlace «Calorías de los alimentos». `sitemap.xml` con todas las páginas.
- Servidor local: una carpeta abre su `index.html`, como en GitHub Pages.

## 3.7.1 · 18 de octubre de 2026

- **Abre antes**: las fuentes se declaran dentro de la página (una petición menos antes del primer pintado). `npm run build` las copia siempre de `css/fonts.css`.
- **Accesibilidad**: los enlaces del pie (Instalar, Privacidad, Informe de errores…) tienen ahora una zona táctil de 32 px (antes 18 px).
- Auditoría: 34/34 pruebas, gitleaks y semgrep sin hallazgos; Lighthouse móvil 94 · 96 · 100 · 100. Quedan 2 avisos en herramientas de desarrollo (braces, postcss-selector-parser) que no llegan a la app y solo se arreglan cambiando a Tailwind 4.

## 3.7.0 · 18 de octubre de 2026

**Gym**
- **Tus ejercicios en el buscador**: al escribir un ejercicio salen también los que creaste tú (marcados «Tuyo»), y sin escribir nada aparecen como atajos en «Tus ejercicios». Al elegir uno se usa el mismo nombre de siempre, así su historial y «Última vez» siguen juntos.

**Comida**
- **26 alimentos y platos colombianos** con los valores oficiales de la Tabla de Composición de Alimentos Colombianos (ICBF, 2018), con su energía oficial: almojábana (bogotana y vallecaucana), pandebono, pandeyuca, pan de queso, arepas colombianas, envuelto de mazorca, bollo limpio, carimañola, empanada de pipián, ajiaco, bandeja paisa, lechona, tamal tolimense, sancochos, mote de queso, mute, mazamorra chiquita, arroz atollado y clavado, cuy, friche y viudo de bocachico.
- **Salchipapa**: calculada como receta con dos alimentos de esa misma tabla ya cocinados (2/3 papa frita a la francesa + 1/3 salchicha), sin salsas.
- El buñuelo no está en ninguna tabla oficial (Colombia, Perú ni USDA): no se añade para no inventar cifras. Se puede crear con «Crear alimento» o escanear el paquete.

**Seguridad**
- Los nombres de producto que llegan al escanear un código de barras se guardan como texto limpio, igual que las copias importadas, y el código se limita a 14 números.

## 3.6.0 · 17 de octubre de 2026

**Gym**
- **Dropsets**: toca el número de una serie para hacerla dropset y apunta cada bajada de peso con sus repeticiones (+ Bajada / quitar). Se ven en el historial, en el detalle del entreno, en «Última vez» y en el PDF. El volumen cuenta todas las bajadas; el récord del ejercicio usa la primera.
- **Cronómetro del entreno**: «Empezar entreno» lo pone en marcha y queda fijo arriba mientras entrenas, con pausa y reanudar. Guarda la hora de inicio, así que sigue contando aunque cierres la app o se bloquee el móvil. Al guardar, el entreno guarda su duración y se ve en el historial y en el detalle.
- Los entrenos de antes se leen igual (series normales, sin duración).

**Comida**
- **Azúcares**: los alimentos los traen cuando la fuente los da (1.900+); se ven en la ficha («de los cuales azúcares»), en cada comida del diario y en el total del día. Nunca se inventa un 0.
- **Crear alimento** pide energía (kcal), grasas, hidratos, azúcares, proteínas y fibra (opcional), en el orden de la etiqueta. Si pones las kcal de la etiqueta, mandan.
- **+797 alimentos (2.254 en total)**:
  - Comida rápida con los valores oficiales que publica cada cadena en España: McDonald's (75), KFC (61) y Burger King (27).
  - Platos de España y Latinoamérica: tacos, burritos, enchiladas, tamales, pupusas, empanadas, arepa, ceviche, paella, gazpacho, mofongo y más. Incluye pulled pork. Fuente: USDA FNDDS, con su ración típica oficial.
  - Proteínas y despensa: Myprotein, HSN, Prozis, Optimum Nutrition, Amix, mermeladas (Hero, Helios, La Vieja Fábrica…), Nocilla, Cola Cao, Kellogg's, quesos…
  - Bebidas: Coca-Cola, Aquarius, Nestea, Fanta, Sprite, Pepsi, Kas, Schweppes, Trina, Monster, Red Bull, Burn, zumos Don Simón, Granini, Zumosol… También las versiones Zero.
  - Todo validado: las kcal cuadran con las macros, sin repetidos y con nombres claros.
- Ningún alimento ya publicado cambia (los diarios siguen enlazando igual).

## 3.5.0 · 15 de octubre de 2026

- **Compartir mi semana** (Progreso): crea una imagen con tu racha, días registrados, proteína cumplida, entrenos y logros, con el enlace a la app. Sin peso ni medidas, por privacidad.
- **Portada más clara**: «Gratis y sin anuncios», «Escáner y macros gratis» y «más de 1.400 alimentos, con casi 500 productos Hacendado».
- **Lista para Google Play**: al abrir desde la app de Play (`?src=play`) no se muestran precios, el botón de pago ni el campo de códigos; la prueba de 7 días sigue. Guía completa en `docs/PLAY-STORE.md` y gráfico destacado en `tools/play/`.
- SEO: `sitemap.xml` y dirección canónica.
- `LICENSE`: todos los derechos reservados.

## 3.4.3 · 15 de octubre de 2026

- **9 alimentos nuevos (1.457 en total)**, con los datos de su etiqueta (Open Food Facts) y comprobados (las calorías cuadran con sus macros):
  - Hacendado: carne picada de vacuno, carne picada mixta vacuno y cerdo, burger meat de vacuno, hamburguesa de lomo de vacuno, mini hamburguesas de pollo y albóndigas de pollo.
  - Heura (proteína vegetal): bocados, burger y nuggets originales.
- Nuevo `tools/marcas/marcas_v4.json` para añadir productos sueltos sin tocar los anteriores.

## 3.4.2 · 14 de octubre de 2026

- Coach: la conversación empieza limpia cada día (solo se guardan los mensajes de hoy). Lo apuntado en el diario no cambia.

## 3.4.1 · 14 de octubre de 2026

- Contacto del responsable (aannggeelltrabajos@gmail.com) en la política de privacidad (v4.1), en los términos (v1.1) y al pie de la app; añadido el derecho a reclamar ante la AEPD.
- Las copias de seguridad en un solo archivo vuelven a incluir todo el JavaScript (desde la 3.4.0 salían incompletas por los scripts diferidos).

## 3.4.0 · 14 de octubre de 2026

**Nuevo**
- **Base de alimentos tres veces más grande (1.448)**:
  - 279 alimentos genéricos crudos y cocinados (hervido, a la plancha, al horno, en seco…) con los valores oficiales del USDA.
  - 671 productos de marca más, 420 de ellos de Hacendado, con los datos de su etiqueta (Open Food Facts).
  - Cada producto se valida: las calorías tienen que cuadrar con sus macros.
- **El buscador entiende masculino/femenino y singular/plural**: «gambas cocidas» encuentra «langostinos cocidos».
- **Copias automáticas**: una al día en el dispositivo (las 3 últimas), con «Restaurar» en el menú del perfil.
- La app pide al navegador que **no borre sus datos** por falta de espacio.

**Más rápida**
- **Se abre al instante**: antes esperaba a internet hasta 4 segundos en cada apertura; ahora usa lo guardado y se actualiza por detrás.
- Primera visita: el primer pintado en un móvil lento pasa de 6,3 s a 1,7 s (scripts diferidos y fuentes precargadas). Lighthouse: 91 · 100 · 100 · 100.

**Seguridad y fiabilidad**
- Revisión con gitleaks (sin secretos), osv-scanner (solo 2 avisos en herramientas de desarrollo) y semgrep.
- Búsquedas en Open Food Facts con límite (8 por minuto, sin repetir) y espera máxima de 8 s.
- **Errores**: el registro se guarda sin correos, teléfonos ni lo que escribiste, y anota los cierres inesperados.
- **Pantalla de rescate** si la app no pudiera arrancar.
- Los datos dañados se apartan antes de que nada los pise.
- Herramientas de GitHub fijadas a versiones exactas y con permisos mínimos; el servidor local solo escucha en el propio ordenador.
- Política de privacidad v4. Nuevo `docs/SEGURIDAD-Y-PUBLICACION.md`, con la revisión completa y los requisitos de Play Store y App Store.

**Corregido**
- Hidratos de los anacardos (USDA).

## 3.3.0 · 10 de octubre de 2026

**Diseño profesional, sin emojis** (todas las funciones siguen igual)
- Adiós a los emojis: cada alimento lleva un icono de línea sobrio según lo que es (carne, pescado, marisco, huevo, lácteo, queso, pan, arroz, pasta, fruta, verdura, frutos secos, aceite, bebidas, café, postres…). El asistente, los logros, las celebraciones, el Coach, la compra y los avisos usan la misma familia de iconos. Los mensajes antiguos del chat también se muestran con iconos.
- Cifras protagonistas en «Hoy»: las calorías y los datos clave en serifa con dígitos alineados, como un marcador.
- Macros con su punto de color (proteína, hidratos, grasa) en el diario.
- Superficies planas con borde fino y esquinas de 16 px; botones con la misma altura y radio en toda la app; barras de progreso más finas.
- Barra inferior con un indicador fino sobre el apartado activo; etiquetas BETA/PRO rectangulares y discretas.
- «Hoy»: la fecha va debajo del saludo; portada sin la etiqueta encima del título.
- Arreglado: el botón principal de «¿Qué hago ahora?» había perdido su color de marca.

## 3.2.0 · 10 de octubre de 2026

**Diseño más profesional** (nada se ha quitado: todo funciona igual)
- Grises cálidos en toda la app (antes se mezclaban grises fríos con el marrón) y fondo casi negro cálido.
- Titulares con una serifa editorial (Newsreader) y el logotipo con la misma letra; menos negrita extra en el resto.
- Etiquetas en minúscula normal en lugar de MAYÚSCULAS espaciadas; superficies sobrias con luz desde arriba, sin brillos de colores; esquinas algo más contenidas.
- Iconos de línea en lugar de emojis en «Hoy», «Lo que dicen tus datos», la racha y la portada.
- Portada: bloque de funciones asimétrico, pasos numerados «01 · 02 · 03» y textos más claros.
- Accesibilidad: el gris más apagado sube a un contraste de 5:1; las pestañas del buscador de alimentos ya no se salen en móviles de 320 px.

**Seguridad**
- Al cargar una copia de seguridad se limpia todo lo que trae: identificadores y fechas válidos, sin comillas ni etiquetas HTML, entrenos con número y el chat convertido a texto plano. Así un archivo trucado que te envíe otra persona no puede ejecutar nada en la app ni leer tus datos. Las copias normales se cargan igual que antes.
- Botones de entrenos con identificadores siempre numéricos.

## 3.1.0 · 9 de octubre de 2026

**Nuevo**
- **Coach: «He comido…» se apunta al momento**, con calorías y macros de cada cosa, el total y lo que te queda. Botones «Deshacer» y «Ajustar». Si un plato no está en la base, se apunta con una estimación de calorías en un toque.
- **Mi nevera (PRO)**: escribe o marca lo que tienes (con foto de la nevera como guía) y te propone qué cocinar para la comida que toca, con cantidades y macros; si falta una cosa, te lo dice. También desde el Coach: «Tengo pollo, arroz y brócoli, ¿qué ceno?».
- **Compra inteligente (PRO)**: pídela con tus palabras («compra fitness para 7 días, me gusta el salmón, sin lactosa») y te prepara el plan de comidas día a día y la lista con las cantidades totales (y por día). Cámbiala igual: «cambia el salmón por merluza» (con la misma proteína), «quita la leche», «añade 1 plátano al día», «me gusta el atún». Marca lo que ya tienes en casa.
- **Gratis y PRO separados de verdad**: voz, foto, nevera, menú del día, compra inteligente y análisis avanzado son PRO. Prueba de 7 días gratis (sin tarjeta) y códigos de activación.
- **Gym**: los días se eligen una vez y solo se cambian en «Ajustes» del gym o en «Mi plan»; puedes elegir qué días (lunes a domingo) y al abrir el gym verás el de hoy. **Historial completo** de todos tus entrenos (por meses, con buscador) y cada entreno se abre con todas sus series.
- Más de 100 alimentos y platos nuevos: versiones ya cocinadas (patata cocida, arroz integral, quinoa, pollo, pavo, salmón, merluza…), comida rápida e internacional (kebab, burrito, pizza margarita, carbonara, ramen, poke, sushi…), platos y tapas de España (pulpo a la gallega, fabada, callos, migas…), postres y bebidas (con agua, café cortado, tinto de verano…).

**Cambiado**
- «Tu semana» en Progreso va de lunes a domingo.
- Los platos propuestos llevan el nombre y la receta de lo que de verdad llevan (antes, al cambiar un ingrediente por tu dieta, el nombre no cambiaba).
- Menús de varios días con más variedad y sin comidas vacías: si con tus preferencias una comida no tiene opciones, sus calorías se reparten entre las demás.

**Arreglado**
- Las tortitas, el sushi o las croquetas sin cantidad cuentan una ración típica (no una sola pieza).

## 3.0.1 · 8 de octubre de 2026

**Arreglado**
- En portátiles (1024-1279 px) las pestañas, «Crear perfil» y los botones de la portada ya no se parten en dos líneas.

## 3.0.0 · 8 de octubre de 2026 · «Tu entrenador nutricional personal»

**Nuevo**
- **Hoy**: tu objetivo, calorías y macros de un vistazo, «¿Qué hago ahora?» (próxima comida con calorías y proteína recomendadas), accesos rápidos (voz, foto, buscar, escanear), racha y el dato de tu semana.
- **Coach**: pregúntale «¿Cuánto me queda?», «¿Qué ceno?», «Voy a cenar fuera», «Quiero un desayuno de 40 g de proteína» o dile lo que has comido y lo apunta (siempre con confirmación). Cada respuesta indica si es un dato tuyo, una estimación o una recomendación. Funciona en tu dispositivo.
- **¿Qué como?**: platos con los gramos ajustados a lo que te queda, según tu dieta, alergias, lo que no te gusta, tu presupuesto y lo que tienes en casa. Con receta.
- **Menú del día** (3, 4 o 5 comidas) con gramos exactos y **lista de la compra** para hoy, 3 días o la semana, agrupada y para compartir.
- **Registro por voz** y **foto del plato** (estimación aproximada, editable).
- **Mi progreso**: tu semana, racha, tendencia del peso medio, peso objetivo, gráfica de medidas, mensajes que interpretan tus datos y 12 logros.
- Celebraciones discretas: proteína conseguida, día completado, rachas de 7 a 100 días.
- Asistente más completo: entrenamiento, dieta, alergias y número de comidas, y «Tu plan personal» explicado.
- Landing para quien llega por primera vez, pantalla nutriDL PRO (en beta todo es gratis) y recordatorio diario en el calendario.
- Diario: macros de cada alimento, duplicar en otra comida u otro día y «≈ estimado» en lo aproximado.
- 10 platos típicos (cocido, fabada, salmorejo, churros…) y raciones habituales para café, cerveza, vino y refrescos.

**Arreglado**
- «Restablecer» en Mi plan pide confirmación y ya no borra medidas, comidas guardadas ni preferencias (solo los datos de la calculadora).
- El menú del perfil se desplaza en móviles de pantalla baja.

**Cambiado**
- La calculadora pasa a llamarse «Mi plan» (con «Cómo se ha calculado» y tus preferencias de comida); la app abre en «Hoy».
- Barra inferior de 5 secciones (Hoy, Diario, Coach, Progreso, Gym); en pantallas grandes, barra superior.

**Por dentro**
- Nuevos módulos: engine, parser, insights, coach, plans y analytics (medición de uso solo en el dispositivo).
- Política de seguridad de contenidos (CSP) y privacidad actualizada.
- 7 pruebas automáticas nuevas (14 en total).
- La copia en un solo archivo (tools/bundle.js) vuelve a funcionar con las marcas de versión.

## 2.1.4 · 7 de octubre de 2026

**Arreglado**
- Las actualizaciones llegan al momento: con internet la app siempre carga la versión más nueva (sin conexión usa la copia guardada) y, si se publica una versión con la app abierta, se recarga sola una vez.
- Cada archivo lleva una marca de versión para que nunca se mezclen archivos de versiones distintas.

## 2.1.3 · 7 de octubre de 2026

**Cambiado**
- Calculadora: tras pulsar «Aceptar», edad, peso y estatura quedan bloqueados para no moverlos sin querer al deslizar en el móvil. Para cambiarlos, «Editar datos» y después «Aceptar».

## 2.1.2 · 7 de octubre de 2026

**Arreglado**
- Móvil: la fila de fechas del diario se salía de la pantalla al cambiar de día y el botón «Volver a hoy» quedaba cortado y difícil de pulsar. Ahora la fila siempre cabe (comprobado a 320 y 375 px).

**Nuevo**
- Aviso cuando hay una versión nueva de la app mientras la tienes abierta.

## 2.1.1 · 7 de octubre de 2026

**Arreglado**
- Diario: el botón «Hoy» ahora indica el día que ves; en otro día pasa a «Volver a hoy» y el resumen dice «Ayer», «Mañana» o la fecha.
- Las gráficas de peso y de progreso del gym se dibujan al ancho real de la pantalla: en el móvil la letra se lee bien y tienen líneas de referencia con los kilos.

**Por dentro**
- Nueva herramienta tools/bundle.js para guardar la app en un solo archivo HTML.

## 2.1.0 · 7 de octubre de 2026

**Nuevo**
- Se instala en el móvil como una app (icono propio, pantalla completa, accesos directos) y funciona sin conexión.
- Escáner de código de barras en el diario (cámara o escribiendo el código), con los datos de Open Food Facts; el producto queda guardado en «Mis alimentos».
- Comidas guardadas: guarda una comida del diario («mi desayuno de siempre») y añádela de un toque.
- Gym: entrenos guardados con opción de editar o borrar, gráfica de progreso de cada ejercicio (desde «Mis pesos más altos») y temporizador de descanso opcional.
- Medidas corporales (cintura, cadera, pecho, brazo, muslo) con la diferencia desde la primera medida.
- Páginas de privacidad y términos de uso, «Borrar todos los datos» e informe de errores que se guarda solo en el dispositivo.
- Pruebas automáticas que se ejecutan en GitHub en cada cambio.

**Quitado**
- El menú del día automático (y la lista de la compra, el menú semanal, los favoritos y «no me gusta»).
- Código que ya no se usaba: generador de rutinas antiguo, sesión de entreno a pantalla completa, WhatsApp, proyección de peso.

**Arreglado**
- El asistente decía «Paso 1 de 9» cuando son 5 pasos.
- Algunos textos que debían ir en una línea se partían en varias.
- El panel de inicio mostraba cifras antiguas si un perfil se quedaba sin datos.

**Por dentro**
- La app pasa de un solo archivo a varios (HTML, CSS, JavaScript por partes, fuentes e iconos), con herramientas para regenerarlos.

## 2.0 · 7 de octubre de 2026
- Calculadora con campos vacíos y botón «Aceptar».
- Gym a tu medida: eliges tus días y apuntas tus ejercicios y pesos; «Mis pesos más altos» al completar la semana.

## 1.0 · 7 de octubre de 2026
- Primera versión publicada.
