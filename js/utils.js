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

// 25000 -> "$25.000"
function formatearPrecio(monto) {
  return '$' + Number(monto).toLocaleString('es-AR');
}

// ---------- seguridad: hashing criptográfico (SHA-256) ----------
// Encripta la contraseña para que nunca se guarde ni se vea en texto plano en Firestore
async function hashearPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode('padelya_salt_' + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

  const paginaActual = window.location.pathname.split('/').pop();

  if (usuario !== null) {
    links.appendChild(crear('span', 'saludo', 'Hola, ' + usuario.nombre));
    if (usuario.rol === 'admin') {
      const enlaceAdmin = crear('a', paginaActual === 'admin.html' ? 'activo' : '', '⚙️ Panel Admin');
      enlaceAdmin.href = 'admin.html';
      links.appendChild(enlaceAdmin);
    }
    const enlaceCanchas = crear('a', paginaActual === 'canchas.html' || paginaActual === 'disponibilidad.html' ? 'activo' : '', 'Canchas');
    enlaceCanchas.href = 'canchas.html';
    links.appendChild(enlaceCanchas);
    const enlaceMisReservas = crear('a', paginaActual === 'mis-reservas.html' ? 'activo' : '', 'Mis reservas');
    enlaceMisReservas.href = 'mis-reservas.html';
    links.appendChild(enlaceMisReservas);
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

  const contenedor = crear('div', 'pie-contenido');

  // BANDA SUPERIOR DE DESTACADOS (colorida estilo ATC Sports)
  const franja = crear('div', 'pie-franja');
  const itemsFranja = [
    { icono: '⚡', titulo: 'Reserva instantánea', desc: 'Turnos confirmados en tiempo real sin señas complicadas' },
    { icono: '🏟️', titulo: 'Canchas profesionales', desc: 'Techadas ($25.000) y Descubiertas ($20.000) con Blindex' },
    { icono: '⏱️', titulo: 'Hasta 4 turnos seguidos', desc: 'Armá partidos de 1, 2, 3 o 4 horas consecutivas en el día' },
    { icono: '🔄', titulo: 'Cancelación flexible', desc: 'Si no podés asistir, cancelás desde Mis Reservas en un clic' }
  ];
  itemsFranja.forEach(function (item) {
    const tarjetaFranja = crear('div', 'pie-destacado');
    tarjetaFranja.appendChild(crear('span', 'pie-icono', item.icono));
    const textoFranja = crear('div');
    textoFranja.appendChild(crear('strong', '', item.titulo));
    textoFranja.appendChild(crear('p', '', item.desc));
    tarjetaFranja.appendChild(textoFranja);
    franja.appendChild(tarjetaFranja);
  });
  contenedor.appendChild(franja);

  // GRILLA DE COLUMNAS CON DATOS DE LA PÁGINA / COMPLEJO
  const columnas = crear('div', 'pie-columnas');

  // Columna 1: Marca
  const colMarca = crear('div', 'pie-col');
  const logoPie = crear('a', 'logo', 'Padel');
  logoPie.href = 'index.html';
  logoPie.appendChild(crear('span', '', 'Ya'));
  colMarca.appendChild(logoPie);
  colMarca.appendChild(
    crear('p', 'pie-texto', 'Tu complejo de pádel en Mendoza. Mirá la disponibilidad en vivo, elegí tu cancha favorita y asegurá tu partido sin llamadas.')
  );
  const chips = crear('div', 'club-chips');
  chips.appendChild(crear('span', 'club-chip', 'Abierto 08:00 a 23:00'));
  chips.appendChild(crear('span', 'club-chip', 'Césped Sintético'));
  colMarca.appendChild(chips);
  columnas.appendChild(colMarca);

  // Columna 2: Datos del Complejo
  const colClub = crear('div', 'pie-col');
  colClub.appendChild(crear('h4', '', 'PadelYa Center'));
  const listaClub = crear('ul', 'pie-lista');
  listaClub.appendChild(crear('li', '', '📍 Av. Acceso Sur y Malabia, Mendoza'));
  listaClub.appendChild(crear('li', '', '🕒 Lunes a Domingo: 08:00 a 23:00 hs'));
  listaClub.appendChild(crear('li', '', '🎾 Techada: $25.000 / turno (60 min)'));
  listaClub.appendChild(crear('li', '', '☀️ Descubierta: $20.000 / turno (60 min)'));
  listaClub.appendChild(crear('li', '', '🚗 Estacionamiento, Buffet y Vestuarios'));
  colClub.appendChild(listaClub);
  columnas.appendChild(colClub);

  // Columna 3: Accesos Rápidos
  const colLinks = crear('div', 'pie-col');
  colLinks.appendChild(crear('h4', '', 'Jugadores'));
  const listaLinks = crear('ul', 'pie-lista');
  const accesos = [
    { texto: 'Inicio', href: 'index.html' },
    { texto: 'Ver canchas y precios', href: 'canchas.html' },
    { texto: 'Mis reservas y cancelaciones', href: 'mis-reservas.html' },
    { texto: 'Iniciar sesión', href: 'login.html' },
    { texto: 'Crear cuenta', href: 'registro.html' }
  ];
  accesos.forEach(function (item) {
    const li = crear('li');
    const a = crear('a', '', item.texto);
    a.href = item.href;
    li.appendChild(a);
    listaLinks.appendChild(li);
  });
  colLinks.appendChild(listaLinks);
  columnas.appendChild(colLinks);

  // Columna 4: Contacto y Atención
  const colContacto = crear('div', 'pie-col');
  colContacto.appendChild(crear('h4', '', 'Contacto & Atención'));
  colContacto.appendChild(
    crear('p', 'pie-texto', '¿Tenés dudas sobre turnos fijos, torneos o eventos corporativos? Comunicate con nuestro equipo.')
  );
  const listaContacto = crear('ul', 'pie-lista');
  listaContacto.appendChild(crear('li', '', '💬 WhatsApp: +54 9 261 555-PADEL'));
  listaContacto.appendChild(crear('li', '', '✉️ info@padelya.com'));
  listaContacto.appendChild(crear('li', '', '🛡️ Sistema con seguridad SSL y Firestore'));
  colContacto.appendChild(listaContacto);
  columnas.appendChild(colContacto);

  contenedor.appendChild(columnas);

  // BARRA INFERIOR
  const barraInf = crear('div', 'pie-inferior');
  barraInf.appendChild(crear('span', '', '© 2026 PadelYa Center · Todos los derechos reservados'));
  barraInf.appendChild(crear('span', 'pie-badge-sprint', 'Plataforma Oficial'));
  contenedor.appendChild(barraInf);

  pie.appendChild(contenedor);
}
