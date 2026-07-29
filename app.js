/* Mi Yo Interior — motor de experiencia interactiva (prototipo)
   Lee la configuración de un capítulo (JSON) y renderiza la pantalla actual.
   Solo dos puntos del flujo llaman a un backend con IA: la reformulación de la
   afirmación personal y (opcionalmente) la revisión de riesgo en textos libres.
   Si el backend no está disponible (por ejemplo al abrir este archivo local-
   mente), el motor usa una respuesta de respaldo para que la experiencia
   completa se pueda probar sin servidor. */

const ENDPOINT_IA = "/api/chat";

const PALABRAS_RIESGO = [
  "quiero morir", "no quiero vivir", "quitarme la vida", "suicid",
  "matarme", "hacerme daño", "autolesion", "autolesión", "terminar con todo",
  "no quiero seguir viviendo"
];

const state = {
  capituloId: null,
  datos: null,
  pantallaId: null,
  respuestas: {}
};

const $pantalla = document.getElementById("pantalla");
const $capituloActual = document.getElementById("capituloActual");

async function iniciar() {
  const params = new URLSearchParams(window.location.search);
  const cap = params.get("cap") || "1";
  state.capituloId = cap;
  const res = await fetch(`chapters/capitulo-${cap}.json`);
  state.datos = await res.json();
  $capituloActual.textContent = state.datos.titulo || "";
  ir(state.datos.start);
}

function ir(idPantalla) {
  state.pantallaId = idPantalla;
  const pantalla = state.datos.pantallas[idPantalla];
  if (!pantalla) {
    console.error("Pantalla no encontrada:", idPantalla);
    return;
  }
  render(pantalla);
}

function contieneRiesgo(texto) {
  const t = (texto || "").toLowerCase();
  return PALABRAS_RIESGO.some((p) => t.includes(p));
}

function guardar(clave, valor) {
  if (clave) state.respuestas[clave] = valor;
}

function interpolar(plantilla) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => state.respuestas[clave] ?? "");
}

function crearTarjeta() {
  const div = document.createElement("div");
  div.className = "tarjeta";
  return div;
}

function agregarTexto(contenedor, lineas) {
  const div = document.createElement("div");
  div.className = "texto";
  (lineas || []).forEach((linea) => {
    linea.split("\n").forEach((parte) => {
      const p = document.createElement("p");
      p.textContent = parte;
      div.appendChild(p);
    });
  });
  contenedor.appendChild(div);
}

function botonPrimario(texto, onClick) {
  const b = document.createElement("button");
  b.className = "btn-primario";
  b.textContent = texto;
  b.onclick = onClick;
  return b;
}

function botonSecundario(texto, onClick) {
  const b = document.createElement("button");
  b.className = "btn-secundario";
  b.textContent = texto;
  b.onclick = onClick;
  return b;
}

function render(pantalla) {
  $pantalla.innerHTML = "";
  $pantalla.className = "pantalla" + (pantalla.esSeguridad ? " pantalla-seguridad" : "");
  const tarjeta = crearTarjeta();
  $pantalla.appendChild(tarjeta);

  switch (pantalla.tipo) {
    case "mensaje": return renderMensaje(tarjeta, pantalla);
    case "mensaje_dinamico": return renderMensajeDinamico(tarjeta, pantalla);
    case "opciones": return renderOpciones(tarjeta, pantalla);
    case "texto": return renderTexto(tarjeta, pantalla);
    case "texto_doble": return renderTextoMultiple(tarjeta, pantalla, 2);
    case "texto_triple": return renderTextoMultiple(tarjeta, pantalla, 3);
    case "respiracion": return renderRespiracion(tarjeta, pantalla);
    case "enrutador": return renderEnrutador(pantalla);
    case "afirmacion": return renderAfirmacion(tarjeta, pantalla);
    case "compromiso": return renderCompromiso(tarjeta, pantalla);
    case "resumen": return renderResumen(tarjeta, pantalla);
    case "fin": return renderFin(tarjeta, pantalla);
    default:
      tarjeta.textContent = "Tipo de pantalla no implementado: " + pantalla.tipo;
  }
}

function renderMensaje(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
  const botones = document.createElement("div");
  botones.className = "botones";
  (pantalla.botones || []).forEach((b) => {
    botones.appendChild(botonPrimario(b.texto, () => ir(b.siguiente)));
  });
  tarjeta.appendChild(botones);
}

function renderMensajeDinamico(tarjeta, pantalla) {
  agregarTexto(tarjeta, [interpolar(pantalla.plantilla)]);
  const botones = document.createElement("div");
  botones.className = "botones";
  (pantalla.botones || []).forEach((b) => {
    botones.appendChild(botonPrimario(b.texto, () => ir(b.siguiente)));
  });
  tarjeta.appendChild(botones);
}

