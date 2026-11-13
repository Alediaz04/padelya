// pantalla de mis reservas (mis-reservas.html) - ITU-33 e ITU-34
// muestra las reservas del jugador separadas entre próximos turnos e historial
// y permite cancelar una reserva si no puede asistir (liberando el horario) o quitarla del historial

const usuario = protegerPagina();

if (usuario !== null) {
  dibujarMisReservas();
  armarBarra();
  armarPie();
}

function dibujarMisReservas() {
  const todas = obtenerReservasDeUsuario(usuario.id);
  const proximas = [];
  const historial = [];

  todas.forEach(function (reserva) {
    if (esReservaProxima(reserva)) {
      proximas.push(reserva);
    } else {
      historial.push(reserva);
    }
  });

  // el historial se ve más cómodo de la más reciente a la más vieja
  historial.reverse();

  const resumen = document.getElementById('resumen-reservas');
  if (todas.length === 0) {
    resumen.textContent = 'No tenés turnos registrados';
    document.getElementById('seccion-proximas').classList.add('oculto');
    document.getElementById('seccion-historial').classList.add('oculto');
    document.getElementById('sin-reservas').classList.remove('oculto');
    return;
  }

  resumen.textContent = proximas.length === 1
    ? 'Tenés 1 partido próximo confirmado'
    : 'Tenés ' + proximas.length + ' partidos próximos confirmados';

  document.getElementById('sin-reservas').classList.add('oculto');
  document.getElementById('seccion-proximas').classList.remove('oculto');

  const cajaProximas = document.getElementById('lista-proximas');
  cajaProximas.innerHTML = '';
  if (proximas.length === 0) {
    const aviso = crear('div', 'tarjeta');
    aviso.appendChild(crear('p', '', 'No tenés turnos próximos confirmados en este momento.'));
    const enlace = crear('a', 'btn btn-chico', 'Reservar una cancha →');
    enlace.href = 'canchas.html';
    aviso.appendChild(enlace);
    cajaProximas.appendChild(aviso);
  } else {
    proximas.forEach(function (reserva) {
      cajaProximas.appendChild(crearTarjetaReserva(reserva, 'confirmada', 'Confirmada', true));
    });
  }

  const seccionHistorial = document.getElementById('seccion-historial');
  const cajaHistorial = document.getElementById('lista-historial');
  cajaHistorial.innerHTML = '';
  if (historial.length > 0) {
    seccionHistorial.classList.remove('oculto');
    historial.forEach(function (reserva) {
      const clase = reserva.estado === 'cancelada' ? 'cancelada' : 'pasada';
      const texto = reserva.estado === 'cancelada' ? 'Cancelada' : 'Finalizada';
      cajaHistorial.appendChild(crearTarjetaReserva(reserva, clase, texto, false));
    });
  } else {
    seccionHistorial.classList.add('oculto');
  }
}

