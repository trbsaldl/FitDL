# FitDL 3.4 · Revisión de seguridad, calidad y requisitos para publicar en tiendas

Fecha: 14 de octubre de 2026 · Versión revisada: 3.4.0

## Cómo es la app (y por qué algunos puntos no aplican)

FitDL es una **PWA sin servidor**:
- **Sin servidor propio:** no hay base de datos, cuentas ni inicio de sesión, y los pagos no están conectados.
- **Datos:** todo lo que apuntas se guarda en el navegador de cada persona (localStorage).
- **Peticiones externas:** la única que hace la app es a **Open Food Facts**, para buscar un código de barras.

| Punto pedido | Resultado |
|---|---|
| API keys y secretos en el frontend | **Ninguno**. `gitleaks` sobre todo el historial git (12 commits) y sobre los archivos actuales: *no leaks found*. Los códigos PRO solo están como huellas SHA-256 truncadas; el archivo de códigos está fuera del repositorio. |
| Permisos de la base de datos y políticas RLS | **No aplica**: no hay base de datos en servidor. Si se añaden cuentas (p. ej. Supabase), habrá que activar RLS con políticas `auth.uid() = user_id` en todas las tablas antes de publicar. |
| Autenticación | **No aplica**: no hay cuentas. Los perfiles son locales a cada dispositivo. |
| Que un usuario no vea los datos de otro | **Garantizado por diseño**: cada navegador solo puede leer su propio almacenamiento (misma origen). Varias personas en el mismo dispositivo comparten ese almacenamiento por diseño («Añadir otra persona»). |
| Inyección SQL | **No aplica** (no hay SQL). |
| XSS | Revisado. En la 3.2 se cerró la vía real (copias de seguridad trucadas); `semgrep --config auto` no encuentra nada en el código de la app; los avisos de `innerHTML` del plugin de seguridad son de textos fijos o escapados con `esc()`. CSP estricta: solo scripts del propio sitio y conexión solo a Open Food Facts. |
| Límites de petición | Añadido: como mucho **8 consultas/minuto** a Open Food Facts, una a la vez, sin repetir el mismo código en la sesión y con **8 s** de espera máxima. |
| Dependencias vulnerables | `osv-scanner`: 2 avisos (`braces` alto, `postcss-selector-parser` medio), **solo de herramientas de desarrollo** (Tailwind 3, para generar el CSS en el ordenador). No van dentro de la app publicada (`npm audit --omit=dev`: 0). Se arreglan del todo al migrar a Tailwind 4. |
| Endpoints de API | Único endpoint: `world.openfoodfacts.org/api/v2/product/{código}` → responde 200. El buscador antiguo de OFF (`/api/v2/search`) da 503 con frecuencia; la app no lo usa (solo las herramientas internas, que ahora usan `search.openfoodfacts.org`). |
| Gestión de errores | Errores globales y promesas sin capturar → registro local. Nuevo: **pantalla de rescate** si la app no arranca (descargar datos / recargar). Nuevo: si los datos guardados estuvieran dañados, se apartan en `nutridl_profiles_rescate` antes de que nada los pise. Mensajes claros si Open Food Facts no responde o se supera el límite. |
| Registro sin información sensible | Nuevo: antes de guardar un error se quitan correos, teléfonos, números largos y textos entre comillas. Solo se guardan los 30 últimos, en el dispositivo. |
| Pagos y webhooks | **No hay nada conectado todavía**: `PAY_LINK` está vacío y no hay webhooks. El PRO funciona con prueba de 7 días y códigos. Ver «Tiendas» más abajo: en Play Store y App Store los pagos digitales tienen que ir por su sistema de compras. |
| Backups y restauración | Ya existía: copia en archivo (menú del perfil → «Guardar copia de seguridad» / «Cargar una copia»). Nuevo: **copias automáticas diarias** (3 últimas) con «Restaurar» en el menú del perfil, y petición al navegador de **almacenamiento persistente** para que no borre los datos. |
| Responsive | Todas las pestañas y ventanas comprobadas a 320 px, 375 px, 768 px y escritorio, con los nombres de producto más largos: sin desbordes ni errores. |
| Llamadas a la API y tiempos de carga | Quitada la espera de hasta **4 s** al abrir (el service worker esperaba a la red). Ahora abre al instante con lo guardado (7 ms medidos) y se actualiza por detrás. Scripts con `defer`, fuentes precargadas. Lighthouse móvil: **Rendimiento 91 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100** (primer pintado 6,3 s → 1,7 s). |
| Accesibilidad | Lighthouse 100. Contrastes ≥ 4,5:1 medidos en la 3.2/3.3, foco visible, «Saltar al contenido», zonas táctiles de 40 px, respeta «reducir movimiento». |
| Monitorización de errores y cierres | Local: registro de errores + **detección de cierres inesperados** (la app anota si la última vez se cerró de golpe). Para verlos de todos los usuarios haría falta un servicio externo (p. ej. Sentry, plan gratuito): necesita cuenta y que la política de privacidad lo explique; no se ha activado. |
| Política de privacidad | Versión 4.1: copias automáticas, registro limpio, fuentes de datos, límites, **responsable y contacto** (aannggeelltrabajos@gmail.com) y derecho a reclamar ante la AEPD. |

