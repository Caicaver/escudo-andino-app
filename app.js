/* ===================== Escudo Andino — Lógica de la app ===================== */

/* ---------- Registro del Service Worker (habilita instalación PWA) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ---------- Botón de instalación (evento beforeinstallprompt) ---------- */
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
    mostrarSnackbar('Usa el menú de tu navegador (⋮) → "Instalar aplicación" para agregar Escudo Andino a tu pantalla de inicio');
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
  const chip = document.getElementById('chipPlanActual');
  chip.textContent = pro ? 'Plan Pro ⭐' : 'Plan Free';
  document.getElementById('avisoPerfilesFree').style.display = pro ? 'none' : 'block';
  document.getElementById('avisoHistorialFree').style.display = pro ? 'none' : 'block';
  document.getElementById('btnNuevoPerfil').disabled = !pro;
  document.getElementById('btnExportarCSV').style.opacity = pro ? '1' : '0.5';
  renderizarHistorial();
}

document.getElementById('btnActivarPro').addEventListener('click', () => {
  const codigo = document.getElementById('inputCodigoPro').value.trim().toUpperCase();
  if (codigo === CODIGO_PRO_DEMO) {
    localStorage.setItem(CLAVE_PRO, 'true');
    actualizarUIPlan();
    mostrarSnackbar('¡Plan Pro activado! ⭐ Ahora tienes historial ilimitado, exportación y perfiles múltiples.');
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
   PERFILES (multi-usuario, exclusivo Pro; Free usa un único perfil fijo)
   ===================================================================== */
const CLAVE_PERFILES = 'escudoAndino_perfiles';
const CLAVE_PERFIL_ACTIVO = 'escudoAndino_perfilActivo';

function obtenerPerfiles() {
  const guardado = JSON.parse(localStorage.getItem(CLAVE_PERFILES) || 'null');
  return guardado && guardado.length ? guardado : ['Predeterminado'];
}
function guardarPerfiles(lista) {
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(lista));
}
function obtenerPerfilActivo() {
  return localStorage.getItem(CLAVE_PERFIL_ACTIVO) || 'Predeterminado';
}
function establecerPerfilActivo(nombre) {
  localStorage.setItem(CLAVE_PERFIL_ACTIVO, nombre);
}

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
    mostrarSnackbar('🔒 Los perfiles múltiples son una función Pro. Ve a "Planes" para activarla.');
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

/* ---------- Selección de tipo de piel (chips) ---------- */
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
  if (!pielSeleccionada) {
    mostrarSnackbar('Selecciona primero tu tipo de piel');
    return;
  }
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
   SEGUIMIENTO DE USO (localStorage, por perfil)
   ===================================================================== */
function claveHistorial(perfil) {
  return `escudoAndino_historial__${perfil}`;
}

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

/* ---------- Exportación CSV (Pro) ---------- */
document.getElementById('btnExportarCSV').addEventListener('click', () => {
  if (!esProUsuario()) {
    mostrarSnackbar('🔒 La exportación a CSV es una función Pro. Ve a "Planes" para activarla.');
    return;
  }
  const historial = obtenerHistorial();
  if (historial.length === 0) {
    mostrarSnackbar('No hay registros para exportar');
    return;
  }
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

/* ---------- Inicialización ---------- */
renderizarSelectorPerfiles();
actualizarUIPlan();
