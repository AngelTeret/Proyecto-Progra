// Variables de paginación
let paginaActual = 1;
const categoriasPorPagina = 10;
let categoriasData = [];

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', async () => {
    verificarAutenticacion();
    await cargarCategorias();
});

// Cargar categorías
async function cargarCategorias() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/categorias', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            categoriasData = await response.json();
            actualizarTablaCategorias();
            actualizarPaginacion();
        } else {
            const error = await response.json();
            mostrarError(error.mensaje);
        }
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        mostrarError('Error al cargar las categorías');
    }
}

// Filtrar categorías
function filtrarCategorias() {
    const busqueda = document.getElementById('buscarCategoria').value.toLowerCase();
    const estado = document.getElementById('filtroEstado').value;
    
    console.log('Filtro - Búsqueda:', busqueda, 'Estado:', estado);
    console.log('Datos actuales:', categoriasData);
    
    const categoriasFiltradas = categoriasData.filter(categoria => {
        // Verificar coincidencia de búsqueda en nombre o descripción
        const nombre = categoria.nombre || '';
        const descripcion = categoria.descripcion || '';
        const coincideBusqueda = nombre.toLowerCase().includes(busqueda) ||
                                descripcion.toLowerCase().includes(busqueda);
        
        // Verificar coincidencia de estado (con normalización)
        let coincideEstado = true;
        if (estado) {
            // Convertir el valor de select ('1' o '0') al valor de estado en la categoría
            const esActivo = estado === '1'; // true si se filtra por 'Activo', false si 'Inactivo'
            
            // Determinar si la categoría está activa usando la misma lógica que usamos en otras partes
            const categoriaActiva = categoria.estado === 1 || 
                                   categoria.estado === '1' || 
                                   categoria.estado === true || 
                                   categoria.estado === 'activo' || 
                                   categoria.estado === 'Activo';
            
            // Comparar los booleanos directamente
            coincideEstado = categoriaActiva === esActivo;
            console.log('Comparando estado:', categoria.nombre, 'Estado categoría:', categoriaActiva, 'Estado filtro:', esActivo, 'Coincide:', coincideEstado);
        }
        
        return coincideBusqueda && coincideEstado;
    });
    
    console.log('Categorías filtradas:', categoriasFiltradas);
    actualizarTablaCategorias(categoriasFiltradas);
    actualizarPaginacion(categoriasFiltradas.length);
}

