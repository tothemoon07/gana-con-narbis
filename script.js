
// script.js (Lógica Pública y Flujo de Compra)

// --- CONFIGURACIÓN DE SUPABASE (CLAVE PÚBLICA ANON) ---
const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMxOTEsImV4cCI6MjA3ODk4OTE5MX0.C03fAwZIpgSi5iy0Urh1MyBHpR3UUMN6N-m8-n7ErXU'; 

// Inicialización de Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let currentSorteoId = null;
let currentPrecioPorBoleto = 0;
let currentCantidadBoletos = 1;
let currentClientData = {}; // Para almacenar temporalmente los datos del comprador
let currentReferenceCode = ''; // Código de referencia único para el pago

// --- 1. LÓGICA DE CARGA DE SORTEOS (INDEX.HTML) ---

/**
 * Renderiza la lista de sorteos activos en la página principal.
 */
async function loadSorteos() {
    const sorteosContainer = document.getElementById('sorteos-container');
    const loadingStatus = document.getElementById('loading-status');

    // 1. Obtener Sorteos, incluyendo el conteo de boletos validados
    const { data: sorteos, error } = await supabase
        .from('sorteos')
        .select(`
            *,
            boletos_vendidos:boletos(count)
        `)
        .eq('estado', 'activo') // Solo activos para la vista pública
        .order('fecha_sorteo', { ascending: true })
        .limit(10); 

    if (error) {
        console.error('Error cargando sorteos:', error);
        if (loadingStatus) loadingStatus.textContent = 'Error al cargar sorteos. Intenta de nuevo.';
        return;
    }

    if (sorteos.length === 0) {
        if (loadingStatus) loadingStatus.textContent = 'No hay sorteos disponibles por el momento.';
        return;
    }

    if (loadingStatus) loadingStatus.style.display = 'none';
    sorteosContainer.innerHTML = ''; // Limpiar el contenedor

    // 2. Renderizar cada tarjeta de sorteo
    sorteos.forEach(sorteo => {
        const totalBoletos = 10000;
        // El conteo de boletos validados se obtiene de la consulta
        const boletosValidados = sorteos.filter(s => s.id === sorteo.id)[0].boletos_vendidos[0].count;
        const progreso = (boletosValidados / totalBoletos) * 100;
        const estado = sorteo.estado;

        let tagHTML = '';
        if (progreso < 100 && progreso > 50) {
            tagHTML = '<span class="tag-popular">¡Más Popular!</span>';
        } else if (estado === 'vendido' || progreso >= 100) {
            tagHTML = '<span class="tag-vendido">VENDIDO</span>';
        }

        const cardHTML = `
            <div class="sorteo-card" onclick="window.location.href='sorteo.html?id=${sorteo.id}'">
                <div class="sorteo-img-container">
                    <img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" class="sorteo-img">
                    ${tagHTML}
                </div>
                <div class="sorteo-info">
                    <p style="font-size: 14px; margin: 0 0 5px;">📅 ${new Date(sorteo.fecha_sorteo).toLocaleDateString()}</p>
                    <h3>${sorteo.titulo}</h3>
                    <p style="font-size: 14px; margin: 5px 0 10px;">${sorteo.descripcion_corta}</p>
                    
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${Math.min(progreso, 100).toFixed(2)}%;"></div>
                    </div>
                    <p style="font-size: 14px; margin-top: -5px; color: ${progreso >= 100 ? 'red' : 'green'};">
                        ${progreso >= 100 ? 'Rifa vendida completamente' : `Progreso: ${progreso.toFixed(2)}%`}
                    </p>

                    <p class="price">Bs. ${sorteo.precio_bs.toFixed(2)}</p>
                    <button class="btn-participar" ${progreso >= 100 ? 'disabled' : ''}>
                        ${progreso >= 100 ? 'Agotado' : 'Participar ahora'}
                    </button>
                </div>
            </div>
        `;
        sorteosContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// --- 2. LÓGICA DE DETALLE DE SORTEO (SORTEO.HTML) ---

/**
 * Carga el detalle del sorteo basado en el ID de la URL.
 */
async function loadSorteoDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSorteoId = urlParams.get('id');

    if (!currentSorteoId) {
        document.getElementById('sorteo-detalle-content').innerHTML = '<p style="color: red; text-align: center;">ID de sorteo no encontrado.</p>';
        return;
    }

    // Consulta para obtener el sorteo y sus premios (y el progreso de boletos vendidos)
    const { data: sorteo, error } = await supabase
        .from('sorteos')
        .select(`
            *,
            premios(*),
            boletos_vendidos:boletos!sorteo_id(count)
        `)
        .eq('id', currentSorteoId)
        .eq('boletos_vendidos.estado', 'validado') // Solo boletos validados cuentan para el progreso
        .single();

    if (error || !sorteo) {
        console.error('Error cargando detalle del sorteo:', error);
        document.getElementById('sorteo-detalle-content').innerHTML = '<p style="color: red; text-align: center;">Error al cargar el sorteo.</p>';
        return;
    }
    
    // Asignar variables globales para la compra
    currentPrecioPorBoleto = sorteo.precio_bs;
    document.getElementById('sorteo-title').textContent = sorteo.titulo;

    const totalBoletos = 10000;
    const boletosValidados = sorteo.boletos_vendidos[0] ? sorteo.boletos_vendidos[0].count : 0;
    const progreso = (boletosValidados / totalBoletos) * 100;
    const boletosRestantes = totalBoletos - boletosValidados;

    // Renderizar la información principal
    const detalleContent = document.getElementById('sorteo-detalle-content');
    detalleContent.innerHTML = `
        <div class="detail-img-container">
            <img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" class="detail-img">
        </div>
        <div class="detail-info">
            <p style="font-size: 14px; margin: 0 0 5px;">📅 ${new Date(sorteo.fecha_sorteo).toLocaleDateString()} ${new Date(sorteo.fecha_sorteo).toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})}</p>
            <h3>${sorteo.titulo}</h3>
            <p class="price-detail">Bs. ${currentPrecioPorBoleto.toFixed(2)} por boleto</p>
            
            <div style="background-color: #f0f8ff; border: 1px solid #cceeff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; white-space: pre-wrap;">${sorteo.descripcion_larga}</p>
            </div>
            
            <div class="progress-section">
                <div class="progress-text">
                    <p>Esta es tu oportunidad</p>
                    <p style="font-weight: bold;">${progreso.toFixed(2)}%</p>
                </div>
                <div class="progress-bar-container" style="height: 15px;">
                    <div class="progress-bar" style="width: ${Math.min(progreso, 100).toFixed(2)}%;"></div>
                </div>
                <p style="text-align: right; font-size: 12px; color: ${progreso >= 100 ? 'red' : 'gray'};">
                    Quedan ${progreso >= 100 ? '0' : boletosRestantes.toLocaleString()} boletos (${(100 - progreso).toFixed(2)}%)
                </p>
            </div>
        </div>
    `;

    // Renderizar Premios
    const premiosContainer = document.getElementById('premios-detalle-container');
    premiosContainer.innerHTML = '<h3>Detalles del sorteo</h3>';

    // Ordenar premios por lugar (1, 2, 3...)
    sorteo.premios.sort((a, b) => a.lugar - b.lugar).forEach(premio => {
        premiosContainer.innerHTML += `
            <div class="premio-card">
                <span class="premio-icon">🏅</span>
                <div>
                    <p style="margin: 0; font-weight: bold;">${premio.lugar}° GANADOR: ${premio.descripcion}</p>
                    <p class="premio-fecha">${new Date(sorteo.fecha_sorteo).toLocaleDateString()} ${new Date(sorteo.fecha_sorteo).toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
            </div>
        `;
    });
}

// --- 3. LÓGICA DEL CONTADOR DE BOLETOS Y CÁLCULO DE TOTALES ---

/**
 * Actualiza la interfaz del contador y el botón de compra.
 * @param {number} tickets - Nueva cantidad de boletos.
 */
function updateTicketsCount(tickets) {
    currentCantidadBoletos = Math.max(1, Math.min(10000, tickets)); // Asegura que esté entre 1 y 10000
    document.getElementById('tickets-input').value = currentCantidadBoletos;
    document.getElementById('tickets-count-display').textContent = currentCantidadBoletos;
}

/**
 * Inicializa los listeners del contador de boletos.
 */
function initTicketCounter() {
    const input = document.getElementById('tickets-input');
    const decrementBtn = document.getElementById('decrement-btn');
    const incrementBtn = document.getElementById('increment-btn');

    // Botones rápidos (+2, +5, etc.)
    document.querySelectorAll('.buy-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.dataset.tickets);
            updateTicketsCount(count);
        });
    });

    // Botones de incremento/decremento manual
    decrementBtn.addEventListener('click', () => updateTicketsCount(currentCantidadBoletos - 1));
    incrementBtn.addEventListener('click', () => updateTicketsCount(currentCantidadBoletos + 1));
    
    // Asegurar que el input manual refleje la cantidad
    input.addEventListener('change', (e) => updateTicketsCount(parseInt(e.target.value) || 1));
}


