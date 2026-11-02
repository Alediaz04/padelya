// auth.js
// registro, login, logout y control de sesión (PB-01 y PB-02)

// devuelve el usuario que tiene la sesión iniciada, o null si no hay nadie
function usuarioActual() {
  const id = obtenerIdSesion();
  if (id === null) return null;
  const usuario = obtenerUsuarios().find(function (u) {
    return u.id === id;
  });
  return usuario || null;
}

// devuelve { ok: true, usuario } o { ok: false, mensaje }
function registrarUsuario(nombre, email, password) {
  nombre = nombre.trim();
  email = email.trim().toLowerCase(); // el email siempre en minúscula para comparar bien

  if (nombre === '' || email === '' || password === '') {
    return { ok: false, mensaje: 'Completá nombre, email y contraseña' };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, mensaje: 'El email no es válido' };
  }
  if (password.length < 6) {
    return { ok: false, mensaje: 'La contraseña tiene que tener al menos 6 caracteres' };
  }

  // no permitimos dos cuentas con el mismo email
  const usuarios = obtenerUsuarios();
  const repetido = usuarios.find(function (u) {
    return u.email === email;
  });
  if (repetido !== undefined) {
    return { ok: false, mensaje: 'Ya existe una cuenta con ese email' };
  }

  // ojo: acá la contraseña se guarda tal cual porque es un prototipo.
  // En un sistema de verdad se encripta en el servidor, nunca se guarda así
  const usuario = {
    id: nuevoId(usuarios),
    nombre: nombre,
    email: email,
    password: password,
    rol: 'jugador'
  };
  guardarUsuario(usuario);

  // después de registrarse queda con la sesión iniciada
  guardarIdSesion(usuario.id);
  return { ok: true, usuario: usuario };
}

function iniciarSesion(email, password) {
  email = email.trim().toLowerCase();

  const usuario = obtenerUsuarios().find(function (u) {
    return u.email === email && u.password === password;
  });

  // no avisamos si falló el email o la contraseña, así no se sabe qué cuentas existen
  if (usuario === undefined) {
    return { ok: false, mensaje: 'Email o contraseña incorrectos' };
  }

  guardarIdSesion(usuario.id);
  return { ok: true, usuario: usuario };
}

function cerrarSesion() {
  borrarSesion();
  window.location.href = 'login.html';
}

// se usa en las pantallas que necesitan sesión (canchas, disponibilidad, etc).
// Si no hay sesión manda al login. Devuelve el usuario (o null)
function protegerPagina() {
  // si el jugador cierra sesión y toca el botón "atrás", el navegador puede mostrar
  // la página guardada en caché. Con pageshow lo controlamos de nuevo
  window.addEventListener('pageshow', function (evento) {
    if (evento.persisted && usuarioActual() === null) {
      window.location.href = 'login.html';
    }
  });

  const usuario = usuarioActual();
  if (usuario === null) {
    window.location.href = 'login.html';
  }
  return usuario;
}

// al revés: en login y registro, si ya hay sesión no tiene sentido mostrarlos
function redirigirSiHaySesion() {
  if (usuarioActual() !== null) {
    window.location.href = 'canchas.html';
  }
}
