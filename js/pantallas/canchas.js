// pantalla de canchas (canchas.html) - PB-03
// lista las canchas activas y desde cada una se va a ver su disponibilidad

const usuario = protegerPagina();

if (usuario !== null) {
  const lista = document.getElementById('lista-canchas');
  const canchas = canchasActivas();

  document.getElementById('cantidad').textContent =
    canchas.length === 1 ? '1 cancha disponible para reservar' : canchas.length + ' canchas disponibles para reservar';

  canchas.forEach(function (cancha) {
    const tarjeta = crear('article', 'cancha-card');
    tarjeta.appendChild(crear('h2', '', cancha.nombre));
    tarjeta.appendChild(crear('span', 'etiqueta ' + cancha.tipo.toLowerCase(), cancha.tipo));

    const descripcion = cancha.tipo === 'Techada' ? 'Se puede jugar aunque llueva.' : 'Cancha al aire libre.';
    tarjeta.appendChild(crear('p', '', descripcion));

    // le pasamos el id de la cancha por la url
    const enlace = crear('a', 'btn', 'Ver disponibilidad');
    enlace.href = 'disponibilidad.html?cancha=' + cancha.id;
    tarjeta.appendChild(enlace);

    lista.appendChild(tarjeta);
  });

  armarBarra();
  armarPie();
}
