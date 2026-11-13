// reservas.js
// disponibilidad de turnos, reservas de jugador, reservas del día para admin (ITU-36)
// y bloqueos / feriados / horarios reducidos (ITU-37)

const HORA_APERTURA = 8;
const HORA_CIERRE = 22; // el último turno arranca a las 22:00 y termina a las 23:00
const MAX_TURNOS_CONSECUTIVOS = 4;

// ---------- helpers de reserva ----------

function obtenerCantidadTurnos(reserva) {
  if (typeof reserva.cantidadTurnos === 'number' && reserva.cantidadTurnos >= 1) {
    return reserva.cantidadTurnos;
  }
  if (typeof reserva.horaFin === 'number' && reserva.horaFin > reserva.horaInicio) {
    return reserva.horaFin - reserva.horaInicio;
  }
  return 1;
}

function obtenerHoraFin(reserva) {
  if (typeof reserva.horaFin === 'number' && reserva.horaFin > reserva.horaInicio) {
    return reserva.horaFin;
  }
  return reserva.horaInicio + obtenerCantidadTurnos(reserva);
}

function obtenerPrecioReserva(reserva, cancha) {
  if (typeof reserva.precioTotal === 'number' && reserva.precioTotal > 0) {
    return reserva.precioTotal;
  }
  const c = cancha || buscarCancha(reserva.canchaId);
  return obtenerCantidadTurnos(reserva) * precioHoraCancha(c);
}

// ---------- disponibilidad y bloqueos (ITU-37) ----------

// true si el turno ya empezó o ya pasó
function turnoYaPaso(fecha, hora) {
  const inicio = new Date(fecha + 'T' + String(hora).padStart(2, '0') + ':00:00');
  return inicio <= new Date();
}

// true si ya hay una reserva confirmada que cubra esa cancha, fecha y hora
function hayReserva(canchaId, fecha, hora) {
  return obtenerReservas().some(function (r) {
    if (r.canchaId !== canchaId || r.fecha !== fecha || r.estado !== 'confirmada') {
      return false;
    }
    const fin = obtenerHoraFin(r);
    return hora >= r.horaInicio && hora < fin;
  });
}

// devuelve el motivo del bloqueo si ese turno no está habilitado por:
// 1) bloqueo puntual o feriado de fecha (canchaId específico o 0 = todas las canchas)
// 2) configuración del día de la semana (por ejemplo domingos cerrados o en horario reducido)
// o null si el horario está abierto normalmente
function obtenerMotivoBloqueo(canchaId, fecha, hora) {
  // 1. revisamos bloqueos / feriados / horarios reducidos cargados para esa fecha
  const bloqueosFecha = obtenerBloqueos().filter(function (b) {
    return b.fecha === fecha && (b.canchaId === canchaId || b.canchaId === 0);
  });

  // si hay una excepción de "apertura especial" para esa fecha, tiene prioridad sobre la regla del día de semana
  for (let i = 0; i < bloqueosFecha.length; i++) {
    const b = bloqueosFecha[i];
    if (hora >= b.horaInicio && hora < b.horaFin) {
      return b.motivo || 'Horario bloqueado';
    }
  }

  // 2. revisamos la configuración general del día de la semana (ej. domingo medio tiempo o cerrado)
  const objFecha = new Date(fecha + 'T00:00:00');
  const diaSemana = objFecha.getDay(); // 0 = Domingo .. 6 = Sábado
  const configDias = obtenerConfigDias();
  const cfg = configDias[diaSemana];

  if (cfg) {
    if (cfg.cerrado) {
      return 'Cerrado (' + cfg.nombre + ' sin atención)';
    }
    if (hora < cfg.apertura || hora >= cfg.cierre) {
      return 'Horario reducido (' + cfg.nombre + ' de ' + formatearHora(cfg.apertura) + ' a ' + formatearHora(cfg.cierre) + ')';
    }
  }

  return null;
}

// devuelve información general del día para mostrar un aviso en disponibilidad si es feriado o horario reducido
function resumenAperturaDia(canchaId, fecha) {
  const bloqueosFecha = obtenerBloqueos().filter(function (b) {
    return b.fecha === fecha && (b.canchaId === canchaId || b.canchaId === 0);
  });

  const cierreCompleto = bloqueosFecha.find(function (b) {
    return b.horaInicio <= HORA_APERTURA && b.horaFin >= HORA_CIERRE + 1;
  });
  if (cierreCompleto) {
    return { cerrado: true, mensaje: '🚫 Complejo / cancha cerrada en esta fecha: ' + cierreCompleto.motivo };
  }

  const objFecha = new Date(fecha + 'T00:00:00');
  const cfg = obtenerConfigDias()[objFecha.getDay()];
  if (cfg && cfg.cerrado) {
    return { cerrado: true, mensaje: '🚫 El complejo permanece cerrado los días ' + cfg.nombre.toLowerCase() + '.' };
  }
  if (cfg && (cfg.apertura > HORA_APERTURA || cfg.cierre < HORA_CIERRE + 1)) {
    return {
      cerrado: false,
      mensaje: '🕒 Horario reducido de ' + cfg.nombre.toLowerCase() + ': abierto de ' + formatearHora(cfg.apertura) + ' a ' + formatearHora(cfg.cierre) + ' hs.'
    };
  }
  if (bloqueosFecha.length > 0) {
    return {
      cerrado: false,
      mensaje: '⚠️ Atención: existen horarios bloqueados o reducidos en esta fecha (' + bloqueosFecha[0].motivo + ').'
    };
  }
  return null;
}

