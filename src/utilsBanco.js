// Utilidades para armar la trama y comunicarse con el banco
const net = require('net');

// Importar configuración centralizada
const { BANCO_CONFIG } = require('./config');

/**
 * Arma la trama de pago según la especificación del banco.
 * @param {Object} datosTrama - Datos para armar la trama
 * @returns {string} - Trama de 63 dígitos
 */
function armarTramaPago(datosTrama) {
    // Fecha y hora actual en formato AAAAMMDDHHMMSS
    const fechaHora = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14);
    const tipoTransaccion = (datosTrama.tipoTransaccion || '01').padStart(2, '0');
    const canalTerminal = (datosTrama.canalTerminal || '04').padStart(2, '0');
    const idEmpresa = (datosTrama.idEmpresa || '0001').padStart(4, '0');
    const idSucursal = (datosTrama.idSucursal || '01').padStart(2, '0');
    const codigoCliente = (datosTrama.codigoCliente || '').padStart(11, '0'); // CORREGIDO: 11 caracteres como especifica el banco
    const tipoMoneda = (datosTrama.tipoMoneda || '01').padStart(2, '0');
    
    // Uso directo de montoEntero y montoDecimal (según la nueva especificación)
    const montoEntero = (datosTrama.montoEntero || '0').padStart(10, '0');
    const montoDecimal = (datosTrama.montoDecimal || '00').padStart(2, '0');
    const montoCompleto = montoEntero + montoDecimal;  // Combinamos para la trama, pero mantenemos separados
    
    const numeroReferencia = (datosTrama.numeroReferencia || '').padStart(12, '0');
    const estado = '00'; // Siempre pendiente al enviar

    // Formato exacto según banco: 14 fecha + 2 transacción + 2 canal + 4 empresa + 2 sucursal + 11 cliente + 2 moneda + 10 monto_entero + 2 monto_decimal + 12 referencia + 2 estado
    let trama = fechaHora + tipoTransaccion + canalTerminal + idEmpresa + idSucursal +
        codigoCliente + tipoMoneda + montoCompleto + numeroReferencia + estado;
    
    console.log('Trama construida con longitud:', trama.length);
    console.log('Partes:', {
        fechaHora, // 14
        tipoTransaccion, // 2
        canalTerminal, // 2
        idEmpresa, // 4
        idSucursal, // 2
        codigoCliente, // 11
        tipoMoneda, // 2
        montoCompleto, // 12 (10+2)
        numeroReferencia, // 12
        estado // 2
    });
    
    // Validación final
    if (trama.length !== 63 || !/^\d{63}$/.test(trama)) {
        console.error('Longitud de la trama:', trama.length);
        console.error('Trama generada:', trama);
        throw new Error('La trama generada no tiene el formato correcto.');
    }
    
    console.log('Trama enviada al banco:', trama);
    return trama;
}



/**
 * Envía la trama al banco usando la clase Java compilada
 * 
 * Esta función utiliza el archivo ClienteBanco.class compilado para comunicarse
 * correctamente con el banco usando serialización Java nativa.
 * 
 * @param {string} trama - Trama a enviar (63 caracteres)
 * @param {string} [host=BANCO_CONFIG.host] - IP o hostname del banco (usa la configuración centralizada por defecto)
 * @param {number} [puerto=BANCO_CONFIG.puerto] - Puerto del banco (usa la configuración centralizada por defecto)
 * @returns {Promise<string>} - Respuesta del banco
 */
