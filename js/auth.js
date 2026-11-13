// auth.js
// registro, login, logout y control de sesión por rol (jugador y administrador)

// devuelve el usuario que tiene la sesión iniciada, o null si no hay nadie
function usuarioActual() {
  const id = obtenerIdSesion();
  if (id === null) return null;
  const usuario = obtenerUsuarios().find(function (u) {
    return u.id === id;
  });
  return usuario || null;
}

// devuelve true si hay un administrador logueado
function esAdminActual() {
  const u = usuarioActual();
  return u !== null && u.rol === 'admin';
}

// devuelve { ok: true, usuario } o { ok: false, mensaje }
async function registrarUsuario(nombre, email, password, telefono) {
  nombre = nombre.trim();
  email = email.trim().toLowerCase();
  telefono = (telefono || '').trim();

  if (nombre === '' || email === '' || password === '') {
    return { ok: false, mensaje: 'Completá nombre, email y contraseña' };
  }
  if (!telefono) {
    return { ok: false, mensaje: 'Ingresá un número de teléfono de contacto' };
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

  // Hasheamos la contraseña antes de guardarla para que en Firestore no se vea el texto plano
  const passwordHash = await hashearPassword(password);

  const usuario = {
    id: nuevoId(usuarios),
    nombre: nombre,
    email: email,
    telefono: telefono,
    passwordHash: passwordHash,
    rol: 'jugador'
  };
  guardarUsuario(usuario);

  // después de registrarse queda con la sesión iniciada
  guardarIdSesion(usuario.id);

  // Registra el último acceso en Firebase para auditoría y actividad del usuario
  usuario.ultimoAcceso = new Date().toISOString();
  if (firestoreDisponible()) {
    sincronizarDocFirestore(COL_USUARIOS, usuario.id, { ultimoAcceso: usuario.ultimoAcceso });
  }

  return { ok: true, usuario: usuario };
}

async function iniciarSesion(email, password) {
  email = email.trim().toLowerCase();
  const passHash = await hashearPassword(password);

  // Verificación directa para los usuarios del prototipo
  let usuario = null;
  const lista = obtenerUsuarios();

  usuario = lista.find(function (u) {
    if (u.email !== email) return false;
    // Si coincide por hash seguro
    if (u.passwordHash && (u.passwordHash === passHash || u.passwordHash === passHash.toLowerCase())) {
      return true;
    }
    // O si coincide por texto plano
    if (u.password && u.password === password) {
      return true;
    }
    // Compatibilidad para usuarios iniciales
    if (email === 'admin@padelya.com' && password === 'admin123') {
      return true;
    }
    if (email === 'jugador@padelya.com' && password === '123456') {
      return true;
    }
    return false;
  });

  // Si no estuviera en la lista pero son las credenciales fijas de prueba, lo creamos
  if (!usuario) {
    if (email === 'admin@padelya.com' && password === 'admin123') {
      usuario = {
        id: nuevoId(lista),
        nombre: 'Administrador PadelYa',
        email: 'admin@padelya.com',
        passwordHash: passHash,
        rol: 'admin'
      };
      guardarUsuario(usuario);
    } else if (email === 'jugador@padelya.com' && password === '123456') {
      usuario = {
        id: nuevoId(lista),
        nombre: 'Jugador de Prueba',
        email: 'jugador@padelya.com',
        passwordHash: passHash,
        rol: 'jugador'
      };
      guardarUsuario(usuario);
    }
  }

  // no avisamos si falló el email o la contraseña, así no se sabe qué cuentas existen
  if (!usuario) {
    return { ok: false, mensaje: 'Email o contraseña incorrectos' };
  }

  guardarIdSesion(usuario.id);

  // Registra el último acceso en Firebase para auditoría y actividad del usuario
  usuario.ultimoAcceso = new Date().toISOString();
  if (firestoreDisponible()) {
    sincronizarDocFirestore(COL_USUARIOS, usuario.id, { ultimoAcceso: usuario.ultimoAcceso });
  }

  return { ok: true, usuario: usuario };
}

function cerrarSesion() {
  borrarSesion();
  window.location.href = 'login.html';
}

// se usa en las pantallas que necesitan sesión (canchas, disponibilidad, mis-reservas, etc).
// Si no hay sesión manda al login. Devuelve el usuario (o null)
function protegerPagina() {
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

// se usa en el panel de administración (admin.html).
// Solo permite el acceso si el usuario logueado tiene rol === 'admin'
function protegerPaginaAdmin() {
  window.addEventListener('pageshow', function (evento) {
    const u = usuarioActual();
    if (evento.persisted && (u === null || u.rol !== 'admin')) {
      window.location.href = 'login.html';
    }
  });

  const usuario = usuarioActual();
  if (usuario === null) {
    window.location.href = 'login.html';
    return null;
  }
  if (usuario.rol !== 'admin') {
    window.location.href = 'canchas.html';
    return null;
  }
  return usuario;
}

// en login y registro, si ya hay sesión redirigimos según su rol
function redirigirSiHaySesion() {
  const usuario = usuarioActual();
  if (usuario !== null) {
    window.location.href = usuario.rol === 'admin' ? 'admin.html' : 'canchas.html';
  }
}
