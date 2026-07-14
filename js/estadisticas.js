/* =====================================================================
   ESTADISTICAS.JS
   ===================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  construirLayout('estadisticas.html');
  if (!localStorage.getItem('cs_usuario')) return;

  const colorInk = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#17181A';
  const colorAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#97742F';
  const colorLine = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#E4E3DE';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();

  try {
    const [{ data: facturas }, { data: clientes }] = await Promise.all([
      supabaseClient.from('facturas').select('fecha, total, estado, creado_en'),
      supabaseClient.from('clientes').select('creado_en'),
    ]);

    const meses = ultimosMeses(6);

    // Facturas por mes
    const conteoFacturas = meses.map(m => (facturas || []).filter(f => f.fecha && f.fecha.startsWith(m.key)).length);
    new Chart(document.getElementById('chart-facturas-mes'), {
      type: 'bar',
      data: { labels: meses.map(m => m.label), datasets: [{ label: 'Facturas', data: conteoFacturas, backgroundColor: colorInk, borderRadius: 6, maxBarThickness: 40 }] },
      options: baseOptions(colorLine)
    });

    // Ingresos por mes
    const ingresos = meses.map(m => (facturas || []).filter(f => f.fecha && f.fecha.startsWith(m.key)).reduce((acc, f) => acc + Number(f.total || 0), 0));
    new Chart(document.getElementById('chart-ingresos-mes'), {
      type: 'line',
      data: { labels: meses.map(m => m.label), datasets: [{ label: 'Ingresos', data: ingresos, borderColor: colorAccent, backgroundColor: colorAccent + '22', fill: true, tension: 0.35, pointRadius: 3 }] },
      options: baseOptions(colorLine)
    });

    // Clientes nuevos por mes
    const nuevos = meses.map(m => (clientes || []).filter(c => c.creado_en && c.creado_en.startsWith(m.key)).length);
    new Chart(document.getElementById('chart-clientes-nuevos'), {
      type: 'bar',
      data: { labels: meses.map(m => m.label), datasets: [{ label: 'Clientes nuevos', data: nuevos, backgroundColor: colorAccent, borderRadius: 6, maxBarThickness: 40 }] },
      options: baseOptions(colorLine)
    });

    // Estado de facturas
    const pagadas = (facturas || []).filter(f => f.estado === 'Pagado').length;
    const pendientes = (facturas || []).filter(f => f.estado === 'Pendiente').length;
    const canceladas = (facturas || []).filter(f => f.estado === 'Cancelado').length;
    new Chart(document.getElementById('chart-estado-facturas'), {
      type: 'doughnut',
      data: {
        labels: ['Pagadas', 'Pendientes', 'Canceladas'],
        datasets: [{ data: [pagadas, pendientes, canceladas], backgroundColor: ['#2F5C3F', '#8A6A16', '#8A2E2E'], borderWidth: 0 }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '65%' }
    });

  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudieron cargar las estadísticas.', 'error');
  }
});

function ultimosMeses(cantidad) {
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const resultado = [];
  const hoy = new Date();
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    resultado.push({ key, label: `${nombres[d.getMonth()]} ${d.getFullYear()}` });
  }
  return resultado;
}

function baseOptions(colorLine) {
  return {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: colorLine }, beginAtZero: true }
    }
  };
}