## Requisitos para publicar en Google Play

Forma recomendada: **Trusted Web Activity (TWA)** con Bubblewrap o PWABuilder (envuelve la web tal cual).

- [ ] Cuenta de desarrollador de Google Play (pago único de 25 $).
- [ ] Generar el paquete con PWABuilder/Bubblewrap.
- [ ] Publicar `assetlinks.json` (con la huella del certificado de firma) para que la app se abra sin barra de navegador. **Ojo:** tiene que estar en la raíz del dominio (`https://trbsaldl.github.io/.well-known/assetlinks.json`), no dentro de `/FitDL/`. Hay que crear el repositorio `Trbs-ALDL.github.io` solo con ese archivo, o usar un dominio propio.
- [x] **Política de privacidad pública** con contacto: `https://trbsaldl.github.io/FitDL/privacidad.html`.
- [ ] Formulario **Seguridad de los datos**: «No se recogen datos» (todo queda en el dispositivo); el código de barras va a Open Food Facts sin datos personales; la voz la procesa el servicio del sistema.
- [ ] **Apps de salud**: declarar en la Consola que es una app de salud/fitness; incluir el aviso de que no sustituye a un profesional (ya está en la app).
- [ ] Clasificación de contenido (cuestionario IARC) y público objetivo **18+** (la app ya lo indica).
- [ ] **Pagos**: el PRO es contenido digital → en la versión de Play debe venderse con **Google Play Billing**. Los códigos de activación y un enlace de pago externo no se permiten dentro de la app de Play (salvo programas específicos por país).
- [ ] Capturas, icono 512 px, gráfico destacado 1024×500, textos de la ficha.
- [ ] Prueba cerrada con 12 testers durante 14 días (obligatorio para cuentas personales nuevas).

## Requisitos para publicar en App Store (iPhone)

- [ ] Cuenta Apple Developer (99 €/año) y un Mac con Xcode (o un servicio de compilación en la nube).
- [ ] Envolver la web en una app nativa (**Capacitor** recomendado). Ojo con la norma **4.2 (funcionalidad mínima)**: Apple rechaza apps que son solo una web. Ayudan las funciones nativas: notificaciones, widget, HealthKit (peso), cámara nativa para el escáner.
- [ ] **Pagos (norma 3.1.1)**: el PRO debe venderse con **compras dentro de la app de Apple**. Los códigos de activación solo con «Códigos de oferta» de Apple.
- [ ] **Privacidad (5.1.1)**: política con contacto, «Etiquetas de privacidad» en App Store Connect («Datos no recogidos») y textos de permiso para cámara y micrófono.
- [ ] **Salud (1.4.1)**: el aviso médico ya está; no prometer resultados médicos.
- [ ] Borrado de cuenta: no aplica (no hay cuentas); «Borrar todos los datos» ya existe.

