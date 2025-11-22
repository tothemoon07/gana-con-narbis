// ==========================================================
// Archivo: sorteo_script.js - VERSIÓN FINAL UNIFICADA
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
const btnComprarBoletos = document.getElementById('btn-comprar-boletos');

// Elementos del DOM de Consulta de Tickets
const modalConsultaTickets = document.getElementById('modal-consultar-tickets');
const btnConsultaNavbar = document.getElementById('consultar-tickets-navbar-btn');
const btnCerrarConsulta = document.getElementById('close-consultar-tickets');
const btnCerrarVisible = document.getElementById('btn-cerrar-consulta-visible');
const formConsultarTickets = document.getElementById('form-consultar-tickets');
const resultadosConsultaDiv = document.getElementById('resultados-consulta');

// Elementos de las pestañas de consulta
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

    configurarContador();
    configurarBotonesCompraRapida();
    configurarModales();
    configurarFormularios();
    
    // Configurar el botón de consulta de tickets con lógica de pestañas
    configurarBotonConsultaTickets(); 
});

// ==========================================================
// A. Carga de Datos y Barra de Progreso
// ==========================================================

async function cargarDetalleSorteo(id) {
    const container = document.getElementById('sorteo-detalle-content');
    if(btnComprarBoletos) btnComprarBoletos.disabled = true;
    
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

        // Calcular Progreso
        const { data: ventas } = await supabase
            .from('boletos')
            .select('cantidad_boletos')
            .eq('sorteo_id', id)
            .neq('estado', 'rechazado');

        const boletosVendidos = ventas ? ventas.reduce((sum, orden) => sum + orden.cantidad_boletos, 0) : 0;
        const totalTickets = sorteo.total_boletos || 10000;
        
        let porcentaje = (boletosVendidos / totalTickets) * 100;
        if (porcentaje > 100) porcentaje = 100;
        
        const boletosRestantes = Math.max(0, totalTickets - boletosVendidos);
        const porcentajeDisplay = porcentaje.toFixed(2);

        const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
            day: 'numeric', month: 'long', year: 'numeric'
        });

        document.getElementById('sorteo-title').textContent = `${sorteo.titulo} | Gana con Narbis`;
        
        // Lógica de visualización (Vendido vs Progreso) similar al index
        let progresoHTML = '';
        let imgStyle = '';
        
        if (porcentaje >= 100) {
             progresoHTML = `
                <p class="progress-text" style="color:var(--primary-color);">Vendido ${porcentajeDisplay}%</p>
                <p style="font-size: 0.8em; color: var(--primary-color); margin-top: 5px;">Rifa vendida completamente</p>
            `;
            imgStyle = 'filter: grayscale(100%);';
            if(btnComprarBoletos) {
                btnComprarBoletos.disabled = true;
                btnComprarBoletos.textContent = 'Rifa Vendida';
                btnComprarBoletos.style.backgroundColor = '#ccc';
            }
        } else {
            progresoHTML = `
                <p class="progress-text">Progreso ${porcentajeDisplay}%</p>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${porcentaje}%;"></div>
                </div>
                <div class="boletos-restantes-tag">
                    Solo quedan ${boletosRestantes} boletos
                </div>
            `;
            if(btnComprarBoletos) btnComprarBoletos.disabled = false;
        }

        container.innerHTML = `
            <div class="sorteo-img-container" style="height: auto; max-height: 400px; margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
                <img src="${sorteo.imagen_url}" style="width:100%; height:auto; object-fit: contain; ${imgStyle}">
            </div>
            <h2 style="text-align: center; margin-bottom: 10px;">${sorteo.titulo}</h2>
            
            <div style="background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:20px; border:1px solid #eee;">
               <div class="progress-wrapper">
                    ${progresoHTML}
               </div>
            </div>

            <div class="sorteo-info">
                <p>📅 Fecha: <strong>${fecha}</strong></p>
                <p>💰 Precio: <strong>Bs. ${precioUnitario}</strong></p>
                <p class="detalle-desc">${sorteo.descripcion_larga || sorteo.descripcion_corta || 'Sin descripción.'}</p>
            </div>
        `;
        
        if(displayPrecioBoleto) displayPrecioBoleto.textContent = `Bs. ${precioUnitario}`;
        if(inputCantidad) inputCantidad.value = 1;
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
    if(!inputCantidad) return;
    boletosSeleccionados = parseInt(inputCantidad.value);
    const total = (boletosSeleccionados * precioUnitario).toFixed(2);
    
    if(displayTicketsCount) displayTicketsCount.textContent = boletosSeleccionados;
    if(displayCantidadSummary) displayCantidadSummary.textContent = boletosSeleccionados;
    if(displayTotalPagar) displayTotalPagar.textContent = `Bs. ${total}`;
    if(displayMontoFinalPago) displayMontoFinalPago.textContent = total;
}

