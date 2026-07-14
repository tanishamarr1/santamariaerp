/* =====================================================================
   CONFIGURACION.JS
   ===================================================================== */

const COLORES_SUGERIDOS = ['#97742F', '#17181A', '#2F5C3F', '#8A2E2E', '#3B5C8A', '#6B4E9E'];
let logoBase64 = '';
let firmaBase64 = '';

document.addEventListener('DOMContentLoaded', async () => {
  construirLayout('configuracion.html');
  if (!localStorage.getItem('cs_usuario')) return;

  renderizarSwatches();
  await cargarConfiguracion();
  configurarEventos();
});

function renderizarSwatches(colorActivo) {
  const cont = document.getElementById('color-swatches');
  cont.innerHTML = COLORES_SUGERIDOS.map(c => `
    <div class="color-swatch ${c === colorActivo ? 'active' : ''}" style="background:${c}" data-color="${c}"></div>
  `).join('');
  cont.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.getElementById('c-color').value = sw.dataset.color;
      renderizarSwatches(sw.dataset.color);
    });
  });
}

async function cargarConfiguracion() {
  try {
    const { data, error } = await supabaseClient.from('configuracion').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) return;

    document.getElementById('c-nombre-empresa').value = data.nombre_empresa || '';
    document.getElementById('c-direccion').value = data.direccion || '';
    document.getElementById('c-telefono').value = data.telefono || '';
    document.getElementById('c-correo').value = data.correo || '';
    document.getElementById('c-pie-pagina').value = data.pie_pagina || '';
    document.getElementById('c-color').value = data.color_principal || '#97742F';
    renderizarSwatches(data.color_principal);

    if (data.logo_url) {
      logoBase64 = data.logo_url;
      mostrarPreview('logo', logoBase64);
    }
    if (data.firma_url) {
      firmaBase64 = data.firma_url;
      mostrarPreview('firma', firmaBase64);
    }
  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo cargar la configuración.', 'error');
  }
}

function mostrarPreview(tipo, base64) {
  document.getElementById(`${tipo}-preview`).src = base64;
  document.getElementById(`${tipo}-preview`).style.display = 'block';
  document.getElementById(`${tipo}-placeholder`).style.display = 'none';
}

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function guardarConfiguracion() {
  const btn = document.getElementById('btn-guardar-config');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  const payload = {
    nombre_empresa: document.getElementById('c-nombre-empresa').value.trim(),
    direccion: document.getElementById('c-direccion').value.trim(),
    telefono: document.getElementById('c-telefono').value.trim(),
    correo: document.getElementById('c-correo').value.trim(),
    pie_pagina: document.getElementById('c-pie-pagina').value.trim(),
    color_principal: document.getElementById('c-color').value.trim() || '#97742F',
    logo_url: logoBase64,
    firma_url: firmaBase64,
  };

  try {
    const { error } = await supabaseClient.from('configuracion').update(payload).eq('id', 1);
    if (error) throw error;
    document.documentElement.style.setProperty('--accent', payload.color_principal);
    mostrarNotificacion('Configuración guardada correctamente.');
  } catch (err) {
    console.error(err);
    mostrarNotificacion('No se pudo guardar la configuración.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
  }
}

function configurarEventos() {
  document.getElementById('btn-guardar-config').addEventListener('click', guardarConfiguracion);

  document.getElementById('input-logo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    logoBase64 = await leerArchivoComoBase64(file);
    mostrarPreview('logo', logoBase64);
  });

  document.getElementById('input-firma').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    firmaBase64 = await leerArchivoComoBase64(file);
    mostrarPreview('firma', firmaBase64);
  });
}
