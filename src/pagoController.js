const { enviarTramaBanco, configurarBanco } = require('./utilsBanco');
const { BANCO_CONFIG } = require('./config');
const db = require('./database');
const logger = require('./logger');

// Endpoint para mostrar disponibilidad del formulario de pago
exports.iniciarPago = (req, res) => {
    res.json({
        exito: true,
        mensaje: 'Formulario de pago listo'
    });
};

// Auxiliar para obtener nombre completo del contacto
function obtenerNombreCompleto(datosContacto) {
    if (!datosContacto || typeof datosContacto !== 'object') return 'N/A';
    return `${datosContacto.nombre || ''} ${datosContacto.apellido || ''}`.trim() || 'N/A';
}

// Auxiliar para verificar disponibilidad de datos de contacto
function contactoDisponible(datosContacto) {
    return datosContacto && typeof datosContacto === 'object';
}

// Endpoint principal para procesar pagos
exports.procesarPago = async (req, res) => {
    logger.info(`Inicio de pago | Cliente: ${obtenerNombreCompleto(req.body.datosContacto)} | Monto: ${req.body.montoTotal} | Trama: ${req.body.trama}`);
    console.log('Datos recibidos en el backend:', req.body);

    const { trama, montoTotal, datosContacto } = req.body;

    if (!trama) {
        logger.error('Datos incompletos - no se recibió la trama');
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'Se requiere la trama bancaria' 
        });
    }

    if (!contactoDisponible(datosContacto)) {
        console.log('No se recibieron datos de contacto - usando valores por defecto');
    }

    const datosTrama = {
        fecha_hora_trama: trama.substring(0, 14),
        tipo_transaccion: trama.substring(14, 16),
        canal_terminal: trama.substring(16, 18),
        id_empresa: trama.substring(18, 22),
        id_sucursal: trama.substring(22, 24),
        codigo_cliente: trama.substring(24, 35),
        tipo_moneda: trama.substring(35, 37),
        monto_entero: trama.substring(37, 47),
        monto_decimal: trama.substring(47, 49),
        numero_referencia: trama.substring(49, 61)
    };

    configurarBanco(BANCO_CONFIG);
    console.log(`Banco configurado en ${BANCO_CONFIG.host}:${BANCO_CONFIG.puerto}`);

    try {
        logger.info(`Datos de trama extraídos | Referencia: ${datosTrama.numero_referencia} | Cliente: ${obtenerNombreCompleto(datosContacto)}`);

        try {
            const numeroReferenciaUnico = await db.generarNumeroReferencia();
            datosTrama.numero_referencia = numeroReferenciaUnico;
            console.log('Referencia generada:', numeroReferenciaUnico);
        } catch (dbError) {
            logger.error(`Error al generar número de referencia: ${dbError.message}`);
        }

        const respuestaBanco = await enviarTramaBanco(trama);
        console.log('Respuesta recibida del banco:', respuestaBanco);

        const estadoBanco = respuestaBanco.slice(61, 63);
        let descripcionBanco = 'Desconocido';

        logger.info(`Respuesta banco | Estado: ${estadoBanco} | Descripción: ${respuestaBanco}`);

        switch (estadoBanco) {
            case '01': descripcionBanco = 'Aprobada'; break;
            case '02': descripcionBanco = 'Rechazada'; break;
            case '03': descripcionBanco = 'Sistema fuera de servicio'; break;
            case '04': descripcionBanco = 'Cancelada por usuario'; break;
            case '05': descripcionBanco = 'Fondos insuficientes'; break;
            case '06': descripcionBanco = 'Cliente no identificado'; break;
            case '07': descripcionBanco = 'Empresa/Sucursal inválida'; break;
            case '08': descripcionBanco = 'Monto inválido'; break;
            case '09': descripcionBanco = 'Transacción duplicada'; break;
            default:   descripcionBanco = 'Estado desconocido';
        }

        logger.info(`Resultado transacción | Estado: ${estadoBanco} (${descripcionBanco}) | Referencia: ${datosTrama.numero_referencia} | Cliente: ${obtenerNombreCompleto(datosContacto)}`);

        try {
            await db.crearTransaccionBancaria({
                tipo_transaccion: datosTrama.tipo_transaccion,
                canal_terminal: datosTrama.canal_terminal,
                id_empresa: datosTrama.id_empresa,
                id_sucursal: datosTrama.id_sucursal,
                codigo_cliente: datosTrama.codigo_cliente,
                tipo_moneda: datosTrama.tipo_moneda,
                monto_entero: datosTrama.monto_entero,
                monto_decimal: datosTrama.monto_decimal,
                numero_referencia: datosTrama.numero_referencia,
                fecha_hora_trama: datosTrama.fecha_hora_trama,
                estado_banco: estadoBanco,
                descripcion_estado: descripcionBanco,
                trama_enviada: trama,
                trama_recibida: respuestaBanco,
                nombre_cliente: contactoDisponible(datosContacto) ? obtenerNombreCompleto(datosContacto) : '',
                email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : '',
                telefono_cliente: contactoDisponible(datosContacto) ? datosContacto.telefono : '',
                direccion_cliente: contactoDisponible(datosContacto) ? datosContacto.direccion : ''
            });
        } catch (dbError) {
            logger.error(`Error al registrar la transacción bancaria: ${dbError.message}`);
        }

        if (estadoBanco === '01') {
            logger.info(`Transacción exitosa | Referencia: ${datosTrama.numero_referencia} | Cliente: ${obtenerNombreCompleto(datosContacto)} | Monto: ${montoTotal}`);
        } else if (estadoBanco === '09') {
            logger.warn(`Transacción duplicada | Referencia: ${datosTrama.numero_referencia} | Cliente: ${obtenerNombreCompleto(datosContacto)}`);
        } else {
            logger.error(`Transacción fallida | Estado: ${estadoBanco} (${descripcionBanco}) | Referencia: ${datosTrama.numero_referencia} | Cliente: ${obtenerNombreCompleto(datosContacto)}`);
        }

        res.json({
            exito: estadoBanco === '01',
            mensaje: estadoBanco === '01' ? 'Pago procesado correctamente' : 'Pago rechazado',
            estadoBanco,
            descripcionBanco,
            tramaEnviada: trama,
            respuestaBanco
        });

    } catch (err) {
        logger.error(`Error crítico al procesar pago: ${err.message}`);
        res.status(200).json({ 
            exito: false, 
            mensaje: 'Error al comunicar con el banco: ' + err.message,
            error: err.message 
        });
    }
};
