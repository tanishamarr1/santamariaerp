/* =====================================================================
   FACTURA.JS
   ===================================================================== */

let configuracionEmpresa = {};
let productosState = [];
let clienteSeleccionadoId = null;
let facturaEditandoId = null;
let autosaveTimer = null;
const ITBIS_RATE = 0.18;

document.addEventListener('DOMContentLoaded', async () => {
  construirLayout('factura.html');
  if (!localStorage.getItem('cs_usuario')) return;

  document.getElementById('f-fecha').value = new Date().toISOString().slice(0, 10);

  await cargarConfiguracion();

  const params = new URLSearchParams(window.location.search);
  const idFactura = params.get('id');
  const idDuplicar = params.get('duplicar');

  if (idFactura) {
    facturaEditandoId = idFactura;
    document.getElementById('titulo-pagina').textContent = 'Editar factura';
    document.getElementById('modo-eyebrow').textContent = 'Documento existente';
    await cargarFacturaExistente(idFactura, false);
  } else if (idDuplicar) {
    document.getElementById('titulo-pagina').textContent = 'Duplicar factura';
    document.getElementById('modo-eyebrow').textContent = 'Copia de documento';
    await cargarFacturaExistente(idDuplicar, true);
    await asignarNumeroNuevo();
  } else {
    agregarProducto();
    await asignarNumeroNuevo();
    cargarUltimoClienteUsado();
  }

  actualizarPreview();
  configurarEventos();
});

/* ---------------------- Configuración de empresa ---------------------- */
async function cargarConfiguracion() {
  try {
    const { data } = await supabaseClient.from('configuracion').select('*').eq('id', 1).maybeSingle();
    configuracionEmpresa = data || {};
  } catch (err) {
    console.error(err);
    configuracionEmpresa = {};
  }
}

async function asignarNumeroNuevo() {
  try {
    const { data, error } = await supabaseClient.rpc('siguiente_numero_factura');
    if (error) throw error;
    document.getElementById('numero-factura-plate').textContent = data;
  } catch (err) {
    console.error(err);
    document.getElementById('numero-factura-plate').textContent = 'FAC-' + String(Date.now()).slice(-6);
  }
}

function cargarUltimoClienteUsado() {
  const ultimo = localStorage.getItem('cs_ultimo_cliente');
  if (!ultimo) return;
  try {
    const c = JSON.parse(ultimo);
    document.getElementById('f-cliente-nombre').value = c.nombre || '';
    document.getElementById('f-cliente-rnc').value = c.rnc || '';
    document.getElementById('f-cliente-telefono').value = c.telefono || '';
    document.getElementById('f-cliente-correo').value = c.correo || '';
    document.getElementById('f-cliente-direccion').value = c.direccion || '';
    clienteSeleccionadoId = c.id || null;
  } catch (e) { /* ignore */ }
}

/* ---------------------- Cargar factura existente (editar/duplicar) ---------------------- */
async function cargarFacturaExistente(id, esDuplicado) {
  try {
    const { data: factura, error } = await supabaseClient.from('facturas').select('*').eq('id', id).maybeSingle();
    if (error || !factura) throw error || new Error('No encontrada');

    const { data: items } = await supabaseClient.from('factura_items').select('*').eq('factura_id', id).order('orden');

    if (!esDuplicado) {
      document.getElementById('numero-factura-plate').textContent = factura.numero;
    }
    document.getElementById('f-fecha').value = factura.fecha;
    document.getElementById('f-proyecto').value = factura.proyecto || '';
    document.getElementById('f-metodo-pago').value = factura.metodo_pago || 'Efectivo';
    document.getElementById('f-estado').value = factura.estado || 'Pendiente';
    document.getElementById('f-cliente-nombre').value = factura.cliente_nombre || '';
    document.getElementById('f-cliente-rnc').value = factura.cliente_rnc || '';
    document.getElementById('f-cliente-telefono').value = factura.cliente_telefono || '';
    document.getElementById('f-cliente-correo').value = factura.cliente_correo || '';
    document.getElementById('f-cliente-direccion').value = factura.cliente_direccion || '';
    document.getElementById('f-observaciones').value = factura.observaciones || '';
    document.getElementById('chk-aplicar-itbis').checked = Number(factura.itbis) > 0;
    clienteSeleccionadoId = factura.cliente_id;

    productosState = (items || []).map(it => ({
      id: cryptoId(), descripcion: it.descripcion, precio: it.precio, cantidad: it.cantidad, total: it.total
    }));
    if (productosState.length === 0) productosState.push(nuevoProductoVacio());
    renderizarProductos();

  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo cargar la factura.', 'error');
  }
}