// devuelve la lista de turnos del día con su estado: 'libre', 'ocupado', 'bloqueado' o 'pasado'
function obtenerTurnos(canchaId, fecha) {
  const turnos = [];
  for (let hora = HORA_APERTURA; hora <= HORA_CIERRE; hora++) {
    let estado = 'libre';
    let motivo = null;

    const motivoBloqueo = obtenerMotivoBloqueo(canchaId, fecha, hora);
    if (motivoBloqueo !== null) {
      estado = 'bloqueado';
      motivo = motivoBloqueo;
    } else if (turnoYaPaso(fecha, hora)) {
      estado = 'pasado';
    } else if (hayReserva(canchaId, fecha, hora)) {
      estado = 'ocupado';
    }
    turnos.push({ hora: hora, estado: estado, motivo: motivo });
  }
  return turnos;
}

// horas libres de ese día (se usan para ofrecer otros horarios si el turno ya se tomó)
function horasLibres(canchaId, fecha) {
  return obtenerTurnos(canchaId, fecha)
    .filter(function (turno) { return turno.estado === 'libre'; })
    .map(function (turno) { return turno.hora; });
}

// devuelve cuántos turnos consecutivos (hasta 4) están libres a partir de horaInicio
function maxTurnosLibresDesde(canchaId, fecha, horaInicio) {
  let libres = 0;
  for (let i = 0; i < MAX_TURNOS_CONSECUTIVOS; i++) {
    const h = horaInicio + i;
    if (h > HORA_CIERRE) break;
    if (turnoYaPaso(fecha, h) || hayReserva(canchaId, fecha, h) || obtenerMotivoBloqueo(canchaId, fecha, h) !== null) {
      break;
    }
    libres++;
  }
  return libres;
}

// ---------- reservar ----------

// permite reservar entre 1 y 4 turnos consecutivos en el mismo día
// devuelve { ok: true, reserva } o { ok: false, mensaje, alternativas }
function reservarTurno(canchaId, fecha, horaInicio, cantidadTurnos, usuarioOpcionalId) {
  if (cantidadTurnos === undefined) cantidadTurnos = 1;
  cantidadTurnos = Number(cantidadTurnos);

  const usuario = usuarioActual();
  if (usuario === null) {
    return { ok: false, mensaje: 'Tenés que iniciar sesión para reservar', alternativas: [] };
  }

  const cancha = buscarCancha(canchaId);
  if (cancha === null || !cancha.activa) {
    return { ok: false, mensaje: 'Esa cancha no está disponible', alternativas: [] };
  }

  if (!Number.isInteger(cantidadTurnos) || cantidadTurnos < 1 || cantidadTurnos > MAX_TURNOS_CONSECUTIVOS) {
    return {
      ok: false,
      mensaje: 'Podés elegir entre 1 y ' + MAX_TURNOS_CONSECUTIVOS + ' turnos consecutivos por reserva',
      alternativas: horasLibres(canchaId, fecha)
    };
  }

  if (horaInicio < HORA_APERTURA || (horaInicio + cantidadTurnos - 1) > HORA_CIERRE) {
    return {
      ok: false,
      mensaje: 'El rango horario supera el horario de cierre del club (23:00 hs)',
      alternativas: horasLibres(canchaId, fecha)
    };
  }

  const mensajeTomado = cantidadTurnos === 1
    ? 'Ese turno ya fue tomado por otro jugador. Elegí otro horario'
    : 'Alguno de los turnos seleccionados ya fue ocupado. Elegí otro rango horario';

  for (let i = 0; i < cantidadTurnos; i++) {
    const h = horaInicio + i;
    const motivoBloqueo = obtenerMotivoBloqueo(canchaId, fecha, h);
    if (motivoBloqueo !== null) {
      return {
        ok: false,
        mensaje: 'El horario de las ' + formatearHora(h) + ' no está disponible (' + motivoBloqueo + ')',
        alternativas: horasLibres(canchaId, fecha)
      };
    }
    if (turnoYaPaso(fecha, h)) {
      return { ok: false, mensaje: 'Ese turno ya pasó, elegí otro horario', alternativas: horasLibres(canchaId, fecha) };
    }
    if (hayReserva(canchaId, fecha, h)) {
      return { ok: false, mensaje: mensajeTomado, alternativas: horasLibres(canchaId, fecha) };
    }
  }

  const precioUnitario = precioHoraCancha(cancha);
  const reserva = {
    id: nuevoId(obtenerReservas()),
    usuarioId: usuarioOpcionalId ? Number(usuarioOpcionalId) : usuario.id,
    jugadorNombre: usuario.nombre,
    jugadorTelefono: usuario.telefono || '',
    canchaId: canchaId,
    fecha: fecha,
    horaInicio: horaInicio,
    horaFin: horaInicio + cantidadTurnos,
    cantidadTurnos: cantidadTurnos,
    precioTotal: precioUnitario * cantidadTurnos,
    estado: 'confirmada'
  };

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

// ---------- consultas de reservas (ITU-33 e ITU-36) ----------

// devuelve las reservas de un jugador ordenadas por fecha y hora ascendente
function obtenerReservasDeUsuario(usuarioId) {
  return obtenerReservas()
    .filter(function (r) { return r.usuarioId === usuarioId; })
    .sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return a.horaInicio - b.horaInicio;
    });
}

