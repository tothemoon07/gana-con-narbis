// ==========================================================
// Archivo: admin_script.js - FINAL (CON AUTENTICACIÓN)
// FUNCIÓN: Protege la vista y permite la inserción de sorteos (ya que la RLS está activa)
// ==========================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificación Crítica de Supabase y Sesión
    if (typeof supabase === 'undefined') {
        console.error("Error: La variable 'supabase' no está definida.");
        return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Redirige al login si NO hay una sesión activa
    if (sessionError || !session) {
        console.log("Sesión no encontrada o expirada. Redirigiendo a login.");
        // Redirige a la página de inicio de sesión que acabamos de crear
        window.location.href = 'admin_login.html'; 
        return; // Detiene la ejecución del script de administración
    }

    // --- Si hay sesión, continúa con la lógica del Panel ---

    const adminView = document.getElementById('admin-view');
    console.log("Usuario autenticado (" + session.user.email + "). Cargando panel.");
    // NOTA: El usuario está autenticado, la RLS permitirá la inserción ahora.

    // --- FUNCIONES DE VISTA ---
    
    function mostrarListaSorteos() {
         adminView.innerHTML = '<h2>Lista de Sorteos Activos</h2><p>Aquí se cargaría la lista de sorteos existentes desde la base de datos.</p>';
    }

    // FUNCIÓN FINAL: Creación de Sorteo (Ahora protegido por Auth)
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

        document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('titulo').value;
            const precio_bs = document.getElementById('precio_bs').value;
            const fecha_sorteo_local = document.getElementById('fecha_sorteo').value;
            
            const fecha_sorteo_tz = new Date(fecha_sorteo_local).toISOString(); 

            // INSERCIÓN DE DATOS: Ahora que el usuario está autenticado, esto funcionará.
            const { error } = await supabase
                .from('sorteos')
                .insert([{ 
                    titulo: titulo, 
                    precio_bs: precio_bs,
                    fecha_sorteo: fecha_sorteo_tz,
                    creado_en: new Date(), 
                    estado: 'activo'
                }]);

            if (error) {
                alert('ERROR: No se pudo crear el sorteo. ' + error.message);
                console.error("Detalle del error:", error);
            } else {
                alert(`¡Sorteo "${titulo}" creado exitosamente en Supabase!`);
                mostrarListaSorteos();
            }
        });
    }

    function mostrarBoletosVendidos() {
        adminView.innerHTML = '<h2>Vista de Boletos Vendidos (Falta desarrollar)</h2>';
    }

    function mostrarMetodosDePago() {
        adminView.innerHTML = '<h2>Vista de Métodos de Pago (Falta desarrollar)</h2>';
    }

    // --- EVENT LISTENERS ---

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

    document.getElementById('nuevo-sorteo-btn')?.addEventListener('click', mostrarNuevoSorteo);

    // Lógica para cerrar la sesión
    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión.');
        } else {
            alert('Sesión cerrada. Serás redirigido al login.');
            window.location.href = 'admin_login.html';
        }
    });
    
    // Carga la vista por defecto (al iniciar)
    mostrarNuevoSorteo();
});
