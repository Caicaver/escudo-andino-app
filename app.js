/* ===================== Escudo Andino — Lógica de la app ===================== */

/* ---------- Registro del Service Worker (habilita instalación PWA) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Si el navegador bloquea el SW (p.ej. abierto como file://), la app sigue funcionando normalmente */
    });
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
  if (resultado.outcome === 'accepted') {
    mostrarSnackbar('Escudo Andino instalado ✔️');
  }
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
  const body = document.body;
  const nuevo = body.dataset.theme === 'light' ? 'dark' : 'light';
  body.dataset.theme = nuevo;
  localStorage.setItem('escudoAndino_tema', nuevo);
});
(function cargarTema() {
  const temaGuardado = localStorage.getItem('escudoAndino_tema');
  if (temaGuardado) document.body.dataset.theme = temaGuardado;
})();

/* ---------- Snackbar (Material) ---------- */
function mostrarSnackbar(mensaje) {
  const sb = document.getElementById('snackbar');
  sb.textContent = mensaje;
  sb.classList.add('mostrar');
  setTimeout(() => sb.classList.remove('mostrar'), 3200);
}

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

/* ---------- Seguimiento de uso (localStorage) ---------- */
const CLAVE_HISTORIAL = 'escudoAndino_historial';

function obtenerHistorial() {
  return JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) || '[]');
}

function guardarHistorial(historial) {
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
}

function registrarAplicacion(gramos = 1.5) {
  const historial = obtenerHistorial();
  historial.unshift({ fecha: new Date().toISOString(), gramos });
  guardarHistorial(historial);
  renderizarHistorial();
  mostrarSnackbar('Aplicación registrada ✔️');
}

function renderizarHistorial() {
  const historial = obtenerHistorial();
  const lista = document.getElementById('historialLista');
  const statTotal = document.getElementById('statTotal');
  const statGramos = document.getElementById('statGramos');
  const statDias = document.getElementById('statDias');

  statTotal.textContent = historial.length;
  const totalGramos = historial.reduce((acc, h) => acc + (h.gramos || 1.5), 0);
  statGramos.textContent = totalGramos.toFixed(1) + ' g';
  const diasUnicos = new Set(historial.map(h => h.fecha.slice(0, 10)));
  statDias.textContent = diasUnicos.size;

  if (historial.length === 0) {
    lista.innerHTML = '<li class="historial-vacio">Aún no has registrado aplicaciones. Ve a "Recomendación" y usa "Registrar aplicación ahora".</li>';
    return;
  }

  lista.innerHTML = historial.slice(0, 25).map(h => {
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
  if (confirm('¿Borrar todo el historial de aplicaciones?')) {
    guardarHistorial([]);
    renderizarHistorial();
    mostrarSnackbar('Historial borrado');
  }
});

/* ---------- Calculadora de dosis ---------- */
document.getElementById('btnCalcular').addEventListener('click', () => {
  const checks = document.querySelectorAll('#zonasCorporales input[type="checkbox"]:checked');
  let total = 0;
  checks.forEach(c => total += parseFloat(c.value));
  if (total === 0) total = 1.5;

  document.getElementById('numeroGramos').textContent = total.toFixed(1) + ' g';
  const envasesJornada = Math.ceil((total * 4) / 12); // 4 aplicaciones estimadas por jornada de 8h
  document.getElementById('numeroEnvases').textContent = envasesJornada;
  document.getElementById('resultadoCalculo').style.display = 'block';
});

/* ---------- Inicialización ---------- */
renderizarHistorial();
