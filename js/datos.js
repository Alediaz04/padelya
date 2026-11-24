// datos.js
// Capa de persistencia conectada a Firebase Cloud Firestore
// Incluye dataset realista desde Junio en adelante (10+ turnos diarios, mayor demanda en fines de semana,
// facturación mensual > $10.000.000 y gastos mensuales al 70% incluyendo sueldos de empleados).

const CLAVE_USUARIOS = 'padelya_usuarios';
const CLAVE_CANCHAS = 'padelya_canchas';
const CLAVE_RESERVAS = 'padelya_reservas';
const CLAVE_BLOQUEOS = 'padelya_bloqueos';
const CLAVE_GASTOS = 'padelya_gastos';
const CLAVE_CONFIG_DIAS = 'padelya_config_dias';
const CLAVE_SESION = 'padelya_sesion';
const CLAVE_VERSION_SEED = 'padelya_seed_junio_v3';
const CLAVE_RESERVAS_BORRADAS = 'padelya_reservas_borradas';
const CLAVE_GASTOS_BORRADOS = 'padelya_gastos_borrados';

// Colecciones en Firestore
const COL_USUARIOS = 'usuarios';
const COL_CANCHAS = 'canchas';
const COL_RESERVAS = 'reservas';
const COL_BLOQUEOS = 'bloqueos';
const COL_GASTOS = 'gastos';
const COL_CONFIG = 'configuracion';

// ---------- funciones generales de almacenamiento local ----------

function leerLista(clave) {
  const texto = localStorage.getItem(clave);
  if (texto === null) return [];
  try {
    return JSON.parse(texto);
  } catch (e) {
    return [];
  }
}

function guardarLista(clave, lista) {
  localStorage.setItem(clave, JSON.stringify(lista));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('padelya:datos-actualizados', { detail: { clave: clave } }));
  }
}

function nuevoId(lista) {
  let mayor = 0;
  lista.forEach(function (elemento) {
    if (elemento.id > mayor) mayor = elemento.id;
  });
  return mayor + 1;
}

// ---------- funciones de sincronización hacia Firestore ----------

function firestoreDisponible() {
  return typeof db !== 'undefined' && db !== null;
}

function sincronizarDocFirestore(coleccion, id, datos) {
  if (!firestoreDisponible()) return;
  db.collection(coleccion).doc(String(id)).set(datos, { merge: true })
    .catch(function (error) {
      console.warn('Error guardando en Firestore [' + coleccion + '/' + id + ']:', error);
    });
}

function borrarDocFirestore(coleccion, id) {
  if (!firestoreDisponible()) return;
  db.collection(coleccion).doc(String(id)).delete()
    .catch(function (error) {
      console.warn('Error borrando en Firestore [' + coleccion + '/' + id + ']:', error);
    });
}

// Combina una lista base local con los documentos recibidos desde Firestore sin perder el historial desde Junio
function combinarConBaseLocal(listaLocal, listaRemota, claveBorrados) {
  const borrados = leerLista(claveBorrados || '');
  const mapa = {};
  listaLocal.forEach(function (item) {
    if (borrados.indexOf(item.id) === -1) {
      mapa[item.id] = item;
    }
  });
  listaRemota.forEach(function (item) {
    if (borrados.indexOf(item.id) === -1) {
      mapa[item.id] = item;
    }
  });
  return Object.keys(mapa)
    .map(function (k) { return mapa[k]; })
    .sort(function (a, b) { return a.id - b.id; });
}

