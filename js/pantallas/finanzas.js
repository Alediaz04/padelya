// pantalla de finanzas (finanzas.html) - Sprint 3
// Panel exclusivo de finanzas: ingresos por reservas, registro de gastos con categoría descriptiva
// (que se descuentan automáticamente de los ingresos), gráficos analíticos y exportación contable.

const admin = protegerPaginaAdmin();

let periodoActual = 'mes';
const campoDesde = document.getElementById('fin-desde');
const campoHasta = document.getElementById('fin-hasta');
const selectCatGasto = document.getElementById('gasto-categoria');
const selectFiltroCat = document.getElementById('filtro-cat-gasto');
const inputBuscarGasto = document.getElementById('filtro-buscar-gasto');

if (admin !== null) {
  iniciarPanelFinanzas();
}

function iniciarPanelFinanzas() {
  // Inicializar fechas del período por defecto ('mes')
  const rangoInicial = obtenerRangoPeriodo(periodoActual);
  campoDesde.value = rangoInicial.desde;
  campoHasta.value = rangoInicial.hasta;
  document.getElementById('gasto-fecha').value = hoyISO();

  // Botones de período rápido
  const botonesPeriodo = document.querySelectorAll('.btn-periodo');
  botonesPeriodo.forEach(function (btn) {
    btn.addEventListener('click', function () {
      botonesPeriodo.forEach(function (b) { b.classList.remove('activo'); });
      btn.classList.add('activo');
      periodoActual = btn.getAttribute('data-periodo');
      const rango = obtenerRangoPeriodo(periodoActual);
      campoDesde.value = rango.desde;
      campoHasta.value = rango.hasta;
      refrescarPanelFinanzas();
    });
  });

  // Cambio manual en fechas Desde / Hasta
  function cambioFechaPersonalizada() {
    botonesPeriodo.forEach(function (b) { b.classList.remove('activo'); });
    periodoActual = 'personalizado';
    refrescarPanelFinanzas();
  }
  campoDesde.addEventListener('change', cambioFechaPersonalizada);
  campoHasta.addEventListener('change', cambioFechaPersonalizada);

  // Botón para agregar nueva categoría descriptiva de gasto
  document.getElementById('btn-nueva-categoria-gasto').addEventListener('click', function () {
    const nombre = prompt('Ingresá el nombre de la nueva categoría descriptiva de gasto (Ej: Marketing, Torneos y Premios, Limpieza, Seguridad):');
    if (nombre && nombre.trim()) {
      const res = agregarCategoriaGastoPersonalizada(nombre.trim());
      mostrarMensaje('mensaje-finanzas', res.mensaje, res.ok ? 'ok' : 'error');
      if (res.ok) {
        cargarSelectoresCategorias(res.categoria);
      }
    }
  });

  // Formulario de alta / edición de gasto
  document.getElementById('form-gasto').addEventListener('submit', manejarGuardarGasto);
  document.getElementById('btn-cancelar-gasto').addEventListener('click', limpiarFormularioGasto);

  // Filtros de la tabla de gastos
  selectFiltroCat.addEventListener('change', refrescarPanelFinanzas);
  inputBuscarGasto.addEventListener('input', refrescarPanelFinanzas);

  // Sub-pestañas: Gastos Registrados vs. Flujo de Caja
  const tabGastos = document.getElementById('subtab-gastos');
  const tabFlujo = document.getElementById('subtab-flujo');
  const vistaGastos = document.getElementById('vista-tabla-gastos');
  const vistaFlujo = document.getElementById('vista-tabla-flujo');

  tabGastos.addEventListener('click', function () {
    tabGastos.classList.add('activo');
    tabFlujo.classList.remove('activo');
    vistaGastos.classList.remove('oculto');
    vistaFlujo.classList.add('oculto');
  });

  tabFlujo.addEventListener('click', function () {
    tabFlujo.classList.add('activo');
    tabGastos.classList.remove('activo');
    vistaFlujo.classList.remove('oculto');
    vistaGastos.classList.add('oculto');
  });

  // Exportar CSV e Imprimir
  document.getElementById('btn-exportar-csv').addEventListener('click', exportarBalanceCSV);
  document.getElementById('btn-imprimir-balance').addEventListener('click', function () {
    window.print();
  });

  cargarSelectoresCategorias();
  refrescarPanelFinanzas();
  window.addEventListener('padelya:datos-actualizados', function () {
    refrescarPanelFinanzas();
  });
  armarBarra();
  armarPie();
}

