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
    fetch(`/api/productos/${idProducto}`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener el producto');
            return res.json();
        })
        .then(producto => {
            if (!producto || producto.error) {
                throw new Error(producto.mensaje || 'Error al obtener el producto');
            }

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
            }

            // Guardar en localStorage y actualizar interfaz
            localStorage.setItem('carrito', JSON.stringify(carrito));

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
    // Asegurar que tenemos el carrito más actualizado
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    const item = carrito.find(prod => prod.id_producto === idProducto);
    if (!item) {
        return;
    }

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

    // Guardar en localStorage
    localStorage.setItem('carrito', JSON.stringify(carrito));

    // Actualizar la interfaz inmediatamente
    actualizarCarritoModal();
    actualizarContadorCarrito();
}

// Elimina un producto del carrito y actualiza la UI
function eliminarDelCarrito(idProducto) {
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
        return;
    }

    // También actualizar el contador de artículos
    const cantidadArticulos = document.getElementById('cantidadArticulos');
    const totalElement = document.getElementById('total-amount');

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

    itemsCarrito.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        cantidadTotal += item.cantidad;

        // Controles de cantidad: deshabilitar - si cantidad==1, deshabilitar + si cantidad==stock
        const minusDisabled = item.cantidad <= 1 ? 'disabled' : '';
        const plusDisabled = item.cantidad >= item.stock ? 'disabled' : '';

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

    if (totalElement) {
        totalElement.textContent = `Q. ${total.toFixed(2)}`;
    }
    if (cantidadArticulos) {
        cantidadArticulos.textContent = cantidadTotal.toString();
    }

    actualizarContadorCarrito();
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
    console.log('Cargando página de pago...');
    
    // Obtener el carrito del localStorage
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    
    if (!carrito.length) {
        window.location.href = '/productos';
        return;
    }

    // Actualizar el resumen de pago
    uiService.actualizarResumenPago(carrito);
    
    // Inicializar el formulario de pago con valores predeterminados
    uiService.inicializarFormularioPago();
    
    // Configurar el botón de procesar pago
    const btnProcesarPago = document.getElementById('btnProcesarPago');
    if (btnProcesarPago) {
        btnProcesarPago.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Obtener datos del formulario
            const datosPago = uiService.obtenerDatosFormularioPago();
            if (!datosPago) return; // La validación falló
            
            // Mostrar spinner de procesamiento
            document.getElementById('btnProcesarPago').style.display = 'none';
            document.getElementById('resultado-transaccion').classList.remove('hidden');
            
            try {
                // Obtener datos del contacto
                const datosContacto = {
                    nombre: document.getElementById('nombrePila').value,
                    apellido: document.getElementById('apellido').value,
                    direccion: document.getElementById('direccion').value,
                    correo: document.getElementById('correo').value,
                    telefono: document.getElementById('telefono').value
                };
                
                // Calcular monto total
                const montoTotal = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
                
                // Construir la trama bancaria
                const tramaEnviar = 
                    datosPago.tipoTransaccion +
                    datosPago.canalTerminal +
                    datosPago.idEmpresa.padStart(5, '0') +
                    datosPago.idSucursal.padStart(4, '0') +
                    datosPago.codigoCliente.padStart(8, '0') +
                    datosPago.tipoMoneda +
                    Math.floor(montoTotal).toString().padStart(10, '0') +
                    (montoTotal % 1).toFixed(2).substring(2).padStart(2, '0') +
                    datosPago.numeroReferencia;
                
                // Enviar la solicitud al servidor
                const response = await fetch('/api/pago/procesar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        trama: tramaEnviar,
                        montoTotal: montoTotal,
                        datosContacto: datosContacto,
                        carrito: carrito
                    })
                });
                
                const resultado = await response.json();
                console.log('Respuesta del servidor:', resultado);
                
                // Mostrar el resultado
                uiService.mostrarResultadoTransaccion(resultado);
                
            } catch (error) {
                console.error('Error al procesar el pago:', error);
                uiService.mostrarErrorTransaccion(error);
            }
        });
    }
}

// Mostrar el resultado de la transacción usando SweetAlert2
// Muestra el resultado de la transacción bancaria usando SweetAlert2
// Proporciona feedback visual según el estado de la transacción
function mostrarResultadoTransaccion(respuesta) {
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
        confirmButtonText: respuesta.exitoso ? 'Ver Factura' : 'Intentar nuevamente',
        confirmButtonColor: confirmButtonColor,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        timer: null, // Asegurar que no hay timer automático
        willClose: (popup) => {
        }
    }).then((result) => {
        if (result.isConfirmed) {
            if (respuesta.exitoso) {
                // Limpiar el carrito y redirigir a la factura
                localStorage.removeItem('carrito');
                window.location.href = `/factura/${respuesta.id_factura}`;
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
