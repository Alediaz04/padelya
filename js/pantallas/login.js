// login.js - pantalla de inicio de sesión (PB-02 y acceso de Administrador)

redirigirSiHaySesion();

document.getElementById('form-login').addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const resultado = await iniciarSesion(email, password);
  if (resultado.ok) {
    // si es el administrador va directo al panel de administración
    if (resultado.usuario.rol === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'canchas.html';
    }
  } else {
    mostrarMensaje('mensaje', resultado.mensaje, 'error');
  }
});

const btnJugador = document.getElementById('btn-demo-jugador');
if (btnJugador) {
  btnJugador.addEventListener('click', function () {
    document.getElementById('email').value = 'jugador@padelya.com';
    document.getElementById('password').value = '123456';
  });
}

const btnAdmin = document.getElementById('btn-demo-admin');
if (btnAdmin) {
  btnAdmin.addEventListener('click', function () {
    document.getElementById('email').value = 'admin@padelya.com';
    document.getElementById('password').value = 'admin123';
  });
}

armarBarra();
armarPie();