// Carga inicial y escucha en tiempo real desde Firestore
function iniciarSincronizacionFirestore(alTerminar) {
  if (!firestoreDisponible()) {
    if (typeof alTerminar === 'function') alTerminar();
    return;
  }

  let coleccionesPendientes = 4;
  function revisarListo() {
    coleccionesPendientes--;
    if (coleccionesPendientes <= 0 && typeof alTerminar === 'function') {
      alTerminar();
    }
  }

  // 1. Canchas
  db.collection(COL_CANCHAS).onSnapshot(function (snapshot) {
    if (!snapshot.empty) {
      const remota = [];
      snapshot.forEach(function (doc) { remota.push(doc.data()); });
      const combinada = combinarConBaseLocal(obtenerCanchas(), remota);
      guardarLista(CLAVE_CANCHAS, combinada);
    } else {
      obtenerCanchas().forEach(function (c) {
        sincronizarDocFirestore(COL_CANCHAS, c.id, c);
      });
    }
    revisarListo();
  }, function (err) {
    console.warn('Snapshot canchas error:', err);
    revisarListo();
  });

  // 2. Usuarios
  db.collection(COL_USUARIOS).onSnapshot(function (snapshot) {
    if (!snapshot.empty) {
      const remota = [];
      snapshot.forEach(function (doc) { remota.push(doc.data()); });
      const combinada = combinarConBaseLocal(obtenerUsuarios(), remota);
      guardarLista(CLAVE_USUARIOS, combinada);
    } else {
      obtenerUsuarios().forEach(function (u) {
        sincronizarDocFirestore(COL_USUARIOS, u.id, u);
      });
    }
    revisarListo();
  }, function (err) {
    console.warn('Snapshot usuarios error:', err);
    revisarListo();
  });

  // 3. Reservas
  db.collection(COL_RESERVAS).onSnapshot(function (snapshot) {
    if (!snapshot.empty) {
      const remota = [];
      snapshot.forEach(function (doc) { remota.push(doc.data()); });
      const combinada = combinarConBaseLocal(obtenerReservas(), remota, CLAVE_RESERVAS_BORRADAS);
      guardarLista(CLAVE_RESERVAS, combinada);
    }
    revisarListo();
  }, function (err) {
    console.warn('Snapshot reservas error:', err);
    revisarListo();
  });

  // 4. Bloqueos
  db.collection(COL_BLOQUEOS).onSnapshot(function (snapshot) {
    if (!snapshot.empty) {
      const lista = [];
      snapshot.forEach(function (doc) { lista.push(doc.data()); });
      lista.sort(function (a, b) { return a.id - b.id; });
      guardarLista(CLAVE_BLOQUEOS, lista);
    }
    revisarListo();
  }, function (err) {
    console.warn('Snapshot bloqueos error:', err);
    revisarListo();
  });

  // 5. Gastos (Finanzas)
  db.collection(COL_GASTOS).onSnapshot(function (snapshot) {
    if (!snapshot.empty) {
      const remota = [];
      snapshot.forEach(function (doc) { remota.push(doc.data()); });
      const combinada = combinarConBaseLocal(obtenerGastos(), remota, CLAVE_GASTOS_BORRADOS);
      guardarLista(CLAVE_GASTOS, combinada);
    }
  }, function (err) {
    console.warn('Snapshot gastos error:', err);
  });

  // 6. Configuración de días
  db.collection(COL_CONFIG).doc('dias_semana').get().then(function (doc) {
    if (doc.exists) {
      guardarConfigDias(doc.data().config);
    } else {
      const def = obtenerConfigDias();
      db.collection(COL_CONFIG).doc('dias_semana').set({ config: def });
    }
  }).catch(function (e) {
    console.warn('Error leyendo config días en Firestore:', e);
  });
}

// ---------- usuarios ----------

function obtenerUsuarios() {
  return leerLista(CLAVE_USUARIOS);
}

function guardarUsuario(usuario) {
  const lista = obtenerUsuarios();
  lista.push(usuario);
  guardarLista(CLAVE_USUARIOS, lista);
  sincronizarDocFirestore(COL_USUARIOS, usuario.id, usuario);
}

function buscarUsuarioPorId(id) {
  const u = obtenerUsuarios().find(function (usuario) {
    return usuario.id === id;
  });
  return u || null;
}

// ---------- canchas (ITU-35) ----------

function obtenerCanchas() {
  return leerLista(CLAVE_CANCHAS);
}

function guardarCancha(cancha) {
  const lista = obtenerCanchas();
  lista.push(cancha);
  guardarLista(CLAVE_CANCHAS, lista);
  sincronizarDocFirestore(COL_CANCHAS, cancha.id, cancha);
}

