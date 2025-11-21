// ==========================================================
// Archivo: sorteo_script.js - CORREGIDO: Lógica de Consulta de Tickets Local
// ==========================================================

// Variables de estado
let sorteoActual = null;
let precioUnitario = 0;
let boletosSeleccionados = 1;
let referenciaUnica = null; 

// Elementos del DOM de Compra
const inputCantidad = document.getElementById('tickets-input');
const displayTicketsCount = document.getElementById('tickets-count-display');
const displayPrecioBoleto = document.getElementById('precio-por-boleto');
const displayCantidadSummary = document.getElementById('cantidad-boletos-summary');
const displayTotalPagar = document.getElementById('total-a-pagar');
const displayMontoFinalPago = document.getElementById('monto-final-pago');
const codigoReferenciaPago = document.getElementById('codigo-referencia');
const codigoReferenciaDisplay = document.getElementById('codigo-referencia-display');

// Elementos del DOM de Consulta de Tickets
const modalConsultaTickets = document.getElementById('modal-consultar-tickets');
const btnConsultaNavbar = document.getElementById('consultar-tickets-navbar-btn');
const btnCerrarConsulta = document.getElementById('close-consultar-tickets');
const btnCerrarVisible = document.getElementById('btn-cerrar-consulta-visible');
const formConsultarTickets = document.getElementById('form-consultar-tickets');
const resultadosConsultaDiv = document.getElementById('resultados-consulta');


document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sorteoId = urlParams.get('id');

    if (typeof supabase === 'undefined') {
        console.error("Error: Supabase no está definido.");
        return;
    }

    if (sorteoId) {
        cargarDetalleSorteo(sorteoId);
    } else {
        document.getElementById('sorteo-detalle-content').innerHTML = '<h3 style="text-align: center; color: red;">Error: ID no encontrado.</h3>';
    }

    configurarContador();
    configurarBotonesCompraRapida();
    configurarModales();
    configurarFormularios();
    
    // 🔑 Configurar el botón de consulta de tickets (Ahora abre el modal local)
    configurarBotonConsultaTickets(); 
});

// ==========================================================
// A. Carga de Datos y Barra de Progreso
// ==========================================================