function cargarSelectoresCategorias(seleccionarId) {
  const categorias = obtenerCategoriasGastos();
  const valorActualForm = seleccionarId || selectCatGasto.value || 'Insumos & Pelotas';
  const valorActualFiltro = selectFiltroCat.value || 'todas';

  selectCatGasto.innerHTML = '';
  categorias.forEach(function (cat) {
    const opt = crear('option', '', cat.etiqueta);
    opt.value = cat.id;
    selectCatGasto.appendChild(opt);
  });
  selectCatGasto.value = valorActualForm;

  selectFiltroCat.innerHTML = '';
  const optTodas = crear('option', '', 'Todas las categorías');
  optTodas.value = 'todas';
  selectFiltroCat.appendChild(optTodas);
  categorias.forEach(function (cat) {
    const opt = crear('option', '', cat.etiqueta);
    opt.value = cat.id;
    selectFiltroCat.appendChild(opt);
  });
  selectFiltroCat.value = valorActualFiltro;
}

function obtenerBalanceActual() {
  const rango = obtenerRangoPeriodo(periodoActual, campoDesde.value, campoHasta.value);
  document.getElementById('texto-periodo-activo').textContent = rango.etiqueta;
  return {
    rango: rango,
    balance: calcularBalanceFinanciero(
      rango.desde,
      rango.hasta,
      selectFiltroCat.value,
      inputBuscarGasto.value
    )
  };
}

function refrescarPanelFinanzas() {
  const datos = obtenerBalanceActual();
  const b = datos.balance;

  // 1. Actualizar KPIs principales
  document.getElementById('kpi-fin-ingresos').textContent = formatearPrecio(b.ingresosBrutos);
  document.getElementById('kpi-fin-ingresos-detalle').textContent =
    b.cantidadReservas + (b.cantidadReservas === 1 ? ' reserva confirmada · ' : ' reservas confirmadas · ') +
    b.totalHorasVendidas + ' hs vendidas';

  document.getElementById('kpi-fin-gastos').textContent = '-' + formatearPrecio(b.gastosTotales);
  document.getElementById('kpi-fin-gastos-detalle').textContent =
    b.cantidadGastos + (b.cantidadGastos === 1 ? ' gasto registrado en el período' : ' gastos registrados en el período');

  const cardNeto = document.getElementById('card-kpi-neto');
  const txtNeto = document.getElementById('kpi-fin-neto');
  const detNeto = document.getElementById('kpi-fin-neto-detalle');
  const iconoNeto = document.getElementById('icono-kpi-neto');

  cardNeto.classList.remove('neto-positivo', 'neto-negativo');
  if (b.balanceNeto >= 0) {
    cardNeto.classList.add('neto-positivo');
    txtNeto.textContent = formatearPrecio(b.balanceNeto);
    detNeto.textContent = 'Superávit · Ingresos superan a los gastos';
    iconoNeto.textContent = '💰';
  } else {
    cardNeto.classList.add('neto-negativo');
    txtNeto.textContent = '-' + formatearPrecio(Math.abs(b.balanceNeto));
    detNeto.textContent = 'Déficit · Los gastos superan a los ingresos';
    iconoNeto.textContent = '⚠️';
  }

  // Margen y barra de relación ingresos vs gastos
  const txtMargen = document.getElementById('kpi-fin-margen');
  const barraProporcion = document.getElementById('barra-proporcion-neto');
  const detMargen = document.getElementById('kpi-fin-margen-detalle');

  txtMargen.textContent = b.margenRentabilidad + '%';
  const porcentajeRetenido = Math.max(0, Math.min(100, b.margenRentabilidad));
  barraProporcion.style.width = porcentajeRetenido + '%';

  const pctGasto = b.ingresosBrutos > 0 ? Math.round((b.gastosTotales / b.ingresosBrutos) * 100) : 0;
  detMargen.textContent = b.ingresosBrutos > 0
    ? 'Los gastos representan el ' + pctGasto + '% de los ingresos'
    : 'Sin ingresos registrados en este período';

  // 2. Dibujar gráficos de barras analíticas
  dibujarGraficoCategorias(b);
  dibujarGraficoCanchas(b);

  // 3. Dibujar tablas de gastos y flujo de caja
  dibujarTablaGastos(b.gastosFiltrados);
  dibujarTablaFlujoCaja(b.movimientos);
}