function actualizarCanchaEnDatos(canchaActualizada) {
  const lista = obtenerCanchas();
  const idx = lista.findIndex(function (c) {
    return c.id === canchaActualizada.id;
  });
  if (idx === -1) return false;
  lista[idx] = canchaActualizada;
  guardarLista(CLAVE_CANCHAS, lista);
  sincronizarDocFirestore(COL_CANCHAS, canchaActualizada.id, canchaActualizada);
  return true;
}

function borrarCanchaPorId(id) {
  const lista = obtenerCanchas();
  const filtrada = lista.filter(function (c) {
    return c.id !== id;
  });
  if (filtrada.length === lista.length) return false;
  guardarLista(CLAVE_CANCHAS, filtrada);
  borrarDocFirestore(COL_CANCHAS, id);
  return true;
}

// ---------- reservas (ITU-33, ITU-34, ITU-36, ITU-53) ----------

function obtenerReservas() {
  return leerLista(CLAVE_RESERVAS);
}

function guardarReserva(reserva) {
  const lista = obtenerReservas();
  const nuevoInicio = reserva.horaInicio;
  const nuevoFin = reserva.horaFin || (reserva.horaInicio + (reserva.cantidadTurnos || 1));

  const repetida = lista.find(function (r) {
    if (r.canchaId !== reserva.canchaId || r.fecha !== reserva.fecha || r.estado !== 'confirmada') {
      return false;
    }
    const rInicio = r.horaInicio;
    const rFin = r.horaFin || (r.horaInicio + (r.cantidadTurnos || 1));
    return rInicio < nuevoFin && nuevoInicio < rFin;
  });
  if (repetida !== undefined) {
    throw new Error('turno repetido');
  }

  // Validación a nivel de datos: el mismo jugador no puede reservar en dos canchas en el mismo horario
  const conflictoUsuario = lista.find(function (r) {
    if (r.usuarioId !== reserva.usuarioId || r.fecha !== reserva.fecha || r.estado !== 'confirmada') {
      return false;
    }
    const rInicio = r.horaInicio;
    const rFin = r.horaFin || (r.horaInicio + (r.cantidadTurnos || 1));
    return rInicio < nuevoFin && nuevoInicio < rFin;
  });
  if (conflictoUsuario !== undefined) {
    throw new Error('usuario con turno superpuesto');
  }

  lista.push(reserva);
  guardarLista(CLAVE_RESERVAS, lista);
  sincronizarDocFirestore(COL_RESERVAS, reserva.id, reserva);
}

function actualizarEstadoReserva(id, nuevoEstado) {
  const lista = obtenerReservas();
  const reserva = lista.find(function (r) {
    return r.id === id;
  });
  if (reserva === undefined) return false;
  reserva.estado = nuevoEstado;
  guardarLista(CLAVE_RESERVAS, lista);
  sincronizarDocFirestore(COL_RESERVAS, reserva.id, reserva);
  return true;
}

function borrarReservaPorId(id) {
  const lista = obtenerReservas();
  const filtrada = lista.filter(function (r) {
    return r.id !== id;
  });
  if (filtrada.length === lista.length) return false;
  const borrados = leerLista(CLAVE_RESERVAS_BORRADAS);
  if (borrados.indexOf(id) === -1) {
    borrados.push(id);
    localStorage.setItem(CLAVE_RESERVAS_BORRADAS, JSON.stringify(borrados));
  }
  guardarLista(CLAVE_RESERVAS, filtrada);
  borrarDocFirestore(COL_RESERVAS, id);
  return true;
}

// ---------- bloqueos y feriados / horarios reducidos (ITU-37) ----------

function obtenerBloqueos() {
  return leerLista(CLAVE_BLOQUEOS);
}

function guardarBloqueo(bloqueo) {
  const lista = obtenerBloqueos();
  lista.push(bloqueo);
  guardarLista(CLAVE_BLOQUEOS, lista);
  sincronizarDocFirestore(COL_BLOQUEOS, bloqueo.id, bloqueo);
}

