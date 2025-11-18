// ==========================================================
// Archivo: admin_script.js
// FUNCIÓN: Manejar la lógica del panel de administración.
// NOTA: La variable 'supabase' ya está disponible gracias a supabase-config.js
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    const adminView = document.getElementById('admin-view');

    // Función que carga el contenido de "Nuevo Sorteo"
    function mostrarNuevoSorteo() {
        adminView.innerHTML = `
            <h2>Crear Nuevo Sorteo</h2>
            <form id="form-nuevo-sorteo">
                <label for="titulo">Título del Sorteo:</label>
                <input type="text" id="titulo" required><br><br>
                <button type="submit">Guardar Sorteo</button>
            </form>
        `;

        // Agregar listener al formulario para guardar en Supabase
        document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('titulo').value;
            
            // Simulación de inserción en Supabase
            const { data, error } = await supabase
                .from('sorteos')
                .insert([{ titulo: titulo, fecha_creacion: new Date() }]);

            if (error) {
                alert('Error al crear el sorteo: ' + error.message);
            } else {
                alert('Sorteo creado exitosamente!');
                console.log('Nuevo sorteo:', data);
                // Aquí podrías recargar la vista de sorteos
            }
        });
    }

    // --- EVENT LISTENERS DE NAVEGACIÓN (Sidebar y Botones) ---

    // Botón "+Nuevo Sorteo"
    const nuevoSorteoBtn = document.getElementById('nuevo-sorteo-btn');
    if (nuevoSorteoBtn) {
        nuevoSorteoBtn.addEventListener('click', mostrarNuevoSorteo);
    }

    // Enlaces del Sidebar
    document.getElementById('sorteos-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Cargando la lista de Sorteos...'); 
        // Lógica para cargar la vista de sorteos
    });

    document.getElementById('boletos-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Cargando Boletos Vendidos...');
        // Lógica para cargar la vista de boletos
    });

    document.getElementById('pagos-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Cargando Métodos de Pago...');
        // Lógica para cargar la vista de métodos de pago
    });

    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', () => {
        alert('Cerrando sesión (Falta la lógica de autenticación)');
        // Lógica de Supabase para cerrar sesión
    });
    
    // Carga la vista por defecto al iniciar
    mostrarNuevoSorteo();
});
