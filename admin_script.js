// ==========================================================
// Archivo: admin_script.js - CORREGIDO FINAL (Usando onAuthStateChange)
// ==========================================================

// ¡IMPORTANTE! Estos nombres de bucket DEBEN COINCIDIR con tu Supabase Storage.
const BUCKET_COMPROBANTES = 'comprobantes_narbis_v2'; 
const BUCKET_SORTEOS = 'imagenes_sorteos';          
let filtroActual = 'reportado'; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificación de inicialización de Supabase
    if (typeof supabase === 'undefined' || supabase === null) {
        console.error("Error Crítico: El cliente de Supabase no está disponible.");
        document.getElementById('content').innerHTML = "Error de configuración. Verifique la consola.";
        return;
    }

    // 2. CONFIGURAR EL MONITOR DE ESTADO DE SESIÓN (SOLUCIÓN CLAVE)
    // Esto se ejecuta inmediatamente al cargar y cada vez que el estado de autenticación cambia.
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || session) {
            // El usuario está logueado o acaba de iniciar sesión. Cargar el panel.
            console.log("Monitor: Usuario autenticado. Cargando panel.");
            cargarPanelAdmin(session.user);
        } else {
            // El usuario no está logueado (SIGNED_OUT) o la sesión no es válida.
            console.log("Monitor: Usuario desautenticado o sesión expirada. Redirigiendo al login.");
            window.location.href = 'admin_login.html';
        }
    });
});

// =================================================================
// FUNCIÓN PRINCIPAL: CONTENEDOR DE TODA LA LÓGICA DEL PANEL
// =================================================================