function borrarBloqueoPorId(id) {
  const lista = obtenerBloqueos();
  const filtrada = lista.filter(function (b) {
    return b.id !== id;
  });
  if (filtrada.length === lista.length) return false;
  guardarLista(CLAVE_BLOQUEOS, filtrada);
  borrarDocFirestore(COL_BLOQUEOS, id);
  return true;
}

// ---------- gastos del club (Módulo Finanzas - Sprint 3) ----------

function obtenerGastos() {
  return leerLista(CLAVE_GASTOS);
}

function guardarGasto(gasto) {
  const lista = obtenerGastos();
  lista.push(gasto);
  guardarLista(CLAVE_GASTOS, lista);
  sincronizarDocFirestore(COL_GASTOS, gasto.id, gasto);
}

function actualizarGastoEnDatos(gastoActualizado) {
  const lista = obtenerGastos();
  const idx = lista.findIndex(function (g) {
    return g.id === gastoActualizado.id;
  });
  if (idx === -1) return false;
  lista[idx] = gastoActualizado;
  guardarLista(CLAVE_GASTOS, lista);
  sincronizarDocFirestore(COL_GASTOS, gastoActualizado.id, gastoActualizado);
  return true;
}

function borrarGastoPorId(id) {
  const lista = obtenerGastos();
  const filtrada = lista.filter(function (g) {
    return g.id !== id;
  });
  if (filtrada.length === lista.length) return false;
  const borrados = leerLista(CLAVE_GASTOS_BORRADOS);
  if (borrados.indexOf(id) === -1) {
    borrados.push(id);
    localStorage.setItem(CLAVE_GASTOS_BORRADOS, JSON.stringify(borrados));
  }
  guardarLista(CLAVE_GASTOS, filtrada);
  borrarDocFirestore(COL_GASTOS, id);
  return true;
}

// ---------- configuración de horario por día de la semana ----------

function configDiasPorDefecto() {
  return {
    0: { nombre: 'Domingo', cerrado: false, apertura: 8, cierre: 22, etiqueta: 'Horario fin de semana (08:00 a 22:00 hs)' },
    1: { nombre: 'Lunes', cerrado: false, apertura: 8, cierre: 23, etiqueta: 'Horario completo' },
    2: { nombre: 'Martes', cerrado: false, apertura: 8, cierre: 23, etiqueta: 'Horario completo' },
    3: { nombre: 'Miércoles', cerrado: false, apertura: 8, cierre: 23, etiqueta: 'Horario completo' },
    4: { nombre: 'Jueves', cerrado: false, apertura: 8, cierre: 23, etiqueta: 'Horario completo' },
    5: { nombre: 'Viernes', cerrado: false, apertura: 8, cierre: 23, etiqueta: 'Horario completo' },
    6: { nombre: 'Sábado', cerrado: false, apertura: 8, cierre: 23, etiqueta: 'Horario completo' }
  };
}

function obtenerConfigDias() {
  const texto = localStorage.getItem(CLAVE_CONFIG_DIAS);
  if (texto === null) {
    const def = configDiasPorDefecto();
    localStorage.setItem(CLAVE_CONFIG_DIAS, JSON.stringify(def));
    return def;
  }
  try {
    return JSON.parse(texto);
  } catch (e) {
    return configDiasPorDefecto();
  }
}

function guardarConfigDias(config) {
  localStorage.setItem(CLAVE_CONFIG_DIAS, JSON.stringify(config));
  if (firestoreDisponible()) {
    db.collection(COL_CONFIG).doc('dias_semana').set({ config: config })
      .catch(function (e) { console.warn('Error guardando config en Firestore:', e); });
  }
}

// ---------- sesión ----------

function obtenerIdSesion() {
  const id = sessionStorage.getItem(CLAVE_SESION);
  if (id === null) return null;
  return Number(id);
}

function guardarIdSesion(id) {
  sessionStorage.setItem(CLAVE_SESION, id);
}

function borrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
}

// ---------- generador realista desde Junio en adelante (> $10M/mes y 70% gastos) ----------

