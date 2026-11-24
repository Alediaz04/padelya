// finanzas.js
// Lógica de negocio del Panel de Finanzas (Sprint 3):
// gestión de gastos por categoría descriptiva, cálculo de ingresos por reservas,
// descuento automático de gastos sobre ingresos (balance neto) y flujo de caja.

const CLAVE_CATEGORIAS_EXTRA = 'padelya_categorias_gastos_extra';

const CATEGORIAS_BASE = [
  { id: 'Servicios', etiqueta: '💡 Servicios (Luz, Agua, Internet)', icono: '💡', color: '#3b82f6' },
  { id: 'Insumos & Pelotas', etiqueta: '🎾 Insumos & Pelotas', icono: '🎾', color: '#10b981' },
  { id: 'Mantenimiento', etiqueta: '🛠️ Mantenimiento de Canchas', icono: '🛠️', color: '#f59e0b' },
  { id: 'Personal & Sueldos', etiqueta: '👥 Personal & Recepción', icono: '👥', color: '#8b5cf6' },
  { id: 'Buffet & Bebidas', etiqueta: '🥤 Buffet & Bebidas', icono: '🥤', color: '#ec4899' },
  { id: 'Impuestos & Alquiler', etiqueta: '🏛️ Impuestos & Tasas', icono: '🏛️', color: '#64748b' },
  { id: 'Otros', etiqueta: '📌 Otros Gastos', icono: '📌', color: '#0f172a' }
];

// devuelve todas las categorías disponibles (las base + las personalizadas que agregue el admin)
function obtenerCategoriasGastos() {
  const extras = leerLista(CLAVE_CATEGORIAS_EXTRA);
  const todas = CATEGORIAS_BASE.slice();
  extras.forEach(function (nombreExtra) {
    const existe = todas.some(function (c) {
      return c.id.toLowerCase() === nombreExtra.toLowerCase();
    });
    if (!existe) {
      todas.push({
        id: nombreExtra,
        etiqueta: '🏷️ ' + nombreExtra,
        icono: '🏷️',
        color: '#0d9488'
      });
    }
  });
  return todas;
}

function agregarCategoriaGastoPersonalizada(nombre) {
  nombre = (nombre || '').trim();
  if (!nombre) return { ok: false, mensaje: 'Ingresá un nombre para la categoría' };

  const actuales = obtenerCategoriasGastos();
  const repetida = actuales.some(function (c) {
    return c.id.toLowerCase() === nombre.toLowerCase();
  });
  if (repetida) {
    return { ok: false, mensaje: 'Esa categoría ya existe en el listado' };
  }

  const extras = leerLista(CLAVE_CATEGORIAS_EXTRA);
  extras.push(nombre);
  guardarLista(CLAVE_CATEGORIAS_EXTRA, extras);
  return { ok: true, categoria: nombre, mensaje: 'Categoría "' + nombre + '" agregada correctamente.' };
}

function infoCategoria(nombreCategoria) {
  const encontrada = obtenerCategoriasGastos().find(function (c) {
    return c.id === nombreCategoria;
  });
  return encontrada || { id: nombreCategoria || 'Otros', etiqueta: '🏷️ ' + (nombreCategoria || 'Otros'), icono: '🏷️', color: '#64748b' };
}

// ---------- CRUD de gastos ----------

function buscarGasto(id) {
  const g = obtenerGastos().find(function (item) {
    return item.id === Number(id);
  });
  return g || null;
}