function dibujarGraficoCategorias(balance) {
  const contenedor = document.getElementById('grafico-categorias-gastos');
  contenedor.innerHTML = '';

  if (balance.gastosPorCategoria.length === 0) {
    contenedor.appendChild(crear('p', 'subtitulo', 'No hay gastos registrados en este período.'));
    return;
  }

  const lista = crear('div', 'lista-barras-finanzas');
  balance.gastosPorCategoria.forEach(function (item) {
    const fila = crear('div', 'item-barra-fin');

    const cabecera = crear('div', 'item-barra-cabecera');
    const izq = crear('div', 'item-barra-titulo');
    const badge = crear('span', 'badge-categoria-gasto', item.info.icono + ' ' + item.categoria);
    badge.style.backgroundColor = item.info.color + '18';
    badge.style.color = item.info.color;
    badge.style.borderColor = item.info.color + '40';
    izq.appendChild(badge);
    izq.appendChild(crear('small', '', item.cantidad + (item.cantidad === 1 ? ' registro' : ' registros')));

    const der = crear('div', 'item-barra-valores');
    der.appendChild(crear('strong', '', '-' + formatearPrecio(item.monto)));
    der.appendChild(crear('small', '', item.porcentajeSobreGastos + '% de gastos'));

    cabecera.appendChild(izq);
    cabecera.appendChild(der);
    fila.appendChild(cabecera);

    const pista = crear('div', 'pista-barra-fin');
    const relleno = crear('div', 'relleno-barra-fin');
    relleno.style.width = Math.max(4, item.porcentajeSobreGastos) + '%';
    relleno.style.backgroundColor = item.info.color;
    pista.appendChild(relleno);
    fila.appendChild(pista);

    lista.appendChild(fila);
  });

  contenedor.appendChild(lista);
}

function dibujarGraficoCanchas(balance) {
  const contenedor = document.getElementById('grafico-ingresos-canchas');
  contenedor.innerHTML = '';

  if (balance.ingresosPorCancha.length === 0) {
    contenedor.appendChild(crear('p', 'subtitulo', 'No hay canchas registradas.'));
    return;
  }

  const lista = crear('div', 'lista-barras-finanzas');
  balance.ingresosPorCancha.forEach(function (item) {
    const fila = crear('div', 'item-barra-fin');

    const cabecera = crear('div', 'item-barra-cabecera');
    const izq = crear('div', 'item-barra-titulo');
    izq.appendChild(crear('strong', '', item.cancha.nombre));
    const tipoClase = (item.cancha.tipo || 'Techada').toLowerCase().includes('descub') ? 'descubierta' : 'techada';
    izq.appendChild(crear('span', 'etiqueta ' + tipoClase, item.cancha.tipo || 'Techada'));
    izq.appendChild(crear('small', '', item.horas + ' hs (' + item.reservas + ' turnos)'));

    const der = crear('div', 'item-barra-valores');
    der.appendChild(crear('strong', 'texto-ingreso', '+' + formatearPrecio(item.ingresos)));
    der.appendChild(crear('small', '', item.porcentaje + '% del total'));

    cabecera.appendChild(izq);
    cabecera.appendChild(der);
    fila.appendChild(cabecera);

    const pista = crear('div', 'pista-barra-fin');
    const relleno = crear('div', 'relleno-barra-fin');
    relleno.style.width = (item.ingresos > 0 ? Math.max(4, item.porcentaje) : 0) + '%';
    relleno.style.backgroundColor = 'var(--verde)';
    pista.appendChild(relleno);
    fila.appendChild(pista);

    lista.appendChild(fila);
  });

  contenedor.appendChild(lista);
}

// ---------- Tabla de Gastos y CRUD ----------