function crearTarjetaReserva(reserva, claseEstado, textoEstado, puedeCancelar) {
  const cancha = buscarCancha(reserva.canchaId);
  const nombreCancha = cancha ? cancha.nombre : 'Cancha #' + reserva.canchaId;
  const cantTurnos = obtenerCantidadTurnos(reserva);
  const horaFin = obtenerHoraFin(reserva);
  const precioTotal = obtenerPrecioReserva(reserva, cancha);

  const tarjeta = crear('article', 'reserva-card ' + claseEstado);

  const cabecera = crear('div', 'reserva-cabecera');
  cabecera.appendChild(crear('h3', '', nombreCancha));
  cabecera.appendChild(crear('span', 'estado-badge ' + claseEstado, textoEstado));
  tarjeta.appendChild(cabecera);

  const specs = crear('div', 'cancha-specs');
  specs.style.marginBottom = '4px';
  if (cancha) {
    specs.appendChild(crear('span', 'etiqueta ' + cancha.tipo.toLowerCase(), cancha.tipo));
  }
  specs.appendChild(
    crear('span', 'spec-pill', cantTurnos === 1 ? '1 turno (60 min)' : cantTurnos + ' turnos (' + cantTurnos + ' hs)')
  );
  specs.appendChild(crear('span', 'spec-pill', 'Blindex'));
  tarjeta.appendChild(specs);

  const meta = crear('div', 'reserva-meta');
  const lineaFecha = crear('span');
  lineaFecha.appendChild(crear('strong', '', '📅 Fecha: '));
  lineaFecha.appendChild(document.createTextNode(formatearFecha(reserva.fecha)));
  meta.appendChild(lineaFecha);

  const lineaHora = crear('span');
  lineaHora.appendChild(crear('strong', '', '🕒 Horario: '));
  lineaHora.appendChild(document.createTextNode(
    formatearHora(reserva.horaInicio) + ' a ' + formatearHora(horaFin) + ' hs'
  ));
  meta.appendChild(lineaHora);

  const lineaPrecio = crear('span');
  lineaPrecio.appendChild(crear('strong', '', '💳 Total: '));
  lineaPrecio.appendChild(document.createTextNode(formatearPrecio(precioTotal)));
  meta.appendChild(lineaPrecio);
  tarjeta.appendChild(meta);

  const pie = crear('div', 'reserva-pie');
  pie.appendChild(crear('span', 'reserva-numero', 'Código #' + reserva.id));
  pie.appendChild(crear('span', 'precio-tag-reserva', formatearPrecio(precioTotal)));
  tarjeta.appendChild(pie);

  // ITU-34: opciones para cancelar reserva próxima o quitar del historial
  const cajaAcciones = crear('div', 'reserva-acciones');

  if (puedeCancelar) {
    const btnCancelar = crear('button', 'btn btn-peligro btn-chico', 'No puedo asistir · Cancelar reserva');
    btnCancelar.type = 'button';

    // caja de confirmación dentro de la misma tarjeta para evitar cancelaciones accidentales
    const cajaConfirmar = crear('div', 'confirmacion-inline oculto');
    cajaConfirmar.appendChild(crear('p', '', '¿Confirmás que querés cancelar este turno? El horario volverá a quedar libre.'));
    const filaBotones = crear('div', 'acciones');

    const btnSi = crear('button', 'btn btn-peligro btn-chico', 'Sí, cancelar turno');
    btnSi.type = 'button';
    btnSi.addEventListener('click', function () {
      ejecutarCancelacion(reserva.id);
    });

    const btnNo = crear('button', 'btn btn-sec btn-chico', 'No, mantener');
    btnNo.type = 'button';
    btnNo.addEventListener('click', function () {
      cajaConfirmar.classList.add('oculto');
      btnCancelar.classList.remove('oculto');
    });

    filaBotones.appendChild(btnSi);
    filaBotones.appendChild(btnNo);
    cajaConfirmar.appendChild(filaBotones);

    btnCancelar.addEventListener('click', function () {
      btnCancelar.classList.add('oculto');
      cajaConfirmar.classList.remove('oculto');
    });

    cajaAcciones.appendChild(btnCancelar);
    cajaAcciones.appendChild(cajaConfirmar);
  } else {
    const btnEliminar = crear('button', 'btn btn-sec btn-chico', 'Eliminar del historial');
    btnEliminar.type = 'button';
    btnEliminar.addEventListener('click', function () {
      const res = eliminarReservaDeHistorial(reserva.id);
      mostrarMensaje('mensaje-reservas', res.mensaje, res.ok ? 'ok' : 'error');
      dibujarMisReservas();
    });
    cajaAcciones.appendChild(btnEliminar);
  }

  tarjeta.appendChild(cajaAcciones);

  return tarjeta;
}

function ejecutarCancelacion(reservaId) {
  const resultado = cancelarReserva(reservaId);
  mostrarMensaje('mensaje-reservas', resultado.mensaje, resultado.ok ? 'ok' : 'error');
  dibujarMisReservas();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
