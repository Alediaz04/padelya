// pantalla de administración (admin.html) - ITU-35, ITU-36, ITU-37
// permite al administrador gestionar reservas del día, configurar días cerrados o de medio tiempo
// (domingos, feriados, torneos, mantenimiento) y crear, editar o eliminar canchas.

const admin = protegerPaginaAdmin();

const campoFiltroFecha = document.getElementById('filtro-fecha');
const campoFiltroCancha = document.getElementById('filtro-cancha');
const campoFiltroEstado = document.getElementById('filtro-estado');

if (admin !== null) {
  iniciarPanelAdmin();
}

function iniciarPanelAdmin() {
  configurarPestanas();

  // inicializamos fecha en hoy
  campoFiltroFecha.value = hoyISO();
  document.getElementById('bloq-fecha').value = hoyISO();

  // eventos de filtros de reservas del día (ITU-36)
  campoFiltroFecha.addEventListener('change', function () {
    if (!campoFiltroFecha.value) campoFiltroFecha.value = hoyISO();
    dibujarReservasDelDia();
  });
  campoFiltroCancha.addEventListener('change', dibujarReservasDelDia);
  campoFiltroEstado.addEventListener('change', dibujarReservasDelDia);

  document.getElementById('btn-ayer-admin').addEventListener('click', function () {
    campoFiltroFecha.value = sumarDias(campoFiltroFecha.value, -1);
    dibujarReservasDelDia();
  });
  document.getElementById('btn-hoy-admin').addEventListener('click', function () {
    campoFiltroFecha.value = hoyISO();
    dibujarReservasDelDia();
  });
  document.getElementById('btn-manana-admin').addEventListener('click', function () {
    campoFiltroFecha.value = sumarDias(campoFiltroFecha.value, 1);
    dibujarReservasDelDia();
  });

  // formulario de reserva manual
  document.getElementById('form-reserva-admin').addEventListener('submit', manejarReservaManual);

  // configuración semanal y bloqueos / feriados (ITU-37)
  llenarSelectoresHorasBloqueo();
  document.getElementById('bloq-modo').addEventListener('change', actualizarCamposModoBloqueo);
  document.getElementById('form-bloqueo').addEventListener('submit', manejarNuevoBloqueo);
  document.getElementById('btn-guardar-semana').addEventListener('click', guardarConfiguracionSemanal);
  document.getElementById('btn-restaurar-semana').addEventListener('click', function () {
    guardarConfigDias(configDiasPorDefecto());
    dibujarConfiguracionSemanal();
    mostrarMensaje('mensaje-admin', 'Horarios semanales restaurados (Domingos medio tiempo de 09:00 a 14:00 hs).', 'ok');
  });

  // formulario de canchas
  document.getElementById('cancha-tipo').addEventListener('change', function () {
    const tipo = document.getElementById('cancha-tipo').value;
    if (tipo === 'Techada') {
      document.getElementById('cancha-precio').value = PRECIO_TECHADA;
      document.getElementById('cancha-caracteristicas').value = 'Techada · Blindex · Césped sintético · LED';
    } else if (tipo === 'Descubierta') {
      document.getElementById('cancha-precio').value = PRECIO_DESCUBIERTA;
      document.getElementById('cancha-caracteristicas').value = 'Descubierta · Panorámica · Césped sintético';
    }
  });

  const btnAgregarTipo = document.getElementById('btn-mostrar-agregar-tipo');
  if (btnAgregarTipo) {
    btnAgregarTipo.addEventListener('click', function () {
      const nuevoTipo = prompt('Ingresá el nuevo tipo de cancha (Ej: Césped Azul, Cancha Central, Cristal Panorámico, etc.):');
      if (nuevoTipo && nuevoTipo.trim()) {
        const selectTipo = document.getElementById('cancha-tipo');
        const opt = crear('option', '', nuevoTipo.trim());
        opt.value = nuevoTipo.trim();
        selectTipo.appendChild(opt);
        selectTipo.value = nuevoTipo.trim();
        mostrarMensaje('mensaje-admin', 'Tipo de cancha "' + nuevoTipo.trim() + '" agregado a la lista.', 'ok');
      }
    });
  }

  document.getElementById('form-cancha').addEventListener('submit', manejarGuardarCancha);
  document.getElementById('btn-cancelar-edicion').addEventListener('click', limpiarFormularioCancha);

  refrescarTodoElPanel();
  armarBarra();
  armarPie();
}

