/* ===================== Escudo Andino — Lógica de la app ===================== */

/* ---------- CONFIGURACIÓN: URL de tu Worker (proxy de Gemini) ---------- */
const URL_WORKER_CHATBOT = 'https://escudo-andino-chatbot.caicaver94.workers.dev';

/* ---------- Registro del Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ---------- Instalación PWA ---------- */
let promptInstalacionDiferido = null;
const btnInstalarTop = document.getElementById('btnInstalar');
const installCard = document.getElementById('installCard');
const btnInstalarCard = document.getElementById('btnInstalarCard');

window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  promptInstalacionDiferido = evento;
  btnInstalarTop.style.display = 'inline-flex';
  installCard.style.display = 'flex';
});

async function dispararInstalacion() {
  if (!promptInstalacionDiferido) {
    mostrarSnackbar('Usa el menú de tu navegador (⋮) → "Instalar aplicación"');
    return;
  }
  promptInstalacionDiferido.prompt();
  const resultado = await promptInstalacionDiferido.userChoice;
  if (resultado.outcome === 'accepted') mostrarSnackbar('Escudo Andino instalado ✔️');
  promptInstalacionDiferido = null;
  btnInstalarTop.style.display = 'none';
  installCard.style.display = 'none';
}
btnInstalarTop.addEventListener('click', dispararInstalacion);
btnInstalarCard.addEventListener('click', dispararInstalacion);
window.addEventListener('appinstalled', () => {
  btnInstalarTop.style.display = 'none';
  installCard.style.display = 'none';
  mostrarSnackbar('¡Gracias por instalar Escudo Andino!');
});

/* ---------- Navegación entre pantallas ---------- */
function irA(nombre) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + nombre).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === nombre);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => irA(btn.dataset.screen));
});

/* ---------- Tema claro / oscuro ---------- */
const btnTema = document.getElementById('btnTema');
btnTema.addEventListener('click', () => {
  const nuevo = document.body.dataset.theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = nuevo;
  localStorage.setItem('escudoAndino_tema', nuevo);
});
(function cargarTema() {
  const t = localStorage.getItem('escudoAndino_tema');
  if (t) document.body.dataset.theme = t;
})();

/* ---------- Snackbar ---------- */
function mostrarSnackbar(mensaje) {
  const sb = document.getElementById('snackbar');
  sb.textContent = mensaje;
  sb.classList.add('mostrar');
  setTimeout(() => sb.classList.remove('mostrar'), 3200);
}

/* =====================================================================
   SEGMENTACIÓN FREE / PRO
   ===================================================================== */
const CLAVE_PRO = 'escudoAndino_pro';
const CODIGO_PRO_DEMO = 'ESCUDO2026';
const LIMITE_HISTORIAL_FREE = 5;

function esProUsuario() {
  return localStorage.getItem(CLAVE_PRO) === 'true';
}

function actualizarUIPlan() {
  const pro = esProUsuario();
  document.getElementById('chipPlanActual').textContent = pro ? 'Plan Pro ⭐' : 'Plan Free';
  document.getElementById('avisoPerfilesFree').style.display = pro ? 'none' : 'block';
  document.getElementById('avisoHistorialFree').style.display = pro ? 'none' : 'block';
  document.getElementById('btnNuevoPerfil').disabled = !pro;
  document.getElementById('btnExportarCSV').style.opacity = pro ? '1' : '0.5';

  const chipGeminiHeader = document.getElementById('chipGeminiHeader');
  const subtituloChat = document.getElementById('subtituloChat');
  if (chipGeminiHeader) chipGeminiHeader.style.display = pro ? 'inline-flex' : 'none';
  if (subtituloChat) {
    subtituloChat.textContent = pro
      ? 'Conectado a Gemini (IA generativa)'
      : 'Free: reglas · Pro: IA generativa (Gemini)';
  }

  renderizarHistorial();
}

document.getElementById('btnActivarPro').addEventListener('click', () => {
  const codigo = document.getElementById('inputCodigoPro').value.trim().toUpperCase();
  if (codigo === CODIGO_PRO_DEMO) {
    localStorage.setItem(CLAVE_PRO, 'true');
    actualizarUIPlan();
    mostrarSnackbar('¡Plan Pro activado! ⭐ El asistente ahora usa IA generativa (Gemini).');
  } else {
    mostrarSnackbar('Código no válido. Verifica el código de demostración.');
  }
});
document.getElementById('btnDesactivarPro').addEventListener('click', () => {
  localStorage.setItem(CLAVE_PRO, 'false');
  actualizarUIPlan();
  mostrarSnackbar('Has vuelto al plan Free');
});

