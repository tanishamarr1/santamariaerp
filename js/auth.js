/* =====================================================================
   AUTH.JS - Login contra la tabla "usuarios" en Supabase
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  aplicarTemaGuardado();

  // Si ya hay sesión activa, saltar directo al panel
  if (localStorage.getItem('cs_usuario')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('form-login');
  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');

    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';

    try {
      const { data, error } = await supabaseClient
        .from('usuarios')
        .select('id, nombre_usuario, password')
        .ilike('nombre_usuario', usuario)
        .maybeSingle();

      if (error) throw error;

      if (!data || data.password !== password) {
        errorBox.classList.add('show');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión';
        return;
      }

      localStorage.setItem('cs_usuario', JSON.stringify({
        id: data.id,
        nombre_usuario: data.nombre_usuario
      }));
      window.location.href = 'dashboard.html';

    } catch (err) {
      console.error(err);
      errorBox.textContent = 'No se pudo conectar con la base de datos. Revisa tu configuración de Supabase (js/supabase-config.js).';
      errorBox.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión';
    }
  });
});
