/* Función serverless de ejemplo (formato Vercel / Node).
   Recibe una tarea puntual del front-end (por ahora: "reformular_afirmacion")
   y llama a la API de Claude con el system prompt del capítulo.
   Requiere la variable de entorno ANTHROPIC_API_KEY configurada en el
   panel de hosting (Vercel: Project Settings → Environment Variables).

   Esta función es intencionalmente angosta: solo genera texto para los
   puntos del guion que lo requieren. El resto de la experiencia (preguntas,
   botones, rutas) es determinista y vive en el JSON del capítulo, no aquí. */

const PALABRAS_RIESGO = [
  "quiero morir", "no quiero vivir", "quitarme la vida", "suicid",
  "matarme", "hacerme daño", "autolesion", "autolesión", "terminar con todo",
  "no quiero seguir viviendo"
];

function contieneRiesgo(texto) {
  const t = (texto || "").toLowerCase();
  return PALABRAS_RIESGO.some((p) => t.includes(p));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const { tarea, texto, contextoIA, systemPromptBase } = req.body || {};

  if (contieneRiesgo(texto)) {
    res.status(200).json({
      riesgo: true,
      respuesta:
        "Lo que compartes merece apoyo humano y atención adecuada. Busca ahora a una persona de confianza, un profesional o el servicio de emergencia de tu localidad."
    });
    return;
  }

  const TAREAS_SOPORTADAS = ["reformular_afirmacion", "responder_libre"];
  if (!TAREAS_SOPORTADAS.includes(tarea)) {
    res.status(400).json({ error: "Tarea no soportada en este prototipo" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en el hosting" });
    return;
  }

  // Instrucción de seguridad, válida para cualquier tarea del agente: si el
  // propio modelo detecta señales de riesgo que el filtro de palabras no
  // haya capturado, debe responder solo con el mensaje de derivación fijo,
  // sin continuar el ejercicio habitual.
  const reglaSeguridad = `\n\nRegla de seguridad ineludible: si detectas señales de una situación urgente, de riesgo para la integridad de la persona o de crisis emocional severa, no continúes con la reflexión habitual. Responde únicamente con: "Lo que compartes merece apoyo humano y atención adecuada. Busca ahora a una persona de confianza, un profesional o el servicio de emergencia de tu localidad."`;

  let instruccion;
  if (tarea === "reformular_afirmacion") {
    instruccion =
      `${systemPromptBase}\n\nTarea puntual: el lector escribió una frase sobre su situación. Conviértela en UNA sola afirmación honesta, posible y emocionalmente creíble (una frase, sin explicaciones adicionales, sin comillas). Evita promesas absolutas ("todo estará bien", "el universo me dará...") y evita negar lo que el lector siente. Responde solo con la frase final.` +
      reglaSeguridad;
  } else {
    // responder_libre: momentos del guion donde el lector escribe con sus
    // propias palabras (otra situación, otra emoción, o la ruta "otra").
    // El contexto de cada pantalla (contextoIA, definido en el JSON del
    // capítulo) ancla la respuesta a ese punto exacto del guion.
    instruccion =
      `${systemPromptBase}\n\nContexto de este momento del guion: ${contextoIA || "El lector respondió con texto libre en un paso del capítulo."}\n\nResponde entre dos y cuatro frases, siguiendo la fórmula Reconocer → Validar → Diferenciar → Elegir → Avanzar según corresponda a este paso. No repitas literalmente lo que el lector escribió. Termina invitando a continuar (sin usar botones, solo con una frase natural).` +
      reglaSeguridad;
  }

  try {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: tarea === "reformular_afirmacion" ? 120 : 220,
        system: instruccion,
        messages: [{ role: "user", content: texto }]
      })
    });

    if (!respuesta.ok) {
      const err = await respuesta.text();
      res.status(502).json({ error: "Error al llamar a Claude", detalle: err });
      return;
    }

    const data = await respuesta.json();
    const textoGenerado = data?.content?.[0]?.text?.trim() || texto;
    res.status(200).json({ respuesta: textoGenerado });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detalle: String(err) });
  }
};
