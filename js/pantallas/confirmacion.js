// pantalla de reserva confirmada (reserva-confirmada.html) - PB-05
// muestra los datos de la reserva que se acaba de hacer

const usuario = protegerPagina();

if (usuario !== null) {
  const reserva = buscarReserva(Number(obtenerParametro('id')));

  // solo se puede ver una reserva propia
  if (reserva === null || reserva.usuarioId !== usuario.id) {
    window.location.href = 'canchas.html';
  } else {
    const cancha = buscarCancha(reserva.canchaId);

    const detalle = document.getElementById('detalle-reserva');
    agregarDato(detalle, 'Cancha', cancha.nombre + ' (' + cancha.tipo + ')');
    agregarDato(detalle, 'Fecha', formatearFecha(reserva.fecha));
    agregarDato(detalle, 'Horario', formatearHora(reserva.horaInicio) + ' a ' + formatearHora(reserva.horaInicio + 1));
    agregarDato(detalle, 'Jugador', usuario.nombre);
    agregarDato(detalle, 'N° de reserva', '#' + reserva.id);

    // este link vuelve a la misma cancha y fecha: ahí se ve que el turno ya figura como ocupado
    document.getElementById('link-disponibilidad').href =
      'disponibilidad.html?cancha=' + cancha.id + '&fecha=' + reserva.fecha;

    armarBarra();
    armarPie();
  }
}