// --- 4. LÓGICA DEL FLUJO DE MODALES DE COMPRA ---

/**
 * Genera un código de referencia único de 6 dígitos (no criptográfico, solo visual).
 */
function generateReferenceCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Copia texto al portapapeles.
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('¡Copiado al portapapeles!');
    }).catch(err => {
        console.error('Error al copiar:', err);
        // Fallback para navegadores antiguos
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        alert('¡Copiado al portapapeles!');
    });
}

/**
 * Inicia el flujo de compra abriendo el Modal 1.
 */
document.getElementById('btn-comprar-boletos')?.addEventListener('click', () => {
    if (!currentSorteoId) return alert('Error: No se ha cargado el sorteo.');

    // 1. Calcular totales y actualizar Modal 1
    const totalPagar = currentCantidadBoletos * currentPrecioPorBoleto;
    document.getElementById('precio-por-boleto').textContent = `Bs. ${currentPrecioPorBoleto.toFixed(2)}`;
    document.getElementById('cantidad-boletos-summary').textContent = currentCantidadBoletos;
    document.getElementById('total-a-pagar').textContent = `Bs. ${totalPagar.toFixed(2)}`;

    // 2. Abrir Modal 1
    document.getElementById('modal-datos-contacto').classList.add('active');
});

// Listener para cerrar modales
document.querySelectorAll('.close-btn-pago').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay-pago').classList.remove('active');
    });
});