function cargarPanelAdmin(user) {
    const adminView = document.getElementById('admin-view');
    console.log("Panel cargado para:", user.email);

    // Si el panel ya está cargado, no hacer nada (para evitar duplicados)
    if (document.getElementById('sorteos-link').hasAttribute('data-initialized')) {
        return;
    }
    document.getElementById('sorteos-link').setAttribute('data-initialized', 'true');
    
    // Configuración de Event Listeners y Carga Inicial
    document.getElementById('sorteos-link')?.addEventListener('click', (e) => { e.preventDefault(); mostrarListaSorteos(); });
    document.getElementById('boletos-link')?.addEventListener('click', (e) => { e.preventDefault(); mostrarBoletosVendidos(); });
    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', async () => {
        // Al cerrar sesión, el onAuthStateChange detectará 'SIGNED_OUT' y redirigirá.
        await supabase.auth.signOut();
    });

    // Cargar la vista por defecto (Sorteos)
    mostrarListaSorteos();
    
    // =================================================================
    // A. GESTIÓN DE SORTEOS (SIN CAMBIOS DE LÓGICA INTERNA)
    // =================================================================
    
    window.mostrarListaSorteos = async function() {
        document.getElementById('content').querySelector('h1').textContent = 'Gestión de Sorteos';
        document.getElementById('nuevo-sorteo-btn').style.display = 'inline-block';
        
        adminView.innerHTML = `
            <h2>Administrar Sorteos</h2>
            <button onclick="mostrarNuevoSorteo()" style="background:#b70014; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer; margin-bottom:20px;">+ Crear Nuevo Sorteo</button>
            <table class="tabla-reportes">
                <thead><tr><th>Imagen</th><th>Título</th><th>Precio</th><th>Total Boletos</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody id="tbody-sorteos"><tr><td colspan="6">Cargando...</td></tr></tbody>
            </table>`;
        
        const { data: sorteos, error } = await supabase.from('sorteos').select('*').order('creado_en', { ascending: false });
        const tbody = document.getElementById('tbody-sorteos');

        if (error) { tbody.innerHTML = `<tr><td colspan="6" style="color:red">${error.message}</td></tr>`; return; }
        if (sorteos.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Vacío</td></tr>`; return; }

        tbody.innerHTML = '';
        sorteos.forEach(sorteo => {
            let imgHtml = sorteo.imagen_url ? `<img src="${sorteo.imagen_url}" width="60">` : 'Sin Foto';
            // ID pasado como STRING en el onclick (Eliminar)
            tbody.innerHTML += `<tr><td style="text-align:center;">${imgHtml}</td><td>${sorteo.titulo}</td><td>Bs. ${sorteo.precio_bs}</td><td>${sorteo.total_boletos || 10000}</td><td>${sorteo.estado}</td><td><button class="btn-accion rechazar" onclick="eliminarSorteo('${sorteo.id}')">Eliminar</button></td></tr>`;
        });
    }

    window.eliminarSorteo = async function(id) {
        if(!confirm("⚠️ ¿Borrar sorteo y todos sus datos?")) return;
        const { error } = await supabase.from('sorteos').delete().eq('id', id);
        if(error) alert(error.message); else mostrarListaSorteos();
    }

    window.mostrarNuevoSorteo = function() {
        document.getElementById('content').querySelector('h1').textContent = 'Crear Nuevo Sorteo';
        document.getElementById('nuevo-sorteo-btn').style.display = 'none';

        adminView.innerHTML = `
            <h2>Crear Nuevo Sorteo</h2>
            <button onclick="mostrarListaSorteos()">← Volver</button>
            <form id="form-nuevo-sorteo" style="max-width:500px; padding:20px;">
                <input type="text" id="titulo" placeholder="Título" required style="width:100%; margin-bottom:10px;">
                <input type="number" id="precio_bs" placeholder="Precio (Bs)" required style="width:100%; margin-bottom:10px;">
                <input type="number" id="total_boletos" value="10000" placeholder="Total Boletos" required style="width:100%; margin-bottom:10px;">
                <input type="datetime-local" id="fecha_sorteo" required style="width:100%; margin-bottom:10px;">
                <input type="file" id="imagen_sorteo" accept="image/*" required style="width:100%; margin-bottom:10px;">
                <button type="submit" id="btn-guardar-sorteo">Guardar</button>
            </form>`;

        document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-guardar-sorteo'); btn.disabled = true; btn.textContent = "Subiendo...";
            
            try {
                const file = document.getElementById('imagen_sorteo').files[0];
                const fileName = `premio-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.]/g, '_')}`;
                
                const { error: errImg } = await supabase.storage.from(BUCKET_SORTEOS).upload(fileName, file, { public: true }); 
                if (errImg) throw errImg;
                
                const { data: { publicUrl } } = supabase.storage.from(BUCKET_SORTEOS).getPublicUrl(fileName);

                const { error: errDB } = await supabase.from('sorteos').insert([{ 
                    titulo: document.getElementById('titulo').value, 
                    precio_bs: document.getElementById('precio_bs').value,
                    total_boletos: document.getElementById('total_boletos').value,
                    fecha_sorteo: new Date(document.getElementById('fecha_sorteo').value).toISOString(),
                    imagen_url: publicUrl, creado_en: new Date(), estado: 'activo'
                }]);
                if (errDB) throw errDB;
                alert("Creado!"); mostrarListaSorteos();
            } catch (e) { alert(e.message); btn.disabled = false; }
        });
    }

    // =================================================================
    // B. GESTIÓN DE PAGOS (SIN CAMBIOS DE LÓGICA INTERNA)
    // =================================================================
    
    window.mostrarBoletosVendidos = function() {
        document.getElementById('content').querySelector('h1').textContent = 'Gestión de Pagos';
        document.getElementById('nuevo-sorteo-btn').style.display = 'none';

        adminView.innerHTML = `
            <h2>Gestión de Pagos</h2>
            <div class="filtros-container">
                <button class="btn-filtro ${filtroActual=='reportado'?'activo':''}" onclick="cambiarFiltro('reportado')">Pendientes</button>
                <button class="btn-filtro ${filtroActual=='validado'?'activo':''}" onclick="cambiarFiltro('validado')">Validados</button>
                <button class="btn-filtro ${filtroActual=='rechazado'?'activo':''}" onclick="cambiarFiltro('rechazado')">Rechazados</button>
            </div>
            <table class="tabla-reportes">
                <thead><tr><th>Ref</th><th>Cliente</th><th>Cant.</th><th>Monto</th><th>Captura</th><th>Números</th><th>Acciones</th></tr></thead>
                <tbody id="tbody-pagos"><tr><td colspan="7">Cargando...</td></tr></tbody>
            </table>`;
        cargarPagos(filtroActual);
    }

    window.cambiarFiltro = function(e) { filtroActual = e; mostrarBoletosVendidos(); }

    async function cargarPagos(estado) {
        const tbody = document.getElementById('tbody-pagos');
        const { data: ordenes, error } = await supabase.from('boletos').select('*').eq('estado', estado).order('creado_en', { ascending: false });

        if (error || !ordenes.length) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">${error ? error.message : 'Sin datos'}</td></tr>`; return; }

        tbody.innerHTML = '';
        ordenes.forEach(orden => {
            let captureHtml = 'Sin foto';
            
            if (orden.url_capture) {
                if (orden.url_capture.includes('WhatsApp')) {
                    captureHtml = `📲 WhatsApp`;
                } else {
                    const fileOrPath = orden.url_capture.split('?')[0];
                    const fileName = fileOrPath.includes('/') ? fileOrPath.split('/').pop() : fileOrPath;
                    
                    if (orden.url_capture.startsWith('http')) {
                        captureHtml = `<a href="${orden.url_capture}" target="_blank" style="color:blue; font-weight:bold;">Ver Foto</a>`;
                    } else {
                        try {
                            const { data: { publicUrl } } = supabase.storage.from(BUCKET_COMPROBANTES).getPublicUrl(fileName);
                            captureHtml = `<a href="${publicUrl}" target="_blank" style="color:blue; font-weight:bold;">Ver Foto</a>`;
                        } catch (e) {
                            captureHtml = `<span style="color:red;">Error Gén.</span>`;
                        }
                    }
                }
            }
            
            let numerosHtml = orden.numeros_asignados ? 
                `<span style="font-size:12px; color:green; font-weight:bold;">${orden.numeros_asignados}</span>` : 
                '<span style="color:#999;">Pendiente</span>';

            const ordenId = orden.id;
            const cantidadBoletos = orden.cantidad_boletos || 0;
            const sorteoId = orden.sorteo_id; 

            let acciones = estado === 'reportado' ? 
                `<button class="btn-accion validar" onclick="validarYAsignar('${ordenId}', ${cantidadBoletos}, '${sorteoId}')">✔ Validar</button>
                 <button class="btn-accion rechazar" onclick="actualizarEstado('${ordenId}', 'rechazado')">✖</button>` 
                : orden.estado.toUpperCase();

            tbody.innerHTML += `<tr><td>${orden.codigo_concepto}</td><td>${orden.nombre_cliente}<br><small>${orden.telefono_cliente}</small></td><td>${orden.cantidad_boletos}</td><td>${orden.precio_total}</td><td>${captureHtml}</td><td style="max-width:150px; word-wrap:break-word;">${numerosHtml}</td><td>${acciones}</td></tr>`;
        });
    }

    // --- FUNCIÓN PRINCIPAL: ASIGNAR NÚMEROS Y VALIDAR ORDEN ---
    window.validarYAsignar = async function(ordenId, cantidad, sorteoId) {
        if(cantidad === 0 || !sorteoId) {
            alert("Error: Datos de la orden incompletos. Por favor, revise la BD (cantidad_boletos o sorteo_id están nulos/cero).");
            return;
        }

        if(!confirm(`¿Validar orden ${ordenId} y asignar ${cantidad} números automáticamente?`)) return;
        
        const { data: sorteo, error: sorteoError } = await supabase.from('sorteos').select('total_boletos').eq('id', sorteoId).single();
        
        if (sorteoError) {
            alert("Error al obtener datos del sorteo. Verifique sus permisos RLS en la tabla 'sorteos' o la existencia del sorteo.");
            console.error(sorteoError);
            return;
        }

        const maxBoletos = sorteo.total_boletos || 10000;

        const { data: ocupados } = await supabase
            .from('boletos')
            .select('numeros_asignados')
            .eq('sorteo_id', sorteoId)
            .neq('estado', 'rechazado') 
            .not('numeros_asignados', 'is', null);

        let setOcupados = new Set();
        ocupados.forEach(row => {
            if(row.numeros_asignados) {
                row.numeros_asignados.split(',').forEach(n => setOcupados.add(parseInt(n.trim())));
            }
        });

        let nuevosNumeros = [];
        let intentos = 0;
        const maxIntentos = maxBoletos * 2;

        while (nuevosNumeros.length < cantidad && intentos < maxIntentos) { 
            let num = Math.floor(Math.random() * maxBoletos) + 1; 
            
            if (!setOcupados.has(num) && !nuevosNumeros.includes(num)) {
                nuevosNumeros.push(num);
            }
            intentos++;
        }

        if (nuevosNumeros.length < cantidad) {
            alert(`Error Crítico: No se pudieron encontrar ${cantidad} números únicos disponibles.`);
            return;
        }

        const paddingLength = maxBoletos.toString().length;
        const numerosString = nuevosNumeros.map(n => n.toString().padStart(paddingLength, '0')).join(', ');

        const { error: updateError } = await supabase
            .from('boletos')
            .update({ 
                estado: 'validado', 
                numeros_asignados: numerosString,
                fecha_validacion: new Date().toISOString()
            })
            .eq('id', ordenId);

        if (updateError) {
             alert("Error al guardar en BD: " + updateError.message);
             console.error("Error al actualizar la orden con números:", updateError);
        }
        else {
            alert(`✅ Orden Validada. Números asignados: ${numerosString}`);
            cargarPagos(filtroActual);
        }
    }

    window.actualizarEstado = async function(id, nuevoEstado) {
        if(!confirm(`¿Marcar la orden ${id} como ${nuevoEstado}?`)) return;
        const { error } = await supabase.from('boletos').update({ estado: nuevoEstado }).eq('id', id);
        if (error) alert(error.message); else cargarPagos(filtroActual);
    }
}