/* =====================================================================
   PERFILES (Pro)
   ===================================================================== */
const CLAVE_PERFILES = 'escudoAndino_perfiles';
const CLAVE_PERFIL_ACTIVO = 'escudoAndino_perfilActivo';

function obtenerPerfiles() {
  const guardado = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || 'null');
  return guardado && guardado.length ? guardado : ['Predeterminado'];
}
function guardarPerfiles(lista) { localStorage.setItem(CLAVE_PERFILES, JSON.stringify(lista)); }
function obtenerPerfilActivo() { return localStorage.getItem(CLAVE_PERFIL_ACTIVO) || 'Predeterminado'; }
function establecerPerfilActivo(nombre) { localStorage.setItem(CLAVE_PERFIL_ACTIVO, nombre); }

function renderizarSelectorPerfiles() {
  const select = document.getElementById('selectorPerfil');
  const perfiles = esProUsuario() ? obtenerPerfiles() : ['Predeterminado'];
  select.innerHTML = perfiles.map(p => `<option value="${p}">${p}</option>`).join('');
  select.value = perfiles.includes(obtenerPerfilActivo()) ? obtenerPerfilActivo() : perfiles[0];
}
document.getElementById('selectorPerfil').addEventListener('change', (e) => {
  establecerPerfilActivo(e.target.value);
  renderizarHistorial();
});
document.getElementById('btnNuevoPerfil').addEventListener('click', () => {
  if (!esProUsuario()) {
    mostrarSnackbar('🔒 Los perfiles múltiples son una función Pro.');
    return;
  }
  const nombre = prompt('Nombre del nuevo perfil (ej. nombre del trabajador o cliente):');
  if (nombre && nombre.trim()) {
    const perfiles = obtenerPerfiles();
    perfiles.push(nombre.trim());
    guardarPerfiles(perfiles);
    establecerPerfilActivo(nombre.trim());
    renderizarSelectorPerfiles();
    renderizarHistorial();
    mostrarSnackbar(`Perfil "${nombre.trim()}" creado`);
  }
});

/* ---------- Chips tipo de piel ---------- */
let pielSeleccionada = null;
document.querySelectorAll('.chip-select').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip-select').forEach(c => c.classList.remove('activo'));
    chip.classList.add('activo');
    pielSeleccionada = chip.dataset.piel;
  });
});

/* ---------- Slider de horas ---------- */
const rangoHoras = document.getElementById('rangoHoras');
const valorHoras = document.getElementById('valorHoras');
rangoHoras.addEventListener('input', () => { valorHoras.textContent = rangoHoras.value; });

/* ---------- Motor de recomendación ---------- */
let ciclosMs = 2 * 60 * 60 * 1000;

function motorRecomendacion(tipoPiel, horas, actividad) {
  let nivelRiesgo, cantidadProducto, frecuenciaHoras, mensajesExtra = [];
  if (tipoPiel === 'clara') {
    nivelRiesgo = 'alto';
    cantidadProducto = 'una capa generosa (aprox. 2 g en rostro y cuello, 1 g por brazo)';
    frecuenciaHoras = 1.5;
    mensajesExtra.push('Tu tipo de piel tiene mayor sensibilidad UV: evita, si es posible, las horas de mayor intensidad solar (11 a.m.–3 p.m.).');
  } else if (tipoPiel === 'media') {
    nivelRiesgo = 'medio';
    cantidadProducto = 'una capa uniforme sobre toda la piel expuesta (aprox. 1.5 g en rostro y cuello)';
    frecuenciaHoras = 2;
    mensajesExtra.push('Reaplica cada 2 horas para mantener una protección constante durante tu jornada.');
  } else {
    nivelRiesgo = 'medio';
    cantidadProducto = 'una capa uniforme, aunque el riesgo de quemadura visible sea menor';
    frecuenciaHoras = 2;
    mensajesExtra.push('Aunque tu piel se quema con menor frecuencia, la radiación UV sigue dañando las capas profundas: no omitas la protección.');
  }
  if (actividad === 'agricola' && horas >= 5) {
    nivelRiesgo = 'alto';
    mensajesExtra.push('El trabajo agrícola prolongado incrementa el riesgo: intenta hacer pausas a la sombra cada 2 horas, además de reaplicar el producto.');
  }
  if (horas >= 8) {
    mensajesExtra.push(`Con ${horas} horas de exposición, considera usar además ropa de manga larga y sombrero de ala ancha.`);
  }
  return { nivelRiesgo, cantidadProducto, frecuenciaHoras, mensajesExtra };
}

