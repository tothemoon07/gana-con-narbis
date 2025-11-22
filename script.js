// ==========================================================
// Archivo: script.js - CÓDIGO CORREGIDO PARA INDEX.HTML
// ==========================================================

const sorteosContainer = document.getElementById('sorteos-container');
const toastNotification = document.getElementById('toastNotification');

// ===========================================
// Funciones de Utilidad
// ===========================================

/**
 * Muestra una notificación temporal tipo "Toast" en la parte inferior.
 */
function showToast(message, type = 'success') {
    if (toastNotification) {
        toastNotification.textContent = message;
        toastNotification.className = `toast show ${type}`;
        setTimeout(() => {
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
        console.error("Contenedor 'sorteos-container' no encontrado.");
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
        // CORRECCIÓN PREVIA: Usamos 'estado' en lugar de 'activo'
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('estado', 'activo') // Filtra solo los sorteos activos
            .order('fecha_sorteo', { ascending: true }); 

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

        let htmlContent = '';
        
        sorteos.forEach(sorteo => {
            // --- USANDO NOMBRES DE COLUMNAS DE TU BD ---
            const precio = sorteo.precio_bs || 0; 
            const totalBoletos = sorteo.total_boletos || 1;
            const boletosVendidos = sorteo.boletos_vendidos || 0; 

            // --- Lógica para el BADGE (Etiqueta de tipo) ---
            let badgeHTML = '';
            let claseCard = '';
            
            // Usamos la columna 'estado' para definir el badge/clase si es necesario
            if (sorteo.estado && sorteo.estado.toLowerCase() === 'premium') {
                badgeHTML = `<span class="raffle-badge premium">PREMIUM</span>`;
                claseCard = 'premium-card';
            } else if (sorteo.estado && sorteo.estado.toLowerCase() === 'express') {
                badgeHTML = `<span class="raffle-badge express">EXPRESS</span>`;
                claseCard = 'express-card';
            } else {
                let badgeData = "ACTIVO";
                if ((boletosVendidos / totalBoletos) * 100 > 80) {
                     badgeData = "¡QUEDAN POCOS!";
                     claseCard += ' last-tickets-card';
                }
                badgeHTML = `<span class="raffle-badge normal">${badgeData}</span>`;
            }
            
            // --- Formato de Fecha y Moneda ---
            const fechaSorteo = new Date(sorteo.fecha_sorteo);
            const opcionesFecha = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const fechaFormateada = fechaSorteo.toLocaleDateString('es-ES', opcionesFecha);
            
            const precioFormateado = precio.toFixed(2);

            // --- Cálculo del Progreso ---
            const progreso = (boletosVendidos / totalBoletos) * 100;
            const ticketsRestantes = totalBoletos - boletosVendidos;

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
                            <span class="tickets-left-text">${ticketsRestantes} boletos restantes</span>
                        </div>

                        <div class="raffle-info-grid">
                            <div class="info-item price-item">
                                <i class="fas fa-ticket-alt"></i>
                                <span class="info-label">Precio Ticket</span>
                                <span class="info-value price-value">${precioFormateado} BS</span>
                            </div>
                            <div class="info-item date-item">
                                <i class="fas fa-clock"></i>
                                <span class="info-label">Fecha Sorteo</span>
                                <span class="info-value date-value">${fechaFormateada}</span>
                            </div>
                        </div>
                        
                        <button class="btn-main-card" onclick="event.stopPropagation(); verDetalle('${sorteo.id}')">
                            ¡COMPRAR BOLETO AHORA!
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

// ===========================================
// Funciones de Navegación (CORREGIDAS)
// ===========================================

/**
 * Redirige a la página de detalle con el ID del sorteo en la URL.
 */
function verDetalle(id) {
    // CORRECCIÓN CLAVE: Redirige a sorteo.html con el ID
    window.location.href = `sorteo.html?id=${id}`;
}

/**
 * Llama a la función global de apertura del modal de consulta definida en sorteo_script.js.
 */
function abrirModalConsulta() {
    // Si la función de consulta está globalmente disponible, la llamamos.
    if (window.abrirModalConsultaTicketsGlobal) {
        window.abrirModalConsultaTicketsGlobal();
    } else {
        alert("La función de consulta de tickets no está lista. Navega a un sorteo para usarla.");
    }
}
