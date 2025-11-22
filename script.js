// ==========================================================
// Archivo: script.js - CÓDIGO UNIFICADO Y FUNCIONAL
// ==========================================================

const sorteosContainer = document.getElementById('sorteos-container');
const modalConsulta = document.getElementById('checkTicketsModal');
const resultadosDiv = document.getElementById('searchResults');

document.addEventListener('DOMContentLoaded', () => {
    cargarSorteos();
});

// ===========================================
// 1. LÓGICA DE CARGA DE SORTEOS (VISUAL IDENTICA)
// ===========================================
async function cargarSorteos() {
    if (!sorteosContainer) return;

    sorteosContainer.innerHTML = '<div class="loading"></div><p style="text-align:center; width:100%;">Cargando sorteos...</p>';

    try {
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('estado', 'activo')
            .order('fecha_sorteo', { ascending: true });

        if (error) throw error;

        if (!sorteos || sorteos.length === 0) {
            sorteosContainer.innerHTML = '<p style="text-align:center;">No hay sorteos activos.</p>';
            return;
        }

        let htmlContent = '';

        for (const sorteo of sorteos) {
            // Consultar ventas para la barra de progreso
            const { data: ventas } = await supabase
                .from('boletos')
                .select('cantidad_boletos')
                .eq('sorteo_id', sorteo.id)
                .neq('estado', 'rechazado');

            const boletosVendidos = ventas ? ventas.reduce((sum, o) => sum + o.cantidad_boletos, 0) : 0;
            const totalBoletos = sorteo.total_boletos || 100;
            const progreso = (boletosVendidos / totalBoletos) * 100;
            const ticketsRestantes = totalBoletos - boletosVendidos;
            
            const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
            const precio = sorteo.precio_bs.toFixed(2);

            // Definir etiquetas y estado
            let badgeHTML = `<span class="raffle-badge normal">ACTIVO</span>`;
            let claseCard = '';
            let textoBoton = '¡COMPRAR BOLETO AHORA!';
            let botonDisabled = '';

            if (progreso >= 100) {
                badgeHTML = `<span class="raffle-badge" style="background:red;">VENDIDO</span>`;
                claseCard = 'sold-out';
                textoBoton = 'AGOTADO';
                botonDisabled = 'disabled style="background:#ccc; cursor:not-allowed;"';
            } else if (progreso > 80) {
                badgeHTML = `<span class="raffle-badge" style="background:#ff9800;">¡QUEDAN POCOS!</span>`;
            } else if (sorteo.es_popular) {
                badgeHTML = `<span class="raffle-badge" style="background:#00bcd4;">POPULAR</span>`;
            }

            // HTML EXACTO DE LA TARJETA REFERENCIA
            htmlContent += `
                <div class="raffle-card-main ${claseCard}" onclick="verDetalle('${sorteo.id}')">
                    <div class="raffle-image-container">
                        <img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" class="raffle-image" style="${progreso >= 100 ? 'filter:grayscale(100%)' : ''}">
                        ${badgeHTML}
                        <div class="raffle-card-overlay">
                            <div class="overlay-button">Ver Detalles</div>
                        </div>
                    </div>
                    
                    <div class="raffle-details-inner">
                        <h3 class="raffle-title-card">${sorteo.titulo}</h3>
                        
                        <div class="raffle-status-bar">
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${Math.min(progreso, 100)}%;"></div>
                                </div>
                                <span class="progress-text">${Math.round(progreso)}% Vendido</span>
                            </div>
                            <span class="tickets-left-text">${Math.max(0, ticketsRestantes)} boletos restantes</span>
                        </div>

                        <div class="raffle-info-grid">
                            <div class="info-item price-item">
                                <i class="fas fa-ticket-alt"></i>
                                <span class="info-label">Precio Ticket</span>
                                <span class="info-value price-value">${precio} BS</span>
                            </div>
                            <div class="info-item date-item">
                                <i class="fas fa-clock"></i>
                                <span class="info-label">Fecha Sorteo</span>
                                <span class="info-value date-value">${fecha}</span>
                            </div>
                        </div>
                        
                        <button class="btn-main-card" ${botonDisabled}>
                            ${textoBoton}
                        </button>
                    </div>
                </div>
            `;
        }

        sorteosContainer.innerHTML = htmlContent;

    } catch (error) {
        console.error(error);
        sorteosContainer.innerHTML = '<p style="color:red; text-align:center;">Error cargando sorteos.</p>';
    }
}

