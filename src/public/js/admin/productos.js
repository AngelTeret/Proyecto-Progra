// Funciones para la gestión de productos

// Variables globales
let productos = [];
let categorias = [];

// Variables de paginación
let paginaActual = 1;
const productosPorPagina = 10;
let productosData = [];

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCategorias();
    await cargarProductos();
});

// Cargar productos
async function cargarProductos() {
    try {
        const headers = obtenerHeadersAuth();
        
        const response = await fetch('/api/admin/productos', {
            headers: headers
        });
        
        const data = await response.json();
        
        if (response.ok) {
            productos = data.productos;
            productosData = data.productos;
            actualizarTablaProductos();
            actualizarPaginacion();
        } else {
            mostrarError(data.mensaje || 'Error al cargar los productos');
        }
    } catch (error) {
        mostrarError('Error al cargar los productos: ' + error.message);
    }
}

// Cargar categorías
async function cargarCategorias() {
    try {
        const response = await fetch('/api/admin/categorias', {
            headers: obtenerHeadersAuth()
        });
        const data = await response.json();
        
        if (response.ok) {
            categorias = data; // La respuesta ya es el array de categorías
            actualizarSelectCategorias();
        }
    } catch (error) {
        mostrarError('Error al cargar las categorías');
    }
}

// Actualizar select de categorías
function actualizarSelectCategorias() {
    const selectCategorias = document.getElementById('categorias');
    const filtroCategorias = document.getElementById('filtroCategoria');
    
    if (!selectCategorias || !filtroCategorias) return;
    
    const categoriasActivas = categorias.filter(cat => cat.estado === 1);
    
    // Actualizar select del formulario
    selectCategorias.innerHTML = `
        <option value="" disabled selected>Seleccione una categoría</option>
        ${categoriasActivas.map(cat => 
            `<option value="${cat.id_categoria}">${cat.nombre}</option>`
        ).join('')}
    `;
    
    // Actualizar select de filtro
    filtroCategorias.innerHTML = `
        <option value="">Todas las categorías</option>
        ${categoriasActivas.map(cat => 
            `<option value="${cat.id_categoria}">${cat.nombre}</option>`
        ).join('')}
    `;
}

// Mostrar modal de producto
function mostrarModalProducto(producto = null) {
    const modal = document.getElementById('modalProducto');
    const titulo = document.getElementById('modalTitulo');
    const form = document.getElementById('formProducto');
    
    titulo.textContent = producto ? 'Editar Producto' : 'Nuevo Producto';
    form.reset();
    
    if (producto) {
        // Rellenar formulario con validación para cada campo
        const idProductoField = document.getElementById('idProducto');
        const nombreField = document.getElementById('nombre');
        const descripcionField = document.getElementById('descripcion');
        const precioField = document.getElementById('precio');
        const stockField = document.getElementById('stock');
        const estadoField = document.getElementById('estado');
        const preview = document.getElementById('imagenPreview');
        
        // Rellenar cada campo con validación
        if (idProductoField) idProductoField.value = producto.id_producto || '';
        if (nombreField) nombreField.value = producto.nombre || '';
        if (descripcionField) descripcionField.value = producto.descripcion || '';
        if (precioField) precioField.value = parseFloat(producto.precio || 0).toString();
        if (stockField) stockField.value = parseInt(producto.stock || 0).toString();
        
        // Para el estado, asegurarse de que sea un valor válido
        if (estadoField) {
            // Verificar si el valor del estado está entre las opciones disponibles
            const estadoValido = Array.from(estadoField.options).some(option => option.value === producto.estado);
            if (estadoValido) {
                estadoField.value = producto.estado;
            } else {
                // Si no es válido, usar un valor predeterminado (primera opción)
                estadoField.selectedIndex = 0;
            }
        }
        
        // Mostrar imagen actual
        if (preview) {
            preview.src = producto.imagen || '/img/placeholder.png';
        }
        
        // Seleccionar categoría con validación
        const selectCategorias = document.getElementById('categorias');
        if (selectCategorias) {
            if (producto.id_categoria) {
                // Verificar si la categoría existe en el dropdown
                const categoriaExiste = Array.from(selectCategorias.options).some(
                    option => option.value == producto.id_categoria // Comparación flexible con ==
                );
                
                if (categoriaExiste) {
                    selectCategorias.value = producto.id_categoria;
                } else {
                    selectCategorias.selectedIndex = 0;
                }
            } else {
                // Si no hay categoría, seleccionar la opción por defecto
                selectCategorias.selectedIndex = 0;
            }
        }
    }
    
    modal.style.display = 'block';
}

