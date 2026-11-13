// registro.js - pantalla de registro (PB-01)

redirigirSiHaySesion();

document.getElementById('form-registro').addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const email = document.getElementById('email').value;
  const telefono = document.getElementById('telefono').value;
  const password = document.getElementById('password').value;

  const resultado = await registrarUsuario(nombre, email, password, telefono);
  if (resultado.ok) {
    // al registrarse ya queda con la sesión iniciada, lo mandamos directo a las canchas
    window.location.href = 'canchas.html';
  } else {
    mostrarMensaje('mensaje', resultado.mensaje, 'error');
  }
});

armarBarra();
armarPie();
