// utils.js
// funciones chicas que se usan en varias pantallas (fechas, mensajes, barra de arriba, etc)

// ---------- fechas ----------

// devuelve la fecha como texto "2026-11-02"
// ojo: usamos getFullYear/getMonth y no toISOString() porque esa te da la fecha en UTC
// y de noche nos daba un día de más
function aISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return fecha.getFullYear() + '-' + mes + '-' + dia;
}

function hoyISO() {
  return aISO(new Date());
}

function sumarDias(fechaISO, cantidad) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  fecha.setDate(fecha.getDate() + cantidad);
  return aISO(fecha);
}

// "2026-11-02" -> "lunes, 2 de noviembre de 2026"
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const texto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // solo la primera letra en mayúscula (antes lo hacía el CSS y quedaba "De Noviembre De 2026")
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// 8 -> "08:00"
function formatearHora(hora) {
  return String(hora).padStart(2, '0') + ':00';
}

// ---------- html ----------

// crea un elemento con clase y texto. Usamos textContent para que si alguien
// se registra con un nombre raro (tipo <script>) no se ejecute nada
function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// agrega un par titulo/valor a una lista <dl>
function agregarDato(lista, titulo, valor) {
  lista.appendChild(crear('dt', '', titulo));
  lista.appendChild(crear('dd', '', valor));
}

// muestra un mensaje en la caja con ese id. tipo puede ser 'error' o 'ok'
function mostrarMensaje(id, texto, tipo) {
  const caja = document.getElementById(id);
  caja.textContent = texto;
  caja.className = 'mensaje ' + tipo;
}

function ocultarMensaje(id) {
  const caja = document.getElementById(id);
  caja.textContent = '';
  caja.className = 'mensaje';
}

// lee un parametro de la url, por ejemplo disponibilidad.html?cancha=2
function obtenerParametro(nombre) {
  return new URLSearchParams(window.location.search).get(nombre);
}

// ---------- barra de arriba y pie (se repiten en todas las pantallas) ----------

function armarBarra() {
  const barra = document.getElementById('barra');
  if (barra === null) return;
  barra.innerHTML = '';

  const logo = crear('a', 'logo');
  logo.href = 'index.html';
  logo.appendChild(document.createTextNode('Padel'));
  logo.appendChild(crear('span', '', 'Ya'));
  barra.appendChild(logo);

  const links = crear('nav', 'barra-links');
  const usuario = usuarioActual(); // esta función está en auth.js

  if (usuario !== null) {
    links.appendChild(crear('span', 'saludo', 'Hola, ' + usuario.nombre));
    const enlaceCanchas = crear('a', '', 'Canchas');
    enlaceCanchas.href = 'canchas.html';
    links.appendChild(enlaceCanchas);
    const botonSalir = crear('button', 'btn-salir', 'Cerrar sesión');
    botonSalir.addEventListener('click', cerrarSesion);
    links.appendChild(botonSalir);
  } else {
    const enlaceLogin = crear('a', '', 'Ingresar');
    enlaceLogin.href = 'login.html';
    const enlaceRegistro = crear('a', '', 'Registrarme');
    enlaceRegistro.href = 'registro.html';
    links.appendChild(enlaceLogin);
    links.appendChild(enlaceRegistro);
  }
  barra.appendChild(links);
}

function armarPie() {
  const pie = document.getElementById('pie');
  if (pie === null) return;
  pie.innerHTML = '';
  pie.appendChild(document.createTextNode('PadelYa - Sprint 1 - prototipo para la materia  |  '));

  // sirve para volver a los datos de prueba (las reservas de prueba se generan para "mañana")
  const reiniciar = crear('a', '', 'Reiniciar datos de prueba');
  reiniciar.href = '#';
  reiniciar.addEventListener('click', function (evento) {
    evento.preventDefault();
    reiniciarDatos(); // esta función está en datos.js
    window.location.href = 'index.html';
  });
  pie.appendChild(reiniciar);

  pie.appendChild(document.createTextNode('  |  '));
  const documentacion = crear('a', '', 'Documentación');
  documentacion.href = 'docs/index.html';
  pie.appendChild(documentacion);
}