async function cargarDetalleSorteo(id) {
    const container = document.getElementById('sorteo-detalle-content');
    
    try {
        // 1. Obtener datos del sorteo
        const { data: sorteo, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('id', id)
            .single(); 
        
        if (error || !sorteo) {
            container.innerHTML = '<h3 style="text-align: center; color: red;">Sorteo no encontrado.</h3>';
            return;
        }

        sorteoActual = sorteo;
        precioUnitario = sorteo.precio_bs;

        // 2. CALCULAR PROGRESO (CORREGIDO: SUMAR BOLETOS, NO CONTAR FILAS)
        const { data: ventas } = await supabase
            .from('boletos')
            .select('cantidad_boletos') // Traemos solo la columna de cantidad
            .eq('sorteo_id', id)
            .neq('estado', 'rechazado');

        // Sumar todas las cantidades de las órdenes
        const boletosVendidos = ventas ? ventas.reduce((sum, orden) => sum + orden.cantidad_boletos, 0) : 0;

        const totalTickets = sorteo.total_boletos || 10000; 
        
        // Calculamos %
        let porcentaje = Math.round((boletosVendidos / totalTickets) * 100);
        if (porcentaje > 100) porcentaje = 100;
        const boletosRestantes = totalTickets - boletosVendidos;

        // Fecha formateada
        const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        document.getElementById('sorteo-title').textContent = `${sorteo.titulo} | Gana con Narbis`;
        
        // Imagen del premio
        const imgHtml = sorteo.imagen_url ? 
            `<img src="${sorteo.imagen_url}" style="width:100%; max-width:500px; border-radius:10px; display:block; margin:0 auto 20px auto; box-shadow:0 4px 10px rgba(0,0,0,0.1);">` : '';

        // Renderizado HTML
        container.innerHTML = `
            ${imgHtml}
            <h2 style="text-align: center;">${sorteo.titulo}</h2>
            
            <div style="background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:20px; border:1px solid #eee;">
                <p class="stats-text" style="text-align:center; margin-bottom:5px; font-size:0.9rem; color:#555;">
                    🔥 ¡Se han vendido <strong>${boletosVendidos}</strong> boletos! Solo quedan <strong>${boletosRestantes}</strong>.
                </p>
                <div class="progress-wrapper" style="width:100%; background:#e0e0e0; border-radius:20px; height:20px; overflow:hidden;">
                    <div class="progress-bar" style="width:${porcentaje}%; background:linear-gradient(90deg, #ff4b1f, #ff9068); height:100%; text-align:center; color:white; font-size:12px; line-height:20px; font-weight:bold; min-width: 20px;">
                        ${porcentaje}%
                    </div>
                </div>
            </div>

            <div class="sorteo-info">
                <p>📅 Fecha: <strong>${fecha}</strong></p>
                <p>💰 Precio: <strong>Bs. ${precioUnitario}</strong></p>
                <p class="detalle-desc">${sorteo.descripcion_larga || sorteo.descripcion_corta || 'Sin descripción.'}</p>
            </div>
        `;
        
        displayPrecioBoleto.textContent = `Bs. ${precioUnitario}`;
        inputCantidad.value = 1; 
        actualizarTotales();

    } catch (err) {
        container.innerHTML = '<h3 style="text-align: center; color: red;">Error de conexión.</h3>';
        console.error(err);
    }
}

// ==========================================================
// B. Lógica de Contador y Totales
// ==========================================================

function actualizarTotales() {
    boletosSeleccionados = parseInt(inputCantidad.value);
    const total = (boletosSeleccionados * precioUnitario).toFixed(2);
    
    displayTicketsCount.textContent = boletosSeleccionados;
    displayCantidadSummary.textContent = boletosSeleccionados;
    displayTotalPagar.textContent = `Bs. ${total}`;
    displayMontoFinalPago.textContent = total;
}

function configurarContador() {
    const btnDecrement = document.getElementById('decrement-btn');
    const btnIncrement = document.getElementById('increment-btn');
    
    btnDecrement.addEventListener('click', () => {
        let cantidad = parseInt(inputCantidad.value);
        if (cantidad > 1) {
            inputCantidad.value = cantidad - 1;
            actualizarTotales();
        }
    });

    btnIncrement.addEventListener('click', () => {
        let cantidad = parseInt(inputCantidad.value);
        inputCantidad.value = cantidad + 1;
        actualizarTotales();
    });

    inputCantidad.addEventListener('change', () => {
        if (parseInt(inputCantidad.value) < 1 || isNaN(parseInt(inputCantidad.value))) {
            inputCantidad.value = 1;
        }
        actualizarTotales();
    });
}

function configurarBotonesCompraRapida() {
    document.querySelectorAll('.buy-option-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const ticketsToAdd = parseInt(e.currentTarget.getAttribute('data-tickets'));
            inputCantidad.value = ticketsToAdd;
            actualizarTotales();
        });
    });
}

// ==========================================================
// C. Lógica de Modales y Formularios
// ==========================================================

function configurarModales() {
    const modalContacto = document.getElementById('modal-datos-contacto');
    const modalPago = document.getElementById('modal-datos-pago');
    const modalReporte = document.getElementById('modal-reporte-pago');

    document.getElementById('btn-comprar-boletos').addEventListener('click', () => {
        if (!sorteoActual) { alert('Cargando información...'); return; }
        actualizarTotales(); 
        modalContacto.style.display = 'flex';
    });

    document.getElementById('close-datos-contacto').addEventListener('click', () => modalContacto.style.display = 'none');
    document.getElementById('close-datos-pago').addEventListener('click', () => modalPago.style.display = 'none');
    document.getElementById('close-reporte-pago').addEventListener('click', () => modalReporte.style.display = 'none');

    document.getElementById('abrir-reporte').addEventListener('click', () => {
        modalPago.style.display = 'none';
        modalReporte.style.display = 'flex';
    });
    
    document.querySelector('.copy-btn').addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-copy-target');
        const targetElement = document.getElementById(targetId);
        
        navigator.clipboard.writeText(targetElement.textContent.trim()).then(() => {
            alert('Copiado: ' + targetElement.textContent);
        }).catch(err => console.error(err));
    });
}

