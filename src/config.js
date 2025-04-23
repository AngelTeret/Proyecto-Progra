// Configuración de conexión a la base de datos MySQL
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Configuración de conexión con el servidor del banco
const BANCO_CONFIG = {
    host: '192.168.56.1',  // Dirección IP del servidor Java del banco
    puerto: 5000,          // Puerto usado por el servidor del banco

    // Valores por defecto usados al construir tramas bancarias
    defaults: {
        tipoTransaccion: '01',
        canalTerminal: '04',
        idEmpresa: '0001',
        idSucursal: '01',
        tipoMoneda: '01'
    }
};

// Configuración del puerto en el que corre el servidor Express
const SERVER_CONFIG = {
    port: 3000
};

// Exportar las configuraciones para uso en otras partes del sistema
module.exports = {
    DB_CONFIG,
    BANCO_CONFIG,
    SERVER_CONFIG
};