document.getElementById('btnRecomendar').addEventListener('click', () => {
  if (!pielSeleccionada) { mostrarSnackbar('Selecciona primero tu tipo de piel'); return; }
  const horas = parseFloat(rangoHoras.value);
  const actividad = document.getElementById('actividad').value;
  const rec = motorRecomendacion(pielSeleccionada, horas, actividad);

  const badge = document.getElementById('badgeRiesgo');
  badge.className = 'chip riesgo-' + rec.nivelRiesgo;
  badge.textContent = 'Nivel de riesgo: ' + rec.nivelRiesgo.toUpperCase();

  let html = '';
  html += `<div class="tips-text">📌 <strong>Cantidad recomendada:</strong> ${rec.cantidadProducto}.</div>`;
  html += `<div class="tips-text">⏱️ <strong>Reaplicar cada:</strong> ${rec.frecuenciaHoras} horas.</div>`;
  rec.mensajesExtra.forEach(m => { html += `<div class="tips-text">💡 ${m}</div>`; });
  document.getElementById('listaRecomendaciones').innerHTML = html;

  ciclosMs = rec.frecuenciaHoras * 60 * 60 * 1000;
  document.getElementById('resultadoRec').style.display = 'block';
  document.getElementById('resultadoRec').scrollIntoView({ behavior: 'smooth' });
});

/* ---------- Temporizador de reaplicación ---------- */
let intervaloRegresivo = null;
const tiempoRestanteEl = document.getElementById('tiempoRestante');
const alertaReaplicacion = document.getElementById('alertaReaplicacion');

function iniciarCicloAlertas(duracionMs) {
  clearInterval(intervaloRegresivo);
  alertaReaplicacion.style.display = 'none';
  let restante = duracionMs;
  actualizarTimer(restante);
  intervaloRegresivo = setInterval(() => {
    restante -= 1000;
    if (restante <= 0) {
      alertaReaplicacion.style.display = 'block';
      mostrarSnackbar('🔔 Hora de reaplicar tu Escudo Andino');
      restante = duracionMs;
    }
    actualizarTimer(restante);
  }, 1000);
}
function actualizarTimer(ms) {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeg / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeg % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeg % 60).padStart(2, '0');
  tiempoRestanteEl.textContent = `${h}:${m}:${s}`;
}
document.getElementById('btnIniciarAlertas').addEventListener('click', () => {
  iniciarCicloAlertas(ciclosMs);
  mostrarSnackbar('Recordatorios activados');
});
document.getElementById('modoDemo').addEventListener('click', () => {
  iniciarCicloAlertas(10000);
  mostrarSnackbar('Modo demostración: alerta en 10 segundos');
});

/* =====================================================================
   SEGUIMIENTO DE USO
   ===================================================================== */
function claveHistorial(perfil) { return `escudoAndino_historial__${perfil}`; }

