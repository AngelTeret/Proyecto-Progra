// Variables globales
let carrito = [];
let modal;
let btnCarrito;
let btnCerrar;

// Inicializar elementos cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado - Inicializando carrito');
    
    // Cargar carrito desde localStorage
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    console.log('Carrito cargado:', carrito);
    
    // Referencias a elementos del DOM
    modal = document.getElementById('modalCarrito');
    btnCarrito = document.getElementById('btnCarrito');
    btnCerrar = document.querySelector('.close');
    const btnVerificar = document.querySelector('.modern-cart-btn-checkout');
    
    // Event listeners
    if (btnCarrito) {
        btnCarrito.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botón carrito clickeado');
            abrirModalCarrito();
        });
    }
    
    if (btnCerrar) {
        btnCerrar.addEventListener('click', function() {
            console.log('Cerrar modal');
            cerrarModalCarrito();
        });
    }
    
    // Agregar listener al botón VERIFICAR
    if (btnVerificar) {
        btnVerificar.addEventListener('click', function() {
            console.log('Redirigiendo a página de pago...');
            cerrarModalCarrito(); // Cerrar el modal del carrito primero
            // Asegurarse de usar la ruta correcta configurada en Express
            window.location.href = '/pago';
        });
    } else {
        console.warn('No se encontró el botón de verificar');
    }
    
    // Asegurarnos de que se actualicen los botones del carrito cuando cambia
    actualizarCarritoModal();
    actualizarContadorCarrito();
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            cerrarModalCarrito();
        }
    });
    
    // Cargar productos
    cargarProductos();
    
    // Actualizar contador y modal del carrito
    actualizarContadorCarrito();
    actualizarCarritoModal();
    
    // Monitoreo optimizado del carrito
    console.log('Configurando monitoreo del carrito');
    let ultimoEstadoCarrito = localStorage.getItem('carrito') || '[]';
    
    // Usar un intervalo más largo para verificar el carrito (2 segundos en lugar de 0.5)
    const intervaloMonitoreoCarrito = setInterval(function() {
        const estadoActual = localStorage.getItem('carrito') || '[]';
        
        // Solo actualizar si hay un cambio real y no loguear si el carrito está vacío
        if (ultimoEstadoCarrito !== estadoActual) {
            carrito = JSON.parse(estadoActual);
            
            // Reducir logs innecesarios cuando el carrito está vacío
            if (carrito.length > 0) {
                console.log('Sincronizando carrito con localStorage');
            }
            
            actualizarContadorCarrito();
            actualizarCarritoModal();
            ultimoEstadoCarrito = estadoActual;
        }
    }, 2000); // Verificar cada 2 segundos
});


// Funciones del carrito
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
                modalContent.style.top = '60px'; // Justo debajo de la barra de navegación
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

function cerrarModalCarrito() {
    if (modal) modal.style.display = 'none';
}

// Función para actualizar todos los contadores del carrito de forma consistente
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
                    <div class="modern-cart-item-price">Q. ${item.precio.toFixed(2)}</div>
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
function cargarLanding() {
    actualizarContadorCarrito();
    fetch('/api/landing')
        .then(res => res.json())
        .then(datos => {
            mostrarBanner(datos.banner);
            mostrarProductosDestacados(datos.productosDestacados);
        });
}
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

