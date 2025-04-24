// Configuración de la conexión a la base de datos
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',       // Debe ser 'user' para MySQL2
    password: '',
    database: 'chatapp', // Debe ser 'database' para MySQL2
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Configuración del banco
const BANCO_CONFIG = {
    host: '192.168.1.33',  // Cambiado a localhost para pruebas locales
    puerto: 5000,
    // Valores por defecto para las tramas
    defaults: {
        tipoTransaccion: '01',
        canalTerminal: '04',
        idEmpresa: '0001',
        idSucursal: '01',
        tipoMoneda: '01'
    }
};

// Configuración del servidor
const SERVER_CONFIG = {
    port: 3000
};

// Exportar todas las configuraciones
module.exports = {
    DB_CONFIG,
    BANCO_CONFIG,
    SERVER_CONFIG
};