function configurarPestanas() {
  const botones = document.querySelectorAll('.admin-tab');
  botones.forEach(function (boton) {
    boton.addEventListener('click', function () {
      botones.forEach(function (b) { b.classList.remove('activo'); });
      boton.classList.add('activo');

      const destino = boton.getAttribute('data-tab');
      document.querySelectorAll('.seccion-admin').forEach(function (sec) {
        if (sec.id === destino) {
          sec.classList.remove('oculto');
        } else {
          sec.classList.add('oculto');
        }
      });
      ocultarMensaje('mensaje-admin');
    });
  });
}

function refrescarTodoElPanel() {
  cargarSelectoresDeCanchasYUsuarios();
  dibujarReservasDelDia();
  dibujarConfiguracionSemanal();
  dibujarListaBloqueos();
  dibujarCanchasAdmin();
}

function cargarSelectoresDeCanchasYUsuarios() {
  const canchas = obtenerCanchas();

  // 1. Selector de filtro en Reservas del Día
  const valorPrevioFiltro = campoFiltroCancha.value || '0';
  campoFiltroCancha.innerHTML = '';
  const optTodas = crear('option', '', 'Todas las canchas');
  optTodas.value = '0';
  campoFiltroCancha.appendChild(optTodas);
  canchas.forEach(function (c) {
    const opt = crear('option', '', c.nombre + ' (' + c.tipo + ')');
    opt.value = String(c.id);
    campoFiltroCancha.appendChild(opt);
  });
  campoFiltroCancha.value = valorPrevioFiltro;

  // 2. Selector de cancha en Reserva Manual (solo activas)
  const selectResCancha = document.getElementById('admin-res-cancha');
  selectResCancha.innerHTML = '';
  canchasActivas().forEach(function (c) {
    const opt = crear('option', '', c.nombre + ' - ' + formatearPrecio(precioHoraCancha(c)));
    opt.value = String(c.id);
    selectResCancha.appendChild(opt);
  });

  // 3. Selector de horas en Reserva Manual
  const selectResHora = document.getElementById('admin-res-hora');
  if (selectResHora.options.length === 0) {
    for (let h = HORA_APERTURA; h <= HORA_CIERRE; h++) {
      const opt = crear('option', '', formatearHora(h) + ' hs');
      opt.value = String(h);
      selectResHora.appendChild(opt);
    }
    selectResHora.value = '18';
  }

  // 4. Selector de usuarios en Reserva Manual
  const selectResUsuario = document.getElementById('admin-res-usuario');
  selectResUsuario.innerHTML = '';
  obtenerUsuarios().forEach(function (u) {
    const opt = crear('option', '', u.nombre + ' (' + u.email + ')');
    opt.value = String(u.id);
    selectResUsuario.appendChild(opt);
  });

  // 5. Selector de cancha en Bloqueos / Feriados
  const selectBloqCancha = document.getElementById('bloq-cancha');
  selectBloqCancha.innerHTML = '';
  const optComplejo = crear('option', '', '🏢 Todo el complejo (Todas las canchas)');
  optComplejo.value = '0';
  selectBloqCancha.appendChild(optComplejo);
  canchas.forEach(function (c) {
    const opt = crear('option', '', c.nombre + ' (' + c.tipo + ')');
    opt.value = String(c.id);
    selectBloqCancha.appendChild(opt);
  });
}

// =========================================================================
// SECCIÓN 1: RESERVAS DEL DÍA (ITU-36)
// =========================================================================

