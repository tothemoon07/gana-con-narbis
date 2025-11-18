
// admin_script.js

// --- ⚠️ CONFIGURACIÓN DE SUPABASE (CLAVE SERVICE_ROLE SECRETA) ---
const SUPABASE_URL = 'https://clmtkqygxrdtzgrtjrzx.supabase.co'; 
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXRrcXlneHJkdHpncnRqcnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQxMzE5MSwiZXhwIjoyMDc4OTg5MTkxfQ.IIUDveRbZ4g7wUvZ7iMe5S0ZKFiCstCtvjgL4g-phMQ'; 

// Inicialización de Supabase con la clave de service_role para bypassar RLS
const supabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

// Variables para el control de la interfaz
const sorteosList = document.getElementById('sorteos-list');
const boletosList = document.getElementById('boletos-pendientes-list');
const formSorteo = document.getElementById('form-sorteo');
const modalSorteo = document.getElementById('modal-sorteo');
const premiosContainer = document.getElementById('premios-container');
let premioCounter = 0; // Contador para la creación de campos dinámicos

// --- FUNCIONES DE INTERFAZ DE USUARIO ---

/**
 * Muestra la sección del admin seleccionada y activa el botón de navegación.
 * @param {string} sectionId - El ID de la sección a mostrar ('sorteos', 'pagos', 'boletos').
 */
