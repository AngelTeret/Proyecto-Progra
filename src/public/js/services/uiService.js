const uiService = {
    /**
     * Actualiza el contador del carrito en la interfaz
     * @param {number} cantidad - Cantidad de items en el carrito
     */
    actualizarContadorCarrito: function(cantidad) {
        const contadorCarrito = document.getElementById('contadorCarrito');
        if (contadorCarrito) {
            contadorCarrito.textContent = cantidad;
            // Hacer visible si hay productos
            contadorCarrito.style.display = cantidad > 0 ? 'block' : 'none';
        }
    },
    
    /**
     * Actualiza la vista del carrito en el modal
     * @param {Array} carrito - Array con los items del carrito
     */
    actualizarVistaCarrito: function(carrito) {
        const contenidoCarrito = document.getElementById('contenidoCarrito');
        if (!contenidoCarrito) return;
        
        if (!carrito || carrito.length === 0) {
            contenidoCarrito.innerHTML = '<p class="carritoVacio">El carrito está vacío</p>';
            return;
        }
        
        let total = 0;
        let html = '';
        
        // Generar HTML para cada producto
        carrito.forEach(item => {
            const itemTotal = item.precio * item.cantidad;
            total += itemTotal;
            
            html += `
            <div class="itemCarrito">
                <img src="${item.imagen || '/img/placeholder.png'}" alt="${item.nombre}" class="imagenCarrito">
                <div class="detallesItemCarrito">
                    <h3 class="nombreProductoCarrito">${item.nombre}</h3>
                    <p class="precioProductoCarrito">Q. ${item.precio}</p>
                    <div class="controlesCantidad">
                        <button class="botonCantidad" onclick="disminuirCantidad(${item.id})">-</button>
                        <span class="cantidadProducto">${item.cantidad}</span>
                        <button class="botonCantidad" onclick="aumentarCantidad(${item.id})">+</button>
                    </div>
                </div>
                <div class="precioTotalItem">Q. ${itemTotal.toFixed(2)}</div>
                <button class="botonEliminarItem" onclick="eliminarDelCarrito(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        });
        
        // Agregar el total y botón de pago
        html += `
        <div class="totalCarrito">Total: Q. ${total.toFixed(2)}</div>
        <button onclick="window.location='pago.html'" class="botonPagar">VERIFICAR</button>`;
        
        contenidoCarrito.innerHTML = html;
    },
    
    /**
     * Actualiza la vista de resumen de pago
     * @param {Array} carrito - Array con los items del carrito
     */
    actualizarResumenPago: function(carrito) {
        const resumen = document.getElementById('resumenPago');
        if (!resumen) return;
        
        if (!carrito || carrito.length === 0) {
            resumen.innerHTML = '<p>No hay productos en tu carrito.</p>';
            return;
        }
        
        // Calcular totales
        let subtotal = 0;
        let html = '';
        
        // Crear un contenedor con desplazamiento para los productos
        html += '<div class="pago-items-container pago-items-compact">';
        
        // Generar HTML para cada producto
        carrito.forEach(item => {
            const itemTotal = item.precio * item.cantidad;
            subtotal += itemTotal;
            
            html += `
            <div class="pago-item">
                <img src="${item.imagen || '/img/placeholder.png'}" alt="${item.nombre}" class="pago-item-img">
                <div class="pago-item-info">
                    <div class="pago-item-name">${item.nombre || 'Producto'}</div>
                    <div class="pago-item-variant">${item.descripcion || ''} (${item.cantidad})</div>
                </div>
                <div class="pago-item-price">Q. ${itemTotal.toFixed(2)}</div>
            </div>`;
        });
        
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
    },
    
    /**
     * Muestra u oculta el modal del carrito
     * @param {boolean} mostrar - true para mostrar, false para ocultar
     */
    toggleModalCarrito: function(mostrar) {
        const modal = document.getElementById('modalCarrito');
        if (modal) {
            modal.style.display = mostrar ? 'block' : 'none';
        }
    },
    
    /**
     * Muestra una notificación de producto agregado al carrito
     * @param {Object} producto - El producto agregado
     */
    mostrarNotificacionProductoAgregado: function(producto) {
        Swal.fire({
            title: '¡Producto agregado!',
            text: `${producto.nombre} se ha añadido a tu carrito`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    },
    
    /**
     * Muestra el resultado de una transacción bancaria
     * @param {Object|string} respuesta - Respuesta del banco (puede ser un objeto o un string)
     */
    mostrarResultadoTransaccion: function(respuesta) {
        console.log('Mostrando resultado de transacción:', respuesta);
        
        // Ocultar spinner de procesamiento
        document.querySelector('.procesando-pago').style.display = 'none';
        
        // Mostrar sección de resultado
        const resultadoFinal = document.querySelector('.resultado-final');
        resultadoFinal.classList.remove('hidden');
        
        // Obtener elementos para personalizar
        const iconoResultado = resultadoFinal.querySelector('.icono-resultado');
        const mensajeResultado = resultadoFinal.querySelector('.mensaje-resultado');
        
        // Determinar el código de estado según el tipo de respuesta recibida
        let estado;
        
        if (typeof respuesta === 'string') {
            // Si es un string (trama directa), tomar los últimos 2 dígitos
            estado = respuesta.slice(-2);
            console.log('Estado obtenido de trama directa:', estado);
        } else if (typeof respuesta === 'object') {
            // Si es un objeto (respuesta del API), usar el estadoBanco o extraer de respuestaBanco
            if (respuesta.estadoBanco) {
                estado = respuesta.estadoBanco;
                console.log('Estado obtenido de objeto.estadoBanco:', estado);
            } else if (respuesta.respuestaBanco && typeof respuesta.respuestaBanco === 'string') {
                estado = respuesta.respuestaBanco.slice(-2);
                console.log('Estado obtenido de objeto.respuestaBanco:', estado);
            } else {
                // Si no podemos determinar el estado, usar un valor por defecto
                console.error('No se pudo determinar el estado de la transacción:', respuesta);
                estado = '00'; // Estado desconocido/error
            }
        } else {
            console.error('Formato de respuesta no reconocido:', respuesta);
            estado = '00';
        }
        
        let titulo, mensaje, icono, btnTexto, accionConfirmar;
        
        // Configurar notificación según el estado
        switch (estado) {
            case '01': // Transacción aprobada
                titulo = "¡Pago Aprobado!";
                mensaje = "Tu transacción ha sido aprobada. Gracias por tu compra.";
                icono = "success";
                btnTexto = "Regresar al inicio";
                accionConfirmar = () => {
                    // Vaciar carrito y redirigir al inicio
                    localStorage.removeItem('carrito');
                    window.location.href = '/';
                };
                break;
                
            case '02': // Transacción rechazada
                titulo = "Transacción Rechazada";
                mensaje = "Lo sentimos, el banco ha rechazado la transacción. Verifica tus datos e intenta nuevamente.";
                icono = "error";
                btnTexto = "Intentar nuevamente";
                break;
                
            case '03': // Sistema fuera de servicio
                titulo = "Banco Fuera de Servicio";
                mensaje = "El sistema bancario se encuentra fuera de servicio en este momento. Por favor intenta más tarde.";
                icono = "error";
                btnTexto = "Aceptar";
                break;
                
            case '04': // Cancelada por usuario
                titulo = "Transacción Cancelada";
                mensaje = "Has cancelado la transacción. Tu carrito se mantiene intacto si deseas intentar nuevamente.";
                icono = "info";
                btnTexto = "Volver";
                break;
                
            case '05': // Sin fondos suficientes
                titulo = "Fondos Insuficientes";
                mensaje = "La cuenta no tiene fondos suficientes para realizar esta compra.";
                icono = "warning";
                btnTexto = "Intentar con otro método";
                break;
                
            case '06': // Cliente no identificado
                titulo = "Cliente No Identificado";
                mensaje = "El banco no pudo identificar al cliente. Verifica tus datos e intenta nuevamente.";
                icono = "warning";
                btnTexto = "Revisar datos";
                break;
                
            case '07': // Empresa/Sucursal inválida
                titulo = "Datos Comercio Incorrectos";
                mensaje = "Los datos del comercio no son válidos. Contacta con atención al cliente.";
                icono = "warning";
                btnTexto = "Entendido";
                break;
                
            case '08': // Monto inválido
                titulo = "Monto Inválido";
                mensaje = "El monto de la transacción no es válido. Intenta nuevamente o contacta a soporte.";
                icono = "warning";
                btnTexto = "Entendido";
                break;
                
            case '09': // Transacción duplicada
                titulo = "Transacción Duplicada";
                mensaje = "Esta transacción ya ha sido procesada anteriormente. Tu compra ya está registrada.";
                icono = "info";
                btnTexto = "Continuar";
                break;
                
            default:
                titulo = "Estado Desconocido";
                mensaje = "Se recibió una respuesta desconocida del banco. Por favor contacta a soporte.";
                icono = "question";
                btnTexto = "Aceptar";
        }
        
        // Mostrar notificación SweetAlert
        Swal.fire({
            title: titulo,
            text: mensaje,
            icon: icono,
            confirmButtonText: btnTexto
        }).then((result) => {
            if (result.isConfirmed && typeof accionConfirmar === 'function') {
                accionConfirmar();
            }
        });
        
        // Ocultar completamente la sección de resultado en el modal
        // para evitar mostrar texto duplicado
        resultadoFinal.classList.add('hidden');
        
        // Mostrar botón para cerrar modal
        document.getElementById('modalPagoForm').querySelector('button').style.display = 'block';
        document.getElementById('modalPagoForm').querySelector('button').textContent = btnTexto;
    },
    
    /**
     * Muestra un error en la transacción bancaria
     * @param {Error} error - Error ocurrido
     */
    mostrarErrorTransaccion: function(error) {
        console.error('Error en transacción:', error);
        
        // Ocultar spinner de procesamiento
        document.querySelector('.procesando-pago').style.display = 'none';
        
        // Mostrar sección de resultado
        const resultadoFinal = document.querySelector('.resultado-final');
        resultadoFinal.classList.remove('hidden');
        
        // Personalizar elementos de error
        const iconoResultado = resultadoFinal.querySelector('.icono-resultado');
        const mensajeResultado = resultadoFinal.querySelector('.mensaje-resultado');
        
        iconoResultado.className = 'icono-resultado icono-error';
        mensajeResultado.textContent = 'Error en la comunicación con el banco. Por favor intenta más tarde.';
        
        // Mostrar botón para cerrar modal
        document.getElementById('modalPagoForm').querySelector('button').style.display = 'block';
        
        // Mostrar SweetAlert con el error
        Swal.fire({
            title: 'Error de Comunicación',
            text: 'No se pudo establecer comunicación con el banco. Por favor intenta nuevamente más tarde.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }
};

// Exportar el servicio para que sea accesible desde otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = uiService;
} else {
    // Si estamos en el navegador, lo añadimos al objeto window
    window.uiService = uiService;
}
