// ==========================================================
// Archivo: sorteo_script.js - FORMATO 0.00% & SIN FANTASMAS
// ==========================================================

window.abrirModalConsultaTicketsGlobal = abrirModalConsultaTickets;

// Variables de estado
let sorteoActual = null;
let precioUnitario = 0;
let boletosSeleccionados = 2; 
let maxDisponible = 0; 
let referenciaUnica = null;
let datosClienteTemporal = {}; // AQUÍ GUARDAMOS LOS DATOS MIENTRAS PAGAN

// Variables botones
let intervalId = null;
let timeoutId = null;
const REPEAT_SPEED = 100; 
const INITIAL_DELAY = 400; 

// DOM Elements
const inputCantidad = document.getElementById('tickets-input');
const displayTicketsCount = document.getElementById('tickets-count-display'); 
const displayPrecioBoleto = document.getElementById('precio-por-boleto');
const displayTotalPagar = document.getElementById('total-a-pagar');
const displayMontoFinalPago = document.getElementById('monto-final-pago');
const codigoReferenciaPago = document.getElementById('codigo-referencia');
const codigoReferenciaDisplay = document.getElementById('codigo-referencia-display');
const btnComprarBoletos = document.getElementById('btn-comprar-boletos');

// Consulta DOM
const modalConsultaTickets = document.getElementById('modal-consultar-tickets');
const btnConsultaNavbar = document.getElementById('consultar-tickets-navbar-btn');
const btnCerrarConsulta = document.getElementById('close-consultar-tickets');
const btnCerrarVisible = document.getElementById('btn-cerrar-consulta-visible');
const formConsultarTickets = document.getElementById('form-consultar-tickets');
const resultadosConsultaDiv = document.getElementById('resultados-consulta');
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

    activarModoEscrituraManual();

    if (sorteoId) {
        cargarDetalleSorteo(sorteoId);
    } else {
        document.getElementById('sorteo-detalle-content').innerHTML = '<h3 style="text-align: center; color: red;">Error: ID no encontrado.</h3>';
    }

    configurarBotonesCantidad();
    configurarBotonesCompraRapida();
    configurarModales(); 
    configurarFormularios(); 
    configurarBotonConsultaTickets(); 
});

// ==========================================================
// ACTIVAR ESCRITURA MANUAL CON LÍMITE DE STOCK
// ==========================================================
function activarModoEscrituraManual() {
    if(displayTicketsCount) displayTicketsCount.style.display = 'none';
    
    if(inputCantidad) {
        inputCantidad.style.display = 'block'; 
        inputCantidad.value = 2; 
        
        inputCantidad.addEventListener('input', (e) => {
            let valor = parseInt(e.target.value);
            if (isNaN(valor)) valor = 0;
            boletosSeleccionados = valor;
            actualizarSoloTotal(); 
        });

        inputCantidad.addEventListener('blur', () => {
            let valor = parseInt(inputCantidad.value);
            if (isNaN(valor) || valor < 2) { valor = 2; }
            if (maxDisponible > 0 && valor > maxDisponible) {
                alert(`Solo quedan ${maxDisponible} boletos disponibles.`);
                valor = maxDisponible;
            }
            inputCantidad.value = valor;
            actualizarTotales(valor);
        });
    }
}

// ==========================================================
// CARGA DE DATOS (SOLO CUENTA VENTAS REALES)
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

        // Solo contamos boletos que ya tienen FOTO (reportado) o ya están validados.
        const { data: ventas } = await supabase
            .from('boletos')
            .select('cantidad_boletos')
            .eq('sorteo_id', id)
            .in('estado', ['reportado', 'validado']); 

        const boletosOcupados = ventas ? ventas.reduce((sum, orden) => sum + orden.cantidad_boletos, 0) : 0;
        const totalTickets = sorteo.total_boletos || 10000; 
        
        maxDisponible = Math.max(0, totalTickets - boletosOcupados);
        let porcentaje = (boletosOcupados / totalTickets) * 100;
        let porcentajeVisual = Math.min(porcentaje, 100);
        
        document.title = `${sorteo.titulo} | Detalles`;
        document.getElementById('titulo-sorteo').textContent = sorteo.titulo;
        
        const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
            day: 'numeric', month: 'long', year: 'numeric' 
        });
        document.getElementById('fecha-sorteo').textContent = fecha;
        document.getElementById('descripcion-sorteo').textContent = sorteo.descripcion_larga || sorteo.descripcion_corta || '';
        
        if(displayPrecioBoleto) displayPrecioBoleto.textContent = precioUnitario.toFixed(2);
        const imgEl = document.getElementById('imagen-sorteo');
        if(imgEl) imgEl.src = sorteo.imagen_url || 'placeholder.png';

        // CAMBIO FORMATO: .toFixed(2)
        document.getElementById('porcentaje-progreso').textContent = `${porcentajeVisual.toFixed(2)}%`;
        document.getElementById('barra-progreso').style.width = `${porcentajeVisual}%`;
        const textoProgreso = document.getElementById('texto-progreso');

        if (boletosOcupados >= totalTickets) {
            textoProgreso.textContent = "¡Sorteo Agotado!";
            textoProgreso.style.color = "red";
            btnComprarBoletos.textContent = "AGOTADO";
            btnComprarBoletos.style.background = "#ccc";
            btnComprarBoletos.disabled = true;
            inputCantidad.disabled = true;
            inputCantidad.value = 0;
            boletosSeleccionados = 0;
            actualizarSoloTotal();
        } else {
            textoProgreso.textContent = `Quedan ${maxDisponible} boletos disponibles`;
            btnComprarBoletos.textContent = "Comprar Boletos";
            btnComprarBoletos.disabled = false;
            let inicio = 2;
            if (maxDisponible < 2) inicio = maxDisponible;
            actualizarTotales(inicio);
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="text-align: center;">Error cargando el sorteo.</p>';
    }
}

