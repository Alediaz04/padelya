// pantalla de disponibilidad (disponibilidad.html) - PB-04, PB-05, PB-06 y selección de 1 a 4 turnos consecutivos
// el jugador elige una fecha, selecciona de 1 a 4 turnos consecutivos y confirma su reserva

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const usuario = protegerPagina();
const cancha = buscarCancha(Number(obtenerParametro('cancha')));

const campoFecha = document.getElementById('fecha');
const cajaDiasRapidos = document.getElementById('dias-rapidos');
const cajaHorarios = document.getElementById('horarios');
const panel = document.getElementById('panel-confirmar');
const botonConfirmar = document.getElementById('btn-confirmar');
const cajaBotonesDuracion = document.getElementById('botones-duracion');

let horaElegida = null;     // hora de inicio del bloque seleccionado
let cantidadElegida = 1;    // cantidad de turnos consecutivos seleccionados (1 a 4)

if (usuario !== null) {
  if (cancha === null || !cancha.activa) {
    // si la cancha no existe o está inactiva volvemos al listado
    window.location.href = 'canchas.html';
  } else {
    iniciar();
  }
}

function iniciar() {
  const precioHora = precioHoraCancha(cancha);
  document.getElementById('nombre-cancha').textContent = cancha.nombre;
  document.getElementById('subtitulo-cancha').textContent =
    'Blindex · Césped sintético · Valor por turno (60 min): ' + formatearPrecio(precioHora);

  const etiqueta = document.getElementById('tipo-cancha');
  etiqueta.textContent = cancha.tipo;
  etiqueta.className = 'etiqueta ' + cancha.tipo.toLowerCase();

  document.getElementById('precio-cancha').textContent = formatearPrecio(precioHora) + ' / turno';

  // no se puede elegir una fecha anterior a hoy
  campoFecha.min = hoyISO();
  const fechaUrl = obtenerParametro('fecha');
  campoFecha.value = fechaValida(fechaUrl) ? fechaUrl : hoyISO();

  campoFecha.addEventListener('change', cambioFecha);
  botonConfirmar.addEventListener('click', confirmarReserva);
  document.getElementById('btn-cancelar').addEventListener('click', cerrarPanel);

  dibujarDiasRapidos();
  dibujarHorarios();
  armarBarra();
  armarPie();
}

// la fecha de la url tiene que tener formato AAAA-MM-DD y no ser de antes de hoy
function fechaValida(fecha) {
  return fecha !== null && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha >= hoyISO();
}

// devuelve true si una hora está dentro del rango consecutivo elegido
function estaEnSeleccion(hora) {
  if (horaElegida === null) return false;
  return hora >= horaElegida && hora < (horaElegida + cantidadElegida);
}

// arma la tira de los próximos 7 días al estilo ATC Sports (HOY, MAÑ, etc.)
function dibujarDiasRapidos() {
  if (!cajaDiasRapidos) return;
  cajaDiasRapidos.innerHTML = '';
  const hoy = hoyISO();

  for (let i = 0; i < 7; i++) {
    const fechaISO = sumarDias(hoy, i);
    const objFecha = new Date(fechaISO + 'T00:00:00');
    const etiquetaDia = i === 0 ? 'HOY' : (i === 1 ? 'MAÑ' : DIAS_CORTOS[objFecha.getDay()]);

    const pill = crear('button', 'dia-pill' + (campoFecha.value === fechaISO ? ' activo' : ''));
    pill.type = 'button';
    pill.appendChild(crear('span', 'dia-nombre', etiquetaDia));
    pill.appendChild(crear('span', 'dia-num', String(objFecha.getDate())));
    pill.appendChild(crear('span', 'dia-mes', MESES_CORTOS[objFecha.getMonth()]));

    pill.addEventListener('click', function () {
      campoFecha.value = fechaISO;
      cambioFecha();
    });

    cajaDiasRapidos.appendChild(pill);
  }
}

function cambioFecha() {
  // si borran la fecha o escriben una pasada, volvemos a hoy
  if (campoFecha.value === '' || campoFecha.value < hoyISO()) {
    campoFecha.value = hoyISO();
  }
  cerrarPanel();
  dibujarDiasRapidos();
  dibujarHorarios();
}

