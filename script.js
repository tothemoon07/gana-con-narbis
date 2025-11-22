// ==========================================================
// Archivo: script.js (EXCLUSIVO PARA INDEX.HTML)
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar las tarjetas de sorteos
    cargarSorteos();

    // 2. Configurar el Modal de Consulta (Búsqueda)
    configurarModalConsulta();
});

// ==========================================================
// FUNCIÓN: CARGAR SORTEOS (CON BARRA DE PROGRESO)
// ==========================================================
async function cargarSorteos() {
    const container = document.getElementById('sorteos-container');
    if (!container) {
        console.error("No se encontró el contenedor 'sorteos-container' en el HTML.");
        return;
    }

    container.innerHTML = '<div class="loading" style="text-align:center; width:100%;"></div><p style="text-align: center;">Cargando sorteos...</p>';

    if (typeof supabase === 'undefined') {
        container.innerHTML = '<p style="color: red; text-align: center;">Error: Supabase no está conectado.</p>';
        return;
    }

    try {
        // Obtener sorteos activos
        const { data: sorteos, error } = await supabase
            .from('sorteos')
            .select('*')
            .eq('estado', 'activo') // Asegúrate que en tu BD la columna sea 'estado' o 'activo'
            .order('fecha_sorteo', { ascending: true });

        if (error) throw error;

        if (!sorteos || sorteos.length === 0) {
            container.innerHTML = '<p style="text-align: center; width: 100%;">No hay sorteos activos disponibles.</p>';
            return;
        }

        container.innerHTML = ''; // Limpiar loading

        // Mensaje de éxito
        const mensajeExito = document.createElement('p');
        mensajeExito.innerHTML = `✅ Se encontraron ${sorteos.length} sorteo(s) activo(s).`;
        container.parentElement.insertBefore(mensajeExito, container);

        // Renderizar cada tarjeta
        for (const sorteo of sorteos) {
            const sorteoId = sorteo.id;

            // Consultar ventas para calcular progreso
            const { data: ventas } = await supabase
                .from('boletos')
                .select('cantidad_boletos')
                .eq('sorteo_id', sorteoId)
                .neq('estado', 'rechazado');

            const boletosVendidos = ventas ? ventas.reduce((sum, o) => sum + o.cantidad_boletos, 0) : 0;
            const totalTickets = sorteo.total_boletos || 10000;
            
            let porcentaje = (boletosVendidos / totalTickets) * 100;
            if (porcentaje > 100) porcentaje = 100;
            
            const boletosRestantes = Math.max(0, totalTickets - boletosVendidos);
            const porcentajeDisplay = porcentaje.toFixed(2);
            
            const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
                day: 'numeric', month: 'long', year: 'numeric' 
            });

            // Definir HTML de la barra según estado
            let progresoHTML = '';
            let btnTexto = 'Participar ahora';
            let tagHTML = '';
            let imgStyle = '';
            let btnClass = 'btn-ver-detalle';

            if (porcentaje >= 100) {
                tagHTML = '<div class="tag-vendido">VENDIDO</div>';
                imgStyle = 'filter: grayscale(100%);';
                btnTexto = 'Rifa Vendida';
                btnClass += ' btn-vendido';
                progresoHTML = `
                    <p class="progress-text" style="color: var(--primary-color);">Vendido 100%</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 100%; background: var(--primary-color);"></div>
                    </div>
                `;
            } else {
                if (sorteo.es_popular) tagHTML = '<div class="tag-popular">¡Más Popular!</div>';
                progresoHTML = `
                    <p class="progress-text">Progreso ${porcentajeDisplay}%</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${porcentaje}%;"></div>
                    </div>
                    <div class="boletos-restantes-tag">Solo quedan ${boletosRestantes} boletos</div>
                `;
            }

            // Crear Tarjeta
            const card = document.createElement('div');
            card.className = 'sorteo-card';
            card.innerHTML = `
                ${tagHTML}
                <div class="sorteo-img-container">
                    <img src="${sorteo.imagen_url || 'placeholder.png'}" class="sorteo-img" style="${imgStyle}" alt="${sorteo.titulo}">
                </div>
                <div class="sorteo-info">
                    <p class="fecha-card">📅 ${fecha}</p>
                    <h3 class="titulo-card">${sorteo.titulo}</h3>
                    
                    <div class="progress-wrapper">
                        ${progresoHTML}
                    </div>

                    <p class="precio-card">Bs. ${sorteo.precio_bs.toFixed(2)}</p>
                    
                    <a href="sorteo.html?id=${sorteoId}" class="${btnClass}">
                        ${btnTexto}
                    </a>
                </div>
            `;
            container.appendChild(card);
        }

    } catch (err) {
        console.error("Error:", err);
        container.innerHTML = '<p style="color: red; text-align: center;">Error al cargar los sorteos.</p>';
    }
}