// Actualizar tabla de categorías
function actualizarTablaCategorias(categorias = categoriasData) {
    const inicio = (paginaActual - 1) * categoriasPorPagina;
    const fin = inicio + categoriasPorPagina;
    const categoriasPagina = categorias.slice(inicio, fin);
    
    console.log('Renderizando categorías:', categoriasPagina);
    
    const tbody = document.getElementById('tablaCategorias');
    tbody.innerHTML = categoriasPagina.map(categoria => {
        // Normalizar estado independientemente de cómo venga del backend
        const estadoNormalizado = categoria.estado === 1 || 
                                categoria.estado === '1' || 
                                categoria.estado === true || 
                                categoria.estado === 'activo' || 
                                categoria.estado === 'Activo';
        
        // Verificar si total_productos existe, o usar 0 como valor predeterminado
        const totalProductos = categoria.total_productos !== undefined ? 
                              categoria.total_productos : 0;
        
        return `
        <tr>
            <td>${categoria.nombre || ''}</td>
            <td>${categoria.descripcion || '-'}</td>
            <td>
                <span class="estado-badge estado-${estadoNormalizado ? 'activo' : 'inactivo'}">
                    ${estadoNormalizado ? 'ACTIVO' : 'INACTIVO'}
                </span>
            </td>
            <td>${totalProductos}</td>
            <td class="acciones">
                <button class="btn-accion btn-editar" onclick="editarCategoria(${categoria.id_categoria})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-accion btn-eliminar" onclick="confirmarEliminarCategoria(${categoria.id_categoria})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

// Actualizar paginación
function actualizarPaginacion(totalCategorias = categoriasData.length) {
    const totalPaginas = Math.ceil(totalCategorias / categoriasPorPagina);
    const paginacion = document.getElementById('paginacion');
    
    let html = `
        <button onclick="cambiarPagina(1)" ${paginaActual === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-double-left"></i>
        </button>
        <button onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-left"></i>
        </button>
    `;
    
    for (let i = Math.max(1, paginaActual - 2); i <= Math.min(totalPaginas, paginaActual + 2); i++) {
        html += `
            <button onclick="cambiarPagina(${i})" class="${i === paginaActual ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    
    html += `
        <button onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>
            <i class="fas fa-angle-right"></i>
        </button>
        <button onclick="cambiarPagina(${totalPaginas})" ${paginaActual === totalPaginas ? 'disabled' : ''}>
            <i class="fas fa-angle-double-right"></i>
        </button>
    `;
    
    paginacion.innerHTML = html;
}

// Cambiar página
function cambiarPagina(pagina) {
    paginaActual = pagina;
    actualizarTablaCategorias();
    actualizarPaginacion();
}

// Mostrar modal de categoría
function mostrarModalCategoria(categoria = null) {
    const modal = document.getElementById('modalCategoria');
    const titulo = document.getElementById('modalTitulo');
    const form = document.getElementById('formCategoria');
    const selectEstado = document.getElementById('estado');
    
    titulo.textContent = categoria ? 'Editar Categoría' : 'Nueva Categoría';
    form.reset();
    
    console.log('Mostrando formulario para categoría:', categoria);
    
    if (categoria) {
        document.getElementById('idCategoria').value = categoria.id_categoria;
        document.getElementById('nombre').value = categoria.nombre;
        document.getElementById('descripcion').value = categoria.descripcion || '';
        
        // Determinar qué opción del dropdown seleccionar basado en el estado
        let estadoValor = '1'; // Por defecto activo
        
        // Normalizar el valor del estado para seleccionarlo correctamente
        if (categoria.estado === 0 || 
            categoria.estado === '0' || 
            categoria.estado === false || 
            categoria.estado === 'inactivo') {
            estadoValor = '0'; // Inactivo
        }
        
        console.log('Estado a seleccionar:', estadoValor, 'Estado original:', categoria.estado);
        selectEstado.value = estadoValor;
    } else {
        document.getElementById('idCategoria').value = '';
        // Para nueva categoría, establecer el estado activo por defecto
        selectEstado.value = '1';
    }
    
    modal.style.display = 'block';
}

// Cerrar modal de categoría
function cerrarModalCategoria() {
    const modal = document.getElementById('modalCategoria');
    modal.style.display = 'none';
}

// Guardar categoría
async function guardarCategoria(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('adminToken');
    const idCategoria = document.getElementById('idCategoria').value;
    
    const categoriaData = {
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        estado: document.getElementById('estado').value
    };
    
    try {
        const url = idCategoria 
            ? `/api/admin/categorias/${idCategoria}`
            : '/api/admin/categorias';
            
        const method = idCategoria ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(categoriaData)
        });
        
        if (response.ok) {
            const data = await response.json();
            cerrarModalCategoria();
            await cargarCategorias();
            
            Swal.fire({
                title: idCategoria ? '¡Actualizada!' : '¡Creada!',
                text: idCategoria 
                    ? `La categoría "${categoriaData.nombre}" ha sido actualizada correctamente.`
                    : `La categoría "${categoriaData.nombre}" ha sido creada correctamente.`,
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#28a745'
            });
        } else {
            const error = await response.json();
            Swal.fire({
                title: 'Error',
                text: error.mensaje || `Error al ${idCategoria ? 'actualizar' : 'crear'} la categoría "${categoriaData.nombre}".`,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        Swal.fire({
            title: 'Error',
            text: `Error al ${idCategoria ? 'actualizar' : 'crear'} la categoría. Por favor intente de nuevo.`,
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
        });
    }
}

// Editar categoría
async function editarCategoria(id) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/categorias/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const categoria = await response.json();
            mostrarModalCategoria(categoria);
        } else {
            const error = await response.json();
            mostrarError(error.mensaje);
        }
    } catch (error) {
        console.error('Error al cargar categoría:', error);
        mostrarError('Error al cargar la categoría');
    }
}

// Confirmar eliminación de categoría
async function confirmarEliminarCategoria(id) {
    // Encontrar la categoría en el array
    const categoria = categoriasData.find(c => c.id_categoria === id);
    if (!categoria) return;

    const result = await Swal.fire({
        title: '¿Eliminar categoría?',
        html: `¿Está seguro que desea eliminar la categoría:<br><strong>${categoria.nombre}</strong>?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'No, cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        eliminarCategoria(id);
    }
}

// Eliminar categoría
async function eliminarCategoria(id) {
    try {
        const categoria = categoriasData.find(c => c.id_categoria === id);
        if (!categoria) return;

        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/categorias/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            await cargarCategorias();
            Swal.fire({
                title: '¡Eliminada!',
                text: `La categoría "${categoria.nombre}" ha sido eliminada correctamente.`,
                icon: 'success',
                confirmButtonColor: '#28a745'
            });
        } else {
            const error = await response.json();
            mostrarError(error.mensaje || `Error al eliminar la categoría "${categoria.nombre}"`);
        }
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        mostrarError('Error al intentar eliminar la categoría');
    }
}

// Funciones de utilidad
function mostrarError(mensaje) {
    Swal.fire({
        title: 'Error',
        text: mensaje,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
    });
}

function mostrarMensaje(mensaje) {
    Swal.fire({
        title: '¡Éxito!',
        text: mensaje,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745'
    });
}