function obtenerHistorial() {
  const perfil = esProUsuario() ? obtenerPerfilActivo() : 'Predeterminado';
  return JSON.parse(localStorage.getItem(claveHistorial(perfil)) || '[]');
}
function guardarHistorial(historial) {
  const perfil = esProUsuario() ? obtenerPerfilActivo() : 'Predeterminado';
  localStorage.setItem(claveHistorial(perfil), JSON.stringify(historial));
}
function registrarAplicacion(gramos = 1.5) {
  const historial = obtenerHistorial();
  historial.unshift({ fecha: new Date().toISOString(), gramos });
  guardarHistorial(historial);
  renderizarHistorial();
  mostrarSnackbar('Aplicación registrada ✔️');
}
function renderizarHistorial() {
  const historialCompleto = obtenerHistorial();
  const pro = esProUsuario();
  const historialVisible = pro ? historialCompleto : historialCompleto.slice(0, LIMITE_HISTORIAL_FREE);

  const lista = document.getElementById('historialLista');
  document.getElementById('statTotal').textContent = historialCompleto.length;
  const totalGramos = historialCompleto.reduce((acc, h) => acc + (h.gramos || 1.5), 0);
  document.getElementById('statGramos').textContent = totalGramos.toFixed(1) + ' g';
  const diasUnicos = new Set(historialCompleto.map(h => h.fecha.slice(0, 10)));
  document.getElementById('statDias').textContent = diasUnicos.size;

  if (historialVisible.length === 0) {
    lista.innerHTML = '<li class="historial-vacio">Aún no has registrado aplicaciones. Ve a "Recomendación" y usa "Registrar aplicación ahora".</li>';
    return;
  }
  lista.innerHTML = historialVisible.map(h => {
    const f = new Date(h.fecha);
    const fechaStr = f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    const horaStr = f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `<li><span>${fechaStr} · ${horaStr}</span><span>${(h.gramos || 1.5).toFixed(1)} g</span></li>`;
  }).join('');
}
document.getElementById('btnRegistrarUso').addEventListener('click', () => registrarAplicacion());
document.getElementById('fabRegistro').addEventListener('click', () => {
  registrarAplicacion();
  irA('seguimiento');
});
document.getElementById('btnLimpiarHistorial').addEventListener('click', () => {
  if (confirm('¿Borrar todo el historial de aplicaciones de este perfil?')) {
    guardarHistorial([]);
    renderizarHistorial();
    mostrarSnackbar('Historial borrado');
  }
});

