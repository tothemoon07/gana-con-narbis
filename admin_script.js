// ==========================================================
// Archivo: admin_script.js - VERSIÓN FINAL Y COMPLETA (CORREGIDA PARA STORAGE 400)
// ==========================================================

// ¡IMPORTANTE! Estos nombres de bucket DEBEN COINCIDIR con tu Supabase Storage.
// Verificado: 'comprobantes_narbis_v2' y 'imagenes_sorteos'
const BUCKET_COMPROBANTES = 'comprobantes_narbis_v2'; 
const BUCKET_SORTEOS = 'imagenes_sorteos';            
let filtroActual = 'reportado'; 

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase === 'undefined') {
        console.error("Error: 'supabase' no definido.");
        return;
    }

    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        window.location.href = 'admin_login.html'; 
        return; 
    }

    const adminView = document.getElementById('admin-view');
    console.log("Admin autenticado. Cargando panel.");
    
    // =================================================================
    // A. GESTIÓN DE SORTEOS
    // =================================================================
    
    window.mostrarListaSorteos = async function() {
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
                
                const { error: errImg } = await supabase.storage.from(BUCKET_SORTEOS).upload(fileName, file);
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
    // B. GESTIÓN DE PAGOS (CON ARREGLO FINAL DE STORAGE 400)
    // =================================================================
    
    window.mostrarBoletosVendidos = function() {
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
                    // --- ARREGLO FINAL PARA EL ERROR 400 ---
                    // 1. Extraemos solo el nombre del archivo.
                    const fileOrPath = orden.url_capture.split('?')[0];
                    const fileName = fileOrPath.includes('/') ? fileOrPath.split('/').pop() : fileOrPath;
                    
                    // 2. FORZAMOS el uso de BUCKET_COMPROBANTES (comprobantes_narbis_v2)
                    try {
                        const { data: { publicUrl } } = supabase.storage.from(BUCKET_COMPROBANTES).getPublicUrl(fileName);
                        
                        if (publicUrl) {
                            captureHtml = `<a href="${publicUrl}" target="_blank" style="color:blue; font-weight:bold;">Ver Foto</a>`;
                        } else {
                            captureHtml = `<span style="color:red;">Error URL</span>`;
                        }
                    } catch (e) {
                         console.error("Error al generar URL pública:", e);
                         captureHtml = `<span style="color:red;">Error Gén.</span>`;
                    }
                    // ----------------------------------------
                }
            }
            
            // Mostrar números asignados si ya están validados
            let numerosHtml = orden.numeros_asignados ? 
                `<span style="font-size:12px; color:green; font-weight:bold;">${orden.numeros_asignados}</span>` : 
                '<span style="color:#999;">Pendiente</span>';

            const ordenId = orden.id;
            const cantidadBoletos = orden.cantidad_boletos || 0;
            const sorteoId = orden.sorteo_id; 

            let acciones = estado === 'reportado' ? 
                // Uso de comillas simples en el onclick para pasar UUIDs:
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
        
        // 1. Obtener el total de boletos del sorteo (para el límite, ej: 10000)
        const { data: sorteo, error: sorteoError } = await supabase.from('sorteos').select('total_boletos').eq('id', sorteoId).single();
        
        if (sorteoError) {
            alert("Error al obtener datos del sorteo. Verifique sus permisos RLS en la tabla 'sorteos' o la existencia del sorteo.");
            console.error(sorteoError);
            return;
        }

        const maxBoletos = sorteo.total_boletos || 10000;

        // 2. Obtener TODOS los números ya ocupados de este sorteo
        const { data: ocupados } = await supabase
            .from('boletos')
            .select('numeros_asignados')
            .eq('sorteo_id', sorteoId)
            .neq('estado', 'rechazado') 
            .not('numeros_asignados', 'is', null);

        // Crear una lista única (Set) de números ocupados
        let setOcupados = new Set();
        ocupados.forEach(row => {
            if(row.numeros_asignados) {
                row.numeros_asignados.split(',').forEach(n => setOcupados.add(parseInt(n.trim())));
            }
        });

        // 3. Generar números aleatorios únicos
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

        // Formatear números (ej: 0005)
        const paddingLength = maxBoletos.toString().length;
        const numerosString = nuevosNumeros.map(n => n.toString().padStart(paddingLength, '0')).join(', ');

        // 4. Guardar en Base de Datos
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

    // =================================================================
    // C. EVENT LISTENERS Y CARGA INICIAL
    // =================================================================
    
    document.getElementById('sorteos-link')?.addEventListener('click', () => mostrarListaSorteos());
    document.getElementById('boletos-link')?.addEventListener('click', () => mostrarBoletosVendidos());
    document.getElementById('cerrar-sesion-btn')?.addEventListener('click', async () => {
        await supabase.auth.signOut(); window.location.href = 'admin_login.html';
    });

    mostrarListaSorteos();
});
