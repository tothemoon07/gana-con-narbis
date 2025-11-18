// ==========================================================
// Archivo: admin_script.js
// FUNCIÓN: Lógica del panel de administración (navegación y formularios).
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    const adminView = document.getElementById('admin-view');
    
    // Verifica si 'supabase' está definido (Debería estarlo)
    if (typeof supabase === 'undefined') {
        console.error("Error: La variable 'supabase' no está definida. Revise el orden en admin.html.");
        adminView.innerHTML = '<h2>Error crítico de conexión.</h2>';
        return;
    }

    // --- FUNCIONES DE VISTA ---
    
    function mostrarNuevoSorteo() {
        adminView.innerHTML = `
            <h2>Crear Nuevo Sorteo</h2>
            <form id="form-nuevo-sorteo">
                <label for="titulo">Título del Sorteo:</label>
                <input type="text" id="titulo" required><br><br>
                <button type="submit">Guardar Sorteo en Supabase</button>
            </form>
        `;

        // Lógica de Supabase para guardar el nuevo sorteo
        document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('titulo').value;
            
            const { error } = await supabase
                .from('sorteos')
                .insert([{ titulo: titulo, fecha_creacion: new Date() }]);

            if (error) {
                alert('ERROR: No se pudo crear el sorteo. ' + error.message);
            } else {
                alert('¡Sorteo creado exitosamente en Supabase!');
                mostrarListaSorteos(); // Vuelve a la lista después de guardar
            }
        });
    }
    
    function mostrarListaSorteos() {
         adminView.innerHTML = '<h2>Lista de Sorteos (Aquí iría el fetch y la tabla)</h2>';
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
        alert('Cerrando sesión (Se puede integrar la función de Supabase Auth aquí)');
    });
    
    // Carga la vista por defecto (al iniciar)
    mostrarNuevoSorteo();
});
