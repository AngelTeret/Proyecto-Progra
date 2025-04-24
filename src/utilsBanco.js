const net = require('net');
const { BANCO_CONFIG } = require('./config');
const logger = require('./logger');

// Ruta al ejecutable de Java configurada en el archivo config.js
const JAVA_BIN = BANCO_CONFIG.javaBin || 'C:\\Program Files\\Java\\jdk-24\\bin\\java.exe';

// Mostrar logs solo si estamos en entorno de desarrollo
function devLog(...args) {
    if (process.env.NODE_ENV === 'development') console.log(...args);
    if (logger?.debug) logger.debug(args.map(String).join(' '));
}

/**
 * Arma la trama bancaria con base en los datos del pago.
 * Verifica formato y estructura según especificación del banco.
 */
function armarTramaPago(datosTrama) {
    if (datosTrama.codigoCliente && isNaN(Number(datosTrama.codigoCliente))) {
        throw new Error('Código cliente inválido');
    }
    if (datosTrama.montoEntero && isNaN(Number(datosTrama.montoEntero))) {
        throw new Error('Monto entero inválido');
    }
    if (datosTrama.montoDecimal && isNaN(Number(datosTrama.montoDecimal))) {
        throw new Error('Monto decimal inválido');
    }

    // Construcción secuencial de la trama en formato fijo de 63 caracteres
    const fechaHora = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const tipoTransaccion = (datosTrama.tipoTransaccion || '01').padStart(2, '0');
    const canalTerminal = (datosTrama.canalTerminal || '04').padStart(2, '0');
    const idEmpresa = (datosTrama.idEmpresa || '0001').padStart(4, '0');
    const idSucursal = (datosTrama.idSucursal || '01').padStart(2, '0');
    const codigoCliente = (datosTrama.codigoCliente || '').padStart(11, '0');
    const tipoMoneda = (datosTrama.tipoMoneda || '01').padStart(2, '0');
    const montoEntero = (datosTrama.montoEntero || '0').padStart(10, '0');
    const montoDecimal = (datosTrama.montoDecimal || '00').padStart(2, '0');
    const montoCompleto = montoEntero + montoDecimal;
    const numeroReferencia = (datosTrama.numeroReferencia || '').padStart(12, '0');
    const estado = '00'; // Estado inicial (pendiente)

    const trama = fechaHora + tipoTransaccion + canalTerminal + idEmpresa + idSucursal +
        codigoCliente + tipoMoneda + montoCompleto + numeroReferencia + estado;

    if (trama.length !== 63 || !/^\d{63}$/.test(trama)) {
        throw new Error('La trama generada no tiene el formato correcto.');
    }

    return trama;
}

/**
 * Envía la trama al banco por medio de un proceso Java.
 * La clase Java ClienteBanco maneja la conexión y respuesta.
 */
function enviarTramaBanco(trama, host = BANCO_CONFIG.host, puerto = BANCO_CONFIG.puerto) {
    if (!/^\d{63}$/.test(trama)) {
        return Promise.reject(new Error('La trama a enviar no tiene el formato correcto.'));
    }

    devLog(`Conectando al banco en ${host}:${puerto} usando Java...`);
    return ejecutarProcesoJava(trama, host, puerto);
}

/**
 * Ejecuta el proceso Java (modelo.ClienteBanco) que se comunica con el servidor de banco.
 */
function ejecutarProcesoJava(trama, host, puerto) {
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');

        const params = [
            '-cp',
            __dirname,
            'modelo.ClienteBanco',
            host,
            puerto.toString(),
            trama
        ];

        const proceso = spawn(JAVA_BIN, params, {
            cwd: __dirname,
            timeout: 10000 // Tiempo máximo de espera: 10 segundos
        });

        let stdoutData = '';
        let stderrData = '';

        const timeoutHandler = setTimeout(() => {
            proceso.kill('SIGKILL');
            reject(new Error('Timeout al esperar respuesta del banco'));
        }, 11000);

        proceso.stdout.on('data', (data) => {
            stdoutData += data.toString();
            devLog('Java stdout:', data.toString());
        });

        proceso.stderr.on('data', (data) => {
            stderrData += data.toString();
            devLog('Java stderr:', data.toString());
        });

        proceso.on('close', (code) => {
            clearTimeout(timeoutHandler);
            devLog(`Java finalizado con código ${code}`);

            const respuestaMatch = stdoutData.match(/RESPUESTA_BANCO:(\d{63})/);

            if (respuestaMatch?.[1]) {
                return resolve(respuestaMatch[1]);
            }

            if (code !== 0) {
                return reject(new Error('Error al comunicar con el banco: ' + stderrData));
            }

            return reject(new Error('No se pudo encontrar una respuesta válida del banco'));
        });

        proceso.on('error', (err) => {
            clearTimeout(timeoutHandler);
            reject(new Error('Error al iniciar Java: ' + err.message));
        });
    });
}

/**
 * Configura los valores globales del banco (host y puerto).
 */
function configurarBanco(config = {}) {
    if (config.host) BANCO_CONFIG.host = config.host;
    if (config.puerto) BANCO_CONFIG.puerto = config.puerto;
}

/**
 * Procesa un pago completo:
 * 1. Genera la trama.
 * 2. Envía al banco.
 * 3. Interpreta la respuesta.
 */
async function procesarPago(datosPago) {
    try {
        const trama = armarTramaPago(datosPago);
        const respuesta = await enviarTramaBanco(trama);

        if (!respuesta || respuesta.length !== 63) {
            throw new Error('Respuesta del banco con formato inválido');
        }

        const estado = respuesta.substring(61, 63);

        let mensaje = {
            '00': 'Transacción pendiente',
            '01': 'Pago procesado correctamente',
            '02': 'Transacción rechazada',
            '03': 'Banco fuera de servicio',
            '04': 'Cancelada por el usuario',
            '05': 'Fondos insuficientes',
            '06': 'Cliente no identificado',
            '07': 'Empresa/Sucursal no válida',
            '08': 'Monto inválido',
            '09': 'Transacción duplicada'
        }[estado] || `Error en la transacción (código ${estado})`;

        return {
            exitoso: estado === '01',
            codigoEstado: estado,
            mensaje,
            tramaRespuesta: respuesta
        };
    } catch (error) {
        return {
            exitoso: false,
            codigoEstado: '99',
            mensaje: 'Error al comunicar con el banco: ' + error.message
        };
    }
}

module.exports = {
    armarTramaPago,
    enviarTramaBanco,
    configurarBanco,
    procesarPago,
    BANCO_CONFIG
};