function dibujarReservasDelDia() {
  const fecha = campoFiltroFecha.value;
  const canchaFiltro = Number(campoFiltroCancha.value || 0);
  const estadoFiltro = campoFiltroEstado.value || 'todas';

  document.getElementById('texto-fecha-admin').textContent = formatearFecha(fecha);

  // calculamos KPIs sobre las reservas confirmadas de esa fecha (y cancha si filtró)
  const todasFecha = obtenerReservasDelDiaAdmin(fecha, canchaFiltro, 'todas');
  let cantConfirmadas = 0;
  let totalHoras = 0;
  let recaudacion = 0;

  todasFecha.forEach(function (r) {
    if (r.estado === 'confirmada') {
      cantConfirmadas++;
      totalHoras += obtenerCantidadTurnos(r);
      recaudacion += obtenerPrecioReserva(r, buscarCancha(r.canchaId));
    }
  });

  document.getElementById('kpi-confirmadas').textContent = String(cantConfirmadas);
  document.getElementById('kpi-horas').textContent = totalHoras + (totalHoras === 1 ? ' hora' : ' horas');
  document.getElementById('kpi-recaudacion').textContent = formatearPrecio(recaudacion);

  const lista = obtenerReservasDelDiaAdmin(fecha, canchaFiltro, estadoFiltro);
  const contenedor = document.getElementById('contenedor-tabla-reservas');
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    const vacio = crear('p', 'subtitulo', 'No hay reservas registradas para los filtros seleccionados en esta fecha.');
    vacio.style.padding = '12px 0';
    contenedor.appendChild(vacio);
    return;
  }

  const tabla = crear('table', 'tabla-admin');
  const thead = crear('thead');
  const filaHead = crear('tr');
  ['Código', 'Horario', 'Cancha', 'Jugador', 'Turnos', 'Importe', 'Estado', 'Acciones'].forEach(function (titulo) {
    filaHead.appendChild(crear('th', '', titulo));
  });
  thead.appendChild(filaHead);
  tabla.appendChild(thead);

  const tbody = crear('tbody');
  lista.forEach(function (r) {
    const tr = crear('tr');
    const cancha = buscarCancha(r.canchaId);
    const jugador = buscarUsuarioPorId(r.usuarioId);
    const cantTurnos = obtenerCantidadTurnos(r);
    const horaFin = obtenerHoraFin(r);
    const total = obtenerPrecioReserva(r, cancha);

    tr.appendChild(crear('td', '', '#' + r.id));
    tr.appendChild(crear('td', '', formatearHora(r.horaInicio) + ' a ' + formatearHora(horaFin) + ' hs'));
    tr.appendChild(crear('td', '', cancha ? cancha.nombre + ' (' + cancha.tipo + ')' : 'Cancha #' + r.canchaId));

    const tdJugador = crear('td');
    tdJugador.appendChild(crear('strong', '', jugador ? jugador.nombre : (r.jugadorNombre || 'Usuario #' + r.usuarioId)));
    
    const tel = (jugador && jugador.telefono) ? jugador.telefono : (r.jugadorTelefono || '');
    if (tel) {
      tdJugador.appendChild(crear('br'));
      const linkWsp = crear('a', '', '📞 ' + tel);
      const telNum = tel.replace(/[^0-9]/g, '');
      linkWsp.href = 'https://wa.me/' + telNum;
      linkWsp.target = '_blank';
      linkWsp.style.color = 'var(--verde-oscuro)';
      linkWsp.style.fontWeight = 'bold';
      linkWsp.style.fontSize = '0.82rem';
      tdJugador.appendChild(linkWsp);
    } else if (jugador && jugador.email) {
      tdJugador.appendChild(crear('br'));
      tdJugador.appendChild(crear('small', '', jugador.email));
    }
    tr.appendChild(tdJugador);

    tr.appendChild(crear('td', '', cantTurnos === 1 ? '1 turno (1h)' : cantTurnos + ' turnos (' + cantTurnos + 'hs)'));
    tr.appendChild(crear('td', '', formatearPrecio(total)));

    const tdEstado = crear('td');
    const claseBadge = r.estado === 'cancelada' ? 'cancelada' : 'confirmada';
    const textoBadge = r.estado === 'cancelada' ? 'Cancelada' : 'Confirmada';
    tdEstado.appendChild(crear('span', 'estado-badge ' + claseBadge, textoBadge));
    tr.appendChild(tdEstado);

    const tdAcciones = crear('td');
    const cajaBtns = crear('div', 'acciones');
    if (r.estado === 'confirmada') {
      const btnCancelar = crear('button', 'btn btn-peligro btn-chico', 'Cancelar');
      btnCancelar.type = 'button';
      btnCancelar.addEventListener('click', function () {
        const res = cancelarReserva(r.id);
        mostrarMensaje('mensaje-admin', res.mensaje, res.ok ? 'ok' : 'error');
        dibujarReservasDelDia();
      });
      cajaBtns.appendChild(btnCancelar);
    }
    const btnBorrar = crear('button', 'btn btn-sec btn-chico', 'Borrar');
    btnBorrar.type = 'button';
    btnBorrar.addEventListener('click', function () {
      const res = eliminarReservaDeHistorial(r.id);
      mostrarMensaje('mensaje-admin', res.mensaje, res.ok ? 'ok' : 'error');
      dibujarReservasDelDia();
    });
    cajaBtns.appendChild(btnBorrar);
    tdAcciones.appendChild(cajaBtns);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });

  tabla.appendChild(tbody);
  contenedor.appendChild(tabla);
}