// dibuja los botones con todos los turnos del día
function dibujarHorarios() {
  const fecha = campoFecha.value;
  const precioHora = precioHoraCancha(cancha);
  document.getElementById('texto-fecha').textContent = formatearFecha(fecha);
  cajaHorarios.innerHTML = '';

  const infoDia = resumenAperturaDia(cancha.id, fecha);
  if (infoDia !== null) {
    mostrarMensaje('aviso-apertura', infoDia.mensaje, infoDia.cerrado ? 'error' : 'ok');
  } else {
    ocultarMensaje('aviso-apertura');
  }

  const turnos = obtenerTurnos(cancha.id, fecha);
  let libres = 0;

  turnos.forEach(function (turno) {
    const seleccionado = estaEnSeleccion(turno.hora);
    const boton = crear('button', 'horario ' + turno.estado + (seleccionado ? ' elegido' : ''));
    boton.type = 'button';
    boton.appendChild(crear('strong', '', formatearHora(turno.hora)));

    let textoSub = 'Finalizado';
    if (turno.estado === 'libre') {
      textoSub = seleccionado ? 'Seleccionado' : formatearPrecio(precioHora);
    } else if (turno.estado === 'ocupado') {
      textoSub = 'Reservado';
    } else if (turno.estado === 'bloqueado') {
      textoSub = 'Cerrado';
      if (turno.motivo) boton.title = turno.motivo;
    }
    boton.appendChild(crear('small', '', textoSub));

    if (turno.estado === 'libre') {
      libres++;
      boton.addEventListener('click', function () {
        tocarHorarioEnGrilla(turno.hora);
      });
    } else {
      boton.disabled = true; // ocupado, bloqueado o pasado: no se puede tocar
    }
    cajaHorarios.appendChild(boton);
  });

  document.getElementById('resumen').textContent = libres + ' de ' + turnos.length + ' turnos disponibles para esta fecha';
}

// maneja el click en un turno libre de la grilla permitiendo sumar o restar turnos consecutivos (hasta 4)
function tocarHorarioEnGrilla(hora) {
  ocultarMensaje('mensaje-reserva');

  // si todavía no había ningún turno elegido, arrancamos con este
  if (horaElegida === null) {
    elegirRango(hora, 1, true);
    return;
  }

  const finActual = horaElegida + cantidadElegida - 1;

  // si toca justo el turno siguiente al bloque actual, lo agregamos al bloque consecutivo
  if (hora === finActual + 1) {
    if (cantidadElegida >= MAX_TURNOS_CONSECUTIVOS) {
      mostrarMensaje(
        'mensaje-reserva',
        'Podés seleccionar hasta ' + MAX_TURNOS_CONSECUTIVOS + ' turnos consecutivos como máximo por reserva.',
        'error'
      );
      return;
    }
    elegirRango(horaElegida, cantidadElegida + 1, false);
    return;
  }

  // si toca justo el turno anterior al inicio del bloque actual, también lo sumamos al bloque
  if (hora === horaElegida - 1) {
    if (cantidadElegida >= MAX_TURNOS_CONSECUTIVOS) {
      mostrarMensaje(
        'mensaje-reserva',
        'Podés seleccionar hasta ' + MAX_TURNOS_CONSECUTIVOS + ' turnos consecutivos como máximo por reserva.',
        'error'
      );
      return;
    }
    elegirRango(hora, cantidadElegida + 1, false);
    return;
  }

  // si toca el último turno del bloque seleccionado y hay más de 1, lo deselecciona
  if (hora === finActual && cantidadElegida > 1) {
    elegirRango(horaElegida, cantidadElegida - 1, false);
    return;
  }

  // si toca el único turno seleccionado, cerramos la selección
  if (hora === horaElegida && cantidadElegida === 1) {
    cerrarPanel();
    return;
  }

  // si toca otro turno no consecutivo, iniciamos la selección desde ese nuevo horario
  elegirRango(hora, 1, true);
  mostrarMensaje(
    'mensaje-reserva',
    'Horario inicial cambiado a las ' + formatearHora(hora) + '. Recordá que en una misma reserva los turnos deben ser consecutivos (para otro horario separado, hacé otra reserva).',
    'ok'
  );
}

