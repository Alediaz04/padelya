// canchas.js
// funciones para trabajar con las canchas, precios y CRUD de administrador (PB-03 e ITU-35)

const PRECIO_TECHADA = 25000;
const PRECIO_DESCUBIERTA = 20000;

// devuelve el precio por turno (1 hora) según la cancha
function precioHoraCancha(cancha) {
  if (!cancha) return PRECIO_DESCUBIERTA;
  if (typeof cancha.precioPorHora === 'number' && cancha.precioPorHora > 0) {
    return cancha.precioPorHora;
  }
  return cancha.tipo === 'Techada' ? PRECIO_TECHADA : PRECIO_DESCUBIERTA;
}

// solo las canchas activas, que son las que se pueden reservar
function canchasActivas() {
  return obtenerCanchas().filter(function (cancha) {
    return cancha.activa;
  });
}

// busca una cancha por id, devuelve null si no existe
function buscarCancha(id) {
  const cancha = obtenerCanchas().find(function (c) {
    return c.id === id;
  });
  return cancha || null;
}

// ---------- administración de canchas (ITU-35: crear, editar, eliminar) ----------

function crearCanchaAdmin(nombre, tipo, precioPorHora, caracteristicas, activa) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede crear canchas' };
  }

  nombre = (nombre || '').trim();
  tipo = (tipo || '').trim();
  caracteristicas = (caracteristicas || '').trim();

  if (nombre === '') {
    return { ok: false, mensaje: 'Ingresá el nombre de la cancha' };
  }
  if (!tipo) {
    return { ok: false, mensaje: 'Ingresá o seleccioná el tipo de cancha' };
  }

  const precioNum = Number(precioPorHora);
  const precioFinal = (!isNaN(precioNum) && precioNum > 0)
    ? precioNum
    : (tipo.toLowerCase().includes('tech') ? PRECIO_TECHADA : PRECIO_DESCUBIERTA);

  const canchas = obtenerCanchas();
  const repetida = canchas.some(function (c) {
    return c.nombre.toLowerCase() === nombre.toLowerCase();
  });
  if (repetida) {
    return { ok: false, mensaje: 'Ya existe una cancha con ese nombre' };
  }

  const nueva = {
    id: nuevoId(canchas),
    nombre: nombre,
    tipo: tipo,
    precioPorHora: precioFinal,
    caracteristicas: caracteristicas || 'Blindex · Césped sintético · Iluminación LED',
    activa: activa !== undefined ? Boolean(activa) : true
  };

  guardarCancha(nueva);
  return { ok: true, cancha: nueva, mensaje: 'Cancha "' + nueva.nombre + '" creada correctamente' };
}

function editarCanchaAdmin(id, nombre, tipo, precioPorHora, caracteristicas, activa) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede editar canchas' };
  }

  const actual = buscarCancha(Number(id));
  if (actual === null) {
    return { ok: false, mensaje: 'La cancha que querés editar no existe' };
  }

  nombre = (nombre || '').trim();
  tipo = (tipo || '').trim();
  caracteristicas = (caracteristicas || '').trim();

  if (nombre === '') {
    return { ok: false, mensaje: 'El nombre de la cancha no puede quedar vacío' };
  }
  if (!tipo) {
    return { ok: false, mensaje: 'El tipo de cancha no puede quedar vacío' };
  }

  const repetida = obtenerCanchas().some(function (c) {
    return c.id !== actual.id && c.nombre.toLowerCase() === nombre.toLowerCase();
  });
  if (repetida) {
    return { ok: false, mensaje: 'Ya existe otra cancha con ese nombre' };
  }

  const precioNum = Number(precioPorHora);
  const precioFinal = (!isNaN(precioNum) && precioNum > 0)
    ? precioNum
    : (tipo.toLowerCase().includes('tech') ? PRECIO_TECHADA : PRECIO_DESCUBIERTA);

  const actualizada = {
    id: actual.id,
    nombre: nombre,
    tipo: tipo,
    precioPorHora: precioFinal,
    caracteristicas: caracteristicas || actual.caracteristicas || 'Blindex · Césped sintético · Iluminación LED',
    activa: Boolean(activa)
  };

  actualizarCanchaEnDatos(actualizada);
  return { ok: true, cancha: actualizada, mensaje: 'Cancha "' + actualizada.nombre + '" actualizada correctamente' };
}

function alternarEstadoCanchaAdmin(id) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede modificar canchas' };
  }
  const actual = buscarCancha(Number(id));
  if (actual === null) {
    return { ok: false, mensaje: 'La cancha no existe' };
  }
  actual.activa = !actual.activa;
  actualizarCanchaEnDatos(actual);
  return {
    ok: true,
    cancha: actual,
    mensaje: actual.nombre + (actual.activa ? ' quedó ACTIVA y disponible para reservar.' : ' quedó INACTIVA (oculta para nuevas reservas).')
  };
}

function eliminarCanchaAdmin(id) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede eliminar canchas' };
  }
  const numId = Number(id);
  const actual = buscarCancha(numId);
  if (actual === null) {
    return { ok: false, mensaje: 'La cancha no existe' };
  }

  // cancelamos reservas futuras confirmadas de esa cancha si existieran
  const reservas = obtenerReservas();
  reservas.forEach(function (r) {
    if (r.canchaId === numId && r.estado === 'confirmada') {
      actualizarEstadoReserva(r.id, 'cancelada');
    }
  });

  borrarCanchaPorId(numId);
  return { ok: true, mensaje: 'Cancha "' + actual.nombre + '" eliminada del sistema.' };
}