// ==========================================================
// FUNCIÓN: BÚSQUEDA DE TICKETS
// ==========================================================
async function buscarBoletosCliente(identificador, tipoBusqueda) {
    const resultadosDiv = document.getElementById('resultados-consulta');
    resultadosDiv.innerHTML = '<p style="text-align:center;">Buscando...</p>';

    let query = supabase.from('boletos')
        .select('cantidad_boletos, numeros_asignados, sorteos(titulo)')
        .eq('estado', 'validado');

    if (tipoBusqueda === 'email') {
        query = query.eq('email_cliente', identificador.toLowerCase());
    } else {
        const idLimpio = identificador.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        // Búsqueda flexible para cédula/teléfono
        query = query.or(`telefono_cliente.eq.${idLimpio},cedula_cliente.eq.${idLimpio},cedula_cliente.eq.V${idLimpio},cedula_cliente.eq.E${idLimpio}`);
    }

    const { data: ordenes, error } = await query;

    if (error || !ordenes || ordenes.length === 0) {
        resultadosDiv.innerHTML = '<p style="color: var(--primary-color); text-align: center; margin-top: 10px;">No se encontraron boletos validados.</p>';
        return;
    }

    let html = '<h4 style="margin-top:15px;">✅ Boletos Encontrados:</h4>';
    ordenes.forEach(orden => {
        const titulo = orden.sorteos?.titulo || 'Sorteo';
        html += `
            <div style="border:1px solid #ddd; padding:10px; margin-bottom:8px; border-radius:5px; background:#f9f9f9;">
                <p><strong>${titulo}</strong></p>
                <p>Boletos: <strong>${orden.cantidad_boletos}</strong></p>
                <p style="font-size:0.9em; color:green; word-break:break-all;"># ${orden.numeros_asignados}</p>
            </div>`;
    });
    resultadosDiv.innerHTML = html;
}

// ==========================================================
// CONFIGURACIÓN DEL MODAL Y EVENTOS
// ==========================================================
function configurarModalConsulta() {
    const modal = document.getElementById('modal-consultar-tickets');
    const btnAbrir = document.getElementById('consultar-tickets-btn');
    const btnCerrarX = document.getElementById('close-consultar-tickets');
    const btnCerrarBtn = document.getElementById('btn-cerrar-consulta-visible');
    
    // Pestañas
    const tabTel = document.getElementById('tab-telefono');
    const tabEmail = document.getElementById('tab-email');
    const groupTel = document.getElementById('consulta-telefono-group');
    const groupEmail = document.getElementById('consulta-email-group');
    const inputTel = document.getElementById('telefono-consulta');
    const inputEmail = document.getElementById('email-consulta');

    // Abrir
    btnAbrir?.addEventListener('click', () => {
        modal.classList.add('active'); // Usamos la clase .active del CSS
    });

    // Cerrar
    const cerrar = () => modal.classList.remove('active');
    btnCerrarX?.addEventListener('click', cerrar);
    btnCerrarBtn?.addEventListener('click', cerrar);

    // Cambio de Pestaña
    const activarPestana = (esTelefono) => {
        if (esTelefono) {
            tabTel.classList.add('active');
            tabEmail.classList.remove('active');
            groupTel.style.display = 'block';
            groupEmail.style.display = 'none';
            inputTel.setAttribute('required', 'true');
            inputEmail.removeAttribute('required');
        } else {
            tabEmail.classList.add('active');
            tabTel.classList.remove('active');
            groupEmail.style.display = 'block';
            groupTel.style.display = 'none';
            inputEmail.setAttribute('required', 'true');
            inputTel.removeAttribute('required');
        }
    };

    tabTel?.addEventListener('click', () => activarPestana(true));
    tabEmail?.addEventListener('click', () => activarPestana(false));

    // Submit Formulario
    document.getElementById('form-consultar-tickets')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (groupTel.style.display !== 'none') {
            buscarBoletosCliente(inputTel.value.trim(), 'telefono');
        } else {
            buscarBoletosCliente(inputEmail.value.trim(), 'email');
        }
    });
}
