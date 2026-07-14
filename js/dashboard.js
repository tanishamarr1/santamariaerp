/* =====================================================================
   DASHBOARD.JS
   ===================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  construirLayout('dashboard.html');
  if (!localStorage.getItem('cs_usuario')) return;

  document.getElementById('kpi-fecha-hoy').textContent = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });

  await cargarKpis();
  await cargarUltimasFacturas();
});

async function cargarKpis() {
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const [{ count: totalFacturas }, { count: facturasHoy }, { data: totales }, { count: totalClientes }] = await Promise.all([
      supabaseClient.from('facturas').select('*', { count: 'exact', head: true }),
      supabaseClient.from('facturas').select('*', { count: 'exact', head: true }).eq('fecha', hoy),
      supabaseClient.from('facturas').select('total'),
      supabaseClient.from('clientes').select('*', { count: 'exact', head: true }),
    ]);

    document.getElementById('kpi-total-facturas').textContent = totalFacturas ?? 0;
    document.getElementById('kpi-facturas-hoy').textContent = facturasHoy ?? 0;
    document.getElementById('kpi-clientes').textContent = totalClientes ?? 0;

    const sumaTotal = (totales || []).reduce((acc, f) => acc + Number(f.total || 0), 0);
    document.getElementById('kpi-total-facturado').textContent = formatoMoneda(sumaTotal);

  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudieron cargar los indicadores. Revisa la conexión con Supabase.', 'error');
  }
}

async function cargarUltimasFacturas() {
  const tbody = document.getElementById('tabla-ultimas-facturas');
  try {
    const { data, error } = await supabaseClient
      .from('facturas')
      .select('id, numero, cliente_nombre, fecha, proyecto, estado, total')
      .order('creado_en', { ascending: false })
      .limit(8);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-file-invoice"></i><p>Todavía no has creado facturas.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(f => `
      <tr>
        <td class="mono">${f.numero}</td>
        <td>${f.cliente_nombre}</td>
        <td>${formatoFecha(f.fecha)}</td>
        <td>${f.proyecto || '—'}</td>
        <td>${badgeEstado(f.estado)}</td>
        <td class="mono">${formatoMoneda(f.total)}</td>
        <td><a href="factura.html?id=${f.id}" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i></a></td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--cancel); padding:20px;">Error al cargar facturas.</td></tr>`;
  }
}

function badgeEstado(estado) {
  const map = {
    'Pagado': 'badge-ok',
    'Pendiente': 'badge-pend',
    'Cancelado': 'badge-cancel'
  };
  return `<span class="badge ${map[estado] || 'badge-pend'}">${estado}</span>`;
}
