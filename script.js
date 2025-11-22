// ==========================================================
// Archivo: script.js - VERSIÓN FINAL UNIFICADA
// ==========================================================

// ==========================================================
// FUNCIÓN DE CARGA DE SORTEOS (para la página principal)
// ==========================================================
async function cargarSorteos() {
    console.log("Intentando cargar sorteos desde Supabase...");
    
    // Asumimos que 'supabase' está definido en supabase-config.js y cargado
    if (typeof supabase === 'undefined') {
        console.error("Error: Supabase no está definido. Revise la carga de librerías.");
        return;
    }

    try {
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('estado', 'activo'); 
            
        if (error) {
            console.error("Error al cargar sorteos:", error);
            document.getElementById('sorteos-container').innerHTML = `<p style="color: red;">Error al cargar sorteos: ${error.message}</p>`;
            return;
        }

        console.log(`Sorteos cargados exitosamente: (${sorteos.length})`, sorteos);
        
        const container = document.getElementById('sorteos-container');
        container.innerHTML = ''; 

        if (sorteos.length === 0) {
            container.innerHTML = '<p>No hay sorteos activos disponibles por el momento.</p>';
        } else {
            // MOSTRAR los sorteos en el HTML
            sorteos.forEach(sorteo => {
                // Lógica de formateo de fecha (simplificada para el ejemplo)
                const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                // Lógica de imagen
                const imgHtml = sorteo.imagen_url ? 
                    `<div class="sorteo-img-container"><img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" class="sorteo-img"></div>` : '';


                const card = document.createElement('div');
                card.className = 'sorteo-card'; 

                // Usamos la estructura de tarjeta más completa para asegurar que los estilos CSS funcionen
                card.innerHTML = `
                    <div class="sorteo-img-container">
                        <img src="${sorteo.imagen_url || 'placeholder.png'}" alt="${sorteo.titulo}" class="sorteo-img">
                        </div>
                    <div class="sorteo-info">
                        <h3>${sorteo.titulo}</h3>
                        <p>📅 Fecha: ${fecha}</p>
                        <p class="price">Bs. ${sorteo.precio_bs}</p>
                        <button class="btn-participar" onclick="window.location.href='sorteo.html?id=${sorteo.id}'">
                            Participar ahora
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
            
            const mensajeExito = document.createElement('p');
            mensajeExito.innerHTML = `✅ Se encontraron ${sorteos.length} sorteo(s) activo(s).`;
            container.prepend(mensajeExito); 
        }
    } catch (err) {
        console.error("Error fatal en cargarSorteos:", err);
        document.getElementById('sorteos-container').innerHTML = '<p style="color: red;">Ocurrió un error inesperado al cargar los sorteos.</p>';
    }
}

// ==========================================================
// FUNCIÓN DE CONSULTA DE TICKETS (UNIFICADA PARA TELÉFONO/CÉDULA Y EMAIL)
// ==========================================================

/**
 * Busca boletos por Teléfono/Cédula O por Email.
 * @param {string} identificador - El valor a buscar (teléfono, cédula o email).
 * @param {string} tipoBusqueda - 'telefono_cedula' o 'email'.
 */
async function buscarBoletosCliente(identificador, tipoBusqueda) {
    const resultadosDiv = document.getElementById('resultados-consulta');
    resultadosDiv.innerHTML = '<p style="text-align:center;">Buscando...</p>';

    // Base de la consulta
    let query = supabase.from('boletos').select('id, sorteo_id, cantidad_boletos, numeros_asignados, estado, sorteos(titulo)').eq('estado', 'validado');
    
    try {
        if (tipoBusqueda === 'email') {
            // Búsqueda simple por EMAIL
            const emailLimpio = identificador.toLowerCase();
            query = query.eq('email_cliente', emailLimpio); // ASUME 'email_cliente' es el nombre de la columna

        } else if (tipoBusqueda === 'telefono_cedula') {
            // Lógica robusta para TELÉFONO/CÉDULA (similar a tu código original)
            const identificadorLimpio = identificador.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

            let posiblesBusquedas = [
                `telefono_cliente.eq.${identificadorLimpio}`,
                `cedula_cliente.eq.${identificadorLimpio}`
            ];

            const primerCaracter = identificadorLimpio.charAt(0);
            if (!['V', 'E', 'P', 'J', 'G'].includes(primerCaracter) && identificadorLimpio.length >= 5) {
                posiblesBusquedas.push(`cedula_cliente.eq.V${identificadorLimpio}`);
                posiblesBusquedas.push(`cedula_cliente.eq.E${identificadorLimpio}`);
            }

            const orClauses = posiblesBusquedas.join(',');
            query = query.or(orClauses);
        } else {
             resultadosDiv.innerHTML = '<p style="color: red; text-align: center;">Error: Tipo de búsqueda no definido.</p>';
             return;
        }

        const { data: ordenes, error } = await query;

        if (error) {
             console.error("Error de Supabase al consultar boletos:", error);
             resultadosDiv.innerHTML = '<p style="color: red; text-align: center; margin-top: 15px;">Error al conectar. Revisa la consola y las políticas RLS SELECT en "boletos".</p>';
             return;
        }

        if (ordenes.length === 0) {
            resultadosDiv.innerHTML = '<p style="color: red; text-align: center; margin-top: 15px;">No se encontraron boletos validados con ese identificador.</p>';
            return;
        }

        let html = '<h4>✅ Boletos Encontrados:</h4>';
        ordenes.forEach(orden => {
            const numeros = orden.numeros_asignados || 'Pendiente (Error de asignación)';
            const tituloSorteo = orden.sorteos ? orden.sorteos.titulo : 'Sorteo Desconocido';

            html += `
                <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 8px; border-radius: 5px; background: #fdfdfd;">
                    <p>🏆 Sorteo: <strong>${tituloSorteo}</strong></p>
                    <p>🎟 Cantidad: <strong>${orden.cantidad_boletos}</strong></p>
                    <p>🔢 Números: <span style="font-weight: bold; color: green; display: block; margin-top: 5px; word-wrap: break-word; font-size: 0.9em;">${numeros}</span></p>
                </div>
            `;
        });
        resultadosDiv.innerHTML = html;

    } catch (err) {
        console.error("Error general al consultar boletos:", err);
        resultadosDiv.innerHTML = '<p style="color: red; text-align: center;">Ocurrió un error inesperado al buscar.</p>';
    }
}

// ==========================================================
// INICIALIZACIÓN Y EVENT LISTENERS (CON LÓGICA DE PESTAÑAS)
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    cargarSorteos();
    
    const modalConsulta = document.getElementById('modal-consultar-tickets');
    const btnAbrirConsulta = document.getElementById('consultar-tickets-btn');
    const btnCerrarConsulta = document.getElementById('close-consultar-tickets');
    const btnCerrarConsultaVisible = document.getElementById('btn-cerrar-consulta-visible'); 
    const formConsulta = document.getElementById('form-consultar-tickets');
    const resultadosDiv = document.getElementById('resultados-consulta');
    
    // Elementos de las pestañas
    const tabTelefono = document.getElementById('tab-telefono');
    const tabEmail = document.getElementById('tab-email');
    const groupTelefono = document.getElementById('consulta-telefono-group');
    const groupEmail = document.getElementById('consulta-email-group');
    const inputTelefono = document.getElementById('telefono-consulta');
    const inputEmail = document.getElementById('email-consulta');


    // ----------------------------------------------------
    // FUNCIÓN DE CAMBIO DE PESTAÑA (Incluye manejo de 'required')
    // ----------------------------------------------------
    const switchTab = (activeTab, inactiveTab, activeGroup, inactiveGroup, activeInput, inactiveInput) => {
        // Estilo de botones
        activeTab.classList.add('active');
        inactiveTab.classList.remove('active');
        
        // Visibilidad de grupos
        activeGroup.style.display = 'block';
        inactiveGroup.style.display = 'none';
        
        // Manejo de 'required'
        if (activeInput) {
            activeInput.setAttribute('required', 'true');
            activeInput.focus(); // Enfoca el campo visible
        }
        if (inactiveInput) {
            inactiveInput.removeAttribute('required');
            inactiveInput.value = ''; // Limpia el campo oculto
        }

        // Limpiar resultados al cambiar de pestaña
        if(resultadosDiv) resultadosDiv.innerHTML = '';
    };

    // ----------------------------------------------------
    // Event Listeners de las pestañas
    // ----------------------------------------------------
    tabTelefono?.addEventListener('click', () => {
        switchTab(tabTelefono, tabEmail, groupTelefono, groupEmail, inputTelefono, inputEmail);
    });

    tabEmail?.addEventListener('click', () => {
        switchTab(tabEmail, tabTelefono, groupEmail, groupTelefono, inputEmail, inputTelefono);
    });

    // ----------------------------------------------------
    // Lógica de Abrir/Cerrar Modal (Actualizada para usar 'flex' y limpiar)
    // ----------------------------------------------------
    const cerrarModal = () => {
        if(modalConsulta) modalConsulta.classList.remove('active');
    }
    const abrirModal = () => {
        if(modalConsulta) {
            modalConsulta.classList.add('active');
            if(resultadosDiv) resultadosDiv.innerHTML = ''; 
            // Reinicia la pestaña por defecto si quieres, o deja la última seleccionada
            // switchTab(tabTelefono, tabEmail, groupTelefono, groupEmail, inputTelefono, inputEmail); 
        }
    }

    btnAbrirConsulta?.addEventListener('click', abrirModal);
    btnCerrarConsulta?.addEventListener('click', cerrarModal);
    btnCerrarConsultaVisible?.addEventListener('click', cerrarModal);

    // Cierre al hacer click fuera del modal
    modalConsulta?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-consultar-tickets') {
            cerrarModal();
        }
    });

    // ----------------------------------------------------
    // Configurar Formulario de Búsqueda (Conecta las pestañas a la función)
    // ----------------------------------------------------
    formConsulta?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let identificador = '';
        let tipoBusqueda = '';

        // Determinar qué campo está activo y obtener el valor
        if (inputTelefono.hasAttribute('required')) {
            identificador = inputTelefono.value.trim();
            tipoBusqueda = 'telefono_cedula';
        } else if (inputEmail.hasAttribute('required')) {
            identificador = inputEmail.value.trim();
            tipoBusqueda = 'email';
        }

        if (identificador) {
            await buscarBoletosCliente(identificador, tipoBusqueda);
        } else {
             resultadosDiv.innerHTML = '<p style="color: var(--primary-color); text-align: center;">Introduce el valor de búsqueda.</p>';
        }
    });

});