## Pendiente (necesita decisión o datos de Ángel)

1. ~~Contacto del responsable~~ → hecho en la 3.4.1: aannggeelltrabajos@gmail.com en la política, los términos y el pie de la app; añadido el derecho a reclamar ante la AEPD.
2. Pasarela de pago para la web (`PAY_LINK`) y, para tiendas, Play Billing / compras de Apple.
3. Si se quiere ver los errores de todos los usuarios: elegir servicio (p. ej. Sentry) y añadirlo a la política.
4. Migrar el CSS a Tailwind 4 para quitar los dos avisos de dependencias de desarrollo.

## Base de alimentos (3.4)

- **1.448 alimentos** en total (antes 498):
  - 279 genéricos crudos y cocinados con su ficha oficial del USDA (SR Legacy).
  - 671 productos de marca nuevos de Open Food Facts, 420 de ellos Hacendado.
- **Validación:**
  - En las marcas, las kcal de la etiqueta deben coincidir con 4·P + 4·HC + 9·G + 2·fibra (±12 %). Se descartan los nombres en otros idiomas, los productos fuera de España y los repetidos.
  - Los genéricos de siempre se compararon con el USDA. Coinciden salvo diferencias de criterio de cálculo de kcal. Se corrigieron los hidratos de los anacardos.
- **Herramientas:**
  - Marcas: `tools/marcas/off_fetch3.js` → `off_build3.js` → `off_embed.js`.
  - Genéricos: `tools/genericos/lista.js` → `build.js` (con `sr.json` del CSV oficial) → `embed.js`.
  - Auditoría: `tools/genericos/auditar.js`.
- **Importante:**
  - No cambiar los nombres ya publicados de `marcas.json` ni de `marcas_v3.json` (ni su orden): el id de cada producto sale de su marca y su nombre, y los diarios guardan ese id. Si se vuelve a descargar Open Food Facts, añadir los productos nuevos en un archivo aparte.
  - Cada entrada del diario guarda sus propias calorías y macros, así que corregir un alimento no cambia los días ya apuntados.

## Modelo de amenazas y estado (3.16 · 23-10-2026)

Riesgos reales de esta app (sin servidor, datos en `localStorage`, alojada en GitHub Pages) y lo que hay hecho.
✅ = comprobado con prueba automática o en el navegador · ⚠️ = mitigado en parte · ⏳ = pendiente.