/* ---------------------- Productos ---------------------- */
function nuevoProductoVacio() {
  return { id: cryptoId(), descripcion: '', precio: 0, cantidad: 1, total: 0 };
}
function cryptoId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function agregarProducto() {
  productosState.push(nuevoProductoVacio());
  renderizarProductos();
}

function eliminarProducto(id) {
  if (productosState.length === 1) {
    mostrarNotificacion('Debe haber al menos un producto.', 'error');
    return;
  }
  productosState = productosState.filter(p => p.id !== id);
  renderizarProductos();
  calcularTotales();
}

function renderizarProductos() {
  const tbody = document.getElementById('tabla-productos');
  tbody.innerHTML = productosState.map(p => `
    <tr data-id="${p.id}">
      <td data-label="Descripción"><input type="text" class="prod-desc" value="${escapeAttr(p.descripcion)}" placeholder="Ej. Bloques de concreto"></td>
      <td data-label="Precio"><input type="number" class="prod-precio" min="0" step="0.01" value="${p.precio}"></td>
      <td data-label="Cantidad"><input type="number" class="prod-cant" min="0" step="1" value="${p.cantidad}"></td>
      <td class="col-total" data-label="Total">${formatoMoneda(p.total)}</td>
      <td class="col-del"><button class="btn btn-ghost btn-icon btn-eliminar-prod" title="Eliminar"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelector('.prod-desc').addEventListener('input', (e) => actualizarProducto(id, 'descripcion', e.target.value));
    tr.querySelector('.prod-precio').addEventListener('input', (e) => actualizarProducto(id, 'precio', e.target.value));
    tr.querySelector('.prod-cant').addEventListener('input', (e) => actualizarProducto(id, 'cantidad', e.target.value));
    tr.querySelector('.btn-eliminar-prod').addEventListener('click', () => eliminarProducto(id));
  });
}

function actualizarProducto(id, campo, valor) {
  const p = productosState.find(x => x.id === id);
  if (!p) return;
  p[campo] = campo === 'descripcion' ? valor : Number(valor) || 0;
  p.total = (Number(p.precio) || 0) * (Number(p.cantidad) || 0);

  // Solo actualizamos el total de esta fila en el DOM (sin redibujar toda la
  // tabla), para no perder el foco ni el cursor del campo donde se está escribiendo.
  const fila = document.querySelector(`#tabla-productos tr[data-id="${id}"]`);
  if (fila) {
    const celdaTotal = fila.querySelector('.col-total');
    if (celdaTotal) celdaTotal.textContent = formatoMoneda(p.total);
  }

  calcularTotales();
  actualizarPreview();
  dispararAutosave();
}

function calcularTotales() {
  const subtotal = productosState.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const aplicaItbis = document.getElementById('chk-aplicar-itbis')?.checked ?? true;
  const itbis = aplicaItbis ? subtotal * ITBIS_RATE : 0;
  const total = subtotal + itbis;
  document.getElementById('txt-subtotal').textContent = formatoMoneda(subtotal);
  document.getElementById('txt-itbis').textContent = formatoMoneda(itbis);
  document.getElementById('txt-total').textContent = formatoMoneda(total);
  return { subtotal, itbis, total, aplicaItbis };
}

/* ---------------------- Recolectar datos del formulario ---------------------- */
function recolectarDatosFormulario() {
  const totales = calcularTotales();
  return {
    numero: document.getElementById('numero-factura-plate').textContent,
    fecha: document.getElementById('f-fecha').value,
    proyecto: document.getElementById('f-proyecto').value.trim(),
    metodo_pago: document.getElementById('f-metodo-pago').value,
    estado: document.getElementById('f-estado').value,
    cliente_nombre: document.getElementById('f-cliente-nombre').value.trim(),
    cliente_rnc: document.getElementById('f-cliente-rnc').value.trim(),
    cliente_telefono: document.getElementById('f-cliente-telefono').value.trim(),
    cliente_correo: document.getElementById('f-cliente-correo').value.trim(),
    cliente_direccion: document.getElementById('f-cliente-direccion').value.trim(),
    observaciones: document.getElementById('f-observaciones').value.trim(),
    items: productosState.filter(p => p.descripcion.trim() !== ''),
    subtotal: totales.subtotal,
    itbis: totales.itbis,
    total: totales.total,
    aplicaItbis: totales.aplicaItbis,
  };
}

/* ---------------------- Vista previa ---------------------- */
function actualizarPreview() {
  const datos = recolectarDatosFormulario();
  document.getElementById('invoice-doc').innerHTML = renderizarFacturaHTML(datos, configuracionEmpresa);
}

/* ---------------------- Autocompletado de clientes ---------------------- */
let debounceBusqueda = null;
async function buscarClientesAutocomplete(texto) {
  const lista = document.getElementById('cliente-autocomplete');
  if (!texto || texto.length < 2) { lista.classList.remove('show'); return; }

  try {
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('id, nombre, telefono, correo, direccion, rnc')
      .ilike('nombre', `%${texto}%`)
      .limit(6);
    if (error) throw error;

    if (!data || data.length === 0) { lista.classList.remove('show'); return; }

    lista.innerHTML = data.map(c => `
      <div class="autocomplete-item" data-id="${c.id}">
        ${escapeHtml(c.nombre)}
        <div class="sub">${escapeHtml(c.telefono || '')} ${c.correo ? '· ' + escapeHtml(c.correo) : ''}</div>
      </div>
    `).join('');
    lista.classList.add('show');

    lista.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const c = data.find(x => x.id === item.dataset.id);
        document.getElementById('f-cliente-nombre').value = c.nombre;
        document.getElementById('f-cliente-rnc').value = c.rnc || '';
        document.getElementById('f-cliente-telefono').value = c.telefono || '';
        document.getElementById('f-cliente-correo').value = c.correo || '';
        document.getElementById('f-cliente-direccion').value = c.direccion || '';
        clienteSeleccionadoId = c.id;
        lista.classList.remove('show');
        actualizarPreview();
      });
    });
  } catch (err) {
    console.error(err);
  }
}

