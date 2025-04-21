const apiService = {
    /**
     * Realiza una petición GET a la API
     * @param {string} url - URL del endpoint
     * @returns {Promise<Object>} - Promesa con la respuesta
     */
    get: async function(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error en GET ${url}:`, error);
            throw error;
        }
    },
    
    /**
     * Realiza una petición POST a la API
     * @param {string} url - URL del endpoint
     * @param {Object} data - Datos a enviar
     * @returns {Promise<Object>} - Promesa con la respuesta
     */
    post: async function(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error en POST ${url}:`, error);
            throw error;
        }
    },
    
    /**
     * Envía la trama al banco a través del servidor
     * @param {string} trama - Trama bancaria a enviar
     * @param {number} montoTotal - Monto total de la transacción
     * @returns {Promise<Object>} - Promesa con la respuesta del banco
     */
    enviarTramaAlBanco: async function(trama, montoTotal) {
        console.log('Enviando trama al banco:', trama);
        console.log('Monto total de la transacción:', montoTotal);
        
        // Obtener los datos del formulario de contacto
        const datosContacto = {
            nombre: document.getElementById('nombrePila').value,
            apellido: document.getElementById('apellido').value,
            direccion: document.getElementById('direccion').value,
            correo: document.getElementById('correo').value,
            telefono: document.getElementById('telefono').value
        };
        
        console.log('Datos de contacto a enviar:', datosContacto);
        
        try {
            return await this.post('/api/pago/procesar', {
                trama: trama,
                montoTotal: montoTotal,
                datosContacto: datosContacto,
                carrito: JSON.parse(localStorage.getItem('carrito')) || []
            });
        } catch (error) {
            console.error('Error al procesar pago con el banco:', error);
            throw error;
        }
    },
    
    /**
     * Obtiene los productos del servidor
     * @returns {Promise<Array>} - Promesa con el array de productos
     */
    obtenerProductos: async function() {
        try {
            return await this.get('/api/productos');
        } catch (error) {
            console.error('Error al obtener productos:', error);
            throw error;
        }
    },
    
    /**
     * Obtiene un producto específico por su ID
     * @param {number} id - ID del producto
     * @returns {Promise<Object>} - Promesa con los datos del producto
     */
    obtenerProductoPorId: async function(id) {
        try {
            return await this.get(`/api/productos/${id}`);
        } catch (error) {
            console.error(`Error al obtener producto ${id}:`, error);
            throw error;
        }
    },
    
    /**
     * Obtiene las categorías del servidor
     * @returns {Promise<Array>} - Promesa con el array de categorías
     */
    obtenerCategorias: async function() {
        try {
            return await this.get('/api/categorias');
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            throw error;
        }
    }
};

// Exportar el servicio para que sea accesible desde otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
} else {
    // Si estamos en el navegador, lo añadimos al objeto window
    window.apiService = apiService;
}
