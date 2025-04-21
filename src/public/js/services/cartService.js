const cartService = {
    carrito: [],
    
    /**
     * Inicializa el carrito desde localStorage
     */
    inicializar: function() {
        this.carrito = JSON.parse(localStorage.getItem('carrito')) || [];
        return this.carrito;
    },
    
    /**
     * Guarda el carrito en localStorage
     */
    guardar: function() {
        localStorage.setItem('carrito', JSON.stringify(this.carrito));
    },
    
    /**
     * Obtiene el carrito actual
     * @returns {Array} - El array con los items del carrito
     */
    obtenerCarrito: function() {
        return this.carrito;
    },
    
    /**
     * Agrega un producto al carrito
     * @param {Object} producto - El producto a agregar
     * @param {number} cantidad - La cantidad a agregar (por defecto 1)
     * @returns {Object} - Resultado de la operación
     */
    agregarProducto: function(producto, cantidad = 1) {
        // Inicializar si es necesario
        if (!this.carrito) this.inicializar();
        
        // Verificar si el producto ya existe en el carrito
        const index = this.carrito.findIndex(item => item.id === producto.id);
        
        if (index !== -1) {
            // El producto ya existe, actualizar cantidad
            const nuevoStock = this.carrito[index].cantidad + cantidad;
            
            // Verificar si hay suficiente stock
            if (producto.stock && nuevoStock > producto.stock) {
                return {
                    exito: false,
                    mensaje: 'No hay suficiente stock disponible'
                };
            }
            
            this.carrito[index].cantidad = nuevoStock;
        } else {
            // Es un producto nuevo, agregarlo al carrito
            if (producto.stock && cantidad > producto.stock) {
                return {
                    exito: false,
                    mensaje: 'No hay suficiente stock disponible'
                };
            }
            
            this.carrito.push({
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagen,
                cantidad: cantidad,
                stock: producto.stock,
                descripcion: producto.descripcion
            });
        }
        
        // Guardar en localStorage
        this.guardar();
        
        return {
            exito: true,
            mensaje: 'Producto agregado al carrito',
            carrito: this.carrito
        };
    },
    
    /**
     * Actualiza la cantidad de un producto en el carrito
     * @param {number} id - ID del producto a actualizar
     * @param {number} cantidad - Nueva cantidad
     * @returns {Object} - Resultado de la operación
     */
    actualizarCantidad: function(id, cantidad) {
        // Inicializar si es necesario
        if (!this.carrito) this.inicializar();
        
        const index = this.carrito.findIndex(item => item.id === id);
        
        if (index === -1) {
            return {
                exito: false,
                mensaje: 'Producto no encontrado en el carrito'
            };
        }
        
        // Verificar que la cantidad sea al menos 1
        if (cantidad < 1) {
            return {
                exito: false,
                mensaje: 'La cantidad mínima es 1'
            };
        }
        
        // Verificar stock si es necesario
        if (this.carrito[index].stock && cantidad > this.carrito[index].stock) {
            return {
                exito: false,
                mensaje: 'No hay suficiente stock disponible'
            };
        }
        
        // Actualizar cantidad
        this.carrito[index].cantidad = cantidad;
        
        // Guardar en localStorage
        this.guardar();
        
        return {
            exito: true,
            mensaje: 'Cantidad actualizada',
            carrito: this.carrito
        };
    },
    
    /**
     * Elimina un producto del carrito
     * @param {number} id - ID del producto a eliminar
     * @returns {Object} - Resultado de la operación
     */
    eliminarProducto: function(id) {
        // Inicializar si es necesario
        if (!this.carrito) this.inicializar();
        
        const index = this.carrito.findIndex(item => item.id === id);
        
        if (index === -1) {
            return {
                exito: false,
                mensaje: 'Producto no encontrado en el carrito'
            };
        }
        
        // Eliminar producto
        this.carrito.splice(index, 1);
        
        // Guardar en localStorage
        this.guardar();
        
        return {
            exito: true,
            mensaje: 'Producto eliminado del carrito',
            carrito: this.carrito
        };
    },
    
    /**
     * Vacía completamente el carrito
     * @returns {Object} - Resultado de la operación
     */
    vaciarCarrito: function() {
        this.carrito = [];
        this.guardar();
        
        return {
            exito: true,
            mensaje: 'Carrito vaciado correctamente',
            carrito: []
        };
    },
    
    /**
     * Calcula el total del carrito
     * @returns {number} - El total del carrito
     */
    calcularTotal: function() {
        // Inicializar si es necesario
        if (!this.carrito) this.inicializar();
        
        return this.carrito.reduce((total, item) => {
            return total + (item.precio * item.cantidad);
        }, 0);
    },
    
    /**
     * Obtiene la cantidad total de items en el carrito
     * @returns {number} - Cantidad total de items
     */
    obtenerCantidadTotal: function() {
        // Inicializar si es necesario
        if (!this.carrito) this.inicializar();
        
        return this.carrito.reduce((total, item) => {
            return total + item.cantidad;
        }, 0);
    }
};

// Exportar el servicio para que sea accesible desde otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cartService;
} else {
    // Si estamos en el navegador, lo añadimos al objeto window
    window.cartService = cartService;
}
