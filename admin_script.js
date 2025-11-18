// ==========================================================
// Archivo: admin_script.js - COMPLETO Y CORREGIDO (FINAL CON TODOS LOS CAMPOS)
// FUNCIÓN: Lógica del panel de administración (navegación y formularios).
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    const adminView = document.getElementById('admin-view');
    
    // Verifica si 'supabase' está definido
    if (typeof supabase === 'undefined') {
        console.error("Error: La variable 'supabase' no está definida. Revise el orden en admin.html.");
        adminView.innerHTML = '<h2>Error crítico de conexión a Supabase.</h2>';
        return;
    }

    // --- FUNCIONES DE VISTA ---
    
    function mostrarListaSorteos() {
         adminView.innerHTML = '<h2>Lista de Sorteos (Conexión OK)</h2><p>Aquí se cargaría la lista de sorteos existentes desde la base de datos.</p>';
    }

    // FUNCIÓN CORREGIDA: Incluye todos los campos obligatorios del sorteo
    function mostrarNuevoSorteo() {
        adminView.innerHTML = `
            <h2>Crear Nuevo Sorteo</h2>
            <form id="form-nuevo-sorteo">
                <label for="titulo">Título del Sorteo:</label>
                <input type="text" id="titulo" required><br><br>

                <label for="precio_bs">Precio por Boleto (Bs.):</label>
                <input type="number" step="0.01" id="precio_bs" required><br><br>
                
                <label for="fecha_sorteo">Fecha y Hora del Sorteo:</label>
                <input type="datetime-local" id="fecha_sorteo" required><br><br>
                
                <button type="submit">Guardar Sorteo en Supabase</button>
            </form>
        `;

        // Lógica de Supabase para guardar el nuevo sorteo
        document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('titulo').value;
            const precio_bs = document.getElementById('precio_bs').value;
            const fecha_sorteo_local = document.getElementById('fecha_sorteo').value;
            
            // Convertir el valor de datetime-local a un objeto Date (timestamptz)
            // Necesario para que Supabase lo acepte como un timestamp con zona horaria
            const fecha_sorteo_tz = new Date(fecha_sorteo_local).toISOString(); 

            // INSERCIÓN ACTUALIZADA: Enviamos todos los valores obligatorios (incluyendo fecha_sorteo)
            const { error } = await supabase
                .from('sorteos')
                .insert([{ 
                    titulo: titulo, 
                    precio_bs: precio_bs,
                    fecha_sorteo: fecha_sorteo_tz, // <--- ¡AHORA SÍ ESTÁ INCLUIDO!
                    creado_en: new Date(), 
                    estado: 'activo'
                }]);

            if (error) {
                alert('ERROR: No se pudo crear el sorteo. ' + error.message);
                console.error("Detalle del error:", error);
            } else {
                alert(`¡Sorteo "${titulo}" creado exitosamente en Supabase!`);
                mostrarListaSorteos(); // Vuelve a la lista después de guardar
            }
        });
    }

    function mostrarBoletosVendidos() {
        adminView.innerHTML = '<h2>Vista de Boletos Vendidos (Falta desarrollar)</h2>';
    }

    function mostrarMetodosDePago() {
        adminView.innerHTML = '<h2>Vista de Métodos de Pago (Falta desarrollar)</h2>';
    }

    // --- EVENT LISTENERS (Botones) ---

    // Botones de navegación del Sidebar
    document.getElementById('sorteos-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarListaSorteos();
    });

    document.getElementById('boletos-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarBoletosVendidos();
    });

    document.getElementById('pagos-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMetodosDePago();
    });

    // Botón "+Nuevo Sorteo"
    document.getElementById('nuevo-sorteo-btn')?.addEventListener('click', mostrarNuevoSorteo);

    // Botón "Cerrar Sesión"
    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', () => {
        alert('Cerrando sesión (Lógica pendiente)');
    });
    
    // Carga la vista por defecto (al iniciar)
    mostrarNuevoSorteo();
});
