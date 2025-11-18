// ==========================================================
// Archivo: script.js
// FUNCIÓN: Lógica de la página principal.
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Función para cargar sorteos desde Supabase
    async function cargarSorteos() {
        console.log("Intentando cargar sorteos desde Supabase...");
        
        if (typeof supabase === 'undefined') {
            console.error("Error: La variable 'supabase' no está definida. Revise el orden en index.html.");
            document.getElementById('sorteos-container').innerHTML = '<h2>Error de conexión. Revise la consola.</h2>';
            return;
        }

        const { data: sorteos, error } = await supabase
            .from('sorteos') // Nombre de tu tabla
            .select('*')
            .eq('estado', 'activo'); 

        if (error) {
            console.error('Error al cargar sorteos:', error.message);
            document.getElementById('sorteos-container').innerHTML = '<p>Error al obtener datos: ' + error.message + '</p>';
            return;
        }

        if (sorteos.length === 0) {
            document.getElementById('sorteos-container').innerHTML = '<h2>No hay sorteos activos por el momento.</h2>';
        } else {
            console.log("Sorteos cargados exitosamente:", sorteos);
            document.getElementById('sorteos-container').innerHTML = `<p>✅ Se encontraron ${sorteos.length} sorteo(s) activo(s). La conexión funciona.</p>`;
        }
    }
    
    // Lógica para el botón "Consultar Mis Tickets"
    const consultarBtn = document.getElementById('consultar-tickets-btn');
    if (consultarBtn) {
        consultarBtn.addEventListener('click', () => {
            alert('Consultar Mis Tickets: ¡El botón funciona! Ahora se abriría el modal.');
        });
    }

    cargarSorteos();
});