document.getElementById('btnExportarCSV').addEventListener('click', () => {
  if (!esProUsuario()) { mostrarSnackbar('🔒 La exportación a CSV es una función Pro.'); return; }
  const historial = obtenerHistorial();
  if (historial.length === 0) { mostrarSnackbar('No hay registros para exportar'); return; }
  const perfil = obtenerPerfilActivo();
  let csv = 'Fecha,Hora,Gramos aplicados\n';
  historial.forEach(h => {
    const f = new Date(h.fecha);
    csv += `${f.toLocaleDateString('es-PE')},${f.toLocaleTimeString('es-PE')},${(h.gramos || 1.5).toFixed(1)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `escudo-andino-historial-${perfil}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
  mostrarSnackbar('Historial exportado como CSV ✔️');
});

/* ---------- Calculadora de dosis ---------- */
document.getElementById('btnCalcular').addEventListener('click', () => {
  const checks = document.querySelectorAll('#zonasCorporales input[type="checkbox"]:checked');
  let total = 0;
  checks.forEach(c => total += parseFloat(c.value));
  if (total === 0) total = 1.5;
  document.getElementById('numeroGramos').textContent = total.toFixed(1) + ' g';
  const envasesJornada = Math.ceil((total * 4) / 12);
  document.getElementById('numeroEnvases').textContent = envasesJornada;
  document.getElementById('resultadoCalculo').style.display = 'block';
});

/* =====================================================================
   CHATBOT — Motor local (Free) basado en reglas
   ===================================================================== */
const BASE_CONOCIMIENTO = [
  {
    intencion: 'ingredientes',
    palabrasClave: ['ingrediente', 'ingredientes', 'compuesto', 'formula', 'fórmula', 'lleva', 'contiene', 'hecho'],
    respuesta: 'Escudo Andino contiene: óxido de zinc (18%, filtro físico UVA/UVB), sábila (30%, hidratante), extracto de moringa (12%, antioxidante), y una base de consistencia (35%) con cera de abeja, mantequilla de cacao y vaselina, más 5% de aceite vegetal como vehículo. 🌿'
  },
  {
    intencion: 'reaplicacion',
    palabrasClave: ['reaplic', 'cada cuanto', 'cada cuánto', 'cuando aplico', 'frecuencia', 'horas'],
    respuesta: 'La recomendación general es reaplicar cada 2 horas de exposición solar. Si tienes piel clara, lo ideal es cada 1.5 horas por mayor sensibilidad. Puedes obtener tu recomendación exacta en la sección "Recomendación" según tu tipo de piel. ⏰'
  },
  {
    intencion: 'seguridad',
    palabrasClave: ['seguro', 'seguridad', 'confiable', 'certificado', 'fps', 'proteccion', 'protección', 'garantiza'],
    respuesta: '⚠️ Escudo Andino es un prototipo experimental. Su FPS (Factor de Protección Solar) aún no está certificado en laboratorio, por lo que no debe usarse como único medio de protección. Combínalo siempre con sombra, ropa de manga larga y sombrero.'
  },
  {
    intencion: 'sensibilidad',
    palabrasClave: ['alergia', 'alergica', 'alérgica', 'reaccion', 'reacción', 'irritacion', 'prueba'],
    respuesta: 'Antes de tu primer uso, realiza una prueba de sensibilidad: aplica una pequeña cantidad en el antebrazo y espera 24 horas. Si notas enrojecimiento, picazón o irritación, no continúes usando el producto. ✋'
  },
  {
    intencion: 'precio',
    palabrasClave: ['precio', 'cuesta', 'costo', 'comprar', 'venta', 'soles'],
    respuesta: 'El precio estimado de venta es de S/ 8 a S/ 12 por envase de 12 g, con un costo de producción aproximado de S/ 6 por unidad. Se vende de forma directa en mercados de Trujillo y cooperativas agrícolas. 💰'
  },
  {
    intencion: 'ambiente',
    palabrasClave: ['ambiente', 'ambiental', 'ecologico', 'ecológico', 'reciclable', 'sostenible', 'impacto'],
    respuesta: 'Escudo Andino usa envases reciclables e ingredientes naturales y locales. Se recolectan las plantas de forma responsable para no agotar sus poblaciones, y se busca reducir progresivamente el uso de vaselina (derivado del petróleo) reemplazándola por ceras y mantecas vegetales. ♻️'
  },
  {
    intencion: 'equipo',
    palabrasClave: ['equipo', 'quien hizo', 'quién hizo', 'estudiantes', 'autor', 'colegio', 'institucion', 'institución', 'asesor'],
    respuesta: 'Escudo Andino es un proyecto de la I.E. Santa Rita de Jesús (Trujillo), desarrollado por el equipo de 4.° "B" en el área de Educación para el Trabajo, bajo la asesoría del Mg. Calet Isai Cáceres Vergara. 🎓'
  },
  {
    intencion: 'ia_uso',
    palabrasClave: ['inteligencia artificial', ' ia ', 'claude', 'gemini', 'chatgpt', 'como se hizo', 'cómo se hizo'],
    respuesta: 'La inteligencia artificial se usó de tres formas: Claude ayudó a investigar y ajustar las proporciones de la fórmula, ChatGPT diseñó el etiquetado y material educativo, y Gemini potencia este asistente conversacional en el plan Pro. Cada sugerencia de IA fue validada con literatura científica antes de aplicarla. 🤖'
  },
  {
    intencion: 'modo_uso',
    palabrasClave: ['como aplico', 'cómo aplico', 'modo de uso', 'como usar', 'cómo usar', 'aplicar'],
    respuesta: 'Aplica una capa generosa sobre piel limpia, 15-20 minutos antes de la exposición solar, y reaplica según la recomendación de tu tipo de piel. Combínalo siempre con sombra, ropa adecuada y sombrero. 🧴'
  },
  {
    intencion: 'planes',
    palabrasClave: ['plan', 'pro', 'free', 'gratis', 'suscripcion', 'suscripción', 'pago'],
    respuesta: 'La app tiene un plan Free con todas las funciones esenciales gratuitas, y un plan Pro (S/5/mes por grupo) con historial ilimitado, exportación de datos, perfiles múltiples y el asistente con IA generativa (Gemini). Puedes ver la comparación completa en la sección "Planes". ⭐'
  },
  {
    intencion: 'app_funciones',
    palabrasClave: ['app', 'aplicacion', 'aplicación', 'funciones', 'que hace', 'qué hace'],
    respuesta: 'La app te ofrece: recomendaciones personalizadas por tipo de piel, alertas de reaplicación, una calculadora de dosis por zona corporal, seguimiento de tu historial de uso, y contenido educativo sobre radiación UV. 📱'
  }
];

const RESPUESTA_SALUDO_FREE = '¡Hola! 👋 Soy el asistente de Escudo Andino (modo básico). Puedo responder preguntas sobre ingredientes, modo de uso, seguridad, precios o el equipo. Con el plan Pro, respondo con IA generativa real (Gemini). ¿En qué te ayudo?';
const RESPUESTA_SALUDO_PRO = '¡Hola! 👋 Soy el asistente Pro de Escudo Andino, potenciado por IA generativa (Gemini). Pregúntame lo que quieras sobre el producto o la app.';
const RESPUESTA_FALLBACK = 'No tengo una respuesta exacta para eso todavía 🤔 Puedes revisar la sección "Consejos", o preguntarme sobre ingredientes, reaplicación, seguridad, precio o el equipo del proyecto.';

function normalizarTexto(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function motorChatbotLocal(mensajeUsuario) {
  const textoNormalizado = normalizarTexto(mensajeUsuario);
  let mejorCoincidencia = null;
  let mejorPuntaje = 0;

  BASE_CONOCIMIENTO.forEach(entrada => {
    let puntaje = 0;
    entrada.palabrasClave.forEach(palabra => {
      if (textoNormalizado.includes(normalizarTexto(palabra))) puntaje++;
    });
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorCoincidencia = entrada;
    }
  });

  if (mejorCoincidencia && mejorPuntaje > 0) return mejorCoincidencia.respuesta;
  return RESPUESTA_FALLBACK;
}

/* ---------- Llamada al Worker (IA generativa real vía Gemini, plan Pro) ---------- */
async function consultarChatbotPro(mensajeUsuario) {
  const respuesta = await fetch(URL_WORKER_CHATBOT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje: mensajeUsuario }),
  });

  if (!respuesta.ok) {
    throw new Error('El Worker respondió con estado ' + respuesta.status);
  }

  const datos = await respuesta.json();
  if (datos.error) throw new Error(datos.error);
  return datos.respuesta || RESPUESTA_FALLBACK;
}