// Cerrar modal de producto
function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    modal.style.display = 'none';
}

// Previsualizar imagen
function previsualizarImagen(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const preview = document.getElementById('imagenPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        
        reader.readAsDataURL(file);
    }
}

// Filtrar productos
function filtrarProductos() {
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const categoria = document.getElementById('filtroCategoria').value;
    const estado = document.getElementById('filtroEstado').value;
    
    const productosFiltrados = productosData.filter(producto => {
        const coincideBusqueda = producto.nombre.toLowerCase().includes(busqueda);
        const coincideCategoria = !categoria || producto.id_categoria === parseInt(categoria);
        const coincideEstado = !estado || producto.estado.toLowerCase() === estado.toLowerCase();
        
        return coincideBusqueda && coincideCategoria && coincideEstado;
    });
    
    actualizarTablaProductos(productosFiltrados);
    actualizarPaginacion(productosFiltrados.length);
}

// Actualizar tabla de productos
function actualizarTablaProductos(productos = productosData) {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productos.slice(inicio, fin);
    
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = productosPagina.map(producto => `
        <tr>
            <td>
                <img src="${producto.imagen || '/img/placeholder.png'}" 
                     alt="${producto.nombre}" 
                     class="producto-imagen">
            </td>
            <td>${producto.nombre}</td>
            <td>Q. ${parseFloat(producto.precio || 0).toFixed(2)}</td>
            <td>${producto.stock}</td>
            <td>
                <span class="estado-badge estado-${producto.estado.toLowerCase()}">
                    ${producto.estado}
                </span>
            </td>
            <td>${producto.categoria_nombre || '-'}</td>
            <td class="acciones">
                <button class="btn-accion btn-editar" onclick="editarProducto(${producto.id_producto})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-accion btn-eliminar" onclick="confirmarEliminarProducto(${producto.id_producto})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Actualizar paginación
function actualizarPaginacion(totalProductos = productosData.length) {
    const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
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
    actualizarTablaProductos();
    actualizarPaginacion();
}

// Guardar producto
async function guardarProducto(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        
        // Obtener datos del formulario
        const idProducto = document.getElementById('idProducto').value;
        const nombre = document.getElementById('nombre').value;
        const descripcion = document.getElementById('descripcion').value;
        const precio = document.getElementById('precio').value;
        const stock = document.getElementById('stock').value;
        const estado = document.getElementById('estado').value;
        const imagen = document.getElementById('imagen').files[0];
        const categoria = document.getElementById('categorias').value;
        
        // Agregar datos al FormData
        formData.append('nombre', nombre);
        formData.append('descripcion', descripcion);
        formData.append('precio', precio);
        formData.append('stock', stock);
        formData.append('estado', estado);
        formData.append('id_categoria', categoria);
        if (imagen) {
            formData.append('imagen', imagen);
        }
        
        const url = idProducto 
            ? `/api/admin/productos/${idProducto}`
            : '/api/admin/productos';
            
        const method = idProducto ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': obtenerHeadersAuth().Authorization
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            await cargarProductos();
            cerrarModalProducto();
            mostrarMensajeExito(data.mensaje);
        } else {
            mostrarError(data.mensaje);
        }
    } catch (error) {
        mostrarError('Error al guardar el producto');
    }
}

// Editar producto
async function editarProducto(id) {
    try {
        const response = await fetch(`/api/admin/productos/${id}`, {
            headers: obtenerHeadersAuth()
        });
        const data = await response.json();
        
        if (response.ok) {
            // Detectar la estructura de la respuesta y adaptar
            // El API puede devolver {producto: {...}} o directamente el objeto producto
            const producto = data.producto || data;
            mostrarModalProducto(producto);
        } else {
            mostrarError(data.mensaje || 'Error al cargar el producto');
        }
    } catch (error) {
        mostrarError('Error al cargar el producto: ' + error.message);
    }
}

// Confirmar eliminación de producto
async function confirmarEliminarProducto(id) {
    // Encontrar el producto en el array de productos
    const producto = productos.find(p => p.id_producto === id);
    if (!producto) return;

    const result = await Swal.fire({
        title: '¿Eliminar producto?',
        html: `¿Está seguro que desea eliminar el producto:<br><strong>${producto.nombre}</strong>?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'No, cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        eliminarProducto(id);
    }
}