// ==========================================================
// D. LÓGICA DE CONSULTA DE TICKETS (NUEVA FUNCIÓN LOCAL)
// ==========================================================

function abrirModalConsultaTickets() {
    if (modalConsultaTickets) {
        resultadosConsultaDiv.innerHTML = ''; // Limpia resultados anteriores
        modalConsultaTickets.style.display = 'flex'; 
    }
}

function cerrarModalConsultaTickets() {
    if (modalConsultaTickets) {
        modalConsultaTickets.style.display = 'none';
        resultadosConsultaDiv.innerHTML = ''; 
    }
}

function configurarBotonConsultaTickets() {
    if (btnConsultaNavbar) {
        btnConsultaNavbar.addEventListener('click', abrirModalConsultaTickets);
    }
    if (btnCerrarConsulta) {
        btnCerrarConsulta.addEventListener('click', cerrarModalConsultaTickets);
    }
    if (btnCerrarVisible) {
        btnCerrarVisible.addEventListener('click', cerrarModalConsultaTickets);
    }
    
    // Conectar el formulario de consulta
    if (formConsultarTickets) {
        formConsultarTickets.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identificador = document.getElementById('identificador-consulta').value.trim();
            
            if (identificador) {
                await consultarBoletosValidos(identificador);
            }
        });
    }
}

async function consultarBoletosValidos(identificador) {
    resultadosConsultaDiv.innerHTML = '<p style="text-align:center;">Buscando boletos...</p>';
    
    // Normalizar el identificador (ej: quitar guiones, poner mayúsculas)
    const idNormalizado = identificador.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    try {
        // La consulta debe buscar tanto por teléfono_cliente como por cedula_cliente
        const { data: boletos, error } = await supabase
            .from('boletos')
            .select('cantidad_boletos, codigo_concepto, sorteo_id, creado_en') 
            .eq('estado', 'validado') // Solo boletos que ya están VALIDADOS
            .or(`telefono_cliente.eq.${idNormalizado},cedula_cliente.eq.${idNormalizado}`); 

        if (error) throw error;
        
        if (boletos && boletos.length > 0) {
            let htmlContent = '<h4>¡Boletos Encontrados! (Validados)</h4>';
            let totalBoletos = 0;
            
            boletos.forEach(boleto => {
                totalBoletos += boleto.cantidad_boletos;
                const fecha = new Date(boleto.creado_en).toLocaleDateString('es-VE');
                
                htmlContent += `
                    <div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px; background:#f9f9f9;">
                        <p><strong>Orden #${boleto.codigo_concepto}</strong></p>
                        <p>Boletos: <strong>${boleto.cantidad_boletos}</strong></p>
                        <p>Sorteo ID: ${boleto.sorteo_id}</p>
                        <p>Fecha Compra: ${fecha}</p>
                    </div>
                `;
            });
            
            htmlContent = `<h3 style="color:green;">Total Boletos Validados: ${totalBoletos}</h3>` + htmlContent;
            resultadosConsultaDiv.innerHTML = htmlContent;
            
        } else {
            resultadosConsultaDiv.innerHTML = '<p style="color:red; text-align:center;">No se encontraron boletos validados con ese identificador.</p>';
        }

    } catch (error) {
        console.error('Error al consultar boletos:', error);
        resultadosConsultaDiv.innerHTML = '<p style="color:red; text-align:center;">Error al buscar. Revise su conexión o políticas RLS de Select.</p>';
    }
}

// ==========================================================
// E. Formularios y Subida de Archivos
// ==========================================================

