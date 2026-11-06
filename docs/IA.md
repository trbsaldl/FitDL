# IA en FitDL

## Hoy (3.0): Coach en el dispositivo

- `js/parser.js` entiende frases en español («200 g de pollo, un plátano y una ensalada»): cantidades en número o palabra, unidades (gramos, vasos, latas, cucharadas, rebanadas…), plurales, platos con «con» y comidas del día.
- `js/engine.js` propone platos: 41 platos base cuyos gramos se ajustan para acercarse a tus calorías y tu proteína (con dieta, alergias, alimentos que no gustan, presupuesto y despensa).
- `js/coach.js` decide qué quieres (apuntar, cuánto queda, qué comer, comer fuera, proteína, información de un alimento, cómo vas) y responde con tus datos.
- Nada sale del dispositivo. Nada se inventa: si no reconoce algo, lo dice.
- Cada respuesta se etiqueta: **Tus datos**, **Estimación**, **Recomendación** o **Base de alimentos**.
- Seguridad: embarazo, lactancia, diabetes, TCA, enfermedad renal, menores o dietas muy bajas → deriva a un profesional.

## Siguiente: modelo de lenguaje y foto (PRO)

**Regla: la clave del modelo NUNCA va en la web.** Cualquiera podría leerla y gastar el saldo.

Arquitectura recomendada (coste bajo):

1. **Proxy** en Cloudflare Workers (plan gratuito: 100.000 peticiones/día) con la clave guardada como *secret*.
2. La app envía al proxy solo lo necesario: la pregunta y un resumen sin nombre (objetivo, kcal y macros restantes, preferencias). Para la foto, la imagen reducida a 768 px.
3. El proxy llama al modelo (para foto: un modelo con visión) pidiendo respuesta en JSON: `[{ alimento, gramos, confianza }]`.
4. La app cruza cada alimento con la base (`matchFoods`) y muestra la **misma confirmación editable** que la voz, marcada como «Estimación aproximada». Nunca se guarda sin confirmar.
5. Límites en el proxy: por usuario y por día (para controlar el gasto), y solo desde el dominio de la app.

**Antes de activarlo**
- Cuentas (para saber quién es PRO y limitar el uso).
- Consentimiento explícito: se envían datos de salud a un tercero (encargado del tratamiento, contrato, ubicación de los datos).
- Actualizar `privacidad.html`. No usar los datos para entrenar modelos.
- Estimación de coste: a validar con el proveedor elegido antes de fijar el precio PRO.
