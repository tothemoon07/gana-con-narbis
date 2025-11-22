// ==========================================================
// Archivo: sorteo_script.js - VERSIÓN FINAL Y PULIDA
// ==========================================================

// Variable para exponer la función de consulta globalmente
window.abrirModalConsultaTicketsGlobal = abrirModalConsultaTickets;

// Variables de estado
let sorteoActual = null;
let precioUnitario = 0;
let boletosSeleccionados = 1;
let referenciaUnica = null;

// Variables para la lógica de botones (Auto-repetición)
let intervalId = null;
let timeoutId = null;
const REPEAT_SPEED = 100; // Velocidad de cambio al mantener presionado
const INITIAL_DELAY = 400; // Tiempo antes de empezar a cambiar rápido

// Elementos del DOM Compra
const inputCantidad = document.getElementById('tickets-input');
const displayTicketsCount = document.getElementById('tickets-count-display'); // El número grande
const displayPrecioBoleto = document.getElementById('precio-por-boleto');
const displayTotalPagar = document.getElementById('total-a-pagar');
const displayMontoFinalPago = document.getElementById('monto-final-pago');
const codigoReferenciaPago = document.getElementById('codigo-referencia');
const codigoReferenciaDisplay = document.getElementById('codigo-referencia-display');
const btnComprarBoletos = document.getElementById('btn-comprar-boletos');

// Elementos Consulta
const modalConsultaTickets = document.getElementById('modal-consultar-tickets');
const btnConsultaNavbar = document.getElementById('consultar-tickets-navbar-btn');
const btnCerrarConsulta = document.getElementById('close-consultar-tickets');
const btnCerrarVisible = document.getElementById('btn-cerrar-consulta-visible');
const formConsultarTickets = document.getElementById('form-consultar-tickets');
const resultadosConsultaDiv = document.getElementById('resultados-consulta');

// Pestañas Consulta
const tabTelefono = document.getElementById('tab-telefono');
const tabEmail = document.getElementById('tab-email');
const groupTelefono = document.getElementById('consulta-telefono-group');
const groupEmail = document.getElementById('consulta-email-group');
const inputTelefono = document.getElementById('telefono-consulta');
const inputEmail = document.getElementById('email-consulta');


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

    // Configuración de botones mejorada (con auto-repetición)
    configurarBotonesCantidad();
    configurarBotonesCompraRapida();
    
    configurarModales();
    configurarFormularios();
    configurarBotonConsultaTickets(); 
});

// ==========================================================
// A. Carga de Datos
// ==========================================================

async function cargarDetalleSorteo(id) {
    const container = document.getElementById('sorteo-detalle-content');
    btnComprarBoletos.disabled = true; 
    btnComprarBoletos.textContent = "Cargando...";

    try {
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

        // Calcular Progreso (Incluyendo pendientes y reportados para no sobre-vender)
        const { data: ventas } = await supabase
            .from('boletos')
            .select('cantidad_boletos')
            .eq('sorteo_id', id)
            .in('estado', ['pendiente', 'reportado', 'validado']); 

        const boletosVendidos = ventas ? ventas.reduce((sum, orden) => sum + orden.cantidad_boletos, 0) : 0;
        const totalTickets = sorteo.total_boletos || 10000; 
        
        let porcentaje = (boletosVendidos / totalTickets) * 100;
        if (porcentaje > 100) porcentaje = 100;
        const boletosRestantes = Math.max(0, totalTickets - boletosVendidos);

        // Actualizar DOM con textos
        document.title = `${sorteo.titulo} | Detalles`;
        document.getElementById('titulo-sorteo').textContent = sorteo.titulo;
        
        const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
            day: 'numeric', month: 'long', year: 'numeric' 
        });
        document.getElementById('fecha-sorteo').textContent = fecha;
        document.getElementById('descripcion-sorteo').textContent = sorteo.descripcion_larga || sorteo.descripcion_corta || '';
        
        // Actualizar Precios en UI
        if(displayPrecioBoleto) displayPrecioBoleto.textContent = precioUnitario.toFixed(2);
        
        // Actualizar Imagen
        const imgEl = document.getElementById('imagen-sorteo');
        if(imgEl) imgEl.src = sorteo.imagen_url || 'placeholder.png';

        // Actualizar Barra de Progreso
        document.getElementById('porcentaje-progreso').textContent = `${porcentaje.toFixed(1)}%`;
        document.getElementById('barra-progreso').style.width = `${porcentaje}%`;
        const textoProgreso = document.getElementById('texto-progreso');

        if (porcentaje >= 100) {
            textoProgreso.textContent = "¡Sorteo Agotado!";
            textoProgreso.style.color = "red";
            btnComprarBoletos.textContent = "Agotado";
            btnComprarBoletos.style.background = "#ccc";
        } else {
            textoProgreso.textContent = `Quedan ${boletosRestantes} boletos disponibles`;
            btnComprarBoletos.textContent = "Comprar Boletos";
            btnComprarBoletos.disabled = false;
        }

        actualizarTotales(1); // Iniciar con 1 boleto

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="text-align: center;">Error cargando el sorteo.</p>';
    }
}