// ITU-36: obtiene todas las reservas filtradas por fecha, cancha y estado para el administrador
function obtenerReservasDelDiaAdmin(fecha, canchaIdFiltro, estadoFiltro) {
  return obtenerReservas()
    .filter(function (r) {
      if (fecha && r.fecha !== fecha) return false;
      if (canchaIdFiltro && Number(canchaIdFiltro) !== 0 && r.canchaId !== Number(canchaIdFiltro)) return false;
      if (estadoFiltro && estadoFiltro !== 'todas' && r.estado !== estadoFiltro) return false;
      return true;
    })
    .sort(function (a, b) {
      if (a.horaInicio !== b.horaInicio) return a.horaInicio - b.horaInicio;
      return a.canchaId - b.canchaId;
    });
}

// devuelve true si la reserva sigue confirmada y su turno todavía no empezó
function esReservaProxima(reserva) {
  return reserva.estado === 'confirmada' && !turnoYaPaso(reserva.fecha, reserva.horaInicio);
}

// ---------- cancelar / eliminar / reactivar reserva (ITU-34 y Admin) ----------

function cancelarReserva(reservaId) {
  const usuario = usuarioActual();
  if (usuario === null) {
    return { ok: false, mensaje: 'Tenés que iniciar sesión para cancelar una reserva' };
  }

  const reserva = buscarReserva(Number(reservaId));
  if (reserva === null) {
    return { ok: false, mensaje: 'La reserva no existe' };
  }

  if (reserva.usuarioId !== usuario.id && usuario.rol !== 'admin') {
    return { ok: false, mensaje: 'Solo podés cancelar tus propias reservas' };
  }

  if (reserva.estado === 'cancelada') {
    return { ok: false, mensaje: 'Esta reserva ya estaba cancelada' };
  }

  if (usuario.rol !== 'admin' && turnoYaPaso(reserva.fecha, reserva.horaInicio)) {
    return { ok: false, mensaje: 'No se puede cancelar un turno que ya comenzó o finalizó' };
  }

  actualizarEstadoReserva(reserva.id, 'cancelada');
  return {
    ok: true,
    mensaje: 'Reserva #' + reserva.id + ' cancelada correctamente. El horario volvió a quedar disponible.'
  };
}

function eliminarReservaDeHistorial(reservaId) {
  const usuario = usuarioActual();
  if (usuario === null) {
    return { ok: false, mensaje: 'Tenés que iniciar sesión' };
  }

  const reserva = buscarReserva(Number(reservaId));
  if (reserva === null) {
    return { ok: false, mensaje: 'La reserva no existe' };
  }

  if (reserva.usuarioId !== usuario.id && usuario.rol !== 'admin') {
    return { ok: false, mensaje: 'Solo podés eliminar tus propias reservas' };
  }

  borrarReservaPorId(reserva.id);
  return { ok: true, mensaje: 'Reserva #' + reserva.id + ' eliminada del sistema.' };
}

// ---------- administración de bloqueos, feriados y horarios reducidos (ITU-37) ----------

