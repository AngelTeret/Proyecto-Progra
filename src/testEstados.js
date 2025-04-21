/**
 * Herramienta para probar los diferentes estados de respuesta del banco
 * 
 * Estados de transacción:
 * 00 = Pendiente (estado inicial al enviar)
 * 01 = Aprobada
 * 02 = Rechazada
 * 03 = Sistema fuera de servicio
 * 04 = Cancelada por el usuario
 * 05 = La cuenta no cuenta con los fondos suficientes
 * 06 = Cliente no identificado
 * 07 = Empresa/Sucursal no válida
 * 08 = Monto inválido
 * 09 = Transacción duplicada
 */
const { spawn } = require('child_process');
const path = require('path');

// Función para probar un tipo específico de error
async function probarEstado(casoError) {
    // Datos de base para una transacción normal
    const datosBase = {
        fechaHora: new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14),
        tipoTransaccion: '01',
        canalTerminal: '01',
        idEmpresa: '0001',
        idSucursal: '01',
        codigoCliente: '01990231495',
        tipoMoneda: '01', // GTQ
        montoEntero: '0000001000', // 1000 quetzales
        montoDecimal: '00',
        numeroReferencia: '123456789012',
        estado: '00' // Estado inicial siempre es 00
    };

    // Aplicamos el caso de error específico
    let trama;
    let descripcionError;

    switch (casoError) {
        case 'APROBADA': // estado 01
            // Trama correcta (este es el caso base, nada que modificar)
            trama = armarTrama(datosBase);
            descripcionError = "Transacción normal correcta (espera estado 01)";
            break;
        case 'RECHAZADA': // estado 02
            // Formato incorrecto (añadir un caracter extra)
            const datosRechazada = {...datosBase};
            trama = armarTrama(datosRechazada) + "1"; // Añadir un dígito extra
            descripcionError = "Formato incorrecto - longitud 64 (espera estado 02)";
            break;
        case 'FUERA_SERVICIO': // estado 03
            // Para este caso necesitamos que el banco esté configurado para responder con 03
            // como no podemos modificar el banco, usamos un truco: enviar a un puerto incorrecto
            const datosFueraServicio = {...datosBase};
            trama = armarTrama(datosFueraServicio);
            descripcionError = "Intentando como fuera de servicio enviando a puerto 5001 (espera error de conexión)";
            break;
        case 'CANCELADA': // estado 04
            // Para simular cancelada
            const datosCancelada = {...datosBase};
            datosCancelada.estado = '04'; // Estado no válido en envío, debería fallar
            trama = armarTrama(datosCancelada);
            descripcionError = "Estado inicial incorrecto (espera estado 02)";
            break;
        case 'SIN_FONDOS': // estado 05
            // Para simular sin fondos suficientes
            const datosSinFondos = {...datosBase};
            datosSinFondos.montoEntero = '9999999999'; // Un monto muy alto
            trama = armarTrama(datosSinFondos);
            descripcionError = "Monto muy alto para forzar sin fondos (espera estado 05 o 02)";
            break;
        case 'CLIENTE_INVALIDO': // estado 06
            // Cliente no identificado
            const datosClienteInvalido = {...datosBase};
            datosClienteInvalido.codigoCliente = '99999999999'; // Cliente que no existe
            trama = armarTrama(datosClienteInvalido);
            descripcionError = "Cliente no identificado (espera estado 06)";
            break;
        case 'EMPRESA_INVALIDA': // estado 07
            // Empresa/Sucursal no válida
            const datosEmpresaInvalida = {...datosBase};
            datosEmpresaInvalida.idEmpresa = '9999';
            datosEmpresaInvalida.idSucursal = '99';
            trama = armarTrama(datosEmpresaInvalida);
            descripcionError = "Empresa/Sucursal inválida (espera estado 07)";
            break;
        case 'MONTO_INVALIDO': // estado 08
            // Monto inválido (por ejemplo, negativo o cero)
            const datosMontoInvalido = {...datosBase};
            datosMontoInvalido.montoEntero = '0000000000';
            datosMontoInvalido.montoDecimal = '00';
            trama = armarTrama(datosMontoInvalido);
            descripcionError = "Monto inválido (cero) (espera estado 08)";
            break;
        case 'DUPLICADA': // estado 09
            // Para transacción duplicada, normalmente necesitaríamos enviar exactamente la misma 
            // trama dos veces seguidas. Hacemos primero una normal y luego la repetimos.
            const datosDuplicada = {...datosBase};
            trama = armarTrama(datosDuplicada);
            descripcionError = "Transacción duplicada (enviando exactamente la misma trama dos veces) (espera estado 09 en la segunda)";
            await enviarTramaJava(trama); // Enviamos una primera vez
            console.log("Primera trama enviada, ahora enviando duplicada...");
            break;
        default:
            console.error(`Caso de error '${casoError}' no reconocido`);
            return;
    }

    console.log(`\n--- PROBANDO: ${descripcionError} ---`);
    console.log(`Trama a enviar: ${trama} (longitud: ${trama.length})`);
    
    try {
        // Importar configuración
        const { BANCO_CONFIG } = require('./config');
        
        // Para el caso especial de FUERA_SERVICIO, cambiamos el puerto
        const puerto = casoError === 'FUERA_SERVICIO' ? 5001 : BANCO_CONFIG.puerto;
        const respuesta = await enviarTramaJava(trama, BANCO_CONFIG.host, puerto);
        console.log("Respuesta del banco:", respuesta);
        console.log(`Estado devuelto: ${respuesta.slice(-2)}`);
    } catch (error) {
        console.error("Error al enviar trama:", error.message);
    }
}