// ==========================================================
// B. Lógica de Cantidad (MEJORADA: Auto-repetición)
// ==========================================================

function actualizarTotales(cantidad) {
    // Validaciones
    if (cantidad < 1) cantidad = 1;
    if (cantidad > 500) cantidad = 500; // Límite de seguridad

    boletosSeleccionados = cantidad;
    
    // Actualizar Input invisible y Display visible
    if(inputCantidad) inputCantidad.value = cantidad;
    if(displayTicketsCount) displayTicketsCount.textContent = cantidad;

    // Actualizar Precio Total
    const total = (cantidad * precioUnitario).toFixed(2);
    
    if(displayTotalPagar) displayTotalPagar.textContent = `Bs. ${total}`;
    if(displayMontoFinalPago) displayMontoFinalPago.textContent = total;
}

// Función para cambiar cantidad (usada por botones)
function cambiarCantidad(step) {
    let nuevaCantidad = boletosSeleccionados + step;
    actualizarTotales(nuevaCantidad);
}

// Lógica de mantener presionado (MouseDown / TouchStart)
function iniciarAutoCambio(step) {
    cambiarCantidad(step); // Cambio inmediato
    
    timeoutId = setTimeout(() => {
        intervalId = setInterval(() => {
            cambiarCantidad(step);
        }, REPEAT_SPEED);
    }, INITIAL_DELAY);
}

function detenerAutoCambio() {
    clearTimeout(timeoutId);
    clearInterval(intervalId);
}

function configurarBotonesCantidad() {
    const btnMinus = document.getElementById('decrement-btn');
    const btnPlus = document.getElementById('increment-btn');

    if (btnMinus && btnPlus) {
        // Eventos Mouse (PC)
        btnPlus.addEventListener('mousedown', () => iniciarAutoCambio(1));
        btnPlus.addEventListener('mouseup', detenerAutoCambio);
        btnPlus.addEventListener('mouseleave', detenerAutoCambio);

        btnMinus.addEventListener('mousedown', () => iniciarAutoCambio(-1));
        btnMinus.addEventListener('mouseup', detenerAutoCambio);
        btnMinus.addEventListener('mouseleave', detenerAutoCambio);

        // Eventos Touch (Móvil)
        btnPlus.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarAutoCambio(1); });
        btnPlus.addEventListener('touchend', detenerAutoCambio);
        
        btnMinus.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarAutoCambio(-1); });
        btnMinus.addEventListener('touchend', detenerAutoCambio);
    }
}

function configurarBotonesCompraRapida() {
    document.querySelectorAll('.buy-option-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const cantidad = parseInt(e.currentTarget.getAttribute('data-tickets'));
            actualizarTotales(cantidad);
            
            // Efecto visual de "seleccionado"
            document.querySelectorAll('.buy-option-btn').forEach(b => b.style.background = 'white');
            document.querySelectorAll('.buy-option-btn').forEach(b => b.style.color = 'var(--primary)');
            
            if(!e.currentTarget.classList.contains('popular')) {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = 'white';
            }
        });
    });
}

// ==========================================================
// C. Modales y Pagos
// ==========================================================

function configurarModales() {
    const modalContacto = document.getElementById('modal-datos-contacto');
    const modalPago = document.getElementById('modal-datos-pago');
    const modalReporte = document.getElementById('modal-reporte-pago');

    // Abrir primer modal
    btnComprarBoletos.addEventListener('click', () => {
        if (!sorteoActual) return;
        if (boletosSeleccionados < 1) return;
        modalContacto.classList.add('active'); // Usamos clase CSS
        modalContacto.style.display = 'flex'; // Aseguramos display
    });

    // Cerrar modales (X)
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
    });

    // Navegación entre modales
    document.getElementById('form-datos-contacto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.submitter; 
        btn.textContent = "Procesando..."; btn.disabled = true;

        referenciaUnica = Math.floor(100000 + Math.random() * 900000);
        const exito = await guardarOrdenPendiente();
        
        if (exito) {
            codigoReferenciaDisplay.textContent = referenciaUnica;
            codigoReferenciaPago.textContent = referenciaUnica;
            
            modalContacto.style.display = 'none';
            modalPago.classList.add('active');
            modalPago.style.display = 'flex';
        } else {
            alert("Error creando orden. Intente de nuevo.");
        }
        btn.textContent = "Continuar al Pago"; btn.disabled = false;
    });

    document.getElementById('abrir-reporte').addEventListener('click', () => {
        modalPago.style.display = 'none';
        modalReporte.classList.add('active');
        modalReporte.style.display = 'flex';
    });

    // Copiar al portapapeles
    document.querySelectorAll('.copy-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const texto = btn.getAttribute('data-copy-target');
            navigator.clipboard.writeText(texto);
            alert("Copiado: " + texto);
        });
    });
}