function manejarReservaManual(evento) {
  evento.preventDefault();
  const canchaId = Number(document.getElementById('admin-res-cancha').value);
  const horaInicio = Number(document.getElementById('admin-res-hora').value);
  const cantidadTurnos = Number(document.getElementById('admin-res-turnos').value);
  const usuarioId = Number(document.getElementById('admin-res-usuario').value);
  const fecha = campoFiltroFecha.value;

  const resultado = reservarTurno(canchaId, fecha, horaInicio, cantidadTurnos, usuarioId);
  if (resultado.ok) {
    mostrarMensaje(
      'mensaje-admin',
      'Reserva #' + resultado.reserva.id + ' cargada correctamente para el ' + formatearFecha(fecha) + '.',
      'ok'
    );
    dibujarReservasDelDia();
  } else {
    mostrarMensaje('mensaje-admin', resultado.mensaje, 'error');
  }
}

// =========================================================================
// SECCIÓN 2: FERIADOS, DOMINGOS MEDIO TIEMPO Y BLOQUEOS (ITU-37)
// =========================================================================

function dibujarConfiguracionSemanal() {
  const caja = document.getElementById('lista-dias-semana');
  caja.innerHTML = '';
  const config = obtenerConfigDias();

  // ordenamos Lunes (1) a Sábado (6) y al final Domingo (0) para que sea muy cómodo de leer
  const ordenDias = [1, 2, 3, 4, 5, 6, 0];

  ordenDias.forEach(function (diaIdx) {
    const cfg = config[diaIdx];
    const fila = crear('div', 'fila-dia-semana');
    fila.setAttribute('data-dia', String(diaIdx));

    fila.appendChild(crear('strong', '', cfg.nombre));

    const selectModo = crear('select', 'dia-modo-select');
    const opciones = [
      { val: 'completo', txt: '🟢 Abierto horario completo (08 a 23 hs)' },
      { val: 'reducido', txt: '🟡 Medio tiempo / Horario reducido' },
      { val: 'cerrado', txt: '🔴 Cerrado (No se trabaja)' }
    ];
    opciones.forEach(function (op) {
      const o = crear('option', '', op.txt);
      o.value = op.val;
      selectModo.appendChild(o);
    });

    if (cfg.cerrado) {
      selectModo.value = 'cerrado';
    } else if (cfg.apertura > HORA_APERTURA || cfg.cierre < HORA_CIERRE + 1) {
      selectModo.value = 'reducido';
    } else {
      selectModo.value = 'completo';
    }

    const cajaHoras = crear('div', 'horas-dia-semana');
    cajaHoras.appendChild(crear('span', '', 'Abre:'));
    const selAbre = crear('select', 'dia-abre-select');
    for (let h = HORA_APERTURA; h <= HORA_CIERRE; h++) {
      const opt = crear('option', '', formatearHora(h));
      opt.value = String(h);
      selAbre.appendChild(opt);
    }
    selAbre.value = String(cfg.apertura || 9);
    cajaHoras.appendChild(selAbre);

    cajaHoras.appendChild(crear('span', '', 'Cierra:'));
    const selCierra = crear('select', 'dia-cierra-select');
    for (let h = HORA_APERTURA + 1; h <= HORA_CIERRE + 1; h++) {
      const opt = crear('option', '', formatearHora(h));
      opt.value = String(h);
      selCierra.appendChild(opt);
    }
    selCierra.value = String(cfg.cierre || 14);
    cajaHoras.appendChild(selCierra);

    function actualizarVisibilidadHoras() {
      if (selectModo.value === 'reducido') {
        cajaHoras.classList.remove('oculto');
      } else {
        cajaHoras.classList.add('oculto');
      }
    }
    selectModo.addEventListener('change', actualizarVisibilidadHoras);
    actualizarVisibilidadHoras();

    fila.appendChild(selectModo);
    fila.appendChild(cajaHoras);
    caja.appendChild(fila);
  });
}

