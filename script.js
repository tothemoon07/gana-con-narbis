// script.js
// IMPORTANTE: Este archivo asume que la variable 'supabase' está definida en tu 'supabase-config.js'

const sorteosContainer = document.getElementById('sorteos-container');
const toastNotification = document.getElementById('toastNotification');

// ===========================================
// Funciones de Utilidad
// ===========================================

/**
 * Muestra una notificación temporal tipo "Toast" en la parte inferior.
 * @param {string} message El mensaje a mostrar.
 * @param {string} type El tipo de notificación ('success', 'error', 'info').
 */
function showToast(message, type = 'success') {
    if (toastNotification) {
        toastNotification.textContent = message;
        toastNotification.className = `toast show ${type}`;
        setTimeout(() => {
            // Ocultar la notificación después de 3 segundos
            toastNotification.className = toastNotification.className.replace("show", "");
        }, 3000);
    }
}

// ===========================================
// Lógica Principal de Carga de Sorteos
// ===========================================

/**
 * Carga los sorteos desde Supabase y los renderiza en la cuadrícula.
 */
async function cargarSorteos() {
    if (!sorteosContainer) {
        console.error("Contenedor 'sorteos-container' no encontrado. Asegúrate de que el ID es correcto en index.html");
        return;
    }

    // 1. Mostrar el estado de carga inicial
    sorteosContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Cargando sorteos...</p>
        </div>
    `;

    try {
        // 2. Consulta a Supabase
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('activo', true) // Filtra solo los sorteos marcados como activos
            .order('fecha_sorteo', { ascending: true }); // Ordena por fecha más cercana

        if (error) {
            console.error('Error al cargar sorteos:', error.message);
            sorteosContainer.innerHTML = `
                <div class="error-state">
                    <p>⚠️ Error al cargar los sorteos: ${error.message}</p>
                </div>
            `;
            showToast('Error de conexión con la base de datos.', 'error');
            return;
        }

        // 3. Manejar caso sin sorteos
        if (sorteos.length === 0) {
            sorteosContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>¡Vaya! No hay sorteos activos.</h3>
                    <p>Vuelve pronto, estaremos actualizando nuestra lista de premios.</p>
                </div>
            `;
            return;
        }

        // 4. Generar el HTML de las tarjetas
        let htmlContent = '';
        
        sorteos.forEach(sorteo => {
            // --- Lógica para el BADGE (Etiqueta de tipo) y Clase de Tarjeta ---
            let badgeHTML = '';
            let claseCard = '';
            
            if (sorteo.tipo && sorteo.tipo.toLowerCase() === 'premium') {
                badgeHTML = `<span class="raffle-badge premium">PREMIUM</span>`;
                claseCard = 'premium-card';
            } else if (sorteo.tipo && sorteo.tipo.toLowerCase() === 'express') {
                badgeHTML = `<span class="raffle-badge express">EXPRESS</span>`;
                claseCard = 'express-card';
            } else {
                badgeHTML = `<span class="raffle-badge normal">ACTIVO</span>`;
                claseCard = 'normal-card';
            }
            
            // --- Formato de Fecha y Moneda ---
            const fechaSorteo = new Date(sorteo.fecha_sorteo);
            // Configuración para el formato de fecha (ej: "25 nov. 2025, 18:30")
            const opcionesFecha = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const fechaFormateada = fechaSorteo.toLocaleDateString('es-ES', opcionesFecha);
            
            // Usar toFixed(2) para asegurar dos decimales en el precio
            const precioFormateado = sorteo.precio_ticket ? sorteo.precio_ticket.toFixed(2) : '0.00';

            // --- Cálculo del Progreso ---
            const progreso = (sorteo.tickets_vendidos / sorteo.tickets_totales) * 100;
            const ticketsRestantes = sorteo.tickets_totales - sorteo.tickets_vendidos;

            const cardHtml = `
                <div class="raffle-card-main ${claseCard}" onclick="verDetalle('${sorteo.id}')">
                    <div class="raffle-image-container">
                        <img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" class="raffle-image">
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
                                    <div class="progress-fill" style="width: ${progreso}%;"></div>
                                </div>
                                <span class="progress-text">${Math.round(progreso)}% Vendido</span>
                            </div>
                            <span class="tickets-left-text">${ticketsRestantes} tickets restantes</span>
                        </div>

                        <div class="raffle-info-grid">
                            <div class="info-item price-item">
                                <i class="fas fa-ticket-alt"></i>
                                <span class="info-label">Precio Ticket</span>
                                <span class="info-value price-value">$${precioFormateado}</span>
                            </div>
                            <div class="info-item date-item">
                                <i class="fas fa-clock"></i>
                                <span class="info-label">Fecha Sorteo</span>
                                <span class="info-value date-value">${fechaFormateada}</span>
                            </div>
                        </div>
                        
                        <button class="btn-main-card" onclick="event.stopPropagation(); verDetalle('${sorteo.id}')">
                            ¡COMPRAR TICKET AHORA!
                        </button>
                    </div>
                </div>
            `;
            htmlContent += cardHtml;
        });

        // 5. Inyectar el HTML final y mostrar éxito
        sorteosContainer.innerHTML = htmlContent;
        showToast('Sorteos cargados exitosamente.');

    } catch (error) {
        console.error('Error fatal al ejecutar la carga de sorteos:', error);
        sorteosContainer.innerHTML = `
            <div class="error-state">
                <p>❌ Algo salió muy mal. Revisa la consola y la configuración de Supabase.</p>
            </div>
        `;
        showToast('Error interno. Intenta más tarde.', 'error');
    }
}

// Iniciar la carga de sorteos cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', cargarSorteos);