// permite bloquear un rango horario, cerrar todo el día (feriado/no laborable)
// o aplicar horario reducido (medio tiempo) en una fecha específica
function registrarBloqueoAdmin(datos) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede bloquear horarios' };
  }

  const canchaId = Number(datos.canchaId); // 0 = Todas las canchas del club
  const fecha = datos.fecha;
  const modo = datos.modo || 'franja'; // 'franja' | 'cerrado' | 'reducido'
  const motivo = (datos.motivo || '').trim() || 'Mantenimiento / Feriado';
  const cancelarConflictos = Boolean(datos.cancelarConflictos);

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, mensaje: 'Elegí una fecha válida' };
  }

  const rangosABloquear = [];

  if (modo === 'cerrado') {
    // Día cerrado completo (08:00 a 23:00 hs)
    rangosABloquear.push({
      horaInicio: HORA_APERTURA,
      horaFin: HORA_CIERRE + 1,
      tipoBloqueo: 'cerrado',
      motivo: 'Cerrado · ' + motivo
    });
  } else if (modo === 'reducido') {
    // Horario reducido: el admin elige de qué hora a qué hora ABRE la cancha ese día
    // y el sistema bloquea las horas anteriores y posteriores automáticamente
    const abre = Number(datos.horaApertura);
    const cierra = Number(datos.horaCierre);
    if (isNaN(abre) || isNaN(cierra) || abre >= cierra || abre < HORA_APERTURA || cierra > HORA_CIERRE + 1) {
      return { ok: false, mensaje: 'El horario de atención reducido debe tener una hora de apertura menor a la de cierre (entre 08:00 y 23:00)' };
    }
    if (abre > HORA_APERTURA) {
      rangosABloquear.push({
        horaInicio: HORA_APERTURA,
        horaFin: abre,
        tipoBloqueo: 'reducido',
        motivo: 'Horario reducido (' + motivo + ': abre ' + formatearHora(abre) + ')'
      });
    }
    if (cierra < HORA_CIERRE + 1) {
      rangosABloquear.push({
        horaInicio: cierra,
        horaFin: HORA_CIERRE + 1,
        tipoBloqueo: 'reducido',
        motivo: 'Horario reducido (' + motivo + ': cierra ' + formatearHora(cierra) + ')'
      });
    }
    if (rangosABloquear.length === 0) {
      return { ok: false, mensaje: 'Elegiste de 08:00 a 23:00 hs, que ya es el horario completo normal' };
    }
  } else {
    // Franja puntual bloqueada (mantenimiento, torneo, clase)
    const ini = Number(datos.horaInicio);
    const fin = Number(datos.horaFin);
    if (isNaN(ini) || isNaN(fin) || ini >= fin || ini < HORA_APERTURA || fin > HORA_CIERRE + 1) {
      return { ok: false, mensaje: 'La hora de fin tiene que ser mayor a la hora de inicio' };
    }
    rangosABloquear.push({
      horaInicio: ini,
      horaFin: fin,
      tipoBloqueo: 'franja',
      motivo: motivo
    });
  }

  // verificamos si hay reservas confirmadas en esos rangos
  const reservas = obtenerReservas();
  const afectadas = reservas.filter(function (r) {
    if (r.fecha !== fecha || r.estado !== 'confirmada') return false;
    if (canchaId !== 0 && r.canchaId !== canchaId) return false;
    const rFin = obtenerHoraFin(r);
    return rangosABloquear.some(function (b) {
      return r.horaInicio < b.horaFin && b.horaInicio < rFin;
    });
  });

  if (afectadas.length > 0 && !cancelarConflictos) {
    return {
      ok: false,
      mensaje: 'Hay ' + afectadas.length + ' reserva(s) confirmada(s) en ese horario. Marcá la opción "Cancelar reservas existentes en el horario bloqueado" si querés aplicar el bloqueo igual.'
    };
  }

  if (afectadas.length > 0 && cancelarConflictos) {
    afectadas.forEach(function (r) {
      actualizarEstadoReserva(r.id, 'cancelada');
    });
  }

  rangosABloquear.forEach(function (rango) {
    guardarBloqueo({
      id: nuevoId(obtenerBloqueos()),
      canchaId: canchaId,
      fecha: fecha,
      horaInicio: rango.horaInicio,
      horaFin: rango.horaFin,
      tipoBloqueo: rango.tipoBloqueo,
      motivo: rango.motivo
    });
  });

  const extraCanceladas = afectadas.length > 0 ? ' (se cancelaron ' + afectadas.length + ' reservas superpuestas)' : '';
  return { ok: true, mensaje: 'Configuración / bloqueo aplicado correctamente' + extraCanceladas + '.' };
}

function eliminarBloqueoAdmin(id) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede quitar bloqueos' };
  }
  const ok = borrarBloqueoPorId(Number(id));
  if (!ok) {
    return { ok: false, mensaje: 'El bloqueo no existe' };
  }
  return { ok: true, mensaje: 'Bloqueo eliminado. El horario volvió a quedar habilitado.' };
}