/**
 * Modal 1 -> Modal 2 (Datos de Contacto -> Datos de Pago)
 */
document.getElementById('form-datos-contacto')?.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Almacenar datos del cliente
    currentClientData = {
        nombre: document.getElementById('nombre-completo').value,
        email: document.getElementById('email-contacto').value,
        telefono: document.getElementById('telefono-contacto').value,
        estado: document.getElementById('estado-contacto').value,
        cedula: document.getElementById('cedula-prefijo').value + document.getElementById('cedula-numero').value,
    };
    
    // 2. Generar código de referencia único
    currentReferenceCode = generateReferenceCode();
    
    // 3. Actualizar Modal 2
    const totalPagar = currentCantidadBoletos * currentPrecioPorBoleto;
    document.getElementById('monto-final-pago').textContent = totalPagar.toFixed(2);
    document.getElementById('codigo-referencia').textContent = currentReferenceCode;
    
    // 4. Cerrar Modal 1 y abrir Modal 2
    document.getElementById('modal-datos-contacto').classList.remove('active');
    document.getElementById('modal-datos-pago').classList.add('active');
});

/**
 * Modal 2 -> Modal 3 (Datos de Pago -> Reporte de Pago)
 */
document.getElementById('abrir-reporte')?.addEventListener('click', () => {
    // 1. Actualizar Modal 3
    document.getElementById('codigo-referencia-display').textContent = currentReferenceCode;
    
    // 2. Cerrar Modal 2 y abrir Modal 3
    document.getElementById('modal-datos-pago').classList.remove('active');
    document.getElementById('modal-reporte-pago').classList.add('active');
});


