// login.js - pantalla de inicio de sesión (PB-02)

redirigirSiHaySesion();

document.getElementById('form-login').addEventListener('submit', function (evento) {
  evento.preventDefault(); // para que no se recargue la página

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const resultado = iniciarSesion(email, password);
  if (resultado.ok) {
    window.location.href = 'canchas.html';
  } else {
    mostrarMensaje('mensaje', resultado.mensaje, 'error');
  }
});

armarBarra();
armarPie();
