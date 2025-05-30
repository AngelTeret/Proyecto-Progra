const { enviarTramaBanco, configurarBanco } = require('./utilsBanco');
const { BANCO_CONFIG } = require('./config');
const db = require('./database');
const logger = require('./logger');
const { procesarFactura } = require('./controllers/facturaController');

// Función auxiliar para registrar eventos en la nueva bitácora
async function registrarEventoBitacora(tipo, estado, descripcion, datos_adicionales = {}, numero_referencia = null, otros_datos = {}) {
    try {
        // Reemplazar cualquier formato de monto incorrecto en la descripción
        descripcion = descripcion.replace(/\$(\d+(\.\d{1,2})?)/g, 'Q. $1');
        descripcion = descripcion.replace(/Monto:\s*(\d+(\.\d{1,2})?)/g, 'Monto: Q. $1');
        descripcion = descripcion.replace(/Total:\s*(\d+(\.\d{1,2})?)/g, 'Total: Q. $1');
        
        // Asegurarnos que el monto siempre se guarde como número en la tabla
        let montoParaGuardar = null;
        
        // Si hay un monto en datos_adicionales o en otros_datos, lo procesamos
        if (datos_adicionales.monto !== undefined) {
            montoParaGuardar = typeof datos_adicionales.monto === 'string' ? 
                parseFloat(datos_adicionales.monto.replace(/[^0-9.]/g, '')) : 
                parseFloat(datos_adicionales.monto);
            
            datos_adicionales.monto_formateado = `Q. ${montoParaGuardar.toFixed(2)}`;
            delete datos_adicionales.monto;
        }
        
        if (otros_datos.monto !== undefined) {
            montoParaGuardar = typeof otros_datos.monto === 'string' ? 
                parseFloat(otros_datos.monto.replace(/[^0-9.]/g, '')) : 
                parseFloat(otros_datos.monto);
            
            otros_datos.monto_formateado = `Q. ${montoParaGuardar.toFixed(2)}`;
            delete otros_datos.monto;
        }

        // Asegurar que cualquier otro campo que contenga montos use el formato correcto
        if (datos_adicionales.total_formateado) {
            const total = parseFloat(datos_adicionales.total_formateado.replace(/[^0-9.]/g, ''));
            datos_adicionales.total_formateado = `Q. ${total.toFixed(2)}`;
        }

        await db.crearRegistroBitacoraTransacciones({
            tipo_evento: tipo,
            estado: estado,
            descripcion,
            datos_adicionales,
            numero_referencia,
            monto: montoParaGuardar,
            ...otros_datos
        });
    } catch (error) {
        logger.error(`Error al registrar en bitácora: ${error.message}`);
    }
}

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

// Auxiliar para verificar si hay datos de contacto disponibles
function contactoDisponible(datosContacto) {
    return datosContacto && typeof datosContacto === 'object';
}

