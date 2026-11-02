// pantalla de disponibilidad (disponibilidad.html) - PB-04, PB-05 y PB-06
// el jugador elige una fecha, ve los turnos de la cancha y reserva uno

const TEXTO_ESTADO = { libre: 'Libre', ocupado: 'Ocupado', pasado: 'Pasado' };

const usuario = protegerPagina();
const cancha = buscarCancha(Number(obtenerParametro('cancha')));

const campoFecha = document.getElementById('fecha');
const cajaHorarios = document.getElementById('horarios');
const panel = document.getElementById('panel-confirmar');
const botonConfirmar = document.getElementById('btn-confirmar');

let horaElegida = null; // turno que tocó el jugador (todavía no está reservado)

if (usuario !== null) {
  if (cancha === null || !cancha.activa) {
    // si la cancha no existe o está inactiva volvemos al listado
    window.location.href = 'canchas.html';
  } else {
    iniciar();
  }
}

function iniciar() {
  document.getElementById('nombre-cancha').textContent = cancha.nombre;
  const etiqueta = document.getElementById('tipo-cancha');
  etiqueta.textContent = cancha.tipo;
  etiqueta.className = 'etiqueta ' + cancha.tipo.toLowerCase();

  // no se puede elegir una fecha anterior a hoy
  campoFecha.min = hoyISO();
  const fechaUrl = obtenerParametro('fecha');
  campoFecha.value = fechaValida(fechaUrl) ? fechaUrl : hoyISO();

  campoFecha.addEventListener('change', cambioFecha);
  botonConfirmar.addEventListener('click', confirmarReserva);
  document.getElementById('btn-cancelar').addEventListener('click', cerrarPanel);

  dibujarHorarios();
  armarBarra();
  armarPie();
}

// la fecha de la url tiene que tener formato AAAA-MM-DD y no ser de antes de hoy
function fechaValida(fecha) {
  return fecha !== null && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha >= hoyISO();
}

function cambioFecha() {
  // si borran la fecha o escriben una pasada, volvemos a hoy
  if (campoFecha.value === '' || campoFecha.value < hoyISO()) {
    campoFecha.value = hoyISO();
  }
  cerrarPanel();
  dibujarHorarios();
}

// dibuja los botones con todos los turnos del día
function dibujarHorarios() {
  const fecha = campoFecha.value;
  document.getElementById('texto-fecha').textContent = formatearFecha(fecha);
  cajaHorarios.innerHTML = '';

  const turnos = obtenerTurnos(cancha.id, fecha);
  let libres = 0;

  turnos.forEach(function (turno) {
    const boton = crear('button', 'horario ' + turno.estado);
    boton.type = 'button';
    boton.appendChild(crear('strong', '', formatearHora(turno.hora)));
    boton.appendChild(crear('small', '', TEXTO_ESTADO[turno.estado]));

    if (turno.hora === horaElegida) {
      boton.classList.add('elegido');
    }

    if (turno.estado === 'libre') {
      libres++;
      boton.addEventListener('click', function () {
        elegirTurno(turno.hora);
      });
    } else {
      boton.disabled = true; // ocupado o pasado: no se puede tocar
    }
    cajaHorarios.appendChild(boton);
  });

  document.getElementById('resumen').textContent = libres + ' de ' + turnos.length + ' turnos libres';
}

// el jugador toca un turno libre: mostramos el resumen para que confirme
function elegirTurno(hora) {
  horaElegida = hora;

  const detalle = document.getElementById('detalle');
  detalle.innerHTML = '';
  agregarDato(detalle, 'Cancha', cancha.nombre + ' (' + cancha.tipo + ')');
  agregarDato(detalle, 'Fecha', formatearFecha(campoFecha.value));
  agregarDato(detalle, 'Horario', formatearHora(hora) + ' a ' + formatearHora(hora + 1));
  agregarDato(detalle, 'Jugador', usuario.nombre);

  ocultarMensaje('mensaje-reserva');
  document.getElementById('alternativas').innerHTML = '';
  botonConfirmar.disabled = false;
  panel.classList.remove('oculto');

  dibujarHorarios(); // para que quede marcado el turno elegido
  panel.scrollIntoView({ behavior: 'smooth' });
}

function cerrarPanel() {
  horaElegida = null;
  panel.classList.add('oculto');
  dibujarHorarios();
}

function confirmarReserva() {
  const resultado = reservarTurno(cancha.id, campoFecha.value, horaElegida);

  if (resultado.ok) {
    window.location.href = 'reserva-confirmada.html?id=' + resultado.reserva.id;
    return;
  }

  // no se pudo reservar (por ejemplo, se lo ganó otro jugador): avisamos y ofrecemos otros horarios
  mostrarMensaje('mensaje-reserva', resultado.mensaje, 'error');
  mostrarAlternativas(resultado.alternativas);
  botonConfirmar.disabled = true;
  horaElegida = null;
  dibujarHorarios(); // se actualiza la grilla y el turno aparece ocupado
}

// botones con los horarios que siguen libres ese día
function mostrarAlternativas(horas) {
  const caja = document.getElementById('alternativas');
  caja.innerHTML = '';

  if (horas.length === 0) {
    caja.appendChild(crear('p', '', 'Ya no quedan turnos libres ese día, probá con otra fecha.'));
    return;
  }

  caja.appendChild(crear('p', '', 'Estos horarios siguen libres:'));
  horas.slice(0, 6).forEach(function (hora) {
    const boton = crear('button', 'btn btn-sec btn-chico', formatearHora(hora));
    boton.type = 'button';
    boton.addEventListener('click', function () {
      elegirTurno(hora);
    });
    caja.appendChild(boton);
  });
}