function configurarContador() {
    const btnDecrement = document.getElementById('decrement-btn');
    const btnIncrement = document.getElementById('increment-btn');
    
    btnDecrement?.addEventListener('click', () => {
        let cantidad = parseInt(inputCantidad.value);
        if (cantidad > 1) {
            inputCantidad.value = cantidad - 1;
            actualizarTotales();
        }
    });

    btnIncrement?.addEventListener('click', () => {
        let cantidad = parseInt(inputCantidad.value);
        inputCantidad.value = cantidad + 1;
        actualizarTotales();
    });

    inputCantidad?.addEventListener('change', () => {
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
            if(inputCantidad) {
                inputCantidad.value = ticketsToAdd;
                actualizarTotales();
            }
        });
    });
}

// ==========================================================
// C. Lógica de Modales y Formularios de Pago
// ==========================================================

function configurarModales() {
    const modalContacto = document.getElementById('modal-datos-contacto');
    const modalPago = document.getElementById('modal-datos-pago');
    const modalReporte = document.getElementById('modal-reporte-pago');

    btnComprarBoletos?.addEventListener('click', () => {
        if (!sorteoActual) { alert('Cargando información...'); return; }
        if (boletosSeleccionados < 1) { alert('Selecciona al menos 1 boleto.'); return; }
        actualizarTotales(); 
        if(modalContacto) modalContacto.classList.add('active'); // Usar clase active
    });

    // Cierre de Modales de Pago
    document.getElementById('close-datos-contacto')?.addEventListener('click', () => modalContacto.classList.remove('active'));
    document.getElementById('close-datos-pago')?.addEventListener('click', () => modalPago.classList.remove('active'));
    document.getElementById('close-reporte-pago')?.addEventListener('click', () => modalReporte.classList.remove('active'));

    document.getElementById('abrir-reporte')?.addEventListener('click', () => {
        if(modalPago) modalPago.classList.remove('active');
        if(modalReporte) modalReporte.classList.add('active');
    });
    
    document.querySelector('.copy-btn')?.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-copy-target');
        const targetElement = document.getElementById(targetId);
        
        navigator.clipboard.writeText(targetElement.textContent.trim()).then(() => {
            alert('Copiado: ' + targetElement.textContent);
        }).catch(err => console.error(err));
    });
}

// ==========================================================
// D. LÓGICA DE CONSULTA DE TICKETS (CON PESTAÑAS)
// ==========================================================

function switchTabConsulta(activeTab, inactiveTab, activeGroup, inactiveGroup, activeInput, inactiveInput) {
    activeTab.classList.add('active');
    inactiveTab.classList.remove('active');
    
    activeGroup.style.display = 'block';
    inactiveGroup.style.display = 'none';
    
    if (activeInput) {
        activeInput.setAttribute('required', 'true');
        activeInput.focus();
    }
    if (inactiveInput) {
        inactiveInput.removeAttribute('required');
        inactiveInput.value = '';
    }

    if(resultadosConsultaDiv) resultadosConsultaDiv.innerHTML = '';
}

