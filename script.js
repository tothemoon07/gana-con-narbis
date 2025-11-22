// ==========================================================
// Archivo: script.js - VERSIÓN FINAL UNIFICADA (INDEX con diseño de "Combo Resuelve")
// ==========================================================

// ==========================================================
// FUNCIÓN DE CARGA DE SORTEOS (para la página principal)
// ==========================================================
async function cargarSorteos() {
    const container = document.getElementById('sorteos-container');
    if (!container) return;
    container.innerHTML = '<p style="text-align: center;">Cargando sorteos...</p>';
    
    // Asumimos que 'supabase' está definido en supabase-config.js y cargado
    if (typeof supabase === 'undefined') {
        console.error("Error: Supabase no está definido. Revise la carga de librerías.");
        container.innerHTML = '<p style="color: red; text-align: center;">Error de configuración de la base de datos.</p>';
        return;
    }

    try {
        // 1. Obtener todos los sorteos activos
        const { data: sorteos, error: sorteosError } = await supabase
            .from('sorteos')
            .select('*')
            .eq('activo', true) // Usar 'activo' como en la BD si 'estado' no existe o no tiene 'activo'
            .order('fecha_sorteo', { ascending: true });

        if (sorteosError) {
            console.error("Error al cargar sorteos:", sorteosError);
            container.innerHTML = `<p style="color: red; text-align: center;">Error al cargar sorteos: ${sorteosError.message}</p>`;
            return;
        }

        if (!sorteos || sorteos.length === 0) {
            container.innerHTML = '<p style="text-align: center;">No hay sorteos activos disponibles por el momento.</p>';
            return;
        }

        container.innerHTML = ''; // Limpiar mensaje de carga
        
        // Mensaje de éxito (opcional, si lo quieres arriba del grid)
        // const mensajeExito = document.createElement('p');
        // mensajeExito.innerHTML = `✅ Se encontraron ${sorteos.length} sorteo(s) activo(s).`;
        // container.parentElement.prepend(mensajeExito); 
        
        // 2. Procesar cada sorteo y añadir la barra de progreso
        for (const sorteo of sorteos) { // Usamos for...of para poder usar await dentro del bucle
            const sorteoId = sorteo.id;
            
            // 3. Obtener el total de boletos vendidos para este sorteo
            const { data: ventas } = await supabase
                .from('boletos')
                .select('cantidad_boletos')
                .eq('sorteo_id', sorteoId)
                .neq('estado', 'rechazado'); // Solo cuenta tickets no rechazados

            // Sumar la cantidad de boletos
            const boletosVendidos = ventas ? ventas.reduce((sum, orden) => sum + orden.cantidad_boletos, 0) : 0;
            
            const totalTickets = sorteo.total_boletos || 10000;
            let porcentaje = (boletosVendidos / totalTickets) * 100;
            if (porcentaje > 100) porcentaje = 100;
            
            const boletosRestantes = Math.max(0, totalTickets - boletosVendidos);
            const porcentajeDisplay = porcentaje.toFixed(2); // Formatear a dos decimales
            
            const fecha = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-VE', { 
                day: 'numeric', month: 'long', year: 'numeric'
            });


            // ----------------------------------------------------
            // Lógica para mostrar la barra o el estado de VENDIDO (diseño "Combo Resuelve")
            // ----------------------------------------------------
            let progresoHTML = '';
            let btnTexto = 'Participar ahora';
            let tagHTML = '';
            let cardImageStyle = ''; // Para aplicar grayscale

            if (porcentaje >= 100) {
                // Rifa vendida
                progresoHTML = `
                    <p class="progress-text">Vendido <span style="color:var(--primary-color);">${porcentajeDisplay}%</span></p>
                    <p class="boletos-restantes-tag" style="background-color: transparent; color: var(--primary-color);">
                        Rifa vendida completamente
                    </p>
                `;
                btnTexto = 'Rifa Vendida';
                tagHTML = '<div class="tag-vendido">VENDIDO</div>';
                cardImageStyle = 'filter: grayscale(100%);';
            } else {
                // Rifa activa
                progresoHTML = `
                    <p class="progress-text">Progreso ${porcentajeDisplay}%</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${porcentaje}%;"></div>
                    </div>
                    <div class="boletos-restantes-tag">
                        Solo quedan ${boletosRestantes} boletos
                    </div>
                `;
                if (sorteo.es_popular) { // Asumiendo que tienes una columna 'es_popular' en tu tabla 'sorteos'
                    tagHTML = '<div class="tag-popular">¡Más Popular!</div>';
                }
            }
            // ----------------------------------------------------


            const card = document.createElement('div');
            card.className = `sorteo-card`; // La clase sorteo-card ya tiene el estilo base
            
            card.innerHTML = `
                ${tagHTML}
                <div class="sorteo-img-container">
                    <img src="${sorteo.imagen_url || 'placeholder.png'}" alt="${sorteo.titulo}" class="sorteo-img" style="${cardImageStyle}">
                </div>
                <div class="sorteo-info">
                    <p class="fecha-card">${fecha}</
