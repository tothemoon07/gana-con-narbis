// ==========================================================
// Archivo: supabase-config.js
// FUNCIÓN: Inicializa la conexión a Supabase.
// ==========================================================

// Tus credenciales (Ya insertadas)
const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMxOTEsImV4cCI6MjA3ODk4OTE5MX0.C03fAwZIpgSi5iy0Urh1MyBHpR3UUMN6N-m8-n7ErXU';

// Asegura que la librería esté cargada antes de intentar usar createClient.
// La función createClient DEBE ser globalmente accesible en este punto
// gracias a la etiqueta <script src="...supabase-js@2"></script> en el HTML.

// NOTA: Si createClient está disponible (lo cual esperamos), inicializamos supabase.
// Usamos window.supabase.createClient para mayor seguridad si createClient no es global.
if (typeof createClient !== 'undefined') {
    var supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase cliente inicializado con éxito.");
} else if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient !== 'undefined') {
    // Caso de respaldo si la CDN cargó la función bajo el namespace 'supabase'
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase cliente inicializado con éxito (método alternativo).");
} else {
    // Si llegamos aquí, la librería de Supabase NO se cargó correctamente.
    var supabase = null; // Establecer a null para evitar ReferenceError en otros scripts
    console.error("CRÍTICO: createClient NO está definido. Revise el orden de las etiquetas <script> en sus archivos HTML.");
}
