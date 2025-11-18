// ==========================================================
// FUNCIÓN DE CARGA DE SORTEOS (para la página principal)
// ==========================================================
async function cargarSorteos() {
    console.log("Intentando cargar sorteos desde Supabase...");
    
    // Asumimos que 'supabase' está definido en supabase-config.js y cargado
    if (typeof supabase === 'undefined') {
        console.error("Error: Supabase no está definido. Revise la carga de librerías.");
        return;
    }

    try {
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('estado', 'activo'); // Filtra para mostrar solo los activos
        
        if (error) {
            console.error("Error al cargar sorteos:", error);
            // Mostrar un mensaje de error si falla la conexión
            document.getElementById('sorteos-container').innerHTML = `<p style="color: red;">Error al cargar sorteos: ${error.message}</p>`;
            return;
        }

        console.log(`Sorteos cargados exitosamente: (${sorteos.length})`, sorteos);
        
        const container = document.getElementById('sorteos-container');
        container.innerHTML = ''; // Limpiar el mensaje de "Cargando..." o el mensaje de éxito

        if (sorteos.length === 0) {
            container.innerHTML = '<p>No hay sorteos activos disponibles por el momento.</p>';
        } else {
            // MOSTRAR los sorteos en el HTML
            sorteos.forEach(sorteo => {
                // Formatear la fecha para que se vea bien
                const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                // Construcción de la tarjeta (AJÚSTALA a tu estilo CSS)
                const card = document.createElement('div');
                card.className = 'sorteo-card'; // Clase para aplicar tus estilos CSS
                card.innerHTML = `
                    <div class="sorteo-contenido">
                        <h3 class="sorteo-titulo">${sorteo.titulo}</h3>
                        <p class="sorteo-fecha">📅 Fecha: ${fecha}</p>
                        <p class="sorteo-precio">💰 Precio: Bs. ${sorteo.precio_bs}</p>
                        
                        <button class="participar-btn" onclick="window.location.href='sorteo.html?id=${sorteo.id}'">
                            Participar ahora
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
            
            // Añadir el mensaje de éxito después de cargar todo
            const mensajeExito = document.createElement('p');
            mensajeExito.innerHTML = `✅ Se encontraron ${sorteos.length} sorteo(s) activo(s).`;
            container.prepend(mensajeExito); // Lo pone al inicio del contenedor
        }
    } catch (err) {
        console.error("Error fatal en cargarSorteos:", err);
        document.getElementById('sorteos-container').innerHTML = '<p style="color: red;">Ocurrió un error inesperado al cargar los sorteos.</p>';
    }
}

// Asegúrate de que esta línea esté al final del script para que se ejecute al cargar la página.
document.addEventListener('DOMContentLoaded', cargarSorteos);
