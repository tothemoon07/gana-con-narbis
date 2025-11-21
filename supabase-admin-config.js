// ==========================================================
// Archivo: supabase-admin-config.js - CORREGIDO (Elimina error 'already declared')
// FUNCIÓN: Inicializa la conexión para el panel de administración
//          con PERSISTENCIA DE SESIÓN ACTIVADA (por defecto)
// ==========================================================

// Tus credenciales
const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMxOTEsImV4cCI6MjA3ODk4OTE5MX0.C03fAwZIpgSi5iy0Urh1MyBHpR3UUMN6N-m8-n7ErXU';

// 1. Declara la variable con 'let' una sola vez.
let supabase = null; 

if (typeof createClient !== 'undefined') {
    // 2. Asigna el cliente sin usar 'var' o 'let' nuevamente
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase cliente ADMINISTRADOR inicializado con persistencia.");
} else if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient !== 'undefined') {
    // Caso de respaldo
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase cliente ADMINISTRADOR inicializado (método alternativo).");
} else {
    // Si llegamos aquí, la librería de Supabase NO se cargó correctamente.
    // Usamos 'let' para reasignar a null si es necesario, pero ya está declarado arriba.
    supabase = null; 
    console.error("CRÍTICO: createClient NO está definido.");
}

// Hacemos el cliente global para que admin_script.js pueda usarlo
window.supabase = supabase;
