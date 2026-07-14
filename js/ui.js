/* =====================================================================
   UI.JS - Utilidades compartidas por todas las páginas
   ===================================================================== */

/* ---------------------- Protección de rutas ---------------------- */
function requireLogin() {
  const user = localStorage.getItem('cs_usuario');
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return JSON.parse(user);
}

function cerrarSesion() {
  mostrarConfirmacion(
    'Cerrar sesión',
    '¿Seguro que quieres salir de tu cuenta?',
    () => {
      localStorage.removeItem('cs_usuario');
      window.location.href = 'index.html';
    }
  );
}

/* ---------------------- Toasts ---------------------- */
function mostrarNotificacion(mensaje, tipo = 'ok') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (tipo === 'error' ? ' toast-error' : '');
  const icon = tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${mensaje}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

/* ---------------------- Modal de confirmación ---------------------- */
function mostrarConfirmacion(titulo, mensaje, onConfirm, textoBoton = 'Confirmar') {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${titulo}</h3>
      <p>${mensaje}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
        <button class="btn btn-danger" id="modal-confirm">${textoBoton}</button>
      </div>
    </div>`;
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => overlay.classList.remove('show');
  overlay.querySelector('#modal-cancel').onclick = close;
  overlay.querySelector('#modal-confirm').onclick = () => { close(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

/* ---------------------- Modo oscuro ---------------------- */
function aplicarTemaGuardado() {
  const tema = localStorage.getItem('cs_tema') || 'light';
  document.documentElement.setAttribute('data-theme', tema);
}
function alternarTema() {
  const actual = document.documentElement.getAttribute('data-theme');
  const nuevo = actual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nuevo);
  localStorage.setItem('cs_tema', nuevo);
  actualizarIconoTema();
}
function actualizarIconoTema() {
  const btn = document.getElementById('theme-toggle-icon');
  if (!btn) return;
  const tema = document.documentElement.getAttribute('data-theme');
  btn.className = tema === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

/* ---------------------- Sidebar móvil ---------------------- */
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.querySelector('.sidebar-overlay')?.classList.toggle('show');
}

/* ---------------------- Formato de moneda ---------------------- */
function formatoMoneda(valor) {
  const n = Number(valor) || 0;
  return 'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatoFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ---------------------- Layout común (sidebar + topbar) ---------------------- */
function construirLayout(paginaActiva) {
  const user = requireLogin();
  if (!user) return;

  const nav = [
    { href: 'dashboard.html', icon: 'fa-gauge', label: 'Panel' },
    { href: 'factura.html', icon: 'fa-file-invoice', label: 'Nueva factura' },
    { href: 'historial.html', icon: 'fa-clock-rotate-left', label: 'Historial' },
    { href: 'clientes.html', icon: 'fa-address-book', label: 'Clientes' },
    { href: 'estadisticas.html', icon: 'fa-chart-line', label: 'Estadísticas' },
    { href: 'configuracion.html', icon: 'fa-gear', label: 'Configuración' },
  ];

  const navHtml = nav.map(n => `
    <a class="nav-link ${n.href === paginaActiva ? 'active' : ''}" href="${n.href}">
      <i class="fa-solid ${n.icon}"></i> ${n.label}
    </a>`).join('');

  const shell = document.getElementById('app-shell');
  shell.insertAdjacentHTML('afterbegin', `
    <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
    <aside class="sidebar">
      <div class="sidebar-brand">
        <img class="mark logo-img" src="assets/logo-icon.png" alt="Santamaria Constructora">
        <div>
          <div class="name">Santamaria</div>
          <div class="sub">Constructora</div>
        </div>
      </div>
      <nav class="nav-group">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="avatar">${user.nombre_usuario[0].toUpperCase()}</div>
          <div class="uname">${user.nombre_usuario}</div>
        </div>
        <a class="nav-link" href="#" onclick="cerrarSesion(); return false;">
          <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
        </a>
      </div>
    </aside>
  `);

  aplicarTemaGuardado();
  actualizarIconoTema();
}