// ==========================================================
// LÓGICA DE CANTIDAD
// ==========================================================

function actualizarTotales(cantidad) {
    if (maxDisponible > 0 && cantidad > maxDisponible) {
        cantidad = maxDisponible;
        alert(`Ajustado al máximo disponible: ${maxDisponible}`);
    }
    if (cantidad < 2 && maxDisponible >= 2) cantidad = 2;
    
    boletosSeleccionados = cantidad;
    if(inputCantidad) inputCantidad.value = cantidad;

    const total = (cantidad * precioUnitario).toFixed(2);
    if(displayTotalPagar) displayTotalPagar.textContent = `Bs. ${total}`;
    if(displayMontoFinalPago) displayMontoFinalPago.textContent = total;
}

function actualizarSoloTotal() {
    let cantidad = boletosSeleccionados;
    if (cantidad < 0) cantidad = 0; 
    const total = (cantidad * precioUnitario).toFixed(2);
    if(displayTotalPagar) displayTotalPagar.textContent = `Bs. ${total}`;
}

function cambiarCantidad(step) {
    let actual = parseInt(inputCantidad.value) || 2;
    let nuevoValor = actual + step;
    if (nuevoValor < 2) nuevoValor = 2; 
    if (maxDisponible > 0 && nuevoValor > maxDisponible) nuevoValor = maxDisponible;
    actualizarTotales(nuevoValor);
}

function iniciarAutoCambio(step) {
    cambiarCantidad(step); 
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
        btnPlus.addEventListener('mousedown', () => iniciarAutoCambio(1));
        btnPlus.addEventListener('mouseup', detenerAutoCambio);
        btnPlus.addEventListener('mouseleave', detenerAutoCambio);
        btnMinus.addEventListener('mousedown', () => iniciarAutoCambio(-1));
        btnMinus.addEventListener('mouseup', detenerAutoCambio);
        btnMinus.addEventListener('mouseleave', detenerAutoCambio);
        btnPlus.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarAutoCambio(1); });
        btnPlus.addEventListener('touchend', detenerAutoCambio);
        btnMinus.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarAutoCambio(-1); });
        btnMinus.addEventListener('touchend', detenerAutoCambio);
    }
}

function configurarBotonesCompraRapida() {
    document.querySelectorAll('.buy-option-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            let cantidad = parseInt(e.currentTarget.getAttribute('data-tickets'));
            if (maxDisponible > 0 && cantidad > maxDisponible) {
                cantidad = maxDisponible;
                alert("Has seleccionado más de lo disponible. Ajustamos al máximo.");
            }
            if (cantidad < 2) cantidad = 2;
            actualizarTotales(cantidad);
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
// MODALES Y FLUJO DE COMPRA
// ==========================================================

function configurarModales() {
    const modalContacto = document.getElementById('modal-datos-contacto');
    const modalPago = document.getElementById('modal-datos-pago');
    const modalReporte = document.getElementById('modal-reporte-pago');

    btnComprarBoletos.addEventListener('click', () => {
        if (!sorteoActual) return;
        if (maxDisponible <= 0) { alert("Sorteo agotado."); return; }
        if (boletosSeleccionados > maxDisponible) { actualizarTotales(maxDisponible); return; }
        if (boletosSeleccionados < 2) { alert("Mínimo 2 boletos."); actualizarTotales(2); return; }
        
        modalContacto.classList.add('active'); 
        modalContacto.style.display = 'flex'; 
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
    });

    // 1. FORMULARIO DE CONTACTO: NO GUARDA EN BD AÚN
    document.getElementById('form-datos-contacto').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Generamos la referencia para mostrarla
        referenciaUnica = Math.floor(100000 + Math.random() * 900000);

        // GUARDAMOS LOS DATOS EN MEMORIA (NO EN SUPABASE)
        datosClienteTemporal = {
            nombre: document.getElementById('nombre-completo').value,
            email: document.getElementById('email-contacto').value,
            telefono: document.getElementById('telefono-contacto').value,
            cedula: document.getElementById('cedula-prefijo').value + document.getElementById('cedula-numero').value,
            estado: document.getElementById('estado-contacto').value
        };

        // Mostramos referencia y pasamos al pago
        codigoReferenciaDisplay.textContent = referenciaUnica;
        codigoReferenciaPago.textContent = referenciaUnica;
        
        modalContacto.style.display = 'none';
        modalPago.classList.add('active');
        modalPago.style.display = 'flex';
    });

    document.getElementById('abrir-reporte').addEventListener('click', () => {
        modalPago.style.display = 'none';
        modalReporte.classList.add('active');
        modalReporte.style.display = 'flex';
    });

    document.querySelectorAll('.copy-button').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.getAttribute('data-copy-target'));
            alert("Copiado!");
        });
    });
}