function guardarConfiguracionSemanal() {
  const filas = document.querySelectorAll('.fila-dia-semana');
  const nuevaConfig = obtenerConfigDias();

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const diaIdx = Number(fila.getAttribute('data-dia'));
    const modo = fila.querySelector('.dia-modo-select').value;
    const abre = Number(fila.querySelector('.dia-abre-select').value);
    const cierra = Number(fila.querySelector('.dia-cierra-select').value);
    const nombreDia = nuevaConfig[diaIdx].nombre;

    if (modo === 'cerrado') {
      nuevaConfig[diaIdx] = { nombre: nombreDia, cerrado: true, apertura: 8, cierre: 23 };
    } else if (modo === 'reducido') {
      if (abre >= cierra) {
        mostrarMensaje('mensaje-admin', 'En ' + nombreDia + ', la hora de apertura debe ser menor a la de cierre.', 'error');
        return;
      }
      nuevaConfig[diaIdx] = { nombre: nombreDia, cerrado: false, apertura: abre, cierre: cierra };
    } else {
      nuevaConfig[diaIdx] = { nombre: nombreDia, cerrado: false, apertura: HORA_APERTURA, cierre: HORA_CIERRE + 1 };
    }
  }

  guardarConfigDias(nuevaConfig);
  mostrarMensaje('mensaje-admin', 'Configuración de horarios por día de la semana guardada correctamente.', 'ok');
}

function llenarSelectoresHorasBloqueo() {
  const selAbre = document.getElementById('bloq-abre');
  const selCierra = document.getElementById('bloq-cierra');
  const selInicio = document.getElementById('bloq-inicio');
  const selFin = document.getElementById('bloq-fin');

  for (let h = HORA_APERTURA; h <= HORA_CIERRE; h++) {
    const o1 = crear('option', '', formatearHora(h) + ' hs');
    o1.value = String(h);
    selAbre.appendChild(o1);

    const o2 = crear('option', '', formatearHora(h) + ' hs');
    o2.value = String(h);
    selInicio.appendChild(o2);
  }

  for (let h = HORA_APERTURA + 1; h <= HORA_CIERRE + 1; h++) {
    const o1 = crear('option', '', formatearHora(h) + ' hs');
    o1.value = String(h);
    selCierra.appendChild(o1);

    const o2 = crear('option', '', formatearHora(h) + ' hs');
    o2.value = String(h);
    selFin.appendChild(o2);
  }

  selAbre.value = '9';
  selCierra.value = '14';
  selInicio.value = '14';
  selFin.value = '17';
  actualizarCamposModoBloqueo();
}

function actualizarCamposModoBloqueo() {
  const modo = document.getElementById('bloq-modo').value;
  const cajaReducido = document.getElementById('caja-horas-reducido');
  const cajaFranja = document.getElementById('caja-horas-franja');
  const inputMotivo = document.getElementById('bloq-motivo');

  cajaReducido.classList.add('oculto');
  cajaFranja.classList.add('oculto');

  if (modo === 'reducido') {
    cajaReducido.classList.remove('oculto');
    inputMotivo.placeholder = 'Ej: Feriado medio tiempo, Domingo especial...';
  } else if (modo === 'franja') {
    cajaFranja.classList.remove('oculto');
    inputMotivo.placeholder = 'Ej: Mantenimiento de blindex, Torneo Americano...';
  } else {
    inputMotivo.placeholder = 'Ej: Feriado Nacional, Cerrado por reformas...';
  }
}

function manejarNuevoBloqueo(evento) {
  evento.preventDefault();
  const resultado = registrarBloqueoAdmin({
    canchaId: document.getElementById('bloq-cancha').value,
    fecha: document.getElementById('bloq-fecha').value,
    modo: document.getElementById('bloq-modo').value,
    horaApertura: document.getElementById('bloq-abre').value,
    horaCierre: document.getElementById('bloq-cierra').value,
    horaInicio: document.getElementById('bloq-inicio').value,
    horaFin: document.getElementById('bloq-fin').value,
    motivo: document.getElementById('bloq-motivo').value,
    cancelarConflictos: document.getElementById('bloq-cancelar-reservas').checked
  });

  mostrarMensaje('mensaje-admin', resultado.mensaje, resultado.ok ? 'ok' : 'error');
  if (resultado.ok) {
    document.getElementById('bloq-motivo').value = '';
    dibujarListaBloqueos();
    dibujarReservasDelDia();
  }
}