function registrarGastoAdmin(datos) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede registrar gastos' };
  }

  const concepto = (datos.concepto || '').trim();
  const categoria = (datos.categoria || '').trim();
  const fecha = datos.fecha || hoyISO();
  const metodoPago = (datos.metodoPago || 'Efectivo / Caja').trim();
  const comprobante = (datos.comprobante || '').trim();
  const monto = Number(datos.monto);

  if (!concepto) {
    return { ok: false, mensaje: 'Ingresá una descripción o concepto del gasto' };
  }
  if (!categoria) {
    return { ok: false, mensaje: 'Seleccioná una categoría descriptiva para el gasto' };
  }
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, mensaje: 'Seleccioná una fecha válida' };
  }
  if (isNaN(monto) || monto < 1 || monto > 100000000) {
    return { ok: false, mensaje: 'El monto del gasto debe estar entre $1 y $100.000.000' };
  }

  const nuevo = {
    id: nuevoId(obtenerGastos()),
    fecha: fecha,
    concepto: concepto,
    categoria: categoria,
    metodoPago: metodoPago,
    comprobante: comprobante,
    monto: Math.round(monto)
  };

  guardarGasto(nuevo);
  return {
    ok: true,
    gasto: nuevo,
    mensaje: 'Gasto "' + nuevo.concepto + '" por ' + formatearPrecio(nuevo.monto) + ' registrado y descontado del balance.'
  };
}

function editarGastoAdmin(id, datos) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede editar gastos' };
  }

  const actual = buscarGasto(id);
  if (actual === null) {
    return { ok: false, mensaje: 'El gasto que intentás editar no existe' };
  }

  const concepto = (datos.concepto || '').trim();
  const categoria = (datos.categoria || '').trim();
  const fecha = datos.fecha || actual.fecha;
  const metodoPago = (datos.metodoPago || actual.metodoPago || 'Efectivo / Caja').trim();
  const comprobante = (datos.comprobante || '').trim();
  const monto = Number(datos.monto);

  if (!concepto) {
    return { ok: false, mensaje: 'La descripción del gasto no puede quedar vacía' };
  }
  if (!categoria) {
    return { ok: false, mensaje: 'Seleccioná una categoría descriptiva' };
  }
  if (isNaN(monto) || monto < 1 || monto > 100000000) {
    return { ok: false, mensaje: 'El monto del gasto debe estar entre $1 y $100.000.000' };
  }

  const actualizado = {
    id: actual.id,
    fecha: fecha,
    concepto: concepto,
    categoria: categoria,
    metodoPago: metodoPago,
    comprobante: comprobante,
    monto: Math.round(monto)
  };

  actualizarGastoEnDatos(actualizado);
  return {
    ok: true,
    gasto: actualizado,
    mensaje: 'Gasto #' + actualizado.id + ' actualizado correctamente.'
  };
}

function eliminarGastoAdmin(id) {
  if (!esAdminActual()) {
    return { ok: false, mensaje: 'Solo el administrador puede eliminar gastos' };
  }
  const actual = buscarGasto(id);
  if (actual === null) {
    return { ok: false, mensaje: 'El gasto no existe' };
  }
  borrarGastoPorId(actual.id);
  return {
    ok: true,
    mensaje: 'Gasto "' + actual.concepto + '" eliminado. El monto fue restituido al balance neto.'
  };
}

// ---------- períodos y cálculo de balance financiero ----------