function renderOpciones(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
  const lista = document.createElement("div");
  lista.className = "opciones-lista";
  pantalla.opciones.forEach((op) => {
    const b = document.createElement("button");
    b.className = "btn-opcion";
    b.textContent = op.texto;
    b.onclick = () => {
      guardar(pantalla.guardarEn, op.valor);
      if (pantalla.afirmacionSugerida) {
        guardar("afirmacionSugeridaRuta", pantalla.afirmacionSugerida);
      }
      ir(op.siguiente);
    };
    lista.appendChild(b);
  });
  tarjeta.appendChild(lista);
  const btnNoSe = botonSecundario("No sé cómo responder", () => {
    mostrarRespuestaEspecial("no_se", () => ir(pantalla.opciones[0].siguiente));
  });
  tarjeta.appendChild(btnNoSe);
}

function mostrarRespuestaEspecial(clave, onContinuar) {
  const texto = state.datos.respuestasEspeciales?.[clave];
  if (!texto) return onContinuar();
  $pantalla.innerHTML = "";
  const tarjeta = crearTarjeta();
  agregarTexto(tarjeta, [texto]);
  const botones = document.createElement("div");
  botones.className = "botones";
  botones.appendChild(botonPrimario("Continuar", onContinuar));
  tarjeta.appendChild(botones);
  $pantalla.appendChild(tarjeta);
}

function renderTexto(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
  const grupo = document.createElement("div");
  grupo.className = "campo-grupo";
  const textarea = document.createElement("textarea");
  textarea.placeholder = pantalla.placeholder || "";
  grupo.appendChild(textarea);
  tarjeta.appendChild(grupo);

  const noEscribir = botonSecundario("Prefiero no escribirlo", () => {
    mostrarRespuestaEspecial("no_quiere_escribir", () => ir(pantalla.siguiente));
  });

  const botones = document.createElement("div");
  botones.className = "botones";
  botones.appendChild(
    botonPrimario("Continuar", async () => {
      const valor = textarea.value.trim();
      if (contieneRiesgo(valor)) return ir("riesgo");
      guardar(pantalla.guardarEn, valor);
      if (pantalla.usaIA && valor) {
        tarjeta.innerHTML = "";
        await mostrarRespuestaAgenteYContinuar(tarjeta, valor, pantalla.contextoIA, pantalla.siguiente);
      } else {
        ir(pantalla.siguiente);
      }
    })
  );
  botones.appendChild(noEscribir);
  tarjeta.appendChild(botones);
}

/* Muestra una respuesta breve del agente (ancla al contexto del paso) y,
   tras confirmarla, avanza a la siguiente pantalla. Si el agente detecta
   riesgo, redirige a la pantalla de seguridad en vez de continuar. */
async function mostrarRespuestaAgenteYContinuar(tarjeta, texto, contextoIA, siguiente) {
  const cargando = document.createElement("div");
  cargando.className = "cargando";
  cargando.textContent = "Mi Yo Interior está leyendo lo que compartiste…";
  tarjeta.appendChild(cargando);

  const { respuesta, riesgo } = await pedirRespuestaAgente("responder_libre", texto, contextoIA);
  cargando.remove();

  if (riesgo) return ir("riesgo");

  agregarTexto(tarjeta, [respuesta]);
  const botones = document.createElement("div");
  botones.className = "botones";
  botones.appendChild(botonPrimario("Continuar", () => ir(siguiente)));
  tarjeta.appendChild(botones);
}

function renderTextoMultiple(tarjeta, pantalla, cantidad) {
  agregarTexto(tarjeta, pantalla.texto);
  const inputs = [];
  pantalla.campos.slice(0, cantidad).forEach((campo) => {
    const grupo = document.createElement("div");
    grupo.className = "campo-grupo";
    const label = document.createElement("label");
    label.textContent = campo.etiqueta;
    const textarea = document.createElement("textarea");
    textarea.rows = 2;
    grupo.appendChild(label);
    grupo.appendChild(textarea);
    tarjeta.appendChild(grupo);
    inputs.push({ campo, textarea });
  });

  if (pantalla.textoPosterior) {
    // se muestra tras continuar, así que lo guardamos para la siguiente pantalla si aplica
  }

  const botones = document.createElement("div");
  botones.className = "botones";
  botones.appendChild(
    botonPrimario("Continuar", async () => {
      const partes = [];
      for (const { campo, textarea } of inputs) {
        const valor = textarea.value.trim();
        if (contieneRiesgo(valor)) return ir("riesgo");
        guardar(campo.clave, valor);
        partes.push(`${campo.etiqueta} ${valor}`);
      }
      if (pantalla.afirmacionSugerida) guardar("afirmacionSugeridaRuta", pantalla.afirmacionSugerida);

      if (pantalla.textoPosterior) agregarTexto(tarjeta, [pantalla.textoPosterior]);

      if (pantalla.usaIA && partes.length) {
        await mostrarRespuestaAgenteYContinuar(tarjeta, partes.join("\n"), pantalla.contextoIA, pantalla.siguiente);
      } else {
        ir(pantalla.siguiente);
      }
    })
  );
  tarjeta.appendChild(botones);
}

