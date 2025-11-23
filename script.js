// ==========================================================
// Archivo: script.js - CAPI RIFAS (CON CONFETI)
// ==========================================================

const sorteosContainer = document.getElementById('sorteos-container');
const modalConsulta = document.getElementById('checkTicketsModal');
const resultadosDiv = document.getElementById('searchResults');

// Variable temporal
let idSorteoPendiente = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarSorteos();
});

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
            const { data: ventas } = await supabase
                .from('boletos')
                .select('cantidad_boletos')
                .eq('sorteo_id', sorteo.id)
                .in('estado', ['reportado', 'validado']); 

            const boletosOcupados = ventas ? ventas.reduce((sum, o) => sum + o.cantidad_boletos, 0) : 0;
            const totalBoletos = sorteo.total_boletos || 100;
            
            let progreso = (boletosOcupados / totalBoletos) * 100;
            let progresoVisual = Math.min(progreso, 100);
            const ticketsRestantes = Math.max(0, totalBoletos - boletosOcupados);
            const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
            const precio = sorteo.precio_bs.toFixed(2);

            let badgeHTML = '';
            let claseCard = '';
            let textoBoton = '¡COMPRAR BOLETO AHORA!';
            let botonDisabled = '';
            let estiloImagen = '';
            let clickAction = `onclick="event.stopPropagation(); verDetalle('${sorteo.id}')"`;

            if (boletosOcupados >= totalBoletos) {
                badgeHTML = `<span class="raffle-badge" style="background:red;">VENDIDO</span>`;
                claseCard = 'sold-out';
                textoBoton = 'AGOTADO';
                botonDisabled = 'disabled';
                estiloImagen = 'filter: grayscale(100%);';
                clickAction = ''; 
            } else if (progreso > 80) {
                badgeHTML = `<span class="raffle-badge" style="background:#ff9800;">¡QUEDAN POCOS!</span>`;
            } else {
                badgeHTML = `<span class="raffle-badge" style="background:#00bcd4;">🔥 POPULAR</span>`;
            }

            htmlContent += `
                <div class="raffle-card-main ${claseCard}" onclick="verDetalle('${sorteo.id}')">
                    <div class="raffle-image-container">
                        <img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" class="raffle-image" style="${estiloImagen}">
                        ${badgeHTML}
                        <div class="raffle-card-overlay"></div>
                    </div>
                    
                    <div class="raffle-details-inner">
                        <h3 class="raffle-title-card">${sorteo.titulo}</h3>
                        
                        <div class="raffle-status-bar">
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progresoVisual}%;"></div>
                                </div>
                                <span class="progress-text">${progresoVisual.toFixed(2)}% Vendido</span>
                            </div>
                            <span class="tickets-left-text">${ticketsRestantes} boletos restantes</span>
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
                        
                        <button class="buy-button" ${clickAction} ${botonDisabled} style="margin-top: 15px; font-size: 14px; padding: 15px;">
                            ${textoBoton} <i class="fas fa-arrow-right" style="font-size: 14px;"></i>
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

// LÓGICA DE TÉRMINOS
function verDetalle(id) {
    idSorteoPendiente = id;
    const modal = document.getElementById('modalTerminos');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    } else {
        window.location.href = `sorteo.html?id=${id}`;
    }
}

function aceptarTerminos() {
    if (idSorteoPendiente) {
        window.location.href = `sorteo.html?id=${idSorteoPendiente}`;
    }
}

function cerrarTerminos() {
    const modal = document.getElementById('modalTerminos');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    idSorteoPendiente = null;
}

// ===========================================
// LÓGICA DEL MODAL DE CONSULTA DE TICKETS
// ===========================================

window.abrirModalConsulta = function() {
    if (modalConsulta) {
        modalConsulta.style.display = 'flex';
        setTimeout(() => modalConsulta.classList.add('active'), 10);
    }
}

window.cerrarModalConsulta = function() {
    if (modalConsulta) {
        modalConsulta.classList.remove('active');
        setTimeout(() => {
            modalConsulta.style.display = 'none';
            if(resultadosDiv) resultadosDiv.innerHTML = '';
        }, 300);
    }
}

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

// =======================================================
// BUSQUEDA DE TICKETS CON DETECCIÓN DE GANADORES + CONFETI
// =======================================================
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

    // 1. Buscamos tickets del usuario y TRAEMOS tambien los tickets_premio del sorteo
    let query = supabase.from('boletos')
        .select('cantidad_boletos, numeros_asignados, estado, sorteos(titulo, tickets_premio)')
        .eq('estado', 'validado');

    if (isEmail) {
        query = query.eq('email_cliente', valor.toLowerCase());
    } else {
        const valorLimpio = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        query = query.or(`telefono_cliente.eq.${valorLimpio},cedula_cliente.eq.${valorLimpio},cedula_cliente.eq.V${valorLimpio},cedula_cliente.eq.E${valorLimpio}`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        resultadosDiv.innerHTML = `
            <div class="no-results" style="text-align:center; padding:20px;">
                <i class="fas fa-ticket-alt" style="font-size: 30px; color: #ccc; margin-bottom:10px;"></i>
                <p>No se encontraron tickets validados con esa información.</p>
            </div>`;
        return;
    }

    let html = '<h4 style="margin: 15px 0 10px;">✅ Tus Tickets Encontrados:</h4>';
    let hayGanador = false;

    data.forEach(ticket => {
        const nombreSorteo = ticket.sorteos ? ticket.sorteos.titulo : 'Sorteo';
        
        // Verificar si ganó
        let esGanador = false;
        let ticketsGanadoresSorteo = []; // Lista de premios de este sorteo

        if (ticket.sorteos && ticket.sorteos.tickets_premio) {
            ticketsGanadoresSorteo = ticket.sorteos.tickets_premio.split(',').map(s => s.trim());
        }

        // Mis números
        const misNumerosArr = ticket.numeros_asignados.split(',').map(s => s.trim());
        
        // Comprobar intersección
        const numerosPremiadosMios = misNumerosArr.filter(num => ticketsGanadoresSorteo.includes(num));

        if (numerosPremiadosMios.length > 0) {
            esGanador = true;
            hayGanador = true;
        }

        // Estilos condicionales
        const claseGanadora = esGanador ? 'winner-card' : '';
        const badgeGanador = esGanador ? `<div class="winner-badge">🎉 ¡TICKET PREMIADO! 🎉</div>` : '';
        const textoNumeros = esGanador 
            ? `<span style="color:#d32f2f; font-weight:900; font-size:1.1em;">${ticket.numeros_asignados}</span>` 
            : `<span style="color:green;">${ticket.numeros_asignados}</span>`;

        html += `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 10px;" class="${claseGanadora}">
                ${badgeGanador}
                <h5 style="margin:0 0 5px; color:var(--primary);">${nombreSorteo}</h5>
                <p style="margin:0; font-size: 0.9em;">Cantidad: <strong>${ticket.cantidad_boletos}</strong></p>
                <p style="margin:5px 0 0; font-family:monospace; word-break: break-all;"># ${textoNumeros}</p>
                ${esGanador ? '<p style="color:#b8860b; font-size:0.85em; margin-top:5px;"><strong>¡Felicidades!</strong> Ponte en contacto con nosotros.</p>' : ''}
            </div>
        `;
    });

    resultadosDiv.innerHTML = html;

    // EFECTO CONFETI SI GANÓ
    if (hayGanador) {
        lanzarConfeti();
    }
}

function lanzarConfeti() {
    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function() {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      var particleCount = 50 * (timeLeft / duration);
      // Confeti desde dos lados
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}