// Función que se llama al hacer clic en FINALIZAR COMPRA
function enviarPago(event) {
    event.preventDefault();
    console.log('Iniciando proceso de envío de pago');
    
    // Validar que todos los campos del formulario de contacto estén completos
    const contactForm = document.getElementById('contactForm');
    
    // Si el formulario existe y tiene campos requeridos, verificarlos
    if (contactForm) {
        // Usar el atributo required de los inputs para validar
        const camposRequeridos = contactForm.querySelectorAll('[required]');
        let formValido = true;
        
        // Comprobar cada campo requerido
        camposRequeridos.forEach(campo => {
            if (!campo.value.trim()) {
                formValido = false;
                // Marcar visualmente el campo como inválido
                campo.style.borderColor = 'red';
                // Restaurar el estilo cuando el usuario escriba
                campo.addEventListener('input', function() {
                    this.style.borderColor = '';
                });
            }
        });
        
        // Si algún campo está vacío, mostrar mensaje y detener
        if (!formValido) {
            Swal.fire({
                title: 'Información incompleta',
                text: 'Por favor completa todos los campos de contacto antes de continuar',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return; // Detener la ejecución
        }
    }
    
    // Si pasó la validación, mostrar el modal de pago
    const modal = document.getElementById('modalPago');
    modal.style.display = 'block';
    
    // Generar un número de referencia aleatorio si no existe
    if (!document.getElementById('numeroReferencia').value) {
        document.getElementById('numeroReferencia').value = generarNumeroReferencia();
    }
    
    // Asegurar que el botón X cierre el modal
    const cerrarBtn = document.querySelector('.cerrar-modal');
    if (cerrarBtn) {
        cerrarBtn.addEventListener('click', function() {
            document.getElementById('modalPago').style.display = 'none';
        });
    }
    
    // Vincular el botón de procesar pago a la función correspondiente
    const btnProcesarPago = document.getElementById('btnProcesarPago');
    if (btnProcesarPago) {
        // Eliminamos eventos previos para evitar duplicaciones
        const nuevoBtn = btnProcesarPago.cloneNode(true);
        btnProcesarPago.parentNode.replaceChild(nuevoBtn, btnProcesarPago);
        
        // Añadimos el nuevo listener
        nuevoBtn.addEventListener('click', function() {
            console.log('Botón PROCESAR PAGO clickeado');
            procesarPagoConBanco();
        });
    } else {
        console.error('No se encontró el botón para procesar el pago');
    }
}

// Generar un número de referencia único de 12 dígitos
function generarNumeroReferencia() {
    return Math.floor(Math.random() * 900000000000 + 100000000000).toString();
}

// Procesar el pago con el banco
function procesarPagoConBanco() {
    console.log('Iniciando procesamiento de pago');
    
    // Obtener todos los datos del formulario
    const tipoTransaccion = document.getElementById('tipoTransaccion').value;
    const canalTerminal = document.getElementById('canalTerminal').value;
    const idEmpresa = document.getElementById('idEmpresa').value;
    const idSucursal = document.getElementById('idSucursal').value;
    const codigoCliente = document.getElementById('codigoCliente').value;
    const tipoMoneda = document.getElementById('tipoMoneda').value;
    const numeroReferencia = document.getElementById('numeroReferencia').value;
    
    console.log('Datos del formulario obtenidos:', {
        tipoTransaccion, canalTerminal, idEmpresa,
        idSucursal, codigoCliente, tipoMoneda, numeroReferencia
    });
    
    // Validar que todos los campos estén completos
    if (!codigoCliente || codigoCliente.length !== 10 || !/^\d+$/.test(codigoCliente)) {
        alert('Por favor ingrese un código de cliente válido de 10 dígitos numéricos');
        console.error('Validación fallida: código cliente inválido', codigoCliente);
        return;
    }
    console.log('Validación de código cliente correcta');
    
    if (!numeroReferencia || numeroReferencia.length !== 12 || !/^\d+$/.test(numeroReferencia)) {
        alert('Por favor ingrese un número de referencia válido de 12 dígitos numéricos');
        console.error('Validación fallida: número de referencia inválido', numeroReferencia);
        return;
    }
    console.log('Validación de número de referencia correcta');
    
    // Obtener el total del carrito con 2 decimales, formateado como string de 10 caracteres
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let total = 0;
    carrito.forEach(item => {
        total += item.precio * item.cantidad;
    });
    
    // Formatear el monto para la trama (10 caracteres, incluyendo 2 decimales)
    const montoFormateado = formatearMonto(total);
    
    // Mostrar sección de procesamiento
    document.getElementById('modalPagoForm').querySelector('button').style.display = 'none';
    document.getElementById('resultado-transaccion').classList.remove('hidden');
    document.querySelector('.procesando-pago').style.display = 'flex';
    document.querySelector('.resultado-final').classList.add('hidden');
    
    // Generar la trama para el banco
    const trama = generarTramaBancaria(
        tipoTransaccion,
        canalTerminal,
        idEmpresa,
        idSucursal,
        codigoCliente,
        tipoMoneda,
        montoFormateado,
        numeroReferencia
    );
    
    console.log('Trama generada:', trama);
    console.log('Longitud de la trama:', trama.length);
    
    console.log('Preparando para enviar trama al banco...');
    console.log('Total a cobrar:', total);
    
    // Enviar la trama al banco inmediatamente (sin setTimeout)
    apiService.enviarTramaAlBanco(trama, total)
        .then(respuesta => {
            console.log('Respuesta recibida del banco:', respuesta);
            mostrarResultadoTransaccion(respuesta);
        })
        .catch(error => {
            console.error('Error en comunicación con el banco:', error);
            mostrarErrorTransaccion(error);
        });
}

// Formatear el monto para la trama (10 caracteres con 2 decimales)
function formatearMonto(monto) {
    // Multiplicar por 100 para eliminar el punto decimal y obtener céntimos
    const centimos = Math.round(monto * 100);
    // Convertir a string y rellenar con ceros a la izquierda hasta tener 10 caracteres
    return centimos.toString().padStart(10, '0');
}

// Generar la trama completa según las especificaciones del banco (63 caracteres)
function generarTramaBancaria(tipoTransaccion, canalTerminal, idEmpresa, idSucursal, codigoCliente, tipoMoneda, monto, numeroReferencia) {
    // Obtener la fecha y hora actual en formato yyyyMMddHHmmss (14 caracteres)
    const ahora = new Date();
    const fechaHora = ahora.getFullYear() +
                     ('0' + (ahora.getMonth() + 1)).slice(-2) +
                     ('0' + ahora.getDate()).slice(-2) +
                     ('0' + ahora.getHours()).slice(-2) +
                     ('0' + ahora.getMinutes()).slice(-2) +
                     ('0' + ahora.getSeconds()).slice(-2);
    
    // Formatear código cliente a 11 dígitos (el banco requiere 11 dígitos)
    const codigoClienteFormateado = codigoCliente.padStart(11, '0');
    
    // Separar monto en entero y decimal (10 dígitos para entero + 2 dígitos para decimal)
    const montoFloat = parseFloat(monto);
    const montoStr = montoFloat.toFixed(2); // Asegurar 2 decimales
    const [parteEntera, parteDecimal] = montoStr.split('.');
    const montoEntero = parteEntera.padStart(10, '0');
    const montoDecimal = parteDecimal.padStart(2, '0');
    
    // El estado siempre es '00' al enviar (2 caracteres)
    const estado = '00';
    
    // Unir todos los componentes de la trama (Total 63 caracteres)
    // 14 + 2 + 2 + 4 + 2 + 11 + 2 + 10 + 2 + 12 + 2 = 63
    const tramaCompleta = fechaHora + tipoTransaccion + canalTerminal + idEmpresa + idSucursal + 
           codigoClienteFormateado + tipoMoneda + montoEntero + montoDecimal + numeroReferencia + estado;
    
    console.log('Longitud de la trama generada:', tramaCompleta.length);
    return tramaCompleta;
}

// NOTA: Esta función ha sido reemplazada por apiService.enviarTramaAlBanco
// y se mantiene solo por compatibilidad con código existente.
// Ahora redirige las llamadas a apiService
async function enviarTramaAlBanco(trama, montoTotal) {
    console.log('Redirigiendo a apiService.enviarTramaAlBanco');
    return await apiService.enviarTramaAlBanco(trama, montoTotal);
}

// Mostrar el resultado de la transacción usando SweetAlert2
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
