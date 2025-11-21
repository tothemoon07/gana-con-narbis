// ==========================================================
// Archivo: script.js - VERSIÓN FINAL CON CORRECCIÓN DE CÉDULA ROBUSTA
// ==========================================================

// ==========================================================
// FUNCIÓN DE CARGA DE SORTEOS (para la página principal)
// ==========================================================
async function cargarSorteos() {
    console.log("Intentando cargar sorteos desde Supabase...");
    
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
            sorteos.forEach(sorteo => {
                const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                const imgHtml = sorteo.imagen_url ? 
                    `<img src="${sorteo.imagen_url}" alt="${sorteo.titulo}" style="width:100%; height:auto; border-radius:8px; margin-bottom:10px;">` : '';


                const card = document.createElement('div');
                card.className = 'sorteo-card'; 

                card.innerHTML = `
                    <div class="sorteo-contenido">
                        ${imgHtml}
                        <h3 class="sorteo-titulo">${sorteo.titulo}</h3>
                        <p class="sorteo-fecha">📅 Fecha: ${fecha}</p>
                        <p class="sorteo-precio">💰 Precio: Bs. ${sorteo.precio_bs}</p>
                        
                        <button class="participar-btn" onclick="window.location.href='sorteo.html?id=${sorteo.id}'">
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
// FUNCIÓN DE CONSULTA DE TICKETS (CORREGIDA PARA CÉDULA ROBUSTA)
// ==========================================================

async function buscarBoletosCliente(identificador) {
    const resultadosDiv = document.getElementById('resultados-consulta');
    resultadosDiv.innerHTML = '<p style="text-align:center;">Buscando...</p>';

    // 1. Limpiamos el identificador de caracteres especiales
    const identificadorLimpio = identificador.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // 2. Definimos las posibilidades de búsqueda para la cédula
    let posiblesBusquedas = [
        `telefono_cliente.eq.${identificadorLimpio}`, // Teléfono (siempre debe buscarse así)
        `cedula_cliente.eq.${identificadorLimpio}`   // Cédula: V12345678 (si el usuario la escribió con V) o 12345678 (si la base de datos la tiene solo con números)
    ];

    // 3. Si la entrada no tiene prefijo (V, E, P) y es lo suficientemente larga para ser una cédula...
    const primerCaracter = identificadorLimpio.charAt(0);
    if (!['V', 'E', 'P'].includes(primerCaracter) && identificadorLimpio.length >= 5) {
        // Agregamos la búsqueda con los prefijos más comunes (V y E)
        posiblesBusquedas.push(`cedula_cliente.eq.V${identificadorLimpio}`);
        posiblesBusquedas.push(`cedula_cliente.eq.E${identificadorLimpio}`);
    }
    
    // 4. Construimos la cláusula OR que Supabase puede entender
    const orClauses = posiblesBusquedas.join(',');

    try {
        const { data: ordenes, error } = await supabase
            .from('boletos')
            .select('id, sorteo_id, cantidad_boletos, numeros_asignados, estado, sorteos(titulo)')
            .eq('estado', 'validado') 
            .or(orClauses); // Usamos la cadena de ORs

        if (error) {
             console.error("Error de Supabase al consultar boletos:", error);
             resultadosDiv.innerHTML = '<p style="color: red; text-align: center; margin-top: 15px;">Error al conectar. ¿La política RLS SELECT en "boletos" está en true?</p>';
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
                <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: #f9f9f9;">
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
// INICIALIZACIÓN Y EVENT LISTENERS
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    cargarSorteos();
    
    const modalConsulta = document.getElementById('modal-consultar-tickets');
    const btnAbrirConsulta = document.getElementById('consultar-tickets-btn');
    const btnCerrarConsulta = document.getElementById('close-consultar-tickets');
    const formConsulta = document.getElementById('form-consultar-tickets');
    const resultadosDiv = document.getElementById('resultados-consulta');
    
    btnAbrirConsulta?.addEventListener('click', (e) => {
        e.preventDefault(); 
        if(modalConsulta) {
            modalConsulta.style.display = 'flex';
            if(resultadosDiv) resultadosDiv.innerHTML = ''; 
            const input = document.getElementById('identificador-consulta');
            if(input) input.value = ''; 
        }
    });

    btnCerrarConsulta?.addEventListener('click', () => {
        if(modalConsulta) modalConsulta.style.display = 'none';
    });

    formConsulta?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identificador = document.getElementById('identificador-consulta').value.trim();
        if (identificador) {
            await buscarBoletosCliente(identificador);
        }
    });

});