// ==========================================================
// CONSULTA TICKETS
// ==========================================================
function switchTabConsulta(activeTab, inactiveTab, activeGroup, inactiveGroup, activeInput, inactiveInput) {
    activeTab.classList.add('active');
    inactiveTab.classList.remove('active');
    activeGroup.style.display = 'block';
    inactiveGroup.style.display = 'none';
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
            valor = inputTelefono.value.trim(); tipo = 'telefono_cedula';
        } else {
            valor = inputEmail.value.trim(); tipo = 'email';
        }
        if (valor) await consultarBoletosValidos(valor, tipo);
    });
}
async function consultarBoletosValidos(identificador, tipoBusqueda) {
    resultadosConsultaDiv.innerHTML = '<div class="loading"></div><p style="text-align:center;">Buscando...</p>';
    let query = supabase.from('boletos').select('cantidad_boletos, numeros_asignados, sorteos(titulo)').eq('estado', 'validado'); 
    if (tipoBusqueda === 'email') { query = query.eq('email_cliente', identificador.toLowerCase()); } 
    else {
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
        html += `<div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px; background:#f8f9fa;"><p style="font-weight:bold; color:var(--primary);">${boleto.sorteos?.titulo || 'Sorteo'}</p><p>Cantidad: ${boleto.cantidad_boletos}</p><p style="color:green; font-family:monospace;"># ${boleto.numeros_asignados}</p></div>`;
    });
    resultadosConsultaDiv.innerHTML = html;
}

// ==========================================================
// GUARDADO FINAL
// ==========================================================
function configurarFormularios() {} // Dummy

document.getElementById('form-reporte-pago').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. VALIDACIÓN CAPTURE
    const fileInput = document.getElementById('capture-input');
    const file = fileInput.files[0];

    if (!file) {
        alert("⚠️ ¡ATENCIÓN!\nEs OBLIGATORIO subir la captura del pago.");
        fileInput.style.border = "2px solid red";
        return;
    }

    const btn = e.submitter; 
    btn.textContent = "Enviando Pedido..."; btn.disabled = true;

    // 2. SUBIR IMAGEN
    const BUCKET = 'comprobantes_narbis_v2';
    let fileUrl = null;
    const cleanName = file.name.replace(/[^a-zA-Z0-9_.]/g, '');
    const fileName = `${referenciaUnica}_${Date.now()}_${cleanName}`;
    
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(fileName, file);
    
    if (uploadErr) {
        console.error("Error subida:", uploadErr);
        alert("Error al subir imagen. Revisa tu conexión.");
        btn.disabled = false; btn.textContent = "Reportar Pago";
        return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    fileUrl = data.publicUrl;

    // 3. INSERTAR TODO EN SUPABASE
    const total = parseFloat(displayTotalPagar.textContent.replace('Bs. ', ''));
    
    const nuevaOrden = {
        sorteo_id: sorteoActual.id,
        nombre_cliente: datosClienteTemporal.nombre,
        email_cliente: datosClienteTemporal.email,
        telefono_cliente: datosClienteTemporal.telefono,
        cedula_cliente: datosClienteTemporal.cedula,
        estado_cliente: datosClienteTemporal.estado,
        cantidad_boletos: boletosSeleccionados,
        precio_total: total,
        metodo_pago: 'pago_movil',
        codigo_concepto: referenciaUnica,
        referencia_pago: document.getElementById('referencia-pago').value,
        telefono_pago: document.getElementById('telefono-pago-movil').value,
        url_capture: fileUrl,
        estado: 'reportado',
        creado_en: new Date().toISOString()
    };

    const { error: insertErr } = await supabase.from('boletos').insert([nuevaOrden]);

    if (!insertErr) {
        alert("✅ ¡Pedido Enviado Exitosamente!\nTu pago será verificado en breve.");
        window.location.href = 'index.html';
    } else {
        console.error(insertErr);
        alert("Error al guardar la orden. Contáctanos por WhatsApp.");
        btn.disabled = false; btn.textContent = "Reportar Pago";
    }
});
