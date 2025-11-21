// ==========================================================
// Archivo: supabase-config.js - CORREGIDO (Sin persistencia de sesión)
// FUNCIÓN: Inicializa la conexión a Supabase.
// ==========================================================

// Tus credenciales (Ya insertadas)
const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMxOTEsImV4cCI6MjA3ODk4OTE5MX0.C03fAwZIpgSi5iy0Urh1MyBHpR3UUMN6N-m8-n7ErXU';

// Asegura que la librería esté cargada antes de intentar usar createClient.
let supabase = null;

if (typeof createClient !== 'undefined') {
    // ESTA ES LA MODIFICACIÓN CLAVE: Desactivar la persistencia de sesión anónima
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: false, // <-- Esto previene el uso de tokens obsoletos
            detectSessionInUrl: true
        }
    });
    console.log("Supabase cliente inicializado con éxito (persistSession: false).");
} else if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient !== 'undefined') {
    // Caso de respaldo (método alternativo)
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: false, // <-- Esto previene el uso de tokens obsoletos
            detectSessionInUrl: true
        }
    });
    console.log("Supabase cliente inicializado con éxito (método alternativo, persistSession: false).");
} else {
    // Si llegamos aquí, la librería de Supabase NO se cargó correctamente.
    console.error("CRÍTICO: createClient NO está definido. Revise el orden de las etiquetas <script> en sus archivos HTML.");
}
