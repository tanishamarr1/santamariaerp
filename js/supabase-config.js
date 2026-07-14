/* =====================================================================
   CONFIGURACIÓN DE SUPABASE
   =====================================================================
   1. Ve a tu proyecto en https://app.supabase.com
   2. Entra a "Project Settings" -> "API"
   3. Copia el "Project URL" y la "anon public key"
   4. Pégalas abajo, reemplazando los valores de ejemplo
   ===================================================================== */

const SUPABASE_URL = 'https://imgnkchkvjofyymymfaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZ25rY2hrdmpvZnl5bXltZmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTE4MzQsImV4cCI6MjA5OTU2NzgzNH0.cM2_w46hPE0rT_TbnHi-RSQ83Di63m25DwoUMz-YYe8';


// Cliente global de Supabase (usa el SDK cargado por CDN en cada HTML)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