function abrirModalConsultaTickets() {
    if (modalConsultaTickets) {
        if(resultadosConsultaDiv) resultadosConsultaDiv.innerHTML = ''; 
        
        // Inicializa la pestaña si existen los elementos
        if(tabTelefono && tabEmail && groupTelefono && groupEmail) {
             switchTabConsulta(tabTelefono, tabEmail, groupTelefono, groupEmail, inputTelefono, inputEmail);
        }
        modalConsultaTickets.classList.add('active'); // Usar clase active para mostrar
    }
}

function cerrarModalConsultaTickets() {
    if (modalConsultaTickets) {
        modalConsultaTickets.classList.remove('active');
        if(resultadosConsultaDiv) resultadosConsultaDiv.innerHTML = ''; 
    }
}

function configurarBotonConsultaTickets() {
    btnConsultaNavbar?.addEventListener('click', abrirModalConsultaTickets);
    btnCerrarConsulta?.addEventListener('click', cerrarModalConsultaTickets);
    btnCerrarVisible?.addEventListener('click', cerrarModalConsultaTickets);
    
    // Lógica de las pestañas
    if(tabTelefono && tabEmail) {
        tabTelefono.addEventListener('click', () => {
            switchTabConsulta(tabTelefono, tabEmail, groupTelefono, groupEmail, inputTelefono, inputEmail);
        });

        tabEmail.addEventListener('click', () => {
            switchTabConsulta(tabEmail, tabTelefono, groupEmail, groupTelefono, inputEmail, inputTelefono);
        });
    }

    // Conectar formulario
    if (formConsultarTickets) {
        formConsultarTickets.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            let identificador = '';
            let campoBusqueda = '';

            if (inputTelefono && inputTelefono.hasAttribute('required')) {
                identificador = inputTelefono.value.trim();
                campoBusqueda = 'telefono_cedula'; 
            } else if (inputEmail && inputEmail.hasAttribute('required')) {
                identificador = inputEmail.value.trim();
                campoBusqueda = 'email'; 
            }
            
            if (identificador) {
                await consultarBoletosValidos(identificador, campoBusqueda);
            } else {
                 if(resultadosConsultaDiv) resultadosConsultaDiv.innerHTML = '<p style="color: red; text-align: center;">Introduce un identificador.</p>';
            }
        });
    }
}

async function consultarBoletosValidos(identificador, tipoBusqueda) {
    if(!resultadosConsultaDiv) return;
    resultadosConsultaDiv.innerHTML = '<p style="text-align:center;">Buscando boletos...</p>';
    
    let query = supabase.from('boletos')
        .select('cantidad_boletos, codigo_concepto, sorteo_id, creado_en, sorteos(titulo)') 
        .eq('estado', 'validado'); 

    try {
        if (tipoBusqueda === 'email') {
            const emailNormalizado = identificador.toLowerCase();
            query = query.eq('email_cliente', emailNormalizado);
            
        } else if (tipoBusqueda === 'telefono_cedula') {
            const idNormalizado = identificador.toUpperCase().replace(/[^A-Z0-9]/g, '');
            let posiblesBusquedas = [
                `telefono_cliente.eq.${idNormalizado}`,
                `cedula_cliente.eq.${idNormalizado}`
            ];
            const primerCaracter = idNormalizado.charAt(0);
            if (!['V', 'E', 'P', 'J', 'G'].includes(primerCaracter) && idNormalizado.length >= 5) {
                posiblesBusquedas.push(`cedula_cliente.eq.V${idNormalizado}`);
                posiblesBusquedas.push(`cedula_cliente.eq.E${idNormalizado}`);
            }
            const orClauses = posiblesBusquedas.join(',');
            query = query.or(orClauses);
            
        } else {
             resultadosConsultaDiv.innerHTML = '<p style="color: red; text-align: center;">Error: Tipo de búsqueda no válido.</p>';
             return;
        }
        
        const { data: boletos, error } = await query;

        if (error) throw error;
        
        if (boletos && boletos.length > 0) {
            let htmlContent = '<h4>✅ Boletos Encontrados:</h4>';
            boletos.forEach(boleto => {
                const tituloSorteo = boleto.sorteos ? boleto.sorteos.titulo : 'Sorteo';
                const fecha = new Date(boleto.creado_en).toLocaleDateString('es-VE');
                
                htmlContent += `
                    <div style="border:1px solid #ccc; padding:10px; margin-bottom:8px; border-radius:5px; background:#fdfdfd;">
                        <p><strong>${tituloSorteo}</strong></p>
                        <p>Orden #${boleto.codigo_concepto}</p>
                        <p>Boletos: <strong>${boleto.cantidad_boletos}</strong></p>
                        <p style="font-size:0.8em; color:#555;">Fecha: ${fecha}</p>
                    </div>
                `;
            });
            resultadosConsultaDiv.innerHTML = htmlContent;
        } else {
            resultadosConsultaDiv.innerHTML = '<p style="color:red; text-align:center;">No se encontraron boletos validados.</p>';
        }

    } catch (error) {
        console.error('Error consulta:', error);
        resultadosConsultaDiv.innerHTML = '<p style="color:red; text-align:center;">Error al buscar.</p>';
    }
}

