// datos.js
// Acá se guardan y se leen todos los datos. Por ahora usamos localStorage
// porque todavía no tenemos servidor ni base de datos.
// Es el único archivo que toca el localStorage, así que si más adelante usamos
// una base de datos de verdad habría que cambiar solamente este archivo.

const CLAVE_USUARIOS = 'padelya_usuarios';
const CLAVE_CANCHAS = 'padelya_canchas';
const CLAVE_RESERVAS = 'padelya_reservas';
const CLAVE_SESION = 'padelya_sesion';

// ---------- funciones generales ----------

function leerLista(clave) {
  const texto = localStorage.getItem(clave);
  if (texto === null) return [];
  return JSON.parse(texto);
}

function guardarLista(clave, lista) {
  localStorage.setItem(clave, JSON.stringify(lista));
}

// el id nuevo es el más grande que haya + 1 (como un autoincrement)
function nuevoId(lista) {
  let mayor = 0;
  lista.forEach(function (elemento) {
    if (elemento.id > mayor) mayor = elemento.id;
  });
  return mayor + 1;
}

// ---------- usuarios ----------

function obtenerUsuarios() {
  return leerLista(CLAVE_USUARIOS);
}

function guardarUsuario(usuario) {
  const lista = obtenerUsuarios();
  lista.push(usuario);
  guardarLista(CLAVE_USUARIOS, lista);
}

// ---------- canchas ----------

function obtenerCanchas() {
  return leerLista(CLAVE_CANCHAS);
}

// ---------- reservas ----------

function obtenerReservas() {
  return leerLista(CLAVE_RESERVAS);
}

function guardarReserva(reserva) {
  const lista = obtenerReservas();

  // misma regla que pondría la base de datos con un UNIQUE (cancha + fecha + hora):
  // si ya hay una reserva confirmada en ese turno, no se guarda
  const repetida = lista.find(function (r) {
    return r.canchaId === reserva.canchaId && r.fecha === reserva.fecha &&
           r.horaInicio === reserva.horaInicio && r.estado === 'confirmada';
  });
  if (repetida !== undefined) {
    throw new Error('turno repetido');
  }

  lista.push(reserva);
  guardarLista(CLAVE_RESERVAS, lista);
}

// ---------- sesión ----------
// la sesión va en sessionStorage, así se borra sola cuando se cierra la pestaña
// (y además podemos tener dos jugadores distintos en dos pestañas para probar)

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

// ---------- datos de prueba ----------

function cargarDatosIniciales() {
  // si ya hay canchas guardadas no hacemos nada
  if (localStorage.getItem(CLAVE_CANCHAS) !== null) return;

  guardarLista(CLAVE_CANCHAS, [
    { id: 1, nombre: 'Cancha 1', tipo: 'Techada', activa: true },
    { id: 2, nombre: 'Cancha 2', tipo: 'Techada', activa: true },
    { id: 3, nombre: 'Cancha 3', tipo: 'Descubierta', activa: true },
    // esta está inactiva, no tiene que aparecer en el listado
    { id: 4, nombre: 'Cancha 4', tipo: 'Descubierta', activa: false }
  ]);

  guardarLista(CLAVE_USUARIOS, [
    { id: 1, nombre: 'Jugador de Prueba', email: 'jugador@padelya.com', password: '123456', rol: 'jugador' }
  ]);

  // unas reservas ya hechas para que se vean turnos ocupados
  const hoy = hoyISO();
  const manana = sumarDias(hoy, 1);
  guardarLista(CLAVE_RESERVAS, [
    { id: 1, usuarioId: 1, canchaId: 1, fecha: hoy, horaInicio: 20, estado: 'confirmada' },
    { id: 2, usuarioId: 1, canchaId: 1, fecha: hoy, horaInicio: 21, estado: 'confirmada' },
    { id: 3, usuarioId: 1, canchaId: 1, fecha: manana, horaInicio: 18, estado: 'confirmada' },
    { id: 4, usuarioId: 1, canchaId: 1, fecha: manana, horaInicio: 19, estado: 'confirmada' },
    { id: 5, usuarioId: 1, canchaId: 2, fecha: manana, horaInicio: 19, estado: 'confirmada' },
    { id: 6, usuarioId: 1, canchaId: 3, fecha: manana, horaInicio: 21, estado: 'confirmada' }
  ]);
}

function reiniciarDatos() {
  localStorage.clear();
  sessionStorage.clear();
  cargarDatosIniciales();
}

// se ejecuta apenas se carga el archivo
// (utils.js tiene que estar cargado ANTES que este porque usa hoyISO y sumarDias)
cargarDatosIniciales();