// Procesar el pago
exports.procesarPago = async (req, res) => {
    const { trama, montoTotal, datosContacto, carrito: detallesCompra, numeroReferencia } = req.body;

    // Registrar inicio de la transacción con el número de referencia del frontend
    await registrarEventoBitacora(
        db.TIPOS_EVENTOS_TRANSACCIONES.PAGO_INICIADO,
        db.ESTADOS_EVENTOS.PENDIENTE,
        `Inicio de transacción de pago | Cliente: ${obtenerNombreCompleto(datosContacto)} | Ref: ${numeroReferencia}`,
        {
            monto: montoTotal,
            cliente: datosContacto,
            items: detallesCompra,
            numero_referencia: numeroReferencia
        },
        numeroReferencia,
        {
            monto: montoTotal,
            nombre_cliente: obtenerNombreCompleto(datosContacto),
            email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : null,
            numero_referencia: numeroReferencia
        }
    );

    if (!trama) {
        await registrarEventoBitacora(
            db.TIPOS_EVENTOS_TRANSACCIONES.TRAMA_ERROR,
            db.ESTADOS_EVENTOS.ERROR,
            'Error: Trama bancaria no proporcionada',
            { error: 'Trama no proporcionada' },
            numeroReferencia
        );
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'Se requiere una trama bancaria válida' 
        });
    }

    let datosTrama;
    try {
        datosTrama = {
            tipo_transaccion: trama.substring(0, 2),
            canal_terminal: trama.substring(2, 4),
            id_empresa: trama.substring(4, 9),
            id_sucursal: trama.substring(9, 13),
            codigo_cliente: trama.substring(13, 21),
            tipo_moneda: trama.substring(21, 23),
            monto_entero: trama.substring(23, 33),
            monto_decimal: trama.substring(33, 35),
            numero_referencia: numeroReferencia,
            fecha_hora_trama: trama.substring(47, 61)
        };

        // Registrar trama enviada
        await registrarEventoBitacora(
            db.TIPOS_EVENTOS_TRANSACCIONES.TRAMA_ENVIADA,
            db.ESTADOS_EVENTOS.PENDIENTE,
            `Trama bancaria enviada | Ref: ${numeroReferencia}`,
            {
                trama_enviada: trama,
                datos_trama: datosTrama,
                cliente: datosContacto,
                monto: montoTotal,
                numero_referencia: numeroReferencia
            },
            numeroReferencia,
            {
                trama_enviada: trama,
                numero_referencia: numeroReferencia,
                codigo_cliente: datosTrama.codigo_cliente,
                monto: montoTotal,
                nombre_cliente: obtenerNombreCompleto(datosContacto),
                email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : null,
                servidor_banco: 'Servidor Bancario'
            }
        );

    } catch (error) {
        await registrarEventoBitacora(
            db.TIPOS_EVENTOS_TRANSACCIONES.TRAMA_ERROR,
            db.ESTADOS_EVENTOS.ERROR,
            'Error al procesar estructura de trama bancaria',
            { error: error.message, trama },
            null,
            {
                detalles_error: error.message
            }
        );
        return res.status(400).json({ 
            exito: false, 
            mensaje: 'Error al procesar la trama bancaria' 
        });
    }

    try {
        // Ya no generamos un nuevo número de referencia, usamos el de la trama
        const respuestaBanco = await enviarTramaBanco(trama);
        const estadoBanco = respuestaBanco.slice(61, 63);

        // Extraer y formatear el monto de la respuesta del banco
        const montoEnteroBanco = respuestaBanco.substring(47, 57); // 10 dígitos para la parte entera
        const montoDecimalBanco = respuestaBanco.substring(57, 59); // 2 dígitos para los decimales
        const montoLimpioBanco = montoEnteroBanco.replace(/^0+/, '');
        const montoBanco = parseFloat(montoLimpioBanco) / 100;
        const montoBancoStr = `Q. ${montoBanco.toFixed(2)}`;
        const montoEnviadoStr = `Q. ${montoTotal.toFixed(2)}`;

        // Registrar respuesta del banco
        await registrarEventoBitacora(
            db.TIPOS_EVENTOS_TRANSACCIONES.TRAMA_RECIBIDA,
            estadoBanco === '01' ? db.ESTADOS_EVENTOS.EXITOSO : db.ESTADOS_EVENTOS.FALLIDO,
            estadoBanco === '01' 
                ? `Transacción aprobada exitosamente | Ref: ${datosTrama.numero_referencia} | Monto: ${montoEnviadoStr}`
                : `Transacción rechazada | Ref: ${datosTrama.numero_referencia} | Monto: ${montoEnviadoStr}`,
            {
                trama_respuesta: respuestaBanco,
                estado: estadoBanco,
                referencia: datosTrama.numero_referencia,
                monto: montoTotal,
                cliente: datosContacto
            },
            datosTrama.numero_referencia,
            {
                trama_recibida: respuestaBanco,
                codigo_respuesta_banco: estadoBanco,
                servidor_banco: 'Servidor Bancario',
                monto: montoTotal,
                nombre_cliente: obtenerNombreCompleto(datosContacto),
                email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : null
            }
        );

        let descripcionBanco = 'Desconocido';
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

        let transaccionId;
        try {
            const transaccion = await db.crearTransaccionBancaria({
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
                direccion_cliente: contactoDisponible(datosContacto) ? datosContacto.direccion : '',
                detalles_compra: JSON.stringify(detallesCompra || []),
                monto: parseFloat(montoTotal)  // Asegurarnos que se guarde como número
            });
            transaccionId = transaccion.id_transaccion;

        } catch (dbError) {
            await registrarEventoBitacora(
                db.TIPOS_EVENTOS_TRANSACCIONES.PAGO_ERROR,
                db.ESTADOS_EVENTOS.ERROR,
                'Error al registrar transacción bancaria',
                { error: dbError.message },
                datosTrama.numero_referencia,
                {
                    detalles_error: dbError.message
                }
            );
        }

        if (estadoBanco === '01') {
            try {
                const factura = await procesarFactura({
                    id_transaccion: transaccionId,
                    nombre_cliente: contactoDisponible(datosContacto) ? obtenerNombreCompleto(datosContacto) : '',
                    email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : '',
                    telefono_cliente: contactoDisponible(datosContacto) ? datosContacto.telefono : '',
                    direccion_cliente: contactoDisponible(datosContacto) ? datosContacto.direccion : '',
                    monto: montoTotal,
                    detalles_compra: JSON.stringify(detallesCompra || []),
                    numero_referencia: datosTrama.numero_referencia
                });

                // Registrar pago completado (aprobado)
                await registrarEventoBitacora(
                    db.TIPOS_EVENTOS_TRANSACCIONES.PAGO_APROBADO,
                    db.ESTADOS_EVENTOS.EXITOSO,
                    `Pago completado exitosamente | Factura: ${factura.numero_factura} | Monto: ${montoEnviadoStr}`,
                    {
                        factura_id: factura.id_factura,
                        transaccion_id: transaccionId,
                        monto: montoTotal,
                        cliente: datosContacto
                    },
                    datosTrama.numero_referencia,
                    {
                        id_transaccion: transaccionId,
                        id_factura: factura.id_factura,
                        numero_factura: factura.numero_factura,
                        monto: montoTotal,
                        nombre_cliente: obtenerNombreCompleto(datosContacto),
                        email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : null
                    }
                );

                // Registrar factura generada
                await registrarEventoBitacora(
                    db.TIPOS_EVENTOS_TRANSACCIONES.FACTURA_GENERADA,
                    db.ESTADOS_EVENTOS.EXITOSO,
                    `Factura generada exitosamente: ${factura.numero_factura} | Cliente: ${obtenerNombreCompleto(datosContacto)} | Total: ${montoEnviadoStr}`,
                    {
                        factura_id: factura.id_factura,
                        transaccion_id: transaccionId,
                        monto: montoTotal,
                        cliente: datosContacto
                    },
                    datosTrama.numero_referencia,
                    {
                        id_transaccion: transaccionId,
                        id_factura: factura.id_factura,
                        numero_factura: factura.numero_factura,
                        monto: montoTotal,
                        nombre_cliente: obtenerNombreCompleto(datosContacto),
                        email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : null
                    }
                );

                return res.json({
                    exito: true,
                    mensaje: 'Pago aprobado. Se ha enviado la factura a su correo electrónico.',
                    estadoBanco,
                    descripcionBanco,
                    tramaEnviada: trama,
                    respuestaBanco,
                    id_factura: factura.id_factura,
                    numero_factura: factura.numero_factura
                });
            } catch (facturaError) {
                await registrarEventoBitacora(
                    db.TIPOS_EVENTOS_TRANSACCIONES.FACTURA_ERROR,
                    db.ESTADOS_EVENTOS.ERROR,
                    'Error al generar factura',
                    { 
                        error: facturaError.message,
                        transaccion_id: transaccionId
                    },
                    datosTrama.numero_referencia,
                    {
                        detalles_error: facturaError.message,
                        id_transaccion: transaccionId
                    }
                );

                return res.json({
                    exito: true,
                    mensaje: 'Pago aprobado, pero hubo un error al generar la factura.',
                    estadoBanco,
                    descripcionBanco,
                    tramaEnviada: trama,
                    respuestaBanco
                });
            }
        } else {
            // Registrar pago rechazado
            await registrarEventoBitacora(
                db.TIPOS_EVENTOS_TRANSACCIONES.PAGO_RECHAZADO,
                db.ESTADOS_EVENTOS.FALLIDO,
                `Pago rechazado | Estado: ${estadoBanco} (${descripcionBanco})`,
                {
                    estado: estadoBanco,
                    descripcion: descripcionBanco,
                    transaccion_id: transaccionId,
                    monto: `Q. ${montoTotal.toFixed(2)}`,
                    cliente: datosContacto
                },
                datosTrama.numero_referencia,
                {
                    id_transaccion: transaccionId,
                    codigo_respuesta_banco: estadoBanco,
                    monto: montoTotal,
                    nombre_cliente: obtenerNombreCompleto(datosContacto),
                    email_cliente: contactoDisponible(datosContacto) ? datosContacto.correo : null
                }
            );
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
        await registrarEventoBitacora(
            db.TIPOS_EVENTOS_TRANSACCIONES.PAGO_ERROR,
            db.ESTADOS_EVENTOS.ERROR,
            'Error crítico al procesar pago',
            { 
                error: err.message,
                trama,
                cliente: datosContacto
            },
            null,
            {
                detalles_error: err.message
            }
        );

        res.status(200).json({ 
            exito: false, 
            mensaje: 'Error al comunicar con el banco: ' + err.message,
            error: err.message 
        });
    }
};
