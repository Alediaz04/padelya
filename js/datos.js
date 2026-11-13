// datos.js
// Capa de persistencia conectada a Firebase Cloud Firestore
// con sincronización transparente a localStorage para rendimiento instantáneo y modo offline.

const CLAVE_USUARIOS = 'padelya_usuarios';
const CLAVE_CANCHAS = 'padelya_canchas';
const CLAVE_RESERVAS = 'padelya_reservas';
const CLAVE_BLOQUEOS = 'padelya_bloqueos';
const CLAVE_CONFIG_DIAS = 'padelya_config_dias';
const CLAVE_SESION = 'padelya_sesion';

// Colecciones en Firestore
const COL_USUARIOS = 'usuarios';
const COL_CANCHAS = 'canchas';
const COL_RESERVAS = 'reservas';
const COL_BLOQUEOS = 'bloqueos';
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
      const lista = [];
      snapshot.forEach(function (doc) {
        lista.push(doc.data());
      });
      lista.sort(function (a, b) { return a.id - b.id; });
      guardarLista(CLAVE_CANCHAS, lista);
    } else {
      // si Firestore está vacío cargamos las canchas iniciales a Firestore
      const canchasLocales = obtenerCanchas();
      canchasLocales.forEach(function (c) {
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
      const lista = [];
      snapshot.forEach(function (doc) {
        lista.push(doc.data());
      });
      lista.sort(function (a, b) { return a.id - b.id; });
      guardarLista(CLAVE_USUARIOS, lista);
    } else {
      const usuariosLocales = obtenerUsuarios();
      usuariosLocales.forEach(function (u) {
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
      const lista = [];
      snapshot.forEach(function (doc) {
        lista.push(doc.data());
      });
      lista.sort(function (a, b) { return a.id - b.id; });
      guardarLista(CLAVE_RESERVAS, lista);
    } else {
      const reservasLocales = obtenerReservas();
      reservasLocales.forEach(function (r) {
        sincronizarDocFirestore(COL_RESERVAS, r.id, r);
      });
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
      snapshot.forEach(function (doc) {
        lista.push(doc.data());
      });
      lista.sort(function (a, b) { return a.id - b.id; });
      guardarLista(CLAVE_BLOQUEOS, lista);
    } else {
      const bloqueosLocales = obtenerBloqueos();
      bloqueosLocales.forEach(function (b) {
        sincronizarDocFirestore(COL_BLOQUEOS, b.id, b);
      });
    }
    revisarListo();
  }, function (err) {
    console.warn('Snapshot bloqueos error:', err);
    revisarListo();
  });

  // 5. Configuración de días
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

// ---------- reservas (ITU-33, ITU-34, ITU-36) ----------

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

// ---------- configuración de horario por día de la semana ----------

function configDiasPorDefecto() {
  return {
    0: { nombre: 'Domingo', cerrado: false, apertura: 9, cierre: 14, etiqueta: 'Medio tiempo (09:00 a 14:00 hs)' },
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

// ---------- datos iniciales ----------

function asegurarUsuariosDePrueba() {
  const usuarios = obtenerUsuarios();
  let modificado = false;

  // Hashes SHA-256 precalculados para 123456 y admin123
  // de forma que nunca se almacene la contraseña en texto plano
  const hashJugador = '5ea6198f7e2d93ee3000b9576bb5ff64db9f2e3be75e5b0cb59f08ea730ca781';
  const hashAdmin = '918bf0a0c4f1c9fe34fec8b7fc9f62ebefbe60a3dcda38e2ea55c8c67c5e5330';

  const idxJugador = usuarios.findIndex(function (u) { return u.email === 'jugador@padelya.com'; });
  if (idxJugador === -1) {
    const nuevoJ = {
      id: nuevoId(usuarios),
      nombre: 'Jugador de Prueba',
      email: 'jugador@padelya.com',
      passwordHash: hashJugador,
      rol: 'jugador'
    };
    usuarios.push(nuevoJ);
    sincronizarDocFirestore(COL_USUARIOS, nuevoJ.id, nuevoJ);
    modificado = true;
  } else if (!usuarios[idxJugador].passwordHash) {
    delete usuarios[idxJugador].password;
    usuarios[idxJugador].passwordHash = hashJugador;
    sincronizarDocFirestore(COL_USUARIOS, usuarios[idxJugador].id, usuarios[idxJugador]);
    modificado = true;
  }

  const idxAdmin = usuarios.findIndex(function (u) { return u.email === 'admin@padelya.com'; });
  if (idxAdmin === -1) {
    const nuevoA = {
      id: nuevoId(usuarios),
      nombre: 'Administrador PadelYa',
      email: 'admin@padelya.com',
      passwordHash: hashAdmin,
      rol: 'admin'
    };
    usuarios.push(nuevoA);
    sincronizarDocFirestore(COL_USUARIOS, nuevoA.id, nuevoA);
    modificado = true;
  } else if (!usuarios[idxAdmin].passwordHash) {
    delete usuarios[idxAdmin].password;
    usuarios[idxAdmin].passwordHash = hashAdmin;
    sincronizarDocFirestore(COL_USUARIOS, usuarios[idxAdmin].id, usuarios[idxAdmin]);
    modificado = true;
  }

  if (modificado) {
    guardarLista(CLAVE_USUARIOS, usuarios);
  }
}

function cargarDatosIniciales() {
  asegurarUsuariosDePrueba();

  if (localStorage.getItem(CLAVE_CONFIG_DIAS) === null) {
    guardarConfigDias(configDiasPorDefecto());
  }

  if (localStorage.getItem(CLAVE_CANCHAS) === null || obtenerCanchas().length === 0) {
    const canchasIni = [
      { id: 1, nombre: 'Cancha 1', tipo: 'Techada', precioPorHora: 25000, activa: true },
      { id: 2, nombre: 'Cancha 2', tipo: 'Techada', precioPorHora: 25000, activa: true },
      { id: 3, nombre: 'Cancha 3', tipo: 'Descubierta', precioPorHora: 20000, activa: true },
      { id: 4, nombre: 'Cancha 4', tipo: 'Descubierta', precioPorHora: 20000, activa: false }
    ];
    guardarLista(CLAVE_CANCHAS, canchasIni);
    canchasIni.forEach(function (c) {
      sincronizarDocFirestore(COL_CANCHAS, c.id, c);
    });
  }

  if (localStorage.getItem(CLAVE_RESERVAS) === null) {
    const hoy = hoyISO();
    const manana = sumarDias(hoy, 1);
    const reservasIni = [
      { id: 1, usuarioId: 1, canchaId: 1, fecha: hoy, horaInicio: 20, horaFin: 22, cantidadTurnos: 2, precioTotal: 50000, estado: 'confirmada' },
      { id: 2, usuarioId: 1, canchaId: 1, fecha: manana, horaInicio: 18, horaFin: 20, cantidadTurnos: 2, precioTotal: 50000, estado: 'confirmada' },
      { id: 3, usuarioId: 1, canchaId: 2, fecha: manana, horaInicio: 19, horaFin: 20, cantidadTurnos: 1, precioTotal: 25000, estado: 'confirmada' },
      { id: 4, usuarioId: 1, canchaId: 3, fecha: manana, horaInicio: 21, horaFin: 22, cantidadTurnos: 1, precioTotal: 20000, estado: 'confirmada' }
    ];
    guardarLista(CLAVE_RESERVAS, reservasIni);
    reservasIni.forEach(function (r) {
      sincronizarDocFirestore(COL_RESERVAS, r.id, r);
    });
  }

  if (localStorage.getItem(CLAVE_BLOQUEOS) === null) {
    const hoy = hoyISO();
    const bloqueosIni = [
      {
        id: 1,
        canchaId: 2,
        fecha: hoy,
        horaInicio: 14,
        horaFin: 16,
        tipoBloqueo: 'franja',
        motivo: 'Mantenimiento de iluminación LED'
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