// devuelve { desde, hasta, etiqueta } según el período seleccionado
function obtenerRangoPeriodo(periodo, desdeCustom, hastaCustom) {
  const hoy = hoyISO();
  const ahora = new Date(hoy + 'T00:00:00');

  if (periodo === 'hoy') {
    return { desde: hoy, hasta: hoy, etiqueta: 'Hoy (' + formatearFecha(hoy) + ')' };
  }

  if (periodo === 'semana') {
    // semana actual (desde hace 6 días hasta mañana para incluir reservas próximas inmediatas)
    const inicioSemana = sumarDias(hoy, -6);
    const finSemana = sumarDias(hoy, 1);
    return {
      desde: inicioSemana,
      hasta: finSemana,
      etiqueta: 'Últimos 7 días y turnos próximos (' + inicioSemana + ' al ' + finSemana + ')'
    };
  }

  if (periodo === 'mes') {
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const ultimoDia = new Date(anio, ahora.getMonth() + 1, 0).getDate();
    const desdeMes = anio + '-' + mes + '-01';
    const hastaMes = anio + '-' + mes + '-' + String(ultimoDia).padStart(2, '0');
    return {
      desde: desdeMes,
      hasta: hastaMes,
      etiqueta: 'Mes actual (' + desdeMes + ' al ' + hastaMes + ')'
    };
  }

  if (periodo === 'anio') {
    const anio = ahora.getFullYear();
    return {
      desde: anio + '-01-01',
      hasta: anio + '-12-31',
      etiqueta: 'Año ' + anio + ' completo'
    };
  }

  if (periodo === 'personalizado' && desdeCustom && hastaCustom) {
    return {
      desde: desdeCustom <= hastaCustom ? desdeCustom : hastaCustom,
      hasta: desdeCustom <= hastaCustom ? hastaCustom : desdeCustom,
      etiqueta: 'Período del ' + desdeCustom + ' al ' + hastaCustom
    };
  }

  // 'todo' (histórico completo)
  return {
    desde: '2020-01-01',
    hasta: '2035-12-31',
    etiqueta: 'Histórico completo acumulado'
  };
}

