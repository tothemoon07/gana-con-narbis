// ==========================================================
// ADMIN SCRIPT - VERSIÓN MEJORADA (DASHBOARD)
// ==========================================================

// Variables Globales
const BUCKET_SORTEOS = 'imagenes_sorteos';
const BUCKET_COMPROBANTES = 'comprobantes_narbis_v2'; // Asegúrate que coincida
let filtroActual = 'reportado';

// Elementos del DOM
const viewSorteos = document.getElementById('view-sorteos');
const viewPedidos = document.getElementById('view-pedidos');
const navSorteos = document.getElementById('nav-sorteos');
const navPedidos = document.getElementById('nav-pedidos');

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error("Supabase no está cargado.");
        return;
    }

    // Verificar sesión
    checkSession();

    // Listeners de Navegación
    navSorteos.addEventListener('click', () => cambiarVista('sorteos'));
    navPedidos.addEventListener('click', () => cambiarVista('pedidos'));
    
    document.getElementById('cerrar-sesion-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'admin_login.html';
    });

    // Cargar datos iniciales
    cargarSorteos();
    
    // Preview de imagen al crear sorteo
    document.getElementById('input-imagen').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('preview-imagen');
                img.src = e.target.result;
                img.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Listener Formulario Crear Sorteo
    document.getElementById('form-crear-sorteo').addEventListener('submit', guardarSorteo);
});

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'admin_login.html';
    }
}

// --- NAVEGACIÓN ---
function cambiarVista(vista) {
    if (vista === 'sorteos') {
        viewSorteos.style.display = 'block';
        viewPedidos.style.display = 'none';
        navSorteos.classList.add('active');
        navPedidos.classList.remove('active');
        cargarSorteos();
    } else {
        viewSorteos.style.display = 'none';
        viewPedidos.style.display = 'block';
        navSorteos.classList.remove('active');
        navPedidos.classList.add('active');
        cargarPedidos();
    }
}

