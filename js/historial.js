/* =====================================================================
   HISTORIAL.JS
   ===================================================================== */

let facturasCache = [];
let configuracionEmpresa = {};

document.addEventListener('DOMContentLoaded', async () => {
  construirLayout('historial.html');
  if (!localStorage.getItem('cs_usuario')) return;

  const { data: config } = await supabaseClient.from('configuracion').select('*').eq('id', 1).maybeSingle();
  configuracionEmpresa = config || {};

  await cargarFacturas();
  configurarEventos();
});

async function cargarFacturas() {
  const tbody = document.getElementById('tabla-historial');
  try {
    const { data, error } = await supabaseClient
      .from('facturas')
      .select('*')
      .order('creado_en', { ascending: false });
    if (error) throw error;
    facturasCache = data || [];
    aplicarFiltros();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--cancel); padding:20px;">Error al cargar el historial.</td></tr>`;
  }
}

function aplicarFiltros() {
  const texto = document.getElementById('input-buscar').value.trim().toLowerCase();
  const estado = document.getElementById('filtro-estado').value;
  const [campoOrden, direccion] = document.getElementById('filtro-orden').value.split('-');

  let lista = facturasCache.filter(f => {
    const coincideTexto = !texto || [f.numero, f.cliente_nombre, f.proyecto, f.fecha, f.estado]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(texto));
    const coincideEstado = !estado || f.estado === estado;
    return coincideTexto && coincideEstado;
  });

  lista.sort((a, b) => {
    let va = a[campoOrden], vb = b[campoOrden];
    if (campoOrden === 'total') { va = Number(va); vb = Number(vb); }
    if (va < vb) return direccion === 'asc' ? -1 : 1;
    if (va > vb) return direccion === 'asc' ? 1 : -1;
    return 0;
  });

  renderizarTabla(lista);
}

function renderizarTabla(lista) {
  const tbody = document.getElementById('tabla-historial');
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>No se encontraron facturas con esos filtros.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(f => `
    <tr>
      <td class="mono">${f.numero}</td>
      <td>${escapeHtml(f.cliente_nombre)}</td>
      <td>${formatoFecha(f.fecha)}</td>
      <td>${escapeHtml(f.proyecto || '—')}</td>
      <td>${badgeEstado(f.estado)}</td>
      <td class="mono">${formatoMoneda(f.total)}</td>
      <td>
        <div class="row-actions">
          <a href="factura.html?id=${f.id}" class="btn btn-ghost btn-icon" title="Editar"><i class="fa-solid fa-pen"></i></a>
          <button class="btn btn-ghost btn-icon" title="Duplicar" onclick="duplicarFactura('${f.id}')"><i class="fa-solid fa-copy"></i></button>
          <button class="btn btn-ghost btn-icon" title="Descargar PDF" onclick="redescargarPDF('${f.id}')"><i class="fa-solid fa-download"></i></button>
          <button class="btn btn-ghost btn-icon" title="Enviar por correo" onclick="enviarFactura('${f.id}')"><i class="fa-solid fa-paper-plane"></i></button>
          <button class="btn btn-ghost btn-icon" title="Eliminar" onclick="confirmarEliminar('${f.id}', '${f.numero}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function badgeEstado(estado) {
  const map = { 'Pagado': 'badge-ok', 'Pendiente': 'badge-pend', 'Cancelado': 'badge-cancel' };
  return `<span class="badge ${map[estado] || 'badge-pend'}">${estado}</span>`;
}
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function duplicarFactura(id) {
  window.location.href = `factura.html?duplicar=${id}`;
}

async function redescargarPDF(id) {
  mostrarNotificacion('Generando PDF...');
  try {
    const { data: factura } = await supabaseClient.from('facturas').select('*').eq('id', id).maybeSingle();
    const { data: items } = await supabaseClient.from('factura_items').select('*').eq('factura_id', id).order('orden');
    const datos = { ...factura, items: items || [] };
    document.getElementById('invoice-doc-hidden').innerHTML = renderizarFacturaHTML(datos, configuracionEmpresa);
    await new Promise(r => setTimeout(r, 150));
    await descargarFacturaPDF('invoice-doc-hidden', factura.numero);
    mostrarNotificacion('PDF descargado correctamente.');
  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo generar el PDF.', 'error');
  }
}

function enviarFactura(id) {
  const factura = facturasCache.find(f => f.id === id);
  if (!factura) return;
  if (!factura.cliente_correo) {
    mostrarNotificacion('Este cliente no tiene correo registrado.', 'error');
    return;
  }
  const asunto = encodeURIComponent(`Factura ${factura.numero} - ${configuracionEmpresa.nombre_empresa || 'Constructora Santamaria'}`);
  const cuerpo = encodeURIComponent(`Hola ${factura.cliente_nombre},\n\nAdjunto encontrarás la factura ${factura.numero} por un total de ${formatoMoneda(factura.total)}.\n\nGracias por tu confianza.`);
  window.location.href = `mailto:${factura.cliente_correo}?subject=${asunto}&body=${cuerpo}`;
  mostrarNotificacion('Abriendo tu cliente de correo. Recuerda adjuntar el PDF descargado.');
}

function confirmarEliminar(id, numero) {
  mostrarConfirmacion(
    'Eliminar factura',
    `¿Seguro que quieres eliminar la factura ${numero}? Esta acción no se puede deshacer.`,
    () => eliminarFactura(id),
    'Eliminar'
  );
}

async function eliminarFactura(id) {
  try {
    await supabaseClient.from('factura_items').delete().eq('factura_id', id);
    const { error } = await supabaseClient.from('facturas').delete().eq('id', id);
    if (error) throw error;
    mostrarNotificacion('Factura eliminada correctamente.');
    await cargarFacturas();
  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo eliminar la factura.', 'error');
  }
}

/* ---------------------- Exportaciones ---------------------- */
function datosParaExportar() {
  return facturasCache.map(f => ({
    Numero: f.numero, Cliente: f.cliente_nombre, Fecha: f.fecha, Proyecto: f.proyecto || '',
    Estado: f.estado, MetodoPago: f.metodo_pago, Subtotal: f.subtotal, ITBIS: f.itbis, Total: f.total
  }));
}

function exportarCSV() {
  const datos = datosParaExportar();
  if (datos.length === 0) { mostrarNotificacion('No hay facturas para exportar.', 'error'); return; }
  const encabezados = Object.keys(datos[0]).join(',');
  const filas = datos.map(d => Object.values(d).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [encabezados, ...filas].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  descargarBlob(blob, 'facturas.csv');
  mostrarNotificacion('CSV exportado correctamente.');
}

function exportarExcel() {
  const datos = datosParaExportar();
  if (datos.length === 0) { mostrarNotificacion('No hay facturas para exportar.', 'error'); return; }
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  XLSX.writeFile(wb, 'facturas.xlsx');
  mostrarNotificacion('Excel exportado correctamente.');
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------------- Eventos ---------------------- */
function configurarEventos() {
  document.getElementById('input-buscar').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-orden').addEventListener('change', aplicarFiltros);
  document.getElementById('btn-export-csv').addEventListener('click', exportarCSV);
  document.getElementById('btn-export-excel').addEventListener('click', exportarExcel);
}
