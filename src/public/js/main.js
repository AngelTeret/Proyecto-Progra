// Variables globales para el manejo del carrito y modales
let carrito = [];
let modal;
let btnCarrito;
let btnCerrar;

// Inicializar elementos cuando el DOM esté cargado
// Inicializa elementos y listeners cuando el DOM está listo
// Configura el flujo principal del carrito y la navegación
// Permite alternar logs de desarrollo mediante el flag DEBUG

document.addEventListener('DOMContentLoaded', function () {
    const DEBUG = false; // Flag para habilitar/deshabilitar logs de desarrollo
    if (DEBUG) console.log('DOM cargado - Inicializando carrito');

    // Sincroniza el carrito inicial desde localStorage para mantener persistencia entre recargas
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (DEBUG) console.log('Carrito cargado:', carrito);

    // Obtiene referencias a los elementos clave de la interfaz para el flujo de carrito/modal
    modal = document.getElementById('modalCarrito');
    btnCarrito = document.getElementById('btnCarrito');
    btnCerrar = document.querySelector('.close');
    const btnVerificar = document.querySelector('.modern-cart-btn-checkout');

    // Listeners para interacción con el carrito y navegación
    if (btnCarrito) {
        btnCarrito.addEventListener('click', function (e) {
            e.preventDefault();
            if (DEBUG) console.log('Botón carrito clickeado');
            abrirModalCarrito();
        });
    }

    if (btnCerrar) {
        btnCerrar.addEventListener('click', function () {
            if (DEBUG) console.log('Cerrar modal');
            cerrarModalCarrito();
        });
    }

    // Agregar listener al botón VERIFICAR
    if (btnVerificar) {
        btnVerificar.addEventListener('click', function () {
            if (DEBUG) console.log('Redirigiendo a página de pago...');
            cerrarModalCarrito(); // Cerrar el modal del carrito primero
            // Asegurarse de usar la ruta correcta configurada en Express
            window.location.href = '/pago';
        });
    } else {
        if (DEBUG) console.warn('No se encontró el botón de verificar');
    }

    // Inicializa el estado visual del carrito al cargar la página
    actualizarCarritoModal();
    actualizarContadorCarrito();

    // Permite cerrar el modal del carrito haciendo clic fuera de él
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            cerrarModalCarrito();
        }
    });

    // Carga inicial de productos en la página de productos
    cargarProductos();

    // Refuerza la sincronización visual del carrito tras carga inicial
    actualizarContadorCarrito();
    actualizarCarritoModal();

    // Monitoreo periódico del carrito para detectar y reflejar cambios hechos en otras pestañas o ventanas
    if (DEBUG) console.log('Configurando monitoreo del carrito');
    let ultimoEstadoCarrito = localStorage.getItem('carrito') || '[]';

    const intervaloMonitoreoCarrito = setInterval(function () {
        const estadoActual = localStorage.getItem('carrito') || '[]';
        // Solo actualiza la UI si el carrito cambió realmente
        if (ultimoEstadoCarrito !== estadoActual) {
            carrito = JSON.parse(estadoActual);
            if (carrito.length > 0 && DEBUG) {
                console.log('Sincronizando carrito con localStorage');
            }
            actualizarContadorCarrito();
            actualizarCarritoModal();
            ultimoEstadoCarrito = estadoActual;
        }
    }, 2000); // Intervalo de 2 segundos para eficiencia
});