function generarDatasetHistoricoDesdeJunio() {
  const hashJugador = 'ba28916b3193c66d58dd2848c344310c1472752aadb6c98e8d41621d3289cbe2';
  const hashAdmin = '2097dc8a6d3529da276b308110f65452a7aec28b5dfae1a815f924c53c639bae';

  const usuarios = [
    { id: 1, nombre: 'Jugador de Prueba', email: 'jugador@padelya.com', telefono: '+54 9 261 412-3301', passwordHash: hashJugador, rol: 'jugador' },
    { id: 2, nombre: 'Administrador PadelYa', email: 'admin@padelya.com', telefono: '+54 9 261 555-0100', passwordHash: hashAdmin, rol: 'admin' },
    { id: 3, nombre: 'Martín Gómez', email: 'martin.gomez@gmail.com', telefono: '+54 9 261 510-4412', passwordHash: hashJugador, rol: 'jugador' },
    { id: 4, nombre: 'Lucas Fernández', email: 'lucas.fernandez@gmail.com', telefono: '+54 9 261 622-8910', passwordHash: hashJugador, rol: 'jugador' },
    { id: 5, nombre: 'Santiago Quiroga', email: 'santi.quiroga@gmail.com', telefono: '+54 9 261 588-1209', passwordHash: hashJugador, rol: 'jugador' },
    { id: 6, nombre: 'Valentina Sosa', email: 'valen.sosa@gmail.com', telefono: '+54 9 261 341-7723', passwordHash: hashJugador, rol: 'jugador' },
    { id: 7, nombre: 'Nicolás Pereyra', email: 'nico.pereyra@gmail.com', telefono: '+54 9 261 490-5561', passwordHash: hashJugador, rol: 'jugador' },
    { id: 8, nombre: 'Camila Ruíz', email: 'cami.ruiz@gmail.com', telefono: '+54 9 261 671-3348', passwordHash: hashJugador, rol: 'jugador' },
    { id: 9, nombre: 'Facundo Morales', email: 'facu.morales@gmail.com', telefono: '+54 9 261 533-9014', passwordHash: hashJugador, rol: 'jugador' },
    { id: 10, nombre: 'Julián Moyano', email: 'julian.moyano@gmail.com', telefono: '+54 9 261 477-2108', passwordHash: hashJugador, rol: 'jugador' },
    { id: 11, nombre: 'Agustina Lucero', email: 'agus.lucero@gmail.com', telefono: '+54 9 261 592-6481', passwordHash: hashJugador, rol: 'jugador' },
    { id: 12, nombre: 'Matías Orozco', email: 'mati.orozco@gmail.com', telefono: '+54 9 261 604-1195', passwordHash: hashJugador, rol: 'jugador' },
    { id: 13, nombre: 'Franco Villalba', email: 'franco.villalba@gmail.com', telefono: '+54 9 261 518-8832', passwordHash: hashJugador, rol: 'jugador' },
    { id: 14, nombre: 'Sofía Albornoz', email: 'sofi.albornoz@gmail.com', telefono: '+54 9 261 465-7029', passwordHash: hashJugador, rol: 'jugador' }
  ];

  const canchas = [
    { id: 1, nombre: 'Cancha 1', tipo: 'Techada', precioPorHora: 25000, caracteristicas: 'Nave indoor climatizada · Blindex 12mm · Césped sintético · LED', activa: true },
    { id: 2, nombre: 'Cancha 2', tipo: 'Techada', precioPorHora: 25000, caracteristicas: 'Nave indoor climatizada · Blindex 12mm · Césped sintético · LED', activa: true },
    { id: 3, nombre: 'Cancha 3', tipo: 'Descubierta', precioPorHora: 20000, caracteristicas: 'Exterior panorámica · Blindex · Césped sintético · Iluminación LED', activa: true },
    { id: 4, nombre: 'Cancha 4', tipo: 'Techada', precioPorHora: 25000, caracteristicas: 'Cancha Central Indoor · Alfombra WPT Azul · Blindex Panorámico', activa: true }
  ];

  const preciosCancha = { 1: 25000, 2: 25000, 3: 20000, 4: 25000 };
  const jugadoresIds = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  // Plantilla de 10 reservas para días de semana (Lunes a Jueves: 10 reservas = 15 turnos vendidos/día)
  // Ninguna reserva repite horario para el mismo jugador ni en la misma cancha
  const slotsDiaSemana = [
    { canchaId: 1, horaInicio: 9, cant: 2 },
    { canchaId: 1, horaInicio: 18, cant: 2 },
    { canchaId: 1, horaInicio: 20, cant: 2 },
    { canchaId: 2, horaInicio: 10, cant: 1 },
    { canchaId: 2, horaInicio: 17, cant: 2 },
    { canchaId: 2, horaInicio: 19, cant: 2 },
    { canchaId: 3, horaInicio: 16, cant: 1 },
    { canchaId: 3, horaInicio: 18, cant: 1 },
    { canchaId: 4, horaInicio: 15, cant: 1 },
    { canchaId: 4, horaInicio: 21, cant: 1 }
  ];

  // Plantilla de 15 reservas para Viernes y Sábados (Fines de semana con alta ocupación = 23 turnos vendidos/día)
  const slotsFinDeSemana = [
    { canchaId: 1, horaInicio: 9, cant: 2 },
    { canchaId: 1, horaInicio: 11, cant: 2 },
    { canchaId: 1, horaInicio: 17, cant: 2 },
    { canchaId: 1, horaInicio: 19, cant: 2 },
    { canchaId: 2, horaInicio: 8, cant: 2 },
    { canchaId: 2, horaInicio: 14, cant: 2 },
    { canchaId: 2, horaInicio: 18, cant: 2 },
    { canchaId: 2, horaInicio: 20, cant: 1 },
    { canchaId: 3, horaInicio: 10, cant: 1 },
    { canchaId: 3, horaInicio: 15, cant: 2 },
    { canchaId: 3, horaInicio: 19, cant: 1 },
    { canchaId: 4, horaInicio: 9, cant: 1 },
    { canchaId: 4, horaInicio: 12, cant: 1 },
    { canchaId: 4, horaInicio: 16, cant: 1 },
    { canchaId: 4, horaInicio: 21, cant: 1 }
  ];

  // Plantilla de 13 reservas para Domingos (19 turnos vendidos/día)
  const slotsDomingo = [
    { canchaId: 1, horaInicio: 9, cant: 2 },
    { canchaId: 1, horaInicio: 11, cant: 2 },
    { canchaId: 1, horaInicio: 17, cant: 2 },
    { canchaId: 1, horaInicio: 19, cant: 1 },
    { canchaId: 2, horaInicio: 10, cant: 2 },
    { canchaId: 2, horaInicio: 16, cant: 2 },
    { canchaId: 2, horaInicio: 18, cant: 1 },
    { canchaId: 3, horaInicio: 9, cant: 1 },
    { canchaId: 3, horaInicio: 15, cant: 2 },
    { canchaId: 3, horaInicio: 18, cant: 1 },
    { canchaId: 4, horaInicio: 10, cant: 1 },
    { canchaId: 4, horaInicio: 16, cant: 1 },
    { canchaId: 4, horaInicio: 20, cant: 1 }
  ];

  const meses = [
    { anio: 2026, mes: 6, dias: 30, nombre: 'Junio 2026' },
    { anio: 2026, mes: 7, dias: 31, nombre: 'Julio 2026' },
    { anio: 2026, mes: 8, dias: 31, nombre: 'Agosto 2026' },
    { anio: 2026, mes: 9, dias: 30, nombre: 'Septiembre 2026' },
    { anio: 2026, mes: 10, dias: 31, nombre: 'Octubre 2026' },
    { anio: 2026, mes: 11, dias: 30, nombre: 'Noviembre 2026' }
  ];

  const reservas = [];
  const gastos = [];
  let idReserva = 1;
  let idGasto = 1;

  meses.forEach(function (infoMes, idxMes) {
    let ingresosMes = 0;
    const prefijoMes = infoMes.anio + '-' + String(infoMes.mes).padStart(2, '0');

    for (let dia = 1; dia <= infoMes.dias; dia++) {
      const fechaISO = prefijoMes + '-' + String(dia).padStart(2, '0');
      const objFecha = new Date(fechaISO + 'T00:00:00');
      const diaSemana = objFecha.getDay(); // 0 = Dom, 5 = Vie, 6 = Sáb

      let plantilla = slotsDiaSemana;
      if (diaSemana === 5 || diaSemana === 6) {
        plantilla = slotsFinDeSemana;
      } else if (diaSemana === 0) {
        plantilla = slotsDomingo;
      }

      plantilla.forEach(function (slot, idxSlot) {
        // Asignamos un jugador distinto por cada slot del día para que nunca se pisen horarios del mismo jugador
        const idUsuario = jugadoresIds[(dia + idxSlot + idxMes) % jugadoresIds.length];
        const objUsuario = usuarios.find(function (u) { return u.id === idUsuario; });
        const precioTotal = slot.cant * preciosCancha[slot.canchaId];

        ingresosMes += precioTotal;

        reservas.push({
          id: idReserva++,
          usuarioId: idUsuario,
          jugadorNombre: objUsuario ? objUsuario.nombre : 'Jugador #' + idUsuario,
          jugadorTelefono: objUsuario ? objUsuario.telefono : '+54 9 261 555-0199',
          canchaId: slot.canchaId,
          fecha: fechaISO,
          horaInicio: slot.horaInicio,
          horaFin: slot.horaInicio + slot.cant,
          cantidadTurnos: slot.cant,
          precioTotal: precioTotal,
          estado: 'confirmada'
        });
      });
    }

    // Gastos mensuales equivalentes exactamente al 70% de los ingresos de este mes
    const totalGastosMes = Math.round(ingresosMes * 0.70);
    const partidasMes = [
      {
        dia: '05',
        proporcion: 0.25,
        categoria: 'Personal & Sueldos',
        concepto: 'Sueldos mensuales Encargado General y Recepcionistas (' + infoMes.nombre + ')',
        metodoPago: 'Transferencia',
        comprobante: 'Recibo Haberes #' + infoMes.mes + '01'
      },
      {
        dia: '05',
        proporcion: 0.18,
        categoria: 'Personal & Sueldos',
        concepto: 'Sueldos mensuales Cancheros y Personal de Mantenimiento (' + infoMes.nombre + ')',
        metodoPago: 'Transferencia',
        comprobante: 'Recibo Haberes #' + infoMes.mes + '02'
      },
      {
        dia: '07',
        proporcion: 0.12,
        categoria: 'Personal & Sueldos',
        concepto: 'Sueldos Personal Limpieza, Buffet y Cargas Sociales AFIP F.931 (' + infoMes.nombre + ')',
        metodoPago: 'Transferencia',
        comprobante: 'AFIP VEP #' + infoMes.mes + '03'
      },
      {
        dia: '10',
        proporcion: 0.14,
        categoria: 'Impuestos & Alquiler',
        concepto: 'Alquiler mensual predio complejo deportivo y seguro integral (' + infoMes.nombre + ')',
        metodoPago: 'Transferencia',
        comprobante: 'Factura A-00' + infoMes.mes + '10'
      },
      {
        dia: '12',
        proporcion: 0.09,
        categoria: 'Servicios',
        concepto: 'Factura Energía Eléctrica EDEMSA - Iluminación LED naves indoor (' + infoMes.nombre + ')',
        metodoPago: 'Transferencia',
        comprobante: 'EDEMSA #' + infoMes.mes + '442'
      },
      {
        dia: '15',
        proporcion: 0.07,
        categoria: 'Mantenimiento',
        concepto: 'Mantenimiento preventivo césped sintético, arena de sílice y cristales Blindex',
        metodoPago: 'Transferencia',
        comprobante: 'Factura B-00' + infoMes.mes + '18'
      },
      {
        dia: '18',
        proporcion: 0.05,
        categoria: 'Insumos & Pelotas',
        concepto: 'Reposición de cajones de pelotas presurizadas, redes y overgrips',
        metodoPago: 'Tarjeta / Débito',
        comprobante: 'Factura A-00' + infoMes.mes + '25'
      },
      {
        dia: '20',
        proporcion: 0.05,
        categoria: 'Buffet & Bebidas',
        concepto: 'Compra mayorista bebidas isotónicas, aguas minerales y cafetería Buffet',
        metodoPago: 'Transferencia',
        comprobante: 'Distribuidora #' + infoMes.mes + '89'
      },
      {
        dia: '22',
        proporcion: 0.03,
        categoria: 'Impuestos & Alquiler',
        concepto: 'Tasas Municipales, Ingresos Brutos ATM y honorarios contables (' + infoMes.nombre + ')',
        metodoPago: 'Transferencia',
        comprobante: 'ATM #' + infoMes.mes + '71'
      },
      {
        dia: '25',
        proporcion: 0.02,
        categoria: 'Servicios',
        concepto: 'Agua AYSAM, Gas vestuarios e Internet Fibra Óptica Wi-Fi Club',
        metodoPago: 'Tarjeta / Débito',
        comprobante: 'Servicios #' + infoMes.mes + '95'
      }
    ];

    let acumuladoGastos = 0;
    partidasMes.forEach(function (p, idxP) {
      let montoPartida;
      if (idxP === partidasMes.length - 1) {
        // ajuste de redondeo en la última partida para que sume exactamente el 70%
        montoPartida = totalGastosMes - acumuladoGastos;
      } else {
        montoPartida = Math.round(totalGastosMes * p.proporcion);
        acumuladoGastos += montoPartida;
      }

      gastos.push({
        id: idGasto++,
        fecha: prefijoMes + '-' + p.dia,
        concepto: p.concepto,
        categoria: p.categoria,
        metodoPago: p.metodoPago,
        monto: montoPartida,
        comprobante: p.comprobante
      });
    });
  });

  return {
    usuarios: usuarios,
    canchas: canchas,
    reservas: reservas,
    gastos: gastos
  };
}

