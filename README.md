# Mi Yo Interior — experiencia interactiva (QR + IA)

Prototipo de la experiencia digital que se activa al escanear el código QR de cada
capítulo del libro **Mi Yo Interior**, de Paola Castillo Solís.

## Subir esta carpeta a GitHub

Esta carpeta no incluye un repositorio Git iniciado (se preparó así a propósito).
Desde tu computador, dentro de esta carpeta:

```bash
git init
git add -A
git commit -m "Prototipo inicial: experiencia interactiva Capítulo 1"
```

Luego crea un repositorio vacío en GitHub (sin README, sin licencia) y conéctalo:

```bash
git remote add origin https://github.com/TU-USUARIO/mi-yo-interior-app.git
git branch -M main
git push -u origin main
```

A partir de ahí, cualquier cambio se sube con `git add -A && git commit -m "..." && git push`.

## Qué hay en esta carpeta

- `index.html`, `style.css`, `app.js` — la aplicación (funciona igual para todos
  los capítulos; no hace falta tocar este código para agregar un capítulo nuevo).
- `chapters/capitulo-1.json` — el guion completo del Capítulo 1 convertido a datos:
  preguntas, opciones, rutas, respiración guiada, afirmaciones. Para el Capítulo 3
  en adelante, se agrega un archivo `capitulo-3.json` con la misma estructura.
- `api/chat.js` — la única parte que llama a la IA (Claude). Se usa solo en los
  momentos de texto libre del guion (afirmación propia, "otra situación", "otra
  emoción"); el resto de la experiencia es determinista y no tiene costo de IA.

## Modo híbrido (cómo interviene la IA)

El flujo de botones, opciones y la pausa de respiración es siempre el que ya
está escrito en el guion interactivo — no lo decide la IA. La IA entra solo
cuando el lector escribe con sus propias palabras, y siempre queda anclada al
contexto de ese paso (campo `contextoIA` en el JSON del capítulo) y a las
reglas de tono/seguridad del libro (campo `systemPromptBase`). Antes de llamar
a la IA, y también dentro de la función del servidor, el texto se revisa
contra una lista de palabras de riesgo; si aparece alguna, se muestra siempre
el mensaje fijo de derivación a apoyo humano/profesional, sin excepción.

## Probar en local (sin IA real)

```bash
npm run dev
# o: python3 -m http.server 8080
```

Abre `http://localhost:8080`. Como no hay backend corriendo, la app usa una
respuesta de respaldo local para los pasos con IA — sirve para revisar el
flujo completo, no para probar el tono real de Claude.

## Desplegar con IA real

Necesitas una clave de API de Anthropic (se crea gratis en
[console.anthropic.com](https://console.anthropic.com)) y una cuenta en un
proveedor de hosting conectado a este repositorio de GitHub. Cualquiera de
estos tres sirve; el código no depende de uno en particular:

**Vercel**
1. Importa este repositorio desde el dashboard de Vercel.
2. En *Project Settings → Environment Variables*, agrega `ANTHROPIC_API_KEY`.
3. Vercel detecta `api/chat.js` automáticamente como función serverless.

**Netlify**
1. Importa el repositorio.
2. En *Site settings → Environment variables*, agrega `ANTHROPIC_API_KEY`.
3. Mueve o copia `api/chat.js` a `netlify/functions/chat.js` y ajusta el
   `module.exports` a `exports.handler = async (event) => {...}` (la forma de
   recibir el cuerpo cambia levemente: `JSON.parse(event.body)`).

**Cloudflare Pages**
1. Conecta el repositorio en *Workers & Pages → Create → Pages*.
2. En *Settings → Environment variables*, agrega `ANTHROPIC_API_KEY`.
3. Cloudflare usa `functions/api/chat.js` con la firma
   `export async function onRequestPost(context) {...}`; requiere adaptar el
   archivo actual a ese formato (la lógica interna no cambia).

## Generar el código QR

El QR es solo un enlace a la URL publicada, por ejemplo:
`https://tu-dominio.com/?cap=1`. Una vez que tengas esa URL, cualquier
generador de QR (incluidos los gratuitos en línea, o la librería `qrcode` de
Node/Python) sirve. No hace falta regenerarlo salvo que cambie la URL.