// selecciona horaInicio y cantidad de turnos consecutivos y actualiza el panel de confirmación
function elegirRango(horaInicio, cantidad, hacerScroll) {
  horaElegida = horaInicio;
  cantidadElegida = cantidad;

  const precioUnitario = precioHoraCancha(cancha);
  const precioTotal = precioUnitario * cantidadElegida;
  const horaFin = horaElegida + cantidadElegida;

  dibujarSelectorDuracion(precioUnitario);

  const detalle = document.getElementById('detalle');
  detalle.innerHTML = '';
  agregarDato(detalle, 'Cancha', cancha.nombre + ' (' + cancha.tipo + ')');
  agregarDato(detalle, 'Fecha', formatearFecha(campoFecha.value));
  agregarDato(
    detalle,
    'Horario',
    formatearHora(horaElegida) + ' a ' + formatearHora(horaFin) + ' hs'
  );
  agregarDato(
    detalle,
    'Turnos',
    cantidadElegida === 1
      ? '1 turno (60 min)'
      : cantidadElegida + ' turnos consecutivos (' + cantidadElegida + ' hs)'
  );
  agregarDato(detalle, 'Valor por turno', formatearPrecio(precioUnitario));
  agregarDato(detalle, 'Total a pagar', formatearPrecio(precioTotal));
  agregarDato(detalle, 'Jugador', usuario.nombre + (usuario.telefono ? ' (📞 ' + usuario.telefono + ')' : ''));

  document.getElementById('alternativas').innerHTML = '';
  botonConfirmar.disabled = false;
  botonConfirmar.textContent = 'Confirmar reserva por ' + formatearPrecio(precioTotal);
  panel.classList.remove('oculto');

  dibujarHorarios();
  if (hacerScroll) {
    panel.scrollIntoView({ behavior: 'smooth' });
  }
}

// dibuja los 4 botones (1 turno, 2 turnos, 3 turnos, 4 turnos) habilitando solo los que estén libres consecutivamente
function dibujarSelectorDuracion(precioUnitario) {
  if (!cajaBotonesDuracion || horaElegida === null) return;
  cajaBotonesDuracion.innerHTML = '';

  const maxLibres = maxTurnosLibresDesde(cancha.id, campoFecha.value, horaElegida);

  for (let cant = 1; cant <= MAX_TURNOS_CONSECUTIVOS; cant++) {
    const btn = crear('button', 'btn-duracion' + (cant === cantidadElegida ? ' activo' : ''));
    btn.type = 'button';

    const etiquetaTurnos = cant === 1 ? '1 turno (1 h)' : cant + ' turnos (' + cant + ' hs)';
    const rangoTexto = formatearHora(horaElegida) + ' a ' + formatearHora(horaElegida + cant);
    btn.appendChild(crear('strong', '', etiquetaTurnos));
    btn.appendChild(crear('span', '', rangoTexto + ' · ' + formatearPrecio(precioUnitario * cant)));

    if (cant <= maxLibres) {
      btn.addEventListener('click', function () {
        ocultarMensaje('mensaje-reserva');
        elegirRango(horaElegida, cant, false);
      });
    } else {
      btn.disabled = true;
    }

    cajaBotonesDuracion.appendChild(btn);
  }
}

function cerrarPanel() {
  horaElegida = null;
  cantidadElegida = 1;
  panel.classList.add('oculto');
  dibujarHorarios();
}

function confirmarReserva() {
  const resultado = reservarTurno(cancha.id, campoFecha.value, horaElegida, cantidadElegida);

  if (resultado.ok) {
    window.location.href = 'reserva-confirmada.html?id=' + resultado.reserva.id;
    return;
  }

  // no se pudo reservar (por ejemplo, se lo ganó otro jugador): avisamos y ofrecemos otros horarios
  mostrarMensaje('mensaje-reserva', resultado.mensaje, 'error');
  mostrarAlternativas(resultado.alternativas);
  botonConfirmar.disabled = true;
  horaElegida = null;
  cantidadElegida = 1;
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
      ocultarMensaje('mensaje-reserva');
      elegirRango(hora, 1, true);
    });
    caja.appendChild(boton);
  });
}