function renderRespiracion(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
  const visual = document.createElement("div");
  visual.className = "respiracion-visual";
  const circulo = document.createElement("div");
  circulo.className = "circulo";
  visual.appendChild(circulo);
  tarjeta.appendChild(visual);

  const estado = document.createElement("div");
  estado.className = "estado-respiracion";
  tarjeta.appendChild(estado);

  const botones = document.createElement("div");
  botones.className = "botones";
  const btnContinuar = botonPrimario("Continuar", () => ir(pantalla.siguiente));
  btnContinuar.style.display = "none";
  botones.appendChild(btnContinuar);
  tarjeta.appendChild(botones);

  let ciclo = 0;
  const ciclos = pantalla.ciclos || 2;
  const inhalarMs = (pantalla.inhalarSeg || 4) * 1000;
  const exhalarMs = (pantalla.exhalarSeg || 6) * 1000;

  function paso() {
    if (ciclo >= ciclos) {
      estado.textContent = pantalla.textoFinal || "";
      circulo.className = "circulo";
      btnContinuar.style.display = "inline-block";
      return;
    }
    estado.textContent = `Inhala… (${pantalla.inhalarSeg || 4} segundos)`;
    circulo.className = "circulo inhalar";
    setTimeout(() => {
      estado.textContent = `Exhala… (${pantalla.exhalarSeg || 6} segundos)`;
      circulo.className = "circulo exhalar";
      setTimeout(() => {
        ciclo += 1;
        paso();
      }, exhalarMs);
    }, inhalarMs);
  }
  paso();
}

function renderEnrutador(pantalla) {
  const valor = state.respuestas[pantalla.clave];
  const destino = pantalla.destinos[valor] || pantalla.destinos.otra;
  ir(destino);
}

function renderAfirmacion(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
  const sugeridaRuta = state.respuestas.afirmacionSugeridaRuta;
  const opciones = sugeridaRuta
    ? [sugeridaRuta, ...pantalla.opcionesGenerales]
    : pantalla.opcionesGenerales;

  const lista = document.createElement("div");
  lista.className = "opciones-lista";
  opciones.forEach((texto) => {
    lista.appendChild(
      (() => {
        const b = document.createElement("button");
        b.className = "btn-opcion";
        b.textContent = texto;
        b.onclick = () => {
          guardar(pantalla.guardarEn, texto);
          ir(pantalla.siguiente);
        };
        return b;
      })()
    );
  });
  tarjeta.appendChild(lista);

  const btnPropia = botonSecundario(pantalla.opcionPropia || "Escribir mi propia afirmación", () => {
    renderAfirmacionPropia(tarjeta, pantalla);
  });
  tarjeta.appendChild(btnPropia);
}

function renderAfirmacionPropia(tarjeta, pantalla) {
  tarjeta.innerHTML = "";
  agregarTexto(tarjeta, ["Escribe lo que sientes. Te ayudaremos a convertirlo en una afirmación honesta y posible."]);
  const textarea = document.createElement("textarea");
  tarjeta.appendChild(textarea);
  const botones = document.createElement("div");
  botones.className = "botones";
  botones.appendChild(
    botonPrimario("Convertir en afirmación", async () => {
      const original = textarea.value.trim();
      if (contieneRiesgo(original)) return ir("riesgo");
      botones.innerHTML = "";
      const cargando = document.createElement("div");
      cargando.className = "cargando";
      cargando.textContent = "Mi Yo Interior está pensando una versión posible de tu frase…";
      tarjeta.appendChild(cargando);
      const { respuesta: sugerida } = await pedirRespuestaAgente("reformular_afirmacion", original);
      cargando.remove();
      agregarTexto(tarjeta, [`Versión sugerida: "${sugerida}"`]);
      const confirmar = document.createElement("div");
      confirmar.className = "botones";
      confirmar.appendChild(
        botonPrimario("Usar esta versión", () => {
          guardar(pantalla.guardarEn, sugerida);
          ir(pantalla.siguiente);
        })
      );
      confirmar.appendChild(
        botonSecundario("Prefiero mi frase original", () => {
          guardar(pantalla.guardarEn, original);
          ir(pantalla.siguiente);
        })
      );
      tarjeta.appendChild(confirmar);
    })
  );
  tarjeta.appendChild(botones);
}