/* ---------------------- Autosave (borrador local) ---------------------- */
function dispararAutosave() {
  const ind = document.getElementById('autosave-indicator');
  ind.textContent = 'Guardando...';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    localStorage.setItem('cs_borrador_factura', JSON.stringify(recolectarDatosFormulario()));
    ind.textContent = 'Borrador guardado ' + new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  }, 900);
}

/* ---------------------- Guardar en Supabase ---------------------- */
async function guardarFactura() {
  const datos = recolectarDatosFormulario();

  if (!datos.cliente_nombre) {
    mostrarNotificacion('Escribe el nombre del cliente antes de guardar.', 'error');
    return;
  }
  if (datos.items.length === 0) {
    mostrarNotificacion('Agrega al menos un producto con descripción.', 'error');
    return;
  }

  const btn = document.getElementById('btn-guardar');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
    // 1. Asegurar/crear cliente
    let clienteId = clienteSeleccionadoId;
    if (!clienteId) {
      const { data: nuevoCliente, error: errCliente } = await supabaseClient
        .from('clientes')
        .insert({
          nombre: datos.cliente_nombre, telefono: datos.cliente_telefono,
          correo: datos.cliente_correo, direccion: datos.cliente_direccion, rnc: datos.cliente_rnc
        }).select().single();
      if (errCliente) throw errCliente;
      clienteId = nuevoCliente.id;
      clienteSeleccionadoId = clienteId;
    }

    localStorage.setItem('cs_ultimo_cliente', JSON.stringify({ id: clienteId, ...datos }));

    const payload = {
      numero: datos.numero, fecha: datos.fecha, cliente_id: clienteId,
      cliente_nombre: datos.cliente_nombre, cliente_rnc: datos.cliente_rnc,
      cliente_telefono: datos.cliente_telefono, cliente_correo: datos.cliente_correo,
      cliente_direccion: datos.cliente_direccion, proyecto: datos.proyecto,
      observaciones: datos.observaciones, metodo_pago: datos.metodo_pago, estado: datos.estado,
      subtotal: datos.subtotal, itbis: datos.itbis, total: datos.total,
      actualizado_en: new Date().toISOString()
    };

    let facturaId = facturaEditandoId;

    if (facturaId) {
      const { error: errUpd } = await supabaseClient.from('facturas').update(payload).eq('id', facturaId);
      if (errUpd) throw errUpd;
      await supabaseClient.from('factura_items').delete().eq('factura_id', facturaId);
    } else {
      const { data: nuevaFactura, error: errIns } = await supabaseClient.from('facturas').insert(payload).select().single();
      if (errIns) throw errIns;
      facturaId = nuevaFactura.id;
      facturaEditandoId = facturaId;
    }

    const itemsPayload = datos.items.map((it, idx) => ({
      factura_id: facturaId, descripcion: it.descripcion, precio: it.precio, cantidad: it.cantidad, total: it.total, orden: idx
    }));
    const { error: errItems } = await supabaseClient.from('factura_items').insert(itemsPayload);
    if (errItems) throw errItems;

    localStorage.removeItem('cs_borrador_factura');
    mostrarNotificacion('Factura guardada correctamente.');
    window.history.replaceState({}, '', `factura.html?id=${facturaId}`);

  } catch (err) {
    console.error(err);
    mostrarNotificacion('Ocurrió un error al guardar la factura.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar factura';
  }
}

