// ==========================================================
// Archivo: sorteo_script.js - CÓDIGO COMPLETO Y FINAL
// Incluye: Correcciones de nombres de columna, limpieza de nombre de archivo 
// y el cambio de bucket a 'comprobantes_narbis_v2' para solucionar el problema RLS/400.
// ==========================================================

// Variables de estado
let sorteoActual = null;
let precioUnitario = 0;
let boletosSeleccionados = 1;
let referenciaUnica = null; // Código de 6 dígitos que va en codigo_concepto

// Elementos del DOM para el contador y totales
const inputCantidad = document.getElementById('tickets-input');
const displayTicketsCount = document.getElementById('tickets-count-display');
const displayPrecioBoleto = document.getElementById('precio-por-boleto');
const displayCantidadSummary = document.getElementById('cantidad-boletos-summary');
const displayTotalPagar = document.getElementById('total-a-pagar');
const displayMontoFinalPago = document.getElementById('monto-final-pago');
const codigoReferenciaPago = document.getElementById('codigo-referencia');
const codigoReferenciaDisplay = document.getElementById('codigo-referencia-display');


document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener el ID del sorteo desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const sorteoId = urlParams.get('id');

    // VERIFICACIÓN: Supabase debe estar definido en supabase-config.js
    if (typeof supabase === 'undefined') {
        console.error("Error: Supabase no está definido. Revise supabase-config.js.");
        return;
    }

    if (sorteoId) {
        cargarDetalleSorteo(sorteoId);
    } else {
        document.getElementById('sorteo-detalle-content').innerHTML = '<h3 style="text-align: center; color: red;">Error: ID de sorteo no encontrado.</h3>';
    }

    // 2. Configurar todos los eventos interactivos
    configurarContador();
    configurarBotonesCompraRapida();
    configurarModales();
    configurarFormularios();
});

// ==========================================================
// A. Carga de Datos del Sorteo
// ==========================================================

async function cargarDetalleSorteo(id) {
    const container = document.getElementById('sorteo-detalle-content');
    
    try {
        const { data: sorteo, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('id', id)
            .single(); 
        
        if (error || !sorteo) {
            container.innerHTML = '<h3 style="text-align: center; color: red;">Sorteo no encontrado.</h3>';
            console.error("Error al cargar sorteo:", error);
            return;
        }

        sorteoActual = sorteo;
        precioUnitario = sorteo.precio_bs;
        
        const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        document.getElementById('sorteo-title').textContent = `${sorteo.titulo} | Gana con Narbis`;
        
        // Renderizar detalles del sorteo
        container.innerHTML = `
            <h2 style="text-align: center;">${sorteo.titulo}</h2>
            <div class="sorteo-info">
                <p>📅 Fecha y Hora: <strong>${fecha}</strong></p>
                <p>💰 Precio por boleto: <strong>Bs. ${precioUnitario}</strong></p>
                <p class="detalle-desc">${sorteo.descripcion_larga || sorteo.descripcion_corta || 'Sin descripción detallada.'}</p>
            </div>
        `;
        
        displayPrecioBoleto.textContent = `Bs. ${precioUnitario}`;
        inputCantidad.value = 1; 
        actualizarTotales();

    } catch (err) {
        container.innerHTML = '<h3 style="text-align: center; color: red;">Error de conexión.</h3>';
        console.error("Error de conexión:", err);
    }
}

// ==========================================================
// B. Lógica de Contador y Precio
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
        if (!sorteoActual) {
            alert('Aún cargando información del sorteo. Intente de nuevo.');
            return;
        }
        actualizarTotales(); 
        modalContacto.style.display = 'flex';
    });

    // Cierre de Modales
    document.getElementById('close-datos-contacto').addEventListener('click', () => modalContacto.style.display = 'none');
    document.getElementById('close-datos-pago').addEventListener('click', () => modalPago.style.display = 'none');
    document.getElementById('close-reporte-pago').addEventListener('click', () => modalReporte.style.display = 'none');

    // Navegación de Modales
    document.getElementById('abrir-reporte').addEventListener('click', () => {
        modalPago.style.display = 'none';
        modalReporte.style.display = 'flex';
    });
    
    // Configurar Copiar Código
    document.querySelector('.copy-btn').addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-copy-target');
        const targetElement = document.getElementById(targetId);
        
        navigator.clipboard.writeText(targetElement.textContent.trim()).then(() => {
            alert('Código de referencia copiado: ' + targetElement.textContent);
        }).catch(err => {
            console.error('Error al copiar:', err);
            alert('Error al copiar el texto. Por favor, cópielo manualmente.');
        });
    });
}

