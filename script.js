// ==========================================================
// Archivo: script.js
// FUNCIÓN: Manejar la lógica de la página principal (cargar sorteos, consultar tickets).
// NOTA: La variable 'supabase' ya está disponible gracias a supabase-config.js
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Función de ejemplo para cargar sorteos
    async function cargarSorteos() {
        console.log("Intentando cargar sorteos desde Supabase...");
        
        const { data: sorteos, error } = await supabase
            .from('sorteos') // Nombre de tu tabla de sorteos
            .select('*')
            .eq('estado', 'activo'); // Asumiendo un campo 'estado'

        if (error) {
            console.error('Error al cargar sorteos:', error.message);
            document.getElementById('sorteos-container').innerHTML = '<p>Error al conectar con la base de datos.</p>';
            return;
        }

        if (sorteos.length === 0) {
            document.getElementById('sorteos-container').innerHTML = '<h2>No hay sorteos activos por el momento.</h2>';
        } else {
            console.log("Sorteos cargados exitosamente:", sorteos);
            // Aquí iría la lógica para renderizar los sorteos en el div 'sorteos-container'
            document.getElementById('sorteos-container').innerHTML = `<p>Se encontraron ${sorteos.length} sorteo(s) activo(s). (Falta la lógica para mostrarlos)</p>`;
        }
    }
    
    // 1. Lógica para el botón "Consultar Mis Tickets"
    const consultarBtn = document.getElementById('consultar-tickets-btn');
    if (consultarBtn) {
        consultarBtn.addEventListener('click', () => {
            alert('Consultar Mis Tickets: Aquí se abriría el modal o formulario.');
            // Aquí iría la función para abrir el modal (image_b36924.jpg)
        });
    } else {
        console.error("No se encontró el botón 'consultar-tickets-btn'.");
    }

    cargarSorteos();
});