| Riesgo | Medidas | Estado |
|---|---|---|
| Código inyectado (XSS) por nombres de alimentos, perfiles, rutinas o ejercicios | Todo texto del usuario pasa por `esc()`; en atributos `onclick` se usa `esc(JSON.stringify(x))`. Probado en el navegador con nombres trampa en perfil, alimento propio, diario, entreno, ejercicio y chat: no se ejecuta nada | ✅ |
| Copias de seguridad manipuladas | `cleanImported()` quita `< > " ' \` \`, claves raras y `__proto__`; el chat se convierte a texto; ids saneados; archivos de más de 20 MB se rechazan sin leerlos; si se sustituyen perfiles, antes se guarda una copia automática | ✅ |
| Pérdida de datos por almacenamiento lleno | `storeSet()` (core.js): si no cabe, borra copias automáticas antiguas y reintenta; si aun así falla, avisa al usuario y lo anota en el registro de errores (antes fallaba en silencio) | ✅ |
| Datos ilegibles al abrir | Se apartan en `nutridl_profiles_rescate` antes de que nada los pise | ✅ (ya existía) |
| El Coach cambia el diario sin querer | Desde la 3.16 solo apunta directo ante una orden clara («he comido…», «añade…»); si adivina, enseña lo entendido y pide confirmar. Lo negado («no tengo pollo») nunca se apunta. Cambios de alimento solo con botón y con Deshacer | ✅ |
| Fugas a terceros | La única petición externa es Open Food Facts con el código de barras (solo dígitos, máx. 20/min, 8 s de espera). El código se lee **dentro del móvil** (`js/barras.js`): la imagen de la cámara no sale nunca. `Referrer-Policy: no-referrer` por meta. Sin analítica de terceros, sin cookies, sin IA remota | ✅ |
| Dependencias comprometidas | Solo hay dependencias de construcción (no llegan al móvil). 27-10-2026: `postcss-selector-parser` fijado en 6.1.5 → **osv-scanner: 0 avisos**; `npm audit --omit=dev`: 0 | ✅ |
| Scripts de terceros | Ninguno: todo se sirve desde el propio dominio. CSP por meta en `index.html` (`script-src 'self' 'unsafe-inline'`) y CSP estricta sin scripts en las páginas legales | ⚠️ `unsafe-inline` |
| Dispositivo compartido | Los perfiles separan datos pero **no** los protegen: quien tenga el móvil puede verlos. No hay cifrado ni contraseña (una contraseña olvidada borraría los datos para siempre). Recomendación: usar el bloqueo del móvil | ⚠️ límite conocido |
| Actualizaciones de la PWA | Caché con versión por contenido (`build-sw.js`), `?v=` en cada script, se borran cachés viejas al activar | ✅ |
| Consejos peligrosos | Mínimo 1.500/1.200 kcal; el Coach deriva a un profesional en embarazo, diabetes, TCA, medicación, menores, etc.; aviso si el peso objetivo da IMC < 18,5; edad 18-90 | ✅ |


## Revisión antes de publicar (3.26 · 27-10-2026)

Ejecutado hoy, de principio a fin:

| Comprobación | Resultado |
|---|---|
| `gitleaks detect --redact` (archivos e historial, 57 commits) | **no leaks found** |
| `npm audit --omit=dev` | **0 vulnerabilidades** |
| `osv-scanner scan source -r .` | **0 avisos** (antes 1 medio en `postcss-selector-parser`, de construcción; se fijó la 6.1.5) |
| `semgrep scan --config auto` | 24 avisos, **todos falsos positivos**: 22 son `path.join` en scripts locales de `tools/`, 1 es el servidor local de desarrollo y 1 pide `integrity` en archivos propios (SRI solo tiene sentido en archivos de terceros, y aquí no hay ninguno) |
| `npm test` | **88 pruebas, 0 fallos** |
| `node tools/i18n-check.js` | **100 %** |
| Navegador (móvil 375 px) | Las cinco pestañas, buscador y ficha de alimento: **sin errores de consola y sin desbordes** |
| Lighthouse móvil (sitio publicado) | Rendimiento **78** · Accesibilidad **100** · Buenas prácticas **100** · SEO **100** · LCP 4,2 s · CLS 0 |

**Lo que se arregló o se añadió hoy**

1. **Dependencia con fallo conocido**: `postcss-selector-parser` 6.1.4 → 6.1.5 (`overrides` no hizo falta: basta con fijarla). osv-scanner queda limpio.
2. **Anti-clickjacking**: GitHub Pages no deja poner cabeceras y `frame-ancestors` no vale dentro de `<meta>`, así que la app comprueba en `js/core.js` si está dentro de un marco ajeno; si lo está, no se carga y enseña un enlace para abrirla aparte. Comprobado en el navegador (la app normal no se ve afectada; las apps de tienda TWA/Capacitor tampoco, porque no son marcos).
3. **`.well-known/security.txt`** (RFC 9116) con el correo de contacto para avisos de seguridad, más `.nojekyll` para que GitHub Pages sirva esa carpeta. Los términos enlazan a él.
4. **Escáner**: el código se lee dentro del dispositivo (`js/barras.js`), la imagen de la cámara no sale nunca, y el límite a Open Food Facts pasa a 20/minuto.
5. **Cifras públicas al día**: la portada y la descripción decían «2.900 alimentos / 800 Hacendado»; ahora dicen 4.500 y 880, que es lo que hay de verdad (4.532 y 889).

**Legal, lo que se ha añadido (términos v2.0 y privacidad v4.3)**

- **Aviso legal**: quién está detrás de la app, con nombre y correo (lo pide la LSSI-CE art. 10). En `terminos.html` y `terms.html` hay una línea preparada con `hidden` para el NIF y el domicilio: **hay que quitar la palabra `hidden` y rellenarla en cuanto se empiece a cobrar**.
- **Condiciones de FitDL PRO**: qué incluye, que hoy **no se cobra nada**, que no hay suscripción ni renovación automática, que los códigos no caducan ni se revenden, y qué se informará cuando se active el pago (precio con impuestos, 14 días de desistimiento y garantía legal de los contenidos digitales).
- **Licencias**: USDA (dominio público), Open Food Facts (**ODbL 1.0**, y la base derivada de FitDL se ofrece bajo la misma licencia citando el origen) y datos oficiales de las cadenas, cuyas marcas son de sus titulares y se usan solo para identificar el producto.
- **Edad mínima 18**, ley aplicable española, derechos del consumidor de la UE y cómo reclamar (correo, oficina de consumo o Junta Arbitral; **la plataforma europea de resolución de litigios en línea cerró en julio de 2025, así que no se enlaza**).
- **Cookies**: se dice expresamente que no hay ninguna, ni propias ni de terceros. Lo que se guarda en el navegador es lo que hace funcionar la app que la persona ha pedido usar, así que no hace falta ventana de consentimiento. Si algún día se añade analítica, habrá que revisarlo.
- **Privacidad**: se explica que los productos que escaneas y guardas quedan en tu dispositivo con su código, y que la cámara no envía imágenes a ningún sitio.

**Pendiente antes de abrir al público (decisiones de Ángel)**

1. **Vender dentro de la UE.** Para cobrar por el PRO hay dos caminos:
   - *Vender tú*: alta de autónomo (o al menos en Hacienda), facturas, IVA del país del comprador (régimen OSS para ventas digitales a particulares de la UE) y los 14 días de desistimiento. Más control, más papeleo.
   - *Vender a través de una plataforma que actúe de vendedor* (Lemon Squeezy, Paddle, Gumroad…): ellos emiten la factura y liquidan el IVA de cada país; tú cobras lo tuyo. Se llevan una comisión (≈5 % + gastos) pero te quitan casi todo el papeleo. **Es lo recomendable para empezar.**
   - En Google Play y App Store, además, el contenido digital **debe** venderse con su sistema de pagos (Play Billing / compras de Apple), con su comisión.
2. **Rendimiento**: con 4.532 alimentos la app tarda más en abrir (LCP 4,2 s en móvil simulado; antes 3,1 s con 2.280). La mejora clara es cargar primero lo imprescindible y los productos de marca justo después del primer dibujado. No se ha tocado todavía: es un cambio de estructura y hay que planificarlo.
3. **Quitar `unsafe-inline`** de la CSP (cientos de `onclick`): sigue pendiente, tal como se explica abajo.

**Límites de GitHub Pages** (no se pueden arreglar desde el repositorio): no permite cabeceras HTTP propias.
`X-Content-Type-Options`, `Permissions-Policy`, `frame-ancestors` (anti-clickjacking) y HSTS de dominio propio
**no tienen efecto** puestas como `<meta>`. Si algún día se usa Cloudflare Pages o Netlify (gratis), añadir:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' https://world.openfoodfacts.org; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=()
```

**Para quitar `unsafe-inline`** habría que cambiar los cientos de `onclick="…"` por `addEventListener`: es un cambio grande que no se hace sin plan propio.

**Legal (revisar con un profesional antes de un lanzamiento comercial):** peso, medidas y alimentación pueden considerarse datos de salud (art. 9 RGPD). Hoy no salen del dispositivo, lo que reduce mucho las obligaciones, pero al añadir nube (Supabase), pagos o analítica habrá que revisar base legal, consentimiento explícito, encargados de tratamiento y la política de privacidad.
