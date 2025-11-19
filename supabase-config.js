// ==========================================================
// Archivo: supabase-config.js
// FUNCIÓN: Inicializa la conexión a Supabase.
// ==========================================================

// Tus credenciales (Ya insertadas)
const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQxMzE5MSwiZXhwIjoyMDc4OTg5MTkxfQ.IIUDveRbZ4g7wUvZ7iMe5S0ZKFiCstCtvjgL4g-phMQ';

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
