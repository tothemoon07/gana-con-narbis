// ==========================================================
// Archivo: supabase-config.js
// FUNCIÓN: Inicializar la conexión a Supabase con tus credenciales.
// ==========================================================

const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMxOTEsImV4cCI6MjA3ODk4OTE5MX0.C03fAwZIpgSi5iy0Urh1MyBHpR3UUMN6N-m8-n7ErXU';

// Inicializa el cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase inicializado correctamente.");