// ==========================================================
// E. Formularios y Subida de Archivos
// ==========================================================

function configurarFormularios() {
    // 1. Crear Orden
    document.getElementById('form-datos-contacto')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        referenciaUnica = Math.floor(100000 + Math.random() * 900000); 
        
        const ordenGuardada = await guardarOrdenPendiente();
        
        if (ordenGuardada) {
            if(codigoReferenciaPago) codigoReferenciaPago.textContent = referenciaUnica;
            if(codigoReferenciaDisplay) codigoReferenciaDisplay.textContent = referenciaUnica;
            
            const modalContacto = document.getElementById('modal-datos-contacto');
            const modalPago = document.getElementById('modal-datos-pago');
            
            if(modalContacto) modalContacto.classList.remove('active');
            if(modalPago) modalPago.classList.add('active');
        } else {
            alert('Error al crear la orden. Intente de nuevo.');
        }
    });
    
    // 2. Reportar Pago 
    document.getElementById('form-reporte-pago')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('capture-input');
        const file = fileInput?.files[0];
        const BUCKET_NAME = 'comprobantes_narbis_v2';

        if (!referenciaUnica || !file) {
            alert('Falta referencia o archivo.');
            return;
        }
        
        const btnReportar = e.submitter;
        btnReportar.disabled = true;
        btnReportar.textContent = 'Procesando...';

        const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.]/g, '_'); 
        const fileExtension = cleanFileName.split('.').pop();
        const filePath = `${referenciaUnica}-${Date.now()}-cap.${fileExtension}`;
        let fileUrl = null;

        try {
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, { cacheControl: '3600', upsert: false, public: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            fileUrl = publicUrl;
            
            const reporteExitoso = await actualizarOrdenConReporte(fileUrl); 
            
            if (reporteExitoso) {
                document.getElementById('modal-reporte-pago').classList.remove('active');
                alert(`✅ ¡Reporte exitoso! Referencia: ${referenciaUnica}.`);
                window.location.href = 'index.html'; 
            } else {
                alert('Error al actualizar la orden.');
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al subir comprobante. Revise conexión.');
            btnReportar.disabled = false;
            btnReportar.textContent = 'Reportar Pago';
        }
    });

    document.getElementById('capture-input')?.addEventListener('change', (e) => {
        const display = document.getElementById('file-name-display');
        if(display) display.textContent = e.target.files[0]?.name || 'Sin archivo';
    });
}

// ==========================================================
// F. Funciones de Base de Datos
// ==========================================================

async function guardarOrdenPendiente() {
    if(!displayTotalPagar) return false;
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
    return true;
}

async function actualizarOrdenConReporte(comprobanteUrl) {
    const { error } = await supabase
        .from('boletos')
        .update({
            referencia_pago: document.getElementById('referencia-pago').value, 
            telefono_pago: document.getElementById('telefono-pago-movil').value, 
            url_capture: comprobanteUrl, 
            estado: 'reportado', 
            fecha_validacion: new Date().toISOString() 
        })
        .eq('codigo_concepto', referenciaUnica); 
        
    if (error) { console.error(error); return false; }
    return true;
}