// Lógica de Copiar al portapapeles en Modales
document.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.copyTarget;
        const textToCopy = document.getElementById(targetId).textContent.trim();
        copyToClipboard(textToCopy);
    });
});

// Muestra el nombre del archivo seleccionado
document.getElementById('capture-input')?.addEventListener('change', function() {
    const fileName = this.files.length > 0 ? this.files[0].name : 'Ningún archivo seleccionado.';
    document.getElementById('file-name-display').textContent = fileName;
});

// --- 5. LÓGICA FINAL: REPORTE DE PAGO Y SUBIDA A SUPABASE ---

document.getElementById('form-reporte-pago')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('capture-input');
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor, sube el capture del pago.');
        return;
    }
    
    const submitBtn = e.submitter;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';

    try {
        // --- A. Subir el archivo (Capture de Pago) a Supabase Storage ---
        // Usamos el ID del sorteo como carpeta y un timestamp para el nombre.
        const fileName = `${currentSorteoId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('captures') // Nombre del bucket que creaste
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Generar la URL pública del archivo
        const { data: publicUrlData } = supabase.storage
            .from('captures')
            .getPublicUrl(fileName);
            
        const urlCapture = publicUrlData.publicUrl;

        // --- B. Insertar la orden de compra (boleto) en la base de datos ---
        const boletoData = {
            sorteo_id: currentSorteoId,
            nombre_cliente: currentClientData.nombre,
            email_cliente: currentClientData.email,
            telefono_cliente: currentClientData.telefono,
            cedula_cliente: currentClientData.cedula,
            estado_cliente: currentClientData.estado,
            cantidad_boletos: currentCantidadBoletos,
            precio_total: currentCantidadBoletos * currentPrecioPorBoleto,
            metodo_pago: 'Pago Móvil', // Se puede mejorar
            referencia_pago: document.getElementById('referencia-pago').value,
            telefono_pago: document.getElementById('telefono-pago-movil').value,
            codigo_concepto: currentReferenceCode,
            url_capture: urlCapture,
            estado: 'pendiente' // El admin lo validará
        };

        const { error: insertError } = await supabase
            .from('boletos')
            .insert([boletoData]);

        if (insertError) throw insertError;

        // --- C. Éxito y Alerta Final ---
        // Mensaje que solicitaste para el usuario
        alert('¡Pago reportado con éxito! Recibirás tus tickets con los números asignados por WhatsApp y correo electrónico una vez que el administrador valide tu pago.');
        document.getElementById('modal-reporte-pago').classList.remove('active');
        window.location.href = 'index.html'; // Redirigir a la página principal

    } catch (error) {
        console.error('Error en el proceso de pago:', error);
        alert('Ocurrió un error al reportar el pago. Por favor, revisa la consola para más detalles y asegúrate de que el bucket "captures" es público.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reportar Pago';
    }
});


// --- EVENTOS DE INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en la página principal, cargamos los sorteos.
    if (document.getElementById('sorteos-container')) {
        loadSorteos();
    }
    
    // Si estamos en la página de detalle, cargamos el sorteo y el contador.
    if (document.getElementById('sorteo-detalle-content')) {
        loadSorteoDetail();
        initTicketCounter();
    }
    
    // Lógica para abrir el modal de consulta de tickets (funcionalidad no implementada)
    document.getElementById('open-tickets-modal')?.addEventListener('click', () => {
         document.getElementById('modal-consulta-tickets').classList.add('active');
    });
    document.getElementById('open-tickets-modal-detail')?.addEventListener('click', () => {
         document.getElementById('modal-consulta-tickets').classList.add('active');
    });
});
