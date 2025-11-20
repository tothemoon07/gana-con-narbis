// ==========================================================
// Archivo: admin_script.js - VERSIÓN FINAL (CON CONTROL DE TOTAL BOLETOS)
// ==========================================================

const BUCKET_COMPROBANTES = 'comprobantes_narbis_v2'; 
const BUCKET_SORTEOS = 'imagenes_sorteos';            
let filtroActual = 'reportado'; 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificación de Supabase
    if (typeof supabase === 'undefined') {
        console.error("Error: 'supabase' no definido.");
        return;
    }

    // 2. Verificación de Sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        console.log("Sesión expirada. Redirigiendo.");
        window.location.href = 'admin_login.html'; 
        return; 
    }

    const adminView = document.getElementById('admin-view');
    console.log("Admin autenticado.");

    // =================================================================
    // VISTA 1: GESTIÓN DE SORTEOS
    // =================================================================

    window.mostrarListaSorteos = async function() {
        adminView.innerHTML = `
            <h2>Administrar Sorteos</h2>
            <button onclick="mostrarNuevoSorteo()" style="background:#b70014; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer; margin-bottom:20px; font-weight:bold;">+ Crear Nuevo Sorteo</button>
            
            <table class="tabla-reportes">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Título</th>
                        <th>Precio</th>
                        <th>Total Boletos</th> <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-sorteos">
                    <tr><td colspan="6">Cargando sorteos...</td></tr>
                </tbody>
            </table>`;

        const tbody = document.getElementById('tbody-sorteos');
        
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .order('creado_en', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red">${error.message}</td></tr>`;
            return;
        }

        if (sorteos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">No hay sorteos creados.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        sorteos.forEach(sorteo => {
            let imgHtml = '<span style="color:#aaa; font-size:12px; font-style:italic;">Sin Foto</span>';
            if (sorteo.imagen_url) {
                imgHtml = `<img src="${sorteo.imagen_url}" width="60" height="60" style="object-fit:cover; border-radius:4px; border:1px solid #ccc;">`;
            }

            const row = `
                <tr>
                    <td style="text-align:center;">${imgHtml}</td>
                    <td><strong>${sorteo.titulo}</strong></td>
                    <td>Bs. ${sorteo.precio_bs}</td>
                    <td>${sorteo.total_boletos || 10000}</td> <td><span style="padding:4px 8px; background:#eee; border-radius:4px;">${sorteo.estado}</span></td>
                    <td>
                        <button class="btn-accion rechazar" onclick="eliminarSorteo(${sorteo.id})">Eliminar</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    window.eliminarSorteo = async function(id) {
        if(!confirm("⚠️ ¿PELIGRO: Estás seguro de eliminar este sorteo? \n\nSe borrarán todos los datos asociados.")) return;
        const { error } = await supabase.from('sorteos').delete().eq('id', id);
        if(error) alert("Error: " + error.message);
        else { alert("Sorteo eliminado."); mostrarListaSorteos(); }
    }

    window.mostrarNuevoSorteo = function() {
        adminView.innerHTML = `
            <h2>Crear Nuevo Sorteo</h2>
            <button onclick="mostrarListaSorteos()" style="margin-bottom:15px; cursor:pointer;">← Volver a la lista</button>
            
            <form id="form-nuevo-sorteo" style="max-width:500px; background:white; padding:20px; border-radius:8px; border:1px solid #ddd;">
                <label style="font-weight:bold;">Título del Sorteo:</label>
                <input type="text" id="titulo" required style="width:100%; padding:8px; margin-bottom:15px;">

                <label style="font-weight:bold;">Precio por Boleto (Bs.):</label>
                <input type="number" step="0.01" id="precio_bs" required style="width:100%; padding:8px; margin-bottom:15px;">
                
                <label style="font-weight:bold;">Cantidad Total de Boletos:</label>
                <input type="number" id="total_boletos" value="10000" required style="width:100%; padding:8px; margin-bottom:15px;">

                <label style="font-weight:bold;">Fecha del Sorteo:</label>
                <input type="datetime-local" id="fecha_sorteo" required style="width:100%; padding:8px; margin-bottom:15px;">

                <label style="font-weight:bold; color:#b70014;">Imagen del Premio:</label>
                <input type="file" id="imagen_sorteo" accept="image/*" required style="width:100%; margin-bottom:20px;">
                
                <button type="submit" id="btn-guardar-sorteo" style="width:100%; background:#28a745; color:white; padding:12px; border:none; font-size:16px; cursor:pointer; font-weight:bold; border-radius:4px;">Guardar Sorteo</button>
            </form>
        `;

        document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-guardar-sorteo');
            btn.disabled = true;
            btn.textContent = "Subiendo imagen...";

            const titulo = document.getElementById('titulo').value;
            const precio_bs = document.getElementById('precio_bs').value;
            const total_boletos = document.getElementById('total_boletos').value; // Nuevo valor capturado
            const fecha_sorteo = new Date(document.getElementById('fecha_sorteo').value).toISOString();
            const file = document.getElementById('imagen_sorteo').files[0];

            try {
                const cleanName = file.name.replace(/[^a-zA-Z0-9_.]/g, '_');
                const fileName = `premio-${Date.now()}-${cleanName}`;
                
                const { error: errorImg } = await supabase.storage.from(BUCKET_SORTEOS).upload(fileName, file);
                if (errorImg) throw new Error("Error subiendo imagen: " + errorImg.message);

                const { data: { publicUrl } } = supabase.storage.from(BUCKET_SORTEOS).getPublicUrl(fileName);

                btn.textContent = "Guardando datos...";

                // Insertamos incluyendo el total_boletos
                const { error: errorDB } = await supabase.from('sorteos').insert([{ 
                    titulo, precio_bs, fecha_sorteo, 
                    imagen_url: publicUrl, 
                    total_boletos: total_boletos, 
                    creado_en: new Date(), estado: 'activo'
                }]);

                if (errorDB) throw new Error("Error guardando en BD: " + errorDB.message);

                alert(`¡Sorteo creado exitosamente!`);
                mostrarListaSorteos();

            } catch (error) {
                alert(error.message);
                btn.disabled = false;
                btn.textContent = "Guardar Sorteo";
            }
        });
    }

    // =================================================================
    // VISTA 2: GESTIÓN DE PAGOS
    // =================================================================

    window.mostrarBoletosVendidos = function() {
        adminView.innerHTML = `
            <h2>Gestión de Pagos y Boletos</h2>
            <div class="filtros-container">
                <button class="btn-filtro ${filtroActual === 'reportado' ? 'activo' : ''}" onclick="cambiarFiltro('reportado')">Pendientes</button>
                <button class="btn-filtro ${filtroActual === 'validado' ? 'activo' : ''}" onclick="cambiarFiltro('validado')">Validados</button>
                <button class="btn-filtro ${filtroActual === 'rechazado' ? 'activo' : ''}" onclick="cambiarFiltro('rechazado')">Rechazados</button>
            </div>
            <table class="tabla-reportes">
                <thead>
                    <tr><th>Ref.</th><th>Cliente</th><th>Teléfono</th><th>Monto</th><th>Ref. Banco</th><th>Captura</th><th>Acciones</th></tr>
                </thead>
                <tbody id="tbody-pagos"><tr><td colspan="7">Cargando...</td></tr></tbody>
            </table>
        `;
        cargarPagos(filtroActual);
    }

    window.cambiarFiltro = function(nuevoEstado) { filtroActual = nuevoEstado; mostrarBoletosVendidos(); }

    async function cargarPagos(estado) {
        const tbody = document.getElementById('tbody-pagos');
        if(!tbody) return;
        const { data: ordenes, error } = await supabase.from('boletos').select('*').eq('estado', estado).order('creado_en', { ascending: false });

        if (error) { tbody.innerHTML = `<tr><td colspan="7" style="color:red">Error: ${error.message}</td></tr>`; return; }
        if (ordenes.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No hay órdenes: ${estado}</td></tr>`; return; }

        tbody.innerHTML = ''; 
        ordenes.forEach(orden => {
            let captureHtml = '<span style="color:gray">Sin captura</span>';
            if (orden.url_capture) {
                if (orden.url_capture.startsWith('http') || orden.url_capture.includes('WhatsApp')) {
                    captureHtml = `<span title="${orden.url_capture}">📲 WhatsApp/Ext</span>`;
                } else {
                    const { data } = supabase.storage.from(BUCKET_COMPROBANTES).getPublicUrl(orden.url_capture);
                    captureHtml = `<a href="${data.publicUrl}" target="_blank" style="color:blue; font-weight:bold;">Ver Foto</a>`;
                }
            }
            
            // CORRECCIÓN DE COMILLAS EN ID
            let botonesHtml = estado === 'reportado' ? 
                `<button class="btn-accion validar" onclick="actualizarEstado('${orden.id}', 'validado')">✔</button>
                 <button class="btn-accion rechazar" onclick="actualizarEstado('${orden.id}', 'rechazado')">✖</button>` 
                : `<span style="font-weight:bold;">${orden.estado.toUpperCase()}</span>`;

            tbody.innerHTML += `<tr><td>${orden.codigo_concepto}</td><td>${orden.nombre_cliente}</td><td>${orden.telefono_cliente}</td><td>Bs. ${orden.precio_total}</td><td>${orden.referencia_pago || '-'}</td><td>${captureHtml}</td><td>${botonesHtml}</td></tr>`;
        });
    }

    window.actualizarEstado = async function(id, nuevoEstado) {
        if(!confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;
        const { error } = await supabase.from('boletos').update({ estado: nuevoEstado }).eq('id', id);
        if (error) alert('Error: ' + error.message); else cargarPagos(filtroActual);
    }

    function mostrarMetodosDePago() { adminView.innerHTML = '<h2>Vista de Métodos de Pago</h2><p>Próximamente...</p>'; }

    document.getElementById('sorteos-link')?.addEventListener('click', (e) => { e.preventDefault(); mostrarListaSorteos(); });
    document.getElementById('boletos-link')?.addEventListener('click', (e) => { e.preventDefault(); mostrarBoletosVendidos(); });
    document.getElementById('pagos-link')?.addEventListener('click', (e) => { e.preventDefault(); mostrarMetodosDePago(); });
    document.getElementById('nuevo-sorteo-btn')?.addEventListener('click', mostrarNuevoSorteo);
    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = 'admin_login.html'; });
    
    mostrarListaSorteos();
});