/* Llama al agente (función serverless /api/chat) para las dos tareas del
   modo híbrido: reformular una afirmación, o responder brevemente a un
   texto libre anclado al contexto del paso (contextoIA, definido en el
   JSON del capítulo). Si el backend no está desplegado (por ejemplo al
   abrir este archivo localmente sin servidor), usa una respuesta de
   respaldo para que el flujo completo se pueda probar igualmente. */
async function pedirRespuestaAgente(tarea, textoOriginal, contextoIA) {
  try {
    const resp = await fetch(ENDPOINT_IA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarea,
        capitulo: state.capituloId,
        texto: textoOriginal,
        contextoIA,
        systemPromptBase: state.datos.systemPromptBase
      })
    });
    if (!resp.ok) throw new Error("Backend no disponible");
    const data = await resp.json();
    return { respuesta: data.respuesta, riesgo: !!data.riesgo };
  } catch (err) {
    return { respuesta: respaldoLocal(tarea, textoOriginal), riesgo: false };
  }
}

function respaldoLocal(tarea, textoOriginal) {
  if (tarea === "reformular_afirmacion") {
    return `Aunque hoy siento incertidumbre, elijo avanzar: ${textoOriginal.replace(/\.$/, "")} — y puedo hacerlo un paso a la vez.`;
  }
  return "Gracias por compartir esto. No necesitas resolverlo todo ahora: solo estás observando lo que sientes para poder dar tu próximo paso con más claridad.";
}

function renderCompromiso(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
  const grupo = document.createElement("div");
  grupo.className = "campo-grupo";
  const textarea = document.createElement("textarea");
  textarea.placeholder = "Mi próximo paso es…";
  grupo.appendChild(textarea);
  tarjeta.appendChild(grupo);

  const pillContenedor = document.createElement("div");
  pillContenedor.className = "pill-selector";
  let momentoSeleccionado = null;
  pantalla.opcionesMomento.forEach((m) => {
    const b = document.createElement("button");
    b.className = "btn-opcion";
    b.textContent = m;
    b.onclick = () => {
      momentoSeleccionado = m;
      [...pillContenedor.children].forEach((c) => (c.style.borderColor = "var(--acento-suave)"));
      b.style.borderColor = "var(--acento)";
    };
    pillContenedor.appendChild(b);
  });
  tarjeta.appendChild(pillContenedor);

  const botones = document.createElement("div");
  botones.className = "botones";
  botones.appendChild(
    botonPrimario("Confirmar mi compromiso", () => {
      const paso = textarea.value.trim();
      if (contieneRiesgo(paso)) return ir("riesgo");
      guardar(pantalla.guardarPasoEn, paso || state.respuestas.accion24h || "");
      guardar(pantalla.guardarMomentoEn, momentoSeleccionado || "Por definir");
      ir(pantalla.siguiente);
    })
  );
  tarjeta.appendChild(botones);
}

function renderResumen(tarjeta, pantalla) {
  const titulo = document.createElement("h2");
  titulo.textContent = pantalla.titulo;
  titulo.style.marginTop = "0";
  tarjeta.appendChild(titulo);

  pantalla.campos.forEach((campo) => {
    const valor = state.respuestas[campo.clave] || (campo.alt && state.respuestas[campo.alt]) || "—";
    const item = document.createElement("div");
    item.className = "resumen-item";
    const etiqueta = document.createElement("div");
    etiqueta.className = "etiqueta";
    etiqueta.textContent = campo.etiqueta;
    const valorDiv = document.createElement("div");
    valorDiv.className = "valor";
    valorDiv.textContent = valor;
    item.appendChild(etiqueta);
    item.appendChild(valorDiv);
    tarjeta.appendChild(item);
  });

  agregarTexto(tarjeta, [pantalla.textoFinal]);

  const botones = document.createElement("div");
  botones.className = "botones";
  pantalla.botones.forEach((b) => {
    botones.appendChild(
      botonPrimario(b.texto, () => {
        if (b.accion === "descargar") return descargarResumen(pantalla);
        if (b.accion === "reiniciar") {
          state.respuestas = {};
          return ir(state.datos.start);
        }
        ir(b.siguiente);
      })
    );
  });
  tarjeta.appendChild(botones);
}

function descargarResumen(pantalla) {
  const lineas = pantalla.campos.map((campo) => {
    const valor = state.respuestas[campo.clave] || (campo.alt && state.respuestas[campo.alt]) || "—";
    return `${campo.etiqueta}: ${valor}`;
  });
  const contenido = [pantalla.titulo, "", ...lineas, "", pantalla.textoFinal].join("\n");
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mi-yo-interior-capitulo-${state.capituloId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderFin(tarjeta, pantalla) {
  agregarTexto(tarjeta, pantalla.texto);
}

iniciar();
