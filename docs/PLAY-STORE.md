# Publicar FitDL en Google Play (paso a paso)

La app de Play es la misma web metida en una app Android (Trusted Web Activity, TWA, una app Android que muestra la web a pantalla completa). Cada vez que se sube un cambio a GitHub, la app de Play también se actualiza sola, sin volver a publicar en la tienda.

**Sin pagos por ahora.** Al abrir desde la app de Play (`?src=play`), FitDL oculta los precios, el botón «Hazte PRO» y el campo de códigos, porque Google Play tiene sus propias normas de pago (ver `IN_PLAY` en `js/plans.js`). La prueba gratis de 7 días se mantiene.

## Lo que necesitas
| Qué | Coste | Nota |
|---|---|---|
| Cuenta de desarrollador de Google Play | 25 $ una vez | play.google.com/console · pide verificar tu identidad (DNI) |
| 12 personas que prueben la app durante 14 días | 0 € | Obligatorio en cuentas personales nuevas antes de publicar |
| Un móvil Android | — | Para las capturas y la prueba |

## Paso 1 · El archivo que une la web con la app (assetlinks)
Android solo abre la app a pantalla completa (sin barra del navegador) si la web tiene el archivo `/.well-known/assetlinks.json` **en la raíz del dominio**. La app vive en `trbsaldl.github.io/FitDL/`, así que la raíz es `trbsaldl.github.io`:
1. En GitHub, crea un repositorio público llamado exactamente **`Trbs-ALDL.github.io`**.
2. Dentro, crea el archivo `.well-known/assetlinks.json` con el contenido de `tools/play/assetlinks.json` (las huellas se rellenan en el paso 3).
3. En ese repositorio, añade un archivo vacío llamado `.nojekyll` (si no, GitHub oculta las carpetas que empiezan por punto).
4. En Settings → Pages, publica la rama `main`.

Con dominio propio (por ejemplo `nutridl.es`) sería `nutridl.es/.well-known/assetlinks.json` y este paso es más sencillo.

## Paso 2 · Crear el paquete Android con PWABuilder (sin instalar nada)
1. Abre **pwabuilder.com**, pega `https://trbsaldl.github.io/FitDL/` y pulsa Start.
2. Package for stores → **Android** → Generate Package. Opciones:
   - **Package ID:** `com.nutridl.app` (no se puede cambiar nunca después).
   - **App name:** `FitDL` · **Launcher name:** `FitDL`
   - **Start URL:** `/FitDL/?src=play`
   - **Theme / background color:** `#110f0d`
   - **Signing key:** «Create new».
3. Descarga el zip. Dentro hay: el `.aab` (lo que se sube a Play), el `.apk` (para probar en tu móvil), **la llave de firma (`signing.keystore`) y sus contraseñas (`signing-key-info.txt`)**, y un `assetlinks.json`.

> ⚠️ **Guarda la llave y sus contraseñas en un sitio seguro y fuera de GitHub** (por ejemplo, junto a tus códigos PRO en `Nutri versions`, más una copia en un USB). Sin ella no podrás actualizar nunca la app en Play.

## Paso 3 · Huellas en assetlinks.json
- Copia la huella SHA-256 del `assetlinks.json` que te da PWABuilder.
- Después de subir el primer `.aab` a Play: Play Console → tu app → **Configuración → Integridad de la app** → copia también la huella SHA-256 de la «clave de firma de apps».
- Pon las dos en `.well-known/assetlinks.json` del repositorio `Trbs-ALDL.github.io` (ver `tools/play/assetlinks.json`).
- Si la app se abre con la barra del navegador arriba, la causa casi siempre es una huella que falta o está mal.

## Paso 4 · Crear la app en Play Console
1. Crear app → nombre `FitDL: Calorías y Macros` · idioma español (España) · App · Gratis.
2. **Ficha de Play Store** (textos más abajo):
   - Icono 512×512: `icons/icon-512.png`
   - Gráfico destacado 1024×500: `tools/play/grafico-destacado.png`
   - Capturas del móvil (mínimo 2, mejor 6): hazlas en tu móvil con datos reales. Orden recomendado: 1) «Hoy» con el anillo de calorías, 2) buscador con productos Hacendado, 3) Coach respondiendo «¿Qué como?», 4) Progreso con la racha, 5) Gym, 6) tu plan.
