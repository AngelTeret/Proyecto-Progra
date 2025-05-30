// Validaciones de formularios y datos
const validationService = {
    /**
     * Valida un formulario HTML verificando si todos los campos requeridos están completos
     * @param {HTMLFormElement} formulario - El formulario a validar
     * @param {Function} onInvalid - Función a ejecutar cuando el formulario es inválido (opcional)
     * @returns {boolean} - true si todos los campos requeridos están completos, false en caso contrario
     */
    validarFormularioRequerido: function(formulario, onInvalid) {
        if (!formulario) return true; // Si no hay formulario, se considera válido
        
        // Obtener todos los campos requeridos
        const camposRequeridos = formulario.querySelectorAll('[required]');
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
        
        // Si hay una función de callback para manejo de error, ejecutarla
        if (!formValido && typeof onInvalid === 'function') {
            onInvalid(camposRequeridos);
        }
        
        return formValido;
    },
    
    /**
     * Valida que un código de cliente tenga el formato correcto
     * @param {string} codigoCliente - El código de cliente a validar
     * @returns {boolean} - true si el código es válido, false en caso contrario
     */
    validarCodigoCliente: function(codigoCliente) {
        return codigoCliente && codigoCliente.length === 10 && /^\d+$/.test(codigoCliente);
    },
    
    /**
     * Valida que un número de referencia tenga el formato correcto
     * @param {string} numeroReferencia - El número de referencia a validar
     * @returns {boolean} - true si el número es válido, false en caso contrario
     */
    validarNumeroReferencia: function(numeroReferencia) {
        return numeroReferencia && numeroReferencia.length === 12 && /^\d+$/.test(numeroReferencia);
    },
    
    /**
     * Valida el formato de un correo electrónico
     * @param {string} correo - El correo electrónico a validar
     * @returns {boolean} - true si el correo es válido, false en caso contrario
     */
    validarCorreo: function(correo) {
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regexCorreo.test(correo);
    },
    
    /**
     * Valida el formato de un número de teléfono
     * @param {string} telefono - El número de teléfono a validar
     * @returns {boolean} - true si el teléfono es válido, false en caso contrario
     */
    validarTelefono: function(telefono) {
        // Patrón básico: al menos 8 dígitos, puede contener +, espacios, guiones o paréntesis
        const regexTelefono = /^[+]?[(]?[0-9]{1,4}[)]?[-\s]?[0-9]{3,4}[-\s]?[0-9]{3,4}$/;
        return regexTelefono.test(telefono);
    }
};

// Exportar el servicio para que sea accesible desde otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = validationService;
} else {
    // Si estamos en el navegador, lo añadimos al objeto window
    window.validationService = validationService;
}
