// canchas.js
// funciones para trabajar con las canchas (PB-03)

// solo las canchas activas, que son las que se pueden reservar
function canchasActivas() {
  return obtenerCanchas().filter(function (cancha) {
    return cancha.activa;
  });
}

// busca una cancha por id, devuelve null si no existe
function buscarCancha(id) {
  const cancha = obtenerCanchas().find(function (c) {
    return c.id === id;
  });
  return cancha || null;
}