function dibujarTablaGastos(listaGastos) {
  const contenedor = document.getElementById('contenedor-tabla-gastos');
  contenedor.innerHTML = '';

  if (listaGastos.length === 0) {
    const vacio = crear('p', 'subtitulo', 'No se encontraron gastos para los filtros seleccionados.');
    vacio.style.padding = '12px 0';
    contenedor.appendChild(vacio);
    return;
  }

  const tabla = crear('table', 'tabla-admin');
  const thead = crear('thead');
  const trHead = crear('tr');
  ['Fecha', 'Categoría Descriptiva', 'Concepto / Detalle', 'Medio de Pago', 'Monto Descontado', 'Acciones'].forEach(function (t) {
    trHead.appendChild(crear('th', '', t));
  });
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = crear('tbody');
  listaGastos.forEach(function (g) {
    const tr = crear('tr');
    const infoCat = infoCategoria(g.categoria);

    tr.appendChild(crear('td', '', formatearFecha(g.fecha)));

    const tdCat = crear('td');
    const badge = crear('span', 'badge-categoria-gasto', infoCat.icono + ' ' + g.categoria);
    badge.style.backgroundColor = infoCat.color + '18';
    badge.style.color = infoCat.color;
    badge.style.borderColor = infoCat.color + '40';
    tdCat.appendChild(badge);
    tr.appendChild(tdCat);

    const tdConcepto = crear('td');
    tdConcepto.appendChild(crear('strong', '', g.concepto));
    if (g.comprobante) {
      tdConcepto.appendChild(crear('br'));
      tdConcepto.appendChild(crear('small', '', 'Ref: ' + g.comprobante));
    }
    tr.appendChild(tdConcepto);

    tr.appendChild(crear('td', '', g.metodoPago || 'Efectivo / Caja'));

    const tdMonto = crear('td');
    tdMonto.appendChild(crear('strong', 'texto-gasto', '-' + formatearPrecio(g.monto)));
    tr.appendChild(tdMonto);

    const tdAcciones = crear('td', 'no-print');
    const cajaBtns = crear('div', 'acciones');

    const btnEditar = crear('button', 'btn btn-sec btn-chico', '✏️ Editar');
    btnEditar.type = 'button';
    btnEditar.addEventListener('click', function () {
      cargarGastoEnFormulario(g);
    });
    cajaBtns.appendChild(btnEditar);

    const btnEliminar = crear('button', 'btn btn-peligro btn-chico', '🗑️ Borrar');
    btnEliminar.type = 'button';
    btnEliminar.addEventListener('click', function () {
      const res = eliminarGastoAdmin(g.id);
      mostrarMensaje('mensaje-finanzas', res.mensaje, res.ok ? 'ok' : 'error');
      refrescarPanelFinanzas();
    });
    cajaBtns.appendChild(btnEliminar);

    tdAcciones.appendChild(cajaBtns);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });

  tabla.appendChild(tbody);
  contenedor.appendChild(tabla);
}

function dibujarTablaFlujoCaja(movimientos) {
  const contenedor = document.getElementById('contenedor-tabla-flujo');
  contenedor.innerHTML = '';

  if (movimientos.length === 0) {
    const vacio = crear('p', 'subtitulo', 'No hay movimientos de ingresos ni gastos en este período.');
    vacio.style.padding = '12px 0';
    contenedor.appendChild(vacio);
    return;
  }

  const tabla = crear('table', 'tabla-admin');
  const thead = crear('thead');
  const trHead = crear('tr');
  ['Fecha', 'Tipo', 'Categoría', 'Detalle del Movimiento', 'Origen / Medio', 'Impacto en Caja'].forEach(function (t) {
    trHead.appendChild(crear('th', '', t));
  });
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = crear('tbody');
  movimientos.forEach(function (m) {
    const tr = crear('tr');
    const esIngreso = m.tipo === 'ingreso';

    tr.appendChild(crear('td', '', formatearFecha(m.fecha)));

    const tdTipo = crear('td');
    tdTipo.appendChild(
      crear(
        'span',
        'estado-badge ' + (esIngreso ? 'confirmada' : 'cancelada'),
        esIngreso ? '▲ Ingreso' : '▼ Gasto'
      )
    );
    tr.appendChild(tdTipo);

    tr.appendChild(crear('td', '', m.categoria));
    tr.appendChild(crear('td', '', m.concepto));
    tr.appendChild(crear('td', '', m.responsable));

    const tdMonto = crear('td');
    tdMonto.appendChild(
      crear(
        'strong',
        esIngreso ? 'texto-ingreso' : 'texto-gasto',
        (esIngreso ? '+' : '-') + formatearPrecio(m.monto)
      )
    );
    tr.appendChild(tdMonto);

    tbody.appendChild(tr);
  });

  tabla.appendChild(tbody);
  contenedor.appendChild(tabla);
}