// --- GESTIÓN DE SORTEOS ---
async function cargarSorteos() {
    const tbody = document.getElementById('tbody-sorteos');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando...</td></tr>';

    const { data: sorteos, error } = await supabase
        .from('sorteos')
        .select('*')
        .order('creado_en', { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6">Error al cargar</td></tr>';
        return;
    }

    if (sorteos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay sorteos creados.</td></tr>';
        return;
    }

    let html = '';
    sorteos.forEach(s => {
        html += `
            <tr>
                <td><img src="${s.imagen_url}" width="50" style="border-radius:4px;"></td>
                <td>${s.titulo}</td>
                <td>Bs. ${s.precio_bs}</td>
                <td>${s.total_boletos}</td>
                <td><span class="badge activo">${s.estado}</span></td>
                <td>
                    <button onclick="eliminarSorteo('${s.id}')" style="color:red; border:none; background:none; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// CREAR SORTEO
async function guardarSorteo(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerText = "Subiendo...";

    try {
        const file = document.getElementById('input-imagen').files[0];
        const fileName = `sorteo_${Date.now()}_${file.name.replace(/\s/g, '_')}`;

        // 1. Subir Imagen
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET_SORTEOS)
            .upload(fileName, file);
        
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_SORTEOS)
            .getPublicUrl(fileName);

        // 2. Guardar en Base de Datos
        const { error: dbErr } = await supabase.from('sorteos').insert([{
            titulo: document.getElementById('input-titulo').value,
            precio_bs: document.getElementById('input-precio').value,
            total_boletos: document.getElementById('input-stock').value,
            fecha_sorteo: new Date(document.getElementById('input-fecha').value).toISOString(),
            es_popular: document.getElementById('check-popular').checked,
            imagen_url: publicUrl,
            estado: 'activo',
            creado_en: new Date()
        }]);

        if (dbErr) throw dbErr;

        alert("¡Sorteo Creado Exitosamente!");
        cerrarModales();
        cargarSorteos();
        e.target.reset();
        document.getElementById('preview-imagen').style.display = 'none';

    } catch (error) {
        alert("Error: " + error.message);
        console.error(error);
    } finally {
        btn.disabled = false; btn.innerText = "Guardar Sorteo";
    }
}

async function eliminarSorteo(id) {
    if(confirm("¿Seguro que deseas eliminar este sorteo?")) {
        await supabase.from('sorteos').delete().eq('id', id);
        cargarSorteos();
    }
}

// --- GESTIÓN DE PEDIDOS ---

function filtrarPedidos(filtro, btn) {
    filtroActual = filtro;
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    cargarPedidos();
}

async function cargarPedidos() {
    const tbody = document.getElementById('tbody-pedidos');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';

    const { data: pedidos, error } = await supabase
        .from('boletos')
        .select('*')
        .eq('estado', filtroActual)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7">Error al cargar</td></tr>';
        return;
    }

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay pedidos en esta categoría.</td></tr>';
        return;
    }

    let html = '';
    pedidos.forEach(p => {
        let botonAccion = '';
        
        if (filtroActual === 'reportado') {
            botonAccion = `
                <button class="btn-primary" style="padding:5px 10px; font-size:12px;" 
                onclick="abrirModalCapture('${p.url_capture}', '${p.codigo_concepto}', '${p.id}', ${p.cantidad_boletos}, '${p.sorteo_id}')">
                    <i class="fas fa-eye"></i> Revisar
                </button>
            `;
        } else {
            botonAccion = `<span style="color:#aaa;">-</span>`;
        }

        let linkCapture = p.url_capture 
            ? `<a href="${p.url_capture}" target="_blank" style="color:blue;"><i class="fas fa-image"></i> Ver</a>` 
            : 'N/A';

        html += `
            <tr>
                <td><strong>${p.codigo_concepto}</strong></td>
                <td>${p.nombre_cliente}<br><small>${p.telefono_cliente}</small></td>
                <td style="text-align:center;">${p.cantidad_boletos}</td>
                <td>Bs. ${p.precio_total}</td>
                <td>${linkCapture}</td>
                <td style="font-size:12px; max-width:150px; overflow:hidden;">${p.numeros_asignados || 'Pendiente'}</td>
                <td>${botonAccion}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// --- MODALES Y APROBACIÓN ---

function abrirModalSorteo() {
    document.getElementById('modal-nuevo-sorteo').classList.add('active');
}

function cerrarModales() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// Abrir modal para revisar un pago específico
window.abrirModalCapture = function(url, ref, id, cantidad, sorteoId) {
    const modal = document.getElementById('modal-capture');
    const img = document.getElementById('img-capture-full');
    const info = document.getElementById('capture-info');
    
    img.src = url || 'placeholder.png';
    info.textContent = `Ref: ${ref} | Boletos: ${cantidad}`;

    // Asignar funciones a los botones del modal
    document.getElementById('btn-aprobar-modal').onclick = () => aprobarPedido(id, cantidad, sorteoId);
    document.getElementById('btn-rechazar-modal').onclick = () => rechazarPedido(id);

    modal.classList.add('active');
}

// LÓGICA DE APROBACIÓN (GENERAR NÚMEROS)
async function aprobarPedido(id, cantidad, sorteoId) {
    if(!confirm(`¿Aprobar orden y asignar ${cantidad} boletos?`)) return;

    try {
        // 1. Obtener el sorteo para saber el límite
        const { data: sorteo } = await supabase.from('sorteos').select('total_boletos').eq('id', sorteoId).single();
        const maxBoletos = sorteo.total_boletos || 10000;

        // 2. Obtener números ocupados
        const { data: ocupados } = await supabase.from('boletos')
            .select('numeros_asignados')
            .eq('sorteo_id', sorteoId)
            .not('numeros_asignados', 'is', null);

        let setOcupados = new Set();
        ocupados.forEach(o => {
            if(o.numeros_asignados) o.numeros_asignados.split(',').forEach(n => setOcupados.add(n.trim()));
        });

        // 3. Generar nuevos
        let nuevos = [];
        let intentos = 0;
        const pad = maxBoletos.toString().length; // 1000 -> 4 digitos (0005)

        while(nuevos.length < cantidad && intentos < 50000) {
            let rnd = Math.floor(Math.random() * maxBoletos) + 1; // 1 a 10000
            let str = rnd.toString().padStart(pad, '0');
            
            if(!setOcupados.has(str) && !nuevos.includes(str)) {
                nuevos.push(str);
            }
            intentos++;
        }

        if(nuevos.length < cantidad) {
            alert("Error: No hay suficientes números disponibles.");
            return;
        }

        // 4. Actualizar Base de Datos
        const { error } = await supabase.from('boletos').update({
            estado: 'validado',
            numeros_asignados: nuevos.join(', '),
            fecha_validacion: new Date()
        }).eq('id', id);

        if(error) throw error;

        alert("✅ Pedido Aprobado con Éxito");
        cerrarModales();
        cargarPedidos();

    } catch (e) {
        console.error(e);
        alert("Error al aprobar: " + e.message);
    }
}

async function rechazarPedido(id) {
    if(confirm("¿Rechazar este pedido?")) {
        await supabase.from('boletos').update({ estado: 'rechazado' }).eq('id', id);
        cerrarModales();
        cargarPedidos();
    }
}