/* ---------- UI del chat ---------- */
const chatOverlay = document.getElementById('chatOverlay');
const chatPanel = document.getElementById('chatPanel');
const chatMensajes = document.getElementById('chatMensajes');
const chatInput = document.getElementById('chatInput');

function abrirChat() {
  chatOverlay.classList.add('visible');
  chatPanel.classList.add('abierto');
  if (chatMensajes.children.length === 0) {
    agregarMensajeBot(esProUsuario() ? RESPUESTA_SALUDO_PRO : RESPUESTA_SALUDO_FREE);
  }
}
function cerrarChat() {
  chatOverlay.classList.remove('visible');
  chatPanel.classList.remove('abierto');
}
document.getElementById('fabChat').addEventListener('click', abrirChat);
document.getElementById('btnCerrarChat').addEventListener('click', cerrarChat);
chatOverlay.addEventListener('click', cerrarChat);

function agregarMensajeUsuario(texto) {
  const div = document.createElement('div');
  div.className = 'mensaje mensaje-usuario';
  div.textContent = texto;
  chatMensajes.appendChild(div);
  chatMensajes.scrollTop = chatMensajes.scrollHeight;
}
function agregarMensajeBot(texto, idTemporal = null) {
  const div = document.createElement('div');
  div.className = 'mensaje mensaje-bot';
  div.textContent = texto;
  if (idTemporal) div.dataset.temporal = idTemporal;
  chatMensajes.appendChild(div);
  chatMensajes.scrollTop = chatMensajes.scrollHeight;
  return div;
}

async function enviarMensajeChat() {
  const texto = chatInput.value.trim();
  if (!texto) return;
  agregarMensajeUsuario(texto);
  chatInput.value = '';

  const pro = esProUsuario();

  if (!pro) {
    setTimeout(() => agregarMensajeBot(motorChatbotLocal(texto)), 350);
    return;
  }

  const burbujaEscribiendo = agregarMensajeBot('Escribiendo...', 'escribiendo');
  try {
    const respuestaIA = await consultarChatbotPro(texto);
    burbujaEscribiendo.textContent = respuestaIA;
  } catch (error) {
    burbujaEscribiendo.textContent = motorChatbotLocal(texto) + '\n\n(⚠️ No se pudo conectar con Gemini; respondí con el modo básico. Verifica el Worker.)';
    console.error('Error consultando el Worker:', error);
  }
}
document.getElementById('btnEnviarChat').addEventListener('click', enviarMensajeChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarMensajeChat(); });

document.querySelectorAll('.chip-sugerencia').forEach(chip => {
  chip.addEventListener('click', () => {
    chatInput.value = chip.textContent;
    enviarMensajeChat();
  });
});

/* ---------- Inicialización ---------- */
renderizarSelectorPerfiles();
actualizarUIPlan();