// Función para armar la trama completa
function armarTrama(datos) {
    // Concatenamos todas las partes en el orden correcto
    let trama = datos.fechaHora + 
                datos.tipoTransaccion + 
                datos.canalTerminal + 
                datos.idEmpresa + 
                datos.idSucursal +
                datos.codigoCliente + 
                datos.tipoMoneda + 
                datos.montoEntero + 
                datos.montoDecimal + 
                datos.numeroReferencia + 
                datos.estado;
    
    // Verificamos que la trama tenga exactamente 63 caracteres (a menos que estemos probando un error específico)
    if (trama.length !== 63) {
        console.warn(`Advertencia: La trama tiene ${trama.length} caracteres, se esperaban 63.`);
    }
    
    return trama;
}

// Importar configuración si no está disponible en el ambito
let BANCO_CONFIG;
try {
    // Verificamos si ya está definido en el ambito actual
    BANCO_CONFIG = BANCO_CONFIG || require('./config').BANCO_CONFIG;
} catch (e) {
    // Si no está disponible, lo importamos
    BANCO_CONFIG = require('./config').BANCO_CONFIG;
}

// Función para enviar la trama usando el cliente Java
function enviarTramaJava(trama, host = BANCO_CONFIG.host, puerto = BANCO_CONFIG.puerto) {
    return new Promise((resolve, reject) => {
        // Ejecutar el cliente Java compilado
        const javaExe = 'C:\\Program Files\\Java\\jdk-24\\bin\\java.exe';
        const params = [
            '-cp',
            path.resolve(__dirname),
            'modelo.ClienteBanco',
            host,
            puerto.toString(),
            trama
        ];
        
        console.log(`Ejecutando: ${javaExe} ${params.join(' ')}`);
        
        const proceso = spawn(javaExe, params, { cwd: __dirname });
        
        let stdout = "";
        let stderr = "";
        
        proceso.stdout.on('data', (data) => {
            const linea = data.toString();
            stdout += linea;
            console.log('> ' + linea.trim());
        });
        
        proceso.stderr.on('data', (data) => {
            const linea = data.toString();
            stderr += linea;
            console.error('! ' + linea.trim());
        });
        
        proceso.on('close', (code) => {
            console.log(`Proceso Java terminado con código ${code}`);
            
            if (code !== 0) {
                return reject(new Error(`Error en el proceso Java (código ${code}): ${stderr}`));
            }
            
            // Buscar la respuesta del banco en la salida
            const respuestaMatch = stdout.match(/RESPUESTA_BANCO:(\d{63})/);
            if (respuestaMatch && respuestaMatch[1]) {
                console.log('Trama de respuesta encontrada:', respuestaMatch[1]);
                resolve(respuestaMatch[1]);
            } else {
                if (stderr) {
                    reject(new Error('Error del cliente Java: ' + stderr));
                } else {
                    reject(new Error('No se encontró una respuesta válida del banco en la salida'));
                }
            }
        });
        
        proceso.on('error', (err) => {
            console.error('Error al iniciar el proceso Java:', err);
            reject(new Error('Error al iniciar Java: ' + err.message));
        });
    });
}

// Función principal
async function main() {
    // Si se pasa un argumento, usamos ese caso de error
    const casoError = process.argv[2] || 'APROBADA';
    
    console.log(`
=======================================================
  HERRAMIENTA DE PRUEBA DE ESTADOS DEL BANCO
=======================================================
Probando caso: ${casoError}

Códigos de estado:
00 = Pendiente (estado inicial al enviar)
01 = Aprobada
02 = Rechazada
03 = Sistema fuera de servicio
04 = Cancelada por el usuario
05 = La cuenta no cuenta con los fondos suficientes
06 = Cliente no identificado
07 = Empresa/Sucursal no válida
08 = Monto inválido
09 = Transacción duplicada
=======================================================
    `);
    
    try {
        await probarEstado(casoError);
    } catch (error) {
        console.error("Error durante la prueba:", error.message);
    }
}

// Ejecutar
main().catch(console.error);