function cargarGastoEnFormulario(gasto) {
  document.getElementById('gasto-edit-id').value = String(gasto.id);
  document.getElementById('gasto-concepto').value = gasto.concepto;
  cargarSelectoresCategorias(gasto.categoria);
  document.getElementById('gasto-categoria').value = gasto.categoria;
  document.getElementById('gasto-monto').value = String(gasto.monto);
  document.getElementById('gasto-fecha').value = gasto.fecha;
  document.getElementById('gasto-metodo').value = gasto.metodoPago || 'Efectivo / Caja';
  document.getElementById('gasto-comprobante').value = gasto.comprobante || '';

  document.getElementById('titulo-form-gasto').textContent = 'Editar gasto #' + gasto.id;
  document.getElementById('btn-guardar-gasto').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar-gasto').classList.remove('oculto');
  document.getElementById('seccion-form-gasto').scrollIntoView({ behavior: 'smooth' });
}

function limpiarFormularioGasto() {
  document.getElementById('gasto-edit-id').value = '';
  document.getElementById('gasto-concepto').value = '';
  document.getElementById('gasto-monto').value = '';
  document.getElementById('gasto-fecha').value = hoyISO();
  document.getElementById('gasto-metodo').value = 'Efectivo / Caja';
  document.getElementById('gasto-comprobante').value = '';

  document.getElementById('titulo-form-gasto').textContent = 'Registrar nuevo gasto del club';
  document.getElementById('btn-guardar-gasto').textContent = '💾 Registrar gasto';
  document.getElementById('btn-cancelar-gasto').classList.add('oculto');
}

function manejarGuardarGasto(evento) {
  evento.preventDefault();
  const editId = document.getElementById('gasto-edit-id').value;
  const datosGasto = {
    concepto: document.getElementById('gasto-concepto').value,
    categoria: document.getElementById('gasto-categoria').value,
    monto: document.getElementById('gasto-monto').value,
    fecha: document.getElementById('gasto-fecha').value,
    metodoPago: document.getElementById('gasto-metodo').value,
    comprobante: document.getElementById('gasto-comprobante').value
  };

  let resultado;
  if (editId === '') {
    resultado = registrarGastoAdmin(datosGasto);
  } else {
    resultado = editarGastoAdmin(Number(editId), datosGasto);
  }

  mostrarMensaje('mensaje-finanzas', resultado.mensaje, resultado.ok ? 'ok' : 'error');
  if (resultado.ok) {
    limpiarFormularioGasto();
    refrescarPanelFinanzas();
  }
}

// ---------- Exportación Contable a CSV / Excel ----------

function escaparCSV(valor) {
  const texto = String(valor === undefined || valor === null ? '' : valor);
  if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}

function exportarBalanceCSV() {
  const datos = obtenerBalanceActual();
  const b = datos.balance;
  const r = datos.rango;

  const lineas = [];
  lineas.push(['REPORTE FINANCIERO PADELYA CENTER'].join(';'));
  lineas.push(['Periodo', r.etiqueta].map(escaparCSV).join(';'));
  lineas.push(['Ingresos por Reservas', b.ingresosBrutos].map(escaparCSV).join(';'));
  lineas.push(['Gastos Registrados', -b.gastosTotales].map(escaparCSV).join(';'));
  lineas.push(['Ganancia Neta (Caja)', b.balanceNeto].map(escaparCSV).join(';'));
  lineas.push(['Rentabilidad (%)', b.margenRentabilidad + '%'].map(escaparCSV).join(';'));
  lineas.push('');
  lineas.push(['FECHA', 'TIPO', 'CATEGORIA', 'CONCEPTO / DETALLE', 'ORIGEN / MEDIO', 'MONTO ($)'].join(';'));

  b.movimientos.forEach(function (m) {
    const signoMonto = m.tipo === 'ingreso' ? m.monto : -m.monto;
    lineas.push([
      m.fecha,
      m.tipo === 'ingreso' ? 'INGRESO' : 'GASTO',
      m.categoria,
      m.concepto,
      m.responsable,
      signoMonto
    ].map(escaparCSV).join(';'));
  });

  // BOM UTF-8 para que Microsoft Excel abra tildes y símbolos correctamente
  const contenido = '\uFEFF' + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'balance-padelya-' + r.desde + '-a-' + r.hasta + '.csv';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);

  mostrarMensaje('mensaje-finanzas', 'Archivo CSV contable descargado correctamente.', 'ok');
}