function dibujarListaBloqueos() {
  const caja = document.getElementById('lista-bloqueos-admin');
  caja.innerHTML = '';

  const bloqueos = obtenerBloqueos().sort(function (a, b) {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    return a.horaInicio - b.horaInicio;
  });

  if (bloqueos.length === 0) {
    caja.appendChild(crear('p', 'subtitulo', 'No hay feriados ni bloqueos puntuales cargados en este momento.'));
    return;
  }

  const tabla = crear('table', 'tabla-admin');
  const thead = crear('thead');
  const trHead = crear('tr');
  ['Fecha', 'Alcance', 'Horario bloqueado', 'Motivo', 'Acción'].forEach(function (t) {
    trHead.appendChild(crear('th', '', t));
  });
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = crear('tbody');
  bloqueos.forEach(function (b) {
    const tr = crear('tr');
    tr.appendChild(crear('td', '', formatearFecha(b.fecha)));

    const cancha = b.canchaId === 0 ? null : buscarCancha(b.canchaId);
    const nombreAlcance = b.canchaId === 0
      ? '🏢 Todo el complejo'
      : (cancha ? cancha.nombre : 'Cancha #' + b.canchaId);
    tr.appendChild(crear('td', '', nombreAlcance));

    const esTodoElDia = b.horaInicio <= HORA_APERTURA && b.horaFin >= HORA_CIERRE + 1;
    const textoHorario = esTodoElDia
      ? 'Día completo cerrado (08:00 a 23:00)'
      : formatearHora(b.horaInicio) + ' a ' + formatearHora(b.horaFin) + ' hs';
    tr.appendChild(crear('td', '', textoHorario));

    tr.appendChild(crear('td', '', b.motivo));

    const tdAccion = crear('td');
    const btnQuitar = crear('button', 'btn btn-peligro btn-chico', 'Quitar bloqueo');
    btnQuitar.type = 'button';
    btnQuitar.addEventListener('click', function () {
      const res = eliminarBloqueoAdmin(b.id);
      mostrarMensaje('mensaje-admin', res.mensaje, res.ok ? 'ok' : 'error');
      dibujarListaBloqueos();
    });
    tdAccion.appendChild(btnQuitar);
    tr.appendChild(tdAccion);

    tbody.appendChild(tr);
  });

  tabla.appendChild(tbody);
  caja.appendChild(tabla);
}

// =========================================================================
// SECCIÓN 3: GESTIÓN DE CANCHAS — CREAR, EDITAR, ELIMINAR (ITU-35)
// =========================================================================

function dibujarCanchasAdmin() {
  const grilla = document.getElementById('grilla-canchas-admin');
  grilla.innerHTML = '';

  const canchas = obtenerCanchas();
  canchas.forEach(function (cancha) {
    const tipoClase = cancha.tipo.toLowerCase();
    const precio = precioHoraCancha(cancha);
    const tarjeta = crear('article', 'cancha-card' + (cancha.activa ? '' : ' cancha-admin-inactiva'));

    const visual = crear('div', 'cancha-visual ' + tipoClase);
    visual.appendChild(crear('span', 'etiqueta ' + tipoClase, cancha.tipo));
    visual.appendChild(
      crear(
        'span',
        'estado-badge ' + (cancha.activa ? 'confirmada' : 'cancelada'),
        cancha.activa ? 'Activa' : 'Inactiva'
      )
    );
    tarjeta.appendChild(visual);

    const cuerpo = crear('div', 'cancha-cuerpo');
    const filaTitulo = crear('div', 'precio-cancha-fila');
    filaTitulo.appendChild(crear('h2', '', cancha.nombre));
    filaTitulo.appendChild(crear('span', 'precio-destacado', formatearPrecio(precio) + '/h'));
    cuerpo.appendChild(filaTitulo);

    cuerpo.appendChild(
      crear(
        'p',
        '',
        cancha.caracteristicas || (cancha.tipo === 'Techada' ? 'Nave indoor climatizada. Blindex.' : 'Cancha panorámica al aire libre.')
      )
    );

    const acciones = crear('div', 'acciones');
    acciones.style.marginTop = 'auto';

    const btnEditar = crear('button', 'btn btn-sec btn-chico', '✏️ Editar');
    btnEditar.type = 'button';
    btnEditar.addEventListener('click', function () {
      cargarCanchaEnFormulario(cancha);
    });
    acciones.appendChild(btnEditar);

    const btnAlternar = crear('button', 'btn btn-sec btn-chico', cancha.activa ? '⏸️ Desactivar' : '▶️ Activar');
    btnAlternar.type = 'button';
    btnAlternar.addEventListener('click', function () {
      const res = alternarEstadoCanchaAdmin(cancha.id);
      mostrarMensaje('mensaje-admin', res.mensaje, res.ok ? 'ok' : 'error');
      refrescarTodoElPanel();
    });
    acciones.appendChild(btnAlternar);

    const btnEliminar = crear('button', 'btn btn-peligro btn-chico', '🗑️ Eliminar');
    btnEliminar.type = 'button';
    btnEliminar.addEventListener('click', function () {
      const res = eliminarCanchaAdmin(cancha.id);
      mostrarMensaje('mensaje-admin', res.mensaje, res.ok ? 'ok' : 'error');
      refrescarTodoElPanel();
    });
    acciones.appendChild(btnEliminar);

    cuerpo.appendChild(acciones);
    tarjeta.appendChild(cuerpo);
    grilla.appendChild(tarjeta);
  });
}