// calcula ingresos por reservas confirmadas, gastos por categoría y ganancia neta (ingresos - gastos)
function calcularBalanceFinanciero(desde, hasta, categoriaFiltro, busquedaTexto) {
  const canchas = obtenerCanchas();
  const mapaCanchas = {};
  canchas.forEach(function (c) {
    mapaCanchas[c.id] = {
      cancha: c,
      ingresos: 0,
      reservas: 0,
      horas: 0
    };
  });

  // 1. Ingresos de reservas confirmadas dentro del rango [desde, hasta]
  const reservasConfirmadas = obtenerReservas().filter(function (r) {
    if (r.estado !== 'confirmada') return false;
    if (desde && r.fecha < desde) return false;
    if (hasta && r.fecha > hasta) return false;
    return true;
  });

  let ingresosBrutos = 0;
  let totalHorasVendidas = 0;
  const movimientos = [];

  reservasConfirmadas.forEach(function (r) {
    const cancha = buscarCancha(r.canchaId);
    const monto = obtenerPrecioReserva(r, cancha);
    const horas = obtenerCantidadTurnos(r);
    const jugador = buscarUsuarioPorId(r.usuarioId);
    const nombreJugador = jugador ? jugador.nombre : (r.jugadorNombre || 'Jugador #' + r.usuarioId);

    ingresosBrutos += monto;
    totalHorasVendidas += horas;

    if (!mapaCanchas[r.canchaId]) {
      mapaCanchas[r.canchaId] = {
        cancha: { id: r.canchaId, nombre: 'Cancha #' + r.canchaId, tipo: 'Techada' },
        ingresos: 0,
        reservas: 0,
        horas: 0
      };
    }
    mapaCanchas[r.canchaId].ingresos += monto;
    mapaCanchas[r.canchaId].reservas += 1;
    mapaCanchas[r.canchaId].horas += horas;

    movimientos.push({
      tipo: 'ingreso',
      id: r.id,
      fecha: r.fecha,
      concepto: 'Reserva #' + r.id + ' · ' + (cancha ? cancha.nombre : 'Cancha #' + r.canchaId) + ' (' + formatearHora(r.horaInicio) + ' a ' + formatearHora(obtenerHoraFin(r)) + ')',
      categoria: cancha ? cancha.tipo : 'Turnos',
      responsable: nombreJugador,
      monto: monto
    });
  });

  // 2. Gastos registrados dentro del rango [desde, hasta]
  const todosGastosPeriodo = obtenerGastos().filter(function (g) {
    if (desde && g.fecha < desde) return false;
    if (hasta && g.fecha > hasta) return false;
    return true;
  });

  let gastosTotales = 0;
  const mapaCategorias = {};

  todosGastosPeriodo.forEach(function (g) {
    const monto = Number(g.monto) || 0;
    gastosTotales += monto;

    const cat = g.categoria || 'Otros';
    if (!mapaCategorias[cat]) {
      mapaCategorias[cat] = {
        categoria: cat,
        info: infoCategoria(cat),
        monto: 0,
        cantidad: 0
      };
    }
    mapaCategorias[cat].monto += monto;
    mapaCategorias[cat].cantidad += 1;

    movimientos.push({
      tipo: 'gasto',
      id: g.id,
      fecha: g.fecha,
      concepto: g.concepto,
      categoria: cat,
      responsable: g.metodoPago + (g.comprobante ? ' · ' + g.comprobante : ''),
      monto: monto
    });
  });

  // 3. Filtrado específico para la tabla de gastos (por categoría y texto de búsqueda)
  const textoFiltro = (busquedaTexto || '').trim().toLowerCase();
  const gastosFiltrados = todosGastosPeriodo
    .filter(function (g) {
      if (categoriaFiltro && categoriaFiltro !== 'todas' && g.categoria !== categoriaFiltro) {
        return false;
      }
      if (textoFiltro) {
        const coincide =
          (g.concepto || '').toLowerCase().includes(textoFiltro) ||
          (g.categoria || '').toLowerCase().includes(textoFiltro) ||
          (g.comprobante || '').toLowerCase().includes(textoFiltro);
        if (!coincide) return false;
      }
      return true;
    })
    .sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha > b.fecha ? -1 : 1;
      return b.id - a.id;
    });

  // 4. Desglose de gastos por categoría con porcentajes
  const gastosPorCategoria = Object.keys(mapaCategorias)
    .map(function (clave) {
      const item = mapaCategorias[clave];
      return {
        categoria: item.categoria,
        info: item.info,
        monto: item.monto,
        cantidad: item.cantidad,
        porcentajeSobreGastos: gastosTotales > 0 ? Math.round((item.monto / gastosTotales) * 100) : 0,
        porcentajeSobreIngresos: ingresosBrutos > 0 ? Math.round((item.monto / ingresosBrutos) * 100) : 0
      };
    })
    .sort(function (a, b) {
      return b.monto - a.monto;
    });

  // 5. Desglose de ingresos por cancha
  const ingresosPorCancha = Object.keys(mapaCanchas)
    .map(function (id) {
      const item = mapaCanchas[id];
      return {
        cancha: item.cancha,
        ingresos: item.ingresos,
        reservas: item.reservas,
        horas: item.horas,
        porcentaje: ingresosBrutos > 0 ? Math.round((item.ingresos / ingresosBrutos) * 100) : 0
      };
    })
    .sort(function (a, b) {
      return b.ingresos - a.ingresos;
    });

  // 6. Balance neto (Ingresos menos Gastos) y margen
  const balanceNeto = ingresosBrutos - gastosTotales;
  const margenRentabilidad = ingresosBrutos > 0
    ? Math.round((balanceNeto / ingresosBrutos) * 100)
    : (gastosTotales > 0 ? -100 : 0);

  movimientos.sort(function (a, b) {
    if (a.fecha !== b.fecha) return a.fecha > b.fecha ? -1 : 1;
    return b.id - a.id;
  });

  return {
    ingresosBrutos: ingresosBrutos,
    cantidadReservas: reservasConfirmadas.length,
    totalHorasVendidas: totalHorasVendidas,
    gastosTotales: gastosTotales,
    cantidadGastos: todosGastosPeriodo.length,
    balanceNeto: balanceNeto,
    margenRentabilidad: margenRentabilidad,
    gastosFiltrados: gastosFiltrados,
    gastosPorCategoria: gastosPorCategoria,
    ingresosPorCancha: ingresosPorCancha,
    movimientos: movimientos
  };
}

