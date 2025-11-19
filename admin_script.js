// ==========================================================
// Archivo: admin_script.js - INTEGRADO Y FINAL (CORREGIDO)
// ==========================================================

const BUCKET_NAME = 'comprobantes_narbis_v2'; // El bucket nuevo que creamos
let filtroActual = 'reportado'; // Estado por defecto para ver

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
        window.location.href = 'admin_login.html'; 
        return; 
    }

    const adminView = document.getElementById('admin-view');
    console.log("Usuario autenticado. Cargando panel.");

    // ==========================================
    // FUNCIONES DE VISTA (NAVEGACIÓN)
    // ==========================================

    function mostrarListaSorteos() {
         adminView.innerHTML = '<h2>Lista de Sorteos Activos</h2><p>Aquí se cargaría la lista de sorteos existentes.</p>';
    }

    // --- VISTA DE GESTIÓN DE PAGOS ---
    window.mostrarBoletosVendidos = function() {
        adminView.innerHTML = `
            <h2>Gestión de Pagos y Boletos</h2>
            
            <div class="filtros-container">
                <button class="btn-filtro ${filtroActual === 'reportado' ? 'activo' : ''}" onclick="cambiarFiltro('reportado')">Pendientes (Reportados)</button>
                <button class="btn-filtro ${filtroActual === 'validado' ? 'activo' : ''}" onclick="cambiarFiltro('validado')">Validados</button>
                <button class="btn-filtro ${filtroActual === 'rechazado' ? 'activo' : ''}" onclick="cambiarFiltro('rechazado')">Rechazados</button>
            </div>

            <table class="tabla-reportes">
                <thead>
                    <tr>
                        <th>Ref. Orden</th>
                        <th>Cliente</th>
                        <th>Teléfono</th>
                        <th>Monto</th>
                        <th>Ref. Banco</th>
                        <th>Captura</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-pagos">
                    <tr><td colspan="7">Cargando...</td></tr>
                </tbody>
            </table>
        `;
        
        cargarPagos(filtroActual);
    }

    // --- VISTA DE NUEVO SORTEO ---
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
                alert('ERROR: ' + error.message);
            } else {
                alert(`¡Sorteo "${titulo}" creado exitosamente!`);
                mostrarListaSorteos();
            }
        });
    }

    function mostrarMetodosDePago() {
        adminView.innerHTML = '<h2>Vista de Métodos de Pago (Falta desarrollar)</h2>';
    }

    // ==========================================
    // LÓGICA DE PAGOS Y BASE DE DATOS
    // ==========================================

    window.cambiarFiltro = function(nuevoEstado) {
        filtroActual = nuevoEstado;
        mostrarBoletosVendidos(); 
    }

    async function cargarPagos(estado) {
        const tbody = document.getElementById('tbody-pagos');
        if(!tbody) return;

        const { data: ordenes, error } = await supabase
            .from('boletos')
            .select('*')
            .eq('estado', estado)
            .order('creado_en', { ascending: false });

        if (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="7" style="color:red">Error: ${error.message}</td></tr>`;
            return;
        }

        if (ordenes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No hay órdenes en estado: ${estado}</td></tr>`;
            return;
        }

        tbody.innerHTML = ''; 

        ordenes.forEach(orden => {
            // Generar Link de Captura
            let captureHtml = '<span style="color:gray">Sin captura</span>';
            
            if (orden.url_capture) {
                if (orden.url_capture.startsWith('http') || orden.url_capture.includes('WhatsApp')) {
                    captureHtml = `<span title="${orden.url_capture}">📲 WhatsApp/Ext</span>`;
                } else {
                    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(orden.url_capture);
                    captureHtml = `<a href="${data.publicUrl}" target="_blank" style="color:blue; font-weight:bold;">Ver Foto</a>`;
                }
            }

            // Botones de Acción
            let botonesHtml = '';
            if (estado === 'reportado') {
                // AQUÍ ESTABA EL ERROR: Se agregaron comillas simples ('') alrededor de ${orden.id}
                botonesHtml = `
                    <button class="btn-accion validar" onclick="actualizarEstado('${orden.id}', 'validado')">✔</button>
                    <button class="btn-accion rechazar" onclick="actualizarEstado('${orden.id}', 'rechazado')">✖</button>
                `;
            } else {
                botonesHtml = orden.estado.toUpperCase();
            }

            const row = `
                <tr>
                    <td>${orden.codigo_concepto}</td>
                    <td>${orden.nombre_cliente}</td>
                    <td>${orden.telefono_cliente}</td>
                    <td>Bs. ${orden.precio_total}</td>
                    <td>${orden.referencia_pago || 'N/A'}</td>
                    <td>${captureHtml}</td>
                    <td>${botonesHtml}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // Función global para actualizar estado
    window.actualizarEstado = async function(id, nuevoEstado) {
        if(!confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;

        const { error } = await supabase
            .from('boletos')
            .update({ estado: nuevoEstado })
            .eq('id', id);

        if (error) {
            alert('Error al actualizar: ' + error.message);
        } else {
            cargarPagos(filtroActual); // Recargar la tabla
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    document.getElementById('sorteos-link')?.addEventListener('click', (e) => {
        e.preventDefault(); mostrarListaSorteos();
    });

    document.getElementById('boletos-link')?.addEventListener('click', (e) => {
        e.preventDefault(); mostrarBoletosVendidos();
    });

    document.getElementById('pagos-link')?.addEventListener('click', (e) => {
        e.preventDefault(); mostrarMetodosDePago();
    });

    document.getElementById('nuevo-sorteo-btn')?.addEventListener('click', mostrarNuevoSorteo);

    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'admin_login.html';
    });
    
    // Carga inicial
    mostrarListaSorteos();
});