function configurarFormularios() {
    // FORMULARIO DE CONTACTO (Primer Modal)
    document.getElementById('form-datos-contacto').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Generar Referencia Única (6 dígitos)
        referenciaUnica = Math.floor(100000 + Math.random() * 900000); 
        
        // Lógica de Supabase: Guardar la orden de compra como PENDIENTE
        const ordenGuardada = await guardarOrdenPendiente();
        
        if (ordenGuardada) {
            // Actualizar el código en los modales de pago
            codigoReferenciaPago.textContent = referenciaUnica;
            codigoReferenciaDisplay.textContent = referenciaUnica;

            // Cerrar modal de contacto y abrir modal de pago
            document.getElementById('modal-datos-contacto').style.display = 'none';
            document.getElementById('modal-datos-pago').style.display = 'flex';
        } else {
             alert('Error al crear la orden. Intente de nuevo.');
        }
    });
    
    // FORMULARIO DE REPORTE DE PAGO (Último Modal)
    document.getElementById('form-reporte-pago').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('capture-input');
        
        if (!referenciaUnica || !fileInput.files[0]) {
             alert('Error: Falta la referencia de la orden o el comprobante.');
             return;
        }
        
        const btnReportar = e.submitter;
        btnReportar.disabled = true;
        btnReportar.textContent = 'Procesando pago...';

        // 1. Subir el comprobante a Supabase Storage
        const file = fileInput.files[0];
        
        // CÓDIGO ULTRA-LIMPIO: Aseguramos que el nombre del archivo sea seguro para la URL
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.]/g, '_'); 
        
        // CORRECCIÓN FINAL: Cambiamos el bucket a 'comprobantes_narbis_v2'
        const filePath = `reportes/${referenciaUnica}-${Date.now()}-${cleanFileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('comprobantes_narbis_v2') // <--- ¡BUCKET CORREGIDO!
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error subiendo el archivo:', uploadError);
            alert('Error al subir el comprobante. Verifique el nuevo bucket de Storage: comprobantes_narbis_v2.');
            btnReportar.disabled = false;
            btnReportar.textContent = 'Reportar Pago';
            return;
        }

        // 2. Actualizar la orden de compra con los datos del reporte
        const reporteExitoso = await actualizarOrdenConReporte(filePath);
        
        if (reporteExitoso) {
            document.getElementById('modal-reporte-pago').style.display = 'none';
            alert('✅ ¡Reporte de pago exitoso! En breve validaremos la transacción y te enviaremos tus tickets.');
            window.location.href = 'index.html'; 
        } else {
            alert('Error al actualizar la orden con el reporte. Revise la consola.');
        }
        
        btnReportar.disabled = false;
        btnReportar.textContent = 'Reportar Pago';
    });

    // Manejar el cambio de nombre del archivo
    document.getElementById('capture-input').addEventListener('change', (e) => {
        const fileName = e.target.files.length > 0 ? e.target.files[0].name : 'Ningún archivo seleccionado.';
        document.getElementById('file-name-display').textContent = fileName;
    });
}

// ==========================================================
// D. Funciones de Base de Datos
// ==========================================================

async function guardarOrdenPendiente() {
    const total = parseFloat(displayTotalPagar.textContent.replace('Bs. ', ''));
    
    // USANDO LOS NOMBRES DE COLUMNA DEFINITIVOS
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
    
    const { data, error } = await supabase
        .from('boletos') 
        .insert([datosOrden])
        .select();

    if (error) {
        console.error("Error al guardar la orden:", error);
        return false;
    }
    
    referenciaUnica = data[0].codigo_concepto || referenciaUnica; 
    console.log("Orden pendiente guardada. Referencia:", referenciaUnica);
    return true;
}

async function actualizarOrdenConReporte(comprobanteUrl) {
    const telefonoPagoMovil = document.getElementById('telefono-pago-movil').value;
    const referenciaPago = document.getElementById('referencia-pago').value;
    
    // USANDO LOS NOMBRES DE COLUMNA DEFINITIVOS
    const { error } = await supabase
        .from('boletos')
        .update({
            referencia_pago: referenciaPago, 
            telefono_pago: telefonoPagoMovil, 
            url_capture: comprobanteUrl, 
            estado: 'reportado', 
            fecha_validacion: new Date().toISOString() 
        })
        .eq('codigo_concepto', referenciaUnica); 
        
    if (error) {
        console.error("Error al actualizar la orden:", error);
        return false;
    }
    return true;
}