// Funciones del carrito
// Agrega un producto al carrito, validando stock y mostrando feedback al usuario
function agregarAlCarrito(idProducto) {
    console.log('Agregando producto al carrito:', idProducto);
    fetch(`/api/productos/${idProducto}`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener el producto');
            return res.json();
        })
        .then(producto => {
            if (!producto || producto.error) {
                throw new Error(producto.mensaje || 'Error al obtener el producto');
            }

            console.log('Producto obtenido:', producto);

            // Asegurar que estamos usando la versión más reciente del carrito
            carrito = JSON.parse(localStorage.getItem('carrito')) || [];

            // Normalizar datos
            const prod = {
                id_producto: producto.id_producto,
                nombre: producto.nombre || '',
                precio: producto.precio ? parseFloat(producto.precio) : 0,
                imagen: producto.imagen || '',
                stock: producto.stock ? parseInt(producto.stock) : 0,
                cantidad: 1
            };

            // Buscar si el producto ya existe en el carrito
            const productoExistente = carrito.find(item => item.id_producto === prod.id_producto);

            if (productoExistente) {
                // Verificar stock
                if (productoExistente.cantidad >= prod.stock) {
                    Swal.fire({
                        title: 'Stock limitado',
                        text: `Solo hay ${prod.stock} unidades disponibles`,
                        icon: 'warning',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                    return;
                }
                productoExistente.cantidad++;
                console.log('Aumentada cantidad de producto existente:', productoExistente);
            } else {
                if (prod.stock <= 0) {
                    Swal.fire({
                        title: 'Producto agotado',
                        text: 'Este producto está temporalmente agotado',
                        icon: 'warning',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                    return;
                }
                carrito.push(prod);
                console.log('Agregado nuevo producto al carrito:', prod);
            }

            // Guardar en localStorage y actualizar interfaz
            localStorage.setItem('carrito', JSON.stringify(carrito));
            console.log('Carrito actualizado en localStorage:', carrito);

            // Actualizar interfaz inmediatamente
            actualizarContadorCarrito();
            actualizarCarritoModal();

            // Mostrar notificación
            Swal.fire({
                title: '¡Agregado!',
                text: 'Producto agregado al carrito',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo agregar el producto',
                icon: 'error',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        });
}

// Cambia la cantidad de un producto en el carrito, respetando límites de stock
function cambiarCantidad(idProducto, cambio) {
    console.log('Cambiando cantidad:', idProducto, 'cambio:', cambio);

    // Asegurar que tenemos el carrito más actualizado
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    const item = carrito.find(prod => prod.id_producto === idProducto);
    if (!item) {
        console.error('Producto no encontrado en el carrito');
        return;
    }

    console.log('Cantidad actual:', item.cantidad, 'stock:', item.stock);

    // Calcular nueva cantidad respetando límites
    let nuevaCantidad = item.cantidad;
    if (cambio === -1 && nuevaCantidad > 1) {
        nuevaCantidad--;
    } else if (cambio === 1 && nuevaCantidad < item.stock) {
        nuevaCantidad++;
    }

    // Asegurar que está dentro de límites
    if (nuevaCantidad < 1) nuevaCantidad = 1;
    if (nuevaCantidad > item.stock) nuevaCantidad = item.stock;

    // Actualizar cantidad
    item.cantidad = nuevaCantidad;
    console.log('Nueva cantidad:', item.cantidad);

    // Guardar en localStorage
    localStorage.setItem('carrito', JSON.stringify(carrito));
    console.log('Carrito actualizado en localStorage');

    // Actualizar la interfaz inmediatamente
    actualizarCarritoModal();
    actualizarContadorCarrito();
}

// Elimina un producto del carrito y actualiza la UI
function eliminarDelCarrito(idProducto) {
    console.log('Eliminando producto del carrito:', idProducto);

    // Asegurar que tenemos el carrito más actualizado
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    // Filtrar el producto
    carrito = carrito.filter(item => item.id_producto !== idProducto);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarritoModal();
    actualizarContadorCarrito();
}

// Funciones del modal
// Abre el modal del carrito y lo posiciona visualmente según la barra de navegación
function abrirModalCarrito() {
    actualizarCarritoModal();
    if (modal) {
        modal.style.display = 'block';

        // Posicionar el modal en la esquina superior derecha
        const modalContent = document.querySelector('.modal-content.modern-cart');
        if (modalContent) {
            // Obtener la posición del botón del carrito para alinear el modal
            const btnCarrito = document.getElementById('btnCarrito');
            if (btnCarrito) {
                const rect = btnCarrito.getBoundingClientRect();
                modalContent.style.position = 'fixed';
                modalContent.style.top = '0'; // Justo debajo de la barra de navegación
                modalContent.style.right = '20px';
                modalContent.style.margin = '0';

                // Asegurar que se muestre el botón VERIFICAR
                const btnVerificar = document.querySelector('.modern-cart-btn-checkout');
                if (btnVerificar) {
                    btnVerificar.style.display = 'block';
                    console.log('Asegurando que el botón VERIFICAR sea visible');
                }
            }
        }
    }
}

// Cierra el modal del carrito
function cerrarModalCarrito() {
    if (modal) modal.style.display = 'none';
}

// Función para actualizar todos los contadores del carrito de forma consistente
// Actualiza todos los contadores visuales del carrito en la UI
function actualizarContadorCarrito() {
    // Calculamos el total de items una sola vez
    const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);

    // Actualizar contador en la barra de navegación (botón CARRITO (X))
    const cantidadCarrito = document.getElementById('cantidadCarrito');
    if (cantidadCarrito) {
        cantidadCarrito.textContent = totalItems;
    }

    // Actualizar contador para el modal (X artículo(s))
    const cantidadArticulos = document.getElementById('cantidadArticulos');
    if (cantidadArticulos) {
        cantidadArticulos.textContent = totalItems;
    }

    // Actualizar también el contador flotante si existe
    const contador = document.querySelector('.contador-carrito');
    if (contador) {
        contador.textContent = totalItems;
        contador.style.display = totalItems > 0 ? 'block' : 'none';
    }

    // Actualizar cualquier otro elemento que muestre la cantidad
    const totalElement = document.getElementById('total-amount');
    if (totalElement && totalItems === 0) {
        totalElement.textContent = 'Q. 0.00'; // Reset del total cuando el carrito está vacío
    }
}

// Actualiza el modal del carrito con los productos actuales
// Renderiza el contenido del modal del carrito con los productos actuales
function actualizarCarritoModal() {
    // Cambiar a usar el selector correcto que coincide con el HTML
    const itemsCarrito = document.getElementById('items-carrito');
    if (!itemsCarrito) {
        console.error('No se encontró el contenedor de items del carrito #items-carrito');
        return;
    }

    // También actualizar el contador de artículos
    const cantidadArticulos = document.getElementById('cantidadArticulos');
    const totalElement = document.getElementById('total-amount');

    // Reducir logs innecesarios - solo mostrar si hay elementos en el carrito
    if (carrito.length > 0) {
        console.log('Carrito actual en actualizarCarritoModal:', carrito);
    }

    // Si el carrito está vacío, mostrar mensaje
    if (carrito.length === 0) {
        // Eliminar logs redundantes para el carrito vacío
        itemsCarrito.innerHTML = `
            <div class="carrito-vacio">
                <p>Tu carrito está vacío</p>
                <a href="/productos" class="btn-seguir-comprando">Seguir comprando</a>
            </div>
        `;

        // Actualizar contador y total para carrito vacío
        if (cantidadArticulos) cantidadArticulos.textContent = '0';
        if (totalElement) totalElement.textContent = 'Q. 0.00';
        return;
    }

    let total = 0;
    let cantidadTotal = 0;

    console.log('Renderizando items del carrito:', carrito.length);

    // Ahora usamos el selector correcto - itemsCarrito
    itemsCarrito.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        cantidadTotal += item.cantidad;

        // Controles de cantidad: deshabilitar - si cantidad==1, deshabilitar + si cantidad==stock
        const minusDisabled = item.cantidad <= 1 ? 'disabled' : '';
        const plusDisabled = item.cantidad >= item.stock ? 'disabled' : '';

        console.log(`Renderizando producto: ${item.nombre}, cantidad: ${item.cantidad}, precio: ${item.precio}`);

        return `
            <div class="modern-cart-item">
                <img src="${item.imagen || '/img/placeholder.png'}" alt="${item.nombre}" class="modern-cart-item-img">
                <div class="modern-cart-item-info">
                    <div class="modern-cart-item-name">${item.nombre.toUpperCase()}</div>
                    <div class="modern-cart-item-variant">${item.descripcion || ''}</div>
                    <div class="modern-cart-item-controls">
                        <button class="modern-cart-qty-btn" onclick="cambiarCantidad(${item.id_producto}, -1)" ${minusDisabled}>-</button>
                        <span>${item.cantidad}</span>
                        <button class="modern-cart-qty-btn" onclick="cambiarCantidad(${item.id_producto}, 1)" ${plusDisabled}>+</button>
                    </div>
                </div>
                <div class="modern-cart-item-right">
                    <div class="modern-cart-item-price">Q. ${(item.precio * item.cantidad).toFixed(2)}</div>
                    <button class="modern-cart-item-delete" onclick="eliminarDelCarrito(${item.id_producto})">ELIMINAR</button>
                </div>
            </div>
        `;
    }).join('');

    console.log(`Total calculado: ${total.toFixed(2)}, cantidad total: ${cantidadTotal}`);

    if (totalElement) {
        totalElement.textContent = `Q. ${total.toFixed(2)}`;
    }
    if (cantidadArticulos) {
        cantidadArticulos.textContent = cantidadTotal.toString();
    }


    actualizarContadorCarrito();

    console.log('Modal del carrito actualizado correctamente');
}



// LANDING: carga banner y productos destacados
// Carga dinámicamente el banner y los productos destacados en la landing page
function cargarLanding() {
    actualizarContadorCarrito();
    fetch('/api/landing')
        .then(res => res.json())
        .then(datos => {
            mostrarBanner(datos.banner);
            mostrarProductosDestacados(datos.productosDestacados);
        });
}
// Renderiza el banner principal en la landing page
function mostrarBanner(listaBanner) {
    const contenedor = document.getElementById('bannerPrincipal');
    if (!contenedor || !listaBanner.length) return;
    const banner = listaBanner[0];
    contenedor.innerHTML = `
        <img src="${banner.imagen}" alt="Banner principal">
        <div class="textoBanner">${banner.titulo}<br><span>${banner.descripcion}</span></div>
        <button class="botonComprar" onclick="window.location='productos.html'">COMPRAR AHORA</button>
    `;
}
// Renderiza los productos destacados en la landing page
function mostrarProductosDestacados(listaProductos) {
    const contenedor = document.getElementById('productosDestacados');
    if (!contenedor) return;
    contenedor.innerHTML = listaProductos.map(p => `
        <div class="tarjetaProducto">
            <img src="${p.imagen}" alt="${p.nombre}">
            <div class="nombreProducto">${p.nombre}</div>
            <div class="descripcionProducto">${p.descripcion}</div>
            <div class="precioProducto">${p.moneda}${p.precio}</div>
            <button class="botonAgregar" onclick="agregarAlCarrito(${p.idProducto})">Agregar</button>
        </div>
    `).join('');
}

// PRODUCTOS: carga galería de productos
// Carga y renderiza la galería de productos en la página de productos
async function cargarProductos() {
    try {
        actualizarContadorCarrito();
        const response = await fetch('/api/productos');

        if (!response.ok) {
            throw new Error('Error al cargar los productos');
        }

        const productos = await response.json();
        const contenedor = document.getElementById('galeriaProductos');

        if (productos.length === 0) {
            contenedor.innerHTML = `
                <div class="mensaje-no-productos">
                    <i class="fas fa-box-open"></i>
                    <p>No hay productos disponibles en este momento.</p>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = productos.map(p => `
            <div class="tarjetaProducto">
                <div class="imagen-producto">
                    <img src="${p.imagen || '/img/placeholder.png'}" 
                         alt="${p.nombre}"
                         loading="lazy">
                </div>
                <div class="info-producto">
                    <h3 class="nombreProducto">${p.nombre}</h3>
                    <p class="descripcionProducto">${p.descripcion || 'Sin descripción'}</p>
                    <div class="categoriaProducto">
                        <i class="fas fa-tag"></i> ${p.categoria_nombre || 'Sin categoría'}
                    </div>
                    <div class="precioProducto">
                        <span>Q. ${parseFloat(p.precio || 0).toFixed(2)}</span>
                    </div>
                    <button class="botonAgregar" onclick="agregarAlCarrito('${p.id_producto}')">AGREGAR AL CARRITO</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error al cargar productos:', error);
        const contenedor = document.getElementById('galeriaProductos');
        contenedor.innerHTML = `
            <div class="error-mensaje">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar los productos. Por favor, intenta de nuevo más tarde.</p>
            </div>
        `;
    }

}

// CARRITO: carga productos del carrito y sugerencias
// Renderiza el resumen del carrito en la página de carrito
function cargarCarrito() {
    actualizarCantidadCarrito();
    // Aquí se simula el carrito con localStorage
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const contenedor = document.getElementById('resumenCarrito');
    if (!carrito.length) {
        contenedor.innerHTML = '<p>Tu carrito está vacío.</p>';
        return;
    }
    let total = 0;
    contenedor.innerHTML = carrito.map(item => {
        total += item.precio * item.cantidad;
        return `<div class="itemCarrito">
            <img src="${item.imagen}" alt="${item.nombre}" class="imgCarrito">
            <div class="infoCarrito">
                <span class="nombreCarrito">${item.nombre}</span><br>
                <span class="precioCarrito">${item.moneda}${item.precio} x ${item.cantidad}</span>
                <button onclick="removerDelCarrito(${item.idProducto})">Eliminar</button>
            </div>
        </div>`;
    }).join('') + `<div class="totalCarrito">Total: $${total.toFixed(2)}</div>
    <button onclick="window.location='pago.html'" class="botonPagar">VERIFICAR</button>`;
}

// PAGO: muestra formulario y resumen
// Renderiza el resumen de compra y formulario de pago en la página de pago
function cargarPago() {
    // Asegurar que estamos usando la versión más actualizada del carrito
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    // Actualizar contador del carrito en la cabecera
    actualizarContadorCarrito();

    // Obtener el contenedor del resumen
    const resumen = document.getElementById('resumenPago');
    if (!resumen) {
        console.error('No se encontró el elemento resumenPago');
        return;
    }

    // Si el carrito está vacío, mostrar mensaje
    if (!carrito.length) {
        resumen.innerHTML = '<p>No hay productos en tu carrito.</p>';
        return;
    }

    // Calcular totales
    let subtotal = 0;
    let html = '';

    // Crear un contenedor con desplazamiento para los productos
    html += '<div class="pago-items-container pago-items-compact">';

    // Generar HTML para cada producto
    html += carrito.map(item => {
        const itemTotal = item.precio * item.cantidad;
        subtotal += itemTotal;
        return `
        <div class="pago-item">
            <img src="${item.imagen || '/img/placeholder.png'}" alt="${item.nombre}" class="pago-item-img">
            <div class="pago-item-info">
                <div class="pago-item-name">${item.nombre || 'Producto'}</div>
                <div class="pago-item-variant">${item.descripcion || ''} (${item.cantidad})</div>
            </div>
            <div class="pago-item-price">Q. ${(item.precio * item.cantidad).toFixed(2)}</div>
        </div>`;
    }).join('');

    // Cerrar el contenedor de productos
    html += '</div>';

    // Agregar un divisor antes del resumen
    html += '<div class="pago-divider"></div>';

    // Resumen de costos con diseño mejorado
    html += `
    <div class="pago-summary">
        <div class="pago-total-row">
            <span>Total</span>
            <span>Q. ${subtotal.toFixed(2)}</span>
        </div>
    </div>
    <button class="pago-submit" onclick="enviarPago(event)">FINALIZAR COMPRA</button>
    `;

    // Actualizar el contenido del resumen
    resumen.innerHTML = html;
}

// Envía los datos del formulario y carrito al backend para procesar el pago
function enviarPago(event) {
    event.preventDefault();

    // Obtener datos del formulario de contacto
    const nombre = document.getElementById('nombrePila').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    // Obtener datos de selección de pago
    const tipoTransaccion = document.getElementById('tipoTransaccion').value;
    const canalTerminal = document.getElementById('canalTerminal').value;
    // Obtener datos del carrito
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    // Obtener total
    let total = 0;
    carrito.forEach(item => {
        total += (item.precio * item.cantidad);
    });
    // Construir el objeto de datos para el backend
    const datosPago = {
        tipoTransaccion,
        canalTerminal,
        // Puedes agregar los campos requeridos por el backend aquí:
        // idEmpresa, idSucursal, codigoCliente, tipoMoneda, numeroReferencia
        montoTotal: total,
        datosContacto: {
            nombre,
            apellido,
            direccion,
            correo,
            telefono
        },
        carrito
    };
    // Enviar al backend para procesar el pago
    fetch('/api/pago/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPago)
    })
        .then(res => res.json())
        .then(respuesta => {
            mostrarResultadoTransaccion(respuesta);
        })
        .catch(error => {
            mostrarErrorTransaccion(error);
        });
}

// Mostrar el resultado de la transacción usando SweetAlert2
// Muestra el resultado de la transacción bancaria usando SweetAlert2
// Proporciona feedback visual según el estado de la transacción
function mostrarResultadoTransaccion(respuesta) {
    console.log('Mostrando resultado de la transacción:', respuesta);
    document.querySelector('.procesando-pago').style.display = 'none';
    document.getElementById('modalPago').style.display = 'none'; // Ocultar modal de pago

    // Determinar el tipo de icono y color según el código de estado
    let icon, title, confirmButtonColor;

    if (respuesta.exitoso) {
        icon = 'success';
        title = '¡Pago Exitoso!';
        confirmButtonColor = '#28a745';
    } else {
        // Determinamos el tipo de icono basado en el código de error
        switch (respuesta.codigoEstado) {
            case '03': // Sistema fuera de servicio
            case '99': // Error general
                icon = 'error';
                confirmButtonColor = '#dc3545';
                break;
            case '05': // Sin fondos suficientes
            case '06': // Cliente no identificado
            case '07': // Empresa/sucursal no válida
            case '08': // Monto inválido
                icon = 'warning';
                confirmButtonColor = '#ffc107';
                break;
            case '04': // Cancelada por usuario
            case '09': // Transacción duplicada
                icon = 'info';
                confirmButtonColor = '#17a2b8';
                break;
            default:
                icon = 'question';
                confirmButtonColor = '#6c757d';
        }
        title = 'Transacción no completada';
    }

    Swal.fire({
        icon: icon,
        title: title,
        text: respuesta.mensaje,
        confirmButtonText: respuesta.exitoso ? 'Continuar' : 'Intentar nuevamente',
        confirmButtonColor: confirmButtonColor,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        timer: null, // Asegurar que no hay timer automático
        willClose: (popup) => {
            console.log('SweetAlert cerrado por el usuario');
        }
    }).then((result) => {
        if (result.isConfirmed) {
            console.log('Usuario confirmó la alerta');
            if (respuesta.exitoso) {
                // Limpiar el carrito y redirigir al inicio
                console.log('Limpiando carrito y redirigiendo...');
                localStorage.removeItem('carrito');
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            } else {
                // Mostrar el formulario nuevamente
                document.getElementById('modalPagoForm').querySelector('button').style.display = 'block';
            }
        }
    });
}

// Mostrar error en la transacción usando SweetAlert2
// Muestra un mensaje de error si ocurre un fallo en la comunicación bancaria
function mostrarErrorTransaccion(error) {
    console.error('Mostrando error de la transacción:', error);
    document.querySelector('.procesando-pago').style.display = 'none';
    document.getElementById('modalPago').style.display = 'none'; // Ocultar modal de pago

    Swal.fire({
        icon: 'error',
        title: 'Error de comunicación',
        text: error.mensaje || 'Error al procesar la transacción. Por favor, intenta nuevamente.',
        confirmButtonText: 'Intentar nuevamente',
        confirmButtonColor: '#dc3545',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        timer: null // Desactivar cualquier timer
    }).then((result) => {
        if (result.isConfirmed) {
            // Mostrar el formulario nuevamente
            document.getElementById('modalPagoForm').querySelector('button').style.display = 'block';
        }
    });
}