function verDetalle(id) {
    window.location.href = `sorteo.html?id=${id}`;
}

// ===========================================
// 2. LÓGICA DEL MODAL DE CONSULTA (FUNCIONA REALMENTE)
// ===========================================

// Abrir Modal (Llamado desde el botón del Header)
window.abrirModalConsulta = function() {
    if (modalConsulta) {
        modalConsulta.style.display = 'flex'; // O usa classList.add('show') si el CSS lo requiere
        modalConsulta.classList.add('active');
        modalConsulta.classList.add('show');
    } else {
        console.error("No se encontró el modal con ID 'checkTicketsModal'");
    }
}

// Cerrar Modal
window.cerrarModalConsulta = function() {
    if (modalConsulta) {
        modalConsulta.style.display = 'none';
        modalConsulta.classList.remove('active');
        modalConsulta.classList.remove('show');
        if(resultadosDiv) resultadosDiv.innerHTML = '';
    }
}

// Cambiar Pestañas (Email vs Teléfono)
window.cambiarPestanaBusqueda = function(tipo) {
    const tabEmail = document.getElementById('tab-email');
    const tabPhone = document.getElementById('tab-phone');
    const inputEmail = document.getElementById('input-group-email');
    const inputPhone = document.getElementById('input-group-phone');

    if (tipo === 'email') {
        tabEmail.classList.add('active');
        tabPhone.classList.remove('active');
        inputEmail.style.display = 'block';
        inputPhone.style.display = 'none';
    } else {
        tabPhone.classList.add('active');
        tabEmail.classList.remove('active');
        inputPhone.style.display = 'block';
        inputEmail.style.display = 'none';
    }
}

// Ejecutar Búsqueda en Supabase
window.ejecutarBusquedaTickets = async function() {
    const isEmail = document.getElementById('tab-email').classList.contains('active');
    const valor = isEmail 
        ? document.getElementById('searchEmail').value.trim() 
        : document.getElementById('searchPhone').value.trim();

    if (!valor) {
        alert("Por favor ingresa un dato para buscar.");
        return;
    }

    resultadosDiv.innerHTML = '<div class="loading"></div> Buscando...';

    let query = supabase.from('boletos')
        .select('cantidad_boletos, numeros_asignados, estado, sorteos(titulo)')
        .eq('estado', 'validado'); // Solo mostrar tickets validados/pagados

    if (isEmail) {
        query = query.eq('email_cliente', valor.toLowerCase());
    } else {
        // Limpiar teléfono/cédula
        const valorLimpio = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        // Buscar en teléfono O cédula (V/E/J)
        query = query.or(`telefono_cliente.eq.${valorLimpio},cedula_cliente.eq.${valorLimpio},cedula_cliente.eq.V${valorLimpio},cedula_cliente.eq.E${valorLimpio}`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        resultadosDiv.innerHTML = `
            <div class="no-results">
                <i class="fas fa-ticket-alt" style="font-size: 30px; color: #ccc; margin-bottom:10px;"></i>
                <p>No se encontraron tickets validados con esa información.</p>
            </div>`;
        return;
    }

    let html = '<h4 style="margin: 15px 0 10px;">✅ Tus Tickets Encontrados:</h4>';
    data.forEach(ticket => {
        const nombreSorteo = ticket.sorteos ? ticket.sorteos.titulo : 'Sorteo';
        html += `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <h5 style="margin:0 0 5px; color:var(--primary);">${nombreSorteo}</h5>
                <p style="margin:0; font-size: 0.9em;">Cantidad: <strong>${ticket.cantidad_boletos}</strong></p>
                <p style="margin:5px 0 0; font-family:monospace; color:green;"># ${ticket.numeros_asignados}</p>
            </div>
        `;
    });

    resultadosDiv.innerHTML = html;
}