function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.nav-btn[data-section="${sectionId}"]`).classList.add('active');
}

/**
 * Añade campos dinámicos para editar/crear un premio (lugar, descripción, etc.).
 * @param {Object} [premio] - Objeto de premio existente para precargar datos.
 */
function addPremioField(premio = {}) {
    premioCounter++;
    const lugar = premio.lugar || premioCounter;
    const desc = premio.descripcion || '';
    const montoBs = premio.monto_bs || '';
    const montoUsd = premio.monto_usd || '';

    const div = document.createElement('div');
    div.classList.add('premio-form-group');
    div.dataset.lugar = lugar;
    div.innerHTML = `
        <button type="button" class="remove-premio-btn" onclick="this.parentNode.remove()">×</button>
        <h4>Premio Lugar ${lugar}</h4>
        <input type="hidden" name="lugar" value="${lugar}">
        
        <label for="premio-desc-${lugar}">Descripción (Ej: 1,000$ TRANSFERENCIA INMEDIATA):</label>
        <textarea id="premio-desc-${lugar}" name="descripcion" required>${desc}</textarea>

        <label for="premio-monto-bs-${lugar}">Monto en Bs. (Opcional):</label>
        <input type="number" id="premio-monto-bs-${lugar}" name="monto_bs" step="0.01" value="${montoBs}">

        <label for="premio-monto-usd-${lugar}">Monto en USD (Opcional):</label>
        <input type="number" id="premio-monto-usd-${lugar}" name="monto_usd" step="0.01" value="${montoUsd}">
    `;
    premiosContainer.appendChild(div);
}

// --- LÓGICA DE GESTIÓN DE SORTEOS ---

/**
 * Carga y renderiza la lista de sorteos en el panel de admin.
 */
async function loadSorteos() {
    sorteosList.innerHTML = 'Cargando sorteos...';
    const { data: sorteos, error } = await supabase
        .from('sorteos')
        .select('*, premios(*)') // Carga también los premios relacionados
        .order('creado_en', { ascending: false });

    if (error) {
        console.error('Error cargando sorteos:', error);
        sorteosList.innerHTML = '<p style="color: red;">Error al cargar sorteos.</p>';
        return;
    }

    sorteosList.innerHTML = '<h3>Lista de Sorteos:</h3>';
    sorteos.forEach(sorteo => {
        const estadoColor = sorteo.estado === 'activo' ? 'green' : (sorteo.estado === 'vendido' ? 'orange' : 'red');
        const sorteoElement = document.createElement('div');
        sorteoElement.classList.add('sorteo-admin-card');
        sorteoElement.innerHTML = `
            <div class="sorteo-admin-info">
                <h4>${sorteo.titulo}</h4>
                <p>ID: ${sorteo.id.substring(0, 8)}... | Estado: <span style="color: ${estadoColor}; font-weight: bold;">${sorteo.estado.toUpperCase()}</span></p>
            </div>
            <div class="sorteo-admin-actions">
                <button class="btn-secondary" onclick="editSorteo('${sorteo.id}')">✏️ Editar</button>
                <button class="btn-danger" onclick="deleteSorteo('${sorteo.id}')">🗑️ Eliminar</button>
                <button class="btn-primary" onclick="initInventory('${sorteo.id}')">🔢 Crear Inventario (10K)</button>
            </div>
        `;
        sorteosList.appendChild(sorteoElement);
    });
}

/**
 * Inicializa los 10,000 boletos para un nuevo sorteo.
 * (Función temporal mientras se automatiza la inserción masiva).
 */
window.initInventory = async function(sorteoId) {
    if (!confirm('¿Estás seguro de que quieres inicializar 10,000 boletos (0 a 9999) para este sorteo? Esto puede tardar unos segundos.')) {
        return;
    }

    try {
        // Generar un array con 10,000 objetos de boleto
        const boletosData = [];
        for (let i = 0; i < 10000; i++) {
            boletosData.push({
                sorteo_id: sorteoId,
                numero_boleto: i,
                estado_inventario: 'disponible'
            });
        }

        // Insertar los datos en Supabase (usando la clave de service_role)
        const { error } = await supabase
            .from('inventario_boletos')
            .insert(boletosData, { 
                returning: 'minimal', // Optimizar el rendimiento
                count: 'exact'
            });

        if (error) throw error;
        
        alert(`¡Inventario creado con éxito para ${sorteoId}! 10,000 boletos listos.`);

    } catch (error) {
        console.error('Error creando inventario:', error);
        alert(`Error al crear el inventario. Es posible que ya exista o la clave 'service_role' no sea correcta.`);
    }
};

/**
 * Muestra el modal para editar o crear un sorteo.
 * @param {string} [sorteoId] - El ID del sorteo a editar. Si es nulo, crea uno nuevo.
 */
window.editSorteo = async function(sorteoId) {
    formSorteo.reset();
    document.getElementById('sorteo-id').value = '';
    premiosContainer.innerHTML = '<h4>Premios (1er lugar, 2do lugar, etc.)</h4>';
    premioCounter = 0; // Resetear el contador

    if (sorteoId) {
        const { data: sorteo, error } = await supabase
            .from('sorteos')
            .select('*, premios(*)')
            .eq('id', sorteoId)
            .single();

        if (error) {
            console.error('Error obteniendo sorteo:', error);
            alert('Error al cargar datos del sorteo.');
            return;
        }
        
        // Cargar datos del sorteo
        document.getElementById('sorteo-id').value = sorteo.id;
        document.getElementById('titulo').value = sorteo.titulo;
        document.getElementById('descripcion_corta').value = sorteo.descripcion_corta;
        document.getElementById('descripcion_larga').value = sorteo.descripcion_larga;
        document.getElementById('precio_bs').value = sorteo.precio_bs;
        // Formatear fecha para input datetime-local
        document.getElementById('fecha_sorteo').value = sorteo.fecha_sorteo ? sorteo.fecha_sorteo.substring(0, 16) : '';
        document.getElementById('imagen_url').value = sorteo.imagen_url || '';
        document.getElementById('estado_sorteo').value = sorteo.estado || 'activo';

        // Cargar premios
        sorteo.premios.sort((a, b) => a.lugar - b.lugar).forEach(premio => {
            addPremioField(premio);
        });
    }

    if (premioCounter === 0) {
        addPremioField(); // Asegurar al menos un campo de premio
    }

    modalSorteo.classList.add('active');
}

/**
 * Guarda (inserta o actualiza) el sorteo y sus premios.
 */
formSorteo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.submitter;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const sorteoId = document.getElementById('sorteo-id').value;

    const sorteoData = {
        titulo: document.getElementById('titulo').value,
        descripcion_corta: document.getElementById('descripcion_corta').value,
        descripcion_larga: document.getElementById('descripcion_larga').value,
        precio_bs: parseFloat(document.getElementById('precio_bs').value),
        fecha_sorteo: document.getElementById('fecha_sorteo').value,
        imagen_url: document.getElementById('imagen_url').value,
        estado: document.getElementById('estado_sorteo').value,
    };

    let response;
    if (sorteoId) {
        // ACTUALIZAR SORTEO
        response = await supabase.from('sorteos').update(sorteoData).eq('id', sorteoId);
    } else {
        // CREAR NUEVO SORTEO
        response = await supabase.from('sorteos').insert(sorteoData).select().single();
        if (response.data) {
            sorteoData.id = response.data.id;
        }
    }

    if (response.error) {
        console.error('Error guardando sorteo:', response.error);
        alert('Error al guardar el sorteo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Sorteo';
        return;
    }

    const currentSorteoId = sorteoId || sorteoData.id;

    // --- GESTIÓN DE PREMIOS ---
    const premiosForms = premiosContainer.querySelectorAll('.premio-form-group');
    const premiosToSave = [];

    // 1. Eliminar todos los premios existentes para simplificar la lógica de actualización
    await supabase.from('premios').delete().eq('sorteo_id', currentSorteoId);

    // 2. Insertar todos los premios nuevamente
    premiosForms.forEach(div => {
        // Ignorar si el div fue eliminado de la interfaz pero aún existe temporalmente
        if (!div.closest('#premios-container')) return; 
        
        premiosToSave.push({
            sorteo_id: currentSorteoId,
            lugar: parseInt(div.querySelector('[name="lugar"]').value),
            descripcion: div.querySelector('[name="descripcion"]').value,
            monto_bs: parseFloat(div.querySelector('[name="monto_bs"]').value) || null,
            monto_usd: parseFloat(div.querySelector('[name="monto_usd"]').value) || null,
        });
    });

    const { error: premiosError } = await supabase.from('premios').insert(premiosToSave);

    if (premiosError) {
        console.error('Error guardando premios:', premiosError);
        alert('Sorteo guardado, pero hubo un error con los premios.');
    } else {
        alert('Sorteo y premios guardados con éxito.');
        modalSorteo.classList.remove('active');
        loadSorteos();
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar Sorteo';
});

/**
 * Elimina un sorteo de la base de datos (con confirmación).
 */
window.deleteSorteo = async function(sorteoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este sorteo y todos sus datos relacionados (boletos, premios, inventario)?')) {
        return;
    }

    // ON DELETE CASCADE en las tablas se encarga de eliminar premios, boletos e inventario.
    const { error } = await supabase.from('sorteos').delete().eq('id', sorteoId);

    if (error) {
        console.error('Error eliminando sorteo:', error);
        alert('Error al eliminar el sorteo.');
    } else {
        alert('Sorteo eliminado con éxito.');
        loadSorteos();
    }
};

// --- LÓGICA DE GESTIÓN DE PAGOS Y BOLETOS ---

/**
 * Carga y renderiza la lista de boletos pendientes/rechazados.
 */
async function loadBoletos() {
    boletosList.innerHTML = 'Cargando boletos...';
    
    // Cargar boletos pendientes (y rechazos para que el admin pueda revalidar)
    const { data: boletos, error } = await supabase
        .from('boletos')
        .select('*, sorteos(titulo)')
        .in('estado', ['pendiente', 'rechazado'])
        .order('creado_en', { ascending: true });

    if (error) {
        console.error('Error cargando boletos:', error);
        boletosList.innerHTML = '<p style="color: red;">Error al cargar boletos.</p>';
        return;
    }

    if (boletos.length === 0) {
        boletosList.innerHTML = '<h4>No hay boletos pendientes de validación.</h4>';
        return;
    }

    // Construir la tabla
    let tableHTML = `
        <table class="boletos-table">
            <thead>
                <tr>
                    <th>Sorteo</th>
                    <th>Comprador</th>
                    <th>Tickets</th>
                    <th>Ref. Pago</th>
                    <th>Capture</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    boletos.forEach(boleto => {
        const estadoClass = boleto.estado === 'pendiente' ? 'status-pendiente' : 'status-rechazado';
        const estadoText = boleto.estado === 'pendiente' ? 'PENDIENTE' : 'RECHAZADO';
        
        tableHTML += `
            <tr>
                <td>${boleto.sorteos.titulo}</td>
                <td>${boleto.nombre_cliente}<br><small>${boleto.telefono_cliente}</small></td>
                <td>${boleto.cantidad_boletos || 1}</td>
                <td>${boleto.referencia_pago}</td>
                <td>
                    ${boleto.url_capture ? `<button class="view-capture-btn" onclick="window.open('${boleto.url_capture}', '_blank')">Ver Capture</button>` : 'N/A'}
                </td>
                <td><span class="status-badge ${estadoClass}">${estadoText}</span></td>
                <td>
                    <button class="btn-success btn-table-action" onclick="validatePayment('${boleto.id}', '${boleto.sorteo_id}', ${boleto.cantidad_boletos})">✔️ Aceptar Pago</button>
                    <button class="btn-danger btn-table-action" onclick="rejectPayment('${boleto.id}')">❌ Rechazar</button>
                    <button class="btn-secondary btn-table-action" onclick="sendTicketsWhatsapp('${boleto.telefono_cliente}')">✉️ Enviar Tickets</button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    boletosList.innerHTML = tableHTML;
}

/**
 * Lógica para validar el pago.
 * Llama a la función de la DB para asignar boletos aleatorios y únicos.
 */
window.validatePayment = async function(boletoId, sorteoId, cantidadBoletos) {
    if (!confirm(`¿Confirmar que el pago fue recibido para ${cantidadBoletos} boletos? Esto asignará los números de boletos únicos.`)) {
        return;
    }

    try {
        // 1. Asignar boletos aleatorios y únicos llamando a la función de la DB (Stored Procedure)
        const { data: assignedTickets, error: assignError } = await supabase.rpc('asignar_boletos_aleatorios', {
            p_sorteo_id: sorteoId,
            p_boleto_id: boletoId,
            p_cantidad_boletos: cantidadBoletos
        });

        if (assignError) throw assignError;

        if (assignedTickets.length < cantidadBoletos) {
            alert(`ADVERTENCIA: Solo se pudieron asignar ${assignedTickets.length} de ${cantidadBoletos} boletos. El sorteo podría estar agotado o faltan números en inventario.`);
            // A pesar de la advertencia, el pago se marca como validado
        }
        
        // 2. Marcar el boleto como validado (el estado 'rechazado' se limpia si se revalida)
        const { error: updateError } = await supabase
            .from('boletos')
            .update({ estado: 'validado', fecha_validacion: new Date().toISOString() })
            .eq('id', boletoId);

        if (updateError) throw updateError;


        // 3. Obtener los números asignados para el mensaje de WhatsApp (opcional, para una mejor UX)
        const numeros = assignedTickets.map(t => t.numero_boleto.toString().padStart(5, '0')).join(', ');
        alert(`Pago validado. Se asignaron ${assignedTickets.length} boletos. Números: ${numeros}. Ahora puedes enviar los tickets.`);
        
        loadBoletos(); // Recargar la lista
    } catch (error) {
        console.error('Error al validar pago y asignar boletos:', error);
        alert(`Error CRÍTICO al validar/asignar boletos. Asegúrate de haber ejecutado la función SQL 'asignar_boletos_aleatorios'. Detalle: ${error.message}`);
    }
};

/**
 * Lógica para rechazar un pago.
 * Cambia el estado del boleto y, si estaba validado, libera los números de boletos.
 */
window.rejectPayment = async function(boletoId) {
    if (!confirm('¿Confirmar que el pago debe ser RECHAZADO? Si este boleto ya fue validado, sus números se liberarán.')) {
        return;
    }
    
    try {
        // 1. Liberar los números de boletos previamente asignados (si existían)
        const { error: inventoryError } = await supabase
            .from('inventario_boletos')
            .update({ vendido_por_boleto_id: null, estado_inventario: 'disponible' })
            .eq('vendido_por_boleto_id', boletoId);

        if (inventoryError) console.warn('Error liberando inventario:', inventoryError);
        
        // 2. Marcar el boleto como rechazado
        const { error: updateError } = await supabase
            .from('boletos')
            .update({ estado: 'rechazado' })
            .eq('id', boletoId);

        if (updateError) throw updateError;
        
        alert('Pago rechazado. El boleto está marcado como RECHAZADO y los números (si los tenía) han sido liberados.');
        loadBoletos(); // Recargar la lista
    } catch (error) {
        console.error('Error al rechazar pago:', error);
        alert('Error al rechazar el pago.');
    }
};

/**
 * Abre la ventana de WhatsApp para enviar el mensaje de agradecimiento.
 */
window.sendTicketsWhatsapp = function(phoneNumber) {
    // Nota: Aquí el admin debería pegar los números de los tickets asignados.
    const mensaje = encodeURIComponent(
        "¡Hola! Soy el administrador de Gana con Narbis. 🎉\n\nTu pago ha sido confirmado. Aquí están los números de tus tickets:\n\n[PEGA AQUÍ LOS NÚMEROS ASIGNADOS]\n\n¡Mucha suerte en el sorteo!"
    );
    // Asegurarse de que el número tenga el formato correcto (solo dígitos)
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, ''); 
    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${mensaje}`;
    window.open(url, '_blank');
};


// --- EVENTOS DE INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Manejar la navegación del menú lateral
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            if (section === 'logout') {
                alert('Funcionalidad de Logout pendiente (implementar Supabase Auth).');
                return;
            }
            showSection(section);
            if (section === 'sorteos') {
                loadSorteos();
            } else if (section === 'boletos') {
                loadBoletos();
            }
            // Agrega lógica para 'pagos' cuando se implemente
        });
    });

    // 2. Eventos para el modal de sorteos
    document.getElementById('abrir-nuevo-sorteo').addEventListener('click', () => {
        window.editSorteo(null); // Llamar a editar sin ID = crear nuevo
    });
    document.getElementById('agregar-premio-btn').addEventListener('click', () => {
        addPremioField();
    });

    // Cargar la vista por defecto al inicio
    loadSorteos();
    // Asegurar que la sección por defecto esté activa
    showSection('sorteos');
});