/* ---------------------- Eventos ---------------------- */
function configurarEventos() {
  document.getElementById('btn-agregar-producto').addEventListener('click', agregarProducto);
  document.getElementById('btn-guardar').addEventListener('click', guardarFactura);
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

  document.getElementById('btn-descargar-pdf').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
    const numero = document.getElementById('numero-factura-plate').textContent;
    try {
      await descargarFacturaPDF('invoice-doc', numero);
      mostrarNotificacion('PDF descargado correctamente.');
    } catch (err) {
      console.error(err);
      mostrarNotificacion('No se pudo generar el PDF.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar PDF';
    }
  });

  ['f-fecha', 'f-proyecto', 'f-metodo-pago', 'f-estado', 'f-cliente-rnc', 'f-cliente-telefono', 'f-cliente-correo', 'f-cliente-direccion', 'f-observaciones'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { actualizarPreview(); dispararAutosave(); });
  });

  document.getElementById('chk-aplicar-itbis').addEventListener('change', () => {
    calcularTotales();
    actualizarPreview();
    dispararAutosave();
  });

  const nombreInput = document.getElementById('f-cliente-nombre');
  nombreInput.addEventListener('input', (e) => {
    clienteSeleccionadoId = null;
    clearTimeout(debounceBusqueda);
    debounceBusqueda = setTimeout(() => buscarClientesAutocomplete(e.target.value.trim()), 250);
    actualizarPreview();
    dispararAutosave();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      document.getElementById('cliente-autocomplete').classList.remove('show');
    }
  });

  calcularTotales();
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