function cargarDatosIniciales() {
  if (localStorage.getItem(CLAVE_CONFIG_DIAS) === null) {
    guardarConfigDias(configDiasPorDefecto());
  }

  // Si todavía no se aplicó el seed histórico desde Junio v3, lo generamos y guardamos
  if (localStorage.getItem(CLAVE_VERSION_SEED) !== 'true') {
    const dataset = generarDatasetHistoricoDesdeJunio();
    guardarLista(CLAVE_USUARIOS, dataset.usuarios);
    guardarLista(CLAVE_CANCHAS, dataset.canchas);
    guardarLista(CLAVE_RESERVAS, dataset.reservas);
    guardarLista(CLAVE_GASTOS, dataset.gastos);
    localStorage.setItem(CLAVE_RESERVAS_BORRADAS, JSON.stringify([]));
    localStorage.setItem(CLAVE_GASTOS_BORRADOS, JSON.stringify([]));
    localStorage.setItem(CLAVE_VERSION_SEED, 'true');

    // Sincronizamos usuarios, canchas y los 60 gastos mensuales a Firestore
    dataset.usuarios.forEach(function (u) {
      sincronizarDocFirestore(COL_USUARIOS, u.id, u);
    });
    dataset.canchas.forEach(function (c) {
      sincronizarDocFirestore(COL_CANCHAS, c.id, c);
    });
    dataset.gastos.forEach(function (g) {
      sincronizarDocFirestore(COL_GASTOS, g.id, g);
    });
  }

  if (localStorage.getItem(CLAVE_BLOQUEOS) === null) {
    const hoy = hoyISO();
    const bloqueosIni = [
      {
        id: 1,
        canchaId: 3,
        fecha: hoy,
        horaInicio: 13,
        horaFin: 15,
        tipoBloqueo: 'franja',
        motivo: 'Mantenimiento preventivo de iluminación LED'
      }
    ];
    guardarLista(CLAVE_BLOQUEOS, bloqueosIni);
    bloqueosIni.forEach(function (b) {
      sincronizarDocFirestore(COL_BLOQUEOS, b.id, b);
    });
  }
}

function reiniciarDatos() {
  localStorage.clear();
  sessionStorage.clear();
  cargarDatosIniciales();
}

// Carga inicial local y arranque de sincronización con Firestore
cargarDatosIniciales();
iniciarSincronizacionFirestore();
