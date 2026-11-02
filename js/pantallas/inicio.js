// inicio.js - pantalla de inicio (index.html)

// si el jugador ya tiene sesión, en vez de "crear cuenta" le mostramos un botón para ir a las canchas
if (usuarioActual() !== null) {
  const caja = document.getElementById('botones-inicio');
  caja.innerHTML = '';
  const boton = crear('a', 'btn', 'Ver las canchas');
  boton.href = 'canchas.html';
  caja.appendChild(boton);
}

armarBarra();
armarPie();
