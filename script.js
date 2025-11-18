// ==========================================================
// Archivo: script.js
// FUNCIÓN: Lógica de la página principal (cargar sorteos y botón de tickets).
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Función para cargar sorteos desde Supabase
    async function cargarSorteos() {
        console.log("Intentando cargar sorteos desde Supabase...");
        
        // Verifica si 'supabase' está definido (Debería estarlo si el orden de carga es correcto)
        if (typeof supabase === 'undefined') {
            console.error("Error: La variable 'supabase' no está definida. Revise el orden en index.html.");
            document.getElementById('sorteos-container').innerHTML = '<p>Error de conexión inicial. Revise la consola.</p>';
            return;
        }

        const { data: sorteos, error } = await supabase
            .from('sorteos') // Nombre de tu tabla de sorteos
            .select('*')
            .eq('estado', 'activo'); // Asumiendo que tienes un campo 'estado'

        if (error) {
            console.error('Error al cargar sorteos:', error.message);
            document.getElementById('sorteos-container').innerHTML = '<p>Error al obtener datos de sorteos: ' + error.message + '</p>';
            return;
        }

        if (sorteos.length === 0) {
            document.getElementById('sorteos-container').innerHTML = '<h2>No hay sorteos activos por el momento.</h2>';
        } else {
            console.log("Sorteos cargados exitosamente:", sorteos);
            // Lógica para mostrar los sorteos
            document.getElementById('sorteos-container').innerHTML = `<p>Se encontraron ${sorteos.length} sorteo(s) activo(s). (La conexión funciona, falta el diseño)</p>`;
        }
    }
    
    // Lógica para el botón "Consultar Mis Tickets"
    const consultarBtn = document.getElementById('consultar-tickets-btn');
    if (consultarBtn) {
        consultarBtn.addEventListener('click', () => {
            alert('Consultar Mis Tickets: El script de lógica detectó el clic.');
            // Aquí iría el código para abrir el modal o formulario de tickets.
        });
    }

    cargarSorteos();
});