// ==========================================================
// D. Consulta de Tickets
// ==========================================================

function switchTabConsulta(activeTab, inactiveTab, activeGroup, inactiveGroup, activeInput, inactiveInput) {
    activeTab.classList.add('active');
    inactiveTab.classList.remove('active');
    activeGroup.style.display = 'block';
    inactiveGroup.style.display = 'none';
    
    // Limpiar resultados previos
    if(resultadosConsultaDiv) resultadosConsultaDiv.innerHTML = '';
}

function abrirModalConsultaTickets() {
    if (modalConsultaTickets) {
        resultadosConsultaDiv.innerHTML = ''; 
        switchTabConsulta(tabTelefono, tabEmail, groupTelefono, groupEmail, inputTelefono, inputEmail);
        modalConsultaTickets.classList.add('active');
        modalConsultaTickets.style.display = 'flex';
    }
}

function cerrarModalConsultaTickets() {
    if (modalConsultaTickets) {
        modalConsultaTickets.classList.remove('active');
        modalConsultaTickets.style.display = 'none';
    }
}

function configurarBotonConsultaTickets() {
    btnConsultaNavbar?.addEventListener('click', abrirModalConsultaTickets);
    btnCerrarConsulta?.addEventListener('click', cerrarModalConsultaTickets);
    btnCerrarVisible?.addEventListener('click', cerrarModalConsultaTickets);

    tabTelefono?.addEventListener('click', () => {
        switchTabConsulta(tabTelefono, tabEmail, groupTelefono, groupEmail, inputTelefono, inputEmail);
    });

    tabEmail?.addEventListener('click', () => {
        switchTabConsulta(tabEmail, tabTelefono, groupEmail, groupTelefono, inputEmail, inputTelefono);
    });

    formConsultarTickets?.addEventListener('submit', async (e) => {
        e.preventDefault();
        let valor = '';
        let tipo = '';

        if (groupTelefono.style.display !== 'none') {
            valor = inputTelefono.value.trim();
            tipo = 'telefono_cedula';
        } else {
            valor = inputEmail.value.trim();
            tipo = 'email';
        }

        if (valor) await consultarBoletosValidos(valor, tipo);
    });
}

async function consultarBoletosValidos(identificador, tipoBusqueda) {
    resultadosConsultaDiv.innerHTML = '<div class="loading"></div><p style="text-align:center;">Buscando...</p>';
    
    let query = supabase.from('boletos')
        .select('cantidad_boletos, numeros_asignados, sorteos(titulo)')
        .eq('estado', 'validado'); 

    if (tipoBusqueda === 'email') {
        query = query.eq('email_cliente', identificador.toLowerCase());
    } else {
        const idLimpio = identificador.toUpperCase().replace(/[^A-Z0-9]/g, '');
        query = query.or(`telefono_cliente.eq.${idLimpio},cedula_cliente.eq.${idLimpio},cedula_cliente.eq.V${idLimpio},cedula_cliente.eq.E${idLimpio}`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        resultadosConsultaDiv.innerHTML = '<p style="text-align:center; color:var(--gray);">No se encontraron boletos validados.</p>';
        return;
    }

    let html = '<h4>✅ Boletos Encontrados</h4>';
    data.forEach(boleto => {
        html += `
            <div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px; background:#f8f9fa;">
                <p style="font-weight:bold; color:var(--primary);">${boleto.sorteos?.titulo || 'Sorteo'}</p>
                <p>Cantidad: ${boleto.cantidad_boletos}</p>
                <p style="color:green; font-family:monospace;"># ${boleto.numeros_asignados}</p>
            </div>
        `;
    });
    resultadosConsultaDiv.innerHTML = html;
}

// ==========================================================
// E. Base de Datos (Guardar Orden y Reporte)
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
    
    const { error } = await supabase.from('boletos').insert([datosOrden]);
    if (error) { console.error(error); return false; }
    return true;
}

// Subida de comprobante
document.getElementById('form-reporte-pago').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter; 
    btn.textContent = "Subiendo..."; btn.disabled = true;

    const file = document.getElementById('capture-input').files[0];
    const BUCKET = 'comprobantes_narbis_v2';
    let fileUrl = null;

    if (file) {
        const fileName = `${referenciaUnica}_${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(fileName, file);
        
        if (!uploadErr) {
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
            fileUrl = data.publicUrl;
        } else {
            console.error("Error subida:", uploadErr);
        }
    }

    const { error } = await supabase.from('boletos').update({
        referencia_pago: document.getElementById('referencia-pago').value,
        telefono_pago: document.getElementById('telefono-pago-movil').value,
        url_capture: fileUrl,
        estado: 'reportado'
    }).eq('codigo_concepto', referenciaUnica);

    if (!error) {
        alert("¡Pago reportado con éxito! Te contactaremos para validar tu ticket.");
        window.location.href = 'index.html';
    } else {
        alert("Error al reportar. Contáctanos por WhatsApp.");
        btn.disabled = false; btn.textContent = "Reportar Pago";
    }
});
