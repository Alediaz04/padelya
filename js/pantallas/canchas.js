// pantalla de canchas (canchas.html) - PB-03
// lista las canchas activas con su precio por hora ($25.000 Techada / $20.000 Descubierta)

const usuario = protegerPagina();

if (usuario !== null) {
  const lista = document.getElementById('lista-canchas');
  const canchas = canchasActivas();

  document.getElementById('cantidad').textContent =
    canchas.length === 1
      ? '1 cancha activa disponible para reservar hoy'
      : canchas.length + ' canchas activas disponibles · Podés reservar de 1 a 4 turnos consecutivos';

  canchas.forEach(function (cancha) {
    const tipoClase = cancha.tipo.toLowerCase();
    const precio = precioHoraCancha(cancha);
    const tarjeta = crear('article', 'cancha-card');

    // cabecera visual de cancha con etiqueta de tipo y valor por turno
    const visual = crear('div', 'cancha-visual ' + tipoClase);
    visual.appendChild(crear('span', 'etiqueta ' + tipoClase, cancha.tipo));
    visual.appendChild(crear('span', 'etiqueta etiqueta-duracion', formatearPrecio(precio) + ' / turno'));
    tarjeta.appendChild(visual);

    const cuerpo = crear('div', 'cancha-cuerpo');

    const filaTitulo = crear('div', 'precio-cancha-fila');
    filaTitulo.appendChild(crear('h2', '', cancha.nombre));
    const bloquePrecio = crear('span', 'precio-destacado', formatearPrecio(precio) + ' ');
    bloquePrecio.appendChild(crear('small', '', '/ 60 min'));
    filaTitulo.appendChild(bloquePrecio);
    cuerpo.appendChild(filaTitulo);

    const descripcion = cancha.tipo === 'Techada'
      ? 'Nave indoor climatizada. Se juega normal aunque llueva.'
      : 'Cancha exterior panorámica al aire libre.';
    cuerpo.appendChild(crear('p', '', descripcion));

    // especificaciones estilo ATC Sports
    const specs = crear('div', 'cancha-specs');
    specs.appendChild(crear('span', 'spec-pill', 'Blindex'));
    specs.appendChild(crear('span', 'spec-pill', 'Césped sintético'));
    specs.appendChild(crear('span', 'spec-pill', '1 a 4 turnos seguidos'));
    cuerpo.appendChild(specs);

    // le pasamos el id de la cancha por la url
    const enlace = crear('a', 'btn', 'Ver horarios disponibles →');
    enlace.href = 'disponibilidad.html?cancha=' + cancha.id;
    cuerpo.appendChild(enlace);

    tarjeta.appendChild(cuerpo);
    lista.appendChild(tarjeta);
  });

  armarBarra();
  armarPie();
}
