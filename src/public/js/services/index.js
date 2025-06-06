// Inicializar el carrito
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar servicios que requieren acceso al DOM
    cartService.inicializar();
    
    // Actualizar el contador si existe en esta página
    const cantidadTotal = cartService.obtenerCantidadTotal();
    uiService.actualizarContadorCarrito(cantidadTotal);
});


// Variables globales para compatibilidad
let carrito = cartService.obtenerCarrito();

// Funciones de manejo del carrito
function actualizarContadorCarrito() {
    const cantidadTotal = cartService.obtenerCantidadTotal();
    uiService.actualizarContadorCarrito(cantidadTotal);
}

function mostrarCarrito() {
    cartService.inicializar();
    uiService.actualizarVistaCarrito(cartService.obtenerCarrito());
    uiService.toggleModalCarrito(true);
}

function ocultarCarrito() {
    uiService.toggleModalCarrito(false);
}

function agregarAlCarrito(producto, cantidad = 1) {
    const resultado = cartService.agregarProducto(producto, cantidad);
    
    if (resultado.exito) {
        carrito = cartService.obtenerCarrito();
        actualizarContadorCarrito();
        uiService.mostrarNotificacionProductoAgregado(producto);
    } else {
        // Mostrar error
        Swal.fire({
            title: 'Error',
            text: resultado.mensaje,
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }
    
    return resultado.exito;
}

function actualizarVistaCarrito() {
    uiService.actualizarVistaCarrito(cartService.obtenerCarrito());
}

function aumentarCantidad(id) {
    const item = cartService.obtenerCarrito().find(item => item.id === id);
    if (item) {
        const resultado = cartService.actualizarCantidad(id, item.cantidad + 1);
        if (resultado.exito) {
            carrito = cartService.obtenerCarrito();
            actualizarVistaCarrito();
        } else {
            // Mostrar error
            Swal.fire({
                title: 'Error',
                text: resultado.mensaje,
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
        }
    }
}

function disminuirCantidad(id) {
    const item = cartService.obtenerCarrito().find(item => item.id === id);
    if (item && item.cantidad > 1) {
        const resultado = cartService.actualizarCantidad(id, item.cantidad - 1);
        if (resultado.exito) {
            carrito = cartService.obtenerCarrito();
            actualizarVistaCarrito();
        }
    }
}

function eliminarDelCarrito(id) {
    const resultado = cartService.eliminarProducto(id);
    if (resultado.exito) {
        carrito = cartService.obtenerCarrito();
        actualizarContadorCarrito();
        actualizarVistaCarrito();
    }
}

function vaciarCarrito() {
    const resultado = cartService.vaciarCarrito();
    carrito = [];
    actualizarContadorCarrito();
    actualizarVistaCarrito();
}

// Funciones de la página de pago
function cargarPago() {
    cartService.inicializar();
    carrito = cartService.obtenerCarrito();
    actualizarContadorCarrito();
    uiService.actualizarResumenPago(carrito);
}

function enviarPago(event) {
    event.preventDefault();
    console.log('Iniciando proceso de envío de pago');
    
    // Validar que todos los campos del formulario de contacto estén completos
    const contactForm = document.getElementById('contactForm');
    
    // Usar el servicio de validación para verificar el formulario
    const formValido = validationService.validarFormularioRequerido(contactForm, () => {
        Swal.fire({
            title: 'Información incompleta',
            text: 'Por favor completa todos los campos de contacto antes de continuar',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
    });
    
    if (!formValido) return;
    
    // Si pasó la validación, mostrar el modal de pago
    const modal = document.getElementById('modalPago');
    modal.classList.add('show');
    
    // Generar un número de referencia aleatorio si no existe
    if (!document.getElementById('numeroReferencia').value) {
        document.getElementById('numeroReferencia').value = generarNumeroReferencia();
    }
    
    // Asegurar que el botón X cierre el modal
    const cerrarBtn = document.querySelector('.cerrar-modal');
    if (cerrarBtn) {
        cerrarBtn.addEventListener('click', function() {
            document.getElementById('modalPago').classList.remove('show');
        });
    }
    
    // Cerrar modal al hacer click fuera de él
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
    
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

// Funciones para procesar pagos
function generarNumeroReferencia() {
    // Generar un número aleatorio de exactamente 12 dígitos
    let numero = '';
    // El primer dígito no puede ser 0
    numero += Math.floor(Math.random() * 9) + 1;
    // Los otros 11 dígitos pueden ser cualquier número
    for (let i = 0; i < 11; i++) {
        numero += Math.floor(Math.random() * 10);
    }
    return numero;
}

function procesarPagoConBanco() {
    // Obtener todos los datos del formulario
    const tipoTransaccion = document.getElementById('tipoTransaccion').value;
    const canalTerminal = document.getElementById('canalTerminal').value;
    const idEmpresa = document.getElementById('idEmpresa').value;
    const idSucursal = document.getElementById('idSucursal').value;
    const codigoCliente = document.getElementById('codigoCliente').value;
    const tipoMoneda = document.getElementById('tipoMoneda').value;
    const numeroReferencia = document.getElementById('numeroReferencia').value;
    
    // Validar que todos los campos obligatorios estén seleccionados
    const camposFaltantes = [];
    
    if (!tipoTransaccion) {
        camposFaltantes.push('Tipo de Transacción');
    }
    
    if (!canalTerminal) {
        camposFaltantes.push('Canal/Terminal');
    }
    
    if (!tipoMoneda) {
        camposFaltantes.push('Tipo de Moneda');
    }
    
    if (!codigoCliente.trim()) {
        camposFaltantes.push('Código de Cliente');
    }

    if (!numeroReferencia.trim()) {
        camposFaltantes.push('Número de Referencia');
    }
    
    // Si hay campos faltantes, mostrar un solo mensaje con todos
    if (camposFaltantes.length > 0) {
        const mensaje = camposFaltantes.length === 1 
            ? `Por favor complete el campo: ${camposFaltantes[0]}`
            : `Por favor complete los siguientes campos:\n• ${camposFaltantes.join('\n• ')}`;
            
        Swal.fire({
            title: 'Campos requeridos',
            text: mensaje,
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    
    // Usar el servicio de validación para verificar código cliente y número de referencia
    if (!validationService.validarCodigoCliente(codigoCliente)) {
        Swal.fire({
            title: 'Código inválido',
            text: 'Por favor ingrese un código de cliente válido de 10 dígitos numéricos',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    
    if (!validationService.validarNumeroReferencia(numeroReferencia)) {
        Swal.fire({
            title: 'Referencia inválida',
            text: 'Por favor ingrese un número de referencia válido de 12 dígitos numéricos',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    
    // Obtener el total del carrito con 2 decimales, formateado como string de 10 caracteres
    const total = cartService.calcularTotal();
    
    // Formatear el monto para la trama (10 caracteres, incluyendo 2 decimales)
    const montoFormateado = formatearMonto(total);
    
    // Mostrar sección de procesamiento
    document.getElementById('modalPagoForm').querySelector('button').style.display = 'none';
    document.getElementById('resultado-transaccion').classList.remove('hidden');
    document.querySelector('.procesando-pago').style.display = 'flex';
    document.querySelector('.resultado-final').classList.add('hidden');
    
    // Generar la trama para el banco usando el número de referencia exactamente como se recibe
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
    
    // Enviar la trama al banco usando el servicio API
    apiService.enviarTramaAlBanco(trama, total)
        .then(respuesta => {
            uiService.mostrarResultadoTransaccion(respuesta);
        })
        .catch(error => {
            uiService.mostrarErrorTransaccion(error);
        });
}

// Funciones auxiliares para el procesamiento de pagos
function formatearMonto(monto) {
    // Multiplicar por 100 para eliminar el punto decimal y obtener céntimos
    const centimos = Math.round(monto * 100);
    // Convertir a string y rellenar con ceros a la izquierda hasta tener 10 caracteres
    return centimos.toString().padStart(10, '0');
}

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
    
    // Formatear el número de referencia a 12 dígitos
    const numeroReferenciaFormateado = numeroReferencia.padStart(12, '0');
    
    // Unir todos los componentes de la trama (Total 63 caracteres)
    // 14 + 2 + 2 + 4 + 2 + 11 + 2 + 10 + 2 + 12 + 2 = 63
    const tramaCompleta = fechaHora + tipoTransaccion + canalTerminal + idEmpresa + idSucursal + 
        codigoClienteFormateado + tipoMoneda + montoEntero + montoDecimal + numeroReferenciaFormateado + estado;
    
    return tramaCompleta;
}

function mostrarResultadoTransaccion(respuesta) {
    uiService.mostrarResultadoTransaccion(respuesta);
}

function mostrarErrorTransaccion(error) {
    uiService.mostrarErrorTransaccion(error);
}

// Función para cargar productos dinámicamente desde la API
async function cargarProductos() {
    try {
        const productos = await apiService.obtenerProductos();
        console.log('Productos cargados:', productos);
        // Aquí renderizarías los productos en la UI
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}