// Eliminar producto
async function eliminarProducto(id) {
    try {
        const producto = productos.find(p => p.id_producto === id);
        if (!producto) return;

        const response = await fetch(`/api/admin/productos/${id}`, {
            method: 'DELETE',
            headers: obtenerHeadersAuth()
        });

        if (response.ok) {
            await cargarProductos();
            Swal.fire({
                title: '¡Eliminado!',
                text: `El producto "${producto.nombre}" ha sido eliminado correctamente.`,
                icon: 'success',
                confirmButtonColor: '#28a745'
            });
        } else {
            const data = await response.json();
            mostrarError(data.mensaje || `Error al eliminar el producto "${producto.nombre}"`);
        }
    } catch (error) {
        mostrarError('Error al intentar eliminar el producto');
    }
}

// Filtrar productos
function filtrarProductos() {
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const categoria = document.getElementById('filtroCategoria').value;
    const estado = document.getElementById('filtroEstado').value;
    
    const productosFiltrados = productosData.filter(producto => {
        // Verificar coincidencia de búsqueda en el nombre
        const coincideBusqueda = producto.nombre && producto.nombre.toLowerCase().includes(busqueda);
        
        // Verificar coincidencia de categoría (considerando la estructura actual de datos)
        const coincideCategoria = !categoria || 
            (producto.id_categoria && producto.id_categoria.toString() === categoria) || 
            (producto.categoria_nombre && categoria === producto.categoria_nombre);
        
        // Verificar coincidencia de estado (insensible a mayúsculas/minúsculas)
        const coincideEstado = !estado || 
            (producto.estado && producto.estado.toLowerCase() === estado.toLowerCase());
        
        return coincideBusqueda && coincideCategoria && coincideEstado;
    });
    
    renderizarTablaProductosFiltrados(productosFiltrados);
}

// Renderizar productos filtrados
function renderizarTablaProductosFiltrados(productosFiltrados) {
    const tabla = document.getElementById('tablaProductos');
    tabla.innerHTML = '';
    
    productosFiltrados.forEach(producto => {
        // Asegurarse de que los valores estén definidos para evitar errores
        const nombre = producto.nombre || 'Sin nombre';
        const precio = typeof producto.precio === 'number' ? producto.precio : parseFloat(producto.precio || 0);
        const stock = typeof producto.stock === 'number' ? producto.stock : parseInt(producto.stock || 0);
        const estado = producto.estado || 'inactivo';
        const categoriaTexto = producto.categoria_nombre || '-';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${producto.imagen || '/img/placeholder.png'}" 
                     alt="${nombre}" 
                     class="producto-imagen" style="max-width: 60px; max-height: 60px;">
            </td>
            <td>${nombre}</td>
            <td>Q. ${precio.toFixed(2)}</td>
            <td>${stock}</td>
            <td>
                <span class="estado-badge estado-${estado.toLowerCase()}">
                    ${estado}
                </span>
            </td>
            <td>${categoriaTexto}</td>
            <td>
                <button onclick="editarProducto(${producto.id_producto})" class="btn-accion btn-editar">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="confirmarEliminarProducto(${producto.id_producto})" class="btn-accion btn-eliminar">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

// Mostrar mensaje de éxito
function mostrarMensajeExito(mensaje) {
    Swal.fire({
        title: '¡Éxito!',
        text: mensaje,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745'
    });
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
    Swal.fire({
        title: 'Error',
        text: mensaje,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
    });
}
