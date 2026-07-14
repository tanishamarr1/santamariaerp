# Constructora Santamaria — Sistema de Facturación

Aplicación web para generar, guardar y administrar facturas profesionales en PDF.
Construida con **HTML5 + CSS3 + JavaScript puro** (sin frameworks) y **Supabase** como base de datos.

---

## 1. Estructura del proyecto

```
constructora-santamaria/
├── index.html              → Login
├── dashboard.html           → Panel principal (KPIs)
├── factura.html             → Generador de facturas + vista previa + PDF
├── historial.html           → Historial, búsqueda, filtros, exportar
├── clientes.html             → Módulo de clientes
├── configuracion.html        → Datos de empresa, logo, firma, color
├── estadisticas.html         → Gráficos del negocio
├── css/
│   └── styles.css            → Todo el diseño (claro/oscuro incluidos)
├── js/
│   ├── supabase-config.js     → 🔑 AQUÍ VAN TUS CLAVES DE SUPABASE
│   ├── ui.js                  → Utilidades compartidas (toasts, modal, sidebar, tema)
│   ├── auth.js                → Login
│   ├── dashboard.js
│   ├── factura.js
│   ├── pdf-generator.js       → Generación de PDF (jsPDF + html2canvas)
│   ├── historial.js
│   ├── clientes.js
│   ├── configuracion.js
│   └── estadisticas.js
└── sql/
    └── schema.sql              → Ejecutar en Supabase antes que nada
```

Todo el código está comentado y organizado por página, así puedes modificarlo tú mismo desde Visual Studio Code sin tocar el resto del sistema.

---

## 2. Crear el proyecto en Supabase (paso a paso)

1. Ve a **https://supabase.com** y crea una cuenta gratuita (o inicia sesión).
2. Click en **"New Project"**.
   - Nombre: `constructora-santamaria`
   - Contraseña de base de datos: elige una segura y guárdala.
   - Región: la más cercana a República Dominicana (ej. `East US` o `São Paulo`).
3. Espera 1-2 minutos a que el proyecto termine de crearse.
4. En el menú lateral, ve a **SQL Editor** → **New query**.
5. Abre el archivo `sql/schema.sql` de este proyecto, copia **todo** su contenido y pégalo en el editor.
6. Click en **Run**. Esto crea todas las tablas (`usuarios`, `clientes`, `facturas`, `factura_items`, `configuracion`) y los 2 usuarios iniciales (`Tanisha` y `Aby`, contraseña `12345`).
7. Ve a **Project Settings** (ícono de engranaje) → **API**.
8. Copia:
   - **Project URL**
   - **anon public key**

---

## 3. Conectar la aplicación a Supabase

1. Abre el archivo `js/supabase-config.js` en Visual Studio Code.
2. Reemplaza estas dos líneas con tus datos reales:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-AQUI';
```

3. Guarda el archivo. Listo, la app ya está conectada a tu base de datos.

---

## 4. Probar localmente

Como es HTML/CSS/JS puro, no necesitas instalar nada (ni `npm install`). Solo necesitas un servidor local simple porque los navegadores bloquean algunas peticiones si abres el `index.html` directamente con doble click.

**Opción fácil con VS Code:**
1. Instala la extensión **"Live Server"** en Visual Studio Code.
2. Click derecho sobre `index.html` → **"Open with Live Server"**.
3. Se abrirá en tu navegador. Inicia sesión con:
   - Usuario: `Tanisha` / Contraseña: `12345`
   - Usuario: `Aby` / Contraseña: `12345`

---

## 5. Publicar en Vercel (gratis)

**Opción A — Subir a GitHub y conectar Vercel (recomendado):**
1. Crea un repositorio nuevo en GitHub y sube esta carpeta completa.
2. Ve a **https://vercel.com** → inicia sesión con GitHub.
3. Click en **"Add New" → "Project"**.
4. Selecciona tu repositorio.
5. Como es un sitio estático, Vercel lo detecta automáticamente (no necesita "Build Command"). Deja todo por defecto y click en **Deploy**.
6. En 1 minuto tendrás tu URL pública, ej: `https://constructora-santamaria.vercel.app`

**Opción B — Vercel CLI (sin GitHub):**
```bash
npm install -g vercel
cd constructora-santamaria
vercel
```
Sigue las instrucciones en pantalla y confirma el despliegue.

---

## 6. Cómo modificar cada parte (guía rápida)

| Quiero cambiar...                        | Archivo a editar                     |
|-------------------------------------------|---------------------------------------|
| Colores, fuentes, espaciados               | `css/styles.css` (arriba están las variables `:root`) |
| Textos del login                          | `index.html`                          |
| Campos del formulario de factura           | `factura.html` + `js/factura.js`      |
| El diseño del PDF                          | `css/styles.css` (sección `.invoice-doc`) y `js/pdf-generator.js` |
| Qué se guarda en la base de datos          | `sql/schema.sql` (agregar columnas) + el JS de la página correspondiente |
| Usuarios que pueden iniciar sesión         | Tabla `usuarios` en Supabase (Table Editor) o el SQL de `schema.sql` |
| Logo, dirección, teléfono de la empresa    | Directamente en la app: página **Configuración** (no requiere tocar código) |

---

## 7. Notas importantes de seguridad

- El login de este proyecto es **intencionalmente simple** (usuario/contraseña en texto plano en la tabla `usuarios`) para que sea fácil de entender y modificar, tal como pediste. Para un entorno con información más sensible, lo recomendable a futuro sería:
  - Usar **Supabase Auth** en vez de la tabla `usuarios` propia.
  - Cifrar contraseñas (bcrypt) si sigues con la tabla propia.
  - Ajustar las políticas de **Row Level Security** (RLS) para que no sean totalmente abiertas (`acceso_total_*` en el SQL), sino restringidas por usuario autenticado.
- Actualmente las políticas de RLS están abiertas (`using (true)`) para que la app funcione de inmediato sin fricción. Esto significa que cualquiera con tu `anon key` podría leer/escribir datos si la encuentra — normal para un proyecto interno pequeño, pero ten esto en cuenta si el proyecto crece.

---

## 8. Funcionalidades incluidas

✔ Login con 2 usuarios · ✔ Panel con KPIs · ✔ Generador de facturas con productos ilimitados
✔ Cálculo automático de subtotal, ITBIS (18%) y total · ✔ Numeración automática (FAC-000001...)
✔ PDF profesional (descarga e impresión directa) · ✔ Historial con búsqueda/filtros/orden
✔ Editar, eliminar, duplicar y reenviar facturas · ✔ Exportar CSV y Excel
✔ Módulo de clientes con autocompletado · ✔ Recordar el último cliente usado
✔ Configuración de logo, firma, colores y datos de empresa sin tocar código
✔ Estadísticas con gráficos (facturas/mes, ingresos/mes, clientes nuevos, estados)
✔ Modo claro/oscuro · ✔ Autosave del formulario de factura · ✔ Notificaciones de confirmación
✔ 100% responsive (PC, laptop, tablet, Android, iPhone)

---

¿Dudas al modificar algo? Cada archivo JS tiene comentarios explicando qué hace cada función.
