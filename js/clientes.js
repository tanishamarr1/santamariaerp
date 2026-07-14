/* =====================================================================
   CLIENTES.JS
   ===================================================================== */

let clientesCache = [];
let clienteEditandoId = null;

document.addEventListener('DOMContentLoaded', async () => {
  construirLayout('clientes.html');
  if (!localStorage.getItem('cs_usuario')) return;

  await cargarClientes();
  configurarEventos();
});

async function cargarClientes() {
  const tbody = document.getElementById('tabla-clientes');
  try {
    const { data: clientes, error } = await supabaseClient.from('clientes').select('*').order('nombre');
    if (error) throw error;

    const { data: facturas } = await supabaseClient.from('facturas').select('cliente_id');
    const conteo = {};
    (facturas || []).forEach(f => { conteo[f.cliente_id] = (conteo[f.cliente_id] || 0) + 1; });

    clientesCache = (clientes || []).map(c => ({ ...c, num_facturas: conteo[c.id] || 0 }));
    renderizarTabla(clientesCache);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--cancel); padding:20px;">Error al cargar clientes.</td></tr>`;
  }
}

function renderizarTabla(lista) {
  const tbody = document.getElementById('tabla-clientes');
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-address-book"></i><p>Aún no hay clientes registrados.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.nombre)}</strong></td>
      <td>${escapeHtml(c.telefono || '—')}</td>
      <td>${escapeHtml(c.correo || '—')}</td>
      <td class="mono">${escapeHtml(c.rnc || '—')}</td>
      <td><a href="historial.html" class="badge badge-pend" style="text-decoration:none;">${c.num_facturas} factura(s)</a></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-icon" title="Nueva factura" onclick="facturarCliente('${c.id}')"><i class="fa-solid fa-file-invoice"></i></button>
          <button class="btn btn-ghost btn-icon" title="Editar" onclick="editarCliente('${c.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost btn-icon" title="Eliminar" onclick="confirmarEliminarCliente('${c.id}', '${escapeAttr(c.nombre)}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function facturarCliente(id) {
  const c = clientesCache.find(x => x.id === id);
  if (!c) return;
  localStorage.setItem('cs_ultimo_cliente', JSON.stringify(c));
  window.location.href = 'factura.html';
}

function editarCliente(id) {
  const c = clientesCache.find(x => x.id === id);
  if (!c) return;
  clienteEditandoId = id;
  document.getElementById('cliente-modal-titulo').textContent = 'Editar cliente';
  document.getElementById('cm-nombre').value = c.nombre || '';
  document.getElementById('cm-telefono').value = c.telefono || '';
  document.getElementById('cm-rnc').value = c.rnc || '';
  document.getElementById('cm-correo').value = c.correo || '';
  document.getElementById('cm-direccion').value = c.direccion || '';
  abrirModalCliente();
}

function confirmarEliminarCliente(id, nombre) {
  mostrarConfirmacion(
    'Eliminar cliente',
    `¿Seguro que quieres eliminar a ${nombre}? Sus facturas existentes no se eliminarán.`,
    () => eliminarCliente(id),
    'Eliminar'
  );
}

async function eliminarCliente(id) {
  try {
    const { error } = await supabaseClient.from('clientes').delete().eq('id', id);
    if (error) throw error;
    mostrarNotificacion('Cliente eliminado correctamente.');
    await cargarClientes();
  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo eliminar el cliente.', 'error');
  }
}

function abrirModalCliente() {
  document.getElementById('cliente-modal-overlay').classList.add('show');
}
function cerrarModalCliente() {
  document.getElementById('cliente-modal-overlay').classList.remove('show');
  clienteEditandoId = null;
  ['cm-nombre', 'cm-telefono', 'cm-rnc', 'cm-correo', 'cm-direccion'].forEach(id => document.getElementById(id).value = '');
}

async function guardarCliente() {
  const nombre = document.getElementById('cm-nombre').value.trim();
  if (!nombre) { mostrarNotificacion('El nombre del cliente es obligatorio.', 'error'); return; }

  const payload = {
    nombre,
    telefono: document.getElementById('cm-telefono').value.trim(),
    rnc: document.getElementById('cm-rnc').value.trim(),
    correo: document.getElementById('cm-correo').value.trim(),
    direccion: document.getElementById('cm-direccion').value.trim(),
    actualizado_en: new Date().toISOString()
  };

  const btn = document.getElementById('cm-guardar');
  btn.disabled = true;
  try {
    if (clienteEditandoId) {
      const { error } = await supabaseClient.from('clientes').update(payload).eq('id', clienteEditandoId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('clientes').insert(payload);
      if (error) throw error;
    }
    mostrarNotificacion('Cliente guardado correctamente.');
    cerrarModalCliente();
    await cargarClientes();
  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo guardar el cliente.', 'error');
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'");
}

function configurarEventos() {
  document.getElementById('btn-nuevo-cliente').addEventListener('click', () => {
    clienteEditandoId = null;
    document.getElementById('cliente-modal-titulo').textContent = 'Nuevo cliente';
    abrirModalCliente();
  });
  document.getElementById('cm-cancelar').addEventListener('click', cerrarModalCliente);
  document.getElementById('cm-guardar').addEventListener('click', guardarCliente);
  document.getElementById('cliente-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'cliente-modal-overlay') cerrarModalCliente();
  });
  document.getElementById('input-buscar-cliente').addEventListener('input', (e) => {
    const texto = e.target.value.trim().toLowerCase();
    const filtrados = clientesCache.filter(c =>
      [c.nombre, c.correo, c.telefono, c.rnc].filter(Boolean).some(v => String(v).toLowerCase().includes(texto))
    );
    renderizarTabla(filtrados);
  });
}