function enviarTramaBanco(trama, host = BANCO_CONFIG.host, puerto = BANCO_CONFIG.puerto) {
    console.log(`Conectando al banco en ${host}:${puerto} usando Java...`);
    console.log('Trama a enviar:', trama);
    
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        const path = require('path');
        
        // Ejecutar el cliente Java compilado usando process.spawn para evitar problemas de sintaxis
        const { spawn } = require('child_process');
        const javaExe = 'C:\\Program Files\\Java\\jdk-24\\bin\\java.exe';
        const params = [
            '-cp',
            __dirname,
            'modelo.ClienteBanco',  // Usamos la ruta completa incluyendo el paquete
            host,
            puerto.toString(),
            trama
        ];
        
        console.log('Ejecutando Java con parámetros:', params.join(' '));
        
        const proceso = spawn(javaExe, params, { cwd: __dirname });
        
        let stdoutData = '';
        let stderrData = '';
        
        proceso.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            console.log('Java stdout:', chunk);
        });
        
        proceso.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.error('Java stderr:', chunk);
        });
        
        proceso.on('close', (code) => {
            console.log(`Java proceso terminado con código ${code}`);
            console.log('Salida completa:', stdoutData);
            
            
            // Primera forma (patrón RESPUESTA_BANCO:)
            const respuestaMatch = stdoutData.match(/RESPUESTA_BANCO:(\d{63})/);
            
            // Segunda forma (buscar una trama de 63 dígitos en la salida)
            const tramaMatch = stdoutData.match(/(\d{63})/);
            
            // Tercera forma (buscar la trama completa que envió el banco)
            const bancoMatch = stdoutData.match(/Banco\s+<-\s+(\S+)/);
            
            if (respuestaMatch && respuestaMatch[1]) {
                console.log('Trama de respuesta encontrada (RESPUESTA_BANCO):', respuestaMatch[1]);
                resolve(respuestaMatch[1]);
            } else if (bancoMatch && bancoMatch[1] && bancoMatch[1].length >= 63) {
                console.log('Trama de respuesta encontrada (Banco <-):', bancoMatch[1]);
                // Tomamos los últimos 63 caracteres para asegurar que sea la trama correcta
                const respuesta = bancoMatch[1].substr(-63);
                resolve(respuesta);
            } else if (tramaMatch && tramaMatch[1]) {
                console.log('Trama de respuesta encontrada (números):', tramaMatch[1]);
                resolve(tramaMatch[1]);
            } else if (code !== 0) {
                console.error('Error en el proceso Java y no se encontró respuesta:', stderrData);
                reject(new Error('Error al comunicar con el banco: ' + stderrData));
            } else {
                console.error('No se encontró respuesta válida del banco');
                console.error('Salida estándar completa:', stdoutData);
                console.error('Salida de error completa:', stderrData);
                reject(new Error('No se pudo encontrar una respuesta válida del banco'));
            }
        });
        
        proceso.on('error', (err) => {
            console.error('Error al iniciar el proceso Java:', err);
            reject(new Error('Error al iniciar Java: ' + err.message));
        });
    });
}

/**
 * Establece la configuración del banco
 * @param {Object} config - Objeto con host y puerto
 */
function configurarBanco(config = {}) {
    if (config.host) BANCO_CONFIG.host = config.host;
    if (config.puerto) BANCO_CONFIG.puerto = config.puerto;
    console.log(`Banco configurado en ${BANCO_CONFIG.host}:${BANCO_CONFIG.puerto}`);
}

/**
 * Realiza el proceso completo de pago comunicándose con el banco
 * @param {Object} datosPago - Datos del pago
 * @returns {Promise<Object>} - Resultado del pago
 */
async function procesarPago(datosPago) {
    try {
        // 1. Armar la trama
        const trama = armarTramaPago(datosPago);
        
        // 2. Enviar al banco
        console.log('Enviando trama al banco...');
        const respuesta = await enviarTramaBanco(trama);
        console.log('Respuesta del banco recibida:', respuesta);
        
        // 3. Procesar la respuesta
        // Verificamos que la respuesta tenga el formato correcto
        if (!respuesta || respuesta.length !== 63) {
            throw new Error('Respuesta del banco con formato inválido');
        }
        
        // Extraemos el código de estado de la trama (últimos 2 dígitos)
        const estadoTransaccion = respuesta.substring(61, 63);
        
        // Evaluamos el resultado basado en el código de estado
        let resultado = {
            exitoso: estadoTransaccion === '01',
            codigoEstado: estadoTransaccion,
            mensaje: '',
            tramaRespuesta: respuesta
        };
        
        // Interpretamos todos los posibles códigos de estado
        switch (estadoTransaccion) {
            case '00':
                resultado.mensaje = 'Transacción pendiente';
                resultado.exitoso = false;
                break;
            case '01':
                resultado.mensaje = 'Pago procesado correctamente';
                resultado.exitoso = true;
                break;
            case '02':
                resultado.mensaje = 'Transacción rechazada por el banco';
                resultado.exitoso = false;
                break;
            case '03':
                resultado.mensaje = 'Sistema del banco fuera de servicio';
                resultado.exitoso = false;
                break;
            case '04':
                resultado.mensaje = 'Transacción cancelada por el usuario';
                resultado.exitoso = false;
                break;
            case '05':
                resultado.mensaje = 'La cuenta no cuenta con los fondos suficientes';
                resultado.exitoso = false;
                break;
            case '06':
                resultado.mensaje = 'Cliente no identificado';
                resultado.exitoso = false;
                break;
            case '07':
                resultado.mensaje = 'Empresa/Sucursal no válida';
                resultado.exitoso = false;
                break;
            case '08':
                resultado.mensaje = 'Monto inválido';
                resultado.exitoso = false;
                break;
            case '09':
                resultado.mensaje = 'Transacción duplicada';
                resultado.exitoso = false;
                break;
            default:
                resultado.mensaje = `Error en la transacción (código ${estadoTransaccion})`;
                resultado.exitoso = false;
                break;
        }
        
        return resultado;
        
    } catch (error) {
        console.error('Error al procesar pago:', error);
        return {
            exitoso: false,
            codigoEstado: '99', // Error general
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
