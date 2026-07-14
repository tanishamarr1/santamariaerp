/* =====================================================================
   CONFIGURACIÓN DE SUPABASE
   =====================================================================
   1. Ve a tu proyecto en https://app.supabase.com
   2. Entra a "Project Settings" -> "API"
   3. Copia el "Project URL" y la "anon public key"
   4. Pégalas abajo, reemplazando los valores de ejemplo
   ===================================================================== */

const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-AQUI';

// Cliente global de Supabase (usa el SDK cargado por CDN en cada HTML)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