function configurarFormularios() {
    // 1. Crear Orden (Pendiente)
    document.getElementById('form-datos-contacto').addEventListener('submit', async (e) => {
        e.preventDefault();
        referenciaUnica = Math.floor(100000 + Math.random() * 900000); 
        
        const ordenGuardada = await guardarOrdenPendiente();
        
        if (ordenGuardada) {
            codigoReferenciaPago.textContent = referenciaUnica;
            codigoReferenciaDisplay.textContent = referenciaUnica;
            document.getElementById('modal-datos-contacto').style.display = 'none';
            document.getElementById('modal-datos-pago').style.display = 'flex';
        } else {
            alert('Error al crear la orden. Intente de nuevo.');
        }
    });
    
    // 2. Reportar Pago (Subida **Directa y Pública** - CORREGIDO)
    document.getElementById('form-reporte-pago').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('capture-input');
        const file = fileInput.files[0];
        const BUCKET_NAME = 'comprobantes_narbis_v2';

        if (!referenciaUnica || !file) {
            alert('Falta referencia o archivo.');
            return;
        }
        
        const btnReportar = e.submitter;
        btnReportar.disabled = true;
        btnReportar.textContent = 'Procesando subida...';

        const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.]/g, '_'); 
        const fileExtension = cleanFileName.split('.').pop();
        // Usaremos el código de concepto y la fecha para asegurar un nombre único
        const filePath = `${referenciaUnica}-${Date.now()}-cap.${fileExtension}`;
        let fileUrl = null;

        try {
            // Paso 1: Subida de archivo
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: false,
                    public: true 
                });

            if (uploadError) throw uploadError;

            // Paso 2: Obtener la URL pública para la BD
            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            fileUrl = publicUrl;
            
            // Paso 3: Actualizar BD con la URL pública
            const reporteExitoso = await actualizarOrdenConReporte(fileUrl); 
            
            if (reporteExitoso) {
                document.getElementById('modal-reporte-pago').style.display = 'none';
                alert(`✅ ¡Reporte exitoso! Referencia: ${referenciaUnica}.`);
                // Redirigir a index.html después de la compra
                window.location.href = 'index.html'; 
            } else {
                alert('Error al actualizar la orden.');
            }
            
        } catch (error) {
            console.error('Error al subir comprobante:', error);
            
            let mensajeUsuario = 'Error al subir. Revise su conexión o las políticas RLS de INSERT en Supabase.';

            // MANEJO DE ERROR AMIGABLE PARA EL USUARIO FINAL (Mitigación)
            if (error && (error.message.includes('row-level security policy') || error.message.includes('Bad Request'))) {
                 // Si falla por RLS o por una petición mal formada (típico de token obsoleto)
                mensajeUsuario = '⚠️ Hubo un error de sesión. Por favor, **recargue la página** (F5) e inténtelo de nuevo.';
            }

            alert(mensajeUsuario);
            btnReportar.disabled = false;
            btnReportar.textContent = 'Reportar Pago';
        }
    });

    document.getElementById('capture-input').addEventListener('change', (e) => {
        document.getElementById('file-name-display').textContent = e.target.files[0]?.name || 'Sin archivo';
    });
}

// ==========================================================
// F. Funciones de Base de Datos
// ==========================================================

async function guardarOrdenPendiente() {
    const total = parseFloat(displayTotalPagar.textContent.replace('Bs. ', ''));
    
    const datosOrden = {
        sorteo_id: sorteoActual.id,
        nombre_cliente: document.getElementById('nombre-completo').value,
        email_cliente: document.getElementById('email-contacto').value,
        telefono_cliente: document.getElementById('telefono-contacto').value,
        cedula_cliente: document.getElementById('cedula-prefijo').value + document.getElementById('cedula-numero').value, 
        estado_cliente: document.getElementById('estado-contacto').value, 
        cantidad_boletos: boletosSeleccionados, 
        precio_total: total, 
        metodo_pago: 'pago_movil', 
        codigo_concepto: referenciaUnica, 
        estado: 'pendiente', 
        creado_en: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('boletos').insert([datosOrden]).select();

    if (error) { console.error(error); return false; }
    referenciaUnica = data[0].codigo_concepto; 
    return true;
}

async function actualizarOrdenConReporte(comprobanteUrl) {
    const { error } = await supabase
        .from('boletos')
        .update({
            referencia_pago: document.getElementById('referencia-pago').value, 
            telefono_pago: document.getElementById('telefono-pago-movil').value, 
            url_capture: comprobanteUrl, // Ahora guarda la URL pública
            estado: 'reportado', 
            fecha_validacion: new Date().toISOString() 
        })
        .eq('codigo_concepto', referenciaUnica); 
        
    if (error) { console.error(error); return false; }
    return true;
}