function cargarCanchaEnFormulario(cancha) {
  document.getElementById('cancha-edit-id').value = String(cancha.id);
  document.getElementById('cancha-nombre').value = cancha.nombre;
  
  // si el tipo no existe en el select lo agregamos para que se seleccione bien
  const selectTipo = document.getElementById('cancha-tipo');
  let existeTipo = Array.from(selectTipo.options).some(o => o.value === cancha.tipo);
  if (!existeTipo) {
    const opt = crear('option', '', cancha.tipo);
    opt.value = cancha.tipo;
    selectTipo.appendChild(opt);
  }
  selectTipo.value = cancha.tipo;

  document.getElementById('cancha-precio').value = String(precioHoraCancha(cancha));
  document.getElementById('cancha-caracteristicas').value = cancha.caracteristicas || (cancha.tipo === 'Techada' ? 'Techada · Blindex · Césped sintético · LED' : 'Descubierta · Panorámica · Césped sintético');
  document.getElementById('cancha-activa').value = cancha.activa ? 'true' : 'false';

  document.getElementById('titulo-form-cancha').textContent = 'Editar cancha: ' + cancha.nombre;
  document.getElementById('btn-guardar-cancha').textContent = 'Guardar cambios';
  document.getElementById('btn-cancelar-edicion').classList.remove('oculto');
  
  // scroll suave hacia el formulario arriba
  document.getElementById('form-cancha').scrollIntoView({ behavior: 'smooth' });
}

function limpiarFormularioCancha() {
  document.getElementById('cancha-edit-id').value = '';
  document.getElementById('cancha-nombre').value = '';
  document.getElementById('cancha-tipo').value = 'Techada';
  document.getElementById('cancha-precio').value = String(PRECIO_TECHADA);
  document.getElementById('cancha-caracteristicas').value = '';
  document.getElementById('cancha-activa').value = 'true';

  document.getElementById('titulo-form-cancha').textContent = 'Crear o agregar nueva cancha';
  document.getElementById('btn-guardar-cancha').textContent = 'Guardar cancha';
  document.getElementById('btn-cancelar-edicion').classList.add('oculto');
}

function manejarGuardarCancha(evento) {
  evento.preventDefault();
  const editId = document.getElementById('cancha-edit-id').value;
  const nombre = document.getElementById('cancha-nombre').value;
  const tipo = document.getElementById('cancha-tipo').value;
  const precio = Number(document.getElementById('cancha-precio').value);
  const caracteristicas = document.getElementById('cancha-caracteristicas').value;
  const activa = document.getElementById('cancha-activa').value === 'true';

  let resultado;
  if (editId === '') {
    resultado = crearCanchaAdmin(nombre, tipo, precio, caracteristicas, activa);
  } else {
    resultado = editarCanchaAdmin(Number(editId), nombre, tipo, precio, caracteristicas, activa);
  }

  mostrarMensaje('mensaje-admin', resultado.mensaje, resultado.ok ? 'ok' : 'error');
  if (resultado.ok) {
    limpiarFormularioCancha();
    refrescarTodoElPanel();
  }
}

