// reservas.js
// disponibilidad de turnos y reservas (PB-04, PB-05 y PB-06)
// cada turno dura 1 hora

const HORA_APERTURA = 8;
const HORA_CIERRE = 22; // el último turno arranca a las 22:00 y termina a las 23:00

// ---------- disponibilidad ----------

// true si el turno ya empezó o ya pasó
function turnoYaPaso(fecha, hora) {
  const inicio = new Date(fecha + 'T' + String(hora).padStart(2, '0') + ':00:00');
  return inicio <= new Date();
}

// true si ya hay una reserva confirmada en esa cancha, fecha y hora
function hayReserva(canchaId, fecha, hora) {
  return obtenerReservas().some(function (r) {
    return r.canchaId === canchaId && r.fecha === fecha &&
           r.horaInicio === hora && r.estado === 'confirmada';
  });
}

// devuelve la lista de turnos del día con su estado: 'libre', 'ocupado' o 'pasado'
// Un turno pasado nunca se muestra como libre
function obtenerTurnos(canchaId, fecha) {
  const turnos = [];
  for (let hora = HORA_APERTURA; hora <= HORA_CIERRE; hora++) {
    let estado = 'libre';
    if (turnoYaPaso(fecha, hora)) {
      estado = 'pasado';
    } else if (hayReserva(canchaId, fecha, hora)) {
      estado = 'ocupado';
    }
    turnos.push({ hora: hora, estado: estado });
  }
  return turnos;
}

// horas libres de ese día (se usan para ofrecer otros horarios si el turno ya se tomó)
function horasLibres(canchaId, fecha) {
  return obtenerTurnos(canchaId, fecha)
    .filter(function (turno) { return turno.estado === 'libre'; })
    .map(function (turno) { return turno.hora; });
}

// ---------- reservar ----------

// devuelve { ok: true, reserva } o { ok: false, mensaje, alternativas }
function reservarTurno(canchaId, fecha, hora) {
  const usuario = usuarioActual();
  if (usuario === null) {
    return { ok: false, mensaje: 'Tenés que iniciar sesión para reservar', alternativas: [] };
  }

  const cancha = buscarCancha(canchaId);
  if (cancha === null || !cancha.activa) {
    return { ok: false, mensaje: 'Esa cancha no está disponible', alternativas: [] };
  }

  if (turnoYaPaso(fecha, hora)) {
    return { ok: false, mensaje: 'Ese turno ya pasó, elegí otro horario', alternativas: horasLibres(canchaId, fecha) };
  }

  // PB-06: si otro jugador ya lo reservó avisamos y ofrecemos otros horarios
  const mensajeTomado = 'Ese turno ya fue tomado por otro jugador. Elegí otro horario';
  if (hayReserva(canchaId, fecha, hora)) {
    return { ok: false, mensaje: mensajeTomado, alternativas: horasLibres(canchaId, fecha) };
  }

  const reserva = {
    id: nuevoId(obtenerReservas()),
    usuarioId: usuario.id,   // la reserva queda asociada al jugador
    canchaId: canchaId,
    fecha: fecha,
    horaInicio: hora,
    estado: 'confirmada'
  };

  // por si justo entre el chequeo de arriba y el guardado alguien más reservó,
  // guardarReserva también controla que no se repita (y tira error si pasa)
  try {
    guardarReserva(reserva);
  } catch (error) {
    return { ok: false, mensaje: mensajeTomado, alternativas: horasLibres(canchaId, fecha) };
  }

  return { ok: true, reserva: reserva };
}

function buscarReserva(id) {
  const reserva = obtenerReservas().find(function (r) {
    return r.id === id;
  });
  return reserva || null;
}