3. **Contenido de la app** (respuestas):
   - Política de privacidad: `https://trbsaldl.github.io/FitDL/privacidad.html`
   - Acceso a la app: todas las funciones están disponibles sin iniciar sesión.
   - Anuncios: **No**.
   - Clasificación de contenido: categoría «Utilidad / productividad»; sin violencia, sexo, drogas, apuestas ni compras.
   - Público objetivo: **18 años o más** (la política dice que no es para menores).
   - **Seguridad de los datos:** «La app no recoge ni comparte datos de los usuarios». Todo se guarda en el dispositivo. El escáner solo envía el código de barras a Open Food Facts, y eso no es un dato personal.
   - **Declaración de apps de salud:** nutrición y control de peso. No es un dispositivo médico; incluye el aviso de que no sustituye a un profesional.
   - Categoría: **Salud y bienestar** · etiquetas: nutrición, fitness.

## Paso 5 · Prueba cerrada (12 personas · 14 días)
1. Pruebas → **Prueba cerrada** → crear versión → sube el `.aab`.
2. Testers: una lista de correos de Gmail (amigos, familia, gente del gym). Comparte con ellos el enlace de participación.
3. Tienen que **seguir apuntados los 14 días seguidos**; si alguien se sale, la cuenta atrás puede reiniciarse. Invita a 15-20 por si acaso.
4. Pídeles que la usen y que te digan qué echan en falta: es tu primera validación real.
5. Pasados los 14 días: Panel → **Solicitar acceso a producción** → responde el cuestionario → publica.

## Textos de la ficha (copiar y pegar)
**Nombre (29/30):** FitDL: Contador de Calorías

**Descripción breve (73/80):** Cuenta calorías y macros gratis y sin anuncios. Escáner, gym y Hacendado.

**Descripción completa:**
```
FitDL es un contador de calorías y macros gratis y sin anuncios: te dice cuántas calorías y cuánta proteína necesitas para adelgazar, ganar músculo o mantenerte, qué comer ahora y cómo vas. Sin crear cuenta.

LO BÁSICO, GRATIS DE VERDAD
Nuestra promesa: el escáner, las macros, el diario, el Coach básico, el progreso y el gym seguirán siendo gratis. Lo que hoy es gratis no pasará a ser de pago.
• Escáner de código de barras gratis
• Calorías, proteína, hidratos, grasas y azúcares completos
• Apunta todas las comidas que quieras, sin límite
• Sin anuncios. Nunca.

MÁS DE 2.200 ALIMENTOS COMPROBADOS
• Casi 500 productos Hacendado de Mercadona y las marcas que compras en España
• Alimentos crudos y cocinados con valores oficiales (USDA)
• Cada producto se revisa: sus calorías tienen que cuadrar con la etiqueta

TU DIETA EN 2 MINUTOS
• Calculamos tus calorías y macros según tu objetivo: perder peso, recomposición corporal (perder grasa y ganar músculo a la vez), ganar músculo o mantenerte
• ¿Te ha dado las macros tu entrenador? Ponlas a mano y las calorías salen solas
• Te explicamos de dónde sale cada número

UN COACH QUE TE RESPONDE
• «¿Qué ceno con 600 kcal?»: te propone platos con tu proteína
• Apunta escribiendo, como si hablaras con alguien
• Qué pedir al comer fuera o de tapas

PROGRESO QUE SE ENTIENDE
• Peso medio con tendencia real (la báscula engaña, la media no)
• Racha, logros y tu semana de un vistazo
• Medidas corporales y tu semana en una imagen para compartir

GYM INCLUIDO
• Apunta series y pesos, con temporizador de descanso y cronómetro
• Tus mejores marcas por ejercicio

FUNCIONES PRO (pruébalas 7 días gratis, sin tarjeta)
• Registro por voz y foto del plato
• Mi nevera: qué cocinar con lo que tienes
• Menú del día con gramos exactos y compra inteligente
• Análisis avanzado y gráficas de medidas

PRIVACIDAD DE VERDAD
• Sin cuentas ni contraseñas
• Tus datos se quedan en tu móvil; puedes exportar tu plan en PDF, hacer copia o borrarlo todo
• En español e inglés

FitDL es una herramienta educativa y orientativa: no sustituye el consejo de un médico o dietista-nutricionista. No está indicada para embarazo, lactancia, menores de 18 años ni trastornos de la conducta alimentaria.
```

## Cuando quieras cobrar (más adelante)
Las normas de pago de Google Play están cambiando en 2026 (enlaces de pago externos permitidos en algunos países y con comisión). Antes de activar pagos en la app de Play: revisión legal de los términos de venta y comprobar la política de pagos vigente en Play Console. Fuentes: developer.chrome.com/docs/android/trusted-web-activity/billing · support.google.com/googleplay/android-developer/answer/14151465
